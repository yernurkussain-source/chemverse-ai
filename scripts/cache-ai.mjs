// Демо AI жауаптарын кэштеу: npm run cache:ai   (бар жауаптарды қайта жасау: npm run cache:ai -- --force)
// scripts/cache-ai.entry.ts файлын esbuild арқылы жинап іске қосады — жобаның өз модульдері
// (жүйелік нұсқау, molarMass құралы, RAG) чат маршрутындағыдай қолданылады.
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

// node_modules ішінде — жиналған файл жобаның пакеттерін таба алуы үшін (Git-ке кірмейді)
const dir = join("node_modules", ".cache", "chemverse");
mkdirSync(dir, { recursive: true });
const outfile = join(process.cwd(), dir, "cache-ai.mjs");
await build({
  entryPoints: ["scripts/cache-ai.entry.ts"],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  packages: "external",
  tsconfig: "tsconfig.json",
  logLevel: "warning",
});

try {
  await import(pathToFileURL(outfile).href);
} finally {
  // Жиналған уақытша файлды өшіреміз
  process.on("exit", () => rmSync(outfile, { force: true }));
}
