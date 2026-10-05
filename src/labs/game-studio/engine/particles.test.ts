// Particles2D: bursts, emitting, lifetime, gravity, the world they live in, and repeatable seeds.
import { describe, expect, it } from 'vitest';
import { Doc } from '../core/doc';
import { newProject } from '../core/project';
import type { PropValue } from '../core/types';
import { Game, type DrawItem } from './game';
import type { Particles2D } from './nodes';

function run(props: Record<string, PropValue> = {}) {
  const d = new Doc(newProject());
  const s = d.createScene('scenes/main.scene');
  d.addNode(s.id, 'Particles2D', undefined, { name: 'P', props: { position: { x: 100, y: 100 }, ...props } });
  const frames: DrawItem[][] = [];
  const g = new Game(d.project, d.scene(s.id), { frame: (items) => { frames.push(items); } });
  g.start();
  return { g, p: g.root.get<Particles2D>('P'), frames, steps: (n: number) => { for (let i = 0; i < n; i++) g.step(1 / 60); } };
}

describe('Particles2D', () => {
  it('burst() makes amount particles, drawn as squares that fade; they are gone after their lifetime', () => {
    const { p, frames, steps } = run({ amount: 10, lifetime: 0.5 });
    p.burst(); steps(1);
    expect(p.count).toBe(10);
    const squares = frames.at(-1)!.filter((i) => i.kind === 'rect');
    expect(squares.length).toBe(10);
    expect(squares.every((q) => q.alpha < 1 && q.alpha > 0.9)).toBe(true);
    steps(30);
    expect(p.count).toBe(0);
  });

  it('the same seed makes the same burst, another seed another', () => {
    const where = (seed: number) => { const r = run({ seed }); r.p.burst(); r.steps(10); return JSON.stringify(r.p._particles); };
    expect(where(5)).toBe(where(5));
    expect(where(5)).not.toBe(where(6));
  });

  it('particles stay in the world where they were made: moving the emitter does not move them', () => {
    const { p, steps } = run({ speed: 0, amount: 3 });
    p.burst(); steps(1);
    p.position = { x: 400, y: 100 }; steps(5);
    expect(p._particles.every((q) => q.x === 100 && q.y === 100)).toBe(true);
  });

  it('gravity pulls them down: with no speed, they fall ½ g t²', () => {
    const { p, steps } = run({ speed: 0, gravity: 200, amount: 1, lifetime: 5 });
    p.burst(); steps(60);
    expect(p._particles[0].y).toBeCloseTo(100 + 0.5 * 200 * 1, -1);   // about 200 after 1 s (stepped, so a little more)
  });

  it('emitting makes rate a second', () => {
    const { p, steps } = run({ emitting: true, rate: 30, lifetime: 5 });
    steps(60);
    expect(Math.abs(p.count - 30)).toBeLessThanOrEqual(1);
  });
});
