import { describe, expect, it } from 'vitest';
import { TRACKS, TRACK_KEYS, trackTitle } from './trackLoader.js';
import { studioSeries, nextSeriesLesson } from './series.js';
import { diffLines } from './lineDiff.js';
import { WALKTHROUGH } from './tracks/dice-start.walkthrough.js';
import { actInPreview, decisionGame, legal, newGame, previewState, transition } from './figures/dicePreviewModel.js';

describe('script-writer entry into C++ games', () => {
  const lessons = TRACKS['dice-path-start'];
  it('opens on the game before setup and does not silently jump into unfinished chapters', () => {
    expect(lessons[0].steps[0].figures[0].name).toBe('dice-start/DiceDuelPreview');
    const series = studioSeries(TRACKS, TRACK_KEYS, trackTitle).find(s => s.key === 'dice-learning');
    expect(series.chapters.map(c => c.key)).toEqual(['dice-path-start']);
    expect(nextSeriesLesson(series, TRACKS, 'dice-path-start', lessons.at(-1).id)).toBeNull();
    expect(series.planned).toContain('Upcoming chapters');
  });
  it('keeps small visible diffs and leaves each programming challenge independent', () => {
    const prior = new Map();
    for (const lesson of lessons) {
      expect(lesson.meta.reference).toBeUndefined();
      expect(lesson.meta.support).toBeUndefined();
      expect(lesson.steps.some(s => s.predictions.length)).toBe(true);
      const challenge = lesson.steps.find(s => s.title.startsWith('Your turn'));
      expect(challenge.target).toBeNull();
      expect(challenge.hints.flat().length).toBeGreaterThanOrEqual(3);
      if (lesson !== lessons[0]) {
        expect(lesson.steps.some(s => s.title.startsWith('Try it'))).toBe(true);
        const fixture = WALKTHROUGH[`${lesson.id.split('/')[1]}#${challenge.title}`];
        expect(fixture.wrong.length).toBeGreaterThanOrEqual(2);
        expect(challenge.checks.filter(c => c.kind === 'run').length).toBeGreaterThanOrEqual(2);
      }
      for (const step of lesson.steps) {
        expect(step.extraTargets ?? []).toEqual([]);
        if (!step.file) continue;
        const added = diffLines(prior.get(step.file) ?? '', step.target).filter(r => r.type === 'add' && r.line.trim());
        expect(added.length, step.title).toBeLessThanOrEqual(18);
        expect(step.provided).not.toBe(true);
        expect(step.checks.length).toBeGreaterThan(0);
        expect(step.prose).not.toContain('```cpp');
        prior.set(step.file, step.target);
      }
    }
  });
});

describe('Dice Duel rule preview', () => {
  it('isolates bank, bust and immediate win without mutating the decision', () => {
    const original = decisionGame();
    expect(transition(original, 'bank')).toEqual({ score: [9, 7], pot: 0, turn: 1, winner: -1 });
    expect(transition(original, 'roll', 1)).toEqual({ score: [4, 7], pot: 0, turn: 1, winner: -1 });
    expect(transition(original, 'roll', 3)).toEqual({ score: [4, 7], pot: 8, turn: 0, winner: 0 });
    expect(original).toEqual(decisionGame());
    expect(legal(newGame(), 'bank')).toBe(false);
    expect(() => transition(newGame(), 'bank')).toThrow();
    expect(() => transition(original, 'roll', 7)).toThrow();
  });
  it('finishes repeatable matches and stops accepting actions after a win', () => {
    for (const policy of ['roll', 'bank']) {
      let state = previewState(newGame());
      for (let i = 0; i < 100 && state.game.winner === -1; i++) {
        const action = policy === 'bank' && legal(state.game, 'bank') ? 'bank' : 'roll';
        state = actInPreview(state, action);
        expect(state.game.turn === 0 || state.game.winner !== -1).toBe(true);
      }
      expect(state.game.winner).not.toBe(-1);
      expect(actInPreview(state, 'roll')).toBe(state);
    }
  });
});
