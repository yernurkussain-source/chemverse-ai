import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Мәтіні берілмесе — төменгі мәзірдегі атауы
const NAV_LABELS = { "/": "home", "/learn": "learn" } as const;

type Props = { className?: string } & (
  | { href: keyof typeof NAV_LABELS; children?: never }
  | { href: string; children: ReactNode }
);

/** Беттің басындағы «← бөлім» сілтемесі (басқа беттердегі «← …» сілтемелерімен бірдей түрі) */
export function BackLink({ href, children, className }: Props) {
  const t = useTranslations("BottomNav");
  return (
    <Link href={href} className={cn("mb-5 block w-fit text-[0.9rem] font-semibold text-cyan hover:underline", className)}>
      ← {children ?? t(NAV_LABELS[href as keyof typeof NAV_LABELS])}
    </Link>
  );
}
