// The Cribbage AI's brain (examples/cribbage/brain.json): how it was trained, and how well it plays.
//
//   TRAIN=1 npx vitest run src/labs/game-studio/examples/cribbage.brain.test.ts           train it again and check it is the same brain
//   TRAIN=write npx vitest run src/labs/game-studio/examples/cribbage.brain.test.ts       … and save it (after changing the game or its features)
//
// Training is seeded, so the same recipe on the same game makes the same weights. It takes about a minute, so it only
// runs when asked; the measurements below always run.
import { afterAll, describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { Doc } from '../core/doc';
import { newProject } from '../core/project';
import { Game, scriptGlobals } from '../engine/game';
import { NODE_CLASSES, type Node } from '../engine/nodes';
import { GameEnv, seeded } from '../ml/env';
import { dataUrlLoader as load } from '../ml/testLoader';
import { evaluateMoves, greedyMoves, linearQLearning, randomMoves, type LinearQOptions, type MoveChooser } from '../ml/linearq';
import { cribbageCode, CRIBBAGE_BRAIN, CRIBBAGE_SPEC } from './cribbage';
import { rulesThrow, rulesPlay } from './cribbage/partner.js';

afterAll(() => { for (const k of ['input', 'scene', 'time', 'math', 'physics', 'ai', 'Vec2', 'PhysicsBody2D', ...Object.keys(NODE_CLASSES)]) delete (globalThis as Record<string, unknown>)[k]; });

/** The recipe: Run › Train an agent… with these settings makes this brain. */
export const CRIBBAGE_RECIPE: LinearQOptions = { episodes: 8000, algorithm: 'q', alpha: 0.1, alphaEnd: 0.005, gamma: 1, epsilon: 0.2, epsilonEnd: 0.02, schedule: 'linear', seed: 1, checkEvery: 250, checkEpisodes: 100 };

const build = (brain: boolean) => { const d = new Doc(newProject('Cribbage')); d.runCode('Build', cribbageCode({ brain })); return d; };
type TableNode = Node & { hands: { rank: number }[][]; dealer: number; pile: unknown[]; scores: number[]; phase: string; autoplay: boolean; fast: boolean; difficulty: string };

describe.runIf(process.env.TRAIN)('training the brain', () => {
  it('the recipe makes the brain in the project', async () => {
    const env = await GameEnv.create(build(false).project, CRIBBAGE_SPEC, load);
    const run = linearQLearning(env, CRIBBAGE_RECIPE);
    let r = run.next();
    while (!r.done) r = run.next();
    // As Train an agent… records it: the hands it trained on, and its average points a hand against random play's.
    const score = evaluateMoves(env, greedyMoves(r.value), 100, 7), random = evaluateMoves(env, randomMoves, 100, 7);
    const brain = { actions: env.actionNames, observation: env.observationNames, method: 'linear-q' as const, policy: r.value, trained: { steps: CRIBBAGE_RECIPE.episodes, score: Math.round(score * 1000) / 1000, random: Math.round(random * 1000) / 1000 } };
    if (process.env.TRAIN === 'write') writeFileSync(new URL('./cribbage/brain.json', import.meta.url), `${JSON.stringify(brain, null, 2)}\n`);
    else expect(brain.policy.weights).toEqual(CRIBBAGE_BRAIN.policy.weights);
  }, 600000);
});

describe('the trained AI', () => {
  it('plays a hand far better than random, and as well as the rules player or better', async () => {
    const env = await GameEnv.create(build(false).project, CRIBBAGE_SPEC, load);
    const rules: MoveChooser = (legal) => {
      const t = env.running!.root as TableNode;
      return legal[0] < 15 ? rulesThrow(t.hands[1], t.dealer === 1) : 15 + rulesPlay(t.hands[1], legal.map((a) => a - 15), t.pile);
    };
    // The same 1000 deals for each, so the differences are the players', not the cards'.
    const n = 1000, seed = 20000;
    const random = evaluateMoves(env, randomMoves, n, seed), byRules = evaluateMoves(env, rules, n, seed), learned = evaluateMoves(env, greedyMoves(CRIBBAGE_BRAIN.policy), n, seed);
    console.log(`points a hand against the rules player: random ${random.toFixed(2)}, rules ${byRules.toFixed(2)}, learned ${learned.toFixed(2)}`);
    expect(learned).toBeGreaterThan(random + 4);
    expect(learned).toBeGreaterThan(byRules - 0.3);
  }, 120000);

  it('wins whole games to 121 against the rules player, more often the harder it is set', async () => {
    const project = build(true).project, classes = await load(project);
    const games = 150, wins: Record<string, number> = {}, real = Math.random;
    Math.random = seeded(7);   // the same shuffles and choices every run
    try { for (const difficulty of ['Easy', 'Medium', 'Hard']) {   // table.js's DIFFICULTY
      wins[difficulty] = 0;
      for (let g = 0; g < games; g++) {
        Object.assign(globalThis, NODE_CLASSES);
        const game = new Game(project, project.scenes[0], { frame: () => {} }, { scriptClass: (p) => classes.get(p) as typeof Node });
        Object.assign(globalThis, scriptGlobals(game));
        const table = game.root as TableNode;
        game.start();
        Object.assign(table, { autoplay: true, fast: true, difficulty });
        for (let f = 0; f < 20000 && table.phase !== 'over'; f++) game.step(1 / 60);
        expect(table.phase).toBe('over');
        if (table.scores[1] >= 121) wins[difficulty]++;
      }
    } } finally { Math.random = real; }
    console.log(`games won against the rules player, of ${games}:`, wins);
    expect(wins.Hard).toBeGreaterThan(wins.Easy);
  }, 300000);
});
