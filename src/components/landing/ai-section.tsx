import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { AiChatDemo } from "./ai-chat-demo";
import { Eyebrow, Section } from "./section";

const GESTURES = ["point", "pinch", "fist", "palm"] as const;

export function AiSection() {
  const t = useTranslations("Ai");

  return (
    <Section id="ai">
      <div className="grid items-start gap-4.5 lg:grid-cols-[1fr_1.25fr]">
        <div className="min-w-0">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h2 className="mt-2.5 text-[clamp(1.5rem,3.2vw,2.3rem)] font-bold">{t("title")}</h2>
          <p className="mt-3.5 max-w-[48ch] text-muted-foreground">{t("text")}</p>
          <Link href="/ai-tutor" className={`${buttonVariants({ variant: "glow", size: "pill" })} mt-5`}>
            {t("openTutor")}
          </Link>

          <h3 className="mt-8.5 text-[1.02rem] font-semibold">{t("gesturesTitle")}</h3>
          <ul className="mt-5 grid gap-2.5">
            {GESTURES.map((g) => (
              <li
                key={g}
                className="grid gap-0.5 rounded-[14px] border border-line bg-panel px-3.5 py-3 text-[0.92rem] min-[480px]:grid-cols-[170px_1fr] min-[480px]:gap-3"
              >
                <b className="font-mono text-[0.85rem] font-semibold text-cyan">{t(`gestures.${g}.name`)}</b>
                <span>{t(`gestures.${g}.action`)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[0.85rem] text-muted-foreground">{t("privacy")}</p>
        </div>

        <AiChatDemo />
      </div>
    </Section>
  );
}
