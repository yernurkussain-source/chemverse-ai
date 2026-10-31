-- ҰБТ-2026 пішімі (ҰТО спецификациясы, химия): 25 бір жауапты + 1 контекст (5 сұрақ)
-- + 5 сәйкестендіру + 5 бір немесе бірнеше дұрыс жауапты тапсырма, барлығы 50 балл.
-- Бұрынғы сұрақтар мен сессиялар өзгермейді: kind әдепкі 'single', slot әдепкі 0.

-- Контекст: бірнеше сұраққа ортақ мәтін (бәріне оқуға ашық)
create table public.question_contexts (
  id uuid primary key default gen_random_uuid(),
  title_kk text not null,
  title_ru text,
  title_en text,
  body_kk text not null,
  body_ru text,
  body_en text
);
alter table public.question_contexts enable row level security;
create policy "question_contexts: public read" on public.question_contexts for select to anon, authenticated using (true);

alter table public.questions
  add column kind text not null default 'single' check (kind in ('single', 'multiple', 'matching')),
  add column context_id uuid references public.question_contexts (id) on delete set null,
  -- Сәйкестендірудің сол жақ жолдары (A, B): әр жолға question_options.slot = 0, 1
  add column items_kk text[],
  add column items_ru text[],
  add column items_en text[];

-- Бірнеше жауапты тапсырмада 6 нұсқа (A–F); сәйкестендіруде әр жолдың өз нұсқалары (A–D)
alter table public.question_options
  add column slot smallint not null default 0,
  drop constraint question_options_label_check,
  add constraint question_options_label_check check (label in ('A', 'B', 'C', 'D', 'E', 'F')),
  drop constraint question_options_question_id_label_key,
  add constraint question_options_question_id_slot_label_key unique (question_id, slot, label);

-- Бірнеше жауап / сәйкестендіру: таңдалған нұсқалар (бір жауаптыда бұрынғыдай option_id)
alter table public.student_answers add column option_ids uuid[];

-- Жаңа ашық бағандар (is_correct және түсіндірме бұрынғыдай жасырын)
grant select (kind, context_id, items_kk, items_ru, items_en) on public.questions to anon, authenticated;
grant select (slot) on public.question_options to anon, authenticated;
