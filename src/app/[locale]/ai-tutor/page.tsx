import { Suspense } from "react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { TutorChat } from "@/components/ai/tutor-chat";
import { BackLink } from "@/components/layout/back-link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AiTutor");
  return { title: t("title") };
}

type SearchParams = PageProps<"/[locale]/ai-tutor">["searchParams"];

// AI мұғалім (BLUEPRINT 10.4). ?q=... — нәтиже бетінен келген сұрақ өріске алдын ала жазылады;
// ?mode=socratic — олимпиада есебінен келгенде дайын жауапсыз режим
export default function AiTutorPage({ searchParams }: PageProps<"/[locale]/ai-tutor">) {
  const t = useTranslations("AiTutor");
  return (
    <div className="page-wrap py-4 md:py-6">
      <div className="mx-auto max-w-3xl">
        <BackLink href="/learn" className="mb-2" />
        <h1 className="sr-only">{t("title")}</h1>
        <Suspense fallback={<TutorChat />}>
          <ChatWithQuestion searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function ChatWithQuestion({ searchParams }: { searchParams: SearchParams }) {
  const { q, mode } = await searchParams;
  return <TutorChat initialQuestion={typeof q === "string" ? q.slice(0, 2000) : ""} initialMode={mode === "socratic" ? "socratic" : "explain"} />;
}
