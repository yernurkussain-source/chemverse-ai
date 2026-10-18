"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { isQrType, normalizeTarget } from "./types";

export type QrActionState = {
  error?: "not_teacher" | "invalid_target" | "invalid_class" | "not_configured" | "unknown";
  created?: string;
} | null;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** 8 таңбалы кездейсоқ токен (ұқсас таңбалар — 0/O, 1/l/I — алынып тасталған) */
function newToken() {
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Кірген пайдаланушы мұғалім болса — оның id-і, әйтпесе null */
async function currentTeacherId() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  return profile?.role === "teacher" ? auth.user.id : null;
}

/** Жаңа QR жасау: тек мұғалім. Кестеге тек сервер жазады (RLS-те insert рұқсаты жоқ) */
export async function createQr(_prev: QrActionState, formData: FormData): Promise<QrActionState> {
  const admin = createAdminClient();
  if (!isSupabaseConfigured || !admin) return { error: "not_configured" };

  const teacherId = await currentTeacherId();
  if (!teacherId) return { error: "not_teacher" };

  const type = String(formData.get("type") ?? "");
  if (!isQrType(type)) return { error: "invalid_target" };
  const target = normalizeTarget(type, String(formData.get(`target_${type}`) ?? "").trim());
  if (!target) return { error: "invalid_target" };

  // Сынып таңдалса — ол осы мұғалімдікі ме
  const classId = String(formData.get("classId") ?? "") || null;
  if (classId) {
    const { data: own } = await admin
      .from("classes")
      .select("id")
      .eq("id", classId)
      .eq("teacher_id", teacherId)
      .maybeSingle();
    if (!own) return { error: "invalid_class" };
  }

  // Токен қайталанса (өте сирек) — тағы бір рет көреміз
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = newToken();
    const { error } = await admin
      .from("qr_resources")
      .insert({ token, type, target, class_id: classId, created_by: teacherId });
    if (!error) {
      refresh();
      return { created: token };
    }
    if (error.code !== "23505") {
      console.error("QR жасау қатесі:", error);
      return { error: "unknown" };
    }
  }
  return { error: "unknown" };
}

/** QR-ды өшіру немесе қайта қосу (тек өз QR-ы) */
export async function toggleQr(formData: FormData) {
  const admin = createAdminClient();
  const teacherId = await currentTeacherId();
  if (!admin || !teacherId) return;

  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  const { error } = await admin
    .from("qr_resources")
    .update({ is_active: !active })
    .eq("id", id)
    .eq("created_by", teacherId);
  if (error) console.error("QR күйін өзгерту қатесі:", error);
  refresh();
}

/** QR-ды біржола жою (сканерлеу статистикасы да өшеді). Тек өз QR-ы */
export async function deleteQr(formData: FormData) {
  const admin = createAdminClient();
  const teacherId = await currentTeacherId();
  if (!admin || !teacherId) return;

  const id = String(formData.get("id") ?? "");
  const { error } = await admin.from("qr_resources").delete().eq("id", id).eq("created_by", teacherId);
  if (error) console.error("QR жою қатесі:", error);
  refresh();
}
