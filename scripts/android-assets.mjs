// Android иконкалары мен splash суреттерін CHEMVERSE AI логотипімен ауыстыру.
// Іске қосу: node scripts/android-assets.mjs   (Google Chrome орнатылған болуы керек)
// android/app/src/main/res ішіндегі PNG файлдарын сол өлшемде қайта сызады.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const RES = join("android", "app", "src", "main", "res");
const BG = "#070b1a";

// Логотиптегі атом (viewBox 0 0 30 30)
const ATOM = `
  <circle cx="15" cy="15" r="5" fill="#3fe0f0"/>
  <ellipse cx="15" cy="15" rx="13" ry="5" fill="none" stroke="#3fe0f0" stroke-width="1.4" opacity=".75"/>
  <ellipse cx="15" cy="15" rx="13" ry="5" fill="none" stroke="#ff5fa2" stroke-width="1.4" opacity=".9" transform="rotate(60 15 15)"/>
  <ellipse cx="15" cy="15" rx="13" ry="5" fill="none" stroke="#3fe0f0" stroke-width="1.4" opacity=".55" transform="rotate(120 15 15)"/>`;

/** w×h өлшемді SVG: фон (болса) + ортада атом (atomShare — атомның қысқа жаққа үлесі) */
function svg(w, h, { background, atomShare, round }) {
  const size = Math.min(w, h) * atomShare;
  const scale = size / 30;
  const x = (w - size) / 2;
  const y = (h - size) / 2;
  const bg = background
    ? round
      ? `<circle cx="${w / 2}" cy="${h / 2}" r="${w / 2}" fill="${background}"/>`
      : `<rect width="${w}" height="${h}" fill="${background}"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg}<g transform="translate(${x} ${y}) scale(${scale})">${ATOM}</g></svg>`;
}

const tmp = mkdtempSync(join(tmpdir(), "cv-"));
function render(markup, w, h, out) {
  const html = join(tmp, "r.html");
  writeFileSync(html, `<html><body style="margin:0;background:transparent">${markup}</body></html>`);
  execFileSync(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--default-background-color=00000000",
    `--user-data-dir=${join(tmp, "p")}`,
    `--screenshot=${resolve(out)}`,
    `--window-size=${w},${h}`,
    `file:///${html.replaceAll("\\", "/")}`,
  ], { stdio: "ignore" });
}

const pngSize = (file) => {
  const b = readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

let count = 0;
for (const dir of readdirSync(RES)) {
  const path = join(RES, dir);
  if (!statSync(path).isDirectory()) continue;
  for (const name of readdirSync(path)) {
    const file = join(path, name);
    if (!name.endsWith(".png")) continue;
    const [w, h] = pngSize(file);
    let markup;
    if (name === "ic_launcher.png") {
      // Ескі Android: дөңгелектенген шаршы иконка
      markup = `<div style="width:${w}px;height:${h}px;border-radius:${w * 0.22}px;overflow:hidden">${svg(w, h, { background: BG, atomShare: 0.62 })}</div>`;
    } else if (name === "ic_launcher_round.png") {
      markup = svg(w, h, { background: BG, atomShare: 0.6, round: true });
    } else if (name === "ic_launcher_foreground.png") {
      // Adaptive icon: фон түсі бөлек (ic_launcher_background), атом қауіпсіз аймақта
      markup = svg(w, h, { atomShare: 0.5 });
    } else if (name === "splash.png") {
      markup = svg(w, h, { background: BG, atomShare: 0.3 });
    } else continue;
    render(markup, w, h, file);
    count++;
  }
}

// Adaptive icon фонының түсі
writeFileSync(
  join(RES, "values", "ic_launcher_background.xml"),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`,
);
rmSync(tmp, { recursive: true, force: true });
console.log(`✅ ${count} сурет жаңартылды`);
