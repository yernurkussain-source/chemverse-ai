import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { ProjectGradeForm } from "@/components/olympiad/project-forms";
import { ProjectBodyView, ProjectScoreView } from "@/components/olympiad/project-view";
import { getProject } from "@/features/olympiad/server/projects";
import { getTeacherId } from "@/features/teacher/queries";
import { Link } from "@/i18n/navigation";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Olympiad.projects");
  return { title: t("title") };
}

type Params = PageProps<"/[locale]/olympiad/projects/[id]">["params"];

// Жобаны көру: иесі және сол сыныптың мұғалімі (RLS); мұғалім рубрика бойынша бағалайды
export default function ProjectPage({ params }: PageProps<"/[locale]/olympiad/projects/[id]">) {
  const t = useTranslations("Olympiad");
  return (
    <div className="page-wrap py-6 md:py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Link href="/teacher/olympiad" className="text-[0.9rem] font-semibold text-cyan hover:underline">
          ← {t("teacher.title")}
        </Link>
        <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
          <ProjectContent params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function ProjectContent({ params }: { params: Params }) {
  const { id } = await params;
  const [project, { userId, isTeacher }, t] = await Promise.all([getProject(id), getTeacherId(), getTranslations("Olympiad.projects")]);
  if (!project) notFound();
  return (
    <>
      <header>
        <Eyebrow>
          {project.studentName ?? "—"} · {t(`status.${project.status}`)}
        </Eyebrow>
        <h1 className="mt-2 text-[clamp(1.3rem,2.8vw,1.9rem)] font-bold">{project.title}</h1>
      </header>
      <ProjectBodyView body={project.body} />
      {project.fileLinks.length > 0 && (
        <section className="flex flex-col gap-2 rounded-3xl border border-line bg-panel p-5">
          <h2 className="font-display text-lg font-semibold">{t("files.title")}</h2>
          <ul className="flex flex-col gap-1.5">
            {project.fileLinks.map((f) => (
              <li key={f.path}>
                {f.url ? (
                  <a href={f.url} target="_blank" rel="noopener" className="font-semibold text-cyan hover:underline">
                    📎 {f.name}
                  </a>
                ) : (
                  <span>📎 {f.name}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {project.score && <ProjectScoreView score={project.score} />}
      {isTeacher && userId !== project.user_id && <ProjectGradeForm id={project.id} score={project.score} />}
    </>
  );
}
