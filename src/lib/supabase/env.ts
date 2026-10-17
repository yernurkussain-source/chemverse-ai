// Supabase баптаулары .env.local файлынан алынады (кілттерді кодқа жазбаймыз)
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Supabase кілттері салынды ма? (салынбаса — кіру батырмалары қате көрсетеді, сайт құламайды) */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
