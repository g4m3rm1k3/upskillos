// Players without a brain: random, and rules (a sensible human's habits written as code). The table's other seat
// plays one of these while the AI trains, and they are what the trained AI is measured against.

import { value } from './cards.js';
import { pegPoints, countOf } from './score.js';
import { THROWS, expectedHand } from './features.js';

/** A random legal choice. */
export const pickRandom = (list) => list[Math.floor(Math.random() * list.length)];

/**
 * Rules for the discard: keep the four with the most points on average, and give the crib a fifteen or a pair when
 * it is yours, never when it is theirs.
 */
export function rulesThrow(hand, myCrib) {
  let best = 0, bestScore = -Infinity;
  THROWS.forEach(([i, j], t) => {
    const kept = hand.filter((_, k) => k !== i && k !== j), a = hand[i], b = hand[j];
    const crib = (value(a) + value(b) === 15 ? 2 : 0) + (a.rank === b.rank ? 2 : 0) + (a.rank === 5 ? 1 : 0) + (b.rank === 5 ? 1 : 0);
    const score = expectedHand(kept, hand) + (myCrib ? crib : -crib);
    if (score > bestScore) { bestScore = score; best = t; }
  });
  return best;
}

/** Rules for pegging: the most points now; never leave the count on 5 or 21; else the highest card. `options`: indexes into hand of the cards that fit. */
export function rulesPlay(hand, options, pile) {
  let best = options[0], bestScore = -Infinity;
  for (const k of options) {
    const after = [...pile, hand[k]], count = countOf(after);
    const score = pegPoints(after).total * 10 - (count === 5 || count === 21 ? 15 : 0) + value(hand[k]) / 10;
    if (score > bestScore) { bestScore = score; best = k; }
  }
  return best;
}
