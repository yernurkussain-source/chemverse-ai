-- =====================================================================
-- «Олимпиадаға дайындық» бөлімі (docs/olympiad/OLYMPIAD_SPEC.md 10-бөлім): тақырыптар, есептер банкі,
-- әрекеттер, меңгеру деңгейі, үйірме күнтізбесі, сынақ олимпиадалар, ғылыми жобалар.
-- Supabase → SQL Editor → New query → осы файлды қойып → Run. Қайта іске қосуға болады.
-- Содан кейін мазмұнды толтыру: npm run seed:olympiad (TOPICS.json + PROBLEMS.json).
-- =====================================================================

create table if not exists public.olympiad_topics (
  n int primary key,
  title text not null,
  block text not null,
  data jsonb not null
);

create table if not exists public.olympiad_problems (
  id text primary key,
  topic int not null references public.olympiad_topics (n),
  level int not null check (level between 1 and 3),
  type text not null check (type in ('numeric', 'mcq', 'balance', 'econf', 'open', 'chain', 'structure')),
  body jsonb not null,  -- толық есеп, ДҰРЫС ЖАУАБЫМЕН — сондықтан клиентке саясат жоқ
  author_id uuid references public.profiles (id) on delete set null,
  status text not null default 'published' check (status in ('draft', 'published', 'hidden')),
  created_at timestamptz not null default now()
);
create index if not exists olympiad_problems_topic_idx on public.olympiad_problems (topic);

-- problem_id: банк есебінің id-і не генератор id-і (сондықтан сыртқы кілтсіз)
create table if not exists public.olympiad_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  problem_id text not null,
  seed int,
  answer jsonb,
  correct boolean not null,
  hints_used int not null default 0,
  score numeric,
  created_at timestamptz not null default now()
);
create index if not exists olympiad_attempts_user_idx on public.olympiad_attempts (user_id, created_at desc);

create table if not exists public.olympiad_mastery (
  user_id uuid not null references public.profiles (id) on delete cascade,
  topic int not null references public.olympiad_topics (n),
  level numeric not null default 0 check (level between 0 and 100),
  next_review date,
  primary key (user_id, topic)
);

create table if not exists public.olympiad_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  topic int references public.olympiad_topics (n),
  date date not null,
  note text
);
create index if not exists olympiad_sessions_class_idx on public.olympiad_sessions (class_id, date);

create table if not exists public.olympiad_mocks (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null,
  config jsonb not null default '{}',
  starts_at timestamptz,
  duration_min int check (duration_min > 0)
);
create index if not exists olympiad_mocks_class_idx on public.olympiad_mocks (class_id);

create table if not exists public.olympiad_mock_results (
  mock_id uuid not null references public.olympiad_mocks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  score numeric,
  details jsonb,
  primary key (mock_id, user_id)
);

create table if not exists public.olympiad_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  title text not null,
  body jsonb not null default '{}',
  files text[] not null default '{}',
  score jsonb,
  status text not null default 'draft'
);
create index if not exists olympiad_projects_user_idx on public.olympiad_projects (user_id);

-- ---------------------------------------------------------------------
-- RLS. Жазу көбіне тек серверде (secret key): дұрыс/қате белгісін, ұпайды, бағаны клиент өзі қоя алмайды.
-- ---------------------------------------------------------------------
alter table public.olympiad_topics enable row level security;
alter table public.olympiad_problems enable row level security;
alter table public.olympiad_attempts enable row level security;
alter table public.olympiad_mastery enable row level security;
alter table public.olympiad_sessions enable row level security;
alter table public.olympiad_mocks enable row level security;
alter table public.olympiad_mock_results enable row level security;
alter table public.olympiad_projects enable row level security;

-- Тақырыптар: барлығына оқуға ашық
drop policy if exists "olympiad_topics: public read" on public.olympiad_topics;
create policy "olympiad_topics: public read" on public.olympiad_topics
  for select to anon, authenticated using (true);

-- olympiad_problems: саясат жоқ — тек сервер оқиды (шартын жауапсыз береді, жауапты /api/olympiad/check тексереді)

-- Әрекеттер мен меңгеру: өзі және өз мұғалімі оқиды
drop policy if exists "olympiad_attempts: own or my students" on public.olympiad_attempts;
create policy "olympiad_attempts: own or my students" on public.olympiad_attempts
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_my_student(user_id));
drop policy if exists "olympiad_mastery: own or my students" on public.olympiad_mastery;
create policy "olympiad_mastery: own or my students" on public.olympiad_mastery
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_my_student(user_id));

-- Күнтізбе және сынақ олимпиадалар: сынып мұғалімі басқарады, сынып мүшелері оқиды
drop policy if exists "olympiad_sessions: teacher manages" on public.olympiad_sessions;
create policy "olympiad_sessions: teacher manages" on public.olympiad_sessions
  for all to authenticated
  using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));
drop policy if exists "olympiad_sessions: members read" on public.olympiad_sessions;
create policy "olympiad_sessions: members read" on public.olympiad_sessions
  for select to authenticated
  using (public.is_class_member(class_id));
drop policy if exists "olympiad_mocks: teacher manages" on public.olympiad_mocks;
create policy "olympiad_mocks: teacher manages" on public.olympiad_mocks
  for all to authenticated
  using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));
drop policy if exists "olympiad_mocks: members read" on public.olympiad_mocks;
create policy "olympiad_mocks: members read" on public.olympiad_mocks
  for select to authenticated
  using (public.is_class_member(class_id));

-- Сынақ нәтижесі: өзі және сол сыныптың мұғалімі оқиды
drop policy if exists "olympiad_mock_results: own or class teacher" on public.olympiad_mock_results;
create policy "olympiad_mock_results: own or class teacher" on public.olympiad_mock_results
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.olympiad_mocks m where m.id = mock_id and public.is_class_teacher(m.class_id))
  );

-- Жобалар: өзі және сынып мұғалімі оқиды (жазу — сервер арқылы, оқушы өз бағасын қоя алмауы үшін)
drop policy if exists "olympiad_projects: own or class teacher" on public.olympiad_projects;
create policy "olympiad_projects: own or class teacher" on public.olympiad_projects
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_class_teacher(class_id));

-- Тексеру: 8 кесте бар, RLS қосулы
select relname, relrowsecurity from pg_class where relname like 'olympiad\_%' and relkind = 'r' order by relname;
