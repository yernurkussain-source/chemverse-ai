"use client";

import { cn } from "@/lib/utils";
import { useStore, type HudStore } from "../game/store";
import { muted, panel } from "./styles";

/** Экранның ортасындағы нысана нүктесі: әрекет бар кезде үлкейіп, көгілдір болады */
export function Crosshair({ store }: { store: HudStore }) {
  const active = useStore(store, (s) => s.cross);
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-1/2 left-1/2 -mt-[3px] -ml-[3px] size-1.5 rounded-full bg-white shadow-[0_0_0_2px_rgba(0,0,0,.35)] transition-transform duration-[120ms] motion-reduce:transition-none",
        active && "scale-[1.8] bg-cyan",
      )}
    />
  );
}

/** Нысананың астындағы кеңес: не істеуге болады (E / F пернесімен) және құйылған мл */
export function Prompt({ store }: { store: HudStore }) {
  const prompt = useStore(store, (s) => s.prompt);
  if (!prompt || (!prompt.main && !prompt.alt)) return null;
  const { main, amount, alt } = prompt;
  return (
    <div className="pointer-events-none absolute top-[calc(50%+22px)] left-1/2 max-w-[min(90vw,520px)] -translate-x-1/2 text-center" aria-live="polite">
      <span className={cn(panel, "static inline-block rounded-[10px] px-[11px] py-1.5 text-[0.86rem] font-semibold")}>
        {main && (
          <>
            {main.key && <kbd className="mr-1.5 rounded-[5px] bg-cyan px-1.5 py-px font-mono text-[0.78rem] text-on-accent">{main.key}</kbd>}
            {main.text}
          </>
        )}
        {amount && <span className="mt-1 block font-mono text-[0.9rem] text-pink">{amount}</span>}
        {alt && (
          <span className={cn("mt-1 block text-[0.78rem]", muted)}>
            <kbd className="mr-1.5 rounded-[5px] bg-amber px-1.5 py-px font-mono text-[0.78rem] text-[#1b1300]">{alt.key}</kbd>
            {alt.text}
          </span>
        )}
      </span>
    </div>
  );
}
