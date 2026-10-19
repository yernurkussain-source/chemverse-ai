import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { AtomIcon, BookIcon, HomeIcon, ScanIcon, UserIcon } from "@/components/layout/nav-icons";
import { Eyebrow, Section } from "./section";

const FEATURE_ICONS: Record<"apk" | "scanner" | "xp", ReactNode> = {
  apk: (
    <>
      <rect className="text-cyan" x="6" y="2" width="10" height="18" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path className="text-cyan" d="M10 17h2" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  scanner: (
    <>
      <path className="text-cyan" d="M3 7V4h3M16 4h3v3M19 15v3h-3M6 18H3v-3" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path className="text-pink" d="M6 11h10" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  xp: (
    <path
      className="text-amber"
      d="M11 3c2 3 5 4 5 8a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-7z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  ),
};

// ҰБТ дайындығы (макеттегі мысал сандар)
const READINESS = [
  { key: "atom", value: 82, weak: false },
  { key: "bond", value: 64, weak: false },
  { key: "solutions", value: 41, weak: true },
  { key: "organic", value: 28, weak: true },
] as const;

export function AppShowcase() {
  const t = useTranslations("AppShowcase");
  const nav = useTranslations("BottomNav");

  return (
    <Section id="app">
      <div className="grid items-center gap-10 md:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h2 className="mt-2.5 text-[clamp(1.5rem,3.2vw,2.3rem)] font-bold">{t("title")}</h2>
          <p className="mt-3.5 max-w-[52ch] text-muted-foreground">{t("text")}</p>
          <ul className="mt-6 grid gap-3.5">
            {(["apk", "scanner", "xp"] as const).map((key) => (
              <li key={key} className="grid grid-cols-[28px_1fr] gap-3">
                <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="mt-[3px]">
                  {FEATURE_ICONS[key]}
                </svg>
                <span>
                  <b>{t(`features.${key}.title`)}</b>
                  <br />
                  <span className="text-muted-foreground">{t(`features.${key}.text`)}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link href="/install" className={`${buttonVariants({ variant: "glow", size: "pill" })} mt-6`}>
            {t("install")}
          </Link>
        </div>

        {/* Телефон макеті — сурет ретінде оқылады */}
        <div
          role="img"
          aria-label={t("phone.label")}
          className="mx-auto w-[300px] max-w-full rounded-[44px] border border-line bg-phone-frame p-3 shadow-[0_30px_80px_var(--shadow),0_0_60px_var(--glow-soft)]"
        >
          <div className="flex h-[580px] flex-col overflow-hidden rounded-[34px] bg-ink">
            <div className="mx-auto mt-2 h-[22px] w-[90px] rounded-xl bg-phone-frame" />
            <div className="flex flex-1 flex-col gap-3 overflow-hidden px-4 py-3.5">
              <div className="font-display text-[1.05rem] font-semibold">{t("phone.hello")}</div>
              <div className="grid grid-cols-2 gap-2">
                <Kpi label={t("phone.streak")} value={t("phone.streakValue")} className="text-amber" />
                <Kpi label={t("phone.xp")} value={t("phone.xpValue")} className="text-cyan" />
              </div>
              <div className="rounded-2xl border border-cyan-dim bg-linear-135 from-task-a to-task-b p-3 text-[0.84rem]">
                <span className="font-mono text-[0.7rem] text-muted-foreground">{t("phone.taskMeta")}</span>
                <b className="mt-0.5 mb-2 block text-[0.95rem]">{t("phone.taskTitle")}</b>
                <span className="inline-block rounded-full bg-cyan px-3 py-1 text-[0.78rem] font-bold text-on-accent">
                  {t("phone.taskStart")}
                </span>
              </div>
              <div className="font-mono text-[0.78rem] tracking-[0.06em] text-muted-foreground">
                {t("phone.readiness")}
              </div>
              <div className="grid gap-2 text-[0.78rem]">
                {READINESS.map(({ key, value, weak }) => (
                  <div key={key} className="grid grid-cols-[1fr_34px] gap-1">
                    <span>{t(`phone.topics.${key}`)}</span>
                    <span className="text-right font-mono text-muted-foreground">{value}%</span>
                    <div className="col-span-full h-1.5 overflow-hidden rounded bg-panel-2">
                      <i
                        className={weak ? "block h-full rounded bg-pink" : "block h-full rounded bg-cyan"}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-5 items-center border-t border-line bg-panel px-2 pt-2.5 pb-4 text-center text-[0.6rem] text-muted-foreground">
              <TabItem active icon={<HomeIcon size={18} />} label={nav("home")} />
              <TabItem icon={<BookIcon size={18} />} label={nav("learn")} />
              <div className="flex justify-center">
                <span className="-mt-[26px] grid size-[50px] place-items-center rounded-2xl bg-cyan text-on-accent shadow-[0_0_22px_var(--glow)]">
                  <ScanIcon />
                </span>
              </div>
              <TabItem icon={<AtomIcon size={18} />} label={nav("lab3d")} />
              <TabItem icon={<UserIcon size={18} />} label={nav("profile")} />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function Kpi({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div className="rounded-[14px] border border-line bg-panel p-2.5">
      <small className="font-mono text-[0.66rem] tracking-[0.06em] text-muted-foreground uppercase">{label}</small>
      <b className={`block font-mono text-[1.2rem] ${className}`}>{value}</b>
    </div>
  );
}

function TabItem({ icon, label, active }: { icon: ReactNode; label: string; active?: boolean }) {
  return (
    <div className={active ? "flex flex-col items-center gap-[3px] text-cyan" : "flex flex-col items-center gap-[3px]"}>
      {icon}
      {label}
    </div>
  );
}
