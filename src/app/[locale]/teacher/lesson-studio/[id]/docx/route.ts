import { buildKmzhDocx } from "@/features/lesson-studio/docx";
import { kmzhSchema } from "@/features/lesson-studio/kmzh";
import { createClient } from "@/lib/supabase/server";

/**
 * ҚМЖ → Word (DOCX). RLS: мұғалім тек өз жоспарын оқиды (басқанікі — 404).
 * Педагогтің аты профильден осы жерде ғана қойылады (AI-ға жіберілмеген).
 */
export async function GET(_request: Request, { params }: RouteContext<"/[locale]/teacher/lesson-studio/[id]/docx">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Unauthorized", { status: 401 });

  const [{ data: row }, { data: profile }] = await Promise.all([
    supabase.from("lesson_plans").select("content_json").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", auth.user.id).single(),
  ]);
  const parsed = kmzhSchema.safeParse(row?.content_json);
  if (!parsed.success) return new Response("Not found", { status: 404 });

  const plan = { ...parsed.data, meta: { ...parsed.data.meta, teacher: profile?.full_name ?? "" } };
  const buffer = await buildKmzhDocx(plan);
  const { grade, topic, date } = plan.meta;
  const file = `ҚМЖ_${grade}_${topic.replace(/[^\p{L}\p{N}]+/gu, "_").slice(0, 60)}${date ? `_${date}` : ""}.docx`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="KMZH_${grade}.docx"; filename*=UTF-8''${encodeURIComponent(file)}`,
      "Cache-Control": "no-store",
    },
  });
}
