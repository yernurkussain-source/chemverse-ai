# Google арқылы кіру — баптау (бір рет, ~10 минут, тегін)

Код дайын: кіру және тіркелу беттерінде «Google арқылы кіру» батырмасы бар.
Ол жұмыс істеуі үшін Google-дан кілт алып, Supabase-ке салу керек. Кілттер кодқа да, `.env.local`-ға да
ЖАЗЫЛМАЙДЫ — тек Supabase баптауларында сақталады.

## 1. Google Cloud: OAuth кілтін алу

1. https://console.cloud.google.com ашып, Google аккаунтыңызбен кіріңіз.
2. Жоғарыдағы жоба тізімі → **New project** → атауы `CHEMVERSE AI` → **Create**.
3. Сол жақ мәзір → **APIs & Services** → **OAuth consent screen** (немесе **Google Auth Platform**) → **Get started**:
   - App name: `CHEMVERSE AI`
   - User support email: өз поштаңыз
   - Audience: **External**
   - Contact email: өз поштаңыз → **Create**.
4. **Clients** (немесе **Credentials** → **Create credentials** → **OAuth client ID**):
   - Application type: **Web application**
   - Name: `CHEMVERSE web`
   - **Authorized JavaScript origins**:
     - `https://chemverse-ai.vercel.app`
     - `http://localhost:3000`
   - **Authorized redirect URIs** (дәл осылай, бір таңба қате болмасын):
     - `https://cwppydukqwoksgfcxwaa.supabase.co/auth/v1/callback`
   - **Create** → шыққан терезеден **Client ID** мен **Client secret**-ті көшіріп алыңыз.
5. **Audience** бетінде **Publish app** басыңыз (әйтпесе тек «Test users» тізіміндегілер кіре алады).

## 2. Supabase: Google-ды қосу

1. https://supabase.com/dashboard → жобаңыз → **Authentication** → **Sign In / Providers** → **Google**.
2. **Enable Sign in with Google** қосыңыз, 1-қадамдағы **Client ID** мен **Client Secret**-ті қойыңыз → **Save**.
3. **Authentication** → **URL Configuration**:
   - **Site URL**: `https://chemverse-ai.vercel.app`
   - **Redirect URLs** тізіміне қосыңыз (әрқайсысын бөлек):
     - `https://chemverse-ai.vercel.app/**`
     - `http://localhost:3000/**`

## 3. Тексеру

1. `npm run dev` → http://localhost:3000/kk/login → **Google арқылы кіру**.
2. Google аккаунтын таңдаңыз → жаңа пайдаланушы **onboarding** бетіне түседі (рөл, сынып),
   бұрын кірген болса — **профильге**.
3. Vercel-дегі сайтта да солай тексеріңіз (`git push` кейін).

## Білу керек

- **Android/iOS қосымшасында** Google батырмасы көрсетілмейді: Google қосымша ішіндегі браузерден
  кіруге тыйым салады. Қосымшада email немесе демо режим қолданылады; телефонда Google-мен кіргісі
  келсе — сайтты Chrome/Safari арқылы ашады.
- Бір email бұрын құпия сөзбен тіркелген болса, Google арқылы кіргенде Supabase оны сол аккаунтқа
  қосады (email Google-да расталған).
- Қате шықса: Google терезесінде `redirect_uri_mismatch` — 1.4-қадамдағы redirect адресін тексеріңіз;
  сайтқа қайтып «Google арқылы кіру сәтсіз болды» десе — 2.3-қадамдағы Redirect URLs-ты тексеріңіз.
