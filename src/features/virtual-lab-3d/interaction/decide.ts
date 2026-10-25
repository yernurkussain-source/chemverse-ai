import type { Game } from "../core/context";
import { reagentShort } from "../game/i18n";
import type { FunnelItem, Item, PourTarget, Rack, VesselItem } from "../items/types";
import { burReading } from "../scene/burette";

/** Әрекет түрі (act: null — әрекет жоқ, тек кеңес мәтіні) */
export type Act =
  | "door"
  | "stopcock"
  | "lampOff"
  | "burEmpty"
  | "knob"
  | "lampOn"
  | "wireFlame"
  | "wireDip"
  | "place"
  | "pour"
  | "splintTest"
  | "light"
  | "blow"
  | "funnelOn"
  | "dtubeA"
  | "dtubeB"
  | "drop"
  | "solid"
  | "waste"
  | "heaterPlace"
  | "rackPlace"
  | "dtubeOff"
  | "pick"
  | "ppe";
export type ActL = "wasteL" | "heaterPlaceL" | "rackPlaceL" | "placeL" | "pickL";

export type Decision = {
  act: Act | null;
  text: string;
  target?: PourTarget;
  item?: Item;
  rack?: Rack;
  intoLeft?: boolean;
  kind?: "goggles" | "gloves";
};
export type DecisionL = { act: ActL | null; text: string; item?: Item; rack?: Rack };

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
  if (it.type === "bottle" && it.mystery) return it.name;
  return it.type === "bottle" || it.type === "dropper" || it.type === "jar" ? reagentShort(G.tr, it.rid) : it.name;
}

/** Тығынмен жабылған (газ шығатын) пробирка */
const stoppered = (rc: VesselItem | FunnelItem) => rc.type === "vessel" && !!rc.v.link && rc.v.link.A === rc;

/** Құю / тамызу / салу: қолдағы затқа қарай әрекет пен кеңес кілті */
function pourAct(held: Item): { act: "drop" | "solid" | "pour"; key: string } {
  if (held.type === "dropper") return { act: "drop", key: "drop" };
  if (held.type === "jar") return { act: "solid", key: "solid" };
  return { act: "pour", key: "pour" };
}

/**
 * Оң қолдың әрекеті (E / тышқанның сол батырмасы): нысанаға және қолдағы затқа қарай.
 * Ережелердің реті прототиптегі decide() кестесімен бірдей — бірінші сәйкес келгені таңдалады.
 */
export function decide(G: Game): Decision | null {
  const { tr, state, bur, lamp } = G;
  const a = G.aimRes;
  const held = state.held;
  const u = a?.u;
  const onTop = !!u?.surface && !!a && a.n.y > 0.7;
  if (u?.door) {
    return { act: "door", text: tr(u.door.open ? "prompt.doorClose" : "prompt.doorOpen", { name: u.door.name.toLocaleLowerCase(G.locale) }) };
  }
  if (u?.stopcock) {
    return { act: "stopcock", text: tr("prompt.stopcock", { action: tr(`prompt.stopcock${bur.stop}`), reading: G.fmt(burReading(bur), 2) }) };
  }
  if (u?.lamp && !held && lamp.lit) return { act: "lampOff", text: tr("prompt.lampOff") };
  if (u?.burette && !held) return bur.v.V > 0.05 ? { act: "burEmpty", text: tr("prompt.burEmpty") } : { act: null, text: tr("prompt.burEmptyHint") };
  if (u?.knob) return { act: "knob", text: tr(state.heaterOn ? "prompt.heaterOff" : "prompt.heaterOn") };

  if (held) {
    if (held.type === "splint" && u?.lamp) {
      if (lamp.lit) return { act: null, text: tr("prompt.lampBurning") };
      if (held.st === "burning") return { act: "lampOn", text: tr("prompt.lampOn") };
      return { act: null, text: tr("prompt.lightSplintFirst") };
    }
    if (held.type === "wire") {
      if (u?.lamp) return lamp.lit ? { act: "wireFlame", text: tr("prompt.wireFlame") } : { act: null, text: tr("prompt.lightLampFirst") };
      if (u?.item?.type === "vessel") {
        const s = u.item.v.s;
        if (s.V <= 0.05 && !s.residue) return { act: null, text: tr("prompt.vesselEmpty") };
        return { act: "wireDip", target: u.item, text: tr("prompt.wireDip", { name: u.item.name }) };
      }
      if (onTop) return { act: "place", text: tr("prompt.place") };
      return null;
    }
    if (u?.burette && (held.type === "bottle" || (held.type === "vessel" && held.v.s.V > 0.05))) {
      return bur.v.V >= 49.95
        ? { act: null, text: tr("prompt.buretteFull") }
        : { act: "pour", target: bur.target, text: tr("prompt.pourBurette", { from: nm(G, held) }) };
    }
    if (held.type === "splint") {
      // Воронка тұрған ыдыстың аузына да апаруға болады (прототипте бұл жерде қате бар еді: on.it)
      const t = u?.item ? (u.item.type === "vessel" ? u.item : u.item.type === "funnel" && u.item.on ? u.item.on : null) : null;
      if (t && held.st !== "unlit" && held.st !== "burnt") return { act: "splintTest", target: t, text: tr("prompt.splintTest", { name: t.name }) };
      if (onTop && held.st !== "burning") return { act: "place", text: tr("prompt.place") };
      if (held.st === "unlit") return { act: "light", text: tr("prompt.light") };
      if (held.st === "burning") return { act: "blow", text: tr("prompt.blow") };
      if (held.st === "burnt") return { act: null, text: tr("prompt.splintBurnt") };
      return null;
    }
    if (held.type === "funnel" && u?.item?.type === "vessel") {
      const t = u.item.v;
      if (t.funnel) return { act: null, text: tr("prompt.funnelThere") };
      if (t.link) return { act: null, text: tr("prompt.stopperedVessel") };
      return { act: "funnelOn", target: u.item, text: tr("prompt.funnelAttach", { name: u.item.name }) };
    }
    if (held.type === "dtube") {
      if (held.A && u?.item?.type === "vessel" && u.item !== held.A) {
        if (u.item.v.funnel) return { act: null, text: tr("prompt.removeFunnelFirst") };
        return { act: "dtubeB", target: u.item, text: tr("prompt.dtubeB", { name: u.item.name }) };
      }
      if (!held.A && u?.item?.type === "vessel") {
        const t = u.item.v;
        if (t.kind !== "tube") return { act: null, text: tr("prompt.stopperOnlyTube") };
        if (t.funnel || t.link) return { act: null, text: tr("prompt.tubeBusy") };
        return { act: "dtubeA", target: u.item, text: tr("prompt.dtubeA", { name: u.item.name }) };
      }
    }
    if (u?.item && (canPourFrom(held) || held.type === "dropper" || held.type === "jar")) {
      const rc = receiver(u.item);
      if (rc && rc !== held && !stoppered(rc)) {
        if (rc.type === "funnel" && held.type !== "bottle" && held.type !== "vessel") return { act: null, text: tr("prompt.funnelOnlyLiquid") };
        const { act, key } = pourAct(held);
        const to = rc.type === "funnel" ? tr("prompt.funnelOn", { name: rc.on!.name }) : rc.name;
        return { act, target: rc, text: tr(`prompt.${key}`, { from: nm(G, held), to }) };
      }
      if (rc && stoppered(rc)) return { act: null, text: tr("prompt.stoppered") };
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
    if (onTop) {
      if (held.type === "vessel" && held.v.kind === "tube") return { act: null, text: tr("prompt.tubeToRack") };
      if (held.type === "dtube" && held.A) return { act: null, text: tr("prompt.dtubeEnd") };
      return { act: "place", text: tr("prompt.place") };
    }
    // Сол қолда ыдыс болса — оң қолдағыны соған құю
    const left = state.heldL;
    if (left?.type === "vessel" && left !== held && (canPourFrom(held) || held.type === "dropper" || held.type === "jar")) {
      const { act, key } = pourAct(held);
      return { act, target: left, intoLeft: true, text: tr(`prompt.${key}Left`, { from: nm(G, held), to: left.name }) };
    }
    return null;
  }

  if (!u) return null;
  if (u.dt) return { act: "dtubeOff", text: tr("prompt.dtubeOff") };
  if (u.item) {
    let it: Item = u.item;
    if (it.type === "vessel" && it.v.funnel) it = it.v.funnel;
    if (it.type === "vessel" && (it.v.link || it.v.linkIn)) return { act: null, text: tr("prompt.unlinkFirst") };
    const text = it.type !== "vessel" && it.full ? tr("prompt.pickFull", { name: it.name, full: it.full }) : tr("prompt.pick", { name: it.name });
    return { act: "pick", item: it, text };
  }
  if (u.ppe) return { act: "ppe", kind: u.ppe, text: tr("prompt.ppe", { name: tr(u.ppe === "goggles" ? "prompt.ppeGoggles" : "prompt.ppeGloves") }) };
  return null;
}

/** Сол қолдың әрекеті (F / тышқанның оң батырмасы): тек алу мен қою */
export function decideL(G: Game): DecisionL | null {
  const { tr } = G;
  const a = G.aimRes;
  if (a?.u.stopcock) return null;
  const h = G.state.heldL;
  const u = a?.u;
  if (h) {
    if (!u) return null;
    if (u.waste && h.type === "vessel") return { act: "wasteL", text: tr("prompt.wasteL") };
    if (u.heaterTop && h.type === "vessel" && h.v.kind === "beaker") return { act: "heaterPlaceL", text: tr("prompt.heaterPlaceL") };
    if (u.rack && h.type === "vessel" && h.v.kind === "tube") return { act: "rackPlaceL", rack: u.rack, text: tr("prompt.rackPlaceL") };
    if (u.surface && a && a.n.y > 0.7 && !(h.type === "vessel" && h.v.kind === "tube") && !(h.type === "splint" && h.st === "burning")) {
      return { act: "placeL", text: tr("prompt.placeL") };
    }
    return null;
  }
  if (u?.item) {
    let it: Item = u.item;
    if (it.type === "vessel" && it.v.funnel) it = it.v.funnel;
    if (it.type === "vessel" && (it.v.link || it.v.linkIn)) return null;
    return { act: "pickL", item: it, text: tr("prompt.pickL", { name: it.name }) };
  }
  return null;
}
