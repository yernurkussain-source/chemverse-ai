// Олимпиада ядросы (docs/olympiad/core/olympiad-core.js-тің TS көшірмесі): атомдық массалар және формула парсері.
// Бұл парсер src/lib/chemistry/formula.ts-тен бөлек: заряд (MnO4^-) пен олимпиадалық массаларды қолдайды.

// ---------- 1. Атомдық массалар (мектеп/олимпиада дөңгелектеуі) ----------
export const AR: Record<string, number> = { H:1, He:4, Li:7, Be:9, B:11, C:12, N:14, O:16, F:19, Ne:20, Na:23, Mg:24, Al:27, Si:28, P:31, S:32, Cl:35.5, Ar:40,
  K:39, Ca:40, Cr:52, Mn:55, Fe:56, Cu:64, Zn:65, Br:80, Ag:108, I:127, Ba:137, Pb:207 };
export const VM = 22.4;      // л/моль, қалыпты жағдай
export const F = 96500;      // Кл/моль, Фарадей тұрақтысы

export type ParsedFormula = { el: Record<string, number>; charge: number };

// ---------- 2. Формула парсері: "Fe2(SO4)3", "Na[Al(OH)4]", "CuSO4*5H2O", "MnO4^-", "Fe^3+", "e^-" ----------
export function parseFormula(str: string): ParsedFormula {
  let s = str.trim(), charge = 0;
  const cm = s.match(/\^(\d*)([+-])$/); if (cm) { charge = (cm[1] ? +cm[1] : 1) * (cm[2] === '+' ? 1 : -1); s = s.slice(0, cm.index); }
  if (s === 'e') return { el: {}, charge: -1 };
  const parts = s.split(/[*·]/); const total: Record<string, number> = {};
  for (const part of parts) {
    const m = part.match(/^(\d+)(.*)$/); const mult = m ? +m[1] : 1; const body = m ? m[2] : part;
    const stack: Record<string, number>[] = [{}]; let i = 0;
    while (i < body.length) {
      const ch = body[i];
      if (ch === '(' || ch === '[') { stack.push({}); i++; continue; }
      if (ch === ')' || ch === ']') { i++; let n = ''; while (/\d/.test(body[i] || '')) n += body[i++]; const grp = stack.pop()!, k = n ? +n : 1; const top = stack[stack.length - 1]; for (const e in grp) top[e] = (top[e] || 0) + grp[e] * k; continue; }
      const em = body.slice(i).match(/^([A-Z][a-z]?)(\d*)/); if (!em) throw new Error('Формула оқылмады: ' + str);
      const top = stack[stack.length - 1]; top[em[1]] = (top[em[1]] || 0) + (em[2] ? +em[2] : 1); i += em[0].length;
    }
    for (const e in stack[0]) total[e] = (total[e] || 0) + stack[0][e] * mult;
  }
  return { el: total, charge };
}
export function molarMass(formula: string) { const { el } = parseFormula(formula); let M = 0; for (const e in el) { if (AR[e] == null) throw new Error('Атомдық масса жоқ: ' + e); M += AR[e] * el[e]; } return M; }
export function massFraction(formula: string, element: string) { const { el } = parseFormula(formula); return AR[element] * (el[element] || 0) / molarMass(formula); }
