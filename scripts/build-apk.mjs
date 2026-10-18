// Android APK жинау: Java 21-ді табады → Capacitor sync → Gradle assembleDebug → dist/chemverse-ai.apk
// Іске қосу: npm run android:apk
// Қосымша ашатын адрес: .env.local ішіндегі CAPACITOR_SERVER_URL (Vercel адресі)
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Java 21 орнатылған жерді іздейміз (Capacitor 8 тек Java 21-мен жиналады)
function findJdk21() {
  if (process.env.JAVA_HOME?.includes("21")) return process.env.JAVA_HOME;
  const roots = ["C:\\Program Files\\Microsoft", "C:\\Program Files\\Eclipse Adoptium", "C:\\Program Files\\Java"];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    const jdk = readdirSync(root).find((name) => /^jdk-?21/.test(name));
    if (jdk) return join(root, jdk);
  }
  return null;
}

const javaHome = findJdk21();
if (!javaHome) {
  console.error("❌ Java 21 табылмады. Орнату: winget install Microsoft.OpenJDK.21");
  process.exit(1);
}

const url = process.env.CAPACITOR_SERVER_URL || "(capacitor.config.ts-тегі әдепкі адрес)";
console.log(`☕ Java: ${javaHome}\n🌐 Қосымша ашатын сайт: ${url}`);

const env = { ...process.env, JAVA_HOME: javaHome };
execSync("npx cap sync android", { stdio: "inherit", env });
execSync(process.platform === "win32" ? ".\\gradlew.bat assembleDebug --console=plain" : "./gradlew assembleDebug", {
  cwd: "android",
  stdio: "inherit",
  env,
});

mkdirSync("dist", { recursive: true });
const apk = join("android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
copyFileSync(apk, join("dist", "chemverse-ai.apk"));
console.log("✅ Дайын: dist\\chemverse-ai.apk");
