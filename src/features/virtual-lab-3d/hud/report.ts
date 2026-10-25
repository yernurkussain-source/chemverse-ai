import { QUEST_IDS } from "../game/quest-ids";
import type { HudState } from "../game/store";

type T = (key: string, values?: Record<string, string | number>) => string;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * Зертхана есебі: деңгей, XP, қауіпсіздік, орындалған тапсырмалар және журнал (уақыт ретімен).
 * Оқушының аты жазылмайды — басып шығарғаннан кейін қолмен жазады (мұғалімге қағаз не PDF түрінде).
 */
export function reportHtml(s: Pick<HudState, "log" | "xp" | "level" | "safety" | "done">, t: T, locale: string): string {
  const date = new Date().toLocaleString(locale === "kk" ? "kk-KZ" : locale === "ru" ? "ru-RU" : "en-GB");
  const done = QUEST_IDS.filter((id) => s.done.includes(id));
  const rows = [...s.log]
    .reverse()
    .map((e) => `<tr><td>${esc(e.time)}</td><td>${esc(e.who)}</td><td class="eq">${esc(e.eq)}</td><td>${esc(e.obs)}</td></tr>`)
    .join("");
  return `<!doctype html><html lang="${esc(locale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t("report.title"))}</title>
<style>
body{font:14px/1.45 system-ui,sans-serif;color:#111;max-width:860px;margin:24px auto;padding:0 16px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:20px 0 6px}
.meta{color:#555;margin:0 0 12px}.sum{display:flex;flex-wrap:wrap;gap:8px 24px}
table{width:100%;border-collapse:collapse;font-size:12.5px}td,th{border:1px solid #ccc;padding:4px 6px;text-align:left;vertical-align:top}
.eq{font-family:ui-monospace,Consolas,monospace}.sign{margin-top:28px;display:flex;gap:48px}.note{color:#555;font-size:12px}
button{font:inherit;padding:6px 14px;margin-bottom:12px}@media print{button{display:none}}
</style></head><body>
<button onclick="print()">${esc(t("report.print"))}</button>
<h1>${esc(t("report.title"))}</h1>
<p class="meta">${esc(t("report.date", { date }))}</p>
<div class="sum"><span>${esc(t("report.level"))}: <b>${esc(t(`levels.${s.level}`))}</b></span><span>XP: <b>${s.xp}</b></span>
<span>${esc(t("top.safety"))}: <b>${s.safety}/100</b></span><span>${esc(t("report.tasks", { done: done.length, total: QUEST_IDS.length }))}</span></div>
<h2>${esc(t("questsPanel.title"))}</h2>
${done.length ? `<ul>${done.map((id) => `<li>✓ ${esc(t(`quests.${id}.t`))}</li>`).join("")}</ul>` : `<p>${esc(t("report.noTasks"))}</p>`}
<h2>${esc(t("journal.title"))}</h2>
<table><thead><tr><th>${esc(t("report.time"))}</th><th>${esc(t("report.who"))}</th><th>${esc(t("report.eq"))}</th><th>${esc(t("report.obs"))}</th></tr></thead><tbody>${rows}</tbody></table>
<p class="note">${esc(t("journal.modelNote"))}</p>
<div class="sign"><span>${esc(t("report.student"))}</span><span>${esc(t("report.teacher"))}</span></div>
</body></html>`;
}

/** Есепті жаңа бетте ашу; браузер терезені бөгесе (мысалы телефондағы қосымшада) — HTML файл ретінде жүктеу */
export function openReport(html: string): void {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const win = window.open(url, "_blank");
  if (!win) {
    const a = document.createElement("a");
    a.href = url;
    a.download = "chemverse-lab-report.html";
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
