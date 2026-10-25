"use server";

import { refresh } from "next/cache";
import { hasLocale } from "next-intl";
import { z } from "zod";
import { gradeMock, MOCK_GRACE_MS, type MockConfig } from "@/features/olympiad/mock";
import { loadProblems, type MockDetails } from "@/features/olympiad/server/mocks";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Оқушы сынақты бастайды: басталу уақыты серверде жазылады (таймер содан есептеледі) */
export async function startMock(formData: FormData) {
  const mockId = String(formData.get("mockId") ?? "");
  const value = String(formData.get("locale") ?? "");
  const locale = hasLocale(routing.locales, value) ? value : routing.defaultLocale;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || !admin) {
    redirect({ href: "/login", locale });
    return;
  }
  // RLS: тек сынып мүшесі (не мұғалімі) көреді; басталу уақыты келмесе — бастауға болмайды
  const { data: mock } = await supabase.from("olympiad_mocks").select("id, starts_at").eq("id", mockId).maybeSingle();
  if (!mock || (mock.starts_at && Date.parse(mock.starts_at) > Date.now())) return;

  const details: MockDetails = { startedAt: new Date().toISOString() };
  const { error } = await admin
    .from("olympiad_mock_results")
    .upsert({ mock_id: mockId, user_id: auth.user.id, score: null, details }, { onConflict: "mock_id,user_id", ignoreDuplicates: true });
  if (error) console.error("Олимпиада: сынақ басталмады", error);
  redirect({ href: `/olympiad/mock/${mockId}`, locale });
}

const answersSchema = z.record(z.string().max(40), z.unknown());

/** Тапсыру: жауаптарды сервер тексереді (дұрыс жауап клиентке ешқашан жіберілмейді), нәтиже бір рет жазылады */
export async function submitMock(mockId: string, rawAnswers: unknown): Promise<{ ok: boolean }> {
  const parsed = answersSchema.safeParse(rawAnswers);
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!parsed.success || !auth.user || !admin) return { ok: false };

  const [{ data: result }, { data: mock }] = await Promise.all([
    admin.from("olympiad_mock_results").select("score, details").eq("mock_id", mockId).eq("user_id", auth.user.id).maybeSingle(),
    admin.from("olympiad_mocks").select("config, duration_min").eq("id", mockId).maybeSingle<{ config: MockConfig; duration_min: number }>(),
  ]);
  if (!result || !mock || result.score !== null) return { ok: false };

  const ids = mock.config.problems ?? [];
  const answers = Object.fromEntries(ids.filter((id) => id in parsed.data).map((id) => [id, parsed.data[id]]));
  const grade = gradeMock(await loadProblems(ids), answers);
  const startedAt = (result.details as MockDetails).startedAt;
  const details: MockDetails = {
    ...grade,
    startedAt,
    submittedAt: new Date().toISOString(),
    late: Date.now() > Date.parse(startedAt) + mock.duration_min * 60_000 + MOCK_GRACE_MS,
    answers,
  };
  // Екі рет жіберілсе де нәтиже бір рет жазылады
  const { error } = await admin
    .from("olympiad_mock_results")
    .update({ score: grade.score, details })
    .eq("mock_id", mockId)
    .eq("user_id", auth.user.id)
    .is("score", null);
  if (error) {
    console.error("Олимпиада: сынақ нәтижесі сақталмады", error);
    return { ok: false };
  }
  refresh();
  return { ok: true };
}
