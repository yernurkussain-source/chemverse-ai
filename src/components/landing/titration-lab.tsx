"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { drawTitrationCurve } from "@/components/lab/titration-curve";
import { TitrationFlask } from "@/components/lab/titration-flask";
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
    const draw = () => drawTitrationCurve(canvas, volume, { labels: { axisVolume, axisPh, eqMark } });
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
        <TitrationFlask
          volume={volume}
          liquid={liquid}
          dropKey={dropKey}
          label={t("flaskLabel")}
          text={t("flaskText")}
        />

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
