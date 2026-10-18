import { z } from "zod";

/**
 * Қысқа мерзімді жоспардың (ҚМЖ) құрылымы. AI дәл осы пішінде JSON қайтарады,
 * бет пен PDF осыдан сызылады. Өрістер ҚМЖ үлгісіне сай (оқу мақсаты, критерий, дескриптор, кезеңдер).
 */
export const RESOURCE_KINDS = ["molecule3d", "ar", "lab", "test", "periodic", "ai"] as const;

export const lessonPlanSchema = z.object({
  topic: z.string().describe("Сабақтың тақырыбы"),
  learningObjectives: z
    .array(z.string())
    .min(1)
    .max(4)
    .describe("Оқу бағдарламасына сәйкес оқу мақсаттары. Кодын білсең жаз (мысалы 8.2.2.1), сенімді болмасаң кодсыз жаз."),
  lessonObjectives: z.array(z.string()).min(1).max(4).describe("Сабақ мақсаттары: барлық оқушылар / көпшілігі / кейбірі"),
  assessmentCriteria: z.array(z.string()).min(1).max(4).describe("Бағалау критерийлері"),
  languageObjectives: z.object({
    terms: z.array(z.string()).max(10).describe("Пәндік терминдер"),
    phrases: z.array(z.string()).max(4).describe("Диалог пен жазу үшін тіркестер"),
  }),
  values: z.string().describe("Құндылықтарды дарыту"),
  crossCurricular: z.string().describe("Пәнаралық байланыс"),
  priorKnowledge: z.string().describe("Алдыңғы білім"),
  stages: z
    .array(
      z.object({
        stage: z.enum(["start", "middle", "end"]).describe("Сабақтың басы / ортасы / соңы"),
        minutes: z.number().int().min(1).max(45),
        teacherActions: z.string().describe("Мұғалімнің әрекеті"),
        studentActions: z.string().describe("Оқушының әрекеті"),
        assessment: z.string().describe("Бағалау (формативті)"),
        resources: z.array(z.string()).max(4).describe("Ресурстар"),
      }),
    )
    .min(3)
    .max(7),
  tasks: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().describe("Тапсырманың мазмұны"),
        descriptors: z.array(z.string()).min(1).max(5).describe("Дескрипторлар: білім алушы ..."),
        points: z.number().int().min(1).max(10),
      }),
    )
    .min(1)
    .max(4),
  differentiation: z.string().describe("Саралау: қолдау және қосымша тапсырма"),
  reflection: z.string().describe("Рефлексия тәсілі"),
  homework: z.string().describe("Үй тапсырмасы"),
  platformResources: z
    .array(
      z.object({
        kind: z.enum(RESOURCE_KINDS),
        target: z.string().describe("molecule3d/ar үшін молекула id (тізімнен), басқаларына бос жол"),
        note: z.string().describe("Сабақтың қай кезеңінде және қалай қолданылады"),
      }),
    )
    .max(5),
});

export type LessonPlan = z.infer<typeof lessonPlanSchema>;

/** Форма өрістері */
export const LESSON_DURATIONS = [40, 45] as const;
export const LESSON_TYPES = ["new", "practice", "lab", "review"] as const;
export type LessonType = (typeof LESSON_TYPES)[number];
