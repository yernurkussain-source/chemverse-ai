import { Suspense } from "react";
import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { CreateClassForm } from "@/components/teacher/forms";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTeacherClasses, getTeacherId } from "@/features/teacher/queries";
import { Link, redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Teacher");
  return { title: t("title") };
}

const TOOLS = [
  { key: "live", href: "/teacher/live" },
  { key: "studio", href: "/teacher/lesson-studio" },
  { key: "qr", href: "/teacher/qr" },
  { key: "lab", href: "/virtual-lab/titration" },
] as const;

// Мұғалім кабинеті: сыныптар және құралдар
export default function TeacherPage() {
  const t = useTranslations("Teacher");
  return (
    <div className="page-wrap py-10 md:py-14">
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("title")}</h1>
      <p className="mt-2 mb-8 max-w-[60ch] text-muted-foreground">{t("subtitle")}</p>

      <ul className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TOOLS.map((tool) => (
          <li key={tool.key}>
            <Link
              href={tool.href}
              className="flex h-full flex-col gap-1 rounded-[18px] border border-line bg-panel p-5 transition-colors hover:border-cyan-dim"
            >
              <span className="font-display font-semibold">{t(`tools.${tool.key}.title`)}</span>
              <span className="text-[0.86rem] text-muted-foreground">{t(`tools.${tool.key}.text`)}</span>
            </Link>
          </li>
        ))}
      </ul>

      <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
        <Classes />
      </Suspense>
    </div>
  );
}

async function Classes() {
  const value = await rootLocale();
  const locale: Locale = hasLocale(routing.locales, value) ? value : routing.defaultLocale;
  const t = await getTranslations("Teacher");
  const { userId, isTeacher } = await getTeacherId();
  if (!userId) {
    redirect({ href: "/login", locale });
    return null;
  }
  if (!isTeacher) {
    return (
      <Card className="max-w-xl gap-3 rounded-3xl border border-amber/50 bg-amber/10 p-6 ring-0">
        <p>{t("teachersOnly")}</p>
        <Link href="/demo" className={`${buttonVariants({ variant: "panel", size: "pill-sm" })} self-start`}>
          {t("teacherDemo")}
        </Link>
      </Card>
    );
  }

  const classes = await getTeacherClasses(userId);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <section>
        <h2 className="mb-4 font-display text-lg font-semibold">{t("classes")}</h2>
        {classes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted-foreground">{t("noClasses")}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {classes.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/teacher/classes/${c.id}`}
                  className="flex h-full flex-col gap-3 rounded-[18px] border border-line bg-panel p-5 transition-colors hover:border-cyan-dim"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-xl font-bold">{c.name}</span>
                    <span className="text-[0.85rem] text-muted-foreground">{t("studentsCount", { count: c.students })}</span>
                  </span>
                  <span className="text-[0.8rem] text-muted-foreground">
                    {t("joinCode")}:{" "}
                    <b className="font-mono text-lg tracking-[0.12em] text-cyan">
                      {c.join_code.slice(0, 3)} {c.join_code.slice(3)}
                    </b>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Card className="h-fit gap-4 rounded-3xl border border-line p-5 ring-0 shadow-[0_1px_2px_var(--shadow)] dark:shadow-none">
        <h2 className="font-display text-lg font-semibold">{t("newClass")}</h2>
        <CreateClassForm />
      </Card>
    </div>
  );
}
