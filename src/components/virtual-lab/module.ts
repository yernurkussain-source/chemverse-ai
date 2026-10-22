import type { ComponentType } from "react";
import type { AnalysisQuestion } from "./step-forms";

/**
 * Бір ChemLab тәжірибесінің клиенттік модулі: LabShell 8 қадамның жалпы бөлігін өзі салады,
 * ал тәжірибеге тән бөліктерді (модель, бақылау кестесі, мәтіндер) осы модуль береді.
 * Жауап кілттері мұнда ЖОҚ — олар тек серверде (features/virtual-lab/experiments/<slug>/grade.ts).
 */
export type LabTexts = {
  goal: string;
  theory: string;
  safety: string[];
  predictionQuestion: string;
  predictions: { value: string; label: string }[];
  equipment: { id: string; label: string }[];
  /** «Құралдар» қадамының тәжірибеге тән кеңесі (жоқ болса — жалпы мәтін) */
  equipmentHint?: string;
  equipmentLabel: (id: string) => string;
  questions: AnalysisQuestion[];
  conclusionHint: string;
  revealLabel: (key: string) => string | null;
  /** Ашылған мәнді мәтінмен жазу (мысалы пробиркадағы ерітіндінің атауы); null — formatReveal қолданылады */
  formatRevealValue?: (key: string, value: number) => string | null;
};

export type LabParams = Record<string, number>;
export type LabValue = Record<string, unknown>;

export type ExperimentProps = { params: LabParams; value: LabValue; onChange: (value: LabValue) => void };
export type ObservationProps = {
  params: LabParams;
  experiment: LabValue;
  values: Record<string, string>;
  onChange: (cellId: string, value: string) => void;
};

export type LabModule = {
  /** Аудармалар: компонент ішінде шақырылатын hook */
  useTexts: () => LabTexts;
  initialExperiment: LabValue;
  isExperimentDone: (value: LabValue) => boolean;
  Experiment: ComponentType<ExperimentProps>;
  Observation: ComponentType<ObservationProps>;
  isObservationDone: (params: LabParams, experiment: LabValue, values: Record<string, string>) => boolean;
  /** Талдау қадамындағы анықтамалық деректер (міндетті емес) */
  AnalysisData?: ComponentType<{ params: LabParams; experiment: LabValue }>;
  /** Бағалаудан кейін ашылатын мәнді жазу: «0,095 М», «+0,30 мл» */
  formatReveal: (key: string, value: number, locale: string) => string | null;
};
