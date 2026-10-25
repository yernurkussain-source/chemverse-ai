import { Fragment, Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { PrintButton } from "@/components/qr/print-button";
import { econf, splitEq, type BankProblem } from "@/features/olympiad/core";
import { prettyFormula } from "@/features/olympiad/practice";
import { getMockForPrint } from "@/features/olympiad/server/mocks";
import { getTeacherId } from "@/features/teacher/queries";
import { Link } from "@/i18n/navigation";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Olympiad.print");
  return { title: t("title") };
}

type Params = PageProps<"/[locale]/olympiad/mock/[id]/print">["params"];

// Қағазбен өткізуге: тапсырма парағы + (жеке бетте) мұғалімге жауап кілті. «PDF» — браузердің басып шығару терезесі арқылы
export default function MockPrintPage({ params }: PageProps<"/[locale]/olympiad/mock/[id]/print">) {
  const t = useTranslations("Olympiad");
  return (
    <div className="page-wrap py-6 print:p-0">
      <Link href="/teacher/olympiad" className="text-[0.9rem] font-semibold text-cyan hover:underline print:hidden">
        ← {t("teacher.back")}
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
        <PrintContent params={params} />
      </Suspense>
    </div>
  );
}

const LETTERS = "АБВГДЕ";
const equationWith = (equation: string, coeffs?: number[]) => {
  const { L, R } = splitEq(equation);
  const part = (list: string[], offset: number) =>
    list.map((s, i) => `${coeffs ? (coeffs[i + offset] === 1 ? "" : coeffs[i + offset]) : "___ "}${prettyFormula(s)}`).join(" + ");
  return `${part(L, 0)} → ${part(R, L.length)}`;
};

function answerKey(p: BankProblem) {
  switch (p.type) {
    case "numeric":
      return `${String(p.answer.value).replace(".", ",")} ${p.answer.unit}`.trim();
    case "mcq":
      return `${LETTERS[p.correct]}) ${p.choices[p.correct]}`;
    case "balance":
      return equationWith(p.equation, p.coeffs);
    case "econf":
      return `${econf(p.Z).full}; ${p.unpaired}`;
    default:
      return p.solution.join(" ");
  }
}

async function PrintContent({ params }: { params: Params }) {
  const { id } = await params;
  const { userId, isTeacher } = await getTeacherId();
  if (!userId || !isTeacher) notFound();
  const [data, t] = await Promise.all([getMockForPrint(id, userId), getTranslations("Olympiad.print")]);
  if (!data) notFound();
  const { mock, problems } = data;
  const max = problems.reduce((sum, p) => sum + p.level, 0);

  return (
    <article className="mx-auto mt-4 flex max-w-3xl flex-col gap-5 rounded-2xl bg-white p-6 text-black print:mt-0 print:max-w-none print:rounded-none print:p-0 print:text-[11pt]">
      <div className="flex justify-end print:hidden">
        <PrintButton label={t("button")} />
      </div>
      <header className="flex flex-col gap-1 border-b border-black/30 pb-3">
        <h1 className="text-xl font-bold">{mock.title}</h1>
        <p className="text-[0.9rem]">{t("info", { count: problems.length, minutes: mock.duration_min, max })}</p>
        <p className="mt-2 text-[0.95rem]">{t("name")}: ______________________________ {t("class")}: ________</p>
      </header>
      <ol className="flex flex-col gap-5">
        {problems.map((p, i) => (
          <li key={p.id} className="break-inside-avoid">
            <p className="font-semibold whitespace-pre-line">
              {i + 1}. {p.kk} <span className="font-normal">({t("points", { points: p.level })})</span>
            </p>
            {p.type === "mcq" && (
              <ul className="mt-1.5 flex flex-col gap-0.5 pl-5">
                {p.choices.map((choice, j) => (
                  <li key={choice}>
                    {LETTERS[j]}) {choice}
                  </li>
                ))}
              </ul>
            )}
            {p.type === "balance" && <p className="mt-1.5 font-mono">{equationWith(p.equation)}</p>}
            {p.type === "econf" && (
              <p className="mt-1.5">
                {t("econfLine")}: ________________________________ {t("unpairedLine")}: ____
              </p>
            )}
            {p.type === "numeric" && (
              <p className="mt-1.5">
                {t("answerLine")}: ______________ {p.answer.unit}
              </p>
            )}
          </li>
        ))}
      </ol>

      {/* Жауап кілті — жеке бетте, тек мұғалімге */}
      <section className="mt-8 break-before-page border-t border-black/30 pt-4">
        <h2 className="text-lg font-bold">{t("key")}</h2>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[0.95rem]">
          {problems.map((p, i) => (
            <Fragment key={p.id}>
              <dt className="font-semibold">{i + 1}.</dt>
              <dd>{answerKey(p)}</dd>
            </Fragment>
          ))}
        </dl>
      </section>
    </article>
  );
}
