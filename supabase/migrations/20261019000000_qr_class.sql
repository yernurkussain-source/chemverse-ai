-- =====================================================================
-- QR қай сыныпқа арналғаны (міндетті емес: бос болса — барлық сыныпқа ортақ)
-- Supabase → SQL Editor → New query → осы файлды қойып → Run. Қайта іске қосуға болады.
-- =====================================================================

alter table public.qr_resources
  add column if not exists class_id uuid references public.classes (id) on delete set null;
create index if not exists qr_resources_class_id_idx on public.qr_resources (class_id);
