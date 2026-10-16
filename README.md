# CHEMVERSE AI

Химияға арналған AI платформа: 3D молекулалар, виртуалды зертхана, қазақша AI мұғалім, Live сабақ және ҰБТ-ға дайындық.
Толық жоспар — [docs/BLUEPRINT.md](docs/BLUEPRINT.md), дизайн үлгісі — [design/prototype.html](design/prototype.html).

## Іске қосу (Windows, PowerShell)

```powershell
npm install      # бір рет: пакеттерді орнату
npm run dev      # жергілікті сайт: http://localhost:3000
npm run build    # production жинағын тексеру
npm run lint     # код сапасын тексеру
```

## Технологиялар

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · next-intl (kk, ru, en)

## Құрылым

| Жол | Не бар |
| --- | --- |
| `src/app/[locale]/` | Беттер (`/kk/...`, `/ru/...`, `/en/...`) |
| `src/components/landing/` | Басты беттің бөлімдері |
| `src/components/layout/` | Жоғарғы мәзір, төменгі навигация, режим және тіл ауыстырғыштар |
| `src/components/ui/` | shadcn/ui компоненттері |
| `src/lib/chemistry/` | Химиялық есептеулер (pH, молярлық масса) |
| `src/i18n/` | Тіл баптаулары (next-intl) |
| `messages/kk.json`, `messages/ru.json`, `messages/en.json` | Интерфейс мәтіндері |
| `src/app/globals.css` | Түстер (ашық/қараңғы режим) және қаріптер |

## Тілдер

Қазақша — әдепкі тіл: `/` → `/kk`. Орысша — `/ru`, ағылшынша — `/en`. Жаңа мәтін қосқанда оны **үш** файлға да (`kk.json`, `ru.json`, `en.json`) жазыңыз.
