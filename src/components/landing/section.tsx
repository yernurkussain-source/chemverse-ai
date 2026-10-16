import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Кіші жоғарғы жазу (prototype: .eyebrow) */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("font-mono text-xs tracking-[0.14em] text-cyan uppercase", className)}>
      {children}
    </div>
  );
}

/** Бөлім: id — жоғарғы мәзірдегі сілтеме үшін */
export function Section({
  id,
  children,
  className,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("py-13 md:py-18", className)}>
      <div className="page-wrap">{children}</div>
    </section>
  );
}

/** Бөлім тақырыбы: сол жақта eyebrow + h2, оң жақта түсіндірме */
export function SectionHead({
  eyebrow,
  title,
  text,
  eyebrowClassName,
}: {
  eyebrow: string;
  title: string;
  text: string;
  eyebrowClassName?: string;
}) {
  return (
    <div className="mb-9 grid items-end gap-7 md:grid-cols-2">
      <div>
        <Eyebrow className={eyebrowClassName}>{eyebrow}</Eyebrow>
        <h2 className="mt-2.5 text-[clamp(1.5rem,3.2vw,2.3rem)] font-bold">{title}</h2>
      </div>
      <p className="max-w-[52ch] text-muted-foreground">{text}</p>
    </div>
  );
}

/** Ақ/қараңғы панель (prototype: .panel) */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-[20px] border border-line bg-panel p-5 shadow-[0_1px_2px_var(--shadow)] dark:shadow-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
