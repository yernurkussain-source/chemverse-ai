import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { classifyHand, pinchRatio, smoothHands, type Point } from "@/features/gesture/classify";

/**
 * Жасанды қол: білезік (0) төменде, саусақтар жоғары қарайды. Әр саусақтың
 * созылған немесе бүгілген күйін береміз. Координаттар — кадр үлесі (0..1).
 */
type Finger = "open" | "fold";
type Fingers = { thumb: Finger; index: Finger; middle: Finger; ring: Finger; pinky: Finger };

function hand(fingers: Fingers): Point[] {
  const p: Point[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.8 }));
  const columns = { index: 0.44, middle: 0.5, ring: 0.56, pinky: 0.62 } as const;
  const base = { index: 5, middle: 9, ring: 13, pinky: 17 } as const;
  for (const finger of ["index", "middle", "ring", "pinky"] as const) {
    const x = columns[finger];
    const b = base[finger];
    p[b] = { x, y: 0.6 }; // түбі
    p[b + 1] = { x, y: 0.5 }; // PIP
    const open = fingers[finger] === "open";
    p[b + 2] = { x, y: open ? 0.42 : 0.58 };
    p[b + 3] = { x, y: open ? 0.35 : 0.68 }; // ұшы
  }
  const thumbOpen = fingers.thumb === "open";
  p[1] = { x: 0.42, y: 0.75 };
  p[2] = { x: 0.38, y: 0.7 };
  p[3] = thumbOpen ? { x: 0.33, y: 0.65 } : { x: 0.42, y: 0.65 };
  p[4] = thumbOpen ? { x: 0.27, y: 0.6 } : { x: 0.47, y: 0.62 };
  return p;
}

const all = (state: Finger): Fingers => ({ thumb: state, index: state, middle: state, ring: state, pinky: state });

describe("Қол қимылын тану", () => {
  test("ашық алақан", () => {
    assert.equal(classifyHand(hand(all("open"))), "open");
  });

  test("жұдырық", () => {
    assert.equal(classifyHand(hand(all("fold"))), "fist");
  });

  test("сұқ саусақ", () => {
    assert.equal(classifyHand(hand({ ...all("fold"), index: "open" })), "point");
  });

  test("V белгісі", () => {
    assert.equal(classifyHand(hand({ ...all("fold"), index: "open", middle: "open" })), "victory");
  });

  test("шымшу: бас бармақ сұқ саусақ ұшына тиеді", () => {
    const h = hand({ ...all("fold"), thumb: "open", index: "open" });
    h[4] = { x: h[8].x + 0.01, y: h[8].y + 0.01 };
    assert.ok(pinchRatio(h) < 0.25);
    assert.equal(classifyHand(h), "pinch");
  });

  test("нүкте жеткіліксіз болса — none", () => {
    assert.equal(classifyHand(null), "none");
    assert.equal(classifyHand([{ x: 0, y: 0 }]), "none");
  });

  test("тегістеу: кадрлардың орташасы", () => {
    const a = Array.from({ length: 21 }, () => ({ x: 0, y: 0 }));
    const b = Array.from({ length: 21 }, () => ({ x: 1, y: 0.5 }));
    assert.deepEqual(smoothHands([a, b])?.[7], { x: 0.5, y: 0.25 });
    assert.equal(smoothHands([]), null);
  });
});
