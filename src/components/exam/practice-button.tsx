import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { startExam } from "@/features/exam/actions";
import type { Locale } from "@/i18n/routing";

/** «Тараудан 10 сұрақ»: осы тарау бойынша жаттығу (кірмеген пайдаланушыны startExam кіру бетіне жібереді) */
export function PracticeButton({ topic, locale }: { topic: string; locale: Locale }) {
  const t = useTranslations("Lessons");
  return (
    <form action={startExam}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="slug" value="practice" />
      <input type="hidden" name="topic" value={topic} />
      <button type="submit" className={buttonVariants({ variant: "panel", size: "pill-sm" })}>
        {t("test")}
      </button>
    </form>
  );
}
