import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { getMolecule } from "@/lib/chemistry/molecules";
import { parseMolfile } from "@/lib/chemistry/molfile";
import { equation, layoutRow, mapAtoms, REACTIONS, sideAtoms, type Reaction } from "@/lib/chemistry/reactions";

describe("Реакциялар", () => {
  test("барлық реакция теңестірілген (масса сақталу заңы)", () => {
    for (const r of REACTIONS) assert.deepEqual(sideAtoms(r.reactants), sideAtoms(r.products), r.id);
  });

  test("теңдеу мәтіні", () => {
    assert.equal(equation(REACTIONS[0]), "2H₂ + O₂ → 2H₂O");
    assert.equal(equation(REACTIONS.find((r) => r.id === "methane-burning")!), "CH₄ + 2O₂ → CO₂ + 2H₂O");
  });

  test("қатар және атомдарды сәйкестендіру: әр атом бір рет, элементі сақталады", () => {
    const row = (side: Reaction["reactants"]) =>
      layoutRow(side.flatMap(([id, n]) => Array.from({ length: n }, () => parseMolfile(readFileSync(`public${getMolecule(id)!.sdf}`, "utf8")))));
    for (const r of REACTIONS) {
      const [from, to] = [row(r.reactants), row(r.products)];
      const map = mapAtoms(from.atoms, to.atoms);
      assert.equal(new Set(map).size, from.atoms.length, r.id);
      map.forEach((j, i) => assert.equal(to.atoms[j].elem, from.atoms[i].elem, r.id));
      // Қатар ортасы координат басында
      const xs = from.atoms.map((a) => a.x);
      assert.ok(Math.abs(Math.min(...xs) + Math.max(...xs)) < 3, r.id);
    }
  });
});
