"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { inputClass } from "@/components/auth/form-parts";
import { Link } from "@/i18n/navigation";
import { MOLECULE_GROUPS, MOLECULES, molarMass, type MoleculeGroup } from "@/lib/chemistry/molecules";
import { formatDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";

// Іздеуде H₂O мен H2O бірдей болсын
const plain = (text: string) => text.toLowerCase().replace(/[₀-₉]/g, (d) => String(d.charCodeAt(0) - 0x2080));

/** Молекулалар каталогы: топтар бойынша, атауы/формуласы/сипаттамасы бойынша іздеу */
export function MoleculeCatalog() {
  const t = useTranslations("MoleculesPage");
  const tm = useTranslations("Molecules");
  const tv = useTranslations("Viewer");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<MoleculeGroup | null>(null);

  const q = plain(query.trim());
  const found = MOLECULES.filter(
    (m) =>
      (!group || m.group === group) &&
      (!q || [m.formula, tm(`${m.id}.name`), tm(`${m.id}.description`)].some((text) => plain(text).includes(q))),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <label className="flex max-w-md flex-col gap-1 text-[0.8rem] font-semibold">
          {t("searchLabel")}
          <input
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className={cn(inputClass, "font-normal")}
          />
        </label>
        <div role="group" aria-label={t("searchLabel")} className="flex flex-wrap gap-1.5">
          {[null, ...MOLECULE_GROUPS].map((g) => (
            <button
              key={g ?? "all"}
              type="button"
              aria-pressed={group === g}
              onClick={() => setGroup(g)}
              className={cn(
                "min-h-9 rounded-full border px-3.5 text-[0.82rem] font-semibold transition-colors",
                group === g ? "border-cyan bg-cyan text-on-accent" : "border-line bg-panel hover:border-cyan-dim",
              )}
            >
              {g ? t(`groups.${g}`) : t("all")}
            </button>
          ))}
        </div>
      </div>

      {!found.length && <p className="text-muted-foreground">{t("none")}</p>}

      {MOLECULE_GROUPS.map((g) => {
        const items = found.filter((m) => m.group === g);
        if (!items.length) return null;
        return (
          <section key={g}>
            <h2 className="mb-3 text-[1.05rem] font-semibold">
              {t(`groups.${g}`)} <span className="font-mono text-[0.85rem] text-muted-foreground">{items.length}</span>
            </h2>
            <ul className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/molecules/${m.id}`}
                    className="group flex h-full flex-col gap-2 rounded-[18px] border border-line bg-panel p-5 shadow-[0_1px_2px_var(--shadow)] transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-cyan-dim dark:shadow-none"
                  >
                    <span className="font-mono text-2xl font-semibold break-words text-cyan">{m.formula}</span>
                    <span className="font-display text-[1.02rem] font-semibold">{tm(`${m.id}.name`)}</span>
                    <span className="text-[0.88rem] text-muted-foreground">{tm(`${m.id}.shape`)}</span>
                    <span className="mt-auto flex items-center justify-between pt-2 font-mono text-[0.8rem] text-muted-foreground">
                      {formatDecimal(molarMass(m.atoms), locale)} {tv("massUnit")}
                      <span className="font-sans font-semibold text-cyan group-hover:underline">{t("open")} →</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
