// docs/unt/questions/*.json + docs/unt/format/*.json → docs/unt/PREVIEW.md: мұғалім банкті оқып тексеруі үшін (✅ — дұрыс жауап)
// Іске қосу: npm run unt:preview   (JSON өзгерген сайын қайта жасаңыз)
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const LABELS = ["A", "B", "C", "D", "E", "F"];
const STARS = ["", "★", "★★", "★★★"];
const read = (dir) =>
  readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((file) => ({ file, ...JSON.parse(readFileSync(join(dir, file), "utf8")) }));

const lines = [];
let total = 0;
const choice = (q) => {
  total++;
  lines.push(`**${q.id}** ${STARS[q.difficulty]} ${q.kk.q}`, "");
  q.kk.options.forEach((option, i) => lines.push(`- ${[q.correct].flat().includes(i) ? "✅" : "▫️"} ${LABELS[i]}) ${option}`));
  lines.push("", `> ${q.kk.explanation}`, "");
};

for (const { file, topic, questions } of read(join("docs", "unt", "questions"))) {
  lines.push(`## ${topic.title.kk} (\`${file}\`)`, "");
  questions.forEach(choice);
}

lines.push("---", "", "# ҰБТ пішімінің тапсырмалары (`docs/unt/format/`)", "");
for (const { file, topic, single = [], context, matching, multiple } of read(join("docs", "unt", "format"))) {
  lines.push(`## ${topic.title.kk} (\`${file}\`)`, "", "### Бір дұрыс жауап", "");
  single.forEach(choice);
  lines.push(`### Контекст: ${context.kk.title}`, "");
  lines.push(...context.kk.text.split("\n").map((p) => `> ${p}`), "");
  context.questions.forEach(choice);
  lines.push("### Сәйкестендіру", "");
  for (const q of matching) {
    total++;
    lines.push(`**${q.id}** ${STARS[q.difficulty]} ${q.kk.q}`, "");
    q.kk.left.forEach((left, slot) => lines.push(`- ${LABELS[slot]}) ${left} → ✅ ${q.kk.options[q.correct[slot]]}`));
    lines.push("", `Нұсқалар: ${q.kk.options.join(" · ")}`, "", `> ${q.kk.explanation}`, "");
  }
  lines.push("### Бір немесе бірнеше дұрыс жауап", "");
  multiple.forEach(choice);
}

const header = [
  "# ҰБТ/ББЖМ сұрақтар банкі — тексеруге арналған нұсқа",
  "",
  "Бұл файл `npm run unt:preview` арқылы жасалады, қолмен өзгертпеңіз: түзетуді `docs/unt/questions/*.json` және `docs/unt/format/*.json` ішінде жасап, қайта жасаңыз.",
  "Әр сұрақта: қиындық (★–★★★), ✅ — дұрыс жауап, сосын түсіндірме. Орысша нұсқасы JSON файлда.",
  "",
  `Барлығы: ${total} тапсырма.`,
  "",
];
writeFileSync(join("docs", "unt", "PREVIEW.md"), [...header, ...lines].join("\n"));
console.log(`✅ docs/unt/PREVIEW.md: ${total} тапсырма`);
