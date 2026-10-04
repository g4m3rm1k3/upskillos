// Comparing settings fairly (Run › Train an agent… › Compare): each setting is trained over several seeds, and what
// is reported is the average and the spread, not one lucky or unlucky run. Every setting meets the same seeds, so
// the differences are the settings' (common random numbers).
//
//   curve     the average over seeds of each episode's return, smoothed over the last `window` episodes
//   late      each run's average return over its last `lateEpisodes` episodes: how it does while still learning
//   greedy    each run's kept table (the best of its greedy checks, as Train keeps) played greedily on held-out games:
//             what training would give you
import type { GameEnv } from './env';
import { QLearner, evaluateQ, type QOptions } from './qlearning';

export interface CompareConfig { label: string; options: QOptions }
export interface CompareRun { config: number; seed: number; returns: number[]; greedy: number }

/** Train one setting with one seed to the end, as Train does: its returns per episode, and its greedy score. */
export function runOnce(env: GameEnv, options: QOptions, seed: number): { returns: number[]; greedy: number } {
  const L = new QLearner(env, { checkEvery: 10, ...options, seed });
  const returns: number[] = [];
  for (;;) {
    const t = L.tick();
    if (t.episode) returns.push(t.episode.total);
    if (t.policy) return { returns, greedy: evaluateQ(env, t.policy, 3, 7) };
  }
}

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
/** The sample standard deviation (n − 1), 0 for a single value. */
export const sd = (xs: number[]) => (xs.length < 2 ? 0 : Math.sqrt(xs.reduce((a, x) => a + (x - mean(xs)) ** 2, 0) / (xs.length - 1)));

/** The average over runs of each episode's return, then smoothed: each point the mean of the last `window` episodes. */
export function meanCurve(runs: number[][], window = 10): number[] {
  const n = Math.min(...runs.map((r) => r.length));
  const avg = Array.from({ length: n }, (_, i) => mean(runs.map((r) => r[i])));
  return avg.map((_, i) => mean(avg.slice(Math.max(0, i - window + 1), i + 1)));
}

export interface CompareSummary { label: string; runs: number; late: { mean: number; sd: number }; greedy: { mean: number; sd: number }; curve: number[] }

/** Each setting's runs summarised: its curve, and the mean and spread of its late return and greedy score. */
export function summarise(configs: CompareConfig[], runs: CompareRun[], lateEpisodes = 50, window = 10): CompareSummary[] {
  return configs.map((c, i) => {
    const mine = runs.filter((r) => r.config === i);
    const late = mine.map((r) => mean(r.returns.slice(-lateEpisodes)));
    const greedy = mine.map((r) => r.greedy);
    return { label: c.label, runs: mine.length, late: { mean: mean(late), sd: sd(late) }, greedy: { mean: mean(greedy), sd: sd(greedy) }, curve: mine.length ? meanCurve(mine.map((r) => r.returns), window) : [] };
  });
}
