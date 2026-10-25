/**
 * 3D зертхананың 22 тапсырмасы (реті — ойындағыдай). Бөлек файлда: мұғалім беті (сервер) оларды
 * three.js-сіз оқи алуы үшін. Дерекқордағы тексеріс те осы тізіммен бірдей
 * (supabase/migrations/20261026000000_lab_game_progress.sql).
 */
export const QUEST_IDS = [
  "ppe",
  "glass",
  "twohand",
  "neut",
  "agcl",
  "baso4",
  "cuoh",
  "filter",
  "feoh",
  "pop",
  "o2",
  "lime",
  "co2",
  "cu",
  "ag",
  "salt",
  "amph",
  "nocu",
  "h2",
  "titr",
  "lamp",
  "flame",
] as const;

export type QuestId = (typeof QUEST_IDS)[number];
