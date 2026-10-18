"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { QrCode } from "@/components/qr/qr-code";

type Props = { glb: string; name: string };

const subscribeNothing = () => () => {};

/**
 * AR көрініс (@google/model-viewer): Android-та WebXR / Scene Viewer, iPhone-да Quick Look.
 * Компьютерде AR жоқ — оның орнына осы беттің QR коды көрсетіледі (телефонмен сканерлеу үшін).
 */
export function ArViewer({ glb, name }: Props) {
  const t = useTranslations("Ar");
  const viewerRef = useRef<HTMLElement & { canActivateAR?: boolean }>(null);
  const [arSupported, setArSupported] = useState<boolean | null>(null);
  // Беттің толық адресі (QR үшін) — тек браузерде белгілі
  const pageUrl = useSyncExternalStore(subscribeNothing, () => window.location.href, () => null);

  // model-viewer тек браузерде жүктеледі; жүктелген соң AR мүмкіндігін тексереміз
  useEffect(() => {
    let cancelled = false;
    import("@google/model-viewer").then(() => {
      const el = viewerRef.current;
      if (!el || cancelled) return;
      const check = () => !cancelled && setArSupported(Boolean(el.canActivateAR));
      el.addEventListener("load", check);
      customElements.whenDefined("model-viewer").then(check);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
      {/* model-viewer-дің әдепкі биіктігі 150px — сондықтан шаршы қаптаманы толық толтырады */}
      <div className="aspect-square overflow-hidden rounded-3xl border border-line bg-[radial-gradient(120%_90%_at_50%_40%,var(--stage-a)_0%,var(--panel)_55%,var(--stage-b)_100%)] shadow-[0_1px_2px_var(--shadow)] dark:shadow-none">
        <model-viewer
          ref={viewerRef}
          src={glb}
          alt={t("viewerLabel", { name })}
          ar
          ar-modes="webxr scene-viewer quick-look"
          ar-scale="fixed"
          camera-controls
          auto-rotate
          touch-action="pan-y"
          shadow-intensity="1"
          exposure="1.1"
          style={{ width: "100%", height: "100%", background: "transparent" }}
        >
          <button
            slot="ar-button"
            type="button"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-cyan px-5 py-3 font-bold text-on-accent shadow-[0_0_22px_var(--glow)]"
          >
            {t("button")}
          </button>
        </model-viewer>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        {arSupported === false && pageUrl && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-panel p-5 text-center">
            <p className="font-display font-semibold">{t("desktopTitle")}</p>
            <p className="text-[0.88rem] text-muted-foreground">{t("desktopText")}</p>
            <div className="rounded-[14px] bg-white p-3 leading-none">
              <QrCode value={pageUrl} label={t("qrLabel")} size={180} />
            </div>
            <p className="text-[0.8rem] text-muted-foreground">{t("noAr")}</p>
          </div>
        )}
        <ol className="grid gap-2">
          {(["1", "2", "3"] as const).map((step) => (
            <li key={step} className="flex gap-3 rounded-[14px] border border-line bg-panel px-3.5 py-3 text-[0.9rem]">
              <b className="grid size-7 shrink-0 place-items-center rounded-full bg-cyan font-mono text-[0.8rem] text-on-accent">{step}</b>
              <span>{t(`steps.${step}`)}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
