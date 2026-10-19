"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { QrCode } from "@/components/qr/qr-code";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Platform = "ios" | "android" | "desktop";
const PLATFORMS: Platform[] = ["ios", "android", "desktop"];
export const APK_URL = "/downloads/chemverse-ai.apk";

/** Браузердің «Орнату» оқиғасы (Chrome, Edge, Android) — стандартты типтерде жоқ */
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const noop = () => () => {};

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS 13+ өзін Mac деп таныстырады — сенсорлы экран бойынша ажыратамыз
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/** Қосымшаны орнату нұсқаулығы: құрылғыны өзі анықтайды, қалауынша басқасын да таңдауға болады */
export function InstallGuide() {
  const t = useTranslations("Install");
  const locale = useLocale();
  const detected = useSyncExternalStore<Platform | null>(noop, detectPlatform, () => null);
  const standalone = useSyncExternalStore(
    noop,
    () => window.matchMedia("(display-mode: standalone)").matches,
    () => false,
  );
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const isIosNotSafari = useSyncExternalStore(noop, () => /CriOS|FxiOS|EdgiOS/i.test(navigator.userAgent), () => false);
  const [chosen, setChosen] = useState<Platform | null>(null);
  const platform = chosen ?? detected ?? "android";

  // Chrome/Edge/Android: браузердің өз «Орнату» терезесін кейін ашу үшін оқиғаны сақтаймыз
  const promptRef = useRef<InstallPromptEvent | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      promptRef.current = event as InstallPromptEvent;
      setCanPrompt(true);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function installPwa() {
    const event = promptRef.current;
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") setInstalled(true);
    promptRef.current = null;
    setCanPrompt(false);
  }

  if (standalone || installed) {
    return <p className="rounded-2xl border border-good/50 bg-good/10 p-5 text-center text-lg font-semibold text-good">✓ {t("installed")}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label={t("platformLabel")} className="grid grid-cols-3 gap-1 rounded-2xl border border-line bg-panel-2 p-1">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={platform === p}
            onClick={() => setChosen(p)}
            className={cn(
              "min-h-11 rounded-xl px-2 text-[0.88rem] font-semibold transition-colors",
              platform === p ? "bg-cyan text-on-accent" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`platforms.${p}`)}
          </button>
        ))}
      </div>

      {platform === "ios" && (
        <section className="flex flex-col gap-4">
          {isIosNotSafari && (
            <p role="alert" className="rounded-xl border border-amber/50 bg-amber/10 px-4 py-3 text-[0.9rem] text-amber">
              {t("ios.openInSafari")}
            </p>
          )}
          <Steps
            items={[
              t("ios.s1"),
              <>
                {t("ios.s2")} <ShareIcon />
              </>,
              <>
                {t("ios.s3")} <PlusIcon />
              </>,
              t("ios.s4"),
            ]}
          />
          <p className="text-[0.85rem] text-muted-foreground">{t("ios.note")}</p>
        </section>
      )}

      {platform === "android" && (
        <section className="flex flex-col gap-4">
          <a
            href={APK_URL}
            download
            className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-cyan px-6 text-lg font-bold text-on-accent hover:-translate-y-px"
          >
            ⬇ {t("android.download")}
          </a>
          <Steps items={[t("android.s1"), t("android.s2"), t("android.s3")]} />
          {canPrompt && (
            <div className="rounded-2xl border border-line bg-panel p-4">
              <p className="mb-2 text-[0.9rem] text-muted-foreground">{t("android.pwaAlt")}</p>
              <Button type="button" variant="panel" size="pill" onClick={() => void installPwa()}>
                {t("installPwa")}
              </Button>
            </div>
          )}
        </section>
      )}

      {platform === "desktop" && (
        <section className="flex flex-col items-center gap-4 text-center">
          {origin && (
            <QrCode value={`${origin}/${locale}/install`} label={t("desktop.qrLabel")} size={200} className="rounded-xl" />
          )}
          <p className="max-w-[40ch] text-muted-foreground">{t("desktop.scan")}</p>
          {canPrompt && (
            <Button type="button" variant="glow" size="pill" onClick={() => void installPwa()}>
              {t("installPwa")}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 rounded-2xl border border-line bg-panel p-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-cyan font-mono font-bold text-on-accent">{i + 1}</span>
          <span className="pt-1">{item}</span>
        </li>
      ))}
    </ol>
  );
}

// iOS «Бөлісу» белгісі
function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline align-text-bottom text-cyan" aria-hidden="true">
      <path d="M12 3v12M8 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 11v8a2 2 0 002 2h10a2 2 0 002-2v-8" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline align-text-bottom text-cyan" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M12 8v8M8 12h8" strokeLinecap="round" />
    </svg>
  );
}
