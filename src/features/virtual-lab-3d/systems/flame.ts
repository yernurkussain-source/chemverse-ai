import { entries, g, ION, type IonId } from "@/features/chem-engine";
import type { Game } from "../core/context";
import { chooseFlame, FLAME } from "../game/flame-rules";
import { addLog, toast } from "../game/journal";
import type { VesselItem, WireItem } from "../items/types";
import { isTainted } from "../game/mystery";

/** Сымға не жұғады: ерітіндідегі катиондар (≥ 0,005 М) не буландырғаннан кейінгі қалдықтың катиондары */
function sampleFrom(o: VesselItem): { cat: Partial<Record<IonId, number>>; acid: boolean } {
  const s = o.v.s;
  let src: Partial<Record<IonId, number>> = s.ions;
  let L: number | null = Math.max(s.V, 0.01) / 1000;
  if (s.V <= 0.05 && s.residue) {
    src = Object.fromEntries(s.residue.ions);
    L = null;
  }
  const cat: Partial<Record<IonId, number>> = {};
  for (const [k, n] of entries(src)) {
    if (!ION[k] || ION[k].z <= 0 || k === "H") continue;
    const c = L ? n / L : 1;
    if (c >= 0.005) cat[k] = c;
  }
  return { cat, acid: L ? g(s, "H") / L > 0.1 : false };
}

const ions = (sample: Partial<Record<IonId, number>>) => (Object.keys(sample) as IonId[]).map((k) => ION[k].f).join(", ");

/** Сымды ерітіндіге батыру (катионсыз қышқылға батырса — сымды тазалауға дайындайды) */
export function wireDip(G: Game, w: WireItem, t: VesselItem): void {
  const sm = sampleFrom(t);
  w.sample = sm.cat;
  w.acid = sm.acid && !Object.keys(sm.cat).length;
  // X ерітіндісінен алынған сынаманың иондары жазылмайды — оларды жалын түсі бойынша анықтайды
  w.mystery = isTainted(G, t.v.s) && Object.keys(sm.cat).length > 0;
  G.snd.drip();
  const dipped = w.mystery ? G.tr("mystery.wireDipped") : G.tr("log.wireDipped", { ions: ions(sm.cat) || G.tr("log.noCation") });
  addLog(G, "", t.name, "", w.acid ? G.tr("log.wireAcid") : dipped);
}

/** Сымды спиртовка жалынына енгізу */
export function wireFlame(G: Game, w: WireItem): void {
  const { lamp, tr } = G;
  if (!lamp.lit) {
    toast(G, tr("toast.lightLamp"), true);
    return;
  }
  // HCl-мен ылғалданған таза сым: алдыңғы Na⁺ қалдығы жанып кетеді
  if (w.acid && !Object.keys(w.sample).length) {
    const had = w.naRes;
    w.naRes = false;
    w.acid = false;
    if (had) lamp.target = [...FLAME.Na.c];
    lamp.showT = had ? 1.2 : 0;
    addLog(G, "r", tr("log.lamp"), "", tr(had ? "log.wireResidueBurnt" : "log.wireClean"));
    toast(G, tr("toast.wireCleaned"));
    return;
  }
  const sampleIons = Object.keys(w.sample);
  const { main, colored } = chooseFlame(sampleIons, w.naRes);
  if (main) {
    lamp.target = [...FLAME[main].c];
    lamp.showT = 3.5;
    G.flameSeen.add(main);
    G.snd.whoosh();
    const color = tr(`flame.${main}`);
    const ion = ION[main].f;
    if (w.mystery) {
      addLog(G, "r", tr("log.flameTest"), "", tr("mystery.flame", { color }));
      toast(G, tr("mystery.flame", { color }));
      if (colored.includes("Na")) w.naRes = true;
      w.sample = {};
      w.mystery = false;
      return;
    }
    let text = tr("log.flameColored", { color, ion });
    if (main === "Na" && colored.includes("K")) text += ". " + tr("log.flameMasked");
    if (w.naRes && !sampleIons.includes("Na")) text += ` (${tr("log.flameResidue")})`;
    addLog(G, "r", tr("log.flameTest"), tr("log.flameEq", { ion, color }), text);
    toast(G, tr("log.flameColored", { color, ion }));
  } else {
    const list = w.mystery ? "" : ions(w.sample);
    w.mystery = false;
    addLog(G, "", tr("log.flameTest"), "", tr("log.flameNone") + (list ? ` (${list})` : ""));
    toast(G, tr("toast.flameNoChange"));
  }
  if (colored.includes("Na")) w.naRes = true;
  w.sample = {};
}
