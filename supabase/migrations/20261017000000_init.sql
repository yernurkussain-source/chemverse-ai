-- =====================================================================
-- CHEMVERSE AI — деректер базасының бастапқы құрылымы (BLUEPRINT 8-бөлім)
-- Supabase → SQL Editor → New query → осы файлдың барлық мәтінін қойып → Run.
--
-- Қауіпсіздік ережелері:
--  * Барлық кестеде RLS (Row Level Security) қосулы.
--  * Тест жауаптары (question_options.is_correct) клиентке көрінбейді.
--  * Ұпай, XP, тест нәтижелерін тек сервер жазады (secret key арқылы).
--  * Мұғалім тек өз сыныбының деректерін көреді.
-- =====================================================================

create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Пайдаланушылар және сыныптар
-- ---------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'student' check (role in ('student', 'teacher', 'guest')),
  full_name text check (char_length(full_name) <= 80),
  school text check (char_length(school) <= 120),
  grade smallint check (grade between 7 and 11),
  locale text not null default 'kk' check (locale in ('kk', 'ru', 'en')),
  onboarded boolean not null default false,
  is_demo boolean not null default false,
  xp integer not null default 0,
  streak_days integer not null default 0,
  created_at timestamptz not null default now()
);

-- Жаңа пайдаланушы тіркелгенде профиль автоматты жасалады
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, locale)
  values (
    new.id,
    left(new.raw_user_meta_data ->> 'full_name', 80),
    case when new.raw_user_meta_data ->> 'locale' in ('kk', 'ru', 'en')
         then new.raw_user_meta_data ->> 'locale' else 'kk' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  grade smallint check (grade between 7 and 11),
  join_code text not null unique check (join_code ~ '^[0-9]{6}$'),
  created_at timestamptz not null default now()
);
create index classes_teacher_id_idx on public.classes (teacher_id);

create table public.class_members (
  class_id uuid not null references public.classes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);
create index class_members_user_id_idx on public.class_members (user_id);

-- RLS ішінде қайталанбау үшін көмекші функциялар (security definer — RLS-ті рекурсиясыз тексереді)
create function public.is_class_teacher(p_class_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.classes c where c.id = p_class_id and c.teacher_id = (select auth.uid()));
$$;

create function public.is_class_member(p_class_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.class_members m where m.class_id = p_class_id and m.user_id = (select auth.uid()));
$$;

-- Бұл оқушы менің (мұғалімнің) сыныптарымның бірінде ме?
create function public.is_my_student(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.class_members m
    join public.classes c on c.id = m.class_id
    where m.user_id = p_user_id and c.teacher_id = (select auth.uid())
  );
$$;

-- Оқушы 6 санды код арқылы сыныпқа қосылады
create function public.join_class(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_class_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated';
  end if;
  select id into v_class_id from public.classes where join_code = trim(p_code);
  if v_class_id is null then
    raise exception 'class_not_found';
  end if;
  insert into public.class_members (class_id, user_id)
  values (v_class_id, (select auth.uid()))
  on conflict do nothing;
  return v_class_id;
end;
$$;

-- Мұғалім жаңа сынып ашады (бірегей 6 санды код автоматты жасалады)
create function public.create_class(p_name text, p_grade smallint)
returns public.classes language plpgsql security definer set search_path = '' as $$
declare
  v_code text;
  v_class public.classes;
begin
  if not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'teacher') then
    raise exception 'not_a_teacher';
  end if;
  loop
    v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from public.classes where join_code = v_code);
  end loop;
  insert into public.classes (teacher_id, name, grade, join_code)
  values ((select auth.uid()), trim(p_name), p_grade, v_code)
  returning * into v_class;
  return v_class;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Оқу контенті (барлығына оқуға ашық)
-- ---------------------------------------------------------------------

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_kk text not null,
  title_ru text,
  title_en text,
  grade smallint check (grade between 7 and 11),
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  slug text not null unique,
  title_kk text not null,
  title_ru text,
  title_en text,
  content_kk text,
  content_ru text,
  content_en text,
  video_url text,
  molecule_ids text[] not null default '{}',
  position smallint not null default 0,
  created_at timestamptz not null default now()
);
create index lessons_topic_id_idx on public.lessons (topic_id);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  body_kk text not null,
  body_ru text,
  body_en text,
  -- Түсіндірме тек жауап бергеннен кейін сервер арқылы көрсетіледі
  explanation_kk text,
  explanation_ru text,
  explanation_en text,
  difficulty smallint not null default 1 check (difficulty between 1 and 3),
  exam_type text not null default 'unt' check (exam_type in ('unt', 'bbzhm', 'olympiad', 'practice')),
  created_at timestamptz not null default now()
);
create index questions_topic_id_idx on public.questions (topic_id);

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  label text not null check (label in ('A', 'B', 'C', 'D', 'E')),
  body_kk text not null,
  body_ru text,
  body_en text,
  is_correct boolean not null default false,
  unique (question_id, label)
);
create index question_options_question_id_idx on public.question_options (question_id);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_kk text not null,
  title_ru text,
  title_en text,
  exam_type text not null check (exam_type in ('unt', 'bbzhm', 'olympiad', 'practice')),
  duration_minutes smallint not null default 30,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.exam_questions (
  exam_id uuid not null references public.exams (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  position smallint not null default 0,
  primary key (exam_id, question_id)
);

create table public.molecules (
  id text primary key,                -- мысалы: 'h2o'
  formula text not null,
  name_kk text not null,
  name_ru text,
  name_en text,
  description_kk text,
  description_ru text,
  description_en text,
  sdf_url text,
  glb_url text,
  created_at timestamptz not null default now()
);

create table public.lab_experiments (
  id text primary key,                -- мысалы: 'titration'
  title_kk text not null,
  title_ru text,
  title_en text,
  safety_kk text,
  safety_ru text,
  safety_en text,
  created_at timestamptz not null default now()
);

create table public.achievements (
  id text primary key,                -- мысалы: 'first_test'
  title_kk text not null,
  title_ru text,
  title_en text,
  description_kk text,
  description_ru text,
  description_en text,
  xp_reward integer not null default 0
);

-- ---------------------------------------------------------------------
-- 3. Оқушының нәтижелері (тек сервер жазады, иесі мен мұғалімі көреді)
-- ---------------------------------------------------------------------

create table public.exam_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  exam_id uuid references public.exams (id) on delete set null,
  -- Тест басталған кездегі сұрақтар тізімі (кейін өзгерсе де нәтиже бұзылмайды)
  question_ids uuid[] not null default '{}',
  status text not null default 'in_progress' check (status in ('in_progress', 'finished', 'expired')),
  started_at timestamptz not null default now(),
  deadline_at timestamptz,
  finished_at timestamptz,
  score integer,
  max_score integer
);
create index exam_sessions_user_id_idx on public.exam_sessions (user_id);

create table public.student_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.exam_sessions (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  option_id uuid references public.question_options (id) on delete set null,
  is_correct boolean,
  answered_at timestamptz not null default now(),
  unique (session_id, question_id)
);
create index student_answers_session_id_idx on public.student_answers (session_id);

create table public.student_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  answered integer not null default 0,
  correct integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);
create index student_progress_topic_id_idx on public.student_progress (topic_id);

create table public.lab_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  experiment_id text not null references public.lab_experiments (id) on delete cascade,
  result jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index lab_attempts_user_id_idx on public.lab_attempts (user_id);

create table public.user_achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id text not null references public.achievements (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- ---------------------------------------------------------------------
-- 4. AI (тек иесі көреді; AI-ға аты-жөні жіберілмейді)
-- ---------------------------------------------------------------------

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);
create index ai_conversations_user_id_idx on public.ai_conversations (user_id);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb,
  created_at timestamptz not null default now()
);
create index ai_messages_conversation_id_idx on public.ai_messages (conversation_id);

create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  image_path text,
  recognized_text text,
  ai_answer text,
  created_at timestamptz not null default now()
);
create index scans_user_id_idx on public.scans (user_id);

-- RAG білім қоры. Вектор өлшемі 6-күні таңдалған embedding моделіне қарай өзгеруі мүмкін.
create table public.rag_documents (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  chunk text not null,
  language text not null default 'kk' check (language in ('kk', 'ru', 'en')),
  embedding extensions.vector(1536),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. Мұғалім құралдары: тапсырма, ҚМЖ, QR, Live сабақ
-- ---------------------------------------------------------------------

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  exam_id uuid references public.exams (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete cascade,
  title text,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  check (exam_id is not null or lesson_id is not null)
);
create index assignments_class_id_idx on public.assignments (class_id);

create table public.lesson_plans (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  topic text not null,
  grade smallint check (grade between 7 and 11),
  content_json jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index lesson_plans_teacher_id_idx on public.lesson_plans (teacher_id);

create table public.qr_resources (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  type text not null check (type in ('lesson', 'ar', 'element', 'lab', 'join', 'assignment')),
  target text not null,
  created_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz,
  scan_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index qr_resources_created_by_idx on public.qr_resources (created_by);

create table public.qr_scans (
  id uuid primary key default gen_random_uuid(),
  qr_id uuid not null references public.qr_resources (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  device text,
  scanned_at timestamptz not null default now()
);
create index qr_scans_qr_id_idx on public.qr_scans (qr_id);

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  exam_id uuid references public.exams (id) on delete set null,
  code text not null unique check (code ~ '^[0-9]{6}$'),
  status text not null default 'waiting' check (status in ('waiting', 'running', 'finished')),
  current_question integer not null default 0,
  created_at timestamptz not null default now()
);
create index live_sessions_teacher_id_idx on public.live_sessions (teacher_id);

create table public.live_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  participant_name text not null check (char_length(participant_name) <= 30),
  question_id uuid not null references public.questions (id) on delete cascade,
  answer text not null,
  ms integer,
  created_at timestamptz not null default now()
);
create index live_responses_session_id_idx on public.live_responses (session_id);

-- =====================================================================
-- 6. RLS ережелері
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.topics enable row level security;
alter table public.lessons enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.molecules enable row level security;
alter table public.lab_experiments enable row level security;
alter table public.achievements enable row level security;
alter table public.exam_sessions enable row level security;
alter table public.student_answers enable row level security;
alter table public.student_progress enable row level security;
alter table public.lab_attempts enable row level security;
alter table public.user_achievements enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.scans enable row level security;
alter table public.rag_documents enable row level security;
alter table public.assignments enable row level security;
alter table public.lesson_plans enable row level security;
alter table public.qr_resources enable row level security;
alter table public.qr_scans enable row level security;
alter table public.live_sessions enable row level security;
alter table public.live_responses enable row level security;

-- Профиль: өзін көреді/өзгертеді; мұғалім өз оқушыларын көреді
create policy "profiles: read own or my students" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_my_student(id));
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Сыныптар: мұғалім өз сыныптарын басқарады, оқушы өз сыныбын көреді
create policy "classes: teacher or member reads" on public.classes
  for select to authenticated
  using (teacher_id = (select auth.uid()) or public.is_class_member(id));
create policy "classes: teacher updates own" on public.classes
  for update to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy "classes: teacher deletes own" on public.classes
  for delete to authenticated
  using (teacher_id = (select auth.uid()));

create policy "class_members: self or teacher reads" on public.class_members
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_class_teacher(class_id));
create policy "class_members: leave or teacher removes" on public.class_members
  for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_class_teacher(class_id));

-- Оқу контенті: барлығына оқуға ашық (қонақтарға да), жазу — тек сервер
create policy "topics: public read" on public.topics for select to anon, authenticated using (true);
create policy "lessons: public read" on public.lessons for select to anon, authenticated using (true);
create policy "questions: public read" on public.questions for select to anon, authenticated using (true);
create policy "question_options: public read" on public.question_options for select to anon, authenticated using (true);
create policy "exams: public read" on public.exams for select to anon, authenticated using (true);
create policy "exam_questions: public read" on public.exam_questions for select to anon, authenticated using (true);
create policy "molecules: public read" on public.molecules for select to anon, authenticated using (true);
create policy "lab_experiments: public read" on public.lab_experiments for select to anon, authenticated using (true);
create policy "achievements: public read" on public.achievements for select to anon, authenticated using (true);

-- Нәтижелер: иесі және оның мұғалімі оқиды (жазу — тек сервер)
create policy "exam_sessions: own or my students" on public.exam_sessions
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_my_student(user_id));
create policy "student_answers: own or my students" on public.student_answers
  for select to authenticated
  using (exists (
    select 1 from public.exam_sessions s
    where s.id = session_id and (s.user_id = (select auth.uid()) or public.is_my_student(s.user_id))
  ));
create policy "student_progress: own or my students" on public.student_progress
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_my_student(user_id));
create policy "user_achievements: own or my students" on public.user_achievements
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_my_student(user_id));

create policy "lab_attempts: own or my students read" on public.lab_attempts
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_my_student(user_id));
create policy "lab_attempts: insert own" on public.lab_attempts
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- AI: тек иесі
create policy "ai_conversations: own" on public.ai_conversations
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "ai_messages: own read" on public.ai_messages
  for select to authenticated
  using (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = (select auth.uid())));
create policy "scans: own" on public.scans
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- rag_documents: саясат жоқ — тек сервер (secret key) қолданады

-- Мұғалім құралдары
create policy "assignments: teacher manages" on public.assignments
  for all to authenticated
  using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));
create policy "assignments: members read" on public.assignments
  for select to authenticated
  using (public.is_class_member(class_id));

create policy "lesson_plans: own" on public.lesson_plans
  for all to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));

create policy "qr_resources: creator reads" on public.qr_resources
  for select to authenticated
  using (created_by = (select auth.uid()));
create policy "qr_scans: creator reads" on public.qr_scans
  for select to authenticated
  using (exists (select 1 from public.qr_resources q where q.id = qr_id and q.created_by = (select auth.uid())));

create policy "live_sessions: teacher manages" on public.live_sessions
  for all to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy "live_responses: teacher reads" on public.live_responses
  for select to authenticated
  using (exists (select 1 from public.live_sessions l where l.id = session_id and l.teacher_id = (select auth.uid())));

-- =====================================================================
-- 7. Бағандар деңгейіндегі қорғаныс (RLS тек жолдарды шектейді)
-- =====================================================================

-- Дұрыс жауап (is_correct) клиентке ешқашан жіберілмейді
revoke select on public.question_options from anon, authenticated;
grant select (id, question_id, label, body_kk, body_ru, body_en) on public.question_options to anon, authenticated;

-- Түсіндірме де тек жауаптан кейін сервер арқылы
revoke select on public.questions from anon, authenticated;
grant select (id, topic_id, body_kk, body_ru, body_en, difficulty, exam_type, created_at) on public.questions to anon, authenticated;

-- Профильде XP, серия, демо белгісін пайдаланушы өзі өзгерте алмайды
revoke update on public.profiles from anon, authenticated;
grant update (role, full_name, school, grade, locale, onboarded) on public.profiles to authenticated;

-- Мұғалім рөлін тек өзі таңдайды, «guest» және басқа мәндер тыйым салынған
create function public.guard_profile_role()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role and new.role not in ('student', 'teacher') then
    raise exception 'invalid_role';
  end if;
  return new;
end;
$$;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- Сынып пен мүшелікті тек функциялар арқылы жасауға болады
revoke insert on public.classes, public.class_members from anon, authenticated;
revoke execute on function public.join_class(text), public.create_class(text, smallint) from public, anon;
grant execute on function public.join_class(text), public.create_class(text, smallint) to authenticated;
