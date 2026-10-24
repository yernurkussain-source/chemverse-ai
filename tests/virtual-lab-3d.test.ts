import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { ENGINE_EVENT_KEYS, LIQUIDS, REAG } from "@/features/chem-engine";
import { makeFmt, observationKey, plainNumber, TRANSLATED_EQUATIONS } from "@/features/virtual-lab-3d/game/i18n";

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
