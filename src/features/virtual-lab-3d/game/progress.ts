import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Game } from "../core/context";
import { addLog } from "./journal";
import { QUESTS, renderXP, type QuestId } from "./quests";

/**
 * Ойын прогресі (docs/game/GAME_SPEC.md 3-бөлім): XP, қауіпсіздік ұпайы, орындалған тапсырмалар.
 * Кірген оқушы — Supabase-тегі lab_game_progress кестесі (RLS: тек өзі жазады, өзі мен мұғалімі оқиды).
 * Кірмеген қонақ — тек осы браузердің localStorage-ы.
 * Екеуі біріктірілмейді: мектепте бір компьютерді бірнеше оқушы қолданады, қонақтың тапсырмалары
 * кейін кірген басқа оқушыға өтіп кетпеуі керек.
 * Қауіпсіздік ұпайы әр кіргенде 100-ден басталады; сақталатыны — соңғы сессияның ұпайы.
 */
export type SavedProgress = { xp: number; safety: number; done: QuestId[] };

export const PROGRESS_KEY = "chemverse.labGame.v1";
const QUEST_ORDER = QUESTS.map((q) => q.id);

/** Сақталған деректі тексеру: белгісіз тапсырмалар мен қайталанулар алынып тасталады, XP = 100 × тапсырма саны */
export function sanitizeProgress(raw: unknown): SavedProgress | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { safety?: unknown; done?: unknown; quests_done?: unknown };
  const list = Array.isArray(r.done) ? r.done : Array.isArray(r.quests_done) ? r.quests_done : [];
  const done = QUEST_ORDER.filter((id) => list.includes(id));
  const safety = typeof r.safety === "number" && Number.isFinite(r.safety) ? Math.max(0, Math.min(100, Math.round(r.safety))) : 100;
  return { xp: done.length * 100, safety, done };
}

function readLocal(): SavedProgress | null {
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    return raw ? sanitizeProgress(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeLocal(p: SavedProgress): void {
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    // жеке терезе не толы жад — прогресс бұл жолы сақталмайды
  }
}

export type ProgressSync = { changed: () => void; flush: () => void; dispose: () => void };

/** Прогресті жүктеп, ойынға қолдану; өзгерген сайын (2 с кешігумен) және бет жабыларда сақтау */
export function startProgress(G: Game): ProgressSync {
  const { state } = G;
  const supabase = isSupabaseConfigured ? createClient() : null;
  let userId: string | null = null;
  let ready = false;
  let pending = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const snapshot = (): SavedProgress => {
    const done = QUEST_ORDER.filter((id) => state.done.has(id));
    return { xp: done.length * 100, safety: state.safety, done };
  };
  const save = () => {
    timer = null;
    pending = false;
    const p = snapshot();
    if (userId && supabase) {
      const row = { user_id: userId, xp: p.xp, safety: p.safety, quests_done: p.done };
      void supabase
        .from("lab_game_progress")
        .upsert(row)
        .then(({ error }) => {
          // shortcut: 20261101000000_lab_game_unknown.sql іске қосылмаған базада «unknown» тексерістен өтпейді (23514) —
          // қалған прогресс жоғалмауы үшін онсыз сақтаймыз; миграциядан кейін бұл тармақ іске қосылмайды
          if (error?.code !== "23514" || !p.done.includes("unknown")) return;
          const done = p.done.filter((id) => id !== "unknown");
          void supabase.from("lab_game_progress").upsert({ ...row, xp: done.length * 100, quests_done: done });
        });
    } else writeLocal(p);
  };

  const load = async () => {
    let saved: SavedProgress | null = null;
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      userId = data.session?.user.id ?? null;
      if (userId) {
        const { data: row, error } = await supabase.from("lab_game_progress").select("safety, quests_done").eq("user_id", userId).maybeSingle();
        if (!error) saved = sanitizeProgress(row);
      }
    }
    if (!userId) saved = readLocal();
    if (disposed) return;
    ready = true;
    if (saved?.done.length) {
      for (const id of saved.done) state.done.add(id);
      state.xp = state.done.size * 100;
      renderXP(G);
      addLog(G, "", G.tr("log.lab"), "", G.tr("log.restored", { count: saved.done.length }));
    }
    // Жүктеліп жатқанда орындалған тапсырма болса — енді сақтаймыз
    if (pending) save();
  };
  void load().catch(() => {
    ready = true;
  });

  const flush = () => {
    if (!ready || !pending) return;
    if (timer) clearTimeout(timer);
    save();
  };
  const onHide = () => {
    if (document.visibilityState === "hidden") flush();
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", flush);

  return {
    changed: () => {
      pending = true;
      if (!ready) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(save, 2000);
    },
    flush,
    dispose: () => {
      flush();
      disposed = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
    },
  };
}
