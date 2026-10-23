import { emit, engineStats } from "./events";
import { ION, type IonId, type Ions } from "./ions";
import { entries, type Salt, type Vessel } from "./vessel";

const SYM: Partial<Record<IonId, string>> = {
  Na: "Na",
  K: "K",
  Ag: "Ag",
  Cu: "Cu",
  Fe2: "Fe",
  Fe3: "Fe",
  Zn: "Zn",
  Mg: "Mg",
  Ca: "Ca",
  Ba: "Ba",
  Cl: "Cl",
  NO3: "NO₃",
  I: "I",
  SO4: "SO₄",
  CO3: "CO₃",
  HCO3: "HCO₃",
  OH: "OH",
  ZnOH4: "[Zn(OH)₄]",
};
/** Көп атомды аниондар: саны 1-ден көп болса жақшаға алынады — Ca(NO₃)₂ */
const POLY: Partial<Record<IonId, true>> = { NO3: true, SO4: true, CO3: true, HCO3: true, OH: true };
const SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉";
const SUB = (n: number) => (n === 1 ? "" : String(n).replace(/\d/g, (d) => SUBSCRIPTS[Number(d)]));
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/**
 * Буландырғаннан кейінгі қалдық: катиондар мен аниондарды эквивалент бойынша жұптап,
 * тұз формуласы мен массасын береді (H⁺ ұшқыш қышқыл ретінде буланып кетеді).
 */
export function residueOf(ions: Ions): Salt[] {
  const cats: { k: IonId; eq: number }[] = [];
  const ans: { k: IonId; eq: number }[] = [];
  for (const [k, n] of entries(ions)) {
    if (k === "H" || n < 1e-10) continue;
    const z = ION[k].z;
    (z > 0 ? cats : ans).push({ k, eq: n * Math.abs(z) });
  }
  let h = ions.H || 0;
  for (const a of ["Cl", "NO3", "I", "SO4"] as const) {
    const e = ans.find((x) => x.k === a);
    if (e && h > 0) {
      const d = Math.min(h, e.eq);
      e.eq -= d;
      h -= d;
    }
  }
  const out: Record<string, number> = {};
  let i = 0;
  let j = 0;
  while (i < cats.length && j < ans.length) {
    if (ans[j].eq < 1e-12) {
      j++;
      continue;
    }
    const d = Math.min(cats[i].eq, ans[j].eq);
    const key = cats[i].k + "|" + ans[j].k;
    out[key] = (out[key] || 0) + d;
    cats[i].eq -= d;
    ans[j].eq -= d;
    if (cats[i].eq < 1e-12) i++;
    if (ans[j].eq < 1e-12) j++;
  }
  return Object.entries(out)
    .map(([key, eq]) => {
      const [c, a] = key.split("|") as [IonId, IonId];
      const zc = ION[c].z;
      const za = -ION[a].z;
      const l = (zc * za) / gcd(zc, za);
      const nc = l / zc;
      const na = l / za;
      const f = SYM[c] + SUB(nc) + (POLY[a] && na > 1 ? "(" + SYM[a] + ")" + SUB(na) : SYM[a] + SUB(na));
      const mol = eq / l;
      return { f, g: mol * (nc * ION[c].M + na * ION[a].M) };
    })
    .filter((s) => s.g > 0.0005)
    .sort((a, b) => b.g - a.g);
}

/** Су толық буланды: ыдыста тұз қалдығы қалады ('dry' оқиғасы қалдықты береді) */
export function dryOut(v: Vessel): void {
  const salts = residueOf(v.ions);
  v.residue = { salts, ions: entries(v.ions).filter(([k]) => k !== "H") };
  salts.forEach((s) => engineStats.residue.add(s.f));
  v.ions = {};
  v.V = 0;
  v.boil = false;
  emit(v, "dry", { eq: "H₂O(с) → H₂O(г)↑", salts });
}
