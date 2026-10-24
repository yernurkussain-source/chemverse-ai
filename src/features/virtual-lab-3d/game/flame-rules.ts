/**
 * Жалын сынағының ережелері (прототиптегі FLAME және wireFlame) — DOM-сыз таза функция.
 * Түстер: Na⁺ — сары-қызғылт сары, K⁺ — ашық күлгін, Ca²⁺ — кірпіш-қызыл, Cu²⁺ — жасыл, Ba²⁺ — сарғыш-жасыл.
 */
export const FLAME = {
  Na: { c: [255, 186, 40] },
  K: { c: [196, 130, 255] },
  Ca: { c: [255, 92, 48] },
  Cu: { c: [60, 225, 130] },
  Ba: { c: [175, 235, 95] },
} as const satisfies Record<string, { c: readonly [number, number, number] }>;
export type FlameIon = keyof typeof FLAME;

const isFlameIon = (k: string): k is FlameIon => k in FLAME;

/**
 * Жалынның түсін не береді. ions — сымдағы катиондар, naRes — сымда алдыңғы сынақтан Na⁺ қалды ма.
 * Na⁺ өте ашық түс береді, сондықтан басқаларын жасырады; қалғандарының реті: Cu > Ba > Ca > K.
 */
export function chooseFlame(ions: string[], naRes: boolean): { main: FlameIon | null; colored: FlameIon[] } {
  const colored = ions.filter(isFlameIon);
  if (naRes && !colored.includes("Na")) colored.push("Na");
  const main = colored.includes("Na") ? "Na" : ((["Cu", "Ba", "Ca", "K"] as const).find((k) => colored.includes(k)) ?? null);
  return { main, colored };
}
