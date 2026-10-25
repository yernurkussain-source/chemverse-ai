import { Suspense } from "react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { buttonVariants } from "@/components/ui/button";
import { getMyRatings, getTeacherRatings } from "@/features/olympiad/server/rating";
import { getTeacherClasses, getTeacherId } from "@/features/teacher/queries";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Olympiad.rating");
  return { title: t("title") };
}

// Үйірме рейтингі: тек сынып ішінде — оқушы өз орнын, мұғалім толық кестені көреді
export default function RatingPage() {
  const t = useTranslations("Olympiad");
  return (
    <div className="page-wrap py-6 md:py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Link href="/olympiad" className="text-[0.9rem] font-semibold text-cyan hover:underline">
          ← {t("map")}
        </Link>
        <header>
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h1 className="mt-2 text-[clamp(1.4rem,3vw,2rem)] font-bold">{t("rating.title")}</h1>
          <p className="mt-1.5 text-muted-foreground">{t("rating.subtitle")}</p>
        </header>
        <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
          <Rating />
        </Suspense>
      </div>
    </div>
  );
}

async function Rating() {
  const [{ userId, isTeacher }, t] = await Promise.all([getTeacherId(), getTranslations("Olympiad")]);
  if (!userId) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-3xl border border-line bg-panel p-6">
        <p>{t("rating.login")}</p>
        <Link href="/login" className={buttonVariants({ variant: "glow", size: "pill" })}>
          {t("login")}
        </Link>
      </div>
    );
  }

  if (isTeacher) {
    const ratings = await getTeacherRatings(await getTeacherClasses(userId));
    if (!ratings.length) return <p className="rounded-3xl border border-line bg-panel-2 p-6 text-muted-foreground">{t("rating.noClasses")}</p>;
    return ratings.map(({ className, rows }) => (
      <section key={className} className="flex flex-col gap-2 rounded-3xl border border-line bg-panel p-5">
        <h2 className="font-display text-lg font-semibold">{className}</h2>
        {rows.length === 0 ? (
          <p className="text-muted-foreground">{t("rating.noStudents")}</p>
        ) : (
          <table className="w-full text-left text-[0.92rem]">
            <thead className="text-[0.8rem] text-muted-foreground">
              <tr>
                <th className="py-1 pr-2">#</th>
                <th className="py-1 pr-2">{t("rating.student")}</th>
                <th className="py-1 pr-2 text-right">{t("rating.points")}</th>
                <th className="py-1 text-right">{t("rating.mastered")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.userId} className="border-t border-line">
                  <td className="py-1.5 pr-2 font-mono">{i + 1}</td>
                  <td className="py-1.5 pr-2">{r.name}</td>
                  <td className="py-1.5 pr-2 text-right font-mono">{r.points}</td>
                  <td className="py-1.5 text-right font-mono">{r.mastered}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    ));
  }

  const mine = await getMyRatings(userId);
  if (!mine.length) return <p className="rounded-3xl border border-line bg-panel-2 p-6 text-muted-foreground">{t("rating.noClass")}</p>;
  return mine.map((r) => (
    <section key={r.className} className="flex flex-col gap-1 rounded-3xl border border-cyan-dim bg-panel p-6">
      <p className="text-[0.9rem] text-muted-foreground">{r.className}</p>
      <p className="font-mono text-[clamp(2rem,6vw,3rem)] leading-none font-bold text-cyan">{t("rating.place", { rank: r.rank, total: r.total })}</p>
      <p className="mt-1">{t("rating.mine", { points: r.points, mastered: r.mastered })}</p>
    </section>
  ));
}
