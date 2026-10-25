-- =====================================================================
-- 3D зертхана: 23-тапсырма «Белгісіз зат X» (unknown). Тексеріс жаңа id-ді қабылдауы керек,
-- әйтпесе бұл тапсырманы орындаған оқушының прогресі сақталмайды.
-- Алдымен 20261026000000_lab_game_progress.sql іске қосылған болуы керек.
-- Supabase → SQL Editor → New query → осы файлды қойып → Run. Қайта іске қосуға болады.
-- =====================================================================
alter table public.lab_game_progress drop constraint if exists lab_game_progress_quests_check;
alter table public.lab_game_progress add constraint lab_game_progress_quests_check check (
  jsonb_typeof(quests_done) = 'array'
  and quests_done <@ '["ppe","glass","twohand","neut","agcl","baso4","cuoh","filter","feoh","pop","o2","lime","co2","cu","ag","salt","amph","nocu","h2","titr","lamp","flame","unknown"]'::jsonb
);

-- Тексеру: тексерістің жаңа мәтіні
select pg_get_constraintdef(oid) from pg_constraint where conname = 'lab_game_progress_quests_check';
