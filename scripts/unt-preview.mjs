// docs/unt/questions/*.json → docs/unt/PREVIEW.md: мұғалім банкті оқып тексеруі үшін (✅ — дұрыс жауап)
// Іске қосу: npm run unt:preview   (JSON өзгерген сайын қайта жасаңыз)
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join("docs", "unt", "questions");
const LABELS = ["A", "B", "C", "D"];
const STARS = ["", "★", "★★", "★★★"];

const lines = [
  "# ҰБТ/ББЖМ сұрақтар банкі — тексеруге арналған нұсқа",
  "",
  "Бұл файл `npm run unt:preview` арқылы жасалады, қолмен өзгертпеңіз: түзетуді `docs/unt/questions/*.json` ішінде жасап, қайта жасаңыз.",
  "Әр сұрақта: қиындық (★–★★★), ✅ — дұрыс жауап, сосын түсіндірме. Орысша нұсқасы JSON файлда.",
  "",
];
let total = 0;
for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json")).sort()) {
  const { topic, questions } = JSON.parse(readFileSync(join(DIR, file), "utf8"));
  lines.push(`## ${topic.title.kk} (\`${file}\`)`, "");
  for (const q of questions) {
    total++;
    lines.push(`**${q.id}** ${STARS[q.difficulty]} ${q.kk.q}`, "");
    q.kk.options.forEach((option, i) => lines.push(`- ${i === q.correct ? "✅" : "▫️"} ${LABELS[i]}) ${option}`));
    lines.push("", `> ${q.kk.explanation}`, "");
  }
}
lines.splice(5, 0, `Барлығы: ${total} сұрақ.`, "");
writeFileSync(join("docs", "unt", "PREVIEW.md"), lines.join("\n"));
console.log(`✅ docs/unt/PREVIEW.md: ${total} сұрақ`);
