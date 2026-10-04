// Training an agent whose moves are described by features: semi-gradient Q-learning with a linear Q (Sutton & Barto
// §10.1), for a turn-based agent with legalActions() and features(action) (ml/env.ts).
//
// A table needs one row per state, and a card game has far too many states (which cards, which count, whose crib).
// Instead each move a is described by numbers φ(s, a), its features (the points it scores now, whether it leaves
// the count on 5, …), and its value is a weighted sum:
//
//   Q(s, a) = w · φ(s, a) = w₁ φ₁ + w₂ φ₂ + … + wₙ φₙ
//
// One weight per feature, learned from play. After each move S, A → R, S′ (S′ is the agent's next turn) the target
// is what the move turned out to be worth, R plus the value of the best move at S′ (Q-learning; SARSA uses the move
// it then takes), and every weight moves in proportion to its feature:
//
//   δ = R + γ max_a′ w · φ(S′, a′) − w · φ(S, A)     (no future term when the episode ended)
//   w ← w + α δ φ(S, A)
//
// That is the table update with "the cell for (S, A)" replaced by "the weights, as much as each feature was
// present": a table is the special case where φ has a single 1 in the column for (S, A). It is called semi-gradient
// because the target also depends on w and is treated as fixed. Moves are chosen ε-greedily among the legal moves
// only. As with the table, every `checkEvery` episodes the greedy policy plays fixed seeds and the best weights are
// kept. Seeded throughout, so a run can be repeated exactly.

import { seeded, type GameEnv } from './env';
import { dot, greedy, type LinearQPolicy } from './brain';
import { scheduled } from './qlearning';

export interface LinearQOptions {
  episodes: number;
  /** 'q' (Q-learning: the best next move) or 'sarsa' (the next move it actually takes). */
  algorithm?: 'q' | 'sarsa';
  /** Step size α. Features near 1 in size want a small one (0.01 to 0.05). */
  alpha?: number;
  /** α at the last episode, reached by the schedule (as ε is): big steps early to learn fast, small ones late to settle. α unless given. */
  alphaEnd?: number;
  /** Discount γ per move (1: a hand's points count the same whenever they come). */
  gamma?: number;
  epsilon?: number;
  epsilonEnd?: number;
  schedule?: 'linear' | 'exponential' | 'constant';
  seed?: number;
  /** Every this many episodes, the greedy policy plays checkEpisodes fixed seeds and the best weights are kept. 0: never. */
  checkEvery?: number;
  checkEpisodes?: number;
  /** Start from these weights (training on, from a saved brain). */
  weights?: number[];
}

/** One episode of training: its return, ε, and on a check the greedy policy's average return and the weights then. */
export interface LinearQEpisode { episode: number; total: number; epsilon: number; steps: number; greedy?: number; weights?: number[] }

/** One update, with every number in it (a trace that steps through learning). */
export interface LinearQTransition {
  episode: number; step: number;
  /** The legal moves at S, the one taken, and its features. */
  legal: number[]; a: number; phi: number[];
  r: number; terminal: boolean;
  /** The values of the legal moves at S′ (empty when the episode ended), and SARSA's next move. */
  nextLegal: number[]; nextValues: number[]; a2?: number;
  before: number; target: number; delta: number; after: number;
  /** Each weight before and after: w ← w + α δ φ. */
  weightsBefore: number[]; weightsAfter: number[];
  epsilon: number; alpha: number;
}

export interface LinearQLive { mode: 'reset' | 'learn' | 'check'; episode: number; episodes: number; epsilon: number; total: number; steps: number }

/** How a policy picks among legal moves: given the legal moves and a way to read each one's features. */
export type MoveChooser = (legal: number[], features: (a: number) => number[], rand: () => number) => number;

/** Random legal moves: the baseline any learner must beat. */
export const randomMoves: MoveChooser = (legal, _f, rand) => legal[Math.floor(rand() * legal.length)];

/** The greedy moves of a linear Q brain. */
export const greedyMoves = (p: LinearQPolicy): MoveChooser => (legal, f) => legal[greedy(legal.map((a) => dot(p.weights, f(a))))];

/** Play one episode of a turn-based agent with a chooser; its return. */
export function playEpisode(env: GameEnv, choose: MoveChooser, seed: number): { total: number; steps: number; errors: string[] } {
  env.reset(seed);
  const rand = seeded(seed + 7919);
  let total = 0, steps = 0;
  for (;;) {
    const legal = env.legal();
    if (!legal.length) return { total, steps, errors: ['no legal move at the start of a turn'] };
    const r = env.step(choose(legal, (a) => env.features(a), rand));
    total += r.reward; steps++;
    if (r.info.errors.length) return { total, steps, errors: r.info.errors };
    if (r.terminated || r.truncated) return { total, steps, errors: [] };
  }
}

/** The average return of a chooser over seeded episodes. */
export function evaluateMoves(env: GameEnv, choose: MoveChooser, episodes: number, seed: number): number {
  let sum = 0;
  for (let e = 0; e < episodes; e++) {
    const r = playEpisode(env, choose, seed + e);
    if (r.errors.length) throw new Error(r.errors[0]);
    sum += r.total;
  }
  return sum / episodes;
}

/** Train, one episode at a time. */
export function* linearQLearning(env: GameEnv, opts: LinearQOptions): Generator<LinearQEpisode, LinearQPolicy> {
  const learner = new LinearQLearner(env, opts);
  for (;;) {
    const t = learner.tick();
    if (t.episode) yield t.episode;
    if (t.policy) return t.policy;
  }
}

/** Semi-gradient Q-learning (or SARSA) with Q(s, a) = w · φ(s, a), one tick at a time (a reset, one move, or one move of a check game). */
export class LinearQLearner {
  readonly features: string[];
  private w: number[];
  private readonly rand: () => number;
  private readonly a0: number; private readonly a1: number; private alpha = 0; private readonly gamma: number;
  private readonly algorithm: 'q' | 'sarsa';
  private readonly e0: number; private readonly e1: number;
  private readonly schedule: 'linear' | 'exponential' | 'constant';
  private readonly seed: number; private readonly every: number; private readonly checks: number;
  private best: { score: number; weights: number[] } | null = null;
  private mode: 'start' | 'learn' | 'checkStart' | 'check' | 'finished' = 'start';
  private ep = 0;
  private legal: number[] = [];
  private phis: number[][] = [];
  /** SARSA: the move already chosen for the next step. */
  private pending = -1;
  private total = 0; private steps = 0; private epsilon = 0;
  private checkIndex = 0; private checkSum = 0; private checkTotal = 0;
  private lastEpisode: LinearQEpisode | null = null;

  constructor(private readonly env: GameEnv, private readonly opts: LinearQOptions) {
    if (!env.turnBased || !env.featureNames.length) throw new Error('Linear Q needs a turn-based agent with legalActions() and features(action)');
    this.features = env.featureNames;
    this.w = opts.weights && opts.weights.length === this.features.length ? [...opts.weights] : new Array(this.features.length).fill(0);
    this.algorithm = opts.algorithm ?? 'q';
    this.a0 = opts.alpha ?? 0.02; this.a1 = opts.alphaEnd ?? this.a0; this.gamma = opts.gamma ?? 1;
    this.e0 = opts.epsilon ?? 0.3; this.e1 = opts.epsilonEnd ?? 0.02;
    this.schedule = opts.schedule ?? 'linear';
    this.seed = opts.seed ?? 1;
    this.rand = seeded(this.seed);
    this.every = opts.checkEvery ?? 50; this.checks = opts.checkEpisodes ?? 20;
  }

  get weights(): number[] { return [...this.w]; }
  get live(): LinearQLive {
    const mode = this.mode === 'learn' ? 'learn' : this.mode === 'check' || this.mode === 'checkStart' ? 'check' : 'reset';
    return { mode, episode: Math.min(this.ep + 1, this.opts.episodes), episodes: this.opts.episodes, epsilon: this.epsilon, total: mode === 'check' ? this.checkTotal : this.total, steps: this.steps };
  }
  snapshot(): LinearQPolicy { return { kind: 'linear-q', features: this.features, weights: [...this.w] }; }

  /** Read the legal moves and their features at the agent's turn. */
  private look(): void {
    this.legal = this.env.legal();
    this.phis = this.legal.map((a) => this.env.features(a));
  }

  /** ε-greedy among the legal moves (ties at random): an index into this.legal. */
  private choose(): number {
    if (this.rand() < this.epsilon) return Math.floor(this.rand() * this.legal.length);
    const v = this.phis.map((phi) => dot(this.w, phi)), best = Math.max(...v), ties: number[] = [];
    v.forEach((x, i) => { if (x === best) ties.push(i); });
    return ties[Math.floor(this.rand() * ties.length)];
  }

  tick(): { episode?: LinearQEpisode; policy?: LinearQPolicy; transition?: LinearQTransition } {
    const { env } = this;
    switch (this.mode) {
      case 'finished':
        return { policy: { kind: 'linear-q', features: this.features, weights: this.best ? [...this.best.weights] : [...this.w] } };
      case 'start': {
        this.epsilon = scheduled(this.e0, this.e1, this.ep, this.opts.episodes, this.schedule);
        this.alpha = scheduled(this.a0, this.a1, this.ep, this.opts.episodes, this.schedule === 'constant' ? 'constant' : 'exponential');
        env.reset(this.seed * 1000 + this.ep);
        this.total = 0; this.steps = 0;
        this.look();
        if (!this.legal.length) throw new Error(`${env.spec.agent} has no legal move at the start of an episode`);
        if (this.algorithm === 'sarsa') this.pending = this.choose();
        this.mode = 'learn';
        return {};
      }
      case 'learn': {
        const i = this.algorithm === 'sarsa' ? this.pending : this.choose();
        const legal = this.legal, a = legal[i], phi = this.phis[i];
        const r = env.step(a);
        if (r.info.errors.length) throw new Error(r.info.errors[0]);
        let nextValues: number[] = [], future = 0, a2: number | undefined;
        if (!r.terminated) {
          this.look();
          if (!this.legal.length) throw new Error(`${env.spec.agent} has no legal move, but its episode has not ended`);
          nextValues = this.phis.map((p) => dot(this.w, p));
          if (this.algorithm === 'sarsa') { this.pending = this.choose(); a2 = this.legal[this.pending]; future = nextValues[this.pending]; }
          else future = Math.max(...nextValues);
        }
        const before = dot(this.w, phi), target = r.reward + this.gamma * future, delta = target - before;
        const weightsBefore = [...this.w];
        for (let k = 0; k < this.w.length; k++) this.w[k] += this.alpha * delta * phi[k];
        this.total += r.reward; this.steps++;
        const transition: LinearQTransition = { episode: this.ep + 1, step: this.steps, legal, a, phi, r: r.reward, terminal: r.terminated, nextLegal: r.terminated ? [] : [...this.legal], nextValues, ...(a2 === undefined ? {} : { a2 }), before, target, delta, after: dot(this.w, phi), weightsBefore, weightsAfter: [...this.w], epsilon: this.epsilon, alpha: this.alpha };
        if (!(r.terminated || r.truncated)) return { transition };
        this.lastEpisode = { episode: this.ep + 1, total: this.total, epsilon: this.epsilon, steps: this.steps };
        if (this.every > 0 && ((this.ep + 1) % this.every === 0 || this.ep + 1 === this.opts.episodes)) {
          this.mode = 'checkStart'; this.checkIndex = 0; this.checkSum = 0;
          return { transition };
        }
        return { ...this.finishEpisode(), transition };
      }
      case 'checkStart':
        env.reset(500 + this.checkIndex);
        this.checkTotal = 0;
        this.look();
        this.mode = 'check';
        return {};
      case 'check': {
        const v = this.phis.map((p) => dot(this.w, p));
        const r = env.step(this.legal[greedy(v)]);
        if (r.info.errors.length) throw new Error(r.info.errors[0]);
        this.checkTotal += r.reward;
        if (!(r.terminated || r.truncated)) { this.look(); return {}; }
        this.checkSum += this.checkTotal;
        if (++this.checkIndex < this.checks) { this.mode = 'checkStart'; return {}; }
        const score = this.checkSum / this.checks;
        if (!this.best || score > this.best.score) this.best = { score, weights: [...this.w] };
        this.lastEpisode = { ...this.lastEpisode!, greedy: score, weights: [...this.w] };
        return this.finishEpisode();
      }
    }
  }

  private finishEpisode(): { episode: LinearQEpisode } {
    const episode = this.lastEpisode!;
    this.ep++;
    this.mode = this.ep < this.opts.episodes ? 'start' : 'finished';
    return { episode };
  }
}
