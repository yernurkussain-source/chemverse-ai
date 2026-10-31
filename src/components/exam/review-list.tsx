import { getTranslations } from "next-intl/server";
import type { ReviewItem } from "@/features/exam/queries";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Сұрақтарды талдау: дұрыс/қате нұсқа, түсіндірме, «AI-дан сұрау» (нәтиже беті және қателер дәптері) */
export async function ReviewList({ items, numbered = true }: { items: ReviewItem[]; numbered?: boolean }) {
  const t = await getTranslations("Exam");
  return (
    <ol className="flex flex-col gap-3">
      {items.map((item, i) => {
        const isCorrect = Boolean(item.chosenId) && item.chosenId === item.correctId;
        return (
          <li key={item.id}>
            <details className="group rounded-2xl border border-line bg-panel" open={!isCorrect && i < 3 ? true : undefined}>
              <summary className="flex min-h-12 cursor-pointer list-none items-start gap-3 p-4">
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full font-mono text-[0.8rem] font-semibold",
                    isCorrect ? "bg-good/15 text-good" : item.chosenId ? "bg-pink/15 text-pink" : "bg-panel-2 text-muted-foreground",
                  )}
                  aria-label={isCorrect ? t("correct") : item.chosenId ? t("wrong") : t("skipped")}
                >
                  {numbered ? i + 1 : "✕"}
                </span>
                <span className="flex-1 text-[0.95rem]">{item.body}</span>
                <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <div className="flex flex-col gap-2 border-t border-line p-4">
                <ul className="flex flex-col gap-1.5">
                  {item.options.map((option) => {
                    const correct = option.id === item.correctId;
                    const chosen = option.id === item.chosenId;
                    return (
                      <li
                        key={option.id}
                        className={cn(
                          "flex items-start gap-2.5 rounded-xl border px-3 py-2 text-[0.9rem]",
                          correct ? "border-good/50 bg-good/10" : chosen ? "border-pink/50 bg-pink/10" : "border-transparent",
                        )}
                      >
                        <span className="font-mono font-semibold">{option.label}</span>
                        <span className="flex-1">{option.body}</span>
                        {correct && <span className="text-[0.78rem] font-semibold text-good">{t("correctAnswer")}</span>}
                        {chosen && !correct && <span className="text-[0.78rem] font-semibold text-pink">{t("yourAnswer")}</span>}
                      </li>
                    );
                  })}
                </ul>
                {item.explanation && (
                  <p className="rounded-xl bg-panel-2 px-3 py-2 text-[0.88rem] text-muted-foreground">{item.explanation}</p>
                )}
                {!isCorrect && (
                  <Link
                    href={{ pathname: "/ai-tutor", query: { q: askAiPrompt(item, t) } }}
                    className="self-start rounded-full border border-cyan-dim px-3.5 py-2 text-[0.82rem] font-semibold text-cyan hover:bg-cyan/10"
                  >
                    ✦ {t("askAi")}
                  </Link>
                )}
              </div>
            </details>
          </li>
        );
      })}
    </ol>
  );
}

/** AI мұғалімге жіберілетін сұрақ: шарты, нұсқалар, оқушының және дұрыс жауап */
function askAiPrompt(item: ReviewItem, t: Awaited<ReturnType<typeof getTranslations<"Exam">>>) {
  const label = (id: string | null) => item.options.find((o) => o.id === id)?.label ?? "—";
  const options = item.options.map((o) => `${o.label}) ${o.body}`).join("\n");
  return t("askAiPrompt", {
    question: item.body,
    options,
    chosen: item.chosenId ? label(item.chosenId) : t("skipped"),
    correct: label(item.correctId),
  });
}

