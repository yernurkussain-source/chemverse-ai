export type LeaderRow = { rank: number; name: string; xp: number; me: boolean };

/** «Алихан Ермеков» → «Алихан Е.»: сыныптастарға толық аты-жөні көрсетілмейді */
export const shortName = (fullName: string | null) => {
  const [first, second] = (fullName ?? "").trim().split(/\s+/);
  if (!first) return "—";
  return second ? `${first} ${second[0]}.` : first;
};

/** XP бойынша рейтинг: үздік 5 + оқушының өз орны (сыныптастардың профилі RLS-пен жабық — тек сервер, қысқа атпен) */
export function rankRows(members: { userId: string; name: string | null; xp: number }[], userId: string, top = 5): LeaderRow[] {
  const ranked = [...members]
    .sort((a, b) => b.xp - a.xp)
    .map((m, i) => {
      const me = m.userId === userId;
      return { rank: i + 1, name: me ? m.name?.trim() || "—" : shortName(m.name), xp: m.xp, me };
    });
  return ranked.filter((row) => row.rank <= top || row.me);
}
