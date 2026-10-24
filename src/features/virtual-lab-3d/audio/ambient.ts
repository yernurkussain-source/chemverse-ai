import type { Game } from "../core/context";
import { nearPlayer } from "../game/journal";

/** Әр кадр: жақындағы ыдыстардың көпіршігі мен қайнауы, жүргендегі қадам дыбысы (әр 0,62 м сайын) */
export function soundStep(G: Game, rdt: number, moved: number): void {
  if (!G.snd.ok()) return;
  let B = 0;
  for (const o of G.vessels) {
    if (!nearPlayer(G, o.g)) continue;
    B += Math.min(1.5, o.s.fizz * 6) + (o.s.boil ? 1.2 : 0);
  }
  if (B > 0.02 && Math.random() < rdt * Math.min(40, B * 22)) G.snd.bubble(Math.min(1.4, 0.5 + B * 0.3));
  if (moved > 0) {
    G.player.stepAcc += moved;
    if (G.player.stepAcc > 0.62) {
      G.player.stepAcc = 0;
      G.snd.step();
    }
  }
}
