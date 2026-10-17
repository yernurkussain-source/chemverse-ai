import type { Locale } from "@/i18n/routing";
import { formatDecimal, formatPlain } from "@/lib/format";
import type { ChemicalElement } from "./elements";

/** Атомдық масса: тұрақты изотобы жоқ элементте [квадрат жақшада] */
export function formatAtomicMass(element: ChemicalElement, locale: Locale) {
  const value = formatPlain(element.mass, locale);
  return element.stable ? value : `[${value}]`;
}

/** Электртерістік (белгісіз болса null) */
export function formatElectronegativity(element: ChemicalElement, locale: Locale) {
  return element.electronegativity === null ? null : formatDecimal(element.electronegativity, locale, 2);
}
