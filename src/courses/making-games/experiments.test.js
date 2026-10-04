// Lesson 9.6, "Experiments that mean something": every notebook cell prints what the prose says, and the challenge
// checks itself (the population sd fails it).
import { describe, expect, it } from 'vitest';
import lesson from './9-game-ai-that-learns/006-experiments-that-mean-something.js';

const cells = lesson.intuition.visualizations.find((v) => v.id === 'JSNotebook').props.lesson.cells;
const run = (code) => {
  const out = [];
  const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
  const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
  new Function('console', 'document', code)({ log: (...a) => out.push(a.join(' ')) }, document);
  return out;
};
const squash = (l) => l.replace(/\s+/g, ' ');

describe('lesson 9.6: experiments', () => {
  it('seeds, intervals, the α study, the γ corridor, the picture', () => {
    expect(run(cells[0].startCode)).toEqual(['seeds 1–10: -73.1, -88.5, -92.7, -85.3, -82.5, -80.6, -83.9, -88.3, -77.3, -83.6', 'best -73.1, worst -92.7, mean -83.6, sample sd 5.7']);
    expect(run(cells[1].startCode)).toEqual(['5 seeds: mean -84.4 ± 9.1 (95% interval)', '10 seeds: mean -83.6 ± 4.1 (95% interval)', '20 seeds: mean -81.7 ± 3.3 (95% interval)', '50 seeds: mean -79.3 ± 2.0 (95% interval)']);
    expect(run(cells[2].startCode).map(squash)).toEqual(['α 0.05: -209.7 ± 6.8', 'α 0.1 : -149.9 ± 5.5', 'α 0.3 : -94.1 ± 6.1', 'α 0.5 : -83.6 ± 4.1', 'α 0.9 : -71.2 ± 5.8']);
    expect(run(cells[3].startCode)).toEqual([
      'γ 1: right (+10 later), far exit worth 10.00 now',
      'γ 0.9: right (+10 later), far exit worth 3.87 now',
      'γ 0.8: right (+10 later), far exit worth 1.34 now',
      'γ 0.7: left (+1 now), far exit worth 0.40 now',
      'γ 0.5: left (+1 now), far exit worth 0.02 now',
    ]);
    expect(run(cells[4].startCode)).toEqual(['best α in this study: 0.9 (-71.2)']);
  }, 60000);

  it('the challenge checks itself', () => {
    const challenge = cells.find((c) => c.type === 'challenge');
    expect(run(challenge.solutionCode).at(-1)).toBe('✓ All 3 cases pass: mean ± 95% interval.');
    expect(run(challenge.startCode).at(-1)).toBe('0 of 3 cases pass.');
    const population = run(challenge.startCode.replace('  return { mean: 0, sd: 0, half: 0 }\n', '  const n = xs.length, mean = xs.reduce((a, b) => a + b, 0) / n\n  const sd = Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / n)\n  return { mean, sd, half: t * sd / Math.sqrt(n) }\n'));
    expect(population.filter((l) => l.startsWith('✗')).map((l) => l.slice(0, 8))).toEqual(['✗ case 1', '✗ case 3']);
  });

  it('the Try it card opens experiments', () => {
    expect(lesson.intuition.visualizations.find((v) => v.id === 'GameStudioTask').props).toEqual({ task: 'experiments', lesson: 'mg9-006', checkpoint: 'cp-mg9-006-4' });
  });
});
