import type { ReactNode } from "react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { AtomIcon, BookIcon, ScanIcon } from "@/components/layout/nav-icons";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Learn");
  return { title: t("title") };
}

const ITEMS = [
  { key: "unt", href: "/exam/unt", icon: <BookIcon size={24} />, accent: true },
  { key: "ai", href: "/ai-tutor", icon: <SparkIcon />, accent: true },
  { key: "lab", href: "/virtual-lab", icon: <FlaskIcon /> },
  { key: "periodic", href: "/periodic-table", icon: <AtomIcon size={24} /> },
  { key: "molecules", href: "/molecules", icon: <AtomIcon size={24} /> },
  { key: "scan", href: "/scan", icon: <ScanIcon size={24} /> },
] as const;

// Оқу бөлімі: ҰБТ-ға дайындық және оқу құралдары (сабақтар кейін қосылады)
export default function LearnPage() {
  const t = useTranslations("Learn");
  return (
    <div className="page-wrap py-10 md:py-14">
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("title")}</h1>
      <p className="mt-2 mb-8 max-w-[60ch] text-muted-foreground">{t("subtitle")}</p>
      <ul className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {ITEMS.map((item) => (
          <li key={item.key}>
            <LearnCard
              href={item.href}
              icon={item.icon}
              title={t(`items.${item.key}.title`)}
              text={t(`items.${item.key}.text`)}
              accent={"accent" in item}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function FlaskIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="M9 3h6M10 3v6L4.5 18.5A2 2 0 006.2 21.5h11.6a2 2 0 001.7-3L14 9V3" strokeLinejoin="round" />
      <path d="M7 15h10" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" strokeLinejoin="round" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" strokeLinejoin="round" />
    </svg>
  );
}

function LearnCard({ href, icon, title, text, accent }: { href: string; icon: ReactNode; title: string; text: string; accent?: boolean }) {
  return (
    <Link
      href={href}
      className={`group flex h-full gap-4 rounded-[18px] border bg-panel p-5 shadow-[0_1px_2px_var(--shadow)] transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-cyan-dim dark:shadow-none ${accent ? "border-cyan-dim" : "border-line"}`}
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-line bg-panel-2 text-cyan">{icon}</span>
      <span className="flex flex-col gap-1">
        <span className="font-display text-[1.02rem] font-semibold group-hover:text-cyan">{title}</span>
        <span className="text-[0.88rem] text-muted-foreground">{text}</span>
      </span>
    </Link>
  );
}
