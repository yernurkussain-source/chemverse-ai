-- =====================================================================
-- Олимпиада, 4-сессия: мұғалім құралдары — күнтізбе (сабақ уақыты), журнал, сынып теориясы, олимпиада тапсырмалары.
-- Supabase → SQL Editor → New query → осы файлды қойып → Run. Қайта іске қосуға болады.
-- =====================================================================

-- Күнтізбе: сабақ уақыты; бір сыныпта әр тақырып бір рет (қайта таратқанда жол жаңартылады, журнал сақталады)
alter table public.olympiad_sessions add column if not exists lesson_time time;
create unique index if not exists olympiad_sessions_class_topic_idx on public.olympiad_sessions (class_id, topic);

-- Журнал: қатысу және үй тапсырмасы (сабақтың үй тапсырмасы мәтіні — olympiad_sessions.note)
create table if not exists public.olympiad_journal (
  session_id uuid not null references public.olympiad_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  present boolean not null default false,
  homework boolean not null default false,
  primary key (session_id, user_id)
);
alter table public.olympiad_journal enable row level security;
drop policy if exists "olympiad_journal: class teacher manages" on public.olympiad_journal;
create policy "olympiad_journal: class teacher manages" on public.olympiad_journal
  for all to authenticated
  using (exists (select 1 from public.olympiad_sessions s where s.id = session_id and public.is_class_teacher(s.class_id)))
  with check (exists (select 1 from public.olympiad_sessions s where s.id = session_id and public.is_class_teacher(s.class_id)));
drop policy if exists "olympiad_journal: own read" on public.olympiad_journal;
create policy "olympiad_journal: own read" on public.olympiad_journal
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Тақырып теориясы (Markdown + KaTeX): әр сыныптың мұғалімі өз үйірмесіне жазады (ортақ мазмұнды ешкім бұза алмайды)
create table if not exists public.olympiad_topic_notes (
  class_id uuid not null references public.classes (id) on delete cascade,
  topic int not null references public.olympiad_topics (n),
  theory text not null check (char_length(theory) <= 8000),
  updated_at timestamptz not null default now(),
  primary key (class_id, topic)
);
alter table public.olympiad_topic_notes enable row level security;
drop policy if exists "olympiad_topic_notes: teacher manages" on public.olympiad_topic_notes;
create policy "olympiad_topic_notes: teacher manages" on public.olympiad_topic_notes
  for all to authenticated
  using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));
drop policy if exists "olympiad_topic_notes: members read" on public.olympiad_topic_notes;
create policy "olympiad_topic_notes: members read" on public.olympiad_topic_notes
  for select to authenticated
  using (public.is_class_member(class_id));

-- Олимпиада тапсырмасы: { topic, items: [{ problemId } | { generator, seed }] } (RLS бұрынғыдай: мұғалім басқарады, мүшелер оқиды)
alter table public.assignments add column if not exists olympiad jsonb;
alter table public.assignments drop constraint if exists assignments_target_check;
alter table public.assignments add constraint assignments_target_check
  check (exam_id is not null or lesson_id is not null or experiment_id is not null or olympiad is not null);

-- Мұғалім қосқан есептер (author_id) — іздеу жылдам болуы үшін
create index if not exists olympiad_problems_author_idx on public.olympiad_problems (author_id);

-- Тексеру
select relname, relrowsecurity from pg_class where relname in ('olympiad_journal', 'olympiad_topic_notes');
