"use client";

import { useTranslations } from "next-intl";
import type { LabOutcome } from "@/features/virtual-lab/actions";
import type { ShellLabSlug } from "@/features/virtual-lab/catalog";
import { LAB_MODULES } from "./modules";
import { ScoreView } from "./score-view";

/** Нәтиже беті үшін: сақталған бағалау + оқушының қорытындысы */
export function LabResult({ slug, outcome, conclusion }: { slug: ShellLabSlug; outcome: LabOutcome; conclusion: string }) {
  const t = useTranslations("ChemLab.scoreView");
  return (
    <div className="flex flex-col gap-5">
      <ScoreView lab={LAB_MODULES[slug]} outcome={outcome} />
      {conclusion && (
        <section className="rounded-2xl border border-line bg-panel p-4">
          <h2 className="mb-1.5 font-display font-semibold">{t("yourConclusion")}</h2>
          <p className="leading-relaxed whitespace-pre-line">{conclusion}</p>
        </section>
      )}
    </div>
  );
}
