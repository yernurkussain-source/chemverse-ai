import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, test } from "node:test";
import * as C from "@/features/olympiad/core";

// Тесттер docs/olympiad/core/olympiad-core.test.js-тен көшірілген (9 тест)
const near = (a: number, b: number, e = 1e-6) => assert.ok(Math.abs(a - b) <= e, `${a} ≠ ${b}`);
const B: [string, number[]][] = [
  ["KMnO4 + HCl = KCl + MnCl2 + Cl2 + H2O", [2, 16, 2, 2, 5, 8]],
  ["Cu + HNO3 = Cu(NO3)2 + NO2 + H2O", [1, 4, 1, 2, 2]],
  ["Cu + HNO3 = Cu(NO3)2 + NO + H2O", [3, 8, 3, 2, 4]],
  ["K2Cr2O7 + HCl = KCl + CrCl3 + Cl2 + H2O", [1, 14, 2, 2, 3, 7]],
  ["Zn + HNO3 = Zn(NO3)2 + NH4NO3 + H2O", [4, 10, 4, 1, 3]],
  ["Cu + H2SO4 = CuSO4 + SO2 + H2O", [1, 2, 1, 1, 2]],
  ["AlCl3 + Na2CO3 + H2O = Al(OH)3 + CO2 + NaCl", [2, 3, 3, 2, 3, 6]],
  ["Al + NaOH + H2O = Na[Al(OH)4] + H2", [2, 2, 6, 2, 3]],
  ["C6H6 + O2 = CO2 + H2O", [2, 15, 12, 6]],
  ["H2S + O2 = SO2 + H2O", [2, 3, 2, 2]],
  ["SO2 + H2S = S + H2O", [1, 2, 3, 2]],
  ["MnO4^- + Fe^2+ + H^+ = Mn^2+ + Fe^3+ + H2O", [1, 5, 8, 1, 5, 4]],
  ["FeS2 + O2 = Fe2O3 + SO2", [4, 11, 2, 8]],
];

describe("Олимпиада ядросы", () => {
  test("Молярлық массалар", () => {
    near(C.molarMass("H2SO4"), 98);
    near(C.molarMass("Fe2(SO4)3"), 400);
    near(C.molarMass("Na[Al(OH)4]"), 118);
    near(C.molarMass("CuSO4*5H2O"), 250);
    near(C.molarMass("Ca(H2PO4)2"), 234);
    near(C.molarMass("KMnO4"), 158);
  });

  test("Массалық үлес", () => {
    near(C.massFraction("P2O5", "O"), 80 / 142);
    near(C.massFraction("NH4NO3", "N"), 0.35);
    near(C.massFraction("Fe3O4", "Fe"), 168 / 232);
  });

  test("Теңестіру (13 теңдеу)", () => {
    for (const [eq, k] of B) {
      assert.deepStrictEqual(C.balance(eq), k, eq);
      assert.ok(C.checkCoefficients(eq, k).ok, eq);
    }
  });

  test("Қате коэффициенттерді табу", () => {
    assert.ok(!C.checkCoefficients(B[0][0], [2, 16, 2, 2, 5, 7]).ok);
    assert.match(C.checkCoefficients(B[8][0], [4, 30, 24, 12]).reason ?? "", /қысқарт/);
  });

  test("Электрондық конфигурация", () => {
    const fe = C.econf(26);
    assert.equal(fe.full, "1s² 2s² 2p⁶ 3s² 3p⁶ 3d⁶ 4s²");
    assert.equal(fe.unpaired, 4);
    const cr = C.econf(24);
    assert.equal(cr.occ["3d"], 5);
    assert.equal(cr.occ["4s"], 1);
    assert.equal(cr.unpaired, 6);
    const cu = C.econf(29);
    assert.equal(cu.occ["3d"], 10);
    assert.equal(cu.unpaired, 1);
    assert.equal(C.econf(35).unpaired, 1);
    assert.equal(C.econf(7).unpaired, 3);
    assert.equal(C.econf(20).full, "1s² 2s² 2p⁶ 3s² 3p⁶ 4s²");
  });

  test("Соңғы электронның квант сандары", () => {
    assert.deepStrictEqual(C.lastElectronQN(7), { n: 2, l: 1, ml: 1, ms: 0.5 });
    assert.deepStrictEqual(C.lastElectronQN(8), { n: 2, l: 1, ml: -1, ms: -0.5 });
    assert.deepStrictEqual(C.lastElectronQN(8, "plusFirst"), { n: 2, l: 1, ml: 1, ms: -0.5 });
    assert.deepStrictEqual(C.lastElectronQN(26), { n: 3, l: 2, ml: -2, ms: -0.5 });
  });

  test("Генераторлар: қайталанады және жауабы дұрыс", () => {
    for (const id of Object.keys(C.GEN))
      for (let sd = 1; sd <= 25; sd++) {
        const a = C.generate(id, sd), b = C.generate(id, sd);
        assert.deepStrictEqual(a, b);
        assert.ok(isFinite(a.answer) && a.answer >= 0, id);
        assert.ok(a.kk.length > 20 && a.steps.length >= 1, id);
      }
  });

  test("Генераторлардың нақты мәндері", () => {
    const f = C.generate("faraday", 3);
    assert.ok(f.kk.match(/(\d+(?:,\d+)?) А ток күшімен (\d+) с/));
    near(C.GEN.faraday.gen(() => 0).answer, (64 * 1 * 1930) / (2 * 96500));
    near(C.GEN.vant_hoff.gen(() => 0).answer, 4);
    near(C.GEN.Kc_HI.gen(() => 0).answer, 4);
    near(C.GEN.plate.gen(() => 0).answer, 3.2);
  });

  test("Сандық жауапты тексеру", () => {
    assert.ok(C.checkNumeric("2,39", 2.3876).ok);
    assert.ok(!C.checkNumeric("2.5", 2.3876).ok);
    assert.match(C.checkNumeric("2387.6", 2.3876).reason ?? "", /Бірлік/);
    assert.ok(C.checkNumeric("5", 5, 0).ok);
  });
});

describe("TS көшірмесі прототиппен бірдей (формулалар мен мәтіндер өзгермеген)", () => {
  // npm test жоба папкасынан іске қосылады
  const P = createRequire(import.meta.url)(join(process.cwd(), "docs/olympiad/core/olympiad-core.js"));

  test("15 генератор × 25 seed: шарты, жауабы, қадамдары", () => {
    assert.deepStrictEqual(Object.keys(C.GEN), Object.keys(P.GEN));
    for (const id of Object.keys(C.GEN))
      for (let sd = 1; sd <= 25; sd++) assert.deepStrictEqual(C.generate(id, sd), P.generate(id, sd), `${id}#${sd}`);
  });

  test("econf және lastElectronQN: Z = 1–54", () => {
    for (let Z = 1; Z <= 54; Z++) {
      assert.deepStrictEqual(C.econf(Z), P.econf(Z), `Z=${Z}`);
      assert.deepStrictEqual(C.lastElectronQN(Z), P.lastElectronQN(Z), `Z=${Z}`);
      assert.deepStrictEqual(C.lastElectronQN(Z, "plusFirst"), P.lastElectronQN(Z, "plusFirst"), `Z=${Z}`);
    }
  });

  test("Теңестіру, қате себептері, формулалар", () => {
    for (const [eq, k] of B) {
      assert.deepStrictEqual(C.balance(eq), P.balance(eq), eq);
      assert.equal(C.formatEq(eq, k), P.formatEq(eq, k), eq);
      const wrong = k.map((x, i) => (i === 0 ? x + 1 : x));
      assert.deepStrictEqual(C.checkCoefficients(eq, wrong), P.checkCoefficients(eq, wrong), eq);
    }
    for (const f of ["Fe2(SO4)3", "Na[Al(OH)4]", "CuSO4*5H2O", "MnO4^-", "Fe^3+", "e^-"])
      assert.deepStrictEqual(C.parseFormula(f), P.parseFormula(f), f);
    for (const u of ["2,39", "2387.6", "0,0024", "abc", "3"])
      assert.deepStrictEqual(C.checkNumeric(u, 2.3876), P.checkNumeric(u, 2.3876), u);
  });
});

describe("Серверлік тексергіш", () => {
  test("checkEconf: деңгейшелер және жұпталмаған электрондар", () => {
    assert.ok(C.checkEconf(26, C.econf(26).occ, 4).ok);
    assert.match(C.checkEconf(24, { "1s": 2, "2s": 2, "2p": 6, "3s": 2, "3p": 6, "4s": 2, "3d": 4 }, 4).reason ?? "", /4s, 3d|3d, 4s/);
    assert.match(C.checkEconf(26, C.econf(26).occ, 6).reason ?? "", /Жұпталмаған/);
    // Pd: 5s⁰ — оқушы 5s-ті мүлде жазбаса да дұрыс
    const pd = { ...C.econf(46).occ };
    delete pd["5s"];
    assert.ok(C.checkEconf(46, pd, 0).ok);
  });

  test("checkAnswer: түрлері және пішімі қате жауап", () => {
    const base = { id: "x", topic: 1, level: 1, kk: "", solution: [], hints: [] };
    assert.deepStrictEqual(C.checkAnswer({ ...base, type: "mcq", choices: ["a", "b"], correct: 1 }, 1), { ok: true });
    assert.equal(C.checkAnswer({ ...base, type: "mcq", choices: ["a", "b"], correct: 1 }, 0)?.ok, false);
    assert.ok(C.checkAnswer({ ...base, type: "numeric", answer: { value: 40, unit: "", tol: 0 } }, "40")?.ok);
    assert.ok(C.checkAnswer({ ...base, type: "balance", equation: B[0][0], coeffs: B[0][1] }, B[0][1])?.ok);
    assert.ok(C.checkAnswer({ ...base, type: "econf", Z: 7, unpaired: 3 }, { occ: C.econf(7).occ, unpaired: 3 })?.ok);
    // Пішімі қате → null (API 400 қайтарады); ашық есепті мұғалім бағалайды
    assert.equal(C.checkAnswer({ ...base, type: "mcq", choices: ["a"], correct: 0 }, "0"), null);
    assert.equal(C.checkAnswer({ ...base, type: "balance", equation: B[0][0], coeffs: B[0][1] }, "2 16"), null);
    assert.equal(C.checkAnswer({ ...base, type: "open", rubric: [] }, "мәтін"), null);
  });
});
