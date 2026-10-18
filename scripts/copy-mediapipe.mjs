// MediaPipe WASM файлдарын node_modules-тен public/ ішіне көшіреді (сайт оларды сыртқы CDN-сіз жүктеуі үшін).
// `npm run dev` және `npm run build` алдында автоматты іске қосылады (package.json: predev, prebuild).
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

const from = join("node_modules", "@mediapipe", "tasks-vision", "wasm");
const to = join("public", "mediapipe", "wasm");
// SIMD қолдайтын және қолдамайтын браузерлерге арналған екі нұсқа
const files = [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
];

mkdirSync(to, { recursive: true });
let copied = 0;
for (const file of files) {
  const src = join(from, file);
  const dst = join(to, file);
  if (existsSync(dst) && statSync(dst).size === statSync(src).size) continue;
  copyFileSync(src, dst);
  copied++;
}
console.log(`MediaPipe WASM: ${copied ? `${copied} файл көшірілді` : "дайын"} → ${to}`);
