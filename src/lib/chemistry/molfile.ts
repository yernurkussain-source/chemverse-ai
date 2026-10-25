/**
 * V2000 molfile (SDF) оқу: атомдар (белгі, координат Å, формалды заряд) және байланыстар (еселігімен).
 * 3Dmol те осы файлды оқиды, атомдардың реті бірдей — индекстер сәйкес келеді.
 */
export type MolAtom = { elem: string; x: number; y: number; z: number; charge: number };
export type MolBond = { a: number; b: number; order: number };
export type MolGraph = { atoms: MolAtom[]; bonds: MolBond[] };

// Атом жолындағы заряд коды: 1 → +3, 2 → +2, 3 → +1, 5 → −1, 6 → −2, 7 → −3
const CHARGE_CODE: Record<number, number> = { 1: 3, 2: 2, 3: 1, 5: -1, 6: -2, 7: -3 };

export function parseMolfile(text: string): MolGraph {
  const lines = text.split(/\r?\n/);
  const atomCount = parseInt(lines[3].slice(0, 3), 10);
  const bondCount = parseInt(lines[3].slice(3, 6), 10);
  const atoms: MolAtom[] = [];
  for (let i = 0; i < atomCount; i++) {
    const l = lines[4 + i];
    atoms.push({
      elem: l.slice(31, 34).trim(),
      x: parseFloat(l.slice(0, 10)),
      y: parseFloat(l.slice(10, 20)),
      z: parseFloat(l.slice(20, 30)),
      charge: CHARGE_CODE[parseInt(l.slice(36, 39), 10)] ?? 0,
    });
  }
  const bonds: MolBond[] = [];
  for (let i = 0; i < bondCount; i++) {
    const l = lines[4 + atomCount + i];
    bonds.push({ a: parseInt(l.slice(0, 3), 10) - 1, b: parseInt(l.slice(3, 6), 10) - 1, order: parseInt(l.slice(6, 9), 10) });
  }
  // «M  CHG» жолдары болса, атом жолындағы зарядтың орнына солар қолданылады (V2000 ережесі)
  const chargeLines = lines.slice(4 + atomCount + bondCount).filter((l) => l.startsWith("M  CHG"));
  if (chargeLines.length) atoms.forEach((a) => (a.charge = 0));
  for (const l of chargeLines) {
    const values = l.slice(9).trim().split(/\s+/).map(Number);
    for (let i = 0; i + 1 < values.length; i += 2) atoms[values[i] - 1].charge = values[i + 1];
  }
  return { atoms, bonds };
}
