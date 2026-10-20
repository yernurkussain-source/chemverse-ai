-- =====================================================================
-- ChemLab (docs/chemlab/CHEMLAB_SPEC.md 8-бөлім): тәжірибелер каталогы және 8 қадамдық нәтижелер
-- Supabase → SQL Editor → New query → осы файлды қойып → Run. Қайта іске қосуға болады.
-- =====================================================================

-- Тәжірибе: сынып(тар), тақырып, күйі (ready — жұмыс істейді, soon — «Жақында»), бағалау рубрикасы
alter table public.lab_experiments
  add column if not exists grade smallint[] not null default '{}',
  add column if not exists topic_kk text,
  add column if not exists topic_ru text,
  add column if not exists topic_en text,
  add column if not exists status text not null default 'soon',
  add column if not exists rubric jsonb not null default '{"procedure":30,"observation":25,"calc":20,"conclusion":25}';
alter table public.lab_experiments drop constraint if exists lab_experiments_status_check;
alter table public.lab_experiments add constraint lab_experiments_status_check check (status in ('ready', 'soon'));

-- Әрекет: болжам, әрекеттер, бақылау кестесі, жауаптар, қорытынды, ұпай (100) және оның бөлінісі
alter table public.lab_attempts
  add column if not exists prediction text,
  add column if not exists actions jsonb,
  add column if not exists observations jsonb,
  add column if not exists answers jsonb,
  add column if not exists conclusion text check (char_length(conclusion) <= 1500),
  add column if not exists score_total smallint check (score_total between 0 and 100),
  add column if not exists score_breakdown jsonb,
  add column if not exists ai_feedback text,
  add column if not exists teacher_override jsonb,
  add column if not exists completed_at timestamptz;
create index if not exists lab_attempts_experiment_idx on public.lab_attempts (experiment_id, created_at desc);

-- Қауіпсіздік: нәтижені тек сервер бағалап жазады (әйтпесе оқушы REST арқылы өзіне кез келген ұпай қоя алар еді).
-- Оқу ережелері өзгермейді: оқушы — өзінікін, мұғалім — өз сыныбындағы оқушылардікін.
drop policy if exists "lab_attempts: insert own" on public.lab_attempts;
revoke insert, update, delete on public.lab_attempts from anon, authenticated;

-- ---------- Каталог (docs/chemlab/CHEMLAB_SPEC.md 3-бөлім) ----------
insert into public.lab_experiments (id, grade, status, title_kk, title_ru, title_en, topic_kk, topic_ru, topic_en) values
  -- 7-сынып
  ('mixture-separation', '{7}', 'soon', 'Құм, тұз және су қоспасын бөлу', 'Разделение смеси песка, соли и воды', 'Separating sand, salt and water', 'Қоспаларды бөлу', 'Разделение смесей', 'Separating mixtures'),
  ('lab-equipment', '{7}', 'soon', 'Құралдарды тану', 'Узнай лабораторное оборудование', 'Identify lab equipment', 'Зертханалық құралдар', 'Лабораторное оборудование', 'Lab equipment'),
  ('lab-safety', '{7}', 'soon', 'Химиялық қауіпсіздік симуляторы', 'Симулятор химической безопасности', 'Chemical safety simulator', 'Қауіпсіздік ережелері', 'Правила безопасности', 'Safety rules'),
  ('pure-vs-mixture', '{7}', 'soon', 'Заттарды жіктеу', 'Классификация веществ', 'Classifying substances', 'Таза заттар мен қоспалар', 'Чистые вещества и смеси', 'Pure substances and mixtures'),
  ('phys-chem-phenomena', '{7}', 'soon', 'Құбылыстарды бақылау', 'Наблюдение явлений', 'Observing phenomena', 'Физикалық және химиялық құбылыстар', 'Физические и химические явления', 'Physical and chemical changes'),
  ('substance-properties', '{7}', 'soon', 'Қасиеттерді салыстыру', 'Сравнение свойств', 'Comparing properties', 'Заттардың қасиеттері', 'Свойства веществ', 'Properties of substances'),
  ('measurements', '{7}', 'soon', 'Масса мен көлемді өлшеу', 'Измерение массы и объёма', 'Measuring mass and volume', 'Өлшеулер', 'Измерения', 'Measurements'),
  -- 8-сынып
  ('atom-builder', '{8}', 'soon', 'Атом моделін құрастыру', 'Собери модель атома', 'Build an atom model', 'Атом құрылысы', 'Строение атома', 'Atomic structure'),
  ('molecule-builder', '{8}', 'soon', 'Молекула конструкторы', 'Конструктор молекул', 'Molecule builder', 'Химиялық формулалар, валенттілік', 'Химические формулы, валентность', 'Chemical formulas and valence'),
  ('periodic-explorer', '{8}', 'ready', 'Элементті зерттеу', 'Исследуй элемент', 'Explore an element', 'Периодтық жүйе', 'Периодическая система', 'Periodic table'),
  ('reaction-signs', '{8}', 'soon', 'Реакцияны бақылау', 'Наблюдение реакции', 'Observing a reaction', 'Химиялық реакция белгілері', 'Признаки химических реакций', 'Signs of a chemical reaction'),
  ('balance-equations', '{8}', 'soon', 'Коэффициенттерді таңдау', 'Подбор коэффициентов', 'Balancing coefficients', 'Реакция теңдеулері', 'Уравнения реакций', 'Chemical equations'),
  ('metals-nonmetals', '{8}', 'soon', 'Қасиеттерді салыстыру', 'Сравнение свойств', 'Comparing properties', 'Металдар мен бейметалдар', 'Металлы и неметаллы', 'Metals and non-metals'),
  -- 9-сынып
  ('indicator-lab', '{9}', 'soon', 'Индикатор зертханасы', 'Лаборатория индикаторов', 'Indicator lab', 'Қышқылдар мен негіздер', 'Кислоты и основания', 'Acids and bases'),
  ('titration', '{9}', 'ready', 'Қышқылды сілтімен титрлеу', 'Титрование кислоты щёлочью', 'Acid–base titration', 'Бейтараптану', 'Нейтрализация', 'Neutralisation'),
  ('reaction-rate', '{9,10}', 'soon', 'Реакция жылдамдығы', 'Скорость реакции', 'Reaction rate', 'Реакция жылдамдығы мен кинетикасы', 'Скорость и кинетика реакций', 'Reaction rate and kinetics'),
  ('solubility', '{9}', 'soon', 'Ерігіштікті зерттеу', 'Исследование растворимости', 'Investigating solubility', 'Ерітінділер', 'Растворы', 'Solutions'),
  ('mass-fraction', '{9}', 'soon', 'Ерітінді дайындау', 'Приготовление раствора', 'Preparing a solution', 'Массалық үлес', 'Массовая доля', 'Mass fraction'),
  ('precipitation', '{9}', 'soon', 'Тұнба түзілуі', 'Образование осадка', 'Precipitate formation', 'Алмасу реакциялары', 'Реакции обмена', 'Exchange reactions'),
  ('metal-activity', '{9}', 'soon', 'Белсенділік қатары', 'Ряд активности', 'Activity series', 'Металдардың белсенділігі', 'Активность металлов', 'Reactivity of metals'),
  ('unknown-substance', '{9,10}', 'soon', 'Белгісіз затты анықтау', 'Определи неизвестное вещество', 'Identify an unknown substance', 'Заттарды анықтау', 'Распознавание веществ', 'Identifying substances'),
  -- 10-сынып
  ('equilibrium', '{10}', 'soon', 'Тепе-теңдік моделі', 'Модель равновесия', 'Equilibrium model', 'Химиялық тепе-теңдік', 'Химическое равновесие', 'Chemical equilibrium'),
  ('redox', '{10}', 'soon', 'Электрон ауысуы моделі', 'Модель переноса электронов', 'Electron transfer model', 'Тотығу-тотықсыздану', 'Окислительно-восстановительные реакции', 'Redox reactions'),
  ('dissociation', '{10}', 'soon', 'Иондар моделі', 'Модель ионов', 'Ion model', 'Электролиттік диссоциация', 'Электролитическая диссоциация', 'Electrolytic dissociation'),
  ('galvanic-cell', '{10}', 'soon', 'Гальваникалық элемент', 'Гальванический элемент', 'Galvanic cell', 'Электрохимия', 'Электрохимия', 'Electrochemistry'),
  ('organic-builder', '{10}', 'soon', 'Құрылымдық формула конструкторы', 'Конструктор структурных формул', 'Structural formula builder', 'Органикалық химия', 'Органическая химия', 'Organic chemistry'),
  ('organic-properties', '{10}', 'soon', 'Қасиеттер мен реакцияларды сәйкестендіру', 'Сопоставление свойств и реакций', 'Matching properties and reactions', 'Органикалық қосылыстардың қасиеттері', 'Свойства органических соединений', 'Properties of organic compounds')
on conflict (id) do update set
  grade = excluded.grade,
  status = excluded.status,
  title_kk = excluded.title_kk,
  title_ru = excluded.title_ru,
  title_en = excluded.title_en,
  topic_kk = excluded.topic_kk,
  topic_ru = excluded.topic_ru,
  topic_en = excluded.topic_en;

-- Тексеру: 27 тәжірибе (reaction-rate пен unknown-substance екі сыныпта ортақ)
select status, count(*) from public.lab_experiments group by status;
