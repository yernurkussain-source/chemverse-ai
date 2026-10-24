import type { CSSProperties } from "react";

/**
 * HUD — 3D сахнаның үстіндегі «зертхана шынысы» тәрізді мөлдір панельдер (прототиптегі дизайн).
 * Түстер жобаның қараңғы токендерінен (контейнерде .dark класы), мөлдір реңктер — осы айнымалылардан.
 */
export const HUD_VARS = {
  "--hud": "rgba(9,15,32,.78)",
  "--hud-2": "rgba(255,255,255,.08)",
  "--hud-line": "rgba(255,255,255,.14)",
  "--hud-text": "#eef2ff",
  "--hud-muted": "#a6b1d6",
  "--warn": "#ff8a5b",
} as CSSProperties;

/** Панель (карточкалар, хабарлама) */
export const panel = "absolute rounded-[14px] border border-[var(--hud-line)] bg-[var(--hud)] backdrop-blur-[8px]";
/** Жоғарғы панельдегі «таблетка» */
export const pill =
  "flex items-center gap-2 rounded-xl border border-[var(--hud-line)] bg-[var(--hud)] px-[11px] py-[7px] text-[0.82rem] backdrop-blur-[8px] max-[700px]:px-2 max-[700px]:py-1.5 max-[700px]:text-[0.74rem]";
/** Жоғарғы панельдегі батырма */
export const topButton =
  "rounded-xl border border-[var(--hud-line)] bg-[var(--hud)] px-[11px] py-[7px] text-[0.8rem] font-bold backdrop-blur-[8px] transition-colors hover:border-cyan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan max-[700px]:px-2 max-[700px]:py-1.5 max-[700px]:text-[0.74rem]";
export const muted = "text-[var(--hud-muted)]";
