"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const inputClass =
  "w-full rounded-[10px] border border-line bg-panel-2 px-3 py-2.5 text-foreground placeholder:text-muted-foreground/70";

/** Белгісі (label) және кеңесі бар өріс */
export function Field({
  label,
  hint,
  id,
  children,
}: {
  label: string;
  hint?: string;
  id: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.85rem] text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && <span className="text-[0.75rem] text-muted-foreground">{hint}</span>}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

/** Жіберу батырмасы: сервер жауап бергенше «Күте тұрыңыз…» */
export function SubmitButton({ children, className }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  const t = useTranslations("Auth");
  return (
    <Button type="submit" variant="glow" size="pill" disabled={pending} className={cn("w-full", className)}>
      {pending ? t("pending") : children}
    </Button>
  );
}

/** Қате хабарламасы (экран оқу бағдарламалары да хабарлайды) */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-[10px] border border-pink/40 bg-pink/10 px-3 py-2 text-[0.88rem] text-pink">
      {message}
    </p>
  );
}
