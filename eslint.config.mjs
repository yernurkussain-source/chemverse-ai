import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // MediaPipe-тің сыртқы WASM жүктегіштері (scripts/copy-mediapipe.mjs көшіреді)
    "public/mediapipe/**",
    // PWA service worker — scripts/build-sw.mjs жинайтын файл
    "public/sw.js",
    // Android жобасы (Capacitor жасайды)
    "android/**",
  ]),
]);

export default eslintConfig;
