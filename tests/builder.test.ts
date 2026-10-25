import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { addAtom, composition, cycleBond, EMPTY, fillHydrogens, freeValence, isConnected, signature, toGraph, type BuilderState } from "@/lib/chemistry/builder";
import { getMolecule } from "@/lib/chemistry/molecules";
import { parseMolfile } from "@/lib/chemistry/molfile";

const sdf = (id: string) => parseMolfile(readFileSync(`public${getMolecule(id)!.sdf}`, "utf8"));

/** Тізбек құру: ["C", "C", "O"] — әрқайсысы алдыңғысына жалғанады */
function chain(elems: string[], start: BuilderState = EMPTY, from: number | null = null) {
  let state = start;
  let last = from;
  for (const e of elems) {
    const added = addAtom(state, e, last)!;
    state = added.state;
    last = added.id;
  }
  return { state, last: last! };
}

describe("Молекула құрастырушы", () => {
  test("метан: C + сутекпен толтыру → CH₄, валенттілік толық", () => {
    const methane = fillHydrogens(chain(["C"]).state);
    assert.deepEqual(composition(methane), { C: 1, H: 4 });
    assert.ok(methane.atoms.every((a) => freeValence(methane, a) === 0));
    assert.ok(isConnected(methane));
    assert.equal(signature(toGraph(methane)), signature(sdf("ch4")));
  });

  test("этанол мен диметил эфирі ажыратылады", () => {
    const ethanol = fillHydrogens(chain(["C", "C", "O"]).state);
    const ether = fillHydrogens(chain(["C", "O", "C"]).state);
    assert.equal(signature(toGraph(ethanol)), signature(sdf("ethanol")));
    assert.equal(signature(toGraph(ether)), signature(sdf("dimethyl-ether")));
    assert.notEqual(signature(sdf("ethanol")), signature(sdf("dimethyl-ether")));
  });

  test("қос байланыс: этилен; изомерлер: бутан ≠ изобутан", () => {
    const { state, last } = chain(["C", "C"]);
    const ethylene = fillHydrogens(cycleBond(state, state.atoms[0].id, last));
    assert.equal(signature(toGraph(ethylene)), signature(sdf("ethylene")));
    assert.notEqual(signature(sdf("butane")), signature(sdf("isobutane")));
  });

  test("байланыс еселігі 1 → 2 → 3 → жоқ; валенттіліктен асу теріс шығады", () => {
    const { state, last } = chain(["O", "O"]);
    const first = state.atoms[0].id;
    let s = cycleBond(state, first, last); // 2
    s = cycleBond(s, first, last); // 3
    assert.equal(s.bonds[0].order, 3);
    assert.ok(freeValence(s, s.atoms[0]) < 0);
    assert.equal(cycleBond(s, first, last).bonds.length, 0);
  });

  test("күкірттің айнымалы валенттілігі (II, IV, VI)", () => {
    const { state } = chain(["S", "O"]);
    const s = state.atoms[0];
    assert.equal(freeValence(state, s), 1); // 1 байланыс → II-ге дейін тағы 1
  });
});
