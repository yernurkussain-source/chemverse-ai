import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { addLiquid, addPiece, newVessel, step } from "@/features/chem-engine";
import { mediumOf, SOLUTIONS } from "@/features/virtual-lab/experiments/indicator-lab/model";
import { RATE, volumeAt, type Run } from "@/features/virtual-lab/experiments/reaction-rate/model";
import { titrationPH } from "@/lib/chemistry/titration";

// ChemLab (2D) пен 3D зертхана бір химия қозғалтқышын қолданады (docs/game/GAME_SPEC.md 5-бөлім, 7-критерий)

const close = (actual: number, expected: number, eps: number, msg: string) =>
  assert.ok(Math.abs(actual - expected) <= eps, `${msg}: ${actual} ≈ ${expected} (±${eps})`);

describe("ChemLab ↔ ортақ қозғалтқыш", () => {
  test("Реакция жылдамдығы: 3D қозғалтқыштың симуляциясы ChemLab формуласымен бірдей", () => {
    // Колба термостатта (T тұрақты), HCl 1 л — қышқыл артық; 0,05 г Mg таспасы (қозғалтқыштағы)
    const simulate = ({ T, c }: Run, seconds: number) => {
      const flask = newVessel("flask", 2000, "beaker");
      addLiquid(flask, { H: c, Cl: c }, 1000);
      addPiece(flask, "Mg");
      const dt = 0.01;
      for (let t = 0; t < seconds - 1e-9; t += dt) {
        flask.T = T;
        step(flask, dt, false);
      }
      return (flask.gasOut?.H2 ?? 0) * RATE.molarVolume * 1000;
    };
    for (const run of [
      { T: 20, c: 1 },
      { T: 40, c: 0.5 },
      { T: 10, c: 2 },
    ]) {
      for (const t of [30, 120]) {
        const model = volumeAt(run, t);
        close(simulate(run, t), model, model * 0.015, `V(${t} с) при ${run.T} °C, ${run.c} М`);
      }
    }
  });

  test("Титрлеу: қозғалтқыштың pH-ы аналитикалық формуламен бірдей", () => {
    // Электрбейтараптық: [H⁺] − Kw/[H⁺] = d (күшті қышқыл + күшті негіз)
    const KW = 1e-14;
    const exact = (v: number, c: number) => {
      const d = ((c * 25) / 1000 - (0.1 * v) / 1000) / ((25 + v) / 1000);
      const root = Math.sqrt(d * d + 4 * KW);
      return -Math.log10(d >= 0 ? (d + root) / 2 : (2 * KW) / (root - d));
    };
    for (const c of [0.08, 0.1, 0.12]) {
      for (let v = 0; v <= 50; v += 0.5) close(titrationPH(v, c), exact(v, c), 1e-6, `c=${c}, v=${v}`);
    }
  });

  test("Индикатор зертханасы: ерітінділердің pH-ы қозғалтқыштан, ортасы pH-қа сай", () => {
    const ph = Object.fromEntries(SOLUTIONS.map((s) => [s.id, s.pH]));
    assert.deepEqual(ph, { hcl: 2, lemon: 2.4, water: 7, nacl: 7, soda: 8.34, naoh: 12 });
    for (const s of SOLUTIONS) assert.equal(s.medium, mediumOf(s.pH), s.id);
  });
});
