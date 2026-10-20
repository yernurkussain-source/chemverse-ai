import { getElement } from "./elements";

/**
 * Химиялық формуланы талдау: "H2SO4", "Ca(OH)2", "CuSO4·5H2O", "H₂O" → { H: 2, S: 1, O: 4 }.
 * Қате формула болса — null. AI мұғалім сандарды осы функция арқылы тексереді.
 */
export function parseFormula(input: string): Record<string, number> | null {
  // Төменгі индекс таңбалары (₀–₉) → кәдімгі сандар; гидрат нүктесі (· . *) → "+"
  const formula = input
    .trim()
    .replace(/[₀-₉]/g, (d) => String(d.charCodeAt(0) - 0x2080))
    .replace(/[·•.*]/g, "+")
    .replace(/\s+/g, "");
  if (!formula || formula.length > 60) return null;

  const total: Record<string, number> = {};
  for (const part of formula.split("+")) {
    // Гидрат бөлігінің алдындағы коэффициент: 5H2O
    const match = /^(\d*)(.+)$/.exec(part);
    if (!match) return null;
    const coefficient = match[1] ? Number(match[1]) : 1;
    const atoms = parseGroup(match[2]);
    if (!atoms || coefficient === 0) return null;
    for (const [symbol, count] of Object.entries(atoms)) total[symbol] = (total[symbol] ?? 0) + count * coefficient;
  }
  return Object.keys(total).length ? total : null;
}

function parseGroup(formula: string): Record<string, number> | null {
  const stack: Record<string, number>[] = [{}];
  let i = 0;
  // Индекс жоқ болса — 1; нөлдік индекс (H0) қате формула саналады → 0 қайтарылады
  const readNumber = () => {
    const m = /^\d+/.exec(formula.slice(i));
    if (!m) return 1;
    i += m[0].length;
    return Number(m[0]);
  };

  while (i < formula.length) {
    const char = formula[i];
    if (char === "(" || char === "[") {
      stack.push({});
      i++;
    } else if (char === ")" || char === "]") {
      if (stack.length < 2) return null;
      i++;
      const group = stack.pop()!;
      const n = readNumber();
      if (n === 0) return null;
      const top = stack[stack.length - 1];
      for (const [symbol, count] of Object.entries(group)) top[symbol] = (top[symbol] ?? 0) + count * n;
    } else {
      const m = /^[A-Z][a-z]?/.exec(formula.slice(i));
      if (!m || !getElement(m[0])) return null;
      i += m[0].length;
      const n = readNumber();
      if (n === 0) return null;
      const top = stack[stack.length - 1];
      top[m[0]] = (top[m[0]] ?? 0) + n;
    }
  }
  return stack.length === 1 ? stack[0] : null;
}

/** Атомдық массалар бойынша молярлық масса, г/моль */
export function molarMassOf(atoms: Record<string, number>): number {
  return Object.entries(atoms).reduce((sum, [symbol, count]) => sum + (getElement(symbol)?.mass ?? 0) * count, 0);
}
