import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { GRADE_ACCENT, LabCard } from "@/components/virtual-lab/catalog-cards";
import { isLabGrade, LAB_GRADES, labsForGrade } from "@/features/virtual-lab/catalog";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return LAB_GRADES.map((grade) => ({ grade: String(grade) }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/virtual-lab/grade/[grade]">): Promise<Metadata> {
  const grade = Number((await params).grade);
  if (!isLabGrade(grade)) return {};
  const t = await getTranslations("ChemLab");
  return { title: `${t("grade", { grade })} · ChemLab`, description: t(`gradeFocus.${grade}`) };
}

type Params = PageProps<"/[locale]/virtual-lab/grade/[grade]">["params"];

// Сынып беті: тақырыптар мен тәжірибелер (дайындары ашық, қалғаны «Жақында»)
export default function GradePage({ params }: PageProps<"/[locale]/virtual-lab/grade/[grade]">) {
  const t = useTranslations("ChemLab");
  return (
    <div className="page-wrap py-8 md:py-12">
      <Link href="/virtual-lab" className="text-[0.9rem] font-semibold text-cyan hover:underline">
        ← {t("back")}
      </Link>
      <Suspense fallback={null}>
        <GradeContent params={params} />
      </Suspense>
    </div>
  );
}

async function GradeContent({ params }: { params: Params }) {
  const grade = Number((await params).grade);
  if (!isLabGrade(grade)) notFound();
  const t = await getTranslations("ChemLab");
  const labs = labsForGrade(grade);
  return (
    <>
      <Eyebrow className={cn("mt-5", GRADE_ACCENT[grade].text)}>{t(`gradeFocus.${grade}`)}</Eyebrow>
      <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("grade", { grade })}</h1>
      <p className="mt-2 mb-6 max-w-[62ch] text-muted-foreground">{t("gradeSubtitle")}</p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {labs.map((lab) => (
          <li key={lab.slug}>
            <LabCard lab={lab} accentGrade={grade} />
          </li>
        ))}
      </ul>
    </>
  );
}
