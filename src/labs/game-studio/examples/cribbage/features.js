// What the AI sees of a move: features, numbers that describe it (lesson: the AI's discard; the AI's pegging).
//
// A linear Q brain values a move as Q = w · φ, one weight per feature, so a feature should be a number that makes
// a move better or worse in proportion (more points now: better; a bigger chance the other player scores next: worse).
// Each is scaled to about 0 to 1, so no one feature's size swamps the others while the weights are learned.
//
// The discard and pegging are different decisions, so each has its own block of features; a move fills its own
// block and leaves the other at 0, and the two blocks learn separate weights in one list.
//
// A seat sees only what a player at the table could: its own cards, the starter, and the cards played. Never the
// other hand (the developer view shows that to you, not to the AI).

import { value, newDeck, sameCard, SUITS } from './cards.js';
import { scoreHand, pegPoints, countOf } from './score.js';

/** The 15 ways to throw two of six cards to the crib: [i, j] with i < j. */
export const THROWS = [];
for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) THROWS.push([i, j]);

export const DISCARD_FEATURES = ['discard: bias', 'discard: hand kept (expected points)', 'discard: crib (expected points, + mine − theirs)', 'discard: my crib'];
export const PEG_FEATURES = ['peg: bias', 'peg: points now', 'peg: count after', 'peg: chance of 15 or 31 against', 'peg: chance of a pair against', 'peg: chance of a run against', 'peg: leads low', 'peg: card value', 'peg: my hand (show)', 'peg: crib (expected, + mine − theirs)', 'peg: my crib'];
export const FEATURE_NAMES = [...DISCARD_FEATURES, ...PEG_FEATURES];

/** The cards a seat has not seen: the deck less those it knows. */
export function unseen(known) {
  return newDeck().filter((c) => !known.some((k) => sameCard(k, c)));
}

/** A hand's show score averaged over every starter it could get (the cards not in view). */
export function expectedHand(kept, known) {
  const starters = unseen(known);
  return starters.reduce((t, s) => t + scoreHand(kept, s).total, 0) / starters.length;
}

/**
 * The average a crib scores holding two cards of these ranks (CRIB_VALUE[a − 1][b − 1]): every other two crib cards
 * and starter, by rank, weighted by how many ways the other 50 cards make them. Suits are ignored (a crib flush needs
 * all five), except nobs: a jack thrown scores 1 when the starter is its suit, about a quarter of the time.
 * cribTable() computes it; the numbers below are its answer, kept here so the game does not spend half a second
 * recomputing them each time it starts (a test checks they agree).
 */
export const CRIB_VALUE = [
  [5.49,4.4,4.52,5.43,5.69,4.22,4.04,4.08,4,3.91,4.17,3.81,3.7],
  [4.4,5.79,6.8,4.8,5.72,4.32,4.24,4.19,4.09,4.03,4.28,3.92,3.82],
  [4.52,6.8,6.12,5.45,6.38,4.23,4.31,4.25,4.07,4.1,4.36,4,3.89],
  [5.43,4.8,5.45,6.1,6.95,4.92,4.14,4.26,4.16,4.1,4.36,4,3.89],
  [5.69,5.72,6.38,6.95,8.96,7.05,6.37,5.71,5.69,6.98,7.24,6.88,6.77],
  [4.22,4.32,4.23,4.92,7.05,6.25,5.5,4.86,5.53,3.8,4.05,3.69,3.59],
  [4.04,4.24,4.31,4.14,6.37,5.5,6.07,6.72,4.31,3.68,4,3.64,3.53],
  [4.08,4.19,4.25,4.26,5.71,4.86,6.72,5.6,4.89,4.26,3.92,3.62,3.52],
  [4,4.09,4.07,4.16,5.69,5.53,4.31,4.89,5.49,4.8,4.46,3.51,3.46],
  [3.91,4.03,4.1,4.1,6.98,3.8,3.68,4.26,4.8,5.43,5.03,4.07,3.37],
  [4.17,4.28,4.36,4.36,7.24,4.05,4,3.92,4.46,5.03,5.93,4.99,4.28],
  [3.81,3.92,4,4,6.88,3.69,3.64,3.62,3.51,4.07,4.99,5.21,3.93],
  [3.7,3.82,3.89,3.89,6.77,3.59,3.53,3.52,3.46,3.37,4.28,3.93,4.99],
];

export function cribTable() {
  const table = [];
  for (let a = 1; a <= 13; a++) {
    table.push([]);
    for (let b = 1; b <= 13; b++) {
      const left = new Array(14).fill(4);
      left[a]--; left[b]--;
      let sum = 0, ways = 0;
      for (let c = 1; c <= 13; c++) for (let d = c; d <= 13; d++) {
        const pairs = c === d ? left[c] * (left[c] - 1) / 2 : left[c] * left[d];
        if (!pairs) continue;
        for (let s = 1; s <= 13; s++) {
          const w = pairs * (left[s] - (s === c ? 1 : 0) - (s === d ? 1 : 0));
          if (w <= 0) continue;
          const crib = [a, b, c, d].map((rank, i) => ({ rank, suit: SUITS[i] }));   // four different suits: no flush
          sum += w * scoreHand(crib, { rank: s, suit: 'none' }, true).total;
          ways += w;
        }
      }
      table[a - 1].push(+(sum / ways + (a === 11 ? 0.25 : 0) + (b === 11 ? 0.25 : 0)).toFixed(2));
    }
  }
  return table;
}

/** The discard's features: throwing hand[i] and hand[j] (of six). myCrib: whether the crib is this seat's. */
export function discardFeatures(hand, [i, j], myCrib) {
  const kept = hand.filter((_, k) => k !== i && k !== j), a = hand[i], b = hand[j];
  const sign = myCrib ? 1 : -1;   // points in the crib are good when it is mine, bad when it is theirs
  const block = [
    1,
    expectedHand(kept, hand) / 10,
    sign * CRIB_VALUE[a.rank - 1][b.rank - 1] / 10,
    sign,
  ];
  return [...block, ...new Array(PEG_FEATURES.length).fill(0)];
}

/**
 * Pegging features: playing `card` onto `pile` (the cards since the count was reset). `known`: every card this seat
 * has seen (its hand, the starter, the cards played). `handShow`: its own hand's show score, which it knows once the
 * starter is cut. `threw`: the two cards it threw to the crib.
 *
 * The last three are the same for every card it could play: they do not help choose a card, but they let Q predict
 * the points still to come at the show. That matters, because the discard learns its value from the value of the
 * first pegging move (the target R + max Q(S′, ·)): if no pegging feature said how good the crib is, what the discard
 * did for the crib would be lost one step later.
 */
export function pegFeatures(card, pile, known, handShow, myCrib, threw) {
  const after = [...pile, card], count = countOf(after);
  const others = unseen(known);
  // The chance that the next card, one the other player could hold, scores against this play.
  const fits = others.filter((c) => count + value(c) <= 31);
  const share = (test) => (others.length ? fits.filter(test).length / others.length : 0);
  const block = [
    1,
    pegPoints(after).total / 4,
    count / 31,
    share((c) => count + value(c) === 15 || count + value(c) === 31),
    share((c) => c.rank === card.rank),
    share((c) => pegPoints([...after, c]).parts.some((p) => p.what.startsWith('run'))),
    pile.length === 0 && value(card) < 5 ? 1 : 0,
    value(card) / 10,
    handShow / 10,
    (myCrib ? 1 : -1) * CRIB_VALUE[threw[0].rank - 1][threw[1].rank - 1] / 10,
    myCrib ? 1 : -1,
  ];
  return [...new Array(DISCARD_FEATURES.length).fill(0), ...block];
}
