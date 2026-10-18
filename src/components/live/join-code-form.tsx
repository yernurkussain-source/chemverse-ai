"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { TextInput } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

/** 6 санды Live кодын енгізу → /join/[код] */
export function JoinCodeForm() {
  const t = useTranslations("LiveClass");
  const router = useRouter();
  const [code, setCode] = useState("");
  const digits = code.replace(/\D/g, "");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (digits.length === 6) router.push(`/join/${digits}`);
  }

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-sm flex-col gap-3">
      <label htmlFor="live-code" className="sr-only">
        {t("codeLabel")}
      </label>
      <TextInput
        id="live-code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        inputMode="numeric"
        autoComplete="off"
        maxLength={7}
        placeholder="000 000"
        className="h-16 text-center font-mono text-3xl tracking-[0.2em]"
        autoFocus
      />
      <Button type="submit" variant="glow" size="pill" className="h-14 text-lg" disabled={digits.length !== 6}>
        {t("enter")}
      </Button>
    </form>
  );
}
