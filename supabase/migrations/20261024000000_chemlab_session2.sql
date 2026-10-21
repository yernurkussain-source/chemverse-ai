-- =====================================================================
-- ChemLab 2-сессия: «Қоспаны бөлу» (7-сынып) және «Атом құрылысы» (8-сынып) дайын
-- Алдымен 20261023000000_chemlab.sql іске қосылған болуы керек.
-- Supabase → SQL Editor → New query → осы файлды қойып → Run. Қайта іске қосуға болады.
-- =====================================================================
update public.lab_experiments set status = 'ready' where id in ('mixture-separation', 'atom-builder');

-- Тексеру: ready — 4 (titration, periodic-explorer, mixture-separation, atom-builder)
select id, status from public.lab_experiments where status = 'ready' order by id;
