"use server";

import { headers } from "next/headers";
import { redirect as externalRedirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { ensureDemoAccounts, resetDemoPassword, type DemoRole } from "./demo";
import { mapAuthError, type AuthState, type OnboardingState } from "./errors";
import { canResetPassword } from "./recovery";

// Server Action ішінде тіл URL-ден оқылмайды, сондықтан формада жасырын өріс ретінде келеді
function readLocale(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

/** Кіру: email + құпия сөз */
export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const locale = readLocale(formData);
  if (!isSupabaseConfigured) return { error: "not_configured" };

  const email = text(formData, "email");
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "missing_fields" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: mapAuthError(error.code) };

  const { data: profile } = await supabase.from("profiles").select("onboarded").eq("id", data.user.id).single();
  redirect({ href: profile?.onboarded ? "/profile" : "/onboarding", locale });
  return null;
}

/** Тіркелу. Email растау қосулы болса — «поштаңызды тексеріңіз» хабарламасы шығады */
export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const locale = readLocale(formData);
  if (!isSupabaseConfigured) return { error: "not_configured" };

  const fullName = text(formData, "fullName").slice(0, 80);
  const email = text(formData, "email");
  const password = String(formData.get("password") ?? "");
  if (!fullName || !email || !password) return { error: "missing_fields" };
  if (password.length < 8) return { error: "weak_password" };

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, locale },
      emailRedirectTo: `${origin}/${locale}/auth/callback`,
    },
  });
  if (error) return { error: mapAuthError(error.code) };

  // Email растау өшірулі болса, сессия бірден ашылады
  if (data.session) redirect({ href: "/onboarding", locale });
  return { checkEmail: email };
}

/** «Құпия сөзді ұмыттым»: хат жібереміз. Supabase email тіркелген-тіркелмегенін айтпайды — бөгде адам тексере алмайды */
export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const locale = readLocale(formData);
  if (!isSupabaseConfigured) return { error: "not_configured" };

  const email = text(formData, "email");
  if (!email) return { error: "missing_fields" };

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/${locale}/auth/callback?next=reset` });
  if (error) return { error: mapAuthError(error.code) };
  return { checkEmail: email };
}

/** Хаттағы сілтемемен келген пайдаланушының жаңа құпия сөзі (сессияны auth/callback ашады) */
export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const locale = readLocale(formData);
  if (!isSupabaseConfigured) return { error: "not_configured" };

  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "weak_password" };
  if (password !== String(formData.get("confirm") ?? "")) return { error: "password_mismatch" };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!canResetPassword(auth.user)) return { error: "link_expired" };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: mapAuthError(error.code) };
  redirect({ href: "/profile", locale });
  return null;
}

/**
 * Google арқылы кіру/тіркелу: Supabase Google-дың кіру бетінің адресін береді, біз соған жібереміз.
 * Google-дан кейін /[locale]/auth/callback бетіне қайтады (сессия сол жерде ашылады).
 * Google Client ID/Secret кодта жоқ — олар Supabase баптауларында (docs/GOOGLE-LOGIN.md).
 */
export async function googleLogin(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const locale = readLocale(formData);
  if (!isSupabaseConfigured) return { error: "not_configured" };

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/${locale}/auth/callback`, queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) {
    console.error("Google кіру қатесі:", error);
    return { error: "oauth_failed" };
  }
  externalRedirect(data.url);
}

/** Шығу */
export async function signOut(formData: FormData) {
  const locale = readLocale(formData);
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect({ href: "/", locale });
}

/** Демо режим: бір батырмамен оқушы немесе мұғалім болып кіру */
export async function demoLogin(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const locale = readLocale(formData);
  const role: DemoRole = formData.get("role") === "teacher" ? "teacher" : "student";

  const admin = createAdminClient();
  const password = process.env.DEMO_USER_PASSWORD ?? "";
  if (!admin || password.length < 16) return { error: "not_configured" };

  let accounts;
  try {
    accounts = await ensureDemoAccounts(admin, password);
  } catch (error) {
    console.error("Демо аккаунттарды дайындау қатесі:", error);
    return { error: "unknown" };
  }

  const supabase = await createClient();
  const credentials = { email: accounts[role].email, password };
  let { error } = await supabase.auth.signInWithPassword(credentials);
  if (error?.code === "invalid_credentials") {
    // Құпия сөз .env.local-да өзгерген болуы мүмкін — бір рет жаңартып, қайта кіреміз
    try {
      await resetDemoPassword(admin, accounts[role].id, password);
    } catch (resetError) {
      console.error("Демо құпия сөзін жаңарту қатесі:", resetError);
      return { error: "unknown" };
    }
    ({ error } = await supabase.auth.signInWithPassword(credentials));
  }
  if (error) return { error: mapAuthError(error.code) };

  redirect({ href: "/profile", locale });
  return null;
}

/** Onboarding: рөл, аты-жөні, сынып; оқушы — кодпен сыныпқа қосылады, мұғалім — сынып ашады */
export async function saveOnboarding(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const locale = readLocale(formData);
  const role = text(formData, "role");
  const fullName = text(formData, "fullName").slice(0, 80);
  const school = text(formData, "school").slice(0, 120) || null;
  const gradeValue = Number(text(formData, "grade"));
  const grade = gradeValue >= 7 && gradeValue <= 11 ? gradeValue : null;
  const joinCode = text(formData, "joinCode").replace(/\s/g, "");
  const className = text(formData, "className").slice(0, 40);

  if ((role !== "student" && role !== "teacher") || !fullName) return { error: "missing_fields" };
  if (role === "student" && joinCode && !/^\d{6}$/.test(joinCode)) return { error: "invalid_code" };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role, full_name: fullName, school, grade, locale, onboarded: true })
    .eq("id", auth.user.id);
  if (updateError) return { error: "unknown" };

  if (role === "student" && joinCode) {
    const { error } = await supabase.rpc("join_class", { p_code: joinCode });
    if (error) return { error: error.message.includes("class_not_found") ? "class_not_found" : "unknown" };
  }
  if (role === "teacher" && className) {
    const { error } = await supabase.rpc("create_class", { p_name: className, p_grade: grade });
    if (error) return { error: "unknown" };
  }

  redirect({ href: "/profile", locale });
  return null;
}
