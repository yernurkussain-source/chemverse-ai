"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import type { Html5Qrcode } from "html5-qrcode";
import { inputClass } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import { TOKEN_PATTERN } from "@/features/qr/types";

type ScanState = "idle" | "starting" | "scanning" | "denied" | "insecure" | "unavailable";
type Found = { kind: "external"; url: string } | { kind: "text"; text: string } | { kind: "notFound" };

const READER_ID = "qr-reader";

/**
 * Оқылған мәтін біздің сайттың сілтемесі ме? Иә болса — ішкі жол ("/q/Ab3dEf7h", "/kk/ar/h2o").
 * QR-да тек 8 таңбалы токен болса да қабылдаймыз.
 */
function internalPath(text: string): string | null {
  const value = text.trim();
  if (TOKEN_PATTERN.test(value)) return `/q/${value}`;
  // Қарапайым мәтін (мысалы "hello") сілтеме емес
  if (!/^(https?:\/\/|\/)/i.test(value)) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

/**
 * QR сканер: телефонның артқы камерасымен оқиды. Кадрлар тек құрылғыда өңделеді, серверге жіберілмейді.
 * Камера болмаса — суреттен оқу немесе кодты қолмен енгізу.
 */
export function QrScanner() {
  const t = useTranslations("Scan");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [state, setState] = useState<ScanState>("idle");
  const [found, setFound] = useState<Found | null>(null);
  const [manual, setManual] = useState("");

  async function getScanner() {
    if (!scannerRef.current) {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      scannerRef.current = new Html5Qrcode(READER_ID, {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        // Android Chrome-дағы кіріктірілген BarcodeDetector — жылдамырақ
        useBarCodeDetectorIfSupported: true,
      });
    }
    return scannerRef.current;
  }

  async function stop() {
    const scanner = scannerRef.current;
    if (scanner?.isScanning) await scanner.stop().catch(() => {});
  }

  // Беттен шыққанда камераны міндетті түрде өшіреміз
  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      if (scanner?.isScanning) void scanner.stop().catch(() => {});
    };
  }, []);

  async function handleText(text: string) {
    const path = internalPath(text);
    if (path) {
      await stop();
      // Толық өту: /q/... серверде тексеріліп, керекті бетке бағытталады
      window.location.assign(path);
      return;
    }
    await stop();
    setState("idle");
    setFound(/^https?:\/\//i.test(text.trim()) ? { kind: "external", url: text.trim() } : { kind: "text", text });
  }

  async function start() {
    setFound(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setState("insecure");
      return;
    }
    setState("starting");
    try {
      const scanner = await getScanner();
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: (w, h) => ({ width: Math.floor(Math.min(w, h) * 0.7), height: Math.floor(Math.min(w, h) * 0.7) }) },
        (text) => void handleText(text),
        undefined,
      );
      setState("scanning");
    } catch (error) {
      const message = String(error);
      setState(/NotAllowed|Permission|SecurityError/i.test(message) ? "denied" : "unavailable");
    }
  }

  async function scanImage(file: File | undefined) {
    if (!file) return;
    setFound(null);
    try {
      await stop();
      setState("idle");
      const scanner = await getScanner();
      const text = await scanner.scanFile(file, false);
      await handleText(text);
    } catch {
      setFound({ kind: "notFound" });
    }
  }

  function submitManual(event: FormEvent) {
    event.preventDefault();
    if (manual.trim()) void handleText(manual);
  }

  const scanning = state === "scanning" || state === "starting";
  const cameraError = state === "denied" || state === "insecure" || state === "unavailable" ? state : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-3xl border border-line bg-panel-2">
        {/* html5-qrcode осы элементтің ішіне видео қояды */}
        <div id={READER_ID} className="size-full [&_video]:size-full! [&_video]:object-cover" />
        {!scanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <span aria-hidden className="size-24 rounded-2xl border-4 border-dashed border-cyan-dim" />
            {cameraError && (
              <p role="alert" className="text-[0.9rem] text-amber">
                {t(`errors.${cameraError}`)}
              </p>
            )}
            <Button type="button" variant="glow" size="pill" onClick={() => void start()}>
              {state === "idle" ? t("start") : t("retry")}
            </Button>
          </div>
        )}
        {state === "starting" && (
          <p className="absolute inset-x-0 bottom-4 text-center text-[0.9rem] text-muted-foreground">{t("starting")}</p>
        )}
      </div>

      {state === "scanning" && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-center text-muted-foreground">{t("pointCamera")}</p>
          <Button type="button" variant="panel" size="pill-sm" onClick={() => void stop().then(() => setState("idle"))}>
            {t("stop")}
          </Button>
        </div>
      )}

      {found && (
        <div role="status" className="rounded-2xl border border-line bg-panel p-4 text-[0.92rem]">
          {found.kind === "external" && (
            <>
              <p className="mb-2 text-muted-foreground">{t("external")}</p>
              <a href={found.url} target="_blank" rel="noopener noreferrer" className="font-mono break-all text-cyan underline">
                {found.url}
              </a>
            </>
          )}
          {found.kind === "text" && (
            <>
              <p className="mb-2 text-muted-foreground">{t("plainText")}</p>
              <p className="font-mono break-all">{found.text}</p>
            </>
          )}
          {found.kind === "notFound" && <p className="text-amber">{t("notFound")}</p>}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-line bg-panel px-4 text-[0.9rem] font-semibold hover:border-cyan-dim">
          {t("fromImage")}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => void scanImage(e.target.files?.[0])} />
        </label>
        <form onSubmit={submitManual} className="flex gap-2">
          <label htmlFor="qr-manual" className="sr-only">
            {t("manualLabel")}
          </label>
          <input
            id="qr-manual"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder={t("manualPlaceholder")}
            autoComplete="off"
            className={`${inputClass} min-w-0 flex-1 rounded-full`}
          />
          <Button type="submit" variant="panel" size="pill-sm">
            {t("open")}
          </Button>
        </form>
      </div>
    </div>
  );
}
