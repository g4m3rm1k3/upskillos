// Scoring cribbage: the show (a hand of four with the starter) and pegging (each card as it is played).
// Every function returns its points with the reasons, so the game can say "fifteen 2, fifteen 4, a pair is 6".

import { value } from './cards.js';

/** Every subset of the cards (by bitmask), as lists: 2ⁿ of them, for n cards. */
function subsets(cards) {
  const out = [];
  for (let mask = 1; mask < 1 << cards.length; mask++) out.push(cards.filter((_, i) => mask & (1 << i)));
  return out;
}

/** Fifteens: 2 for each different set of cards adding up to 15. */
export function fifteens(cards) {
  const sets = subsets(cards).filter((s) => s.reduce((t, c) => t + value(c), 0) === 15);
  return sets.map((s) => ({ what: 'fifteen', cards: s, points: 2 }));
}

/** Pairs: 2 for each pair of cards of the same rank (three of a kind is three pairs, 6; four is six pairs, 12). */
export function pairs(cards) {
  const out = [];
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++)
    if (cards[i].rank === cards[j].rank) out.push({ what: 'pair', cards: [cards[i], cards[j]], points: 2 });
  return out;
}

/** Is this set of cards a run: different ranks, one after another (in any order)? */
function isRun(cards) {
  const r = cards.map((c) => c.rank).sort((a, b) => a - b);
  return r.every((x, i) => i === 0 || x === r[i - 1] + 1);
}

/**
 * Runs: three or more cards in sequence (aces are low: A 2 3 is a run, Q K A is not). Only the longest runs count,
 * once for each different set of cards that makes one: 3 4 4 5 is two runs of three, 6 points.
 */
export function runs(cards) {
  for (let length = cards.length; length >= 3; length--) {
    const found = subsets(cards).filter((s) => s.length === length && isRun(s));
    if (found.length) return found.map((s) => ({ what: `run of ${length}`, cards: s, points: length }));
  }
  return [];
}

/**
 * Flush: the four cards in a hand of one suit, 4, and 5 if the starter is too. The crib only scores a flush of all
 * five.
 */
export function flush(hand, starter, isCrib) {
  if (!hand.every((c) => c.suit === hand[0].suit)) return [];
  if (starter.suit === hand[0].suit) return [{ what: 'flush', cards: [...hand, starter], points: 5 }];
  return isCrib ? [] : [{ what: 'flush', cards: hand, points: 4 }];
}

/** Nobs: the jack of the starter's suit in the hand, 1. */
export function nobs(hand, starter) {
  const jack = hand.find((c) => c.rank === 11 && c.suit === starter.suit);
  return jack ? [{ what: 'nobs', cards: [jack], points: 1 }] : [];
}

/** The show: a hand of four (or the crib) with the starter. { total, parts }. */
export function scoreHand(hand, starter, isCrib = false) {
  const all = [...hand, starter];
  const parts = [...fifteens(all), ...pairs(all), ...runs(all), ...flush(hand, starter, isCrib), ...nobs(hand, starter)];
  return { total: parts.reduce((t, p) => t + p.points, 0), parts };
}

/** The count: what the cards played since the last reset add up to. */
export function countOf(pile) { return pile.reduce((t, c) => t + value(c), 0); }

/**
 * Pegging: the points for the card just played, the last of `pile` (the cards played since the count was last
 * reset to 0). 15 or 31 is 2; a pair with the card before is 2, three of a kind 6, four 12; a run is one point a card,
 * when the last three or more cards (in any order) make one.
 */
export function pegPoints(pile) {
  const parts = [], count = countOf(pile), card = pile[pile.length - 1];
  if (count === 15) parts.push({ what: 'fifteen', points: 2 });
  if (count === 31) parts.push({ what: 'thirty-one', points: 2 });
  let same = 1;
  while (same < pile.length && pile[pile.length - 1 - same].rank === card.rank) same++;
  if (same >= 2) parts.push({ what: ['', '', 'a pair', 'three of a kind', 'four of a kind'][same], points: [0, 0, 2, 6, 12][same] });
  for (let length = pile.length; length >= 3; length--) {
    if (isRun(pile.slice(-length))) { parts.push({ what: `run of ${length}`, points: length }); break; }
  }
  return { total: parts.reduce((t, p) => t + p.points, 0), parts };
}

/** "fifteen 2, a pair is 4, …": points as they are said aloud. */
export function sayParts(parts) {
  let running = 0;
  return parts.map((p) => `${p.what} ${(running += p.points)}`).join(', ');
}
