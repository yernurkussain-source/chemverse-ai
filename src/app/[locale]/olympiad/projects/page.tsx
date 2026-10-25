import { Suspense } from "react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { ProjectFiles, ProjectForm } from "@/components/olympiad/project-forms";
import { ProjectScoreView } from "@/components/olympiad/project-view";
import { buttonVariants } from "@/components/ui/button";
import { PROJECT_CRITERIA } from "@/features/olympiad/projects";
import { getMyProject } from "@/features/olympiad/server/projects";
import { getTeacherId } from "@/features/teacher/queries";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Olympiad.projects");
  return { title: t("title") };
}

// Ғылыми жобалар (34-сабақ): жобаны рәсімдеу, файлдар, мұғалімнің рубрика бойынша бағасы
export default function ProjectsPage() {
  const t = useTranslations("Olympiad");
  return (
    <div className="page-wrap py-6 md:py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Link href="/olympiad" className="text-[0.9rem] font-semibold text-cyan hover:underline">
          ← {t("map")}
        </Link>
        <header>
          <Eyebrow>{t("topicN", { n: 34 })}</Eyebrow>
          <h1 className="mt-2 text-[clamp(1.4rem,3vw,2rem)] font-bold">{t("projects.title")}</h1>
          <p className="mt-1.5 text-muted-foreground">{t("projects.subtitle")}</p>
          <p className="mt-2 text-[0.85rem] text-muted-foreground">
            {t("projects.rubric")}: {PROJECT_CRITERIA.map((c) => t(`projects.criteria.${c}`)).join(" · ")}
          </p>
        </header>
        <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
          <MyProject />
        </Suspense>
      </div>
    </div>
  );
}

async function MyProject() {
  const [{ userId, isTeacher }, t] = await Promise.all([getTeacherId(), getTranslations("Olympiad")]);
  if (!userId) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-3xl border border-line bg-panel p-6">
        <p>{t("projects.login")}</p>
        <Link href="/login" className={buttonVariants({ variant: "glow", size: "pill" })}>
          {t("login")}
        </Link>
      </div>
    );
  }
  if (isTeacher) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-3xl border border-line bg-panel p-6">
        <p>{t("projects.teacherNote")}</p>
        <Link href="/teacher/olympiad" className={buttonVariants({ variant: "glow", size: "pill" })}>
          {t("teacher.title")} →
        </Link>
      </div>
    );
  }
  const project = await getMyProject(userId);
  return (
    <>
      {project && (
        <p className="text-[0.9rem]">
          {t("projects.statusLabel")}: <span className="font-semibold text-cyan">{t(`projects.status.${project.status}`)}</span>
        </p>
      )}
      {project?.score && <ProjectScoreView score={project.score} />}
      <ProjectForm title={project?.title ?? ""} body={project?.body ?? {}} />
      {project ? <ProjectFiles files={project.fileLinks} /> : <p className="text-[0.88rem] text-muted-foreground">{t("projects.filesAfterSave")}</p>}
    </>
  );
}
