"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { inputClass } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  addAtom,
  composition,
  cycleBond,
  EMPTY,
  fillHydrogens,
  freeValence,
  GRID,
  isConnected,
  PALETTE,
  removeAtom,
  signature,
  toGraph,
  type BuilderState,
} from "@/lib/chemistry/builder";
import { getMolecule, molecularFormula, MOLECULES, type MoleculeId } from "@/lib/chemistry/molecules";
import { parseMolfile } from "@/lib/chemistry/molfile";
import { cn } from "@/lib/utils";

// Тор: ұяшық 68 px, шеті 48 px
const STEP = 68;
const PAD = 48;
const px = (cell: number) => PAD + cell * STEP;
const WIDTH = PAD * 2 + (GRID.width - 1) * STEP;
const HEIGHT = PAD * 2 + (GRID.height - 1) * STEP;

// 2D түстер (CPK) және оларда оқылатын мәтін түсі
const COLORS: Record<string, [string, string]> = {
  H: ["#eef1f5", "#0b1220"],
  C: ["#6b7480", "#ffffff"],
  N: ["#3050f8", "#ffffff"],
  O: ["#e8262f", "#ffffff"],
  S: ["#e8c100", "#0b1220"],
  Cl: ["#1fb01f", "#0b1220"],
};

/** Тапсырмалар: валенттілік ережесімен құрастыруға болатын молекулалар */
const TASKS: MoleculeId[] = ["h2o", "nh3", "ch4", "hcl", "co2", "h2o2", "ethylene", "acetylene", "methanol", "ethanol", "dimethyl-ether", "formaldehyde", "acetic-acid", "propane", "isobutane", "glycine"];

// SDF қолтаңбалары бір рет жүктеледі
const signatures = new Map<MoleculeId, Promise<string>>();
function moleculeSignature(id: MoleculeId) {
  if (!signatures.has(id)) signatures.set(id, fetch(getMolecule(id)!.sdf).then((r) => r.text()).then((text) => signature(parseMolfile(text))));
  return signatures.get(id)!;
}

/** Молекула құрастырушы: атом қосу, байланыс еселігі, валенттілікті тексеру, затты тану */
export function MoleculeBuilder() {
  const t = useTranslations("MoleculesPage.builder");
  const tm = useTranslations("Molecules");
  const [state, setState] = useState<BuilderState>(EMPTY);
  const [selected, setSelected] = useState<number | null>(null);
  const [task, setTask] = useState<MoleculeId | "">("");
  const [match, setMatch] = useState<{ key: string; id: MoleculeId | null } | null>(null);
  const [full, setFull] = useState(false);

  const atoms = composition(state);
  const formula = state.atoms.length ? molecularFormula(atoms) : "—";
  const free = state.atoms.reduce((sum, a) => sum + Math.max(0, freeValence(state, a)), 0);
  const over = state.atoms.some((a) => freeValence(state, a) < 0);
  const connected = isConnected(state);
  const complete = connected && free === 0 && !over;
  const key = complete ? signature(toGraph(state)) : "";

  // Құрылым дайын болғанда: құрамы бірдей молекулалардың SDF-імен графты салыстырамыз
  useEffect(() => {
    if (!key) return;
    const built = composition(state);
    const candidates = MOLECULES.filter(
      (m) => m.group !== "crystal" && Object.keys(m.atoms).length === Object.keys(built).length && Object.entries(m.atoms).every(([el, n]) => built[el] === n),
    );
    let cancelled = false;
    Promise.all(candidates.map(async (m) => ((await moleculeSignature(m.id)) === key ? m.id : null))).then((ids) => {
      if (!cancelled) setMatch({ key, id: ids.find(Boolean) ?? null });
    });
    return () => {
      cancelled = true;
    };
  }, [key, state]);

  const found = match?.key === key && key ? match.id : undefined;

  function add(elem: string) {
    const result = addAtom(state, elem, selected);
    setFull(!result);
    if (!result) return;
    setState(result.state);
    setSelected(result.id);
  }

  function tapAtom(id: number) {
    if (selected === null || selected === id) {
      setSelected(selected === id ? null : id);
      return;
    }
    setState(cycleBond(state, selected, id));
    setSelected(id);
  }

  const onKey = (action: () => void) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };
  const byId = new Map(state.atoms.map((a) => [a.id, a]));

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="flex min-w-0 flex-col gap-3">
        <div role="group" aria-label={t("palette")} className="flex flex-wrap gap-1.5">
          {PALETTE.map((elem) => (
            <button
              key={elem}
              type="button"
              onClick={() => add(elem)}
              aria-label={t("addAtom", { elem })}
              className="grid size-11 place-items-center rounded-full border-2 font-mono font-bold transition-transform hover:scale-105"
              style={{ background: COLORS[elem][0], color: COLORS[elem][1], borderColor: COLORS[elem][0] }}
            >
              {elem}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-3xl border border-line bg-[radial-gradient(120%_90%_at_50%_40%,var(--stage-a)_0%,var(--panel)_55%,var(--stage-b)_100%)]">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block w-full min-w-[480px] select-none" role="group" aria-label={t("board")}>
            {/* Тор нүктелері */}
            {Array.from({ length: GRID.width * GRID.height }, (_, i) => (
              <circle key={i} cx={px(i % GRID.width)} cy={px(Math.floor(i / GRID.width))} r={2} className="fill-muted-foreground/30" />
            ))}

            {state.bonds.map((b) => {
              const [p, q] = [byId.get(b.a)!, byId.get(b.b)!];
              const [x1, y1, x2, y2] = [px(p.x), px(p.y), px(q.x), px(q.y)];
              const len = Math.hypot(x2 - x1, y2 - y1);
              const [nx, ny] = [-(y2 - y1) / len, (x2 - x1) / len];
              const offsets = b.order === 1 ? [0] : b.order === 2 ? [-4.5, 4.5] : [-7, 0, 7];
              const label = t("bondLabel", { a: p.elem, b: q.elem, order: b.order });
              return (
                <g
                  key={`${b.a}-${b.b}`}
                  role="button"
                  tabIndex={0}
                  aria-label={label}
                  onClick={() => setState(cycleBond(state, b.a, b.b))}
                  onKeyDown={onKey(() => setState(cycleBond(state, b.a, b.b)))}
                  className="cursor-pointer outline-none focus-visible:[&>line:first-child]:stroke-cyan/40"
                >
                  <title>{label}</title>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={18} className="stroke-transparent" />
                  {offsets.map((o) => (
                    <line key={o} x1={x1 + nx * o} y1={y1 + ny * o} x2={x2 + nx * o} y2={y2 + ny * o} strokeWidth={3.5} strokeLinecap="round" className="stroke-foreground/70" />
                  ))}
                </g>
              );
            })}

            {state.atoms.map((a) => {
              const left = freeValence(state, a);
              const isSelected = selected === a.id;
              const r = a.elem === "H" ? 17 : 23;
              const label = t("atomLabel", { elem: a.elem, free: left });
              return (
                <g
                  key={a.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={label}
                  onClick={() => tapAtom(a.id)}
                  onKeyDown={onKey(() => tapAtom(a.id))}
                  className="cursor-pointer outline-none focus-visible:[&>circle:first-of-type]:stroke-cyan"
                >
                  <title>{label}</title>
                  <circle cx={px(a.x)} cy={px(a.y)} r={r + 5} fill="none" strokeWidth={3} className={isSelected ? "stroke-cyan" : "stroke-transparent"} />
                  <circle cx={px(a.x)} cy={px(a.y)} r={r} fill={COLORS[a.elem][0]} strokeWidth={left < 0 ? 3 : 0} className="stroke-pink" />
                  <text x={px(a.x)} y={px(a.y)} dy="0.35em" textAnchor="middle" className="font-mono text-[17px] font-bold" fill={COLORS[a.elem][1]}>
                    {a.elem}
                  </text>
                  {left !== 0 && (
                    <g>
                      <circle cx={px(a.x) + r * 0.8} cy={px(a.y) - r * 0.8} r={9} className={left < 0 ? "fill-pink" : "fill-[#ffb020]"} />
                      <text x={px(a.x) + r * 0.8} y={px(a.y) - r * 0.8} dy="0.35em" textAnchor="middle" className="fill-[#0b1220] font-mono text-[11px] font-bold">
                        {left < 0 ? "!" : left}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {!state.atoms.length && (
              <text x={WIDTH / 2} y={HEIGHT / 2} textAnchor="middle" className="fill-muted-foreground text-[16px]">
                {t("empty")}
              </text>
            )}
          </svg>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="glow" size="pill-sm" onClick={() => setState(fillHydrogens(state))} disabled={!state.atoms.length}>
            H {t("fill")}
          </Button>
          <Button
            variant="panel"
            size="pill-sm"
            disabled={selected === null}
            onClick={() => {
              if (selected === null) return;
              setState(removeAtom(state, selected));
              setSelected(null);
            }}
          >
            {t("remove")}
          </Button>
          <Button
            variant="panel"
            size="pill-sm"
            onClick={() => {
              setState(EMPTY);
              setSelected(null);
            }}
          >
            {t("clear")}
          </Button>
        </div>
        <p className="text-[0.82rem] text-muted-foreground">{t("help")}</p>
        {full && <p role="alert" className="text-[0.85rem] text-pink">{t("noSpace")}</p>}
      </div>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-[0.8rem] font-semibold">
          {t("task")}
          <select value={task} onChange={(e) => setTask(e.target.value as MoleculeId | "")} className={cn(inputClass, "font-normal")}>
            <option value="">{t("free")}</option>
            {TASKS.map((id) => (
              <option key={id} value={id}>
                {tm(`${id}.name`)}
              </option>
            ))}
          </select>
        </label>
        {task && (
          <p className="rounded-2xl border border-line bg-panel px-4 py-3 text-[0.9rem]">
            {t("taskText", { name: tm(`${task}.name`), formula: molecularFormula(getMolecule(task)!.atoms) })}
          </p>
        )}

        <div aria-live="polite" className="rounded-2xl border border-cyan-dim bg-linear-135 from-task-a to-task-b p-4">
          <p className="font-mono text-2xl font-semibold text-cyan">{formula}</p>
          <p className="mt-1 text-[0.9rem]">
            {!state.atoms.length
              ? t("statusEmpty")
              : over
                ? t("statusOver")
                : !connected
                  ? t("statusParts")
                  : free > 0
                    ? t("statusFree", { count: free })
                    : t("statusOk")}
          </p>
          {complete && found !== undefined && (
            <p className="mt-2 font-semibold">
              {found ? (
                <>
                  {t("found", { name: tm(`${found}.name`) })}{" "}
                  <Link href={`/molecules/${found}`} className="text-cyan hover:underline">
                    {t("open3d")} →
                  </Link>
                </>
              ) : (
                t("unknown")
              )}
            </p>
          )}
          {task && complete && found !== undefined && (
            <p className={cn("mt-2 font-semibold", found === task ? "text-good" : "text-pink")}>{found === task ? `✓ ${t("taskDone")}` : t("taskWrong")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
