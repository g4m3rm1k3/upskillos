// What a trained agent does with what it sees: the policy alone, with no training code, so the engine and an
// exported game can use a brain without the trainer (and without the trainer's imports of the engine).
//
//   Q policy:       cut each binned reading into its bin, combine the bins into a state, take the row's best action
//   linear policy:  score each action as weights · observation + bias, take the highest
//   linear Q:       score each legal move by its features, Q(s, a) = w · φ(s, a), take the highest
//
// An agent whose moves change (the cards in its hand) says which are legal now; a brain chooses only among those.
// With a temperature above 0 it does not always take the best: a move is chosen with probability ∝ e^(Q / τ), so a
// move worth 1 less is e^(−1/τ) as likely. That is a difficulty setting: it makes the mistakes a person makes,
// picking a nearly-as-good move, rather than a random one.

/** A table of Q(s, a) over binned states (Q-learning). `visits[s]` counts the updates made from state s. */
export interface QPolicy { kind: 'q'; bins: number[][]; table: number[][]; visits?: number[] }
/** One row of weights per action, the bias last (the cross-entropy method). */
export interface LinearPolicy { weights: number[][] }
/** Linear Q over features of each move (semi-gradient Q-learning, ml/linearq.ts): one weight per feature, by name. */
export interface LinearQPolicy { kind: 'linear-q'; features: string[]; weights: number[] }
export type AgentPolicy = LinearPolicy | QPolicy | LinearQPolicy;

export const isQPolicy = (p: AgentPolicy): p is QPolicy => (p as QPolicy).kind === 'q';
export const isLinearQ = (p: AgentPolicy): p is LinearQPolicy => (p as LinearQPolicy).kind === 'linear-q';

/** w · φ: a move's value under a linear Q brain. */
export function dot(w: number[], phi: number[]): number {
  let s = 0;
  for (let i = 0; i < w.length; i++) s += w[i] * (phi[i] ?? 0);
  return s;
}

/** Which bin a value falls in: how many of the (increasing) cut points are below it. */
export function binOf(value: number, cuts: number[]): number {
  let i = 0;
  while (i < cuts.length && value >= cuts[i]) i++;
  return i;
}

/** How many states the bins make: the product of (cuts + 1) over the binned readings. */
export const stateCount = (bins: number[][]): number => bins.reduce((n, c) => (c.length ? n * (c.length + 1) : n), 1);

/** The state an observation is in: its readings' bins combined, the first reading the most significant. */
export function stateOf(observation: number[], bins: number[][]): number {
  let s = 0;
  bins.forEach((cuts, i) => { if (cuts.length) s = s * (cuts.length + 1) + binOf(observation[i], cuts); });
  return s;
}

/** The greedy action in a state: the first of the highest Q values. */
export function greedy(row: number[]): number {
  let best = 0;
  for (let a = 1; a < row.length; a++) if (row[a] > row[best]) best = a;
  return best;
}

/** The action a Q policy takes for an observation. */
export const actQ = (policy: QPolicy, observation: number[]): number => greedy(policy.table[stateOf(observation, policy.bins)]);

/** The action a linear policy takes for an observation. */
export function actLinear(policy: LinearPolicy, observation: number[]): number {
  let best = 0, bestScore = -Infinity;
  policy.weights.forEach((w, a) => {
    let s = w[w.length - 1];
    for (let i = 0; i < observation.length; i++) s += w[i] * observation[i];
    if (s > bestScore) { bestScore = s; best = a; }
  });
  return best;
}

export function actPolicy(p: AgentPolicy, observation: number[]): number {
  if (isLinearQ(p)) throw new Error('A linear Q brain scores moves by their features: the agent needs features(action) and legalActions()');
  return isQPolicy(p) ? actQ(p, observation) : actLinear(p, observation);
}

/** What an agent offers a brain when it decides: what it sees, and for an agent whose moves change, which are legal and each one's features. */
export interface Situation {
  observation: number[];
  legal?: number[];
  features?: (action: number) => number[];
  /** 0 (or none): the best move. Above 0: a softmax choice, a difficulty setting. */
  temperature?: number;
  random?: () => number;
}

/** A brain's value for each legal move (in the order of `legal`): Q values, or a linear policy's scores. */
export function moveValues(p: AgentPolicy, s: Situation): { legal: number[]; values: number[] } {
  if (isLinearQ(p)) {
    if (!s.features || !s.legal) throw new Error('A linear Q brain scores moves by their features: the agent needs features(action) and legalActions()');
    return { legal: s.legal, values: s.legal.map((a) => dot(p.weights, s.features!(a))) };
  }
  let all: number[];
  if (isQPolicy(p)) all = p.table[stateOf(s.observation, p.bins)];
  else all = p.weights.map((w) => { let v = w[w.length - 1]; for (let i = 0; i < s.observation.length; i++) v += w[i] * s.observation[i]; return v; });
  const legal = s.legal ?? all.map((_, a) => a);
  return { legal, values: legal.map((a) => all[a]) };
}

/** Pick from values: the first best at temperature 0, else a softmax sample. Returns an index into values. */
export function pick(values: number[], temperature = 0, random: () => number = Math.random): number {
  if (!(temperature > 0)) return greedy(values);
  const m = Math.max(...values), e = values.map((v) => Math.exp((v - m) / temperature)), z = e.reduce((a, b) => a + b, 0);
  let u = random() * z, i = 0;
  while (i < e.length - 1 && u >= e[i]) { u -= e[i]; i++; }
  return i;
}

/** The move a brain makes in a situation: among the legal moves only, at the situation's temperature. */
export function decide(p: AgentPolicy, s: Situation): number {
  const { legal, values } = moveValues(p, s);
  if (!legal.length) throw new Error('There is no legal move to choose from');
  return legal[pick(values, s.temperature, s.random)];
}
