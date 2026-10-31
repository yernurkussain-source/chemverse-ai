import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { inflateRawSync } from "node:zlib";
import { buildKmzhDocx, imageSize } from "@/features/lesson-studio/docx";
import { fixMinutes, inlineSegments, monthValue, parseObjectives, toKmzhPlan, validateKmzh, type KmzhPlan } from "@/features/lesson-studio/kmzh";

const DIR = join("docs", "kmzh", "examples");
const sample = JSON.parse(readFileSync(join(DIR, "sample-7-lab2.json"), "utf8")) as KmzhPlan;

/** DOCX (zip) ішіндегі бір файлды оқу: орталық каталог бойынша */
function unzipEntry(zip: Buffer, name: string): string | null {
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let p = zip.readUInt32LE(eocd + 16);
  for (let n = zip.readUInt16LE(eocd + 10); n > 0; n--) {
    const method = zip.readUInt16LE(p + 10);
    const size = zip.readUInt32LE(p + 20);
    const [nameLen, extraLen, commentLen] = [zip.readUInt16LE(p + 28), zip.readUInt16LE(p + 30), zip.readUInt16LE(p + 32)];
    const local = zip.readUInt32LE(p + 42);
    if (zip.toString("utf8", p + 46, p + 46 + nameLen) === name) {
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const data = zip.subarray(start, start + size);
      return (method === 8 ? inflateRawSync(data) : data).toString("utf8");
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

describe("ҚМЖ: мәтін белгілеуі мен сурет өлшемі", () => {
  test("**қалың** *курсив* __асты сызылған__, ***x*** — қалың + курсив", () => {
    const segs = inlineSegments("**a** *b* __c__\n***x***").filter((s) => !("break" in s) && s.text.trim());
    assert.deepEqual(
      segs.map((s) => ("break" in s ? null : [s.text, s.bold, s.italics, s.underline])),
      [["a", true, false, false], ["b", false, true, false], ["c", false, false, true], ["x", true, true, false]],
    );
    assert.ok(inlineSegments("a\nb").some((s) => "break" in s));
  });

  test("PNG және JPEG өлшемі", () => {
    const png = Buffer.alloc(32);
    png.writeUInt32BE(0x89504e47, 0);
    png.writeUInt32BE(640, 16);
    png.writeUInt32BE(480, 20);
    assert.deepEqual(imageSize(png), { w: 640, h: 480, type: "png" });
    const jpg = imageSize(readFileSync(join(DIR, "img", "ozime-algys.jpg")));
    assert.equal(jpg.type, "jpg");
    assert.ok(jpg.w > 0 && jpg.h > 0);
  });
});

describe("ҚМЖ: тексергіш", () => {
  test("мұғалімнің үлгісі өтеді, тек уақыт көрсетілмеген деген ескерту", () => {
    const res = validateKmzh(sample);
    assert.deepEqual(res.errors, []);
    assert.ok(res.warnings.includes("Уақыт (минут) көрсетілмеген"));
  });

  test("минуттар 44 болса — қате; fixMinutes ең ұзақ жолды түзетеді", () => {
    const minutes = [5, 7, 8, 6, 6, 5, 0, 7];
    const plan = { ...sample, rows: sample.rows.slice(0, 8).map((r, i) => ({ ...r, minutes: minutes[i] })) };
    plan.rows[7] = { ...plan.rows[7], stage: "Сабақтың соңы" };
    assert.ok(validateKmzh(plan).errors.includes("Уақыттың қосындысы 44 мин, ал сабақ 45 мин"));
    const fixed = fixMinutes(plan);
    assert.equal(fixed.rows.reduce((a, r) => a + (r.minutes ?? 0), 0), 45);
    assert.equal(fixed.rows[2].minutes, 9);
  });

  test("ойдан шығарылған код пен сыртқы сурет — қате", () => {
    const bad = { ...sample, meta: { ...sample.meta, objectives: [{ code: "7.4.x", text: "..." }] } };
    assert.ok(validateKmzh(bad).errors.some((e) => e.startsWith("Оқу мақсатының коды дұрыс емес")));
    const remote = { ...sample, rows: [{ ...sample.rows[0], teacher: [{ image: { src: "https://x.kz/a.png" } }] }, ...sample.rows.slice(1)] };
    assert.ok(validateKmzh(remote).errors.some((e) => e.includes("сыртқы сілтемеден")));
  });
});

describe("ҚМЖ: айдың құндылығы және AI жауабын түрлендіру", () => {
  test("күн бойынша «Адал азамат» айы", () => {
    assert.equal(monthValue("2026-10-05").monthTitle, "ҚАЗАН – ТӘУЕЛСІЗДІК ЖӘНЕ ОТАНШЫЛДЫҚ АЙЫ");
    assert.equal(monthValue("2026-09-15").quoteAuthor, "Абай");
    assert.equal(monthValue("2026-07-01").monthTitle, "");
  });

  test("AI блогы: мәтін + кесте → бөлек элементтер; бос өрістер қосылмайды", () => {
    const row = {
      stage: "Сабақтың басы", minutes: 5, stageAccent: false, kind: "organization" as const, title: "Т", titleInline: false,
      teacher: [{ text: "Кесте:", table: { header: ["A", "B"], rows: [["1", "2"]] } }, { text: "Сұрақ", table: null }],
      expectedAnswer: [], valueNote: [], differentiation: "", student: ["Тыңдайды"],
      assessment: { label: "Ауызша бағалау:", items: ["Жарайсың!"], points: null, extra: [], accent: false }, resources: ["Оқулық"],
    };
    const plan = toKmzhPlan({ lessonGoal: "Мақсат", rows: [row, row, row] }, { ...sample.meta });
    assert.deepEqual(plan.rows[0].teacher, ["Кесте:", { table: { header: ["A", "B"], rows: [["1", "2"]] } }, "Сұрақ"]);
    assert.equal("expectedAnswer" in plan.rows[0], false);
    assert.equal(plan.meta.lessonGoal, "Мақсат");
  });
});

test("оқу мақсаттары: код - мәтін; кодсыз жол — [код]; бос — толтырылмаған", () => {
  assert.deepEqual(parseObjectives("7.4.1.6 - қоспаны бөлу\n8.1.2.3 — моль ұғымы\nкодсыз мақсат"), [
    { code: "7.4.1.6", text: "қоспаны бөлу" },
    { code: "8.1.2.3", text: "моль ұғымы" },
    { code: "[код]", text: "кодсыз мақсат" },
  ]);
  assert.deepEqual(parseObjectives("  "), [{ code: "[код]", text: "[оқу мақсаты]" }]);
});

describe("ҚМЖ: DOCX", () => {
  test("альбомдық A4, баған ендері, Times New Roman 12, 3 сурет", async () => {
    const buf = await buildKmzhDocx(sample, { loadImage: async (src) => readFileSync(join(DIR, src)) });
    assert.equal(buf.toString("utf8", 0, 2), "PK");
    const xml = unzipEntry(buf, "word/document.xml") ?? "";
    assert.match(xml, /w:orient="landscape"/);
    assert.match(xml, /w:w="16838"/);
    for (const w of [3573, 12304, 1277, 7087, 3402, 2693, 1985]) assert.match(xml, new RegExp(`<w:gridCol w:w="${w}"/>`));
    assert.match(xml, /Times New Roman/);
    assert.match(xml, /<w:sz w:val="24"\/>/);
    assert.match(xml, /Қоспаларды бөлу әдістері/);
    assert.equal((buf.toString("latin1").match(/word\/media\//g) ?? []).length >= 3, true);
  });
});

test("AI жазған LaTeX → Unicode (Word пен бетте $...$ шықпауы үшін)", async () => {
  const { latexToUnicode } = await import("@/features/lesson-studio/kmzh");
  assert.equal(latexToUnicode("4 моль оттек ($O_2$)"), "4 моль оттек (O₂)");
  assert.equal(latexToUnicode("$n = 3,01\\cdot 10^{23} / 6,02\\cdot 10^{23} = 0,5 \\text{ моль}$"), "n = 3,01·10²³ / 6,02·10²³ = 0,5 моль");
  assert.equal(latexToUnicode("$SO_4^{2-}$ және $Fe^{3+}$"), "SO₄²⁻ және Fe³⁺");
  assert.equal(latexToUnicode("H₂O + CO₂ → H₂CO₃"), "H₂O + CO₂ → H₂CO₃");
});
