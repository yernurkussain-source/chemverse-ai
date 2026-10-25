import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { gradePrecipitation, PRECIPITATION_KEY, type PrecipitationSubmission } from "@/features/virtual-lab/experiments/precipitation/grade";
import { PRECIPITATION_META } from "@/features/virtual-lab/experiments/precipitation/meta";
import { CELLS, mix } from "@/features/virtual-lab/experiments/precipitation/model";
import { ACTIVITY_KEY, gradeActivity, type ActivitySubmission } from "@/features/virtual-lab/experiments/metal-activity/grade";
import { ACTIVITY_META } from "@/features/virtual-lab/experiments/metal-activity/meta";
import { CELLS as METAL_CELLS, metalSummary, runTube } from "@/features/virtual-lab/experiments/metal-activity/model";
import { gradeUnknown, SEED_MAX, UNKNOWN_KEY, unknownIndex, type UnknownSubmission } from "@/features/virtual-lab/experiments/unknown-substance/grade";
import { BALANCE_KEY, gradeBalance, type BalanceSubmission } from "@/features/virtual-lab/experiments/balance-equations/grade";
import { atomCounts, EQUATIONS, equationText, isBalanced, totalAtoms } from "@/features/virtual-lab/experiments/balance-equations/model";
import { CANDIDATES, molarMass, observe, revealedIon, TESTS } from "@/features/virtual-lab/experiments/unknown-substance/model";

describe("Тұнба түзілуі: модель (ортақ қозғалтқыш)", () => {
  test("12 пробирка: 8 тұнба, Ba(OH)₂ мен сульфаттар ериді", () => {
    assert.deepEqual(
      CELLS.map((_, i) => mix(i).ppt),
      // NaOH, Na₂SO₄, AgNO₃ — BaCl₂, CuCl₂, FeCl₃, MgCl₂ жолдары
      [null, "BaSO4", "AgCl", "CuOH2", null, "AgCl", "FeOH3", null, "AgCl", "MgOH2", null, "AgCl"],
    );
  });

  test("Cu²⁺ ерітіндісі көгілдір: тұнба жоқта да түсі бар", () => {
    const cu = mix(4).liquid;
    assert.ok(cu.b > cu.r, "көк реңк");
  });
});

describe("Тұнба түзілуі: бағалау", () => {
  const results = CELLS.map((_, i) => mix(i).ppt);
  const perfect: PrecipitationSubmission = {
    prediction: "bluePpt",
    equipment: [...PRECIPITATION_KEY.equipment],
    experiment: { mixed: CELLS.map((_, i) => i) },
    observations: Object.fromEntries(results.map((p, i) => [`r${i}.ppt`, p ?? "none"])),
    answers: { ionic: "baso4", silver: "chloride", pptMass: "2,33" },
    conclusion:
      "Тәжірибенің мақсаты тұнба түзілуін зерттеу болды. 12 пробирканың 8-інде ерімейтін тұнба түзілді. Тұнбаны Ba²⁺ мен SO₄²⁻, Ag⁺ мен Cl⁻ иондары береді.",
  };

  test("мінсіз жұмыс — 100", () => {
    const { breakdown, reveal } = gradePrecipitation(perfect);
    assert.deepEqual(breakdown, { procedure: 30, observation: 25, calc: 20, conclusion: 25, total: 100 });
    assert.equal(reveal.pptCount, 8);
    assert.equal(reveal.predictionCorrect, true);
  });

  test("жартысы сыналды, 3 ұяшық қате, масса 10 есе қате", () => {
    const observations = { ...perfect.observations, "r0.ppt": "BaSO4", "r1.ppt": "none", "r2.ppt": "BaSO4" };
    const { breakdown } = gradePrecipitation({
      ...perfect,
      experiment: { mixed: [0, 1, 2, 3, 4, 5, 5, 5] },
      observations,
      answers: { ...perfect.answers, pptMass: "23,3" },
    });
    assert.equal(breakdown.procedure, 10 + 10);
    assert.equal(breakdown.observation, Math.round((25 * 9) / 12));
    assert.equal(breakdown.calc, 13);
  });

  test("клиент сипаттамасы: 5 дұрыс + 3 алаңдатқыш құрал", () => {
    assert.equal(PRECIPITATION_META.equipment.length, 8);
    assert.ok(PRECIPITATION_KEY.equipment.every((id) => (PRECIPITATION_META.equipment as readonly string[]).includes(id)));
  });
});

describe("Металдардың белсенділігі: модель (ортақ қозғалтқыш, 60 с)", () => {
  test("HCl: Mg ≫ Zn > Fe, мыс сутекті ығыстырмайды", () => {
    const h2 = [0, 3, 6, 9].map((cell) => runTube(cell).h2Ml);
    assert.deepEqual(h2, [79.7, 4.7, 2, 0]);
  });

  test("ығыстыру: Cu²⁺-ті Mg, Zn, Fe ығыстырады; Ag⁺-ті төртеуі де, мыс та", () => {
    assert.deepEqual(
      METAL_CELLS.map((_, i) => runTube(i).coat),
      [null, "Cu", "Ag", null, "Cu", "Ag", null, "Cu", "Ag", null, null, "Ag"],
    );
  });

  test("қорытынды: әрекеттесу саны және белсенділік орны", () => {
    assert.deepEqual(
      metalSummary().map((s) => [s.metal, s.reactions, s.rank]),
      [["Mg", 3, 1], ["Zn", 3, 2], ["Fe", 3, 3], ["Cu", 1, 4]],
    );
  });
});

describe("Металдардың белсенділігі: бағалау", () => {
  const summary = metalSummary();
  const perfect: ActivitySubmission = {
    prediction: "silver",
    equipment: [...ACTIVITY_KEY.equipment],
    experiment: { tested: METAL_CELLS.map((_, i) => i) },
    observations: Object.fromEntries(summary.flatMap((s, i) => [[`r${i}.reactions`, String(s.reactions)], [`r${i}.rank`, String(s.rank)]])),
    answers: { order: "mgZnFeCu", copper: "position", h2Volume: "100" },
    conclusion:
      "Магний ең белсенді металл: 60 секундта 79,7 мл сутек бөлінді. Mg, Zn және Fe мысты тұзынан ығыстырады, ал мыс тек күмісті ығыстырады. Белсенділік қатары: Mg > Zn > Fe > Cu.",
  };

  test("мінсіз жұмыс — 100 (Vm = 24, M = 24 деп есептеген 100 мл қабылданады)", () => {
    const { breakdown, reveal } = gradeActivity(perfect);
    assert.deepEqual(breakdown, { procedure: 30, observation: 25, calc: 20, conclusion: 25, total: 100 });
    assert.equal(reveal.h2Mg, 79.7);
    assert.equal(reveal.predictionCorrect, true);
  });

  test("орындар ауысқан, көлем қате", () => {
    const observations = { ...perfect.observations, "r1.rank": "3", "r2.rank": "2" };
    const { breakdown } = gradeActivity({ ...perfect, observations, answers: { ...perfect.answers, h2Volume: "50" } });
    assert.equal(breakdown.observation, Math.round((25 * 6) / 8));
    assert.equal(breakdown.calc, 13);
  });

  test("клиент сипаттамасы: 6 дұрыс + 3 алаңдатқыш құрал", () => {
    assert.equal(ACTIVITY_META.equipment.length, 9);
    assert.ok(ACTIVITY_KEY.equipment.every((id) => (ACTIVITY_META.equipment as readonly string[]).includes(id)));
  });
});

describe("Белгісіз затты анықтау: модель", () => {
  test("сынақтар: жалын, NaOH, AgNO₃ + HNO₃, BaCl₂, HCl", () => {
    assert.deepEqual(
      Object.fromEntries(CANDIDATES.map((c, x) => [c.id, TESTS.map((test) => observe(x, test))])),
      {
        NaCl: ["flameNa", "none", "white", "none", "none"],
        KI: ["flameK", "none", "yellow", "none", "none"],
        BaCl2: ["flameBa", "none", "white", "none", "none"],
        CuSO4: ["flameCu", "blue", "none", "white", "none"],
        FeCl3: ["flameNone", "brown", "white", "none", "none"],
        Na2CO3: ["flameNa", "none", "gas", "white", "gas"],
        Na2SO4: ["flameNa", "none", "none", "white", "none"],
      },
    );
  });

  test("әр заттың сынақтар жиынтығы бірегей — X-ті бір мәнді анықтауға болады", () => {
    const signatures = CANDIDATES.map((_, x) => TESTS.map((test) => observe(x, test)).join());
    assert.equal(new Set(signatures).size, CANDIDATES.length);
  });

  test("сынақ көрсететін ион және молярлық масса", () => {
    assert.deepEqual(TESTS.map((test) => revealedIon(5, test)), ["Na", "none", "CO3", "CO3", "CO3"]);
    assert.deepEqual(TESTS.map((test) => revealedIon(4, test)), ["none", "Fe3", "Cl", "none", "none"]);
    assert.deepEqual(CANDIDATES.map((_, x) => Math.round(molarMass(x))), [58, 166, 208, 160, 162, 106, 142]);
  });

  test("X құпия кілтпен есептеледі: кілтсіз seed жауапты бермейді, барлық 7 зат кездеседі", () => {
    assert.equal(unknownIndex(12345, "a"), unknownIndex(12345, "a"));
    const seen = new Set(Array.from({ length: 200 }, (_, i) => unknownIndex(i + 1, "secret")));
    assert.equal(seen.size, CANDIDATES.length);
    assert.ok(Array.from({ length: 50 }, (_, i) => unknownIndex(i + 1, "a") !== unknownIndex(i + 1, "b")).some(Boolean));
    assert.ok(SEED_MAX > 1e9);
  });
});

describe("Белгісіз затты анықтау: бағалау", () => {
  const x = 3; // CuSO₄
  const perfect: UnknownSubmission = {
    prediction: "cation",
    equipment: [...UNKNOWN_KEY.equipment],
    experiment: { tests: TESTS.map((test) => ({ test, seen: observe(x, test) })) },
    observations: Object.fromEntries(TESTS.map((test, i) => [`r${i}.ion`, revealedIon(x, test)])),
    answers: { formula: "CuSO4", molarMass: "160", hno3: "carbonate" },
    conclusion:
      "Жалын жасыл түске боялды және NaOH көгілдір тұнба берді, демек катион — Cu²⁺. BaCl₂ ақ тұнба берді, ал HCl газ бермеді, демек анион — SO₄²⁻. X — мыс сульфаты CuSO₄, молярлық массасы 160 г/моль.",
  };

  test("мінсіз жұмыс — 100", () => {
    const { breakdown, reveal } = gradeUnknown(x, perfect);
    assert.deepEqual(breakdown, { procedure: 30, observation: 25, calc: 20, conclusion: 25, total: 100 });
    assert.equal(reveal.unknown, x);
    assert.equal(reveal.predictionCorrect, true);
  });

  test("клиент «seen»-ді өзгертсе де бағалау X бойынша; басқа зат таңдалса — формула мен масса 0", () => {
    const forged = { ...perfect, experiment: { tests: TESTS.map((test) => ({ test, seen: "none" as const })) } };
    assert.equal(gradeUnknown(x, forged).breakdown.observation, 25);
    const wrong = gradeUnknown(x, { ...perfect, answers: { formula: "Na2SO4", molarMass: "142", hno3: "carbonate" } });
    assert.equal(wrong.breakdown.calc, 6);
  });

  test("тек 2 сынақ жасалды", () => {
    const { breakdown } = gradeUnknown(x, { ...perfect, experiment: { tests: perfect.experiment.tests.slice(0, 2) } });
    assert.equal(breakdown.procedure, 10 + 8);
  });
});

describe("Коэффициенттерді таңдау: модель", () => {
  test("кілттегі коэффициенттер теңдеулерді теңестіреді, бастапқы (бәрі 1) — жоқ", () => {
    BALANCE_KEY.solutions.forEach((c, i) => assert.ok(isBalanced(i, c), EQUATIONS[i].id));
    assert.ok(EQUATIONS.every((_, i) => !isBalanced(i, BALANCE_KEY.solutions[i].map(() => 1))));
  });

  test("еселенген коэффициенттер (4, 2, 4) — ең кіші емес, теңестірілген деп саналмайды", () => {
    assert.equal(isBalanced(0, [4, 2, 4]), false);
    assert.equal(isBalanced(0, [2, 1, 2]), true);
    assert.equal(isBalanced(0, [2, 1]), false);
  });

  test("атом таразысы және теңдеу мәтіні", () => {
    assert.deepEqual(atomCounts(3, [4, 3, 2]), { left: { Al: 4, O: 6 }, right: { Al: 4, O: 6 } });
    assert.deepEqual(BALANCE_KEY.solutions.map((c, i) => totalAtoms(atomCounts(i, c).left)), [6, 4, 5, 10, 9]);
    assert.equal(equationText(4, [1, 2, 1, 2]), "CH₄ + 2O₂ → CO₂ + 2H₂O");
  });
});

describe("Коэффициенттерді таңдау: бағалау", () => {
  const perfect: BalanceSubmission = {
    prediction: "4",
    equipment: [...BALANCE_KEY.equipment],
    experiment: { coeffs: BALANCE_KEY.solutions.map((c) => [...c]) },
    observations: { "r0.atoms": "6", "r1.atoms": "4", "r2.atoms": "5", "r3.atoms": "10", "r4.atoms": "9" },
    answers: { indices: "substance", law: "conservation", waterMass: "36" },
    conclusion:
      "Теңестіргенде тек коэффициенттерді өзгерттім, индекстер өзгермеді. Әр элементтің атом саны екі жақта бірдей — атомдар сақталады. 4 г сутектен 36 г су түзіледі.",
  };

  test("мінсіз жұмыс — 100", () => {
    const { breakdown, reveal } = gradeBalance(perfect);
    assert.deepEqual(breakdown, { procedure: 30, observation: 25, calc: 20, conclusion: 25, total: 100 });
    assert.equal(reveal.balanced, 5);
  });

  test("екі теңдеу теңестірілмеген, бір атом саны қате, индекс өзгертілген", () => {
    const coeffs = perfect.experiment.coeffs.map((c, i) => (i < 2 ? c.map(() => 1) : c));
    const { breakdown } = gradeBalance({
      ...perfect,
      equipment: [...BALANCE_KEY.equipment, "indices"],
      experiment: { coeffs },
      observations: { ...perfect.observations, "r3.atoms": "9" },
    });
    assert.equal(breakdown.procedure, 7 + 12);
    assert.equal(breakdown.observation, 20);
  });
});
