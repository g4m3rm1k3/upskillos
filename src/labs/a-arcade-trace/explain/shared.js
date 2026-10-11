// Explanations shared by both programs: the CartPole physics, the reset and the random numbers.
// FUNCTIONS: what a function is for, its inputs, what it gives back, which data it uses.
// LINES: per function, a note for each line (`has` is text the line must contain; the tests check).
// `piece` names a piece of the maths breakdown (pieces.js) that explains the idea behind it.

export const SHARED_FUNCTIONS = {
  resetCart: {
    summary: 'Start a new game: a random state near upright and still.',
    purpose: 'Makes the four numbers of a fresh CartPole state, each a random value between −0.05 and 0.05. This is the only randomness in CartPole itself.',
    inputs: [['data', 'everything the program remembers; only data.seed is used here, through random()']],
    returns: 'the new state: [position, velocity, angle, spin]',
    piece: 'start-state',
  },
  stepCart: {
    summary: 'The world: apply one push for 0.02 s and report what happened.',
    purpose: 'This is the MDP\'s transition rule P and reward rule R in code. Physics (Newton\'s laws for a cart with a hinged pole) gives how fast each state number is changing; one Euler step of 0.02 s moves the state on. Then it checks whether the game has ended.',
    inputs: [['state', 'the current state [position, velocity, angle, spin]'], ['action', '0 = push left, 1 = push right'], ['steps', 'which step of the game this is (for the 500-step limit)']],
    returns: '{ nextState, reward, terminated, truncated }: the transition',
    piece: 'transition',
  },
  random: {
    summary: 'A repeatable random number between 0 and 1.',
    purpose: 'A linear congruential generator: multiply the seed by a large number, add another, keep the remainder after dividing by 2³². Same seed, same sequence, so every run of the program can be repeated exactly. It is a helper, so stepping does not go into it.',
    inputs: [['data', 'its seed is read and replaced']],
    returns: 'a number in [0, 1)',
    piece: 'probability',
  },
}

export const SHARED_LINES = {
  resetCart: [
    { has: 'const x = random(data)', say: 'A random number u in [0, 1), times 0.1 (now 0 … 0.1), minus 0.05 (now −0.05 … 0.05). The cart starts within 5 cm of the centre.', tex: 'x_0 \\sim \\mathcal{U}(-0.05,\\ 0.05)', piece: 'start-state' },
    { has: 'const velocity = random(data)', say: 'The same for the cart\'s velocity: nearly still.' },
    { has: 'const angle = random(data)', say: 'The same for the pole\'s angle: within 0.05 rad (2.9°) of upright.' },
    { has: 'const spin = random(data)', say: 'The same for how fast the pole is turning.' },
    { has: 'return [x, velocity, angle, spin]', say: 'Hand back the four numbers as one list: this is the state s₀ that the game starts from.', tex: 's_0 = (x, \\dot x, \\theta, \\dot\\theta)', piece: 'state-space' },
  ],
  stepCart: [
    { has: 'const [x, velocity, angle, spin] = state', say: 'Give the four numbers of the state their names, in order.', tex: '(x, \\dot x, \\theta, \\dot\\theta) = s_t', piece: 'state-space' },
    { has: 'const force = action', say: 'The action is only a label; the world decides what it means. Action 1 is a push of +10 N (right), action 0 is −10 N (left).', tex: 'F = \\pm 10\\ \\text{N}', piece: 'action-space' },
    { has: 'const sin = Math.sin(angle)', say: 'sin θ: the share of gravity that tips a tilted pole sideways. Worked out once because three lines below need it.', tex: '\\sin\\theta', piece: 'sin-cos' },
    { has: 'const cos = Math.cos(angle)', say: 'cos θ: the share of a force that acts along the pole.', tex: '\\cos\\theta', piece: 'sin-cos' },
    { has: 'const temp =', say: 'An intermediate: the push plus the pole\'s swinging (centrifugal) force, shared over the total mass of 1.1 kg.', tex: '\\text{temp} = \\frac{F + m_p l \\dot\\theta^2 \\sin\\theta}{m_c + m_p}', piece: 'cartpole-physics' },
    { has: 'const angularAcceleration =', say: 'How fast the pole\'s spin is changing. Gravity tips a leaning pole further (g sin θ); accelerating the cart underneath swings it back (− cos θ × temp). The bottom is how hard the pole is to turn.', tex: '\\ddot\\theta = \\frac{g\\sin\\theta - \\cos\\theta\\cdot\\text{temp}}{l\\left(\\frac43 - \\frac{m_p\\cos^2\\theta}{m_c+m_p}\\right)}', piece: 'cartpole-physics' },
    { has: 'const acceleration =', say: 'How fast the cart\'s velocity is changing: the push, minus the pole pulling back on the cart.', tex: '\\ddot x = \\text{temp} - \\frac{m_p l \\ddot\\theta\\cos\\theta}{m_c+m_p}', piece: 'cartpole-physics' },
    { has: 'const nextX = x + TAU * velocity', say: 'Euler step: new position = old position + 0.02 s × velocity.', tex: 'x_{t+1} = x_t + \\tau \\dot x_t', piece: 'euler' },
    { has: 'const nextVelocity =', say: 'New velocity = old velocity + 0.02 s × acceleration.', tex: '\\dot x_{t+1} = \\dot x_t + \\tau \\ddot x_t', piece: 'euler' },
    { has: 'const nextAngle =', say: 'New angle = old angle + 0.02 s × spin.', tex: '\\theta_{t+1} = \\theta_t + \\tau \\dot\\theta_t', piece: 'euler' },
    { has: 'const nextSpin =', say: 'New spin = old spin + 0.02 s × angular acceleration.', tex: '\\dot\\theta_{t+1} = \\dot\\theta_t + \\tau \\ddot\\theta_t', piece: 'euler' },
    { has: 'const nextState = [nextX', say: 'The four new numbers together: the next state s_{t+1}. This is what the cart picture draws.', tex: 's_{t+1}', piece: 'ss-model' },
    { has: 'const terminated =', say: 'The game ends for real if the cart is past 2.4 m from the centre or the pole past 12° (π/15 rad), on either side.', tex: '|x| > 2.4 \\ \\lor\\ |\\theta| > \\pi/15', piece: 'episode-end' },
    { has: 'const truncated = steps >= 500', say: 'Or the clock stops the game at 500 steps. The pole was still up: the future still had value.', tex: 't+1 \\ge 500', piece: 'episode-end' },
    { has: 'return { nextState, reward: 1, terminated, truncated }', say: 'Hand back the transition: the next state, a reward of 1 (every step pays 1, the last included), and the two ending flags.', tex: '(s_{t+1},\\ r_{t+1} = 1,\\ \\text{ended?})', piece: 'reward' },
  ],
  random: [
    { has: 'data.seed = (1664525', say: 'Move the seed on: multiply, add, keep the remainder after dividing by 4,294,967,296 (2³²).' },
    { has: 'return data.seed / 4294967296', say: 'Divide by 2³² to get a number between 0 and 1.' },
  ],
}

// Names used in both programs.
export const SHARED_VARS = {
  data: 'everything the program remembers (the right-hand panel)',
  state: 'the 4 numbers describing the cart and pole: position, velocity, angle, spin',
  x: 'cart position, metres (0 is the centre)',
  velocity: 'cart velocity, m/s',
  angle: 'pole angle, radians (0 is upright, positive leans right)',
  spin: 'how fast the pole angle is changing, rad/s',
  action: '0 = push left, 1 = push right',
  steps: 'which step of the game this is',
  force: 'the push in newtons: +10 or −10',
  sin: 'sin of the pole angle',
  cos: 'cos of the pole angle',
  temp: 'push plus swinging force, over total mass',
  angularAcceleration: 'rate of change of the spin, θ̈',
  acceleration: 'rate of change of the cart velocity, ẍ',
  nextX: 'position after 0.02 s', nextVelocity: 'velocity after 0.02 s', nextAngle: 'angle after 0.02 s', nextSpin: 'spin after 0.02 s',
  nextState: 'the state after this step, s_{t+1}',
  terminated: 'true if the pole fell or the cart left the track',
  truncated: 'true if the 500-step limit was reached',
  result: 'what stepCart returned: { nextState, reward, terminated, truncated }',
  GRAVITY: 'g = 9.8 m/s²', CART_MASS: 'm_c = 1 kg', POLE_MASS: 'm_p = 0.1 kg', TOTAL_MASS: '1.1 kg', HALF_LENGTH: 'l = 0.5 m, half the pole', FORCE: '10 N', TAU: 'τ = 0.02 s, one time step',
}
