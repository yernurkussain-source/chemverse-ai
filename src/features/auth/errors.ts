// Қате кодтары → messages/*.json ішіндегі Auth.errors және Onboarding.errors кілттері
export type AuthErrorCode =
  | "invalid_credentials"
  | "user_already_exists"
  | "weak_password"
  | "email_address_invalid"
  | "email_not_confirmed"
  | "over_email_send_rate_limit"
  | "missing_fields"
  | "not_configured"
  | "oauth_failed"
  | "password_mismatch"
  | "same_password"
  | "link_expired"
  | "unknown";

export type OnboardingErrorCode = "missing_fields" | "class_not_found" | "invalid_code" | "unknown";

export type AuthState = { error?: AuthErrorCode; checkEmail?: string } | null;
export type OnboardingState = { error?: OnboardingErrorCode } | null;

/** Supabase қате кодын біздің аударылған хабарламаға сәйкестендіру */
export function mapAuthError(code: string | undefined): AuthErrorCode {
  switch (code) {
    case "invalid_credentials":
    case "weak_password":
    case "email_address_invalid":
    case "email_not_confirmed":
    case "over_email_send_rate_limit":
    case "user_already_exists":
    case "same_password":
      return code;
    case "email_exists":
      return "user_already_exists";
    case "validation_failed":
      return "email_address_invalid";
    default:
      return "unknown";
  }
}
