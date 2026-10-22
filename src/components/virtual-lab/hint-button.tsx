"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { HintStep, ShellLabSlug } from "@/features/virtual-lab/catalog";
import { requestLabHint } from "@/features/virtual-lab/hint-action";
import { cn } from "@/lib/utils";

type Hint = { level: number; text: string; source: "ai" | "static" };

/**
 * «Ишара алу» (spec 7-бөлім): әр басқанда келесі деңгей — 1) бағыттаушы сұрақ, 2) нақтырақ кеңес,
 * 3) шешімнің бірінші қадамы. Дайын жауап берілмейді. Қадам ауысқанда ишаралар қайта басталады
 * (компонент қадамның key-імен қайта құрылады).
 */
export function HintButton({ slug, step, context }: { slug: ShellLabSlug; step: HintStep; context: () => string }) {
  const t = useTranslations("ChemLab.hint");
  const locale = useLocale();
  const [hints, setHints] = useState<Hint[]>([]);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const next = (hints.at(-1)?.level ?? 0) + 1;

  function ask() {
    if (next > 3) return;
    setError(false);
    startTransition(async () => {
      const result = await requestLabHint({ slug, step, level: next as 1 | 2 | 3, locale, context: context() });
      if (!result.ok) {
        setError(true);
        return;
      }
      setHints((list) => [...list, { level: next, text: result.text, source: result.source }]);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {hints.map((hint) => (
        <div key={hint.level} className="rounded-2xl border border-amber/40 bg-amber/10 px-4 py-3 text-[0.9rem]">
          <p className="mb-1 flex flex-wrap items-center gap-2 text-[0.75rem] font-semibold text-amber">
            {t("level", { level: hint.level })} · {hint.source === "ai" ? t("ai") : t("static")}
          </p>
          <p className="leading-relaxed whitespace-pre-line">{hint.text}</p>
        </div>
      ))}
      {error && (
        <p role="alert" className="text-[0.85rem] text-pink">
          {t("error")}
        </p>
      )}
      {next <= 3 ? (
        <button
          type="button"
          onClick={ask}
          disabled={pending}
          className={cn(
            "self-start rounded-full border border-amber/50 px-3.5 py-1.5 text-[0.85rem] font-semibold text-amber transition-colors hover:bg-amber/10 disabled:opacity-60",
          )}
        >
          {pending ? t("loading") : hints.length ? t("more") : t("button")}
        </button>
      ) : (
        <p className="text-[0.82rem] text-muted-foreground">{t("noMore")}</p>
      )}
    </div>
  );
}
