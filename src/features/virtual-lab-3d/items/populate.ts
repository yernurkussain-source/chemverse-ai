import type { ReagentId, Vessel } from "@/features/chem-engine";
import type { Base } from "../core/context";
import { boxG, std, V3 } from "../core/three-utils";
import { pickMystery, type Mystery } from "../game/mystery";
import type { Bench } from "../scene/bench";
import type { Cabinet, Cabinets } from "../scene/cabinets";
import { makeBottle } from "./bottle";
import { makeRack } from "./rack";
import { placeAt, setHome } from "./register";
import { makeDTube, makeFunnel, makeSplint, makeWire } from "./tools";
import type { BottleItem, Item } from "./types";
import { makeVessel } from "./vessel";

/** Заттарды сөрелерге бірдей аралықпен қою (shelf: 0 — төменгі, 1 — ортаңғы, 2 — жоғарғы) */
function shelfRow(cab: Cabinet, shelf: number, list: Item[], spread = 0.76): void {
  const n = list.length;
  list.forEach((it, i) => {
    const x = cab.cx + (n === 1 ? 0 : -spread / 2 + i * (spread / (n - 1)));
    placeAt(it, V3(x, cab.shelfTop[shelf], cab.z), 0);
    setHome(it);
  });
}

/** Зертхананы толтыру: реактивтер, ыдыстар, штативтер, құралдар (прототиптегі орындар) */
export function populate(G: Base, cabs: Cabinets, bench: Bench) {
  const B = (id: ReagentId) => makeBottle(G, id);
  shelfRow(cabs.acids, 1, [B("HCl"), B("H2SO4"), B("H2O2")]);
  shelfRow(cabs.acids, 0, [B("NaOH"), B("CaOH2")]);
  shelfRow(cabs.salts, 1, [B("Na2CO3"), B("NaCl"), B("KI"), B("CuSO4")]);
  // «X» — белгісіз зат (тапсырма): ішіндегісі ойын басталғанда кездейсоқ таңдалады
  const xBottle = makeBottle(G, pickMystery(), true) as BottleItem;
  shelfRow(cabs.salts, 0, [B("AgNO3"), B("BaCl2"), B("FeCl3"), xBottle]);
  shelfRow(cabs.other, 1, [B("php"), B("mo"), B("lit"), B("uni")]);
  shelfRow(cabs.other, 0, [B("Mg"), B("Zn"), B("Fe"), B("Cu"), B("CaCO3"), B("MnO2")], 0.84);

  // Шырпы жоғарғы сөреде жатады (жанынан шырпы қорабы)
  const splint = makeSplint(G);
  placeAt(splint, V3(cabs.other.cx - 0.25, cabs.other.shelfTop[2], cabs.other.z), 0);
  splint.g.rotation.z = Math.PI / 2;
  splint.rest!.quat.copy(splint.g.quaternion);
  splint.rest!.pos.y += 0.003;
  setHome(splint);
  G.mesh(boxG(0.18, 0.012, 0.05), std(0xc8a36b, { r: 0.8 }), cabs.other.cx - 0.25 + 0.08, cabs.other.shelfTop[2] + 0.006, cabs.other.z + 0.03);

  const wash = B("H2O");
  placeAt(wash, V3(-1.05, bench.top, 0.62), 0.4);
  setHome(wash);

  const wire = makeWire(G);
  placeAt(wire, V3(0.85, bench.top + 0.004, 0.05), 0);
  wire.g.rotation.z = Math.PI / 2;
  wire.rest!.quat.copy(wire.g.quaternion);
  setHome(wire);

  const beakers = [1, 2, 3, 4].map((i) => makeVessel(G, G.tr("vessels.beaker", { n: i }), String(i), "beaker"));
  shelfRow(cabs.glass, 1, beakers);
  const funnel = makeFunnel(G);
  placeAt(funnel, V3(cabs.glass.cx - 0.25, cabs.glass.shelfTop[2], cabs.glass.z), 0);
  setHome(funnel);
  const dtube = makeDTube(G);
  placeAt(dtube, V3(cabs.glass.cx + 0.15, cabs.glass.shelfTop[2], cabs.glass.z), 0);
  setHome(dtube);

  const rackCab = makeRack(G, cabs.glass.cx, cabs.glass.shelfTop[0], cabs.glass.z, 6);
  const rackBench = makeRack(G, -0.45, bench.top, 0.3, 6);
  for (let i = 1; i <= 6; i++) {
    const t = makeVessel(G, G.tr("vessels.tube", { n: i }), G.tr("vessels.tubeShort", { n: i }), "tube");
    const sl = rackCab.slots[i - 1];
    placeAt(t, sl.pos, 0);
    sl.item = t;
    t.slot = sl;
    setHome(t);
    t.home!.slot = sl;
  }
  const mystery: Mystery = { bottle: xBottle, taint: new WeakSet<Vessel>(), solved: false };
  return { beakers, rackCab, rackBench, funnel, dtube, splint, wire, mystery };
}
