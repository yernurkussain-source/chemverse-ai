import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { gradeMeasure, MEASURE_KEY, measureParams, type MeasureSubmission } from "@/features/virtual-lab/experiments/measurements/grade";
import { expectedValues, isMeasureDone, paramsOf, runActions } from "@/features/virtual-lab/experiments/measurements/model";

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
