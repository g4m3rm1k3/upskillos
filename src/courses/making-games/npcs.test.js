// Lessons 9.9–9.11, "NPCs that learn", "Learn or plan?" and the capstone: every number the prose quotes is what its
// notebook cell prints, every challenge fails as given and passes when solved, and each Try it opens its task.
import { describe, expect, it } from 'vitest';
import npcs from './9-game-ai-that-learns/009-npcs-that-learn.js';
import plan from './9-game-ai-that-learns/010-learn-or-plan.js';
import capstone from './9-game-ai-that-learns/011-capstone-your-own-learning-npc.js';

const cellsOf = (l) => l.intuition.visualizations.find((v) => v.id === 'JSNotebook').props.lesson.cells;
const run = (code) => { const out = []; new Function('console', code)({ log: (...a) => out.push(a.join(' ')) }); return out; };
const out = (l, i) => run(cellsOf(l)[i].startCode);

describe('lessons 9.9–9.11', () => {
  it('9.9: a ghost that learns', () => {
    expect(out(npcs, 0)).toEqual(['at the start [10,5]: up, down', 'after going up, at [10,4]: up (not down, straight back)']);
    expect(out(npcs, 1)).toEqual(['random ghost:      -75.5', 'after 50  hunts:   9.2  (10.8 steps a catch)', 'after 100 hunts:   9.7  (10.3 steps a catch)', 'after 300 hunts:   10.0  (10.0 steps a catch)', 'planning (a breadth-first search, lesson 9.10): 9.4']);
    expect(out(npcs, 2)[1]).toBe('player left, level     prefers left 8.8, up -0.6, down -1.0, right -2.8');
    expect(out(npcs, 3)).toEqual(['one ghost: 10.0 steps a catch; two ghosts sharing its brain: 4.9']);
  }, 60000);

  it('9.10: learn or plan', () => {
    expect(out(plan, 0).at(-1)).toBe('the ghost is 30 steps from the player by the maze, 4 as the crow flies');
    expect(out(plan, 1)).toEqual(['open maze  planning 9.4   learned 10.0   random -75.5', 'trap       planning -27.3   learned -26.1   random -75.1']);
    expect(out(plan, 2).slice(0, 2)).toEqual(['open maze  planning 16.0   learned against the wanderer 16.0   learned against it standing still 16.0', 'trap       planning -10.0   learned against the wanderer -150.0   learned against it standing still -10.0']);
    expect(out(plan, 3)).toEqual(['one plan visits 124 cells; a learned decision reads 4 numbers', '300 hunts of training make 17226 updates; planning needs no training at all']);
  }, 60000);

  it('9.11: the capstone', () => {
    expect(out(capstone, 0)).toEqual(['random dog: home 8 of 200, average return -58.6', 'trained dog: home 200 of 200, average return -3.4']);
    expect(out(capstone, 1).slice(0, 2)).toEqual(['trained on "+10 for the pickup": home 14 of 200', 'trained on "−1 a step, +10 home":  home 200 of 200']);
    expect(out(capstone, 2).map((l) => l.replace(/\s+/g, ' '))).toEqual(['two chasers, one brain: 4.9 steps a catch', 'chaser and ambusher (400 hunts): 10.1 steps a catch', 'chaser and ambusher (1500 hunts): 6.7 steps a catch']);
  }, 60000);

  it('every challenge fails as given and passes when solved', () => {
    for (const l of [npcs, plan, capstone]) {
      const c = cellsOf(l).find((x) => x.type === 'challenge');
      expect(run(c.startCode).at(-1), l.id).not.toMatch(/^✓/);
      expect(run(c.solutionCode).at(-1), l.id).toMatch(/^✓/);
    }
  });

  it('each Try it opens its task', () => {
    const card = (l) => l.intuition.visualizations.find((v) => v.id === 'GameStudioTask').props;
    expect([card(npcs), card(plan), card(capstone)]).toEqual([
      { task: 'ghost-agent', lesson: 'mg9-009', checkpoint: 'cp-mg9-009-4' },
      { task: 'learn-or-plan', lesson: 'mg9-010', checkpoint: 'cp-mg9-010-4' },
      { task: 'second-npc', lesson: 'mg9-011', checkpoint: 'cp-mg9-011-4' },
    ]);
  });
});
