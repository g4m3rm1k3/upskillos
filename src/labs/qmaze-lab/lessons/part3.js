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
      id: 'monte-carlo', number: '3.2', title: 'Monte Carlo prediction: averaging whole returns',
      goal: 'Estimate $V^\\pi$ by playing whole episodes and averaging the return that followed each visit to a state; work a backward pass by hand, and tell first-visit from every-visit.',
      builds: ['averages', 'value-functions', 'discounting'],
      blocks: [
        { md: `Lesson 2.4 defined the value of a state as an expected return:

$$V^\\pi(s) = \\mathbb{E}_\\pi\\big[\\, G_t \\;\\big|\\; S_t = s \\,\\big]$$

"The average of the return $G_t$ over all the ways the future could go, starting from $s$ and following $\\pi$." Lesson 2.4 computed that average exactly, from \`P\`. Lesson 3.1 gave a way to compute an average **without** the probabilities: collect samples and average them.

Put the two together and you get the most direct learning method there is. Play an episode with the policy. Every time it passes through a state $s$, the return that followed, $G_t$, is **one sample** of $V^\\pi(s)$. Average the samples per state. By the law of large numbers the average closes in on $V^\\pi(s)$ as the samples pile up.

This is **Monte Carlo prediction**. "Prediction" because it predicts how well a fixed policy will do (it doesn't change the policy). "Monte Carlo" is the name for any method that estimates something by averaging random samples; it was coined in the 1940s by Stanislaw Ulam and John von Neumann, after the casino in Monaco, for simulations they ran on the first computers. Nothing more mysterious than that.` },
        { h: 'Step 1: play a whole episode and keep it' },
        { md: `A Monte Carlo learner can't do anything until an episode is over, because $G_t$ includes every reward to the end. So the first job is to play an episode and record it: for each move, the state it started in, the action and the reward.

\`play_episode\` takes the policy as a **function**, \`choose\`: give it a state, it returns an action. Passing a function as an argument is ordinary in Python, and it lets the same \`play_episode\` serve a random policy here and an ε-greedy one in lesson 3.7.` },
        {
          code: {
            file: 'montecarlo.py', fn: 'play_episode', notes: [
              ['episode = []', ['The record: one `(state, action, reward)` tuple per move, in order.']],
              ['state, info = env.reset(seed=seed)', ['Start a game. `seed=None` (every episode after the first) means: carry on with the world\'s own random numbers.']],
              ['done = False', ['Not over yet.']],
              ['while not done', ['One move per trip round the loop.']],
              ['action = choose(state)', ['Ask the policy. `choose` is whatever function the caller passed in: here it moves at random.']],
              ['next_state, reward, terminated, truncated, info = env.step(action)', ['One real move.']],
              ['episode.append((state, action, reward))', ['Write it down. Note the pairing: `reward` is $R_{t+1}$, the reward **for** the move made from `state`, so the tuple at index $t$ holds $S_t, A_t, R_{t+1}$.']],
              ['state = next_state', ['Move on.']],
              ['done = terminated or truncated', ['Stop for either reason.']],
              ['return episode', ['The whole game, ready to be learned from.']],
            ],
          },
        },
        { h: 'Step 2: the returns, worked out backwards' },
        { md: `Lesson 1.5's \`all_returns\` worked out $G_t$ for every $t$ by walking the rewards **backwards**, using

$$G_t = R_{t+1} + \\gamma\\, G_{t+1}, \\qquad G_T = 0 \\text{ after the last move.}$$

Monte Carlo does exactly that, and updates each state's average as it goes. Take one episode on the Tiny corridor (\`S...C\`, states 0 to 4, cheese +1 at state 4, every other move 0, γ = 0.95). The rat goes 0 → 1 → 0 → 1 → 2 → 3 → 4:

| t | state $S_t$ | move | $R_{t+1}$ | $G_t = R_{t+1} + 0.95\\,G_{t+1}$ |
|---|---|---|---|---|
| 5 | 3 | right | 1 | $1$ |
| 4 | 2 | right | 0 | $0.95$ |
| 3 | 1 | right | 0 | $0.9025$ |
| 2 | 0 | right | 0 | $0.857$ |
| 1 | 1 | left | 0 | $0.815$ |
| 0 | 0 | right | 0 | $0.774$ |

Read the table from the top: that is the order the code works in.` },
        { h: 'First visit or every visit?' },
        { md: `State 0 appears **twice** in that episode, at $t = 0$ and $t = 2$. Which returns count as its samples?

- **First-visit Monte Carlo** uses only the return after the **first** visit in each episode: $G_0 = 0.774$. Each episode then gives each state at most one sample, and those samples are independent of each other from one episode to the next, which makes the statistics simple: the estimate is an ordinary average of independent samples, so it is **unbiased** and its error shrinks like $1/\\sqrt{n}$.
- **Every-visit Monte Carlo** uses every visit: $G_0$ and $G_2$, average $0.816$. More samples per episode, but samples from the same episode are related (the later one is part of the earlier one). It also converges to $V^\\pi$; it is just harder to analyse.

Both are in use. \`mc_evaluate\` does first-visit by default and every-visit with \`first_visit=False\`.` },
        {
          predict: {
            prompt: 'First-visit Monte Carlo, all estimates starting at 0, step $1/n$. After this one corridor episode, what is the estimate for state 0?',
            answer: 0.95 ** 5, tolerance: 1e-6, compute: () => 0.95 ** 5,
            explain: 'The first visit to state 0 is at $t = 0$; the return after it is $G_0 = 0.95^5 = 0.774$ (five moves of 0, then the cheese). It is the first sample, $n = 1$, so the average **is** that sample: $0 + \\tfrac11(0.774 - 0) = 0.774$.',
            misconceptions: [{ answer: (0.95 ** 5 + 0.95 ** 3) / 2, tolerance: 1e-6, feedback: 'That averages both visits, $G_0$ and $G_2$: every-visit Monte Carlo. First-visit uses only $G_0$.' }],
          },
        },
        {
          predict: {
            prompt: 'Same episode, **every-visit** Monte Carlo. What is the estimate for state 1?',
            answer: (0.95 ** 4 + 0.95 ** 2) / 2, tolerance: 1e-6, compute: () => (0.95 ** 4 + 0.95 ** 2) / 2,
            explain: 'State 1 is visited at $t = 1$ ($G_1 = 0.95^4 = 0.815$) and $t = 3$ ($G_3 = 0.95^2 = 0.9025$). The backward pass meets $t = 3$ first: $0 + \\tfrac11(0.9025) = 0.9025$; then $t = 1$: $0.9025 + \\tfrac12(0.815 - 0.9025) = 0.859$, the average of the two.',
          },
        },
        { h: 'The code' },
        {
          code: {
            file: 'montecarlo.py', fn: 'mc_evaluate', notes: [
              ['rng = random.Random(seed)', ['The agent\'s random numbers: the policy being evaluated moves at random, as in lesson 2.4.']],
              ['V = np.zeros(env.n_states)', ['One estimate per state, all starting at 0.']],
              ['counts = np.zeros(env.n_states)', ['How many samples each state has had: the $n$ of the running mean $\\bar x \\leftarrow \\bar x + \\tfrac1n(x - \\bar x)$ (lesson 3.1). Each state needs its own $n$.']],
              ['for e in range(episodes)', ['One whole episode per trip round this loop.']],
              ['episode = play_episode(env, lambda state: rng.randrange(env.n_actions), seed if e == 0 else None)', ['Play and record a game. `lambda state: rng.randrange(env.n_actions)` is a function written in place: it takes a state and ignores it, returning a random action. That **is** the random policy, handed to `play_episode` as its `choose`.']],
              ['first = {}', ['A dictionary from state to the time of its first visit in this episode.']],
              ['for t, (state, action, reward) in enumerate(episode)', ['Forwards through the record. `enumerate` gives the index `t` beside each tuple, and `(state, action, reward)` unpacks the tuple into three names.']],
              ['first.setdefault(state, t)', ['`setdefault(key, value)` stores `value` only if `key` isn\'t there yet. So each state keeps the **first** `t` it was seen at; later visits change nothing.']],
              ['G = 0.0', ['The return after the last move: nothing comes after it.']],
              ['for t in reversed(range(len(episode)))', ['Backwards: $t = T-1, T-2, \\dots, 0$. Going backwards lets each $G_t$ be built from $G_{t+1}$ in one step.']],
              ['state, action, reward = episode[t]', ['$S_t$, $A_t$ and $R_{t+1}$.']],
              ['G = reward + gamma * G', ['$G_t = R_{t+1} + \\gamma G_{t+1}$: the line from lesson 1.5\'s `all_returns`. Before this line `G` held $G_{t+1}$; after it, $G_t$.']],
              ['if first_visit and first[state] < t', ['First-visit only: if this state was first seen **earlier** than $t$, this is a repeat visit. Skip it (the `continue` below). The return is still carried along in `G`; only the update is skipped.']],
              ['counts[state] += 1', ['One more sample for this state.']],
              ['step = 1 / counts[state] if alpha is None else alpha', ['The step size. With the default `alpha=None` it is $1/n$, the exact running mean. Given a number, it is a constant α (lesson 3.1), which favours recent samples.']],
              ['V[state] += step * (G - V[state])', ['The averaging rule with $G_t$ as the sample: $V(s) \\leftarrow V(s) + \\tfrac1n\\big(G_t - V(s)\\big)$. Every learning rule in this lab has this shape; only the sample changes.']],
              ['return V', ['The estimates.']],
            ],
          },
        },
        {
          mathCode: [
            ['V^\\pi(s) = \\mathbb{E}_\\pi[G_t \\mid S_t = s]', 'V[state]', 'what is being estimated: the average return from s'],
            ['G_t = R_{t+1} + \\gamma G_{t+1}', 'G = reward + gamma * G', 'each return built from the next, walking backwards'],
            ['n(s)', 'counts[state]', 'how many samples state s has had'],
            ['V(s) \\leftarrow V(s) + \\tfrac{1}{n(s)}\\big(G_t - V(s)\\big)', 'V[state] += step * (G - V[state])', 'the running mean of the returns'],
          ],
        },
        { figure: 'MCEvaluation', props: { map: 'cheese_and_cat' }, caption: 'Monte Carlo prediction of the random policy, beside the exact values. One episode at a time: the trail is the whole game, and the table is the backward pass with every update written out (greyed rows are repeat visits, skipped). Then run 1,000 episodes and compare the maps. Try every-visit, and a constant step.' },
        { md: `Two things to notice in the figure.

- **Nothing changes during an episode.** The map only updates once the game is over. On Cheese and cat a random game lasts about 34 moves on average, all of it played before anything is learned.
- **With step $1/n$ the error keeps falling.** It's an exact average of honest samples, so more episodes always help: about 0.25 after 10 episodes, 0.09 after 50 and 0.04 after 300 (averaged over ten seeds). With a constant step it levels off instead, jiggling with the latest samples, exactly as in lesson 3.1.

One caveat. Monte Carlo needs episodes that **end**. If the time limit cuts a game short, the last part of the return is simply missing, and the sample is a little too small. Here that is harmless: a random game on the corridor hits the 100-move limit about one time in twenty, and anything after move 100 is weighted by at most $0.95^{100} \\approx 0.006$. Lesson 3.7 shows a case where it is not harmless at all.` },
        { python: { program: 'mc', map: 'cheese_and_cat', label: 'Step through mc_evaluate in real Python' } },
        { md: `The Python tab starts from this entry point in \`experiments.py\`, the same pattern as lesson 3.9's:` },
        {
          code: {
            file: 'experiments.py', fn: 'evaluate_mc', notes: [
              ['def evaluate_mc(name="cheese_and_cat", **settings)', ['A map **name** in, plain values out, so it can be called as `evaluate_mc("corridor", episodes=100)`.']],
              ['env = GridWorld(name)', ['The world.']],
              ['V = mc_evaluate(env, **settings)', ['`**settings` passes on any of `mc_evaluate`\'s settings: `episodes`, `gamma`, `first_visit`, `alpha`, `seed`.']],
              ['return V', ['The estimates.']],
            ],
          },
        },
        { note: '**Monte Carlo prediction:** play whole episodes; after each one, walk it backwards computing $G_t = R_{t+1} + \\gamma G_{t+1}$, and average each state\'s returns: $V(s) \\leftarrow V(s) + \\tfrac1n(G_t - V(s))$. **First-visit** takes one sample per state per episode; **every-visit** takes them all. It needs no model and no guesses, only episodes that end.' },
      ],
    },

    {
      id: 'td-learning', number: '3.3', title: 'Temporal-difference learning: the TD target',
      goal: 'Estimate $V^\\pi$ from experience with TD(0): sample the Bellman equation, compute the **TD target** and **TD error**, and explain bootstrapping.',
      builds: ['monte-carlo', 'value-functions'],
      blocks: [
        { md: `Lesson 3.2 learned $V^\\pi(s)$ by averaging whole returns. That works, but it has to wait. There are two ways to get a sample of $V^\\pi(s)$:

1. **Wait for the whole return.** Play to the end of the episode and use $G_t$: Monte Carlo, lesson 3.2. Nothing is learned until the episode ends, and one $G_t$ carries every random event of the rest of the episode.
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
      id: 'mc-vs-td', number: '3.4', title: 'Monte Carlo against TD: noise against bias',
      goal: 'Explain what Monte Carlo and TD each average, why one sample is noisy and the other biased, and judge from measurements which learns faster, and when.',
      builds: ['monte-carlo', 'td-learning'],
      blocks: [
        { md: `Lessons 3.2 and 3.3 estimate the same thing, $V^\\pi(s)$, with the same averaging rule. The only difference is the **sample** each one averages:

| | Monte Carlo | TD(0) |
|---|---|---|
| sample | $G_t$, the whole real return | $r + \\gamma V(s')$, one real reward and a guess |
| learns | when the episode ends | after every move |
| average of the sample | exactly $V^\\pi(s)$ | $V^\\pi(s)$ only once $V(s')$ is right |
| luck it carries | every move to the end | one move |

Two words from statistics name the two weaknesses:

- **Variance** is how much a sample scatters around its average. $G_t$ has high variance: it adds up the luck of every remaining move, every random step towards or away from the cat.
- **Bias** is how far a sample's average is from the true value. $G_t$ has **none**: its average is $V^\\pi(s)$ by definition. TD's sample is biased, because $V(s')$ is the learner's own estimate, wrong at first (it starts at 0). The bias fades as the estimates improve, but it is there.` },
        { figure: 'SampleSpread', props: { map: 'cheese_and_cat' }, caption: '2,000 samples of each kind from the start state. To show TD at its best, its samples use the exact $V(s\')$, the value a fully trained TD learner would have. Both are centred on the true value; look at the widths. Try the frozen lake.' },
        {
          choice: {
            prompt: 'The figure shows TD\'s samples much narrower than Monte Carlo\'s. Does that mean a TD learner\'s estimates are always closer to the truth?',
            options: [
              { text: 'No: those TD samples used the exact V. A real learner\'s V(s′) starts at 0, so its samples are narrow but centred in the wrong place until V improves', why: 'Right. Narrow (low variance) is not the same as on target (no bias). Early on, TD is confidently wrong.' },
              { text: 'Yes: lower variance always means smaller error', why: 'Only if the samples are also centred on the truth. A learning TD agent\'s samples are not, at first.' },
              { text: 'No: Monte Carlo\'s samples are centred on the wrong value', why: 'Monte Carlo\'s samples are real returns: their average is exactly $V^\\pi(s)$. That is its strength.' },
            ],
            answer: 0,
          },
        },
        { h: 'Which learns faster? Measure it' },
        { figure: 'MCvsTD', props: { map: 'cheese_and_cat' }, caption: 'Each method learns the random policy\'s values from zero, ten times with seeds 0–9; the curves are the average error after each episode. Change α and the map, and run again.' },
        { md: `Measured on Cheese and cat, 300 episodes, seeds 0–9:

| method | error after 10 episodes | after 50 | after 300 |
|---|---|---|---|
| Monte Carlo, step $1/n$ | 0.25 | 0.09 | 0.04 |
| Monte Carlo, α = 0.05 | 0.45 | 0.15 | 0.06 |
| TD(0), α = 0.05 | 0.53 | 0.30 | 0.05 |

With the **same** step size, both effects show up:

- **Monte Carlo starts faster.** TD's early targets lean on values that are still 0, so the cheese's reward has to seep backwards one state per visit. That is the bias, slowing it down.
- **TD finishes lower.** Its samples scatter less, so a constant step jiggles its estimates less. That is the variance, and it costs Monte Carlo at the end.
- **Monte Carlo with $1/n$ wins outright here.** An exact average of unbiased samples never stops improving. The maps are small and the random games short, so its noise averages away quickly.

So on these maps, the textbook claim "TD learns faster" is not true. In Sutton and Barto's random-walk experiment (their Example 6.2) it is, and in large problems it usually is. Which one wins depends on how noisy the returns are and how fast the bias fades. That is why you measure.` },
        { h: 'Why TD is still the workhorse' },
        { md: `Even where Monte Carlo predicts as well, TD has advantages that settle most real choices:

- **It learns during the episode.** A Monte Carlo learner on a 500-move game learns nothing for 500 moves. In a **continuing** task that never ends (a thermostat, a server that schedules jobs), Monte Carlo can't learn at all.
- **It uses the structure of the problem.** After one success from state $s'$, TD passes that knowledge to every state that leads to $s'$, through $V(s')$. Monte Carlo has to see each one succeed for itself. Lesson 3.7 shows this deciding whether an agent learns anything at all.

And one advantage for Monte Carlo: it **doesn't bootstrap**, so it doesn't need the state to be Markov (lesson 2.2). TD's target assumes $V(s')$ sums up the whole future from $s'$, which is false if the rewards depend on history, as Classic QMaze's revisit penalty does. Monte Carlo just averages what really happened.

Between the two extremes there is a whole family: wait $n$ moves, then bootstrap ($r_1 + \\gamma r_2 + \\dots + \\gamma^n V(s_n)$). Small $n$ is TD-like, large $n$ is Monte Carlo-like. The A2C agent in Part 4 uses exactly this, with $n = 5$.` },
        {
          mathCode: [
            ['G_t', 'G = reward + gamma * G', 'Monte Carlo\'s sample: unbiased, high variance'],
            ['r + \\gamma V(s\')', 'reward + gamma * V[next_state]', 'TD\'s sample: low variance, biased while V is wrong'],
            ['V(s) \\leftarrow V(s) + \\alpha\\,(\\text{sample} - V(s))', 'V[state] += step * (G - V[state])', 'the same averaging rule for both'],
          ],
        },
        { note: '**Monte Carlo** averages real returns: **unbiased**, but **noisy** (high variance), and it must wait for the episode to end. **TD** averages one real reward plus its own guess: **less noisy**, but **biased** until the guesses are right, and it learns after every move. Neither wins everywhere; on these small maps Monte Carlo predicts at least as well.' },
      ],
    },

    {
      id: 'q-table', number: '3.5', title: 'The Q-table, and choosing from it',
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
      id: 'exploration', number: '3.6', title: 'Exploration: ε-greedy',
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
      id: 'mc-control', number: '3.7', title: 'Monte Carlo control: learning to act from whole games',
      goal: 'Turn Monte Carlo prediction into a learner that improves its own policy, follow every line of `train_mc_control`, and explain from measurements where waiting for the whole return works and where it fails.',
      builds: ['monte-carlo', 'mc-vs-td', 'exploration'],
      blocks: [
        { md: `Lesson 3.2 **predicted**: it measured how good a fixed policy is. Now the agent should **improve**. The ingredients are all here:

1. **Learn $Q$, not $V$** (lesson 3.5). To choose without \`P\`, the agent needs a value per state **and** action. Monte Carlo estimates it the same way: $Q^\\pi(s, a) = \\mathbb{E}_\\pi[G_t \\mid S_t = s, A_t = a]$, so average the returns that followed each **pair** $(s, a)$.
2. **Act on what you've learned.** Choose moves ε-greedily from the current $Q$ (lesson 3.6). As $Q$ improves, so does the policy.
3. **Keep exploring.** Monte Carlo only learns about pairs it actually tries. Without ε, a move that looked bad once would never be tried again, and never corrected.

Then repeat: play a game with the current policy, average its returns into $Q$, which changes the policy for the next game. Evaluating a little and improving a little, over and over, is called **generalized policy iteration**, and every control method in this lab works that way. This one is **Monte Carlo control**.

Because it averages returns of the ε-greedy policy it actually follows, exploring moves included, it is **on-policy**, like SARSA (lesson 3.10).` },
        {
          code: {
            file: 'montecarlo.py', fn: 'train_mc_control', notes: [
              ['rng = random.Random(seed)', ['The agent\'s random numbers: exploring and tie-breaking.']],
              ['Q = np.zeros((env.n_states, env.n_actions))', ['The Q-table, all zeros (lesson 3.5).']],
              ['counts = np.zeros((env.n_states, env.n_actions))', ['How many returns each pair $(s, a)$ has been given: one $n$ per table entry.']],
              ['totals = []', ['The return of each episode, for the learning curve.']],
              ['for e in range(episodes)', ['One whole game per trip round the loop.']],
              ['epsilon = linear(epsilon_start, epsilon_end, e / (0.8 * episodes))', ['This episode\'s ε, the same schedule as lesson 3.6.']],
              ['episode = play_episode(env, lambda state: epsilon_greedy(Q[state], epsilon, rng), seed if e == 0 else None)', ['Play a whole game ε-greedily from the **current** table. The `lambda` is the policy: given a state, explore or take the best move in `Q[state]`. It reads `Q` and `epsilon` as they are now, so each game uses the newest table. During the game the table does not change.']],
              ['first = {}', ['First visit of each pair in this game.']],
              ['for t, (state, action, reward) in enumerate(episode)', ['Forwards through the record.']],
              ['first.setdefault((state, action), t)', ['The key is now the pair `(state, action)`, a tuple. Tuples can be dictionary keys because they can\'t be changed.']],
              ['G = 0.0', ['Nothing after the last move.']],
              ['for t in reversed(range(len(episode)))', ['Backwards through the game.']],
              ['state, action, reward = episode[t]', ['$S_t$, $A_t$, $R_{t+1}$.']],
              ['G = reward + gamma * G', ['$G_t = R_{t+1} + \\gamma G_{t+1}$.']],
              ['if first[(state, action)] < t', ['A repeat of a pair already used earlier in this game: skip the update (first-visit). `G` still carries the return along.']],
              ['counts[state, action] += 1', ['One more return for this pair.']],
              ['step = 1 / counts[state, action] if alpha is None else alpha', ['$1/n$ for an exact average, or a constant α.']],
              ['Q[state, action] += step * (G - Q[state, action])', ['Move the pair\'s average towards the return that really followed it.']],
              ['total = 0.0', ['Add up the game\'s rewards (undiscounted) for the learning curve.']],
              ['for state, action, reward in episode', ['Every move of the game.']],
              ['total += reward', ['Python\'s `sum()` would do this too, but since Python 3.12 it adds floats with extra care, which can change the last digit; a plain loop gives the same total everywhere, including the browser\'s copy of this code.']],
              ['totals.append(total)', ['Record it.']],
              ['return Q, totals', ['The table and the learning curve.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'With step $1/n$: $Q[s, a] = -0.3$ is the average of 3 returns so far. A new game\'s return after $(s, a)$ is $G = -0.7$. What is the new $Q[s, a]$?',
            answer: -0.4, tolerance: 1e-9, compute: () => -0.3 + (1 / 4) * (-0.7 - -0.3),
            explain: 'This is the 4th return, so the step is $\\tfrac14$: $-0.3 + \\tfrac14(-0.7 + 0.3) = -0.4$. Check: three returns averaging $-0.3$ sum to $-0.9$; add $-0.7$ to get $-1.6$, and $-1.6 / 4 = -0.4$.',
            misconceptions: [{ answer: -0.3 + (1 / 3) * (-0.7 + 0.3), tolerance: 1e-9, feedback: 'The count goes up **before** the step: this is the 4th return, so the step is $\\tfrac14$, not $\\tfrac13$.' }],
          },
        },
        { figure: 'MCControlTrainer', props: { map: 'cheese_and_cat' }, caption: 'Monte Carlo control. Press One episode a few times: the agent plays a whole game, and only then does the table change, every pair it used at once. Then train all 300 episodes.' },
        { md: `On Cheese and cat it works: with the default settings, all five seeds 0–4 learn the shortest route, a greedy return of **0.80**, the same as Q-learning will. On the corridor and on Cats and cheese it matches Q-learning too.` },
        { h: 'The cliff: when waiting for the end fails' },
        { md: `Now switch the figure to **The cliff** (it uses lesson 3.11's settings: γ = 1, ε = 0.1 throughout, 500 episodes). Measured over seeds 0–4: two seeds learn the safe route (return −17), and **three never reach the goal at all**. Their greedy policy walks into a corner and bumps a wall until the 200-move time limit, return −200.

Seed 2's table shows why. Its greedy route goes up from the start to state 12, against the left wall, and there the four actions are worth

$$Q[12] = [-188.9,\\ -190.0,\\ -188.9,\\ -189.6]$$

All four are nearly the same, and all terrible. Whichever move the agent makes from state 12, it then goes back to bumping, and the game ends at the time limit having cost about one point per move. **The returns can't tell a good move from a bad one, because none of them ever reach the goal.** To learn that RIGHT is better, the agent would have to explore its way along the whole cliff to the goal by chance, with ε = 0.1, against its own greedy choice at almost every step. That almost never happens.

Lesson 3.4 said TD "uses the structure of the problem". Here is what that means. When Q-learning bumps the wall at state 12, its target is $-1 + \\max Q[12]$: the same state, one point poorer. So bumping keeps looking about a point worse than the best move from 12, and the agent soon tries something else. Q-learning learns from **each move's** result; Monte Carlo only learns from **where the whole game ended**, and here every game ends the same way.

Monte Carlo gets there eventually. With **5,000** episodes all five seeds find the goal (returns −17, −17, −15, −17, −19, the safe routes an on-policy learner prefers). Q-learning needs 500.` },
        {
          choice: {
            prompt: 'A Monte Carlo agent\'s greedy policy loops until the time limit. Why does averaging more returns not fix the loop quickly?',
            options: [
              { text: 'Every return after every action in the loop is about the same, because each game still ends at the time limit; only a long lucky run of exploring moves would produce a better one', why: 'Right. Monte Carlo can only prefer an action whose returns are better, and here none are, until exploration happens to reach the goal.' },
              { text: 'The step size 1/n becomes too small to change anything', why: 'It does shrink, but a constant step (try 0.1 or 0.5 in the figure) gets stuck just the same: the problem is that the samples themselves are all alike.' },
              { text: 'Monte Carlo cannot learn on maps with walls', why: 'It learns Cheese and cat, which has walls, perfectly. The trouble is games that never reach a reward.' },
            ],
            answer: 0,
          },
        },
        { h: 'Slippery ice: when the returns are noisy' },
        { md: `On the frozen lake (lesson 3.12) each move slips sideways two times in three, so returns are wildly random: the same first move ends at the goal or in a hole by luck. Lesson 3.4's spread figure put Monte Carlo's samples there at about **60 times** wider than TD's. Measured with 2,000 episodes and γ = 0.99, Monte Carlo control's greedy policies reach the goal in 6%, 33%, 12%, 26% and 5% of games over seeds 0–4. Q-learning with the same 2,000 episodes (α = 0.1) reaches it **72%** of the time on every seed, close to the best possible 74%.` },
        { md: `So the TD methods of the next lessons are not just a variation. Learning from each move's result, rather than the end of the game, is what makes them work where Monte Carlo stalls. Monte Carlo's ideas come back in Part 4: the A2C agent's critic is trained on returns that mix a few real rewards with a TD-style estimate.` },
        { python: { program: 'mc_control', map: 'cheese_and_cat', label: 'Step through train_mc_control in real Python' } },
        {
          code: {
            file: 'experiments.py', fn: 'learn_mc', notes: [
              ['def learn_mc(name="cheese_and_cat", **settings)', ['The Python tab\'s entry point for Monte Carlo control, like `learn_q`.']],
              ['env = GridWorld(name)', ['The world.']],
              ['Q, totals = train_mc_control(env, **settings)', ['Train with any of `train_mc_control`\'s settings.']],
              ['return Q, totals', ['The table and the learning curve.']],
            ],
          },
        },
        { note: '**Monte Carlo control:** play a whole game ε-greedily, then move each $Q(s, a)$ it used towards the return that followed: $Q(s,a) \\leftarrow Q(s,a) + \\tfrac1n(G_t - Q(s,a))$. It is on-policy and needs no model. It works when games reach their rewards, and stalls when they don\'t (the cliff\'s corner) or when returns are very noisy (the ice). Learning from each move instead is the next lesson.' },
      ],
    },

    {
      id: 'q-learning', number: '3.8', title: 'Q-learning',
      goal: 'Derive the Q-learning update from the Bellman optimality equation, follow every line of `train_q_learning`, and carry out updates by hand.',
      builds: ['mc-control', 'value-iteration'],
      blocks: [
        { md: `Monte Carlo control (lesson 3.7) waited for the end of each game and stalled when games didn't reach a reward. Q-learning does control the TD way, learning from every single move. Put the pieces together. Lesson 2.5's Bellman optimality equation says:

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
              ['Q = np.full((env.n_states, env.n_actions), initial_q)', ['The table, every entry `initial_q` (0.0 unless lesson 3.13 says otherwise).']],
              ['totals = []', ['The return of each episode, for the learning curve.']],
              ['for episode in range(episodes)', ['One trip round this loop is one whole game.']],
              ['epsilon = linear(epsilon_start, epsilon_end, episode / (0.8 * episodes))', ['This episode\'s ε (lesson 3.6).']],
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
        { md: `Notice what the target uses: $\\max_{a'} Q(s', a')$, the value of the **best** next move, even when the agent is about to explore and take a different one. Q-learning learns the value of acting greedily (the optimal policy) while actually behaving ε-greedily. Learning about one policy while following another is called **off-policy** learning. Lesson 3.10 meets an **on-policy** method, and lesson 3.11 shows when the difference matters.` },
        { figure: 'Trainer', props: { fixed: { map: 'cheese_and_cat' }, show: ['map', 'alpha', 'gamma', 'epsilon', 'episodes', 'seed'], view: 'q' }, caption: 'Q-learning on Cheese and cat. Train all 300 episodes: the result line compares the learned table with the exact $Q^*$ from value iteration.' },
        { python: { program: 'q', map: 'cheese_and_cat', label: 'Step through train_q_learning in real Python' } },
        { note: '**Q-learning:** $Q(s,a) \\leftarrow Q(s,a) + \\alpha[r + \\gamma \\max_{a\'} Q(s\',a\') - Q(s,a)]$, a sampled Bellman optimality backup. It is off-policy: it learns the greedy policy\'s values while exploring.' },
      ],
    },

    {
      id: 'reading-results', number: '3.9', title: 'Training, and judging what was learned',
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
            file: 'experiments.py', from: 1, to: 26, notes: [
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
      id: 'sarsa', number: '3.10', title: 'SARSA: learning the policy you follow',
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
      id: 'cliff', number: '3.11', title: 'The cliff: off-policy against on-policy',
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
      id: 'slippery-ice', number: '3.12', title: 'Slippery ice: learning when moves are random',
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
      id: 'reward-design', number: '3.13', title: 'Reward design, and why exploration is hard',
      goal: 'Diagnose an agent that settles for a worse reward, fix it with optimistic initial values, and judge reward rules such as QMaze\'s revisit penalty.',
      builds: ['cliff', 'markov-property'],
      blocks: [
        { md: `Cats and cheese has a small cheese (+0.3) two moves from the start and a big cheese (+1) ten moves away, past a cat. With γ = 0.95, value iteration says the big cheese is better (lesson 2.5). Now train Q-learning with the defaults and look at the greedy route.` },
        { figure: 'Trainer', props: { fixed: { map: 'cats_and_cheese' }, show: ['algorithm', 'initialQ', 'epsilon', 'episodes', 'seed'], view: 'policy' }, caption: 'Cats and cheese. Train with initial Q = 0, then with initial Q = 1. Then switch to SARSA and do both again.' },
        { md: `With a table of zeros, every seed settles on the **small** cheese. Here is why:

- Exploring at random from the start, the rat ends up on the small cheese or a cat most of the time; it reaches the big cheese rarely: in 10,000 random walks measured with this lab's engine, 103 times, about 1 in 100.
- Every visit to the small cheese makes $Q(\\text{start}, \\text{DOWN})$ more attractive. Once that's the best entry, greedy moves go there, and as ε falls the rat stops wandering far enough to learn the long route's value.

This is a **local optimum**: good enough to stop looking. It's the exploration problem of lesson 3.6 in its classic form.` },
        { h: 'Optimistic initial values' },
        { md: `A simple, old fix (Sutton and Barto, section 2.6): start the table **above** any value that can really be achieved. With \`initial_q = 1.0\`, every untried move looks wonderful. Each time a move is tried, its value drops towards the truth, so the greedy agent is drawn to whatever it hasn't tried yet. Exploration happens **systematically**, not by luck. With initial Q = 1, Q-learning finds the big cheese on all five seeds this lab tested.

Then switch to SARSA with initial Q = 1: it still takes the small cheese, on all five seeds. The big cheese sits right next to a cat, and the route passes another. SARSA learns the value of its ε-greedy behaviour, in which a random step into a cat is a real risk (lesson 3.11). Two things look alike here, "can't find the better reward" and "judges the better reward too risky", but they have different causes and different fixes.` },
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
