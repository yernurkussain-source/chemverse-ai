-- =====================================================================
-- ChemLab 4-сессия: жаңа тәжірибелер дайын («Жақында» құлпы алынды).
-- molecule-builder — бар /molecules/builder бетіне сілтеме; precipitation — «Тұнба түзілуі» (9); metal-activity — «Белсенділік қатары» (9).
-- Алдымен 20261023000000_chemlab.sql іске қосылған болуы керек.
-- Supabase → SQL Editor → New query → осы файлды қойып → Run. Қайта іске қосуға болады.
-- =====================================================================
update public.lab_experiments
  set status = 'ready'
  where id in ('molecule-builder', 'precipitation', 'metal-activity');

-- Тексеру
select id, status from public.lab_experiments where status = 'ready' order by id;
