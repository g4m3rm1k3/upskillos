// Tweens (engine/tween.ts) and the tween global in the running game.
import { describe, expect, it } from 'vitest';
import { Doc } from '../core/doc';
import { newProject } from '../core/project';
import { Game } from './game';
import { Node2D, Sprite2D } from './nodes';
import { EASES, Tween, mix } from './tween';

function game() {
  const d = new Doc(newProject());
  const s = d.createScene('scenes/main.scene');
  d.addNode(s.id, 'Sprite2D', undefined, { name: 'S' });
  const g = new Game(d.project, d.scene(s.id), { frame: () => undefined });
  g.start();
  return g;
}
const steps = (g: Game, n: number) => { for (let i = 0; i < n; i++) g.step(0.1); };

describe('easing curves', () => {
  it('every curve starts at 0 and ends at 1; outQuad is fast then slow, inQuad the other way', () => {
    for (const [name, e] of Object.entries(EASES)) { expect(e(0), name).toBeCloseTo(0, 9); expect(e(1), name).toBeCloseTo(1, 9); }
    expect(EASES.outQuad(0.5)).toBe(0.75);
    expect(EASES.inQuad(0.5)).toBe(0.25);
    expect(EASES.inOutQuad(0.5)).toBe(0.5);
    expect(Math.max(...[...Array(100).keys()].map((i) => EASES.outBack(i / 100)))).toBeGreaterThan(1.09);   // overshoots ~10%
  });
  it('mix() goes between numbers, points and colours', () => {
    expect(mix(0, 10, 0.25)).toBe(2.5);
    expect(mix({ x: 0, y: 10 }, { x: 10, y: 0 }, 0.5)).toEqual({ x: 5, y: 5 });
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(() => mix(1, '#ffffff', 0.5)).toThrow(/Only numbers/);
  });
});

describe('the tween global', () => {
  it('moves a property to its target over the time, by the curve, then runs then()', () => {
    const g = game(), s = g.root.get<Sprite2D>('S');
    let done = 0;
    g.tween.to(s, { opacity: 0 }, 1, { ease: 'linear', then: () => done++ });
    steps(g, 3); expect(s.opacity).toBeCloseTo(0.7, 9);
    steps(g, 7); expect(s.opacity).toBeCloseTo(0, 9);
    steps(g, 3); expect(done).toBe(1);
  });

  it('position as { x, y }; delay waits; it starts from where the node is when it starts', () => {
    const g = game(), s = g.root.get<Node2D>('S');
    g.tween.to(s, { position: { x: 100, y: 0 } }, 1, { ease: 'linear', delay: 0.5 });
    steps(g, 3); s.position = { x: 50, y: 0 };    // still waiting: this is where it will start
    steps(g, 2);                                   // 0.5 s in: starts now, and runs 0
    steps(g, 5); expect(s.position.x).toBeCloseTo(75, 6);
  });

  it('yoyo goes there and back; repeat −1 runs until stopped; stop() leaves it where it is and skips then()', () => {
    const g = game(), s = g.root.get<Sprite2D>('S');
    g.tween.to(s, { opacity: 0 }, 1, { ease: 'linear', yoyo: true });
    steps(g, 10); expect(s.opacity).toBeCloseTo(0, 9);
    steps(g, 10); expect(s.opacity).toBeCloseTo(1, 9);
    let ran = false;
    const t = g.tween.to(s, { rotation: 1 }, 1, { ease: 'linear', repeat: -1, then: () => { ran = true; } });
    steps(g, 25); expect(s.rotation).toBeCloseTo(0.5, 6);
    t.stop(); steps(g, 5);
    expect(s.rotation).toBeCloseTo(0.5, 6); expect(ran).toBe(false);
  });

  it('a freed node\'s tweens end; a scene change ends them all; stopAll stops a node\'s', () => {
    const g = game(), s = g.root.get<Sprite2D>('S');
    const t = g.tween.to(s, { opacity: 0 }, 1);
    s.queueFree(); steps(g, 2);
    expect(t.finished).toBe(false);   // it was dropped, not finished: it never ran on
    const g2 = game(), s2 = g2.root.get<Sprite2D>('S');
    const a = g2.tween.to(s2, { opacity: 0 }, 1), b = g2.tween.to(s2, { rotation: 1 }, 1);
    g2.tween.stopAll(s2);
    expect(a.finished && b.finished).toBe(true);
  });

  it('says what is wrong', () => {
    const g = game(), s = g.root.get<Sprite2D>('S');
    expect(() => g.tween.to(s, { wobble: 1 }, 1)).toThrow(/has no property "wobble"/);
    expect(() => g.tween.to(s, { opacity: 0 }, 1, { ease: 'wiggly' })).toThrow(/no easing "wiggly"/);
    expect(() => g.tween.to(s, { opacity: 0 }, -1)).toThrow(/0 or more/);
    expect(() => g.tween.to({} as never, { opacity: 0 }, 1)).toThrow(/first argument is a node/);
    void Tween;
  });
});
