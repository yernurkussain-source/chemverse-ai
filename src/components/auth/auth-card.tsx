import type { ReactNode } from "react";
import { LogoMark } from "@/components/layout/logo";
import { Card } from "@/components/ui/card";

/** Кіру/тіркелу беттерінің ортақ қаптамасы */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="page-wrap py-10 md:py-16">
      <Card className="mx-auto max-w-md gap-5 rounded-3xl border border-line p-6 ring-0 shadow-[0_1px_2px_var(--shadow)] sm:p-8 dark:shadow-none">
        <div className="flex flex-col items-center gap-3 text-center">
          <LogoMark size={44} />
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-[0.92rem] text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="flex flex-col items-center gap-1.5 text-center text-[0.88rem]">{footer}</div>}
      </Card>
    </div>
  );
}
