"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { Field, FormError, TextInput, inputClass } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import { generateLessonPlan } from "@/features/lesson-studio/actions";
import { KMZH_LESSON_TYPES, type KmzhLessonType } from "@/features/lesson-studio/kmzh";

const GRADES = [7, 8, 9, 10, 11] as const;
const MINUTES = [40, 45] as const;
const GROUPS = [2, 3, 4, 5] as const;
const INCLUDES = ["includeSEN", "includeFunctionalLiteracy", "includeLab"] as const;

/** ҚМЖ генераторының формасы (мектептің пішімі: docs/kmzh/KMZH_SPEC.md 3-бөлім) */
export function StudioForm() {
  const t = useTranslations("LessonStudio");
  const tTeacher = useTranslations("Teacher");
  const locale = useLocale();
  const [state, action] = useActionState(generateLessonPlan, null);
  const [type, setType] = useState<KmzhLessonType>("new");
  const isWork = type === "lab" || type === "practical";
  // Бүгінгі күн (айдың «Адал азамат» құндылығы осыдан таңдалады)
  const [today] = useState(() => new Date().toLocaleDateString("sv-SE"));

  return (
    <form action={action} className="flex flex-col gap-3.5">
      <input type="hidden" name="locale" value={locale} />
      <div className="grid grid-cols-2 gap-3">
        <Field id="studio-grade" label={t("grade")}>
          <select id="studio-grade" name="grade" defaultValue="8" className={inputClass}>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {tTeacher("gradeN", { n: g })}
              </option>
            ))}
          </select>
        </Field>
        <Field id="studio-date" label={t("date")}>
          <TextInput id="studio-date" name="date" type="date" defaultValue={today} />
        </Field>
      </div>
      <Field id="studio-section" label={t("section")}>
        <TextInput id="studio-section" name="section" maxLength={200} placeholder={t("sectionPlaceholder")} required />
      </Field>
      <Field id="studio-topic" label={t("topic")}>
        <TextInput id="studio-topic" name="topic" maxLength={200} placeholder={t("topicPlaceholder")} required />
      </Field>
      <Field id="studio-objectives" label={t("objectives")} hint={t("objectivesHint")}>
        <textarea id="studio-objectives" name="objectives" maxLength={1500} rows={3} placeholder={t("objectivesPlaceholder")} className={`${inputClass} resize-y`} />
      </Field>
      <Field id="studio-type" label={t("type")}>
        <select id="studio-type" name="lessonType" value={type} onChange={(e) => setType(e.target.value as KmzhLessonType)} className={inputClass}>
          {KMZH_LESSON_TYPES.map((value) => (
            <option key={value} value={value}>
              {t(`kmzhTypes.${value}`)}
            </option>
          ))}
        </select>
      </Field>
      {isWork && (
        <div className="grid grid-cols-[5rem_1fr] gap-3">
          <Field id="studio-lab-number" label={t("labNumber")}>
            <TextInput id="studio-lab-number" name="labNumber" inputMode="numeric" maxLength={4} placeholder="2" />
          </Field>
          <Field id="studio-lab-title" label={t("labTitle")}>
            <TextInput id="studio-lab-title" name="labTitle" maxLength={150} placeholder={t("labTitlePlaceholder")} />
          </Field>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field id="studio-minutes" label={t("duration")}>
          <select id="studio-minutes" name="lessonMinutes" defaultValue="45" className={inputClass}>
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {t("minutes", { count: m })}
              </option>
            ))}
          </select>
        </Field>
        <Field id="studio-groups" label={t("groupCount")}>
          <select id="studio-groups" name="groupCount" defaultValue="3" className={inputClass}>
            {GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-[0.85rem] text-muted-foreground">{t("includeTitle")}</legend>
        {INCLUDES.map((key) => (
          <label key={key} className="flex items-center gap-2.5 text-[0.9rem]">
            {/* «Зертхана» — әдепкі бойынша тек зертханалық/практикалық сабақта (әйтпесе AI жасанды «зертхана» ойлап табады) */}
            <input key={key === "includeLab" ? String(isWork) : key} type="checkbox" name={key} defaultChecked={key !== "includeLab" || isWork} className="size-4 accent-cyan" />
            {t(`include.${key}`)}
          </label>
        ))}
      </fieldset>
      <Field id="studio-ai-tools" label={t("aiTools")}>
        <TextInput id="studio-ai-tools" name="aiTools" maxLength={150} defaultValue="CHEMVERSE AI" />
      </Field>
      <Field id="studio-notes" label={t("notes")} hint={t("notesHint")}>
        <textarea id="studio-notes" name="notes" maxLength={600} rows={2} className={`${inputClass} resize-y`} />
      </Field>
      <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
      <GenerateButton />
    </form>
  );
}

function GenerateButton() {
  const t = useTranslations("LessonStudio");
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-col gap-1.5">
      <Button type="submit" variant="glow" size="pill" disabled={pending} className="w-full">
        {pending ? t("generating") : t("generate")}
      </Button>
      {pending && <p className="text-center text-[0.8rem] text-muted-foreground">{t("generatingHint")}</p>}
    </div>
  );
}
