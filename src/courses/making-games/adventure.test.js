// Chapter 12, "Quest Buddies: Adventure": every notebook cell prints what its lesson says (the numbers in the prose
// come from these runs), every challenge fails as given and passes when solved, and every Try it card opens its task.
import { describe, expect, it } from 'vitest';
import { taskById } from '../../labs/game-studio/tasks';
import { rng } from '../../labs/game-studio/engine/random';

const LESSONS = Object.values(import.meta.glob('./12-quest-buddies-adventure/*.js', { eager: true, import: 'default' })).sort((a, b) => a.order - b.order);
const cellsOf = (l) => l.intuition.visualizations.find((v) => v.id === 'JSNotebook').props.lesson.cells;
const run = (code) => { const out = []; new Function('console', code)({ log: (...a) => out.push(a.join(' ')) }); return out; };
const outOf = (n, cell) => run(cellsOf(LESSONS[n - 1])[cell].startCode);

describe('chapter 12: Quest Buddies: Adventure', () => {
  it('has its lessons in order, each a notebook and a Try it card for a real task', () => {
    expect(LESSONS.map((l) => l.id).slice(0, 3)).toEqual(['mg12-001', 'mg12-002', 'mg12-003']);
    const tasks = LESSONS.slice(0, 3).map((l) => l.intuition.visualizations.find((v) => v.id === 'GameStudioTask').props);
    expect(tasks.map((t) => t.task)).toEqual(['qa-classes', 'qa-loot', 'qa-combat']);
    tasks.forEach((t, i) => { expect(t.lesson).toBe(LESSONS[i].id); expect(taskById(t.task), t.task).toBeDefined(); expect(LESSONS[i].checkpoints.some((c) => c.id === t.checkpoint && c.type === 'lab')).toBe(true); });
  });

  it('every challenge fails as given and passes when solved', () => {
    for (const l of LESSONS) {
      const c = cellsOf(l).find((x) => x.type === 'challenge');
      expect(run(c.startCode).at(-1), l.id).not.toMatch(/^✓/);
      expect(run(c.solutionCode).at(-1), l.id).toMatch(/^✓/);
    }
  });

  it('12.1–12.3: classes and curves, loot, combat', () => {
    expect(outOf(1, 0)[2]).toMatch(/^Mage\s+hp {2}8 {2}hits to beat a slime 1/);
    expect(outOf(1, 1)[3]).toBe('level 4 → 5 : needs  34  total so far   82  slimes 21');
    expect(outOf(1, 1).at(-1)).toBe('to reach level 9: growing by half each time 494 , adding 10 each time 360');
    expect(outOf(1, 2)[2]).toBe('level 10: Warrior 41 hp, attack 12   Ranger 28 hp, attack 11   Mage 17 hp, attack 22');
    expect(outOf(2, 0).slice(-3)).toEqual(['roll   75 → potion', 'roll   89 → potion', 'roll   95 → weapon']);
    expect(outOf(2, 2)).toEqual(['nothing  4004 (40.0%)', 'gold     3021 (30.2%)', 'potion   1950 (19.5%)', 'weapon   1025 (10.3%)', 'hero     75 (0.8%)']);
    expect(outOf(3, 0)[3]).toBe('Ranger   Sword      damage 5  per second 12.5  hits for a slime 1  increase 150%');
    expect(outOf(3, 1)[2]).toBe('Mage     8 hp lasts at least 6.4 s of touching (the last hit at 5.6 s)');
    expect(outOf(3, 2).map((l) => l.split(':').at(-1).trim())).toEqual(['hit', 'missed', 'missed', 'missed', 'hit']);
  });

  it('12.2\'s generator is the engine\'s math.rng: the same numbers from the same seed', () => {
    const a = rng(42);
    expect(outOf(2, 1)[0]).toBe(`seed 42: ${[a.next(), a.next(), a.next()].map((x) => x.toFixed(4)).join(' ')}`);
  });
});
