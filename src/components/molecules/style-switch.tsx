"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { VIEW_STYLES, type ViewStyle } from "./molecule-viewer";

/** Көрініс стилін таңдау: шар-таяқша / көлемді / сызықтық */
export function StyleSwitch({ value, onChange }: { value: ViewStyle; onChange: (style: ViewStyle) => void }) {
  const t = useTranslations("MoleculeViewer");
  return (
    <div role="group" aria-label={t("styleLabel")} className="flex flex-wrap gap-1.5">
      {VIEW_STYLES.map((style) => (
        <button
          key={style}
          type="button"
          aria-pressed={value === style}
          onClick={() => onChange(style)}
          className={cn(
            "min-h-9 rounded-full border px-3.5 text-[0.85rem] font-semibold transition-colors",
            value === style ? "border-cyan bg-cyan text-on-accent" : "border-line bg-panel hover:border-cyan-dim",
          )}
        >
          {t(`styles.${style}`)}
        </button>
      ))}
    </div>
  );
}
