import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import type { MatrixKey, MatrixSubmission } from "@/features/virtual-lab/matrix/grade";
import { matrixDone, type MatrixLog, type MatrixMeta, type MatrixSpec } from "@/features/virtual-lab/matrix/spec";
import { gradePure, PURE_KEY } from "@/features/virtual-lab/experiments/pure-vs-mixture/grade";
import { PURE_META } from "@/features/virtual-lab/experiments/pure-vs-mixture/meta";
import { PURE_SPEC } from "@/features/virtual-lab/experiments/pure-vs-mixture/model";
import { gradePhenomena, PHENOMENA_KEY } from "@/features/virtual-lab/experiments/phys-chem-phenomena/grade";
import { PHENOMENA_META } from "@/features/virtual-lab/experiments/phys-chem-phenomena/meta";
import { PHENOMENA_SPEC } from "@/features/virtual-lab/experiments/phys-chem-phenomena/model";
import { gradeProperties, PROPERTIES_KEY } from "@/features/virtual-lab/experiments/substance-properties/grade";
import { PROPERTIES_META } from "@/features/virtual-lab/experiments/substance-properties/meta";
import { PROPERTIES_SPEC } from "@/features/virtual-lab/experiments/substance-properties/model";
import { EQUIPMENT_KEY, gradeEquipment } from "@/features/virtual-lab/experiments/lab-equipment/grade";
import { EQUIPMENT_META } from "@/features/virtual-lab/experiments/lab-equipment/meta";
import { EQUIPMENT_SPEC } from "@/features/virtual-lab/experiments/lab-equipment/model";
import { gradeSafety, SAFETY_KEY } from "@/features/virtual-lab/experiments/lab-safety/grade";
import { SAFETY_META } from "@/features/virtual-lab/experiments/lab-safety/meta";
import { SAFETY_SPEC } from "@/features/virtual-lab/experiments/lab-safety/model";
import { gradeSigns, SIGNS_KEY } from "@/features/virtual-lab/experiments/reaction-signs/grade";
import { SIGNS_META } from "@/features/virtual-lab/experiments/reaction-signs/meta";
import { SIGNS_SPEC } from "@/features/virtual-lab/experiments/reaction-signs/model";
import { gradeMetals, METALS_KEY } from "@/features/virtual-lab/experiments/metals-nonmetals/grade";
import { METALS_META } from "@/features/virtual-lab/experiments/metals-nonmetals/meta";
import { METALS_SPEC } from "@/features/virtual-lab/experiments/metals-nonmetals/model";

type Tree = { [key: string]: string | Tree };
const LOCALES = ["kk", "ru", "en"] as const;
const messages = Object.fromEntries(LOCALES.map((l) => [l, JSON.parse(readFileSync(`messages/${l}.json`, "utf8")) as Tree]));
const get = (tree: Tree, path: string) => path.split(".").reduce<string | Tree | undefined>((t, k) => (t && typeof t === "object" ? t[k] : undefined), tree);

type Lab = {
  slug: string;
  spec: MatrixSpec;
  meta: MatrixMeta;
  key: MatrixKey;
  grade: (s: MatrixSubmission) => { breakdown: { total: number } };
  /** Мінсіз қорытынды (терминдер мен күтілетін сан бар) */
  conclusion: string;
};

const LABS: Lab[] = [
  {
    slug: "pure-vs-mixture",
    spec: PURE_SPEC,
    meta: PURE_META,
    key: PURE_KEY,
    grade: gradePure,
    conclusion: "Алты үлгінің 3-еуі таза зат болды: су, тұз және мыс. Теңіз суы — біртекті қоспа, ал құм мен темір — әртекті қоспа.",
  },
  {
    slug: "phys-chem-phenomena",
    spec: PHENOMENA_SPEC,
    meta: PHENOMENA_META,
    key: PHENOMENA_KEY,
    grade: gradePhenomena,
    conclusion: "Сегіз құбылыстың 4-еуі химиялық болды: оларда жаңа зат түзілді. Қалғандары физикалық құбылыс — тек күйі мен пішіні өзгерді.",
  },
  {
    slug: "substance-properties",
    spec: PROPERTIES_SPEC,
    meta: PROPERTIES_META,
    key: PROPERTIES_KEY,
    grade: gradeProperties,
    conclusion: "Тұз бен қант суда ериді, ал темір магнитке тартылады. Мыстың тығыздығы ең үлкен — 8,96 г/см³.",
  },
  {
    slug: "lab-equipment",
    spec: EQUIPMENT_SPEC,
    meta: EQUIPMENT_META,
    key: EQUIPMENT_KEY,
    grade: gradeEquipment,
    conclusion: "Әр жұмысқа өз құралы керек: көлемді цилиндрмен өлшейміз. Цилиндрді қыздыруға болмайды, оның бөлік құны 2 мл.",
  },
  {
    slug: "lab-safety",
    spec: SAFETY_SPEC,
    meta: SAFETY_META,
    key: SAFETY_KEY,
    grade: gradeSafety,
    conclusion: "Мен 8 жағдайдың бәрін қауіпсіз шештім. Қышқылды әрқашан суға құямыз және көзілдірік киеміз.",
  },
  {
    slug: "reaction-signs",
    spec: SIGNS_SPEC,
    meta: SIGNS_META,
    key: SIGNS_KEY,
    grade: gradeSigns,
    conclusion: "Реакцияның белгілері әртүрлі: газ, тұнба және түстің өзгеруі. Бейтараптанғанда ерітінді 4,6 °C-қа, ал магниймен 8,2 °C-қа қызды.",
  },
  {
    slug: "metals-nonmetals",
    spec: METALS_SPEC,
    meta: METALS_META,
    key: METALS_KEY,
    grade: gradeMetals,
    conclusion: "Алты заттың 3-еуі металл, 3-еуі бейметалл болды. Бейметалдардың оксиді сумен қышқыл береді, ал металл оксиді — негіз.",
  },
];

/** Мінсіз жұмыс: барлық сынақ (choose — дұрыс нұсқалар), кілттегі жауаптар */
function perfect(lab: Lab): MatrixSubmission {
  const { spec, key } = lab;
  const log: MatrixLog = spec.rows.flatMap((_, row) =>
    spec
      .tests(row)
      .filter((test) => spec.mode === "explore" || spec.result(row, test).ok)
      .map((test) => [row, test] as [number, string]),
  );
  const rows = key.observationRows ?? spec.rows.length;
  const observations = Object.fromEntries(
    Array.from({ length: rows }).flatMap((_, row) =>
      Object.entries(key.cells(row)).map(([col, a]) => [`r${row}.${col}`, typeof a === "string" ? a : String(a.value)]),
    ),
  );
  const answers = Object.fromEntries(key.questions.map((q) => [q.id, "answer" in q ? q.answer : String(q.value)]));
  return { prediction: key.prediction, equipment: [...key.equipment], experiment: { log }, observations, answers, conclusion: lab.conclusion };
}

for (const lab of LABS) {
  describe(`ChemLab матрица: ${lab.slug}`, () => {
    test("мінсіз жұмыс — 100, тәжірибе аяқталды", () => {
      const s = perfect(lab);
      assert.ok(matrixDone(lab.spec, s.experiment.log));
      assert.equal(lab.grade(s).breakdown.total, 100);
    });

    test("кілт пен клиент сипаттамасы бір-біріне сай", () => {
      const { meta, key } = lab;
      assert.equal(key.questions.reduce((a, q) => a + q.points, 0), 20);
      assert.deepEqual(key.questions.map((q) => q.id), meta.questions.map((q) => q.id));
      assert.ok(key.equipment.every((id) => meta.equipment.includes(id)));
      assert.ok(meta.predictions.includes(key.prediction));
      for (const q of key.questions) {
        const m = meta.questions.find((x) => x.id === q.id)!;
        if ("answer" in q) assert.ok(m.kind === "choice" && m.options.includes(q.answer), q.id);
      }
      const rows = key.observationRows ?? lab.spec.rows.length;
      assert.equal(rows, meta.observationRows?.length ?? lab.spec.rows.length);
      for (let row = 0; row < rows; row++) {
        for (const [col, a] of Object.entries(key.cells(row))) {
          const c = meta.columns.find((x) => x.key === col);
          assert.ok(c, `${col} бағаны`);
          if (typeof a === "string") assert.ok(c.kind === "select" && c.options.includes(a), `${row}.${col}`);
        }
      }
    });

    test("бақылау мәтіндері мен атаулар үш тілде бар", () => {
      for (const l of LOCALES) {
        const base = get(messages[l], `ChemLab.labs.${lab.slug}`) as Tree;
        assert.ok(base, `${l}: ${lab.slug}`);
        lab.spec.rows.forEach((_, row) => {
          for (const test of lab.spec.tests(row)) {
            const r = lab.spec.result(row, test);
            assert.equal(typeof get(base, `seen.${r.seen}`), "string", `${l}: seen.${r.seen}`);
          }
        });
        for (const q of lab.key.questions) {
          assert.equal(typeof get(messages[l], `ChemLab.feedback.q.${lab.slug}.${q.id}.ok`), "string", `${l}: feedback ${q.id}`);
          assert.equal(typeof get(messages[l], `ChemLab.feedback.q.${lab.slug}.${q.id}.wrong`), "string", `${l}: feedback ${q.id}`);
        }
        for (const rule of lab.meta.safety) assert.equal(typeof get(base, `safety.${rule}`), "string", `${l}: safety.${rule}`);
        for (const id of lab.meta.equipment) assert.equal(typeof get(base, `equipment.${id}`), "string", `${l}: equipment.${id}`);
      }
    });
  });
}
