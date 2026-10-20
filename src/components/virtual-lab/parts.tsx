"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** «Модель нәтижесі — нақты өлшенген дерек емес» белгісі (spec 4-бөлім) */
export function ModelBadge({ className }: { className?: string }) {
  const t = useTranslations("ChemLab");
  return (
    <span
      title={t("modelBadgeTitle")}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-cyan-dim bg-cyan/10 px-2 py-0.5 font-mono text-[0.68rem] font-semibold text-cyan",
        className,
      )}
    >
      <span aria-hidden="true">◇</span>
      {t("modelBadge")}
      <span className="sr-only">: {t("modelBadgeTitle")}</span>
    </span>
  );
}

/** Қауіпсіздік карточкасы — әр тәжірибенің 1-қадамында міндетті */
export function SafetyCard({ title, rules }: { title: string; rules: string[] }) {
  return (
    <aside className="rounded-3xl border border-amber/50 bg-amber/10 p-5">
      <h3 className="font-display font-semibold text-amber">⚠ {title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.9rem]">
        {rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </aside>
  );
}

/** Сандық көрсеткіш (колба қасындағы V, pH т.б.) */
export function Readout({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl bg-panel-2 px-3 py-2.5">
      {/* uppercase қолданылмайды: «NaOH», «pH» жазылуы химиялық тұрғыдан дәл қалуы керек */}
      <dt className="font-mono text-[0.72rem] tracking-[0.04em] text-muted-foreground">{label}</dt>
      <dd className={cn("m-0 font-mono font-semibold tabular-nums", small ? "text-base" : "text-[1.4rem]")}>{value}</dd>
    </div>
  );
}

/** Бір нұсқаны таңдау (болжам, сұрақ): үлкен батырмалар — телефонда басуға ыңғайлы */
export function ChoiceList({
  name,
  options,
  value,
  onChange,
  label,
}: {
  name: string;
  options: { value: string; label: string }[];
  value: string | null | undefined;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            name={name}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex min-h-12 items-center gap-3 rounded-2xl border px-4 py-2.5 text-left transition-colors",
              selected ? "border-cyan bg-cyan/10 font-semibold" : "border-line bg-panel-2 hover:border-cyan-dim",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full border-2",
                selected ? "border-cyan" : "border-line",
              )}
            >
              {selected && <span className="size-2.5 rounded-full bg-cyan" />}
            </span>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
