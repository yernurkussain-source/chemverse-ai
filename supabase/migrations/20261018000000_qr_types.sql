-- =====================================================================
-- 5-күн: QR түрлерін кеңейту (3D молекула және тест QR-ы қосылды)
-- Supabase → SQL Editor → New query → осы файлды қойып → Run. Қайта іске қосуға болады.
-- =====================================================================

alter table public.qr_resources drop constraint if exists qr_resources_type_check;
alter table public.qr_resources add constraint qr_resources_type_check
  check (type in ('lesson', 'ar', 'molecule', 'element', 'lab', 'exam', 'join', 'assignment'));
