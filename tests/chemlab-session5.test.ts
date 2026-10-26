import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { gradeMeasure, MEASURE_KEY, measureParams, type MeasureSubmission } from "@/features/virtual-lab/experiments/measurements/grade";
import { expectedValues, isMeasureDone, paramsOf, runActions } from "@/features/virtual-lab/experiments/measurements/model";
import { gradeSolubility, SOLUBILITY_KEY, type SolubilitySubmission } from "@/features/virtual-lab/experiments/solubility/grade";
import { brackets, REQUIRED, solubility, solubilityDone, type Sample } from "@/features/virtual-lab/experiments/solubility/model";
import { gradeMassFraction, MASS_FRACTION_KEY, type MassFractionSubmission } from "@/features/virtual-lab/experiments/mass-fraction/grade";
import { fraction, massFractionDone, prepOk, type Prep } from "@/features/virtual-lab/experiments/mass-fraction/model";

describe("Өлшеулер: модель", () => {
  const p = paramsOf({ b: 52.3, m: 27.5, v1: 24, dv: 10 });

  test("тара: стақан нөлденеді, таразы тек тасты көрсетеді", () => {
    const s = runActions(p, ["beakerOn", "tare", "stoneInBeaker"]);
    assert.equal(s.scale, 27.5);
    assert.equal(s.mistakes.length, 0);
  });

  test("тарасыз — стақан + тас, қате; бос цилиндрге тас — қате, тас салынбайды", () => {
    const s = runActions(p, ["beakerOn", "stoneInBeaker", "stoneInCylinder"]);
    assert.equal(s.scale, 79.8);
    assert.deepEqual(s.mistakes, ["stoneInBeaker", "stoneInCylinder"]);
    assert.equal(s.stoneInCylinder, false);
  });

  test("су ығыстыру: деңгей V₁ → V₁ + ΔV; тығыздық m / ΔV", () => {
    const s = runActions(p, ["pourWater", "stoneInCylinder", "beakerOn", "tare", "stoneInBeaker"]);
    assert.equal(s.level, 34);
    assert.ok(isMeasureDone(s));
    assert.equal(expectedValues(p).density, 2.75);
  });

  test("сервер параметрлері: тастың тығыздығы 2,5–2,9, көлемі шкалаға сыяды", () => {
    for (let i = 0; i < 50; i++) {
      const q = paramsOf(measureParams());
      const rho = q.m / q.dv;
      assert.ok(rho >= 2.49 && rho <= 2.91, String(rho));
      assert.ok(q.v1 + q.dv <= 50);
    }
  });
});

describe("Өлшеулер: бағалау", () => {
  const raw = { b: 52.3, m: 27.5, v1: 24, dv: 10 };
  const perfect: MeasureSubmission = {
    prediction: "displacement",
    equipment: [...MEASURE_KEY.equipment],
    experiment: { actions: ["beakerOn", "tare", "stoneInBeaker", "pourWater", "stoneInCylinder"] },
    observations: { "r0.value": "27,50", "r1.value": "24", "r2.value": "34", "r3.value": "10", "r4.value": "2,75" },
    answers: { meniscus: "bottom", tare: "container", bodyVolume: "15" },
    conclusion: "Тастың массасын тарамен өлшедім: 27,5 г. Көлемі су ығыстыру әдісімен 10 см³ шықты, сондықтан тығыздығы 2,75 г/см³.",
  };

  test("мінсіз жұмыс — 100", () => {
    assert.deepEqual(gradeMeasure(raw, perfect).breakdown, { procedure: 30, observation: 25, calc: 20, conclusion: 25, total: 100 });
  });

  test("тарасыз өлшеу −3, мениск жоғарғы шеті бойынша (V₂ = 35) — бақылауда қате", () => {
    const { breakdown } = gradeMeasure(raw, {
      ...perfect,
      experiment: { actions: ["beakerOn", "stoneInBeaker", "pourWater", "stoneInCylinder"] },
      observations: { ...perfect.observations, "r2.value": "35" },
    });
    assert.equal(breakdown.procedure, 27);
    assert.equal(breakdown.observation, 20);
  });
});

/** Оқушының шекарасы: ⌊S⌋ г ериді, ⌊S⌋ + 1 г — қаныққан */
const bracketSamples = (): Sample[] =>
  REQUIRED.flatMap(([salt, t]) => {
    const s = Math.floor(solubility(salt, t));
    return [[salt, t, s], [salt, t, s + 1]] as Sample[];
  });

describe("Ерігіштік: модель және бағалау", () => {
  test("шекара: 31 г ериді, 32 г — қаныққан (KNO₃, 20 °C)", () => {
    const b = brackets([["KNO3", 20, 31], ["KNO3", 20, 32], ["KNO3", 20, 40]]).get("KNO3:20");
    assert.deepEqual(b && [b.low, b.high], [31, 32]);
    assert.equal(solubilityDone(bracketSamples()), true);
    assert.equal(solubilityDone(bracketSamples().slice(0, 4)), false);
  });

  const perfect: SolubilitySubmission = {
    prediction: "increases",
    equipment: [...SOLUBILITY_KEY.equipment],
    experiment: { samples: bracketSamples() },
    observations: Object.fromEntries(REQUIRED.map(([salt, t], i) => [`r${i}.value`, String(Math.floor(solubility(salt, t)) + 0.5)])),
    answers: { trend: "sharply", recrystal: "KNO3", crystals: "78,4" },
    conclusion: "KNO₃-тің ерігіштігі температурамен күрт өседі: 20 °C-та 31,6 г, 60 °C-та 110 г. Ас тұзының ерігіштігі 36 г шамасында, ал артық тұз қаныққан ерітіндіде ерімейді.",
  };

  test("мінсіз жұмыс — 100", () => {
    assert.deepEqual(gradeSolubility(perfect).breakdown, { procedure: 30, observation: 25, calc: 20, conclusion: 25, total: 100 });
  });

  test("±1,5 г-нан асқан мән қате; бұрмаланған сынамалар елемейді", () => {
    const observations = { ...perfect.observations, "r0.value": "34" };
    const forged = { ...perfect, experiment: { samples: [...bracketSamples(), ["HCl", 20, 5], ["KNO3", 25, 10]] }, observations };
    const { breakdown } = gradeSolubility(forged);
    assert.equal(breakdown.observation, Math.round((25 * 5) / 6));
    assert.equal(breakdown.procedure, 30);
  });
});

describe("Массалық үлес: модель және бағалау", () => {
  test("50 г 10 %: 5 г тұз + 45 мл су", () => {
    assert.equal(fraction(5, 45), 10);
    assert.equal(prepOk([0, 5, 45]), true);
    assert.equal(prepOk([0, 5, 50]), false);
    assert.equal(prepOk([0, 10, 40]), false);
  });

  const preps: Prep[] = [
    [0, 5, 45],
    [1, 10, 190],
    [2, 12, 68],
  ];
  const perfect: MassFractionSubmission = {
    prediction: "right",
    equipment: [...MASS_FRACTION_KEY.equipment],
    experiment: { preps: [[0, 6, 45], ...preps] },
    observations: { "r0.mass": "50", "r0.w": "10", "r1.mass": "200", "r1.w": "5", "r2.mass": "80", "r2.w": "15" },
    answers: { dilute: "12", evaporate: "increases", fraction: "10" },
    conclusion: "Әр ерітінді үшін тұздың массасын w · m(ерітінді) арқылы есептедім. Мысалы, 50 г 10 % ерітіндіге 5 г тұз керек, сонда массалық үлес дәл шықты.",
  };

  test("мінсіз жұмыс — 100 (алғашқы қате дайындау есептелмейді)", () => {
    assert.ok(massFractionDone(preps));
    assert.deepEqual(gradeMassFraction(perfect).breakdown, { procedure: 30, observation: 25, calc: 20, conclusion: 25, total: 100 });
  });

  test("бір ерітінді дайындалмаса — сол жолдың ұяшықтары да есептелмейді", () => {
    const { breakdown } = gradeMassFraction({ ...perfect, experiment: { preps: preps.slice(0, 2) } });
    // 10 + 20 · 2/3 = 23,3 → 23
    assert.equal(breakdown.procedure, 23);
    assert.equal(breakdown.observation, Math.round((25 * 4) / 6));
  });
});
