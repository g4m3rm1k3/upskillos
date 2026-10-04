// Training an agent: tabular Q-learning (Watkins 1989), the method of the ML Lab's lesson 37.4, on a game.
//
// A table can only hold finitely many states, and a game's numbers are continuous, so each reading the agent
// uses is cut into bins: a reading with cut points [c₁ < c₂ < … < cₖ] falls in bin i when i of the cuts are
// below it (0 to k). The state is the combination of every binned reading's bin (mixed radix), so two
// readings of 7 and 2 bins make 14 states. Readings without bins are not part of the state.
//
// For each state s and action a the table holds Q(s, a): the return the agent expects if it takes a in s
// and plays well afterwards. Each step it acts ε-greedily (a random action with probability ε, else the best
// in the table), sees the reward r and the next state s′, and moves Q(s, a) towards r + γ max Q(s′, ·):
//
//   δ = r + γ · max_a′ Q(s′, a′) − Q(s, a)      (the TD error; the max is 0 when the episode has ended)
//   Q(s, a) ← Q(s, a) + α δ
//
// ε falls linearly from `epsilon` to `epsilonEnd` over training, so the agent explores first and exploits
// later. A table learned on binned states is noisy: two tables a few episodes apart can play very differently,
// because one bin hides details that matter. So every `checkEvery` episodes the greedy policy (ε = 0) plays
// fixed seeds without learning, and the best table so far is kept (a checkpoint), as practitioners do.
// Seeded throughout, so a run can be repeated exactly (and tested).

import { seeded, type GameEnv, type Reading } from './env';
import { episode } from './cem';
import { actQ, greedy, stateCount, stateOf, type QPolicy } from './brain';

export { actQ, binOf, greedy, stateCount, stateOf, type QPolicy } from './brain';

/** The cut points of each reading ([] for a reading that is not part of the state). */
export const binsOf = (readings: Reading[]): number[][] => readings.map((r) => r.bins ?? []);

/** The greedy action with ties broken at random (as the ML Lab's Q-learning does): an untried state's row is all
 *  zeros, and always taking the first action there would make the agent's exploration lopsided. Only the legal
 *  actions are considered (every action, unless the agent is turn-based). */
function greedyRandomTies(row: number[], rand: () => number, legal: number[]): number {
  const best = Math.max(...legal.map((a) => row[a])), ties: number[] = [];
  for (const a of legal) if (row[a] === best) ties.push(a);
  return ties[Math.floor(rand() * ties.length)];
}

/** The best legal action in a row (the first of the highest). */
const greedyAmong = (row: number[], legal: number[]): number => legal.reduce((b, a) => (row[a] > row[b] ? a : b), legal[0]);

/**
 * Which update the learner makes (Sutton & Barto ch. 6). All four learn a table Q(s, a) from single steps; they differ
 * in the target for Q(S, A) after the step S, A → R, S′:
 *   q               R + γ max_a′ Q(S′, a′)                       off-policy: the value of acting greedily
 *   sarsa           R + γ Q(S′, A′), A′ the action it then takes on-policy: the value of the exploring policy
 *   expected-sarsa  R + γ Σ_a′ π(a′|S′) Q(S′, a′)                on-policy, without A′'s randomness
 *   double-q        two tables; one picks argmax_a′ at S′, the other values it (no maximization bias)
 */
export type TdAlgorithm = 'q' | 'sarsa' | 'expected-sarsa' | 'double-q';
export const TD_ALGORITHMS: TdAlgorithm[] = ['q', 'sarsa', 'expected-sarsa', 'double-q'];

export interface QOptions {
  episodes: number;
  /** The update (Q-learning unless given). */
  algorithm?: TdAlgorithm;
  /** Step size α: how far each update moves Q(s, a) towards its target. */
  alpha?: number;
  /** Discount γ per step: a reward k steps away is worth γᵏ now. */
  gamma?: number;
  /** How it explores: ε-greedy (a random action with probability ε), or softmax (actions with higher Q more likely, by temperature τ). */
  explore?: 'epsilon' | 'softmax';
  /** How ε (or τ) changes from its start to its end over training: a straight line, a constant ratio per episode, or not at all. */
  schedule?: 'linear' | 'exponential' | 'constant';
  /** Exploration ε at the start and at the last episode. */
  epsilon?: number;
  epsilonEnd?: number;
  /** Softmax temperature τ at the start and at the last episode. */
  temperature?: number;
  temperatureEnd?: number;
  /** Every Q value starts here (0 unless given). Above any return it can earn, it is "optimistic": untried actions look best, so it tries them. */
  initialQ?: number;
  seed?: number;
  /** Every this many episodes, play the greedy policy (no learning) and keep the best table. 0: never. */
  checkEvery?: number;
  /** Episodes the greedy policy plays at each check. */
  checkEpisodes?: number;
}

/** One episode of training: its return, the ε it explored with, how many states have been visited so far, and
 *  (on a check) how the greedy policy scores now and a copy of the table. */
export interface QEpisode { episode: number; total: number; epsilon: number; visited: number; steps: number; greedy?: number; table?: number[][]; visits?: number[] }

/** One update, with every number in it, for a page that steps through learning (Train in view's trace). */
export interface QTransition {
  episode: number; step: number;
  s: number; a: number; r: number; next: number;
  /** The episode ended at S′ (so no future term). */
  terminal: boolean;
  /** SARSA: the action it will take next, whose value is in the target. */
  a2?: number;
  /** Double Q-learning: which table was updated. */
  updated?: 'A' | 'B';
  target: number; delta: number; before: number; after: number;
  /** Q(S′, ·) as it was, the row the target is read from. */
  nextRow: number[];
  /** The exploration ε (or temperature τ) this step used; Expected SARSA: the probabilities π(·|S′) it averaged with. */
  epsilon: number;
  probs?: number[];
}

/** The average return of a Q policy playing greedily on seeded episodes (among the legal actions). */
export function evaluateQ(env: GameEnv, policy: QPolicy, episodes: number, seed: number): number {
  let sum = 0;
  for (let e = 0; e < episodes; e++) sum += episode(env, (o, legal) => (env.turnBased ? greedyAmong(policy.table[stateOf(o, policy.bins)], legal) : actQ(policy, o)), seed + e).total;
  return sum / episodes;
}

/** Train, one episode at a time (so a page can draw the learning curve as it goes). */
export function* qLearning(env: GameEnv, opts: QOptions): Generator<QEpisode, QPolicy> {
  const learner = new QLearner(env, opts);
  for (;;) {
    const t = learner.tick();
    if (t.episode) yield t.episode;
    if (t.policy) return t.policy;
  }
}

/** What the learner is doing on its current step, for a page that shows training as it happens. */
export interface QLive { mode: 'reset' | 'learn' | 'check'; episode: number; episodes: number; epsilon: number; total: number; steps: number; checkGame: number; algorithm: TdAlgorithm; explore: 'epsilon' | 'softmax' }

/** Softmax probabilities of a row at temperature τ (shifted by the max, so large Q values do not overflow). */
export function softmax(row: number[], tau: number): number[] {
  const t = Math.max(tau, 1e-6), m = Math.max(...row), e = row.map((q) => Math.exp((q - m) / t)), z = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / z);
}

/** ε-greedy probabilities of a row: ε/|A| each, plus 1 − ε shared by the best actions (ties split it evenly). */
export function epsilonGreedyProbs(row: number[], epsilon: number): number[] {
  const best = Math.max(...row), ties = row.filter((q) => q === best).length;
  return row.map((q) => epsilon / row.length + (q === best ? (1 - epsilon) / ties : 0));
}

/** A value from its start to its end over training: linearly, by a constant ratio per episode, or not at all. */
export function scheduled(start: number, end: number, k: number, n: number, schedule: 'linear' | 'exponential' | 'constant'): number {
  const f = n > 1 ? k / (n - 1) : 1;
  if (schedule === 'constant') return start;
  if (schedule === 'exponential' && start > 0 && end > 0) return start * (end / start) ** f;
  return start + (end - start) * f;
}

/**
 * Tabular TD control one environment step at a time: Train an agent's worker runs it flat out, and Train in view runs
 * it inside the visible game, a few steps per drawn frame, so you can watch every episode. Both make the same random
 * draws in the same order, so they learn the same table. A tick is a reset, one learning step, or one step of a
 * greedy check game. Q-learning with ε-greedy exploration on a linear schedule is the default.
 */
export class QLearner {
  readonly bins: number[][];
  readonly algorithm: TdAlgorithm;
  readonly explore: 'epsilon' | 'softmax';
  /** The table (Double Q-learning: its first table; the policy uses the average of both). */
  private readonly qa: number[][];
  private readonly qb: number[][] | null;
  private readonly visits: number[];
  private readonly seen = new Set<number>();
  private readonly rand: () => number;
  private readonly A: number;
  private readonly alpha: number; private readonly gamma: number;
  private readonly e0: number; private readonly e1: number;
  private readonly schedule: 'linear' | 'exponential' | 'constant';
  private readonly seed: number; private readonly every: number; private readonly checks: number;
  private best: { score: number; table: number[][]; visits: number[] } | null = null;
  private mode: 'start' | 'learn' | 'checkStart' | 'check' | 'finished' = 'start';
  private ep = 0;
  private s = 0;
  /** SARSA: the action already chosen for the next step. */
  private pending = -1;
  private total = 0;
  private steps = 0;
  private epsilon = 0;
  private checkIndex = 0;
  private checkSum = 0;
  private checkTotal = 0;
  private checkObs: number[] = [];
  /** The actions legal now: every action, unless the agent is turn-based (legalActions()). */
  private legalNow: number[] = [];
  private readonly all: number[];
  private lastEpisode: QEpisode | null = null;

  constructor(private readonly env: GameEnv, private readonly opts: QOptions) {
    this.bins = env.bins;
    if (!this.bins.some((c) => c.length)) throw new Error('Q-learning needs bins on at least one observation reading, to turn the numbers into states');
    this.algorithm = opts.algorithm ?? 'q';
    this.explore = opts.explore ?? 'epsilon';
    this.A = env.actionCount;
    this.all = [...Array(this.A).keys()];
    const q0 = opts.initialQ ?? 0, S = stateCount(this.bins);
    this.qa = Array.from({ length: S }, () => new Array(this.A).fill(q0));
    this.qb = this.algorithm === 'double-q' ? Array.from({ length: S }, () => new Array(this.A).fill(q0)) : null;
    this.visits = new Array(S).fill(0);
    this.alpha = opts.alpha ?? 0.2; this.gamma = opts.gamma ?? 0.97;
    this.e0 = this.explore === 'softmax' ? opts.temperature ?? 1 : opts.epsilon ?? 0.3;
    this.e1 = this.explore === 'softmax' ? opts.temperatureEnd ?? 0.05 : opts.epsilonEnd ?? 0.02;
    this.schedule = opts.schedule ?? 'linear';
    this.seed = opts.seed ?? 1;
    this.rand = seeded(this.seed);
    this.every = opts.checkEvery ?? 10; this.checks = opts.checkEpisodes ?? 2;
  }

  /** The values the policy acts on: the table, or the average of Double Q-learning's two. */
  private row(s: number): number[] {
    return this.qb ? this.qa[s].map((q, a) => (q + this.qb![s][a]) / 2) : this.qa[s];
  }
  private table(): number[][] { return this.qa.map((_, s) => [...this.row(s)]); }

  /** What it is doing now. */
  get live(): QLive {
    const mode = this.mode === 'learn' ? 'learn' : this.mode === 'check' || this.mode === 'checkStart' ? 'check' : 'reset';
    return { mode, episode: Math.min(this.ep + 1, this.opts.episodes), episodes: this.opts.episodes, epsilon: this.epsilon, total: mode === 'check' ? this.checkTotal : this.total, steps: this.steps, checkGame: this.checkIndex + 1, algorithm: this.algorithm, explore: this.explore };
  }

  /** The table as it is now (a copy). */
  snapshot(): QPolicy { return { kind: 'q', bins: this.bins, table: this.table(), visits: [...this.visits] }; }

  /** The legal actions now: a turn-based agent says (legalActions()); otherwise all of them. */
  private legal(): number[] { return this.env.turnBased ? this.env.legal() : this.all; }

  /** The exploring policy's choice in state s, among the legal actions: ε-greedy (ties at random), or a softmax sample. */
  private choose(s: number, legal: number[] = this.all): number {
    const row = this.qb ? this.row(s) : this.qa[s];
    if (this.explore === 'softmax') {
      const p = softmax(legal.map((a) => row[a]), this.epsilon);
      let u = this.rand(), i = 0;
      while (i < p.length - 1 && u >= p[i]) { u -= p[i]; i++; }
      return legal[i];
    }
    return this.rand() < this.epsilon ? legal[Math.floor(this.rand() * legal.length)] : greedyRandomTies(row, this.rand, legal);
  }

  /** The exploring policy's probabilities over every action in a state (0 for illegal ones): Expected SARSA's average. */
  private probs(row: number[], legal: number[] = this.all): number[] {
    const sub = legal.map((a) => row[a]);
    const p = this.explore === 'softmax' ? softmax(sub, this.epsilon) : epsilonGreedyProbs(sub, this.epsilon);
    const out = new Array(row.length).fill(0);
    legal.forEach((a, i) => { out[a] = p[i]; });
    return out;
  }

  /** Advance by one tick. It reports an episode when one finishes (with its check, if one was due), each update's numbers, and the policy at the end. */
  tick(): { episode?: QEpisode; policy?: QPolicy; transition?: QTransition } {
    const { env } = this;
    switch (this.mode) {
      case 'finished':
        return { policy: { kind: 'q', bins: this.bins, table: this.best ? this.best.table : this.table(), visits: this.best ? this.best.visits : this.visits } };
      case 'start': {
        this.epsilon = scheduled(this.e0, this.e1, this.ep, this.opts.episodes, this.schedule);
        this.s = stateOf(env.reset(this.seed * 1000 + this.ep).observation, this.bins);
        this.total = 0; this.steps = 0;
        this.seen.add(this.s);
        this.legalNow = this.legal();
        if (this.algorithm === 'sarsa') this.pending = this.choose(this.s, this.legalNow);
        this.mode = 'learn';
        return {};
      }
      case 'learn': {
        const s = this.s;
        const a = this.algorithm === 'sarsa' ? this.pending : this.choose(s, this.legalNow);
        const r = env.step(a);
        const next = stateOf(r.observation, this.bins);
        // A truncated episode was cut short, not ended: its next state still has a future, so it is bootstrapped.
        const future = !r.terminated;
        // What it may do next (a turn-based agent's next turn): the target only considers those.
        const nextLegal = future ? this.legal() : this.all;
        this.legalNow = nextLegal;
        let table = this.qa, target: number, a2: number | undefined, updated: 'A' | 'B' | undefined, probs: number[] | undefined;
        const nextRow = [...this.row(next)];
        if (this.algorithm === 'q') target = r.reward + (future ? this.gamma * Math.max(...nextLegal.map((b) => this.qa[next][b])) : 0);
        else if (this.algorithm === 'sarsa') {
          // A′ is chosen now, by the same exploring policy, and is the action taken next. A truncated episode still
          // chooses one, to bootstrap from; only a real ending has no future.
          a2 = r.terminated ? undefined : this.choose(next, nextLegal);
          target = r.reward + (a2 !== undefined ? this.gamma * this.qa[next][a2] : 0);
          this.pending = a2 ?? -1;
        } else if (this.algorithm === 'expected-sarsa') {
          const row = this.qa[next], p = this.probs(row, nextLegal);
          probs = p;
          target = r.reward + (future ? this.gamma * row.reduce((sum, q, i) => sum + p[i] * q, 0) : 0);
        } else {
          // Double Q-learning: a fair coin says which table learns; it picks the best next action, the other values it.
          const first = this.rand() < 0.5;
          table = first ? this.qa : this.qb!;
          const other = first ? this.qb! : this.qa;
          updated = first ? 'A' : 'B';
          target = r.reward + (future ? this.gamma * other[next][this.env.turnBased ? greedyAmong(table[next], nextLegal) : greedy(table[next])] : 0);
        }
        const before = table[s][a];
        table[s][a] += this.alpha * (target - table[s][a]);
        this.visits[s]++;
        this.total += r.reward; this.steps++; this.s = next; this.seen.add(next);
        const transition: QTransition = { episode: this.ep + 1, step: this.steps, s, a, r: r.reward, next, terminal: r.terminated, ...(a2 === undefined ? {} : { a2 }), ...(updated ? { updated } : {}), target, delta: target - before, before, after: table[s][a], nextRow, epsilon: this.epsilon, ...(probs ? { probs } : {}) };
        if (!(r.terminated || r.truncated)) return { transition };
        this.lastEpisode = { episode: this.ep + 1, total: this.total, epsilon: this.epsilon, visited: this.seen.size, steps: this.steps };
        if (this.every > 0 && ((this.ep + 1) % this.every === 0 || this.ep + 1 === this.opts.episodes)) {
          this.mode = 'checkStart'; this.checkIndex = 0; this.checkSum = 0;
          return { transition };
        }
        return { ...this.finishEpisode(), transition };
      }
      case 'checkStart':
        // Its own seeds: not the training games, nor the ones a final score is measured on.
        this.checkObs = env.reset(500 + this.checkIndex).observation;
        this.checkTotal = 0;
        this.mode = 'check';
        return {};
      case 'check': {
        const row = this.row(stateOf(this.checkObs, this.bins));
        const r = env.step(this.env.turnBased ? greedyAmong(row, this.legal()) : greedy(row));
        this.checkTotal += r.reward; this.checkObs = r.observation;
        if (!(r.terminated || r.truncated)) return {};
        this.checkSum += this.checkTotal;
        if (++this.checkIndex < this.checks) { this.mode = 'checkStart'; return {}; }
        const greedyScore = this.checkSum / this.checks;
        if (!this.best || greedyScore > this.best.score) this.best = { score: greedyScore, table: this.table(), visits: [...this.visits] };
        this.lastEpisode = { ...this.lastEpisode!, greedy: greedyScore, table: this.table(), visits: [...this.visits] };
        return this.finishEpisode();
      }
    }
  }

  private finishEpisode(): { episode: QEpisode } {
    const episode = this.lastEpisode!;
    this.ep++;
    this.mode = this.ep < this.opts.episodes ? 'start' : 'finished';
    return { episode };
  }
}
