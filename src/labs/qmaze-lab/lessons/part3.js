// Part 3: learning from experience. Averages, TD learning, the Q-table, exploration, Q-learning,
// training and judging, SARSA, the cliff, slippery ice, reward design. Every predicted number is
// computed by the engine, which reproduces the Python programs exactly (parity.test.js).
import { GridWorld } from '../engine/gridworld.js'
import { qLearning, sarsa, finish, linear } from '../engine/tabular.js'
import { runningMean, constantStep } from '../engine/td.js'
import { evaluateGreedy } from '../engine/evaluate.js'

// The first updates of Q-learning on the corridor (seed 0), as the lesson works them by hand.
function corridorUpdates() {
  const out = [], g = qLearning(new GridWorld('corridor'), { episodes: 3, seed: 0 })
  for (let s = g.next(); !s.done; s = g.next()) if (s.value.updated !== s.value.old) out.push({ ...s.value, Q: undefined })
  return out
}
const cliffGreedy = alg => evaluateGreedy('cliff', finish((alg === 'q' ? qLearning : sarsa)(new GridWorld('cliff'), { episodes: 500, alpha: 0.5, gamma: 1, epsilonStart: 0.1, epsilonEnd: 0.1, seed: 0 })).Q, { episodes: 1 }).mean

export const PART3 = {
  id: 'part3', title: 'Part 3 · Learning from experience', lessons: [
    {
      id: 'averages', number: '3.1', title: 'Learning an average one sample at a time',
      goal: 'Update an average with each new sample, $\\bar x \\leftarrow \\bar x + \\tfrac1n(x - \\bar x)$, and explain what a constant step size α does instead.',
      builds: ['value-iteration'],
      blocks: [
        { md: `Part 2 ended with a problem. Value iteration computes the best values exactly, but it needs \`P\`, and a real agent doesn't have it. It only gets to **try** moves and see what happens.

The way out is in the definitions. Every value is an **expected** value: an average over what could happen. You can't compute an average you don't have the probabilities for, but you can **estimate** it: try many times and average what you saw. That's all learning from experience is. This lesson is about that one tool: keeping an average up to date, one sample at a time.` },
        { h: 'The running mean' },
        { md: `After $n$ samples $x_1, \\dots, x_n$ the average is $\\bar x_n = \\tfrac1n (x_1 + \\dots + x_n)$. Recomputing that sum every time would mean storing every sample. Instead, write the new average in terms of the old one:

$$\\bar x_n = \\frac{1}{n}\\Big( (n-1)\\,\\bar x_{n-1} + x_n \\Big) = \\bar x_{n-1} + \\frac{1}{n}\\big( x_n - \\bar x_{n-1} \\big)$$

(The first step uses $x_1 + \\dots + x_{n-1} = (n-1)\\bar x_{n-1}$; the second just multiplies out.) Read the result as a rule:

$$\\text{new estimate} = \\text{old estimate} + \\text{step size} \\times \\big(\\text{sample} - \\text{old estimate}\\big)$$

The bracket is the **error**: how far the new sample is from what we expected. We move the estimate a fraction of the way towards the sample. Every learning rule in this lab has exactly this shape.` },
        {
          code: {
            file: 'averages.py', fn: 'running_mean', notes: [
              ['mean = 0.0', ['The estimate before any sample.']],
              ['history = []', ['Every estimate, in order, for plotting.']],
              ['for n, x in enumerate(samples, start=1)', ['`enumerate(..., start=1)` counts from 1, so `n` is how many samples have been seen including this one.']],
              ['mean += (x - mean) / n', ['$\\bar x \\leftarrow \\bar x + \\tfrac1n(x - \\bar x)$. With `n = 1` the old mean is forgotten completely (`mean` becomes `x`); with `n = 100` a new sample moves it only 1% of the way.']],
              ['history.append(mean)', ['Keeps every estimate, for plotting.']],
              ['return history', ['The estimate after 1, 2, 3, … samples.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'The samples are 1, 0, 0. What is the running mean after the third?',
            answer: 1 / 3, tolerance: 1e-6, compute: () => runningMean([1, 0, 0])[2],
            explain: 'Step by step: $0 + \\tfrac11(1 - 0) = 1$, then $1 + \\tfrac12(0 - 1) = 0.5$, then $0.5 + \\tfrac13(0 - 0.5) = 0.333$. The same as $(1 + 0 + 0)/3$, without storing the samples.',
          },
        },
        { h: 'A constant step size α' },
        { md: `Reinforcement learning usually replaces $\\tfrac1n$ by a **constant** step size $\\alpha$ (alpha), between 0 and 1, called the **learning rate**:

$$\\hat x \\leftarrow \\hat x + \\alpha\\,(x - \\hat x)$$

Why give up the exact average? Because in learning, the thing being averaged **changes over time**. As the agent improves, the returns it sees get better, and old samples describe an agent that no longer exists. With a constant $\\alpha$, older samples fade away: unrolling the rule shows that the sample $k$ steps ago has weight $\\alpha(1-\\alpha)^k$, which shrinks geometrically. This is an **exponentially weighted moving average**.

The price: the estimate never fully settles. It keeps reacting to each new sample. Large $\\alpha$ learns fast and stays noisy; small $\\alpha$ is smooth and slow.` },
        {
          code: {
            file: 'averages.py', fn: 'constant_step', notes: [
              ['estimate = 0.0', ['The starting estimate.']],
              ['history = []', ['Every estimate, in order.']],
              ['for x in samples', ['One sample at a time.']],
              ['estimate += alpha * (x - estimate)', ['The same shape as the running mean, with `alpha` in place of `1 / n`. `alpha = 1` copies each sample; `alpha = 0` never learns.']],
              ['history.append(estimate)', ['Keep it.']],
              ['return history', ['The estimate after each sample.']],
            ],
          },
        },
        { figure: 'RunningAverage', caption: 'The samples are the rewards of one slippery move: the frozen lake, state 14, RIGHT, which reaches the goal (reward 1) a third of the time. Compare the running mean with a constant step; change α; try more samples.' },
        {
          predict: {
            prompt: 'Constant step α = 0.5, starting from 0, samples 1, 0, 0. What is the estimate after the third sample?',
            answer: 0.125, tolerance: 1e-9, compute: () => constantStep([1, 0, 0], 0.5)[2],
            explain: '$0 + 0.5(1 - 0) = 0.5$, then $0.5 + 0.5(0 - 0.5) = 0.25$, then $0.25 + 0.5(0 - 0.25) = 0.125$. It forgets the first sample fast: the true average is 0.333.',
            misconceptions: [{ answer: 1 / 3, tolerance: 1e-3, feedback: 'That is the running mean (step $1/n$). With a constant $\\alpha = 0.5$, each step moves halfway to the new sample.' }],
          },
        },
        { note: '**Learning rule shape:** estimate ← estimate + α · (sample − estimate). With $\\alpha = 1/n$ it is the exact average; with a constant $\\alpha$ it is an average that favours recent samples, which is what an improving agent needs.' },
      ],
    },

    {
      id: 'td-learning', number: '3.2', title: 'Temporal-difference learning: the TD target',
      goal: 'Estimate $V^\\pi$ from experience with TD(0): sample the Bellman equation, compute the **TD target** and **TD error**, and explain bootstrapping.',
      builds: ['averages', 'value-functions'],
      blocks: [
        { md: `Now apply the averaging rule to values. We want $V^\\pi(s)$, the expected return from $s$. Two ways to get a sample of it:

1. **Wait for the whole return.** Play to the end of the episode, compute $G_t$ (lesson 1.5) and average that. This is the **Monte Carlo** method. It is honest but slow: nothing is learned until an episode ends, and one $G_t$ contains every random event of the rest of the episode, so it is very noisy.
2. **Use the Bellman equation.** It says $V^\\pi(s)$ is the expected value of $R_{t+1} + \\gamma V^\\pi(S_{t+1})$. After a **single move** we have a sample of exactly that: the reward $r$ we just got, plus the discounted value of the state $s'$ we landed in. We don't know $V^\\pi(s')$ exactly, so we use our current estimate $V(s')$.

The second way is **temporal-difference learning**, TD for short (Sutton, 1988). Its sample is called the **TD target**:

$$\\text{target} = r + \\gamma\\, V(s') \\qquad (\\text{just } r \\text{ if the move ended the episode})$$

and plugging it into the averaging rule gives **TD(0)**:

$$V(s) \\leftarrow V(s) + \\alpha\\,\\big[\\underbrace{r + \\gamma V(s') - V(s)}_{\\delta,\\ \\text{the TD error}}\\big]$$

$\\delta$ (delta) is the **TD error**: the difference between what we expected ($V(s)$) and the slightly better-informed guess one step later. "Temporal difference" means exactly that: a difference between estimates at two successive times.` },
        { h: 'Bootstrapping' },
        { md: `TD's target contains an estimate, $V(s')$. We update a guess towards another guess. This is called **bootstrapping** (from "pulling yourself up by your own bootstraps"). It sounds circular, but it works: the targets are anchored by real rewards, and the endings are anchored completely (an ending's target is just $r$). Correct values seep backwards from the rewards, one move at a time, the same way they spread outwards in value iteration's sweeps, except now driven by experience instead of by \`P\`.` },
        {
          code: {
            file: 'td.py', fn: 'td0_evaluate', notes: [
              ['rng = random.Random(seed)', ['The agent\'s random numbers: it moves at random.']],
              ['V = np.zeros(env.n_states)', ['One estimate per state, all starting at 0.']],
              ['for episode in range(episodes)', ['One game per trip round.']],
              ['state, info = env.reset(seed=seed if episode == 0 else None)', ['Start a game.']],
              ['done = False', ['Not over yet.']],
              ['while not done', ['One move per trip.']],
              ['action = rng.randrange(env.n_actions)', ['The policy being evaluated: uniformly random, as in lesson 2.4. TD(0) doesn\'t need to know it as a table; it just follows it.']],
              ['next_state, reward, terminated, truncated, info = env.step(action)', ['One real move: the only knowledge of the world TD gets. No `P` anywhere.']],
              ['target = reward if terminated else reward + gamma * V[next_state]', ['The TD target. If the move ended the episode, the future is worth 0. (If it was only **truncated**, the world would have gone on, so the target still includes $\\gamma V(s\')$: this is where the difference from lesson 1.3 matters.)']],
              ['V[state] += alpha * (target - V[state])', ['The averaging rule of lesson 3.1 with the TD target as the sample. `target - V[state]` is the TD error $\\delta$.']],
              ['state = next_state', ['Move on.']],
              ['done = terminated or truncated', ['Stop for either reason.']],
              ['return V', ['The estimates.']],
            ],
          },
        },
        { figure: 'TDEvaluation', props: { map: 'cheese_and_cat' }, caption: 'TD(0) on the random policy, beside the exact values from lesson 2.4. Step one move at a time to see each update with its numbers, then run 1,000 episodes and watch the two maps come to look alike.' },
        {
          mathCode: [
            ['V(s)', 'V[state]', 'the current estimate of the state\'s value'],
            ['r + \\gamma V(s\')', 'reward + gamma * V[next_state]', 'the TD target: a one-move sample of the Bellman equation\'s right-hand side'],
            ['\\delta = r + \\gamma V(s\') - V(s)', 'target - V[state]', 'the TD error'],
            ['V(s) \\leftarrow V(s) + \\alpha\\delta', 'V[state] += alpha * (target - V[state])', 'the update'],
          ],
        },
        {
          predict: {
            prompt: 'TD(0) with α = 0.1, γ = 0.95. The agent is in state 14, where $V(14) = 0.2$, moves right onto the cheese (reward 1, the episode ends). What is the new $V(14)$?',
            answer: 0.28, tolerance: 1e-9, compute: () => 0.2 + 0.1 * (1 - 0.2),
            explain: 'The move ended the episode, so the target is just $r = 1$. $\\delta = 1 - 0.2 = 0.8$, and $V(14) \\leftarrow 0.2 + 0.1 \\cdot 0.8 = 0.28$.',
            misconceptions: [{ answer: 0.2 + 0.1 * (1 + 0.95 * 0.2 - 0.2), tolerance: 1e-9, feedback: 'That adds $\\gamma V(s\')$ with $V(s\') = 0.2$, as if the episode went on. The move ended it: the target is just $r$.' }],
          },
        },
        { note: 'TD learning: after each move, nudge $V(s)$ towards the **TD target** $r + \\gamma V(s\')$. The difference is the **TD error** $\\delta$. It learns from single moves, without a model, by bootstrapping from its own estimates.' },
      ],
    },

    {
      id: 'q-table', number: '3.3', title: 'The Q-table, and choosing from it',
      goal: 'Build the Q-table as a NumPy array, index it (`Q[s]`, `Q[s, a]`, `.max()`), and choose the best action safely when values tie.',
      builds: ['td-learning', 'policies'],
      blocks: [
        { md: `TD(0) learns $V$, the value of states. But an agent that has to **choose** needs to compare moves: knowing that the cell to the right is worth 0.8 doesn't tell you which button gets you there, unless you have \`P\`. So the learning agents learn $Q(s, a)$ instead, one number per state **and** action, and choose with $\\arg\\max_a Q(s, a)$. No model needed.

They keep $Q$ in a **Q-table**: a NumPy array with one row per state and one column per action.

\`\`\`python
Q = np.zeros((env.n_states, env.n_actions))   # shape (16, 4) on Cheese and cat
\`\`\`` },
        { md: `How to read it:

| Expression | What it is | Example |
|---|---|---|
| \`Q.shape\` | the sizes, a tuple | \`(16, 4)\` |
| \`Q[s]\` | row \`s\`: the 4 action values of state \`s\`, an array | \`Q[0]\` → \`array([0., 0., 0., 0.])\` |
| \`Q[s, a]\` | one number: the value of action \`a\` in state \`s\` | \`Q[0, 2]\` → \`0.0\` |
| \`Q[s].max()\` | the best value in row \`s\`, $\\max_a Q(s, a)$ | |
| \`Q[s, a] += x\` | changes one entry in place | |
| \`Q[:, 2]\` | column 2: the value of RIGHT in every state | |

\`Q[s, a]\` is NumPy's way of writing \`Q[s][a]\`: both work, the first is one lookup instead of two.` },
        { figure: 'QTableView', props: { map: 'cheese_and_cat', train: 60 }, caption: 'A Q-table after 60 episodes of Q-learning on Cheese and cat, drawn on the map (each cell\'s four triangles are its row) and printed as the array. Click cells and rows.' },
        {
          predict: {
            prompt: 'How many numbers does the Q-table for Classic QMaze (10 × 10) hold?',
            answer: 400, compute: () => new GridWorld('qmaze').nStates * 4,
            explain: '100 states × 4 actions = 400. (26 of those rows are walls, never used.) A table grows with the number of states times actions, which is why tables only work for small worlds; Part 4 starts replacing the table with a function.',
          },
        },
        { h: 'Choosing the best action, and the tie trap' },
        { md: `The obvious way to pick the best action is \`Q[s].argmax()\`. But NumPy's \`argmax\` gives the **first** of several equal values. At the start every row is \`[0, 0, 0, 0]\`, so \`argmax\` says LEFT, in every state, every time. A greedy agent then walks left into the wall, and since bumping costs only a little, it can take a long time to discover that anything else exists. A hidden bias like that is easy to miss.

The fix is to break ties **at random**:` },
        {
          code: {
            file: 'choosing.py', fn: 'greedy_action', notes: [
              ['best = max(q_row)', ['The largest value in the row, with Python\'s built-in `max` (it works on a NumPy row too).']],
              ['ties = [action for action in range(len(q_row)) if q_row[action] == best]', ['Every action whose value equals the best: a list such as `[2]`, or `[0, 1, 2, 3]` for a fresh row.']],
              ['return rng.choice(ties)', ['`rng.choice(list)` picks one item at random. With one best action it is always that one; with ties, each is equally likely. (It still draws a random number when there is only one: the seeded results depend on that.)']],
            ],
          },
        },
        {
          choice: {
            prompt: 'A fresh Q-table is all zeros. What does `greedy_action(Q[s], rng)` do in a state it has never visited?',
            options: [
              { text: 'Picks one of the 4 actions at random, each with probability 1/4', why: 'Right: all four tie at 0, so `ties` is `[0, 1, 2, 3]` and `rng.choice` picks uniformly. Until values differ, "greedy" behaves like random.' },
              { text: 'Always picks LEFT (action 0)', why: 'That is what `Q[s].argmax()` would do. `greedy_action` collects all tied actions and chooses among them.' },
              { text: 'Raises an error because there is no best action', why: 'Ties are fine: `max` gives 0 and every action equals it.' },
            ],
            answer: 0,
          },
        },
        { note: 'The Q-table is an array `Q[state, action]`. Row `Q[s]` holds a state\'s four action values; the agent takes the largest, breaking ties at random so that a table of zeros carries no hidden preference.' },
      ],
    },

    {
      id: 'exploration', number: '3.4', title: 'Exploration: ε-greedy',
      goal: 'Explain why an agent must sometimes take moves it believes are worse, implement ε-greedy and its schedule, and see what pure greed costs.',
      builds: ['q-table'],
      blocks: [
        { md: `An agent that always takes its current best move (**exploits**) only ever learns about the moves it already likes. If an early estimate is wrong, it may never try the alternative that would prove it wrong. To find better options it must sometimes take a move it currently thinks is worse: **explore**. This tension, the **exploration–exploitation trade-off**, is at the centre of reinforcement learning.

The simplest answer is **ε-greedy** (lesson 2.3): with probability ε pick a random move, otherwise the best one.` },
        {
          code: {
            file: 'choosing.py', fn: 'epsilon_greedy', notes: [
              ['if rng.random() < epsilon', ['`rng.random()` is uniform on $[0, 1)$, so this is true with probability `epsilon`: explore.']],
              ['return rng.randrange(len(q_row))', ['Any action, each equally likely, including possibly the best one.']],
              ['return greedy_action(q_row, rng)', ['Otherwise exploit: the best action, ties broken at random.']],
            ],
          },
        },
        { h: 'Exploring less as you learn' },
        { md: `Early on the table knows nothing, so exploring is cheap and useful; later most random moves are wasted. So ε usually starts high and is lowered over training. This lab lowers it in a straight line from \`epsilon_start\` to \`epsilon_end\` over the first 80% of the episodes, then holds it:` },
        {
          code: {
            file: 'choosing.py', fn: 'linear', notes: [
              ['progress = min(progress, 1.0)', ['Past the end of the slide, stay at the end value.']],
              ['return start + (end - start) * progress', ['A straight line: `start` at progress 0, `end` at progress 1.']],
            ],
          },
        },
        { md: `In \`train_q_learning\` it is called as \`linear(epsilon_start, epsilon_end, episode / (0.8 * episodes))\`.` },
        { figure: 'EpsilonSchedule', caption: 'ε for each of 300 episodes with the default schedule (1.0 down to 0.05).' },
        {
          predict: {
            prompt: 'With 300 episodes, `epsilon_start = 1.0` and `epsilon_end = 0.05`, what is ε in episode 120?',
            answer: 0.525, tolerance: 1e-9, compute: () => linear(1, 0.05, 120 / (0.8 * 300)),
            explain: 'progress $= 120 / 240 = 0.5$, so $\\varepsilon = 1 + (0.05 - 1) \\cdot 0.5 = 0.525$: halfway down.',
            misconceptions: [{ answer: 0.62, tolerance: 1e-6, feedback: 'That uses $120/300$ as the progress. The slide finishes at 80% of the episodes: progress is $120 / (0.8 \\cdot 300) = 0.5$.' }],
          },
        },
        { h: 'What pure greed costs' },
        { md: `Run Q-learning with ε = 0 throughout (purely greedy, ties broken at random) and compare. On Cheese and cat it still finds the cheese: every move costs 0.04, so moves it has tried look worse than the untried ones still at 0, and it wanders into new moves anyway. On Classic QMaze that isn't enough. Over three seeds the greedy agent settles on routes returning −0.88, −0.72 and −0.72, while with ε-greedy all three find the optimal −0.56. Try it in the trainer below: set **ε start** and **ε end** to 0.` },
        { figure: 'Trainer', props: { fixed: { map: 'qmaze', episodes: 300 }, show: ['epsilon', 'seed'], view: 'policy' }, caption: 'Q-learning on Classic QMaze. Train with the default ε, then with ε start = ε end = 0, and compare the result line under the curve.' },
        { note: '**Explore** (try a random move) with probability ε, otherwise **exploit** (best move). Start ε high and lower it. Without exploration an agent can lock in on a mediocre route because it never tests the alternatives.' },
      ],
    },

    {
      id: 'q-learning', number: '3.5', title: 'Q-learning',
      goal: 'Derive the Q-learning update from the Bellman optimality equation, follow every line of `train_q_learning`, and carry out updates by hand.',
      builds: ['exploration', 'value-iteration'],
      blocks: [
        { md: `Put the pieces together. Lesson 2.5's Bellman optimality equation says:

$$Q^*(s, a) = \\mathbb{E}\\big[\\, R_{t+1} + \\gamma \\max_{a'} Q^*(S_{t+1}, a') \\;\\big|\\; S_t = s, A_t = a \\,\\big]$$

An expected value we can't compute without $P$, but can **sample**: take action $a$ in $s$, see $r$ and $s'$, and $r + \\gamma \\max_{a'} Q(s', a')$ is one sample of the right-hand side (bootstrapping on our current table, as TD does). Feed that sample to the averaging rule of lesson 3.1:

$$Q(s, a) \\leftarrow Q(s, a) + \\alpha \\Big[\\, \\underbrace{r + \\gamma \\max_{a'} Q(s', a')}_{\\text{Q-learning target}} - Q(s, a) \\,\\Big]$$

That is **Q-learning** (Watkins, 1989). If the move ended the episode the target is just $r$.

Under some conditions (every state–action pair tried infinitely often, and α shrinking in the right way) it is proven to converge to $Q^*$, whatever exploring policy generated the moves. In practice, with a constant α and finite training, it gets close enough that its greedy policy is optimal.` },
        { h: 'The update in code' },
        {
          code: {
            file: 'qlearning.py', fn: 'q_learning_update', notes: [
              ['if terminated:', ['The move ended the episode: no future.']],
              ['target = reward', ['Target = $r$.']],
              ['target = reward + gamma * Q[next_state].max()', ['Target = $r + \\gamma \\max_{a\'} Q(s\', a\')$. `Q[next_state].max()` is the best value in the next state\'s row: what the agent believes it can get from there **if it acts greedily**, whatever it will actually do next.']],
              ['td_error = target - Q[state, action]', ['$\\delta$: how wrong the old value was, by this sample.']],
              ['Q[state, action] += alpha * td_error', ['Move one entry of the table a fraction α of the way to the target. Only this one entry changes.']],
              ['return td_error', ['Returned so a caller can watch the errors shrink.']],
            ],
          },
        },
        {
          mathCode: [
            ['Q(s, a)', 'Q[state, action]', 'the table entry being updated'],
            ['\\max_{a\'} Q(s\', a\')', 'Q[next_state].max()', 'best value of the next state'],
            ['r + \\gamma \\max_{a\'} Q(s\', a\')', 'reward + gamma * Q[next_state].max()', 'the Q-learning target'],
            ['\\delta', 'td_error', 'target − old value'],
            ['Q(s,a) \\leftarrow Q(s,a) + \\alpha\\delta', 'Q[state, action] += alpha * td_error', 'the update'],
          ],
        },
        { h: 'The training loop' },
        {
          code: {
            file: 'qlearning.py', fn: 'train_q_learning', notes: [
              ['rng = random.Random(seed)', ['The agent\'s random numbers (exploring, tie-breaking), seeded for repeatability.']],
              ['Q = np.full((env.n_states, env.n_actions), initial_q)', ['The table, every entry `initial_q` (0.0 unless lesson 3.10 says otherwise).']],
              ['totals = []', ['The return of each episode, for the learning curve.']],
              ['for episode in range(episodes)', ['One trip round this loop is one whole game.']],
              ['epsilon = linear(epsilon_start, epsilon_end, episode / (0.8 * episodes))', ['This episode\'s ε (lesson 3.4).']],
              ['state, info = env.reset(seed=seed if episode == 0 else None)', ['Start a game. Seeding the world only on the first episode makes the whole run repeatable without making every episode identical.']],
              ['total = 0.0', ['This episode\'s return so far.']],
              ['done = False', ['Not over yet.']],
              ['while not done', ['One move per trip round this loop.']],
              ['action = epsilon_greedy(Q[state], epsilon, rng)', ['Choose: explore or exploit, from this state\'s row.']],
              ['next_state, reward, terminated, truncated, info = env.step(action)', ['Act: the world answers.']],
              ['q_learning_update(Q, state, action, reward, next_state, terminated, alpha, gamma)', ['Learn from that one move. Only `terminated` is passed: a truncated episode still has a future (lesson 1.3).']],
              ['total += reward', ['Keep score.']],
              ['state = next_state', ['Move on.']],
              ['done = terminated or truncated', ['Stop the episode for either reason.']],
              ['totals.append(total)', ['Record the episode\'s return.']],
              ['return Q, totals', ['The learned table and the learning curve.']],
            ],
          },
        },
        { h: 'By hand, on the corridor' },
        { md: `Watch the very first updates on the Tiny corridor (\`S...C\`, states 0 to 4, cheese +1 at state 4; α = 0.5, γ = 0.95, seed 0). The table starts at all zeros.

- **Episode 1.** The rat wanders for 16 moves. Every update before the last has $r = 0$ and a next row of zeros: target $0 + 0.95 \\cdot 0 = 0$, no change. On the last move, RIGHT from state 3 into the cheese: target $= 1$ (ended), so $Q[3, \\text{RIGHT}] = 0 + 0.5(1 - 0) = 0.5$. **One** entry learned.
- **Episode 2.** Now moving RIGHT from state 2 into state 3 finds something: target $= 0 + 0.95 \\cdot \\max Q[3] = 0.95 \\cdot 0.5 = 0.475$, so $Q[2, \\text{RIGHT}] = 0.2375$. And the cheese move again: $Q[3, \\text{RIGHT}] = 0.5 + 0.5(1 - 0.5) = 0.75$.

The value spreads **backwards from the reward, about one state per episode**, exactly like value iteration's sweeps, but paid for with real moves.` },
        {
          predict: {
            prompt: 'Episode 3 starts with $Q[2, \\text{RIGHT}] = 0.2375$ and $Q[3, \\text{RIGHT}] = 0.75$ (the best in row 3). The rat moves RIGHT from 2 to 3. What is the new $Q[2, \\text{RIGHT}]$?',
            answer: 0.475, tolerance: 1e-9, compute: () => corridorUpdates().find(u => u.episode === 2 && u.state === 2 && u.action === 2).updated,
            explain: 'Target $= 0 + 0.95 \\cdot 0.75 = 0.7125$; $\\delta = 0.7125 - 0.2375 = 0.475$; new value $0.2375 + 0.5 \\cdot 0.475 = 0.475$. (The trainer below, on the corridor with seed 0, makes exactly these updates.)',
            misconceptions: [{ answer: 0.7125, tolerance: 1e-9, feedback: 'That is the target. The table only moves α = 0.5 of the way there from its old value 0.2375.' }],
          },
        },
        { figure: 'Trainer', props: { fixed: { map: 'corridor', episodes: 50 }, show: ['alpha', 'gamma'], view: 'q', compare: false }, caption: 'Q-learning on the corridor, seed 0. Press **One episode** three times and read the updates; the table on the map matches the hand calculation. Then press One move to see every step written out.' },
        { h: 'Off-policy' },
        { md: `Notice what the target uses: $\\max_{a'} Q(s', a')$, the value of the **best** next move, even when the agent is about to explore and take a different one. Q-learning learns the value of acting greedily (the optimal policy) while actually behaving ε-greedily. Learning about one policy while following another is called **off-policy** learning. Lesson 3.7 meets an **on-policy** method, and lesson 3.8 shows when the difference matters.` },
        { figure: 'Trainer', props: { fixed: { map: 'cheese_and_cat' }, show: ['map', 'alpha', 'gamma', 'epsilon', 'episodes', 'seed'], view: 'q' }, caption: 'Q-learning on Cheese and cat. Train all 300 episodes: the result line compares the learned table with the exact $Q^*$ from value iteration.' },
        { python: { program: 'q', map: 'cheese_and_cat', label: 'Step through train_q_learning in real Python' } },
        { note: '**Q-learning:** $Q(s,a) \\leftarrow Q(s,a) + \\alpha[r + \\gamma \\max_{a\'} Q(s\',a\') - Q(s,a)]$, a sampled Bellman optimality backup. It is off-policy: it learns the greedy policy\'s values while exploring.' },
      ],
    },

    {
      id: 'reading-results', number: '3.6', title: 'Training, and judging what was learned',
      goal: 'Read a learning curve, judge a table by playing it greedily and comparing it with $Q^*$, and see the effect of α, γ and the seed.',
      builds: ['q-learning'],
      blocks: [
        { md: `A trained table has to be **judged**, and the training curve alone is misleading:

- The **learning curve** (return of each training episode) includes exploration: with ε = 0.05 one move in twenty is random. It shows progress, not the final skill.
- To judge the table itself, play it **greedily** (ε = 0) for many episodes and average the returns. This lab's trainer does that for 100 episodes after training.
- When the exact answer is known (here: value iteration on \`P\`), compare: in how many states is the learned best move an optimal move, and how far are the numbers from $Q^*$?

Often the policy is perfect while the numbers are still off: Q-learning only needs the **ranking** of actions right, and rarely-visited moves (say, walking into the cat from far away) may never be estimated accurately. That is fine: the agent never takes them.` },
        { md: `To train on a map by name, the Python tab (and you, on your own machine) start from \`experiments.py\`:` },
        {
          code: {
            file: 'experiments.py', from: 1, to: 25, notes: [
              ['def plan(name="cheese_and_cat", gamma=0.95)', ['Each function takes a map **name** and builds the world itself, so it can be called with plain values: `plan("qmaze")`.']],
              ['env = GridWorld(name)', ['The world.']],
              ['V, Q, sweeps = value_iteration(env.P, gamma)', ['The exact answer, from `P` (lesson 2.5).']],
              ['return V, Q, sweeps', ['All three results.']],
              ['def learn_q(name="cheese_and_cat", **settings)', ['`**settings` collects any keyword arguments into a dictionary: `learn_q("qmaze", episodes=100, alpha=0.1)` gives `settings = {"episodes": 100, "alpha": 0.1}`.']],
              ['env = GridWorld(name)', ['The world.']],
              ['Q, totals = train_q_learning(env, **settings)', ['`**settings` here does the opposite: it unpacks the dictionary back into keyword arguments for `train_q_learning`.']],
              ['return Q, totals', ['The table and the learning curve.']],
              ['def learn_sarsa(name="cheese_and_cat", **settings)', ['The same for SARSA.']],
              ['env = GridWorld(name)', ['The world.']],
              ['Q, totals = train_sarsa(env, **settings)', ['Train.']],
              ['return Q, totals', ['The results.']],
            ],
          },
        },
        { figure: 'Trainer', props: { fixed: { map: 'qmaze', episodes: 300 }, show: ['alpha', 'gamma', 'episodes', 'seed'], view: 'policy' }, caption: 'Q-learning on Classic QMaze. Train all episodes, read the result, then experiment: α = 0.05 or 1.0, γ = 0.5, 50 episodes, different seeds. What changes, and why?' },
        { md: `Things to try, and what they show:

- **Seeds.** Different seeds give different curves and tables but (here) the same greedy route, return −0.56. Always check more than one seed before trusting a result.
- **Small α (0.05).** Values move slowly: after 300 episodes (seed 0) the largest error is still 0.84 and the greedy route returns −0.64, not the optimal −0.56. Too small, and learning stalls.
- **α = 1.** Each update replaces the old value with the latest target. In a deterministic world with Markov rewards the target for a move is always the same, so that would be fine. But Classic QMaze's revisit penalty pays the same move differently depending on the history (lesson 2.2), so the values thrash: with seed 0 the route found returns −0.64 instead of −0.56.
- **Small γ (0.5).** Far-away cheese is worth almost nothing from the start ($0.5^{17} \\approx 0.00001$), so the differences between long routes are tiny and drowned out by noise. The rat still gets to the cheese, but often the long way: −0.64 and −0.88 on two of three seeds here.` },
        {
          choice: {
            prompt: 'After training, the learning curve\'s last 50 episodes average about 0.78 on Cheese and cat, but greedy play scores 0.80. Why the difference?',
            options: [
              { text: 'Training episodes still explore (ε = 0.05), and random moves cost steps or worse', why: 'Right. 0.80 is the shortest route\'s return; training episodes lose a little to exploration.' },
              { text: 'The table got worse at the end of training', why: 'Greedy play scores the best possible 0.80, so the table is fine.' },
              { text: 'Greedy play uses a different map', why: 'Same map; the difference is that greedy play never explores.' },
            ],
            answer: 0,
          },
        },
        { note: 'Judge a table by **greedy play** and, when you can, against $Q^*$; not by the exploring training curve. Check several seeds. The policy can be optimal while many values are still inaccurate.' },
      ],
    },

    {
      id: 'sarsa', number: '3.7', title: 'SARSA: learning the policy you follow',
      goal: 'Write SARSA\'s update, explain on-policy learning, and point to the one line that differs from Q-learning.',
      builds: ['q-learning'],
      blocks: [
        { md: `**SARSA** (Rummery and Niranjan, 1994; named by Sutton) changes one thing. Instead of the best next value, its target uses the value of the action the agent **will actually take next**, $a'$, chosen by the same ε-greedy rule:

$$Q(s, a) \\leftarrow Q(s, a) + \\alpha \\big[\\, r + \\gamma\\, Q(s', a') - Q(s, a) \\,\\big]$$

The name lists the five things one update uses: $S_t, A_t, R_{t+1}, S_{t+1}, A_{t+1}$, that is, (s, a, r, s′, a′).

It is the sampled version of the Bellman **expectation** equation (lesson 2.4) for the ε-greedy policy itself: SARSA learns $Q^\\pi$ of the policy it follows, exploration included. Learning about the policy you are following is called **on-policy**.` },
        {
          code: {
            file: 'sarsa.py', fn: 'sarsa_update', notes: [
              ['if terminated:', ['The move ended the episode: no future, as in Q-learning.']],
              ['target = reward', ['Target = $r$.']],
              ['target = reward + gamma * Q[next_state, next_action]', ['The one difference: `Q[next_state, next_action]`, the value of the move it will really make, instead of `Q[next_state].max()`. If that next move is an exploring step towards the cat, the target is low.']],
              ['td_error = target - Q[state, action]', ['$\\delta$, as before.']],
              ['Q[state, action] += alpha * td_error', ['The same averaging step.']],
              ['return td_error', ['For watching.']],
            ],
          },
        },
        {
          code: {
            file: 'sarsa.py', fn: 'train_sarsa', notes: [
              ['rng = random.Random(seed)', ['As in `train_q_learning`.']],
              ['Q = np.full((env.n_states, env.n_actions), initial_q)', ['The table.']],
              ['totals = []', ['One return per episode.']],
              ['for episode in range(episodes)', ['One game per trip round.']],
              ['epsilon = linear(epsilon_start, epsilon_end, episode / (0.8 * episodes))', ['The same ε schedule.']],
              ['state, info = env.reset(seed=seed if episode == 0 else None)', ['Start a game.']],
              ['action = epsilon_greedy(Q[state], epsilon, rng)', ['The first action is chosen **before** the loop: SARSA always knows its next action in advance.']],
              ['total = 0.0', ['This episode\'s return so far.']],
              ['done = False', ['Not over yet.']],
              ['while not done', ['One move per trip.']],
              ['next_state, reward, terminated, truncated, info = env.step(action)', ['Take the action chosen last time.']],
              ['next_action = epsilon_greedy(Q[next_state], epsilon, rng)', ['Choose the next action now, before updating, because the update needs it.']],
              ['sarsa_update(Q, state, action, reward, next_state, next_action, terminated, alpha, gamma)', ['Learn from (s, a, r, s′, a′).']],
              ['total += reward', ['Keep score.']],
              ['state, action = next_state, next_action', ['Move on **and commit** to the action used in the update: that is what makes the target honest.']],
              ['done = terminated or truncated', ['Stop for either reason.']],
              ['totals.append(total)', ['Record the return.']],
              ['return Q, totals', ['Table and learning curve.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'α = 0.5, γ = 0.95. $Q[s, a] = 0.4$. The move gives $r = -0.04$ and lands in $s\'$ whose row is $[0.2, 0.9, 0.5, 0.1]$. The next action chosen (exploring) is DOWN, action 3. What is SARSA\'s new $Q[s, a]$?',
            answer: 0.4 + 0.5 * (-0.04 + 0.95 * 0.1 - 0.4), tolerance: 1e-9, compute: () => 0.4 + 0.5 * (-0.04 + 0.95 * 0.1 - 0.4),
            explain: 'Target $= -0.04 + 0.95 \\cdot 0.1 = 0.055$; $\\delta = 0.055 - 0.4 = -0.345$; new value $0.4 - 0.1725 = 0.2275$. Q-learning would have used the best, 0.9: target $0.815$ and new value $0.6075$.',
            misconceptions: [{ answer: 0.4 + 0.5 * (-0.04 + 0.95 * 0.9 - 0.4), tolerance: 1e-9, feedback: 'That is Q-learning\'s update, with $\\max Q(s\') = 0.9$. SARSA uses the value of the action actually chosen next, DOWN: 0.1.' }],
          },
        },
        { figure: 'Trainer', props: { fixed: { map: 'cheese_and_cat', algorithm: 'sarsa' }, show: ['map', 'algorithm', 'alpha', 'epsilon', 'seed'], view: 'q' }, caption: 'SARSA (switch the algorithm to compare with Q-learning). Step one move: the update card shows the next action SARSA picked before updating.' },
        { python: { program: 'sarsa', map: 'cheese_and_cat', label: 'Step through train_sarsa in real Python' } },
        { note: '**SARSA:** target $r + \\gamma Q(s\', a\')$ with $a\'$ the action really taken next. **On-policy**: it learns the value of the exploring policy it follows. One line differs from Q-learning, and the next lesson shows that one line deciding the route.' },
      ],
    },

    {
      id: 'cliff', number: '3.8', title: 'The cliff: off-policy against on-policy',
      goal: 'Predict and explain why Q-learning walks the cliff edge while SARSA takes the safe path, and which one earns more while learning.',
      builds: ['sarsa'],
      blocks: [
        { md: `The Cliff (Sutton and Barto, Example 6.6) is the classic experiment that separates the two methods. The hiker starts bottom-left, the goal is bottom-right, and the whole bottom row between them is cliff (−100, back to start). Every step costs −1.

- The **shortest** route runs along the edge, right above the cliff: 13 moves, return −13.
- A **safe** route goes up a row or two first: return −15 or −17.

Train both methods the textbook way: α = 0.5, γ = 1, and ε = 0.1 **held constant** (no schedule).` },
        { figure: 'CliffCompare', caption: 'Both methods, same seed and settings. Left: each greedy route. Right: the return of every training episode.' },
        {
          predict: {
            prompt: 'After training, what does Q-learning\'s greedy route return?',
            answer: -13, compute: () => cliffGreedy('q'),
            explain: 'Q-learning learns $Q^*$: the values of acting **greedily**, as if it would never slip off. Greedily, the edge is safe and shortest: −13. It finds the optimal route.',
          },
        },
        {
          predict: {
            prompt: 'And SARSA\'s greedy route?',
            answer: -17, compute: () => cliffGreedy('sarsa'),
            explain: 'SARSA learns the value of its **ε-greedy** behaviour. Next to the cliff, one move in forty is a random step down (ε/4 = 0.025), costing −100. Those falls make the edge cells worth less, so it learns the route along the top, three rows up: −17.',
          },
        },
        { md: `Now the twist. Look at the **training** curve: SARSA's episodes average around −25, Q-learning's around −50. While exploring, Q-learning keeps walking the edge and falling off; SARSA, which takes its own randomness into account, falls much less.

So which is "better"? It depends on the question:

- If exploration stops after training (a robot that is tested greedily), Q-learning's route is better.
- If the agent will always act with some randomness (noisy motors, a policy that keeps exploring), SARSA's caution is correct, and it earns more along the way.

This holds across seeds: over five seeds this lab gets −13 for Q-learning's greedy route every time, and −17 for SARSA's.` },
        {
          choice: {
            prompt: 'Which change would make SARSA\'s route move closer to the edge?',
            options: [
              { text: 'Lowering ε towards 0 during training', why: 'Right: with less exploration there are fewer random steps off the edge, so the ε-greedy policy\'s values approach the greedy ones, and as ε → 0 SARSA\'s route approaches the optimal one.' },
              { text: 'Raising γ above 1', why: 'γ must stay at most 1; and it isn\'t what makes SARSA cautious.' },
              { text: 'A bigger α', why: 'α changes how fast values move, not what they converge to. The caution comes from learning the exploring policy\'s values.' },
            ],
            answer: 0,
          },
        },
        { note: 'Q-learning (off-policy) learns the optimal route and ignores its own exploration; SARSA (on-policy) learns a route that is good **given** its exploration. On the cliff: −13 against −17 for the final routes, but SARSA earns more while learning.' },
      ],
    },

    {
      id: 'slippery-ice', number: '3.9', title: 'Slippery ice: learning when moves are random',
      goal: 'Train on the frozen lake, explain why noisy targets need a small α and many episodes, and measure success properly.',
      builds: ['q-learning', 'transition-table'],
      blocks: [
        { md: `On the frozen lake the same action in the same state gives different results: the elf meant to go right, and slid down instead. Q-learning handles this without any change, because its update is an **average**: over many tries, $Q(s, a)$ averages over the slides, weighted by how often they happen. It ends up estimating the expectation in the Bellman equation, slides included, without ever seeing \`P\`.

But noise changes the settings that work:

- **Small α.** The target jumps between "slid into a hole" and "reached safety". With α = 0.5 each update throws away half of what was learned and chases the latest slide; with α = 0.1 the estimate averages over many recent outcomes. (Measured over three seeds: α = 0.5 still works, but less reliably: 62–73% success against 66–73%.)
- **Many episodes.** The reward is rare (1 only at the goal) and success is uncertain, so it takes thousands of episodes rather than hundreds: with 300 episodes, as on the maze, the greedy policy succeeds only 9–16% of the time.
- **γ close to 1** (0.99). The goal is far and the route is long; with a small γ the +1 fades to almost nothing over the detours the optimal policy takes.

And judging needs care too: a single greedy episode tells you little when outcomes are random. Measure the **success rate** over many episodes.` },
        { figure: 'Trainer', props: { fixed: { map: 'frozen_lake', episodes: 3000, alpha: 0.1, gamma: 0.99 }, show: ['map', 'algorithm', 'alpha', 'episodes', 'seed'], view: 'policy', maps: ['frozen_lake', 'frozen_lake_8x8'] }, caption: 'Q-learning on the frozen lake: 3,000 episodes, α = 0.1, γ = 0.99. Train, read the success rate, then try α = 0.5, or 300 episodes.' },
        { md: `Over three seeds this lab's Q-learning reaches the goal in 66–73% of greedy episodes; the optimal policy (from value iteration) succeeds about **74%** of the time. Nothing does better: from some cells every action has some chance of sliding into a hole. Notice too that the learned arrows, like the optimal ones in lesson 2.5, often point **along** walls and away from holes, so that the sideways slides can't hurt.

The 8 × 8 lake needs about 10,000 episodes: try it (the trainer runs them in a fraction of a second). Over three seeds that reaches 81–88% success; the optimal policy manages about 87%.` },
        {
          choice: {
            prompt: 'Why does the learned frozen-lake policy never reach 100% success, however long it trains?',
            options: [
              { text: 'Some slides are unavoidable: even the best action keeps some chance of ending in a hole', why: 'Right. The optimal policy itself succeeds only about 74% of the time. Learning can reach the optimum, not beat it.' },
              { text: 'The Q-table is too small for 16 states', why: 'A 16 × 4 table holds the exact values. The limit is the world\'s randomness.' },
              { text: 'ε never reaches exactly 0', why: 'Success is measured by greedy play, with no exploring at all.' },
            ],
            answer: 0,
          },
        },
        { note: 'With random transitions, Q-learning\'s averaging estimates expectations over slides automatically. Use a smaller α, more episodes, γ near 1, and judge by success rate over many greedy episodes. The optimum itself can be far from 100%.' },
      ],
    },

    {
      id: 'reward-design', number: '3.10', title: 'Reward design, and why exploration is hard',
      goal: 'Diagnose an agent that settles for a worse reward, fix it with optimistic initial values, and judge reward rules such as QMaze\'s revisit penalty.',
      builds: ['cliff', 'markov-property'],
      blocks: [
        { md: `Cats and cheese has a small cheese (+0.3) two moves from the start and a big cheese (+1) ten moves away, past a cat. With γ = 0.95, value iteration says the big cheese is better (lesson 2.5). Now train Q-learning with the defaults and look at the greedy route.` },
        { figure: 'Trainer', props: { fixed: { map: 'cats_and_cheese' }, show: ['algorithm', 'initialQ', 'epsilon', 'episodes', 'seed'], view: 'policy' }, caption: 'Cats and cheese. Train with initial Q = 0, then with initial Q = 1. Then switch to SARSA and do both again.' },
        { md: `With a table of zeros, every seed settles on the **small** cheese. Here is why:

- Exploring at random from the start, the rat ends up on the small cheese or a cat most of the time; it reaches the big cheese rarely: in 10,000 random walks measured with this lab's engine, 103 times, about 1 in 100.
- Every visit to the small cheese makes $Q(\\text{start}, \\text{DOWN})$ more attractive. Once that's the best entry, greedy moves go there, and as ε falls the rat stops wandering far enough to learn the long route's value.

This is a **local optimum**: good enough to stop looking. It's the exploration problem of lesson 3.4 in its classic form.` },
        { h: 'Optimistic initial values' },
        { md: `A simple, old fix (Sutton and Barto, section 2.6): start the table **above** any value that can really be achieved. With \`initial_q = 1.0\`, every untried move looks wonderful. Each time a move is tried, its value drops towards the truth, so the greedy agent is drawn to whatever it hasn't tried yet. Exploration happens **systematically**, not by luck. With initial Q = 1, Q-learning finds the big cheese on all five seeds this lab tested.

Then switch to SARSA with initial Q = 1: it still takes the small cheese, on all five seeds. The big cheese sits right next to a cat, and the route passes another. SARSA learns the value of its ε-greedy behaviour, in which a random step into a cat is a real risk (lesson 3.8). Two things look alike here, "can't find the better reward" and "judges the better reward too risky", but they have different causes and different fixes.` },
        {
          choice: {
            prompt: 'Why does `initial_q = 1.0` count as "optimistic" on this map?',
            options: [
              { text: 'No state–action pair can really be worth more than about 1, so every untried move starts out looking at least as good as the best real one', why: 'Right. The largest reward is 1 and every step costs a little, so true values are below 1. Optimism only works if the start is above the truth.' },
              { text: 'It makes the agent take bigger steps', why: 'The step size is α. The initial value only changes where estimates start.' },
              { text: 'It changes the rewards', why: 'The rewards are unchanged; only the table\'s starting values change.' },
            ],
            answer: 0,
          },
        },
        { h: 'Rewards that teach the wrong thing' },
        { md: `The agent maximises exactly what it is paid (lesson 1.4). Classic QMaze's rules are a useful case study:

- **−0.04 per step**: a time cost. Good: it makes shorter routes better without changing which goal is right.
- **−0.75 for bumping a wall**: discourages pointless moves. Harmless, but not needed for the right answer: the step cost already makes bumping wasteful.
- **−0.25 for revisiting a cell**: meant to stop dithering. But it depends on history, so it breaks the Markov property (lesson 2.2), and it can make the agent avoid **backtracking out of a dead end**, which is sometimes the only way forward.

Extra rewards meant to guide the agent are called **reward shaping**. Shaping that changes which policy is optimal is a bug, even if it speeds learning. There is a safe kind, **potential-based shaping** (Ng, Harada and Russell, 1999): add $\\gamma\\Phi(s') - \\Phi(s)$ to each reward for some function $\\Phi$ of the state (for example, minus the distance to the cheese). It provably leaves the optimal policy unchanged.` },
        { figure: 'Trainer', props: { fixed: { map: 'qmaze', episodes: 300 }, show: ['algorithm', 'alpha', 'episodes', 'seed'], view: 'policy' }, caption: 'Classic QMaze, with all three of the tutorial\'s rules. The learned route still matches the optimal one here: the shaping costs some accuracy in the values, not the route.' },
        { note: 'An agent can settle for a nearby reward because it stops exploring before it finds the better one. **Optimistic initial values** make exploration systematic. Reward rules must say what you want **without** changing what is optimal; potential-based shaping is the safe way to add guidance.' },
      ],
    },
  ],
}
