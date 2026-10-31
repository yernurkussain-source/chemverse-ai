import type { User } from "@supabase/supabase-js";

const RECOVERY_WINDOW_MS = 60 * 60 * 1000;

/**
 * Жаңа құпия сөзді тек хаттағы сілтемемен келген адам қоя алады (сұрау 1 сағаттан ескі емес).
 * Әйтпесе мектеп компьютерінде шықпай кеткен аккаунттың құпия сөзін бөгде адам ауыстырып алуы мүмкін.
 */
export const canResetPassword = (user: User | null, now = Date.now()) =>
  !!user?.recovery_sent_at && now - Date.parse(user.recovery_sent_at) < RECOVERY_WINDOW_MS;
