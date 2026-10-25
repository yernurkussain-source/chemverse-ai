import { Suspense } from "react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { ImportForm, ProblemEditorForm } from "@/components/olympiad/content-forms";
import { Button, buttonVariants } from "@/components/ui/button";
import type { BankProblem } from "@/features/olympiad/core";
import { getTopics } from "@/features/olympiad/server/queries";
import { toggleProblem } from "@/features/olympiad/teacher-actions";
import { getTeacherId } from "@/features/teacher/queries";
import { Link } from "@/i18n/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Olympiad.editor");
  return { title: t("title") };
}

// Есептер банкі: мұғалімнің өз есептері (қосу — тексергішпен, жасыру/көрсету), JSON экспорт/импорт
export default function ProblemsPage() {
  const t = useTranslations("Olympiad");
  return (
    <div className="page-wrap py-6 md:py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Link href="/teacher/olympiad" className="text-[0.9rem] font-semibold text-cyan hover:underline">
          ← {t("teacher.title")}
        </Link>
        <header>
          <Eyebrow>{t("teacher.eyebrow")}</Eyebrow>
          <h1 className="mt-2 text-[clamp(1.4rem,3vw,2rem)] font-bold">{t("editor.title")}</h1>
          <p className="mt-1.5 text-muted-foreground">{t("editor.subtitle")}</p>
        </header>
        <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
          <Content />
        </Suspense>
      </div>
    </div>
  );
}

async function Content() {
  const [{ userId, isTeacher }, t, topics] = await Promise.all([getTeacherId(), getTranslations("Olympiad.editor"), getTopics()]);
  if (!userId || !isTeacher) {
    return (
      <p className="rounded-3xl border border-line bg-panel-2 p-6">
        {t("teacherOnly")}{" "}
        <Link href="/teacher" className="font-semibold text-cyan underline">
          {t("toTeacher")}
        </Link>
      </p>
    );
  }
  const admin = createAdminClient();
  const { data } = admin
    ? await admin.from("olympiad_problems").select("body, status").eq("author_id", userId).order("created_at", { ascending: false }).returns<{ body: BankProblem; status: string }[]>()
    : { data: [] as { body: BankProblem; status: string }[] };
  const mine = data ?? [];

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">{t("add")}</h2>
        <ProblemEditorForm topics={topics.filter((x) => x.n <= 32).map(({ n, title }) => ({ n, title }))} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold">{t("mine", { count: mine.length })}</h2>
        {mine.length === 0 ? (
          <p className="text-muted-foreground">{t("mineEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {mine.map(({ body: p, status }) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-panel p-3">
                <span className="min-w-0 flex-1 text-[0.88rem]">
                  <span className="font-mono text-cyan">{p.id}</span> · {p.topic} · {t(`types.${p.type}`)} · <span className="line-clamp-1">{p.kk}</span>
                </span>
                <form action={toggleProblem}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="status" value={status === "hidden" ? "published" : "hidden"} />
                  <Button type="submit" variant={status === "hidden" ? "glow" : "panel"} size="pill-sm">
                    {status === "hidden" ? t("show") : t("hide")}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border border-line bg-panel p-5">
        <h2 className="font-display text-lg font-semibold">{t("jsonTitle")}</h2>
        <p className="text-[0.88rem] text-muted-foreground">{t("jsonText")}</p>
        <a href="/api/olympiad/bank" download className={`${buttonVariants({ variant: "panel", size: "pill-sm" })} self-start`}>
          ⬇ {t("export")}
        </a>
        <ImportForm />
      </section>
    </>
  );
}
