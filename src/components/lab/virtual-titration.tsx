"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { submitTitration, type TitrationResult } from "@/features/lab/actions";
import { useIsDark } from "@/hooks/use-is-dark";
import { phenolphthaleinColor, TITRATION, titrationPH } from "@/lib/chemistry/titration";
import { formatDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { drawTitrationCurve } from "./titration-curve";
import { TitrationFlask } from "./titration-flask";

type Phase = "intro" | "titrate" | "calculate" | "result";

const STEPS = [
  { key: "ml1", ml: 1 },
  { key: "ml01", ml: 0.1 },
  { key: "drop", ml: TITRATION.dropMl },
] as const;

const GRADE_STYLE = {
  excellent: "border-good/50 bg-good/10 text-good",
  good: "border-cyan-dim bg-cyan/10 text-cyan",
  retry: "border-amber/50 bg-amber/10 text-amber",
} as const;

/** Виртуалды зертхана: белгісіз концентрациялы HCl-ды NaOH-пен титрлеу */
export function VirtualTitration() {
  const t = useTranslations("VirtualLab");
  const tLab = useTranslations("Lab");
  const locale = useLocale();
  const router = useRouter();
  const isDark = useIsDark();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [phase, setPhase] = useState<Phase>("intro");
  // Жасырын концентрация: «Бастау» басылғанда кездейсоқ таңдалады (0,080–0,120 М)
  const [concentration, setConcentration] = useState(0.1);
  const [startedAt, setStartedAt] = useState(0);
  const [volume, setVolume] = useState(0);
  const [dropKey, setDropKey] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answerError, setAnswerError] = useState(false);
  const [result, setResult] = useState<TitrationResult | null>(null);
  const [pending, startTransition] = useTransition();

  const pH = titrationPH(volume, concentration);
  const liquid = phenolphthaleinColor(pH);
  const pink = pH >= 8.2;
  const fmt = (value: number, digits = 2) => formatDecimal(value, locale, digits);

  const axisVolume = tLab("volume");
  const axisPh = tLab("ph");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || phase === "intro") return;
    const draw = () =>
      drawTitrationCurve(canvas, volume, {
        labels: { axisVolume, axisPh, eqMark: "" },
        acidConcentration: concentration,
        // Нәтижеден кейін ғана толық қисық пен эквивалент нүктесі ашылады
        hideAnswer: phase !== "result",
      });
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [volume, concentration, phase, isDark, axisVolume, axisPh]);

  function start() {
    setConcentration((80 + Math.floor(Math.random() * 41)) / 1000);
    setStartedAt(Date.now());
    setVolume(0);
    setDropKey(0);
    setAnswer("");
    setResult(null);
    setPhase("titrate");
  }

  function add(ml: number) {
    // Бюреткадан құйылған ерітіндіні кері қайтаруға болмайды — тек қосамыз
    setVolume((v) => Math.min(TITRATION.maxVolumeMl, +(v + ml).toFixed(2)));
    setDropKey((k) => k + 1);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = Number(answer.replace(",", ".").trim());
    if (!Number.isFinite(value) || value <= 0 || value > 10) {
      setAnswerError(true);
      return;
    }
    setAnswerError(false);
    const durationSec = Math.round((Date.now() - startedAt) / 1000);
    startTransition(async () => {
      const evaluated = await submitTitration({ trueConcentration: concentration, endpointMl: volume, answer: value, durationSec });
      if (!evaluated) return;
      setResult(evaluated);
      setPhase("result");
      if (evaluated.saved) router.refresh();
    });
  }

  if (phase === "intro") {
    return (
      <div className="grid gap-4.5 md:grid-cols-[1fr_320px]">
        <section className="rounded-3xl border border-line bg-panel p-6 sm:p-7">
          <h2 className="font-display text-lg font-semibold">{t("taskTitle")}</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[0.95rem]">
            {(["s1", "s2", "s3", "s4"] as const).map((step) => (
              <li key={step}>{t(`steps.${step}`)}</li>
            ))}
          </ol>
          <p className="mt-4 rounded-xl bg-panel-2 px-3.5 py-2.5 font-mono text-[0.85rem]">{t("formula")}</p>
          <Button type="button" variant="glow" size="pill" className="mt-5" onClick={start}>
            {t("start")}
          </Button>
        </section>
        <aside className="h-fit rounded-3xl border border-amber/50 bg-amber/10 p-5">
          <h2 className="font-display font-semibold text-amber">⚠ {t("safetyTitle")}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.88rem]">
            {(["goggles", "gloves", "burette", "spill"] as const).map((rule) => (
              <li key={rule}>{t(`safety.${rule}`)}</li>
            ))}
          </ul>
        </aside>
      </div>
    );
  }

  return (
    <div className="grid gap-4.5 md:grid-cols-[300px_1fr]">
      <section className="flex flex-col items-center gap-3.5 rounded-3xl border border-line bg-panel p-5">
        <TitrationFlask volume={volume} liquid={liquid} dropKey={dropKey} label={tLab("flaskLabel")} text={t("flaskText")} />
        <dl className="m-0 grid w-full grid-cols-2 gap-2.5">
          <Readout label={tLab("volume")} value={fmt(volume)} />
          <Readout label={tLab("ph")} value={fmt(pH)} />
        </dl>
        <p className={cn("text-center text-[0.92rem] font-bold", pink ? "text-pink" : "text-muted-foreground")} aria-live="polite">
          {pink ? t("colorPink") : t("colorNone")}
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-3xl border border-line bg-panel p-5">
        <canvas ref={canvasRef} role="img" aria-label={tLab("curveLabel")} className="block aspect-[16/10] h-auto w-full" />

        {phase === "titrate" && (
          <>
            <p className="text-[0.9rem] text-muted-foreground">{t("titrateHint")}</p>
            <div className="flex flex-wrap gap-2">
              {STEPS.map(({ key, ml }) => (
                <Button
                  key={key}
                  type="button"
                  variant="panel"
                  size="pill-sm"
                  disabled={volume >= TITRATION.maxVolumeMl}
                  onClick={() => add(ml)}
                >
                  {t(`add.${key}`)}
                </Button>
              ))}
              <Button type="button" variant="glow" size="pill-sm" className="ml-auto" onClick={() => setPhase("calculate")}>
                {t("stopHere")}
              </Button>
            </div>
          </>
        )}

        {phase === "calculate" && (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <h2 className="font-display font-semibold">{t("calcTitle")}</h2>
            <dl className="m-0 grid grid-cols-3 gap-2 text-[0.85rem]">
              <Readout label="V(HCl), мл" value={fmt(TITRATION.acidVolumeMl, 0)} small />
              <Readout label="c(NaOH), М" value={fmt(TITRATION.concentration, 1)} small />
              <Readout label="V(NaOH), мл" value={fmt(volume)} small />
            </dl>
            <p className="font-mono text-[0.82rem] text-muted-foreground">{t("formula")}</p>
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.85rem] text-muted-foreground">{t("answerLabel")}</span>
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                inputMode="decimal"
                placeholder="0,0000"
                aria-invalid={answerError}
                className="w-full max-w-60 rounded-[10px] border border-line bg-panel-2 px-3 py-2.5 font-mono text-lg"
              />
            </label>
            {answerError && (
              <p role="alert" className="text-[0.85rem] text-pink">
                {t("answerInvalid")}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="glow" size="pill" disabled={pending}>
                {pending ? t("checking") : t("check")}
              </Button>
              <Button type="button" variant="panel" size="pill" onClick={() => setPhase("titrate")}>
                {t("backToTitrate")}
              </Button>
            </div>
          </form>
        )}

        {phase === "result" && result && (
          <div className="flex flex-col gap-3">
            <p className={cn("rounded-2xl border px-4 py-3 font-semibold", GRADE_STYLE[result.grade])}>{t(`grades.${result.grade}`)}</p>
            <dl className="m-0 grid grid-cols-2 gap-2">
              <Readout label={t("yourAnswer")} value={`${fmt(result.answer, 4)} М`} small />
              <Readout label={t("trueValue")} value={`${fmt(result.trueConcentration, 3)} М`} small />
              <Readout label={t("errorPct")} value={`${fmt(result.answerErrorPct, 1)} %`} small />
              <Readout label={t("equivalence")} value={`${fmt(result.equivalenceMl)} мл`} small />
            </dl>
            <p className="text-[0.88rem] text-muted-foreground">
              {Math.abs(result.overshootMl) < 0.1
                ? t("overshootGood")
                : result.overshootMl > 0
                  ? t("overshootOver", { ml: fmt(result.overshootMl) })
                  : t("overshootUnder", { ml: fmt(-result.overshootMl) })}
            </p>
            <p className="text-[0.8rem] text-muted-foreground">{result.saved ? t("saved") : t("notSaved")}</p>
            <Button type="button" variant="glow" size="pill" className="self-start" onClick={start}>
              {t("again")}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function Readout({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl bg-panel-2 px-3 py-2.5">
      {/* uppercase қолданылмайды: «NaOH», «pH» жазылуы химиялық тұрғыдан дәл қалуы керек */}
      <dt className="font-mono text-[0.72rem] tracking-[0.04em] text-muted-foreground">{label}</dt>
      <dd className={cn("m-0 font-mono font-semibold tabular-nums", small ? "text-base" : "text-[1.4rem]")}>{value}</dd>
    </div>
  );
}
