import { useSyncExternalStore } from "react";

/**
 * Ойын мен HUD арасындағы шағын дүкен (zustand орнына, ~30 жол).
 * Ойын циклі React-тан тыс жүреді, тек өзгерген кезде set() шақырады;
 * HUD компоненттері useStore() арқылы өзіне керек бөлігін ғана оқиды.
 */
export type Store<T> = {
  get: () => T;
  set: (patch: Partial<T>) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set: (patch) => {
      state = { ...state, ...patch };
      listeners.forEach((l) => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** select тұрақты мән қайтаруы керек (дүкендегі өрісті тікелей) — әйтпесе React қайта-қайта сызады */
export function useStore<T, S>(store: Store<T>, select: (state: T) => S): S {
  return useSyncExternalStore(
    store.subscribe,
    () => select(store.get()),
    () => select(store.get()),
  );
}

// ---------- HUD күйі ----------

/** key — пернесі (E / F) не телефондағы батырма аты; act жоқ болса key берілмейді */
export type PromptLine = { key?: string; text: string };
export type PromptView = { main: PromptLine | null; amount: string | null; alt: PromptLine | null };

/** Қарап тұрған ыдыстың карточкасы: тақырып, 3 өлшеуіш, белгілер жолдары (color — тұнбаның түсі) */
export type LookView = {
  title: string;
  sub: string;
  meters: { label: string; value: string; accent?: boolean }[];
  rows: { text: string; color?: string }[][];
};
export type HandView = { right: string; left: string; note: string | null };
export type ToastView = { id: number; text: string; bad: boolean };
/** cls: r — реакция, w — ескерту, q — тапсырма */
export type LogEntry = { id: number; cls: "" | "r" | "w" | "q"; time: string; who: string; eq: string; obs: string };

export type HudState = {
  phase: "loading" | "ready" | "error";
  /** Қош келдің терезесі: бірінші рет — «Кіру», «?» арқылы қайта ашылса — «Жалғастыру» */
  welcome: "first" | "again" | null;
  speed: number;
  prompt: PromptView | null;
  cross: boolean;
  look: LookView | null;
  hand: HandView | null;
  toast: ToastView | null;
  log: LogEntry[];
  xp: number;
  /** Деңгей нөмірі (0 — Лаборант … 4 — Профессор) */
  level: 0 | 1 | 2 | 3 | 4;
  safety: number;
  goggles: boolean;
  gloves: boolean;
  /** Орындалған тапсырмалардың id-лері */
  done: string[];
  drawer: boolean;
  quests: boolean;
  sound: boolean;
  /** «Поп» кезіндегі жарқыл: әр өсуі — бір жарқыл */
  flash: number;
};

export type HudStore = Store<HudState>;

/** Жаңа ойынның HUD күйі (phase-тен басқасы — ойын қайта құрылғанда осыған қайтады) */
export const initialHud = (): Omit<HudState, "phase"> => ({
  welcome: "first",
  speed: 1,
  prompt: null,
  cross: false,
  look: null,
  hand: null,
  toast: null,
  log: [],
  xp: 0,
  level: 0,
  safety: 100,
  goggles: false,
  gloves: false,
  done: [],
  drawer: false,
  quests: false,
  sound: true,
  flash: 0,
});

export const createHudStore = (): HudStore => createStore<HudState>({ phase: "loading", ...initialHud() });
