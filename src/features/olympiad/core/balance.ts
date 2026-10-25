// ---------- 3. Теңдеуді тексеру және теңестіру ----------
import { parseFormula } from "./formula";

export type CheckResult = { ok: boolean; reason?: string };
type Frac = [number, number]; // [алым, бөлім]

export function splitEq(eq: string) { const [l, r] = eq.split(/=|→|->/).map(x => x.trim()); return { L: l.split(/\s\+\s/).map(x => x.trim()), R: r.split(/\s\+\s/).map(x => x.trim()) }; }
// Оқушы енгізген коэффициенттер дұрыс па: атомдар мен заряд сақталады, бүтін оң сандар, ЕҮОБ = 1
export function checkCoefficients(eq: string, coeffs: number[]): CheckResult {
  const { L, R } = splitEq(eq), sp = [...L, ...R];
  if (coeffs.length !== sp.length || coeffs.some(c => !Number.isInteger(c) || c <= 0)) return { ok: false, reason: 'Коэффициенттер бүтін оң сан болуы керек' };
  const bal: Record<string, number> = {}; let q = 0;
  sp.forEach((f, i) => { const { el, charge } = parseFormula(f), sgn = i < L.length ? 1 : -1; for (const e in el) bal[e] = (bal[e] || 0) + sgn * coeffs[i] * el[e]; q += sgn * coeffs[i] * charge; });
  const bad = Object.entries(bal).filter(([, v]) => v !== 0).map(([e]) => e);
  if (bad.length) return { ok: false, reason: 'Атомдар сақталмаған: ' + bad.join(', ') };
  if (q !== 0) return { ok: false, reason: 'Заряд сақталмаған' };
  const g = coeffs.reduce((a, b) => gcd(a, b)); if (g !== 1) return { ok: false, reason: 'Коэффициенттерді ' + g + '-ке қысқарт' };
  return { ok: true };
}
export function gcd(a: number, b: number) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; }
// Рационал сандармен Гаусс әдісі — нөлдік кеңістік бір өлшемді болса, ең кіші бүтін коэффициенттер
export function balance(eq: string): number[] | null {
  const { L, R } = splitEq(eq), sp = [...L, ...R], parsed = sp.map(parseFormula);
  const els = [...new Set(parsed.flatMap(p => Object.keys(p.el)))];
  const rows = els.map(e => parsed.map((p, i) => (i < L.length ? 1 : -1) * (p.el[e] || 0)));
  if (parsed.some(p => p.charge)) rows.push(parsed.map((p, i) => (i < L.length ? 1 : -1) * p.charge));
  const n = sp.length; const M = rows.map(r => r.map((x): Frac => [x, 1]));
  const fr = (a: number, b: number): Frac => { const g = gcd(a, b) || 1; const s = b < 0 ? -1 : 1; return [s * a / g, s * b / g]; };
  const sub = (a: Frac, b: Frac) => fr(a[0] * b[1] - b[0] * a[1], a[1] * b[1]), mul = (a: Frac, b: Frac) => fr(a[0] * b[0], a[1] * b[1]), div = (a: Frac, b: Frac) => fr(a[0] * b[1], a[1] * b[0]);
  let r = 0; const piv: number[] = [];
  for (let c = 0; c < n && r < M.length; c++) { let p = r; while (p < M.length && M[p][c][0] === 0) p++; if (p === M.length) continue; [M[r], M[p]] = [M[p], M[r]];
    const pv = M[r][c]; M[r] = M[r].map(x => div(x, pv));
    for (let i = 0; i < M.length; i++) if (i !== r && M[i][c][0] !== 0) { const f = M[i][c]; M[i] = M[i].map((x, j) => sub(x, mul(f, M[r][j]))); }
    piv.push(c); r++; }
  const free = [...Array(n).keys()].filter(c => !piv.includes(c));
  if (free.length !== 1) return null;                                          // бір мәнді емес
  const fc = free[0], sol: Frac[] = Array(n).fill(null); sol[fc] = [1, 1];
  piv.forEach((c, i) => { sol[c] = fr(-M[i][fc][0], M[i][fc][1]); });
  const lcm = sol.reduce((a, x) => a * x[1] / gcd(a, x[1]), 1); let ints = sol.map(x => x[0] * lcm / x[1]);
  if (ints.every(x => x < 0)) ints = ints.map(x => -x); if (ints.some(x => x <= 0)) return null;
  const g = ints.reduce((a, b) => gcd(a, b)); return ints.map(x => x / g);
}
export function formatEq(eq: string, k: number[]) { const { L, R } = splitEq(eq); const f = (arr: string[], o: number) => arr.map((s, i) => (k[i + o] === 1 ? '' : k[i + o]) + s).join(' + '); return f(L, 0) + ' → ' + f(R, L.length); }
