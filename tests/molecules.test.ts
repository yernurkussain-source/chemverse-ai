import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { parseFormula } from "@/lib/chemistry/formula";
import { analyzeMolecule, angleBetween, bondTypes, distance, hydrogenBonds } from "@/lib/chemistry/molecule-geometry";
import { getMolecule, MOLECULES, moleculesWith } from "@/lib/chemistry/molecules";
import { parseMolfile } from "@/lib/chemistry/molfile";

const graph = (id: string) => parseMolfile(readFileSync(`public${getMolecule(id)!.sdf}`, "utf8"));
const atomOf = (id: string, elem: string) => {
  const g = graph(id);
  const i = g.atoms.findIndex((a) => a.elem === elem);
  return analyzeMolecule(g).atoms[i];
};

describe("Молекулалар дерегі", () => {
  test("SDF құрамы формулаға сай (кристалда — қатынасы), дереккөзі көрсетілген", () => {
    for (const m of MOLECULES) {
      assert.deepEqual(parseFormula(m.formula), m.atoms, m.id);
      assert.ok(m.pubchemCid !== null || m.generated, `${m.id}: дереккөз`);
      const counts: Record<string, number> = {};
      for (const a of graph(m.id).atoms) counts[a.elem] = (counts[a.elem] ?? 0) + 1;
      if (m.group !== "crystal") assert.deepEqual(counts, m.atoms, m.id);
      else assert.deepEqual(Object.keys(counts).sort(), Object.keys(m.atoms).sort(), m.id);
    }
  });

  test("элемент бойынша іздеу", () => {
    const ids = moleculesWith("P").map((m) => m.id);
    assert.deepEqual(ids, ["h3po4"]);
    assert.ok(moleculesWith("O").length > 20);
  });
});

describe("VSEPR: бөлінбеген жұптар және гибридтену", () => {
  test("бөлінбеген жұптар саны", () => {
    assert.equal(atomOf("h2o", "O").lonePairs, 2);
    assert.equal(atomOf("nh3", "N").lonePairs, 1);
    assert.equal(atomOf("ch4", "C").lonePairs, 0);
    assert.equal(atomOf("hcl", "Cl").lonePairs, 3);
    assert.equal(atomOf("n2", "N").lonePairs, 1);
    assert.equal(atomOf("co2", "O").lonePairs, 2);
    assert.equal(atomOf("so2", "S").lonePairs, 1);
    assert.equal(atomOf("co", "C").lonePairs, 1); // C⁻≡O⁺
    assert.equal(atomOf("h2so4", "S").lonePairs, 0);
  });

  test("гибридтену (орталық атомдар)", () => {
    const hyb = (id: string, elem: string) => {
      const g = graph(id);
      const a = analyzeMolecule(g).atoms;
      return a[g.atoms.findIndex((x) => x.elem === elem)].hybridization;
    };
    assert.equal(hyb("ch4", "C"), "sp3");
    assert.equal(hyb("h2o", "O"), "sp3");
    assert.equal(hyb("nh3", "N"), "sp3");
    assert.equal(hyb("co2", "C"), "sp");
    assert.equal(hyb("ethylene", "C"), "sp2");
    assert.equal(hyb("acetylene", "C"), "sp");
    assert.equal(hyb("benzene", "C"), "sp2");
    assert.equal(hyb("formaldehyde", "C"), "sp2");
    assert.equal(hyb("so2", "S"), "sp2");
  });

  test("судағы екі жұп тетраэдрге жуық орналасқан", () => {
    const g = graph("h2o");
    const o = g.atoms.findIndex((a) => a.elem === "O");
    const [p, q] = analyzeMolecule(g).atoms[o].lonePairDirections;
    const zero = { x: 0, y: 0, z: 0 };
    assert.ok(Math.abs(angleBetween(p, zero, q) - 109.5) < 1);
    const h = g.atoms.findIndex((a) => a.elem === "H");
    const toH = { x: g.atoms[h].x - g.atoms[o].x, y: g.atoms[h].y - g.atoms[o].y, z: g.atoms[h].z - g.atoms[o].z };
    assert.ok(angleBetween(p, zero, toH) > 100);
  });
});

describe("Полюстілік", () => {
  const NONPOLAR = ["h2", "o2", "n2", "cl2", "co2", "ch4", "ethane", "propane", "butane", "isobutane", "ethylene", "acetylene", "benzene"];
  const POLAR = ["o3", "h2o", "nh3", "hcl", "h2o2", "co", "so2", "hno3", "h2so4", "h3po4", "methanol", "ethanol", "dimethyl-ether", "glycerol", "formaldehyde", "acetic-acid", "acetone", "propanal", "phenol", "glucose", "sucrose", "urea", "glycine", "alanine", "aspirin", "vitamin-c", "caffeine"];

  test("полюсті / полюссіз молекулалар", () => {
    for (const id of NONPOLAR) assert.equal(analyzeMolecule(graph(id)).polar, false, id);
    for (const id of POLAR) assert.equal(analyzeMolecule(graph(id)).polar, true, id);
    assert.equal(NONPOLAR.length + POLAR.length, MOLECULES.filter((m) => m.group !== "crystal").length);
  });

  test("δ белгілері: судағы O — δ−, H — δ+", () => {
    assert.ok(atomOf("h2o", "O").partialCharge < 0);
    assert.ok(atomOf("h2o", "H").partialCharge > 0);
  });

  test("байланыс түрлері", () => {
    assert.deepEqual(
      bondTypes(graph("ethanol")).map((b) => `${b.pair}:${b.kind}`).sort(),
      ["C–C:nonpolar", "C–H:nonpolar", "C–O:polar", "O–H:polar"],
    );
    assert.equal(bondTypes(graph("cl2"))[0].kind, "nonpolar");
    assert.equal(bondTypes(graph("hcl"))[0].pair, "H–Cl");
    assert.equal(bondTypes(graph("nh3"))[0].pair, "N–H");
  });
});

describe("Өлшеу және кристалдар", () => {
  test("ұзындық пен бұрыш: судағы O–H ≈ 0,96 Å, H–O–H ≈ 104,5°", () => {
    const g = graph("h2o");
    const [o, h1, h2] = g.atoms;
    assert.ok(Math.abs(distance(o, h1) - 0.96) < 0.03);
    assert.ok(Math.abs(angleBetween(h1, o, h2) - 104.5) < 1.5);
  });

  test("алмаз — sp³ тор, графит — қабаттар, мұзда сутектік байланыстар бар", () => {
    const diamond = graph("diamond");
    const deg = analyzeMolecule(diamond).atoms.map((a) => a.neighbors.length);
    assert.ok(Math.max(...deg) === 4);
    assert.ok(Math.max(...analyzeMolecule(graph("graphite")).atoms.map((a) => a.neighbors.length)) === 3);
    const ice = graph("ice");
    assert.ok(hydrogenBonds(ice).length > 20);
    assert.equal(hydrogenBonds(graph("h2o")).length, 0);
  });
});
