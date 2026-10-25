-- =====================================================================
-- Олимпиада: аралықты қайталау сатысы (OLYMPIAD_SPEC 6-бөлім: 3, 7, 21 күннен кейін).
-- review_step: 0 → келесі қайталау 3 күннен кейін, 1 → 7 күн, 2 → 21 күн.
-- Supabase → SQL Editor → New query → осы файлды қойып → Run. Қайта іске қосуға болады.
-- =====================================================================

alter table public.olympiad_mastery add column if not exists review_step smallint not null default 0;
alter table public.olympiad_mastery drop constraint if exists olympiad_mastery_review_step_check;
alter table public.olympiad_mastery add constraint olympiad_mastery_review_step_check check (review_step between 0 and 2);

-- Тексеру: баған бар
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'olympiad_mastery' order by ordinal_position;
