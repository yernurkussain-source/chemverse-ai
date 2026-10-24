-- =====================================================================
-- 3D зертхана (docs/game/GAME_SPEC.md 3-бөлім): ойын прогресі — XP, қауіпсіздік ұпайы, орындалған тапсырмалар.
-- Ойын өзі жазады (кірген оқушы үшін); кірмеген қонақтың прогресі тек браузерде (localStorage).
-- Supabase → SQL Editor → New query → осы файлды қойып → Run. Қайта іске қосуға болады.
-- =====================================================================

create table if not exists public.lab_game_progress (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  xp integer not null default 0,
  safety smallint not null default 100,
  quests_done jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

-- Дерек дұрыс болсын: 22 тапсырманың ішінен ғана, XP = 100 × тапсырма саны, қауіпсіздік 0–100
alter table public.lab_game_progress drop constraint if exists lab_game_progress_quests_check;
alter table public.lab_game_progress add constraint lab_game_progress_quests_check check (
  jsonb_typeof(quests_done) = 'array'
  and quests_done <@ '["ppe","glass","twohand","neut","agcl","baso4","cuoh","filter","feoh","pop","o2","lime","co2","cu","ag","salt","amph","nocu","h2","titr","lamp","flame"]'::jsonb
);
alter table public.lab_game_progress drop constraint if exists lab_game_progress_xp_check;
alter table public.lab_game_progress add constraint lab_game_progress_xp_check check (xp = 100 * jsonb_array_length(quests_done));
alter table public.lab_game_progress drop constraint if exists lab_game_progress_safety_check;
alter table public.lab_game_progress add constraint lab_game_progress_safety_check check (safety between 0 and 100);

-- Жаңартылған уақыт — сервердің сағатымен
create or replace function public.lab_game_progress_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists lab_game_progress_touch on public.lab_game_progress;
create trigger lab_game_progress_touch
  before insert or update on public.lab_game_progress
  for each row execute function public.lab_game_progress_touch();

-- RLS: оқушы өзінікін ғана жазады; оқиды — өзі және өз сыныбының мұғалімі (кейін /teacher-де көрсету үшін)
alter table public.lab_game_progress enable row level security;
drop policy if exists "lab_game_progress: own or my students read" on public.lab_game_progress;
create policy "lab_game_progress: own or my students read" on public.lab_game_progress
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_my_student(user_id));
drop policy if exists "lab_game_progress: insert own" on public.lab_game_progress;
create policy "lab_game_progress: insert own" on public.lab_game_progress
  for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "lab_game_progress: update own" on public.lab_game_progress;
create policy "lab_game_progress: update own" on public.lab_game_progress
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
-- Өшіру саясаты жоқ: прогресті ешкім REST арқылы өшіре алмайды (профиль өшсе — бірге өшеді)
revoke delete on public.lab_game_progress from anon, authenticated;
revoke all on public.lab_game_progress from anon;

-- Тексеру: кесте бар, RLS қосулы
select relname, relrowsecurity from pg_class where relname = 'lab_game_progress';
