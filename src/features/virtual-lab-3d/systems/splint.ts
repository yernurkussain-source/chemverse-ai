import { later, type Game } from "../core/context";
import { SPLINT_LIGHT } from "../core/renderer";
import { setRaw } from "../core/three-utils";
import { addLog, nearPlayer, toast } from "../game/journal";
import { safetyCheck, tempPour } from "../interaction/actions";
import type { SplintItem, SplintState, VesselItem } from "../items/types";

/** Сынақ үшін ыдыстың аузындағы газдың ең аз мөлшері (моль) */
const THR = 1.5e-5;

/** Шырпының күйі: жалын, ұшының қызуы, жарығы (бықсығанда 14 с кейін өзі сөнеді) */
export function splintSet(sp: SplintItem, st: SplintState): void {
  sp.st = st;
  sp.fl.visible = st === "burning";
  sp.tip.material.emissiveIntensity = st === "burning" ? 1.2 : st === "smolder" ? 1.6 : 0;
  sp.light.intensity = (st === "burning" ? 0.7 : st === "smolder" ? 0.12 : 0) * SPLINT_LIGHT;
  if (st === "smolder") sp.smolderT = 14;
  setRaw(sp.tip.material.color, st === "burnt" ? 0x111111 : 0x2a1a10);
}

/** Спиртовка: жанғанда қақпағы шетке алынады */
export function lampSet(G: Game, on: boolean): void {
  const { lamp } = G;
  lamp.lit = on;
  lamp.fl.visible = on;
  lamp.cap.position.set(on ? 0.07 : 0, on ? -0.0 : 0.07, on ? 0.03 : 0);
  lamp.cap.rotation.z = 0;
}

/**
 * Газды шырпымен анықтау (ыдыстың аузына апарғанда):
 * жанып тұрған + H₂ → «поп»; бықсыған + O₂ → қайта жанады; жанып тұрған + O₂ → жарқырайды; жанып тұрған + CO₂ → сөнеді.
 */
export function splintTest(G: Game, t: VesselItem): void {
  const { state, tr } = G;
  const sp = state.held as SplintItem;
  if (G.cooldown > 0) return;
  G.cooldown = 0.9;
  safetyCheck(G);
  tempPour(G, t, 900, { test: true });
  later(
    G,
    () => {
      if (state.held !== sp) return;
      const hd = t.v.head;
      const name = t.v.s.name;
      if (sp.st === "burning" && hd.H2 > THR) {
        hd.H2 = 0;
        G.snd.pop();
        if (!G.reducedMotion) G.store.set({ flash: G.store.get().flash + 1 });
        G.stats.pop = true;
        addLog(G, "r", name, "2H₂ + O₂ → 2H₂O", tr("log.pop"));
        toast(G, tr("toast.pop"));
      } else if (sp.st === "smolder" && hd.O2 > THR) {
        splintSet(sp, "burning");
        G.snd.whoosh();
        G.stats.o2 = true;
        addLog(G, "r", name, "C + O₂ → CO₂", tr("log.relit"));
        toast(G, tr("toast.relit"));
      } else if (sp.st === "burning" && hd.O2 > THR) {
        G.snd.whoosh();
        sp.f1.scale.setScalar(1.8);
        later(G, () => sp.f1.scale.setScalar(1), 900);
        addLog(G, "r", name, "", tr("log.brighter"));
        toast(G, tr("toast.brighter"));
      } else if (sp.st === "burning" && hd.CO2 > THR) {
        splintSet(sp, "smolder");
        G.snd.hiss();
        G.stats.co2splint = true;
        addLog(G, "r", name, "", tr("log.out"));
        toast(G, tr("toast.out"));
      } else {
        addLog(G, "", name, "", tr("log.noGas"));
        toast(G, tr("toast.noChange"));
      }
    },
    420,
  );
}

/** Әр кадр: жалынның дірілі, жану уақыты (70 с), бықсу */
export function updateSplint(G: Game, rdt: number): void {
  const sp = G.splint;
  if (sp.st === "burning") {
    sp.life -= rdt;
    sp.f1.scale.set(1, 0.85 + Math.random() * 0.3, 1);
    sp.light.intensity = (0.55 + Math.random() * 0.25) * SPLINT_LIGHT;
    if (Math.random() < rdt * 6 && nearPlayer(G, sp.g)) G.snd.crackle();
    if (sp.life <= 0) {
      splintSet(sp, "burnt");
      addLog(G, "", G.tr("log.splint"), "", G.tr("log.burnt"));
    }
  } else if (sp.st === "smolder") {
    sp.smolderT -= rdt;
    sp.tip.material.emissiveIntensity = 1.2 + Math.sin(performance.now() / 180) * 0.4;
    if (sp.smolderT <= 0) splintSet(sp, "unlit");
  }
}
