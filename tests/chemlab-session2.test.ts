import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ATOM_KEY, gradeAtom, observationRows as atomRows, type AtomSubmission } from "@/features/virtual-lab/experiments/atom-builder/grade";
import { ATOM_META, chargeFromOption, optionFromCharge } from "@/features/virtual-lab/experiments/atom-builder/meta";
import {
  ATOM_ELEMENTS,
  ATOM_GOALS,
  chargeLabel,
  describe as describeAtom,
  parseShells,
  particleSymbol,
  shellsOf,
} from "@/features/virtual-lab/experiments/atom-builder/model";
import { actionPoints, gradeMixture, MIXTURE_KEY, type MixtureSubmission } from "@/features/virtual-lab/experiments/mixture-separation/grade";
import { MIXTURE_META } from "@/features/virtual-lab/experiments/mixture-separation/meta";
import {
  applyAction,
  INITIAL_STATE,
  isSeparated,
  placeOf,
  runActions,
  saltFractionPct,
  saltYieldPct,
} from "@/features/virtual-lab/experiments/mixture-separation/model";
import { getElement } from "@/lib/chemistry/elements";

describe("Қоспаны бөлу: модель (spec 5.1)", () => {
  test("дұрыс жол: еріту → сүзу → буландыру → кептіру", () => {
    const { state, mistakes, log } = runActions(["dissolve", "filter", "evaporate", "dry"]);
    assert.ok(isSeparated(state));
    assert.equal(mistakes, 0);
    assert.deepEqual(log.map((l) => l.key), ["dissolved", "filtered", "evaporated", "dried"]);
    assert.equal(placeOf(state, "sand"), "filter");
    assert.equal(placeOf(state, "salt"), "dish");
  });

  test("кептіру мен буландырудың реті еркін", () => {
    assert.ok(isSeparated(runActions(["dissolve", "filter", "dry", "evaporate"]).state));
  });

  test("қате реттер: кері байланыс кілті және күй өзгермейді", () => {
    assert.deepEqual(applyAction(INITIAL_STATE, "filter"), { state: INITIAL_STATE, key: "filterDry", mistake: true });
    assert.equal(applyAction(INITIAL_STATE, "evaporate").key, "evaporateFirst");
    assert.equal(applyAction(INITIAL_STATE, "magnet").key, "magnet");
    const dissolved = applyAction(INITIAL_STATE, "dissolve").state;
    assert.equal(applyAction(dissolved, "evaporate").key, "evaporateBeforeFilter");
    assert.equal(applyAction(dissolved, "dry").key, "dryEarly");
    // Қайталау қате емес
    assert.equal(applyAction(dissolved, "dissolve").mistake, false);
  });

  test("есептеулер: массалық үлес 40%, шығым 96,25%", () => {
    assert.equal(saltFractionPct(), 40);
    assert.equal(saltYieldPct(), 96.25);
  });

  test("әрекет ұпайы: аяқталса 20, әр қате −3, теріс емес, аяқталмаса кезеңге 5", () => {
    assert.equal(actionPoints(["dissolve", "filter", "evaporate", "dry"]).points, 20);
    assert.equal(actionPoints(["magnet", "filter", "dissolve", "filter", "evaporate", "dry"]).points, 14);
    assert.equal(actionPoints(["dissolve", "filter"]).points, 10);
    assert.equal(actionPoints(Array(10).fill("magnet")).points, 0);
  });
});

describe("Қоспаны бөлу: бағалау", () => {
  const perfect: MixtureSubmission = {
    prediction: "dissolve",
    equipment: [...MIXTURE_KEY.equipment],
    experiment: { actions: ["dissolve", "filter", "evaporate", "dry"] },
    observations: { "r0.place": "filter", "r0.soluble": "no", "r1.place": "dish", "r1.soluble": "yes" },
    answers: { fraction: "40", yield: "96,25", whySand: "insoluble" },
    conclusion:
      "Мақсатым құм мен тұзды бөлу болды. Тұз суда ерітілді, құм сүзгіде қалды, ал сүзіндіні буландырғанда тұз кристалданды. Тұздың шығымы 96,25% болды.",
  };

  test("мінсіз жұмыс — 100", () => {
    const { breakdown, reveal } = gradeMixture(perfect);
    assert.deepEqual(breakdown, { procedure: 30, observation: 25, calc: 20, conclusion: 25, total: 100 });
    assert.equal(reveal.predictionCorrect, true);
  });

  test("шығым «≈96%» (±1%) қабылданады, 90% — жоқ", () => {
    assert.equal(gradeMixture({ ...perfect, answers: { ...perfect.answers, yield: "96" } }).breakdown.calc, 20);
    assert.equal(gradeMixture({ ...perfect, answers: { ...perfect.answers, yield: "90" } }).breakdown.calc, 12);
  });

  test("магнит алаңдатқышы: құралда −3, әрекетте −3", () => {
    const { breakdown, feedback } = gradeMixture({
      ...perfect,
      equipment: [...MIXTURE_KEY.equipment, "magnet"],
      experiment: { actions: ["magnet", "dissolve", "filter", "evaporate", "dry"] },
    });
    assert.equal(breakdown.procedure, 7 + 17);
    assert.ok(feedback.some((f) => f.key === "wrongActions" && f.values?.count === 1));
  });

  test("клиент сипаттамасында 5 дұрыс + 2 алаңдатқыш құрал, жауап кілті жоқ", () => {
    assert.equal(MIXTURE_META.equipment.length, 7);
    assert.ok(MIXTURE_KEY.equipment.every((id) => (MIXTURE_META.equipment as readonly string[]).includes(id)));
  });
});

describe("Атом құрылысы: модель (spec 5.2)", () => {
  test("элементтер кестесі: 20 элемент, A = Z + n spec-тегідей", () => {
    assert.equal(ATOM_ELEMENTS.length, 20);
    const expectedA = [1, 4, 7, 9, 11, 12, 14, 16, 19, 20, 23, 24, 27, 28, 31, 32, 35, 40, 39, 40];
    ATOM_ELEMENTS.forEach((el, i) => {
      assert.equal(el.z, i + 1);
      assert.equal(el.z + el.n, expectedA[i], el.symbol);
      assert.equal(getElement(el.symbol)?.number, el.z, `${el.symbol} периодтық кестеде`);
    });
  });

  test("электрон қабаттары: K 2,8,8,1; Ca 2,8,8,2; Mg 2,8,2; H 1; 0 → бос", () => {
    assert.deepEqual(shellsOf(19), [2, 8, 8, 1]);
    assert.deepEqual(shellsOf(20), [2, 8, 8, 2]);
    assert.deepEqual(shellsOf(12), [2, 8, 2]);
    assert.deepEqual(shellsOf(1), [1]);
    assert.deepEqual(shellsOf(0), []);
  });

  test("атом, катион, анион, изотоп", () => {
    const c12 = describeAtom({ p: 6, n: 6, e: 6 });
    assert.deepEqual([c12.element?.symbol, c12.massNumber, c12.charge, c12.kind, c12.stableIsotope], ["C", 12, 0, "atom", true]);
    const na = describeAtom({ p: 11, n: 12, e: 10 });
    assert.deepEqual([na.symbol, na.kind, na.shells], ["Na⁺", "cation", [2, 8]]);
    const cl = describeAtom({ p: 17, n: 18, e: 18 });
    assert.deepEqual([cl.symbol, cl.kind, cl.massNumber, cl.shells], ["Cl⁻", "anion", 35, [2, 8, 8]]);
    assert.equal(describeAtom({ p: 6, n: 8, e: 6 }).stableIsotope, false);
    assert.equal(describeAtom({ p: 0, n: 2, e: 0 }).kind, "none");
    assert.equal(particleSymbol({ p: 8, n: 8, e: 10 }), "O²⁻");
    assert.equal(chargeLabel(-2), "2−");
  });

  test("қабаттарды оқу және заряд нұсқалары", () => {
    assert.deepEqual(parseShells("2, 8, 1"), [2, 8, 1]);
    assert.deepEqual(parseShells("2-8-1"), [2, 8, 1]);
    assert.equal(parseShells("абв"), null);
    assert.equal(chargeFromOption("1+"), 1);
    assert.equal(chargeFromOption("2-"), -2);
    assert.equal(chargeFromOption("0"), 0);
    assert.equal(optionFromCharge(-1), "1-");
    assert.ok(ATOM_META.charges.every((c) => chargeFromOption(c) !== null));
  });
});

describe("Атом құрылысы: бағалау", () => {
  const goals = Object.fromEntries(ATOM_GOALS.map((g) => [g.id, { ...g.target }])) as AtomSubmission["experiment"]["goals"];
  const perfect: AtomSubmission = {
    prediction: "charge",
    equipment: [...ATOM_KEY.equipment],
    experiment: { goals },
    observations: {
      "r0.mass": "12",
      "r0.charge": "0",
      "r0.shells": "2, 4",
      "r1.mass": "23",
      "r1.charge": "1+",
      "r1.shells": "2, 8",
      "r2.mass": "35",
      "r2.charge": "1-",
      "r2.shells": "2, 8, 8",
    },
    answers: { identity: "protons", magnesium: "2,8,2", oxideElectrons: "10" },
    conclusion:
      "Атомның түрін протон саны анықтайды: көміртекте 6 протон бар. Натрий бір электрон берсе, заряды +1 ион болады, ал хлор электрон қосып алса, Cl⁻ ионына айналады.",
  };

  test("мінсіз жұмыс — 100", () => {
    const { breakdown, reveal } = gradeAtom(perfect);
    assert.deepEqual(breakdown, { procedure: 30, observation: 25, calc: 20, conclusion: 25, total: 100 });
    assert.equal(reveal.goalsRight, 3);
  });

  test("бақылау кестесі оқушының өзі құрастырған бөлшек бойынша тексеріледі", () => {
    const wrongGoal = { ...goals, carbon12: { p: 6, n: 7, e: 6 } };
    const rows = atomRows(wrongGoal);
    assert.equal(rows[0].info?.massNumber, 13);
    const { breakdown } = gradeAtom({ ...perfect, experiment: { goals: wrongGoal }, observations: { ...perfect.observations, "r0.mass": "13" } });
    assert.equal(breakdown.procedure, 10 + 13); // 2/3 мақсат
    assert.equal(breakdown.observation, 25);
  });

  test("сақталмаған мақсат пен қате жауаптар", () => {
    const { breakdown, feedback } = gradeAtom({
      ...perfect,
      experiment: { goals: { ...goals, chlorideIon: null } },
      answers: { identity: "mass", magnesium: "2,10", oxideElectrons: "8" },
    });
    assert.equal(breakdown.calc, 0);
    assert.ok(feedback.some((f) => f.key === "goalWrong.chlorideIon"));
    assert.equal(breakdown.observation, Math.round((25 * 6) / 9));
  });
});
