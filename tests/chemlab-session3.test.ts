import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { gradeIndicator, INDICATOR_KEY, type IndicatorSubmission } from "@/features/virtual-lab/experiments/indicator-lab/grade";
import { INDICATOR_META } from "@/features/virtual-lab/experiments/indicator-lab/meta";
import {
  indicatorColor,
  INDICATORS,
  isValidOrder,
  observedColors,
  SOLUTIONS,
  testedTubes,
  TUBES,
  tubeSolutions,
} from "@/features/virtual-lab/experiments/indicator-lab/model";
import { gradeRate, RATE_KEY, runPoints, type RateSubmission } from "@/features/virtual-lab/experiments/reaction-rate/grade";
import {
  bothChanged,
  comparisonPairs,
  countViolations,
  halfLife,
  initialRate,
  rateConstant,
  vMaxMl,
  volumeAt,
} from "@/features/virtual-lab/experiments/reaction-rate/model";

const close = (actual: number, expected: number, eps: number) =>
  assert.ok(Math.abs(actual - expected) <= eps, `${actual} ≈ ${expected} (±${eps})`);

describe("Индикатор зертханасы: модель (spec 5.3)", () => {
  test("лакмус: < 4,5 қызыл; 4,5–8,3 күлгін; > 8,3 көк", () => {
    assert.equal(indicatorColor("litmus", 2).name, "red");
    assert.equal(indicatorColor("litmus", 7).name, "purple");
    assert.equal(indicatorColor("litmus", 8.4).name, "blue");
  });

  test("фенолфталеин: < 8,2 түссіз; 8,2–10 ақшыл қызғылт; > 10 таңқурай", () => {
    assert.equal(indicatorColor("phenolphthalein", 7).name, "colorless");
    assert.equal(indicatorColor("phenolphthalein", 8.4).name, "palePink");
    assert.equal(indicatorColor("phenolphthalein", 12).name, "crimson");
  });

  test("метилоранж: < 3,1 қызыл; 3,1–4,4 қызғылт сары; > 4,4 сары", () => {
    assert.equal(indicatorColor("methylOrange", 2.4).name, "red");
    assert.equal(indicatorColor("methylOrange", 4).name, "orange");
    assert.equal(indicatorColor("methylOrange", 7).name, "yellow");
  });

  test("әмбебап индикатор: 6 ерітіндінің түсі", () => {
    assert.deepEqual(
      SOLUTIONS.map((s) => indicatorColor("universal", s.pH).name),
      ["red", "red", "green", "green", "teal", "blueViolet"],
    );
    assert.equal(indicatorColor("universal", 4).name, "orange");
    assert.equal(indicatorColor("universal", 13.5).name, "violet");
  });

  test("пробиркалардың реті араласады, тексеру ережесі", () => {
    const params = { t0: 5, t1: 0, t2: 3, t3: 1, t4: 4, t5: 2 };
    assert.ok(isValidOrder(params));
    assert.ok(!isValidOrder({ t0: 0, t1: 0, t2: 1, t3: 2, t4: 3, t5: 4 }));
    assert.equal(tubeSolutions(params)[0].id, "naoh");
    const colors = observedColors(params, [
      { tube: 0, indicator: "phenolphthalein" },
      { tube: 0, indicator: "litmus" },
      { tube: 1, indicator: "universal" },
    ]);
    assert.deepEqual(colors[0], [["phenolphthalein", "crimson"], ["litmus", "blue"]]);
    assert.deepEqual(colors[2], []);
    assert.equal(testedTubes([{ tube: 0, indicator: "litmus" }, { tube: 0, indicator: "universal" }]), 1);
  });
});

describe("Индикатор зертханасы: бағалау", () => {
  const params = { t0: 5, t1: 0, t2: 3, t3: 1, t4: 4, t5: 2 };
  const solutions = tubeSolutions(params);
  const perfect: IndicatorSubmission = {
    prediction: "base",
    equipment: [...INDICATOR_KEY.equipment],
    experiment: { trials: TUBES.map((_, tube) => ({ tube, indicator: "universal" as const })) },
    observations: Object.fromEntries(solutions.map((s, i) => [`r${i}.medium`, s.medium])),
    answers: { phenol: "colorless", higherPh: "naoh", whichIndicator: "universal" },
    conclusion:
      "Мақсатым ерітінділердің ортасын индикатормен анықтау болды. Әмбебап индикатор қышқыл ортада қызыл, ал сілтілі NaOH ерітіндісінде көк-күлгін болды (pH 12). Фенолфталеин тек сілтілі ортада боялады.",
  };

  test("мінсіз жұмыс — 100, ашылатын мәндер — пробиркалардың ерітінділері", () => {
    const { breakdown, reveal } = gradeIndicator(params, perfect);
    assert.deepEqual(breakdown, { procedure: 30, observation: 25, calc: 20, conclusion: 25, total: 100 });
    assert.equal(reveal.tube0, 5);
    assert.equal(reveal.predictionCorrect, true);
  });

  test("тек 3 пробирка сыналды, 2 орта қате", () => {
    const observations = { ...perfect.observations, "r0.medium": "acid", "r1.medium": "base" };
    const { breakdown } = gradeIndicator(params, { ...perfect, experiment: { trials: perfect.experiment.trials.slice(0, 3) }, observations });
    assert.equal(breakdown.procedure, 10 + 10);
    assert.equal(breakdown.observation, Math.round((25 * 4) / 6));
  });

  test("клиент сипаттамасы: 4 дұрыс + 3 алаңдатқыш құрал, 4 индикатор", () => {
    assert.equal(INDICATOR_META.equipment.length, 7);
    assert.equal(INDICATORS.length, 4);
    assert.ok(INDICATOR_KEY.equipment.every((id) => (INDICATOR_META.equipment as readonly string[]).includes(id)));
  });
});

describe("Реакция жылдамдығы: модель (spec 5.4 кестесі)", () => {
  test("V_max = 49,4 мл", () => close(vMaxMl(), 49.4, 0.05));

  const rows = [
    { T: 20, c: 1, k: 0.02, half: 34.7, v30: 22.3, v0: 0.99 },
    { T: 30, c: 1, k: 0.04, half: 17.3, v30: 34.5, v0: 1.97 },
    { T: 20, c: 2, k: 0.04, half: 17.3, v30: 34.5, v0: 1.97 },
    { T: 40, c: 1, k: 0.08, half: 8.7, v30: 44.9, v0: 3.95 },
  ];
  for (const row of rows) {
    test(`T = ${row.T} °C, c = ${row.c} М: k, t½, V(30 с), v₀`, () => {
      close(rateConstant(row), row.k, 1e-9);
      close(halfLife(row), row.half, 0.05);
      close(volumeAt(row, 30), row.v30, 0.05);
      close(initialRate(row), row.v0, 0.01);
    });
  }

  test("«бір параметр» ережесі және салыстыру жұптары", () => {
    const runs = [
      { T: 20, c: 1 },
      { T: 30, c: 1 },
      { T: 20, c: 2 },
    ];
    assert.equal(bothChanged(runs[1], runs[2]), true);
    assert.equal(countViolations(runs), 1);
    assert.deepEqual(comparisonPairs(runs), { temperature: true, concentration: true });
    assert.deepEqual(comparisonPairs([{ T: 20, c: 1 }, { T: 30, c: 2 }]), { temperature: false, concentration: false });
  });

  test("тәжірибе ұпайы: екі жұп 20, ереже бұзылса −3", () => {
    assert.equal(runPoints([{ T: 20, c: 1 }, { T: 30, c: 1 }, { T: 30, c: 2 }]).points, 20);
    assert.equal(runPoints([{ T: 20, c: 1 }, { T: 30, c: 1 }, { T: 20, c: 2 }]).points, 17);
    assert.equal(runPoints([{ T: 20, c: 1 }]).points, 0);
  });
});

describe("Реакция жылдамдығы: бағалау", () => {
  const runs = [
    { T: 20, c: 1 },
    { T: 30, c: 1 },
    { T: 30, c: 2 },
  ];
  const perfect: RateSubmission = {
    prediction: "faster",
    equipment: [...RATE_KEY.equipment],
    experiment: { runs },
    observations: Object.fromEntries(runs.map((r, i) => [`r${i}.v30`, volumeAt(r, 30).toFixed(1).replace(".", ",")])),
    answers: { tempFactor: "2", halfLife: "halved", finalVolume: "mgLimiting" },
    conclusion:
      "Мақсатым реакция жылдамдығына температура мен концентрацияның әсерін зерттеу болды. Температураны 10 °C-қа көтергенде жылдамдық 2 есе өсті, концентрацияны арттырғанда да реакция тездеді. Соңғы көлем 49,4 мл, себебі магний шектеуші.",
  };

  test("мінсіз жұмыс — 100", () => {
    const { breakdown, reveal } = gradeRate(perfect);
    assert.deepEqual(breakdown, { procedure: 30, observation: 25, calc: 20, conclusion: 25, total: 100 });
    assert.equal(reveal.vMaxMl, 49.4);
  });

  test("V(30 с) ±1 мл рұқсатымен оқылады", () => {
    const observations = { ...perfect.observations, "r0.v30": "23,2", "r1.v30": "36" };
    assert.equal(gradeRate({ ...perfect, observations }).breakdown.observation, Math.round((25 * 2) / 3));
  });

  test("γ ≈ 2 (±5%) қабылданады, 3 — жоқ", () => {
    assert.equal(gradeRate({ ...perfect, answers: { ...perfect.answers, tempFactor: "2,05" } }).breakdown.calc, 20);
    assert.equal(gradeRate({ ...perfect, answers: { ...perfect.answers, tempFactor: "3" } }).breakdown.calc, 12);
  });
});
