# CHEMVERSE AI — iPhone (iOS) қосымшасы

## Қазір iPhone-да қалай қолданамыз (тегін)
iPhone-да **Safari** → https://chemverse-ai.vercel.app → **Бөлісу** (⬆️) → **«Басты экранға қосу»** → **Қосу**.
Экранда CHEMVERSE иконкасы пайда болады, сайт браузер жолағынсыз қосымша сияқты ашылады (PWA).
Толық нұсқаулық сайтта: `/kk/install`.

## Нағыз iOS қосымшасы (App Store / TestFlight)
`ios/` папкасында Capacitor жобасы дайын: иконка, splash экраны, камера рұқсатының сипаттамасы.
Қосымша Android APK сияқты Vercel-дегі сайтты ашады (`capacitor.config.ts` → `CAPACITOR_SERVER_URL`).

### Не керек
| Керек | Неге | Бағасы |
|---|---|---|
| **Mac** (macOS + Xcode 16+) | iOS қосымшасын тек Apple құралдары жинайды | — (немесе бұлттық Mac, төменде) |
| **Apple Developer Program** | iPhone-ға орнату, TestFlight, App Store | жылына $99 |
| Apple ID | Xcode-қа кіру | тегін |

> Тегін Apple ID-мен Xcode арқылы **өз** iPhone-ыңызға орнатуға болады, бірақ қосымша 7 күннен кейін ашылмай қалады.

### Mac-та жинау
```bash
git clone https://github.com/yernurkussain-source/chemverse-ai.git
cd chemverse-ai
npm install
npm run ios:sync          # веб баптауларды ios/ жобасына көшіру
npx cap open ios          # Xcode ашылады
```
Xcode-та: **App** → **Signing & Capabilities** → Team: өз Apple аккаунтыңыз → iPhone-ды қосып → ▶ Run.
App Store / TestFlight: **Product → Archive** → **Distribute App**.

### Mac жоқ болса
Бұлттық build қызметтері (мысалы, Codemagic, Ionic Appflow) GitHub репозиторийінен iOS қосымшасын жинайды.
Оларға да Apple Developer аккаунты (сертификат) керек. Тегін деңгейлері мен шарттарын олардың сайтынан тексеріңіз.

### Иконканы өзгерту
`public/icons/icon.svg` логотипі негізінде: `node scripts/app-assets.mjs` (Android + iOS бірге).

### Ескерту
- Bundle ID: `kz.chemverse.ai` — App Store-ға бір рет шыққан соң өзгертуге болмайды.
- AR iPhone-да Apple Quick Look арқылы ашылады (model-viewer USDZ файлын өзі жасайды) — нақты iPhone-да тексеріңіз.
