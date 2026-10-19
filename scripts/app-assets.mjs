// Android және iOS қосымшаларының иконкалары мен splash суреттерін CHEMVERSE AI логотипімен ауыстыру.
// Іске қосу: node scripts/app-assets.mjs   (Google Chrome орнатылған болуы керек)
// android/app/src/main/res және ios/App/App/Assets.xcassets ішіндегі PNG файлдарын сол өлшемде қайта сызады.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const RES = join("android", "app", "src", "main", "res");
const IOS_ASSETS = join("ios", "App", "App", "Assets.xcassets");
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

/**
 * PNG-ден мөлдірлік арнасын (alpha) алып тастау: App Store иконкада alpha болмауын талап етеді.
 * Chrome скриншоты RGBA (8 бит) береді → сүзгілерді шешіп, RGB етіп қайта жазамыз.
 */
function removeAlpha(file) {
  const png = readFileSync(file);
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6) return; // тек 8 биттік RGBA өңделеді
    }
    if (type === "IDAT") idat.push(data);
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp;
  const rgba = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? rgba[y * stride + x - bpp] : 0;
      const b = y > 0 ? rgba[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? rgba[(y - 1) * stride + x - bpp] : 0;
      let value = line[x];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      rgba[y * stride + x] = value & 0xff;
    }
  }
  // RGB: мөлдір пиксельдерді фон түсімен араластырамыз
  const bg = [0x07, 0x0b, 0x1a];
  const rgb = Buffer.alloc(height * (width * 3 + 1));
  for (let y = 0; y < height; y++) {
    rgb[y * (width * 3 + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const i = y * stride + x * 4;
      const alpha = rgba[i + 3] / 255;
      for (let k = 0; k < 3; k++) rgb[y * (width * 3 + 1) + 1 + x * 3 + k] = Math.round(rgba[i + k] * alpha + bg[k] * (1 - alpha));
    }
  }
  const chunk = (type, data) => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, "ascii");
    data.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  writeFileSync(file, Buffer.concat([png.subarray(0, 8), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(rgb)), chunk("IEND", Buffer.alloc(0))]));
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

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

// iOS: иконка (1024×1024, бұрыштарын iOS өзі дөңгелектейді, alpha болмауы керек) және splash
if (existsSync(IOS_ASSETS)) {
  const icon = join(IOS_ASSETS, "AppIcon.appiconset", "AppIcon-512@2x.png");
  const [w, h] = pngSize(icon);
  render(svg(w, h, { background: BG, atomShare: 0.6 }), w, h, icon);
  removeAlpha(icon);
  count++;
  const splashDir = join(IOS_ASSETS, "Splash.imageset");
  for (const name of readdirSync(splashDir).filter((n) => n.endsWith(".png"))) {
    const file = join(splashDir, name);
    const [sw, sh] = pngSize(file);
    render(svg(sw, sh, { background: BG, atomShare: 0.18 }), sw, sh, file);
    removeAlpha(file);
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
