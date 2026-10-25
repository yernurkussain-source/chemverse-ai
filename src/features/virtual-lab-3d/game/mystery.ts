import type { LiquidId, Vessel } from "@/features/chem-engine";
import { LIQUIDS } from "@/features/chem-engine";
import type { Game } from "../core/context";
import { setCR } from "../core/three-utils";
import { REAG_LIQ_COL } from "../items/materials";
import type { BottleItem } from "../items/types";
import { addLog, toast } from "./journal";

/**
 * «Белгісіз зат X» тапсырмасы: X бөтелкесінде осы тұздардың бірі (ойын басталғанда кездейсоқ).
 * Олар зертханадағы сынақтармен бір мәнді ажыратылады: жалын (Na⁺, K⁺, Cu²⁺, Ba²⁺), NaOH (Cu²⁺, Fe³⁺),
 * AgNO₃ (Cl⁻, I⁻), BaCl₂ / H₂SO₄ (SO₄²⁻, CO₃²⁻, Ba²⁺), HCl (CO₃²⁻ — газ).
 * X түскен ыдыстың иондары карточкада жасырылады (реакциялар мен тұнбалар көрінеді — солар бойынша анықтайды).
 */
export const MYSTERY_CANDIDATES = ["NaCl", "KI", "Na2CO3", "CuSO4", "BaCl2", "FeCl3"] as const satisfies readonly LiquidId[];

/** taint — X ерітіндісі түскен ыдыстар (қозғалтқыштың Vessel объектілері: стакан, пробирка, бюретка, воронка) */
export type Mystery = { bottle: BottleItem; taint: WeakSet<Vessel>; solved: boolean };

export function pickMystery(except?: LiquidId): LiquidId {
  const list = MYSTERY_CANDIDATES.filter((id) => id !== except);
  return list[Math.floor(Math.random() * list.length)];
}

/** Ыдыста X бар ма. Ыдыс толық босаса (тұнба, қалдық та жоқ) — белгі алынады */
export function isTainted(G: Game, s: Vessel): boolean {
  if (!G.mystery.taint.has(s)) return false;
  if (s.V <= 0.01 && !Object.keys(s.ppt).length && !s.residue) {
    G.mystery.taint.delete(s);
    return false;
  }
  return true;
}

/** Құйғанда белгіні ала кету: from — X бөтелкесі ("x") не басқа ыдыс */
export function carryTaint(G: Game, from: Vessel | "x", to: Vessel): void {
  if (from === "x" || isTainted(G, from)) G.mystery.taint.add(to);
}

/** Бөтелкедегі сұйықтың түсі (CuSO₄ — көк, FeCl₃ — сары-қоңыр, қалғандары түссіз) — бұл да бақылау */
export function paintMystery(b: BottleItem): void {
  const col = REAG_LIQ_COL[b.rid];
  if (!b.liq) return;
  setCR(b.liq.color, ...(col ?? [214, 232, 244]));
  b.liq.opacity = col ? 0.85 : 0.32;
}

/**
 * Оқушының жауабы. Дұрыс — тапсырма орындалады. Қате — X жаңа затпен ауыстырылады,
 * сондықтан кездейсоқ таңдап «табу» мүмкін емес: қайтадан зерттеу керек.
 */
export function answerMystery(G: Game, guess: string): boolean | null {
  const m = G.mystery;
  if (m.solved) return null;
  const f = LIQUIDS[m.bottle.rid].f;
  if (guess === m.bottle.rid) {
    m.solved = true;
    addLog(G, "q", "X", "", G.tr("mystery.logRight", { f }));
    G.snd.ding();
    return true;
  }
  const wrong = (MYSTERY_CANDIDATES as readonly string[]).includes(guess) ? LIQUIDS[guess as LiquidId].f : "?";
  m.bottle.rid = pickMystery(m.bottle.rid);
  paintMystery(m.bottle);
  addLog(G, "w", "X", "", G.tr("mystery.logWrong", { f: wrong }));
  toast(G, G.tr("mystery.wrong"), true);
  return false;
}
