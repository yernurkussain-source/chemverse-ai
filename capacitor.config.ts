import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Android APK (Capacitor). Қосымша сайттың Vercel-дегі нұсқасын ашады — AI, тест, Live сабақ
 * серверде жұмыс істейтіндіктен, сайтты APK ішіне көшіру мүмкін емес.
 *
 * Адресті өзгерту: .env.local ішінде CAPACITOR_SERVER_URL=https://...vercel.app
 * сосын: npm run android:sync
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL || "https://chemverse-ai.vercel.app";

const config: CapacitorConfig = {
  appId: "kz.chemverse.ai",
  appName: "CHEMVERSE AI",
  // Интернет мүлде жоқ кезде ғана көрінетін бет (сайт ашылмаса)
  webDir: "capacitor-www",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
  },
  android: {
    backgroundColor: "#070b1a",
  },
};

export default config;
