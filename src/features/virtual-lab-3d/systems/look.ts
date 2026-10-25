import { entries, ION, METAL, pH, PPT, SOLIDS, type IonId } from "@/features/chem-engine";
import type { Game } from "../core/context";
import type { LookView } from "../game/store";
import type { FunnelItem, VesselItem } from "../items/types";
import { burReading } from "../scene/burette";
import { isTainted } from "../game/mystery";

/**
 * HUD карточкасы: нысанадағы (не қолдағы, не құйылып жатқан) ыдыстың көлемі, температурасы, pH-ы,
 * иондары, тұнбалары, кесектері және буландырғандағы қалдығы. Бюреткаға қараса — бюретка карточкасы.
 */
export function buildLook(G: Game): LookView | null {
  const { state, tr, fmt } = G;
  const aimRes = G.aimRes;
  const ml = tr("units.ml");
  const molar = tr("units.molar");
  const phText = (p: number | null) => (p == null ? "—" : fmt(p, 2));
  let it: VesselItem | null = null;
  let f: FunnelItem | null = null;
  if (aimRes?.u.item) {
    const a = aimRes.u.item;
    if (a.type === "vessel") it = a;
    else if (a.type === "funnel") {
      f = a;
      it = a.on;
    }
  }
  if (!it && state.held?.type === "vessel") it = state.held;
  if (!it && state.heldL?.type === "vessel") it = state.heldL;
  if (state.pour) {
    const t = state.pour.target;
    if (t.type === "funnel") {
      f = t;
      it = t.on;
    } else if (t.type === "vessel") it = t;
  }
  if (it && it.v.funnel) f = it.v.funnel;

  if ((aimRes && (aimRes.u.burette || aimRes.u.stopcock)) || state.pour?.target === G.bur.target) {
    const v = G.bur.v;
    const ions = entries(v.ions)
      .map(([k, n]) => [k, n / (Math.max(v.V, 0.01) / 1000)] as [IonId, number])
      .filter(([k, c]) => c >= 1e-3 && ION[k].z !== 0)
      .slice(0, 5);
    return {
      title: G.bur.target.name,
      sub: tr("look.buretteSub", { state: tr(`look.cock${G.bur.stop}`) }),
      meters: [
        { label: tr("look.reading"), value: fmt(burReading(G.bur), 2) },
        { label: tr("look.inside"), value: fmt(v.V, 1) },
        { label: tr("look.ph"), value: phText(pH(v)), accent: true },
      ],
      rows: [
        ...(isTainted(G, v) ? [[{ text: tr("mystery.ions") }]] : ions.length ? [ions.map(([k, c]) => ({ text: `${ION[k].f} ${fmt(c, 2)} ${molar}` }))] : []),
        [{ text: tr("look.buretteHint") }],
      ],
    };
  }
  if (!it && !f) return null;

  const view: LookView = { title: "", sub: "", meters: [], rows: [] };
  if (it) {
    const s = it.v.s;
    const sub = [`${it.v.cap} ${ml}`];
    if (s.onHeater) sub.push(tr("look.onHeater"));
    if (it.v.link && it.v.link.A === it && it.v.link.B) sub.push(tr("look.stopperTo", { name: it.v.link.B.name }));
    if (it.v.linkIn) sub.push(tr("look.tubeFrom", { name: it.v.linkIn.name }));
    view.title = s.name;
    view.sub = sub.join(" · ");
    view.meters = [
      { label: tr("look.volume"), value: fmt(s.V) },
      { label: tr("look.temp"), value: fmt(s.T) },
      { label: tr("look.ph"), value: phText(pH(s)), accent: true },
    ];
    const conc = (c: number) => (c >= 0.01 ? fmt(c, 2) : G.locale === "en" ? c.toExponential(1) : c.toExponential(1).replace(".", ","));
    const ions = entries(s.ions)
      .map(([k, n]) => [k, n / (Math.max(s.V, 0.01) / 1000)] as [IonId, number])
      .filter(([k, c]) => (c >= 1e-4 && ION[k].z !== 0) || (k === "H2O2" && c >= 1e-3))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    // X ерітіндісі бар ыдыс: иондары жасырын (оқушы оларды реакциялар бойынша анықтайды)
    const mystery = isTainted(G, s);
    view.rows.push(
      mystery && s.V > 0.05
        ? [{ text: tr("mystery.ions") }]
        : ions.length
          ? ions.map(([k, c]) => ({ text: `${ION[k].f} ${conc(c)} ${molar}` }))
          : [{ text: tr(s.V > 0.05 ? "look.onlyWater" : "look.empty") }],
    );
    const ppt = entries(s.ppt).filter(([k, n]) => n * PPT[k].M * 1000 >= 0.05);
    if (ppt.length) {
      view.rows.push(ppt.map(([k, n]) => ({ text: `${PPT[k].f} ${fmt(n * PPT[k].M * 1000, 1)} ${tr("units.mg")}`, color: `rgb(${PPT[k].col})` })));
    }
    if (s.pieces.length) {
      view.rows.push(
        s.pieces.map((pc) => {
          let text = `${SOLIDS[pc.metal].f} ${fmt(pc.n * METAL[pc.metal].M, 3)} ${tr("units.g")}`;
          if (pc.coatCu > 1e-5) text += ` · ${tr("look.copperCoat")}`;
          if (pc.coatAg > 1e-5) text += ` · ${tr("look.silver")}`;
          return { text };
        }),
      );
    }
    if (s.residue) {
      view.rows.push(
        s.residue.salts.length
          ? s.residue.salts.map((x) => ({ text: tr("look.residue", { f: mystery ? "?" : x.f, g: fmt(x.g, 3) }) }))
          : [{ text: tr("look.noResidue") }],
      );
    }
  }
  if (f) {
    const paper = entries(f.paper).filter(([k, n]) => n * PPT[k].M * 1000 >= 0.05);
    view.rows.push([
      { text: tr("look.inFunnel", { v: fmt(f.fv.V) }) },
      ...(paper.length
        ? paper.map(([k, n]) => ({ text: tr("look.onPaper", { f: PPT[k].f, mg: fmt(n * PPT[k].M * 1000, 1) }), color: `rgb(${PPT[k].col})` }))
        : [{ text: tr("look.paperClean") }]),
    ]);
  }
  return view;
}

/** Карточка өзгерсе ғана HUD-ты жаңарту (секундына ~6 рет шақырылады) */
export function renderLook(G: Game, last: { json: string }): void {
  const view = buildLook(G);
  const json = view ? JSON.stringify(view) : "";
  if (json === last.json) return;
  last.json = json;
  G.store.set({ look: view });
}
