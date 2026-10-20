import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { mapAuthError } from "@/features/auth/errors";
import { CODE_PATTERN, participantCookie, pointsFor } from "@/features/live/server";
import { isQrType, normalizeTarget, qrDestination, TOKEN_PATTERN } from "@/features/qr/types";
import { questionKey } from "@/lib/ai/cache";
import { tutorInstructions } from "@/lib/ai/prompt";
import { sourceTitle } from "@/lib/ai/rag";
import { formatDecimal, formatPlain, formatShort } from "@/lib/format";

describe("Live ұпайы", () => {
  test("қате жауапқа 0, дұрысқа 500–1000 (жылдам — көп)", () => {
    assert.equal(pointsFor(false, 0, 20_000), 0);
    assert.equal(pointsFor(true, 0, 20_000), 1000);
    assert.equal(pointsFor(true, 10_000, 20_000), 750);
    assert.equal(pointsFor(true, 20_000, 20_000), 500);
    assert.equal(pointsFor(true, 21_500, 20_000), 500); // қосымша уақытта да 500-ден төмен емес
  });

  test("код тек 6 сан", () => {
    assert.ok(CODE_PATTERN.test("482913"));
    for (const bad of ["48291", "4829130", "48a913", " 482913", ""]) assert.ok(!CODE_PATTERN.test(bad), bad);
    assert.equal(participantCookie("482913"), "live_p_482913");
  });
});

describe("QR", () => {
  test("нысан тексеріледі және қалыпқа келтіріледі", () => {
    assert.equal(normalizeTarget("molecule", "h2o"), "h2o");
    assert.equal(normalizeTarget("ar", "unknown"), null);
    assert.equal(normalizeTarget("element", "na"), "Na");
    assert.equal(normalizeTarget("element", "Zz"), null);
    assert.equal(normalizeTarget("exam", "unt-demo"), "unt-demo");
    assert.equal(normalizeTarget("exam", "../admin"), null);
  });

  test("бағыттау жолдары тек сайт ішінде", () => {
    assert.equal(qrDestination("ar", "h2o"), "/ar/h2o");
    assert.equal(qrDestination("molecule", "co2"), "/molecules/co2");
    assert.equal(qrDestination("element", "Na"), "/periodic-table?el=Na");
    assert.equal(qrDestination("exam", "unt-demo"), "/exam/unt");
  });

  test("токен мен түр тексерісі", () => {
    assert.ok(TOKEN_PATTERN.test("AbCd2345"));
    assert.ok(!TOKEN_PATTERN.test("AbCd234"));
    assert.ok(!TOKEN_PATTERN.test("AbCd23/5"));
    assert.ok(isQrType("ar"));
    assert.ok(!isQrType("join"));
  });
});

describe("AI", () => {
  test("кэш кілті: индекс, регистр, тыныс белгілері бірдей кілт береді", () => {
    assert.equal(questionKey("H₂SO₄-тің молярлық массасы?"), questionKey("h2so4-тің   молярлық массасы"));
    assert.equal(questionKey("Сутек деген не?"), "сутек деген не");
    assert.equal(questionKey("OH⁻ + H⁺"), "oh- + h+");
  });

  test("жүйелік нұсқау: тіл, режим, дереккөздер", () => {
    const knowledge = [{ id: "1", source: "atom-structure.md", chunk: "Атом ядросы...", similarity: 0.8 }];
    const explain = tutorInstructions("ru", "explain", knowledge);
    assert.match(explain, /орыс тілінде/);
    assert.match(explain, /\[1\] \(atom-structure\)/);
    assert.doesNotMatch(explain, /СОКРАТТЫҚ/);
    assert.match(tutorInstructions("kk", "socratic", []), /СОКРАТТЫҚ РЕЖИМ/);
    assert.match(tutorInstructions("kk", "explain", []), /сәйкес материал табылмады/);
    assert.equal(sourceTitle("notes.TXT"), "notes");
  });
});

describe("Сандарды жазу", () => {
  test("ондық бөлгіш тілге сай", () => {
    assert.equal(formatDecimal(18.015, "kk"), "18,02");
    assert.equal(formatDecimal(18.015, "en", 1), "18.0");
    assert.equal(formatPlain(12.011, "ru"), "12,011");
    assert.equal(formatShort(180, "kk"), "180");
    assert.equal(formatShort(104.5, "kk"), "104,5");
  });
});

describe("Auth қателері", () => {
  test("Supabase кодтары біздің кодтарға аударылады", () => {
    assert.equal(mapAuthError("email_exists"), "user_already_exists");
    assert.equal(mapAuthError("validation_failed"), "email_address_invalid");
    assert.equal(mapAuthError("invalid_credentials"), "invalid_credentials");
    assert.equal(mapAuthError("something_new"), "unknown");
    assert.equal(mapAuthError(undefined), "unknown");
  });
});
