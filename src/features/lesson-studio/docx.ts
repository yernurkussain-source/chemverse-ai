import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  LineRuleType,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { FLOW_HEADER, fmtDate, inlineSegments, type KmzhPlan, type KmzhRich, type KmzhRow } from "./kmzh";

/**
 * ҚМЖ → DOCX: docs/kmzh/generator/kmzh-docx.mjs-тің TypeScript нұсқасы (логикасы мен өлшемдері өзгеріссіз).
 * Мұғалімнің үлгісі: A4 альбомдық, Times New Roman 12, «Интервалсыз» абзацтар, 2 кесте. Эталон: docs/kmzh/reference/teacher-sample.pdf
 */
export const LAYOUT = {
  page: { width: 11906, height: 16838 }, // A4, альбомдыққа бұрылады
  margin: { top: 567, right: 1134, bottom: 850, left: 1134 },
  tableIndent: -743,
  headerCols: [3573, 12304],
  flowCols: [1277, 7087, 3402, 2693, 1985],
  cellMarginLR: 108,
  font: "Times New Roman",
  size: 24, // half-points = 12 pt
  accent: "4F81BD",
  muted: "3D3D3D",
} as const;

type Style = { bold?: boolean; italics?: boolean; color?: string };
type Ctx = { loadImage: (src: string) => Promise<Buffer> };

const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const TABLE_BORDERS = { ...BORDERS, insideHorizontal: BORDER, insideVertical: BORDER };
const SPACING = { before: 0, after: 0, line: 240, lineRule: LineRuleType.AUTO };
const space = (text: string) => new TextRun({ text, font: LAYOUT.font, size: LAYOUT.size });

export function parseInline(text: string, base: Style = {}): TextRun[] {
  return inlineSegments(text, base).map((s) =>
    "break" in s
      ? new TextRun({ break: 1, font: LAYOUT.font, size: LAYOUT.size })
      : new TextRun({ text: s.text, bold: s.bold, italics: s.italics, underline: s.underline ? {} : undefined, color: base.color, font: LAYOUT.font, size: LAYOUT.size }),
  );
}

function para(text = "", opts: Style & { align?: (typeof AlignmentType)[keyof typeof AlignmentType]; prefixRuns?: TextRun[] } = {}) {
  const children = [...(opts.prefixRuns ?? []), ...parseInline(text, opts)];
  return new Paragraph({ children: children.length ? children : [space("")], spacing: SPACING, alignment: opts.align });
}

/** Сурет өлшемі (PNG/JPEG), қосымша кітапханасыз */
export function imageSize(buf: Buffer): { w: number; h: number; type: "png" | "jpg" } {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), type: "png" };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7), type: "jpg" };
      }
      i += 2 + len;
    }
  }
  return { w: 4, h: 3, type: "png" };
}

async function renderRich(items: KmzhRich[] | undefined, ctx: Ctx, colWidth: number, opts: Style = {}) {
  const out: (Paragraph | Table)[] = [];
  for (const item of items ?? []) {
    if (typeof item === "string") out.push(para(item, opts));
    else if ("table" in item) {
      out.push(renderInnerTable(item.table, colWidth - 2 * LAYOUT.cellMarginLR));
      out.push(para("")); // Word кестеден кейін абзац талап етеді
    } else {
      const img = item.image;
      try {
        const data = await ctx.loadImage(img.src);
        const { w, h, type } = imageSize(data);
        const widthPx = Math.round(((img.widthCm ?? 4.6) / 2.54) * 96);
        const alt = img.alt ?? "";
        out.push(
          new Paragraph({
            children: [new ImageRun({ type, data, transformation: { width: widthPx, height: Math.round((widthPx * h) / w) }, altText: { title: alt, description: alt, name: alt || "image" } })],
            spacing: SPACING,
          }),
        );
      } catch {
        out.push(para(`[сурет: ${img.alt || img.src}]`, { italics: true }));
      }
    }
  }
  return out;
}

function renderInnerTable(t: { header: string[]; rows: string[][]; widths?: number[] }, totalWidth: number) {
  const n = t.header.length;
  const weights = t.widths && t.widths.length === n ? t.widths : Array<number>(n).fill(1);
  const sum = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => Math.floor((w / sum) * totalWidth));
  const mkRow = (cells: string[], bold: boolean) =>
    new TableRow({ children: cells.map((c, i) => new TableCell({ width: { size: widths[i], type: WidthType.DXA }, borders: BORDERS, children: [para(c ?? "", { bold })] })) });
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    borders: TABLE_BORDERS,
    rows: [mkRow(t.header, true), ...t.rows.map((r) => mkRow(r, false))],
  });
}

const cell = (children: (Paragraph | Table)[], width: number) =>
  new TableCell({ width: { size: width, type: WidthType.DXA }, borders: BORDERS, children: children.length ? children : [para("")] });

// ---------- 1-кесте: жоспардың «шапкасы» ----------
function headerTable(meta: KmzhPlan["meta"]) {
  const [w1, w2] = LAYOUT.headerCols;
  const row = (label: string, right: (Paragraph | Table)[]) => new TableRow({ children: [cell([para(label, { bold: true })], w1), cell(right, w2)] });

  const topicRuns = [
    ...parseInline(meta.topic),
    ...(meta.topicNote ? [space("      "), ...parseInline(meta.topicNote, { bold: true })] : []),
    ...(meta.topicNoteTitle ? [space(`  «${meta.topicNoteTitle}»`)] : []),
  ];
  const v = meta.value;
  const valueBlock = [
    para(v.monthTitle, { bold: true }),
    ...(v.competency ? [para(`Құзыреттілік: ${v.competency}`, { color: LAYOUT.muted })] : []),
    ...(v.graduate ? [para(v.graduate, { align: AlignmentType.JUSTIFIED })] : []),
    ...(v.quote ? [para(`**Аптаның дәйек сөзі:** «${v.quote}»${v.quoteAuthor ? `  (${v.quoteAuthor})` : ""}`)] : []),
  ];

  const rows = [
    row("Бөлім:", [para(meta.section, { bold: true })]),
    row("Педагогтің аты-жөні:", [para(meta.teacher ?? "")]),
    row("Күні:", [para(fmtDate(meta.date))]),
    row(`Сыныбы:   ${meta.grade ?? ""}`, [para(`Қатысушылар саны: ${meta.present ?? ""}                    Қатыспағандар саны: ${meta.absent ?? ""}`)]),
    new TableRow({ children: [cell([para("Сабақтың  тақырыбы:", { bold: true })], w1), cell([new Paragraph({ children: topicRuns, spacing: SPACING })], w2)] }),
    row("Оқу  бағдарламасына сәйкес оқу  мақсаты", meta.objectives.map((o) => para(`${o.code} - ${o.text}`))),
    row("Сабақтың мақсаты:", [para(meta.lessonGoal)]),
    new TableRow({ children: [cell([para("")], w1), cell(valueBlock, w2)] }),
  ];
  if (meta.headerEmptyRow !== false) rows.push(new TableRow({ children: [cell([para("")], w1), cell([para("")], w2)] }));

  return new Table({
    width: { size: w1 + w2, type: WidthType.DXA },
    columnWidths: [...LAYOUT.headerCols],
    indent: { size: LAYOUT.tableIndent, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: TABLE_BORDERS,
    rows,
  });
}

// ---------- 2-кесте: Сабақтың барысы ----------
async function flowRow(r: KmzhRow, ctx: Ctx) {
  const [c0, c1, c2, c3, c4] = LAYOUT.flowCols;

  const stage: Paragraph[] = [];
  if (r.stage) stage.push(para(r.stage, r.stageAccent ? { bold: true, color: LAYOUT.accent } : {}));
  if (r.minutes != null) stage.push(para(`${r.minutes} мин`));

  const teacherItems = [...r.teacher];
  const teacher: (Paragraph | Table)[] = [];
  if (r.titleInline && typeof teacherItems[0] === "string") {
    teacher.push(para(teacherItems.shift() as string, { prefixRuns: [...parseInline(r.title, { bold: true }), space(" ")] }));
  } else if (r.title) teacher.push(para(r.title, { bold: true }));
  teacher.push(...(await renderRich(teacherItems, ctx, c1)));
  if (r.expectedAnswer?.length) {
    const [first, ...rest] = r.expectedAnswer;
    if (typeof first === "string") teacher.push(para(first, { prefixRuns: parseInline("**Күтілетін жауап:** ") }));
    else teacher.push(para("**Күтілетін жауап:**"), ...(await renderRich([first], ctx, c1)));
    teacher.push(...(await renderRich(rest, ctx, c1)));
  }
  if (r.differentiation) teacher.push(para(r.differentiation, { prefixRuns: parseInline("**Саралау тәсілі:** ") }));
  if (r.valueNote?.length) teacher.push(...(await renderRich(r.valueNote, ctx, c1)));

  const student = await renderRich(r.student, ctx, c2);

  const a = r.assessment;
  const accent = a.accent ? { bold: true, color: LAYOUT.accent } : { bold: true };
  const assess: (Paragraph | Table)[] = [];
  if (a.label && a.items.length === 1 && typeof a.items[0] === "string" && a.points == null) {
    assess.push(para(a.items[0], { prefixRuns: [...parseInline(a.label, accent), space(" ")] }));
  } else {
    if (a.label) assess.push(para(a.label, accent));
    assess.push(...(await renderRich(a.items, ctx, c3)));
  }
  if (a.points != null) assess.push(para(""), para(`Жалпы балл - ${a.points}`, accent));
  if (a.extra?.length) assess.push(para(""), ...(await renderRich(a.extra, ctx, c3)));

  const res = await renderRich(r.resources, ctx, c4);
  return new TableRow({ cantSplit: false, children: [cell(stage, c0), cell(teacher, c1), cell(student, c2), cell(assess, c3), cell(res, c4)] });
}

async function flowTable(plan: KmzhPlan, ctx: Ctx) {
  const cols = LAYOUT.flowCols;
  const rows = [new TableRow({ children: FLOW_HEADER.map((t, i) => cell([para(t)], cols[i])) })];
  for (const r of plan.rows) rows.push(await flowRow(r, ctx));
  for (let i = 0; i < (plan.meta.trailingEmptyRows ?? 2); i++) rows.push(new TableRow({ children: cols.map((w) => cell([para("")], w)) }));
  return new Table({
    width: { size: cols.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: [...cols],
    indent: { size: LAYOUT.tableIndent, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: TABLE_BORDERS,
    rows,
  });
}

/** ҚМЖ → DOCX буфері. loadImage берілмесе, суреттің орнына «[сурет: …]» жазылады */
export async function buildKmzhDocx(plan: KmzhPlan, options: Partial<Ctx> = {}): Promise<Buffer> {
  const ctx: Ctx = { loadImage: options.loadImage ?? (() => Promise.reject(new Error("no image loader"))) };
  const doc = new Document({
    creator: "CHEMVERSE AI",
    title: `ҚМЖ — ${plan.meta.topic}`,
    styles: { default: { document: { run: { font: LAYOUT.font, size: LAYOUT.size }, paragraph: { spacing: { after: 0, line: 240, lineRule: LineRuleType.AUTO } } } } },
    sections: [
      {
        properties: { page: { size: { width: LAYOUT.page.width, height: LAYOUT.page.height, orientation: PageOrientation.LANDSCAPE }, margin: LAYOUT.margin } },
        children: [
          headerTable(plan.meta),
          new Paragraph({ children: parseInline("Сабақтың барысы:"), indent: { left: 709 }, spacing: { before: 120, after: 0 } }),
          await flowTable(plan, ctx),
          para(""),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
