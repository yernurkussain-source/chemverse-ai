/**
 * Химиялық элементтер (1–118).
 * Атомдық масса — IUPAC стандарттық мәндері (дөңгелектенген); тұрақты изотобы жоқ элементтерде —
 * ең тұрақты изотоптың массалық саны (stable: false). Электртерістік — Полинг шкаласы (белгісіз болса null).
 */
import type { Locale } from "@/i18n/routing";

export type ElementCategory =
  | "alkali"
  | "alkaline-earth"
  | "transition"
  | "post-transition"
  | "metalloid"
  | "nonmetal"
  | "halogen"
  | "noble-gas"
  | "lanthanide"
  | "actinide";

export type ChemicalElement = {
  number: number;
  symbol: string;
  name: Record<Locale, string>;
  mass: number;
  /** Тұрақты изотобы бар ма (жоқ болса масса [квадрат жақшада] көрсетіледі) */
  stable: boolean;
  electronegativity: number | null;
  category: ElementCategory;
  period: number;
  /** 1–18; лантаноидтар мен актиноидтарда null */
  group: number | null;
};

// [Z, белгі, қазақша, орысша, ағылшынша, масса, электртерістік, санат, тұрақты]
type Row = [number, string, string, string, string, number, number | null, ElementCategory, boolean?];

const ROWS: Row[] = [
  [1, "H", "Сутек", "Водород", "Hydrogen", 1.008, 2.2, "nonmetal"],
  [2, "He", "Гелий", "Гелий", "Helium", 4.0026, null, "noble-gas"],
  [3, "Li", "Литий", "Литий", "Lithium", 6.94, 0.98, "alkali"],
  [4, "Be", "Бериллий", "Бериллий", "Beryllium", 9.0122, 1.57, "alkaline-earth"],
  [5, "B", "Бор", "Бор", "Boron", 10.81, 2.04, "metalloid"],
  [6, "C", "Көміртек", "Углерод", "Carbon", 12.011, 2.55, "nonmetal"],
  [7, "N", "Азот", "Азот", "Nitrogen", 14.007, 3.04, "nonmetal"],
  [8, "O", "Оттек", "Кислород", "Oxygen", 15.999, 3.44, "nonmetal"],
  [9, "F", "Фтор", "Фтор", "Fluorine", 18.998, 3.98, "halogen"],
  [10, "Ne", "Неон", "Неон", "Neon", 20.18, null, "noble-gas"],
  [11, "Na", "Натрий", "Натрий", "Sodium", 22.99, 0.93, "alkali"],
  [12, "Mg", "Магний", "Магний", "Magnesium", 24.305, 1.31, "alkaline-earth"],
  [13, "Al", "Алюминий", "Алюминий", "Aluminium", 26.982, 1.61, "post-transition"],
  [14, "Si", "Кремний", "Кремний", "Silicon", 28.085, 1.9, "metalloid"],
  [15, "P", "Фосфор", "Фосфор", "Phosphorus", 30.974, 2.19, "nonmetal"],
  [16, "S", "Күкірт", "Сера", "Sulfur", 32.06, 2.58, "nonmetal"],
  [17, "Cl", "Хлор", "Хлор", "Chlorine", 35.45, 3.16, "halogen"],
  [18, "Ar", "Аргон", "Аргон", "Argon", 39.948, null, "noble-gas"],
  [19, "K", "Калий", "Калий", "Potassium", 39.098, 0.82, "alkali"],
  [20, "Ca", "Кальций", "Кальций", "Calcium", 40.078, 1.0, "alkaline-earth"],
  [21, "Sc", "Скандий", "Скандий", "Scandium", 44.956, 1.36, "transition"],
  [22, "Ti", "Титан", "Титан", "Titanium", 47.867, 1.54, "transition"],
  [23, "V", "Ванадий", "Ванадий", "Vanadium", 50.942, 1.63, "transition"],
  [24, "Cr", "Хром", "Хром", "Chromium", 51.996, 1.66, "transition"],
  [25, "Mn", "Марганец", "Марганец", "Manganese", 54.938, 1.55, "transition"],
  [26, "Fe", "Темір", "Железо", "Iron", 55.845, 1.83, "transition"],
  [27, "Co", "Кобальт", "Кобальт", "Cobalt", 58.933, 1.88, "transition"],
  [28, "Ni", "Никель", "Никель", "Nickel", 58.693, 1.91, "transition"],
  [29, "Cu", "Мыс", "Медь", "Copper", 63.546, 1.9, "transition"],
  [30, "Zn", "Мырыш", "Цинк", "Zinc", 65.38, 1.65, "transition"],
  [31, "Ga", "Галлий", "Галлий", "Gallium", 69.723, 1.81, "post-transition"],
  [32, "Ge", "Германий", "Германий", "Germanium", 72.63, 2.01, "metalloid"],
  [33, "As", "Мышьяк", "Мышьяк", "Arsenic", 74.922, 2.18, "metalloid"],
  [34, "Se", "Селен", "Селен", "Selenium", 78.971, 2.55, "nonmetal"],
  [35, "Br", "Бром", "Бром", "Bromine", 79.904, 2.96, "halogen"],
  [36, "Kr", "Криптон", "Криптон", "Krypton", 83.798, 3.0, "noble-gas"],
  [37, "Rb", "Рубидий", "Рубидий", "Rubidium", 85.468, 0.82, "alkali"],
  [38, "Sr", "Стронций", "Стронций", "Strontium", 87.62, 0.95, "alkaline-earth"],
  [39, "Y", "Иттрий", "Иттрий", "Yttrium", 88.906, 1.22, "transition"],
  [40, "Zr", "Цирконий", "Цирконий", "Zirconium", 91.224, 1.33, "transition"],
  [41, "Nb", "Ниобий", "Ниобий", "Niobium", 92.906, 1.6, "transition"],
  [42, "Mo", "Молибден", "Молибден", "Molybdenum", 95.95, 2.16, "transition"],
  [43, "Tc", "Технеций", "Технеций", "Technetium", 98, 1.9, "transition", false],
  [44, "Ru", "Рутений", "Рутений", "Ruthenium", 101.07, 2.2, "transition"],
  [45, "Rh", "Родий", "Родий", "Rhodium", 102.91, 2.28, "transition"],
  [46, "Pd", "Палладий", "Палладий", "Palladium", 106.42, 2.2, "transition"],
  [47, "Ag", "Күміс", "Серебро", "Silver", 107.87, 1.93, "transition"],
  [48, "Cd", "Кадмий", "Кадмий", "Cadmium", 112.41, 1.69, "transition"],
  [49, "In", "Индий", "Индий", "Indium", 114.82, 1.78, "post-transition"],
  [50, "Sn", "Қалайы", "Олово", "Tin", 118.71, 1.96, "post-transition"],
  [51, "Sb", "Сүрме", "Сурьма", "Antimony", 121.76, 2.05, "metalloid"],
  [52, "Te", "Теллур", "Теллур", "Tellurium", 127.6, 2.1, "metalloid"],
  [53, "I", "Йод", "Йод", "Iodine", 126.9, 2.66, "halogen"],
  [54, "Xe", "Ксенон", "Ксенон", "Xenon", 131.29, 2.6, "noble-gas"],
  [55, "Cs", "Цезий", "Цезий", "Caesium", 132.91, 0.79, "alkali"],
  [56, "Ba", "Барий", "Барий", "Barium", 137.33, 0.89, "alkaline-earth"],
  [57, "La", "Лантан", "Лантан", "Lanthanum", 138.91, 1.1, "lanthanide"],
  [58, "Ce", "Церий", "Церий", "Cerium", 140.12, 1.12, "lanthanide"],
  [59, "Pr", "Празеодим", "Празеодим", "Praseodymium", 140.91, 1.13, "lanthanide"],
  [60, "Nd", "Неодим", "Неодим", "Neodymium", 144.24, 1.14, "lanthanide"],
  [61, "Pm", "Прометий", "Прометий", "Promethium", 145, 1.13, "lanthanide", false],
  [62, "Sm", "Самарий", "Самарий", "Samarium", 150.36, 1.17, "lanthanide"],
  [63, "Eu", "Европий", "Европий", "Europium", 151.96, 1.2, "lanthanide"],
  [64, "Gd", "Гадолиний", "Гадолиний", "Gadolinium", 157.25, 1.2, "lanthanide"],
  [65, "Tb", "Тербий", "Тербий", "Terbium", 158.93, 1.2, "lanthanide"],
  [66, "Dy", "Диспрозий", "Диспрозий", "Dysprosium", 162.5, 1.22, "lanthanide"],
  [67, "Ho", "Гольмий", "Гольмий", "Holmium", 164.93, 1.23, "lanthanide"],
  [68, "Er", "Эрбий", "Эрбий", "Erbium", 167.26, 1.24, "lanthanide"],
  [69, "Tm", "Тулий", "Тулий", "Thulium", 168.93, 1.25, "lanthanide"],
  [70, "Yb", "Иттербий", "Иттербий", "Ytterbium", 173.05, 1.1, "lanthanide"],
  [71, "Lu", "Лютеций", "Лютеций", "Lutetium", 174.97, 1.27, "lanthanide"],
  [72, "Hf", "Гафний", "Гафний", "Hafnium", 178.49, 1.3, "transition"],
  [73, "Ta", "Тантал", "Тантал", "Tantalum", 180.95, 1.5, "transition"],
  [74, "W", "Вольфрам", "Вольфрам", "Tungsten", 183.84, 2.36, "transition"],
  [75, "Re", "Рений", "Рений", "Rhenium", 186.21, 1.9, "transition"],
  [76, "Os", "Осмий", "Осмий", "Osmium", 190.23, 2.2, "transition"],
  [77, "Ir", "Иридий", "Иридий", "Iridium", 192.22, 2.2, "transition"],
  [78, "Pt", "Платина", "Платина", "Platinum", 195.08, 2.28, "transition"],
  [79, "Au", "Алтын", "Золото", "Gold", 196.97, 2.54, "transition"],
  [80, "Hg", "Сынап", "Ртуть", "Mercury", 200.59, 2.0, "transition"],
  [81, "Tl", "Таллий", "Таллий", "Thallium", 204.38, 1.62, "post-transition"],
  [82, "Pb", "Қорғасын", "Свинец", "Lead", 207.2, 2.33, "post-transition"],
  [83, "Bi", "Висмут", "Висмут", "Bismuth", 208.98, 2.02, "post-transition"],
  [84, "Po", "Полоний", "Полоний", "Polonium", 209, 2.0, "post-transition", false],
  [85, "At", "Астат", "Астат", "Astatine", 210, 2.2, "halogen", false],
  [86, "Rn", "Радон", "Радон", "Radon", 222, 2.2, "noble-gas", false],
  [87, "Fr", "Франций", "Франций", "Francium", 223, 0.7, "alkali", false],
  [88, "Ra", "Радий", "Радий", "Radium", 226, 0.9, "alkaline-earth", false],
  [89, "Ac", "Актиний", "Актиний", "Actinium", 227, 1.1, "actinide", false],
  [90, "Th", "Торий", "Торий", "Thorium", 232.04, 1.3, "actinide"],
  [91, "Pa", "Протактиний", "Протактиний", "Protactinium", 231.04, 1.5, "actinide"],
  [92, "U", "Уран", "Уран", "Uranium", 238.03, 1.38, "actinide"],
  [93, "Np", "Нептуний", "Нептуний", "Neptunium", 237, 1.36, "actinide", false],
  [94, "Pu", "Плутоний", "Плутоний", "Plutonium", 244, 1.28, "actinide", false],
  [95, "Am", "Америций", "Америций", "Americium", 243, 1.13, "actinide", false],
  [96, "Cm", "Кюрий", "Кюрий", "Curium", 247, 1.28, "actinide", false],
  [97, "Bk", "Берклий", "Берклий", "Berkelium", 247, 1.3, "actinide", false],
  [98, "Cf", "Калифорний", "Калифорний", "Californium", 251, 1.3, "actinide", false],
  [99, "Es", "Эйнштейний", "Эйнштейний", "Einsteinium", 252, 1.3, "actinide", false],
  [100, "Fm", "Фермий", "Фермий", "Fermium", 257, 1.3, "actinide", false],
  [101, "Md", "Менделевий", "Менделевий", "Mendelevium", 258, 1.3, "actinide", false],
  [102, "No", "Нобелий", "Нобелий", "Nobelium", 259, 1.3, "actinide", false],
  [103, "Lr", "Лоуренсий", "Лоуренсий", "Lawrencium", 266, 1.3, "actinide", false],
  [104, "Rf", "Резерфордий", "Резерфордий", "Rutherfordium", 267, null, "transition", false],
  [105, "Db", "Дубний", "Дубний", "Dubnium", 268, null, "transition", false],
  [106, "Sg", "Сиборгий", "Сиборгий", "Seaborgium", 269, null, "transition", false],
  [107, "Bh", "Борий", "Борий", "Bohrium", 270, null, "transition", false],
  [108, "Hs", "Хассий", "Хассий", "Hassium", 269, null, "transition", false],
  [109, "Mt", "Мейтнерий", "Мейтнерий", "Meitnerium", 278, null, "transition", false],
  [110, "Ds", "Дармштадтий", "Дармштадтий", "Darmstadtium", 281, null, "transition", false],
  [111, "Rg", "Рентгений", "Рентгений", "Roentgenium", 282, null, "transition", false],
  [112, "Cn", "Коперниций", "Коперниций", "Copernicium", 285, null, "transition", false],
  [113, "Nh", "Нихоний", "Нихоний", "Nihonium", 286, null, "post-transition", false],
  [114, "Fl", "Флеровий", "Флеровий", "Flerovium", 289, null, "post-transition", false],
  [115, "Mc", "Московий", "Московий", "Moscovium", 290, null, "post-transition", false],
  [116, "Lv", "Ливерморий", "Ливерморий", "Livermorium", 293, null, "post-transition", false],
  [117, "Ts", "Теннессин", "Теннессин", "Tennessine", 294, null, "halogen", false],
  [118, "Og", "Оганесон", "Оганесон", "Oganesson", 294, null, "noble-gas", false],
];

// Периодтың соңғы элементінің реттік нөмірі: 2, 10, 18, 36, 54, 86, 118
const PERIOD_END = [2, 10, 18, 36, 54, 86, 118];

function periodOf(z: number) {
  return PERIOD_END.findIndex((end) => z <= end) + 1;
}

/** Ұзын пішінді кестедегі топ нөмірі (лантаноид/актиноид — null) */
function groupOf(z: number, period: number): number | null {
  const start = period === 1 ? 1 : PERIOD_END[period - 2] + 1;
  const pos = z - start; // периодтағы орны (0-ден)
  if (period === 1) return z === 1 ? 1 : 18;
  if (period <= 3) return pos < 2 ? pos + 1 : pos + 11;
  if (period <= 5) return pos + 1;
  if (pos < 2) return pos + 1;
  if (pos < 17) return null; // La–Lu, Ac–Lr
  return pos - 13; // Hf (pos 17) → 4-топ, Rn (pos 31) → 18-топ
}

export const ELEMENTS: ChemicalElement[] = ROWS.map(([number, symbol, kk, ru, en, mass, electronegativity, category, stable]) => {
  const period = periodOf(number);
  return {
    number,
    symbol,
    name: { kk, ru, en },
    mass,
    stable: stable ?? true,
    electronegativity,
    category,
    period,
    group: groupOf(number, period),
  };
});

const BY_SYMBOL = new Map(ELEMENTS.map((e) => [e.symbol.toLowerCase(), e]));

/** Белгі бойынша элемент: "Na", "na" → натрий */
export function getElement(symbol: string) {
  return BY_SYMBOL.get(symbol.toLowerCase());
}

/** Кестедегі орны (CSS grid): лантаноидтар 9-жолда, актиноидтар 10-жолда, 3–17 бағандарда */
export function tablePosition(e: ChemicalElement): { row: number; column: number } {
  if (e.category === "lanthanide") return { row: 9, column: e.number - 57 + 3 };
  if (e.category === "actinide") return { row: 10, column: e.number - 89 + 3 };
  return { row: e.period, column: e.group ?? 3 };
}
