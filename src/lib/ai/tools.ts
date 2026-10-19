import { tool } from "ai";
import { z } from "zod";
import { molarMassOf, parseFormula } from "@/lib/chemistry/formula";

/**
 * AI мұғалімнің құралдары: сандарды AI жаттан емес, біздің кодпен есептейді.
 * Чат маршруты да, демо кэш скрипті де осы бір анықтаманы қолданады.
 */
export const tutorTools = {
  molarMass: tool({
    description: "Химиялық формуланың молярлық массасын (г/моль) дәл есептейді. Мысалы: H2SO4, Ca(OH)2, CuSO4·5H2O.",
    inputSchema: z.object({ formula: z.string().describe("Химиялық формула") }),
    execute: async ({ formula }) => {
      const atoms = parseFormula(formula);
      if (!atoms) return { error: "Формула танылмады" };
      return { formula, atoms, molarMass: Math.round(molarMassOf(atoms) * 100) / 100, unit: "г/моль" };
    },
  }),
};
