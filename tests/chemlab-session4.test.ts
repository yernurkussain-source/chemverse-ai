import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { gradePrecipitation, PRECIPITATION_KEY, type PrecipitationSubmission } from "@/features/virtual-lab/experiments/precipitation/grade";
import { PRECIPITATION_META } from "@/features/virtual-lab/experiments/precipitation/meta";
import { CELLS, mix } from "@/features/virtual-lab/experiments/precipitation/model";

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
