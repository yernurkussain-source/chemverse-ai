import assert from "node:assert/strict";
import { test } from "node:test";
import type { LanguageModelV4GenerateResult, LanguageModelV4StreamResult } from "@ai-sdk/provider";
import { APICallError } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { withFallbackModel } from "@/lib/ai/provider";

const apiError = (statusCode: number) => new APICallError({ message: `HTTP ${statusCode}`, url: "https://example.test", requestBodyValues: {}, statusCode });
const failing = (statusCode: number) =>
  new MockLanguageModelV4({
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

test("басқа қате (400) резервке жіберілмейді, ал негізгі модель жұмыс істесе — резерв шақырылмайды", async () => {
  const fallback = new MockLanguageModelV4({ doGenerate: async () => fromFallback, doStream: async () => fromFallback });
  await assert.rejects(Promise.resolve(withFallbackModel(failing(400), fallback).doStream(params)), (e: unknown) => APICallError.isInstance(e) && e.statusCode === 400);

  const primary = new MockLanguageModelV4({ doGenerate: async () => fromPrimary, doStream: async () => fromPrimary });
  assert.equal(await withFallbackModel(primary, fallback).doStream(params), fromPrimary);
  assert.equal(fallback.doStreamCalls.length, 0);
});
