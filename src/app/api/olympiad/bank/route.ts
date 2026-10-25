import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Есептер банкін JSON түрінде жүктеу (тек мұғалімге — ішінде дұрыс жауаптар бар): банк + мұғалімнің өз есептері */
export async function GET() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || !admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  if (profile?.role !== "teacher") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data } = await admin
    .from("olympiad_problems")
    .select("body")
    .or(`author_id.is.null,author_id.eq.${auth.user.id}`)
    .order("id");
  return new NextResponse(JSON.stringify((data ?? []).map((row) => row.body), null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="olympiad-problems.json"',
      "Cache-Control": "no-store",
    },
  });
}
