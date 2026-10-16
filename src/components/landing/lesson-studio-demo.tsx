"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useMessages, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Panel } from "./section";

const GRADES = ["g7", "g8", "g9", "g10", "g11"] as const;
const TOPICS = ["bond", "acid", "mol"] as const;
const LENGTHS = ["m40", "m45"] as const;
const STAGES = ["start", "middle", "end"] as const;

// Кезеңдердің ұзақтығы (минут): басы, ортасы, соңы
const STAGE_MINUTES: Record<(typeof LENGTHS)[number], [number, number, number]> = {
  m40: [5, 28, 7],
  m45: [5, 33, 7],
};

type Choice = {
  grade: (typeof GRADES)[number];
  topic: (typeof TOPICS)[number];
  length: (typeof LENGTHS)[number];
};

/** ҚМЖ үлгісі (шаблон). Нағыз AI Lesson Studio — 7-күні */
export function LessonStudioDemo() {
  const t = useTranslations("Studio");
  const messages = useMessages();
  const [form, setForm] = useState<Choice>({ grade: "g8", topic: "bond", length: "m40" });
  const [plan, setPlan] = useState<Choice>(form);
  const [pending, setPending] = useState(false);

  const topic = messages.Studio.topics[plan.topic];
  const minutes = STAGE_MINUTES[plan.length];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chosen = form;
    setPending(true);
    window.setTimeout(
      () => {
        setPlan(chosen);
        setPending(false);
      },
      reduceMotion ? 0 : 450,
    );
  }

  return (
    <div className="grid gap-4.5 md:grid-cols-[320px_1fr]">
      <Panel>
        <form onSubmit={submit}>
          <Field id="studio-grade" label={t("grade")}>
            <select
              id="studio-grade"
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value as Choice["grade"] })}
              className={selectClass}
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {t(`grades.${g}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field id="studio-topic" label={t("topic")}>
            <select
              id="studio-topic"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value as Choice["topic"] })}
              className={selectClass}
            >
              {TOPICS.map((key) => (
                <option key={key} value={key}>
                  {t(`topics.${key}.title`)}
                </option>
              ))}
            </select>
          </Field>
          <Field id="studio-length" label={t("length")}>
            <select
              id="studio-length"
              value={form.length}
              onChange={(e) => setForm({ ...form, length: e.target.value as Choice["length"] })}
              className={selectClass}
            >
              {LENGTHS.map((l) => (
                <option key={l} value={l}>
                  {t(`lengths.${l}`)}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" variant="glow" size="pill" className="w-full">
            {t("submit")}
          </Button>
        </form>
      </Panel>

      <div
        aria-live="polite"
        aria-busy={pending}
        className={cn("flex min-w-0 flex-col gap-3 transition-opacity duration-300", pending && "opacity-30")}
      >
        <div className="rounded-[14px] border border-pink/35 bg-linear-to-r from-pink/12 to-transparent p-3.5 text-[0.93rem]">
          <b>{t("goalTitle")}</b> · {t(`grades.${plan.grade}`)} · {t(`lengths.${plan.length}`)}
          <br />
          {topic.goal}
          <br />
          <span className="text-[0.8rem] text-muted-foreground">{t("goalNote")}</span>
        </div>

        {STAGES.map((stage, i) => (
          <Stage
            key={stage}
            name={t(`stageNames.${stage}`)}
            meta={t("minutes", { count: minutes[i] })}
          >
            <ul className="m-0 list-disc pl-4.5 text-[0.92rem]">
              {Object.values(topic.stages[stage].items).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.values(topic.stages[stage].resources).map((resource) => (
                <span
                  key={resource}
                  className="rounded-[7px] border border-line bg-panel-2 px-2 py-1 font-mono text-[0.72rem] text-cyan"
                >
                  {resource}
                </span>
              ))}
            </div>
          </Stage>
        ))}

        <Stage name={t("assessment")} meta={t("criteria")}>
          <p className="text-[0.92rem]">{topic.criteria}</p>
        </Stage>
      </div>
    </div>
  );
}

const selectClass =
  "w-full rounded-[10px] border border-line bg-panel-2 px-3 py-2.5 text-foreground";

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="mb-3.5 flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.8rem] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function Stage({ name, meta, children }: { name: string; meta: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 rounded-[14px] border border-line bg-panel p-3.5 md:grid-cols-[110px_1fr] md:gap-3.5">
      <div className="font-mono text-[0.8rem] text-cyan">
        <b className="block font-display text-[0.95rem] font-semibold text-foreground">{name}</b>
        {meta}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
