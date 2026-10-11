// Part 3: learning a table. The Q-table and greedy choice, ε-greedy, the TD target and the
// Q-learning update, the training loop, judging a learner, SARSA, and reading what the table learned.
import { BinnedCartPole } from '../engine/bins.js'
import { finish, qLearning, linear, qLearningUpdate } from '../../qmaze-lab/engine/tabular.js'
import { f, s, v, tf } from './util.js'

const trained = seed => finish(qLearning(new BinnedCartPole(), { episodes: 500, alpha: 0.1, gamma: 0.99, epsilonStart: 1, epsilonEnd: 0.01, initialQ: 0, seed }))
const mean = a => a.reduce((x, y) => x + y, 0) / a.length

export const PART3 = {
  id: 'part3', title: 'Part 3 · Learning a table', lessons: [
    {
      id: 'q-table', number: '3.1', title: 'The Q-table and the greedy choice',
      goal: 'Say what $Q(s, a)$ means, store it as a NumPy array, and pick the best action in a row, settling ties at random.',
      builds: ['state-number', 'return-discount'],
      blocks: [
        { md: `Here is the plan for learning. For every state $s$ and action $a$, keep a number

$$Q(s, a) \\approx \\text{the return you can expect if you take action } a \\text{ in state } s \\text{ and play well afterwards}$$

"Q" is for **quality**. If these numbers were right, playing well would be easy: in each state, take the action with the bigger $Q$. Learning means making them right, from experience.

With 72 states and 2 actions that is 144 numbers: a **table** with a row per state and a column per action, the **Q-table**. In Python it is a NumPy array:

\`\`\`python
Q = np.full((72, 2), 0.0)     # 72 rows, 2 columns, every entry 0.0
Q[29]                          # row 29: both actions' values, an array of 2
Q[29, 1]                       # one entry: the value of pushing right in state 29
Q[29].max()                    # the bigger of the two
\`\`\`

\`np.full(shape, value)\` makes an array of that shape filled with one value. Indexing with \`[row, column]\` picks one entry; with \`[row]\`, a whole row.` },
        { md: `The **greedy** choice is the action with the largest value in the row:

$$a^* = \\arg\\max_a Q(s, a)$$

($\\arg\\max$ means "the $a$ that gives the max", not the max itself.) At the start every entry is 0, so both actions tie, and it matters how ties are broken: always picking the first would make an untrained agent push left every time, and it would learn only about pushing left. So ties are settled **at random**.` },
        {
          code: {
            file: 'choosing.py', fn: 'greedy_action', notes: [
              ['best = max(q_row)', ['The largest value in the row. Python\'s `max` works on a NumPy row too.'], { tex: '\\max_a Q(s, a)', calc: x => [`max(${v(x.q_row)})`, Math.max(...x.q_row)] }],
              ['ties = [action for action in range(len(q_row)) if q_row[action] == best]', ['A list comprehension with a condition: every action whose value equals the best. Usually one action; at the start, both.'], { logic: 'Collect every action whose value is equal to the largest.', calc: x => [`actions with value ${f(Math.max(...x.q_row))} in ${v(x.q_row)}`, x.q_row.map((q, a) => q === Math.max(...x.q_row) ? a : -1).filter(a => a >= 0)] }],
              ['return rng.choice(ties)', ['`rng.choice(list)` picks one item at random. With one tie it is just that action.']],
            ],
          },
        },
        { figure: 'QRowFig', caption: 'Set a row\'s two values and press the button: equal values give a random push each time; unequal ones always the bigger.' },
        {
          choice: {
            prompt: 'Row 29 of the table is `[41.2, 39.8]`. What does that say?',
            options: [
              { text: 'In state 29, pushing left is expected to lead to a slightly larger return than pushing right', why: 'Yes: $Q(29, 0) = 41.2 > Q(29, 1) = 39.8$, so the greedy choice is left. "41" means about 41 more (discounted) steps of balancing are expected.' },
              { text: 'The agent has pushed left 41 times in state 29', why: 'Q-values are estimates of return, not counts.' },
              { text: 'Pushing right is better, because 39.8 is closer to 40', why: 'Bigger is better: these are expected returns.' },
              { text: 'State 29 is worth 81', why: 'A state\'s value is its best action\'s value, $\\max_a Q = 41.2$, not the sum.' },
            ],
            answer: 0,
          },
        },
        { note: 'The **Q-table** holds $Q(s, a)$, the expected return of action $a$ in state $s$: a NumPy array of shape (states, actions). The greedy action is $\\arg\\max_a Q(s, a)$, with ties settled at random.' },
      ],
    },

    {
      id: 'epsilon-greedy', number: '3.2', title: 'Exploring: ε-greedy',
      goal: 'Explain why an agent must sometimes act at random, implement ε-greedy, and lower ε over training with a linear schedule.',
      builds: ['q-table'],
      blocks: [
        { md: `An agent that always takes its current best action can get stuck. Early on its estimates are poor, perhaps "push left" in some state just happened to look slightly better once; if it never tries "push right" there again, it never finds out that right was better. To learn, it must sometimes **explore**: try something it doesn't currently think is best. And to do well, it must mostly **exploit**: use what it knows.

**ε-greedy** is the simplest balance: with a small probability $\\varepsilon$ (epsilon) act at random, otherwise act greedily.` },
        {
          code: {
            file: 'choosing.py', fn: 'epsilon_greedy', notes: [
              ['if rng.random() < epsilon:', ['`rng.random()` is a random float from 0 up to 1. It is below ε with probability exactly ε.'], { tex: 'P(\\text{explore}) = \\varepsilon', logic: 'Draw a random number between 0 and 1; if it is **below ε**, explore. So the smaller ε, the rarer exploring.' }],
              ['return rng.randrange(len(q_row))', ['Explore: any action, each equally likely (possibly the best one anyway).']],
              ['return greedy_action(q_row, rng)', ['Exploit: the best action, ties at random.']],
            ],
          },
        },
        { md: `At the start of training nothing is known, so explore a lot; by the end, hardly at all. The lab lowers $\\varepsilon$ in a straight line from 1.0 (all random) to 0.01 over the first 80% of the games, then keeps it there. \`linear\` does the sliding:

$$\\text{linear}(a, b, p) = a + (b - a)\\cdot\\min(p, 1)$$` },
        {
          code: {
            file: 'choosing.py', fn: 'linear', notes: [
              ['progress = min(progress, 1.0)', ['Past the end (progress above 1), stay at the end value.']],
              ['return start + (end - start) * progress', ['A straight line: `start` at progress 0, `end` at progress 1.'], { tex: 'a + (b - a)\\,p', calc: x => [`${f(x.start)} + (${f(x.end)} − ${f(x.start)}) × ${f(x.progress)}`, x.start + (x.end - x.start) * x.progress] }],
            ],
          },
        },
        { figure: 'EpsilonFig', props: { episodes: 500 }, caption: 'The schedule over 500 games. Training calls `linear(1.0, 0.01, episode / (0.8 * episodes))`.' },
        {
          predict: {
            prompt: 'Training runs 500 games with ε going from 1.0 to 0.01 over the first 80%. What is ε in game number 200 (that is, `episode = 200`)? (4 decimals)',
            answer: linear(1.0, 0.01, 200 / (0.8 * 500)), tolerance: 0.0001, compute: () => linear(1.0, 0.01, 200 / (0.8 * 500)),
            explain: 'progress $= 200 / 400 = 0.5$, so $\\varepsilon = 1 + (0.01 - 1) \\times 0.5 = 0.505$. Halfway down the slope.',
            misconceptions: [{ answer: 0.604, tolerance: 0.001, feedback: 'That uses progress $200/500 = 0.4$. The slope ends at 80% of the games, so progress is $200 / (0.8 \\times 500)$.' }],
          },
        },
        {
          choice: {
            prompt: 'With ε = 0.1 and two actions, how often does the agent take its best action?',
            options: [
              { text: '95% of the time', why: 'Yes: 90% greedy, plus half of the 10% random picks happen to choose the best action too: $0.9 + 0.1/2 = 0.95$.' },
              { text: '90% of the time', why: 'Exploring picks *any* action at random, including the best one, half the time with two actions.' },
              { text: '10% of the time', why: 'That is how often it explores.' },
              { text: 'Always, eventually', why: 'With ε fixed at 0.1 it keeps exploring for ever.' },
            ],
            answer: 0,
          },
        },
        { note: '**ε-greedy**: with probability ε a random action, otherwise the greedy one. Start ε high (explore), lower it as the table improves (exploit): here linearly from 1.0 to 0.01 over 80% of training.' },
      ],
    },

    {
      id: 'td-target', number: '3.3', title: 'The target and the Q-learning update',
      goal: 'Derive the Q-learning target from $G_t = R_{t+1} + \\gamma G_{t+1}$, compute a TD error and an update by hand, and treat a terminated move differently from a truncated one.',
      builds: ['epsilon-greedy'],
      blocks: [
        { md: `How should $Q(s, a)$ change after the agent pushes, gets reward $r$ and lands in state $s'$? Start from lesson 1.5's rule for returns:

$$G_t = R_{t+1} + \\gamma\\, G_{t+1}$$

The return from $(s, a)$ is this step's reward plus γ times the return from where it landed. We don't know that later return, but the table has an estimate: if the agent plays well from $s'$, its return is about $\\max_{a'} Q(s', a')$. So a better guess for $Q(s, a)$ is the **target**

$$\\text{target} = r + \\gamma \\max_{a'} Q(s', a')$$

It is better than the old $Q(s, a)$ because it contains one piece of **real** information, the reward $r$ that actually arrived. Estimating from an estimate like this is called **bootstrapping**.` },
        { md: `Don't jump all the way to the target (one move is a noisy sample: ε may have changed what happens next, and slots hide detail). Move a fraction $\\alpha$ (alpha, the **step size** or learning rate) of the way:

$$\\delta = \\text{target} - Q(s, a) \\qquad Q(s, a) \\leftarrow Q(s, a) + \\alpha\\,\\delta$$

$\\delta$ (delta) is the **TD error**: "temporal difference", the difference between what the table predicted and what one step later suggests. Positive: better than expected, raise the value. Negative: lower it.

One special case. If the move **terminated** the game (the pole fell), there is no future: the target is just $r$. If the game was only **truncated** (500 steps up), the pole didn't fall, the future was real; we just stopped watching. So a truncated move still adds $\\gamma \\max Q(s')$. Mixing these two up teaches the agent that surviving to step 500 is a disaster.` },
        {
          code: {
            file: 'qlearning.py', fn: 'q_learning_update', notes: [
              ['if terminated:', ['Did the game end because the agent failed?'], { logic: 'If the pole fell or the cart left the track, there is no future to add: the target is the reward alone. Otherwise (including a game cut off at 500 steps) add the discounted value of the best move from where it landed.' }],
              ['target = reward', ['No future after a fall.'], { tex: '\\text{target} = r' }],
              ['target = reward + gamma * Q[next_state].max()', ['`Q[next_state]` is the next state\'s row; `.max()` its best value.'], { tex: '\\text{target} = r + \\gamma \\max_{a\'} Q(s\', a\')', calc: x => [`${f(x.reward)} + ${f(x.gamma)} × max(${v(x.Q[x.next_state])})`, x.reward + x.gamma * Math.max(...x.Q[x.next_state])] }],
              ['td_error = target - Q[state, action]', ['How far off the table was.'], { tex: '\\delta = \\text{target} - Q(s, a)', calc: x => [`${f(x.target)} − ${f(x.Q[x.state][x.action])}`, x.target - x.Q[x.state][x.action]] }],
              ['Q[state, action] += alpha * td_error', ['Move the entry a fraction α of the way to the target. The array is changed **in place**: the caller\'s `Q` is the same object, so it sees the change.'], { tex: 'Q(s, a) \\leftarrow Q(s, a) + \\alpha\\,\\delta', calc: x => [`${f(x.Q[x.state][x.action])} + ${f(x.alpha)} × ${s(x.td_error)}`, x.Q[x.state][x.action] + x.alpha * x.td_error] }],
              ['return td_error', ['Handed back for anyone who wants to watch the errors shrink.']],
            ],
          },
        },
        { figure: 'TDUpdateFig', caption: 'Choose the numbers and see the update. Tick "terminated" and the future drops out of the target.' },
        {
          predict: {
            prompt: '$Q(s, a) = 20$, the move pays $r = 1$, the next state\'s row is $[30, 25]$, not terminated; $\\alpha = 0.1$, $\\gamma = 0.99$. What is the new $Q(s, a)$? (3 decimals)',
            answer: (() => { const Q = [[20, 0], [30, 25]]; qLearningUpdate(Q, 0, 0, 1, 1, false, 0.1, 0.99); return Q[0][0] })(), tolerance: 0.0005,
            compute: () => { const Q = [[20, 0], [30, 25]]; qLearningUpdate(Q, 0, 0, 1, 1, false, 0.1, 0.99); return Q[0][0] },
            explain: 'target $= 1 + 0.99 \\times 30 = 30.7$; $\\delta = 30.7 - 20 = 10.7$; new $= 20 + 0.1 \\times 10.7 = 21.07$.',
            misconceptions: [{ answer: 30.7, tolerance: 0.001, feedback: 'That is the target. The entry moves only $\\alpha = 10\\%$ of the way there.' }, { answer: 20.95, tolerance: 0.001, feedback: 'That uses 25, the value of the other action. Q-learning\'s target takes the **max** of the next row.' }],
          },
        },
        {
          mathCode: [
            ['Q(s, a)', 'Q[state, action]', 'one entry of the table'],
            ['\\max_{a\'} Q(s\', a\')', 'Q[next_state].max()', 'the best value from where the move landed'],
            ['r + \\gamma \\max_{a\'} Q(s\', a\')', 'reward + gamma * Q[next_state].max()', 'the target (not terminated)'],
            ['\\delta', 'td_error', 'target − old value'],
            ['Q \\leftarrow Q + \\alpha\\delta', 'Q[state, action] += alpha * td_error', 'the update'],
          ],
        },
        { note: 'The **Q-learning update**: $Q(s,a) \\leftarrow Q(s,a) + \\alpha\\,[\\,r + \\gamma \\max_{a\'} Q(s\',a\') - Q(s,a)\\,]$. The bracket is the TD error. A **terminated** move has target $r$ alone; a **truncated** one keeps the future.' },
      ],
    },

    {
      id: 'q-learning-loop', number: '3.4', title: 'Q-learning: the whole loop',
      goal: 'Read `train_q_learning` line by line as the agent–environment loop plus one update per move, and watch it learn CartPole.',
      builds: ['td-target', 'game-loop'],
      blocks: [
        { md: `Put the pieces together: the game loop of lesson 1.3, with the choice made ε-greedily from the table, and one update after every move. That is all of Q-learning.` },
        {
          code: {
            file: 'qlearning.py', fn: 'train_q_learning', notes: [
              ['def train_q_learning(env, episodes=500', ['The world and every setting, with defaults that work for CartPole. Note that the learner never imports CartPole: any world with `reset`, `step`, `n_states` and `n_actions` will do. QMaze Lab\'s grid worlds run through an identical function.']],
              ['rng = random.Random(seed)', ['The agent\'s own random numbers (for ε-greedy), seeded so a run can be repeated exactly.']],
              ['Q = np.full((env.n_states, env.n_actions), initial_q)', ['The table: 72 × 2, every entry 0.0.'], { calc: x => [`np.full((${x.env.n_states}, ${x.env.n_actions}), ${f(x.initial_q)})`, `${x.env.n_states} × ${x.env.n_actions} table`] }],
              ['totals = []', ['Each game\'s total reward: the learning curve.']],
              ['for episode in range(episodes):', ['One trip round this loop is one game.']],
              ['epsilon = linear(epsilon_start, epsilon_end, episode / (0.8 * episodes))', ['This game\'s ε, from the schedule of lesson 3.2.'], { calc: x => [`linear(${f(x.epsilon_start)}, ${f(x.epsilon_end)}, ${x.episode} / (0.8 × ${x.episodes}))`, linear(x.epsilon_start, x.epsilon_end, x.episode / (0.8 * x.episodes))] }],
              ['state, info = env.reset(seed=seed if episode == 0 else None)', ['Seed only the first game; after that the world\'s generator carries on, so every game starts somewhere new but the whole run is still repeatable.']],
              ['total = 0.0', ['This game\'s reward so far.']],
              ['done = False', ['Not over yet.']],
              ['while not done:', ['Move after move until the game ends.']],
              ['action = epsilon_greedy(Q[state], epsilon, rng)', ['**Choose** from this state\'s row.']],
              ['next_state, reward, terminated, truncated, info = env.step(action)', ['**Act**: the world answers. Note the name `next_state`: unlike lesson 1.3, the old state is still needed, for the update.']],
              ['q_learning_update(Q, state, action, reward, next_state, terminated, alpha, gamma)', ['**Learn**: one entry of the table moves towards its target. Only `terminated` is passed, not `truncated`: a game cut off at 500 steps keeps its future, as lesson 3.3 explained.']],
              ['total += reward', ['Count the step.']],
              ['state = next_state', ['Move on: the next state becomes the current one.']],
              ['done = terminated or truncated', ['Over either way.']],
              ['totals.append(total)', ['This game\'s length, for the curve.']],
              ['return Q, totals', ['The learned table and the learning curve.']],
            ],
          },
        },
        { figure: 'Trainer', props: { show: ['alpha', 'gamma', 'epsilon', 'episodes', 'seed'] }, caption: 'Press **One move** a few times and read each update. Then **One game**, then **Train all**. The same random numbers as the Python program, so seed 0 here is seed 0 there.' },
        {
          predict: {
            prompt: 'Train with the defaults (500 games, seed 0). What is the average length of the **last 100** training games? (1 decimal)',
            answer: mean(trained(0).totals.slice(-100)), tolerance: 0.05, compute: () => mean(trained(0).totals.slice(-100)),
            explain: 'About 498: nearly every one of the last 100 games reaches the 500-step limit, though ε is still 0.01. The first 100 averaged about 26. Pure trial and error, from "+1 per step" alone.',
          },
        },
        {
          predict: {
            prompt: 'After that training, what is the **largest** value anywhere in the table? (1 decimal) Lesson 1.5 said what it can\'t exceed.',
            answer: Math.max(...trained(0).Q.flat()), tolerance: 0.05, compute: () => Math.max(...trained(0).Q.flat()),
            explain: 'About 99.7, just under the ceiling $1/(1 - \\gamma) = 100$: a state from which the agent expects to keep balancing "for ever" (as far as γ = 0.99 can see). The table has learned returns, in the units of lesson 1.5.',
          },
        },
        { python: { program: 'q', label: 'Step through Q-learning in real Python, every update worked out' } },
        { note: '**Q-learning** = the game loop + ε-greedy choices from the table + one update per move towards $r + \\gamma \\max Q(s\')$. The learner knows nothing about CartPole: only states, actions and rewards.' },
      ],
    },

    {
      id: 'judging', number: '3.5', title: 'Judging a learner',
      goal: 'Judge a trained table fairly (greedy, on new games, over several seeds), and read a learner\'s result without fooling yourself.',
      builds: ['q-learning-loop'],
      blocks: [
        { md: `The training curve flatters: it was measured on the games used for learning, with a little exploring. To judge what was learned, play **new** games (different seeds from training), with **no** exploring: always the table's best push.` },
        {
          code: {
            file: 'evaluate.py', fn: 'greedy_lengths', notes: [
              ['rng = random.Random(seed)', ['Random numbers only for ties.']],
              ['lengths = []', ['One length per game.']],
              ['for game in range(games):', ['20 games…']],
              ['state, info = env.reset(seed=seed + game)', ['…from seeds 1000, 1001, …: starts training never used.']],
              ['total = 0.0', ['This game\'s length so far.']],
              ['done = False', ['The usual loop.']],
              ['while not done:', ['Until the game ends.']],
              ['action = greedy_action(Q[state], rng)', ['Greedy only: ε = 0.']],
              ['state, reward, terminated, truncated, info = env.step(action)', ['Play; no learning anywhere in this function.']],
              ['total += reward', ['Count.']],
              ['done = terminated or truncated', ['Over?']],
              ['lengths.append(total)', ['Keep it.']],
              ['return lengths', ['20 lengths.']],
            ],
          },
        },
        {
          code: {
            file: 'experiments.py', fn: 'learn_q', notes: [
              ['env = BinnedCartPole(counts, limits)', ['The binned world, with the slots given.']],
              ['Q, totals = train_q_learning(env, **settings)', ['`**settings` passes on every keyword the caller gave (`episodes=500, seed=0`) as if typed here.']],
              ['return Q, totals, greedy_lengths(Q, env)', ['The table, the curve, and the judgement.']],
            ],
          },
        },
        { md: `Now train with five different seeds. Same code, same settings; only the random numbers differ.` },
        { figure: 'SeedsFig', caption: 'Each cell: the average greedy game over 20 new games, and how the lost games ended.' },
        { md: `Measured: Q-learning reaches 500 in every test game for seeds 0, 3 and 4; seed 1 averages 495; seed 2 only **184**. Same algorithm, same settings. One run proves little: always try several seeds before believing a change helped.

And look at **how** the weaker tables lose: every lost game is **"cart off the track"**, none "pole fell". The tables balance the pole fine; they let the cart drift. Lesson 2.3 predicted exactly this: with slots $(1, 1, 6, 12)$ the table can't see the cart at all.` },
        {
          choice: {
            prompt: 'A change to α gives seed 0 an average greedy game of 500 instead of 480. What can you conclude?',
            options: [
              { text: 'Very little until it is tried on several seeds: one seed\'s difference can be luck', why: 'Yes. Seed-to-seed spread here is 184 to 500 with *no* change at all.' },
              { text: 'The new α is better', why: 'Maybe, but a single seed can\'t tell you; the spread between seeds is bigger than this difference.' },
              { text: 'The old α was wrong', why: 'Neither result says that without more runs.' },
              { text: 'Nothing: greedy games don\'t measure anything', why: 'They measure what the table learned, without exploring. They just need enough of them, over enough seeds.' },
            ],
            answer: 0,
          },
        },
        { note: 'Judge **greedily, on new games, over several seeds**. Training curves include exploring and reuse training games. Look at **why** games are lost, not only how long they last: here it shows the table\'s blind spot, the cart.' },
      ],
    },

    {
      id: 'sarsa', number: '3.6', title: 'SARSA',
      goal: 'Change Q-learning into SARSA by changing one line of the target, and explain on-policy versus off-policy.',
      builds: ['q-learning-loop'],
      blocks: [
        { md: `Q-learning's target assumes the agent will play **greedily** from the next state: $\\max_{a'} Q(s', a')$. But the agent doesn't; it explores with probability ε. **SARSA** uses the action it will *actually* take next:

$$\\text{target} = r + \\gamma\\, Q(s', a') \\qquad \\text{where } a' \\text{ is the next action really chosen}$$

The name is the five things one update uses: **S**tate, **A**ction, **R**eward, next **S**tate, next **A**ction.

- Q-learning is **off-policy**: it learns the value of the greedy policy while following an exploring one.
- SARSA is **on-policy**: it learns the value of the policy it is actually following, exploration included. That makes it more cautious where exploring is dangerous. (QMaze Lab's cliff shows this vividly; on CartPole, where one random push is rarely fatal, the two behave much alike.)

The code differs in one line of the update and in the order of choosing: SARSA must pick the next action **before** it can update.` },
        {
          code: {
            file: 'sarsa.py', fn: 'sarsa_update', notes: [
              ['if terminated:', ['As in Q-learning.'], { logic: 'If the game was lost, no future: target = reward. Otherwise add the discounted value of the move the agent has already chosen to make next.' }],
              ['target = reward', ['No future.']],
              ['target = reward + gamma * Q[next_state, next_action]', ['**The one difference**: the value of the action actually chosen next, not the best one.'], { tex: '\\text{target} = r + \\gamma\\,Q(s\', a\')', calc: x => [`${f(x.reward)} + ${f(x.gamma)} × Q[${x.next_state}, ${x.next_action}] = ${f(x.reward)} + ${f(x.gamma)} × ${f(x.Q[x.next_state][x.next_action])}`, x.reward + x.gamma * x.Q[x.next_state][x.next_action]] }],
              ['td_error = target - Q[state, action]', ['The TD error, as before.'], { calc: x => [`${f(x.target)} − ${f(x.Q[x.state][x.action])}`, x.target - x.Q[x.state][x.action]] }],
              ['Q[state, action] += alpha * td_error', ['The same step.'], { calc: x => [`${f(x.Q[x.state][x.action])} + ${f(x.alpha)} × ${s(x.td_error)}`, x.Q[x.state][x.action] + x.alpha * x.td_error] }],
              ['return td_error', ['As before.']],
            ],
          },
        },
        {
          code: {
            file: 'sarsa.py', fn: 'train_sarsa', notes: [
              ['rng = random.Random(seed)', ['As in Q-learning.']],
              ['Q = np.full((env.n_states, env.n_actions), initial_q)', ['The table.']],
              ['totals = []', ['The curve.']],
              ['for episode in range(episodes):', ['One game per trip.']],
              ['epsilon = linear(epsilon_start, epsilon_end, episode / (0.8 * episodes))', ['The same schedule.']],
              ['state, info = env.reset(seed=seed if episode == 0 else None)', ['Start a game.']],
              ['action = epsilon_greedy(Q[state], epsilon, rng)', ['**Choose the first action before the loop**: inside the loop, each action is chosen one step ahead.']],
              ['total = 0.0', ['Reward so far.']],
              ['done = False', ['Not over.']],
              ['while not done:', ['Each move:']],
              ['next_state, reward, terminated, truncated, info = env.step(action)', ['Act with the action already chosen.']],
              ['next_action = epsilon_greedy(Q[next_state], epsilon, rng)', ['Choose the **next** action now, ε-greedily, so the update can use it.']],
              ['sarsa_update(Q, state, action, reward, next_state, next_action, terminated, alpha, gamma)', ['Learn from (S, A, R, S′, A′).']],
              ['total += reward', ['Count.']],
              ['state, action = next_state, next_action', ['Move on, **and keep the chosen action**: it will be the one taken. Two names updated at once, by tuple unpacking.']],
              ['done = terminated or truncated', ['Over?']],
              ['totals.append(total)', ['The curve.']],
              ['return Q, totals', ['Table and curve.']],
            ],
          },
        },
        {
          code: {
            file: 'experiments.py', fn: 'learn_sarsa', notes: [
              ['env = BinnedCartPole(counts, limits)', ['The same binned world.']],
              ['Q, totals = train_sarsa(env, **settings)', ['SARSA instead of Q-learning.']],
              ['return Q, totals, greedy_lengths(Q, env)', ['Judged the same way.']],
            ],
          },
        },
        { figure: 'Trainer', props: { fixed: { algorithm: 'sarsa' }, show: ['algorithm', 'alpha', 'epsilon', 'episodes', 'seed'] }, caption: 'SARSA, one update at a time. Its card shows $Q(s\', a\')$ for the action already chosen, not the row\'s max.' },
        {
          choice: {
            prompt: 'The next row is $[30, 25]$ and the agent, exploring, has chosen action 1 next. What future value does each method put in its target?',
            options: [
              { text: 'Q-learning: γ × 30. SARSA: γ × 25', why: 'Yes. Q-learning uses the best value whatever is chosen; SARSA uses the value of the action it will really take.' },
              { text: 'Both: γ × 30', why: 'SARSA uses the chosen action\'s value, 25.' },
              { text: 'Both: γ × 25', why: 'Q-learning always uses the max, 30.' },
              { text: 'Q-learning: γ × 25. SARSA: γ × 30', why: 'The other way round.' },
            ],
            answer: 0,
          },
        },
        { python: { program: 'sarsa', label: 'Step through SARSA in real Python' } },
        { note: '**SARSA** targets $r + \\gamma Q(s\', a\')$ with the next action actually chosen: **on-policy**, valuing the exploring policy it follows. Q-learning targets $r + \\gamma \\max Q(s\')$: **off-policy**, valuing the greedy policy. One line of difference.' },
      ],
    },

    {
      id: 'reading-the-table', number: '3.7', title: 'What the table learned',
      goal: 'Compare a learned table with the hand-written rule, choose slots with evidence, and state the limits of tables.',
      builds: ['judging', 'what-slots-lose'],
      blocks: [
        { md: `A trained table is 144 numbers, but it is also a **policy**: in each row, the push with the larger value. Is it anything like the rule a person would write?` },
        { figure: 'TableVsRule', caption: 'Each row\'s preferred push after 500 games of Q-learning, coloured by whether "lean ahead" ($\\theta + 0.25\\dot\\theta > 0$) pushes the same way at the middle of that row.' },
        { md: `For seed 0, the table has a preference in 42 of its 72 rows, and in **37** of them it pushes as "lean ahead" does. The boundary between ← and → runs diagonally across the grid: lean left with enough rightward spin, and it pushes right; exactly the logic of "push where the pole is heading". It found that from "+1 per step" alone.

The rows where it never formed a preference are the extreme ones (pole far over, spinning fast): a good policy rarely visits them, so they are rarely updated. A table knows only what it has seen.` },
        { h: 'Choosing the slots' },
        { md: `Measured over five seeds (500 games of Q-learning each, judged on 20 new greedy games):

| Slots (x, ẋ, θ, θ̇) | Rows | Average greedy game, seeds 0–4 | How the lost games ended |
|---|---|---|---|
| 1, 1, 6, 12 (default) | 72 | 500, 495, 184, 500, 500 | all cart off the track |
| 1, 1, 3, 6 | 18 | 445, 445, 445, 129, 63 | coarser: both kinds |
| 1, 1, 12, 24 | 288 | 500, 372, 500, 500, 500 | cart off the track |
| 3, 3, 6, 12 | 648 | 500, 199, 155, 147, 500 | mostly the pole |

Giving the table the cart ($3 \\times 3$ slots for $x$ and $\\dot x$) should fix the drifting, and on two seeds it does; but nine times as many rows means each is learned from a ninth of the visits, and the pole starts falling instead. Even 3,000 games doesn't make it reliable (measured: 500, 205, 133, 500, 119). The table has no way to use what it learned in one row for the row next to it.` },
        { figure: 'Trainer', props: { fixed: { counts: [3, 3, 6, 12], episodes: 500 } }, caption: 'Try other slots. With $(3, 3, 6, 12)$ the table has 648 rows: watch how much of it stays empty.' },
        {
          choice: {
            prompt: 'What is the fundamental limit the slot experiments show?',
            options: [
              { text: 'A table learns each row separately: finer slots see more, but each row gets fewer updates, and nothing carries over between neighbouring rows', why: 'Yes. Tables can\'t **generalise**. Part 4 replaces the table by a function of the four real numbers, where one update changes the answer for every similar state at once.' },
              { text: 'Q-learning can\'t learn CartPole', why: 'It does, on most seeds: 500 steps every game. The limit is in how reliably and how the table scales.' },
              { text: 'CartPole needs more than two actions', why: 'Two pushes are enough; "lean ahead" proves it.' },
              { text: 'γ is too small', why: 'The values reach the ceiling 1/(1 − γ) = 100, about 2 seconds ahead; that is enough to balance.' },
            ],
            answer: 0,
          },
        },
        { note: 'The learned table is a policy, and it agrees with "lean ahead" in most rows it has an opinion on. But a table **can\'t generalise**: every row learns alone, so more detail needs much more experience. That is the reason for Part 4: functions instead of tables.' },
      ],
    },
  ],
}
