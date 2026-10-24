import { engineStats, g, pH } from "@/features/chem-engine";
import type { Game } from "../core/context";
import { addLog, toast } from "./journal";

export type QuestId =
  | "ppe"
  | "glass"
  | "twohand"
  | "neut"
  | "agcl"
  | "baso4"
  | "cuoh"
  | "filter"
  | "feoh"
  | "pop"
  | "o2"
  | "lime"
  | "co2"
  | "cu"
  | "ag"
  | "salt"
  | "amph"
  | "nocu"
  | "h2"
  | "titr"
  | "lamp"
  | "flame";

/** Тапсырма: id (аты мен сипаттамасы messages → VirtualLab3D.quests.<id>), ok — орындалды ма */
type Quest = { id: QuestId; ok: (G: Game) => boolean };

/** 22 тапсырма (прототиптегі QUESTS — шарттары өзгертілмеген), әрқайсысы +100 XP */
export const QUESTS: Quest[] = [
  { id: "ppe", ok: (G) => G.state.goggles && G.state.gloves },
  {
    id: "glass",
    ok: (G) => G.beakers.some((b) => b !== G.state.held && b !== G.state.heldL && !!b.rest && Math.abs(b.rest.pos.y - G.bench.top) < 0.02),
  },
  { id: "twohand", ok: (G) => G.stats.twohand },
  {
    id: "neut",
    ok: (G) =>
      G.vessels.some((o) => {
        const p = pH(o.s);
        return p != null && p > 6.5 && p < 7.5 && g(o.s, "Na") > 0 && g(o.s, "Cl") > 0 && Object.values(o.s.ind).some((d) => (d ?? 0) > 0);
      }),
  },
  { id: "agcl", ok: () => engineStats.ppt.has("AgCl") },
  { id: "baso4", ok: () => engineStats.ppt.has("BaSO4") },
  { id: "cuoh", ok: () => engineStats.ppt.has("CuOH2") },
  { id: "filter", ok: (G) => G.stats.filter },
  { id: "feoh", ok: () => engineStats.ppt.has("FeOH3") },
  { id: "pop", ok: (G) => G.stats.pop },
  { id: "o2", ok: (G) => G.stats.o2 },
  { id: "lime", ok: () => engineStats.lime },
  { id: "co2", ok: () => engineStats.gas.CO2 > 2e-4 },
  { id: "cu", ok: () => engineStats.cuDep > 5e-5 },
  { id: "ag", ok: () => engineStats.agDep > 5e-5 },
  { id: "salt", ok: () => engineStats.residue.has("NaCl") },
  { id: "amph", ok: () => engineStats.amph },
  { id: "nocu", ok: () => engineStats.noCu },
  { id: "h2", ok: () => engineStats.gas.H2 > 2e-4 },
  { id: "titr", ok: (G) => G.stats.titr },
  { id: "lamp", ok: (G) => G.stats.lamp },
  { id: "flame", ok: (G) => G.flameSeen.size >= 3 },
];

/** Деңгейлер: әр 400 XP сайын келесісі (аттары messages → VirtualLab3D.levels.0…4) */
export type Level = 0 | 1 | 2 | 3 | 4;
export const LEVEL_COUNT = 5;
export const XP_PER_LEVEL = 400;

export function renderXP(G: Game): void {
  const { state } = G;
  const level = Math.min(LEVEL_COUNT - 1, Math.floor(state.xp / XP_PER_LEVEL)) as Level;
  G.store.set({ xp: state.xp, level, done: [...state.done] });
}

/** Секундына 2 рет: жаңа орындалған тапсырмаларды белгілеу */
export function checkQuests(G: Game): void {
  const { state, tr } = G;
  for (const q of QUESTS) {
    if (state.done.has(q.id) || !q.ok(G)) continue;
    state.done.add(q.id);
    state.xp += 100;
    renderXP(G);
    const name = tr(`quests.${q.id}.t`);
    toast(G, tr("toast.quest", { name }));
    addLog(G, "q", tr("log.task"), "", tr("log.taskDone", { name }));
    G.snd.ding();
    G.progress.changed();
  }
}
