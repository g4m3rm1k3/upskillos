// Training an agent: the cross-entropy method (CEM) on a linear policy.
//
// The policy scores each action as a weighted sum of what the agent sees, plus a bias, and takes the
// best: action = argmax over a of (W[a] · observation + W[a][last]). CEM searches for good weights by
// sampling many candidates around a mean, playing an episode with each, keeping the best fraction (the
// elite), and moving the mean and spread to the elite's. It needs no gradients, which suits a game
// whose rules are code, and it works well for a handful of numbers in and a few actions out.
//
// Seeded throughout, so a run can be repeated exactly (and tested).

import { seeded, type GameEnv } from './env';
import { actLinear as act, decide, type AgentPolicy, type LinearPolicy } from './brain';

export { act, type LinearPolicy };

/**
 * Play one episode; its total reward. `choose` picks each action (a policy, or random) from what the agent sees and
 * the moves that are legal now (every action, unless the agent is turn-based).
 */
export function episode(env: GameEnv, choose: (observation: number[], legal: number[]) => number, seed: number): { total: number; steps: number } {
  let { observation } = env.reset(seed), total = 0;
  for (;;) {
    const r = env.step(choose(observation, env.legal()));
    total += r.reward; observation = r.observation;
    if (r.terminated || r.truncated) return { total, steps: r.info.step };
  }
}

/** The average total reward of a policy (or a random one) over several seeded episodes. */
export function evaluate(env: GameEnv, policy: LinearPolicy | 'random', episodes: number, seed: number): number {
  const rand = seeded(seed ^ 0x9e3779b9);
  const choose = policy === 'random' ? (_o: number[], legal: number[]) => legal[Math.floor(rand() * legal.length)] : (o: number[]) => act(policy, o);
  let sum = 0;
  for (let e = 0; e < episodes; e++) sum += episode(env, choose, seed + e).total;
  return sum / episodes;
}

/** The average return of any brain playing greedily among the legal moves (a turn-based agent's included). */
export function evaluatePolicy(env: GameEnv, policy: AgentPolicy, episodes: number, seed: number): number {
  let sum = 0;
  for (let e = 0; e < episodes; e++) sum += episode(env, (o, legal) => decide(policy, { observation: o, legal, features: (a) => env.features(a) }), seed + e).total;
  return sum / episodes;
}

export interface CemOptions {
  generations: number;
  /** Candidates per generation. */
  population?: number;
  /** The fraction kept as the elite. */
  elite?: number;
  /** Episodes per candidate. */
  episodes?: number;
  /** Extra spread added each generation, shrinking to 0, so the search does not collapse too early. */
  noise?: number;
  /** The spread of the first generation's weights. */
  spread?: number;
  seed?: number;
}
export interface Generation { generation: number; best: number; eliteMean: number; mean: LinearPolicy; champion: LinearPolicy }

/** Gaussian samples from a seeded uniform generator (Box–Muller). */
function gaussian(rand: () => number): () => number {
  return () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
}

/** Train, one generation at a time (so a page can draw the learning curve as it goes). */
export function* cem(env: GameEnv, opts: CemOptions): Generator<Generation, LinearPolicy> {
  const A = env.actionCount, D = env.observationSize + 1, n = A * D;
  const pop = opts.population ?? 24, keep = Math.max(2, Math.round(pop * (opts.elite ?? 0.25))), eps = opts.episodes ?? 1;
  const seed = opts.seed ?? 1, rand = seeded(seed), normal = gaussian(rand);
  const shape = (theta: number[]): LinearPolicy => ({ weights: Array.from({ length: A }, (_, a) => theta.slice(a * D, (a + 1) * D)) });
  let mean = new Array(n).fill(0), std = new Array(n).fill(opts.spread ?? 5);
  let champion: number[] | null = null;
  for (let g = 0; g < opts.generations; g++) {
    // Every candidate of a generation plays the same seeds (common random numbers), so they are compared
    // fairly. The best so far plays again among them (elitism), so a lucky find is not lost to the average.
    const thetas = Array.from({ length: pop }, () => mean.map((m, i) => m + std[i] * normal()));
    if (champion) thetas[0] = champion;
    const scored = thetas.map((theta) => ({ theta, score: evaluate(env, shape(theta), eps, seed * 1000 + g * eps) })).sort((a, b) => b.score - a.score);
    champion = scored[0].theta;
    const elite = scored.slice(0, keep);
    const extra = (opts.noise ?? 0.5) * Math.max(0, 1 - g / Math.max(1, opts.generations - 1));
    mean = mean.map((_, i) => elite.reduce((s, e) => s + e.theta[i], 0) / keep);
    std = std.map((_, i) => Math.sqrt(elite.reduce((s, e) => s + (e.theta[i] - mean[i]) ** 2, 0) / keep + extra * extra));
    yield { generation: g + 1, best: scored[0].score, eliteMean: elite.reduce((s, e) => s + e.score, 0) / keep, mean: shape(mean), champion: shape(champion) };
  }
  return shape(champion ?? mean);
}
