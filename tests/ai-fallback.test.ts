import assert from "node:assert/strict";
import { test } from "node:test";
import type { LanguageModelV4GenerateResult, LanguageModelV4StreamResult } from "@ai-sdk/provider";
import { APICallError } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { withFallbackModel } from "@/lib/ai/provider";

// Негізгі модель «үлгермеді» деп 2 минут есте сақталады (кілт — модель атауы), сондықтан әр тестке бөлек атау
let models = 0;
const uniqueId = () => ({ modelId: `primary-${models++}` });
const apiError = (statusCode: number) => new APICallError({ message: `HTTP ${statusCode}`, url: "https://example.test", requestBodyValues: {}, statusCode });
const failing = (statusCode: number) =>
  new MockLanguageModelV4({
    ...uniqueId(),
    doGenerate: async () => {
      throw apiError(statusCode);
    },
    doStream: async () => {
      throw apiError(statusCode);
    },
  });
// Нәтижелердің мазмұны маңызды емес — қай модельден келгені ғана тексеріледі
const fromFallback = { tag: "fallback" } as unknown as LanguageModelV4GenerateResult & LanguageModelV4StreamResult;
const fromPrimary = { tag: "primary" } as unknown as LanguageModelV4GenerateResult & LanguageModelV4StreamResult;
const params = { prompt: [] };

test("лимит біткенде (429) және жүктеме көп болса (503) — сол сұрау резерв модельге кетеді", async () => {
  for (const status of [429, 503]) {
    const fallback = new MockLanguageModelV4({ doGenerate: async () => fromFallback, doStream: async () => fromFallback });
    const model = withFallbackModel(failing(status), fallback);
    assert.equal(await model.doStream(params), fromFallback);
    assert.equal(await model.doGenerate(params), fromFallback);
    assert.equal(fallback.doStreamCalls.length, 1);
  }
});

// 429/503 орнына үнсіз қатып қалатын модель: тек abortSignal келгенде тоқтайды
const hangUntilAborted = ({ abortSignal }: { abortSignal?: AbortSignal }) =>
  new Promise<never>((_, reject) => abortSignal?.addEventListener("abort", () => reject(new Error("aborted"))));
const hanging = (id = uniqueId()) => new MockLanguageModelV4({ ...id, doGenerate: hangUntilAborted, doStream: hangUntilAborted });

test("негізгі модель уақытында жауап бермесе — резервке ауысады", async () => {
  const fallback = new MockLanguageModelV4({ doGenerate: async () => fromFallback, doStream: async () => fromFallback });
  const model = withFallbackModel(hanging(), fallback, 20);
  assert.equal(await model.doStream(params), fromFallback);
  assert.equal(await model.doGenerate(params), fromFallback);
});

test("бір рет үлгермесе — келесі сұраулар негізгі модельді күтпей, бірден резервке барады", async () => {
  const id = uniqueId();
  const fallback = new MockLanguageModelV4({ doStream: async () => fromFallback });
  const first = hanging(id);
  assert.equal(await withFallbackModel(first, fallback, 20).doStream(params), fromFallback);
  // Жаңа сұрау (жаңа дана, сол модель): 1 с күту шегі болса да бірден жауап береді
  const second = hanging(id);
  const started = Date.now();
  assert.equal(await withFallbackModel(second, fallback, 1000).doStream(params), fromFallback);
  assert.ok(Date.now() - started < 500);
  assert.equal(second.doStreamCalls.length, 0);
});

test("шақырушы өзі тоқтатса — резерв шақырылмайды", async () => {
  const fallback = new MockLanguageModelV4({ doGenerate: async () => fromFallback, doStream: async () => fromFallback });
  const stop = new AbortController();
  setTimeout(() => stop.abort(), 10);
  await assert.rejects(Promise.resolve(withFallbackModel(hanging(), fallback, 1000).doStream({ ...params, abortSignal: stop.signal })));
  assert.equal(fallback.doStreamCalls.length, 0);
});

test("стрим басталғаннан кейін таймер оны үзбейді", async () => {
  let signal: AbortSignal | undefined;
  const primary = new MockLanguageModelV4({
    ...uniqueId(),
    doStream: async ({ abortSignal }) => {
      signal = abortSignal;
      return fromPrimary;
    },
  });
  const fallback = new MockLanguageModelV4({ doStream: async () => fromFallback });
  assert.equal(await withFallbackModel(primary, fallback, 20).doStream(params), fromPrimary);
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(signal?.aborted, false);
});

test("басқа қате (400) резервке жіберілмейді, ал негізгі модель жұмыс істесе — резерв шақырылмайды", async () => {
  const fallback = new MockLanguageModelV4({ doGenerate: async () => fromFallback, doStream: async () => fromFallback });
  await assert.rejects(Promise.resolve(withFallbackModel(failing(400), fallback).doStream(params)), (e: unknown) => APICallError.isInstance(e) && e.statusCode === 400);

  const primary = new MockLanguageModelV4({ ...uniqueId(), doGenerate: async () => fromPrimary, doStream: async () => fromPrimary });
  assert.equal(await withFallbackModel(primary, fallback).doStream(params), fromPrimary);
  assert.equal(fallback.doStreamCalls.length, 0);
});
