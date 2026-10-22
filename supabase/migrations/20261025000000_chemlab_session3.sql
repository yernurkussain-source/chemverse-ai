-- =====================================================================
-- ChemLab 3-сессия: «Индикатор зертханасы» (9) мен «Реакция жылдамдығы» (9–10) дайын;
-- мұғалім тәжірибені сыныпқа тапсырма ретінде бере алады (/teacher/labs).
-- Алдымен 20261023000000_chemlab.sql іске қосылған болуы керек.
-- Supabase → SQL Editor → New query → осы файлды қойып → Run. Қайта іске қосуға болады.
-- =====================================================================
update public.lab_experiments
  set status = 'ready'
  where id in ('mixture-separation', 'atom-builder', 'indicator-lab', 'reaction-rate');

-- Тапсырма енді тәжірибеге де байланады (тест не сабақ не ChemLab тәжірибесі)
alter table public.assignments
  add column if not exists experiment_id text references public.lab_experiments (id) on delete cascade;
alter table public.assignments drop constraint if exists assignments_check;
alter table public.assignments drop constraint if exists assignments_target_check;
alter table public.assignments add constraint assignments_target_check
  check (exam_id is not null or lesson_id is not null or experiment_id is not null);

-- RLS өзгермейді: «assignments: teacher manages» (тек сыныптың мұғалімі), «members read» (сынып оқушылары)

-- Тексеру: ready — 6
select id, status from public.lab_experiments where status = 'ready' order by id;
