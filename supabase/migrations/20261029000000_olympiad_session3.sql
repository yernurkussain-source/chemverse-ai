-- =====================================================================
-- Олимпиада, 3-сессия: ашық жауаптар (AI алдын ала бағасы + мұғалім бағасы) және ғылыми жоба файлдары.
-- Supabase → SQL Editor → New query → осы файлды қойып → Run. Қайта іске қосуға болады.
-- =====================================================================

-- Ашық жауап (OLYMPIAD_SPEC 4-бөлім, open): AI рубрика бойынша алдын ала ұпай ұсынады, соңғы бағаны мұғалім қояды
create table if not exists public.olympiad_open_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  problem_id text not null references public.olympiad_problems (id) on delete cascade,
  answer text not null check (char_length(answer) between 1 and 4000),
  max_score numeric not null check (max_score > 0),
  ai_score numeric,
  ai_feedback text,
  teacher_score numeric,
  teacher_comment text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (teacher_score is null or teacher_score between 0 and max_score)
);
create index if not exists olympiad_open_answers_user_idx on public.olympiad_open_answers (user_id, created_at desc);

-- RLS: оқушы өзінікін, мұғалім өз оқушыларынікін оқиды; жазу тек сервер (баға клиентке сенбейді)
alter table public.olympiad_open_answers enable row level security;
drop policy if exists "olympiad_open_answers: own or my students" on public.olympiad_open_answers;
create policy "olympiad_open_answers: own or my students" on public.olympiad_open_answers
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_my_student(user_id));

-- Ғылыми жоба файлдары: жеке bucket (саясат жоқ — жүктеу мен көру тек сервер берген қолтаңбалы сілтеме арқылы)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'olympiad-projects', 'olympiad-projects', false, 10485760,
  array[
    'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/csv', 'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Тексеру: кесте мен bucket бар
select relname, relrowsecurity from pg_class where relname = 'olympiad_open_answers';
select id, public, file_size_limit from storage.buckets where id = 'olympiad-projects';
