// Chapter 11, "Quest Buddies": every notebook cell prints what its lesson says (the numbers in the prose come from
// these runs), every challenge fails as given and passes when solved, and every Try it card opens its task.
import { describe, expect, it } from 'vitest';
import { taskById } from '../../labs/game-studio/tasks';

const LESSONS = Object.values(import.meta.glob('./11-quest-buddies/*.js', { eager: true, import: 'default' })).sort((a, b) => a.order - b.order);
const cellsOf = (l) => l.intuition.visualizations.find((v) => v.id === 'JSNotebook').props.lesson.cells;
const run = (code) => { const out = []; new Function('console', code)({ log: (...a) => out.push(a.join(' ')) }); return out; };
const outOf = (n, cell) => run(cellsOf(LESSONS[n - 1])[cell].startCode);

describe('chapter 11: Quest Buddies', () => {
  it('has 8 lessons, mg11-001 to mg11-008, each a notebook and a Try it card for a real task', () => {
    expect(LESSONS.map((l) => l.id)).toEqual([...Array(8).keys()].map((k) => `mg11-00${k + 1}`));
    const tasks = LESSONS.map((l) => l.intuition.visualizations.find((v) => v.id === 'GameStudioTask').props);
    expect(tasks.map((t) => t.task)).toEqual(['qb-tour', 'qb-doors', 'qb-state', 'qb-save', 'qb-menus', 'qb-bars', 'qb-talk', 'qb-sounds']);
    tasks.forEach((t, i) => {
      expect(t.lesson).toBe(LESSONS[i].id);
      expect(taskById(t.task), t.task).toBeDefined();
      expect(LESSONS[i].checkpoints.some((c) => c.id === t.checkpoint && c.type === 'lab'), t.checkpoint).toBe(true);
    });
  });

  it('every challenge fails as given and passes when solved', () => {
    for (const l of LESSONS) {
      const c = cellsOf(l).find((x) => x.type === 'challenge');
      expect(run(c.startCode).at(-1), l.id).not.toMatch(/^✓/);
      expect(run(c.solutionCode).at(-1), l.id).toMatch(/^✓/);
    }
  });

  it('11.1–11.4: the quest as events, maps and doors, state, saves', () => {
    expect(outOf(1, 0).at(-1)).toBe('talk to the ranger         → map town   quest done        gold 50 bag []');
    expect(outOf(1, 1)[1]).toMatch(/^pick up the amulet\s+→ nothing happens/);
    expect(outOf(2, 0)).toEqual(['town → cave: forest (at FromTown), cave (at Entrance)  — 2 doors', 'cave → castle: forest (at FromCave), town (at FromForest), castle (at Gate)  — 3 doors', 'castle → forest: no way through']);
    expect(outOf(2, 1)).toEqual(['FromTown   → (32, 88)', 'Campfire   → (160, 132)', 'FromCave   → (56, 96)', 'undefined  → (56, 96)']);
    expect(outOf(2, 2).at(-1)).toBe('end of the frame: switch to scenes/cave.scene');
    expect(outOf(3, 0)).toEqual(['in town, the player node has 10 gold', 'in the forest, the player node has 0 gold', 'with state: in the forest, state.gold is 10']);
    expect(outOf(3, 1)).toEqual(['change a field:     HUD sees 25', 'replace the object: HUD sees 25  (this script sees 99)']);
    expect(outOf(3, 2).at(-1)).toMatch(/^heroNode\s+the node \(cannot even be saved/);
    expect(outOf(4, 0)[1]).toBe('slot1 holds:  {"gold":60,"bag":["Amulet"]}');
    expect(outOf(4, 1)).toContain('map       → {}');
    expect(outOf(4, 1)).toContain('date      → "2026-10-05T00:00:00.000Z"');
    expect(outOf(4, 2)[1]).toBe('migrated:       {"version":3,"map":"scenes/forest.scene","gold":60,"hp":10,"maxHp":10,"bag":[]}');
  });

  it('11.5–11.8: menus, bars and lists, dialogue, sound', () => {
    expect(outOf(5, 0)).toContain('How to play  y = 124');
    expect(outOf(5, 0)).toContain('hidden Continue: How to play  y = 62');
    expect(outOf(5, 1)[1]).toBe('pointer (480, 290) → in the button at (150, 58) not on it');
    expect(outOf(5, 2)).toEqual(['New game  ↓ → Continue', 'Continue  ↓ → Quit', 'Continue  → → Options', 'Options   ↓ → Quit', 'Quit      ↑ → Continue', 'Quit      ↓ → (stays: nothing that way)']);
    expect(outOf(6, 0)[1]).toBe('hp   7 of 10 → fill 140 px');
    expect(outOf(6, 1).at(-1)).toBe('rows made in all: 3');
    expect(outOf(6, 2).at(-1)).toMatch(/wrap 230 → 230 × 38\.4$/);
    expect(outOf(7, 0).slice(-2)).toEqual(['78 letters take 1.95 s', '82 letters take 2.05 s']);
    expect(outOf(7, 2).at(-1)).toBe('choose 2 then 2: You there! Can you help me? / Fifty gold, if you find my amulet. / Then good day.');
    expect(outOf(8, 0)[0]).toBe('one semitone multiplies the frequency by 1.05946');
    expect(outOf(8, 1)[2]).toBe('t = 0.50  linear  550 Hz (1.32 oct)   exponential  440 Hz (1.00 oct)');
    expect(outOf(8, 2)[3]).toBe('triangle   -1.00  -0.50   0.00   0.50   1.00   0.50   0.00  -0.50');
    expect(outOf(8, 3).at(-1)).toBe('samples in the save sound at 22050 a second: 13230 → a .wav of 26504 bytes');
  });

  it('11.8\'s notebook agrees with the engine\'s synthesizer (core/sound.ts)', async () => {
    const { synthesize, SAMPLE_RATE, soundBytes } = await import('../../labs/game-studio/core/sound');
    expect(SAMPLE_RATE).toBe(22050);
    expect(soundBytes({ wave: 'sine', from: 523, to: 1046, length: 0.6, attack: 0.02, volume: 0.45 }).length).toBe(26504);
    // The envelope at 0.3 s, as the notebook prints it (0.517 of 0.45 = 0.233 at most).
    const s = synthesize({ wave: 'square', from: 100, to: 100, length: 0.6, attack: 0.02, volume: 0.45 });
    expect(Math.abs(s[Math.round(0.3 * SAMPLE_RATE)])).toBeCloseTo(0.233, 3);
  });
});
