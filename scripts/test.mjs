// Тесттер: npm test   (бір файл: npm test -- formula)
// tests/**/*.test.ts файлдарын esbuild арқылы жинап (@/ жолдары жұмыс істеуі үшін),
// Node.js-тің ішкі тест жүргізгішімен (node --test) іске қосады. Қосымша кітапхана керек емес.
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { build } from "esbuild";

const filter = process.argv[2] ?? "";

function findTests(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return findTests(path);
    return entry.name.endsWith(".test.ts") && path.includes(filter) ? [path] : [];
  });
}

const entryPoints = findTests("tests");
if (!entryPoints.length) {
  console.error(`Тест табылмады: ${filter}`);
  process.exit(1);
}

// node_modules ішінде — жиналған файлдар жобаның пакеттерін таба алуы үшін (Git-ке кірмейді)
const outdir = join(process.cwd(), "node_modules", ".cache", "chemverse", "tests");
rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

await build({
  entryPoints,
  outdir,
  outbase: "tests",
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  packages: "external",
  tsconfig: "tsconfig.json",
  logLevel: "warning",
});

const files = entryPoints.map((path) => join(outdir, relative("tests", path)).replace(/\.ts$/, ".mjs"));
const result = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
rmSync(outdir, { recursive: true, force: true });
process.exit(result.status ?? 1);
