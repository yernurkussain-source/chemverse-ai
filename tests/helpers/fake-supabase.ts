import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Тесттерге арналған жадтағы «Supabase»: from().select().eq().in().single() т.б.
 * Тек біздің код қолданатын әдістер. Бағандар таңдалмайды — жолдың бәрі қайтарылады.
 */
type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;

export function fakeSupabase(tables: Record<string, Row[]>) {
  const db: Record<string, Row[]> = Object.fromEntries(Object.entries(tables).map(([k, rows]) => [k, rows.map((r) => ({ ...r }))]));
  const table = (name: string) => (db[name] ??= []);

  function query(name: string) {
    const filters: Filter[] = [];
    let action: { kind: "select" } | { kind: "update"; values: Row } | { kind: "delete" } = { kind: "select" };
    let returnRows = false;
    let mode: "many" | "single" | "maybe" = "many";

    const run = () => {
      const rows = table(name);
      const matched = rows.filter((row) => filters.every((f) => f(row)));
      if (action.kind === "update") {
        const values = action.values;
        matched.forEach((row) => Object.assign(row, values));
        if (!returnRows) return { data: null, error: null };
      }
      if (action.kind === "delete") {
        db[name] = rows.filter((row) => !matched.includes(row));
        return { data: null, error: null };
      }
      const data = matched.map((r) => ({ ...r }));
      if (mode === "many") return { data, error: null };
      if (mode === "maybe") return { data: data[0] ?? null, error: null };
      return data.length === 1 ? { data: data[0], error: null } : { data: null, error: { code: "PGRST116" } };
    };

    const builder = {
      select: () => ((returnRows = true), builder),
      update: (values: Row) => ((action = { kind: "update", values }), builder),
      delete: () => ((action = { kind: "delete" }), builder),
      eq: (column: string, value: unknown) => (filters.push((r) => r[column] === value), builder),
      in: (column: string, values: unknown[]) => (filters.push((r) => values.includes(r[column])), builder),
      order: () => builder,
      limit: () => builder,
      returns: () => builder,
      single: () => ((mode = "single"), builder),
      maybeSingle: () => ((mode = "maybe"), builder),
      then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => Promise.resolve().then(run).then(resolve, reject),
    };
    return builder;
  }

  /** upsert: кілт бағандары бойынша бар жолды жаңартады, болмаса қосады */
  function upsert(name: string, input: Row | Row[], options?: { onConflict?: string }, keys: string[] = ["id"]) {
    const conflict = options?.onConflict?.split(",") ?? keys;
    for (const row of Array.isArray(input) ? input : [input]) {
      const existing = table(name).find((r) => conflict.every((k) => r[k] === row[k]));
      if (existing) Object.assign(existing, row);
      else table(name).push({ ...row });
    }
    return Promise.resolve({ data: null, error: null });
  }

  const PRIMARY_KEYS: Record<string, string[]> = { student_progress: ["user_id", "topic_id"] };

  const client = {
    from: (name: string) => ({
      ...query(name),
      select: (...args: unknown[]) => query(name).select(...(args as [])),
      update: (values: Row) => query(name).update(values),
      delete: () => query(name).delete(),
      insert: (rows: Row | Row[]) => {
        table(name).push(...(Array.isArray(rows) ? rows : [rows]).map((r) => ({ ...r })));
        return Promise.resolve({ data: null, error: null });
      },
      upsert: (rows: Row | Row[], options?: { onConflict?: string }) => upsert(name, rows, options, PRIMARY_KEYS[name]),
    }),
    /** Тек award_xp (supabase/migrations/20261103000000_profile_xp.sql): профильдің XP-і өседі */
    rpc: (fn: string, args: Row) => {
      const profile = fn === "award_xp" ? table("profiles").find((r) => r.id === args.p_user) : undefined;
      if (profile) profile.xp = (profile.xp as number) + Math.max(0, Number(args.p_amount));
      return Promise.resolve({ data: null, error: null });
    },
  };

  return { client: client as unknown as SupabaseClient, db };
}
