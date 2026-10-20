import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getLab, LAB_CATALOG, LAB_GRADES, labHref, labsForGrade, SHELL_LABS } from "@/features/virtual-lab/catalog";
import { countSentences, scoreConclusion } from "@/features/virtual-lab/conclusion";
import { endpointPoints, gradeTitration, type TitrationSubmission } from "@/features/virtual-lab/experiments/titration/grade";
import { TITRATION_META } from "@/features/virtual-lab/experiments/titration/meta";
import { concentrationFromEndpoint, mediumOf, observationRows, observationVolumes } from "@/features/virtual-lab/experiments/titration/model";
import { signParams, TOKEN_TTL_MS, verifyParams } from "@/features/virtual-lab/params-token";
import { equipmentScore, parseNumber, RUBRIC, totalScore, withinPercent } from "@/features/virtual-lab/scoring";

describe("ChemLab каталогы", () => {
  test("slug бірегей, сынып 7–10, әр сыныпта кемінде 6 тәжірибе", () => {
    assert.equal(new Set(LAB_CATALOG.map((l) => l.slug)).size, LAB_CATALOG.length);
    for (const lab of LAB_CATALOG) assert.ok(lab.grades.every((g) => (LAB_GRADES as readonly number[]).includes(g)), lab.slug);
    for (const grade of LAB_GRADES) assert.ok(labsForGrade(grade).length >= 6, `${grade}-сынып`);
  });

  test("ортақ тәжірибелер екі сыныпта көрінеді", () => {
    assert.deepEqual(getLab("reaction-rate")?.grades, [9, 10]);
    assert.ok(labsForGrade(10).some((l) => l.slug === "reaction-rate"));
  });

  test("LabShell тәжірибелері — «ready», сілтеме түрі өз бетіне апарады", () => {
    for (const slug of SHELL_LABS) assert.equal(getLab(slug)?.status, "ready", slug);
    assert.equal(labHref(getLab("periodic-explorer")!), "/periodic-table");
    assert.equal(labHref(getLab("titration")!), "/virtual-lab/titration");
  });

  test("рубрика 100 ұпай", () => {
    assert.equal(Object.values(RUBRIC).reduce((a, b) => a + b, 0), 100);
  });
});

describe("Бағалаудың ортақ ережелері", () => {
  test("құралдар: дұрысы 10, әр артық құрал −3, теріс болмайды", () => {
    const correct = ["a", "b", "c", "d"];
    assert.equal(equipmentScore(["a", "b", "c", "d"], correct).score, 10);
    assert.equal(equipmentScore(["a", "b"], correct).score, 5);
    assert.equal(equipmentScore(["a", "b", "c", "d", "x"], correct).score, 7);
    assert.equal(equipmentScore(["x", "y", "z"], correct).score, 0);
    assert.deepEqual(equipmentScore(["a", "x"], correct).missing, ["b", "c", "d"]);
  });

  test("сандарды оқу және ±% тексеру", () => {
    assert.equal(parseNumber("0,095"), 0.095);
    assert.equal(parseNumber(" 25 "), 25);
    assert.equal(parseNumber("abc"), null);
    assert.equal(parseNumber(""), null);
    assert.ok(withinPercent(0.102, 0.1, 2));
    assert.ok(!withinPercent(0.1021, 0.1, 2));
    assert.ok(!withinPercent(null, 0.1, 2));
  });

  test("жалпы ұпай шектеледі және бүтін санға келтіріледі", () => {
    assert.deepEqual(totalScore({ procedure: 40, observation: -5, calc: 19.6, conclusion: 12.4 }), {
      procedure: 30,
      observation: 0,
      calc: 20,
      conclusion: 12,
      total: 62,
    });
  });
});

describe("Қорытындыны алдын ала бағалау", () => {
  const rule = { terms: [["эквивалент"], ["индикатор", "фенолфталеин"]], expectedNumbers: [0.1] };

  test("толық қорытынды — 25", () => {
    const text = "Фенолфталеин индикаторы эквивалент нүктесін көрсетті. Есептеу бойынша c(HCl) = 0,1 моль/л болды.";
    assert.equal(countSentences(text), 2);
    assert.equal(scoreConclusion(text, rule).score, 25);
  });

  test("бос, қысқа, сансыз қорытынды", () => {
    assert.equal(scoreConclusion("", rule).score, 0);
    const short = scoreConclusion("Эквивалент нүктесін таптым.", rule);
    assert.equal(short.sentences, 1);
    assert.equal(short.numberFound, false);
    assert.equal(short.score, 2 + 5);
  });

  test("сан ±5% ішінде болса есептеледі", () => {
    assert.ok(scoreConclusion("Нәтиже 0.104 М шықты, бұл күткенге жақын.", rule).numberFound);
    assert.ok(!scoreConclusion("Нәтиже 0,2 М шықты, бұл күткеннен көп.", rule).numberFound);
  });
});

describe("Параметр токені", () => {
  const secret = "test-secret";

  test("дұрыс токен тексеріледі", () => {
    const token = signParams("titration", { c: 0.095 }, secret, 1_000);
    assert.deepEqual(verifyParams(token, "titration", secret, 2_000), { params: { c: 0.095 }, startedAt: 1_000 });
  });

  test("өзгертілген, басқа тәжірибенің, ескі не басқа кілтті токен қабылданбайды", () => {
    const token = signParams("titration", { c: 0.095 }, secret, 1_000);
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ s: "titration", p: { c: 0.1 }, t: 1_000 })).toString("base64url");
    assert.equal(verifyParams(`${forged}.${sig}`, "titration", secret, 2_000), null);
    assert.equal(verifyParams(`${body}.${sig}x`, "titration", secret, 2_000), null);
    assert.equal(verifyParams(token, "indicator-lab", secret, 2_000), null);
    assert.equal(verifyParams(token, "titration", secret, 1_000 + TOKEN_TTL_MS + 1), null);
    assert.equal(verifyParams(token, "titration", "other-secret", 2_000), null);
    assert.equal(verifyParams("garbage", "titration", secret), null);
  });
});

describe("Титрлеу моделі (c = 0,1 М)", () => {
  test("бақылау көлемдері мен орта", () => {
    assert.deepEqual(observationVolumes(25), [0, 6.25, 12.5, 18.75, 25]);
    assert.deepEqual(observationVolumes(0), [0]);
    assert.deepEqual(
      observationRows(0.1, 25).map((r) => [r.medium, r.color]),
      [["acid", "colorless"], ["acid", "colorless"], ["acid", "colorless"], ["acid", "colorless"], ["neutral", "colorless"]],
    );
    assert.equal(mediumOf(12), "base");
    assert.equal(observationRows(0.1, 26).at(-1)?.color, "crimson");
    assert.equal(concentrationFromEndpoint(25), 0.1);
  });

  test("эквивалент нүктесінде тоқтау ұпайы: 20 / 14 / 8 / 3 / 0", () => {
    assert.equal(endpointPoints(25.05, 25), 20);
    assert.equal(endpointPoints(25.5, 25), 14);
    assert.equal(endpointPoints(24, 25), 8);
    assert.equal(endpointPoints(27, 25), 3);
    assert.equal(endpointPoints(0, 25), 0);
  });

  test("клиенттің сипаттамасында жауап кілті жоқ", () => {
    assert.ok(!("correct" in TITRATION_META));
    assert.equal(TITRATION_META.equipment.length, 7);
  });
});

describe("Титрлеуді бағалау", () => {
  const perfect: TitrationSubmission = {
    prediction: "eq7",
    equipment: ["burette", "conical-flask", "pipette", "phenolphthalein"],
    experiment: { endpointMl: 25, additions: 40 },
    observations: Object.fromEntries(
      observationRows(0.1, 25).flatMap((row, i) => [
        [`r${i}.color`, row.color],
        [`r${i}.medium`, row.medium],
      ]),
    ),
    answers: { concentration: "0,1", equivalence: "25", eqMedium: "neutral" },
    conclusion:
      "Мақсатым HCl концентрациясын табу болды. Фенолфталеин индикаторы эквивалент нүктесін 25 мл-де көрсетті, онда орта бейтарап. Есептеу бойынша c(HCl) = 0,1 моль/л.",
  };

  test("мінсіз жұмыс — 100 ұпай", () => {
    const { breakdown, reveal } = gradeTitration(0.1, perfect);
    assert.deepEqual(breakdown, { procedure: 30, observation: 25, calc: 20, conclusion: 25, total: 100 });
    assert.equal(reveal.equivalenceMl, 25);
    assert.equal(reveal.predictionCorrect, true);
    assert.equal(reveal.answerErrorPct, 0);
  });

  test("артық құрал, асып кету, қате орта, қате есеп", () => {
    const { breakdown, feedback, reveal } = gradeTitration(0.1, {
      ...perfect,
      prediction: "gt7",
      equipment: [...perfect.equipment, "magnet"],
      experiment: { endpointMl: 25.6, additions: 30 },
      observations: {},
      answers: { concentration: "0,5", equivalence: "30", eqMedium: "base" },
    });
    assert.equal(breakdown.procedure, 7 + 8);
    assert.equal(breakdown.observation, 0);
    assert.equal(breakdown.calc, 0);
    assert.equal(reveal.overshootMl, 0.6);
    assert.equal(reveal.predictionCorrect, false);
    assert.ok(feedback.some((f) => f.key === "equipmentExtra" && f.equipment?.includes("magnet")));
    assert.ok(feedback.some((f) => f.key === "endpointOver"));
  });

  test("c(HCl) оқушының өз көлемі бойынша дұрыс есептелсе — есептеу ұпайы беріледі", () => {
    const { breakdown } = gradeTitration(0.1, {
      ...perfect,
      experiment: { endpointMl: 26, additions: 30 },
      answers: { concentration: "0,104", equivalence: "26", eqMedium: "neutral" },
    });
    // c дұрыс есептелді (12), бірақ эквивалент көлемі 25 мл-ден 4% ауытқыды (0)
    assert.equal(breakdown.calc, 12 + 3);
  });

  test("белгісіз концентрацияда (0,12 М) эквивалент 30 мл", () => {
    const { reveal } = gradeTitration(0.12, { ...perfect, experiment: { endpointMl: 30, additions: 10 } });
    assert.equal(reveal.equivalenceMl, 30);
    assert.equal(reveal.overshootMl, 0);
  });
});
