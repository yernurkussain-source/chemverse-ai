import { cn } from "@/lib/utils";

/** Меңгеру деңгейі 0–100: қызғылт (әлсіз) → сары → жасыл (меңгерілді, 80+) */
export function MasteryBar({ value, label, className }: { value: number; label: string; className?: string }) {
  const percent = Math.round(value);
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 flex-1 overflow-hidden rounded-full bg-panel-2"
      >
        <span
          className={cn("block h-full rounded-full", percent >= 80 ? "bg-good" : percent >= 40 ? "bg-amber" : "bg-pink")}
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className="w-10 text-right font-mono text-[0.78rem] font-semibold tabular-nums">{percent}%</span>
    </span>
  );
}
