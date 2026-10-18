"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FormError, SubmitButton, inputClass } from "@/components/auth/form-parts";
import { createQr } from "@/features/qr/actions";
import { EXAM_TARGETS, QR_TYPES, type QrType } from "@/features/qr/types";
import { ELEMENTS } from "@/lib/chemistry/elements";
import { MOLECULES } from "@/lib/chemistry/molecules";
import { cn } from "@/lib/utils";

/** Мұғалімнің жаңа QR жасайтын формасы: түрі + нысаны */
export function QrCreateForm() {
  const t = useTranslations("Qr");
  const tm = useTranslations("Molecules");
  const tExam = useTranslations("Exam");
  const locale = useLocale();
  const [type, setType] = useState<QrType>("ar");
  const [state, action] = useActionState(createQr, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[0.85rem] text-muted-foreground">{t("typeLabel")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {QR_TYPES.map((value) => (
            <label
              key={value}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-[0.9rem] font-semibold transition-colors",
                type === value ? "border-cyan bg-cyan/10 text-cyan" : "border-line bg-panel-2 hover:border-cyan-dim",
              )}
            >
              <input
                type="radio"
                name="type"
                value={value}
                checked={type === value}
                onChange={() => setType(value)}
                className="sr-only"
              />
              {t(`types.${value}`)}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Әр түрдің өз өрісі: тек таңдалғаны көрінеді, сервер `target_<түрі>` өрісін оқиды */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[0.85rem] text-muted-foreground">{t("targetLabel")}</span>
        {(type === "ar" || type === "molecule") && (
          <select name={`target_${type}`} className={inputClass} defaultValue="h2o">
            {MOLECULES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.formula} — {tm(`${m.id}.name`)}
              </option>
            ))}
          </select>
        )}
        {type === "element" && (
          <select name="target_element" className={inputClass} defaultValue="O">
            {ELEMENTS.map((e) => (
              <option key={e.symbol} value={e.symbol}>
                {e.number}. {e.symbol} — {e.name[locale]}
              </option>
            ))}
          </select>
        )}
        {type === "exam" && (
          <select name="target_exam" className={inputClass}>
            {EXAM_TARGETS.map((slug) => (
              <option key={slug} value={slug}>
                {tExam("untTitle")}
              </option>
            ))}
          </select>
        )}
      </label>

      <p className="text-[0.82rem] text-muted-foreground">{t(`hints.${type}`)}</p>
      <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
      {state?.created && (
        <p role="status" className="rounded-[10px] border border-good/40 bg-good/10 px-3 py-2 text-[0.88rem] text-good">
          {t("created")}
        </p>
      )}
      <SubmitButton>{t("create")}</SubmitButton>
    </form>
  );
}
