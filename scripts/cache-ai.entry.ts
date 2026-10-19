/**
 * Демо AI жауаптарын жасап, ai_cache кестесіне сақтайды (scripts/cache-ai.mjs іске қосады).
 * AI мұғалімнің чат маршрутымен бірдей: сол жүйелік нұсқау, сол RAG, сол molarMass құралы.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { generateText, stepCountIs } from "ai";
import type { Locale } from "@/i18n/routing";
import { questionKey } from "@/lib/ai/cache";
import { tutorInstructions } from "@/lib/ai/prompt";
import { chatModel, isAiConfigured } from "@/lib/ai/provider";
import { searchKnowledge, sourceTitle } from "@/lib/ai/rag";
import { tutorTools } from "@/lib/ai/tools";
import { createClient } from "@supabase/supabase-js";

const FORCE = process.argv.includes("--force");

// Сахнада қойылатын қазақша сұрақтар (конкурс критерийі: 10 тексерілген қазақша сұрақ)
const DEMO_QUESTIONS_KK = [
  "Судың молекуласы неге бұрыштық пішінді?",
  "Метанның кеңістіктегі пішіні қандай және неге?",
  "Электртерістік дегеніміз не? Мысал келтір.",
  "10 г NaOH-та неше моль зат бар?",
  "Тұз қышқылы мен натрий гидроксидінің реакция теңдеуін жаз және түсіндір.",
  "Фенолфталеин сілтілі ортада неге таңқурай түске боялады?",
  "Изотоптар дегеніміз не? Хлордың изотоптарын мысалға ал.",
  "Бензол молекуласының құрылысы қандай?",
  "Катализатор реакция жылдамдығына қалай әсер етеді?",
  "Глюкозаның молярлық массасын есепте.",
];

/** AI мұғалім бетіндегі дайын сұрақ батырмалары (үш тілде) — олар да кэштеледі */
function starters(locale: Locale): string[] {
  const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"));
  return Object.values(messages.AiTutor.starters as Record<string, string>);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!isAiConfigured || !NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.error("❌ .env.local ішінде Supabase және GOOGLE_GENERATIVE_AI_API_KEY кілттері болуы керек.");
    process.exit(1);
  }
  const admin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

  const check = await admin.from("ai_cache").select("id").limit(1);
  if (check.error) {
    console.error("❌ ai_cache кестесі жоқ. Supabase-те supabase/migrations/20261022000000_ai_cache.sql іске қосыңыз.");
    process.exit(1);
  }

  const items: { locale: Locale; question: string }[] = [
    ...[...starters("kk"), ...DEMO_QUESTIONS_KK].map((question) => ({ locale: "kk" as const, question })),
    ...starters("ru").map((question) => ({ locale: "ru" as const, question })),
    ...starters("en").map((question) => ({ locale: "en" as const, question })),
  ];

  for (const { locale, question } of items) {
    const key = questionKey(question);
    const { data: existing } = await admin.from("ai_cache").select("id").eq("question_key", key).eq("locale", locale).maybeSingle();
    if (existing && !FORCE) {
      console.log(`· бар: [${locale}] ${question}`);
      continue;
    }
    process.stdout.write(`🧠 [${locale}] ${question} … `);
    const knowledge = await searchKnowledge(admin, question);
    let result;
    try {
      result = await generateText({
        model: chatModel(),
        instructions: tutorInstructions(locale, "explain", knowledge),
        prompt: question,
        tools: tutorTools,
        stopWhen: stepCountIs(4),
        temperature: 0.3,
        maxOutputTokens: 2000,
        maxRetries: 1,
      });
    } catch (error) {
      // Көбінесе — Gemini тегін лимиті бітті. Қалғанын ертең қайта іске қосып толтыруға болады
      const quota = String(error).includes("quota");
      console.log(quota ? "✗ Gemini лимиті бітті — қалғаны кейін" : `✗ қате: ${String(error).slice(0, 120)}`);
      if (quota) break;
      continue;
    }
    const answer = result.text.trim();
    if (!answer) {
      console.log("✗ бос жауап, өткізілді");
      continue;
    }
    const { error } = await admin.from("ai_cache").upsert(
      {
        question_key: key,
        locale,
        question,
        answer,
        sources: knowledge.map((k) => ({ title: sourceTitle(k.source) })),
        verified: false,
      },
      { onConflict: "question_key,locale" },
    );
    if (error) throw error;
    console.log("✓");
    await sleep(4000); // Gemini тегін деңгейінің минуттық шегіне сыю үшін
  }

  // Мұғалім тексеруі үшін барлық жауаптар бір файлда
  const { data: all } = await admin.from("ai_cache").select("locale, question, answer, verified").order("locale").order("created_at");
  const lines = [
    "# AI мұғалімнің демо жауаптары",
    "",
    "Бұл жауаптар `ai_cache` кестесінде сақталған — сахнада осы сұрақтар қойылса, жауап бірден шығады.",
    "**Әр жауапты оқып тексеріңіз.** Қате болса — маған айтыңыз, түзетеміз (немесе `npm run cache:ai -- --force`).",
    "",
    "Файлды қайта жасау: `npm run cache:ai`",
    "",
  ];
  for (const [i, row] of (all ?? []).entries()) {
    lines.push(`## ${i + 1}. [${row.locale}] ${row.question}`, "", `- [${row.verified ? "x" : " "}] Мұғалім тексерді`, "", row.answer, "", "---", "");
  }
  mkdirSync("docs/demo", { recursive: true });
  writeFileSync("docs/demo/ai-answers.md", lines.join("\n"));
  console.log(`✅ Кэште ${all?.length ?? 0} жауап · тексеруге: docs/demo/ai-answers.md`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
