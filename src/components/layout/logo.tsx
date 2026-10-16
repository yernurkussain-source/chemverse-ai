import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** Атом белгісі — prototype.html-дегі логотип */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true" className="flex-none">
      <circle className="text-cyan" cx="15" cy="15" r="5" fill="currentColor" />
      <ellipse className="text-cyan" cx="15" cy="15" rx="13" ry="5" fill="none" stroke="currentColor" strokeWidth="1.4" opacity=".7" />
      <ellipse className="text-pink" cx="15" cy="15" rx="13" ry="5" fill="none" stroke="currentColor" strokeWidth="1.4" opacity=".8" transform="rotate(60 15 15)" />
      <ellipse className="text-cyan" cx="15" cy="15" rx="13" ry="5" fill="none" stroke="currentColor" strokeWidth="1.4" opacity=".5" transform="rotate(120 15 15)" />
    </svg>
  );
}

export function Logo() {
  const t = useTranslations("Common");
  return (
    <Link
      href="/"
      aria-label={t("logoLabel")}
      className="flex items-center gap-2 font-logo text-[0.9rem] font-extrabold tracking-[0.02em] whitespace-nowrap sm:gap-2.5 sm:text-base"
    >
      <LogoMark />
      {/* 360px-тен тар экранда тек атом белгісі көрінеді (мәзір сыйуы үшін) */}
      <span className="max-[359px]:sr-only">
        CHEMVERSE <b className="font-extrabold text-cyan">AI</b>
      </span>
    </Link>
  );
}
