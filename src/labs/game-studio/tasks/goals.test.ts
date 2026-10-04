// The finished agents a learning task shows first (tasks/goals.ts): what you are building towards, trained ahead of
// time by the recipes below, the same settings Run › Train an agent… would use.
//
//   TRAIN=1 npx vitest run src/labs/game-studio/tasks/goals.test.ts       train them again and check they are the same brains
//   TRAIN=write npx vitest run src/labs/game-studio/tasks/goals.test.ts   … and save them (after changing a game or a recipe)
//
// Training is seeded, so the same recipe on the same game makes the same table. The measurements always run.
import { afterAll, describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { Doc } from '../core/doc';
import { newProject } from '../core/project';
import { NODE_CLASSES } from '../engine/nodes';
import { GameEnv, type EnvSpec } from '../ml/env';
import { dataUrlLoader as load } from '../ml/testLoader';
import { evaluate } from '../ml/cem';
import { evaluateQ, qLearning, type QOptions, type QPolicy } from '../ml/qlearning';
import { breakout } from '../examples/breakout';
import { BREAKOUT_SPEC } from '../ml/breakout';
import { cliffWalk, CLIFF_SPEC } from '../examples/cliffWalk';
import { breakoutLabCode, PADDLE_AGENT, PADDLE_SPEC } from '../examples/breakoutLab';
import { FINISHED, GOAL_RECIPES, GOAL_BRAINS, type GoalName } from './goals';

afterAll(() => { for (const k of ['input', 'scene', 'time', 'math', 'physics', 'ai', 'Vec2', 'PhysicsBody2D', ...Object.keys(NODE_CLASSES)]) delete (globalThis as Record<string, unknown>)[k]; });

/** Each finished agent's game and environment. Imported images are not needed headless. */
const GAMES: Record<GoalName, { code: string; spec: EnvSpec }> = {
  breakout: { code: breakout.code, spec: BREAKOUT_SPEC },
  cliff: { code: cliffWalk.code, spec: CLIFF_SPEC },
  paddle: { code: `${breakoutLabCode()}\nproject.writeScript('scripts/paddle.js', ${JSON.stringify(PADDLE_AGENT)})`, spec: PADDLE_SPEC },
};

async function envFor(name: GoalName): Promise<GameEnv> {
  const d = new Doc(newProject(name));
  // Headless, an image only needs its record (a tileset is cut from its size): the bytes are never drawn.
  for (const path of FINISHED[name].images) d.importAsset(path, { mime: 'image/png', width: 192, height: 176 });
  d.runCode('Build', GAMES[name].code);
  Object.assign(globalThis, NODE_CLASSES);
  return GameEnv.create(d.project, GAMES[name].spec, load);
}

describe.runIf(process.env.TRAIN)('training the finished agents', () => {
  for (const name of Object.keys(GAMES) as GoalName[]) {
    it(`${name}: the recipe makes the saved brain`, async () => {
      const env = await envFor(name);
      const run = qLearning(env, GOAL_RECIPES[name] as QOptions);
      let r = run.next();
      while (!r.done) r = run.next();
      const policy = r.value;
      const brain = { actions: env.actionNames, observation: env.observationNames, method: 'q' as const, policy, trained: { steps: GOAL_RECIPES[name].episodes, score: Math.round(evaluateQ(env, policy, 3, 7) * 1000) / 1000, random: Math.round(evaluate(env, 'random', 3, 7) * 1000) / 1000 } };
      if (process.env.TRAIN === 'write') writeFileSync(new URL(`./goals/${name}.json`, import.meta.url), `${JSON.stringify(brain)}\n`);
      else expect(policy.table).toEqual((GOAL_BRAINS[name].policy as QPolicy).table);
    }, 300000);
  }
});

describe('the finished agents', () => {
  it('play far better than random play', async () => {
    for (const name of Object.keys(GAMES) as GoalName[]) {
      const env = await envFor(name);
      const policy = GOAL_BRAINS[name].policy as QPolicy;
      const score = evaluateQ(env, policy, 3, 7), random = evaluate(env, 'random', 3, 7);
      console.log(`${name}: finished agent ${score.toFixed(1)}, random ${random.toFixed(1)}`);
      expect(score).toBeGreaterThan(random + 10);
    }
  }, 120000);
});
