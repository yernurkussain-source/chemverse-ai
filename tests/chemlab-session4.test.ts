import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { gradePrecipitation, PRECIPITATION_KEY, type PrecipitationSubmission } from "@/features/virtual-lab/experiments/precipitation/grade";
import { PRECIPITATION_META } from "@/features/virtual-lab/experiments/precipitation/meta";
import { CELLS, mix } from "@/features/virtual-lab/experiments/precipitation/model";
import { ACTIVITY_KEY, gradeActivity, type ActivitySubmission } from "@/features/virtual-lab/experiments/metal-activity/grade";
import { ACTIVITY_META } from "@/features/virtual-lab/experiments/metal-activity/meta";
import { CELLS as METAL_CELLS, metalSummary, runTube } from "@/features/virtual-lab/experiments/metal-activity/model";

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
