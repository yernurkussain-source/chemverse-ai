"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useIsDark } from "@/hooks/use-is-dark";
import {
  mediumState,
  phenolphthaleinColor,
  TITRATION,
  titrationPH,
  type MediumState,
} from "@/lib/chemistry/titration";
import { formatDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Panel } from "./section";

const STATE_COLOR: Record<MediumState, string> = {
  acid: "text-cyan",
  equivalence: "text-good",
  weakBase: "text-pink",
  base: "text-pink",
};

export function TitrationLab() {
  const t = useTranslations("Lab");
  // Сандар тілге сай: kk/ru — 1,79; en — 1.79
  const locale = useLocale();
  const [volume, setVolume] = useState(18);
  const [dropKey, setDropKey] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDark = useIsDark();

  const pH = titrationPH(volume);
  const state = mediumState(volume, pH);
  const liquid = phenolphthaleinColor(pH);

  const axisVolume = t("volume");
  const axisPh = t("ph");
  const eqMark = t("equivalenceMark");

  // Қисықты сызу: көлем, режим немесе өлшем өзгергенде қайта сызылады
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => drawCurve(canvas, volume, { axisVolume, axisPh, eqMark });
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [volume, isDark, axisVolume, axisPh, eqMark]);

  function addDrop() {
    setVolume((v) => Math.min(TITRATION.maxVolumeMl, +(v + TITRATION.dropMl).toFixed(2)));
    setDropKey((k) => k + 1);
  }

  return (
    <div className="grid gap-4.5 md:grid-cols-[300px_1fr]">
      <Panel className="flex flex-col items-center gap-3.5">
        <svg viewBox="0 0 220 260" role="img" aria-label={t("flaskLabel")} className="h-auto w-full max-w-60">
          <defs>
            <clipPath id="flask-clip">
              <path d="M85 20h50v70l55 120a20 20 0 01-18 28H48a20 20 0 01-18-28l55-120z" />
            </clipPath>
            <linearGradient id="flask-gloss" x1="0" x2="1">
              <stop offset="0" stopColor="#fff" stopOpacity=".18" />
              <stop offset=".4" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect className="text-line" x="104" y="0" width="12" height="16" rx="3" fill="currentColor" />
          <circle
            key={dropKey}
            cx="110"
            cy="22"
            r="4"
            fill="#9EE6F2"
            className={dropKey ? "animate-drop" : "opacity-0"}
          />
          <g clipPath="url(#flask-clip)">
            <rect className="text-glass" x="0" y="0" width="220" height="260" fill="currentColor" />
            <rect
              x="0"
              y={150 - volume * 0.9}
              width="220"
              height={110 + volume * 0.9}
              fill={liquid.rgb}
              fillOpacity={liquid.opacity}
            />
            <rect x="0" y="0" width="220" height="260" fill="url(#flask-gloss)" />
          </g>
          <path
            className="text-muted-foreground"
            d="M85 20h50v70l55 120a20 20 0 01-18 28H48a20 20 0 01-18-28l55-120z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          <path className="text-muted-foreground" d="M80 20h60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <text
            className="fill-muted-foreground font-mono"
            x="110"
            y="225"
            textAnchor="middle"
            fontSize="11"
          >
            {t("flaskText")}
          </text>
        </svg>

        <dl className="m-0 grid w-full grid-cols-2 gap-2.5">
          <Readout label={t("volume")} value={formatDecimal(volume, locale)} />
          <Readout label={t("ph")} value={formatDecimal(pH, locale)} />
        </dl>
        <p className={cn("text-center text-[0.92rem] font-bold", STATE_COLOR[state])} aria-live="polite">
          {t(`states.${state}`)}
        </p>
      </Panel>

      <Panel className="flex flex-col gap-3.5">
        <canvas ref={canvasRef} role="img" aria-label={t("curveLabel")} className="block aspect-[16/10] h-auto w-full" />
        <div className="flex flex-wrap items-center gap-2.5">
          <label htmlFor="naoh-volume" className="text-[0.88rem] text-muted-foreground">
            {t("slider")}
          </label>
          <input
            id="naoh-volume"
            type="range"
            min={0}
            max={TITRATION.maxVolumeMl}
            step={TITRATION.dropMl}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="min-w-40 flex-1 accent-pink"
          />
          <Button variant="panel" size="pill-sm" onClick={addDrop}>
            {t("drop")}
          </Button>
          <Button variant="panel" size="pill-sm" onClick={() => setVolume(0)}>
            {t("reset")}
          </Button>
        </div>
        <p className="font-mono text-[0.78rem] text-muted-foreground">{t("conditions")}</p>
      </Panel>
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-panel-2 px-3 py-2.5">
      {/* uppercase қолданылмайды: «NaOH», «pH» жазылуы химиялық тұрғыдан дәл қалуы керек */}
      <dt className="font-mono text-[0.72rem] tracking-[0.04em] text-muted-foreground">{label}</dt>
      <dd className="m-0 font-mono text-[1.4rem] font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/** Титрлеу қисығы (prototype.html-дегі drawCurve функциясы) */
function drawCurve(
  canvas: HTMLCanvasElement,
  volume: number,
  labels: { axisVolume: string; axisPh: string; eqMark: string },
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  if (!W || !H) return;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const { maxVolumeMl, equivalenceMl } = TITRATION;
  const L = 40;
  const R = 14;
  const T = 14;
  const B = 34;
  const pw = W - L - R;
  const ph = H - T - B;
  const X = (x: number) => L + (x / maxVolumeMl) * pw;
  const Y = (y: number) => T + (1 - y / 14) * ph;
  const muted = css("--text-muted");

  // Тор және осьтер (қаріп — сайттағы моно қаріп, next/font айнымалысынан)
  ctx.font = `11px ${css("--font-fira-code") || "ui-monospace"}, monospace`;
  ctx.fillStyle = muted;
  ctx.strokeStyle = css("--line");
  ctx.lineWidth = 1;
  for (let y = 0; y <= 14; y += 2) {
    ctx.beginPath();
    ctx.moveTo(L, Y(y));
    ctx.lineTo(W - R, Y(y));
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText(String(y), L - 8, Y(y) + 4);
  }
  for (let x = 0; x <= maxVolumeMl; x += 10) {
    ctx.textAlign = "center";
    ctx.fillText(String(x), X(x), H - B + 18);
  }
  ctx.textAlign = "left";
  ctx.fillText(labels.axisPh, 4, T + 4);
  ctx.textAlign = "right";
  ctx.fillText(labels.axisVolume, W - R, H - 4);

  // Фенолфталеиннің түс өзгеру аралығы (pH 8,2–10)
  ctx.fillStyle = "rgba(255,95,162,.08)";
  ctx.fillRect(L, Y(10), pw, Y(8.2) - Y(10));

  // Эквивалент нүктесі
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = muted;
  ctx.beginPath();
  ctx.moveTo(X(equivalenceMl), T);
  ctx.lineTo(X(equivalenceMl), T + ph);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = muted;
  ctx.textAlign = "left";
  ctx.fillText(labels.eqMark, X(equivalenceMl) + 6, T + 12);

  // Толық қисық (бозғылт)
  ctx.strokeStyle = "rgba(142,154,198,.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 0; x <= maxVolumeMl; x += 0.1) {
    const p = titrationPH(x);
    if (x === 0) ctx.moveTo(X(x), Y(p));
    else ctx.lineTo(X(x), Y(p));
  }
  ctx.stroke();

  // Қосылған көлемге дейінгі бөлігі
  const gradient = ctx.createLinearGradient(0, Y(1), 0, Y(13));
  gradient.addColorStop(0, css("--cyan"));
  gradient.addColorStop(1, css("--pink"));
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= volume; x += 0.05) {
    const p = titrationPH(x);
    if (x === 0) ctx.moveTo(X(x), Y(p));
    else ctx.lineTo(X(x), Y(p));
  }
  ctx.stroke();

  // Ағымдағы нүкте
  const current = titrationPH(volume);
  ctx.fillStyle = css("--text");
  ctx.beginPath();
  ctx.arc(X(volume), Y(current), 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = css("--pink");
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(X(volume), Y(current), 9, 0, Math.PI * 2);
  ctx.stroke();
}
