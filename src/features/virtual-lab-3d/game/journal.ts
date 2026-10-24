import * as THREE from "three";
import { setEngineEmitter, type EngineEvent, type Vessel } from "@/features/chem-engine";
import type { Game } from "../core/context";
import { observationKey, TRANSLATED_EQUATIONS } from "./i18n";
import type { LogEntry } from "./store";

let nextId = 0;
const pad = (n: number) => String(n).padStart(2, "0");

/** Зертхана журналына жазу (ең жаңасы — жоғарыда, ең көбі 120 жазба) */
export function addLog(G: Game, cls: LogEntry["cls"], who: string, eq: string, obs: string): void {
  const t = G.state.gameT;
  const entry: LogEntry = { id: ++nextId, cls, time: `${pad(Math.floor(t / 60))}:${pad(Math.floor(t % 60))}`, who, eq, obs };
  G.store.set({ log: [entry, ...G.store.get().log].slice(0, 120) });
}

/** Қысқа хабарлама (HUD оны 3,4 с-тан кейін өзі жасырады) */
export function toast(G: Game, text: string, bad = false): void {
  G.store.set({ toast: { id: ++nextId, text, bad } });
}

const tmp = new THREE.Vector3();
/** Ойыншы 2,4 м-ден жақын тұр ма (тек жақындағы реакция туралы хабарлама шығады) */
export function nearPlayer(G: Game, g: THREE.Object3D): boolean {
  g.getWorldPosition(tmp);
  return Math.hypot(tmp.x - G.player.x, tmp.z - G.player.z) < 2.4;
}

/** Қозғалтқыш оқиғасының бақылау мәтіні (аударылған) */
export function observationText(G: Game, key: string, event: EngineEvent): string {
  if (key === "dry") {
    const salts = event.salts ?? [];
    if (!salts.length) return G.tr("rx.dryNone");
    return G.tr("rx.dry", { salts: salts.map((s) => `${s.f} ${G.fmt(s.g, 2)} ${G.tr("units.g")}`).join(", ") });
  }
  return G.tr(`rx.${observationKey(key)}`);
}

/**
 * Қозғалтқыш оқиғаларын журналға жіберу. Бір ыдыстағы бір реакция 5 с ішінде қайталанса жазылмайды
 * (ұзақ жүретін реакция журналды толтырмауы үшін — прототиптегідей).
 */
export function installEngineEmitter(G: Game): void {
  const last = new WeakMap<Vessel, Record<string, number>>();
  setEngineEmitter((v, key, event) => {
    let seen = last.get(v);
    if (!seen) {
      seen = {};
      last.set(v, seen);
    }
    const now = G.state.gameT;
    const prev = seen[key];
    seen[key] = now;
    if (prev != null && now - prev < 5) return;
    const obs = observationText(G, key, event);
    const eq = TRANSLATED_EQUATIONS.has(key) ? G.tr(`rxEq.${key}`) : event.eq;
    addLog(G, "r", v.name, eq, obs);
    const o = G.vesselOf.get(v);
    if (o && nearPlayer(G, o.g)) toast(G, obs);
  });
}
