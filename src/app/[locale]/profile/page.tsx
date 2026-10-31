import { Suspense } from "react";
import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserIcon } from "@/components/layout/nav-icons";
import { JoinClassForm } from "@/components/teacher/forms";
import { MyWorks } from "@/components/virtual-lab/catalog-cards";
import { DeleteAccount } from "@/components/auth/delete-account";
import { signOut } from "@/features/auth/actions";
import { BADGES, type BadgeId } from "@/features/auth/badges";
import { getCurrentAccount } from "@/features/auth/queries";
import { createClient } from "@/lib/supabase/server";
import { getStudentAssignments } from "@/features/teacher/queries";
import { cn } from "@/lib/utils";
import { Link, redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { BackLink } from "@/components/layout/back-link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Profile");
  return { title: t("title") };
}

export default function ProfilePage() {
  const t = useTranslations("Profile");
  return (
    <div className="page-wrap py-10 md:py-16">
      <div className="mx-auto max-w-xl">
        <BackLink href="/" />
      </div>
      <Card className="mx-auto max-w-xl gap-5 rounded-3xl border border-line p-6 ring-0 shadow-[0_1px_2px_var(--shadow)] sm:p-8 dark:shadow-none">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
          <ProfileDetails />
        </Suspense>
      </Card>
    </div>
  );
}

async function currentLocale(): Promise<Locale> {
  const value = await rootLocale();
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}

// Сессияны оқитын бөлік (сұраныс кезінде орындалады)
async function ProfileDetails() {
  const locale = await currentLocale();
  const t = await getTranslations("Profile");
  const tGrades = await getTranslations("Studio.grades");
  const account = await getCurrentAccount();
  if (!account) {
    redirect({ href: "/login", locale });
    return null;
  }
  const { user, profile, classes } = account;
  const roleLabel =
    profile?.role === "teacher" ? t("roleTeacher") : profile?.role === "guest" ? t("roleGuest") : t("roleStudent");
  const gradeLabel = profile?.grade ? tGrades(`g${profile.grade}` as "g7") : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-cyan text-on-accent">
          <UserIcon size={28} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold">{profile?.full_name || user.email}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge variant="outline" className="border-cyan-dim text-cyan">{roleLabel}</Badge>
            {profile?.is_demo && (
              <Badge variant="outline" className="border-amber text-amber">{t("demoBadge")}</Badge>
            )}
          </div>
        </div>
      </div>

      {!profile?.onboarded && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-amber/50 bg-amber/10 p-4">
          <p className="text-[0.92rem]">{t("notOnboarded")}</p>
          <Link href="/onboarding" className={buttonVariants({ variant: "glow", size: "pill-sm" })}>
            {t("completeOnboarding")}
          </Link>
        </div>
      )}

      <dl className="m-0 grid grid-cols-2 gap-2.5">
        <Info label={t("email")} value={user.email ?? "—"} wide />
        {profile?.school && <Info label={t("school")} value={profile.school} wide />}
        {gradeLabel && profile?.role === "student" && <Info label={t("grade")} value={gradeLabel} />}
        {profile?.role === "student" && (
          <>
            <Info label={t("xp")} value={String(profile.xp)} accent="text-cyan" />
            <Info label={t("streak")} value={t("streakDays", { count: profile.streak_days })} accent="text-amber" />
          </>
        )}
      </dl>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">{t("classes")}</h2>
        {classes.length === 0 ? (
          <p className="text-[0.9rem] text-muted-foreground">{t("noClasses")}</p>
        ) : (
          <ul className="grid gap-2">
            {classes.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-panel-2 px-3.5 py-2.5">
                <span className="font-semibold">{c.name}</span>
                {profile?.role === "teacher" && (
                  <span className="text-right text-[0.8rem] text-muted-foreground">
                    {t("joinCode")}:{" "}
                    <b className="font-mono text-base tracking-[0.12em] text-cyan">
                      {c.join_code.slice(0, 3)} {c.join_code.slice(3)}
                    </b>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {profile?.role === "student" && <JoinClassForm />}
      </section>

      {profile?.role === "student" && <StudentAssignments userId={user.id} locale={locale} />}
      {profile?.role === "student" && <MyWorks />}
      {profile?.role === "student" && <Badges userId={user.id} />}

      <div className="flex flex-wrap gap-2.5">
        {profile?.role === "teacher" ? (
          <Link href="/teacher" className={buttonVariants({ variant: "glow", size: "pill-sm" })}>
            {t("teacherLink")}
          </Link>
        ) : (
          <Link href="/exam/unt" className={buttonVariants({ variant: "glow", size: "pill-sm" })}>
            {t("examLink")}
          </Link>
        )}
        {profile?.onboarded && (
          <Link href="/onboarding" className={buttonVariants({ variant: "panel", size: "pill-sm" })}>
            {t("edit")}
          </Link>
        )}
        <form action={signOut}>
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className={buttonVariants({ variant: "panel", size: "pill-sm" })}>
            {t("signOut")}
          </button>
        </form>
      </div>

      {!profile?.is_demo && <DeleteAccount />}
    </div>
  );
}

const BADGE_ICON: Record<BadgeId, string> = { first_test: "📝", first_lab: "🧪", unt_80: "🎯", lab_master: "⚗️", streak_7: "🔥", xp_1000: "⭐" };

/** Жетістіктер: алынғандары түрлі түсті, қалғандары — сұр, астында қалай алуға болатыны */
async function Badges({ userId }: { userId: string }) {
  const t = await getTranslations("Badges");
  const supabase = await createClient();
  const { data } = await supabase.from("user_achievements").select("achievement_id").eq("user_id", userId);
  const earned = new Set((data ?? []).map((row) => row.achievement_id as string));
  const count = BADGES.filter((id) => earned.has(id)).length;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">
        {t("title")} <span className="font-mono text-[0.9rem] text-muted-foreground">{count}/{BADGES.length}</span>
      </h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {BADGES.map((id) => {
          const has = earned.has(id);
          return (
            <li
              key={id}
              className={cn("flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center", has ? "border-cyan-dim bg-cyan/5" : "border-line")}
            >
              <span aria-hidden className={cn("text-2xl", !has && "opacity-40 grayscale")}>
                {BADGE_ICON[id]}
              </span>
              <span className={cn("text-[0.78rem] font-semibold leading-tight", !has && "text-muted-foreground")}>{t(`${id}.title`)}</span>
              <span className="text-[0.7rem] leading-snug text-muted-foreground">{has ? t("earned") : t(`${id}.hint`)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Оқушыға мұғалім берген тапсырмалар */
async function StudentAssignments({ userId, locale }: { userId: string; locale: Locale }) {
  const t = await getTranslations("Profile");
  const assignments = await getStudentAssignments(userId, locale);
  if (!assignments.length) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">{t("assignments")}</h2>
      <ul className="grid gap-2">
        {assignments.map((a) => (
          <li key={a.id}>
            <Link
              href={a.href}
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-panel-2 px-3.5 py-2.5 hover:border-cyan-dim"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold">{a.title}</span>
                <span className="text-[0.78rem] text-muted-foreground">
                  {a.className}
                  {a.dueAt && ` · ${t("due", { date: a.dueAt.slice(0, 10) })}`}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 text-[0.8rem] font-semibold",
                  a.done ? "text-good" : a.overdue ? "text-pink" : "text-amber",
                )}
              >
                {a.done ? t("assignmentDone") : a.overdue ? t("assignmentOverdue") : t("assignmentTodo")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Info({ label, value, wide, accent }: { label: string; value: string; wide?: boolean; accent?: string }) {
  return (
    <div className={`min-w-0 rounded-xl bg-panel-2 px-3.5 py-2.5 ${wide ? "col-span-2" : ""}`}>
      <dt className="font-mono text-[0.72rem] tracking-[0.04em] text-muted-foreground">{label}</dt>
      <dd className={`m-0 truncate font-semibold ${accent ?? ""}`}>{value}</dd>
    </div>
  );
}
