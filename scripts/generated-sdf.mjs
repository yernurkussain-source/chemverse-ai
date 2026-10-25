// PubChem-де 3D құрылымы жоқ заттарды есептеп, SDF (V2000) жазады: H₂ және кристалл торларының үзінділері.
// Іске қосу: node scripts/generated-sdf.mjs   (нәтиже: public/molecules/sdf/<id>.sdf), сосын npm run glb
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join("public", "molecules", "sdf");
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** Атомдар мен байланыстар → V2000 molfile */
function molfile(name, note, atoms, bonds) {
  const f = (n) => n.toFixed(4).padStart(10);
  const i3 = (n) => String(n).padStart(3);
  return [
    name,
    `  CHEMVERSE generated: ${note}`,
    "",
    `${i3(atoms.length)}${i3(bonds.length)}  0  0  0  0  0  0  0  0999 V2000`,
    ...atoms.map((a) => `${f(a.x)}${f(a.y)}${f(a.z)} ${a.el.padEnd(3)} 0  0  0  0  0  0  0  0  0  0  0  0`),
    ...bonds.map(([a, b, order]) => `${i3(a + 1)}${i3(b + 1)}${i3(order)}  0  0  0  0`),
    "M  END",
    "$$$$",
    "",
  ].join("\n");
}

/** Қашықтығы length-ке жуық атомдар арасына байланыс (filter — қай жұптарды қосу керек) */
function bondsByDistance(atoms, length, filter = () => true, tolerance = 0.08) {
  const bonds = [];
  for (let i = 0; i < atoms.length; i++)
    for (let j = i + 1; j < atoms.length; j++)
      if (filter(atoms[i], atoms[j]) && Math.abs(dist(atoms[i], atoms[j]) - length) < tolerance) bonds.push([i, j, 1]);
  return bonds;
}

/** Бір-ақ көршісі бар шеткі атомдарды алып тастау (тор үзіндісі «түкті» болмауы үшін) */
function pruneDangling(atoms, length, filter) {
  const keep = atoms.filter((a) => atoms.filter((b) => b !== a && filter(a, b) && Math.abs(dist(a, b) - length) < 0.08).length > 1);
  return keep;
}

/** Ортасы координат басында болатын шар ішіндегі тор түйіндері */
function latticeBall(basis, a, radius, el) {
  const n = Math.ceil(radius / a) + 1;
  const atoms = [];
  for (let i = -n; i <= n; i++)
    for (let j = -n; j <= n; j++)
      for (let k = -n; k <= n; k++)
        for (const [bx, by, bz, sub] of basis) {
          const atom = { el, x: (i + bx) * a, y: (j + by) * a, z: (k + bz) * a, sub };
          if (Math.hypot(atom.x, atom.y, atom.z) <= radius) atoms.push(atom);
        }
  return atoms;
}

/** Кубтық тор үзіндісі: cells × cells ұяшық, шетіндегі атомдармен қоса */
function latticeBox(basis, a, cells, el) {
  const atoms = [];
  const seen = new Set();
  for (let i = 0; i <= cells; i++)
    for (let j = 0; j <= cells; j++)
      for (let k = 0; k <= cells; k++)
        for (const [bx, by, bz] of basis) {
          const [x, y, z] = [i + bx, j + by, k + bz];
          const key = `${x},${y},${z}`;
          if (x > cells || y > cells || z > cells || seen.has(key)) continue;
          seen.add(key);
          const c = cells / 2;
          atoms.push({ el, x: (x - c) * a, y: (y - c) * a, z: (z - c) * a });
        }
  return atoms;
}

const FCC = [
  [0, 0, 0],
  [0, 0.5, 0.5],
  [0.5, 0, 0.5],
  [0.5, 0.5, 0],
];
// Алмаз торы: FCC (A қосалқы торы) + (¼, ¼, ¼) ығысқан FCC (B қосалқы торы)
const DIAMOND = [...FCC.map(([x, y, z]) => [x, y, z, "A"]), ...FCC.map(([x, y, z]) => [x + 0.25, y + 0.25, z + 0.25, "B"])];

const structures = [];

// H₂: H–H = 0,74 Å
structures.push(["h2", "H-H 0.74 A", [{ el: "H", x: -0.37, y: 0, z: 0 }, { el: "H", x: 0.37, y: 0, z: 0 }], [[0, 1, 1]]]);

// Алмаз: a = 3,567 Å, C–C = 1,545 Å, әр атом — тетраэдрдің ортасы (sp³)
{
  const a = 3.567;
  const cc = (a * Math.sqrt(3)) / 4;
  const ball = latticeBall(DIAMOND, a, 5.2, "C");
  const atoms = pruneDangling(ball, cc, () => true);
  structures.push(["diamond", "diamond lattice fragment, C-C 1.545 A", atoms, bondsByDistance(atoms, cc)]);
}

// Графит: қабаттағы C–C = 1,42 Å (алтыбұрыштар), қабаттар арасы 3,35 Å (байланыссыз), ABA орналасу. y — қабатқа перпендикуляр ось.
{
  const cc = 1.42;
  const a = cc * Math.sqrt(3);
  const atoms = [];
  // Алтыбұрышты тор: a1 = (a, 0), a2 = (a/2, a√3/2), базис (0, 0) және (a/2, a/(2√3)); ортаңғы (B) қабат базис векторына ығысқан
  const basis = [
    [0, 0],
    [a / 2, a / (2 * Math.sqrt(3))],
  ];
  [-3.35, 0, 3.35].forEach((y, layer) => {
    const [sx, sz] = layer === 1 ? basis[1] : [0, 0];
    for (let i = -6; i <= 6; i++)
      for (let j = -6; j <= 6; j++)
        for (const [bx, bz] of basis) {
          const x = i * a + (j * a) / 2 + bx + sx;
          const z = (j * a * Math.sqrt(3)) / 2 + bz + sz;
          if (Math.hypot(x, z) <= 5.6) atoms.push({ el: "C", x, y, z, layer });
        }
  });
  const sameLayer = (p, q) => p.layer === q.layer;
  const kept = pruneDangling(atoms, cc, sameLayer);
  structures.push(["graphite", "graphite layers, C-C 1.42 A, interlayer 3.35 A", kept, bondsByDistance(kept, cc, sameLayer)]);
}

// Мұз (кубтық Ic үлгісі): O алмаз торында, O–O = 2,75 Å; әр О екі H береді (мұз ережелері: әр O···O бойында бір H)
{
  const a = 6.36;
  const oo = (a * Math.sqrt(3)) / 4;
  const oxygens = pruneDangling(latticeBall(DIAMOND, a, 7.2, "O"), oo, () => true);
  const DONATE = {
    A: [
      [1, 1, 1],
      [1, -1, -1],
    ],
    B: [
      [1, -1, 1],
      [1, 1, -1],
    ],
  };
  const atoms = [...oxygens.map(({ el, x, y, z }) => ({ el, x, y, z }))];
  const bonds = [];
  oxygens.forEach((o, index) => {
    for (const d of DONATE[o.sub]) {
      const k = 0.96 / Math.sqrt(3);
      atoms.push({ el: "H", x: o.x + d[0] * k, y: o.y + d[1] * k, z: o.z + d[2] * k });
      bonds.push([index, atoms.length - 1, 1]);
    }
  });
  structures.push(["ice", "cubic ice Ic fragment, O-O 2.75 A, O-H 0.96 A", atoms, bonds]);
}

// Темір: көлемі центрленген куб (bcc), a = 2,866 Å, Fe–Fe = 2,48 Å
structures.push([
  "iron",
  "bcc lattice 2x2x2 cells, a 2.866 A",
  latticeBox(
    [
      [0, 0, 0],
      [0.5, 0.5, 0.5],
    ],
    2.866,
    2,
    "Fe",
  ),
  [],
]);

// Мыс: қырлары центрленген куб (fcc), a = 3,615 Å, Cu–Cu = 2,56 Å
structures.push(["copper", "fcc lattice 2x2x2 cells, a 3.615 A", latticeBox(FCC, 3.615, 2, "Cu"), []]);

for (const [id, note, atoms, bonds] of structures) {
  writeFileSync(join(OUT, `${id}.sdf`), molfile(id, note, atoms, bonds));
  console.log(`${id.padEnd(9)} ${atoms.length} атом, ${bonds.length} байланыс`);
}
