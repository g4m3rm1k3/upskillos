import { rollFace } from './rng.mjs';

export const categories = ['Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes',
  'Three of a kind', 'Four of a kind', 'Full house', 'Small straight',
  'Large straight', 'Yahtzee', 'Chance'];

export function countsOf(dice) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const face of dice) {
    if (!Number.isInteger(face) || face < 1 || face > 6) throw new Error('Invalid face');
    counts[face] += 1;
  }
  return counts;
}

export function points(dice, category, joker = false) {
  const counts = countsOf(dice);
  let sum = 0;
  for (const face of dice) sum += face;
  if (category < 6) return counts[category + 1] * (category + 1);
  const largest = Math.max(...counts);
  if (category === 6) return largest >= 3 ? sum : 0;
  if (category === 7) return largest >= 4 ? sum : 0;
  if (category === 8) return joker || (counts.includes(3) && counts.includes(2)) ? 25 : 0;
  let run = 0;
  let longest = 0;
  for (let face = 1; face <= 6; face += 1) {
    run = counts[face] > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  if (category === 9) return joker || longest >= 4 ? 30 : 0;
  if (category === 10) return joker || longest >= 5 ? 40 : 0;
  if (category === 11) return largest === 5 ? 50 : 0;
  if (category === 12) return sum;
  throw new Error('Unknown category');
}

export function blankCard() {
  return { scores: Array(13).fill(null), extra: 0 };
}
export function total(card) {
  let upper = 0;
  let sum = 0;
  for (let i = 0; i < 13; i += 1) {
    const value = card.scores[i] ?? 0;
    sum += value;
    if (i < 6) upper += value;
  }
  return { base: sum, upper: upper >= 63 ? 35 : 0, extra: card.extra,
    all: sum + (upper >= 63 ? 35 : 0) + card.extra };
}

export function legalCategories(card, dice) {
  const empty = [];
  for (let i = 0; i < 13; i += 1) if (card.scores[i] === null) empty.push(i);
  const repeated = Math.max(...countsOf(dice)) === 5 && card.scores[11] !== null;
  if (!repeated) return empty;
  const upper = dice[0] - 1;
  if (card.scores[upper] === null) return [upper];
  const lower = empty.filter(function (i) { return i >= 6; });
  return lower.length > 0 ? lower : empty;
}
export function preview(card, dice, category) {
  if (!legalCategories(card, dice).includes(category)) return null;
  const joker = Math.max(...countsOf(dice)) === 5 && card.scores[11] !== null;
  return points(dice, category, joker);
}
export function record(card, dice, category) {
  const score = preview(card, dice, category);
  if (score === null) return false;
  const extra = Math.max(...countsOf(dice)) === 5 && card.scores[11] === 50;
  card.scores[category] = score;
  if (extra) card.extra += 100;
  return true;
}

export function newYahtzee() {
  return { cards: [blankCard(), blankCard()], player: 0, dice: [1, 1, 1, 1, 1],
    held: [false, false, false, false, false], rolls: 0, turns: 0, done: false };
}
export function rollHand(state, random = Math.random) {
  if (state.done || state.rolls >= 3) return false;
  for (let i = 0; i < 5; i += 1) {
    if (!state.held[i] || state.rolls === 0) state.dice[i] = rollFace(random);
  }
  state.rolls += 1;
  return true;
}
export function holdDie(state, index) {
  if (state.done || state.rolls === 0 || state.rolls >= 3 || index < 0 || index >= 5) return false;
  state.held[index] = !state.held[index];
  return true;
}
export function scoreTurn(state, category) {
  if (state.done || state.rolls === 0 || !record(state.cards[state.player], state.dice, category)) return false;
  state.turns += 1;
  state.done = state.turns === 26;
  if (!state.done) state.player = 1 - state.player;
  state.rolls = 0;
  state.held.fill(false);
  return true;
}
export function greedyCategory(card, dice) {
  const legal = legalCategories(card, dice);
  let best = legal[0];
  for (const i of legal) if (preview(card, dice, i) > preview(card, dice, best)) best = i;
  return best;
}
