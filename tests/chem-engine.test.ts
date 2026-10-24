import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  absorbCO2,
  addLiquid,
  addPiece,
  ENGINE_EVENT_KEYS,
  engineStats,
  indColor,
  INDICATOR_RANGES,
  INSTANT,
  LIQUIDS,
  newVessel,
  pH,
  resetEngineStats,
  setEngineEmitter,
  step,
  transfer,
  vantHoff,
  type EngineEvent,
  type LiquidId,
  type PptMap,
  type Vessel,
} from "@/features/chem-engine";

// Сандар docs/game/prototype/engine.test.js-пен бірдей — қозғалтқыштың мінез-құлқы өзгермегенін көрсетеді
const near = (a: number, b: number, tol: number, msg: string) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} ≠ ${b} ± ${tol}`);
const sol = (id: LiquidId, mL: number, cap = 100) => {
  const v = newVessel("x", cap, "beaker");
  addLiquid(v, LIQUIDS[id].ions, mL);
  return v;
};
const ph = (v: Vessel) => {
  const p = pH(v);
  assert.ok(p !== null, "ыдыс бос емес болуы керек");
  return p;
};
const R = LIQUIDS;

describe("Химия қозғалтқышы", () => {
  test("Күшті қышқыл мен негіздің pH-ы", () => {
    near(ph(sol("HCl", 20)), 0, 0.01, "HCl 1 М");
    near(ph(sol("NaOH", 20)), 14, 0.01, "NaOH 1 М");
    near(ph(sol("CaOH2", 20)), 12.6, 0.02, "әк суы");
  });

  test("Тұздар гидролизі", () => {
    near(ph(sol("Na2CO3", 20)), 12.01, 0.02, "Na2CO3");
    near(ph(sol("CuSO4", 20)), 3.65, 0.02, "CuSO4");
    near(ph(sol("FeCl3", 20)), 1.25, 0.02, "FeCl3");
    near(ph(sol("NaCl", 20)), 7, 0.01, "NaCl");
  });

  test("Бейтараптану: pH 7 және жылу", () => {
    const v = sol("HCl", 10);
    addLiquid(v, R.NaOH.ions, 10);
    near(ph(v), 7, 0.01, "pH");
    near(v.T, 26.62, 0.05, "T (57,1 кДж/моль, шыны 40 Дж/К)");
  });

  test("Карбонатты сатылап титрлеу (HCO₃⁻)", () => {
    const v = sol("Na2CO3", 10);
    addLiquid(v, R.HCl.ions, 2.5);
    near(ph(v), 10.33, 0.01, "буфер");
    addLiquid(v, R.HCl.ions, 2.5);
    near(ph(v), 8.34, 0.01, "HCO3-");
    assert.deepEqual(v.ppt, {}, "тұнба түзілмейді");
  });

  test("AgCl тұнбасы", () => {
    const v = sol("NaCl", 5, 20);
    addLiquid(v, R.AgNO3.ions, 5);
    near(v.ppt.AgCl ?? 0, 0.0005, 1e-9, "AgCl моль");
  });

  test("Cu(OH)₂ қышқылда ериді", () => {
    const v = sol("CuSO4", 10);
    addLiquid(v, R.NaOH.ions, 10);
    near(v.ppt.CuOH2 ?? 0, 0.005, 1e-9, "тұнба");
    addLiquid(v, R.HCl.ions, 15);
    assert.ok(!v.ppt.CuOH2, "ерімеді");
  });

  test("Zn(OH)₂ амфотерлі", () => {
    const v = sol("HCl", 10);
    addPiece(v, "Zn");
    for (let i = 0; i < 3000; i++) step(v, 0.5, false);
    addLiquid(v, R.NaOH.ions, 12);
    assert.ok((v.ppt.ZnOH2 ?? 0) > 0);
    addLiquid(v, R.NaOH.ions, 20);
    assert.ok(!v.ppt.ZnOH2 && (v.ions.ZnOH4 ?? 0) > 0);
  });

  test("Mg + HCl: жылдамдық пен жылу", () => {
    const v = sol("HCl", 20);
    addPiece(v, "Mg");
    let s = 0;
    while (v.pieces[0].n > v.pieces[0].n0 / 2) {
      step(v, 0.1, false);
      s += 0.1;
    }
    // Прототипте k = 0,03 еді (t½ ≈ 18,5 с). ChemLab-пен ортақ болу үшін k = 0,02 (CHEMLAB_SPEC 5.4) — t½ ≈ 27,7 с
    near(s, 27.7, 0.6, "t½");
  });

  test("Fe + CuSO₄ → мыс қабаты", () => {
    const v = sol("CuSO4", 20);
    addPiece(v, "Fe");
    for (let i = 0; i < 300; i++) step(v, 0.1, false);
    assert.ok(v.pieces[0].coatCu > 4e-4);
  });

  test("Буландыру: NaCl кристалы", () => {
    const v = sol("NaCl", 10);
    v.onHeater = true;
    let s = 0;
    while (v.V > 0 && s < 2000) {
      step(v, 0.5, true);
      s += 0.5;
    }
    assert.ok(v.residue, "қалдық жоқ");
    near(v.residue.salts[0].g, 0.5844, 0.001, "NaCl г");
    assert.equal(v.residue.salts[0].f, "NaCl");
  });

  test("H₂O₂ + MnO₂ → O₂ (катализатор жұмсалмайды)", () => {
    const v = newVessel("t", 20, "tube");
    addLiquid(v, R.H2O2.ions, 10);
    addPiece(v, "MnO2");
    for (let i = 0; i < 200; i++) step(v, 0.1, false);
    assert.ok((v.gasOut?.O2 ?? 0) > 2.5e-3);
    near(v.pieces[0].n, v.pieces[0].n0, 1e-12, "MnO2");
  });

  test("Әк суы: лайлану, артық CO₂-де мөлдірлену", () => {
    const v = newVessel("t", 20, "tube");
    addLiquid(v, R.CaOH2.ions, 10);
    for (let i = 0; i < 10; i++) absorbCO2(v, 4e-5);
    assert.ok((v.ppt.CaCO3 ?? 0) > 1.5e-4, "лайланбады");
    for (let i = 0; i < 200; i++) absorbCO2(v, 4e-5);
    assert.ok(!((v.ppt.CaCO3 ?? 0) > 1e-5), "мөлдірленбеді");
  });

  test("Сүзу: тұнба қағазда қалады", () => {
    const a = sol("CuSO4", 10);
    addLiquid(a, R.NaOH.ions, 10);
    for (let i = 0; i < 300; i++) step(a, 0.1, false);
    const b = newVessel("d", 100, "beaker");
    const paper: PptMap = {};
    while (a.V > 0) transfer(a, b, 1, paper);
    near(paper.CuOH2 ?? 0, 0.005, 1e-9, "қағазда");
    assert.ok(!Object.keys(b.ppt).length);
    near(b.V, 20, 1e-9, "сүзінді");
  });
});

describe("Қозғалтқыштың ортақ ережелері (ChemLab да қолданады)", () => {
  test("Вант-Гофф ережесі: γ^((T − 20)/10)", () => {
    near(vantHoff(20), 1, 1e-12, "20 °C");
    near(vantHoff(30), 2, 1e-12, "30 °C, γ = 2");
    near(vantHoff(10), 0.5, 1e-12, "10 °C");
    near(vantHoff(40, 3), 9, 1e-9, "40 °C, γ = 3");
  });

  test("индикатор түсі аралықтың шетінде ауысады", () => {
    const [phLo, phHi] = INDICATOR_RANGES.php;
    assert.equal(indColor("php", phLo - 0.01), null, "фенолфталеин 8,2-ден төмен түссіз");
    near(indColor("php", phHi)!.a, 0.88, 1e-9, "фенолфталеин 10-да толық боялады");
    const [moLo, moHi] = INDICATOR_RANGES.mo;
    assert.deepEqual(indColor("mo", moLo)!.c, [214, 42, 46], "метилоранж қызыл");
    assert.deepEqual(indColor("mo", moHi)!.c, [240, 196, 40], "метилоранж сары");
    const [litLo, litHi] = INDICATOR_RANGES.lit;
    assert.deepEqual(indColor("lit", litLo)!.c, [200, 32, 44], "лакмус қызыл");
    assert.deepEqual(indColor("lit", litHi)!.c, [38, 62, 190], "лакмус көк");
    assert.deepEqual(indColor("lit", (litLo + litHi) / 2)!.c, [124, 52, 142], "лакмус ортасында күлгін");
  });
});

describe("Қозғалтқыш оқиғалары мен статистикасы", () => {
  test("әр оқиғаның кілті тізімде бар (аудармалар осы тізім бойынша тексеріледі)", () => {
    const KEYS = new Set<string>(ENGINE_EVENT_KEYS);
    for (const r of INSTANT) assert.ok(KEYS.has(r.key), `INSTANT: ${r.key}`);

    const seen = new Map<string, EngineEvent>();
    setEngineEmitter((_v, key, event) => seen.set(key, event));
    try {
      const run = (v: Vessel, seconds: number, heater = false) => {
        for (let t = 0; t < seconds; t += 0.5) step(v, 0.5, heater);
      };
      addLiquid(sol("NaCl", 5), R.AgNO3.ions, 5);
      addLiquid(sol("HCl", 10), R.NaOH.ions, 10);
      const mg = sol("HCl", 20);
      addPiece(mg, "Mg");
      run(mg, 60);
      const fe = sol("CuSO4", 20);
      addPiece(fe, "Fe");
      run(fe, 30);
      const cu = sol("AgNO3", 20);
      addPiece(cu, "Cu");
      run(cu, 30);
      const cuAcid = sol("HCl", 10);
      addPiece(cuAcid, "Cu");
      run(cuAcid, 1);
      const h2o2 = newVessel("t", 20, "tube");
      addLiquid(h2o2, R.H2O2.ions, 10);
      addPiece(h2o2, "MnO2");
      run(h2o2, 5);
      const lime = newVessel("t", 20, "tube");
      addLiquid(lime, R.CaOH2.ions, 10);
      for (let i = 0; i < 210; i++) absorbCO2(lime, 4e-5);
      const salt = sol("NaCl", 10);
      salt.onHeater = true;
      run(salt, 2000, true);
    } finally {
      setEngineEmitter(null);
    }

    for (const key of seen.keys()) assert.ok(KEYS.has(key), `тізімде жоқ кілт: ${key}`);
    for (const key of ["pAgCl", "neut", "acid_Mg", "cu_Fe", "ag_Cu", "noCu", "cat", "lime", "clear", "boil", "dry"]) {
      assert.ok(seen.has(key), `оқиға шықпады: ${key}`);
    }
    assert.equal(seen.get("dry")?.salts?.[0]?.f, "NaCl", "'dry' оқиғасы қалдықты береді");
    assert.ok((seen.get("neut")?.dT ?? 0) > 0, "бейтараптану жылу бөледі");
  });

  test("статистика жиналады және resetEngineStats() тазалайды", () => {
    resetEngineStats();
    addLiquid(sol("NaCl", 5), R.AgNO3.ions, 5);
    assert.ok(engineStats.ppt.has("AgCl"));
    resetEngineStats();
    assert.equal(engineStats.ppt.size, 0);
    assert.deepEqual(engineStats.gas, { H2: 0, CO2: 0, O2: 0 });
  });
});
