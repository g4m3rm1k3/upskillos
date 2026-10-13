// Part 4: driving on a track it has never seen. The sector table memorises Sunlit Circuit and fails
// on Harbour Loop; sensors relative to the kart make a 243-key table that transfers; a linear
// function of 15 features does too, with a step size that has to be chosen carefully.
import { reset, sensors, sensorKey, N_SENSOR_KEYS, SUNLIT } from '../engine/kart.js'
import { features } from '../engine/tabular.js'
import M from '../engine/measured.json'
import { f } from './util.js'

const T = M.tables, L = M.linear
const pct = x => `${(100 * x).toFixed(1)}%`
const spot = { ...reset(1, 1), p: 11, speed: 2, ticks: 0 }

export const PART4 = {
  id: 'part4', title: 'Part 4 · A track it has never seen', lessons: [
    {
      id: 'kart-memorised', number: '4.1', title: 'A table that memorised the track',
      goal: 'Test drivers on a track they never practised on, and explain why the sector table fails completely.',
      builds: ['kart-seeds'],
      blocks: [
        { md: `Every driver so far practised on Sunlit Circuit and was tested on Sunlit Circuit, on different laps. That tests whether it learned the **laps**. It doesn't test whether it learned to **drive**. For that, test it somewhere new: **Harbour Loop**, the second track of lesson 1.2, same length, same physics, different barriers and sweepers. No driver has ever seen it.

The five Q-learning drivers that finished ${pct(T['q-sector'].sunlit)} of Sunlit's test laps finish **${pct(T['q-sector'].harbour)}** of Harbour's. Not a few: none. SARSA ${pct(T['sarsa-sector'].harbour)}, Double Q ${pct(T['double-sector'].harbour)}. Even 8,000 practice laps (${pct(T['q-sector-8000'].sunlit)} on Sunlit) give ${pct(T['q-sector-8000'].harbour)}.` },
        { md: `The reason is in the observation. Its key starts with the **sector**. On Sunlit, the barrier at sector 15 is in lane 1, so the table learned "at sectors 12 to 14 in lane 1, change lanes". On Harbour, sector 15 has no barrier in lane 1, but sector 12 has one in lane 2, and the table's rows for sectors 9 to 11 in lane 2 say "accelerate": nothing was ever there. The barriers themselves are not in the observation at all; the table only knew where they were **on Sunlit** by remembering which sectors hurt.

This is **memorisation**, or **overfitting to the training environment**: the driver learned facts about one track instead of a skill. It is the reinforcement-learning version of a model that scores perfectly on its training data and fails on new data.` },
        { figure: 'TransferTable', props: { rows: ['q-sector', 'sarsa-sector', 'double-sector'] }, caption: 'Five seeds per recipe, 50 test laps per track.' },
        {
          choice: {
            prompt: 'You retrain the sector table on Harbour Loop instead. What will it do on Sunlit Circuit?',
            options: [
              { text: 'Fail there in the same way: it will have memorised Harbour\'s sectors', why: 'Yes. Swapping the training track swaps what is memorised. The problem is the observation, not the track.' },
              { text: 'Drive both tracks well, having now seen two', why: 'It has seen one, Harbour. A table indexed by sector can only remember sectors.' },
            ],
            answer: 0,
          },
        },
        { note: 'Test on **environments** the learner never trained on, not just on new episodes of the same one. The sector table scores ' + pct(T['q-sector'].harbour) + ' on Harbour: it memorised Sunlit.' },
      ],
    },

    {
      id: 'kart-sensors', number: '4.2', title: 'Sensors instead of sectors',
      goal: 'Design an observation relative to the kart, count its keys, and measure that it transfers and learns faster.',
      builds: ['kart-memorised', 'kart-hazard-mask'],
      blocks: [
        { md: `Drop the sector. Instead, describe what a driver in the cockpit could **see**: for each lane, how close the nearest hazard ahead is, counting barriers, sweepers and karts alike. Three levels per lane: **0** clear, **1** something within 6 sectors, **2** something within 3. Together with the lane and speed:

$$\\text{key} = ((\\text{lane} \\times 3 + \\text{speed}) \\times 3 + n_0) \\times 9 + n_1 \\times 3 + n_2$$

That is $3 \\times 3 \\times 27 = 243$ keys, against 10,368. Nothing in it says where on the lap the kart is, so it means the same thing on any track. The hand-written careful driver of lesson 1.6 already looked at exactly these numbers.` },
        {
          code: {
            file: 'observe.py', fn: 'sensors', notes: [
              ['def sensors(state, traffic, track=SUNLIT):', ['Three numbers, one per lane.']],
              ['length = track["length"]', ['144.']],
              ['near = [0, 0, 0]', ['All clear, until something is found.']],
              ['for thing in barriers(track) + sweepers(state["ticks"], track) + list(traffic):', ['**Every** hazard, barriers included: this is what the sector observation never contained.']],
              ['d = ahead(state["p"], thing["p"], length)', ['How far ahead.']],
              ['if d >= length - SIZE:', ['Alongside, just behind…']],
              ['d = 0', ['…counts as right here.']],
              ['level = 2 if d <= NEAR else 1 if d <= FAR else 0', ['Within 3 (`NEAR`) is 2; within 6 (`FAR`) is 1; further is 0. A chained conditional expression reads left to right.'], { calc: q => [`d = ${q.d}`, q.d <= 3 ? 2 : q.d <= 6 ? 1 : 0] }],
              ['for lane in range(3):', ['Each lane the hazard is in…']],
              ['if touches(thing, lane):', ['(now or next tick)']],
              ['near[lane] = max(near[lane], level)', ['…keeps the most dangerous level found.']],
              ['return near', ['For example `[0, 2, 1]`: lane 0 clear, lane 1 danger close, lane 2 something further on.']],
            ],
          },
        },
        {
          code: {
            file: 'observe.py', fn: 'sensor_key', notes: [
              ['def sensor_key(state, traffic, track=SUNLIT):', ['The sensor observation as one key, for a table.']],
              ['near = sensors(state, traffic, track)', ['The three readings.']],
              ['return ((state["lane"] * 3 + state["speed"]) * 3 + near[0]) * 9 + near[1] * 3 + near[2]', ['Mixed radix again: 243 keys, 0 to 242.'], { tex: 'k = ((\\ell \\cdot 3 + v) \\cdot 3 + n_0) \\cdot 9 + 3n_1 + n_2' }],
            ],
          },
        },
        { figure: 'SensorFig', caption: 'The sensors at one moment on either track. The same readings mean the same thing anywhere.' },
        { md: `The learning code doesn't change at all: \`train({"view": "sensors"})\` uses \`sensor_key\` instead of \`observe\`. Five seeds, 2,500 practice laps:

| Observation | Keys | Sunlit | Harbour (never seen) | After only 500 laps: Sunlit, Harbour |
|---|---|---|---|---|
| Sector | 10,368 | ${pct(T['q-sector'].sunlit)} | ${pct(T['q-sector'].harbour)} | ${pct(T['q-sector-500'].sunlit)}, ${pct(T['q-sector-500'].harbour)} |
| Sensors | 243 | ${pct(T['q-sensors'].sunlit)} | **${pct(T['q-sensors'].harbour)}** | ${pct(T['q-sensors-500'].sunlit)}, ${pct(T['q-sensors-500'].harbour)} |

The sensor driver drives Harbour as well as Sunlit, a track it has never seen. And with 500 laps it is already far ahead: 243 rows fill up 40 times faster than 10,368, and everything learned at one barrier applies at every other barrier. Representation is the same lesson as Yahtzee's afterstates, from the other direction: a smaller observation that keeps what matters learns faster **and** generalises.

With 8,000 laps the sector table gets better on Sunlit (${pct(T['q-sector-8000'].sunlit)}) than the sensors ever do (${pct(T['q-sensors-8000'].sunlit)}): knowing the exact sector lets it plan around this track's barriers more precisely than "something within 3". A **specialist** against a **generalist**: which is better depends on whether you'll ever race anywhere else.` },
        {
          predict: {
            prompt: 'In the picture\'s situation on Sunlit (sector 11, lane 1, speed tier 2, tick 0), what is `sensor_key`?',
            answer: sensorKey(spot, [], SUNLIT), compute: () => { const n = sensors(spot, [], SUNLIT); return ((1 * 3 + 2) * 3 + n[0]) * 9 + n[1] * 3 + n[2] },
            explain: `The readings are [${sensors(spot, [], SUNLIT).join(', ')}]. Key $= ((1 \\times 3 + 2) \\times 3 + ${sensors(spot, [], SUNLIT)[0]}) \\times 9 + ${sensors(spot, [], SUNLIT)[1]} \\times 3 + ${sensors(spot, [], SUNLIT)[2]} = ${sensorKey(spot, [], SUNLIT)}$.`,
          },
        },
        {
          predict: {
            prompt: 'How many keys does the sensor observation have?',
            answer: N_SENSOR_KEYS, compute: () => 3 * 3 * 3 ** 3,
            explain: '3 lanes × 3 speeds × 3 levels in each of 3 lanes $= 9 \\times 27 = 243$.',
          },
        },
        { note: `**Relative** observations (what's near me) transfer; **absolute** ones (where on this track I am) memorise. Sensors: 243 keys, ${pct(T['q-sensors'].harbour)} on a never-seen track, and faster learning.` },
      ],
    },

    {
      id: 'kart-linear', number: '4.3', title: 'From a table to a function',
      goal: 'Replace the table with a linear function of features, derive its semi-gradient update, and see what too large a step does.',
      builds: ['kart-sensors'],
      blocks: [
        { md: `A table has a separate number for every key, so learning about one key teaches nothing about another, even a nearly identical one. A **function** can share what it learns. The simplest is **linear**: describe the situation by a list of numbers, the **features** $\\mathbf x(s)$, and give each action a list of **weights** $\\mathbf w_a$:

$$\\hat Q(s, a) = \\mathbf w_a \\cdot \\mathbf x(s) = \\sum_i w_{a,i}\\, x_i(s)$$

Our 15 features, all 0 or 1: a constant 1 (the **bias**), the speed tier (one of three), the danger level of the lane to the **left**, **this** lane and the lane to the **right** (one of three each, all zero if there is no such lane), and whether the kart is at either edge. Note "left of me" rather than "lane 0": features relative to the kart, again. 5 actions × 15 = **75 weights**, against 243 × 5 = 1,215 table entries.` },
        {
          code: {
            file: 'linear.py', fn: 'features', notes: [
              ['def features(state, cars, track):', ['15 numbers.']],
              ['near = sensors(state, cars, track)', ['The sensor readings.']],
              ['x = [1.0]', ['The bias: always 1, so each action has a baseline value.']],
              ['for s in range(3):', ['Speed tier as three 0/1 features: **one-hot** encoding. Exactly one is 1.']],
              ['x.append(1.0 if state["speed"] == s else 0.0)', ['1.0 for the current tier, 0.0 for the other two.']],
              ['for side in (-1, 0, 1):', ['Left of me, my lane, right of me.']],
              ['lane = state["lane"] + side', ['Which lane that is.']],
              ['for level in range(3):', ['One-hot over its danger level…']],
              ['x.append(1.0 if 0 <= lane <= 2 and near[lane] == level else 0.0)', ['…or all zeros if the lane doesn\'t exist.']],
              ['x.append(1.0 if state["lane"] == 0 else 0.0)', ['At the left edge.']],
              ['x.append(1.0 if state["lane"] == 2 else 0.0)', ['At the right edge.']],
              ['return x', ['Length 1 + 3 + 9 + 2 = 15.']],
            ],
          },
        },
        {
          code: {
            file: 'linear.py', fn: 'q_values', notes: [
              ['def q_values(weights, x):', ['Every action\'s value.']],
              ['values = []', ['One value per action.']],
              ['for a in range(5):', ['Each action…']],
              ['total = 0.0', ['Start the sum.']],
              ['for w, xi in zip(weights[a], x):', ['…its weights paired with the features…']],
              ['total += w * xi', ['…multiplied and added: the **dot product**.'], { tex: '\\hat Q(s, a) = \\sum_i w_{a,i} x_i' }],
              ['values.append(total)', ['This action\'s value.']],
              ['return values', ['Five numbers, like a table row.']],
            ],
          },
        },
        { md: `How should the weights learn? We want $\\hat Q(s, a)$ close to the target $y = r + \\gamma \\max_{a'} \\hat Q(s', a')$. Measure closeness by the squared error $\\tfrac12 (y - \\hat Q)^2$ and take a step of **gradient descent**, treating $y$ as fixed. The derivative of $\\hat Q(s, a)$ with respect to $w_{a,i}$ is just $x_i$, so

$$w_{a,i} \\leftarrow w_{a,i} + \\alpha\\,\\big(y - \\hat Q(s, a)\\big)\\, x_i$$

Only the chosen action's weights change, and only those whose feature is on. Because the target itself contains $\\hat Q$ and we pretend it doesn't, this is called **semi-gradient** Q-learning. With a one-hot feature per key it would be exactly the table update; with shared features it generalises.` },
        {
          code: {
            file: 'linear.py', fn: 'train', notes: [
              ['def train(episodes=2500, alpha=0.02, gamma=0.95, epsilon=0.9, floor=0.04, penalty=6, seed=42, track=SUNLIT):', ['The same recipe as the tables, with a smaller step: many weights share each update.']],
              ['config = dict(DEFAULTS, traffic=True)', ['Practice traffic on.']],
              ['rng = random.Random(seed)', ['All of the run\'s randomness.']],
              ['weights = [[0.0] * 15 for _ in range(5)]', ['Five lists of 15 zeros. (A list comprehension makes five **separate** lists.)']],
              ['for episode in range(episodes):', ['One practice lap per trip.']],
              ['lap_seed = rng.randrange(100000)', ['A practice lap.']],
              ['state = reset(lap_seed)', ['Start it.']],
              ['eps = floor + (epsilon - floor) * max(0, 1 - episode / max(1, episodes * 0.8))', ['The same schedule.']],
              ['x = features(state, cars_at(0, lap_seed, config, track), track)', ['Features of the first state.']],
              ['while not state["done"]:', ['Until the lap ends.']],
              ['if rng.random() < eps:', ['ε-greedy…']],
              ['action = rng.randrange(5)', ['…any action, or…']],
              ['action = argmax(q_values(weights, x))', ['…on the function\'s values.']],
              ['next_state = step(state, action, track, cars_at(state["ticks"], lap_seed, config, track), penalty)', ['Act.']],
              ['next_x = features(next_state, cars_at(next_state["ticks"], lap_seed, config, track), track)', ['Features of the result.']],
              ['future = 0.0 if next_state["done"] else max(q_values(weights, next_x))', ['$\\max_{a\'} \\hat Q(s\', a\')$, or 0 at the end.']],
              ['error = next_state["last"]["reward"] + gamma * future - q_values(weights, x)[action]', ['The TD error, $y - \\hat Q(s, a)$.'], { tex: '\\delta = r + \\gamma \\max_{a\'} \\hat Q(s\', a\') - \\hat Q(s, a)' }],
              ['for i in range(15):', ['Every weight of the chosen action…']],
              ['weights[action][i] += alpha * error * x[i]', ['…moves by α δ $x_i$: only features that are on.'], { tex: 'w_{a,i} \\leftarrow w_{a,i} + \\alpha\\, \\delta\\, x_i' }],
              ['state, x = next_state, next_x', ['Move on: the next state and its features become the current ones.']],
              ['return weights', ['75 numbers: the whole driver.']],
            ],
          },
        },
        {
          code: {
            file: 'linear.py', fn: 'evaluate', notes: [
              ['def evaluate(weights, track=SUNLIT, laps=50, penalty=6):', ['The same frozen test as for tables.']],
              ['config = dict(DEFAULTS, traffic=True)', ['Traffic on, as in training.']],
              ['finished = 0', ['Laps finished…']],
              ['hits = 0', ['…and collisions.']],
              ['for i in range(laps):', ['Each test lap.']],
              ['seed = 800001 + i * 97', ['Held-out seeds.']],
              ['state = reset(seed)', ['Start it.']],
              ['while not state["done"]:', ['Drive to the end.']],
              ['cars = cars_at(state["ticks"], seed, config, track)', ['The practice traffic.']],
              ['action = argmax(q_values(weights, features(state, cars, track)))', ['Greedy on the learned function.']],
              ['state = step(state, action, track, cars, penalty)', ['Move.']],
              ['finished += 1 if state["finished"] else 0', ['Count a finish…']],
              ['hits += state["crashes"]', ['…and the lap\'s collisions.']],
              ['return finished / laps, hits / laps', ['The finish rate and the average collisions per lap.']],
            ],
          },
        },
        {
          code: {
            file: 'linear.py', fn: 'driver', notes: [
              ['def driver(weights):', ['Learned weights as a policy, for races.']],
              ['return lambda state, cars, track: argmax(q_values(weights, features(state, cars, track)))', ['Greedy, frozen.']],
            ],
          },
        },
        { figure: 'LinearFig', caption: 'Train the linear driver in your browser and read its 75 weights: one row per action, one column per feature.' },
        { python: { program: 'linear', label: 'Train the linear driver in real Python' } },
        { md: `Measured, five seeds, 2,500 laps:

| Step size α | Sunlit | Harbour (never seen) |
|---|---|---|
| 0.01 | ${pct(L['0.01'].sunlit)} | ${pct(L['0.01'].harbour)} |
| 0.02 | ${pct(L['0.02'].sunlit)} | ${pct(L['0.02'].harbour)} |
| 0.05 | ${pct(L['0.05'].sunlit)} | ${pct(L['0.05'].harbour)} |

75 weights do about as well as 1,215 table entries, on both tracks. But look at α = 0.05: worse on average, and one seed (${L['0.05'].runs.map(r => pct(r.harbour[0])).join(', ')} on Harbour) does badly. With a table, a too-large step only makes one entry noisy. With a function, every update moves weights that **every** situation shares, and a big step can push values for unrelated situations far off; their errors feed the next targets, and the whole function can drift. Function approximation with bootstrapped targets is known to be able to diverge; small steps are the first defence.` },
        {
          predict: {
            prompt: 'How many weights does the linear driver have?',
            answer: 75, compute: () => 5 * features(spot, [], SUNLIT).length,
            explain: '5 actions × 15 features = 75.',
          },
        },
        {
          choice: {
            prompt: 'After an update for action Accelerate, which weights have changed?',
            options: [
              { text: 'Accelerate\'s weights whose features were 1 in that situation', why: 'Yes: $\\Delta w_{a,i} = \\alpha\\delta x_i$, zero unless $a$ was taken and $x_i = 1$. But those weights are shared by every situation where the same features are on, so the change generalises.' },
              { text: 'Every weight of every action', why: 'Only the taken action\'s weights appear in $\\hat Q(s, a)$, so only they have a gradient.' },
            ],
            answer: 0,
          },
        },
        { note: '**Linear function approximation**: $\\hat Q(s, a) = \\mathbf w_a \\cdot \\mathbf x(s)$, updated by $\\mathbf w_a \\mathrel{+}= \\alpha\\,\\delta\\,\\mathbf x$ (semi-gradient). 75 shared weights transfer like the sensor table; too large an α can make them drift.' },
      ],
    },

    {
      id: 'kart-generalisation', number: '4.4', title: 'What generalises, and why',
      goal: 'Compare every driver on both tracks and state the principles that decide whether learning transfers.',
      builds: ['kart-linear'],
      blocks: [
        { md: `All the drivers, side by side (five seeds each, 50 test laps per track):` },
        { figure: 'TransferTable', props: { rows: ['q-sector', 'sarsa-sector', 'double-sector', 'q-sensors', 'sarsa-sensors', 'double-sensors', 'linear-0.01', 'linear-0.02'] }, caption: 'Every recipe on the practice track and on the unseen one.' },
        { md: `Four principles come out of this part, and they hold far beyond karts:

1. **Test on what you didn't train on**, at the level you care about. New laps tested the laps; a new **track** tested the skill.
2. **Relative beats absolute.** Observations described from the agent's point of view ("danger on my left") mean the same thing everywhere; absolute ones ("sector 14") are facts about one world.
3. **Smaller representations learn faster**, as long as they keep what matters: 243 keys learned in 500 laps what 10,368 couldn't.
4. **Sharing is generalisation.** A function shares its weights across situations, so experience in one teaches about others. The price is that a bad update spreads too.

The next step, beyond this lab, is to learn the features themselves: a neural network reading raw sensors (or pixels) and producing values, as in DQN. The CartPole and QMaze labs build DQN from scratch; the Neural Net Lab builds the networks.` },
        {
          choice: {
            prompt: 'You want a driver for a third track you can\'t practise on. Which recipe from this lab would you choose, and why?',
            options: [
              { text: 'A sensor-based driver (table or linear): its observation doesn\'t mention the track, and it was measured to transfer to Harbour', why: 'Yes, with the honest caveat that two tracks are a small test: a third track with something new (a tighter chicane, faster sweepers) could still break it.' },
              { text: 'The sector table with the most practice laps, since it scores best on Sunlit', why: 'It scores best on **Sunlit** by memorising Sunlit. On a new track its keys point at the wrong sectors: lesson 4.1 measured 0%.' },
            ],
            answer: 0,
          },
        },
        { note: 'Generalisation is designed in: through what the observation describes, how big it is, and what the learner shares, and it is **measured** on held-out environments.' },
      ],
    },
  ],
}

