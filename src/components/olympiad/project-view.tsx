import { getTranslations } from "next-intl/server";
import { PROJECT_CRITERIA, PROJECT_FIELDS, type ProjectBody, type ProjectScore } from "@/features/olympiad/projects";

/** Жобаның мазмұны (оқуға) */
export async function ProjectBodyView({ body }: { body: ProjectBody }) {
  const t = await getTranslations("Olympiad.projects");
  return (
    <dl className="flex flex-col gap-3 rounded-3xl border border-line bg-panel p-5">
      {PROJECT_FIELDS.filter((f) => body[f]).map((f) => (
        <div key={f}>
          <dt className="font-display font-semibold">{t(`fields.${f}`)}</dt>
          <dd className="mt-0.5 text-[0.95rem] whitespace-pre-line">{body[f]}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Мұғалімнің бағасы (рубрика бойынша) */
export async function ProjectScoreView({ score }: { score: ProjectScore }) {
  const t = await getTranslations("Olympiad.projects");
  return (
    <section className="flex flex-col gap-2 rounded-3xl border border-good/40 bg-good/5 p-5">
      <h2 className="font-display text-lg font-semibold">
        {t("score")}: <span className="font-mono text-good">{t("scoreValue", { total: score.total, max: PROJECT_CRITERIA.length * 5 })}</span>
      </h2>
      <ul className="grid gap-1 text-[0.9rem] sm:grid-cols-2">
        {PROJECT_CRITERIA.map((c) => (
          <li key={c} className="flex justify-between gap-2">
            <span>{t(`criteria.${c}`)}</span>
            <span className="font-mono">{score.criteria[c]} / 5</span>
          </li>
        ))}
      </ul>
      {score.comment && <p className="text-[0.92rem] whitespace-pre-line">💬 {score.comment}</p>}
    </section>
  );
}
