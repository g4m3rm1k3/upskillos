// Turn-based agents and linear Q (ml/linearq.ts): an agent with legalActions() and features(action) is stepped one
// move at a time, learns weights for its features, and a brain of those weights plays it in the game, at any
// temperature.
import { afterAll, describe, expect, it } from 'vitest';
import { Doc } from '../core/doc';
import { newProject } from '../core/project';
import { Game, scriptGlobals } from '../engine/game';
import { NODE_CLASSES, type Node } from '../engine/nodes';
import { GameEnv } from './env';
import { dataUrlLoader as load } from './testLoader';
import { evaluateMoves, greedyMoves, linearQLearning, randomMoves, type LinearQEpisode } from './linearq';
import { decide, pick, type LinearQPolicy } from './brain';

// Pick a card: the picker holds three cards of 1 to 9 and plays one each turn, scoring its value minus 5. Between its
// turns the dealer takes 3 frames to deal it a new card. Five turns make an episode. Its features: the card's value
// (scaled to 0–1), and 1 (a bias). Playing the highest card is best; the learner should find that the value's weight
// is large and positive.
const PICKER = `export default class Picker extends Node2D {
  actions = ['first', 'second', 'third']
  observations = ['turn']
  featureNames = ['value', 'bias']
  brain = 'brains/picker.json'
  decideEvery = 1
  ready() { this.hand = [1, 2, 3].map(() => 1 + Math.floor(Math.random() * 9)); this.turn = 0; this.wait = 0; this.earned = 0; this.played = [] }
  observe() { return [this.turn] }
  legalActions() { return this.wait > 0 || this.turn >= 5 ? [] : [0, 1, 2] }
  features(a) { return [this.hand[a] / 9, 1] }
  act(a) {
    this.earned += this.hand[a] - 5
    this.played.push(this.hand[a])
    this.hand[a] = 0
    this.turn++
    this.wait = 3
  }
  update() {
    if (this.wait > 0 && --this.wait === 0) this.hand = this.hand.map((v) => v || 1 + Math.floor(Math.random() * 9))
  }
  reward() { const r = this.earned; this.earned = 0; return r }
  done() { return this.turn >= 5 }
}`;
const BUILD = `scene = project.createScene('scenes/main.scene', 'Node2D', 'Main')
project.writeScript('scripts/picker.js', ${JSON.stringify(PICKER)})
scene.add('Node2D', { name: 'Picker', script: 'scripts/picker.js' })`;
const build = () => { const d = new Doc(newProject('Pick')); d.runCode('Build', BUILD); return d; };
afterAll(() => { for (const k of ['input', 'scene', 'time', 'math', 'physics', 'ai', 'Vec2', 'PhysicsBody2D', ...Object.keys(NODE_CLASSES)]) delete (globalThis as Record<string, unknown>)[k]; });

describe('turn-based agents', () => {
  it('step one move at a time: the game plays on to the next turn, and an illegal move is an error', async () => {
    const env = await GameEnv.create(build().project, { agent: 'Picker' }, load);
    expect(env.turnBased).toBe(true);
    expect(env.featureNames).toEqual(['value', 'bias']);
    env.reset(3);
    expect(env.legal()).toEqual([0, 1, 2]);
    const r = env.step(0);
    expect(r.terminated).toBe(false);
    expect(env.legal()).toEqual([0, 1, 2]);   // the dealer's 3 frames went by inside the step
    const g = env.running!.root.find<Node & { wait: number; turn: number }>('Picker')!;
    expect(g.wait).toBe(0); expect(g.turn).toBe(1);
    let last = r;
    for (let k = 0; k < 4; k++) last = env.step(1);
    expect(last.terminated).toBe(true);
    env.reset(3);
    (env.running!.root.find<Node & { wait: number }>('Picker')!).wait = 2;
    expect(() => env.step(0)).toThrow(/not a legal move/);
  });

  it('linear Q learns that a high card is worth playing, and plays better than random', async () => {
    const env = await GameEnv.create(build().project, { agent: 'Picker' }, load);
    const run = linearQLearning(env, { episodes: 300, alpha: 0.05, epsilon: 0.3, epsilonEnd: 0.05, checkEvery: 50, checkEpisodes: 10, seed: 2 });
    const eps: LinearQEpisode[] = [];
    let r = run.next();
    while (!r.done) { eps.push(r.value); r = run.next(); }
    const brain = r.value;
    expect(brain.kind).toBe('linear-q');
    expect(brain.features).toEqual(['value', 'bias']);
    expect(brain.weights[0]).toBeGreaterThan(1);
    expect(eps.filter((e) => e.greedy !== undefined)).toHaveLength(6);
    const random = evaluateMoves(env, randomMoves, 40, 900), learned = evaluateMoves(env, greedyMoves(brain), 40, 900);
    expect(learned).toBeGreaterThan(random + 4);
  });

  it('a brain chooses among the legal moves only, greedily or by temperature', () => {
    const p: LinearQPolicy = { kind: 'linear-q', features: ['value'], weights: [1] };
    const f = (a: number) => [[5], [9], [1], [8]][a];
    expect(decide(p, { observation: [], legal: [0, 2, 3], features: f })).toBe(3);
    expect(decide(p, { observation: [], legal: [0, 1, 2, 3], features: f })).toBe(1);
    // At temperature 1, a move worth 1 less is e⁻¹ as likely: 9 and 8 split about 73 : 27.
    let u = 0;
    const counts = [0, 0];
    for (let k = 0; k < 2000; k++) counts[pick([9, 8], 1, () => ((u = (u + 0.618034) % 1)))]++;
    expect(counts[0] / 2000).toBeCloseTo(Math.E / (Math.E + 1), 1);
  });

  it('the game drives an agent with a brain on its turns only, and scripts can ask a brain for values', async () => {
    const d = build();
    d.saveBrain('brains/picker.json', { actions: ['first', 'second', 'third'], observation: ['turn'], method: 'linear-q', policy: { kind: 'linear-q', features: ['value', 'bias'], weights: [10, 0] }, trained: { steps: 0, score: 0, random: 0 } });
    const project = d.project, classes = await load(project);
    Object.assign(globalThis, NODE_CLASSES);
    const game = new Game(project, project.scenes[0], { frame: () => {} }, { scriptClass: (p) => classes.get(p) as typeof Node });
    Object.assign(globalThis, scriptGlobals(game));
    game.start();
    const picker = game.root.find<Node & { played: number[]; hand: number[]; wait: number }>('Picker')!;
    const hands: number[][] = [];
    for (let f = 0; f < 60; f++) { if (picker.wait === 0 && picker.played.length === hands.length) hands.push([...picker.hand]); game.step(1 / 60); }
    expect(picker.played).toHaveLength(5);
    picker.played.forEach((v, i) => expect(v).toBe(Math.max(...hands[i])));
    expect(game.ai.values('brains/picker.json', [[0.5, 1], [0.2, 1]])).toEqual([5, 2]);
    expect(game.ai.choose('brains/picker.json', [[0.2, 1], [0.5, 1]])).toBe(1);
  });
});
