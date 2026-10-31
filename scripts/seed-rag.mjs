// RAG білім қоры: docs/rag/ ішіндегі мұғалім материалдарын үзінділерге бөліп, rag_documents кестесіне жүктейді.
// Іске қосу: npm run rag   (.env.local-дағы Supabase және Gemini кілттері керек)
//
// Файлдар: .md немесе .txt. Тілі атауынан: "acids.ru.md" — орысша, "acids.en.md" — ағылшынша, қалғаны — қазақша.
// README.md және "_" таңбасынан басталатын файлдар жүктелмейді.
// Қайта іске қосуға болады: кесте толық жаңартылады (өшірілген файлдың үзінділері де алынады).
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createClient } from "@supabase/supabase-js";
import { embedMany } from "ai";

const ROOT = join("docs", "rag");
const CHUNK_SIZE = 1000; // таңба
const DIMENSIONS = 1536; // rag_documents.embedding vector(1536)

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, GOOGLE_GENERATIVE_AI_API_KEY } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY || !GOOGLE_GENERATIVE_AI_API_KEY) {
  console.error("❌ .env.local ішінде NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY және GOOGLE_GENERATIVE_AI_API_KEY болуы керек.");
  process.exit(1);
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const google = createGoogleGenerativeAI({ apiKey: GOOGLE_GENERATIVE_AI_API_KEY });

/** Папкадағы барлық .md/.txt файлдар (ішкі папкалармен) */
function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(path);
    const skip = entry.name.startsWith("_") || entry.name.toLowerCase() === "readme.md";
    return !skip && /\.(md|txt)$/i.test(entry.name) ? [path] : [];
  });
}

const languageOf = (file) => (/\.ru\.(md|txt)$/i.test(file) ? "ru" : /\.en\.(md|txt)$/i.test(file) ? "en" : "kk");

/**
 * Мәтінді ~1000 таңбалық үзінділерге бөлу: абзац ортасынан кесілмейді.
 * Әр үзіндінің басына соңғы тақырып (# ...) қосылады — іздеу дәлірек болады.
 */
function chunkText(text) {
  const chunks = [];
  let heading = "";
  let current = "";
  const flush = () => {
    if (current.trim()) chunks.push((heading && !current.startsWith(heading) ? `${heading}\n` : "") + current.trim());
    current = "";
  };
  for (const paragraph of text.replace(/\r\n/g, "\n").split(/\n\s*\n/)) {
    const block = paragraph.trim();
    if (!block) continue;
    if (/^#{1,3}\s/.test(block)) {
      flush();
      heading = block.split("\n")[0];
    }
    if (current.length + block.length > CHUNK_SIZE) flush();
    current += `${block}\n\n`;
  }
  flush();
  return chunks;
}

const files = listFiles(ROOT);
if (!files.length) {
  console.log(`ℹ️  ${ROOT} папкасында материал жоқ. .md немесе .txt файл салып, қайта іске қосыңыз.`);
  process.exit(0);
}

const rows = [];
for (const file of files) {
  const source = relative(ROOT, file).replaceAll("\\", "/");
  const chunks = chunkText(readFileSync(file, "utf8"));
  console.log(`📄 ${source}: ${chunks.length} үзінді`);
  for (const chunk of chunks) rows.push({ source, chunk, language: languageOf(file) });
}

// Тегін тариф: минутына 30 000 токен. Қазақ мәтінінде 1 токен ≈ 2 таңба деп алып, минутына ~40 000 таңба жібереміз
const CHARS_PER_MINUTE = 40_000;
const batches = [[]];
for (const row of rows) {
  const last = batches.at(-1);
  const size = last.reduce((sum, r) => sum + r.chunk.length, 0);
  if (last.length && (size + row.chunk.length > CHARS_PER_MINUTE || last.length >= 100)) batches.push([row]);
  else last.push(row);
}

console.log(`🧠 ${rows.length} үзінді үшін embedding жасалуда (Gemini, ${batches.length} топ, ~${batches.length} мин)…`);
const embeddings = [];
for (const [i, batch] of batches.entries()) {
  if (i > 0) await new Promise((resolve) => setTimeout(resolve, 61_000));
  const result = await embedMany({
    model: google.embedding("gemini-embedding-001"),
    values: batch.map((r) => r.chunk),
    maxRetries: 0,
    providerOptions: { google: { outputDimensionality: DIMENSIONS, taskType: "RETRIEVAL_DOCUMENT" } },
  });
  embeddings.push(...result.embeddings);
  console.log(`   ${i + 1}/${batches.length} топ дайын`);
}

// Ескі үзінділерді толық ауыстырамыз
const removed = await supabase.from("rag_documents").delete().not("id", "is", null);
if (removed.error) throw removed.error;

const records = rows.map((row, i) => ({ ...row, embedding: JSON.stringify(embeddings[i]) }));
for (let i = 0; i < records.length; i += 100) {
  const { error } = await supabase.from("rag_documents").insert(records.slice(i, i + 100));
  if (error) throw error;
}
console.log(`✅ Дайын: ${records.length} үзінді, ${files.length} файл.`);
