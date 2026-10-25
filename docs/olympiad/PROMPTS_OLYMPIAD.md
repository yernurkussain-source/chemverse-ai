# «Олимпиадаға дайындық» бөлімін Claude Code-қа жіберу: 4 сессия

Әр сессияны жаңа чатта бастаңыз («New session»), режимді **Plan** етіп қойыңыз: Claude алдымен жоспар көрсетеді, оқып шығып қабылдайсыз.

Алдымен `CLAUDE.md` файлының соңына мына жолды қосыңыз:
```
- Олимпиада бөлімі: docs/olympiad/OLYMPIAD_SPEC.md, мазмұн: docs/olympiad/TOPICS.json және PROBLEMS.json, тексергіштер: docs/olympiad/core/
```

---

## 1-сессия · Ядро, мазмұн және деректер базасы
```
@CLAUDE.md @docs/olympiad/OLYMPIAD_SPEC.md @docs/olympiad/core/olympiad-core.js @docs/olympiad/core/olympiad-core.test.js @docs/olympiad/core/validate-bank.js оқы.
Бұл сессияда UI жоқ, тек негіз:
1) olympiad-core.js-ті src/features/olympiad/core/ ішіне TypeScript модульдеріне көшір (formula, balance, econf, generators, check). Формулалар мен мәтіндерді өзгертпе.
2) Тесттерді Vitest-ке көшір, сонымен бірге validate-bank логикасын тест ретінде қос (94 есеп, қате 0).
3) OLYMPIAD_SPEC 10-бөліміндегі кестелер үшін миграция (RLS-пен) және TOPICS.json мен PROBLEMS.json-нан seed.
4) /api/olympiad/check — серверлік тексеру (numeric, mcq, balance, econf), /api/olympiad/generate — генератордан есеп (жауапсыз).
npm run test нәтижесін көрсет. Соңында build + commit.
```

## 2-сессия · Оқушы беттері: курс картасы, тақырып, жаттығу
```
@CLAUDE.md @docs/olympiad/OLYMPIAD_SPEC.md оқы.
Жаса: /olympiad (курс картасы, блоктар, меңгеру деңгейі), /olympiad/topic/[n] (3-бөлімдегі 8 блок), /olympiad/practice/[n] және /olympiad/mistakes.
Енгізу компоненттері: NumericInput (үтір/нүкте, бірлік), BalanceInput (әр затқа + / − батырмалары), EconfInput (деңгейше торлары), MCQ; HintLadder (3 ишара); шешімді қадамдап ашу.
Тексеру тек /api/olympiad/check арқылы. Меңгеру деңгейі мен «қателер дәптері» (6-бөлім). AI көмекшіні Сократтық режимде қос (бар /api/ai/chat).
Дизайн — design/prototype.html стилінде, телефонға ыңғайлы. Мәтіндер kk.json/ru.json-да. Соңында build + commit.
```

## 3-сессия · Сынақ олимпиада, сайыс, жобалар, рейтинг
```
@CLAUDE.md @docs/olympiad/OLYMPIAD_SPEC.md оқы.
Жаса: /olympiad/mock (мұғалім не автоматты құрастырады, уақытпен, нәтиже мен талдау, PDF экспорт),
/olympiad/contest/[id] (Live Class механизмімен «Жас химик-дарын» сайысы, раундтар, проектор экраны),
/olympiad/projects (34-сабақ: жоба формасы, файлдар, рубрика), /olympiad/rating (тек үйірме ішінде).
Ашық жауаптар: AI рубрика бойынша алдын ала ұпай ұсынады, мұғалім бекітеді. Соңында build + commit.
```

## 4-сессия · Мұғалім құралдары және қабылдау
```
@CLAUDE.md @docs/olympiad/OLYMPIAD_SPEC.md @docs/olympiad/OLYMPIAD_PLAN.md оқы.
Жаса: /teacher/olympiad — күнтізбе (апта күні, уақыт, демалыс күндері → 34 сабақ 2026–2027 оқу жылына таратылады, қолмен жылжыту),
журнал (қатысу, үй тапсырмасы), меңгеру жылу картасы (оқушы × тақырып), тапсырма беру (тақырып немесе есептер жиыны + генератор seed),
ашық жауаптарды тексеру, тақырып теориясын өңдеу, есеп редакторы (сақтау алдында тексергіш іске қосылады), банкті JSON экспорт/импорт.
OLYMPIAD_SPEC 12-бөліміндегі қабылдау критерийлерін бір-бірлеп тексеріп, тізіммен көрсет. Соңында build + commit.
```

---

## Кеңестер
- Есеп дұрыс емес деп ойласаңыз: «PROBLEMS.json-дағы T05-02 есебін тексер, алдымен validate-bank тестін іске қос» деп жазыңыз.
- Жаңа есептерді Claude-қа жаздырсаңыз: «жауапты core тексергішімен есепте, PROBLEMS.json-ға қос, validate-bank өтсін» деп сұраңыз.
- Генераторға жаңа есеп түрін қосу: «GEN-ге X генераторын қос, оның тестін жаз».
