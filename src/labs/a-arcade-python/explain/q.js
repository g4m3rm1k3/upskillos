// Explanations for the real Q-learning program (Chapters 1–2), file by file.
// FILES[file].about: what the file is for. LINES[file][function]: a note per line, matched in order
// by text the line contains (`has`); '<module>' is the file's top level, a class name its body.
// A note can have: say (what it does and why), tex (its maths), piece (the idea behind it, in
// pieces.js), phase (its part of the agent-environment loop), calc (its arithmetic with this
// step's numbers: calc(v) gets the function's variables as plain values, returns [sum, result]).
// FUNCTIONS['file:function']: purpose, inputs, what it gives back. explain.test.js checks every
// note still matches its line and every line inside a function has one.
const f = x => typeof x !== 'number' ? String(x) : Number.isInteger(x) ? String(x) : Math.abs(x) < 1e-4 && x !== 0 ? x.toExponential(2) : x.toFixed(4)
const s = x => typeof x === 'number' && x < 0 ? `(${f(x)})` : f(x)
const vec = a => `[${a.map(f).join(', ')}]`
const digitize = (value, edges) => edges.filter(e => e <= value).length

export const FILES = {
  'cartpole_table.py': { about: 'Chapter 2: CartPole made into a world with numbered states, so Chapter 1\'s table agent can play it; and train_cartpole, where everything starts.' },
  'train.py': { about: 'Chapter 1: the loop that plays one game (an episode): observe, choose, act, learn, repeat.' },
  'agent.py': { about: 'Chapter 1: the agent. A Q-table plus the two things every agent does: act (choose) and learn.' },
  'qlearning.py': { about: 'Chapter 1: the Q-learning update, built from two small pieces: the target and the nudge.' },
  'qtable.py': { about: 'Chapter 1: the table itself, and choosing the best action in a row of it.' },
  'bins.py': { about: 'Chapter 2: cutting each of CartPole\'s 4 real numbers into slots, and turning 4 slots into one table row.' },
}

export const FUNCTIONS = {
  'cartpole_table.py:train_cartpole': {
    summary: 'Where everything starts: make the world and the agent, then play 500 games.',
    purpose: 'Builds the numbered CartPole and an agent with an empty table, then plays one game after another. Before each game it lowers ε a little, so the agent explores a lot at first and almost never by the end.',
    inputs: [['episodes', 'how many games to play'], ['seed', 'makes the run repeatable'], ['alpha', 'the step size α'], ['alpha_end', 'if given, α shrinks to this by the last game'], ['gamma', 'the discount γ'], ['counts', 'how many slots for each of the 4 numbers']],
    returns: '(agent, env, lengths): the trained agent, the world, and each game\'s length',
    piece: 'program',
  },
  'cartpole_table.py:__init__': {
    summary: 'Build the numbered CartPole: the real Gymnasium world plus its slot edges.',
    purpose: 'Wraps Gymnasium\'s CartPole so that, instead of 4 real numbers, it reports a whole-number state the table can use as a row.',
    inputs: [['self', 'the new TableCartPole'], ['counts', 'slots per number: (1, 1, 6, 12)'], ['limits', 'how far out the slots reach for each number']],
    returns: 'nothing; it fills in self',
    piece: 'state-space',
  },
  'cartpole_table.py:reset': {
    summary: 'Start a game: Gymnasium\'s reset, then the start state as a row number.',
    purpose: 'Gymnasium picks a random start (each number within ±0.05); this turns it into a row.',
    inputs: [['self', 'the TableCartPole'], ['seed', 'makes the start repeatable (first game only)']],
    returns: '(row, info)',
    piece: 'start-state',
  },
  'cartpole_table.py:step': {
    summary: 'The world: one push, Gymnasium\'s physics, and the result as a row number.',
    purpose: 'This is the MDP\'s transition and reward. Gymnasium runs Newton\'s laws for 0.02 s; this method turns the new 4 numbers into a row.',
    inputs: [['self', 'the TableCartPole'], ['action', '0 = push left, 1 = push right']],
    returns: '(row, reward, terminated, truncated, info): the transition',
    piece: 'transition',
  },
  'cartpole_table.py:linear': {
    summary: 'A value that moves in a straight line from start to end as progress goes 0 → 1.',
    purpose: 'Used to lower ε from 1.0 to 0.01 over the first 80% of training.',
    inputs: [['start', 'the value at progress 0'], ['end', 'the value at progress 1 and after'], ['progress', 'how far along: 0 at the start, 1 at the end']],
    returns: 'the value in between',
  },
  'train.py:run_episode': {
    summary: 'Play one game: the agent–environment loop, until the game ends.',
    purpose: 'The MDP being played: observe the state, the agent chooses, the world answers, the agent learns from what happened, move on. Returns the total reward, which in CartPole is the game\'s length.',
    inputs: [['env', 'the world (the numbered CartPole)'], ['agent', 'who plays: anything with act and learn'], ['learn', 'False to watch without learning'], ['seed', 'passed to reset, for a repeatable start']],
    returns: 'total: the game\'s total reward',
    piece: 'loop',
  },
  'train.py:train': {
    summary: 'Play many games (not used by train_cartpole, which has its own loop).',
    purpose: 'Calls run_episode once per game and keeps the totals: a learning curve.',
    inputs: [['env', 'the world'], ['agent', 'the agent'], ['episodes', 'how many games'], ['seed', 'for the first game']],
    returns: 'totals: one total reward per game',
  },
  'agent.py:__init__': {
    summary: 'A new agent: an empty Q-table and its settings.',
    purpose: 'The agent is the table plus everything needed to use it.',
    inputs: [['self', 'the new QAgent'], ['n_states', 'rows: 72'], ['n_actions', 'columns: 2'], ['alpha', 'step size α'], ['gamma', 'discount γ'], ['epsilon', 'exploration probability ε'], ['seed', 'for the agent\'s own random numbers']],
    returns: 'nothing; it fills in self',
    piece: 'q-table',
  },
  'agent.py:act': {
    summary: 'Choose: ε-greedy on this state\'s row.',
    purpose: 'With probability ε a random action (explore); otherwise the best one in the table (exploit).',
    inputs: [['self', 'the agent (its table, ε and random generator)'], ['state', 'the row number of the current state']],
    returns: 'an action: 0 or 1',
    piece: 'epsilon-greedy',
  },
  'agent.py:learn': {
    summary: 'Learn: hand the transition to q_update.',
    purpose: 'Doesn\'t take truncated: a time-out isn\'t an ending, so it\'s learned from like any other step.',
    inputs: [['self', 'the agent'], ['state', 'the row before'], ['action', 'what was done'], ['reward', 'what it paid'], ['next_state', 'the row after'], ['terminated', 'did the game really end?']],
    returns: 'nothing; one entry of self.Q changes',
    piece: 'td-update',
  },
  'qlearning.py:nudge': {
    summary: 'Move an estimate a fraction α of the way towards a target.',
    purpose: 'new = old + α × (target − old). α = 1 jumps to the target; α = 0 never moves; in between, a running average.',
    inputs: [['estimate', 'the old value'], ['target', 'what it should be, by this experience'], ['alpha', 'the fraction to move']],
    returns: 'the new estimate',
    piece: 'learning-rate',
  },
  'qlearning.py:q_target': {
    summary: 'What Q(s, a) should be, by this one experience: the Bellman target.',
    purpose: 'The reward that came, plus γ times the best estimate for where the agent landed. If the game really ended, no future: just the reward.',
    inputs: [['reward', 'what this step paid'], ['next_row', 'the next state\'s row of the table'], ['terminated', 'did the game really end?'], ['gamma', 'the discount']],
    returns: 'the target y',
    piece: 'bellman',
  },
  'qlearning.py:q_update': {
    summary: 'The Q-learning update: one entry of the table moves towards its target.',
    purpose: 'Works out the target, then nudges Q[state, action] towards it. Every other entry stays as it is.',
    inputs: [['Q', 'the table (changed in place)'], ['state', 'the row before'], ['action', 'the column: what was done'], ['reward', 'what it paid'], ['next_state', 'the row after'], ['terminated', 'did it really end?'], ['alpha', 'step size'], ['gamma', 'discount']],
    returns: 'nothing; Q[state, action] changes',
    piece: 'td-update',
  },
  'qtable.py:make_table': {
    summary: 'A table of zeros: one row per state, one column per action.',
    purpose: 'Zeros mean "no idea yet".',
    inputs: [['n_states', 'rows'], ['n_actions', 'columns']],
    returns: 'a NumPy array of zeros, shape (n_states, n_actions)',
    piece: 'q-table',
  },
  'qtable.py:greedy': {
    summary: 'The best action in a row, choosing at random between ties.',
    purpose: 'argmax, but fair: if both actions score the same, either can be picked, so an empty table doesn\'t always push left.',
    inputs: [['row', 'one state\'s row: [Q(s, left), Q(s, right)]'], ['rng', 'the agent\'s random generator']],
    returns: 'the chosen action',
    piece: 'argmax',
  },
  'bins.py:make_edges': {
    summary: 'The cuts that split one number\'s range into equal slots.',
    purpose: 'count slots between −limit and +limit need count − 1 inner cuts. One slot means no cuts at all.',
    inputs: [['count', 'how many slots'], ['limit', 'the range is −limit … +limit']],
    returns: 'the inner edges, as a NumPy array',
    piece: 'discretise',
  },
  'bins.py:bin_index': {
    summary: 'Which slot a number is in: how many edges are at or below it.',
    purpose: 'np.digitize counts the edges at or below the value; that count is the slot number.',
    inputs: [['value', 'one of the 4 numbers'], ['edges', 'its cuts']],
    returns: 'the slot: 0 … len(edges)',
    piece: 'discretise',
  },
  'bins.py:state_index': {
    summary: '4 slots → one row number, like digits with different bases.',
    purpose: 'Each slot is a digit; counts are the bases. With counts (1, 1, 6, 12): row = angle slot × 12 + spin slot.',
    inputs: [['obs', 'the 4 numbers'], ['edges', 'each number\'s cuts'], ['counts', 'each number\'s slot count']],
    returns: 'the row: 0 … 71',
    piece: 'discretise',
  },
}

export const LINES = {
  'cartpole_table.py': {
    __init__: [
      { has: 'self.env = gym.make("CartPole-v1")', say: 'The real Gymnasium CartPole: the same physics, rewards and endings as everywhere CartPole is used.', piece: 'mdp' },
      { has: 'self.counts = counts', say: 'Remember how many slots each of the 4 numbers gets: (1, 1, 6, 12). Position and velocity get one slot each, so they are ignored; angle gets 6, spin 12.' },
      { has: 'self.edges = [make_edges', say: 'For each number, the cuts between its slots. zip pairs each count with its limit.', piece: 'discretise' },
      { has: 'self.n_states = int(np.prod(counts))', say: 'The number of rows: 1 × 1 × 6 × 12 = 72. Every combination of slots is one state.', calc: v => [`1 × 1 × 6 × 12`, 72] },
      { has: 'self.obs = None', say: 'The last real observation, kept so it can be drawn (no game yet).' },
    ],
    reset: [
      { has: 'self.obs, info = self.env.reset(seed=seed)', say: 'Gymnasium starts a game: 4 numbers, each random within ±0.05 (nearly centred, still, upright).', tex: 's_0', piece: 'start-state', phase: 'observe' },
      { has: 'return state_index(self.obs', say: 'Hand back the start as a row number, not 4 real numbers.', piece: 'discretise', phase: 'represent' },
    ],
    step: [
      { has: 'self.obs, reward, terminated, truncated, info = self.env.step(action)', say: 'The real world answers: Gymnasium applies the push for 0.02 s and returns 5 things: the new 4 numbers, the reward (1), whether the pole fell, whether time ran out, and extra info.', tex: '(s_{t+1}, r_{t+1}, \\text{ended?})', piece: 'transition', phase: 'act' },
      { has: 'return state_index(self.obs', say: 'The same 5 things, but with the new state as a row number.', piece: 'discretise', phase: 'represent' },
    ],
    linear: [
      { has: 'return start + (end - start) * min(progress, 1.0)', say: 'Start, plus the distance to the end times how far along we are. min(…, 1.0) stops it going past the end.', tex: 'v = a + (b - a)\\min(p, 1)', calc: v => [`${s(v.start)} + (${s(v.end)} − ${s(v.start)}) × min(${s(v.progress)}, 1)`, v.start + (v.end - v.start) * Math.min(v.progress, 1)] },
    ],
    train_cartpole: [
      { has: 'env = TableCartPole(counts)', say: 'Make the world: the numbered CartPole.', piece: 'mdp' },
      { has: 'agent = QAgent(', say: 'Make the agent: a 72 × 2 table of zeros. ε starts at 1.0: at first every move is random.', piece: 'q-table' },
      { has: 'lengths = []', say: 'A list to keep each game\'s length: the learning curve.' },
      { has: 'for episode in range(episodes):', say: 'One pass per game.' },
      { has: 'agent.epsilon = linear(1.0, 0.01', say: 'Lower ε as training goes on: 1.0 at the first game, down to 0.01 after 80% of the games. Explore a lot early, exploit later.', tex: '\\varepsilon = 1 + (0.01 - 1)\\min\\left(\\tfrac{\\text{episode}}{0.8 \\cdot \\text{episodes}}, 1\\right)', piece: 'epsilon-greedy', calc: v => { const p = v.episode / (0.8 * v.episodes); return [`progress = ${v.episode} / (0.8 × ${v.episodes}) = ${f(p)};  1 + (0.01 − 1) × min(${f(p)}, 1)`, 1 + (0.01 - 1) * Math.min(p, 1)] } },
      { has: 'if alpha_end is not None:', say: 'Only if a final α was given: shrink α too.' },
      { has: 'agent.alpha = linear(', say: 'α moves in a straight line from alpha to alpha_end.' },
      { has: 'lengths.append(run_episode(', say: 'Play one game and keep its length. Only the first game gets the seed: seeding once makes all following games repeatable.', piece: 'loop' },
      { has: 'return agent, env, lengths', say: 'Training is over: hand back the trained agent, the world and the learning curve.' },
    ],
  },
  'train.py': {
    run_episode: [
      { has: 'state, _ = env.reset(seed=seed)', say: 'Observe: a new game starts. state is the row number of the start; _ throws away the info.', tex: 's_0', piece: 'start-state', phase: 'observe' },
      { has: 'total = 0.0', say: 'This game\'s reward so far.', phase: 'observe' },
      { has: 'while True:', say: 'Repeat until a return leaves the function (when the game ends). Each pass is one time step t.', piece: 'loop', phase: 'repeat' },
      { has: 'action = agent.act(state)', say: 'Choose: the agent picks a push for this state.', tex: 'a_t \\sim \\pi(\\cdot \\mid s_t)', piece: 'policy', phase: 'choose' },
      { has: 'next_state, reward, terminated, truncated, _ = env.step(action)', say: 'Act: the world answers with the next state, the reward, and whether the game ended (fell, or ran out of time).', tex: 's_{t+1},\\ r_{t+1}', piece: 'transition', phase: 'act' },
      { has: 'if learn:', say: 'Learning is on unless this game is only being watched.', phase: 'learn' },
      { has: 'agent.learn(state, action, reward, next_state, terminated)', say: 'Learn from this transition (s, a, r, s′, ended?). One table entry will change.', tex: 'Q(s_t, a_t) \\leftarrow \\ldots', piece: 'td-update', phase: 'learn' },
      { has: 'total += reward', say: 'Add this step\'s reward to the game\'s total.', phase: 'repeat', calc: v => [`${f(v.total)} + ${f(v.reward)}`, v.total + v.reward] },
      { has: 'state = next_state', say: 'Move on: the next state becomes the current one. Without this the agent would keep choosing for the state it started in.', tex: 's_t \\leftarrow s_{t+1}', phase: 'repeat' },
      { has: 'if terminated or truncated:', say: 'Did the game end, either way?', piece: 'episode-end', phase: 'repeat', calc: v => [`${v.terminated} or ${v.truncated}`, v.terminated || v.truncated] },
      { has: 'return total', say: 'The game is over: hand back its total reward (its length, since every step pays 1).', phase: 'repeat' },
    ],
    train: [
      { has: 'totals = []', say: 'One total per game.' },
      { has: 'for i in range(episodes):', say: 'One pass per game.' },
      { has: 'totals.append(run_episode(', say: 'Play a game, keep its total.' },
      { has: 'return totals', say: 'The learning curve.' },
    ],
  },
  'agent.py': {
    __init__: [
      { has: 'self.Q = make_table(n_states, n_actions)', say: 'The agent\'s memory: a 72 × 2 table of zeros. Row = state, column = action, value = estimated discounted return.', tex: 'Q \\in \\mathbb{R}^{72 \\times 2}', piece: 'q-table' },
      { has: 'self.alpha = alpha', say: 'Step size α: how far each update moves an entry.', piece: 'learning-rate' },
      { has: 'self.gamma = gamma', say: 'Discount γ: how much a reward one step later counts.', piece: 'discount' },
      { has: 'self.epsilon = epsilon', say: 'ε: how often to try a random action.', piece: 'epsilon-greedy' },
      { has: 'self.rng = np.random.default_rng(seed)', say: 'The agent\'s own random-number generator, seeded so a run can be repeated exactly.' },
    ],
    act: [
      { has: 'if self.rng.random() < self.epsilon:', say: 'Draw a random number in [0, 1). It is below ε with probability ε: explore this time.', tex: 'u < \\varepsilon', piece: 'epsilon-greedy', phase: 'choose' },
      { has: 'return int(self.rng.integers(self.Q.shape[1]))', say: 'Explore: a random action, 0 or 1, whatever the table says. Q.shape[1] is the number of columns (2).', phase: 'choose' },
      { has: 'return greedy(self.Q[state], self.rng)', say: 'Exploit: the best action in this state\'s row.', tex: '\\arg\\max_a Q(s_t, a)', piece: 'argmax', phase: 'choose' },
    ],
    learn: [
      { has: 'q_update(self.Q, state, action, reward, next_state, terminated, self.alpha, self.gamma)', say: 'The update itself, with the agent\'s table, α and γ.', piece: 'td-update', phase: 'learn' },
    ],
  },
  'qlearning.py': {
    nudge: [
      { has: 'return estimate + alpha * (target - estimate)', say: 'Old value plus α times the error (target − old).', tex: 'Q \\leftarrow Q + \\alpha\\,(y - Q)', piece: 'learning-rate', calc: v => [`${s(v.estimate)} + ${s(v.alpha)} × (${s(v.target)} − ${s(v.estimate)})`, v.estimate + v.alpha * (v.target - v.estimate)] },
    ],
    q_target: [
      { has: 'if terminated:', say: 'Did the game really end (the pole fell)?', piece: 'episode-end', calc: v => [`terminated is ${v.terminated}`, v.terminated] },
      { has: 'return reward', say: 'Then there is no future: the target is just the reward.', tex: 'y = r_{t+1}', calc: v => ['the reward', v.reward] },
      { has: 'return reward + gamma * next_row.max()', say: 'Otherwise: the reward, plus γ times the best estimate in the next state\'s row. Bootstrapping: an estimate stands in for the rewards still to come.', tex: 'y = r_{t+1} + \\gamma \\max_{a\'} Q(s_{t+1}, a\')', piece: 'bellman', calc: v => [`${s(v.reward)} + ${s(v.gamma)} × max(${vec(v.next_row)})`, v.reward + v.gamma * Math.max(...v.next_row)] },
    ],
    q_update: [
      { has: 'target = q_target(reward, Q[next_state], terminated, gamma)', say: 'The target for this experience. Q[next_state] is the next state\'s row.', tex: 'y', piece: 'bellman', phase: 'learn' },
      { has: 'Q[state, action] = nudge(Q[state, action], target, alpha)', say: 'Move this one entry a fraction α of the way to the target. Watch it change in the table: every other entry stays as it is.', tex: 'Q(s_t, a_t) \\leftarrow Q(s_t, a_t) + \\alpha\\,(y - Q(s_t, a_t))', piece: 'td-update', phase: 'learn', calc: v => [`Q[${v.state}, ${v.action}] + ${s(v.alpha)} × (${s(v.target)} − Q[${v.state}, ${v.action}]) = ${s(v.Q[v.state][v.action])} + ${s(v.alpha)} × (${s(v.target)} − ${s(v.Q[v.state][v.action])})`, v.Q[v.state][v.action] + v.alpha * (v.target - v.Q[v.state][v.action])] },
    ],
  },
  'qtable.py': {
    make_table: [
      { has: 'return np.zeros((n_states, n_actions))', say: 'An array of zeros with n_states rows and n_actions columns.', piece: 'q-table' },
    ],
    greedy: [
      { has: 'best = np.flatnonzero(row == row.max())', say: 'row == row.max() is True where a value equals the largest; flatnonzero gives those positions. Usually one action; both when they tie.', piece: 'argmax', calc: v => { const m = Math.max(...v.row); return [`positions where ${vec(v.row)} equals ${f(m)}`, v.row.map((x, i) => [x, i]).filter(([x]) => x === m).map(([, i]) => i)] } },
      { has: 'return int(rng.choice(best))', say: 'Pick one of the best at random: a tie is broken fairly.' },
    ],
  },
  'bins.py': {
    make_edges: [
      { has: 'return np.linspace(-limit, limit, count + 1)[1:-1]', say: 'count + 1 equally spaced points from −limit to +limit, then drop the two ends: the inner cuts.', calc: v => { const pts = Array.from({ length: v.count + 1 }, (_, i) => -v.limit + 2 * v.limit * i / v.count); return [`linspace(${s(-v.limit)}, ${f(v.limit)}, ${v.count + 1}) without its ends`, pts.slice(1, -1)] } },
    ],
    bin_index: [
      { has: 'return int(np.digitize(value, edges))', say: 'Count the edges at or below the value: that count is its slot.', tex: 'b = \\#\\{e : e \\le v\\}', piece: 'discretise', calc: v => [`edges ≤ ${f(v.value)} among ${vec(v.edges)}`, digitize(v.value, v.edges)] },
    ],
    state_index: [
      { has: 'index = 0', say: 'Start the row number at 0.' },
      { has: 'for value, value_edges, count in zip(obs, edges, counts):', say: 'For each of the 4 numbers, with its own edges and slot count.' },
      { has: 'index = index * count + bin_index(value, value_edges)', say: 'Like reading digits: multiply what we have by this number\'s slot count, then add its slot.', tex: '\\text{row} \\leftarrow \\text{row}\\cdot c_i + b_i', piece: 'discretise', calc: v => { const b = digitize(v.value, v.value_edges); return [`${v.index} × ${v.count} + slot ${b}`, v.index * v.count + b] } },
      { has: 'return index', say: 'The row number for these 4 numbers.' },
    ],
  },
}

export const VARS = {
  env: 'the world: the numbered CartPole', agent: 'the Q-learning agent', lengths: 'each game\'s length', episode: 'which game', episodes: 'how many games',
  state: 'the current state, as a table row number', next_state: 'the state after the action, as a row number', action: '0 = push left, 1 = push right',
  reward: 'what this step paid (CartPole: 1)', terminated: 'True if the pole fell or the cart left the track', truncated: 'True if 500 steps ran out', total: 'this game\'s reward so far',
  Q: 'the Q-table: 72 rows (states) × 2 columns (left, right)', target: 'the Bellman target y', estimate: 'the value before the nudge', alpha: 'step size α', gamma: 'discount γ', epsilon: 'exploration probability ε',
  row: 'one state\'s row: [Q(s, left), Q(s, right)]', next_row: 'the next state\'s row', best: 'the positions of the largest value', rng: 'a random-number generator',
  obs: 'the 4 real numbers: position, velocity, angle, spin', edges: 'each number\'s cuts', counts: 'slots per number', index: 'the row number being built', value: 'one of the 4 numbers', value_edges: 'that number\'s cuts', count: 'its slot count', limit: 'its range limit',
  start: 'the starting value', end: 'the final value', progress: 'how far along, 0 → 1', self: 'the object this method belongs to', learn: 'whether to learn this game', seed: 'for repeatable randomness', info: 'extra info from Gymnasium', n_states: 'rows', n_actions: 'columns', limits: 'each number\'s range', alpha_end: 'α at the end, if it shrinks',
}
