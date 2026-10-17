-- =====================================================================
-- CHEMVERSE AI — бастапқы деректер: 5 тақырып, 50 сұрақ, молекулалар, зертхана, бейдждер
-- Миграциядан (migrations/..._init.sql) КЕЙІН SQL Editor-да іске қосыңыз.
-- Қайта іске қосуға болады: сұрақтар өшіріліп, қайта жазылады.
-- ⚠️ Сұрақтарды мұғалім тексеруі керек.
-- =====================================================================

-- ---------- Тақырыптар ----------
insert into public.topics (slug, title_kk, title_ru, title_en, grade, position) values
  ('atom-structure',  'Атом құрылысы',                          'Строение атома',                         'Atomic structure',              8,  1),
  ('chemical-bonds',  'Химиялық байланыс',                      'Химическая связь',                       'Chemical bonds',                8,  2),
  ('solutions-ph',    'Ерітінділер және pH',                    'Растворы и pH',                          'Solutions and pH',              8,  3),
  ('stoichiometry',   'Зат мөлшері және химиялық реакциялар',   'Количество вещества и реакции',          'Amount of substance and reactions', 9, 4),
  ('organic-basics',  'Органикалық химия негіздері',            'Основы органической химии',              'Basics of organic chemistry',   10, 5)
on conflict (slug) do update set
  title_kk = excluded.title_kk, title_ru = excluded.title_ru, title_en = excluded.title_en,
  grade = excluded.grade, position = excluded.position;

-- ---------- Сұрақтар ----------
-- Қайта іске қосқанда қайталанбауы үшін осы тақырыптардың сұрақтарын тазалаймыз
delete from public.questions
where topic_id in (select id from public.topics where slug in
  ('atom-structure', 'chemical-bonds', 'solutions-ph', 'stoichiometry', 'organic-basics'));

-- Уақытша көмекші функция: бір сұрақ + 4 жауап (correct — дұрыс жауаптың әрпі)
create or replace function pg_temp.q(
  p_topic text, p_difficulty smallint, p_body text,
  p_a text, p_b text, p_c text, p_d text, p_correct text
) returns void language plpgsql as $$
declare
  v_question uuid;
begin
  insert into public.questions (topic_id, body_kk, difficulty, exam_type)
  values ((select id from public.topics where slug = p_topic), p_body, p_difficulty, 'unt')
  returning id into v_question;

  insert into public.question_options (question_id, label, body_kk, is_correct) values
    (v_question, 'A', p_a, p_correct = 'A'),
    (v_question, 'B', p_b, p_correct = 'B'),
    (v_question, 'C', p_c, p_correct = 'C'),
    (v_question, 'D', p_d, p_correct = 'D');
end;
$$;

-- 1. Атом құрылысы
select pg_temp.q('atom-structure', 1::smallint, 'Атом ядросының құрамына қандай бөлшектер кіреді?',
  'Протондар мен электрондар', 'Протондар мен нейтрондар', 'Нейтрондар мен электрондар', 'Тек протондар', 'B');
select pg_temp.q('atom-structure', 1::smallint, 'Хлор атомында (Cl, Z = 17) неше электрон бар?',
  '35', '18', '17', '7', 'C');
select pg_temp.q('atom-structure', 1::smallint, 'Бір элементтің изотоптары бір-бірінен немен ерекшеленеді?',
  'Протондар санымен', 'Электрондар санымен', 'Нейтрондар санымен', 'Ядро зарядымен', 'C');
select pg_temp.q('atom-structure', 2::smallint, '²³Na атомында неше нейтрон бар (Z = 11)?',
  '11', '12', '23', '34', 'B');
select pg_temp.q('atom-structure', 2::smallint, 'Магний атомының (Mg, Z = 12) электрондық конфигурациясы:',
  '1s²2s²2p⁶3s²', '1s²2s²2p⁶3s¹', '1s²2s²2p⁶', '1s²2s²2p⁶3s²3p²', 'A');
select pg_temp.q('atom-structure', 1::smallint, 'Периодтық жүйедегі период нөмірі нені көрсетеді?',
  'Валенттік электрондар санын', 'Электрондық қабаттар (энергетикалық деңгейлер) санын', 'Протондар санын', 'Нейтрондар санын', 'B');
select pg_temp.q('atom-structure', 1::smallint, 'Оттек атомының (O, Z = 8) сыртқы қабатында неше электрон бар?',
  '2', '4', '6', '8', 'C');
select pg_temp.q('atom-structure', 2::smallint, 'Негізгі топшада жоғарыдан төмен қарай атом радиусы қалай өзгереді?',
  'Кемиді', 'Артады', 'Өзгермейді', 'Алдымен артады, сосын кемиді', 'B');
select pg_temp.q('atom-structure', 1::smallint, 'Қай элементтің электртерістігі ең жоғары?',
  'Оттек', 'Хлор', 'Фтор', 'Азот', 'C');
select pg_temp.q('atom-structure', 2::smallint, 'Na⁺ ионында неше электрон бар?',
  '11', '10', '12', '23', 'B');

-- 2. Химиялық байланыс
select pg_temp.q('chemical-bonds', 1::smallint, 'Қай затта иондық байланыс бар?',
  'H₂O', 'CO₂', 'NaCl', 'CH₄', 'C');
select pg_temp.q('chemical-bonds', 2::smallint, 'Азот молекуласында (N₂) атомдар арасында қандай байланыс бар?',
  'Бір ковалентті', 'Қос ковалентті', 'Үш ковалентті', 'Иондық', 'C');
select pg_temp.q('chemical-bonds', 1::smallint, 'Ковалентті полюссіз байланыс қай молекулада бар?',
  'HCl', 'H₂O', 'Cl₂', 'NH₃', 'C');
select pg_temp.q('chemical-bonds', 1::smallint, 'Металдық байланыс қай затқа тән?',
  'Натрий хлориді', 'Мыс', 'Алмаз', 'Су', 'B');
select pg_temp.q('chemical-bonds', 1::smallint, 'Су молекуласындағы H–O–H бұрышы шамамен қанша?',
  '180°', '120°', '104,5°', '90°', 'C');
select pg_temp.q('chemical-bonds', 1::smallint, 'CO₂ молекуласының кеңістіктегі пішіні:',
  'Бұрыштық', 'Сызықтық', 'Тетраэдр', 'Үшбұрышты пирамида', 'B');
select pg_temp.q('chemical-bonds', 2::smallint, 'Молекулалары арасында сутектік байланыс түзетін зат:',
  'CH₄', 'H₂', 'HF', 'CO₂', 'C');
select pg_temp.q('chemical-bonds', 3::smallint, 'Метан (CH₄) молекуласындағы көміртек атомының гибридтенуі:',
  'sp', 'sp²', 'sp³', 'Гибридтенбеген', 'C');
select pg_temp.q('chemical-bonds', 2::smallint, 'Ковалентті полюсті байланыс қандай атомдар арасында түзіледі?',
  'Бірдей бейметалдар арасында', 'Электртерістігі әртүрлі бейметалдар арасында', 'Типтік металл мен бейметалл арасында', 'Металдар арасында', 'B');
select pg_temp.q('chemical-bonds', 2::smallint, 'Алмаздың кристалдық торының түрі:',
  'Иондық', 'Молекулалық', 'Атомдық', 'Металдық', 'C');

-- 3. Ерітінділер және pH
select pg_temp.q('solutions-ph', 1::smallint, 'Бейтарап ортаның pH мәні (25 °C):',
  '0', '1', '7', '14', 'C');
select pg_temp.q('solutions-ph', 1::smallint, 'Фенолфталеин сілтілі ортада қандай түске боялады?',
  'Түссіз', 'Таңқурай (қызғылт-күлгін)', 'Сары', 'Көк', 'B');
select pg_temp.q('solutions-ph', 2::smallint, '0,01 М HCl ерітіндісінің pH мәні:',
  '1', '2', '12', '7', 'B');
select pg_temp.q('solutions-ph', 1::smallint, '200 г ерітіндіде 20 г тұз бар. Тұздың массалық үлесі:',
  '5 %', '10 %', '20 %', '11 %', 'B');
select pg_temp.q('solutions-ph', 1::smallint, 'Лакмус қышқыл ортада қандай түске боялады?',
  'Қызыл', 'Көк', 'Күлгін', 'Сары', 'A');
select pg_temp.q('solutions-ph', 2::smallint, 'Әлсіз электролитті көрсетіңіз:',
  'HCl', 'NaOH', 'CH₃COOH', 'NaCl', 'C');
select pg_temp.q('solutions-ph', 1::smallint, 'NaOH пен HCl әрекеттескенде қандай заттар түзіледі?',
  'NaCl және H₂', 'NaCl және H₂O', 'Na₂O және HCl', 'NaH және Cl₂O', 'B');
select pg_temp.q('solutions-ph', 2::smallint, 'pH = 3 ерітіндідегі сутек иондарының концентрациясы [H⁺]:',
  '3 моль/л', '0,3 моль/л', '10⁻³ моль/л', '10⁻¹¹ моль/л', 'C');
select pg_temp.q('solutions-ph', 2::smallint, 'Ас тұзының (NaCl) судағы ерітіндісінің ортасы:',
  'Қышқыл', 'Бейтарап', 'Сілтілі', 'Әлсіз қышқыл', 'B');
select pg_temp.q('solutions-ph', 1::smallint, 'Күшті негізді көрсетіңіз:',
  'NH₃·H₂O', 'Cu(OH)₂', 'KOH', 'Fe(OH)₃', 'C');

-- 4. Зат мөлшері және химиялық реакциялар
select pg_temp.q('stoichiometry', 1::smallint, 'Судың (H₂O) молярлық массасы:',
  '16 г/моль', '18 г/моль', '20 г/моль', '10 г/моль', 'B');
select pg_temp.q('stoichiometry', 1::smallint, '2 моль оттектің (O₂) массасы:',
  '16 г', '32 г', '64 г', '128 г', 'C');
select pg_temp.q('stoichiometry', 1::smallint, 'Қалыпты жағдайда 1 моль газдың көлемі:',
  '11,2 л', '22,4 л', '24,5 л', '1 л', 'B');
select pg_temp.q('stoichiometry', 2::smallint, '4,4 г CO₂-дегі зат мөлшері (M = 44 г/моль):',
  '0,1 моль', '1 моль', '0,44 моль', '10 моль', 'A');
select pg_temp.q('stoichiometry', 1::smallint, 'Авогадро тұрақтысының мәні:',
  '6,02·10²³ моль⁻¹', '6,02·10²² моль⁻¹', '22,4 моль⁻¹', '1,6·10⁻¹⁹ моль⁻¹', 'A');
select pg_temp.q('stoichiometry', 2::smallint, '2H₂ + O₂ → 2H₂O реакциясы бойынша 4 моль сутекпен неше моль оттек әрекеттеседі?',
  '1 моль', '2 моль', '4 моль', '8 моль', 'B');
select pg_temp.q('stoichiometry', 1::smallint, 'Қай реакция орынбасу реакциясына жатады?',
  'CaCO₃ → CaO + CO₂', 'Zn + 2HCl → ZnCl₂ + H₂', '2H₂ + O₂ → 2H₂O', 'NaOH + HCl → NaCl + H₂O', 'B');
select pg_temp.q('stoichiometry', 2::smallint, 'Тотығу-тотықсыздану реакциясында тотықсыздандырғыш:',
  'Электрон қосып алады', 'Электрон береді', 'Тотығу дәрежесін төмендетеді', 'Өзгеріссіз қалады', 'B');
select pg_temp.q('stoichiometry', 2::smallint, 'H₂SO₄ құрамындағы күкірттің тотығу дәрежесі:',
  '+4', '+6', '−2', '+2', 'B');
select pg_temp.q('stoichiometry', 1::smallint, '0,5 моль NaOH-тың массасы (M = 40 г/моль):',
  '10 г', '20 г', '40 г', '80 г', 'B');

-- 5. Органикалық химия негіздері
select pg_temp.q('organic-basics', 1::smallint, 'Алкандардың жалпы формуласы:',
  'CₙH₂ₙ', 'CₙH₂ₙ₊₂', 'CₙH₂ₙ₋₂', 'CₙH₂ₙ₋₆', 'B');
select pg_temp.q('organic-basics', 1::smallint, 'Этилен (C₂H₄) көмірсутектердің қай класына жатады?',
  'Алкан', 'Алкен', 'Алкин', 'Арен', 'B');
select pg_temp.q('organic-basics', 1::smallint, 'Этанолдың функционалдық тобы:',
  '–COOH', '–CHO', '–OH', '–NH₂', 'C');
select pg_temp.q('organic-basics', 1::smallint, 'Сірке қышқылының формуласы:',
  'HCOOH', 'CH₃COOH', 'C₂H₅OH', 'CH₃CHO', 'B');
select pg_temp.q('organic-basics', 1::smallint, 'Бензолдың молекулалық формуласы:',
  'C₆H₁₂', 'C₆H₆', 'C₆H₁₄', 'C₅H₁₀', 'B');
select pg_temp.q('organic-basics', 2::smallint, 'C₄H₁₀ (бутан) құрамына сәйкес келетін құрылымдық изомерлер саны:',
  '1', '2', '3', '4', 'B');
select pg_temp.q('organic-basics', 2::smallint, 'Алкендерге тән реакция түрі:',
  'Қосып алу', 'Тек орынбасу', 'Бейтараптану', 'Тек ыдырау', 'A');
select pg_temp.q('organic-basics', 1::smallint, 'Глюкозаның молекулалық формуласы:',
  'C₁₂H₂₂O₁₁', 'C₆H₁₂O₆', '(C₆H₁₀O₅)ₙ', 'C₆H₆', 'B');
select pg_temp.q('organic-basics', 1::smallint, 'Метан толық жанғанда қандай заттар түзіледі?',
  'CO және H₂', 'CO₂ және H₂O', 'C және H₂O', 'CH₃OH', 'B');
select pg_temp.q('organic-basics', 1::smallint, 'Ақуыздардың құрылымдық бірлігі:',
  'Глюкоза', 'Амин қышқылдары', 'Май қышқылдары', 'Нуклеотидтер', 'B');

-- ---------- Демо ҰБТ тесті (барлық 50 сұрақ) ----------
insert into public.exams (slug, title_kk, title_ru, title_en, exam_type, duration_minutes) values
  ('unt-demo', 'ҰБТ сынақ тесті (демо)', 'Пробный тест ЕНТ (демо)', 'UNT practice test (demo)', 'unt', 60)
on conflict (slug) do nothing;

delete from public.exam_questions where exam_id = (select id from public.exams where slug = 'unt-demo');
insert into public.exam_questions (exam_id, question_id, position)
select e.id, q.id, (row_number() over (order by t.position, q.created_at, q.id))::smallint
from public.exams e
cross join public.questions q
join public.topics t on t.id = q.topic_id
where e.slug = 'unt-demo';

-- ---------- Молекулалар (3D файлдары 3-күні қосылады) ----------
insert into public.molecules (id, formula, name_kk, name_ru, name_en) values
  ('h2o', 'H₂O', 'Су', 'Вода', 'Water'),
  ('co2', 'CO₂', 'Көмірқышқыл газы', 'Углекислый газ', 'Carbon dioxide'),
  ('ch4', 'CH₄', 'Метан', 'Метан', 'Methane'),
  ('nh3', 'NH₃', 'Аммиак', 'Аммиак', 'Ammonia'),
  ('ethanol', 'C₂H₅OH', 'Этанол', 'Этанол', 'Ethanol'),
  ('benzene', 'C₆H₆', 'Бензол', 'Бензол', 'Benzene')
on conflict (id) do nothing;

-- ---------- Зертхана ----------
insert into public.lab_experiments (id, title_kk, title_ru, title_en, safety_kk) values
  ('titration', 'Қышқылды сілтімен титрлеу', 'Титрование кислоты щёлочью', 'Acid–base titration',
   'Қышқыл мен сілтімен жұмыс істегенде қорғаныс көзілдірігі мен қолғап киіңіз.')
on conflict (id) do nothing;

-- ---------- Бейдждер ----------
insert into public.achievements (id, title_kk, title_ru, title_en, xp_reward) values
  ('first_test', 'Алғашқы тест', 'Первый тест', 'First test', 50),
  ('streak_7', '7 күндік серия', 'Серия 7 дней', '7-day streak', 100),
  ('lab_master', 'Зертхана шебері', 'Мастер лаборатории', 'Lab master', 75)
on conflict (id) do nothing;

-- Тексеру: 5 тақырып және 50 сұрақ болуы керек
select t.title_kk as "Тақырып", count(q.id) as "Сұрақ саны"
from public.topics t left join public.questions q on q.topic_id = t.id
group by t.title_kk, t.position order by t.position;
