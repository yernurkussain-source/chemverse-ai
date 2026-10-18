import { equivalenceVolume, TITRATION, titrationPH } from "@/lib/chemistry/titration";

export type CurveOptions = {
  labels: { axisVolume: string; axisPh: string; eqMark: string };
  /** HCl концентрациясы (әдепкі 0,1 М) */
  acidConcentration?: number;
  /** Зертханада жауапты жасыру: толық қисық пен эквивалент сызығы көрсетілмейді */
  hideAnswer?: boolean;
};

/** Титрлеу қисығы (prototype.html-дегі drawCurve функциясы). Басты бет пен зертхана ортақ қолданады */
export function drawTitrationCurve(canvas: HTMLCanvasElement, volume: number, options: CurveOptions) {
  const { labels, acidConcentration = TITRATION.concentration, hideAnswer = false } = options;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  if (!W || !H) return;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const { maxVolumeMl } = TITRATION;
  const equivalenceMl = equivalenceVolume(acidConcentration);
  const pHAt = (v: number) => titrationPH(v, acidConcentration);
  const L = 40;
  const R = 14;
  const T = 14;
  const B = 34;
  const pw = W - L - R;
  const ph = H - T - B;
  const X = (x: number) => L + (x / maxVolumeMl) * pw;
  const Y = (y: number) => T + (1 - y / 14) * ph;
  const muted = css("--text-muted");

  // Тор және осьтер (қаріп — сайттағы моно қаріп, next/font айнымалысынан)
  ctx.font = `11px ${css("--font-fira-code") || "ui-monospace"}, monospace`;
  ctx.fillStyle = muted;
  ctx.strokeStyle = css("--line");
  ctx.lineWidth = 1;
  for (let y = 0; y <= 14; y += 2) {
    ctx.beginPath();
    ctx.moveTo(L, Y(y));
    ctx.lineTo(W - R, Y(y));
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText(String(y), L - 8, Y(y) + 4);
  }
  for (let x = 0; x <= maxVolumeMl; x += 10) {
    ctx.textAlign = "center";
    ctx.fillText(String(x), X(x), H - B + 18);
  }
  ctx.textAlign = "left";
  ctx.fillText(labels.axisPh, 4, T + 4);
  ctx.textAlign = "right";
  ctx.fillText(labels.axisVolume, W - R, H - 4);

  // Фенолфталеиннің түс өзгеру аралығы (pH 8,2–10)
  ctx.fillStyle = "rgba(255,95,162,.08)";
  ctx.fillRect(L, Y(10), pw, Y(8.2) - Y(10));

  // Жауап (эквивалент нүктесі мен толық қисық) — зертханада жасырылады
  if (!hideAnswer) {
    // Эквивалент нүктесі
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = muted;
    ctx.beginPath();
    ctx.moveTo(X(equivalenceMl), T);
    ctx.lineTo(X(equivalenceMl), T + ph);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = muted;
    ctx.textAlign = "left";
    ctx.fillText(labels.eqMark, X(equivalenceMl) + 6, T + 12);

    // Толық қисық (бозғылт)
    ctx.strokeStyle = "rgba(142,154,198,.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x <= maxVolumeMl; x += 0.1) {
      const p = pHAt(x);
      if (x === 0) ctx.moveTo(X(x), Y(p));
      else ctx.lineTo(X(x), Y(p));
    }
    ctx.stroke();
  }

  // Қосылған көлемге дейінгі бөлігі
  const gradient = ctx.createLinearGradient(0, Y(1), 0, Y(13));
  gradient.addColorStop(0, css("--cyan"));
  gradient.addColorStop(1, css("--pink"));
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= volume; x += 0.05) {
    const p = pHAt(x);
    if (x === 0) ctx.moveTo(X(x), Y(p));
    else ctx.lineTo(X(x), Y(p));
  }
  ctx.stroke();

  // Ағымдағы нүкте
  const current = pHAt(volume);
  ctx.fillStyle = css("--text");
  ctx.beginPath();
  ctx.arc(X(volume), Y(current), 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = css("--pink");
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(X(volume), Y(current), 9, 0, Math.PI * 2);
  ctx.stroke();
}
