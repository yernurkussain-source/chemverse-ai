"use client";

import { useEffect, useReducer, useRef, useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import { startLab, submitLab, type LabOutcome } from "@/features/virtual-lab/actions";
import type { ShellLabSlug } from "@/features/virtual-lab/catalog";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { LabParams, LabValue } from "./module";
import { LAB_MODULES } from "./modules";
import { ChoiceList, SafetyCard } from "./parts";
import { ScoreView } from "./score-view";
import { AnalysisQuestions, ConclusionEditor, EquipmentPicker } from "./step-forms";
import { LAB_STEPS, Stepper } from "./stepper";

type LabState = {
  step: number;
  session: { params: LabParams; token: string } | null;
  prediction: string | null;
  equipment: string[];
  experiment: LabValue;
  observations: Record<string, string>;
  answers: Record<string, string>;
  conclusion: string;
  result: (LabOutcome & { attemptId: string | null; saved: boolean }) | null;
};

type Action =
  | { type: "restore"; state: LabState }
  | { type: "reset"; initial: LabState }
  | { type: "patch"; patch: Partial<LabState> };

function reducer(state: LabState, action: Action): LabState {
  switch (action.type) {
    case "restore":
      return action.state;
    case "reset":
      return action.initial;
    case "patch":
      return { ...state, ...action.patch };
  }
}

const SCORE_STEP = LAB_STEPS.length - 1;

/**
 * ChemLab тәжірибесінің ортақ «қабықшасы» (docs/chemlab/CHEMLAB_SPEC.md 4-бөлім): 8 қадам.
 * Күй браузердің sessionStorage-інде сақталады — бетті кездейсоқ жаңартса да жұмыс жоғалмайды.
 */
export function LabShell({ slug }: { slug: ShellLabSlug }) {
  const t = useTranslations("ChemLab");
  const lab = LAB_MODULES[slug];
  const texts = lab.useTexts();
  const router = useRouter();
  const topRef = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<"start" | "invalid" | "expired" | null>(null);

  const storageKey = `chemlab:${slug}:v1`;
  const initial: LabState = {
    step: 0,
    session: null,
    prediction: null,
    equipment: [],
    experiment: lab.initialExperiment,
    observations: {},
    answers: {},
    conclusion: "",
    result: null,
  };
  const [state, dispatch] = useReducer(reducer, initial);
  const restored = useRef(false);

  // Бұрынғы күйді қалпына келтіру (бет сызылғаннан кейін — гидратация қатесі болмауы үшін)
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const saved = window.sessionStorage.getItem(storageKey);
        if (saved) dispatch({ type: "restore", state: { ...initial, ...(JSON.parse(saved) as Partial<LabState>) } });
      } catch {
        // sessionStorage жабық (жасырын режим т.б.) — жаңадан бастаймыз
      }
      restored.current = true;
    }, 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- тек бір рет, бет ашылғанда
  }, [storageKey]);

  useEffect(() => {
    if (!restored.current) return;
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // сақтау мүмкін емес — маңызды емес
    }
  }, [state, storageKey]);

  const patch = (value: Partial<LabState>) => dispatch({ type: "patch", patch: value });

  function goTo(step: number) {
    setError(null);
    patch({ step });
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function next() {
    if (state.step === 0 && !state.session) {
      startTransition(async () => {
        const started = await startLab(slug);
        if (!started.ok) {
          setError("start");
          return;
        }
        patch({ session: { params: started.params, token: started.token } });
        goTo(1);
      });
      return;
    }
    goTo(state.step + 1);
  }

  function submit() {
    if (!state.session) return;
    const session = state.session;
    startTransition(async () => {
      const result = await submitLab({
        slug,
        token: session.token,
        prediction: state.prediction,
        equipment: state.equipment,
        experiment: state.experiment,
        observations: state.observations,
        answers: state.answers,
        conclusion: state.conclusion,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      patch({
        result: {
          breakdown: result.breakdown,
          feedback: result.feedback,
          reveal: result.reveal,
          attemptId: result.attemptId,
          saved: result.saved,
        },
      });
      goTo(SCORE_STEP);
      if (result.saved) router.refresh();
    });
  }

  function again() {
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // ескерілмейді
    }
    setError(null);
    dispatch({ type: "reset", initial });
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const params = state.session?.params ?? {};
  const step = LAB_STEPS[state.step];
  const canNext = (() => {
    switch (step) {
      case "goal":
        return true;
      case "prediction":
        return Boolean(state.prediction);
      case "equipment":
        return state.equipment.length > 0;
      case "experiment":
        return lab.isExperimentDone(state.experiment);
      case "observation":
        return lab.isObservationDone(params, state.experiment, state.observations);
      case "analysis":
        return texts.questions.every((q) => (state.answers[q.id] ?? "").trim());
      case "conclusion":
        return state.conclusion.trim().length >= 10;
      default:
        return false;
    }
  })();

  let body: ReactNode = null;
  if (step === "goal") {
    body = (
      <div className="grid gap-4 md:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-4">
          <section>
            <h3 className="font-display font-semibold">{t("goalStep.goalTitle")}</h3>
            <p className="mt-1.5">{texts.goal}</p>
          </section>
          <section>
            <h3 className="font-display font-semibold">{t("goalStep.theoryTitle")}</h3>
            <p className="mt-1.5 leading-relaxed text-muted-foreground">{texts.theory}</p>
          </section>
        </div>
        <SafetyCard title={t("goalStep.safetyTitle")} rules={texts.safety} />
      </div>
    );
  } else if (step === "prediction") {
    body = (
      <div className="flex flex-col gap-3">
        <p className="font-semibold">{texts.predictionQuestion}</p>
        <ChoiceList
          name="prediction"
          label={texts.predictionQuestion}
          options={texts.predictions}
          value={state.prediction}
          onChange={(prediction) => patch({ prediction })}
        />
        <p className="text-[0.85rem] text-muted-foreground">{t("predictionStep.hint")}</p>
      </div>
    );
  } else if (step === "equipment") {
    body = (
      <EquipmentPicker
        items={texts.equipment}
        selected={state.equipment}
        onToggle={(id) =>
          patch({ equipment: state.equipment.includes(id) ? state.equipment.filter((e) => e !== id) : [...state.equipment, id] })
        }
      />
    );
  } else if (step === "experiment") {
    body = <lab.Experiment params={params} value={state.experiment} onChange={(experiment) => patch({ experiment })} />;
  } else if (step === "observation") {
    body = (
      <lab.Observation
        params={params}
        experiment={state.experiment}
        values={state.observations}
        onChange={(cellId, value) => patch({ observations: { ...state.observations, [cellId]: value } })}
      />
    );
  } else if (step === "analysis") {
    body = (
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground">{t("analysisStep.hint")}</p>
        {lab.AnalysisData && <lab.AnalysisData params={params} experiment={state.experiment} />}
        <AnalysisQuestions
          questions={texts.questions}
          answers={state.answers}
          onChange={(id, value) => patch({ answers: { ...state.answers, [id]: value } })}
        />
      </div>
    );
  } else if (step === "conclusion") {
    body = <ConclusionEditor value={state.conclusion} onChange={(conclusion) => patch({ conclusion })} hint={texts.conclusionHint} />;
  } else if (step === "score" && state.result) {
    body = (
      <div className="flex flex-col gap-4">
        <ScoreView lab={lab} outcome={state.result} />
        <p className="text-[0.85rem] text-muted-foreground">{state.result.saved ? t("scoreView.saved") : t("scoreView.notSaved")}</p>
      </div>
    );
  }

  return (
    <div ref={topRef} className="flex scroll-mt-24 flex-col gap-5">
      <Stepper current={state.step} onSelect={goTo} locked={Boolean(state.result)} />
      <section aria-labelledby="lab-step-title" className="rounded-3xl border border-line bg-panel p-5 sm:p-7">
        <h2 id="lab-step-title" className="mb-4 font-display text-xl font-semibold">
          <span className="mr-2 font-mono text-[0.9rem] text-cyan">{state.step + 1}/8</span>
          {t(`steps.${step}`)}
        </h2>
        {body}

        {error && (
          <p role="alert" className="mt-4 rounded-[10px] border border-pink/40 bg-pink/10 px-3 py-2 text-[0.88rem] text-pink">
            {t(`errors.${error}`)}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
          {step === "score" ? (
            <>
              <Button type="button" variant="glow" size="pill" onClick={again}>
                {t("nav.again")}
              </Button>
              {state.result?.attemptId && (
                <Link href={`/virtual-lab/${slug}/result/${state.result.attemptId}`} className={buttonVariants({ variant: "panel", size: "pill" })}>
                  {t("nav.openResult")}
                </Link>
              )}
            </>
          ) : (
            <>
              <Button type="button" variant="panel" size="pill" disabled={state.step === 0 || pending} onClick={() => goTo(state.step - 1)} className={cn(state.step === 0 && "invisible")}>
                {t("nav.back")}
              </Button>
              {/* Ескерту — батырмалардың үстінде, бөлек жолда (телефонда «Келесі» төмен түсіп кетпеуі үшін) */}
              {!canNext && step !== "goal" && (
                <p className="order-first w-full text-right text-[0.8rem] text-muted-foreground">{t("nav.needStep")}</p>
              )}
              {step === "conclusion" ? (
                <Button type="button" variant="glow" size="pill" disabled={!canNext || pending} onClick={submit}>
                  {pending ? t("nav.submitting") : t("nav.submit")}
                </Button>
              ) : (
                <Button type="button" variant="glow" size="pill" disabled={!canNext || pending} onClick={next}>
                  {step === "goal" && !state.session ? t("nav.start") : t("nav.next")}
                </Button>
              )}
            </>
          )}
        </div>
      </section>
      {error === "expired" && (
        <Button type="button" variant="panel" size="pill" className="self-start" onClick={again}>
          {t("nav.again")}
        </Button>
      )}
    </div>
  );
}
