// PWA service worker-ін жинау: src/sw.ts → public/sw.js (npm run build алдында автоматты іске қосылады).
// Алдын ала кэштелетін файлдар: иконкалар, молекулалардың SDF/GLB файлдары.
// Офлайн бет (offline.html) Serwist-тің fallback тізімі арқылы бөлек кэштеледі — мұнда қайталанбауы керек,
// әйтпесе service worker орнатылмай қалады.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { build } from "esbuild";

const PUBLIC = "public";
const PRECACHE_DIRS = ["icons", join("molecules", "sdf"), join("molecules", "glb")];
const files = [
  ...PRECACHE_DIRS.flatMap((dir) =>
    readdirSync(join(PUBLIC, dir))
      .filter((name) => statSync(join(PUBLIC, dir, name)).isFile())
      .map((name) => join(dir, name)),
  ),
];

// Файл мазмұнының хэші — файл өзгерсе, кэш жаңарады
const revision = (file) => createHash("md5").update(readFileSync(join(PUBLIC, file))).digest("hex").slice(0, 12);
const manifest = files.map((file) => ({
  url: "/" + relative(PUBLIC, join(PUBLIC, file)).replaceAll("\\", "/"),
  revision: revision(file),
}));

await build({
  entryPoints: ["src/sw.ts"],
  outfile: join(PUBLIC, "sw.js"),
  bundle: true,
  format: "iife",
  minify: true,
  target: "es2020",
  define: {
    "self.__SW_MANIFEST": JSON.stringify(manifest),
    "process.env.NODE_ENV": '"production"',
    __OFFLINE_REVISION__: JSON.stringify(revision("offline.html")),
  },
  logLevel: "warning",
});

console.log(`✅ public/sw.js жиналды · ${manifest.length} файл алдын ала кэштеледі`);
