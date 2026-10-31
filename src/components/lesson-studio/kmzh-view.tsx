import type { ReactNode } from "react";
import { FLOW_HEADER, fmtDate, inlineSegments, type KmzhPlan, type KmzhRich, type KmzhRow } from "@/features/lesson-studio/kmzh";
import { cn } from "@/lib/utils";

/**
 * ҚМЖ-ның беттегі көрінісі: DOCX-тегідей 2 кесте (docs/kmzh/KMZH_SPEC.md 2-бөлім).
 * Ақ «қағаз» (қараңғы режимде де), телефонда көлденең айналады, басып шығарғанда A4 альбомдық.
 */
const ACCENT = "text-[#4F81BD]";
const CELL = "border border-black px-1.5 py-1 align-top";
// DOCX-тегі twip ендерінің үлесі: 3573 | 12304 және 1277 | 7087 | 3402 | 2693 | 1985
const HEADER_COLS = ["22.5%", "77.5%"];
const FLOW_COLS = ["7.8%", "43.1%", "20.7%", "16.4%", "12%"];

function Inline({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {inlineSegments(text).map((s, i) => {
        if ("break" in s) return <br key={i} />;
        let node: ReactNode = s.text;
        if (s.underline) node = <u>{node}</u>;
        if (s.italics) node = <em>{node}</em>;
        if (s.bold) node = <strong>{node}</strong>;
        return <span key={i}>{node}</span>;
      })}
    </span>
  );
}

function Rich({ items, className }: { items?: KmzhRich[]; className?: string }) {
  return (items ?? []).map((item, i) => {
    if (typeof item === "string") return <p key={i} className={cn("whitespace-pre-line", className)}><Inline text={item} /></p>;
    if ("table" in item) {
      return (
        <table key={i} className="my-1 w-full border-collapse">
          <thead>
            <tr>{item.table.header.map((h, j) => <th key={j} className={cn(CELL, "text-left")}><Inline text={h} /></th>)}</tr>
          </thead>
          <tbody>
            {item.table.rows.map((row, j) => (
              <tr key={j}>{row.map((c, k) => <td key={k} className={CELL}><Inline text={c} /></td>)}</tr>
            ))}
          </tbody>
        </table>
      );
    }
    return <p key={i} className="italic">[сурет: {item.image.alt || item.image.src}]</p>;
  });
}

function FlowRow({ row }: { row: KmzhRow }) {
  const a = row.assessment;
  const labelClass = a.accent ? cn("font-bold", ACCENT) : "font-bold";
  const inlineLabel = a.label && a.items.length === 1 && typeof a.items[0] === "string" && a.points == null;
  const [first, ...rest] = row.teacher;
  const titleInline = row.titleInline && typeof first === "string";
  return (
    <tr>
      <td className={CELL}>
        {row.stage && <p className={row.stageAccent ? cn("font-bold", ACCENT) : undefined}>{row.stage}</p>}
        {row.minutes != null && <p>{row.minutes} мин</p>}
      </td>
      <td className={CELL}>
        {titleInline ? (
          <p>
            <Inline text={row.title} className="font-bold" /> <Inline text={first} />
          </p>
        ) : (
          row.title && <p className="font-bold"><Inline text={row.title} /></p>
        )}
        <Rich items={titleInline ? rest : row.teacher} />
        {row.expectedAnswer?.length ? (
          <>
            <p><strong>Күтілетін жауап:</strong> {typeof row.expectedAnswer[0] === "string" && <Inline text={row.expectedAnswer[0]} />}</p>
            <Rich items={typeof row.expectedAnswer[0] === "string" ? row.expectedAnswer.slice(1) : row.expectedAnswer} />
          </>
        ) : null}
        {row.differentiation && (
          <p className="whitespace-pre-line"><strong>Саралау тәсілі:</strong> <Inline text={row.differentiation} /></p>
        )}
        <Rich items={row.valueNote} />
      </td>
      <td className={CELL}><Rich items={row.student} /></td>
      <td className={CELL}>
        {inlineLabel ? (
          <p><Inline text={a.label} className={labelClass} /> <Inline text={a.items[0] as string} /></p>
        ) : (
          <>
            {a.label && <p className={labelClass}><Inline text={a.label} /></p>}
            <Rich items={a.items} />
          </>
        )}
        {a.points != null && <p className={cn("mt-3", labelClass)}>Жалпы балл - {a.points}</p>}
        {a.extra?.length ? <div className="mt-3"><Rich items={a.extra} /></div> : null}
      </td>
      <td className={CELL}><Rich items={row.resources} /></td>
    </tr>
  );
}

export function KmzhView({ plan }: { plan: KmzhPlan }) {
  const { meta } = plan;
  const v = meta.value;
  const head = (label: string, right: ReactNode) => (
    <tr>
      <td className={cn(CELL, "font-bold")}>{label}</td>
      <td className={CELL}>{right}</td>
    </tr>
  );
  return (
    <div className="overflow-x-auto rounded-2xl border border-line print:overflow-visible print:rounded-none print:border-0">
      <style>{"@media print { @page { size: A4 landscape; margin: 1cm 2cm 1.5cm 2cm; } }"}</style>
      <div className="min-w-[960px] bg-white p-4 font-serif text-[15px] leading-snug text-black print:min-w-0 print:p-0 print:text-[12pt]">
        <table className="w-full table-fixed border-collapse">
          <colgroup>{HEADER_COLS.map((w) => <col key={w} style={{ width: w }} />)}</colgroup>
          <tbody>
            {head("Бөлім:", <strong><Inline text={meta.section} /></strong>)}
            {head("Педагогтің аты-жөні:", meta.teacher)}
            {head("Күні:", fmtDate(meta.date))}
            <tr>
              <td className={cn(CELL, "font-bold")}>Сыныбы:&nbsp;&nbsp; {meta.grade}</td>
              <td className={CELL}>
                Қатысушылар саны: {meta.present}
                <span className="ml-24">Қатыспағандар саны: {meta.absent}</span>
              </td>
            </tr>
            {head(
              "Сабақтың тақырыбы:",
              <>
                <Inline text={meta.topic} />
                {meta.topicNote && <strong className="ml-8"><Inline text={meta.topicNote} /></strong>}
                {meta.topicNoteTitle && <span className="ml-2">«{meta.topicNoteTitle}»</span>}
              </>,
            )}
            {head("Оқу бағдарламасына сәйкес оқу мақсаты", meta.objectives.map((o) => <p key={o.code + o.text}>{o.code} - {o.text}</p>))}
            {head("Сабақтың мақсаты:", <Inline text={meta.lessonGoal} />)}
            <tr>
              <td className={CELL} />
              <td className={CELL}>
                <p className="font-bold">{v.monthTitle}</p>
                {v.competency && <p className="text-[#3D3D3D]">Құзыреттілік: {v.competency}</p>}
                {v.graduate && <p className="text-justify">{v.graduate}</p>}
                {v.quote && (
                  <p>
                    <strong>Аптаның дәйек сөзі:</strong> «{v.quote}»{v.quoteAuthor && <> ({v.quoteAuthor})</>}
                  </p>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <p className="mt-2 pl-12">Сабақтың барысы:</p>
        <table className="w-full table-fixed border-collapse">
          <colgroup>{FLOW_COLS.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
          <thead>
            <tr>{FLOW_HEADER.map((h) => <th key={h} className={cn(CELL, "text-left font-normal")}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {plan.rows.map((row, i) => <FlowRow key={i} row={row} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
