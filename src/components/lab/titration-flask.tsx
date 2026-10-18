"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type Props = {
  /** Қосылған NaOH көлемі, мл (сұйықтық деңгейі) */
  volume: number;
  liquid: { rgb: string; opacity: number };
  /** Өзгергенде тамшы анимациясы қайта ойналады */
  dropKey: number;
  label: string;
  text: string;
  className?: string;
};

/** Колба (SVG): индикатор түсі pH-қа қарай өзгереді. Басты бет пен виртуалды зертхана ортақ қолданады */
export function TitrationFlask({ volume, liquid, dropKey, label, text, className }: Props) {
  const id = useId();
  const clip = `flask-clip-${id}`;
  const gloss = `flask-gloss-${id}`;

  return (
    <svg viewBox="0 0 220 260" role="img" aria-label={label} className={cn("h-auto w-full max-w-60", className)}>
      <defs>
        <clipPath id={clip}>
          <path d="M85 20h50v70l55 120a20 20 0 01-18 28H48a20 20 0 01-18-28l55-120z" />
        </clipPath>
        <linearGradient id={gloss} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".18" />
          <stop offset=".4" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect className="text-line" x="104" y="0" width="12" height="16" rx="3" fill="currentColor" />
      <circle key={dropKey} cx="110" cy="22" r="4" fill="#9EE6F2" className={dropKey ? "animate-drop" : "opacity-0"} />
      <g clipPath={`url(#${clip})`}>
        <rect className="text-glass" x="0" y="0" width="220" height="260" fill="currentColor" />
        <rect
          x="0"
          y={150 - volume * 0.9}
          width="220"
          height={110 + volume * 0.9}
          fill={liquid.rgb}
          fillOpacity={liquid.opacity}
        />
        <rect x="0" y="0" width="220" height="260" fill={`url(#${gloss})`} />
      </g>
      <path
        className="text-muted-foreground"
        d="M85 20h50v70l55 120a20 20 0 01-18 28H48a20 20 0 01-18-28l55-120z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path className="text-muted-foreground" d="M80 20h60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <text className="fill-muted-foreground font-mono" x="110" y="225" textAnchor="middle" fontSize="11">
        {text}
      </text>
    </svg>
  );
}
