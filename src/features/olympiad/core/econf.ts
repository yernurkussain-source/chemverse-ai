// ---------- 4. Электрондық конфигурация ----------
export const SYM = ['','H','He','Li','Be','B','C','N','O','F','Ne','Na','Mg','Al','Si','P','S','Cl','Ar','K','Ca','Sc','Ti','V','Cr','Mn','Fe','Co','Ni','Cu','Zn','Ga','Ge','As','Se','Br','Kr','Rb','Sr','Y','Zr','Nb','Mo','Tc','Ru','Rh','Pd','Ag','Cd','In','Sn','Sb','Te','I','Xe'];
export const ORDER = ['1s','2s','2p','3s','3p','4s','3d','4p','5s','4d','5p'];
export const CAPS: Record<string, number> = { s:2, p:6, d:10, f:14 };
export const EXC: Record<number, Record<string, number>> = { 24:{'3d':5,'4s':1}, 29:{'3d':10,'4s':1}, 41:{'4d':4,'5s':1}, 42:{'4d':5,'5s':1}, 44:{'4d':7,'5s':1}, 45:{'4d':8,'5s':1}, 46:{'4d':10,'5s':0}, 47:{'4d':10,'5s':1} };

export type MlOrder = 'minusFirst' | 'plusFirst';

export function econf(Z: number) {
  if (Z < 1 || Z > 54) throw new Error('Z 1–54 аралығында');
  const occ: Record<string, number> = {}; let left = Z; for (const o of ORDER) { if (left <= 0) break; const c = Math.min(CAPS[o[1]], left); occ[o] = c; left -= c; }
  if (EXC[Z]) Object.assign(occ, EXC[Z]);
  const byShell = Object.keys(occ).filter(k => occ[k] > 0).sort((a, b) => (+a[0] - +b[0]) || ('spdf'.indexOf(a[1]) - 'spdf'.indexOf(b[1])));
  const sup = (n: number) => String(n).replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]);
  const full = byShell.map(k => k + sup(occ[k])).join(' ');
  let unpaired = 0; for (const k in occ) { const cap = CAPS[k[1]], orb = cap / 2, e = occ[k]; unpaired += e <= orb ? e : cap - e; }
  return { Z, symbol: SYM[Z], occ, full, unpaired, valence: Object.keys(occ).filter(k => +k[0] === Math.max(...Object.keys(occ).map(x => +x[0]))).reduce((a, k) => a + occ[k], 0) };
}
// Соңғы электронның квант сандары. Ескерту: m_l реттілігі оқулыққа байланысты — мұғалім баптауда таңдайды.
export function lastElectronQN(Z: number, mlOrder: MlOrder = 'minusFirst') {
  const { occ } = econf(Z); let last: string | null = null; for (const o of ORDER) { if (occ[o]) last = o; } if (EXC[Z]) last = Object.keys(EXC[Z]).find(k => EXC[Z][k] > 0 && k[1] !== 's') || last;
  const n = +last![0], l = 'spdf'.indexOf(last![1]), e = occ[last!], orb = 2 * l + 1;
  const idx = e <= orb ? e - 1 : e - orb - 1, ms = e <= orb ? +0.5 : -0.5;
  const mls = [...Array(orb).keys()].map(i => i - l); if (mlOrder === 'plusFirst') mls.reverse();
  return { n, l, ml: mls[idx], ms };
}
