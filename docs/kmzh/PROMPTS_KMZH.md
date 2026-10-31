# ҚМЖ генераторын Claude Code-қа жіберу: 3 сессия

## Дайындық (бір рет)

1. Zip ішіндегі `docs/kmzh` папкасын жобаның `docs` папкасына көшіріңіз (нәтижесінде `docs/kmzh/KMZH_SPEC.md` болуы керек).
2. `CLAUDE.md` соңына мына жолды қосыңыз:
```
- AI Lesson Studio (ҚМЖ генераторы): docs/kmzh/KMZH_SPEC.md. Пішім эталоны: docs/kmzh/reference/teacher-sample.pdf. DOCX генераторы мен тексергіш дайын: docs/kmzh/generator/ — логикасын өзгертпей TypeScript-ке көшір.
```
3. Әр сессияны жаңа чатта бастаңыз («New session»), режимді **Plan** етіп қойыңыз. Claude жоспар көрсетеді — оқып, қабылдайсыз.

---

## 1-сессия · Пішім ядросы: схема, тексергіш, DOCX экспорт

```
@CLAUDE.md @docs/kmzh/KMZH_SPEC.md @docs/kmzh/kmzh.schema.json @docs/kmzh/generator/kmzh-docx.mjs @docs/kmzh/generator/validate-kmzh.mjs оқы. @docs/kmzh/reference/teacher-sample.pdf — пішімнің эталоны.
Бұл сессияда AI да, UI да жоқ — тек пішім ядросы:
1) docx@9.5.1 және ajv@8.17.1 орнат (жаңа кітапхана қосуға рұқсат беремін).
2) src/features/lesson-studio/ ішіне: schema.ts (zod, kmzh.schema.json-ға толық сай), validate.ts (validate-kmzh.mjs логикасы), docx.ts (kmzh-docx.mjs-тің TypeScript нұсқасы: LAYOUT константалары, баған ендері, қаріп, абзац аралықтары, көк түс — бәрі өзгеріссіз), values.ts (values-calendar.json + күн бойынша айды табу).
3) Vitest тесттері: KMZH_SPEC 7-бөліміндегі барлық тест, docs/kmzh/examples/sample-7-lab2.json мысалымен.
4) Supabase миграциясы: KMZH_SPEC 4-бөліміндегі кестелер мен lesson-assets бакеті, RLS-пен.
5) GET /api/lesson-plan/[id]/docx маршруты (суреттер Storage-тан).
6) scripts/kmzh-sample.ts: мысал JSON-нан tmp/sample.docx жасайды — мен Word-та ашып, эталонмен салыстырамын.
npm run test нәтижесін көрсет. Соңында build + commit.
```

Тексеру: `tmp/sample.docx` файлын Word-та ашыңыз — `reference/teacher-sample.pdf`-пен бірдей болуы керек (альбомдық бет, 5 баған, ЕБҚ жолы көк).

---

## 2-сессия · AI генерациясы

```
@CLAUDE.md @docs/kmzh/KMZH_SPEC.md @docs/kmzh/AI_SYSTEM_PROMPT.md @docs/kmzh/examples/sample-7-lab2.json оқы.
Жаса:
1) POST /api/ai/lesson-plan — KMZH_SPEC 5-бөлімі бойынша: zod кіріс, айдың құндылығы, RAG үзінділері (бар білім қорынан, сынып бойынша басымдық), бар AI клиенті арқылы generateObject, validateKmzh, қате болса бір рет түзеттіру, сақтау. Жүйелік промптты AI_SYSTEM_PROMPT.md-ден сөзбе-сөз ал, үлгі JSON-ды промптқа қос (кэштелетін бөлік ретінде).
2) POST /api/ai/lesson-plan/[id]/row — бір жолды қайта жасау.
3) Педагогтің аты-жөні AI-ға жіберілмесін; мета өрістерін (teacher, date, value, оқулық жолы) сервер өзі қойсын.
4) Тест: AI-ды mock-пен алмастырып, маршрут логикасын тексер (валидатор қатесі → түзету сұрауы → сақтау).
5) scripts/kmzh-try.ts: нақты модельмен 8-сынып «Зат мөлшері. Моль. Авогадро саны» тақырыбына ҚМЖ жасап, tmp/try.docx шығарсын (оқу мақсатын мен өзім енгіземін, кодты ойдан шығарма).
Соңында build + commit.
```

Тексеру: `tmp/try.docx`-ты ашып, мазмұнын оқыңыз. Химиялық қатесі, қазақ тілінің сапасы, уақыт қосындысы (45) — бәрін тексеріңіз. Ұнамаған жерін Claude-қа айтыңыз: «AI_SYSTEM_PROMPT.md-ге мына ережені қос: …».

---

## 3-сессия · Мұғалім беттері: форма, редактор, баптаулар

```
@CLAUDE.md @docs/kmzh/KMZH_SPEC.md @design/prototype.html оқы.
Жаса (KMZH_SPEC 3-бөлімі):
1) /teacher/lesson-studio — жоспарлар тізімі және «Жаңа ҚМЖ» формасы.
2) /teacher/lesson-studio/[id] — редактор: шапка өрістері, «Сабақтың барысы» кестесі (5 баған, әр ұяшық өңделеді), жол қосу/өшіру/жылжыту, «Осы жолды қайта жаса», сурет жүктеу, уақыт пен балл есептегіші, валидатор ескертулері, автосақтау және нұсқалар, DOCX жүктеу.
3) /teacher/lesson-studio/[id]/print — A4 альбомдық басып шығару көрінісі (PDF үшін).
4) /teacher/lesson-studio/settings — аты-жөні, мектеп, ЖИ тізімі, айлардың құндылықтары мен дәйек сөздер, оқу мақсаттарын CSV-ден импорттау.
Дизайн prototype.html стилінде, телефонда да ыңғайлы. Мәтіндер kk.json/ru.json-да.
Соңында KMZH_SPEC 8-бөліміндегі қабылдау критерийлерін бір-бірлеп тексеріп, тізіммен көрсет. Build + commit.
```

---

## Кеңестер

- Пішімде бірдеңе сәйкес келмесе (мысалы баған ені): «docx.ts-те LAYOUT-ты KMZH_SPEC 2-бөлімімен салыстыр, эталон — reference/teacher-sample.pdf» деп жазыңыз.
- Жаңа әдіс-тәсілдер қосқыңыз келсе: «AI_SYSTEM_PROMPT.md-ге мына әдістерді қос: …, сабақтың басында солардың бірін таңдасын».
- Айдың құндылығы өзгерсе (жаңа оқу жылы): баптаулар бетінде өзгертіңіз немесе «values-calendar.json-ды 2026–2027 жылғы күнтізбе бойынша жаңарт: …» деп жазыңыз.
- Басқа пішімдегі ҚМЖ керек болса (мысалы БЖБ сабағы): үлгі DOCX-ті жіберіп, «осы пішімді екінші шаблон ретінде қос» деп сұраңыз.
