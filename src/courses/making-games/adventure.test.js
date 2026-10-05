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
    expect(LESSONS.map((l) => l.id)).toEqual(['mg12-001', 'mg12-002', 'mg12-003', 'mg12-004', 'mg12-005', 'mg12-006']);
    const tasks = LESSONS.map((l) => l.intuition.visualizations.find((v) => v.id === 'GameStudioTask').props);
    expect(tasks.map((t) => t.task)).toEqual(['qa-classes', 'qa-loot', 'qa-combat', 'qa-buddy', 'qa-copy', 'qa-match']);
    expect(LESSONS.map((l) => l.nextLesson)).toEqual(['mg12-002', 'mg12-003', 'mg12-004', 'mg12-005', 'mg12-006', null]);
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

  it('12.4–12.6: the buddy learning, copying, and ratings', () => {
    expect(outOf(4, 0)).toEqual(['after   10 decisions: slime near  follow 0.19  fight 0.60', 'after  100 decisions: slime near  follow 2.74  fight 5.33', 'after  500 decisions: slime near  follow 6.63  fight 7.76', 'after 2000 decisions: slime near  follow 6.68  fight 7.00']);
    expect(outOf(4, 1)).toEqual(['1 sense : earned 536.0 in its last 1,000 decisions; 2 situations', '2 senses: earned 556.0 in its last 1,000 decisions; 4 situations']);
    expect(outOf(4, 2).map((l) => Number(l.split('earned ')[1]))).toEqual([1632, 1685, 1699, 1693]);
    expect(outOf(5, 0).slice(-3)).toEqual(['shown  10 times: copies you 50% of the time', 'shown  50 times: copies you 83% of the time', 'shown 300 times: copies you 97% of the time']);
    expect(outOf(5, 1).at(-1)).toBe('so on its own it would choose: fight');
    expect(outOf(5, 2)).toEqual(['you showed near a slime: follow 2515  fight 264', 'copying would follow 100% of the time; Q-learning values: follow 5.56  fight 5.91']);
    expect(outOf(6, 0)[5]).toBe('rated  200 above the enemy: expected score 0.760');
    expect(outOf(6, 1).map((l) => Number(l.split('rating ')[1].split(' ')[0]))).toEqual([1118, 1125, 1165, 1291, 1190]);
    expect(outOf(6, 2)[3]).toBe('rating 1100 → Red slime    the hero\'s expected score 0.43');
  });

  it('the notebooks agree with the game: 12.4\'s update is buddy.js\'s, 12.6\'s Elo is tiers.js\'s', async () => {
    const { QA_SCRIPTS } = await import('../../labs/game-studio/examples/questAdventure');
    expect(QA_SCRIPTS.buddy).toContain('row[this.last.action] = q + ALPHA * (this.earned + GAMMA * Math.max(...now) - q);');
    expect(QA_SCRIPTS.buddy).toContain('export const ALPHA = 0.2, GAMMA = 0.9;');
    expect(QA_SCRIPTS.tiers).toContain('return 1 / (1 + Math.pow(10, (b - a) / 400));');
    expect(QA_SCRIPTS.buddyCopies).toContain('if (n > 0 && Math.random() < n / (n + 10)) return shown.indexOf(Math.max(...shown));');
  });

  it('12.2\'s generator is the engine\'s math.rng: the same numbers from the same seed', () => {
    const a = rng(42);
    expect(outOf(2, 1)[0]).toBe(`seed 42: ${[a.next(), a.next(), a.next()].map((x) => x.toFixed(4)).join(' ')}`);
  });
});
