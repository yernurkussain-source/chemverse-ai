import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { ENGINE_EVENT_KEYS, LIQUIDS, REAG } from "@/features/chem-engine";
import { chooseFlame } from "@/features/virtual-lab-3d/game/flame-rules";
import { makeFmt, observationKey, plainNumber, TRANSLATED_EQUATIONS } from "@/features/virtual-lab-3d/game/i18n";
import { sanitizeProgress } from "@/features/virtual-lab-3d/game/progress";
import { LEVEL_COUNT, QUESTS } from "@/features/virtual-lab-3d/game/quests";

type Tree = { [key: string]: string | Tree };
const LOCALES = ["kk", "ru", "en"] as const;
const lab = Object.fromEntries(
  LOCALES.map((l) => [l, (JSON.parse(readFileSync(`messages/${l}.json`, "utf8")) as Tree).VirtualLab3D as Tree]),
);
const get = (tree: Tree, path: string) => path.split(".").reduce<string | Tree | undefined>((t, k) => (t && typeof t === "object" ? t[k] : undefined), tree);

describe("3D зертхана: мәтіндер", () => {
  test("қозғалтқыштың әр оқиғасының бақылау мәтіні үш тілде бар", () => {
    for (const l of LOCALES) {
      for (const key of ENGINE_EVENT_KEYS) {
        assert.equal(typeof get(lab[l], `rx.${observationKey(key)}`), "string", `${l}: rx.${observationKey(key)} (${key})`);
      }
      assert.equal(typeof get(lab[l], "rx.dryNone"), "string", `${l}: rx.dryNone`);
      for (const key of TRANSLATED_EQUATIONS) assert.equal(typeof get(lab[l], `rxEq.${key}`), "string", `${l}: rxEq.${key}`);
    }
  });

  test("әр реактивтің аты бар; қауіптілерінде — ескерту, индикаторларда — қысқа белгі", () => {
    for (const l of LOCALES) {
      for (const r of REAG) {
        assert.equal(typeof get(lab[l], `reagents.${r.id}.name`), "string", `${l}: ${r.id}.name`);
        if (r.kind === "ind") assert.equal(typeof get(lab[l], `reagents.${r.id}.short`), "string", `${l}: ${r.id}.short`);
        if (r.kind === "liq" && LIQUIDS[r.id].haz) assert.equal(typeof get(lab[l], `reagents.${r.id}.note`), "string", `${l}: ${r.id}.note`);
      }
    }
  });
});

describe("3D зертхана: тапсырмалар", () => {
  test("22 тапсырма, id-лері қайталанбайды, әрқайсысының үш тілде аты мен сипаттамасы бар", () => {
    assert.equal(QUESTS.length, 22);
    assert.equal(new Set(QUESTS.map((q) => q.id)).size, 22);
    for (const l of LOCALES) {
      for (const q of QUESTS) {
        assert.equal(typeof get(lab[l], `quests.${q.id}.t`), "string", `${l}: quests.${q.id}.t`);
        assert.equal(typeof get(lab[l], `quests.${q.id}.d`), "string", `${l}: quests.${q.id}.d`);
      }
      for (let i = 0; i < LEVEL_COUNT; i++) assert.equal(typeof get(lab[l], `levels.${i}`), "string", `${l}: levels.${i}`);
    }
  });
});

describe("3D зертхана: сақталған прогресс", () => {
  test("белгісіз тапсырмалар мен қайталанулар алынып тасталады, XP = 100 × тапсырма саны", () => {
    const p = sanitizeProgress({ xp: 99999, safety: 70, done: ["pop", "hack", "pop", "ppe"] });
    assert.deepEqual(p, { xp: 200, safety: 70, done: ["ppe", "pop"] });
  });

  test("Supabase жолы (quests_done) да оқылады; қауіпсіздік 0–100 аралығында", () => {
    assert.deepEqual(sanitizeProgress({ safety: 250, quests_done: ["flame"] }), { xp: 100, safety: 100, done: ["flame"] });
    assert.equal(sanitizeProgress({ safety: -5, done: [] })?.safety, 0);
  });

  test("бүлінген дерек — прогресс жоқ", () => {
    assert.equal(sanitizeProgress(null), null);
    assert.equal(sanitizeProgress("x"), null);
    assert.deepEqual(sanitizeProgress({ done: "pop" }), { xp: 0, safety: 100, done: [] });
  });
});

describe("3D зертхана: жалын сынағы", () => {
  test("Na⁺ басқа түстерді жасырады", () => {
    assert.equal(chooseFlame(["K", "Na"], false).main, "Na");
    assert.equal(chooseFlame(["Cu"], true).main, "Na", "сымда алдыңғы Na⁺ қалса");
  });

  test("Na⁺ жоқ кезде реті: Cu > Ba > Ca > K", () => {
    assert.equal(chooseFlame(["K", "Ca", "Ba", "Cu"], false).main, "Cu");
    assert.equal(chooseFlame(["K", "Ca", "Ba"], false).main, "Ba");
    assert.equal(chooseFlame(["K", "Ca"], false).main, "Ca");
    assert.equal(chooseFlame(["K"], false).main, "K");
  });

  test("түс бермейтін иондарда жалын өзгермейді", () => {
    const r = chooseFlame(["Zn", "Fe3", "Ag"], false);
    assert.equal(r.main, null);
    assert.deepEqual(r.colored, []);
  });
});

describe("3D зертхана: сандар", () => {
  test("қазақша мен орысша — үтір, ағылшынша — нүкте", () => {
    assert.equal(makeFmt("kk")(26.62), "26,6");
    assert.equal(makeFmt("ru")(0.5, 2), "0,50");
    assert.equal(makeFmt("en")(0.5, 2), "0.50");
    assert.equal(plainNumber(0.02, "kk"), "0,02");
    assert.equal(plainNumber(0.02, "en"), "0.02");
  });

  test("бірнеше металға ортақ бақылау мәтіндері", () => {
    assert.equal(observationKey("cu_Fe"), "cu");
    assert.equal(observationKey("ag_Cu"), "agCu");
    assert.equal(observationKey("ag_Zn"), "ag");
    assert.equal(observationKey("pAgCl"), "pAgCl");
  });
});
