"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { LIQUIDS } from "@/features/chem-engine";
import { cn } from "@/lib/utils";
import { MYSTERY_CANDIDATES } from "../game/mystery";
import { QUESTS } from "../game/quests";
import { useStore, type HudStore } from "../game/store";
import { muted, topButton } from "./styles";

const LOG_BORDER = { "": "border-l-[var(--hud-line)]", r: "border-l-cyan", w: "border-l-[var(--warn)]", q: "border-l-good" } as const;

/** Зертхана журналы: оң жақтан шығатын тартпа, ең жаңа жазба жоғарыда (J) */
export function Journal({ store, onClose }: { store: HudStore; onClose: () => void }) {
  const t = useTranslations("VirtualLab3D");
  const open = useStore(store, (s) => s.drawer);
  const log = useStore(store, (s) => s.log);
  return (
    <aside
      aria-hidden={!open}
      inert={!open}
      aria-label={t("journal.title")}
      className={cn(
        "absolute inset-y-0 right-0 z-[8] w-[min(380px,92vw)] overflow-y-auto border-l border-[var(--hud-line)] bg-[rgba(9,15,32,.94)] px-4 pt-[max(14px,env(safe-area-inset-top))] pb-4 transition-transform duration-[250ms] select-text motion-reduce:transition-none",
        !open && "translate-x-[105%]",
      )}
    >
      <h3 className="mt-1.5 mb-3 flex items-center justify-between font-display text-[0.9rem] font-bold">
        {t("journal.title")}
        <button type="button" className={topButton} onClick={onClose}>
          {t("journal.close")}
        </button>
      </h3>
      <ol className="flex flex-col gap-[9px]">
        {log.map((e) => (
          <li key={e.id} className={cn("border-l-[3px] py-px pl-2.5 text-[0.84rem]", LOG_BORDER[e.cls])}>
            <span className={cn("block font-mono text-[0.66rem]", muted)}>
              {e.time} · {e.who}
            </span>
            {e.eq && <span className="block font-mono text-[0.8rem] font-semibold">{e.eq}</span>}
            <span>{e.obs}</span>
          </li>
        ))}
      </ol>
      <p className={cn("mt-4 text-[0.76rem]", muted)}>{t("journal.modelNote")}</p>
    </aside>
  );
}

/** Тапсырмалар терезесі (T): 23 тапсырма, әрқайсысы +100 XP; «X» тапсырмасының жауабы осы жерде таңдалады */
export function Quests({
  store,
  onClose,
  onAnswer,
}: {
  store: HudStore;
  onClose: () => void;
  onAnswer: (guess: string) => boolean | null | undefined;
}) {
  const t = useTranslations("VirtualLab3D");
  const open = useStore(store, (s) => s.quests);
  const done = useStore(store, (s) => s.done);
  const dialog = useRef<HTMLDivElement>(null);
  const [answer, setAnswer] = useState<{ ok: boolean; f: string } | null>(null);
  // Фокус терезенің өзіне түседі (батырмаға емес) — тізім басынан көрінеді
  useEffect(() => {
    if (open) dialog.current?.focus({ preventScroll: true });
  }, [open]);
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-[rgba(5,9,20,.62)] px-[max(16px,env(safe-area-inset-left))]">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vl3d-quests-title"
        tabIndex={-1}
        className="max-h-[88vh] w-full max-w-[600px] overflow-auto rounded-[20px] border border-[var(--hud-line)] bg-[#0f1631] p-[22px] outline-none select-text"
      >
        <h2 id="vl3d-quests-title" className="mb-2 font-display text-[1.3rem] font-bold">
          {t("questsPanel.title")}
        </h2>
        <p className={cn("mb-3", muted)}>{t("questsPanel.text")}</p>
        <ul className="my-2.5 mb-4 grid gap-2">
          {QUESTS.map((q) => {
            const ok = done.includes(q.id);
            return (
              <li
                key={q.id}
                className={cn(
                  "grid grid-cols-[22px_1fr_auto] gap-2.5 rounded-xl border bg-[var(--hud-2)] px-2.5 py-[9px]",
                  ok ? "border-good" : "border-[var(--hud-line)]",
                )}
              >
                <span
                  aria-label={ok ? t("questsPanel.done") : t("questsPanel.todo")}
                  className={cn(
                    "grid size-5 place-items-center rounded-md border-2 text-[0.8rem] text-[#04121a]",
                    ok ? "border-good bg-good" : "border-[var(--hud-line)]",
                  )}
                >
                  {ok ? "✓" : ""}
                </span>
                <span>
                  <b className="block text-[0.88rem]">{t(`quests.${q.id}.t`)}</b>
                  <small className={muted}>{t(`quests.${q.id}.d`)}</small>
                  {q.id === "unknown" && !ok && (
                    <span role="group" aria-label={t("mystery.answer")} className="mt-2 flex flex-wrap items-center gap-1.5">
                      <small className="w-full">{t("mystery.answer")}</small>
                      {MYSTERY_CANDIDATES.map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            const result = onAnswer(id);
                            if (typeof result === "boolean") setAnswer({ ok: result, f: LIQUIDS[id].f });
                          }}
                          className="rounded-lg border border-[var(--hud-line)] px-2.5 py-1 font-mono text-[0.8rem] hover:border-cyan focus-visible:outline-2 focus-visible:outline-cyan"
                        >
                          {LIQUIDS[id].f}
                        </button>
                      ))}
                    </span>
                  )}
                  {q.id === "unknown" && answer && (
                    <small role="status" className={cn("mt-1 block", answer.ok ? "text-good" : "text-[var(--warn)]")}>
                      {answer.ok ? t("mystery.right", { f: answer.f }) : t("mystery.wrong")}
                    </small>
                  )}
                </span>
                <em className="font-mono text-[0.74rem] text-cyan not-italic">+100</em>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-cyan bg-cyan px-[18px] py-2.5 font-bold text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
        >
          {t("questsPanel.close")}
        </button>
      </div>
    </div>
  );
}

/** Көзілдірік кигенде экранның шеті күңгірттенеді (шыны арқылы қарағандай) */
export function GogglesOverlay({ store }: { store: HudStore }) {
  const on = useStore(store, (s) => s.goggles);
  if (!on) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        background: "radial-gradient(ellipse 78% 72% at 50% 50%, transparent 62%, rgba(150,200,230,.16) 82%, rgba(10,20,40,.6) 100%)",
        boxShadow: "inset 0 0 0 10px rgba(30,40,60,.35)",
      }}
    />
  );
}

/** «Поп» кезіндегі жарқыл */
export function Flash({ store }: { store: HudStore }) {
  const flash = useStore(store, (s) => s.flash);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (flash && ref.current) ref.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, easing: "ease-out" });
  }, [flash]);
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-0"
      style={{ background: "radial-gradient(circle at 50% 55%, rgba(255,220,150,.55), transparent 55%)" }}
    />
  );
}
