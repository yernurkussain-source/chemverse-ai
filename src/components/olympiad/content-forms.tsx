"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Markdown } from "@/components/ai/markdown";
import { Button } from "@/components/ui/button";
import { createProblem, importProblems, saveTopicTheory } from "@/features/olympiad/teacher-actions";

const FIELD = "rounded-xl border border-line bg-panel-2 px-3 py-2 text-foreground";

/** Тақырып теориясы: мұғалім өз сыныбына Markdown + KaTeX ($...$, \ce{...}) жазады, алдын ала көреді */
export function TheoryForm({ topic, classes }: { topic: number; classes: { classId: string; className: string; theory: string }[] }) {
  const t = useTranslations("Olympiad.theory");
  const tErr = useTranslations("Olympiad.teacher.errors");
  const [state, action, pending] = useActionState(saveTopicTheory, null);
  const [classId, setClassId] = useState(classes[0].classId);
  const [text, setText] = useState(classes[0].theory);
  return (
    <form action={action} className="mt-4 flex flex-col gap-2 rounded-2xl border border-cyan-dim bg-panel-2 p-4">
      <input type="hidden" name="topic" value={topic} />
      <p className="text-[0.85rem] font-semibold">{t("editTitle")}</p>
      {classes.length > 1 ? (
        <select
          name="classId"
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            setText(classes.find((c) => c.classId === e.target.value)?.theory ?? "");
          }}
          className={`${FIELD} h-11`}
        >
          {classes.map((c) => (
            <option key={c.classId} value={c.classId}>
              {c.className}
            </option>
          ))}
        </select>
      ) : (
        <input type="hidden" name="classId" value={classId} />
      )}
      <textarea name="theory" rows={8} maxLength={8000} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("placeholder")} className={`${FIELD} font-mono text-[0.88rem]`} />
      <p className="text-[0.78rem] text-muted-foreground">{t("hint")}</p>
      {text.trim() && (
        <details className="rounded-xl border border-line bg-panel p-3">
          <summary className="cursor-pointer text-[0.85rem] font-semibold">{t("preview")}</summary>
          <div className="mt-2">
            <Markdown>{text}</Markdown>
          </div>
        </details>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="glow" size="pill-sm" disabled={pending}>
          {t("save")}
        </Button>
        <span aria-live="polite" className="text-[0.85rem]">
          {state?.ok && <span className="text-good">✓ {t("saved")}</span>}
          {state?.error && <span className="text-pink">{tErr(state.error)}</span>}
        </span>
      </div>
    </form>
  );
}

const TYPES = ["numeric", "mcq", "balance", "econf", "open"] as const;

/** Есеп редакторы: жариялау алдында сервер тексергішті іске қосады */
export function ProblemEditorForm({ topics }: { topics: { n: number; title: string }[] }) {
  const t = useTranslations("Olympiad.editor");
  const [state, action, pending] = useActionState(createProblem, null);
  const [type, setType] = useState<(typeof TYPES)[number]>("numeric");
  return (
    <form action={action} className="flex flex-col gap-3 rounded-3xl border border-line bg-panel p-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-[0.9rem] sm:col-span-3">
          <span className="font-semibold">{t("topic")}</span>
          <select name="topic" className={`${FIELD} h-11`}>
            {topics.map((x) => (
              <option key={x.n} value={x.n}>
                {x.n}. {x.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[0.9rem]">
          <span className="font-semibold">{t("level")}</span>
          <select name="level" defaultValue={2} className={`${FIELD} h-11`}>
            {[1, 2, 3].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[0.9rem] sm:col-span-2">
          <span className="font-semibold">{t("type")}</span>
          <select name="type" value={type} onChange={(e) => setType(e.target.value as (typeof TYPES)[number])} className={`${FIELD} h-11`}>
            {TYPES.map((x) => (
              <option key={x} value={x}>
                {t(`types.${x}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-[0.9rem]">
        <span className="font-semibold">{t("kk")}</span>
        <textarea name="kk" required rows={3} maxLength={2000} className={FIELD} />
      </label>

      {type === "numeric" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-[0.9rem]">
            <span className="font-semibold">{t("value")}</span>
            <input name="value" required inputMode="decimal" className={`${FIELD} h-11 font-mono`} />
          </label>
          <label className="flex flex-col gap-1 text-[0.9rem]">
            <span className="font-semibold">{t("unit")}</span>
            <input name="unit" maxLength={20} className={`${FIELD} h-11`} />
          </label>
          <label className="flex flex-col gap-1 text-[0.9rem]">
            <span className="font-semibold">{t("tol")}</span>
            <input name="tolPct" defaultValue="1" inputMode="decimal" className={`${FIELD} h-11 font-mono`} />
          </label>
        </div>
      )}
      {type === "mcq" && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[0.9rem] font-semibold">{t("choices")}</legend>
          {[0, 1, 2, 3].map((i) => (
            <label key={i} className="flex items-center gap-2">
              <input type="radio" name="correct" value={i} defaultChecked={i === 0} aria-label={t("correct", { n: i + 1 })} className="size-5 shrink-0" />
              <input name="choices" required={i < 2} placeholder={t("choice", { n: i + 1 })} className={`${FIELD} h-11 flex-1`} />
            </label>
          ))}
          <span className="text-[0.78rem] text-muted-foreground">{t("correctHint")}</span>
        </fieldset>
      )}
      {type === "balance" && (
        <label className="flex flex-col gap-1 text-[0.9rem]">
          <span className="font-semibold">{t("equation")}</span>
          <input name="equation" required placeholder="KMnO4 + HCl = KCl + MnCl2 + Cl2 + H2O" className={`${FIELD} h-11 font-mono`} />
          <span className="text-[0.78rem] text-muted-foreground">{t("equationHint")}</span>
        </label>
      )}
      {type === "econf" && (
        <label className="flex flex-col gap-1 text-[0.9rem]">
          <span className="font-semibold">{t("z")}</span>
          <input name="Z" type="number" min={1} max={54} required className={`${FIELD} h-11 w-32 font-mono`} />
          <span className="text-[0.78rem] text-muted-foreground">{t("zHint")}</span>
        </label>
      )}
      {type === "open" && (
        <label className="flex flex-col gap-1 text-[0.9rem]">
          <span className="font-semibold">{t("rubric")}</span>
          <textarea name="rubric" required rows={4} placeholder={t("rubricPlaceholder")} className={FIELD} />
        </label>
      )}

      <label className="flex flex-col gap-1 text-[0.9rem]">
        <span className="font-semibold">{t("solution")}</span>
        <textarea name="solution" required rows={3} placeholder={t("solutionPlaceholder")} className={FIELD} />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[0.9rem] font-semibold">{t("hints")}</legend>
        {[1, 2, 3].map((i) => (
          <input key={i} name={`hint${i}`} required maxLength={500} placeholder={t("hint", { n: i })} className={`${FIELD} h-11`} />
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="glow" size="pill" disabled={pending}>
          {t("submit")}
        </Button>
        <span aria-live="polite" className="text-[0.88rem]">
          {state?.ok && <span className="text-good">✓ {t("created", { id: state.id ?? "" })}</span>}
          {state?.error === "invalid" && <span className="text-pink">{t("invalid", { reason: state.reason ?? "" })}</span>}
          {(state?.error === "forbidden" || state?.error === "unknown") && <span className="text-pink">{t("failed")}</span>}
        </span>
      </div>
    </form>
  );
}

/** JSON импорт: файл → әр есеп тексергіштен өтеді */
export function ImportForm() {
  const t = useTranslations("Olympiad.editor");
  const [state, action, pending] = useActionState(importProblems, null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input
        type="file"
        name="file"
        accept="application/json,.json"
        required
        className="text-[0.9rem] file:mr-3 file:h-10 file:rounded-full file:border-0 file:bg-cyan file:px-4 file:font-semibold file:text-on-accent"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="panel" size="pill-sm" disabled={pending}>
          {t("import")}
        </Button>
        <span aria-live="polite" className="text-[0.88rem]">
          {state?.error && <span className="text-pink">{t(`importErrors.${state.error}`)}</span>}
          {state?.imported !== undefined && <span className="text-good">✓ {t("imported", { count: state.imported, skipped: state.skipped?.length ?? 0 })}</span>}
        </span>
      </div>
      {state?.skipped && state.skipped.length > 0 && (
        <ul className="list-disc pl-5 text-[0.82rem] text-muted-foreground">
          {state.skipped.map((s) => (
            <li key={s.id}>
              <span className="font-mono">{s.id}</span>: {s.reason}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
