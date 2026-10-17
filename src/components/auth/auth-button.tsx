"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { UserIcon } from "@/components/layout/nav-icons";

/**
 * Жоғарғы мәзірдегі «Кіру» / жеке кабинет батырмасы.
 * Сессия браузерде тексеріледі — сондықтан беттер статикалық күйінде қалады.
 */
export function AuthButton() {
  const t = useTranslations("Header");
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setLoggedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  // Мәзір тар болғандықтан — иконка: кірген болса көгілдір, кірмеген болса сұр
  const label = loggedIn ? t("account") : t("login");
  return (
    <Link
      href={loggedIn ? "/profile" : "/login"}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-10 place-items-center rounded-xl border bg-panel transition-colors hover:border-cyan",
        loggedIn ? "border-cyan-dim text-cyan" : "border-line text-foreground",
      )}
    >
      <UserIcon size={20} />
    </Link>
  );
}
