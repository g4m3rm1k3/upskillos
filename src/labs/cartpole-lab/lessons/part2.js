// Part 2: from four real numbers to a row of a table. Slots (bins), one state number from four
// slots, and what cutting into slots loses.
import { BinnedCartPole, makeEdges, slot, toState, COUNTS } from '../engine/bins.js'
import { f, s, v, tf } from './util.js'

const angleEdges = makeEdges(0.21, 6)

export const PART2 = {
  id: 'part2', title: 'Part 2 · From numbers to a table', lessons: [
    {
      id: 'slots', number: '2.1', title: 'Cutting a number into slots',
      goal: 'Turn a real number into a slot number with evenly spaced cut points, by hand and with `make_edges` and `slot`, and explain why the middle cut point isn\'t exactly 0.',
      builds: ['cart-four-numbers'],
      blocks: [
        { md: `The learning methods of Part 3 keep a **table**: one row per situation, one column per action, and in each cell a number saying how good that action is there. A table needs its rows numbered 0, 1, 2, … But CartPole's state is four **real** numbers: $\\theta$ could be 0.0312 or 0.03121 or any of infinitely many values. No table has infinitely many rows.

The fix is to **cut each number into slots** (also called **bins**), like the ranges of a histogram. The pole's angle from −0.21 to +0.21 rad, cut into 6 equal slots, is 6 ranges, each 0.07 rad wide. Every angle falls in exactly one of them; the agent only remembers **which**.` },
        {
          code: {
            file: 'bins.py', fn: 'make_edges', notes: [
              ['width = 2 * limit / count', ['The slots cover $-\\text{limit}$ to $+\\text{limit}$, a length of $2 \\cdot \\text{limit}$, shared equally by `count` slots.'], { tex: 'w = \\frac{2L}{n}', calc: x => [`2 × ${f(x.limit)} / ${x.count}`, 2 * x.limit / x.count] }],
              ['return [-limit + width * i for i in range(1, count)]', ['A **list comprehension**: `[expression for i in range(1, count)]` builds a list by working out the expression once for each `i`. The cut points sit at $-L + w, -L + 2w, \\dots$: `count − 1` of them, between the slots (none at the very ends).'], { tex: 'e_i = -L + i\\,w,\\quad i = 1, \\dots, n-1', calc: x => [`[−${f(x.limit)} + ${f(x.width)} × i for i in 1 … ${x.count - 1}]`, makeEdges(x.limit, x.count)] }],
            ],
          },
        },
        {
          predict: {
            prompt: 'For the angle, `make_edges(0.21, 6)`: how wide is each slot, in radians?',
            answer: 0.07, tolerance: 1e-9, compute: () => 2 * 0.21 / 6,
            explain: '$2 \\times 0.21 / 6 = 0.07$ rad, about 4°. The cut points are at $-0.14, -0.07, 0, 0.07, 0.14$.',
          },
        },
        { md: `Now, which slot is a value in? Count the cut points at or below it. Below every cut point: slot 0. Above all five: slot 5.` },
        {
          code: {
            file: 'bins.py', fn: 'slot', notes: [
              ['n = 0', ['A counter, starting at zero.']],
              ['for edge in edges:', ['Look at each cut point in turn, left to right.']],
              ['if value >= edge:', ['Is the value at or past this cut point?'], { logic: 'If the value is **at or to the right of** this cut point, it is in a slot past it: count it.', calc: x => [`${s(x.value)} >= ${s(x.edge)}`, x.value >= x.edge] }],
              ['n += 1', ['Count it.']],
              ['return n', ['How many cut points it passed: the slot number, 0 to `len(edges)`.'], { tex: '\\text{slot}(v) = \\#\\{\\, i : e_i \\le v \\,\\}' }],
            ],
          },
        },
        { figure: 'SlotsFig', props: { which: 2 }, caption: 'Drag the value. Try very large values: anything past the last cut point is the last slot, so the outer slots stretch to infinity.' },
        {
          predict: {
            prompt: 'The pole\'s angle is $\\theta = -0.1$. With the angle\'s cut points $(-0.14, -0.07, 0, 0.07, 0.14)$, which slot is it in?',
            answer: slot(-0.1, angleEdges), compute: () => slot(-0.1, angleEdges),
            explain: 'Only $-0.14 \\le -0.1$; the other four cut points are above it. One cut point passed: slot 1, the range $-0.14$ to $-0.07$.',
            misconceptions: [{ answer: 2, feedback: '$-0.1$ is less than $-0.07$, so that cut point is not passed. Count only cut points **at or below** the value.' }],
          },
        },
        { h: 'A detail: 0 isn\'t quite 0' },
        { md: `Work out the middle cut point the way the computer does: $-0.21 + 0.07 \\times 3$. On paper that is 0. In floating point it is **$-2.78 \\times 10^{-17}$**, because neither 0.21 nor 0.07 can be stored exactly in binary (the same reason \`0.1 + 0.2\` prints \`0.30000000000000004\` in Python).

So a pole at exactly $\\theta = 0$ is just past the middle cut point: slot 3, the "leaning right" side. It makes no practical difference here (an angle of exactly 0.0 never happens in a game), but it is worth knowing that a comparison against a computed boundary can tip either way. The figure above shows the cut point as stored.` },
        {
          choice: {
            prompt: 'The spin $\\dot\\theta$ is cut into 12 slots from −3.5 to 3.5. What slot is $\\dot\\theta = 10$ in, and what does that mean?',
            options: [
              { text: 'Slot 11, the last: the table can\'t tell 10 rad/s from 3 rad/s', why: 'Yes. Past the last cut point (2.92) everything is slot 11. The limit should cover the values that really happen.' },
              { text: 'No slot: it is out of range and the program crashes', why: '`slot` just counts cut points passed: all 11, so slot 11. Nothing crashes.' },
              { text: 'Slot 12', why: 'There are 11 cut points, so the largest count is 11. Slots are numbered 0 to 11.' },
              { text: 'Slot 0', why: 'Slot 0 is for values below the first cut point.' },
            ],
            answer: 0,
          },
        },
        { note: '**Slots** turn a real number into a whole number: `count − 1` evenly spaced cut points from `make_edges`, and `slot` counts how many the value has passed. Values beyond the limits land in the outermost slots.' },
      ],
    },

    {
      id: 'state-number', number: '2.2', title: 'Four slots, one state number',
      goal: 'Combine four slot numbers into one row number like digits of a number, follow `BinnedCartPole` from the real world to a state number, and say how many rows a choice of slots makes.',
      builds: ['slots'],
      blocks: [
        { md: `Each of the four numbers now has a slot. The table needs **one** row number. Think of an odometer, or how digits make a number: in 47, the 4 counts tens and the 7 counts ones. With slots it is the same, except each "digit" has its own base: the angle has 6 slots and the spin 12, so

$$\\text{state} = \\text{angle slot} \\times 12 + \\text{spin slot}$$

and the four numbers together, with slot counts $(n_1, n_2, n_3, n_4)$ and slots $(s_1, s_2, s_3, s_4)$:

$$\\text{state} = ((s_1 \\cdot n_2 + s_2) \\cdot n_3 + s_3) \\cdot n_4 + s_4$$

Every combination of slots gets a different number, from 0 to $n_1 n_2 n_3 n_4 - 1$. (It is the same idea as numbering grid cells row by row, $\\text{row} \\times n_\\text{cols} + \\text{col}$, with four "directions" instead of two.)` },
        {
          code: {
            file: 'bins.py', fn: 'to_state', notes: [
              ['state = 0', ['Start from 0.']],
              ['for s, count in zip(slots, counts):', ['Walk the slots and their counts together, first quantity first.']],
              ['state = state * count + s', ['Shift what we have so far up by this quantity\'s slot count, and add its slot: like appending a digit.'], { tex: '\\text{state} \\leftarrow \\text{state} \\cdot n_k + s_k', calc: x => [`${x.state} × ${x.count} + ${x.s}`, x.state * x.count + x.s] }],
              ['return state', ['One whole number: a row of the table.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'With counts $(1, 1, 6, 12)$ and slots $(0, 0, 3, 7)$, what is the state number?',
            answer: toState([0, 0, 3, 7], [1, 1, 6, 12]), compute: () => toState([0, 0, 3, 7], [1, 1, 6, 12]),
            explain: '$((0 \\cdot 1 + 0) \\cdot 6 + 3) \\cdot 12 + 7 = 3 \\cdot 12 + 7 = 43$. The first two quantities have one slot each, so they always contribute 0.',
            misconceptions: [{ answer: 37, feedback: 'That is $3 + 7 \\cdot \\dots$ the wrong way round. The **last** quantity changes fastest: angle slot × 12 + spin slot.' }],
          },
        },
        { h: 'The binned world' },
        { md: `\`BinnedCartPole\` wraps the real world. It has the same \`reset\` and \`step\` (so every learner can use it without knowing it is CartPole), but reports a state **number** instead of four floats. This is a common pattern, called a **wrapper**: Gymnasium has dozens (to cut episodes short, rescale rewards, stack frames, …).` },
        {
          code: {
            file: 'bins.py', fn: 'BinnedCartPole.__init__', notes: [
              ['self.world = CartPole(**physics)', ['The real world inside. `**physics` passes on any extra keyword arguments (`force=20.0`, …) unchanged: Part 6 uses it to change the physics.']],
              ['self.counts = counts', ['Slots per number: `(1, 1, 6, 12)` by default. One slot for $x$ and $\\dot x$ means **the table ignores the cart** and spends all its rows on the pole.']],
              ['self.edges = [make_edges(limit, count)', ['Every number\'s cut points, worked out once. `zip(limits, counts)` pairs each limit with its count.']],
              ['self.n_states = 1', ['The number of rows is the product of the counts…']],
              ['for count in counts:', ['…multiplied up one count at a time…']],
              ['self.n_states *= count', ['…`*=` multiplies in place: $1 \\times 1 \\times 6 \\times 12 = 72$.'], { tex: 'N = \\prod_k n_k' }],
              ['self.n_actions = 2', ['Still two pushes.']],
            ],
          },
        },
        {
          code: {
            file: 'bins.py', from: 42, to: 52, notes: [
              ['slots = [slot(value, edges) for value, edges in zip(observation, self.edges)]', ['A list comprehension over four pairs: each number with its own cut points, into its slot.'], { calc: x => [`slot of each of ${v(x.observation)}`, x.observation.map((val, i) => slot(val, x.self.edges[i]))] }],
              ['return to_state(slots, self.counts)', ['Four slots into one row number.']],
              ['observation, info = self.world.reset(seed=seed)', ['Reset the real world: four floats.']],
              ['return self.state_of(observation), info', ['Report the start as a row number instead.']],
              ['observation, reward, terminated, truncated, info = self.world.step(action)', ['Step the real world.']],
              ['return self.state_of(observation), reward', ['The same five values, the state turned into a number. Reward and endings pass through unchanged: the binned world is the same game, seen through slots.']],
            ],
          },
        },
        { figure: 'StateNumberFig', props: { seed: 0 }, caption: 'A game of "lean ahead", step by step: the four numbers, their slots, and the row. Because the rule keeps the pole near upright, the agent stays in a few rows near the middle.' },
        {
          code: {
            file: 'experiments.py', fn: 'play_binned', notes: [
              ['env = BinnedCartPole()', ['The binned world with default slots.']],
              ['state, info = env.reset(seed=seed)', ['`state` is now a whole number.']],
              ['seen = [state]', ['Every row visited, in order.']],
              ['done = False', ['The usual loop.']],
              ['while not done:', ['Until the game ends.']],
              ['action = lean_ahead(env.world.state, None)', ['"Lean ahead" needs the real numbers, so it reads them from the world inside: `env.world.state`. (A table learner will only have the row number.) `None` for the unused random generator.']],
              ['state, reward, terminated, truncated, info = env.step(action)', ['Step, getting a row number back.']],
              ['seen.append(state)', ['Keep it.']],
              ['done = terminated or truncated', ['Over?']],
              ['return seen', ['The rows of the whole game.']],
            ],
            caption: 'what the Python tab runs for this lesson',
          },
        },
        {
          predict: {
            prompt: 'With counts $(3, 3, 6, 12)$, how many rows does the table have?',
            answer: 3 * 3 * 6 * 12, compute: () => new BinnedCartPole([3, 3, 6, 12]).nStates,
            explain: '$3 \\times 3 \\times 6 \\times 12 = 648$: nine times as many as the default 72, just for telling apart three cart positions and three cart speeds.',
          },
        },
        { python: { program: 'binned', label: 'Step through a game in the binned world' } },
        { added: true, h: 'State number and action: the two indexes for everything' },
        { added: true, md: `After this lesson, two whole numbers describe every decision a table learner makes:

- the **state number**, 0 to 71 with the default slots: the four real numbers, each cut into a slot, combined into one row number;
- the **action**: \`0\` push left, \`1\` push right.

The same start as lesson 1.3 (\`reset(seed=0)\`), seen through the slots:

\`\`\`python
env = BinnedCartPole()
env.reset(seed=0)   # -> (29, {})                     the four numbers became row 29
env.step(1)         # -> (29, 1.0, False, False, {})  still row 29 after one small push
env.n_states        # 72
\`\`\`

\`step\` gives back the same five things as before, with the state number in place of the four floats. Part 3's table is a NumPy array with one row per state number and one column per action, so every value it learns is **\`Q[state, action]\`**: \`Q[29, 1]\` is how good pushing right is in row 29. When later code looks confusing, ask first: *which state number, which action?*` },
        { note: 'The state number is the slots read as **digits with their own bases**: $((s_1 n_2 + s_2) n_3 + s_3) n_4 + s_4$. `BinnedCartPole` is a **wrapper**: the same game, the same `reset`/`step`, seen through slots, with $\\prod n_k$ rows.' },
      ],
    },

    {
      id: 'what-slots-lose', number: '2.3', title: 'What the slots lose',
      goal: 'Explain the Markov property, show two real states that share a row but need opposite pushes, and weigh fine slots against coarse ones.',
      builds: ['state-number', 'rules-by-hand'],
      blocks: [
        { md: `The real CartPole has a valuable property: **the four numbers tell you everything** about what can happen next. Two games in exactly the same state have exactly the same futures (for the same pushes). Where the cart was a second ago adds nothing. This is called the **Markov property**: the future depends only on the present state, not on the path to it.

Learning methods rely on it. Part 3's Q-learning estimates "how good is push $a$ in state $s$", and that only makes sense if state $s$ always means the same situation.

**Slots break it a little.** A row stands for a whole range of real states: every pole angle between −0.07 and 0, every spin between 0 and 0.58. Those states don't all have the same future, and they don't all need the same push.` },
        { figure: 'AliasFig', caption: 'State A ($\\theta = -0.065$, spinning right fast) and state B ($\\theta = -0.065$, almost still) are in the same slots, so the same row. "Lean ahead" pushes A right (it is about to swing over) and B left. A table must pick one push for the row.' },
        {
          choice: {
            prompt: 'Why can\'t a table with rows from `BinnedCartPole` always push the way "lean ahead" does?',
            options: [
              { text: 'Some rows contain states where "lean ahead" pushes left and others where it pushes right, and a row has only one best push', why: 'Yes. Two states that look the same to the table (same row) can need different actions. The table must compromise.' },
              { text: 'The table doesn\'t know the angle', why: 'It knows the angle\'s **slot**, which is most of it. It is the detail inside a slot it loses.' },
              { text: 'Because tables can\'t learn', why: 'They can (Part 3). This is about what they can represent.' },
              { text: 'Because the binned world has different physics', why: 'The physics is identical; only what the agent sees is coarser.' },
            ],
            answer: 0,
          },
        },
        { h: 'Fine or coarse?' },
        { md: `More slots means rows that stand for smaller ranges: fewer compromises. But every row has to be learned **from its own visits**, and nothing learned in one row helps its neighbours. Double the slots of each number and there are $2^4 = 16$ times as many rows, each visited a sixteenth as often.

That is the central limit of tables, and the reason Part 4 replaces them with functions that **generalise**: a weight learned from one state applies to similar states too.` },
        { figure: 'SlotCounts', caption: 'Choose slot counts. In 10,000 steps of good play, how many rows does the agent even visit?' },
        {
          choice: {
            prompt: 'The default slots are $(1, 1, 6, 12)$: one slot for the cart\'s position and speed. What does that cost?',
            options: [
              { text: 'The table can\'t see where the cart is, so it can\'t learn to steer the cart back from the edge', why: 'Right. A table agent with these slots can only balance the pole; if the cart drifts towards ±2.4 m, nothing in its state says so. Lesson 3.8 shows the games it loses this way.' },
              { text: 'Nothing: the cart doesn\'t matter in CartPole', why: 'Leaving the track ends the game too. "Lean ahead" ignores the cart and gets away with it for 500 steps, but that is luck of the physics, not a guarantee.' },
              { text: 'The table gets bigger', why: 'One slot is the smallest possible: it adds nothing to the size.' },
              { text: 'The pole\'s angle is ignored', why: 'The angle has 6 slots and the spin 12: that is where the rows go.' },
            ],
            answer: 0,
          },
        },
        { note: 'The real state is **Markov**: it says everything about the future. A row of slots stands for a range of real states, which may need different actions, so a table must compromise. Finer slots compromise less but give more rows to learn, each from its own visits. Functions that generalise (Part 4) are the way out.' },
      ],
    },
  ],
}
