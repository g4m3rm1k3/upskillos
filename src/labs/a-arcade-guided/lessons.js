// The guided path: for each program, steps that put the program at a line, ask for a prediction
// about what that line (or the next few) will do, then run the real program and compare.
// Every answer comes from running the program, never from text written here; lessons.test.js
// checks every step reaches its line and that the right answer is accepted.
//
// A step:  start   which run to begin: { supplied, data } and, for edit steps, the edited source
//          edit    (optional) what to change in the code, and how to tell it was changed
//          go(r)   run the program to the line the question is about
//          ask(r)  { prompt, kind: 'number' | 'choice', options, hint } using the run's real values
//          reveal(r)  run forward until the answer exists, and return it
//          why(r, answer)  the explanation, with the run's numbers
import { read } from './tracer.js'
import { encode } from './engine.js'

const f = (x, d = 4) => typeof x === 'number' ? (Number.isInteger(x) ? String(x) : x.toFixed(d)) : String(x)
const list = a => `[${a.map(x => f(x)).join(', ')}]`
const v = (r, name) => read(r.stack.at(-1).vars[name])?.value
const line = (r, n) => r.info.lines[n - 1]
// Run until the `nth` time a line containing `has` is about to run (optionally only when `when(r)`).
const reach = (r, has, { nth = 1, when } = {}) => {
  let seen = 0
  return r.runUntil(e => e.kind === 'line' && line(r, e.line).includes(has) && (!when || when(r)) && ++seen === nth, 3e6)
}
const peek = data => ((1664525 * data.seed + 1013904223) % 4294967296) / 4294967296
const ACTIONS = ['0: push left', '1: push right']

const Q_START = { supplied: false, data: { alpha: .5, gamma: .9, epsilon: 0, learning: true } }
const A_START = { supplied: true, data: { learning: true } }

export const LESSONS = {
  q: [
    {
      id: 'memory', title: 'What the program remembers', start: Q_START,
      goal: 'Everything the program keeps between lines is in data, shown on the right. The Q-table is the agent\'s memory: one row per state, one column per action.',
      go: () => {},
      ask: () => ({ kind: 'choice', prompt: 'Nothing has run yet. Every number in the Q-table starts as…', options: ['0', 'a random number', '1'], hint: 'Look at makeData for "Learn from zero", or at Q[…] on the right after you start.' }),
      reveal: r => r.data.Q.every(row => row.every(x => x === 0)) ? '0' : 'something else',
      why: () => 'All 512 numbers are 0: the agent knows nothing. Each will become an estimate of the discounted reward that follows taking that action in that state. Learning is these numbers changing.',
    },
    {
      id: 'start', title: 'Where a game starts', start: Q_START,
      goal: 'resetCart makes the first state of a game from random numbers. random() is repeatable: from the same seed it always gives the same numbers, so the next one is known.',
      go: r => reach(r, 'const x = random(data)'),
      ask: r => ({ kind: 'number', prompt: `random() will return u = ${f(peek(r.data))}. This line works out x = u × 0.1 − 0.05. What will x be?`, hint: 'Multiply u by 0.1, then subtract 0.05.' }),
      reveal: r => { r.stepOver(); return v(r, 'x') },
      why: (r, x) => `${f(x)} m: the cart starts ${(Math.abs(x) * 100).toFixed(1)} cm ${x < 0 ? 'left' : 'right'} of the centre. u is between 0 and 1, so u × 0.1 − 0.05 is always between −0.05 and 0.05: every game starts within 5 cm of the centre, nearly still and nearly upright.`,
    },
    {
      id: 'row', title: 'Four numbers, one row', start: Q_START,
      goal: 'A table needs a whole-number row, but the state is 4 real numbers. stateToRow puts each number in a bin, then combines the 4 bins like digits.',
      go: r => reach(r, 'const row = stateToRow(data.state)'),
      ask: r => ({ kind: 'number', whole: true, prompt: `The state is ${list(r.data.state)}. Which row will stateToRow give? Position and velocity have one edge each (at 0); angle and spin have 7 edges each (EDGES, at the top of the code).`, hint: 'First the 4 bins: for each number, count how many of its edges it is at or above. Then row = ((b₀ × 2 + b₁) × 8 + b₂) × 8 + b₃.' }),
      reveal: r => { r.stepOver(); return v(r, 'row') },
      why: (r, row) => { const b = encode('cartpole', r.data.state).bins; return `Bins (${b.join(', ')}). ((${b[0]} × 2 + ${b[1]}) × 8 + ${b[2]}) × 8 + ${b[3]} = ${row}. Every state whose 4 numbers fall in the same bins shares row ${row}: the table can't tell them apart.` },
    },
    {
      id: 'choose', title: 'Choosing from an empty table', start: Q_START,
      goal: 'chooseAction explores with probability ε; otherwise it takes the action with the larger estimate (argmax).',
      go: r => reach(r, 'const action = chooseAction(data, row)'),
      ask: r => ({ kind: 'choice', prompt: `Q[${v(r, 'row')}] is ${list(r.data.Q[v(r, 'row')])} and ε is ${r.data.epsilon}. Which action will chooseAction return?`, options: [...ACTIONS, 'either, by chance'], hint: 'With ε = 0, roll < ε is never true. What does argmax do with a tie?' }),
      reveal: r => { r.stepOver(); return ACTIONS[v(r, 'action')] },
      why: () => 'With ε = 0 it never explores, so it takes argmax([0, 0]). argmax only replaces the best when a value is strictly larger, so a tie keeps the first: action 0. An agent that only exploits an empty table always pushes left, and never finds out whether right is better. That is why ε exists.',
    },
    {
      id: 'act', title: 'The world answers', start: Q_START,
      goal: 'stepCart is the world: Newton\'s laws for the cart and pole, moved on by 0.02 s. The agent never sees these formulas, only the next state they produce.',
      go: r => reach(r, 'const result = stepCart('),
      ask: r => ({ kind: 'choice', prompt: `The cart is about to be pushed ${v(r, 'action') === 1 ? 'right' : 'left'}. The pole\'s spin θ̇ (state[3]) is ${f(r.data.state[3])}. After this step, will the spin be larger or smaller?`, options: ['larger', 'smaller'], hint: 'Pushing the cart one way makes the pole swing the other way. A positive spin means the pole is turning to the right.' }),
      reveal: r => { const before = r.data.state[3]; r.stepOver(); return v(r, 'result').nextState[3] > before ? 'larger' : 'smaller' },
      why: r => { const s0 = r.data.state[3], s1 = v(r, 'result').nextState[3]; return `Spin went from ${f(s0)} to ${f(s1)}: θ̈ = (${f(s1)} − ${f(s0)}) / 0.02 = ${f((s1 - s0) / 0.02)} rad/s². Pushing the cart ${v(r, 'action') === 1 ? 'right' : 'left'} pulls its base out from under the pole, so the pole turns the other way. Step into stepCart to see the line that works θ̈ out.` },
    },
    {
      id: 'target', title: 'What the estimate should be', start: Q_START,
      goal: 'learn() compares the old estimate with a target: the reward that actually came, plus γ times the best estimate for where the cart ended up.',
      go: r => reach(r, 'const target = result.reward'),
      ask: r => ({ kind: 'number', prompt: `reward = ${v(r, 'result').reward}, γ = ${r.data.gamma}, future = ${f(v(r, 'future'))}. What is the target?`, hint: 'target = reward + γ × future' }),
      reveal: r => { r.stepOver(); return v(r, 'target') },
      why: (r, t) => `${v(r, 'result').reward} + ${r.data.gamma} × ${f(v(r, 'future'))} = ${f(t)}. future is 0 here because the table is still empty: the agent has no estimate for the next state yet. So the target is just the reward.`,
    },
    {
      id: 'update', title: 'One number changes', start: Q_START,
      goal: 'The update moves one entry of the table a fraction α of the way from its old value towards the target.',
      go: r => reach(r, 'data.Q[row][action] = old'),
      ask: r => ({ kind: 'number', prompt: `old = ${f(v(r, 'old'))}, α = ${r.data.alpha}, error = target − old = ${f(v(r, 'error'))}. What will Q[${v(r, 'row')}][${v(r, 'action')}] become?`, hint: 'new = old + α × error' }),
      reveal: r => { const row = v(r, 'row'), a = v(r, 'action'); r.stepOver(); return r.data.Q[row][a] },
      why: (r, q) => `${f(v(r, 'old'))} + ${r.data.alpha} × ${f(v(r, 'error'))} = ${f(q)}. Exactly one of the 512 numbers changed: "Just changed" on the right lists it. Every step of every game makes one change like this.`,
    },
    {
      id: 'fall', title: 'When the pole falls', start: Q_START,
      goal: 'A game ends for real when the pole passes 12° or the cart leaves the track. After a real ending there is no future reward.',
      go: r => reach(r, 'const future =', { when: r => v(r, 'result').terminated }),
      ask: () => ({ kind: 'number', prompt: 'The pole has just fallen: result.terminated is true. What will future be?', hint: 'Read the line: what does it use when terminated is true?' }),
      reveal: r => { r.stepOver(); return v(r, 'future') },
      why: r => `0. A fallen pole gets no more reward, so target = 1 + ${r.data.gamma} × 0 = 1. This game lasted ${r.data.steps + 1} steps: with an empty table and ε = 0, the agent pushed left every time. (A game stopped by the 500-step clock is different: it still uses the estimate, because the pole could have kept going.)`,
    },
    {
      id: 'backwards', title: 'Values flow backwards', start: Q_START,
      goal: 'Once some states have values, a step into one of them has a target bigger than its reward. That is how the agent learns about rewards further ahead.',
      go: r => reach(r, 'const future =', { when: r => !v(r, 'result').terminated && Math.max(...r.data.Q[v(r, 'nextRow')]) > 0 }),
      ask: r => ({ kind: 'choice', prompt: `The next state's row already has values: Q[${v(r, 'nextRow')}] = ${list(r.data.Q[v(r, 'nextRow')])}, learnt earlier. Will this step's target be bigger than its reward of 1?`, options: ['yes', 'no'], hint: 'target = reward + γ × future, and future is the larger number in that row.' }),
      reveal: r => { reach(r, 'const error = target - old'); return v(r, 'target') > 1 ? 'yes' : 'no' },
      why: r => `target = 1 + ${r.data.gamma} × ${f(v(r, 'future'))} = ${f(v(r, 'target'))}. The value learnt for the later state has flowed back into this one. Repeated over many games, each state's estimate comes to include the rewards several steps ahead, discounted by γ each step.`,
    },
    {
      id: 'edit', title: 'Change the program', start: Q_START,
      edit: { task: 'In stepCart, change reward: 1 to reward: 2, then press "Run my version".', done: source => /reward: 2\b/.test(source) },
      goal: 'The code is yours to change. A different reward changes what the agent is trying to maximise.',
      go: r => reach(r, 'const target = result.reward'),
      ask: r => ({ kind: 'number', prompt: `Every step now pays 2. future = ${f(v(r, 'future'))}, γ = ${r.data.gamma}. What is this target?`, hint: 'target = reward + γ × future, with the new reward.' }),
      reveal: r => { r.stepOver(); return v(r, 'target') },
      why: (r, t) => `${f(t)}. Doubling every reward doubles every target and, in time, every value in the table. The best actions stay the same: what matters is which action leads to more reward, and that hasn't changed.`,
    },
  ],
  a2c: [
    {
      id: 'batch', title: 'Eight worlds, one policy', start: A_START,
      goal: 'A2C plays 8 CartPoles with the same weights, 5 steps each, then learns once from everything they did.',
      go: () => {},
      ask: () => ({ kind: 'number', whole: true, prompt: 'STEPS_PER_WORLD is 5 and data.worlds has 8 worlds. How many transitions will the first update learn from?', hint: 'Look at run(): each world calls playSteps once per batch.' }),
      reveal: r => { r.runUntil(e => e.kind === 'enter' && e.fn === 'updateWeights'); return v(r, 'batch').reduce((n, t) => n + t.length, 0) },
      why: (r, n) => `${n}: 8 trajectories of 5 transitions. Moves from 8 different games are less alike than ${n} moves in a row from one game, so the slope they give together is steadier. The update waits for all of them: that is the "synchronous" in A2C.`,
    },
    {
      id: 'score', title: 'The actor\'s score', start: A_START,
      goal: 'The actor weighs 5 features into one score z, then the sigmoid turns z into p, the probability of pushing right.',
      go: r => reach(r, 'return sigmoid(score)'),
      ask: r => ({ kind: 'choice', prompt: `score z = ${f(v(r, 'score'))}. Will p = σ(z) be above or below 0.5?`, options: ['above 0.5', 'below 0.5'], hint: 'σ(0) = 0.5. A positive score pushes p above it.' }),
      reveal: r => { const e = r.stepOver(); return e.value > .5 ? 'above 0.5' : 'below 0.5' },
      why: r => { const z = v(r, 'score'); return `σ(${f(z)}) = 1 / (1 + e^(−${f(z)})) = ${f(1 / (1 + Math.exp(-z)))}. Positive z gives p above 0.5 (right is likelier), negative below. Step into sigmoid() next time to watch it.` },
    },
    {
      id: 'sample', title: 'Sampling a push', start: A_START,
      goal: 'While learning, the push is sampled: right with probability p. That keeps the agent trying both pushes.',
      go: r => reach(r, 'action = roll < probRight'),
      ask: r => ({ kind: 'choice', prompt: `roll = ${f(v(r, 'roll'))} and p = ${f(v(r, 'probRight'))}. Which push?`, options: ACTIONS, hint: 'Right if roll < p.' }),
      reveal: r => { r.stepOver(); return ACTIONS[v(r, 'action')] },
      why: r => `${f(v(r, 'roll'))} ${v(r, 'roll') < v(r, 'probRight') ? '<' : '≥'} ${f(v(r, 'probRight'))}, so ${ACTIONS[v(r, 'action')].slice(3)}. roll is equally likely to be anywhere from 0 to 1, so it lands below p exactly p of the time.`,
    },
    {
      id: 'targets', title: 'Targets, from the end', start: A_START,
      goal: 'nStepTargets works backwards through a world\'s 5 moves. It starts from the critic\'s estimate of what comes after the 5th, and adds each reward on the way back.',
      go: r => reach(r, 'const targets = []'),
      ask: r => { const last = v(r, 'last'); return { kind: 'number', prompt: `The last move paid ${last.reward}${last.terminated ? ' and ended the game (terminated)' : ', and did not end the game'}. total starts at the critic's estimate V = ${f(v(r, 'total'))}, and γ = ${r.data.gamma}. What will the last move's target, targets[4], be?`, hint: last.terminated ? 'A real ending resets total to 0 first.' : 'total = reward + γ × total' } },
      reveal: r => { const n = v(r, 'trajectory').length - 1; r.runUntil(() => r.stack.at(-1).fn === 'nStepTargets' && v(r, 'targets')?.[n] !== undefined); return v(r, 'targets')[n] },
      why: (r, t) => `${f(t)}: one real reward, plus γ times the critic's estimate of everything after. Bootstrapping: the estimate stands in for rewards the program hasn't seen yet. Keep stepping to watch targets[3] … targets[0] built from it.`,
    },
    {
      id: 'advantage', title: 'Better or worse than expected?', start: A_START,
      goal: 'The advantage compares what a move actually led to (its target) with what the critic expected from that state.',
      go: r => reach(r, 'const advantage = targets[i] - value'),
      ask: r => ({ kind: 'number', prompt: `target = ${f(v(r, 'targets')[v(r, 'i')])}, and the critic expected V(s) = ${f(v(r, 'value'))}. What is the advantage?`, hint: 'advantage = target − V(s)' }),
      reveal: r => { r.stepOver(); return v(r, 'advantage') },
      why: (r, a) => `${f(a)}: this move went ${a >= 0 ? 'better' : 'worse'} than the critic expected, so the update will make it ${a >= 0 ? 'more' : 'less'} likely in states like this.`,
    },
    {
      id: 'slope', title: 'Which way the actor moves', start: A_START,
      goal: 'For each move, a − p says which way to push p: up if the move was right (a = 1), down if it was left (a = 0).',
      go: r => reach(r, 'const logProbSlope = t.action - probRight'),
      ask: r => ({ kind: 'number', prompt: `The move was ${ACTIONS[v(r, 't').action]} (a = ${v(r, 't').action}) and p was ${f(v(r, 'probRight'))}. What is a − p?`, hint: 'Subtract.' }),
      reveal: r => { r.stepOver(); return v(r, 'logProbSlope') },
      why: (r, s) => `${f(s)}. Multiplied by the advantage (${f(v(r, 'advantage'))}), this sets each actor weight's slope: ${s * v(r, 'advantage') >= 0 ? 'right' : 'left'} becomes likelier in states like this one.`,
    },
    {
      id: 'clip', title: 'One limited step', start: A_START,
      goal: 'applyStep averages the 40 slopes, and if their length is over 1, shrinks them to length 1 so one unusual batch can\'t make a huge jump.',
      go: r => reach(r, 'const scale = Math.min(1, 1 / length)'),
      ask: r => ({ kind: 'number', prompt: `The average slope's length is ${f(v(r, 'length'))}. What will scale = min(1, 1 / length) be?`, hint: '1 / length, unless that is bigger than 1.' }),
      reveal: r => { r.stepOver(); return v(r, 'scale') },
      why: (r, s) => `${f(s)}: ${s < 1 ? 'the slope was long, so it is shrunk to length 1' : 'the slope was short enough, so it is used as it is'}. Each weight then moves by rate × slope × scale.`,
    },
    {
      id: 'edit', title: 'Change the program', start: A_START,
      edit: { task: 'Change STEPS_PER_WORLD = 5 to STEPS_PER_WORLD = 2 at the top of the code, then press "Run my version".', done: source => /STEPS_PER_WORLD = 2\b/.test(source) },
      goal: 'Fewer steps per world means updates come sooner, from less experience.',
      go: () => {},
      ask: () => ({ kind: 'number', whole: true, prompt: 'With STEPS_PER_WORLD = 2, how many transitions will the first update learn from?', hint: '8 worlds × steps per world.' }),
      reveal: r => { r.runUntil(e => e.kind === 'enter' && e.fn === 'updateWeights'); return v(r, 'batch').reduce((n, t) => n + t.length, 0) },
      why: (r, n) => `${n}. Updates now come 2.5 times as often, each from less evidence. The targets also lean more on the critic: only 2 real rewards before its estimate.`,
    },
  ],
}

// Whether a prediction matches what the program did.
export function correct(ask, given, actual) {
  if (ask.kind === 'choice') return given === actual
  const g = Number(String(given).replace('−', '-'))
  if (!Number.isFinite(g)) return false
  if (ask.whole) return g === actual
  return Math.abs(g - actual) <= Math.max(.005, Math.abs(actual) * .01)
}
