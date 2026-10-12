// Part 2: the MDP. The transition table, the Markov property, policies, value functions and the
// Bellman expectation equation, optimal values and value iteration, and the same worlds in
// Gymnasium. Predicted numbers are computed from the engine (lessons.test.js checks them).
import { GridWorld } from '../engine/gridworld.js'
import { valueIteration, evaluatePolicy } from '../engine/planning.js'
import { deterministicPolicy, epsilonGreedyPolicy } from '../engine/policies.js'

const stayProbability = (map, s, a) => new GridWorld(map).P[s][a].filter(o => o[1] === s).reduce((x, o) => x + o[0], 0)
const expectedReward = (map, s, a) => new GridWorld(map).P[s][a].reduce((x, [p, , r]) => x + p * r, 0)

export const PART2 = {
  id: 'part2', title: 'Part 2 · The MDP', lessons: [
    {
      id: 'transition-table', number: '2.1', title: 'The transition table P',
      goal: 'Read and build `P[s][a]`, the complete description of what every move does, including slippery moves that have several possible results; and say what a **Markov decision process** is.',
      builds: ['actions-and-moves', 'agent-environment-loop'],
      blocks: [
        { md: `So far each move had exactly one result: RIGHT from \`(0, 0)\` always lands on \`(0, 1)\`. On the frozen lake that isn't true. The ice is slippery: the elf moves the way it meant to only **one time in three**; the other two times it slides sideways, a quarter turn to the left or to the right of where it meant to go.

A world like that can't be described by a function that returns *one* next state. It needs, for every state and action, a **list of possible results, each with its probability**. Collected for all states and actions, that is the **transition table**, \`P\`:

$$P[s][a] = \\big[\\,(p_1, s'_1, r_1, \\text{end}_1),\\ (p_2, s'_2, r_2, \\text{end}_2),\\ \\dots\\big]$$

Each tuple says: "with probability $p$, the agent lands in $s'$, is paid $r$, and the episode ends or not". The probabilities in one list add up to 1, because *something* has to happen. ($s'$, "s prime", is the usual name for the next state.)

This is exactly the layout Gymnasium uses for its grid worlds (\`env.unwrapped.P\`), so everything here carries over (lesson 2.6).` },
        { figure: 'TransitionExplorer', props: { map: 'frozen_lake', maps: ['frozen_lake', 'cheese_and_cat', 'cliff', 'frozen_lake_8x8'], action: 2 }, caption: 'Pick a cell and an action. On ice, one action has three possible results; elsewhere, one. Press **Sample** to make the move 1,000 times the way `step()` does: the fractions come out close to the probabilities.' },
        { h: 'Building P' },
        {
          code: {
            file: 'gridworld.py', fn: 'build_transitions', notes: [
              ['side = (1 - self.intended) / 2', ['The probability of each sideways slide. On ice `intended` is 1/3, so `side` is (1 − 1/3) / 2 = 1/3. On every other map `intended` is 1.0 and `side` is 0.']],
              ['P = {}', ['An empty **dictionary**. It will map each state number to another dictionary, which maps each action to its list of outcomes: `P[state][action]`.']],
              ['for state in range(self.n_states)', ['Every state, walls included.']],
              ['P[state] = {}', ['The inner dictionary for this state.']],
              ['for action in range(self.n_actions)', ['Every action, 0 to 3.']],
              ['if self.is_end(state) or self.letter(state) == "#"', ['From an ending (or a wall, where nobody can be) nothing really happens: one outcome, stay put, reward 0, `terminated=True`. These rows exist only so that `P` has a row for every state; the learning code never uses them.']],
              ['P[state][action] = [(1.0, state, 0.0, True)]', ['That one outcome, as a list of one tuple.']],
              ['elif self.intended == 1.0', ['A normal map: one certain outcome.']],
              ['P[state][action] = [(1.0, *self.move(state, action))]', ['`self.move(state, action)` returns a triple `(next_state, reward, terminated)`. The `*` **unpacks** it into the tuple being built, so the result is the 4-tuple `(1.0, next_state, reward, terminated)`. A list of one.']],
              ['P[state][action] = [', ['On ice: a list of three outcomes.']],
              ['(side, *self.move(state, (action - 1) % 4))', ['Slide a quarter turn anticlockwise. `(action - 1) % 4` turns LEFT (0) into DOWN (3), because `%` in Python always gives a result from 0 to 3, even for −1.']],
              ['(self.intended, *self.move(state, action))', ['The move it meant: probability `intended`.']],
              ['(side, *self.move(state, (action + 1) % 4))', ['Slide a quarter turn clockwise: DOWN (3) becomes LEFT (0).']],
              ['return P', ['The whole table: `P[s][a]` for every `s` and `a`.']],
            ],
          },
        },
        {
          code: {
            file: 'gridworld.py', fn: 'is_end', notes: [
              ['return self.cells.get(self.letter(state), {}).get("end", False)', ['Two lookups chained. `self.cells.get(letter, {})` gives the cell\'s rules, or an empty dictionary for plain floor; then `.get("end", False)` gives its `"end"` value, or `False` when there is none. So: `True` only for cheese, cats, holes and goals.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'On the frozen lake the elf is on the start, state 0, the top-left corner. It chooses LEFT. What is the probability that it **ends up still in state 0**? (Use the figure if you like: choose ← left on the start cell.)',
            answer: 2 / 3, tolerance: 2e-3, compute: () => stayProbability('frozen_lake', 0, 0),
            explain: 'The three results: left (off the map: stays in 0), slide up (off the map: stays in 0), slide down (to state 4). Two of the three keep it in 0: probability $\\tfrac13 + \\tfrac13 = \\tfrac23$. Several tuples can lead to the same $s\'$; their probabilities add.',
            misconceptions: [{ answer: 1 / 3, tolerance: 2e-3, feedback: 'That counts only the intended move. The slide up also hits the edge and stays: add its probability too.' }],
          },
        },
        { h: 'Sampling one outcome: how step() picks' },
        { md: `\`step()\` (lesson 1.3) has to turn the list into one actual result. It draws a random number $u$ between 0 and 1 and subtracts each probability in turn until $u$ goes below 0:

- With outcomes of probability $\\tfrac13, \\tfrac13, \\tfrac13$: if $u = 0.5$, subtracting the first leaves $0.167$, subtracting the second leaves $-0.167 < 0$: the second outcome is picked.
- Each outcome owns a slice of $[0, 1)$ as wide as its probability, so it is picked with exactly that probability.

This is called **inverse transform sampling**. The figure's Sample button runs exactly this loop 1,000 times.` },
        { h: 'The formal definition: a Markov decision process' },
        { md: `Everything so far fits one mathematical object, a **Markov decision process** (MDP), made of five parts:

| Part | Meaning | In this lab |
|---|---|---|
| $\\mathcal{S}$ | the set of states | \`range(env.n_states)\` |
| $\\mathcal{A}$ | the set of actions | \`range(4)\`: left, up, right, down |
| $p(s', r \\mid s, a)$ | the probability of landing in $s'$ with reward $r$, after action $a$ in state $s$ | the tuples in \`env.P[s][a]\` |
| $\\gamma$ | the discount | \`gamma\` |
| $S_0$ | where episodes start | \`env.start\` |

The vertical bar in $p(s', r \\mid s, a)$ is read "given": the probability of $s'$ and $r$, **given** that the agent was in $s$ and chose $a$.

One quantity comes straight from $p$, and the next lessons use it constantly:

$$r(s, a) = \\sum_{s', r} p(s', r \\mid s, a)\\; r \\qquad \\text{(expected reward)}$$

The sum runs over every possible result; each reward is weighted by its probability. That is an **expected value**: the average you would get over many tries. In code it is \`sum(p * r for p, s2, r, t in env.P[s][a])\`.` },
        {
          predict: {
            prompt: 'On the frozen lake, state 14 is just left of the goal (state 15). What is the **expected reward** of choosing RIGHT there? Give a decimal.',
            answer: 1 / 3, tolerance: 2e-3, compute: () => expectedReward('frozen_lake', 14, 2),
            explain: 'Three outcomes, $\\tfrac13$ each: right into the goal (reward 1), slide up to state 10 (reward 0), slide down off the map, staying in 14 (reward 0). Expected reward $= \\tfrac13 \\cdot 1 + \\tfrac13 \\cdot 0 + \\tfrac13 \\cdot 0 = \\tfrac13$. Even right next to the goal, the elf reaches it only a third of the time.',
            misconceptions: [{ answer: 1, feedback: 'That is the reward when the move goes as intended, which happens only 1 time in 3. Weight each outcome\'s reward by its probability.' }],
          },
        },
        {
          choice: {
            prompt: 'On Cheese and cat (no ice), how many tuples does every list `P[s][a]` have, for a floor state `s`?',
            options: [
              { text: 'Exactly one, with probability 1.0', why: 'Right: `intended` is 1.0, so `build_transitions` takes the `elif` branch and makes a list of one certain outcome. A world like this is called **deterministic**.' },
              { text: 'Three, with probability 1/3 each', why: 'Only on ice (`intended` < 1). Cheese and cat has no `"intended"` key, so it is 1.0.' },
              { text: 'Four, one per action', why: 'Each list belongs to one action already. There are four *lists* per state, one per action, each with one tuple here.' },
            ],
            answer: 0,
          },
        },
        { note: '`P[s][a]` is a list of `(probability, next_state, reward, terminated)`: the whole truth about the world. An MDP is states, actions, these probabilities, a discount and a start. The agents of Part 3 never see `P`; they only experience samples of it, one `step()` at a time.' },
      ],
    },

    {
      id: 'markov-property', number: '2.2', title: 'The Markov property',
      goal: 'Say what makes a state a good state (it carries everything that matters for the future), and recognise when a reward or a rule breaks that.',
      builds: ['transition-table'],
      blocks: [
        { md: `An MDP is called **Markov** (after the mathematician Andrey Markov) because of one assumption hidden in $p(s', r \\mid s, a)$: what happens next depends **only on the current state and action**, not on how the agent got there.

$$P(S_{t+1}, R_{t+1} \\mid S_t, A_t) = P(S_{t+1}, R_{t+1} \\mid S_0, A_0, \\dots, S_t, A_t)$$

Read it as: knowing the whole history (the right-hand side) tells you nothing more than knowing the present state and action (the left-hand side). The state is a complete summary.

This is what lets the agent learn a table with one row per state: if the state didn't carry everything that matters, two visits to the "same" row could really be different situations, and the row would have to learn one value for both.` },
        { h: 'Classic QMaze breaks it' },
        { md: `The QMaze tutorial's rewards include **−0.25 for going back into a cell already visited this episode**. That rule looks at \`visited\`, the set of cells seen so far: the history. So the reward for the very same state and action can differ:` },
        { figure: 'HistoryMatters', caption: 'Both histories end with the rat in state 12 moving LEFT into state 11. History A was already in 11, so it pays −0.25; history B wasn\'t, so it pays the normal −0.04.' },
        { md: `That's why \`P\` (built from \`move()\`, which knows nothing about history) can't contain the revisit rule, and why \`step()\` applies it separately (lesson 1.3). Strictly, Classic QMaze with that rule is **not an MDP over cell numbers**.

There are two ways out, and both teach something:

1. **Put the history into the state.** The state would be (cell, set of visited cells). Classic QMaze has 74 floor cells, so there are up to $74 \\cdot 2^{74}$ such states: about $10^{24}$. No table could hold that. Making the state bigger fixes the Markov property but can make learning hopeless.
2. **Accept an approximation.** Learn on cell numbers anyway. The table then learns a kind of average over histories. It usually still works here, because the revisit penalty is small and mostly pushes the rat onwards, but the guarantees of Part 3 no longer strictly apply.

Lesson 3.13 trains on Classic QMaze with and without the rule.` },
        {
          choice: {
            prompt: 'Which of these would also break the Markov property if the state were only the cell number?',
            options: [
              { text: 'A door that opens after the agent has stepped on a switch somewhere else', why: 'Right: whether the door is open depends on the history (was the switch pressed?). The fix is the usual one: add "switch pressed: yes/no" to the state, which only doubles the number of states.' },
              { text: 'Slippery ice', why: 'Slipping is random, but its probabilities depend only on the current cell and action. Random is fine; depending on the past is not. The frozen lake is a perfectly good MDP.' },
              { text: 'A cliff that sends the agent back to the start', why: 'Where it lands depends only on the cell it stepped into: Markov.' },
              { text: 'A step cost of −1 on every move', why: 'The same for every state and action at every time: Markov.' },
            ],
            answer: 0,
          },
        },
        { md: `One more subtle case: the **time limit**. After \`max_steps\` moves the episode is truncated, so strictly the number of steps taken matters too, and it isn't in the state. The standard way to handle this (and this lab's) is to treat the time limit as *not part of the task*: when an episode is cut off, learning pretends the world would have gone on. That is exactly why \`truncated\` and \`terminated\` must be kept apart (lesson 1.3): only \`terminated\` means "the future is worth 0".` },
        { note: 'A state is **Markov** when it contains everything about the past that matters for the future. Randomness is allowed; dependence on history is not. If something important is missing, add it to the state, as long as the state stays small enough to learn.' },
      ],
    },

    {
      id: 'policies', number: '2.3', title: 'Policies: the agent\'s rule for choosing',
      goal: 'Write a policy as an array of actions and as a table of probabilities π(a|s), and compute ε-greedy\'s probabilities exactly, ties included.',
      builds: ['transition-table'],
      blocks: [
        { md: `A **policy** is the agent's rule for choosing: for every state, which action. It is written $\\pi$ (the Greek letter pi; nothing to do with 3.14 here).

The simplest kind is **deterministic**: one action per state. In code that is just a list with one action number per state, \`policy[s]\`. On the map it is one arrow per cell:` },
        { figure: 'PolicyEditor', props: { map: 'cheese_and_cat' }, caption: 'Every cell starts pointing right. Click cells to turn their arrows until the orange line reaches the cheese. Can you make a policy that walks into the cat? One that loops forever?' },
        { md: `A **stochastic** (random) policy gives a probability for every action in every state: $\\pi(a \\mid s)$, "the probability of choosing $a$, given state $s$". In code that is a table with one row per state and one column per action, each row adding up to 1. A deterministic policy is the special case where each row has a single 1:` },
        {
          code: {
            file: 'policies.py', fn: 'deterministic_policy', notes: [
              ['table = np.zeros((len(actions), n_actions))', ['A NumPy **array** of zeros, with shape `(n_states, 4)`: one row per state, one column per action. NumPy arrays are tables of numbers that Python can index with two numbers at once, `table[row, col]`.']],
              ['for state, action in enumerate(actions)', ['Each state with its chosen action.']],
              ['table[state, action] = 1.0', ['Probability 1 for the chosen action; the other three stay 0.']],
              ['return table', ['The `(n_states, 4)` table.']],
            ],
          },
        },
        {
          code: {
            file: 'policies.py', fn: 'uniform_policy', notes: [
              ['return np.full((n_states, n_actions), 1.0 / n_actions)', ['`np.full(shape, value)` makes an array of that shape with every entry equal to `value`. Here every action has probability 1/4 in every state: the **uniform random policy**, which is what the random agent of lesson 1.3 follows.']],
            ],
          },
        },
        { h: 'ε-greedy as a probability table' },
        { md: `Part 3's agents use **ε-greedy**: with probability ε (epsilon, a small number such as 0.1) pick any action at random; otherwise pick the best one. That is a stochastic policy, and its probabilities can be worked out exactly. With $|\\mathcal{A}| = 4$ actions:

- The random branch happens with probability $\\varepsilon$ and then picks each action with probability $\\tfrac14$: every action gets $\\varepsilon / 4$ from it.
- The greedy branch happens with probability $1 - \\varepsilon$ and picks the best action. If several actions **tie** for best, \`greedy_action\` picks one of them at random, so they share $1 - \\varepsilon$ equally.

$$\\pi(a \\mid s) = \\frac{\\varepsilon}{|\\mathcal{A}|} + \\begin{cases} \\dfrac{1 - \\varepsilon}{k} & \\text{if } a \\text{ is one of the } k \\text{ best actions} \\\\ 0 & \\text{otherwise} \\end{cases}$$` },
        {
          code: {
            file: 'policies.py', fn: 'epsilon_greedy_policy', notes: [
              ['n_states, n_actions = Q.shape', ['`.shape` is a tuple of the array\'s sizes: `(16, 4)` for Cheese and cat. Unpacked into two ints.']],
              ['table = np.full((n_states, n_actions), epsilon / n_actions)', ['Start every entry at $\\varepsilon / |\\mathcal{A}|$: the random branch\'s share.']],
              ['for state in range(n_states)', ['Row by row: the greedy share depends on each row\'s own best actions.']],
              ['best = Q[state].max()', ['`Q[state]` is one row (4 numbers); `.max()` is its largest value.']],
              ['ties = [action for action in range(n_actions) if Q[state, action] == best]', ['A **list comprehension**: every action whose value equals the best. Usually one; several when values tie (for example a fresh table of zeros, where all 4 tie).']],
              ['for action in ties', ['Each tied action gets an equal part of the greedy share.']],
              ['table[state, action] += (1.0 - epsilon) / len(ties)', ['The greedy branch\'s share, $1 - \\varepsilon$, split equally between the tied actions.']],
              ['return table', ['Every row adds up to 1: $4 \\cdot \\varepsilon/4 + (1 - \\varepsilon) = 1$.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'With ε = 0.1, four actions and one clear best action, what is the probability that ε-greedy picks the best action?',
            answer: 0.925, tolerance: 1e-9, compute: () => epsilonGreedyPolicy([[0, 1, 0, 0]], 0.1)[0][1],
            explain: '$\\varepsilon / 4 + (1 - \\varepsilon) = 0.025 + 0.9 = 0.925$. The best action can also be picked by the random branch, which is why it is a bit more than 0.9.',
            misconceptions: [{ answer: 0.9, feedback: 'That is only the greedy branch. The random branch picks the best action too, a quarter of the time it runs: add $0.1 / 4$.' }],
          },
        },
        {
          predict: {
            prompt: 'Same ε = 0.1, but now **two** actions tie for best. What is the probability of each of them?',
            answer: 0.475, tolerance: 1e-9, compute: () => epsilonGreedyPolicy([[0, 2, 2, 1]], 0.1)[0][1],
            explain: '$0.025 + 0.9 / 2 = 0.475$. And each of the other two gets just $0.025$. Check: $2 \\cdot 0.475 + 2 \\cdot 0.025 = 1$.',
          },
        },
        { note: 'A policy $\\pi(a \\mid s)$ is a table of probabilities, one row per state. Deterministic policies are one-hot rows; the random policy is all $\\tfrac14$; ε-greedy is $\\varepsilon/4$ everywhere plus $1 - \\varepsilon$ shared among the best actions.' },
      ],
    },

    {
      id: 'value-functions', number: '2.4', title: 'Value functions and the Bellman equation',
      goal: 'Define $V^\\pi(s)$ and $Q^\\pi(s, a)$, derive the Bellman expectation equation from $G_t = R_{t+1} + \\gamma G_{t+1}$, and compute $V^\\pi$ by repeated sweeps.',
      builds: ['policies', 'discounting'],
      blocks: [
        { md: `How good is it to be in a state? It depends on what the agent will do from there: on its policy. The **value** of a state under a policy is the return the agent can expect, starting there and following the policy:

$$V^\\pi(s) = \\mathbb{E}_\\pi\\big[\\, G_t \\mid S_t = s \\,\\big]$$

$\\mathbb{E}$ means **expected value**: the average over every way the future could go, each weighted by its probability. (One die roll: $\\mathbb{E} = \\tfrac16(1 + 2 + \\dots + 6) = 3.5$.) Here the future is random because the policy may be random and the world may be (ice).

The value of an **action** is the same, but committing to action $a$ first and following the policy afterwards:

$$Q^\\pi(s, a) = \\mathbb{E}_\\pi\\big[\\, G_t \\mid S_t = s, A_t = a \\,\\big]$$

$V$ answers "how good is this place?" and $Q$ answers "how good is this move from this place?". The agents of Part 3 learn $Q$, because to choose you need to compare moves.` },
        { h: 'Deriving the Bellman equation' },
        { md: `Start from the recursion of lesson 1.5, $G_t = R_{t+1} + \\gamma G_{t+1}$, and take expected values of both sides, starting in state $s$:

$$V^\\pi(s) = \\mathbb{E}_\\pi\\big[R_{t+1} + \\gamma\\, G_{t+1} \\mid S_t = s\\big]$$

Work out that average in two stages, in the order things happen:

1. **The agent chooses** $a$ with probability $\\pi(a \\mid s)$.
2. **The world answers** with $s'$ and $r$, with probability $p(s', r \\mid s, a)$.

After that, the agent is in $s'$, and the expected rest of the return from there is, by definition, $V^\\pi(s')$. So:

$$V^\\pi(s) = \\sum_{a} \\pi(a \\mid s) \\sum_{s', r} p(s', r \\mid s, a)\\,\\big[\\, r + \\gamma\\, V^\\pi(s') \\,\\big]$$

This is the **Bellman expectation equation** (Richard Bellman, 1957). The inner sum is exactly $Q^\\pi(s, a)$:

$$Q^\\pi(s, a) = \\sum_{s', r} p(s', r \\mid s, a)\\,\\big[\\, r + \\gamma\\, V^\\pi(s') \\,\\big], \\qquad V^\\pi(s) = \\sum_a \\pi(a \\mid s)\\, Q^\\pi(s, a)$$

One special case: if the move ends the episode, nothing comes after it, so the future term is 0. (That is $V(\\text{terminal}) = 0$.)

The equation says the value of a state is "the average, over what I do and what happens, of the reward now plus the discounted value of where I land". It links every state's value to its neighbours' values.` },
        {
          code: {
            file: 'planning.py', fn: 'q_from_v', notes: [
              ['q = np.zeros(len(P[state]))', ['One running sum per action: `q[a]` will be $Q(s, a)$.']],
              ['for action, outcomes in P[state].items()', ['`.items()` gives each key with its value: every action with its list of outcomes.']],
              ['for probability, next_state, reward, terminated in outcomes', ['The inner $\\sum_{s\', r}$: one tuple per possible result.']],
              ['future = 0.0 if terminated else gamma * V[next_state]', ['$\\gamma V(s\')$, or 0 if the episode ends: nothing comes after an ending. A **conditional expression**: `x if condition else y`.']],
              ['q[action] += probability * (reward + future)', ['Adds $p \\cdot [r + \\gamma V(s\')]$ for this outcome. When the loop ends, `q[action]` is the whole inner sum.']],
              ['return q', ['An array of 4 values: $Q(s, a)$ for each action, computed from the current guesses `V`.']],
            ],
          },
        },
        { h: 'Solving it: sweep until nothing changes' },
        { md: `The Bellman equation has $V^\\pi$ on both sides, so it isn't a formula you can just evaluate: it is a system of equations, one per state. The classic way to solve it is to **iterate**: start with any guess (all zeros), then repeatedly replace each state's value by the right-hand side computed from the current guesses. Each pass over all states is a **sweep**. The values settle down, and once no state changes any more, they satisfy the equation: they *are* $V^\\pi$. This is **iterative policy evaluation**.` },
        {
          code: {
            file: 'planning.py', fn: 'evaluate_policy', notes: [
              ['V = np.zeros(len(P))', ['The first guess: every state worth 0.']],
              ['for sweep in range(max_sweeps)', ['At most `max_sweeps` passes, as a safety net.']],
              ['biggest_change = 0.0', ['Tracks how much the values moved in this sweep.']],
              ['for state in range(len(P))', ['Every state in turn.']],
              ['new_value = np.dot(policy[state], q_from_v(P, V, state, gamma))', ['$\\sum_a \\pi(a|s)\\, Q(s, a)$. `np.dot` multiplies two arrays entry by entry and adds up: `np.dot([0.25]*4, q)` is the average of the four `q` values.']],
              ['biggest_change = max(biggest_change, abs(new_value - V[state]))', ['How far this state moved; keep the largest.']],
              ['V[state] = new_value', ['Updated **in place**: states later in the same sweep already use this new value. (Using only the old values also works; in-place usually settles faster.)']],
              ['if biggest_change < theta', ['Converged: nothing moved by more than `theta` ($10^{-10}$).']],
              ['return V, sweep + 1', ['The values, and how many sweeps it took.']],
            ],
          },
        },
        {
          mathCode: [
            ['V^\\pi(s)', 'V[state]', 'the value of a state under the policy'],
            ['\\pi(a \\mid s)', 'policy[state][action]', 'probability the policy picks $a$ in $s$'],
            ['p(s\', r \\mid s, a)', 'probability in P[state][action]', 'probability of that outcome'],
            ['\\sum_{s\',r} p\\,[r + \\gamma V(s\')]', 'for ... in outcomes: q[action] += probability * (reward + future)', '$Q(s, a)$: `q_from_v`'],
            ['\\sum_a \\pi(a|s)\\, Q(s, a)', 'np.dot(policy[state], q)', 'the new $V(s)$'],
          ],
        },
        { figure: 'Sweeps', props: { map: 'cheese_and_cat', maps: ['cheese_and_cat', 'corridor', 'cliff', 'frozen_lake'], mode: 'evaluate', policy: 'random' }, caption: 'Policy evaluation for the **random** policy. Press One sweep and watch the values spread out from the cheese and the cat. Click a cell to see its backup with the current numbers.' },
        { md: `What the random policy's values say: on Cheese and cat, the start is worth about −0.71. Moving at random, the rat often wanders into the cat and pays steps for a long time; on average it loses. Values are always **relative to a policy**: the same start is worth +0.59 to an agent that walks straight to the cheese (next lesson).` },
        {
          predict: {
            prompt: 'Tiny corridor (`S...C`, steps free, cheese +1), with γ = 0.9 and the policy "always RIGHT". What is $V^\\pi$ of the start? (The cheese is 4 moves away.)',
            answer: 0.729, tolerance: 1e-6, compute: () => evaluatePolicy(new GridWorld('corridor').P, deterministicPolicy(new Array(5).fill(2)), 0.9).V[0],
            explain: 'Rewards 0, 0, 0, 1, so $G_0 = 0.9^3 \\cdot 1 = 0.729$. With a deterministic policy in a deterministic world there is only one possible future, so the expected return is that return. By the Bellman equation, state by state from the cheese back: 1, 0.9, 0.81, 0.729.',
            misconceptions: [{ answer: 0.6561, feedback: 'That is $0.9^4$. The fourth reward is discounted three times, not four: the first reward gets $\\gamma^0$.' }],
          },
        },
        { note: '$V^\\pi(s)$ is the expected return from $s$ following $\\pi$; $Q^\\pi(s,a)$ is the same after first taking $a$. The **Bellman expectation equation** writes each value in terms of the next states\' values, and sweeping it until nothing changes computes $V^\\pi$ exactly, if you know $P$.' },
      ],
    },

    {
      id: 'value-iteration', number: '2.5', title: 'The best policy: optimal values and value iteration',
      goal: 'Define $V^*$ and $Q^*$, derive the Bellman optimality equation, compute both by value iteration, and read the optimal policy off $Q^*$.',
      builds: ['value-functions'],
      blocks: [
        { md: `Some policies are better than others. The **optimal** value of a state is the best value any policy can achieve there:

$$V^*(s) = \\max_\\pi V^\\pi(s), \\qquad Q^*(s, a) = \\max_\\pi Q^\\pi(s, a)$$

There is always at least one policy that is best in **every** state at once, and it is easy to describe once you have $Q^*$: in each state, take an action with the largest $Q^*$.

$$\\pi^*(s) = \\arg\\max_a Q^*(s, a)$$

($\\arg\\max_a$ means "the $a$ that makes it largest", not the largest value itself.)` },
        { h: 'The Bellman optimality equation' },
        { md: `If the agent acts optimally from the next step on, the best it can do from $s$ is to pick the action whose expected "reward now + discounted optimal value after" is largest. The average over actions in the expectation equation becomes a **max**:

$$V^*(s) = \\max_a \\sum_{s', r} p(s', r \\mid s, a)\\,\\big[\\, r + \\gamma\\, V^*(s') \\,\\big]$$

And since $V^*(s') = \\max_{a'} Q^*(s', a')$, the same thing for $Q^*$:

$$Q^*(s, a) = \\sum_{s', r} p(s', r \\mid s, a)\\,\\big[\\, r + \\gamma\\, \\max_{a'} Q^*(s', a') \\,\\big]$$

Remember this last equation. Q-learning (lesson 3.8) is nothing more than a way of solving it **without knowing $p$**.` },
        {
          code: {
            file: 'planning.py', fn: 'value_iteration', notes: [
              ['V = np.zeros(len(P))', ['Start from all zeros, as before.']],
              ['for sweep in range(max_sweeps)', ['Sweeps, exactly as in `evaluate_policy`.']],
              ['biggest_change = 0.0', ['Largest change in this sweep.']],
              ['for state in range(len(P))', ['Every state in turn.']],
              ['new_value = q_from_v(P, V, state, gamma).max()', ['The only change from `evaluate_policy`: the best action\'s value, $\\max_a Q(s,a)$, instead of the policy\'s weighted average.']],
              ['biggest_change = max(biggest_change, abs(new_value - V[state]))', ['Track the largest change.']],
              ['V[state] = new_value', ['In place, as before.']],
              ['if biggest_change < theta', ['Stop when no value moved by more than $10^{-10}$: $V$ now satisfies the optimality equation to that precision.']],
              ['Q = np.array([q_from_v(P, V, state, gamma) for state in range(len(P))])', ['Once $V^*$ has settled, one more backup per state gives $Q^*$: an array of shape `(n_states, 4)`.']],
              ['return V, Q, sweep + 1', ['$V^*$, $Q^*$, and the number of sweeps.']],
            ],
          },
        },
        {
          code: {
            file: 'planning.py', fn: 'greedy_policy', notes: [
              ['return Q.argmax(axis=1)', ['`argmax(axis=1)` looks along each **row** (axis 1 is the column direction) and gives the column index of the largest value: one action per state, $\\arg\\max_a Q(s, a)$. When several tie it gives the first; any of them is optimal.']],
            ],
          },
        },
        { figure: 'Sweeps', props: { map: 'cheese_and_cat', maps: ['cheese_and_cat', 'qmaze', 'cliff', 'frozen_lake', 'frozen_lake_8x8', 'cats_and_cheese'], mode: 'optimal' }, caption: 'Value iteration. After each sweep the arrows show the greedy action for the current values. Watch good values spread backwards from the cheese one cell per sweep, and the arrows lock into the shortest routes.' },
        {
          predict: {
            prompt: 'With γ = 0.95, what is $V^*$ of the start on Cheese and cat? (The best route is 5 floor moves at −0.04 then the cheese.) Give 4 decimals.',
            answer: 0.5928, tolerance: 6e-5, compute: () => { const e = new GridWorld('cheese_and_cat'); return valueIteration(e.P, 0.95).V[e.start] },
            explain: '$-0.04(1 + 0.95 + 0.95^2 + 0.95^3 + 0.95^4) + 0.95^5 = -0.04 \\cdot 4.5244 + 0.7738 = 0.5928$. That is the discounted return of a shortest path, the best any policy can do.',
            misconceptions: [{ answer: 0.8, tolerance: 1e-6, feedback: 'That is the undiscounted return. $V^*$ uses γ = 0.95: discount the $k$-th reward by $0.95^k$.' }],
          },
        },
        { md: `On the frozen lake, open the 4 × 4 map and run to convergence. $V^*$ of the start is only about **0.18**, and some arrows look strange: next to holes, the best action often points **away from** the goal. Because a slide is perpendicular to the chosen direction, pointing along a wall or away from a hole means the slides can't drop the elf in. The optimal policy accepts a longer walk to avoid the risk. $V^*$ here is a **discounted probability of success**: the elf gets reward 1 only at the goal, and later arrivals count less.` },
        { h: 'Discounting decides between the cheeses, exactly' },
        { figure: 'Sweeps', props: { map: 'cats_and_cheese', mode: 'optimal', gamma: 0.85, gammaSlider: true }, caption: 'Cats and cheese. Run to convergence, then drag γ. Below about 0.875 the arrows from the start go down to the small cheese; above it, right towards the big one: exactly the crossover lesson 1.5 found for two hand-drawn paths.' },
        {
          choice: {
            prompt: 'Value iteration needs `P`. Why can\'t the rat in a real maze just run value iteration?',
            options: [
              { text: 'It doesn\'t know P: it only finds out what a move does by trying it', why: 'Right. Planning methods like value iteration need a **model** of the world. Part 3\'s methods learn from experience instead: they are called **model-free**.' },
              { text: 'Value iteration only works for deterministic worlds', why: 'It handles randomness fine: the frozen lake\'s three outcomes are weighted by their probabilities in `q_from_v`.' },
              { text: 'Value iteration is too slow for a 10 × 10 maze', why: 'It converges on Classic QMaze in 30 sweeps of 100 states: instant. The problem is needing `P`.' },
            ],
            answer: 0,
          },
        },
        { note: '$Q^*(s,a) = \\sum p\\,[r + \\gamma \\max_{a\'} Q^*(s\',a\')]$, the **Bellman optimality equation**. Value iteration solves it by sweeping with a max; the optimal policy takes $\\arg\\max_a Q^*$. It needs $P$. Everything from Part 3 on is about getting to $Q^*$ without it.' },
      ],
    },

    {
      id: 'gymnasium', number: '2.6', title: 'The same worlds in Gymnasium',
      goal: 'Open FrozenLake and CliffWalking in Gymnasium, read their `P`, translate their action numbers, and check that this lab\'s worlds are identical to them.',
      builds: ['transition-table'],
      blocks: [
        { md: `**Gymnasium** (formerly OpenAI Gym) is the standard library of reinforcement learning environments; courses, papers and libraries use it. Two of this lab's maps are copies of Gymnasium's own: **FrozenLake-v1** and **CliffWalking-v1**. Using them looks like this:

\`\`\`python
import gymnasium as gym

env = gym.make("FrozenLake-v1", map_name="4x4", is_slippery=True)
state, info = env.reset(seed=0)
next_state, reward, terminated, truncated, info = env.step(2)
\`\`\`

The same \`reset\` and \`step\` as \`GridWorld\`, with the same five return values (that's why this lab copied them). \`gym.make\` also wraps the world in a \`TimeLimit\` that sets \`truncated\` after 100 steps, like \`max_steps\`.

Two differences matter:

- **Action numbers.** FrozenLake uses LEFT, DOWN, RIGHT, UP = 0, 1, 2, 3; CliffWalking uses UP, RIGHT, DOWN, LEFT = 0, 1, 2, 3. This lab (and QMaze) uses LEFT, UP, RIGHT, DOWN. Action 1 means *down* in one and *right* in another: always check the documentation.
- **\`P\` is behind \`env.unwrapped\`.** \`gym.make\` returns wrapped environments; \`.unwrapped\` is the bare world inside, which has the table \`P\` in exactly the format of lesson 2.1.` },
        { h: 'Checking that the worlds are the same' },
        {
          code: {
            file: 'gym_compare.py', from: 5, to: 7, notes: [
              ['FROZEN_LAKE_ACTION = {0: 0, 1: 3, 2: 2, 3: 1}', ['A dictionary from **our** action number to FrozenLake\'s: our UP (1) is its 3, our DOWN (3) is its 1. LEFT and RIGHT happen to agree.']],
              ['CLIFF_ACTION = {0: 3, 1: 0, 2: 1, 3: 2}', ['The same for CliffWalking, where every number is different.']],
            ],
          },
        },
        {
          code: {
            file: 'gym_compare.py', fn: 'outcome_set', notes: [
              ['return sorted(', ['The two libraries may list the same outcomes in a different order (our slides go anticlockwise first, Gymnasium\'s numbering runs the other way round), so both lists are sorted before comparing. `round(p, 12)` ignores differences in the last few digits of the probabilities; `int`, `float` and `bool` turn NumPy\'s number types into plain Python ones so that equal values compare equal.']],
            ],
          },
        },
        {
          code: {
            file: 'gym_compare.py', fn: 'differences', notes: [
              ['ours = GridWorld(name)', ['This lab\'s world with the same layout.']],
              ['theirs = gym_env.unwrapped.P', ['Gymnasium\'s own transition table.']],
              ['found = []', ['Disagreements found so far.']],
              ['for state in range(ours.n_states)', ['Every state…']],
              ['if ours.is_end(state) or ours.cells.get(ours.letter(state), {}).get("to_start")', ['Skip cells nobody can stand on: endings, and cliff cells (entering one sends you to the start). The two libraries describe those unreachable rows differently, and it never matters.']],
              ['for action in range(4)', ['…and every action.']],
              ['if outcome_set(ours.P[state][action]) != outcome_set(theirs[state][action_map[action]])', ['Our action `action` is Gymnasium\'s `action_map[action]`: compare those two lists.']],
              ['found.append((state, action))', ['Record any disagreement.']],
              ['return found', ['An empty list means the worlds are identical.']],
            ],
          },
        },
        {
          code: {
            file: 'gym_compare.py', fn: 'compare_all', notes: [
              ['results = {', ['A dictionary from each of our map names to its list of differences.']],
              ['"frozen_lake": differences("frozen_lake", gym.make("FrozenLake-v1", map_name="4x4", is_slippery=True), FROZEN_LAKE_ACTION)', ['`gym.make` builds Gymnasium\'s world by its id; the keyword arguments choose the 4 × 4 slippery lake.']],
              ['"frozen_lake_8x8"', ['The 8 × 8 lake.']],
              ['"cliff": differences("cliff", gym.make("CliffWalking-v1"), CLIFF_ACTION)', ['The cliff, with its own action numbering.']],
              ['for name, found in results.items()', ['One line of output per map.']],
              ['print(name, "identical" if not found else', ['An empty list counts as false in Python, so `not found` is true when there were no differences. `f"…"` is an **f-string**: the parts in braces are filled in with values.']],
              ['return results', ['Also returned, for code that wants to check it.']],
            ],
          },
        },
        { md: `Running \`compare_all()\` prints, for this lab's maps:

\`\`\`text
frozen_lake identical
frozen_lake_8x8 identical
cliff identical
\`\`\`

So everything you compute on these maps (values, optimal policies, learned Q-tables) is exactly what you would get on Gymnasium's versions, once the actions are renumbered. Run it yourself in the Python tab (desktop app) with the program **Gymnasium check**.` },
        {
          choice: {
            prompt: 'A course\'s FrozenLake code prints the policy `[1, 2, 2, 1, ...]` for states 0, 1, 2, 3. In this lab\'s numbering, what is the action in state 0?',
            options: [
              { text: '3, DOWN', why: 'Right: FrozenLake\'s 1 is DOWN, which is our 3.' },
              { text: '1, UP', why: 'In FrozenLake 1 means DOWN. Our UP is 1, but the code you were given uses FrozenLake\'s numbers.' },
              { text: '2, RIGHT', why: '2 is RIGHT in both, but state 0\'s action is 1.' },
            ],
            answer: 0,
          },
        },
        { python: { program: 'gym', label: 'Run the Gymnasium check in real Python' } },
        { note: 'Gymnasium\'s grid worlds have the same `reset`/`step` contract and the same `P` format as this lab\'s. Only the action numbering differs, so translate it with a dictionary and compare sorted outcome lists.' },
      ],
    },
  ],
}
