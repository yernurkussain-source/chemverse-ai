import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ELEMENTS, getElement, tablePosition } from "@/lib/chemistry/elements";
import { electronConfiguration, electronShells } from "@/lib/chemistry/electron-config";
import { molarMassOf, parseFormula } from "@/lib/chemistry/formula";
import { MOLECULES, molarMass } from "@/lib/chemistry/molecules";
import { equivalenceVolume, mediumState, phenolphthaleinColor, titrationPH, TITRATION } from "@/lib/chemistry/titration";

const close = (actual: number, expected: number, eps = 0.01) =>
  assert.ok(Math.abs(actual - expected) <= eps, `${actual} ≈ ${expected} (±${eps}) болуы керек`);

describe("Периодтық кесте", () => {
  test("118 элемент, реттік нөмірлері 1..118, белгілері қайталанбайды", () => {
    assert.equal(ELEMENTS.length, 118);
    ELEMENTS.forEach((e, i) => assert.equal(e.number, i + 1));
    assert.equal(new Set(ELEMENTS.map((e) => e.symbol)).size, 118);
  });

  test("период пен топ дұрыс есептеледі", () => {
    const check = (symbol: string, period: number, group: number | null) => {
      const e = getElement(symbol)!;
      assert.deepEqual([e.period, e.group], [period, group], symbol);
    };
    check("H", 1, 1);
    check("He", 1, 18);
    check("Na", 3, 1);
    check("Al", 3, 13);
    check("Fe", 4, 8);
    check("Br", 4, 17);
    check("La", 6, null);
    check("Hf", 6, 4);
    check("Rn", 6, 18);
    check("U", 7, null);
    check("Og", 7, 18);
  });

  test("кестедегі орындар қабаттаспайды", () => {
    const cells = ELEMENTS.map((e) => {
      const { row, column } = tablePosition(e);
      return `${row}:${column}`;
    });
    assert.equal(new Set(cells).size, 118);
  });

  test("getElement үлкен-кіші әріпке қарамайды, жоқ белгіге undefined", () => {
    assert.equal(getElement("na")?.number, 11);
    assert.equal(getElement("Xx"), undefined);
  });
});

describe("parseFormula", () => {
  test("қарапайым және жақшалы формулалар", () => {
    assert.deepEqual(parseFormula("H2O"), { H: 2, O: 1 });
    assert.deepEqual(parseFormula("H2SO4"), { H: 2, S: 1, O: 4 });
    assert.deepEqual(parseFormula("Ca(OH)2"), { Ca: 1, O: 2, H: 2 });
    assert.deepEqual(parseFormula("Al2(SO4)3"), { Al: 2, S: 3, O: 12 });
    assert.deepEqual(parseFormula("K4[Fe(CN)6]"), { K: 4, Fe: 1, C: 6, N: 6 });
  });

  test("Unicode индекстер, гидраттар, бос орындар", () => {
    assert.deepEqual(parseFormula("H₂SO₄"), { H: 2, S: 1, O: 4 });
    assert.deepEqual(parseFormula("CuSO4·5H2O"), { Cu: 1, S: 1, O: 9, H: 10 });
    assert.deepEqual(parseFormula("CuSO4*5H2O"), parseFormula("CuSO4·5H2O"));
    assert.deepEqual(parseFormula("  Na Cl "), { Na: 1, Cl: 1 });
  });

  test("қате формулаға null", () => {
    for (const bad of ["", "h2o", "Xy2", "Ca(OH", "CaOH)2", "H2O·", "123", "H2O+", "(", "a".repeat(61)]) {
      assert.equal(parseFormula(bad), null, JSON.stringify(bad));
    }
  });

  test("нөлдік индекс қабылданбайды", () => {
    assert.equal(parseFormula("H0"), null);
    assert.equal(parseFormula("(OH)0"), null);
    assert.equal(parseFormula("0H2O"), null);
  });

  test("молярлық масса (г/моль)", () => {
    close(molarMassOf(parseFormula("H2O")!), 18.015);
    close(molarMassOf(parseFormula("H2SO4")!), 98.07);
    close(molarMassOf(parseFormula("CuSO4·5H2O")!), 249.68);
    close(molarMassOf(parseFormula("C6H12O6")!), 180.16);
  });
});

describe("Молекулалар", () => {
  test("id-лер бірегей, формула құрамымен сәйкес", () => {
    assert.equal(new Set(MOLECULES.map((m) => m.id)).size, MOLECULES.length);
    for (const m of MOLECULES) {
      assert.deepEqual(parseFormula(m.formula), m.atoms, m.id);
      close(molarMass(m.atoms), molarMassOf(m.atoms), 1e-9);
    }
  });
});

describe("Титрлеу", () => {
  test("бастапқы pH = 1 (0,1 М HCl), эквивалент нүктесінде pH = 7", () => {
    close(titrationPH(0), 1);
    close(titrationPH(TITRATION.equivalenceMl), 7, 1e-6);
  });

  test("pH көлем артқанда өседі және артық сілтіде ≈ 12,5", () => {
    let previous = -Infinity;
    for (let v = 0; v <= TITRATION.maxVolumeMl; v += 0.5) {
      const pH = titrationPH(v);
      assert.ok(Number.isFinite(pH) && pH > previous, `v=${v}`);
      previous = pH;
    }
    close(titrationPH(50), 12.52, 0.01);
  });

  test("белгісіз концентрацияда эквивалент нүктесі ығысады", () => {
    close(equivalenceVolume(0.12), 30, 1e-9);
    close(titrationPH(30, 0.12), 7, 1e-6);
  });

  test("орта күйі мен индикатор түсі", () => {
    assert.equal(mediumState(10, titrationPH(10)), "acid");
    assert.equal(mediumState(25, 7), "equivalence");
    assert.equal(mediumState(26, titrationPH(26)), "base");
    assert.equal(phenolphthaleinColor(3).opacity, 0.35);
    assert.equal(phenolphthaleinColor(12).rgb, "rgb(255,40,140)");
  });
});

describe("Электрондық конфигурация", () => {
  test("қысқа жазу, ерекшеліктерімен", () => {
    const text = (z: number) => {
      const { core, parts } = electronConfiguration(z);
      return [core && `[${core}]`, ...parts.map(([name, count]) => name + count)].filter(Boolean).join(" ");
    };
    assert.equal(text(1), "1s1");
    assert.equal(text(11), "[Ne] 3s1");
    assert.equal(text(26), "[Ar] 4s2 3d6");
    assert.equal(text(24), "[Ar] 4s1 3d5");
    assert.equal(text(46), "[Kr] 4d10");
    assert.equal(text(79), "[Xe] 6s1 4f14 5d10");
    assert.equal(text(103), "[Rn] 7s2 5f14 7p1");
  });

  test("қабаттар: қосындысы Z-ке тең", () => {
    assert.deepEqual(electronShells(11), [2, 8, 1]);
    assert.deepEqual(electronShells(26), [2, 8, 14, 2]);
    assert.deepEqual(electronShells(29), [2, 8, 18, 1]);
    assert.deepEqual(electronShells(118), [2, 8, 18, 32, 32, 18, 8]);
    for (const e of ELEMENTS) assert.equal(electronShells(e.number).reduce((a, b) => a + b, 0), e.number, e.symbol);
  });
});
