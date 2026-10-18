// The lab's map: four parts that build, piece by piece, the learner shown in lesson 0.
// A lesson with `built: true` has content in lessons/index.js; the rest are planned, in order,
// each with what it will build (see docs/ml-foundations-lab.md for the plan).
export const PARTS = [
  {
    id: 'start', title: 'Start here', blurb: 'The finished learner, running on a maze. Every later lesson builds one of its ideas.',
    lessons: [
      { id: 'finish', number: 0, title: 'The finish line', summary: 'Watch a mouse learn a maze from nothing; predict, then experiment with its knobs.', built: true },
    ],
  },
  {
    id: 'world', title: 'Part 1 · The world as data', blurb: 'Turn a maze into data a program can ask questions of, and play it.',
    lessons: [
      { id: 'maps', number: 1, title: 'Maps from text', summary: 'parse_map and legal_moves: squares by address, walls and edges.', built: true },
      { id: 'moves', number: 2, title: 'What a move does', summary: 'move_chances and build_table: icy floors, bumps, payments, chances that add to 1.', built: true },
      { id: 'episodes', number: 3, title: 'Playing one game', summary: 'sample_outcome and play_episode: chance picks an outcome; the agent–environment loop.', built: true },
    ],
  },
  {
    id: 'compute', title: 'Part 2 · Worth by computation', blurb: 'When you know the table, work out exactly what every square is worth.',
    lessons: [
      { id: 'averages', number: 4, title: 'Weighted averages', summary: 'expected_value, option_values, best_option: the worth of a move is the chance-weighted average of its outcomes.', built: true },
      { id: 'backfill', number: 5, title: 'Backfilling from the goal', summary: 'steps_to_goal and sweep_values: worth flows backwards from the cheese, the Bellman equation.', built: true },
      { id: 'discount', number: 6, title: 'Later counts for less', summary: 'discounted_total and horizon: why g is 0.9 and not 1, geometric series, and when a crumb now beats cheese later.', built: true },
      { id: 'plans', number: 7, title: 'Plans from values', summary: 'greedy_plan and evaluate_plan: read the best move off the worths; evaluate a plan, improve it, repeat.', built: true },
      { id: 'value-iteration', number: 'A1', title: 'Assembly: your own planner', summary: 'plan_maze and policy_iteration: your Part 2 pieces wired into a planner for any map, ice and all.', built: true },
    ],
  },
  {
    id: 'learn', title: 'Part 3 · Learning from samples', blurb: 'No table: learn the same numbers just by playing.',
    lessons: [
      { id: 'sampling', number: 8, title: 'Sampling', summary: 'estimate and estimate_outcomes: averages and chances from tries, and the 1/√n wobble.', built: true },
      { id: 'running', number: 9, title: 'Running averages', summary: 'update_mean and running_means: one sample at a time, the surprise, and the alpha in the learning line.', built: true },
      { id: 'bootstrap', number: 10, title: 'Estimates from estimates', summary: 'best and q_update: the target reward + g × best(q[next]), learning from your own guesses.', built: true },
      { id: 'explore', number: 11, title: 'Trying vs repeating', summary: 'choose and run_bandit: greedy, epsilon and optimism; when to try something new.', built: true },
      { id: 'q-learning', number: 'A2', title: 'Assembly: your own Q-learner', summary: 'train: lesson 0\'s program, written entirely from your pieces and checked move by move.', built: true },
    ],
  },
  {
    id: 'approx', title: 'Part 4 · From tables to formulas', blurb: 'Replace the table with a formula that can generalise: the road to neural networks.',
    lessons: [
      { id: 'formulas', number: 12, title: 'Tables vs formulas', summary: 'one_hot, predict and nudge: features, shared weights, and generalising to squares never seen.', built: true },
      { id: 'slopes', number: 13, title: 'Slopes and descent', summary: 'slope, descend and fit_step: gradient descent, learning rates, and why the nudge walks downhill.', built: true },
      { id: 'layers', number: 14, title: 'Layers and backprop', summary: 'forward and gradients: a tiny neural network, every slope by the chain rule.', built: true },
      { id: 'batches', number: 15, title: 'Batches and memory', summary: 'Replay and batch_nudge: forgetting, replay memories and mini-batches.', built: true },
      { id: 'deep-q', number: 'A3', title: 'Assembly: Q-learning with a formula', summary: 'train_formula: your Q-learner with a formula, replay and mini-batches; where it generalises and where it breaks.', built: true },
    ],
  },
]

export const ALL = PARTS.flatMap(p => p.lessons.map(l => ({ ...l, part: p.id, partTitle: p.title })))
export const BUILT = ALL.filter(l => l.built)
export const TITLES = Object.fromEntries(ALL.map(l => [l.id, `${typeof l.number === 'number' ? `Lesson ${l.number}` : l.number}: ${l.title}`]))
