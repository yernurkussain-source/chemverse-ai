-- =====================================================================
-- 8-күн: Live сабақ — кезеңдер, таймер, қатысушылар, ұпай
-- Supabase → SQL Editor → New query → осы файлды қойып → Run. Қайта іске қосуға болады.
-- =====================================================================

-- Сессия: сұрақтар тізімі, кезең (күту → сұрақ → жауапты көрсету → аяқталды), таймер
alter table public.live_sessions
  add column if not exists question_ids uuid[] not null default '{}',
  add column if not exists phase text not null default 'lobby',
  add column if not exists question_started_at timestamptz,
  add column if not exists seconds_per_question smallint not null default 20,
  add column if not exists finished_at timestamptz;
alter table public.live_sessions drop constraint if exists live_sessions_phase_check;
alter table public.live_sessions add constraint live_sessions_phase_check
  check (phase in ('lobby', 'question', 'reveal', 'finished'));

-- Қатысушылар: тіркеусіз, тек лақап атымен (бір сессияда аттар қайталанбайды)
create table if not exists public.live_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  score integer not null default 0,
  created_at timestamptz not null default now(),
  unique (session_id, name)
);
create index if not exists live_participants_session_id_idx on public.live_participants (session_id);

-- Жауап: кім, дұрыс па, неше ұпай. Бір қатысушы бір сұраққа бір рет жауап береді
alter table public.live_responses
  add column if not exists participant_id uuid references public.live_participants (id) on delete cascade,
  add column if not exists is_correct boolean,
  add column if not exists points integer not null default 0;
create unique index if not exists live_responses_participant_question_idx
  on public.live_responses (participant_id, question_id);

-- RLS: қатысушыларды тек сессияның мұғалімі оқиды; жазуды тек сервер жасайды (secret key)
alter table public.live_participants enable row level security;
drop policy if exists "live_participants: teacher reads" on public.live_participants;
create policy "live_participants: teacher reads" on public.live_participants
  for select to authenticated
  using (exists (select 1 from public.live_sessions l where l.id = session_id and l.teacher_id = (select auth.uid())));
