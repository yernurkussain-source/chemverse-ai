import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { labHref, labsForGrade, type LabEntry, type LabGrade } from "@/features/virtual-lab/catalog";
import { getMyAttempts } from "@/features/virtual-lab/queries";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Сынып карталарының акцент түсі (spec 10-бөлім): 7 — көгілдір, 8 — көк, 9 — таңқурай, 10 — сары */
export const GRADE_ACCENT: Record<LabGrade, { text: string; border: string; bg: string }> = {
  7: { text: "text-cyan", border: "border-cyan/40 hover:border-cyan", bg: "bg-cyan/10" },
  8: { text: "text-blue", border: "border-blue/40 hover:border-blue", bg: "bg-blue/10" },
  9: { text: "text-pink", border: "border-pink/40 hover:border-pink", bg: "bg-pink/10" },
  10: { text: "text-amber", border: "border-amber/40 hover:border-amber", bg: "bg-amber/10" },
};

export function GradeCard({ grade }: { grade: LabGrade }) {
  const t = useTranslations("ChemLab");
  const labs = labsForGrade(grade);
  const accent = GRADE_ACCENT[grade];
  return (
    <Link
      href={`/virtual-lab/grade/${grade}`}
      className={cn("flex h-full flex-col gap-2 rounded-3xl border bg-panel p-5 transition-colors", accent.border)}
    >
      <span className={cn("grid size-12 place-items-center rounded-2xl font-mono text-xl font-bold", accent.bg, accent.text)}>{grade}</span>
      <span className="font-display text-lg font-semibold">{t("grade", { grade })}</span>
      <span className="text-[0.9rem] text-muted-foreground">{t(`gradeFocus.${grade}`)}</span>
      <span className={cn("mt-auto pt-2 font-mono text-[0.78rem] font-semibold", accent.text)}>
        {t("gradeStats", { count: labs.length, ready: labs.filter((l) => l.status === "ready").length })}
      </span>
    </Link>
  );
}

export function LabCard({ lab, accentGrade }: { lab: LabEntry; accentGrade?: LabGrade }) {
  const t = useTranslations("ChemLab");
  const ready = lab.status === "ready";
  const accent = GRADE_ACCENT[accentGrade ?? lab.grades[0]];
  const content = (
    <>
      <span className="flex flex-wrap items-center gap-2">
        <span className={cn("font-mono text-[0.72rem] font-semibold tracking-wider uppercase", accent.text)}>{t(`catalog.${lab.slug}.topic`)}</span>
        {lab.grades.length > 1 && (
          <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[0.68rem] text-muted-foreground">
            {lab.grades.join("–")}
          </span>
        )}
      </span>
      <span className="font-display font-semibold">{t(`catalog.${lab.slug}.title`)}</span>
      <span className="text-[0.88rem] text-muted-foreground">{t(`catalog.${lab.slug}.work`)}</span>
      <span className={cn("mt-auto pt-1.5 text-[0.82rem] font-semibold", ready ? accent.text : "text-muted-foreground")}>
        {ready ? `${t("open")} →` : `🔒 ${t("soon")}`}
      </span>
    </>
  );
  const className = "flex h-full flex-col gap-1.5 rounded-2xl border bg-panel p-4";
  return ready ? (
    <Link href={labHref(lab)} className={cn(className, "transition-colors", accent.border)}>
      {content}
    </Link>
  ) : (
    <div aria-disabled="true" className={cn(className, "border-dashed border-line opacity-75")}>
      {content}
    </div>
  );
}

/** «Менің жұмыстарым»: кірген оқушының соңғы ChemLab нәтижелері (кірмеген болса — ештеңе) */
export async function MyWorks({ slug }: { slug?: string }) {
  const attempts = await getMyAttempts(slug);
  if (!attempts) return null;
  const t = await getTranslations("ChemLab");
  return (
    <section className="mt-10">
      <h2 className="mb-3 font-display text-xl font-semibold">{t("myWorks")}</h2>
      {attempts.length === 0 ? (
        <p className="text-muted-foreground">{t("myWorksEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {attempts.map((attempt) => (
            <li key={attempt.id}>
              <Link
                href={`/virtual-lab/${attempt.lab.slug}/result/${attempt.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-panel px-4 py-3 text-[0.92rem] transition-colors hover:border-cyan-dim"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{t(`catalog.${attempt.lab.slug}.title`)}</span>
                  <span className="font-mono text-[0.78rem] text-muted-foreground">{attempt.createdAt.slice(0, 10)}</span>
                </span>
                {attempt.total !== null && (
                  <span className="shrink-0 font-mono font-semibold text-cyan">{t("scoreShort", { score: attempt.total })}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
