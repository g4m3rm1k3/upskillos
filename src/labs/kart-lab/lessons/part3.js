// Part 3: learning to drive. The Q-table, ε-greedy with a schedule, the TD update, a whole training
// run judged on held-out laps, SARSA, maximisation bias and Double Q-learning, reward design, and
// what one training seed can and can't show. Multi-seed results come from engine/measured.json
// (tools/measure.mjs); predicts recompute them with the engine.
import { PyRandom, SUNLIT } from '../engine/kart.js'
import { DEFAULTS, train, evaluate, trainEpisode, argmax, update } from '../engine/tabular.js'
import { leftRate } from '../engine/maxbias.js'
import M from '../engine/measured.json'
import { f } from './util.js'

const T = M.tables
const pct = x => `${(100 * x).toFixed(1)}%`
const firstUpdate = (() => {
  const rng = new PyRandom(42), tables = [new Map()]
  let ex = null
  for (let e = 0; e < 3 && !ex; e++) trainEpisode(tables, { ...DEFAULTS }, e, rng, SUNLIT, t => { if (!ex && t.learning.before !== 0) ex = { action: t.action, reward: t.next.last.reward, done: t.next.done, ...t.learning } })
  return ex
})()
const ACTION = ['Left', 'Coast', 'Right', 'Accelerate', 'Brake']
const runsTable = ids => ids.map(([id, label]) => `| ${label} | ${pct(T[id].sunlit)} | ${f(T[id].hits)} | ${f(T[id].practiceHits)} |`).join('\n')
const spread = id => T[id].runs.map(r => pct(r.sunlit[0])).join(', ')
const peak = xs => Math.max(...xs)

export const PART3 = {
  id: 'part3', title: 'Part 3 · Learning to drive', lessons: [
    {
      id: 'kart-q-table', number: '3.1', title: 'A table of action values',
      goal: 'Store one estimate per observation and action, choose the greedy action from it, and say what a tie should do.',
      builds: ['kart-partial-observability'],
      blocks: [
        { md: `The **action value** $Q(s, a)$ is the expected discounted return of taking action $a$ in observation $s$ and driving well after that. If the driver knew $Q$ exactly, driving well would be easy: in every observation, take the action with the largest value. That is the **greedy** policy, $\\pi(s) = \\arg\\max_a Q(s, a)$.

It doesn't know $Q$; it will **learn** it. A **Q-table** stores one estimate for every (key, action) pair. Most of the 10,368 keys never occur (a kart can't be at speed 2 at the start line), so the table is a dictionary that makes a row the first time a key is seen, all zeros.` },
        {
          code: {
            file: 'tabular.py', fn: 'row', notes: [
              ['def row(Q, key):', ['Every read and write of the table goes through here.']],
              ['if key not in Q:', ['A new observation…']],
              ['Q[key] = [0.0] * 5', ['…gets five zeros, one per action.']],
              ['return Q[key]', ['The row itself: changing it changes the table.']],
            ],
          },
        },
        {
          code: {
            file: 'tabular.py', fn: 'argmax', notes: [
              ['def argmax(values):', ['The greedy choice.']],
              ['best = 1', ['Start with Coast. On a tie (and at first every value is a tie, 0.0), Coast wins: a kart that knows nothing keeps going without changing anything.']],
              ['for a in range(5):', ['Each action in order…']],
              ['if values[a] > values[best]:', ['…replaces the best only if **strictly** bigger, so ties keep the earlier choice.'], { logic: 'this action is strictly better than the best so far' }],
              ['best = a', ['Remember the new best.']],
              ['return best', ['0 to 4.']],
            ],
          },
        },
        {
          code: {
            file: 'tabular.py', fn: 'action_values', notes: [
              ['def action_values(tables, key):', ['A list of tables: one for Q-learning and SARSA, two for Double Q-learning (lesson 3.7).']],
              ['total = [0.0] * 5', ['Five sums.']],
              ['for Q in tables:', ['Each table…']],
              ['if key in Q:', ['…that has seen this key…']],
              ['for a in range(5):', ['Each action\'s value…']],
              ['total[a] += Q[key][a]', ['…adds its values. With one table this is just its row.']],
              ['return total', ['What the driver chooses by.']],
            ],
          },
        },
        { figure: 'QRowFig', caption: 'The supplied Q-learning driver\'s values at a few places on the lap. The greedy action is highlighted.' },
        {
          predict: {
            prompt: 'A row is `[-1.0, 0.4, 0.4, 0.4, -2.0]` (Left, Coast, Right, Accelerate, Brake). Which action does `argmax` return? (0 to 4)',
            answer: argmax([-1, 0.4, 0.4, 0.4, -2]), compute: () => argmax([-1, 0.4, 0.4, 0.4, -2]),
            explain: 'Coast, Right and Accelerate tie at 0.4. `best` starts at Coast (1) and only a strictly bigger value replaces it: **1**.',
            misconceptions: [{ answer: 3, feedback: 'Accelerate ties with Coast but isn\'t strictly bigger, so Coast stays.' }, { answer: 2, feedback: 'Right ties too; ties keep the earlier choice, and the search starts from Coast.' }],
          },
        },
        { note: '$Q(s, a)$: expected discounted return of $a$ in $s$. A Q-table stores an estimate per pair; the **greedy** policy takes $\\arg\\max_a Q(s, a)$, here with ties going to Coast.' },
      ],
    },

    {
      id: 'kart-05-exploration', number: '3.2', title: 'Explore enough to discover a better line',
      goal: 'Implement ε-greedy with a schedule that explores a lot early and little late.',
      builds: ['kart-q-table'],
      blocks: [
        { md: `A driver that always takes its current best guess never finds out whether something else is better: an empty table says Coast everywhere, and a driver that only coasts never learns that accelerating on a clear road pays. So with probability $\\varepsilon$ it takes a **random** action instead: **ε-greedy**.

How much to explore should change over training. Early, the table knows nothing, so explore a lot. Late, it knows a fair amount, and random actions mostly cause crashes. So $\\varepsilon$ falls in a straight line from a starting value (0.9) to a floor (0.04) over the first 80% of practice laps, then stays at the floor:

$$\\varepsilon_e = \\varepsilon_{\\text{floor}} + (\\varepsilon_0 - \\varepsilon_{\\text{floor}})\\cdot \\max\\!\\Big(0,\\; 1 - \\frac{e}{0.8\\,E}\\Big)$$

for lap $e$ of $E$. The floor never reaches 0: the world might hold something not yet found.` },
        {
          code: {
            file: 'tabular.py', fn: 'choose', notes: [
              ['def choose(tables, key, epsilon, rng):', ['Used while practising; the frozen tests and races use `argmax` alone.']],
              ['if rng.random() < epsilon:', ['With chance ε…'], { logic: 'explore this time (chance ε)' }],
              ['return rng.randrange(5)', ['…any of the five actions.']],
              ['return argmax(action_values(tables, key))', ['Otherwise the greedy one.']],
            ],
          },
        },
        { figure: 'EpsilonSchedule', caption: 'The exploration schedule over a training run. Move the starting value and the floor.' },
        {
          predict: {
            prompt: 'With 2,500 practice laps, ε from 0.9 to 0.04: what is ε at lap 1,000? (3 decimals)',
            answer: 0.04 + 0.86 * Math.max(0, 1 - 1000 / 2000), tolerance: 0.0006, compute: () => DEFAULTS.floor + (DEFAULTS.epsilon - DEFAULTS.floor) * Math.max(0, 1 - 1000 / Math.max(1, 2500 * 0.8)),
            explain: '$0.8 \\times 2500 = 2000$ laps of falling. At lap 1000: $0.04 + 0.86 \\times (1 - 1000/2000) = 0.04 + 0.43 = 0.47$.',
          },
        },
        {
          choice: {
            prompt: 'Why might the practice-lap rewards look much worse than the same driver\'s frozen test?',
            options: [
              { text: 'Practice includes random exploring actions, which cause crashes; the test doesn\'t explore', why: 'Yes. Practice measures the explorer; the frozen test measures the policy you will actually use.' },
              { text: 'The test secretly improves the table', why: 'The test never updates anything: it is frozen.' },
            ],
            answer: 0,
          },
        },
        { note: '**ε-greedy** explores with chance ε. A **schedule** explores a lot early and a little late; the floor keeps a trickle of exploration going.' },
      ],
    },

    {
      id: 'kart-04-q-update', number: '3.3', title: 'One Q-learning update, all the way through',
      goal: 'Derive the Q-learning target from the Bellman equation and compute an update by hand, including at the end of a lap.',
      builds: ['kart-05-exploration', 'kart-03-rewards'],
      blocks: [
        { md: `The values the driver wants satisfy the **Bellman optimality equation**:

$$Q^*(s, a) = \\mathbb E\\Big[\\, r + \\gamma \\max_{a'} Q^*(s', a') \\Big]$$

the expected reward now plus the discounted value of the best action next. The driver can't compute that expectation (it doesn't know where every move can lead), but each move it makes gives **one sample** of what is inside it. So after each move, it nudges its estimate toward that sample:

$$\\underbrace{r + \\gamma \\max_{a'} Q(s', a')}_{\\text{target}} \\qquad Q(s, a) \\leftarrow Q(s, a) + \\alpha\\,\\big[\\text{target} - Q(s, a)\\big]$$

The bracket is the **TD error** $\\delta$ (TD: temporal difference). α (alpha, 0.18 here) is the step size. When the move **ended** the lap, finishing or failing, nothing follows, so the target is just $r$: no future to bootstrap from. That is **Q-learning** (Watkins, 1989).` },
        {
          symbols: [
            ['Q(s, a)', 'Q of s, a', 'the current estimate for action $a$ in observation $s$', 'values[action]'],
            ['r', 'r', 'the reward of this move', 'reward'],
            ['\\gamma', 'gamma', 'the discount, 0.95', 'gamma'],
            ['\\max_{a\'} Q(s\', a\')', 'max over a prime', 'the best value in the next observation\'s row', 'row(other, next_key)[chosen]'],
            ['\\alpha', 'alpha', 'the step size, 0.18', 'alpha'],
            ['\\delta', 'delta', 'the TD error, target − Q', 'target - before'],
          ],
        },
        {
          code: {
            file: 'tabular.py', fn: 'update', notes: [
              ['def update(tables, method, key, action, reward, next_key, done, next_action, alpha, gamma, rng):', ['One update, for all three methods. `next_action` is only used by SARSA, `rng` only by Double Q-learning.']],
              ['Q = tables[0]', ['The table to update…']],
              ['other = tables[0]', ['…and the one to read the future from: the same table, except in Double Q-learning (lesson 3.7).']],
              ['if method == "double":', ['Lesson 3.7.']],
              ['if rng.random() < 0.5:', ['A coin flip…']],
              ['Q, other = tables[0], tables[1]', ['…update A, using B for the future…']],
              ['Q, other = tables[1], tables[0]', ['…or the other way round.']],
              ['if method == "sarsa":', ['Lesson 3.5.']],
              ['chosen = next_action', ['SARSA: the action actually taken next.']],
              ['chosen = argmax(row(Q, next_key))', ['Q-learning: the best next action.']],
              ['future = 0.0 if done else row(other, next_key)[chosen]', ['The value of that next action; nothing at the end of a lap.'], { tex: '\\max_{a\'} Q(s\', a\')' }],
              ['target = reward + gamma * future', ['The TD target.'], { tex: 'r + \\gamma \\max_{a\'} Q(s\', a\')', calc: q => [`${f(q.reward)} + ${q.gamma} × ${f(q.future)}`, q.reward + q.gamma * q.future] }],
              ['values = row(Q, key)', ['The row being updated.']],
              ['before = values[action]', ['The old estimate.']],
              ['values[action] = before + alpha * (target - before)', ['Move it a step toward the target.'], { tex: 'Q \\leftarrow Q + \\alpha(\\text{target} - Q)' }],
              ['return {"before": before, "target": target, "after": values[action], "future": future, "chosen": chosen}', ['The numbers, for the arena\'s training trace.']],
            ],
          },
        },
        { figure: 'UpdateFig', caption: 'The real `update` function, on example rows. Choose the method and settings, and whether the lap ended.' },
        {
          predict: {
            prompt: 'With old Q = 2, reward = −1, γ = 0.9, the next row\'s best value 4, and α = 0.2, what is the new Q?',
            answer: 2.12, tolerance: 1e-9, compute: () => { const tables = [new Map([[0, [0, 2, 0, 0, 0]], [1, [1, 4, 2, 3, 0]]])]; return update(tables, 'q', 0, 1, -1, 1, false, 0, 0.2, 0.9, null).after },
            explain: 'Target $= -1 + 0.9 \\times 4 = 2.6$. New $Q = 2 + 0.2 \\times (2.6 - 2) = 2.12$.',
            misconceptions: [{ answer: 2.6, tolerance: 1e-9, feedback: 'That is the target. The value moves only α = 0.2 of the way there.' }],
          },
        },
        {
          predict: {
            prompt: `A real update from the first practice laps (seed 42): the driver chose ${ACTION[firstUpdate.action]}, crashed (reward ${f(firstUpdate.reward)}) and the lap ended. The old value was ${f(firstUpdate.before)}. With α = 0.18, what is the new value? (4 decimals)`,
            answer: firstUpdate.after, tolerance: 0.00006, compute: () => { const rng = new PyRandom(42), tables = [new Map()]; let ex = null; for (let e = 0; e < 3 && !ex; e++) trainEpisode(tables, { ...DEFAULTS }, e, rng, SUNLIT, t => { if (!ex && t.learning.before !== 0) ex = t.learning }); return ex.after },
            explain: `The lap ended, so target $= ${f(firstUpdate.reward)}$ with no future. New $= ${f(firstUpdate.before)} + 0.18 \\times (${f(firstUpdate.reward)} - (${f(firstUpdate.before)})) = ${f(firstUpdate.after)}$.`,
            misconceptions: [{ answer: firstUpdate.before + 0.18 * firstUpdate.reward, tolerance: 0.0001, feedback: 'The step is α × (target − **old value**).' }],
          },
        },
        {
          choice: {
            prompt: 'At the end of a lap, raising γ from 0.95 to 0.99 changes the target how?',
            options: [
              { text: 'Not at all: the end of a lap has no future, so γ multiplies 0', why: 'Right. γ only weighs the future; a terminal target is the reward alone.' },
              { text: 'It raises it, because the future counts more', why: 'There is no future after the last move: `future` is 0.0.' },
            ],
            answer: 0,
          },
        },
        { note: '**Q-learning**: target $= r + \\gamma \\max_{a\'} Q(s\', a\')$ (just $r$ at the end), then $Q \\mathrel{+}= \\alpha\\,\\delta$. Each move is one sample of the Bellman equation; averaging many samples replaces knowing the game\'s chances.' },
      ],
    },

    {
      id: 'kart-training-run', number: '3.4', title: 'A whole training run, and an honest test',
      goal: 'Run the training loop, read its learning curve, and test the frozen driver on laps it never practised.',
      builds: ['kart-04-q-update'],
      blocks: [
        { md: `Put the pieces together. A **practice lap** picks a random seed (and so a random starting lane and traffic), sets ε from the schedule, and then repeats: observe, act, step, choose the next action, update. Notice the order: the **next** action is chosen **before** the update, because SARSA's update needs it.` },
        {
          code: {
            file: 'tabular.py', fn: 'train_episode', notes: [
              ['def train_episode(tables, config, episode, rng, track=SUNLIT):', ['One practice lap, learning as it goes.']],
              ['seed = rng.randrange(100000)', ['This lap\'s seed: a number below 100,000. The test laps use seeds from 800,001, so they are laps the driver never practised.']],
              ['state = reset(seed)', ['Start.']],
              ['epsilon = config["floor"] + (config["epsilon"] - config["floor"]) * max(0, 1 - episode / max(1, config["episodes"] * 0.8))', ['Lesson 3.2\'s schedule.'], { tex: '\\varepsilon_e = \\varepsilon_f + (\\varepsilon_0 - \\varepsilon_f)\\max(0, 1 - e / 0.8E)', calc: q => [`${q.config.floor} + (${q.config.epsilon} − ${q.config.floor}) × max(0, 1 − ${q.episode}/${q.config.episodes * 0.8})`, q.config.floor + (q.config.epsilon - q.config.floor) * Math.max(0, 1 - q.episode / Math.max(1, q.config.episodes * 0.8))] }],
              ['key = key_of(config["view"], state, cars_at(0, seed, config, track), track)', ['The first observation.']],
              ['action = choose(tables, key, epsilon, rng)', ['The first action.']],
              ['while not state["done"]:', ['Until the lap ends.']],
              ['next_state = step(state, action, track, cars_at(state["ticks"], seed, config, track), config["penalty"])', ['**Act.**']],
              ['next_key = key_of(config["view"], next_state, cars_at(next_state["ticks"], seed, config, track), track)', ['**Observe** the result.']],
              ['next_action = choose(tables, next_key, epsilon, rng)', ['**Choose** the next action now.']],
              ['update(tables, config["method"], key, action, next_state["last"]["reward"], next_key,', ['**Learn** from this move.']],
              ['state, key, action = next_state, next_key, next_action', ['Move on: the next becomes the current.']],
              ['return state', ['The final state of the lap.']],
            ],
          },
        },
        {
          code: {
            file: 'tabular.py', fn: 'key_of', notes: [
              ['def key_of(view, state, cars, track):', ['Which observation the table uses: `"sector"` (Part 2) or `"sensors"` (Part 4).']],
              ['if view == "sensors":', ['The sensor observation…']],
              ['return sensor_key(state, cars, track)', ['Part 4.']],
              ['return observe(state, cars, track)', ['The sector observation.']],
            ],
          },
        },
        {
          code: {
            file: 'tabular.py', fn: 'cars_at', notes: [
              ['def cars_at(tick, seed, config, track):', ['The practice traffic, if the recipe includes it.']],
              ['return scripted_traffic(tick, seed, track) if config["traffic"] else []', ['Lesson 1.6.']],
            ],
          },
        },
        {
          code: {
            file: 'tabular.py', fn: 'train', notes: [
              ['def train(config=DEFAULTS, track=SUNLIT):', ['A whole run, from empty tables.']],
              ['config = dict(DEFAULTS, **config)', ['The defaults, with any settings you passed taking their place. `**config` unpacks a dictionary into named arguments.']],
              ['rng = random.Random(config["seed"])', ['All the randomness of the run, from one seed: the same seed gives the same driver.']],
              ['tables = [{}, {}] if config["method"] == "double" else [{}]', ['Empty tables.']],
              ['totals = []', ['Each lap\'s total reward: the learning curve.']],
              ['for episode in range(config["episodes"]):', ['2,500 laps by default.']],
              ['state = train_episode(tables, config, episode, rng, track)', ['One lap.']],
              ['totals.append(state["total"])', ['Record it.']],
              ['return tables, totals', ['The learned tables and the curve.']],
            ],
          },
        },
        {
          code: {
            file: 'tabular.py', fn: 'evaluate', notes: [
              ['def evaluate(tables, config=DEFAULTS, track=SUNLIT, laps=50):', ['The honest test.']],
              ['config = dict(DEFAULTS, **config)', ['The same settings as training: traffic on or off, the same penalty.']],
              ['finished = 0', ['Laps finished…']],
              ['hits = 0', ['…and collisions, counted over the test.']],
              ['for i in range(laps):', ['50 laps…']],
              ['seed = 800001 + i * 97', ['…on seeds training never uses.']],
              ['state = reset(seed)', ['Start the test lap.']],
              ['while not state["done"]:', ['Drive it to the end.']],
              ['cars = cars_at(state["ticks"], seed, config, track)', ['The same practice traffic the recipe trained with.']],
              ['action = argmax(action_values(tables, key_of(config["view"], state, cars, track)))', ['**Greedy**: no exploring. And no `update`: the table is frozen.']],
              ['state = step(state, action, track, cars, config["penalty"])', ['Move.']],
              ['finished += 1 if state["finished"] else 0', ['Count a finish…']],
              ['hits += state["crashes"]', ['…and the lap\'s collisions.']],
              ['return finished / laps, hits / laps', ['Finish rate and average collisions.']],
            ],
          },
        },
        {
          code: {
            file: 'tabular.py', fn: 'driver', notes: [
              ['def driver(tables, view="sector"):', ['A learned table as a policy, for races.']],
              ['return lambda state, cars, track: argmax(action_values(tables, key_of(view, state, cars, track)))', ['Greedy and frozen.']],
            ],
          },
        },
        { figure: 'CurvesFig', caption: 'Average reward per practice lap, in blocks of 100 laps (seed 19). Exploration makes early laps terrible.' },
        { python: { program: 'train', label: 'Train a driver in real Python' } },
        { md: `Over five training seeds (2,500 laps each), Q-learning with the sector observation finishes **${pct(T['q-sector'].sunlit)}** of the 50 test laps, with ${f(T['q-sector'].hits)} collisions per lap: better than the careful rule's ${pct(M.rules.careful.sunlit[0])}. With only 500 practice laps it finishes ${pct(T['q-sector-500'].sunlit)}; with 8,000, ${pct(T['q-sector-8000'].sunlit)} (and only ${f(T['q-sector-8000'].hits)} collisions).

The learning curve also shows why the test matters. It is measured **while exploring**, so it understates the driver; and it is measured on **practice laps**, so on its own it can't reveal whether the driver only learned those laps.` },
        { figure: 'TrainerFig', caption: 'Train a driver in your browser (the same engine, the same numbers as Python) and test it frozen on the 50 held-out laps.' },
        {
          predict: {
            prompt: 'Train Q-learning with the defaults and seed 19 (it takes a moment). On the 50 held-out laps, what fraction does it finish?',
            answer: T['q-sector'].runs[0].sunlit[0], tolerance: 1e-9, compute: () => evaluate(train({ seed: 19 }).tables)[0],
            explain: `${T['q-sector'].runs[0].sunlit[0]}. The other four seeds of the measurements gave ${spread('q-sector')}: lesson 3.9.`,
          },
        },
        { note: 'Train on practice laps, **test frozen** on held-out laps. The learning curve watches an explorer; the test judges the policy. With 2,500 laps, Q-learning beats the hand-written rule.' },
      ],
    },

    {
      id: 'kart-sarsa', number: '3.5', title: 'SARSA: learning about the driver you are',
      goal: 'State SARSA\'s target, explain on-policy against off-policy, and read measured results that separate practice from testing.',
      builds: ['kart-training-run'],
      blocks: [
        { md: `Q-learning's target uses the **best** next action, even though, while practising, the driver will sometimes take a random one. It learns the values of the greedy driver it will become: it is **off-policy**.

**SARSA** uses the action **actually chosen** next: $\\text{target} = r + \\gamma\\, Q(s', a'_{\\text{chosen}})$. It learns the values of the driver it **is**, exploring included: **on-policy**. Near a barrier, a random action now and then can be a crash, and SARSA's values include that risk. So SARSA learns to keep a bit more distance from danger **while exploring**. (The name lists one update's ingredients: State, Action, Reward, next State, next Action.)

In \`update\` the whole difference is \`chosen = next_action\`. Measured over five seeds:

| Method | Test: finished | Test: hits per lap | Practice: hits per lap (last 500 laps, ε = 0.04) |
|---|---|---|---|
${runsTable([['q-sector', 'Q-learning'], ['sarsa-sector', 'SARSA']])}

Exactly the textbook pattern: SARSA crashes **less while practising**, because it accounts for its own exploring, but its frozen driver is **not** better: it learned values for a behaviour (exploring) that the frozen driver doesn't have. Which matters depends on the job: a robot that must learn on real hardware cares about practice crashes; a game driver trained in simulation cares about the test.` },
        { figure: 'CurvesFig', props: { which: ['sector', 'sarsa'] }, caption: 'Q-learning and SARSA practice curves, same seed.' },
        {
          choice: {
            prompt: 'Why can SARSA\'s values be lower than Q-learning\'s in the same observation?',
            options: [
              { text: 'Its target includes the next action actually taken, which is sometimes a costly random one', why: 'Yes. Q-learning\'s target always assumes the best next action; SARSA\'s includes the exploring mistakes.' },
              { text: 'It uses a smaller step size', why: 'Same α. The difference is the target.' },
            ],
            answer: 0,
          },
        },
        { note: '**Off-policy** (Q-learning): learn the greedy driver\'s values while exploring. **On-policy** (SARSA): learn the explorer\'s values, so behave more safely while exploring. Measured: SARSA practises with fewer crashes, and tests no better.' },
      ],
    },

    {
      id: 'kart-max-bias', number: '3.6', title: 'Why the max is optimistic',
      goal: 'Show that the maximum of noisy estimates is biased upward, and watch it mislead Q-learning on a two-state problem.',
      builds: ['kart-sarsa'],
      blocks: [
        { md: `Q-learning's target takes a **max** over estimates. Estimates are noisy. And the max of noisy estimates is **biased upward**: if ten actions are truly worth 0 and each estimate is off by random noise, the largest estimate is almost always above 0. In symbols, for estimates $\\hat Q_a = Q_a + \\epsilon_a$:

$$\\mathbb E\\big[\\max_a \\hat Q_a\\big] \\;\\ge\\; \\max_a \\mathbb E\\big[\\hat Q_a\\big] = \\max_a Q_a$$

(because the max picks out whichever noise happened to be largest). This is **maximisation bias**, and it can make a learner prefer a bad action because its estimates are noisy.

The smallest example (Sutton and Barto, Example 6.7). From state A, **Right** ends the episode with reward 0. **Left** leads to state B, where each of 10 actions ends the episode with a random reward averaging **−0.1** (uniform between −1.1 and 0.9). Going Left is worse on average. But B's ten noisy estimates, maxed, look positive for a long time, so Q-learning goes Left.` },
        {
          code: {
            file: 'maxbias.py', fn: 'run', notes: [
              ['def run(method="q", episodes=300, alpha=0.1, epsilon=0.1, actions=10, seed=0):', ['One run of 300 episodes.']],
              ['rng = random.Random(seed)', ['Its own randomness.']],
              ['tables = [[[0.0, 0.0], [0.0] * actions], [[0.0, 0.0], [0.0] * actions]]', ['Two tables (the second only for Double Q-learning). Each has a row for A (Left, Right) and a row for B (10 actions).']],
              ['lefts = []', ['1 for each episode that went Left.']],
              ['for episode in range(episodes):', ['300 episodes.']],
              ['a = act(tables, method, 0, epsilon, rng)', ['ε-greedy in A.']],
              ['lefts.append(1 if a == 0 else 0)', ['Record the choice.']],
              ['if a == 1:', ['Right…']],
              ['update(tables, method, 0, 1, 0.0, None, alpha, rng)', ['…ends at once with reward 0.']],
              ['update(tables, method, 0, 0, 0.0, 1, alpha, rng)', ['Left: reward 0, next state B (1). The target is $0 + \\max_b Q(B, b)$: here is the max.']],
              ['b = act(tables, method, 1, epsilon, rng)', ['ε-greedy in B.']],
              ['update(tables, method, 1, b, rng.uniform(-1.1, 0.9), None, alpha, rng)', ['A random reward, averaging −0.1, and the end. `uniform(a, b)` is any number between a and b, equally likely.'], { tex: 'r \\sim U(-1.1, 0.9),\\; \\mathbb E[r] = -0.1' }],
              ['return lefts', ['A list of 0s and 1s, one per episode.']],
            ],
          },
        },
        {
          code: {
            file: 'maxbias.py', fn: 'best', notes: [
              ['def best(values, rng):', ['argmax with ties broken at random.']],
              ['top = max(values)', ['The biggest value.']],
              ['return rng.choice([i for i in range(len(values)) if values[i] == top])', ['A random one of the positions holding it. At the start every value is 0, so this is a fair coin between Left and Right.']],
            ],
          },
        },
        {
          code: {
            file: 'maxbias.py', fn: 'act', notes: [
              ['def act(tables, method, s, epsilon, rng):', ['ε-greedy for this tiny problem.']],
              ['if method == "double":', ['Two tables…']],
              ['values = [x + y for x, y in zip(tables[0][s], tables[1][s])]', ['Double Q-learning chooses by both tables added.']],
              ['values = tables[0][s]', ['One table: its row for state s.']],
              ['if rng.random() < epsilon:', ['Explore with chance ε…']],
              ['return rng.randrange(len(values))', ['…any action.']],
              ['return best(values, rng)', ['Otherwise the greedy one.']],
            ],
          },
        },
        {
          code: {
            file: 'maxbias.py', fn: 'update', notes: [
              ['def update(tables, method, s, a, reward, next_s, alpha, rng):', ['The same update as `tabular.py`\'s, written for this problem.']],
              ['Q, other = tables[0], tables[0]', ['Q-learning updates and reads one table.']],
              ['if method == "double":', ['Double Q-learning…']],
              ['if rng.random() < 0.5:', ['…flips a coin:']],
              ['Q, other = tables[0], tables[1]', ['update A, value with B…']],
              ['Q, other = tables[1], tables[0]', ['…or update B, value with A.']],
              ['future = 0.0', ['Nothing after the end…']],
              ['if next_s is not None:', ['…unless there is a next state:']],
              ['chosen = best(Q[next_s], rng)', ['pick its best action by the table being updated…']],
              ['future = other[next_s][chosen]', ['…and value it with `other`: for Q-learning that is the same table, so this is just the max.']],
              ['Q[s][a] += alpha * (reward + future - Q[s][a])', ['The TD update.']],
            ],
          },
        },
        {
          code: {
            file: 'maxbias.py', fn: 'left_rate', notes: [
              ['def left_rate(method="q", runs=1000, episodes=300):', ['Average many runs, to see the trend through the noise.']],
              ['totals = [0] * episodes', ['How many runs went Left at each episode.']],
              ['for seed in range(runs):', ['Each run with its own seed.']],
              ['for i, left in enumerate(run(method, episodes, seed=seed)):', ['`enumerate` gives each item with its position.']],
              ['totals[i] += left', ['Add this run\'s choice at episode i.']],
              ['return [t / runs for t in totals]', ['The fraction going Left at each episode.']],
            ],
          },
        },
        { figure: 'MaxBiasFig', caption: 'The fraction of 2,000 runs going Left from A, episode by episode. The dashed line is 5%: ε-greedy with ε = 0.1 picks Left at random half of its random moves.' },
        { md: `Measured over 2,000 runs: Q-learning goes Left in **${pct(peak(M.maxbias.q))}** of runs at its worst (episode ${M.maxbias.q.indexOf(peak(M.maxbias.q)) + 1}), and still ${pct(M.maxbias.q[99])} at episode 100. A learner that knew the true values would go Left only by exploring: 5%.` },
        {
          predict: {
            prompt: 'At episode 1, before any learning, what fraction of runs go Left? (2 decimals)',
            answer: M.maxbias.q[0], tolerance: 0.006, compute: () => leftRate('q', 2000, 1)[0],
            explain: 'About half: every value is 0, so the greedy choice is a random tie (and ε sometimes picks at random anyway). Everything after that is learning, good and bad.',
          },
        },
        { note: 'The max of noisy estimates is biased **up**: $\\mathbb E[\\max \\hat Q] \\ge \\max Q$. Q-learning\'s target takes exactly that max, so noise looks like value. Next lesson: a fix.' },
      ],
    },

    {
      id: 'kart-06-strategies', number: '3.7', title: 'Double Q-learning',
      goal: 'Explain how two tables separate choosing an action from valuing it, and measure the effect on the bias experiment and on the circuit.',
      builds: ['kart-max-bias'],
      blocks: [
        { md: `The bias comes from using the **same** noisy numbers twice: to pick the best next action, and to say how good it is. If one estimate is too high by chance, it gets picked **and** its inflated value goes into the target.

**Double Q-learning** (van Hasselt, 2010) keeps two independent tables, A and B. Each update flips a coin to decide which table to update; that table **picks** the next action, and the **other** table **values** it:

$$\\text{target}_A = r + \\gamma\\, Q_B\\big(s', \\arg\\max_{a'} Q_A(s', a')\\big)$$

If $Q_A$'s pick was lucky noise, $Q_B$'s estimate of that action has independent noise, so on average it is not inflated. To act, the driver adds the two tables.

In the code you've already read: \`action_values\` adds the tables, and \`update\` flips the coin (\`Q, other = tables[0], tables[1]\` or the reverse). Nothing else changes.` },
        { figure: 'MaxBiasFig', props: { both: true }, caption: 'The same experiment with Double Q-learning added.' },
        { md: `On the bias problem, Double Q-learning never goes Left more than **${pct(peak(M.maxbias.double))}** of the time (that's the random start), and is at ${pct(M.maxbias.double[99])} by episode 100.

On the circuit (five seeds, 50 test laps each):

| Method | Test: finished | Test: hits per lap | Practice: hits per lap |
|---|---|---|---|
${runsTable([['q-sector', 'Q-learning'], ['sarsa-sector', 'SARSA'], ['double-sector', 'Double Q']])}

On the circuit the difference is small: its rewards are not very noisy, and maximisation bias matters most when they are. Double Q-learning also learns each table from half the updates, which costs speed. The method is worth knowing because the bias is real and, in noisy problems, large; Double DQN uses the same idea with neural networks.` },
        {
          choice: {
            prompt: 'In Double Q-learning, table A picks the next action. What does table B supply?',
            options: [
              { text: 'Its own value for that same action', why: 'Yes. B values A\'s choice; it doesn\'t make a choice of its own. Independent noise means a lucky pick isn\'t also lucky in value.' },
              { text: 'The max over its own row', why: 'That would be ordinary Q-learning on table B, with the same bias.' },
            ],
            answer: 0,
          },
        },
        { note: '**Double Q-learning**: one table picks, the other values, chosen by a coin flip per update; act on their sum. It removes the systematic upward bias of the max. Measured: decisive on the noisy two-state problem, small on the circuit.' },
      ],
    },

    {
      id: 'kart-reward-design', number: '3.8', title: 'Reward design: what you pay for is what you get',
      goal: 'Change the collision penalty, predict the effect, and measure it.',
      builds: ['kart-06-strategies'],
      blocks: [
        { md: `The reward is the only way to tell the driver what you want. The collision penalty is a choice: 6 by default. What happens at 0 (collisions only cost time) and at 20 (collisions are very expensive)? Make a prediction before reading on.

Measured (Q-learning, sector observation, five seeds; the test laps always count collisions the same way):

| Collision penalty | Test: finished | Test: hits per lap |
|---|---|---|
| 0 | ${pct(T['q-sector-penalty0'].sunlit)} | ${f(T['q-sector-penalty0'].hits)} |
| 6 | ${pct(T['q-sector'].sunlit)} | ${f(T['q-sector'].hits)} |
| 20 | ${pct(T['q-sector-penalty20'].sunlit)} | ${f(T['q-sector-penalty20'].hits)} |

With no penalty a collision still costs something (no progress that tick, speed back to 0, and eight of them end the lap), but not much, so the driver collides about three times as often and fails more laps. A large penalty doesn't help either: it dwarfs the small progress rewards, the values are dominated by rare crashes, and learning gets noisier. The best penalty is a measured choice, not an obvious one.` },
        { note: 'A learner optimises **exactly** what it is paid. Every reward term is a design decision; test it like one: predict, change one thing, measure on held-out laps.', kind: 'warn' },
        {
          choice: {
            prompt: 'You add a reward of +1 for every lane change, hoping the driver will dodge more. What is the risk?',
            options: [
              { text: 'It may learn to weave back and forth to collect the bonus, whether or not there is anything to dodge', why: 'Yes. A learner finds the cheapest way to collect reward. Pay for the outcome you want (finishing, no crashes), not for a behaviour you think leads to it.' },
              { text: 'None: more reward helps it learn faster', why: 'More reward for the wrong thing teaches the wrong thing, faster.' },
            ],
            answer: 0,
          },
        },
        { note: 'Penalty 0: more collisions. Penalty 20: no better than 6. Reward design is part of the problem, and it is tested, not assumed.' },
      ],
    },

    {
      id: 'kart-seeds', number: '3.9', title: 'One run is one sample',
      goal: 'Report a training recipe\'s results over several seeds, with their spread, before claiming one method beats another.',
      builds: ['kart-reward-design'],
      blocks: [
        { md: `Everything random in a training run comes from its seed: the practice laps, the exploring, Double Q's coin. A different seed gives a different driver. So a single run tells you about **one driver**, not about the **recipe**.

The five seeds behind lesson 3.4's ${pct(T['q-sector'].sunlit)}: **${spread('q-sector')}**. For SARSA: ${spread('sarsa-sector')}. The ranges overlap. And each number is itself a test on 50 laps, so it carries its own noise: a driver that truly finishes 90% of laps would score between about 82% and 98% on 50 laps (two standard errors, $2\\sqrt{0.9 \\times 0.1 / 50} \\approx 0.085$).

So a careful claim reports: the recipe, the number of seeds, the mean and the spread, and the size of the test. "Q-learning beat SARSA" from one seed each is not a result; "over five seeds, Q-learning finished ${pct(T['q-sector'].sunlit)} and SARSA ${pct(T['sarsa-sector'].sunlit)} of 50 held-out laps, ranges ${spread('q-sector')} and ${spread('sarsa-sector')}" is.` },
        { figure: 'SeedsFig', caption: 'Every measured run: one dot per training seed, for each recipe. The spread within a recipe is often as big as the difference between recipes.' },
        {
          predict: {
            prompt: 'A driver truly finishes 90% of laps. Tested on 50 laps, what is the standard error of its measured finish rate? (3 decimals)',
            answer: Math.sqrt(0.9 * 0.1 / 50), tolerance: 0.0006, compute: () => Math.sqrt(0.9 * 0.1 / 50),
            explain: '$\\sqrt{0.9 \\times 0.1 / 50} = \\sqrt{0.0018} = 0.042$: about 4 percentage points. Two drivers 5 points apart on one 50-lap test are not clearly different.',
          },
        },
        { note: 'Report recipes over **several seeds**, with the spread, and remember each test has its own noise ($\\sqrt{p(1-p)/n}$). One run is an anecdote.' },
      ],
    },
  ],
}
