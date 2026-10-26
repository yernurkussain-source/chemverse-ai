-- =====================================================================
-- ChemLab 5-сессия: барлық сыныптың қалған тәжірибелері дайын («Жақында» құлпы алынды).
-- Алдымен 20261023000000_chemlab.sql іске қосылған болуы керек.
-- Supabase → SQL Editor → New query → осы файлды қойып → Run. Қайта іске қосуға болады.
-- =====================================================================
update public.lab_experiments
  set status = 'ready'
  where id in ('lab-equipment', 'lab-safety', 'pure-vs-mixture', 'phys-chem-phenomena', 'substance-properties', 'measurements',
    'reaction-signs', 'metals-nonmetals',
    'solubility', 'mass-fraction',
    'equilibrium', 'redox', 'dissociation', 'galvanic-cell', 'organic-builder', 'organic-properties');

-- Тексеру
select id, status from public.lab_experiments where status = 'ready' order by id;
