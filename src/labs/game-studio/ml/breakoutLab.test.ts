// Breakout Lab (examples/breakoutLab.ts), the from-scratch lesson's game: the wall comes from a text map, and the
// paddle written as an agent learns on the real engine. These are the numbers lesson 9.3 quotes.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { Doc } from '../core/doc';
import { newProject } from '../core/project';
import { importOrder, rewriteImports } from '../runtime/scripts';
import { NODE_CLASSES } from '../engine/nodes';
import { breakoutLab, breakoutLabCode, PADDLE_AGENT, PADDLE_SPEC, PYRAMID } from '../examples/breakoutLab';
import { GameEnv, type ClassLoader, type EnvSpec } from './env';
import { runOnce } from './compare';
import { evaluate } from './cem';

const pngSize = (path: string) => { const b = readFileSync(fileURLToPath(new URL(`../starter/${path.replace(/^assets\//, '')}`, import.meta.url))); return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) }; };
const load: ClassLoader = async (project) => {
  Object.assign(globalThis, NODE_CLASSES);
  const classes = new Map<string, unknown>(), urls = new Map<string, string>();
  const { order, imports } = importOrder(project.scripts);
  for (const path of order) {
    const src = rewriteImports(project.scripts.find((x) => x.path === path)!.source, new Map([...imports.get(path)!].map(([spec, target]) => [spec, urls.get(target)!])));
    urls.set(path, `data:text/javascript;base64,${Buffer.from(src).toString('base64')}`);
    classes.set(path, (await import(/* @vite-ignore */ urls.get(path)!)).default);
  }
  return classes;
};
const build = (map?: string[], paddle = PADDLE_AGENT) => { const d = new Doc(newProject('Breakout Lab')); for (const p of breakoutLab.images) d.importAsset(p, { mime: 'image/png', ...pngSize(p) }); d.runCode('Build', breakoutLabCode(map)); d.writeScript('scripts/paddle.js', paddle); return d.project; };
const TRAIN = { episodes: 100, alpha: 0.2, gamma: 0.97, epsilon: 0.3, epsilonEnd: 0.02 };
afterAll(() => { for (const k of ['input', 'scene', 'time', 'math', 'physics', 'ai', 'Vec2', 'PhysicsBody2D', ...Object.keys(NODE_CLASSES)]) delete (globalThis as Record<string, unknown>)[k]; });

describe('Breakout Lab', () => {
  it('the wall is built from the map when the game starts; the paddle as written is an agent with 3 actions', async () => {
    const env = await GameEnv.create(build(PYRAMID), PADDLE_SPEC, load);
    env.reset(1);
    expect((env.running!.root.find('Ball') as unknown as { left: number }).left).toBe(20);
    expect(env.actionNames).toEqual(['left', 'stay', 'right']);
    expect(env.observationNames).toEqual(['ball across', 'ball falling']);
    expect(env.frameSkip).toBe(4);
  });

  it('it learns from scratch: random play loses its balls; trained, it clears the full wall (48)', async () => {
    const env = await GameEnv.create(build(), PADDLE_SPEC, load);
    expect(evaluate(env, 'random', 3, 7)).toBeCloseTo(-5, 6);
    expect(runOnce(env, TRAIN, 2).greedy).toBe(48);
  }, 120000);

  it('a different wall: on the pyramid (20 bricks) it clears it too', async () => {
    const env = await GameEnv.create(build(PYRAMID), PADDLE_SPEC, load);
    expect(runOnce(env, TRAIN, 1).greedy).toBe(20);
  }, 120000);

  it('the wrong numbers: seeing the ball\'s x and the paddle\'s x separately, it learns nothing', async () => {
    const absolute = PADDLE_AGENT.replace('return [(this.ball.position.x - this.position.x) / 480, this.ball.velocity.y > 0 ? 1 : 0];', 'return [this.ball.position.x / 960, this.position.x / 960, this.ball.velocity.y > 0 ? 1 : 0];');
    const spec: EnvSpec = { ...PADDLE_SPEC, bins: [[0.2, 0.4, 0.6, 0.8], [0.2, 0.4, 0.6, 0.8], [0.5]] };
    const env = await GameEnv.create(build(undefined, absolute), spec, load);
    expect(runOnce(env, TRAIN, 1).greedy).toBeLessThan(5);
  }, 120000);
});
