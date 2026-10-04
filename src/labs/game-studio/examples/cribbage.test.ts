// Cribbage (examples/cribbage.ts): the rules against hands whose scores are known, the build, and the game played
// headless by its own scripts.
import { afterAll, describe, expect, it } from 'vitest';
import { Doc } from '../core/doc';
import { newProject } from '../core/project';
import { problems } from '../core/serialize';
import { NODE_CLASSES } from '../engine/nodes';
import { GameEnv } from '../ml/env';
import { dataUrlLoader as load } from '../ml/testLoader';
import { evaluateMoves, randomMoves } from '../ml/linearq';
import { cribbageCode, CRIBBAGE_SPEC } from './cribbage';
// The rules are plain modules: they draw nothing, so they can be imported and tested directly.
import { newDeck, shuffle, value, cardName } from './cribbage/cards.js';
import { scoreHand, pegPoints } from './cribbage/score.js';
import { THROWS, discardFeatures, pegFeatures, FEATURE_NAMES, expectedHand, CRIB_VALUE, cribTable } from './cribbage/features.js';

afterAll(() => { for (const k of ['input', 'scene', 'time', 'math', 'physics', 'ai', 'Vec2', 'PhysicsBody2D', ...Object.keys(NODE_CLASSES)]) delete (globalThis as Record<string, unknown>)[k]; });

/** Cards from text: '5H JD 10S AC'. */
const cards = (text: string) => text.split(' ').map((t) => ({ rank: ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }));
const show = (hand: string, starter: string, crib = false) => scoreHand(cards(hand), cards(starter)[0], crib).total;
const peg = (pile: string) => pegPoints(cards(pile));

describe('the deck', () => {
  it('has 52 different cards, and a shuffle is a reordering of them', () => {
    const d = newDeck();
    expect(new Set(d.map(cardName)).size).toBe(52);
    const s = shuffle(newDeck());
    expect(s.map(cardName).sort()).toEqual(d.map(cardName).sort());
    expect(value(cards('KS')[0])).toBe(10);
    expect(value(cards('AS')[0])).toBe(1);
  });
});

describe('the show', () => {
  it('scores the famous hands', () => {
    expect(show('5H 5C 5S JD', '5D')).toBe(29);     // the best hand there is: the jack of the starter's suit
    expect(show('5H 5C 5S JC', '5D')).toBe(28);     // the same without nobs
    expect(show('4S 4H 5D 6C', '6S')).toBe(24);     // a double double run: four runs of three, two pairs, four fifteens
    expect(show('3S 3H 4D 5C', 'KS')).toBe(12);     // a double run (6), a pair (2), two fifteens (4)
    expect(show('2S 4H 6D 8C', 'KS')).toBe(0);      // all even ranks: no fifteens, no pairs, no runs
  });

  it('counts a flush of four in a hand but not in the crib, five in either, and nobs', () => {
    expect(show('2H 4H 6H 8H', 'KS')).toBe(4);
    expect(show('2H 4H 6H 8H', 'KS', true)).toBe(0);
    expect(show('2H 4H 6H 8H', 'KH', true)).toBe(5);
    expect(show('JH 2C 4S 6D', '8H')).toBe(1);
    expect(show('JH 2C 4S 6D', '8C')).toBe(0);
  });
});

describe('pegging', () => {
  it('scores 15, 31, pairs, three and four of a kind, and runs in any order', () => {
    expect(peg('5H KS').total).toBe(2);
    expect(peg('KS QS JS AH').total).toBe(2);       // 31
    expect(peg('7H 7S').total).toBe(2);
    expect(peg('7H 7S 7D').total).toBe(6);
    expect(peg('2H 2S 2D 2C').total).toBe(12);
    expect(peg('3H 4S 5D').total).toBe(3);
    expect(peg('4S 3H 5D').total).toBe(3);
    expect(peg('3H 5D 4S 6C').total).toBe(4);
    expect(peg('3H 3S 4D 5C').total).toBe(5);       // 3 4 5 is a run of three, and 3+3+4+5 is fifteen
    expect(peg('3H 4S 4D').total).toBe(2);          // a pair; 3 4 4 is not a run
    expect(peg('7H 8S').total).toBe(2);             // 15
  });
});

describe('features', () => {
  it('are one list: a throw fills the discard block, a play the pegging block', () => {
    const hand = cards('5H 5C JD 2S 9C KH');
    const f = discardFeatures(hand, THROWS[0], true);
    expect(f).toHaveLength(FEATURE_NAMES.length);
    expect(f.slice(0, 4)).toEqual([1, expectedHand(hand.slice(2), hand) / 10, CRIB_VALUE[4][4] / 10, 1]);   // a pair of fives, to my crib
    expect(f.slice(4).every((x) => x === 0)).toBe(true);
    const p = pegFeatures(cards('KS')[0], cards('5H'), cards('KS 2C 3D 4H 5H 8S'), 4, false, cards('2C 8S'));
    expect(p.slice(0, 4).every((x) => x === 0)).toBe(true);
    expect(p[5]).toBe(0.5);          // 5 then a king: fifteen, 2 points (/4)
    expect(p[6]).toBeCloseTo(15 / 31);
  });

  it('values a crib by enumerating every crib it could become: the table is what cribTable() computes', () => {
    expect(cribTable()).toEqual(CRIB_VALUE);
    expect(CRIB_VALUE[4][4]).toBeGreaterThan(8.5);                 // a pair of fives is the best throw
    expect(CRIB_VALUE[12][8]).toBeLessThan(3.6);                  // king and nine, the worst
  });
});

describe('the game', () => {
  const build = (brain = false) => { const d = new Doc(newProject('Cribbage')); d.runCode('Build', cribbageCode({ brain })); return d; };

  it('builds: 52 faces, a back and the board as SVG, the scripts, and the scene', () => {
    const d = build();
    expect(problems(d.project)).toEqual([]);
    expect(d.project.assets.filter((a) => a.path.startsWith('assets/cards/')).length).toBe(53);
    expect(d.project.assets.every((a) => a.mime === 'image/svg+xml' && a.svg)).toBe(true);
    expect(d.project.settings.mainScene).toBe('scenes/cribbage.scene');
  });

  it('plays whole hands headless: the AI sees only legal moves, and every hand ends', async () => {
    const env = await GameEnv.create(build().project, CRIBBAGE_SPEC, load);
    expect(env.turnBased).toBe(true);
    expect(env.featureNames).toEqual(FEATURE_NAMES);
    const t0 = performance.now();
    const random = evaluateMoves(env, randomMoves, 40, 1);
    const ms = (performance.now() - t0) / 40;
    console.log(`random AI against the rules player: ${random.toFixed(2)} points a hand; ${ms.toFixed(1)} ms a hand`);
    expect(random).toBeLessThan(0);
  });
});
