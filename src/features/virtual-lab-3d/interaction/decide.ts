import type { Game } from "../core/context";
import { reagentShort } from "../game/i18n";
import type { FunnelItem, Item, PourTarget, Rack, VesselItem } from "../items/types";

/** Әрекет түрі (act: null — әрекет жоқ, тек кеңес мәтіні) */
export type Act = "door" | "knob" | "pick" | "place" | "heaterPlace" | "rackPlace" | "waste" | "pour";

export type Decision = {
  act: Act | null;
  text: string;
  target?: PourTarget;
  item?: Item;
  rack?: Rack;
  intoLeft?: boolean;
};

/** Ыдыс нені «қабылдайды»: үстінде воронка болса — воронканы, әйтпесе өзін */
export function receiver(it: Item): VesselItem | FunnelItem | null {
  if (it.type === "vessel" && it.v.funnel) return it.v.funnel;
  if (it.type === "funnel" && it.on) return it;
  return it.type === "vessel" ? it : null;
}

export function canPourFrom(h: Item | null): boolean {
  return !!h && (h.type === "bottle" || (h.type === "vessel" && h.v.s.V > 0.05));
}

/** Заттың қысқа аты: реактивте — формуласы, қалғанында — аты */
export function nm(G: Game, it: Item): string {
  return it.type === "bottle" || it.type === "dropper" || it.type === "jar" ? reagentShort(G.tr, it.rid) : it.name;
}

/**
 * Оң қолдың әрекеті (E / тышқанның сол батырмасы): нысанаға және қолдағы затқа қарай.
 * Ережелердің реті прототиптегі decide() кестесімен бірдей — бірінші сәйкес келгені таңдалады.
 */
export function decide(G: Game): Decision | null {
  const { tr, state } = G;
  const a = G.aimRes;
  const held = state.held;
  const u = a?.u;
  if (u?.door) {
    return { act: "door", text: tr(u.door.open ? "prompt.doorClose" : "prompt.doorOpen", { name: u.door.name.toLocaleLowerCase(G.locale) }) };
  }
  if (u?.knob) return { act: "knob", text: tr(state.heaterOn ? "prompt.heaterOff" : "prompt.heaterOn") };
  if (held) {
    if (u?.item && canPourFrom(held)) {
      const rc = receiver(u.item);
      if (rc && rc !== held && !(rc.type === "vessel" && rc.v.link && rc.v.link.A === rc)) {
        return { act: "pour", target: rc, text: tr("prompt.pour", { from: nm(G, held), to: rc.type === "funnel" && rc.on ? tr("prompt.funnelOn", { name: rc.on.name }) : rc.name }) };
      }
      if (rc && rc.type === "vessel" && rc.v.link && rc.v.link.A === rc) return { act: null, text: tr("prompt.stoppered") };
    }
    if (u?.waste) {
      if (held.type === "vessel") return { act: "waste", text: tr("prompt.waste", { name: held.name }) };
      if (held.type === "funnel") return { act: "waste", text: tr("prompt.wastePaper") };
      return { act: null, text: tr("prompt.wasteReagent") };
    }
    if (u?.heaterTop) {
      return held.type === "vessel" && held.v.kind === "beaker"
        ? { act: "heaterPlace", text: tr("prompt.heaterPlace") }
        : { act: null, text: tr("prompt.heaterOnlyBeaker") };
    }
    if (u?.rack) {
      return held.type === "vessel" && held.v.kind === "tube"
        ? { act: "rackPlace", rack: u.rack, text: tr("prompt.rackPlace") }
        : { act: null, text: tr("prompt.rackOnlyTubes") };
    }
    if (u?.surface && a && a.n.y > 0.7) {
      if (held.type === "vessel" && held.v.kind === "tube") return { act: null, text: tr("prompt.tubeToRack") };
      return { act: "place", text: tr("prompt.place") };
    }
    return null;
  }
  if (!u) return null;
  if (u.item) {
    let it: Item = u.item;
    if (it.type === "vessel" && it.v.funnel) it = it.v.funnel;
    if (it.type === "vessel" && (it.v.link || it.v.linkIn)) return { act: null, text: tr("prompt.unlinkFirst") };
    const text = it.type !== "vessel" && it.full ? tr("prompt.pickFull", { name: it.name, full: it.full }) : tr("prompt.pick", { name: it.name });
    return { act: "pick", item: it, text };
  }
  return null;
}
