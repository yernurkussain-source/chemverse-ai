# CHEMVERSE AI

**Химияға арналған AI платформа: мұғалімнің күнделікті құралы және оқушының 3D/AR зертханасы.**
Веб-сайт · телефонға орнатылатын PWA · Android APK. Интерфейс: қазақша (әдепкі), орысша, ағылшынша.

🌐 **Сайт:** https://chemverse-ai.vercel.app · **Демо кіру:** https://chemverse-ai.vercel.app/kk/demo (бір батырма — оқушы не мұғалім)

Толық техникалық жоспар — [docs/BLUEPRINT.md](docs/BLUEPRINT.md) · Демо сценарий және тексеру тізімі — [docs/demo/DEMO-CHECKLIST.md](docs/demo/DEMO-CHECKLIST.md)

---

## Мүмкіндіктер

| Модуль | Не істейді | Бет |
|---|---|---|
| **3D молекулалар** | 10 молекула (3Dmol.js): айналдыру, атомды басып қасиеттерін көру, 3 стиль | `/molecules` |
| **AR молекула** | Молекуланы телефон камерасы арқылы үстелге «қою» (model-viewer, GLB) | `/ar/[id]` |
| **Қол қимылымен басқару** | MediaPipe: сұқ саусақ — айналдыру, шымшу — үлкейту, жұдырық — келесі молекула. Кадрлар тек құрылғыда | `/gesture-lab` |
| **QR жүйесі** | Мұғалім QR жасайды (AR, 3D, элемент, тест), басып шығарады, сканерлеу статистикасы; сайттағы QR сканер | `/teacher/qr`, `/scan`, `/q/[token]` |
| **ҰБТ тесті** | Таймер, серверде бағалау (дұрыс жауап клиентке жіберілмейді), тақырып бойынша әлсіз жерлер картасы | `/exam/unt` |
| **AI мұғалім** | Қазақша қадамдық түсіндіру (Gemini), KaTeX формулалар, RAG дереккөздері, «жауабын айтпа» режимі, молярлық массаны кодпен есептеу | `/ai-tutor` |
| **Виртуалды зертхана** | Белгісіз концентрациялы HCl-ды титрлеу, pH қисығы, нәтижені серверде бағалау | `/virtual-lab/titration` |
| **Мұғалім кабинеті** | Сыныптар (6 санды код), оқушылардың нәтижелері, тапсырмалар | `/teacher` |
| **AI ҚМЖ генераторы** | Қысқа мерзімді жоспар: мақсаттар, кезеңдер, дескрипторлар, платформа ресурстары → PDF | `/teacher/lesson-studio` |
| **Live сабақ** | Kahoot сияқты: проекторда QR + код → оқушылар тіркеусіз қосылады → тірі диаграмма → рейтинг (Supabase Realtime) | `/teacher/live`, `/join/[code]` |
| **PWA және APK** | Телефонға орнату, офлайн кэш (Serwist), Android қосымшасы (Capacitor) | — |

## Технологиялар

Next.js 16 (App Router, React 19) · TypeScript · Tailwind CSS 4 · shadcn/ui · next-intl
Supabase: Auth, PostgreSQL + RLS, Realtime, pgvector · Vercel AI SDK + Google Gemini
3Dmol.js · Three.js · @google/model-viewer · MediaPipe Hand Landmarker · qrcode / html5-qrcode
Serwist (PWA) · Capacitor (Android) · Vercel (хостинг)

## Қауіпсіздік және құпиялық

- Барлық кестеде **RLS** қосулы; мұғалім тек өз сыныбының деректерін көреді.
- Тест пен Live сабақтың **дұрыс жауаптары клиентке жіберілмейді** — бағалау тек серверде.
- **Камера кадрлары** (QR, қол қимылы) тек құрылғыда өңделеді.
- **AI-ға оқушының аты-жөні жіберілмейді**; AI сұрауларына шек: минутына 10, күніне 100.
- API кілттері тек `.env.local` пен Vercel баптауларында; репозиторийде жоқ.

---

## Жергілікті іске қосу (Windows, PowerShell)

```powershell
npm install
Copy-Item .env.example .env.local   # сосын кілттерді толтырыңыз (файлдағы түсіндірме бойынша)
npm run dev                         # http://localhost:3000
```

### Дерекқор (Supabase)
Supabase → **SQL Editor**-де ретімен іске қосыңыз:

1. `supabase/migrations/` ішіндегі файлдар — **күн ретімен** (`20261017…_init.sql` → `20261022…_ai_cache.sql`)
2. `supabase/seed.sql` — 5 тақырып, 50 ҰБТ сұрағы, молекулалар, зертхана

### Командалар

| Команда | Не істейді |
|---|---|
| `npm run dev` | Жергілікті сайт |
| `npm run build` | Production жинағы (алдымен PWA service worker жиналады) |
| `npm run lint` | Код сапасын тексеру |
| `npm run rag` | `docs/rag/` материалдарын AI білім қорына жүктеу |
| `npm run seed:demo` | Демо деректер: 8А сыныбы, 12 демо оқушы, нәтижелер, ҚМЖ, QR (`-- --reset` — тазалау) |
| `npm run cache:ai` | Демо сұрақтарына AI жауаптарын кэштеу → `docs/demo/ai-answers.md` (`-- --force` — қайта жасау) |
| `npm run glb` | Молекулалардың SDF → GLB файлдары (AR үшін) |
| `npm run android:apk` | Android APK → `dist/chemverse-ai.apk` (Java 21 керек) |

### Deploy
`main` тармағына `git push` → Vercel өзі жаңартады. Vercel-де 5 айнымалы керек: `.env.example`-дағы Supabase кілттері, `DEMO_USER_PASSWORD`, `GOOGLE_GENERATIVE_AI_API_KEY`.

---

## Құрылым

| Жол | Не бар |
|---|---|
| `src/app/[locale]/` | Беттер (`/kk/...`, `/ru/...`, `/en/...`) |
| `src/app/api/` | AI чат, Live сабақ күйі |
| `src/features/` | Бизнес-логика: `auth`, `exam`, `qr`, `live`, `lab`, `teacher`, `lesson-studio` |
| `src/components/` | UI: `landing`, `molecules`, `ar`, `gesture`, `exam`, `ai`, `lab`, `live`, `qr`, `teacher`, `ui` |
| `src/lib/` | `ai` (провайдер, RAG, нұсқау, кэш), `chemistry` (элементтер, формула, титрлеу), `supabase` |
| `messages/` | Интерфейс мәтіндері: `kk.json`, `ru.json`, `en.json` (жаңа мәтін — үшеуіне де) |
| `supabase/` | Миграциялар және бастапқы деректер |
| `scripts/` | RAG, демо деректер, AI кэш, PWA, GLB, Android құралдары |
| `docs/` | Жоспар, күнделікті тапсырмалар, RAG материалдары, демо тізімі |

## Ескерту

Демо аккаунттағы 8А сыныбының 12 оқушысы мен олардың нәтижелері — **көрсетілім үшін жасалған демо деректер** (пилот нәтижесі емес).
AI жауаптары мен ҚМЖ-ны мұғалім тексеруі керек.
