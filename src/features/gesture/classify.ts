/**
 * Қолдың 21 нүктесінен (MediaPipe Hand Landmarker) қимылды анықтау.
 * Нүктелер: 0 — білезік; 4 — бас бармақ ұшы; 8, 12, 16, 20 — сұқ, ортаңғы, аты жоқ, шынашақ ұштары;
 * 6, 10, 14, 18 — сол саусақтардың ортаңғы буындары (PIP); 9 — ортаңғы саусақтың түбі.
 * Қашықтықтар алақан өлшеміне (0→9) бөлінеді — қол камерадан алыс-жақын болса да нәтиже бірдей.
 */
export type Point = { x: number; y: number; z?: number };
export type Gesture = "point" | "pinch" | "fist" | "open" | "victory" | "none";

const FINGERS = {
  index: { tip: 8, pip: 6 },
  middle: { tip: 12, pip: 10 },
  ring: { tip: 16, pip: 14 },
  pinky: { tip: 20, pip: 18 },
} as const;

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Саусақ созылған: ұшы білезіктен буынына қарағанда едәуір алыс */
function extended(hand: Point[], finger: keyof typeof FINGERS) {
  const { tip, pip } = FINGERS[finger];
  return dist(hand[tip], hand[0]) > dist(hand[pip], hand[0]) * 1.15;
}

/** Саусақ бүгілген: ұшы білезікке буынынан жақын */
function folded(hand: Point[], finger: keyof typeof FINGERS) {
  const { tip, pip } = FINGERS[finger];
  return dist(hand[tip], hand[0]) < dist(hand[pip], hand[0]);
}

/** Бас бармақ ашық: ұшы шынашақтың түбінен (17) алыс */
function thumbOpen(hand: Point[]) {
  return dist(hand[4], hand[17]) > dist(hand[3], hand[17]) * 1.1 && dist(hand[4], hand[9]) / palmSize(hand) > 0.6;
}

export function palmSize(hand: Point[]) {
  return Math.max(dist(hand[0], hand[9]), 1e-6);
}

/** Шымшу дәрежесі: бас бармақ пен сұқ саусақ ұштарының арақашықтығы / алақан өлшемі */
export function pinchRatio(hand: Point[]) {
  return dist(hand[4], hand[8]) / palmSize(hand);
}

export function classifyHand(hand: Point[] | null | undefined): Gesture {
  if (!hand || hand.length < 21) return "none";

  // Шымшу: бас бармақ пен сұқ саусақ ұштары тиісіп тұр, ал сұқ саусақ алақаннан алға шығып тұр.
  // (Жұдырықта да бас бармақ сұқ саусаққа жақын, бірақ сұқ саусақтың ұшы алақанға бүгілген.)
  const indexReach = dist(hand[8], hand[0]) / palmSize(hand);
  if (pinchRatio(hand) < 0.25 && indexReach > 1) return "pinch";

  const index = extended(hand, "index");
  const middle = extended(hand, "middle");
  const ring = extended(hand, "ring");
  const pinky = extended(hand, "pinky");

  if (folded(hand, "index") && folded(hand, "middle") && folded(hand, "ring") && folded(hand, "pinky")) return "fist";
  if (index && middle && ring && pinky && thumbOpen(hand)) return "open";
  if (index && middle && !ring && !pinky) return "victory";
  if (index && !middle && !ring && !pinky) return "point";
  return "none";
}

/** Соңғы бірнеше кадрдың орташасы — қол дірілін тегістейді (BLUEPRINT: 5 кадр) */
export function smoothHands(history: Point[][]): Point[] | null {
  if (!history.length) return null;
  return history[0].map((_, i) => {
    let x = 0;
    let y = 0;
    for (const hand of history) {
      x += hand[i].x;
      y += hand[i].y;
    }
    return { x: x / history.length, y: y / history.length };
  });
}
