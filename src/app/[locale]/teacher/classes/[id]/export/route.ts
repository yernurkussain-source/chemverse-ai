import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { getClassDetail, getTeacherId } from "@/features/teacher/queries";
import { routing } from "@/i18n/routing";
import { toCsv } from "@/lib/csv";
import { formatPlain } from "@/lib/format";

/** Сынып нәтижелерін CSV (Excel) етіп жүктеу: тек сол сыныптың мұғаліміне (getClassDetail иесін тексереді) */
export async function GET(_request: Request, { params }: RouteContext<"/[locale]/teacher/classes/[id]/export">) {
  const { locale: value, id } = await params;
  const locale = hasLocale(routing.locales, value) ? value : routing.defaultLocale;
  const { userId, isTeacher } = await getTeacherId();
  if (!userId || !isTeacher) return new Response("Forbidden", { status: 403 });
  const detail = await getClassDetail(id, userId, locale);
  if (!detail) return new Response("Not found", { status: 404 });

  const t = await getTranslations({ locale, namespace: "Teacher" });
  const csv = toCsv([
    [t("student"), "XP", t("tests"), `${t("avgTest")}, %`, `${t("lastTest")}, %`, t("labs"), t("csvBestError")],
    // Ондық бөлшек тілге сай («1,1»): қазақ/орыс Excel-і нүктелі санды мәтін деп оқиды
    ...detail.students.map((s) => [s.name, s.xp, s.exams, s.avgExamPct, s.lastExamPct, s.labs, s.bestLabErrorPct === null ? null : formatPlain(s.bestLabErrorPct, locale)]),
  ]);
  const file = `${detail.name.replace(/[^\p{L}\p{N}_-]+/gu, "_")}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="class.csv"; filename*=UTF-8''${encodeURIComponent(file)}`,
      "Cache-Control": "no-store",
    },
  });
}
