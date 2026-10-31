import assert from "node:assert/strict";
import { test } from "node:test";
import type { User } from "@supabase/supabase-js";
import { canResetPassword } from "@/features/auth/recovery";

const now = Date.parse("2026-11-01T10:00:00Z");
const user = (recovery_sent_at?: string) => ({ id: "u1", recovery_sent_at }) as User;

test("құпия сөзді тек жаңа (1 сағаттан ескі емес) хат сілтемесімен ауыстыруға болады", () => {
  assert.equal(canResetPassword(user("2026-11-01T09:30:00Z"), now), true);
  assert.equal(canResetPassword(user("2026-11-01T08:59:00Z"), now), false);
  assert.equal(canResetPassword(user(undefined), now), false);
  assert.equal(canResetPassword(null, now), false);
});
