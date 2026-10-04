// Ghost Lab (examples/ghostLab.ts) on the real engine: the ghost as a turn-based agent with legal moves, the
// planner, and the measurements the "Learn or plan?" task quotes.
//
//   MEASURE=1 npx vitest run src/labs/game-studio/examples/ghostLab.test.ts   also trains and measures (about a minute)
import { afterAll, describe, expect, it } from 'vitest';
import { Doc } from '../core/doc';
import { newProject } from '../core/project';
import { NODE_CLASSES, type Node } from '../engine/nodes';
import { GameEnv } from '../ml/env';
import { dataUrlLoader as load } from '../ml/testLoader';
import { episode, evaluate } from '../ml/cem';
import { evaluateQ, qLearning } from '../ml/qlearning';
import { ghostLab, ghostLabCode, GHOST_AGENT, GHOST_SPEC, TRAP } from './ghostLab';
import { MAZE } from './mazeChase';
import { Game, scriptGlobals } from '../engine/game';
import { GOAL_BRAINS } from '../tasks/goals';

afterAll(() => { for (const k of ['input', 'scene', 'time', 'math', 'physics', 'ai', 'Vec2', 'PhysicsBody2D', ...Object.keys(NODE_CLASSES)]) delete (globalThis as Record<string, unknown>)[k]; });

async function envOf(map: string[], still = false): Promise<GameEnv> {
  Object.assign(globalThis, NODE_CLASSES);
  const d = new Doc(newProject('Ghost Lab'));
  for (const path of ghostLab.images) d.importAsset(path, { mime: 'image/png', width: 192, height: 176 });
  d.runCode('Build', ghostLabCode(GHOST_AGENT, map).replace('wanderSpeed = 36;', still ? 'wanderSpeed = 0;' : 'wanderSpeed = 36;'));
  return GameEnv.create(d.project, GHOST_SPEC, load);
}
/** The planning ghost's average return: its own plan() at every turn. */
function planned(env: GameEnv, n = 30): number {
  let t = 0;
  for (let e = 0; e < n; e++) t += episode(env, (_o, legal) => { const g = env.running!.root.find('Ghosts/Ghost') as Node & { plan(): number }; const a = g.plan(); return legal.includes(a) ? a : legal[0]; }, 7 + e).total;
  return t / n;
}
const train = (env: GameEnv) => { const run = qLearning(env, { episodes: 300, alpha: 0.2, gamma: 0.97, epsilon: 0.3, epsilonEnd: 0.02, seed: 3, checkEvery: 10, checkEpisodes: 3 }); let r = run.next(); while (!r.done) r = run.next(); return r.value; };

describe('Ghost Lab', () => {
  it('the ghost is a turn-based agent whose legal moves are the ways at a junction', async () => {
    const env = await envOf(MAZE);
    expect(env.turnBased).toBe(true);
    expect(env.actionNames).toEqual(['up', 'right', 'down', 'left']);
    env.reset(1);
    expect(env.legal()).toEqual([0, 2]);   // up or down from its start
    const r = env.step(0);
    expect(r.reward).toBe(-1);
    expect(env.legal()).toEqual([0]);      // up again: not straight back
  });

  it('plans: random play loses about 72, the planner catches in about 11 steps on the open maze and 56 on the trap', async () => {
    const maze = await envOf(MAZE), trap = await envOf(TRAP);
    expect(evaluate(maze, 'random', 30, 7)).toBeCloseTo(-72.2, 1);
    expect(planned(maze)).toBeCloseTo(9.0, 1);
    expect(planned(trap)).toBeCloseTo(-36.0, 1);
    expect(planned(await envOf(TRAP, true))).toBeCloseTo(-10.0, 1);   // a still player: the shortest path, 30 steps
  }, 120000);

  it('in the game, both ghosts hunt with the one saved brain (and the planner without it)', async () => {
    for (const brain of [true, false]) {
      Object.assign(globalThis, NODE_CLASSES);
      const d = new Doc(newProject('Ghost Lab'));
      for (const path of ghostLab.images) d.importAsset(path, { mime: 'image/png', width: 192, height: 176 });
      d.runCode('Build', ghostLabCode());
      if (brain) d.saveBrain('brains/ghost.json', GOAL_BRAINS.ghost as never);
      const classes = await load(d.project);
      const game = new Game(d.project, d.project.scenes[0], { frame: () => {} }, { scriptClass: (p) => classes.get(p) as typeof Node, onError: (e) => { throw new Error(e.message); } });
      Object.assign(globalThis, scriptGlobals(game));
      game.start();
      const player = game.root.find('Player') as Node & { lives: number };
      const homes = (game.root.find('Ghosts') as Node).children.map((g) => ({ ...(g as unknown as { position: { x: number; y: number } }).position }));
      let moved = [false, false];
      for (let f = 0; f < 60 * 8 && player.lives === 3; f++) {
        game.step(1 / 60);
        (game.root.find('Ghosts') as Node).children.forEach((g, i) => { const p = (g as unknown as { position: { x: number; y: number } }).position; if (p.x !== homes[i].x || p.y !== homes[i].y) moved[i] = true; });
      }
      expect(player.lives, brain ? 'with the brain' : 'planning').toBe(2);   // a player who stands still is caught
      expect(moved[0]).toBe(true);
    }
  }, 120000);

  it.runIf(process.env.MEASURE)('learns: as the Learn or plan? task says', async () => {
    const maze = await envOf(MAZE), trap = await envOf(TRAP), stillTrap = await envOf(TRAP, true);
    expect(evaluateQ(maze, train(maze), 30, 7)).toBeCloseTo(8.5, 1);
    const onTrap = train(trap);
    expect(evaluateQ(trap, onTrap, 30, 7)).toBeCloseTo(-23.7, 1);   // against the wanderer: better than planning's −36.0
    expect(evaluateQ(stillTrap, onTrap, 30, 7)).toBeCloseTo(-22.0, 1);   // the wanderer-trained ghost on a still player: 42 steps
  }, 600000);
});
