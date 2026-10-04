// The Cribbage chapter (Building Games › Cribbage, lessons 10.1 to 10.12): the whole game, then an AI to play it.
//
// The finished game is examples/cribbage.ts with its scripts in examples/cribbage/*.js. Each task starts from that
// game with one module (or a few methods) replaced by a stub that says what to write; its steps check each function
// as you write it, by calling it (module checks) or by playing the game, and its solution is the finished module.
// Every task shows the finished game first: what you are building towards.

import type { CheckResult, GameTask, PlayResult, PlayView, ProjectView, TaskStep } from './types';
import { cribbageCode, CRIBBAGE_BRAIN, CRIBBAGE_SCRIPTS } from '../examples/cribbage';
import { FINISHED } from './goals';
import { seeded } from '../ml/env';
import type { Node } from '../engine/nodes';
// The finished feature functions, to compare yours with on the same moves.
import * as REF_FEATURES from '../examples/cribbage/features.js';

// ── helpers ───────────────────────────────────────────────────────────────

type Card = { rank: number; suit: string };
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
/** Cards from text: '5H JD 10S AC'. */
export const cards = (text: string): Card[] => text.split(' ').map((t) => ({ rank: RANKS.indexOf(t.slice(0, -1)), suit: t.slice(-1) }));
const named = (c: Card[]) => c.map((x) => `${RANKS[x.rank]}${x.suit}`).join(' ');
type Part = { what: string; points: number; cards?: Card[] };
const total = (parts: unknown) => (Array.isArray(parts) ? (parts as Part[]).reduce((t, p) => t + (Number(p?.points) || 0), 0) : NaN);

/** A module check: call what a script exports. */
const moduleCheck = (test: (v: PlayView & ProjectView) => Promise<CheckResult>): TaskStep['check'] => ({ kind: 'play', test });
const fnOf = (m: Record<string, unknown>, name: string, path: string) => {
  const f = m[name];
  if (typeof f !== 'function') throw new Error(`${path} should export a function ${name}.`);
  return f as (...a: unknown[]) => unknown;
};
/** Run with Math.random seeded, so a check that shuffles repeats exactly. */
function seededRun<T>(seed: number, fn: () => T): T {
  const real = Math.random;
  Math.random = seeded(seed);
  try { return fn(); } finally { Math.random = real; }
}

/** The finished module, written over the stub: a task's solution. */
const finish = (...paths: string[]) => paths.map((p) => `project.writeScript(${JSON.stringify(p)}, ${JSON.stringify(CRIBBAGE_SCRIPTS[p])})`).join('\n');

/** Replace a method's body in a script (a method starts at two spaces in, and its closing brace is the next line that is two spaces and }). */
export function stubMethod(src: string, head: string, body: string): string {
  const at = src.indexOf(`\n  ${head} {\n`);
  if (at < 0) throw new Error(`No method "${head}" to stub`);
  const open = at + head.length + 5, close = src.indexOf('\n  }\n', open);
  return `${src.slice(0, open)}\n${body.replace(/\s+$/, '')}${src.slice(close)}`;
}
/** Replace a top-level function's body (export function name(…) { … }, closing at a line that is just }). */
export function stubFunction(src: string, head: string, body: string): string {
  const at = src.indexOf(`\nexport function ${head} {\n`);
  if (at < 0) throw new Error(`No function "${head}" to stub`);
  const open = at + head.length + 19, close = src.indexOf('\n}\n', open);
  return `${src.slice(0, open)}\n${body.replace(/\s+$/, '')}${src.slice(close)}`;
}

type TableNode = Node & Record<string, unknown> & {
  phase: string; hands: Card[][]; crib: Card[]; starter: Card | null; deck: Card[]; scores: number[]; dealer: number; pile: Card[]; count: number;
  played: boolean[][]; turn: number; waiting: number | null; lastPlayer: number | null; thrown: boolean[]; selected: number[]; autoplay: boolean; fast: boolean; developer: boolean; difficulty: string;
};
/** Play the game for a while; the table, and the run's result. Errors in scripts fail the check. */
async function table(v: PlayView, opts: { seconds?: number; keys?: string[]; training?: boolean; setup?: (t: TableNode) => void; seed?: number } = {}): Promise<{ t: TableNode; r: PlayResult }> {
  const r = await seededRunAsync(opts.seed ?? 5, () => v.play({ seconds: opts.seconds ?? 0.2, keys: opts.keys, training: opts.training ? 'Opponent' : undefined, setup: (g) => opts.setup?.(g.root as TableNode) }));
  if (r.errors.length) throw new Error(r.errors[0]);
  return { t: r.game.root as TableNode, r };
}
async function seededRunAsync<T>(seed: number, fn: () => Promise<T>): Promise<T> {
  const real = Math.random;
  Math.random = seeded(seed);
  try { return await fn(); } finally { Math.random = real; }
}
const call = (t: TableNode, name: string, ...args: unknown[]) => {
  const f = t[name];
  if (typeof f !== 'function') throw new Error(`The table has no method ${name}.`);
  return (f as (...a: unknown[]) => unknown).apply(t, args);
};

const CARDS_JS = 'scripts/cards.js', SCORE_JS = 'scripts/score.js', TABLE_JS = 'scripts/table.js';
const CHAIN = 'Cribbage';
const base = { chain: CHAIN, images: [] as string[], finished: FINISHED.cribbage };

// ── 10.1: the tour ────────────────────────────────────────────────────────

const tour: GameTask = {
  ...base,
  id: 'crib-tour',
  title: 'Cribbage: the finished game, and where everything is',
  goal: 'Play the finished game, then find your way around its code by changing two things in it.',
  start: cribbageCode(),
  steps: [
    {
      text: 'Press ▶ Run, choose a difficulty, and play a hand: click two cards and Throw to crib, then click cards to play them. Press D at any time for the developer view.',
      check: { kind: 'editor', test: (v) => v.ran || 'Press ▶ Run.' },
    },
    {
      text: 'Open scripts/table.js. A full game is to 121; for a quick game, set goal = 61 at the top of the class (the old "short game" of cribbage).',
      check: { kind: 'project', test: (v) => /\bgoal\s*=\s*61\b/.test(v.script(TABLE_JS) ?? '') || 'In scripts/table.js, change goal = 121 to goal = 61.' },
    },
    {
      text: 'In the same class, difficulty = \'Medium\' is what the AI plays at until you choose. Make it \'Hard\', save (Ctrl/Cmd+S), and run again.',
      check: { kind: 'project', test: (v) => /\bdifficulty\s*=\s*'Hard'/.test(v.script(TABLE_JS) ?? '') || 'Set difficulty = \'Hard\' in scripts/table.js.' },
    },
  ],
  solution: `project.writeScript(${JSON.stringify(TABLE_JS)}, ${JSON.stringify(CRIBBAGE_SCRIPTS[TABLE_JS].replace('goal = 121;', 'goal = 61;').replace("difficulty = 'Medium';", "difficulty = 'Hard';"))})`,
  done: 'That is the whole game, and its AI. The lessons that follow build every part of it: the cards, their pictures, the scoring, the table, and then the AI.',
};

// ── 10.2: cards as data ───────────────────────────────────────────────────

const CARDS_STUB = `// Cards and the deck. A card is a plain object, { rank, suit }: rank 1 (ace) to 13 (king), suit one of S H D C.
// Nothing here draws anything, so the rules can be tested, and an agent can learn, without a screen.

export const SUITS = ['S', 'H', 'D', 'C'];
export const SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const RANK_NAME = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/** What a card counts for, toward 15 and 31: an ace is 1, a face card 10. */
export function value(card) {
  return 0;   // write it: the rank, but never more than 10 (Math.min)
}

/** A card's name, such as 10♥. */
export function cardName(card) {
  return '?';   // write it: RANK_NAME[card.rank] followed by SUIT_SYMBOL[card.suit]
}

/** Its picture: assets/cards/10H.svg (the build writes all 52, and the back). */
export function cardImage(card) { return \`assets/cards/\${RANK_NAME[card.rank]}\${card.suit}.svg\`; }

/** A fresh deck: the 52 cards in order. */
export function newDeck() {
  return [];   // write it: for each suit, for each rank from 1 to 13, push { rank, suit }
}

/**
 * Shuffle in place (Fisher–Yates): for each position from the last down, swap in a card chosen at random from those
 * not yet placed. Every order is equally likely. It uses Math.random, which training seeds, so a hand can be replayed.
 */
export function shuffle(deck) {
  return deck;   // write it: for i from deck.length − 1 down to 1, pick j from 0 to i, swap deck[i] and deck[j]
}

/** The same card? (Two objects can describe one card.) */
export function sameCard(a, b) { return a.rank === b.rank && a.suit === b.suit; }
`;

const cardsTask: GameTask = {
  ...base,
  id: 'crib-cards',
  title: 'Cards as data: the deck and the shuffle',
  goal: 'Write scripts/cards.js: what a card is worth, its name, a deck of 52, and a fair shuffle.',
  start: cribbageCode({ brain: false, scripts: { [CARDS_JS]: CARDS_STUB } }),
  steps: [
    {
      text: 'Open scripts/cards.js. Write value(card): what it counts toward 15 and 31. An ace is 1, 2 to 10 are their number, and a jack, queen or king is 10.',
      check: moduleCheck(async (v) => {
        const value = fnOf(await v.module(CARDS_JS), 'value', CARDS_JS);
        const got = [1, 5, 10, 11, 12, 13].map((rank) => value({ rank, suit: 'S' }));
        return JSON.stringify(got) === '[1,5,10,10,10,10]' || `value() of A, 5, 10, J, Q, K gives ${got.join(', ')}; it should be 1, 5, 10, 10, 10, 10.`;
      }),
      hint: 'return Math.min(card.rank, 10)',
    },
    {
      text: 'Write cardName(card): the rank\'s name and the suit\'s symbol, such as 10♥ or K♣. RANK_NAME and SUIT_SYMBOL are at the top of the file.',
      check: moduleCheck(async (v) => {
        const name = fnOf(await v.module(CARDS_JS), 'cardName', CARDS_JS);
        const got = cards('10H AS KD 7C').map((c) => name(c));
        return got.join(' ') === '10♥ A♠ K♦ 7♣' || `cardName() gives ${got.join(' ')}; it should give 10♥ A♠ K♦ 7♣.`;
      }),
    },
    {
      text: 'Write newDeck(): all 52 cards, as { rank, suit } objects: every suit in SUITS with every rank from 1 to 13.',
      check: moduleCheck(async (v) => {
        const deck = fnOf(await v.module(CARDS_JS), 'newDeck', CARDS_JS)() as Card[];
        if (!Array.isArray(deck)) return 'newDeck() should return a list.';
        if (deck.length !== 52) return `newDeck() has ${deck.length} cards; a deck has 52.`;
        const ok = deck.every((c) => c && c.rank >= 1 && c.rank <= 13 && ['S', 'H', 'D', 'C'].includes(c.suit));
        if (!ok) return 'Every card should be { rank: 1 to 13, suit: S, H, D or C }.';
        return new Set(deck.map((c) => `${c.rank}${c.suit}`)).size === 52 || 'Some cards are in the deck twice: each suit once with each rank.';
      }),
    },
    {
      text: 'Write shuffle(deck), Fisher–Yates: for i from the last position down to 1, choose j at random from 0 to i (Math.floor(Math.random() * (i + 1))) and swap deck[i] with deck[j]. The check shuffles three cards 27,000 times: each of the 6 orders should come up about 4,500 times.',
      check: moduleCheck(async (v) => {
        const shuffle = fnOf(await v.module(CARDS_JS), 'shuffle', CARDS_JS);
        const counts = new Map<string, number>();
        let sameArray = true;
        seededRun(11, () => {
          for (let k = 0; k < 27000; k++) {
            const a = [0, 1, 2], out = shuffle(a);
            if (out !== a) sameArray = false;
            const key = a.join('');
            counts.set(key, (counts.get(key) ?? 0) + 1);
          }
        });
        if (!sameArray) return 'shuffle() should shuffle the deck it is given (in place) and return it.';
        const orders = [...counts.keys()];
        if (orders.some((o) => o.split('').sort().join('') !== '012')) return 'After shuffle() some cards were lost or repeated: only swap cards.';
        if (counts.size < 6) return `Only ${counts.size} of the 6 orders ever came up: the shuffle is not random enough.`;
        const worst = Math.max(...[...counts.values()].map((n) => Math.abs(n - 4500)));
        return worst <= 250 || `The 6 orders came up ${[...counts.values()].join(', ')} times: one is ${worst} away from 4,500, so some orders are more likely than others. Choose j from 0 to i, not from the whole deck.`;
      }),
      hint: 'for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; } return deck;',
    },
    {
      text: 'Run the game and choose a difficulty: the deal uses your deck and your shuffle. You get six cards, and so does the AI.',
      check: moduleCheck(async (v) => {
        const { t } = await table(v, { seconds: 0.3, keys: ['Digit2'] });
        if (t.phase === 'title') return 'Choosing a difficulty (key 2) should deal a hand.';
        const all = [...(t.hands?.[0] ?? []), ...(t.hands?.[1] ?? [])];
        if (t.hands?.[0]?.length !== 6 || t.hands?.[1]?.length !== 6) return 'Each player should have six cards.';
        return new Set(all.map((c) => `${c.rank}${c.suit}`)).size === 12 || 'The twelve cards dealt should all be different.';
      }),
    },
  ],
  solution: finish(CARDS_JS),
  done: 'A deck is data: 52 small objects, and a shuffle that makes every order equally likely. Next: drawing them, as SVG.',
};

// ── 10.3: drawing cards with SVG ──────────────────────────────────────────

const BLANK_5H = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140">
  <rect x="1" y="1" width="98" height="138" rx="8" fill="#ffffff" stroke="#555555" stroke-width="2"/>
</svg>
`;
const HEART = 'M0,8 C-3,5 -10,1 -10,-4 C-10,-8 -7,-10 -4.5,-10 C-2.5,-10 -0.8,-8.8 0,-7 C0.8,-8.8 2.5,-10 4.5,-10 C7,-10 10,-8 10,-4 C10,1 3,5 0,8 Z';
/** The five of hearts, as the SVG task's solution writes it by hand. */
export const FIVE_OF_HEARTS = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140">
  <defs><path id="heart" d="${HEART}" fill="#c1121f"/></defs>
  <rect x="1" y="1" width="98" height="138" rx="8" fill="#ffffff" stroke="#555555" stroke-width="2"/>
  <g>
    <text x="11" y="23" font-family="Georgia, serif" font-size="19" font-weight="bold" text-anchor="middle" fill="#c1121f">5</text>
    <use href="#heart" transform="translate(11 35) scale(0.55)"/>
  </g>
  <g transform="rotate(180 50 70)">
    <text x="11" y="23" font-family="Georgia, serif" font-size="19" font-weight="bold" text-anchor="middle" fill="#c1121f">5</text>
    <use href="#heart" transform="translate(11 35) scale(0.55)"/>
  </g>
  <use href="#heart" transform="translate(30 30)"/>
  <use href="#heart" transform="translate(70 30)"/>
  <use href="#heart" transform="translate(50 70)"/>
  <use href="#heart" transform="translate(30 110) rotate(180)"/>
  <use href="#heart" transform="translate(70 110) rotate(180)"/>
</svg>
`;
const svgOf = (v: ProjectView, path: string) => v.project.assets.find((a) => a.path === path)?.svg ?? '';
const FIVE = 'assets/cards/5H.svg';

const svgTask: GameTask = {
  ...base,
  id: 'crib-svg',
  title: 'Drawing a card with SVG',
  goal: 'Draw the five of hearts by hand in SVG: its corners, a heart defined once and used six times, and the pips turned the right way up.',
  start: cribbageCode({ svgs: { [FIVE]: BLANK_5H } }),
  steps: [
    {
      text: 'In the Files panel, click assets/cards/5H.svg: it opens as text, with a preview beside it. It is only the blank card, a <rect>. Add the corner: a <text> with x="11" y="23", text-anchor="middle", fill="#c1121f", font-size="19", saying 5. Save (Ctrl/Cmd+S).',
      check: { kind: 'project', test: (v) => /<text\b[^>]*>\s*5\s*<\/text>/.test(svgOf(v, FIVE)) || 'Add <text x="11" y="23" … fill="#c1121f">5</text> to 5H.svg and save.' },
      hint: '<text x="11" y="23" font-size="19" font-weight="bold" text-anchor="middle" fill="#c1121f">5</text>',
    },
    {
      text: 'A heart is a <path>: a pen moving from point to point (M moves, C draws a curve, Z closes). Define it once, inside <defs>, with an id: <defs><path id="heart" d="…" fill="#c1121f"/></defs> (the path is in the lesson). Then draw it under the 5 with <use href="#heart" transform="translate(11 35) scale(0.55)"/>.',
      check: { kind: 'project', test: (v) => { const s = svgOf(v, FIVE); return (/<defs>[\s\S]*id="[^"]+"[\s\S]*<\/defs>/.test(s) && /<use\b[^>]*href="#/.test(s)) || 'Put the heart path in <defs> with an id, and draw it with <use href="#heart" …/>.'; } },
    },
    {
      text: 'The five pips: five more <use href="#heart">, at (30, 30), (70, 30), (50, 70), (30, 110) and (70, 110), each with transform="translate(x y)".',
      check: { kind: 'project', test: (v) => { const uses = (svgOf(v, FIVE).match(/<use\b/g) ?? []).length; return uses >= 6 || `There are ${uses} <use> elements; the corner heart and five pips make 6.`; } },
    },
    {
      text: 'A real card is the same upside down. Turn the two lower pips: add rotate(180) after their translate. Then copy the corner (the 5 and its heart) into <g transform="rotate(180 50 70)">…</g>: the whole group turned half round about the card\'s centre, so it lands bottom-right, upside down.',
      check: { kind: 'project', test: (v) => /rotate\(\s*180\s+50\s+70\s*\)/.test(svgOf(v, FIVE)) || 'Add <g transform="rotate(180 50 70)"> with a copy of the corner inside it.' },
    },
    {
      text: 'Run the game: the five of hearts in any hand is the one you drew. (The other 51 come from one function in the build code, the same shapes in a loop: the lesson shows it.)',
      check: { kind: 'editor', test: (v) => (v.ran && /rotate\(\s*180\s+50\s+70\s*\)/.test(svgOf(v, FIVE))) || 'Press ▶ Run.' },
    },
  ],
  solution: `project.writeSvg(${JSON.stringify(FIVE)}, ${JSON.stringify(FIVE_OF_HEARTS)})`,
  done: 'An SVG image is text: shapes in a coordinate system, defined once and reused, moved and turned by transforms. Next: the rules, starting with the score.',
};

// ── 10.4: scoring the show ────────────────────────────────────────────────

const SCORE_SHOW_STUB = CRIBBAGE_SCRIPTS[SCORE_JS]
  .replace(/\/\*\* Fifteens:[\s\S]*?\n}\n/, `/** Fifteens: 2 for each different set of cards adding up to 15. */
export function fifteens(cards) {
  return [];   // write it: every subset whose values add up to 15, each as { what: 'fifteen', cards: subset, points: 2 }
}
`)
  .replace(/\/\*\* Pairs:[\s\S]*?\n}\n/, `/** Pairs: 2 for each pair of cards of the same rank (three of a kind is three pairs, 6; four is six pairs, 12). */
export function pairs(cards) {
  return [];   // write it: for each i < j with the same rank, { what: 'pair', cards: [cards[i], cards[j]], points: 2 }
}
`)
  .replace(/\/\*\*\n \* Runs:[\s\S]*?\n}\n/, `/**
 * Runs: three or more cards in sequence (aces are low: A 2 3 is a run, Q K A is not). Only the longest runs count,
 * once for each different set of cards that makes one: 3 4 4 5 is two runs of three, 6 points.
 */
export function runs(cards) {
  return [];   // write it: from the longest length down to 3, the subsets of that length that are runs (isRun); stop at the first length that has any
}
`)
  .replace(/\/\*\*\n \* Flush:[\s\S]*?\n}\n/, `/**
 * Flush: the four cards in a hand of one suit, 4, and 5 if the starter is too. The crib only scores a flush of all
 * five.
 */
export function flush(hand, starter, isCrib) {
  return [];   // write it
}
`)
  .replace(/\/\*\* Nobs:[\s\S]*?\n}\n/, `/** Nobs: the jack of the starter's suit in the hand, 1. */
export function nobs(hand, starter) {
  return [];   // write it
}
`);

const scoreCase = async (v: PlayView, fn: string, args: unknown[], want: number, what: string) => {
  const f = fnOf(await v.module(SCORE_JS), fn, SCORE_JS);
  const got = total(f(...args));
  return got === want || `${fn}(${what}) scores ${Number.isNaN(got) ? 'nothing (it should return a list of { what, cards, points })' : got}; it should be ${want}.`;
};
const allTrue = (results: CheckResult[]) => results.find((r) => r !== true) ?? true;

const scoreTask: GameTask = {
  ...base,
  id: 'crib-score',
  title: 'Scoring the show',
  goal: 'Write the five scoring rules in scripts/score.js: fifteens, pairs, runs, flush and nobs, and score the famous hands.',
  start: cribbageCode({ brain: false, scripts: { [SCORE_JS]: SCORE_SHOW_STUB } }),
  steps: [
    {
      text: 'Open scripts/score.js. subsets(cards) is written for you: every combination of the cards (2ⁿ − 1 of them). Write fifteens(cards): every subset whose values add to 15, each { what: \'fifteen\', cards: subset, points: 2 }.',
      check: moduleCheck(async (v) => allTrue([
        await scoreCase(v, 'fifteens', [cards('5H KS')], 2, '5 K'),
        await scoreCase(v, 'fifteens', [cards('5H 5C 5S JD 5D')], 16, '5 5 5 J 5'),
        await scoreCase(v, 'fifteens', [cards('2S 4H 6D 8C KS')], 0, '2 4 6 8 K'),
      ])),
      hint: 'return subsets(cards).filter((s) => s.reduce((t, c) => t + value(c), 0) === 15).map((s) => ({ what: \'fifteen\', cards: s, points: 2 }));',
    },
    {
      text: 'Write pairs(cards): 2 for every two cards of the same rank. Three of a kind is three pairs (6), four of a kind six pairs (12): count every pair i < j.',
      check: moduleCheck(async (v) => allTrue([
        await scoreCase(v, 'pairs', [cards('7H 7S')], 2, '7 7'),
        await scoreCase(v, 'pairs', [cards('7H 7S 7D 2C')], 6, '7 7 7 2'),
        await scoreCase(v, 'pairs', [cards('2H 2S 2D 2C 9S')], 12, '2 2 2 2 9'),
      ])),
    },
    {
      text: 'Write runs(cards): from the longest length down to 3, find the subsets of that length that are runs (isRun is written for you); the first length with any is the answer, one part per run. So 3 4 4 5 is two runs of three (6), and 3 4 5 6 is one run of four, not two of three.',
      check: moduleCheck(async (v) => allTrue([
        await scoreCase(v, 'runs', [cards('3H 4S 5D KC')], 3, '3 4 5 K'),
        await scoreCase(v, 'runs', [cards('3H 4S 4D 5C')], 6, '3 4 4 5'),
        await scoreCase(v, 'runs', [cards('3H 4S 5D 6C')], 4, '3 4 5 6'),
        await scoreCase(v, 'runs', [cards('3H 3S 4D 4C 5S')], 12, '3 3 4 4 5'),
        await scoreCase(v, 'runs', [cards('QH KS AD')], 0, 'Q K A'),
      ])),
    },
    {
      text: 'Write flush(hand, starter, isCrib): four cards of one suit in the hand score 4, and 5 if the starter matches; the crib scores only a flush of all five. And nobs(hand, starter): the jack of the starter\'s suit in the hand, 1.',
      check: moduleCheck(async (v) => allTrue([
        await scoreCase(v, 'flush', [cards('2H 4H 6H 8H'), cards('KS')[0], false], 4, 'four hearts, starter K♠'),
        await scoreCase(v, 'flush', [cards('2H 4H 6H 8H'), cards('KS')[0], true], 0, 'four hearts in the crib, starter K♠'),
        await scoreCase(v, 'flush', [cards('2H 4H 6H 8H'), cards('KH')[0], true], 5, 'four hearts in the crib, starter K♥'),
        await scoreCase(v, 'nobs', [cards('JH 2C 4S 6D'), cards('8H')[0]], 1, 'J♥ in the hand, starter 8♥'),
        await scoreCase(v, 'nobs', [cards('JH 2C 4S 6D'), cards('8C')[0]], 0, 'J♥ in the hand, starter 8♣'),
      ])),
    },
    {
      text: 'scoreHand puts them together. Check the famous hands: 5 5 5 J with the 5 of the jack\'s suit cut is 29, the best there is; 4 4 5 6 with a 6 is 24. Run the game and watch the show count your hands.',
      check: moduleCheck(async (v) => {
        const score = fnOf(await v.module(SCORE_JS), 'scoreHand', SCORE_JS);
        const s = (h: string, st: string) => (score(cards(h), cards(st)[0], false) as { total: number }).total;
        const got = [s('5H 5C 5S JD', '5D'), s('4S 4H 5D 6C', '6S'), s('3S 3H 4D 5C', 'KS'), s('2S 4H 6D 8C', 'KS')];
        return JSON.stringify(got) === '[29,24,12,0]' || `The hands score ${got.join(', ')}; they should be 29, 24, 12 and 0 (${named(cards('5H 5C 5S JD'))} + 5D, …).`;
      }),
    },
  ],
  solution: finish(SCORE_JS),
  done: 'Five rules, each a few lines over the same idea: look at every combination. Next: pegging, the scoring that happens as cards are played.',
};

// ── 10.5: pegging ─────────────────────────────────────────────────────────

const SCORE_PEG_STUB = stubFunction(
  CRIBBAGE_SCRIPTS[SCORE_JS].replace('export function countOf(pile) { return pile.reduce((t, c) => t + value(c), 0); }', `export function countOf(pile) {
  return 0;   // write it: the values of the cards in pile, added up
}`),
  'pegPoints(pile)',
  `  // write it: the card just played is the last of pile, and the count is countOf(pile).
  //   15 or 31: { what: 'fifteen' or 'thirty-one', points: 2 }
  //   the same rank as the card before (and before that…): a pair 2, three of a kind 6, four of a kind 12
  //   a run: the longest run the last three or more cards make, in any order (isRun), one point a card
  return { total: 0, parts: [] };`);

const TABLE_PEG_STUB = stubMethod(stubMethod(CRIBBAGE_SCRIPTS[TABLE_JS], 'options(seat)', `    return [];   // write it: the places k of the cards in this.hands[seat] that are not yet played (this.played[seat][k]) and keep this.count + their value at 31 or under`),
  'nextTurn()', `    this.waiting = null;
    // write it, in this order (the lesson walks through each):
    // 1. Both players have played every card (cardsLeft): the last to play pegs 1, 'last card', unless the count is 31;
    //    then, if the game goes on, wait(1.2) and start the show.
    // 2. The count is 31: wait(0.8), then reset the count and call nextTurn() again.
    // 3. The player whose turn it is can play (options): waitFor them.
    // 4. Else, the other can: note that this player says go (if they have cards left), and the turn passes.
    // 5. Else neither can: the last to play pegs 1 for the go; wait(0.8), then reset the count, the player after
    //    the last to play leads, and nextTurn() again.`);

const pegCase = async (v: PlayView, pile: string, want: number) => {
  const f = fnOf(await v.module(SCORE_JS), 'pegPoints', SCORE_JS);
  const out = f(cards(pile)) as { total?: number } | undefined;
  return out?.total === want || `pegPoints of ${pile} gives ${out?.total ?? 'nothing'}; it should be ${want}.`;
};
/** A pegging position on the table, set up by hand: hands, which are played, the count, whose turn. */
function pegging(t: TableNode, opts: { you: string; ai: string; played?: [boolean[], boolean[]]; pile?: string; turn: number; last: number | null }) {
  t.fast = true; t.pending = null; t.phase = 'peg';
  t.hands = [cards(opts.you), cards(opts.ai)];
  t.played = opts.played ?? [t.hands[0].map(() => false), t.hands[1].map(() => false)];
  t.pile = opts.pile ? cards(opts.pile) : [];
  t.count = t.pile.reduce((n, c) => n + Math.min(c.rank, 10), 0);
  t.turn = opts.turn; t.lastPlayer = opts.last; t.scores = [0, 0]; t.backPeg = [0, 0]; t.older = []; t.history = [];
}
/** Let the table's waits run out (it is in fast mode, so each takes a frame). */
const settle = (r: PlayResult, frames = 4) => { for (let k = 0; k < frames; k++) r.game.step(1 / 60); };

const pegTask: GameTask = {
  ...base,
  id: 'crib-peg',
  title: 'Pegging: the count, and the go',
  goal: 'Write how a card scores as it is played, which cards can be played, and whose turn it is, through every go and 31.',
  start: cribbageCode({ brain: false, scripts: { [SCORE_JS]: SCORE_PEG_STUB, [TABLE_JS]: TABLE_PEG_STUB } }),
  steps: [
    {
      text: 'In scripts/score.js, write countOf(pile): the values of the cards played since the count last started from 0, added up.',
      check: moduleCheck(async (v) => {
        const f = fnOf(await v.module(SCORE_JS), 'countOf', SCORE_JS);
        const got = [f(cards('5H KS')), f(cards('AS 2H 3D')), f([])];
        return JSON.stringify(got) === '[15,6,0]' || `countOf gives ${got.join(', ')} for 5 K, A 2 3 and nothing; it should give 15, 6, 0.`;
      }),
    },
    {
      text: 'Write pegPoints(pile), the points for the card just played (the last of pile). Start with the count: 15 is 2 (fifteen), 31 is 2 (thirty-one).',
      check: moduleCheck(async (v) => allTrue([await pegCase(v, '5H KS', 2), await pegCase(v, 'KS QS JS AH', 2), await pegCase(v, '4H 9S', 0)])),
    },
    {
      text: 'Pairs: count how many cards in a row at the end of the pile have the played card\'s rank. Two is a pair (2), three is three of a kind (6), four is four of a kind (12). Only the end counts: 7 2 7 is no pair.',
      check: moduleCheck(async (v) => allTrue([await pegCase(v, '7H 7S', 2), await pegCase(v, '7H 7S 7D', 6), await pegCase(v, '2H 2S 2D 2C', 12), await pegCase(v, '7H 2S 7D', 0)])),
    },
    {
      text: 'Runs: from the whole pile down to the last three cards, the first (longest) run the last cards make, in any order, scores one point a card. 4 3 5 is a run of three; 3 5 4 6 a run of four; 3 4 4 is a pair, not a run.',
      check: moduleCheck(async (v) => allTrue([await pegCase(v, '3H 4S 5D', 3), await pegCase(v, '4S 3H 5D', 3), await pegCase(v, '3H 5D 4S 6C', 4), await pegCase(v, '3H 4S 4D', 2), await pegCase(v, '3H 3S 4D 5C', 5)])),
    },
    {
      text: 'In scripts/table.js, write options(seat): the places in the hand of the cards that player can play now, unplayed and keeping the count at 31 or under.',
      check: moduleCheck(async (v) => {
        const { t } = await table(v, { setup: (t) => pegging(t, { you: '5H KS 9C AH', ai: '2C 3C 4C 6C', played: [[false, true, false, false], [false, false, false, false]], pile: 'KD 10S 5D', turn: 0, last: 1 }) });
        const got = call(t, 'options', 0) as number[];
        return JSON.stringify(got) === '[0,3]' || `With the count at 25, the 5 and the ace fit (places 0 and 3); options gave ${JSON.stringify(got)}.`;
      }),
    },
    {
      text: 'Write nextTurn(), the turns of pegging, following the five steps in its comment: the last card, 31, play, go, and when neither can play.',
      check: moduleCheck(async (v) => {
        // A go: you cannot play at 28, the AI can.
        let { t, r } = await table(v, { setup: (t) => pegging(t, { you: 'KH QH 9S 8C', ai: 'AH 2D 9C KC', pile: 'KS 9D 9H', turn: 0, last: 1 }) });
        call(t, 'nextTurn');
        if (t.turn !== 1 || t.waiting !== 1) return 'At 28 you cannot play and the AI can (an ace or a two): the turn should pass to the AI.';
        // Neither can play: the last to play pegs 1, the count starts again, and the other leads.
        ({ t, r } = await table(v, { setup: (t) => pegging(t, { you: 'KH QH 9S 8C', ai: 'KD 9C QC JC', pile: 'KS 9D 9H', turn: 0, last: 1 }) }));
        call(t, 'nextTurn');
        settle(r);
        if (t.scores[1] !== 1) return `When neither can play at 28, the AI (the last to play) should peg 1 for the go; it has ${t.scores[1]}.`;
        if (t.count !== 0 || t.turn !== 0) return 'After a go, the count starts again from 0, and the player after the last to play leads (you).';
        // The last card of all.
        ({ t, r } = await table(v, { setup: (t) => pegging(t, { you: '2H', ai: '3D', played: [[true], [true]], pile: '2H 3D', turn: 0, last: 1 }) }));
        call(t, 'nextTurn');
        if (t.scores[1] !== 1) return 'When every card has been played, the last to play pegs 1 for the last card.';
        settle(r);
        return t.phase === 'show' || t.phase === 'discard' || 'After the last card, the show should start.';
      }),
    },
  ],
  solution: finish(SCORE_JS, TABLE_JS),
  done: 'Pegging is the part of cribbage where every card is a decision, and the AI\'s hardest job. Next: the rest of the table.',
};

// ── 10.6: the table ───────────────────────────────────────────────────────

const TABLE_FLOW_STUB = [
  ['newHand()', `    this.clearCards();
    // write the deal: this.deck, a new deck, shuffled; this.hands, two empty hands, then six cards each, one at a time
    // from the end of the deck (deck.pop()), the non-dealer (1 - this.dealer) first; then sort your hand by rank.
    this.deck = []; this.hands = [[], []];
    this.crib = [];
    this.threw = [[], []];
    this.starter = null;
    this.thrown = [false, false];
    this.selected = [];
    this.pile = []; this.older = []; this.history = []; this.count = 0;
    this.played = [[], []];
    this.showing = null;
    this.phase = 'discard';
    this.think = this.thinkTime();
    for (const card of [...this.hands[YOU], ...this.hands[AI]]) this.cards.push(this.addChild(new CardSprite(card, { x: 110, y: 310 })));
    this.say(\`\${NAMES[this.dealer]} dealt. Throw two cards to \${this.dealer === YOU ? 'your' : "the AI's"} crib.\`);`],
  ['throwCards(seat, t)', `    // write it: THROWS[t] is [i, j], two places in the seat's hand of six. Put those two cards in this.crib, keep them
    // in this.threw[seat], leave the other four in the hand, and mark this.thrown[seat]. When both have thrown,
    // wait(0.6) and cut.`],
  ['cut()', `    this.phase = 'cut';
    // write it: the starter is the top of the deck (this.deck.pop()); put a card on the table for it
    // (this.cards.push(this.addChild(new CardSprite(this.starter, { x: 110, y: 310 })))), and say what it is. A jack is
    // 2 for the dealer, "his heels". Unless that won the game, wait(1) and start pegging.`],
  ['award(seat, points, why)', `    // write it: the back peg goes where the front peg was; the score goes up (never past this.goal); note why. If
    // that reaches the goal (and this is not training), the game is over: phase 'over', nothing pending or waited
    // for, and say who won.`],
  ['startShow()', `    this.phase = 'show';
    this.resetCount(); this.older = [];
    // write it: count the non-dealer's hand, then the dealer's, then the crib (the dealer's), each with the starter
    // (scoreHand; the crib is scored as a crib). For each: this.showing = { seat, what, cards }, say the count
    // (sayParts), award it, and wait(4) before the next. After the crib, endHand().`],
].reduce((src, [head, body]) => stubMethod(src, head, body), CRIBBAGE_SCRIPTS[TABLE_JS]);

const fresh = (t: TableNode, opts: { dealer: number; you: string; ai: string; crib?: string; starter?: string; deck?: string }) => {
  t.fast = true; t.pending = null; t.dealer = opts.dealer; t.scores = [0, 0]; t.backPeg = [0, 0]; t.threw = [[], []]; t.thrown = [false, false]; t.pile = []; t.older = []; t.history = []; t.count = 0;
  t.hands = [cards(opts.you), cards(opts.ai)];
  t.crib = opts.crib ? cards(opts.crib) : []; t.starter = opts.starter ? cards(opts.starter)[0] : null;
  if (opts.deck) t.deck = cards(opts.deck);
};

const tableTask: GameTask = {
  ...base,
  id: 'crib-table',
  title: 'The table: deal, crib, cut, show, and 121',
  goal: 'Write the game\'s flow in scripts/table.js: the deal, the throw to the crib, the cut, pegging points to the board, and the show.',
  start: cribbageCode({ brain: false, scripts: { [TABLE_JS]: TABLE_FLOW_STUB } }),
  steps: [
    {
      text: 'In scripts/table.js, write the deal in newHand(): a shuffled new deck, six cards each from the end of it, one at a time and the non-dealer first, and your hand sorted by rank.',
      check: moduleCheck(async (v) => {
        const { t } = await table(v, { seconds: 0.2, keys: ['Digit2'] });
        const all = [...(t.hands?.[0] ?? []), ...(t.hands?.[1] ?? [])];
        if (t.hands?.[0]?.length !== 6 || t.hands?.[1]?.length !== 6) return 'Each player should get six cards.';
        if (new Set(all.map((c) => `${c.rank}${c.suit}`)).size !== 12 || t.deck?.length !== 40) return 'Deal twelve different cards from the deck, leaving 40.';
        return t.hands[0].every((c, i) => i === 0 || c.rank >= t.hands[0][i - 1].rank) || 'Sort your hand by rank, as a player holds it.';
      }),
    },
    {
      text: 'Write throwCards(seat, t): the two cards at THROWS[t] go to the crib; the hand keeps the other four. When both players have thrown, wait 0.6 seconds and cut.',
      check: moduleCheck(async (v) => {
        const { t } = await table(v, { setup: (t) => fresh(t, { dealer: 0, you: '2H 5C 5S 9D JH KC', ai: 'AH 3D 4C 7S 8H QD' }) });
        t.thrown = [false, false];
        call(t, 'throwCards', 0, 1);   // THROWS[1] is [0, 2]: the 2 and the second 5
        if (named(t.crib) !== '2H 5S' || named(t.hands[0]) !== '5C 9D JH KC') return `After throwing the first and third cards, the crib is ${named(t.crib)} and the hand ${named(t.hands[0])}; they should be 2H 5S and 5C 9D JH KC.`;
        return t.thrown[0] === true || 'Mark that you have thrown: this.thrown[seat] = true.';
      }),
    },
    {
      text: 'Write cut(): the starter is the top card of the deck. A jack is 2 points for the dealer, "his heels".',
      check: moduleCheck(async (v) => {
        const { t } = await table(v, { setup: (t) => fresh(t, { dealer: 1, you: '2H 5C 9D JH', ai: 'AH 3D 4C 7S', deck: '4D 8S JD' }) });
        call(t, 'cut');
        if (named(t.starter ? [t.starter] : []) !== 'JD') return 'The starter should be the top of the deck: the last card, deck.pop().';
        return t.scores[1] === 2 || `The starter is a jack and the AI dealt, so the AI pegs 2 for his heels; it has ${t.scores[1]}.`;
      }),
    },
    {
      text: 'Write award(seat, points, why): the back peg moves to where the front peg was, the front peg moves on, and reaching the goal (121) ends the game at once, even in the middle of a hand.',
      check: moduleCheck(async (v) => {
        const { t } = await table(v, { setup: (t) => fresh(t, { dealer: 0, you: '2H', ai: '3D' }) });
        t.scores = [40, 118];
        call(t, 'award', 0, 5, 'test');
        if (t.scores[0] !== 45 || (t.backPeg as number[])[0] !== 40) return 'After 5 points from 40, the front peg is at 45 and the back peg at 40.';
        call(t, 'award', 1, 6, 'test');
        if (t.scores[1] !== 121) return 'A score never goes past the goal: 118 + 6 is 121.';
        return t.phase === 'over' || 'Reaching 121 ends the game: phase \'over\'.';
      }),
    },
    {
      text: 'Write startShow(): the non-dealer\'s hand is counted first, then the dealer\'s, then the crib, the dealer\'s too, each with the starter. Each count is said and pegged.',
      check: moduleCheck(async (v) => {
        const { t, r } = await table(v, { setup: (t) => fresh(t, { dealer: 1, you: '4S 4H 5D 6C', ai: '2S 4D 6H 8C', crib: '5H 5C 5S JD', starter: '6S' }) });
        t.phase = 'peg';
        call(t, 'startShow');
        settle(r, 12);
        const you = t.scores[0], ai = t.scores[1];
        if (you !== 24) return `Your hand, 4 4 5 6 with the 6 cut, is 24; you have ${you}.`;
        return ai === 2 + 14 || `The AI's hand (2 4 6 8 with a 6: a pair of sixes, 2) and its crib (5 5 5 J with a 6: four fifteens and three of a kind, 14) make 16; it has ${ai}.`;
      }),
    },
    {
      text: 'Play a whole game: with your table finished, the game runs from the deal to 121. (The check plays one at full speed, the rules player in both seats.)',
      check: moduleCheck(async (v) => {
        const { t, r } = await table(v, { setup: (t) => { t.autoplay = true; t.fast = true; } });
        for (let f = 0; f < 20000 && t.phase !== 'over'; f++) r.game.step(1 / 60);
        if (r.errors.length) return r.errors[0];
        return (t.phase === 'over' && Math.max(...t.scores) === 121) || `After 20,000 frames the game is still at ${t.scores.join(' to ')} (${t.phase}).`;
      }),
    },
  ],
  solution: finish(TABLE_JS),
  done: 'The table is a state machine: each phase does its part and hands on to the next. Next: putting it on the screen, and your clicks.',
};

// ── 10.7: cards on the screen ─────────────────────────────────────────────

const SPRITE_JS = 'scripts/cardsprite.js';
const SPRITE_STUB = stubMethod(stubMethod(CRIBBAGE_SCRIPTS[SPRITE_JS], 'update(dt)', `    // write it: move this.position part of the way to this.target each frame. Closing the gap by a fraction
    // k = 1 − e^(−14 dt) each frame slides it there smoothly, whatever the frame rate. A Vec2 is new Vec2(x, y).
    this.texture = this.faceUp ? cardImage(this.card) : CARD_BACK;`),
  'contains(point)', `    return false;   // write it: is the point within half the card's width (50 × CARD_SCALE) and half its height (70 × CARD_SCALE) of where it is going (this.target)?`);
const TABLE_INPUT_STUB = stubMethod(CRIBBAGE_SCRIPTS[TABLE_JS], 'takeInput()', `    const click = input.isJustPressed('select'), confirm = input.isJustPressed('confirm');
    let picked = -1;
    for (let k = 0; k < 6; k++) if (input.isJustPressed(\`pick_\${k + 1}\`)) picked = k;
    if (this.phase === 'title') {
      const names = Object.keys(DIFFICULTY);
      names.forEach((name, i) => { if (picked === i || (click && this.hits(\`Overlay/Title/\${name}\`, 140, 48))) this.start(name); });
      return;
    }
    if (this.phase === 'over') { if (click || confirm) this.newGame(); return; }
    // write the rest:
    // 1. A click on one of your cards (CardSprite's contains(input.mouse)) picks its place in your hand, as keys 1–6 do.
    // 2. Throwing: a picked card is selected, or unselected if it was; at most two (a third replaces the oldest).
    //    With two selected, Enter or a click on the button (this.hits('HUD/Button', 160, 44)) throws them to the crib.
    // 3. Pegging, on your turn: a picked card is played if it fits (options); if not, say why.`);

/** A click at a point of the game: the pointer moves there, the button goes down, a frame, up, a frame. */
const clickAt = (r: PlayResult, x: number, y: number) => {
  const inp = r.game.input as unknown as { _move(x: number, y: number): void; key(k: string, d: boolean): void };
  inp._move(x, y); inp.key('MouseLeft', true); r.game.step(1 / 60); inp.key('MouseLeft', false); r.game.step(1 / 60);
};
const press = (r: PlayResult, key: string) => { r.game.input.key(key, true); r.game.step(1 / 60); r.game.input.key(key, false); r.game.step(1 / 60); };
type Sprite = Node & { card: Card; position: { x: number; y: number }; target: { x: number; y: number }; contains(p: { x: number; y: number }): boolean };
const myCards = (t: TableNode) => (t.cards as Sprite[]).filter((n) => t.hands[0].includes(n.card)).sort((a, b) => t.hands[0].indexOf(a.card) - t.hands[0].indexOf(b.card));

const screenTask: GameTask = {
  ...base,
  id: 'crib-screen',
  title: 'Cards on the screen, and your clicks',
  goal: 'Make the cards slide into place and know when they are clicked, and turn your clicks into throws and plays.',
  start: cribbageCode({ brain: false, scripts: { [SPRITE_JS]: SPRITE_STUB, [TABLE_JS]: TABLE_INPUT_STUB } }),
  steps: [
    {
      text: 'Open scripts/cardsprite.js. A card is dealt at the deck and the table sets this.target to where it belongs. Write update(dt): move this.position the fraction k = 1 − e^(−14 dt) of the way to the target each frame.',
      check: moduleCheck(async (v) => {
        const { t } = await table(v, { seconds: 1, setup: (t) => call(t, 'start', 'Medium') });
        const c = myCards(t)[0];
        if (!c) return 'Choose a difficulty (key 2) to deal.';
        const d = Math.hypot(c.position.x - c.target.x, c.position.y - c.target.y);
        return d < 2 || `A second after the deal, your first card is ${d.toFixed(0)} pixels from where it belongs: it should have slid there.`;
      }),
      hint: 'const k = 1 - Math.exp(-14 * dt), p = this.position, t = this.target; this.position = new Vec2(p.x + (t.x - p.x) * k, p.y + (t.y - p.y) * k);',
    },
    {
      text: 'Write contains(point): whether a point is on the card, within half its width (50 × CARD_SCALE) and half its height (70 × CARD_SCALE) of its target.',
      check: moduleCheck(async (v) => {
        const { t } = await table(v, { seconds: 0.5, setup: (t) => call(t, 'start', 'Medium') });
        const c = myCards(t)[0];
        if (!c) return 'Choose a difficulty (key 2) to deal.';
        const at = c.target, inside = [{ x: at.x, y: at.y }, { x: at.x + 39, y: at.y - 55 }], outside = [{ x: at.x + 41, y: at.y }, { x: at.x, y: at.y + 57 }];
        return (inside.every((p) => c.contains(p)) && outside.every((p) => !c.contains(p))) || 'contains() should be true inside the 80 × 112 card and false outside it.';
      }),
    },
    {
      text: 'Open scripts/table.js and finish takeInput(). First, a click on one of your cards picks it, as keys 1–6 do; while throwing, a picked card is selected (it rises), or unselected if it was already. At most two.',
      check: moduleCheck(async (v) => {
        const { t, r } = await table(v, { seconds: 0.5, setup: (t) => call(t, 'start', 'Medium') });
        const [a, b, c] = myCards(t);
        clickAt(r, a.target.x, a.target.y); clickAt(r, c.target.x, c.target.y);
        if (JSON.stringify([...t.selected].sort()) !== '[0,2]') return `After clicking your first and third cards, selected is ${JSON.stringify(t.selected)}; it should be [0, 2].`;
        clickAt(r, a.target.x, a.target.y);
        if (JSON.stringify(t.selected) !== '[2]') return 'Clicking a selected card again unselects it.';
        press(r, 'Digit2');
        void b;
        return JSON.stringify([...t.selected].sort()) === '[1,2]' || 'Key 2 should pick your second card, as a click does.';
      }),
    },
    {
      text: 'With two selected, Enter (or a click on the Throw to crib button) throws them: this.throwCards(YOU, the THROWS number of the pair).',
      check: moduleCheck(async (v) => {
        const { t, r } = await table(v, { seconds: 0.5, setup: (t) => call(t, 'start', 'Medium') });
        const before = named(t.hands[0]);
        press(r, 'Digit1'); press(r, 'Digit4'); press(r, 'Enter');
        const hand = named(t.hands[0]), parts = before.split(' ');
        return (t.thrown[0] && hand === [parts[1], parts[2], parts[4], parts[5]].join(' ')) || `After selecting the first and fourth cards and Enter, your hand should be ${[parts[1], parts[2], parts[4], parts[5]].join(' ')}; it is ${hand}.`;
      }),
    },
    {
      text: 'Pegging, on your turn: a picked card is played if it fits; if it would take the count past 31, say so and wait.',
      check: moduleCheck(async (v) => {
        const { t, r } = await table(v, { setup: (t) => pegging(t, { you: '5H KS 9C AH', ai: '2C 3C 4C 6C', pile: 'KD 10S', turn: 0, last: 1 }) });
        t.waiting = 0; t.phase = 'peg';
        press(r, 'Digit2');   // the king: 20 + 10 = 30, it fits
        if (!(t.played[0][1])) return 'At 20 your king fits: picking it should play it.';
        return true;
      }),
    },
  ],
  solution: finish(SPRITE_JS, TABLE_JS),
  done: 'A picture is not a button: a click is a point, and the game decides what is under it. Next: a player that plays by rules, and seeing the AI\'s hand.',
};

// ── 10.8: a rules player ──────────────────────────────────────────────────

const FEATURES_JS = 'scripts/features.js', PARTNER_JS = 'scripts/partner.js';
const FEATURES_RULES_STUB = stubFunction(stubFunction(CRIBBAGE_SCRIPTS[FEATURES_JS], 'unseen(known)', `  return [];   // write it: every card of a new deck that is not one of the known cards (sameCard)`),
  'expectedHand(kept, known)', `  return 0;   // write it: the average, over every card it has not seen, of scoreHand(kept, that card as the starter).total`);
const PARTNER_STUB = stubFunction(stubFunction(CRIBBAGE_SCRIPTS[PARTNER_JS], 'rulesThrow(hand, myCrib)', `  return 0;   // write it: for each of the 15 THROWS, expectedHand of the four kept, plus (your crib) or minus (theirs) the crib points
  //   of the two thrown: 2 for a fifteen, 2 for a pair, 1 for each five. Return the number of the best throw.`),
  'rulesPlay(hand, options, pile)', `  return options[0];   // write it: for each option k, score pegPoints of the pile with hand[k] added, × 10; take away 15 if it
  //   leaves the count on 5 or 21; add value / 10 to prefer the higher card. Return the best k.`);

const rulesTask: GameTask = {
  ...base,
  id: 'crib-rules',
  title: 'A rules player, and the developer view',
  goal: 'Write a player that plays by a sensible player\'s rules: the AI\'s opponent while it trains, and the yardstick it is measured against.',
  start: cribbageCode({ brain: false, scripts: { [FEATURES_JS]: FEATURES_RULES_STUB, [PARTNER_JS]: PARTNER_STUB } }),
  steps: [
    {
      text: 'In scripts/features.js, write unseen(known): the cards a player has not seen, every card of a new deck that is not among the known ones.',
      check: moduleCheck(async (v) => {
        const f = fnOf(await v.module(FEATURES_JS), 'unseen', FEATURES_JS);
        const left = f(cards('5H 5C JD 2S 9C KH')) as Card[];
        return (Array.isArray(left) && left.length === 46 && !left.some((c) => c.rank === 5 && c.suit === 'H')) || 'unseen() of six cards should be the other 46.';
      }),
    },
    {
      text: 'Write expectedHand(kept, known): the hand\'s show score averaged over every starter it could still get. Kept 5 5 J K from a hand with a 2 and 9 thrown averages 12.43 points.',
      check: moduleCheck(async (v) => {
        const f = fnOf(await v.module(FEATURES_JS), 'expectedHand', FEATURES_JS);
        const got = Number(f(cards('5H 5C JD KH'), cards('5H 5C JD 2S 9C KH')));
        return Math.abs(got - 12.4348) < 0.001 || `expectedHand gives ${got.toFixed(4)}; it should be 12.4348 (572 points over 46 starters).`;
      }),
    },
    {
      text: 'Open scripts/partner.js and write rulesThrow(hand, myCrib): keep the four that score most on average, and give a fifteen, a pair or a five to the crib when it is yours, never when it is theirs.',
      check: moduleCheck(async (v) => {
        const m = await v.module(PARTNER_JS), f = fnOf(m, 'rulesThrow', PARTNER_JS);
        const hand = cards('3D 4H 6C 9D JC KH'), name = (t: unknown) => { const pair = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 3], [2, 4], [2, 5], [3, 4], [3, 5], [4, 5]][Number(t)]; return pair ? named(pair.map((i) => hand[i])) : String(t); };
        const mine = name(f(hand, true)), theirs = name(f(hand, false));
        return (mine === '6C 9D' && theirs === 'JC KH') || `From 3 4 6 9 J K it throws ${mine} to its own crib and ${theirs} to yours; the rules say 6 9 (a fifteen, kept for itself) and J K.`;
      }),
    },
    {
      text: 'Write rulesPlay(hand, options, pile): the card that pegs the most now, never one that leaves the count on 5 or 21 (the other player\'s ten makes 15 or 31), else the higher card.',
      check: moduleCheck(async (v) => {
        const f = fnOf(await v.module(PARTNER_JS), 'rulesPlay', PARTNER_JS);
        const got = [f(cards('KS 2C 3D'), [0, 1, 2], cards('5H')), f(cards('5C 9S'), [0, 1], []), f(cards('6C 9S 2D'), [0, 1, 2], cards('KH 5S'))];
        return JSON.stringify(got) === '[0,1,1]' || `It plays ${JSON.stringify(got)}: on a 5 the king (fifteen, 0); to lead, the 9 not the 5 (1); at 15, the 9, not the 6 that leaves 21 (1).`;
      }),
    },
    {
      text: 'Run the game: with no brain yet, the AI plays by your rules (scripts/opponent.js, update()). Press D for the developer view: its hand turns face up.',
      check: moduleCheck(async (v) => {
        const { t, r } = await table(v, { seconds: 0.3, setup: (t) => call(t, 'start', 'Medium') });
        press(r, 'KeyD');
        if (!t.developer) return 'Press D to turn on the developer view.';
        const text = String((r.node('HUD/Developer') as unknown as { text?: string } | null)?.text ?? '');
        return /AI hand/.test(text) || 'The developer view should list the AI\'s hand.';
      }),
    },
  ],
  solution: finish(FEATURES_JS, PARTNER_JS),
  done: 'A rules player is what you would write without machine learning: it plays reasonably, and it is what the AI must beat. Next: turning the AI into a learning agent.',
};

// ── 10.9: the AI as an agent ──────────────────────────────────────────────

const OPPONENT_JS = 'scripts/opponent.js';
const OPPONENT_STUB = [
  ['legalActions()', `    return [];   // write it: the table's decision(AI): its legal moves, or [] when it has none (it is not its turn)`],
  ['act(action)', `    // write it: make the move (this.table.move(AI, action)); first, when not training, remember(action) for the developer view`],
  ['reward()', `    return 0;   // write it: the AI's points minus yours since the last call (keep the scores in this.seen)`],
  ['done()', `    return false;   // write it: the episode is over: the table's phase is 'done' (a training hand ended) or 'over'`],
].reduce((src, [head, body]) => src.includes(`\n  ${head} {\n`) ? stubMethod(src, head, body) : src.replace(new RegExp(`\\n  ${head.replace(/[()]/g, '\\$&')} \\{[^\\n]*\\}\\n`), `\n  ${head} {\n${body}\n  }\n`), CRIBBAGE_SCRIPTS[OPPONENT_JS])
  .replace(/\n  actions = \[[^\n]*\];\n/, `\n  actions = [];   // write it: the names of its 19 moves: 15 throws ('throw 1+2' … 'throw 5+6', from THROWS) and 'play 1' to 'play 4'\n`);

type Agent = Node & { actions: string[]; legalActions(): number[]; act(a: number): void; reward(): number; done(): boolean };
const opponent = (r: PlayResult) => r.node<Agent>('Opponent')!;

const agentTask: GameTask = {
  ...base,
  id: 'crib-agent',
  title: 'The AI as a turn-based agent',
  goal: 'Make the Opponent an agent a learner can train: its moves, which are legal when, what it earns, and when an episode ends.',
  start: cribbageCode({ brain: false, scripts: { [OPPONENT_JS]: OPPONENT_STUB } }),
  steps: [
    {
      text: 'Open scripts/opponent.js. Its moves are numbered: 0 to 14 are the 15 ways to throw two of six cards (THROWS), 15 to 18 play the first to fourth card of its hand. Write actions, their 19 names.',
      check: moduleCheck(async (v) => {
        const { r } = await table(v, { training: true });
        const a = opponent(r).actions;
        return (Array.isArray(a) && a.length === 19) || `actions has ${Array.isArray(a) ? a.length : 'no'} names; there are 19 moves.`;
      }),
    },
    {
      text: 'Write legalActions(): the moves it may make now, from the table\'s decision(AI), or [] when it has none. While both are throwing it is all 15 throws; when it is its turn to peg, the cards it can play, as 15 + their place.',
      check: moduleCheck(async (v) => {
        const { t, r } = await table(v, { training: true, seconds: 0.05 });
        const legal = opponent(r).legalActions();
        if (JSON.stringify(legal) !== JSON.stringify([...Array(15).keys()])) return `At the deal, legalActions() should be the 15 throws, 0 to 14; it is ${JSON.stringify(legal)}.`;
        pegging(t, { you: '5H KS 9C AH', ai: '2C KC 9D 6C', pile: 'KD 10S 5H', turn: 1, last: 0 });
        t.waiting = 1; t.think = 0;
        const peg = opponent(r).legalActions();
        if (JSON.stringify(peg) !== '[15,18]') return `At 25, with 2 K 9 6, it can play the 2 and the 6: [15, 18]; legalActions() is ${JSON.stringify(peg)}.`;
        t.waiting = 0;
        return JSON.stringify(opponent(r).legalActions()) === '[]' || 'When it is not its turn, legalActions() is [].';
      }),
    },
    {
      text: 'Write act(action): make the move, this.table.move(AI, action) (and when not training, remember it first, for the developer view).',
      check: moduleCheck(async (v) => {
        const { t, r } = await table(v, { training: true, seconds: 0.05 });
        opponent(r).act(0);
        return (t.hands[1].length === 4 && t.thrown[1]) || 'act(0) should throw the AI\'s first two cards to the crib.';
      }),
    },
    {
      text: 'Write reward(): what it earned since its last move, its points minus yours. It learns to score, and to stop you scoring.',
      check: moduleCheck(async (v) => {
        const { t, r } = await table(v, { training: true, seconds: 0.05 });
        const o = opponent(r);
        o.reward();
        t.scores = [t.scores[0] + 3, t.scores[1] + 5];
        const first = o.reward(), again = o.reward();
        return (first === 2 && again === 0) || `After it pegs 5 and you peg 3, reward() should be 2, and then 0; it was ${first} and ${again}.`;
      }),
    },
    {
      text: 'Write done(): the episode is over. In training an episode is one hand (the table\'s phase becomes \'done\'); in a game, when it is \'over\'.',
      check: moduleCheck(async (v) => {
        const { t, r } = await table(v, { training: true, seconds: 0.05 });
        const o = opponent(r);
        if (o.done()) return 'At the start of a hand, done() is false.';
        t.phase = 'done';
        return o.done() === true || 'When the table\'s phase is \'done\', done() is true.';
      }),
    },
  ],
  solution: finish(OPPONENT_JS),
  done: 'The agent asks the game, never the other way round: what may I do, what did I earn, is it over. Next: what it sees of each move.',
};

// ── 10.10: features ───────────────────────────────────────────────────────

const FEATURES_STUB = [
  ['discardFeatures(hand, [i, j], myCrib)', `  const kept = hand.filter((_, k) => k !== i && k !== j), a = hand[i], b = hand[j];
  const sign = myCrib ? 1 : -1;   // points in the crib are good when it is mine, bad when it is theirs
  // write the block: 1 (the bias); the kept four's expected points / 10; sign × the crib value of the two thrown
  // (CRIB_VALUE[a.rank − 1][b.rank − 1]) / 10; and sign.
  const block = [0, 0, 0, 0];
  return [...block, ...new Array(PEG_FEATURES.length).fill(0)];`],
  ['cribTable()', `  return [];   // write it (optional, for the curious): for every pair of ranks, the crib's average score over every other
  //   two crib cards and starter, weighted by how many ways the deck makes them. The game uses CRIB_VALUE, its answer.`],
  ['pegFeatures(card, pile, known, handShow, myCrib, threw)', `  const after = [...pile, card], count = countOf(after);
  const others = unseen(known);
  const fits = others.filter((c) => count + value(c) <= 31);
  const share = (test) => (others.length ? fits.filter(test).length / others.length : 0);
  // write the block, 11 numbers, in the order of PEG_FEATURES: 1; the points it pegs now / 4; the count after / 31;
  // the share of the unseen cards that would score 15 or 31 after it, that would pair it, that would make a run;
  // 1 if it leads (the pile is empty) with a card under 5, else 0; its value / 10; handShow / 10;
  // the crib's expected value (+ mine, − theirs, CRIB_VALUE of the two it threw) / 10; and 1 or −1 for whose crib.
  const block = new Array(PEG_FEATURES.length).fill(0);
  return [...new Array(DISCARD_FEATURES.length).fill(0), ...block];`],
].reduce((src, [head, body]) => stubFunction(src, head, body), CRIBBAGE_SCRIPTS[FEATURES_JS]);

const close = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < 1e-9);
const show = (xs: number[]) => `[${xs.map((x) => +x.toFixed(3)).join(', ')}]`;
const REF = REF_FEATURES as unknown as { discardFeatures: (...a: unknown[]) => number[]; pegFeatures: (...a: unknown[]) => number[]; CRIB_VALUE: number[][]; PEG_FEATURES: string[]; DISCARD_FEATURES: string[] };
/** Pegging cases: playing a card onto a pile, with what the player knows. */
const PEG_CASES: [string, string, string, number, boolean, string][] = [
  ['KS', '5H', 'KS 2C 3D 4H 5H 8S', 4, false, '2C 8S'],
  ['5C', '', '5C 9S QD KH 7D 7S', 6, true, '7D 7S'],
  ['6C', 'KH 5S', '6C 9S 2D AH KH 5S QC', 2, false, 'AH QC'],
  ['3D', '4H 5S', '3D 3H 8C 9C 4H 5S 10D', 8, true, '8C 10D'],
];
const pegRef = (c: (typeof PEG_CASES)[number]) => REF.pegFeatures(cards(c[0])[0], c[1] ? cards(c[1]) : [], cards(c[2]), c[3], c[4], cards(c[5]));
const pegYours = async (v: PlayView, c: (typeof PEG_CASES)[number]) => fnOf(await v.module(FEATURES_JS), 'pegFeatures', FEATURES_JS)(cards(c[0])[0], c[1] ? cards(c[1]) : [], cards(c[2]), c[3], c[4], cards(c[5])) as number[];
/** The pegging block's entries from..to agree with the finished features on every case. */
async function pegBlock(v: PlayView, from: number, to: number, what: string): Promise<CheckResult> {
  const off = REF.DISCARD_FEATURES.length;
  for (const c of PEG_CASES) {
    const yours = await pegYours(v, c), ref = pegRef(c);
    if (!Array.isArray(yours) || yours.length !== ref.length) return `pegFeatures should return ${ref.length} numbers: ${REF.DISCARD_FEATURES.length} zeros for the discard block, then ${REF.PEG_FEATURES.length}.`;
    const y = yours.slice(off + from, off + to + 1), r = ref.slice(off + from, off + to + 1);
    if (!close(y, r)) return `Playing ${c[0]} onto ${c[1] || 'nothing'}: ${what} are ${show(y)}; they should be ${show(r)}.`;
  }
  return true;
}

const featuresTask: GameTask = {
  ...base,
  id: 'crib-features',
  title: 'Features: what the AI sees of a move',
  goal: 'Describe every move as numbers the AI can learn from: what a throw keeps and gives the crib, and what a card scores and risks.',
  start: cribbageCode({ brain: false, scripts: { [FEATURES_JS]: FEATURES_STUB } }),
  steps: [
    {
      text: 'Open scripts/features.js. Write discardFeatures: its block is [1, the kept four\'s expected points / 10, ± the crib value of the two thrown / 10 (+ when the crib is yours), ±1], then zeros for the pegging block.',
      check: moduleCheck(async (v) => {
        const f = fnOf(await v.module(FEATURES_JS), 'discardFeatures', FEATURES_JS);
        for (const [hand, t, mine] of [['5H 5C JD 2S 9C KH', [0, 1], true], ['5H 5C JD 2S 9C KH', [3, 4], false], ['3D 4H 6C 9D JC KH', [2, 3], true]] as [string, number[], boolean][]) {
          const yours = f(cards(hand), t, mine) as number[], ref = REF.discardFeatures(cards(hand), t, mine);
          if (!Array.isArray(yours) || !close(yours, ref)) return `Throwing places ${t.join(' and ')} of ${hand} (${mine ? 'your' : 'their'} crib): ${Array.isArray(yours) ? show(yours.slice(0, 4)) : 'no list'}; it should be ${show(ref.slice(0, 4))} and ${REF.PEG_FEATURES.length} zeros.`;
        }
        return true;
      }),
    },
    {
      text: 'Write pegFeatures\' first numbers: 1, the points the card pegs now / 4 (pegPoints of the pile with it), and the count after it / 31.',
      check: moduleCheck(async (v) => pegBlock(v, 0, 2, 'the bias, points now and count after')),
    },
    {
      text: 'Then the three risks: of the cards it has not seen, the share that would let the other player score 15 or 31 next, pair it, or make a run (a card that fits under 31 and that pegPoints says scores that way).',
      check: moduleCheck(async (v) => pegBlock(v, 3, 5, 'the three chances')),
    },
    {
      text: 'And the rest: leading with a card under 5 (1 or 0), the card\'s value / 10, its hand\'s show / 10, the crib\'s expected value (± CRIB_VALUE of the two it threw) / 10, and ±1 for whose crib. The last three are the same for every card: they let Q predict the show.',
      check: moduleCheck(async (v) => pegBlock(v, 6, 10, 'the last five')),
    },
    {
      text: 'In training, every move the AI can make now has its 15 numbers: run the agent\'s features for each legal move.',
      check: moduleCheck(async (v) => {
        const { r } = await table(v, { training: true, seconds: 0.05 });
        const o = r.node<Node & { legalActions(): number[]; features(a: number): number[] }>('Opponent')!;
        const legal = o.legalActions();
        if (!legal.length) return 'At the deal the AI should have 15 throws to choose from.';
        return legal.every((a) => o.features(a).length === 15) || 'Every move should have 15 features.';
      }),
    },
  ],
  solution: finish(FEATURES_JS),
  done: 'Features turn a situation into numbers that mean the same thing every time. Next: learning a weight for each one.',
};

// ── 10.11: training the AI ────────────────────────────────────────────────

type Run = NonNullable<import('./types').TrainingView['runs']>[number];
const linearRuns = (runs: Run[] | undefined) => (runs ?? []).filter((r) => r.method === 'linear-q' && r.spec.agent === 'Opponent');
const trainTask: GameTask = {
  ...base,
  id: 'crib-train',
  title: 'Training the AI with linear Q-learning',
  goal: 'Train the Opponent\'s brain from nothing against the rules player, read what it learned, and play it.',
  start: cribbageCode({ brain: false }),
  agent: { agent: 'Opponent', maxSteps: 40 },
  steps: [
    {
      text: 'Open Run › Train an agent…. The environment is { "agent": "Opponent" } and the method Features (linear Q). Train with the defaults: 2,000 hands, α from 0.1 to 0.005, ε from 0.2 to 0.02, γ 1. Watch random play\'s line, around −5 points a hand, and the greedy checks climb above it.',
      check: { kind: 'editor', test: (v) => { const good = linearRuns(v.training?.runs).find((r) => r.score > r.random + 3); return !!good || (linearRuns(v.training?.runs).length ? 'Trained, but it did not beat random play by 3 points a hand: train again with the defaults.' : 'Train with Features (linear Q) chosen, and wait for "Trained."'); } },
    },
    {
      text: 'Read WHAT IT LEARNED: one weight per feature. Points now should be strongly positive, the three chances against it negative. Save it as brains/cribbage.json (the Opponent\'s brain field names it).',
      check: { kind: 'editor', test: (v) => (v.training?.saved ?? []).includes('brains/cribbage.json') && v.project.brains?.some((b) => b.path === 'brains/cribbage.json' && b.method === 'linear-q') ? true : 'Press Save as brain with brains/cribbage.json.' },
    },
    {
      text: 'Run the game and play it. The status line no longer says "plays by rules": its brain decides. Press D: for each move it makes, the value of every move it could have made.',
      check: { kind: 'editor', test: (v) => (v.ran && (v.training?.saved ?? []).length > 0) || 'Press ▶ Run.' },
    },
    {
      text: 'An experiment: train again with only 200 hands. Compare its score and its weights with the 2,000-hand brain\'s: which weights has it not learned yet?',
      check: { kind: 'editor', test: (v) => linearRuns(v.training?.runs).some((r) => (r.options?.episodes ?? 0) <= 300) || 'Train once more with episodes set to 200.' },
    },
  ],
  // Every step is done in Run › Train an agent…; "Show me" saves the brain the recipe trains.
  solution: `project.saveBrain('brains/cribbage.json', ${JSON.stringify(CRIBBAGE_BRAIN)})`,
  solvedEditor: { training: { draft: { agent: 'Opponent', maxSteps: 40 }, runs: [
    { method: 'linear-q', spec: { agent: 'Opponent', maxSteps: 40 }, score: 0.2, random: -5.3, options: { episodes: 2000 } },
    { method: 'linear-q', spec: { agent: 'Opponent', maxSteps: 40 }, score: -1.4, random: -5.3, options: { episodes: 200 } },
  ], watched: false, saved: ['brains/cribbage.json'] } },
  done: 'From nothing to the rules player\'s level by playing: the weights say what it learned. Next: difficulty, and how good it really is.',
};

// ── 10.12: difficulty, and judging it ─────────────────────────────────────

const TABLE_DIFFICULTY_STUB = CRIBBAGE_SCRIPTS[TABLE_JS].replace("export const DIFFICULTY = { Easy: 2, Medium: 0.6, Hard: 0 };", "export const DIFFICULTY = { Easy: 0, Medium: 0, Hard: 0 };   // write it: a temperature for each, Easy the highest, Hard 0 (always its best)");
const OPPONENT_WHY_STUB = stubMethod(CRIBBAGE_SCRIPTS[OPPONENT_JS], 'remember(action)', `    const t = this.table, d = t.decision(AI, true);
    this.last = { kind: d.kind, chosen: t.moveName(AI, action), ranked: [], why: [], over: '' };
    if (!ai.has(this.brain)) return;
    // write it:
    // 1. this.last.ranked: every legal move as { a, name: t.moveName(AI, a), q, phi }, its features phi and its value q
    //    (ai.values(this.brain, list of features)), best first.
    // 2. this.last.over: the name of the best move it did not choose. this.last.why: for each feature, its name and
    //    weight × (its value for the chosen move − for that one) (ai.weights(this.brain)); the 4 largest, by size.`);
type Opp = Node & { last: { chosen: string; over: string; ranked: { a: number; name: string; q: number; phi: number[] }[]; why: { name: string; part: number }[] } | null; temperature: number };

const difficultyTask: GameTask = {
  ...base,
  id: 'crib-difficulty',
  title: 'Difficulty, and why the AI chose',
  goal: 'Give the AI three difficulties with one number, show why it chose each move, and measure how much harder Hard is.',
  start: cribbageCode({ scripts: { [TABLE_JS]: TABLE_DIFFICULTY_STUB, [OPPONENT_JS]: OPPONENT_WHY_STUB } }),
  steps: [
    {
      text: 'In scripts/table.js, set DIFFICULTY: the AI\'s temperature at each level. 0 always plays its best move; above 0 it picks by softmax, so a move worth 1 point less is e^(−1/τ) as likely. Use Easy 2, Medium 0.6, Hard 0.',
      check: moduleCheck(async (v) => {
        const d = (await v.module(TABLE_JS)).DIFFICULTY as Record<string, number>;
        return (d && d.Easy > d.Medium && d.Medium > d.Hard && d.Hard === 0) || 'DIFFICULTY should go down from Easy to Medium to Hard, with Hard at 0.';
      }),
    },
    {
      text: 'In scripts/opponent.js, finish remember(action): every legal move\'s features and value from its brain (ai.values), best first, in this.last.ranked. The developer view (D) lists them.',
      check: moduleCheck(async (v) => {
        const { r } = await table(v, { setup: (t) => { t.fast = true; call(t, 'start', 'Hard'); } });
        for (let f = 0; f < 20; f++) r.game.step(1 / 60);
        const last = r.node<Opp>('Opponent')?.last;
        if (!last?.ranked?.length) return 'After the AI\'s first move, this.last.ranked should list every move it could make, with its Q.';
        if (last.ranked.length !== 15) return `At the throw it had 15 moves; ranked has ${last.ranked.length}.`;
        if (!last.ranked.every((m, i) => i === 0 || m.q <= last.ranked[i - 1].q)) return 'ranked should be best first: sort by q, highest first.';
        return last.ranked[0].name === last.chosen || 'On Hard it plays its best move: the first of ranked.';
      }),
    },
    {
      text: 'Then why: this.last.over is the best move it did not choose, and this.last.why the four biggest terms of weight × (feature for its move − feature for that one). They add up to the difference in Q, so they are its reasons.',
      check: moduleCheck(async (v) => {
        const { r } = await table(v, { setup: (t) => { t.fast = true; call(t, 'start', 'Hard'); } });
        for (let f = 0; f < 20; f++) r.game.step(1 / 60);
        const last = r.node<Opp>('Opponent')?.last;
        if (!last?.over) return 'this.last.over should name the best move it did not choose.';
        if (!last.why?.length) return 'this.last.why should list the biggest weight × difference terms.';
        const [top, runner] = [last.ranked.find((m) => m.name === last.chosen)!, last.ranked.find((m) => m.name === last.over)!];
        const sizes = last.why.map((p) => Math.abs(p.part));
        if (!sizes.every((x, i) => i === 0 || x <= sizes[i - 1])) return 'List the reasons biggest first (by size).';
        return Math.abs(last.why.reduce((s, p) => s + p.part, 0)) <= Math.abs(top.q - runner.q) + 1e-6 + sizes.reduce((s, x) => s + x, 0) || 'The parts should be weight × difference in each feature.';
      }),
    },
    {
      text: 'Measure it: the check plays 24 games at Easy and 24 at Hard against the rules player (the practice partner in your seat, autoplay). Hard should win more.',
      check: moduleCheck(async (v) => {
        // Only once the temperatures are set: it plays 48 whole games, a few seconds' work.
        const d = (await v.module(TABLE_JS)).DIFFICULTY as Record<string, number>;
        if (!(d && d.Easy > d.Hard)) return 'Set the temperatures first (step 1).';
        const wins: Record<string, number> = { Easy: 0, Hard: 0 };
        for (const level of ['Easy', 'Hard']) {
          for (let g = 0; g < 24; g++) {
            const { t, r } = await table(v, { seed: 100 + g, setup: (t) => { t.autoplay = true; t.fast = true; t.difficulty = level; } });
            await seededRunAsync(1000 + g, async () => { for (let f = 0; f < 20000 && t.phase !== 'over'; f++) r.game.step(1 / 60); });
            if (t.scores[1] >= 121) wins[level]++;
          }
        }
        return wins.Hard > wins.Easy || `Of 24 games against the rules player, Easy won ${wins.Easy} and Hard ${wins.Hard}: Hard should win more. Check the temperatures.`;
      }),
    },
  ],
  solution: finish(TABLE_JS, OPPONENT_JS),
  done: 'One number, the temperature, turns a learned brain into an easy, medium or hard opponent; the developer view says why it plays as it does. That is the whole game, and its AI.',
};

export const CRIBBAGE: GameTask[] = [tour, cardsTask, svgTask, scoreTask, pegTask, tableTask, screenTask, rulesTask, agentTask, featuresTask, trainTask, difficultyTask];
