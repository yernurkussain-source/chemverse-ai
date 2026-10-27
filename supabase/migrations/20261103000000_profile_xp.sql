-- =====================================================================
-- Профиль: XP және «күн қатарынан» (streak) нақты жұмыс істеуі.
-- XP енді ҰБТ тестінен бөлек ChemLab тәжірибелерінен (ұпай өскенде) және олимпиада есептерінен қосылады.
-- award_xp атомарлы: бір мезгілде бірнеше нәтиже келсе де XP жоғалмайды.
-- Supabase → SQL Editor → New query → осы файлды қойып → Run. Қайта іске қосуға болады.
-- =====================================================================
alter table public.profiles add column if not exists last_active_on date;

-- Күн қатарынан: бүгін белсенді болса — өзгермейді, кеше болса — +1, әйтпесе 1-ден басталады (Алматы уақыты)
create or replace function public.award_xp(p_user uuid, p_amount integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Asia/Almaty')::date;
begin
  update public.profiles
  set xp = xp + greatest(p_amount, 0),
      streak_days = case
        when last_active_on = today then greatest(streak_days, 1)
        when last_active_on = today - 1 then streak_days + 1
        else 1
      end,
      last_active_on = today
  where id = p_user;
end;
$$;

-- Тек сервер (service_role) шақырады: оқушы өзіне XP қоса алмайды
revoke all on function public.award_xp(uuid, integer) from public, anon, authenticated;
grant execute on function public.award_xp(uuid, integer) to service_role;

-- Тексеру
select proname from pg_proc where proname = 'award_xp';
