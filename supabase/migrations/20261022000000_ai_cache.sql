-- =====================================================================
-- 10-күн: AI мұғалімнің демо жауаптар кэші
-- Демо сұрақтарына жауап алдын ала жасалып сақталады (scripts/cache-ai.mjs) —
-- сахнада интернет баяу болса немесе AI лимиті бітсе де жауап бірден шығады.
-- Supabase → SQL Editor → New query → осы файлды қойып → Run. Қайта іске қосуға болады.
-- =====================================================================

create table if not exists public.ai_cache (
  id uuid primary key default gen_random_uuid(),
  question_key text not null,           -- қалыпқа келтірілген сұрақ (кіші әріп, тыныс белгілерсіз)
  locale text not null check (locale in ('kk', 'ru', 'en')),
  question text not null,
  answer text not null,
  sources jsonb not null default '[]',
  verified boolean not null default false, -- мұғалім тексерді ме
  created_at timestamptz not null default now(),
  unique (question_key, locale)
);

-- RLS қосулы, саясат жоқ: кэшті тек сервер оқиды және жазады
alter table public.ai_cache enable row level security;
