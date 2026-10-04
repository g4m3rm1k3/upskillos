// Chapter 10, "Cribbage": every notebook cell prints what its lesson says (the numbers in the prose come from these
// runs), every challenge fails as given and passes when solved, and every Try it card opens its task.
import { describe, expect, it } from 'vitest';

const LESSONS = Object.values(import.meta.glob('./10-cribbage/*.js', { eager: true, import: 'default' })).sort((a, b) => a.order - b.order);
const cellsOf = (l) => l.intuition.visualizations.find((v) => v.id === 'JSNotebook').props.lesson.cells;
/** Run a cell as the notebook does: its console.log lines (an SVG cell's document is a stand-in). */
const run = (code) => {
  const out = [], real = Math.random;
  const el = () => ({ style: {}, set innerHTML(v) { this.html = v; }, appendChild() {} });
  try { new Function('console', 'document', code)({ log: (...a) => out.push(a.join(' ')) }, { createElement: el, body: el() }); }
  finally { Math.random = real; }
  return out;
};
const lesson = (n) => LESSONS[n - 1];
const outOf = (n, cell) => run(cellsOf(lesson(n))[cell].startCode);

describe('chapter 10: Cribbage', () => {
  it('has 12 lessons, mg10-001 to mg10-012, each a notebook and a Try it card', () => {
    expect(LESSONS.map((l) => l.id)).toEqual([...Array(12).keys()].map((k) => `mg10-0${String(k + 1).padStart(2, '0')}`));
    const tasks = LESSONS.map((l) => l.intuition.visualizations.find((v) => v.id === 'GameStudioTask').props);
    expect(tasks.map((t) => t.task)).toEqual(['crib-tour', 'crib-cards', 'crib-svg', 'crib-score', 'crib-peg', 'crib-table', 'crib-screen', 'crib-rules', 'crib-agent', 'crib-features', 'crib-train', 'crib-difficulty']);
    tasks.forEach((t, i) => expect(t.lesson).toBe(LESSONS[i].id));
  });

  it('every challenge fails as given and passes when solved', () => {
    for (const l of LESSONS) {
      const c = cellsOf(l).find((x) => x.type === 'challenge');
      expect(run(c.startCode).at(-1), l.id).not.toMatch(/^✓/);
      expect(run(c.solutionCode).at(-1), l.id).toMatch(/^✓/);
    }
  }, 60000);

  it('10.1–10.3: the rules, the deck, the pictures', () => {
    expect(outOf(1, 1)).toContain('5H 5C 5S JD + 5D: 29  (fifteen 2, fifteen 4, fifteen 6, fifteen 8, fifteen 10, fifteen 12, fifteen 14, fifteen 16, pair 18, pair 20, pair 22, pair 24, pair 26, pair 28, nobs 29)');
    expect(outOf(1, 2).at(-1)).toBe('AI  plays 5C  count 26  pegs 2 (a pair 2)');
    expect(outOf(2, 2)).toEqual(['Fisher–Yates ABC 9998  ACB 9928  BAC 9973  BCA 10122  CAB 9868  CBA 10111', 'naive        ABC 8894  ACB 11169  BAC 11065  BCA 11144  CAB 8902  CBA 8826']);
    expect(outOf(2, 3).at(-1)).toBe('left in the deck: 40; the starter will be 4D');
    expect(outOf(3, 4).at(-1)).toBe('52 cards, 60580 characters of SVG in all; the 9 of clubs uses 11 <use> elements');
  });

  it('10.4–10.6: scoring, pegging, the table', () => {
    expect(outOf(4, 4)).toEqual(['average 4.79 points a hand', 'most common: 4 points (22.1%), 2 points (21.7%), 6 points (14.0%), 8 points (8.6%), 0 points (7.4%)', 'never seen in 20,000: 19, 25, 26, 27, 28, 29']);
    expect(outOf(5, 3).at(-1)).toBe('pegged: pone 2, dealer 1');
    expect(outOf(5, 4)).toEqual(['pegged per hand: non-dealer 2.17, dealer 3.75']);
    expect(outOf(6, 1)).toEqual(['playing:  cut at frame 36, pegging starts at frame 96', 'training: cut at frame 1, pegging starts at frame 2']);
    expect(outOf(6, 2)).toEqual(['hands per game: 12.6', 'the first dealer wins 53.8% of games', 'games won during pegging 459, during the show 1541, at the cut 0']);
  }, 60000);

  it('10.8–10.10: the rules player, the agent, the features', () => {
    expect(outOf(8, 0).at(-1)).toBe('expected: 572 / 46 = 12.43');
    expect(outOf(8, 3)).toEqual(['rules against random   +4.59 points a hand', 'rules against rules    -0.33 points a hand']);
    expect(outOf(9, 1)[0]).toBe('picking from all 19 at a pegging turn: 88% of picks are illegal');
    expect(outOf(9, 2).at(-1)).toBe('rewards add up to 7; the AI\'s points minus yours this hand: 7');
    expect(outOf(9, 3)).toEqual(['random AI against the rules player: -4.83 points a hand']);
    expect(outOf(10, 2)[0]).toBe('5 5  8.96 points on average, over 58,800 cribs; CRIB_VALUE says 8.96');
  }, 120000);

  it('10.11–10.12: learning, difficulty, why', () => {
    expect(outOf(11, 0)[0]).toMatch(/^K♠ {2}Q = {2}-8\.93/);
    expect(outOf(11, 2).slice(0, 3)).toEqual(['hands 0: -5.22 points a hand against the rules player', 'hands 100: -5.63', 'hands 400: 0.10']);
    expect(outOf(11, 3)).toEqual(['α 0.1 throughout   its last 200 estimates range 2.23 to 7.95', 'α 0.1 → 0.005      its last 200 estimates range 4.76 to 5.27']);
    expect(outOf(12, 1).at(-1)).toBe('  adds up to                    +1.59');
    expect(outOf(12, 2)).toEqual(['Hard    τ 0   +0.21 points a hand against the rules player', 'Medium  τ 0.6 -0.23 points a hand against the rules player', 'Easy    τ 2   -1.95 points a hand against the rules player']);
  }, 120000);
});
