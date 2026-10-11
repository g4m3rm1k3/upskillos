// The breakdown: every piece of the program, from "the whole program" down to the maths it is built
// from. Each piece says what question it answers, gives its maths with every symbol named, works a
// small general example by hand, and shows the same maths with the running program's numbers (`plug`).
// `parts` are the pieces it is made of. Example arithmetic is checked in pieces.test.js.
//
// Notation: Sutton & Barto, "Reinforcement Learning: An Introduction" (2nd ed., 2018), where the reward
// for the step from t to t+1 is r_{t+1}. Papers usually call the actor's weights θ; here θ is the pole
// angle, so the actor's weights are w_π and the critic's are w_V.

const n = (x, d = 3) => Number.isFinite(x) ? (Math.abs(x) < 5e-4 && x !== 0 ? x.toExponential(1).replace(/e([+-]\d+)/, '\\times10^{$1}') : x.toFixed(d)) : '?'
const vec = (a, d = 3) => a ? `(${a.map(x => n(x, d)).join(',\\ ')})` : '?'
const yes = b => b ? '\\text{true}' : '\\text{false}'

export const ROOT = 'program'

export const PIECES = {
  program: {
    title: 'The whole program',
    question: 'What is this program, in one sentence?',
    plain: [
      'An agent repeatedly looks at the cart and pole, chooses a push, and the world answers with a new position and a reward. Learning means changing how it chooses, so that the total reward over a game gets as large as possible.',
      'That sentence has a name: the world is a Markov decision process (MDP), and the agent is solving it. Q-learning and A2C are two different ways of solving the same MDP. Every piece below is one word of that sentence, broken down until it is arithmetic you can do by hand.',
    ],
    math: [{ tex: String.raw`\pi^* = \arg\max_{\pi}\ \mathbb{E}_{\pi}\Big[\sum_{t=0}^{T-1} \gamma^{t}\, r_{t+1}\Big]`, say: 'The best policy π* is the way of choosing actions whose expected (average) discounted total reward is the largest.' }],
    symbols: [
      { tex: '\\pi', say: 'pi', means: 'the policy: the rule the agent uses to choose an action in each state', code: 'actor(...) or the Q-table + chooseAction' },
      { tex: '\\pi^*', say: 'pi star', means: 'the best possible policy' },
      { tex: '\\arg\\max_\\pi', say: 'arg max over pi', means: 'the π that makes what follows largest (not the largest value itself)' },
      { tex: '\\mathbb{E}_\\pi', say: 'expected value under pi', means: 'the average over every game that could happen when acting with π' },
      { tex: 'r_{t+1}', say: 'r t plus one', means: 'the reward received after the action at time t', code: 'reward', now: L => n(L.r, 2) },
      { tex: '\\gamma', say: 'gamma', means: 'the discount: how much a reward one step later counts', code: 'gamma', now: L => n(L.gamma, 2) },
      { tex: 'T', say: 'T', means: 'the step the game ends at' },
    ],
    example: { setup: 'Two ways of playing a 3-step game, γ = 0.9.', steps: [
      { text: 'Policy A earns rewards 1, 1, 0. Policy B earns 1, 1, 1.' },
      { tex: String.raw`A:\ 1 + 0.9(1) + 0.81(0) = 1.9` },
      { tex: String.raw`B:\ 1 + 0.9(1) + 0.81(1) = 2.71` },
      { text: 'B has the larger discounted total, so between these two, B is the better policy. Learning is a search for the policy with the largest one.' },
    ] },
    plug: L => String.raw`\text{this game so far: } ${L.step}\ \text{steps},\ \text{total reward } ${n(L.total, 2)}`,
    parts: ['mdp', 'loop', 'q-learning', 'a2c', 'evaluation'],
  },

  mdp: {
    title: 'The problem: a Markov decision process',
    question: 'What exactly is the agent solving?',
    plain: [
      'An MDP is five things written together: the states the world can be in, the actions allowed, the rule for what happens next, the reward, and how much the future counts.',
      'Once a problem is written as these five parts, any reinforcement-learning algorithm can be applied to it without knowing anything else about it. That is why the same Q-learning code solves both CartPole and the maze: it only ever touches the five parts.',
    ],
    math: [{ tex: String.raw`\mathcal{M} = (\mathcal{S},\ \mathcal{A},\ P,\ R,\ \gamma)`, say: 'An MDP is the bundle of: state space, action space, transition rule, reward rule, discount.' }],
    symbols: [
      { tex: '\\mathcal{S}', say: 'script S', means: 'the state space: every state the world can be in', code: 'state (4 numbers) or [row, col]' },
      { tex: '\\mathcal{A}', say: 'script A', means: 'the action space: every action allowed', code: 'action: 0/1, or 0–3 in the maze' },
      { tex: 'P', say: 'P', means: 'the transition rule: what state comes next', code: 'stepWorld(...).next' },
      { tex: 'R', say: 'R', means: 'the reward rule: what number the agent gets for a step', code: 'stepWorld(...).reward' },
      { tex: '\\gamma', say: 'gamma', means: 'the discount, between 0 and 1', code: 'gamma', now: L => n(L.gamma, 2) },
    ],
    table: { head: ['Part', 'CartPole', 'Maze'], rows: [
      ['States 𝒮', '4 real numbers (x, ẋ, θ, θ̇): infinitely many', '25 cells (row, column)'],
      ['Actions 𝒜', '{0 = push left, 1 = push right}', '{0 up, 1 right, 2 down, 3 left}'],
      ['Transition P', 'physics, one 0.02 s step; no randomness', 'move one cell; walls block'],
      ['Reward R', '+1 every step, including the last', '−0.02 per step, +1 on reaching G'],
      ['Ending', 'falls over (terminated) or 500 steps (truncated)', 'reaches G, or 100 steps'],
    ] },
    example: { setup: 'A complete MDP small enough to hold in your head: a corridor of 3 cells.', steps: [
      { tex: String.raw`\mathcal{S} = \{0, 1, 2\},\quad \mathcal{A} = \{\text{left}, \text{right}\}` },
      { text: 'P: "right" moves one cell right, "left" one cell left, the walls stop you. Reaching cell 2 ends the game.' },
      { text: 'R: +1 for entering cell 2, 0 for every other step.   γ = 0.9.' },
      { text: 'Nothing else is needed. Any algorithm in this lab could now learn to walk right.' },
    ] },
    plug: L => L.cartpole ? String.raw`s_t = ${vec(L.s)} \in \mathbb{R}^4,\quad a_t = ${L.a ?? '?'},\quad \gamma = ${n(L.gamma, 2)}` : String.raw`s_t = (${L.s.join(',')}) \in \{0..4\}^2,\quad a_t = ${L.a ?? '?'},\quad \gamma = ${n(L.gamma, 2)}`,
    parts: ['state-space', 'action-space', 'transition', 'reward', 'episode-end', 'markov', 'return', 'policy', 'value'],
  },

  'state-space': {
    title: 'State and state space',
    question: 'What does the agent know about the world at one moment?',
    plain: [
      'A state is a list of numbers that describes the world at one moment. The state space is the set of every possible such list.',
      'CartPole\'s state is four real numbers, so its state space is part of ℝ⁴ ("four-dimensional real space"): infinitely many states. The maze\'s state is (row, column): 25 states. Finite versus infinite is the most important difference between the two problems. A table needs one row per state, so CartPole needs its numbers cut into bins (Q-learning) or turned into features for a formula (A2C).',
    ],
    math: [{ tex: String.raw`s_t = (x_t,\ \dot x_t,\ \theta_t,\ \dot\theta_t) \in \mathcal{S} \subset \mathbb{R}^4`, say: 'The state at time t is four numbers: cart position, cart velocity, pole angle, pole angular velocity. It belongs to the state space, which is part of ℝ⁴.' }],
    symbols: [
      { tex: 's_t', say: 's t', means: 'the state at time step t', code: 'state', now: L => L.cartpole ? vec(L.s) : `(${L.s.join(', ')})` },
      { tex: 'x', say: 'x', means: 'cart position in metres; 0 is the centre', code: 'state[0]', now: L => L.cartpole ? n(L.s[0]) : null },
      { tex: '\\dot x', say: 'x dot', means: 'cart velocity, m/s. A dot over a letter means "rate of change over time"', code: 'state[1]', now: L => L.cartpole ? n(L.s[1]) : null },
      { tex: '\\theta', say: 'theta', means: 'pole angle in radians; 0 is upright, positive leans right', code: 'state[2]', now: L => L.cartpole ? n(L.s[2]) : null },
      { tex: '\\dot\\theta', say: 'theta dot', means: 'how fast the angle changes, rad/s', code: 'state[3]', now: L => L.cartpole ? n(L.s[3]) : null },
      { tex: '\\in', say: 'is in', means: 'belongs to the set on the right' },
      { tex: '\\subset \\mathbb{R}^4', say: 'is part of R four', means: 'ℝ⁴ is every list of 4 real numbers; CartPole only uses part of it' },
    ],
    example: { setup: 'Read the state s = (0.10, −0.20, 0.03, 0.40) aloud.', steps: [
      { text: 'x = 0.10: the cart is 10 cm right of centre. ẋ = −0.20: it is moving left at 0.2 m/s.' },
      { tex: String.raw`\theta = 0.03\ \text{rad} = 0.03 \times \tfrac{180}{\pi} = 1.72^\circ` },
      { text: 'The pole leans 1.72° right, and θ̇ = 0.40 says it is falling further right at 0.4 rad/s.' },
    ] },
    plug: L => L.cartpole ? String.raw`s_t = ${vec(L.s)},\quad \theta = ${n(L.s[2])}\ \text{rad} = ${n(L.s[2] * 180 / Math.PI, 2)}^\circ` : String.raw`s_t = (\text{row } ${L.s[0]},\ \text{column } ${L.s[1]})`,
    parts: ['vector'],
  },

  vector: {
    title: 'Vector',
    question: 'What is "a list of numbers" in maths?',
    plain: ['A vector is a list of numbers in a fixed order. Its meaning comes from the order: in CartPole the first number is always position and the third always angle. Maths writes element i as s with a subscript; maths often counts from 1, while code counts from 0, so s₁ in a paper may be state[0] in code.'],
    math: [{ tex: String.raw`\mathbf{s} = (s_0, s_1, s_2, s_3)`, say: 'The vector s has four elements, s-zero to s-three.' }],
    symbols: [{ tex: 's_i', say: 's i', means: 'element number i of s', code: 'state[i]' }],
    example: { setup: 's = (0.1, −0.2, 0.03, 0.4)', steps: [{ text: 's₀ = 0.1 and s₂ = 0.03. Swapping two elements makes a different vector: (0.03, −0.2, 0.1, 0.4) is a different state.' }] },
    parts: ['list-index'],
  },

  'list-index': {
    title: 'List, row and index',
    question: 'How does code find one number among many?',
    plain: ['A list stores values in order; an index is a position in it, counting from 0. A table is a list of rows, and each row is another list, so it takes two indices: the row first, then the column.'],
    math: [{ tex: String.raw`Q[s][a]`, say: 'Q, row s, column a.' }],
    symbols: [{ tex: '[i]', say: 'index i', means: 'the element at position i, counting from 0' }],
    example: { setup: 'Q = [[2, 5], [7, 3]]', steps: [
      { text: 'Q[1] is the row [7, 3]. Q[1][0] is 7.' },
      { text: 'Setting Q[1][0] = 9 gives [[2, 5], [9, 3]]: the other three numbers are untouched. That is why one update changes exactly one estimate.' },
    ] },
    parts: [],
  },

  'action-space': {
    title: 'Action and action space',
    question: 'What can the agent do?',
    plain: ['An action is a label the agent hands to the world. The world decides what the label means: in CartPole, action 1 means "push the cart right with 10 newtons". The agent never sees forces; it only learns which label works better in which state.'],
    math: [{ tex: String.raw`a_t \in \mathcal{A} = \{0, 1\}`, say: 'The action at time t is one of 0 (push left) or 1 (push right).' }],
    symbols: [
      { tex: 'a_t', say: 'a t', means: 'the action chosen at step t', code: 'action', now: L => L.a === undefined ? null : (L.cartpole ? `${L.a} (${['left', 'right'][L.a]})` : String(L.a)) },
      { tex: '\\mathcal{A}', say: 'script A', means: 'the set of allowed actions' },
    ],
    example: { setup: 'The maze has 𝒜 = {0, 1, 2, 3}.', steps: [{ text: '0 = up, 1 = right, 2 = down, 3 = left. From (1, 0), action 1 would move to (1, 1), but that cell is a wall, so the world leaves the agent at (1, 0). The action was legal; the world decided the result.' }] },
    parts: [],
  },

  transition: {
    title: 'The transition rule P',
    question: 'Given the state and the action, what happens next?',
    plain: [
      'P(s′ | s, a) is the probability that the next state is s′ when the agent does a in state s. In many MDPs it really is spread over several next states: a slippery floor, a dice roll.',
      'In CartPole, physics decides the next state completely: exactly one s′ has probability 1. So it can be written as a function, s′ = f(s, a). The only randomness in CartPole is the start state. The algorithms never use the formula for P; they only see the s′ it produces. That is what "model-free" means.',
    ],
    math: [
      { tex: String.raw`P(s' \mid s, a) = \Pr(s_{t+1} = s' \mid s_t = s,\ a_t = a)`, say: 'P of s-prime given s and a is the probability that the next state is s-prime, given the current state is s and the action is a.' },
      { tex: String.raw`s_{t+1} = f(s_t, a_t)\quad\text{(CartPole: deterministic)}`, say: 'In CartPole the next state is a function of the state and action.' },
    ],
    symbols: [
      { tex: "s'", say: 's prime', means: 'a possible next state' },
      { tex: '\\mid', say: 'given', means: 'what is on the right is known' },
      { tex: '\\Pr', say: 'probability of', means: 'how likely the event is, from 0 to 1' },
      { tex: 'f', say: 'f', means: 'the physics step: state and action in, next state out', code: 'stepWorld(world, state, action)' },
      { tex: 's_{t+1}', say: 's t plus one', means: 'the state after the action', code: 'next', now: L => L.s2 ? (L.cartpole ? vec(L.s2) : `(${L.s2.join(', ')})`) : null },
    ],
    example: { setup: 'A slippery corridor: from cell 1, action "right" reaches cell 2 with probability 0.8 and slips back to cell 1 with probability 0.2.', steps: [
      { tex: String.raw`P(2 \mid 1, \text{right}) = 0.8,\quad P(1 \mid 1, \text{right}) = 0.2,\quad P(0 \mid 1, \text{right}) = 0` },
      { tex: String.raw`0.8 + 0.2 + 0 = 1` },
      { text: 'Over all possible next states, the probabilities add to 1: something always happens.' },
    ] },
    plug: L => L.s2 ? String.raw`f\big(${L.cartpole ? vec(L.s) : `(${L.s.join(',')})`},\ ${L.a}\big) = ${L.cartpole ? vec(L.s2) : `(${L.s2.join(',')})`}` : null,
    parts: ['ss-model', 'start-state', 'probability'],
  },

  'ss-model': {
    title: 'State-space model',
    question: 'Where does CartPole\'s f come from?',
    plain: [
      'Physics does not say where the cart will be; it says how fast each state number is changing right now. Writing "rate of change of the state = some function of the state and the input" is called a state-space model. Control engineering uses this form for every machine with sensors and motors, and CartPole is a textbook control problem.',
      'A computer cannot let time flow continuously, so it takes small steps of τ = 0.02 s. One MDP transition is exactly one such step.',
    ],
    math: [
      { tex: String.raw`\dot{s} = f(s, u)`, say: 'The rate of change of the state is a function of the state and the input.' },
      { tex: String.raw`s_{k+1} = s_k + \tau\, f(s_k, u_k)`, say: 'Next state = current state + step length × rate of change.' },
    ],
    symbols: [
      { tex: '\\dot s', say: 's dot', means: 'how fast each of the 4 state numbers is changing', code: 'physics.rates', now: L => L.physics ? vec(L.physics.rates) : null },
      { tex: 'u', say: 'u', means: 'the input: the force on the cart, ±10 N', code: 'push', now: L => L.physics ? `${L.physics.push} N` : null },
      { tex: '\\tau', say: 'tau', means: 'the time step, 0.02 seconds', code: 'PHYSICS.tau' },
      { tex: 'k', say: 'k', means: 'step number (the same as t)' },
    ],
    example: { setup: 'A falling ball. State = (height h, velocity v). Physics: h changes at rate v; v changes at rate −9.8 (gravity). So f(h, v) = (v, −9.8). Start at (10 m, 0 m/s), τ = 0.1 s.', steps: [
      { tex: String.raw`s_1 = (10,\ 0) + 0.1\,(0,\ -9.8) = (10,\ -0.98)` },
      { tex: String.raw`s_2 = (10,\ -0.98) + 0.1\,(-0.98,\ -9.8) = (9.902,\ -1.96)` },
      { text: 'Each step uses the rates at the start of the step. CartPole does exactly this, with four numbers instead of two.' },
    ] },
    plug: L => L.physics ? String.raw`s_{t+1} = ${vec(L.s)} + 0.02 \times ${vec(L.physics.rates)} = ${vec(L.s2)}` : null,
    parts: ['derivative', 'euler', 'cartpole-physics'],
  },

  euler: {
    title: "Euler's method",
    question: 'How does the code turn rates into the next state?',
    plain: ['Take each number and add its rate times the step length. It is only approximately right, because the rate changes during the step; a smaller step is more accurate but needs more steps. Gymnasium\'s CartPole uses exactly this "explicit Euler" step, so this lab moves the same way.'],
    math: [{ tex: String.raw`s^{(i)}_{t+1} = s^{(i)}_t + \tau \cdot \dot s^{(i)}_t \quad\text{for } i = 0, 1, 2, 3`, say: 'For each of the four numbers: new = old + 0.02 × its rate.' }],
    symbols: [{ tex: 's^{(i)}', say: 's, element i', means: 'one of the four state numbers', code: 'value in state.map((value, i) => ...)' }],
    example: { setup: 'Position x = 0.10 m, velocity ẋ = −0.20 m/s, τ = 0.02 s.', steps: [{ tex: String.raw`x_{t+1} = 0.10 + 0.02 \times (-0.20) = 0.096` }, { text: 'The cart moved 4 mm left in one step.' }] },
    plug: L => L.physics ? String.raw`x_{t+1} = ${n(L.s[0], 4)} + 0.02 \times ${n(L.s[1], 4)} = ${n(L.s2[0], 4)},\quad \dot\theta_{t+1} = ${n(L.s[3], 4)} + 0.02 \times ${n(L.physics.angularAcceleration, 4)} = ${n(L.s2[3], 4)}` : null,
    parts: ['derivative'],
  },

  'cartpole-physics': {
    title: "CartPole's equations of motion",
    question: 'What are the rates of change, exactly?',
    plain: [
      'These come from Newton\'s laws for a cart with a pole on a hinge (Barto, Sutton & Anderson, 1983). Two of the four rates are free: the rate of x is just ẋ, and the rate of θ is just θ̇. The other two need working out: the cart\'s acceleration ẍ and the pole\'s angular acceleration θ̈.',
      'Read θ̈ in words: gravity pulls a leaning pole further over (g sin θ); pushing the cart underneath it swings it back (− cos θ × temp). That tug-of-war is the whole game: to stop the pole falling right, the cart must accelerate right.',
    ],
    math: [
      { tex: String.raw`\text{temp} = \frac{F + m_p\, l\, \dot\theta^2 \sin\theta}{m_c + m_p}`, say: 'The push plus the pole\'s swinging, shared over the total mass.' },
      { tex: String.raw`\ddot\theta = \frac{g\sin\theta - \cos\theta\cdot\text{temp}}{l\left(\frac{4}{3} - \frac{m_p\cos^2\theta}{m_c + m_p}\right)}`, say: 'Angular acceleration: gravity\'s tipping minus the push\'s correction, divided by how hard the pole is to turn.' },
      { tex: String.raw`\ddot x = \text{temp} - \frac{m_p\, l\, \ddot\theta \cos\theta}{m_c + m_p}`, say: 'Cart acceleration: the push, minus the pole pulling back on the cart.' },
    ],
    symbols: [
      { tex: 'F', say: 'F', means: 'push force: +10 N (right) or −10 N (left)', code: 'push', now: L => L.physics ? String(L.physics.push) : null },
      { tex: 'm_c,\\ m_p', say: 'm c, m p', means: 'cart mass 1 kg, pole mass 0.1 kg', code: 'cartMass, poleMass' },
      { tex: 'l', say: 'l', means: 'half the pole\'s length, 0.5 m', code: 'halfLength' },
      { tex: 'g', say: 'g', means: 'gravity, 9.8 m/s²', code: 'gravity' },
      { tex: '\\ddot\\theta', say: 'theta double-dot', means: 'angular acceleration: the rate of change of θ̇', code: 'angularAcceleration', now: L => L.physics ? n(L.physics.angularAcceleration) : null },
      { tex: '\\ddot x', say: 'x double-dot', means: 'cart acceleration: the rate of change of ẋ', code: 'acceleration', now: L => L.physics ? n(L.physics.acceleration) : null },
    ],
    example: { setup: 'Everything at rest and upright, s = (0, 0, 0, 0), push right (F = +10). sin 0 = 0, cos 0 = 1.', steps: [
      { tex: String.raw`\text{temp} = \frac{10 + 0}{1.1} = 9.0909` },
      { tex: String.raw`\ddot\theta = \frac{0 - 1 \times 9.0909}{0.5\,(1.3333 - 0.0909)} = \frac{-9.0909}{0.6212} = -14.634` },
      { tex: String.raw`\ddot x = 9.0909 - \frac{0.05 \times (-14.634) \times 1}{1.1} = 9.7561` },
      { tex: String.raw`\text{after } \tau:\ \dot x = 0.02 \times 9.7561 = 0.1951,\quad \dot\theta = 0.02 \times (-14.634) = -0.2927` },
      { text: 'Pushing right makes the pole start to tip left (θ̈ negative): the cart moves out from under it.' },
    ] },
    plug: L => L.physics ? String.raw`F = ${L.physics.push},\ \text{temp} = ${n(L.physics.temp)},\ \ddot\theta = ${n(L.physics.angularAcceleration)},\ \ddot x = ${n(L.physics.acceleration)}` : null,
    parts: ['sin-cos', 'derivative'],
  },

  'sin-cos': {
    title: 'sin and cos',
    question: 'Why do sin θ and cos θ appear in the physics?',
    plain: ['For a pole tilted by θ, sin θ is the fraction of gravity that pulls it sideways (0 when upright) and cos θ is the fraction along the pole (1 when upright). For small angles sin θ ≈ θ and cos θ ≈ 1, which is why CartPole near upright behaves almost like a straight-line system.'],
    math: [{ tex: String.raw`\sin\theta \approx \theta,\qquad \cos\theta \approx 1 \qquad (\theta \text{ small, in radians})`, say: 'For small angles, sine is about the angle and cosine is about one.' }],
    symbols: [{ tex: '\\theta', say: 'theta', means: 'the angle, in radians (π radians = 180°)' }],
    example: { setup: 'θ = 0.03 rad (1.7°).', steps: [{ tex: String.raw`\sin(0.03) = 0.029996,\qquad \cos(0.03) = 0.99955` }, { text: 'At CartPole\'s failure angle, 0.209 rad (12°), sin is 0.208: still almost equal to the angle.' }] },
    plug: L => L.physics ? String.raw`\sin(${n(L.s[2])}) = ${n(L.physics.sin, 4)},\quad \cos(${n(L.s[2])}) = ${n(L.physics.cos, 4)}` : null,
    parts: [],
  },

  'start-state': {
    title: 'The start state',
    question: 'Where does each game begin?',
    plain: ['Each of the four numbers starts at a random value between −0.05 and 0.05. This is the only randomness in CartPole itself, and it is why one game can last longer than another under the same policy. Seeding the random generator makes the same starts repeat, which is how evaluation compares policies fairly.'],
    math: [{ tex: String.raw`s_0^{(i)} \sim \mathcal{U}(-0.05,\ 0.05)`, say: 'Each starting number is drawn uniformly between −0.05 and 0.05.' }],
    symbols: [
      { tex: '\\sim', say: 'is drawn from', means: 'is a random sample of' },
      { tex: '\\mathcal{U}(a, b)', say: 'uniform from a to b', means: 'every value in the range is equally likely' },
    ],
    example: { setup: 'The generator returns u = 0.73 (uniform between 0 and 1).', steps: [{ tex: String.raw`(0.73 - 0.5) \times 0.1 = 0.023` }, { text: 'Subtracting 0.5 centres the range on 0; multiplying by 0.1 makes it 0.1 wide: −0.05 to 0.05.' }] },
    parts: ['probability'],
  },

  reward: {
    title: 'Reward',
    question: 'How does the agent find out what we want?',
    plain: [
      'The reward is the only thing that tells the agent what we want. CartPole never says "stay upright"; it pays +1 for every step, including the step on which the pole falls. Longer games pay more, so maximising reward means surviving.',
      'The agent optimises the number, not our intention. Change the reward and you change the task.',
    ],
    math: [{ tex: String.raw`r_{t+1} = R(s_t, a_t, s_{t+1}) = 1`, say: 'The reward for the step from t to t+1 is always 1 in CartPole.' }],
    symbols: [{ tex: 'r_{t+1}', say: 'r t plus one', means: 'the reward for the step that starts at t. Some papers write it r_t; same number, different label', code: 'reward', now: L => L.r === undefined ? null : n(L.r, 2) }],
    example: { setup: 'The maze pays −0.02 per step and +1 for the step that reaches G. The shortest route is 8 steps.', steps: [{ tex: String.raw`7 \times (-0.02) + 1 = 0.86` }, { text: 'A 20-step wander would get 19 × (−0.02) + 1 = 0.62. The step cost is what makes short routes better.' }] },
    breakIt: { text: 'Stop the reward reaching the learner (Q-learning only). The world still pays it, but the learner receives 0, so a fresh table has nothing to learn from.', option: 'rewardEnabled', value: false, algorithm: 'q' },
    parts: [],
  },

  'episode-end': {
    title: 'Termination and truncation',
    question: 'When does a game end, and does it matter how?',
    plain: [
      'Terminated means the MDP itself ended: the pole fell or the cart left the track. There is no future, so the value of what comes after is 0.',
      'Truncated means we stopped watching after 500 steps. The pole could have stayed up, so the future still has value. Treating a truncation like a fall teaches the agent that the states it reaches by playing well lead to "the end", which is the opposite of the truth.',
    ],
    math: [
      { tex: String.raw`\text{terminated} = |x_{t+1}| > 2.4\ \ \text{or}\ \ |\theta_{t+1}| > \tfrac{\pi}{15}`, say: 'The game ends if the cart is more than 2.4 m from centre or the pole leans more than 12°.' },
      { tex: String.raw`\text{truncated} = (t+1 \ge 500)`, say: 'Or we stop after 500 steps.' },
    ],
    symbols: [
      { tex: '|x|', say: 'absolute value of x', means: 'x without its sign: |−3| = 3' },
      { tex: '\\pi / 15', say: 'pi over fifteen', means: '0.2094 rad = 12°' },
    ],
    example: { setup: 'Two endings.', steps: [{ text: 'θ = 0.22 rad at step 23: 0.22 > 0.2094, so terminated. Future value 0.' }, { text: 'Step 500 with θ = 0.01: truncated, not terminated. Future value is still the critic\'s estimate.' }] },
    plug: L => L.terminated === undefined ? null : String.raw`\text{terminated} = ${yes(L.terminated)},\quad \text{truncated} = ${yes(L.truncated)}${L.cartpole && L.s2 ? String.raw`\quad (|x| = ${n(Math.abs(L.s2[0]))},\ |\theta| = ${n(Math.abs(L.s2[2]))})` : ''}`,
    parts: [],
  },

  markov: {
    title: 'The Markov property',
    question: 'Is the state enough to predict what happens next?',
    plain: [
      'An MDP\'s state must contain everything needed to predict the next state. Then the past adds nothing, and the agent can choose using only the present. That is the "Markov" in Markov decision process.',
      'CartPole\'s four numbers are Markov because the velocities are in them. Hide the velocities and two situations look identical (pole tilted 0.05 rad and falling; pole tilted 0.05 rad and recovering) while needing opposite pushes. The agent is then guessing, however well it learns.',
    ],
    math: [{ tex: String.raw`\Pr(s_{t+1} \mid s_t, a_t, s_{t-1}, a_{t-1}, \ldots) = \Pr(s_{t+1} \mid s_t, a_t)`, say: 'Knowing the whole history predicts the next state no better than knowing only the current state and action.' }],
    symbols: [{ tex: '\\ldots', say: 'and so on', means: 'all earlier states and actions' }],
    example: { setup: 'Two states: A = (0, 0.5, 0.05, 1.0) and B = (0, −0.5, 0.05, −1.0).', steps: [{ text: 'With velocities hidden, both look like (0, ?, 0.05, ?).' }, { text: 'In A the pole is falling right fast: push right. In B it is already swinging back: pushing right would overshoot. One observation, two correct answers.' }] },
    breakIt: { text: 'Hide the velocities (Q-learning, CartPole). The same supplied table now sees ẋ = 0 and θ̇ = 0 always. Evaluate it before and after.', option: 'blind', value: true, algorithm: 'q' },
    parts: ['state-space'],
  },

  return: {
    title: 'Return G',
    question: 'What total is the agent trying to make large?',
    plain: [
      'The return from time t is every future reward added up, each multiplied by γ once for every step it is away. A reward 10 steps away counts γ¹⁰ as much as one received now.',
      'It can be written as a long sum, or as "this reward plus γ times the return from the next step". The second form lets code compute every return in one backward pass, and it is the root of every Bellman equation.',
    ],
    math: [
      { tex: String.raw`G_t = r_{t+1} + \gamma\, r_{t+2} + \gamma^2 r_{t+3} + \cdots = \sum_{k=0}^{\infty} \gamma^k\, r_{t+k+1}`, say: 'The return is the discounted sum of all future rewards.' },
      { tex: String.raw`G_t = r_{t+1} + \gamma\, G_{t+1}`, say: 'The return now is the next reward plus γ times the return one step later.' },
    ],
    symbols: [
      { tex: 'G_t', say: 'G t', means: 'the return from time t', code: 'target (in a2cUpdate)' },
      { tex: '\\gamma^k', say: 'gamma to the k', means: 'γ multiplied by itself k times' },
      { tex: '\\sum_{k=0}^{\\infty}', say: 'sum from k equals 0 to infinity', means: 'add the expression for k = 0, 1, 2, …' },
    ],
    example: { setup: 'Rewards 1, 1, 1, then the game ends. γ = 0.9.', steps: [
      { tex: String.raw`\text{forward: } G_0 = 1 + 0.9 + 0.81 = 2.71` },
      { tex: String.raw`\text{backward: } G_2 = 1,\quad G_1 = 1 + 0.9 \times 1 = 1.9,\quad G_0 = 1 + 0.9 \times 1.9 = 2.71` },
      { text: 'Same answer. The backward way reuses each result, which is how a2cUpdate computes its targets.' },
    ] },
    parts: ['discount', 'sigma-notation'],
  },

  discount: {
    title: 'The discount γ',
    question: 'Why should later rewards count less?',
    plain: ['γ is between 0 and 1. Two reasons to use it: the further future is less certain, and it keeps an endless sum finite. With γ = 0.99, a reward 100 steps away counts 0.99¹⁰⁰ = 0.366 as much as one now. γ = 0 means "only the next reward matters"; then both CartPole actions look the same, because both pay +1.'],
    math: [{ tex: String.raw`1 + \gamma + \gamma^2 + \cdots = \frac{1}{1-\gamma}\quad (0 \le \gamma < 1)`, say: 'If every reward is 1, the return can never exceed 1 / (1 − γ).' }],
    symbols: [{ tex: '\\gamma', say: 'gamma', means: 'the discount factor', code: 'gamma', now: L => n(L.gamma, 2) }],
    example: { setup: 'CartPole pays 1 every step.', steps: [{ tex: String.raw`\gamma = 0.9:\ \tfrac{1}{1 - 0.9} = 10\qquad \gamma = 0.99:\ \tfrac{1}{1 - 0.99} = 100` }, { text: 'So with γ = 0.99, a value near 100 means "this state will survive a long time", and a value near 1 means "about to fall".' }] },
    plug: L => String.raw`\gamma = ${n(L.gamma, 2)}:\quad \text{largest possible return} = \tfrac{1}{1 - ${n(L.gamma, 2)}} = ${L.gamma < 1 ? n(1 / (1 - L.gamma), 1) : '\\infty'}`,
    breakIt: { text: 'Set γ to 0 with the slider and watch a Q-learning update: the future term disappears from the target.', option: 'gamma', value: 0 },
    parts: ['sigma-notation'],
  },

  'sigma-notation': {
    title: 'Σ: sum notation',
    question: 'How do you read a Σ?',
    plain: ['Σ is a loop written in maths. The letter underneath is the loop variable and its start; the number on top is where it stops. Work out the expression for each value and add them up. Anything to the power 0 is 1.'],
    math: [{ tex: String.raw`\sum_{k=0}^{2} 0.9^k = 0.9^0 + 0.9^1 + 0.9^2`, say: 'Add 0.9 to the power k, for k = 0, 1 and 2.' }],
    symbols: [{ tex: '\\sum', say: 'sigma, sum', means: 'add up', code: 'a for loop with total +=, or reduce' }],
    example: { setup: 'Work it out.', steps: [{ tex: String.raw`0.9^0 + 0.9^1 + 0.9^2 = 1 + 0.9 + 0.81 = 2.71` }, { text: 'In code: let total = 0; for (let k = 0; k <= 2; k++) total += 0.9 ** k' }] },
    parts: [],
  },

  policy: {
    title: 'Policy π',
    question: 'How does the agent choose?',
    plain: [
      'A policy gives, for every state, a probability for each action. A deterministic policy puts all of it on one action; a stochastic one spreads it out.',
      'Q-learning\'s policy is "pick the action with the largest Q-value" (plus occasional random moves while training). A2C\'s actor is a policy in the literal sense: a formula that outputs the probabilities directly.',
    ],
    math: [{ tex: String.raw`\pi(a \mid s) = \Pr(a_t = a \mid s_t = s),\qquad \sum_{a} \pi(a \mid s) = 1`, say: 'Pi of a given s is the probability of choosing a in state s; over all actions they add to 1.' }],
    symbols: [{ tex: '\\pi(a \\mid s)', say: 'pi of a given s', means: 'the probability of action a in state s', code: 'probabilities[a]', now: L => L.p === undefined ? null : `left ${n(1 - L.p)}, right ${n(L.p)}` }],
    example: { setup: 'π(right | s) = 0.7, so π(left | s) = 0.3.', steps: [{ text: 'Visit s 100 times and the agent pushes right about 70 times. One left push is still consistent with this policy.' }] },
    plug: L => L.p === undefined ? (L.row ? String.raw`\text{greedy: } \arg\max(${vec(L.row)}) = ${L.row.indexOf(Math.max(...L.row))}` : null) : String.raw`\pi(\text{left} \mid s_t) = ${n(1 - L.p)},\quad \pi(\text{right} \mid s_t) = ${n(L.p)}`,
    parts: ['probability', 'sampling'],
  },

  probability: {
    title: 'Probability',
    question: 'What does "0.7 chance" mean?',
    plain: ['A probability is a number from 0 (never) to 1 (always). The probabilities of all the possible outcomes add to 1. Read 0.7 as "in the long run, 70 out of every 100 times".'],
    math: [{ tex: String.raw`0 \le \Pr(x) \le 1,\qquad \sum_x \Pr(x) = 1`, say: 'Every probability is between 0 and 1; together they add to 1.' }],
    symbols: [{ tex: '\\Pr(x)', say: 'probability of x', means: 'how likely outcome x is' }],
    example: { setup: 'A fair die.', steps: [{ tex: String.raw`\Pr(1) = \cdots = \Pr(6) = \tfrac{1}{6},\qquad 6 \times \tfrac{1}{6} = 1` }] },
    parts: [],
  },

  sampling: {
    title: 'Sampling an action',
    question: 'How does code turn "70% right" into one push?',
    plain: ['Draw a random number u, equally likely anywhere between 0 and 1. It lands below 0.7 exactly 70% of the time. So "right if u < p" picks right with probability p.'],
    math: [{ tex: String.raw`a_t = \begin{cases} 1\ (\text{right}) & u < p \\ 0\ (\text{left}) & \text{otherwise}\end{cases},\qquad u \sim \mathcal{U}(0, 1)`, say: 'Push right if the random number is below p.' }],
    symbols: [{ tex: 'u', say: 'u', means: 'a uniform random number in [0, 1)', code: 'rng()' }, { tex: 'p', say: 'p', means: 'π(right | s)', code: 'probabilities[1]', now: L => L.p === undefined ? null : n(L.p) }],
    example: { setup: 'p = 0.7', steps: [{ text: 'u = 0.42 < 0.7: right.   u = 0.81 ≥ 0.7: left.' }] },
    parts: ['probability'],
  },

  value: {
    title: 'Value functions V and Q',
    question: 'How good is it to be here, or to do this here?',
    plain: [
      'V(s) is the return the agent can expect from state s if it follows π from then on. Q(s, a) is the same but for first taking action a, then following π.',
      '"Expected" because the future is random (random starts, random action choices): it is the average return over every game that could follow. The algorithms never know it exactly; they estimate it from games they actually play.',
    ],
    math: [
      { tex: String.raw`V^\pi(s) = \mathbb{E}_\pi\left[G_t \mid s_t = s\right]`, say: 'The value of s is the expected return from s when following π.' },
      { tex: String.raw`Q^\pi(s, a) = \mathbb{E}_\pi\left[G_t \mid s_t = s,\ a_t = a\right]`, say: 'The value of doing a in s is the expected return from s after doing a, then following π.' },
    ],
    symbols: [
      { tex: 'V^\\pi(s)', say: 'V pi of s', means: 'the state\'s value', code: 'value(state, critic)', now: L => L.V === undefined ? null : n(L.V) },
      { tex: 'Q^\\pi(s, a)', say: 'Q pi of s a', means: 'the state-action value', code: 'table[row][action]', now: L => L.row ? vec(L.row) : null },
      { tex: '\\mathbb{E}', say: 'expected value', means: 'the probability-weighted average' },
    ],
    example: { setup: 'From state s, two futures can happen: 70% of the time the return is 10, 30% of the time it is 2.', steps: [{ tex: String.raw`V(s) = 0.7 \times 10 + 0.3 \times 2 = 7.6` }, { text: 'No single game returns 7.6. It is the average the agent should expect.' }] },
    parts: ['expected-value', 'bellman', 'return'],
  },

  'expected-value': {
    title: 'Expected value',
    question: 'What is an "expected" number?',
    plain: ['Multiply each outcome by its probability and add. The average of many random draws gets closer and closer to it. That is why the algorithms can learn from single games without ever knowing P: each game is one sample, and the averages settle on the expectation.'],
    math: [{ tex: String.raw`\mathbb{E}[X] = \sum_x x \Pr(x)`, say: 'The expected value of X is each value times its probability, added up.' }],
    symbols: [{ tex: 'X', say: 'X', means: 'a random quantity, such as a return' }],
    example: { setup: 'One roll of a fair die.', steps: [{ tex: String.raw`\mathbb{E}[X] = \tfrac{1}{6}(1 + 2 + 3 + 4 + 5 + 6) = 3.5` }, { text: 'You can never roll 3.5, but the average of 1,000 rolls will be very close to it.' }] },
    parts: ['probability', 'sigma-notation'],
  },

  bellman: {
    title: 'The Bellman equations',
    question: 'How can a value be learned from one step?',
    plain: [
      'Take G_t = r_{t+1} + γ G_{t+1} and average it: a state\'s value equals one real reward plus the discounted value of wherever you land. That is the Bellman equation.',
      'Every algorithm here turns it into an update. Q-learning uses the "optimal" version, with a max over the next actions. A2C\'s critic uses the version for its current policy. In both, "one reward + γ × the estimate at the next state" is called the target.',
    ],
    math: [
      { tex: String.raw`V^\pi(s) = \mathbb{E}_\pi\left[r_{t+1} + \gamma V^\pi(s_{t+1}) \mid s_t = s\right]`, say: 'A state\'s value is the expected next reward plus γ times the next state\'s value.' },
      { tex: String.raw`Q^*(s, a) = \mathbb{E}\left[r_{t+1} + \gamma \max_{a'} Q^*(s_{t+1}, a') \mid s_t = s,\ a_t = a\right]`, say: 'The best value of doing a in s is the expected next reward plus γ times the best value available in the next state.' },
    ],
    symbols: [
      { tex: 'Q^*', say: 'Q star', means: 'the action values of the best policy' },
      { tex: "\\max_{a'}", say: 'max over a-prime', means: 'the largest value over every next action' },
    ],
    example: { setup: 'The 3-cell corridor: "right" from cell 1 pays +1 and ends the game. γ = 0.9.', steps: [
      { tex: String.raw`Q^*(1, \text{right}) = 1 + 0.9 \times 0 = 1\quad\text{(terminal: no future)}` },
      { tex: String.raw`Q^*(0, \text{right}) = 0 + 0.9 \times \max(Q^*(1, \cdot)) = 0.9 \times 1 = 0.9` },
      { text: 'Values flow backwards from the reward, one step at a time. That is exactly what Q-learning does, slowly, from experience.' },
    ] },
    parts: ['expected-value', 'return'],
  },

  loop: {
    title: 'The agent–environment loop',
    question: 'How do agent and world take turns?',
    plain: [
      'Every step is the same five operations: observe the state, represent it (bins or features), choose an action, act (the world applies P and R), learn. The record (s_t, a_t, r_{t+1}, s_{t+1}) is called a transition, and it is all any learning update ever uses.',
      'Use "Next operation" to run one of the five at a time and watch this piece\'s numbers fill in.',
    ],
    math: [{ tex: String.raw`s_0 \xrightarrow{\ \pi\ } a_0 \xrightarrow{\ P,\,R\ } (r_1, s_1) \xrightarrow{\ \pi\ } a_1 \xrightarrow{\ P,\,R\ } (r_2, s_2) \cdots`, say: 'The policy picks an action from the state; the world answers with a reward and the next state; repeat.' }],
    symbols: [{ tex: '(s_t, a_t, r_{t+1}, s_{t+1})', say: 'a transition', means: 'one step\'s complete record', code: 'trace / trajectory item' }],
    example: { setup: 'The corridor, starting in cell 0.', steps: [{ text: 's₀ = 0, choose a₀ = right, world returns r₁ = 0, s₁ = 1. Choose a₁ = right, world returns r₂ = +1, s₂ = 2, terminated.' }, { text: 'Two transitions: (0, right, 0, 1) and (1, right, 1, 2).' }] },
    plug: L => L.s2 ? String.raw`\big(${L.cartpole ? vec(L.s, 2) : `(${L.s.join(',')})`},\ ${L.a},\ ${n(L.r, 2)},\ ${L.cartpole ? vec(L.s2, 2) : `(${L.s2.join(',')})`}\big)` : null,
    parts: ['transition', 'policy', 'reward'],
  },

  'q-learning': {
    title: 'Q-learning',
    question: 'One way to solve the MDP: a table of action values',
    plain: [
      'Q-learning keeps an estimate of Q*(s, a) for every state and action, in a table. It acts mostly greedily on the table, and after each step nudges one entry towards the Bellman target.',
      'A table needs a finite state space, so CartPole\'s four real numbers are cut into 256 bins first. The maze already has 25 states. It is "off-policy": the target uses the max (the best action), even when the agent actually explored.',
    ],
    math: [{ tex: String.raw`Q(s_t, a_t) \leftarrow Q(s_t, a_t) + \alpha\big[r_{t+1} + \gamma \max_{a'} Q(s_{t+1}, a') - Q(s_t, a_t)\big]`, say: 'Move the estimate a fraction α of the way towards the target.' }],
    symbols: [{ tex: '\\leftarrow', say: 'becomes', means: 'replace the left side with the right side (an assignment, not an equation)', code: '=' }],
    example: { setup: 'See "The Q-learning update" for every number worked out.', steps: [] },
    parts: ['discretise', 'q-table', 'epsilon-greedy', 'td-update'],
  },

  discretise: {
    title: 'Discretisation: bins',
    question: 'How do four real numbers become one table row?',
    plain: [
      'Each number gets a bin: the count of boundaries ("edges") it is at or above. Position and velocity have one edge each (at 0), so 2 bins each. Angle and angular velocity have 7 edges, so 8 bins each. 2 × 2 × 8 × 8 = 256 rows.',
      'The four bins are combined into one row number the same way digits make a number, except each "digit" has its own base. Different states that land in the same bins share a row, so the table cannot tell them apart.',
    ],
    math: [
      { tex: String.raw`b_i = \#\{\,e \in E_i : s^{(i)} \ge e\,\}`, say: 'Bin i is the number of edges in list E_i that the value is at or above.' },
      { tex: String.raw`\text{row} = \big((b_0 \cdot 2 + b_1)\cdot 8 + b_2\big)\cdot 8 + b_3`, say: 'Combine the four bins like digits with bases 2, 2, 8, 8.' },
    ],
    symbols: [
      { tex: 'E_i', say: 'E i', means: 'the edges for number i', code: 'EDGES[i]' },
      { tex: '\\#\\{\\ldots\\}', say: 'the number of', means: 'how many items satisfy the condition', code: '.filter(...).length' },
      { tex: 'b_i', say: 'b i', means: 'the bin for number i', code: 'bins[i]', now: L => L.encoding?.bins?.length ? `(${L.encoding.bins.join(', ')})` : null },
    ],
    example: { setup: 'Angle 0.01 rad. E₂ = (−0.12, −0.06, −0.02, 0, 0.02, 0.06, 0.12).', steps: [
      { text: '0.01 is at or above −0.12, −0.06, −0.02 and 0: four edges, so b₂ = 4.' },
      { tex: String.raw`\text{bins } (1, 0, 4, 5):\ ((1 \cdot 2 + 0)\cdot 8 + 4)\cdot 8 + 5 = 20 \cdot 8 + 5 = 165` },
    ] },
    plug: L => L.cartpole && L.encoding?.bins?.length === 4 ? String.raw`\text{bins } (${L.encoding.bins.join(',')}) \to ((${L.encoding.bins[0]}\cdot2+${L.encoding.bins[1]})\cdot8+${L.encoding.bins[2]})\cdot8+${L.encoding.bins[3]} = ${L.encoding.index}` : null,
    breakIt: { text: 'Turn off the state representation: every observation maps to row 0. The table can then hold one preference only.', option: 'representation', value: false, algorithm: 'q' },
    parts: ['list-index'],
  },

  'q-table': {
    title: 'The Q-table',
    question: 'Where are the estimates kept?',
    plain: ['One row per state, one column per action. Each number is an estimate of Q*(s, a): the discounted return expected from doing that action in that state and playing well afterwards. They are predictions of future reward, not probabilities.'],
    math: [{ tex: String.raw`Q[s][a] \approx Q^*(s, a)`, say: 'Table entry s, a is an estimate of the best action value.' }],
    symbols: [{ tex: 'Q[s]', say: 'row s', means: 'the estimates for every action in state s', code: 'table[index]', now: L => L.row ? vec(L.row) : null }],
    example: { setup: 'A row [12, 15].', steps: [{ text: 'Left is estimated to return 12, right 15. With γ = 0.99, about 15 more steps of survival are expected after pushing right.' }] },
    plug: L => L.row ? String.raw`Q[${L.encoding.index}] = ${vec(L.row)}` : null,
    parts: ['list-index', 'value'],
  },

  'epsilon-greedy': {
    title: 'ε-greedy action choice',
    question: 'How does Q-learning choose, and why sometimes at random?',
    plain: ['With probability ε, pick a random action (explore); otherwise pick the action with the largest Q-value (exploit). Without exploring, an all-zero table always picks its first action and never finds out the other was better. During evaluation ε = 0.'],
    math: [{ tex: String.raw`a_t = \begin{cases} \text{random action} & \text{with probability } \varepsilon \\ \arg\max_a Q(s_t, a) & \text{otherwise} \end{cases}`, say: 'Explore with probability epsilon, otherwise take the best-looking action.' }],
    symbols: [{ tex: '\\varepsilon', say: 'epsilon', means: 'the exploration probability', code: 'epsilon', now: L => L.algorithm === 'q' ? n(L.epsilon, 2) : null }],
    example: { setup: 'ε = 0.1, row [12, 15].', steps: [{ text: 'Draw 0.04 < 0.1: explore, pick at random (may still be right). Draw 0.70: exploit, argmax [12, 15] = 1, push right.' }] },
    plug: L => L.row && L.a !== undefined ? String.raw`\arg\max ${vec(L.row)} = ${L.row.indexOf(Math.max(...L.row))};\quad \text{chose } ${L.a}\ (${L.explore ? '\\text{explored}' : '\\text{greedy}'})` : null,
    breakIt: { text: 'Start the learner from zero with ε = 0: it never discovers the other action.', option: 'epsilon', value: 0, algorithm: 'q' },
    parts: ['argmax', 'sampling'],
  },

  argmax: {
    title: 'argmax',
    question: 'What is the difference between max and argmax?',
    plain: ['max gives the largest value. argmax gives where it is: the index. A policy needs the index, because the index is the action.'],
    math: [{ tex: String.raw`\max(12, 15) = 15,\qquad \arg\max(12, 15) = 1`, say: 'The largest is 15; it is at index 1.' }],
    symbols: [{ tex: '\\arg\\max', say: 'arg max', means: 'the index of the largest value', code: 'row.indexOf(Math.max(...row))' }],
    example: { setup: 'A tie: [0, 0].', steps: [{ text: 'Both are largest. indexOf returns the first, 0, so an untrained table always pushes left.' }] },
    parts: [],
  },

  'td-update': {
    title: 'The Q-learning update',
    question: 'How does one experience change the table?',
    plain: [
      'The target is the Bellman right-hand side, using the reward that actually came and the table\'s own estimate of the next state. The error is target minus the old estimate. The entry moves a fraction α of the way towards the target.',
      'Learning from an estimate of the next state (rather than waiting for the real return) is called bootstrapping, and this error is the temporal-difference (TD) error. At a true termination the future term is 0.',
    ],
    math: [
      { tex: String.raw`y = r_{t+1} + \gamma \max_{a'} Q(s_{t+1}, a')\quad (\text{or } y = r_{t+1} \text{ if terminated})`, say: 'The target is the reward plus γ times the best next estimate.' },
      { tex: String.raw`\delta = y - Q(s_t, a_t),\qquad Q(s_t, a_t) \leftarrow Q(s_t, a_t) + \alpha\,\delta`, say: 'The error is target minus old; add α times the error.' },
    ],
    symbols: [
      { tex: 'y', say: 'y', means: 'the target', code: 'target', now: L => L.update ? n(L.update.target) : null },
      { tex: '\\delta', say: 'delta', means: 'the TD error', code: 'error', now: L => L.update ? n(L.update.error) : null },
      { tex: '\\alpha', say: 'alpha', means: 'the learning rate: what fraction of the error to apply', code: 'alpha', now: L => L.algorithm === 'q' ? n(L.alpha, 2) : null },
    ],
    example: { setup: 'Old Q = 2, reward 1, γ = 0.9, next row [4, 6], α = 0.25.', steps: [
      { tex: String.raw`y = 1 + 0.9 \times \max(4, 6) = 1 + 5.4 = 6.4` },
      { tex: String.raw`\delta = 6.4 - 2 = 4.4` },
      { tex: String.raw`Q \leftarrow 2 + 0.25 \times 4.4 = 3.1` },
    ] },
    plug: L => L.update ? String.raw`y = ${n(L.r, 2)} + ${n(L.gamma, 2)} \times ${n(L.update.bootstrap)} = ${n(L.update.target)};\ \ Q \leftarrow ${n(L.update.before)} + ${n(L.alpha, 2)} \times ${n(L.update.error)} = ${n(L.update.after)}` : null,
    breakIt: { text: 'Turn learning on, start from zero and set α = 0: the preview shows the error, but nothing ever changes.', option: 'alpha', value: 0, algorithm: 'q' },
    parts: ['bellman', 'learning-rate', 'episode-end'],
  },

  'learning-rate': {
    title: 'Learning rate: correcting an estimate',
    question: 'Why move only part of the way?',
    plain: ['Each target is one noisy sample. Jumping all the way (α = 1) replaces the estimate with the latest sample; α = 0 never learns. In between, the estimate becomes a running average that remembers older samples. The same rule, new = old + α × (sample − old), computes an ordinary average when α = 1/n.'],
    math: [{ tex: String.raw`\text{new} = \text{old} + \alpha\,(\text{sample} - \text{old})`, say: 'Move a fraction alpha of the way from the old estimate to the new sample.' }],
    symbols: [{ tex: '\\alpha', say: 'alpha', means: 'the step size, from 0 to 1' }],
    example: { setup: 'Averaging the samples 4 then 6, using α = 1/n.', steps: [{ tex: String.raw`n=1:\ 0 + 1 \times (4 - 0) = 4` }, { tex: String.raw`n=2:\ 4 + \tfrac{1}{2}(6 - 4) = 5 = \tfrac{4+6}{2}` }] },
    parts: [],
  },

  a2c: {
    title: 'A2C: advantage actor–critic',
    question: 'Another way to solve the MDP: learn the policy directly',
    plain: [
      'Instead of a table, A2C learns two formulas. The actor is the policy: state in, action probabilities out. The critic estimates V(s). After each batch of experience, the critic says whether each action turned out better or worse than it expected (the advantage), and the actor makes better-than-expected actions more likely.',
      'Formulas work on the raw four numbers, so no bins are needed. "Synchronous": 8 copies of CartPole each play 5 steps with the same policy, then one update uses all 40 transitions.',
      'Here both formulas are deliberately tiny (5 and 11 weights) with gradients worked out by hand, so every number can be shown. A neural network replaces the formulas with bigger ones and lets PyTorch compute the gradients; the steps are the same.',
    ],
    math: [
      { tex: String.raw`\mathbf{w}_\pi \leftarrow \mathbf{w}_\pi + \alpha_\pi\, \frac{1}{N}\sum_{i} \hat A_i\, \nabla_{\mathbf{w}_\pi} \log \pi(a_i \mid s_i)`, say: 'Actor: nudge the weights to make each action more likely in proportion to its advantage.' },
      { tex: String.raw`\mathbf{w}_V \leftarrow \mathbf{w}_V + \alpha_V\, \frac{1}{N}\sum_{i} \hat A_i\, \boldsymbol\psi(s_i)`, say: 'Critic: nudge V(s) towards the n-step return.' },
    ],
    symbols: [
      { tex: '\\mathbf{w}_\\pi', say: 'w pi', means: 'the actor\'s 5 weights. Papers call these θ', code: 'network.actor', now: L => L.actorWeights ? vec(L.actorWeights, 2) : null },
      { tex: '\\mathbf{w}_V', say: 'w V', means: 'the critic\'s 11 weights', code: 'network.critic' },
      { tex: 'N', say: 'N', means: 'transitions per update: 8 × 5 = 40', code: 'count' },
      { tex: '\\hat A_i', say: 'A hat i', means: 'the advantage estimate for transition i (the hat means "estimate")', code: 'advantage' },
    ],
    example: { setup: 'Every piece of this formula has its own worked example. Follow "Made of" in order.', steps: [] },
    parts: ['features', 'actor', 'critic', 'rollout', 'nstep', 'advantage', 'policy-gradient', 'critic-update', 'entropy', 'clipping'],
  },

  features: {
    title: 'Features φ(s)',
    question: 'What numbers does the actor actually compute with?',
    plain: ['Each state number is divided by roughly its largest typical size, so all four are around −1 to 1. Without this, the number with the biggest scale would dominate every sum. The fifth feature is always 1: a bias, so the score can be non-zero even when the state is all zeros.'],
    math: [{ tex: String.raw`\boldsymbol\phi(s) = \Big(\tfrac{x}{2.4},\ \tfrac{\dot x}{2},\ \tfrac{\theta}{0.21},\ \tfrac{\dot\theta}{2},\ 1\Big)`, say: 'Phi of s is the four scaled numbers and a 1.' }],
    symbols: [{ tex: '\\boldsymbol\\phi(s)', say: 'phi of s', means: 'the actor\'s feature vector', code: 'phi', now: L => L.phi ? vec(L.phi) : null }],
    example: { setup: 'θ = 0.105 rad, half of the 0.21 failure angle.', steps: [{ tex: String.raw`\tfrac{0.105}{0.21} = 0.5` }, { text: 'So the angle feature reads "halfway to falling", whatever units the angle was in.' }] },
    plug: L => L.phi ? String.raw`\boldsymbol\phi(s_t) = ${vec(L.phi)}` : null,
    parts: ['vector'],
  },

  actor: {
    title: 'The actor π(a | s)',
    question: 'How does a formula turn a state into probabilities?',
    plain: ['Multiply each feature by its weight and add (a dot product): one number, the score z. Squash the score into a probability with the sigmoid. Positive score: more likely right; negative: more likely left. Learning means changing the 5 weights.'],
    math: [
      { tex: String.raw`z = \mathbf{w}_\pi \cdot \boldsymbol\phi(s)`, say: 'The score is the dot product of the weights and the features.' },
      { tex: String.raw`p = \pi(\text{right} \mid s) = \sigma(z),\qquad \pi(\text{left} \mid s) = 1 - p`, say: 'The probability of right is the sigmoid of the score.' },
    ],
    symbols: [
      { tex: 'z', say: 'z', means: 'the score', code: 'score', now: L => L.score === undefined ? null : n(L.score) },
      { tex: '\\sigma', say: 'sigma', means: 'the sigmoid function', code: 'sigmoid' },
      { tex: 'p', say: 'p', means: 'probability of pushing right', code: 'probabilities[1]', now: L => L.p === undefined ? null : n(L.p) },
    ],
    example: { setup: 'Weights (0, 0, 2, 0, 0): only the angle matters. The pole leans halfway to falling right: φ = (0, 0, 0.5, 0, 1).', steps: [{ tex: String.raw`z = 2 \times 0.5 = 1,\qquad p = \sigma(1) = 0.731` }, { text: 'Leaning right, so push right 73% of the time: the cart moves under the pole.' }] },
    plug: L => L.phi ? String.raw`z = ${vec(L.actorWeights, 2)} \cdot ${vec(L.phi, 2)} = ${n(L.score)},\quad p = \sigma(${n(L.score)}) = ${n(L.p)}` : null,
    parts: ['features', 'dot-product', 'sigmoid', 'sampling'],
  },

  'dot-product': {
    title: 'Dot product',
    question: 'How do weights and features become one number?',
    plain: ['Multiply matching elements and add the results. A weight says how much its feature matters and in which direction (its sign). This one operation is the core of every neural network layer.'],
    math: [{ tex: String.raw`\mathbf{w} \cdot \boldsymbol\phi = \sum_{j} w_j\, \phi_j`, say: 'w dot phi is the sum of w j times phi j.' }],
    symbols: [{ tex: 'w_j,\\ \\phi_j', say: 'w j, phi j', means: 'element j of each vector' }],
    example: { setup: 'w = (0.1, 0.4), φ = (2, 3)', steps: [{ tex: String.raw`0.1 \times 2 + 0.4 \times 3 = 0.2 + 1.2 = 1.4` }] },
    parts: ['sigma-notation', 'vector'],
  },

  sigmoid: {
    title: 'The sigmoid σ',
    question: 'How does any number become a probability?',
    plain: ['σ squashes any number into the range 0 to 1: large positive scores give nearly 1, large negative nearly 0, and 0 gives exactly 0.5. σ(−z) = 1 − σ(z), so the same score gives the left probability for free.'],
    math: [{ tex: String.raw`\sigma(z) = \frac{1}{1 + e^{-z}}`, say: 'Sigma of z is one over one plus e to the minus z.' }],
    symbols: [{ tex: 'e^{-z}', say: 'e to the minus z', means: 'the exponential: e ≈ 2.718 multiplied by itself −z times' }],
    example: { setup: 'Three scores.', steps: [{ tex: String.raw`\sigma(0) = \tfrac{1}{1+1} = 0.5` }, { tex: String.raw`\sigma(1) = \tfrac{1}{1 + 0.3679} = 0.731,\qquad \sigma(-1) = \tfrac{1}{1 + 2.718} = 0.269` }, { text: '0.731 + 0.269 = 1.' }] },
    plug: L => L.score === undefined ? null : String.raw`\sigma(${n(L.score)}) = \frac{1}{1 + e^{${n(-L.score)}}} = \frac{1}{1 + ${n(Math.exp(-L.score))}} = ${n(L.p)}`,
    parts: ['exp'],
  },

  exp: {
    title: 'The exponential e^x',
    question: 'What is e?',
    plain: ['e ≈ 2.71828 is the number whose power function has a slope equal to itself: the slope of eˣ is eˣ. That property is why it appears wherever derivatives are taken. e⁰ = 1, and e to a negative power is 1 divided by the positive power.'],
    math: [{ tex: String.raw`e^{-x} = \frac{1}{e^{x}},\qquad \frac{d}{dx} e^x = e^x`, say: 'e to the minus x is one over e to the x; the slope of e to the x is itself.' }],
    symbols: [{ tex: 'e', say: 'e', means: '2.71828…', code: 'Math.exp(1)' }],
    example: { setup: 'Work out e⁻¹.', steps: [{ tex: String.raw`e^{-1} = \tfrac{1}{2.71828} = 0.3679` }] },
    parts: ['derivative'],
  },

  critic: {
    title: 'The critic V(s)',
    question: 'How does a formula estimate a state\'s value?',
    plain: [
      'Another dot product: 11 features times 11 weights. The features include squares of the scaled numbers. A state\'s value is highest near upright-and-centred and falls off on both sides, like a hill; a straight line cannot make a hill, but squares can.',
      'The critic never chooses anything. Its only job is to supply the baseline and the bootstrap value.',
    ],
    math: [
      { tex: String.raw`\boldsymbol\psi(s) = (1,\ \hat x,\ \hat v,\ \hat\theta,\ \hat\omega,\ \hat x^2,\ \hat v^2,\ \hat\theta^2,\ \hat\omega^2,\ \hat\theta\hat\omega,\ \hat x\hat v)`, say: 'Psi is a 1, the four scaled numbers, their squares and two products.' },
      { tex: String.raw`V(s) = \mathbf{w}_V \cdot \boldsymbol\psi(s)`, say: 'The value estimate is the critic weights dot psi.' },
    ],
    symbols: [
      { tex: '\\hat x,\\ \\hat v,\\ \\hat\\theta,\\ \\hat\\omega', say: 'x hat, v hat, theta hat, omega hat', means: 'the first four actor features (scaled position, velocity, angle, angular velocity)', code: 'x, v, a, w in criticFeatures' },
      { tex: 'V(s)', say: 'V of s', means: 'the critic\'s value estimate', code: 'value(state, network.critic)', now: L => L.V === undefined ? null : n(L.V) },
    ],
    example: { setup: 'A one-feature critic: V(θ̂) = 50 − 30 θ̂².', steps: [{ tex: String.raw`V(0) = 50,\quad V(\pm 0.5) = 50 - 7.5 = 42.5,\quad V(\pm 1) = 20` }, { text: 'Highest upright, equal on both sides: a hill. A straight line w₀ + w₁θ̂ would have to be higher on one side.' }] },
    plug: L => L.V === undefined ? null : String.raw`V(s_t) = ${n(L.V)}\quad (\gamma = ${n(L.gamma, 2)} \Rightarrow \text{at most } ${L.gamma < 1 ? n(1 / (1 - L.gamma), 0) : '\\infty'})`,
    breakIt: { text: 'Remove the critic: the baseline and the bootstrap become 0. This is no longer A2C; watch learning get noisier.', option: 'criticEnabled', value: false, algorithm: 'a2c' },
    parts: ['dot-product', 'features', 'value'],
  },

  rollout: {
    title: 'Rollout: 8 worlds × 5 steps',
    question: 'What experience does one update use?',
    plain: ['8 copies of CartPole each take 5 steps with the same, unchanged policy: 40 transitions. Moves from 8 different games are much less alike than 40 moves in a row from one game, so their average gradient is steadier. A game that ends inside the 5 steps is reset and keeps going, and its transitions keep their own ending flags.'],
    math: [{ tex: String.raw`\mathcal{D} = \{(s_i, a_i, r_i, s'_i, \text{ended}_i)\}_{i=1}^{8 \times 5 = 40}`, say: 'The batch D is 40 transitions.' }],
    symbols: [{ tex: '\\mathcal{D}', say: 'script D', means: 'the batch of transitions', code: 'rollouts', now: L => L.collected === undefined ? null : `${L.collected} of 5 visible transitions collected` }],
    example: { setup: 'World 3 falls at its step 2.', steps: [{ text: 'Its transition 2 has terminated = true. Transitions 3–5 belong to a new game in the same world. The return calculation must not let rewards from the new game leak into the old one.' }] },
    parts: ['loop', 'sampling'],
  },

  nstep: {
    title: 'n-step return targets',
    question: 'What should each of the 40 transitions be compared with?',
    plain: [
      'REINFORCE waits until a game ends to know each move\'s real return. A2C looks only 5 steps ahead, then lets the critic estimate the rest: real rewards for the 5 steps, plus γ⁵ × V at the end. Computed backwards, it is the return recursion started from V instead of 0.',
      'Going backwards: a termination resets the running total to 0 (no future); a truncation resets it to V(s′) (the future still exists).',
    ],
    math: [
      { tex: String.raw`G_t^{(n)} = r_{t+1} + \gamma r_{t+2} + \cdots + \gamma^{n-1} r_{t+n} + \gamma^{n} V(s_{t+n})`, say: 'The n-step return is n real discounted rewards plus γ to the n times the critic\'s value where they stop.' },
      { tex: String.raw`G \leftarrow V(s_{\text{last}});\quad \text{for } t = 5, \ldots, 1:\ G \leftarrow r_{t} + \gamma\, G`, say: 'Start from the critic\'s value and run the return recursion backwards.' },
    ],
    symbols: [
      { tex: 'G_t^{(n)}', say: 'G t, n-step', means: 'the target for the transition at t', code: 'target', now: L => L.rec ? n(L.rec.target) : null },
      { tex: 'n', say: 'n', means: 'how many real rewards before trusting the critic: 5', code: 'horizon' },
    ],
    example: { setup: 'Two steps, rewards 1 and 1, γ = 0.9, critic says V = 4 at the end.', steps: [{ tex: String.raw`G_2 = 1 + 0.9 \times 4 = 4.6` }, { tex: String.raw`G_1 = 1 + 0.9 \times 4.6 = 5.14` }] },
    plug: L => L.rec ? String.raw`\text{world 1, step 1: } G = ${n(L.rec.target)}\quad (\gamma = ${n(L.batch.gamma, 2)})` : null,
    parts: ['return', 'bootstrap', 'episode-end'],
  },

  bootstrap: {
    title: 'Bootstrapping',
    question: 'Why use an estimate instead of the real rewards?',
    plain: ['Waiting for the real return means waiting for the game to end, and real returns are noisy: one unlucky push late on changes them a lot. The critic\'s estimate is available now and is less noisy, but it may be wrong. n = 5 is a compromise: some real rewards, then the estimate. Using 1 step relies on the critic most; waiting for the end relies on it not at all.'],
    math: [{ tex: String.raw`\underbrace{r_{t+1} + \cdots + \gamma^{n-1} r_{t+n}}_{\text{real, noisy}} + \underbrace{\gamma^n V(s_{t+n})}_{\text{estimated, maybe wrong}}`, say: 'Real rewards are unbiased but noisy; the estimate is steadier but may be biased.' }],
    symbols: [],
    example: { setup: 'With n = 1 and a critic that is wrong by +10 everywhere.', steps: [{ tex: String.raw`\text{target error} = \gamma \times 10 = 9.9\ (\gamma = 0.99)` }, { text: 'With n = 5 the error is γ⁵ × 10 = 9.5, but five real rewards anchor it, and the critic itself is being corrected towards them.' }] },
    parts: ['value'],
  },

  advantage: {
    title: 'Advantage Â',
    question: 'Was that action better or worse than expected?',
    plain: [
      'Subtract what the critic expected from what happened. Positive: better than usual here, so make that action more likely. Negative: worse, so less likely.',
      'In CartPole every step pays +1, so every return is positive. Without the subtraction, every action taken would be pushed up, just by different amounts, and learning would be slow and noisy. The subtraction (a "baseline") doesn\'t change which way learning goes on average; it makes each update much less noisy.',
    ],
    math: [{ tex: String.raw`\hat A_t = G_t^{(n)} - V(s_t)`, say: 'The advantage is the n-step return minus the critic\'s value of the state.' }],
    symbols: [
      { tex: '\\hat A_t', say: 'A hat t', means: 'the advantage estimate', code: 'advantage', now: L => L.rec ? n(L.rec.advantage) : null },
      { tex: 'V(s_t)', say: 'V of s t', means: 'the baseline: what the critic expected', code: 'baseline', now: L => L.rec ? n(L.rec.baseline) : null },
    ],
    example: { setup: 'Returns of 48 and 52 from two actions in a state the critic values at 50.', steps: [{ tex: String.raw`48 - 50 = -2,\qquad 52 - 50 = +2` }, { text: 'Without a baseline both would be "+48" and "+52": both pushed up. With it, one goes down and one up, which is the information that matters.' }] },
    plug: L => L.rec ? String.raw`\hat A = ${n(L.rec.target)} - ${n(L.rec.baseline)} = ${n(L.rec.advantage)}` : null,
    breakIt: { text: 'Remove the critic: the baseline becomes 0 and every advantage is just the return.', option: 'criticEnabled', value: false, algorithm: 'a2c' },
    parts: ['nstep', 'critic'],
  },

  'policy-gradient': {
    title: 'The policy gradient',
    question: 'Which way should each actor weight move?',
    plain: [
      'The policy gradient theorem says: to increase the expected return, move the weights in the direction that increases log π(a | s), scaled by the advantage. For this actor that direction works out to a strikingly simple formula: (a − p) × φ(s).',
      'Read it: if the action was right (a = 1) and p was 0.7, then a − p = 0.3: push p up, a bit. If the action was left (a = 0), a − p = −0.7: push p down. Multiply by the advantage (was it good?) and by each feature (which weights were responsible?).',
    ],
    math: [
      { tex: String.raw`\nabla_{\mathbf{w}_\pi} J \approx \frac{1}{N}\sum_i \hat A_i\, \nabla_{\mathbf{w}_\pi} \log \pi(a_i \mid s_i)`, say: 'The gradient of the expected return is approximately the average of advantage times the gradient of the log-probability.' },
      { tex: String.raw`\frac{d}{dz}\log \sigma(z) = 1 - \sigma(z) = 1 - p,\qquad \frac{d}{dz}\log\big(1 - \sigma(z)\big) = -p`, say: 'For right, the slope of log p with respect to the score is 1 − p; for left it is −p.' },
      { tex: String.raw`\Rightarrow\ \frac{d}{dz}\log \pi(a \mid s) = a - p,\qquad \nabla_{\mathbf{w}_\pi} \log \pi(a \mid s) = (a - p)\,\boldsymbol\phi(s)`, say: 'Both cases are a − p; the chain rule multiplies by φ because z = w · φ.' },
    ],
    symbols: [
      { tex: '\\nabla_{\\mathbf{w}}', say: 'gradient with respect to w', means: 'the vector of slopes, one per weight' },
      { tex: 'J', say: 'J', means: 'the expected return: the thing being maximised' },
      { tex: 'a - p', say: 'a minus p', means: 'how surprising the action was, signed', code: 'logProbGradient', now: L => L.rec ? n(L.rec.logProbGradient) : null },
    ],
    example: { setup: 'Action right (a = 1), p = 0.7, advantage 2, one feature φ_j = 0.5.', steps: [{ tex: String.raw`(1 - 0.7) \times 2 \times 0.5 = 0.3` }, { text: 'That weight gets +0.3 (before averaging over 40 transitions and multiplying by the learning rate): right becomes more likely in states like this one.' }] },
    plug: L => L.rec ? String.raw`(a - p)\,\hat A\,\boldsymbol\phi = (${L.rec.action} - ${n(L.rec.probabilities[1])}) \times ${n(L.rec.advantage)} \times ${vec(L.rec.phi, 2)} = ${vec(L.rec.phi.map(f => L.rec.logProbGradient * L.rec.advantage * f))}` : null,
    parts: ['gradient', 'log', 'chain-rule', 'sigmoid'],
  },

  gradient: {
    title: 'Gradient',
    question: 'What is a gradient?',
    plain: ['A function of several weights has a slope in each weight\'s direction (a partial derivative: change one weight, hold the others still). The gradient lists them all. It points in the direction that increases the function fastest; to increase it, add a small multiple of the gradient; to decrease it, subtract.'],
    math: [{ tex: String.raw`\nabla f(\mathbf{w}) = \left(\frac{\partial f}{\partial w_1},\ \frac{\partial f}{\partial w_2},\ \ldots\right)`, say: 'The gradient of f is its slope with respect to each weight.' }],
    symbols: [{ tex: '\\partial', say: 'partial', means: 'slope with respect to one variable, the others held still' }],
    example: { setup: 'f(w₁, w₂) = w₁² + 3w₂ at (1, 0).', steps: [{ tex: String.raw`\nabla f = (2w_1,\ 3) = (2,\ 3)` }, { tex: String.raw`\text{step } 0.1:\ (1, 0) + 0.1(2, 3) = (1.2,\ 0.3),\quad f: 1 \to 2.34` }] },
    parts: ['derivative'],
  },

  derivative: {
    title: 'Derivative: slope',
    question: 'What is a derivative?',
    plain: ['How much the output changes per unit change of the input, at one point, for a tiny change. Measure it by nudging the input a little and dividing the change in output by the nudge. A dot over a letter (ẋ) is the derivative with respect to time.'],
    math: [{ tex: String.raw`f'(x) = \lim_{h \to 0} \frac{f(x + h) - f(x)}{h}`, say: 'The derivative is the change in f divided by the change in x, as the change gets tiny.' }],
    symbols: [{ tex: "f'(x)", say: 'f prime of x', means: 'the slope of f at x' }, { tex: '\\lim_{h \\to 0}', say: 'limit as h goes to 0', means: 'what the ratio settles to as h shrinks' }],
    example: { setup: 'f(x) = x² at x = 3.', steps: [{ tex: String.raw`\frac{3.001^2 - 3^2}{0.001} = \frac{9.006001 - 9}{0.001} = 6.001` }, { text: 'As h shrinks it settles on 6 = 2 × 3. The rule: the slope of x² is 2x.' }] },
    parts: [],
  },

  'chain-rule': {
    title: 'The chain rule',
    question: 'How do you find the slope through a chain of steps?',
    plain: ['When the weights affect z, and z affects the output, multiply the slopes: (slope of output with respect to z) × (slope of z with respect to the weight). Backpropagation in a neural network is this rule applied layer after layer.'],
    math: [{ tex: String.raw`\frac{d}{dw} f(g(w)) = f'(g(w))\cdot g'(w)`, say: 'The slope of f of g is the slope of f, at g, times the slope of g.' }],
    symbols: [],
    example: { setup: 'f(z) = z², z = g(w) = 3w.', steps: [{ tex: String.raw`\frac{d}{dw}(3w)^2 = 2(3w) \cdot 3 = 18w` }, { text: 'Check: (3w)² = 9w², whose slope is 18w. In the actor, z = w · φ, so the slope of z with respect to w_j is φ_j.' }] },
    parts: ['derivative'],
  },

  log: {
    title: 'The natural log',
    question: 'Why do log-probabilities appear?',
    plain: ['log undoes e: log(eˣ) = x. It turns products into sums, which is why a game\'s probability (a product of many action probabilities) becomes a sum of log-probabilities. The log of a probability is 0 or negative. Its slope, 1/p, is large for unlikely actions.'],
    math: [{ tex: String.raw`\log(ab) = \log a + \log b,\qquad \frac{d}{dp}\log p = \frac{1}{p}`, say: 'Log of a product is the sum of logs; the slope of log p is one over p.' }],
    symbols: [{ tex: '\\log', say: 'log', means: 'natural log (base e)', code: 'Math.log' }],
    example: { setup: 'A few values.', steps: [{ tex: String.raw`\log 1 = 0,\quad \log 0.5 = -0.693,\quad \log(0.5 \times 0.5) = -1.386 = -0.693 - 0.693` }] },
    parts: ['exp', 'derivative'],
  },

  'critic-update': {
    title: 'Training the critic',
    question: 'How does V(s) get closer to the truth?',
    plain: ['The critic\'s error on a transition is G − V(s), which is exactly the advantage. Its loss is half the squared error. The slope of that loss with respect to each weight is −(G − V) × ψ_j, so stepping downhill means adding learning rate × advantage × ψ_j.'],
    math: [
      { tex: String.raw`L_V = \tfrac{1}{2}\big(G - V(s)\big)^2`, say: 'The critic\'s loss is half the squared error.' },
      { tex: String.raw`\frac{\partial L_V}{\partial \mathbf{w}_V} = -\big(G - V(s)\big)\,\boldsymbol\psi(s) \ \Rightarrow\ \mathbf{w}_V \leftarrow \mathbf{w}_V + \alpha_V\, \hat A\, \boldsymbol\psi(s)`, say: 'Go against the slope: add the learning rate times the advantage times the features.' },
    ],
    symbols: [{ tex: 'L_V', say: 'L V', means: 'the critic\'s loss', code: 'criticLoss', now: L => L.rec ? n(L.rec.criticLoss) : null }, { tex: '\\alpha_V', say: 'alpha V', means: 'the critic\'s learning rate', code: 'criticRate', now: L => L.criticGrad ? n(L.criticGrad.rate, 3) : null }],
    example: { setup: 'G = 5.14, V = 4, a feature ψ_j = 1, α_V = 0.02.', steps: [{ tex: String.raw`\hat A = 1.14,\qquad w_j \leftarrow w_j + 0.02 \times 1.14 \times 1 = w_j + 0.0228` }, { text: 'V rises towards 5.14. Repeated over many batches, V(s) settles on the average return from s.' }] },
    parts: ['gradient', 'chain-rule'],
  },

  entropy: {
    title: 'Entropy bonus',
    question: 'Why reward the actor for being unsure?',
    plain: ['Entropy measures how spread out the probabilities are: largest at 50/50, near 0 when the actor is certain. Adding a small bonus (β = 0.01) for entropy stops the actor becoming certain too early, before it has tried enough alternatives. Its gradient pushes p back towards 0.5.'],
    math: [
      { tex: String.raw`H(\pi(\cdot \mid s)) = -\sum_a \pi(a \mid s)\log \pi(a \mid s) = -p\log p - (1-p)\log(1-p)`, say: 'Entropy is minus the sum of probability times log-probability.' },
      { tex: String.raw`\frac{dH}{dz} = -\log\frac{p}{1-p}\cdot p(1-p)`, say: 'Its slope with respect to the score.' },
    ],
    symbols: [{ tex: 'H', say: 'H', means: 'entropy' }, { tex: '\\beta', say: 'beta', means: 'the bonus weight, 0.01', code: 'entropy', now: L => L.batch ? n(L.batch.entropy, 2) : null }],
    example: { setup: 'Two actors.', steps: [{ tex: String.raw`p = 0.5:\ H = -2 \times 0.5 \log 0.5 = 0.693` }, { tex: String.raw`p = 0.99:\ H = -0.99\log 0.99 - 0.01 \log 0.01 = 0.0099 + 0.0461 = 0.056` }] },
    plug: L => L.rec ? String.raw`\frac{dH}{dz} = ${n(L.rec.entropyGradient)}` : null,
    breakIt: { text: 'Remove the entropy bonus. On CartPole it makes little difference (your paper\'s ablation found the same); on harder tasks it can.', option: 'entropyEnabled', value: false, algorithm: 'a2c' },
    parts: ['log', 'probability'],
  },

  clipping: {
    title: 'Averaging, clipping and the step',
    question: 'How do 40 gradients become one change to the weights?',
    plain: ['Average the 40 contributions. Measure the average\'s length (its norm). If it is longer than 1, scale it down to length 1 without changing its direction, so one unusual batch cannot make a destructive jump. Then add learning rate × gradient to the weights.'],
    math: [
      { tex: String.raw`\mathbf{g} = \frac{1}{N}\sum_i \mathbf{g}_i,\qquad \|\mathbf{g}\| = \sqrt{\textstyle\sum_j g_j^2}`, say: 'Average the gradients; the norm is the square root of the sum of squares.' },
      { tex: String.raw`\mathbf{w} \leftarrow \mathbf{w} + \alpha \cdot \min\!\Big(1, \frac{1}{\|\mathbf{g}\|}\Big)\, \mathbf{g}`, say: 'Step along the gradient, shrunk if its length is over 1.' },
    ],
    symbols: [
      { tex: '\\|\\mathbf{g}\\|', say: 'norm of g', means: 'the length of the gradient vector', code: 'norm', now: L => L.grad ? n(L.grad.norm) : null },
      { tex: '\\min(1, 1/\\|\\mathbf{g}\\|)', say: 'clipping scale', means: '1 if the gradient is short enough; otherwise shrinks it to length 1', code: 'scale', now: L => L.grad ? n(L.grad.scale) : null },
    ],
    example: { setup: 'g = (3, 4), α = 0.01.', steps: [{ tex: String.raw`\|\mathbf{g}\| = \sqrt{9 + 16} = 5,\qquad \text{scale} = \tfrac{1}{5}` }, { tex: String.raw`(3, 4) \times 0.2 = (0.6, 0.8),\qquad \Delta\mathbf{w} = 0.01 \times (0.6, 0.8) = (0.006, 0.008)` }] },
    plug: L => L.grad ? String.raw`\|\mathbf{g}\| = ${n(L.grad.norm)},\ \text{scale} = ${n(L.grad.scale)}:\ \mathbf{w}_\pi\ ${vec(L.batch.before.actor, 3)} \to ${vec(L.batch.after.actor, 3)}` : null,
    parts: ['vector-norm', 'gradient'],
  },

  'vector-norm': {
    title: 'Vector length (norm)',
    question: 'How long is a list of numbers?',
    plain: ['Pythagoras, in as many dimensions as needed: square every element, add, take the square root.'],
    math: [{ tex: String.raw`\|\mathbf{v}\| = \sqrt{v_1^2 + v_2^2 + \cdots}`, say: 'The norm of v is the square root of the sum of the squares.' }],
    symbols: [],
    example: { setup: 'v = (3, 4)', steps: [{ tex: String.raw`\sqrt{3^2 + 4^2} = \sqrt{25} = 5` }] },
    parts: ['vector'],
  },

  evaluation: {
    title: 'Evaluation',
    question: 'How do you know the agent is good?',
    plain: ['Freeze it: no learning, no exploration, the greedy action every time. Play 20 games from fixed starting seeds that training never used, and report every result, failures included. One great game during training proves nothing; it may have been a lucky start.'],
    math: [{ tex: String.raw`\bar G = \frac{1}{20}\sum_{k=1}^{20} G^{(k)}`, say: 'The score is the average return over the 20 test games.' }],
    symbols: [{ tex: 'G^{(k)}', say: 'G of game k', means: 'the return of test game k' }],
    example: { setup: 'Returns 500, 500, 230, 500.', steps: [{ tex: String.raw`\bar G = \tfrac{500 + 500 + 230 + 500}{4} = 432.5` }, { text: 'Report "3 of 4 reached 500, mean 432.5", not "it reaches 500".' }] },
    parts: ['expected-value', 'policy'],
  },
}

// Which pieces list `id` among their parts.
export function parentsOf(id) {
  return Object.keys(PIECES).filter(key => PIECES[key].parts.includes(id))
}

// The shortest path from the root to `id`, following parts. Used for the breadcrumb.
export function pathTo(id) {
  const previous = { [ROOT]: null }, queue = [ROOT]
  while (queue.length) {
    const current = queue.shift()
    if (current === id) break
    for (const part of PIECES[current].parts) if (!(part in previous)) { previous[part] = current; queue.push(part) }
  }
  if (!(id in previous)) return [id]
  const path = []
  for (let at = id; at; at = previous[at]) path.unshift(at)
  return path
}

// Every piece once, in the order a breadth-first walk from the root reaches it, with its depth.
export function outline() {
  const depth = { [ROOT]: 0 }, order = [], parent = {}
  const visit = (id) => {
    order.push(id)
    for (const part of PIECES[id].parts) if (!(part in depth)) { depth[part] = depth[id] + 1; parent[part] = id }
  }
  const queue = [ROOT]
  while (queue.length) { const id = queue.shift(); visit(id); for (const part of PIECES[id].parts) if (parent[part] === id) queue.push(part) }
  // Depth-first display order under each first parent, so children sit under their parent.
  const display = []
  const walk = id => { display.push({ id, depth: depth[id] }); for (const part of PIECES[id].parts) if (parent[part] === id) walk(part) }
  walk(ROOT)
  return display
}
