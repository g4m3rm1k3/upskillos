// Part 1: the world. CartPole as four numbers, one step of physics, the game loop, rules written by
// hand, returns and discounting, and the check against Gymnasium. Every number a predict block asks
// for is worked out by `compute` from the lab's engine, and lessons.test.js checks the two agree.
import { CartPole, RIGHT } from '../engine/cartpole.js'
import { RULES, averageLength, play, discountedReturn, allReturns } from '../engine/policies.js'
import { f, s, tf } from './util.js'

const upright = () => new CartPole().accelerations(0, 0, 10)

export const PART1 = {
  id: 'part1', title: 'Part 1 · The world', lessons: [
    {
      id: 'cart-four-numbers', number: '1.1', title: 'CartPole as four numbers',
      goal: 'Say what each of CartPole\'s four numbers means, with its unit and sign, read them out of a tuple, and say when a game ends.',
      builds: [],
      blocks: [
        { h: 'What this lab is about' },
        { md: `**Reinforcement learning** is learning by trial and error. A program, the **agent**, tries something in a world, is told after each try how well it did (a number, the **reward**), and slowly works out which choices pay. Nobody shows it the right answer.

This lab teaches it on one classic problem, **CartPole**: a cart rolls left and right on a short track, and a pole stands on it on a hinge. Each fiftieth of a second the agent pushes the cart left or right. The pole must not fall over and the cart must not run off the track. It is the "hello world" of reinforcement learning, and every method in the field has been tried on it.

You will build it up from nothing: the physics written out in plain Python, rules written by hand, then five ways of **learning** to balance: a table (Q-learning and SARSA), a policy improved by its own games (REINFORCE, first with no libraries at all, then with PyTorch), an actor with a critic (A2C), and a network that learns values (DQN). Every line of every program is explained, here and in the **Real Python** tab, where the desktop app runs the real code one line at a time.

All it assumes is basic Python: variables, \`if\`, \`for\`, functions and lists.` },
        { h: 'The state: four numbers' },
        { md: `Everything the agent knows about the world at one moment is four numbers. Together they are called the **state**:

| Name in the code | Symbol | What it is | Unit | Positive means |
|---|---|---|---|---|
| \`x\` | $x$ | where the cart is, measured from the centre of the track | metres | right of centre |
| \`x_dot\` | $\\dot x$ | how fast the cart is moving | metres per second | moving right |
| \`theta\` | $\\theta$ | the pole's angle from straight up | radians | leaning right |
| \`theta_dot\` | $\\dot\\theta$ | how fast that angle is changing: the pole's **spin** | radians per second | tipping to the right |

The dot over a letter is physics shorthand for "how fast it changes": $\\dot x$ ("x dot") is the speed of $x$. That is why the code calls it \`x_dot\`.

Angles are in **radians**, not degrees. A full turn is $2\\pi$ radians, or 360°, so one degree is $2\\pi/360 \\approx 0.01745$ radians. Small angles are small numbers: 5° is about 0.087.` },
        { figure: 'StateExplorer', caption: 'Drag the four numbers. The faint copy shows where things were a moment ago, given the speeds: a positive $\\dot\\theta$ means the pole is swinging to the right.' },
        { md: `In Python the state is a **tuple** of four floats, in that order:

\`\`\`python
state = (0.02, -0.4, 0.05, 0.3)
x, x_dot, theta, theta_dot = state     # tuple unpacking: four names at once
\`\`\`

The second line is **tuple unpacking**: the four values are given four names in one go, left to right. Every program in this lab starts its work on a state that way.` },
        {
          choice: {
            prompt: 'The state is `(0.5, -0.2, -0.03, 0.4)`. What is happening?',
            options: [
              { text: 'The cart is right of centre and moving left; the pole leans slightly left but is tipping to the right', why: 'Yes: $x = 0.5 > 0$ (right), $\\dot x = -0.2 < 0$ (moving left), $\\theta = -0.03 < 0$ (leaning left), $\\dot\\theta = 0.4 > 0$ (tipping right).' },
              { text: 'The cart is left of centre and the pole leans right', why: 'The first number is $x$, and 0.5 is positive: right of centre. The third is $\\theta$, and −0.03 means leaning left.' },
              { text: 'The pole has fallen', why: 'It leans only 0.03 radians, under 2°. The limit is 12°, about 0.21 radians.' },
              { text: 'Everything is moving right', why: 'Only the pole\'s spin is positive. The cart\'s speed, −0.2, is to the left.' },
            ],
            answer: 0,
          },
        },
        { h: 'The world as a class' },
        { md: `The world lives in \`python/cartpole.py\` as a **class**: a recipe for an object that bundles data with the functions that use it. \`env = CartPole()\` runs the class's \`__init__\` method, which stores every constant of the world on \`self\`, the new object. (\`env\`, short for *environment*, is the usual name for the world in reinforcement-learning code.)

These are the real numbers of the CartPole every RL course uses (Gymnasium's \`CartPole-v1\`, after a 1983 paper by Barto, Sutton and Anderson). Lesson 1.6 checks this file against Gymnasium's own.` },
        {
          code: {
            file: 'cartpole.py', fn: 'CartPole.__init__', notes: [
              ['def __init__', ['`__init__` runs when a `CartPole` is made. Its inputs have **defaults** (`max_steps=500`, …): `CartPole()` uses them all; `CartPole(force=20.0)` changes one. Part 6 changes the world this way.']],
              ['self.gravity = 9.8', ['Gravity, in metres per second per second: $g = 9.8$. Everything in this world is in SI units: metres, kilograms, seconds, newtons.'], { tex: 'g = 9.8\\ \\text{m/s}^2' }],
              ['self.cart_mass = 1.0', ['The cart weighs 1 kg.'], { tex: 'm_c = 1.0\\ \\text{kg}' }],
              ['self.pole_mass = pole_mass', ['The pole weighs 0.1 kg unless told otherwise.'], { tex: 'm_p = 0.1\\ \\text{kg}' }],
              ['self.total_mass = self.cart_mass + self.pole_mass', ['Cart plus pole: 1.1 kg. Worked out once here because the equations of motion use it again and again.'], { tex: 'M = m_c + m_p = 1.1', calc: v => [`${f(v.self.cart_mass)} + ${f(v.self.pole_mass)}`, v.self.cart_mass + v.self.pole_mass] }],
              ['self.half_length = half_length', ['**Half** the pole\'s length, 0.5 m: the pole is 1 m long. The equations use the distance from the hinge to the pole\'s middle (its centre of mass), which is half the length.'], { tex: 'l = 0.5\\ \\text{m}' }],
              ['self.pole_moment = self.pole_mass * self.half_length', ['Pole mass times half-length, $m_p\\,l = 0.05$: another product the equations use more than once.'], { tex: 'm_p\\,l', calc: v => [`${f(v.self.pole_mass)} × ${f(v.self.half_length)}`, v.self.pole_mass * v.self.half_length] }],
              ['self.force = force', ['How hard one push is: 10 newtons. The agent can\'t choose how hard, only which way.'], { tex: 'F = 10\\ \\text{N}' }],
              ['self.tau = 0.02', ['$\\tau$ (tau): the time one step lasts, 0.02 seconds. 50 steps make one second, so a game of 500 steps is 10 seconds of balancing.'], { tex: '\\tau = 0.02\\ \\text{s}' }],
              ['self.x_limit = 2.4', ['The cart may go 2.4 m either side of the centre. Further, and the game is lost.']],
              ['self.angle_limit = 12 * 2 * math.pi / 360', ['12 degrees in radians: $12 \\times 2\\pi / 360 \\approx 0.2094$. A pole leaning further than that counts as fallen.'], { tex: '12° = 12 \\cdot \\frac{2\\pi}{360} \\approx 0.2094\\ \\text{rad}', calc: () => ['12 × 2 × 3.141593 / 360', 12 * 2 * Math.PI / 360] }],
              ['self.max_steps = max_steps', ['A game is stopped after 500 steps even if the pole is still up: the best possible game lasts 500 steps.']],
              ['self.n_actions = 2', ['Two possible actions: 0 (push left) and 1 (push right).']],
              ['self.rng = random.Random()', ['The world\'s own random number generator, used only to pick each game\'s starting state (lesson 1.3). Giving the world its own generator means nothing else in the program can change which starts it picks.']],
              ['self.state = None', ['No game has started yet, so there is no state: `None` is Python\'s "no value". `reset` fills it in.']],
              ['self.steps = 0', ['How many steps the current game has lasted: the clock for the 500-step limit.']],
            ],
          },
        },
        {
          mathCode: [
            ['(x, \\dot x, \\theta, \\dot\\theta)', 'state = (x, x_dot, theta, theta_dot)', 'the state: a tuple of 4 floats'],
            ['g,\\ m_c,\\ m_p,\\ M', 'self.gravity, self.cart_mass, self.pole_mass, self.total_mass', '9.8, 1.0, 0.1, 1.1'],
            ['l,\\ m_p l', 'self.half_length, self.pole_moment', '0.5, 0.05'],
            ['F,\\ \\tau', 'self.force, self.tau', '10 N per push; 0.02 s per step'],
          ],
        },
        { h: 'When a game ends' },
        { md: `A game ends in one of two ways, and the difference matters later:

- **Terminated**: the agent failed. The pole leans more than 12° either way, $|\\theta| > 0.2094$, or the cart is more than 2.4 m from the centre, $|x| > 2.4$.
- **Truncated**: the clock ran out. After 500 steps the game is stopped, although nothing went wrong.

A terminated game has no future: the pole is down. A truncated game *did* have a future; we just stopped watching. Parts 3 to 6 handle the two differently, and getting that wrong is a classic bug.` },
        {
          predict: {
            prompt: 'The pole may lean 12°. How many **radians** is that? (Give 4 decimals.)',
            answer: 0.2094, tolerance: 0.0005, compute: () => new CartPole().angleLimit,
            explain: '$12 \\times 2\\pi / 360 = 0.20944$ radians. `self.angle_limit` holds exactly this number.',
            misconceptions: [{ answer: 12, feedback: 'That is in degrees. The code compares θ in **radians**: multiply by $2\\pi/360$.' }],
          },
        },
        {
          choice: {
            prompt: 'Which of these states has already **terminated** the game?',
            options: [
              { text: '`(2.5, 0.1, 0.01, 0.0)`', why: 'Yes: $x = 2.5$ is past the 2.4 m limit. The pole being nearly upright doesn\'t save it.' },
              { text: '`(0.0, 3.0, 0.0, 2.0)`', why: 'Fast, but inside both limits: $|x| \\le 2.4$ and $|\\theta| \\le 0.2094$. Speeds are never checked, only where things are.' },
              { text: '`(-2.3, -1.0, -0.2, -1.0)`', why: '$x = -2.3$ is inside $\\pm 2.4$ and $\\theta = -0.2$ is inside $\\pm 0.2094$: still going, if only just.' },
              { text: '`(1.0, 0.0, 0.15, 0.0)`', why: '0.15 rad is about 8.6°, under 12°.' },
            ],
            answer: 0,
          },
        },
        { note: 'A world, to a program, is numbers: a state of four floats $(x, \\dot x, \\theta, \\dot\\theta)$ and a handful of constants on `self`. The game ends **terminated** when $|x| > 2.4$ or $|\\theta| > 12°$, and **truncated** after 500 steps.' },
      ],
    },

    {
      id: 'one-step-physics', number: '1.2', title: 'One step: Newton, then Euler',
      goal: 'Follow `step(action)` from a push to the new state: the equations of motion in `accelerations`, then four Euler updates, and say why pushing right makes the pole fall left.',
      builds: ['cart-four-numbers'],
      blocks: [
        { md: `An **action** is the agent's choice: \`0\` pushes the cart left, \`1\` pushes it right. Like states, actions are numbers, because later the agent will keep one column per action in a table.

What does a push do? Physics answers in two stages:

1. **Newton**: from the push and the current state, work out the **accelerations**: how fast the cart's speed is changing ($\\ddot x$, "x double dot") and how fast the pole's spin is changing ($\\ddot\\theta$).
2. **Euler**: move time forward by $\\tau = 0.02$ s, assuming each rate stays constant for that short moment.` },
        { h: 'Stage 1: the equations of motion' },
        { md: `The cart and the pole push on each other through the hinge, so their motions are linked. Solving Newton's laws for this system (the derivation is in Florian's 2007 note on cart-pole dynamics, which Gymnasium cites) gives:

$$\\text{temp} = \\frac{F + m_p\\,l\\,\\dot\\theta^2 \\sin\\theta}{M}$$

$$\\ddot\\theta = \\frac{g\\sin\\theta - \\cos\\theta \\cdot \\text{temp}}{l\\left(\\tfrac{4}{3} - \\tfrac{m_p\\cos^2\\theta}{M}\\right)} \\qquad \\ddot x = \\text{temp} - \\frac{m_p\\,l\\,\\ddot\\theta\\cos\\theta}{M}$$

You don't need to derive them to use them. Read them by their parts:

- $F$ is the push, $+10$ or $-10$.
- $m_p l \\dot\\theta^2 \\sin\\theta$ is the pull of the spinning pole on the hinge (a spinning thing pulls outwards).
- $g \\sin\\theta$ in $\\ddot\\theta$ is **gravity tipping the pole further**: the more it leans, the faster it falls. Upright ($\\theta = 0$) is balanced, but only just.
- $-\\cos\\theta \\cdot \\text{temp}$ is the **cart's push felt by the pole**, with a minus sign: shove the cart right and the pole's foot goes right, so its top tips **left**.` },
        {
          code: {
            file: 'cartpole.py', fn: 'CartPole.accelerations', notes: [
              ['def accelerations', ['A method with three inputs besides `self`: the angle, the spin and the push. It doesn\'t need $x$ or $\\dot x$: where the cart is and how fast it moves don\'t change the forces.']],
              ['cos_theta = math.cos(theta)', ['$\\cos\\theta$, from Python\'s `math` module, which works in radians. Upright, $\\cos 0 = 1$.'], { tex: '\\cos\\theta', calc: v => [`cos(${f(v.theta)})`, Math.cos(v.theta)] }],
              ['sin_theta = math.sin(theta)', ['$\\sin\\theta$: 0 when upright, about $\\theta$ itself for small angles ($\\sin 0.05 \\approx 0.04998$).'], { tex: '\\sin\\theta', calc: v => [`sin(${f(v.theta)})`, Math.sin(v.theta)] }],
              ['temp = (push + self.pole_moment', ['The shared part of both equations. `theta_dot ** 2` is $\\dot\\theta^2$: `**` is Python\'s power operator, and it is worked out before the multiplications around it.'], { tex: '\\text{temp} = \\frac{F + m_p l\\,\\dot\\theta^2 \\sin\\theta}{M}', calc: v => [`(${s(v.push)} + ${f(v.self.pole_moment)} × ${s(v.theta_dot)}² × ${s(v.sin_theta)}) / ${f(v.self.total_mass)}`, (v.push + v.self.pole_moment * v.theta_dot ** 2 * v.sin_theta) / v.self.total_mass] }],
              ['theta_acc = (self.gravity * sin_theta', ['The pole\'s angular acceleration $\\ddot\\theta$. The statement is long, so it goes on over two lines: Python allows that inside an open bracket.'], { tex: '\\ddot\\theta = \\frac{g\\sin\\theta - \\cos\\theta\\cdot\\text{temp}}{l\\left(\\frac43 - \\frac{m_p\\cos^2\\theta}{M}\\right)}', calc: v => [`(${f(v.self.gravity)} × ${s(v.sin_theta)} − ${f(v.cos_theta)} × ${s(v.temp)}) / (${f(v.self.half_length)} × (4/3 − ${f(v.self.pole_mass)} × ${f(v.cos_theta)}² / ${f(v.self.total_mass)}))`, (v.self.gravity * v.sin_theta - v.cos_theta * v.temp) / (v.self.half_length * (4.0 / 3.0 - v.self.pole_mass * v.cos_theta ** 2 / v.self.total_mass))] }],
              ['x_acc = temp - self.pole_moment', ['The cart\'s acceleration $\\ddot x$: the push\'s share, minus what the pole\'s swing takes back.'], { tex: '\\ddot x = \\text{temp} - \\frac{m_p l\\,\\ddot\\theta\\cos\\theta}{M}', calc: v => [`${s(v.temp)} − ${f(v.self.pole_moment)} × ${s(v.theta_acc)} × ${f(v.cos_theta)} / ${f(v.self.total_mass)}`, v.temp - v.self.pole_moment * v.theta_acc * v.cos_theta / v.self.total_mass] }],
              ['return x_acc, theta_acc', ['Two values handed back at once, as a tuple: `step` unpacks them into two names.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'The pole is exactly upright and still ($\\theta = 0$, $\\dot\\theta = 0$) and the agent pushes **right** ($F = +10$). What is $\\ddot\\theta$, in rad/s²? (2 decimals)',
            answer: upright()[1], tolerance: 0.01, compute: () => upright()[1],
            explain: 'With $\\theta = 0$: $\\sin\\theta = 0$, $\\cos\\theta = 1$, so $\\text{temp} = 10/1.1 = 9.091$ and $\\ddot\\theta = (0 - 9.091) / (0.5 \\times (4/3 - 0.1/1.1)) = -9.091/0.6212 = -14.63$. **Negative: the pole starts falling left.** Pushing the cart right pulls its foot out from under it, so it tips the other way. To catch a pole leaning right, you push right: the foot runs under the top.',
            misconceptions: [{ answer: 14.63, tolerance: 0.05, feedback: 'Right size, wrong sign. Look at the minus in front of $\\cos\\theta\\cdot\\text{temp}$: pushing the cart right makes the pole tip **left**.' }],
          },
        },
        { h: 'Stage 2: Euler steps' },
        { md: `Knowing every rate of change, move time on by $\\tau = 0.02$ s. **Euler's method** is the simplest way: assume each rate is constant for that short moment, so

$$\\text{new value} = \\text{old value} + \\tau \\times \\text{rate of change}$$

Distance = speed × time, done four times:

$$x \\leftarrow x + \\tau\\dot x \\qquad \\dot x \\leftarrow \\dot x + \\tau\\ddot x \\qquad \\theta \\leftarrow \\theta + \\tau\\dot\\theta \\qquad \\dot\\theta \\leftarrow \\dot\\theta + \\tau\\ddot\\theta$$

It is not exact (the rates do change during the 0.02 s), but the error is small, and this *is* the world: the agent is judged against this rule, not against real physics.` },
        {
          code: {
            file: 'cartpole.py', fn: 'CartPole.step', notes: [
              ['def step(self, action)', ['The world\'s answer to one action. Every learning program in this lab calls it, through `env.step(action)`.']],
              ['x, x_dot, theta, theta_dot = self.state', ['Tuple unpacking: the current state\'s four numbers get four names.']],
              ['push = self.force if action == RIGHT else -self.force', ['A **conditional expression**: `a if condition else b` is `a` when the condition is true, otherwise `b`. Action 1 (`RIGHT`) pushes with $+10$ N; anything else with $-10$ N.'], { tex: 'F = \\begin{cases} +10 & a = 1 \\\\ -10 & a = 0 \\end{cases}', logic: 'If the action is "push right" (1), the force is +10 newtons; otherwise it is −10.', calc: v => [`${v.action} == RIGHT → ${v.action === v.RIGHT ? '+' : '−'}${f(v.self.force)}`, v.action === v.RIGHT ? v.self.force : -v.self.force] }],
              ['x_acc, theta_acc = self.accelerations(theta, theta_dot, push)', ['Stage 1: call the equations of motion (above) and unpack the two accelerations. **Step into** here in the Python tab to watch them worked out.']],
              ['x = x + self.tau * x_dot', ['Euler step for the position: move by speed × time. Note the order: the *old* speed is used, before it is updated on the next line.'], { tex: 'x \\leftarrow x + \\tau\\,\\dot x', calc: v => [`${s(v.x)} + ${f(v.self.tau)} × ${s(v.x_dot)}`, v.x + v.self.tau * v.x_dot] }],
              ['x_dot = x_dot + self.tau * x_acc', ['Euler step for the cart\'s speed: change by acceleration × time.'], { tex: '\\dot x \\leftarrow \\dot x + \\tau\\,\\ddot x', calc: v => [`${s(v.x_dot)} + ${f(v.self.tau)} × ${s(v.x_acc)}`, v.x_dot + v.self.tau * v.x_acc] }],
              ['theta = theta + self.tau * theta_dot', ['The same for the angle, with the old spin.'], { tex: '\\theta \\leftarrow \\theta + \\tau\\,\\dot\\theta', calc: v => [`${s(v.theta)} + ${f(v.self.tau)} × ${s(v.theta_dot)}`, v.theta + v.self.tau * v.theta_dot] }],
              ['theta_dot = theta_dot + self.tau * theta_acc', ['And the spin, changed by the angular acceleration.'], { tex: '\\dot\\theta \\leftarrow \\dot\\theta + \\tau\\,\\ddot\\theta', calc: v => [`${s(v.theta_dot)} + ${f(v.self.tau)} × ${s(v.theta_acc)}`, v.theta_dot + v.self.tau * v.theta_acc] }],
              ['self.state = (x, x_dot, theta, theta_dot)', ['The four new numbers packed into a new tuple and stored: this is now the world\'s state. (Tuples can\'t be changed in place, so a new one is made every step.)']],
              ['self.steps += 1', ['One more step on the clock. `+=` adds to the name\'s current value.']],
              ['terminated = x < -self.x_limit or x > self.x_limit', ['Four comparisons joined by `or`: true if **any** of them is. `or` stops at the first true one.'], { tex: '\\text{terminated} = |x| > 2.4 \\;\\lor\\; |\\theta| > 0.2094', logic: 'The game is **lost** if the cart is more than 2.4 m left of the centre, **or** more than 2.4 m right of it, **or** the pole leans more than 12° to the left, **or** more than 12° to the right. Inside all four limits, it goes on.', calc: v => [`${s(v.x)} < −2.4 or ${s(v.x)} > 2.4 or ${s(v.theta)} < −0.2094 or ${s(v.theta)} > 0.2094`, v.x < -v.self.x_limit || v.x > v.self.x_limit || v.theta < -v.self.angle_limit || v.theta > v.self.angle_limit] }],
              ['truncated = self.steps >= self.max_steps', ['`True` once 500 steps have been played: the time limit.'], { logic: 'The game is **cut off** (not lost) once it has lasted 500 steps.', calc: v => [`${v.self.steps} >= ${v.self.max_steps}`, v.self.steps >= v.self.max_steps] }],
              ['return self.state, 1.0, terminated, truncated, {}', ['Five values, always in this order (Gymnasium\'s order): the new state; the **reward**, 1.0 for every step survived (lesson 1.5); the two ways of ending; and `info`, a dictionary for extra facts, empty here.']],
            ],
          },
        },
        { figure: 'StepWorking', props: { seed: 0 }, caption: 'Push, and every number of `step` and `accelerations` is written out with the real values. Try pushing right five times in a row and watch $\\theta$ go negative.' },
        {
          predict: {
            prompt: 'The state is $(0.1, 0.5, 0.02, -0.3)$. After one step (whichever push), what is the new $x$?',
            answer: 0.1 + 0.02 * 0.5, tolerance: 1e-9, compute: () => { const e = new CartPole(); e.state = [0.1, 0.5, 0.02, -0.3]; return e.step(RIGHT)[0][0] },
            explain: '$x + \\tau\\dot x = 0.1 + 0.02 \\times 0.5 = 0.11$. The push changes $\\dot x$, but the new $x$ uses the **old** speed, so it doesn\'t depend on the push at all: an action takes a step to show up in the position.',
            misconceptions: [{ answer: 0.6, feedback: 'That adds the speed itself. The cart moves at 0.5 m/s for only $\\tau = 0.02$ s: $0.5 \\times 0.02 = 0.01$ m.' }],
          },
        },
        {
          mathCode: [
            ['\\ddot x,\\ \\ddot\\theta', 'x_acc, theta_acc', 'accelerations: how fast the speeds change'],
            ['\\tau', 'self.tau', '0.02 s, one step'],
            ['v \\leftarrow v + \\tau\\,\\dot v', 'x = x + self.tau * x_dot', 'one Euler step: old value + time × rate'],
            ['|x| > 2.4 \\lor |\\theta| > 0.2094', 'x < -self.x_limit or x > self.x_limit or …', 'terminated'],
          ],
        },
        { python: { program: 'rule', label: 'Step through a game in real Python, into env.step and accelerations' } },
        { note: 'A step is **Newton then Euler**: `accelerations` turns the push and the pole\'s angle and spin into $\\ddot x$ and $\\ddot\\theta$, then four lines move every number on by $\\tau$ times its rate. Pushing right tips the pole left; to catch a pole leaning right, push right.' },
      ],
    },

    {
      id: 'game-loop', number: '1.3', title: 'The game loop',
      goal: 'Write the agent–environment loop: `reset`, then `step` until the game ends; and say what a seed does.',
      builds: ['one-step-physics'],
      blocks: [
        { md: `Every reinforcement-learning program, from this lab's smallest to the ones that play Go, has the same loop at its heart:

1. **Reset** the world: it gives the first state.
2. The agent **chooses** an action from the state.
3. The world **steps**: it gives the next state, a reward, and whether the game is over.
4. Repeat from 2 until the game is over.

One pass from reset to the end is an **episode** (here, a game). First, the start:` },
        {
          code: {
            file: 'cartpole.py', fn: 'CartPole.reset', notes: [
              ['def reset(self, seed=None)', ['Starts a new game. `seed=None` means the seed is optional.']],
              ['if seed is not None:', ['`is not None` checks that a seed was actually given.'], { logic: 'Only if the caller gave a seed: restart the random numbers from it. Without a seed, the generator carries on where it was, so each game starts somewhere new.' }],
              ['self.rng.seed(seed)', ['**Seeding** a random number generator restarts it from a fixed point, so it produces the same "random" numbers every time. Same seed, same start, same game: that is how this lab\'s browser figures replay the Python programs exactly.']],
              ['x = self.rng.uniform(-0.05, 0.05)', ['`uniform(a, b)` is a random float between `a` and `b`, every value equally likely. The cart starts within 5 cm of the centre.'], { tex: 'x \\sim U(-0.05,\\ 0.05)' }],
              ['x_dot = self.rng.uniform(-0.05, 0.05)', ['…moving slowly…']],
              ['theta = self.rng.uniform(-0.05, 0.05)', ['…with the pole within 0.05 rad (under 3°) of upright…']],
              ['theta_dot = self.rng.uniform(-0.05, 0.05)', ['…and turning slowly. A slightly different start each game, so a rule must cope with more than one situation.']],
              ['self.state = (x, x_dot, theta, theta_dot)', ['The starting state, stored on the world.']],
              ['self.steps = 0', ['The clock back to zero.']],
              ['return self.state, {}', ['Gymnasium\'s shape: the state, and an empty `info` dictionary.']],
            ],
          },
        },
        { added: true, md: `**What \`reset\` and \`step\` give back, with real values.** The state is a **tuple** of four floats, always in the order $(x, \\dot x, \\theta, \\dot\\theta)$: position, velocity, angle, spin (lesson 1.1). Real calls, rounded to 4 places:

\`\`\`python
env = CartPole()
env.reset(seed=0)   # -> ((0.0344, 0.0258, -0.0079, -0.0241), {})
env.step(1)         # push right -> ((0.0350, 0.2210, -0.0084, -0.3193), 1.0, False, False, {})
env.step(1)         # push right -> ((0.0394, 0.4163, -0.0148, -0.6146), 1.0, False, False, {})
\`\`\`

\`step\` returns five values, in Gymnasium's order: **the next state, the reward, terminated, truncated, info**. Read the two pushes in the numbers: the cart's velocity $\\dot x$ grows (0.026 → 0.221 → 0.416) and the pole's spin $\\dot\\theta$ grows more negative (−0.024 → −0.319 → −0.615): pushing right tips the pole left, as lesson 1.2 explained. Code unpacks the five values into names at once: \`state, reward, terminated, truncated, info = env.step(action)\`.` },
        { md: `Now the loop. \`play\` in \`python/policies.py\` plays one game with a **policy**: a rule that maps a state to an action. Here a policy is just a Python function \`policy(state, rng)\` that returns 0 or 1. Passing a function as an argument is normal in Python: a function is a value like any other.` },
        {
          code: {
            file: 'policies.py', fn: 'play', notes: [
              ['def play(policy, seed=0, env=None)', ['Three inputs: the rule (a function), the seed, and optionally a world to play in.']],
              ['if env is None:', ['No world given?'], { logic: 'If no world was passed in, make a fresh standard CartPole. (Part 6 passes in a changed one.)' }],
              ['env = CartPole()', ['A new world with every default.']],
              ['rng = random.Random(seed)', ['A random generator for the rule (only the coin-toss rule uses it), seeded so the game can be replayed.']],
              ['state, info = env.reset(seed=seed)', ['**Step 1, reset.** Unpack the two values `reset` returns.']],
              ['trail = [state]', ['A list of every state of the game, starting with the first, for drawing the game afterwards.']],
              ['total = 0.0', ['The rewards added up so far.']],
              ['done = False', ['Whether the game is over. The loop below runs while it is `False`.']],
              ['while not done:', ['A `while` loop repeats its body as long as its condition is true.'], { logic: 'Keep playing **as long as the game is not over**.' }],
              ['action = policy(state, rng)', ['**Step 2, choose.** Call the rule with the state; it gives back 0 or 1.']],
              ['state, reward, terminated, truncated, info = env.step(action)', ['**Step 3, step.** The world answers with five values, unpacked into five names. Note that `state` is **replaced** by the next state: the old one is gone, which is fine here because nothing needs it again.']],
              ['total += reward', ['Add this step\'s reward. Every step pays 1.0, so `total` counts the steps.']],
              ['trail.append(state)', ['`append` adds an item to the end of a list.']],
              ['done = terminated or truncated', ['Over if it was lost **or** the time ran out.'], { logic: 'The game is over if the pole fell or the cart left the track (terminated), **or** 500 steps were reached (truncated).', calc: v => [`${tf(v.terminated)} or ${tf(v.truncated)}`, v.terminated || v.truncated] }],
              ['return total, trail', ['The game\'s length and its states.']],
            ],
          },
        },
        {
          code: {
            file: 'experiments.py', fn: 'play_rule', notes: [
              ['total, trail = play(RULES[rule], seed)', ['`RULES` is a dictionary from a rule\'s name to the function itself, so the Python tab can pick a rule by name: `RULES["lean_ahead"]` **is** the function `lean_ahead`, not a call to it (no brackets).']],
              ['return total', ['Just the game\'s length.']],
            ],
            caption: 'what the Python tab runs for this lesson',
          },
        },
        {
          predict: {
            prompt: 'With the rule "always push left", how many steps does game 0 (seed 0) last?',
            answer: play(RULES.always_left.run, 0).total, compute: () => play(RULES.always_left.run, 0).total,
            explain: 'Pushing left every step drives the cart left, and that tips the pole **right** (lesson 1.2), further each step, until it passes 12°. Try it in the next lesson\'s figure.',
          },
        },
        {
          choice: {
            prompt: 'Why does `reset` take a seed?',
            options: [
              { text: 'So a game can be replayed exactly: same seed, same starting state', why: 'Yes. Seeds make experiments repeatable, and let the browser figures replay the Python programs number for number.' },
              { text: 'To make the start more random', why: 'The opposite: a seed fixes the random numbers.' },
              { text: 'Because CartPole needs a seed to run', why: 'Without one, `reset` just carries on with the generator\'s next numbers.' },
              { text: 'To choose how long the game lasts', why: 'The length depends on the actions. The seed fixes only the starting state.' },
            ],
            answer: 0,
          },
        },
        { python: { program: 'rule', label: 'Step through one game: reset, choose, step, repeat' } },
        { note: 'The **agent–environment loop**: `state = env.reset()`, then repeatedly `action = policy(state)` and `state, reward, terminated, truncated, info = env.step(action)` until `terminated or truncated`. Everything later in this lab is this loop plus learning.' },
      ],
    },

    {
      id: 'rules-by-hand', number: '1.4', title: 'Rules written by hand',
      goal: 'Write a policy as a function, measure it fairly over 100 games, and explain why "lean ahead" balances the pole when "lean" can\'t.',
      builds: ['game-loop'],
      blocks: [
        { md: `Before any learning, try to *write* a rule. It shows what a good policy looks like, and gives the learners something to beat.` },
        {
          code: {
            file: 'policies.py', from: 6, to: 29, notes: [
              ['return LEFT', ['Ignores the state completely: always 0.']],
              ['return rng.randrange(2)', ['`randrange(2)` is 0 or 1, each with probability ½: a coin toss. The baseline any real rule must beat.']],
              ['x, x_dot, theta, theta_dot = state', ['Unpack the state to use its numbers by name.']],
              ['if theta > 0:', ['Leaning right?'], { logic: 'If the pole leans to the **right** (θ > 0), push right, so the cart runs under it; otherwise push left.', calc: v => [`${s(v.theta)} > 0`, v.theta > 0] }],
              ['return RIGHT', ['`return` leaves the function at once with that value…']],
              ['return LEFT', ['…so this line is only reached when the `if` was false.']],
              ['x, x_dot, theta, theta_dot = state', ['The same unpacking.']],
              ['if theta + 0.25 * theta_dot > 0:', ['The angle **a moment from now**: now plus spin × time. $\\theta + 0.25\\dot\\theta$ is roughly where the angle will be in a quarter of a second (12 steps).'], { tex: '\\theta + 0.25\\,\\dot\\theta > 0', logic: 'Push right if the pole **will be** leaning right a quarter of a second from now (where it leans, plus where it is heading); otherwise push left.', calc: v => [`${s(v.theta)} + 0.25 × ${s(v.theta_dot)} > 0`, v.theta + 0.25 * v.theta_dot > 0] }],
              ['return RIGHT', ['Heading right: push right.']],
              ['return LEFT', ['Otherwise push left.']],
            ],
          },
        },
        { figure: 'RulePlayer', props: { initial: 'lean' }, caption: 'Play each rule. "Lean" reacts to where the pole is, so it is always late: by the time it pushes, the pole is already swinging the other way, and the swings grow. "Lean ahead" reacts to where the pole is **going**.' },
        { h: 'Measuring a rule fairly' },
        { md: `One game proves little: the start is random, and a lucky start can make a bad rule look good. So play many games from different seeds and average.` },
        {
          code: {
            file: 'policies.py', fn: 'average_length', notes: [
              ['lengths = []', ['An empty list to collect one length per game.']],
              ['for seed in range(games):', ['`range(100)` is 0, 1, …, 99: one game per seed, so every rule is tested on **the same** 100 starts.']],
              ['total, trail = play(policy, seed)', ['Play one game.']],
              ['lengths.append(total)', ['Keep its length.']],
              ['return sum(lengths) / len(lengths), lengths', ['The average (sum divided by count), and every length.'], { tex: '\\bar L = \\frac{1}{N}\\sum_{i=1}^{N} L_i' }],
            ],
          },
        },
        {
          predict: {
            prompt: 'Over the 100 games, what is the average length for the rule **lean**? (2 decimals)',
            answer: averageLength(RULES.lean.run).mean, tolerance: 0.005, compute: () => averageLength(RULES.lean.run).mean,
            explain: 'About 43 steps: much better than a coin toss (about 22), far from 500. Reacting to the angle alone is always late.',
          },
        },
        { md: `"Lean ahead" lasts all 500 steps in every one of the 100 games. CartPole is **solved by a one-line rule**, if you know the physics.

So why learn at all? Because the agent will find a rule like this **without being told any physics**: only the four numbers and "+1 for every step the pole stays up". The same learning code then works on problems where nobody knows the rule: a robot walking, a game of Go. CartPole is where we can check its answer. In Part 3 you will see a learned table that pushes almost exactly as "lean ahead" does.` },
        {
          choice: {
            prompt: 'Why does "lean ahead" ($\\theta + 0.25\\dot\\theta > 0$) do so much better than "lean" ($\\theta > 0$)?',
            options: [
              { text: 'It pushes according to where the pole is heading, so it acts before the pole has swung too far', why: 'Yes. A pole that leans right but is already swinging back left shouldn\'t be pushed right. Using the spin is acting on a prediction.' },
              { text: 'It pushes harder', why: 'Every push is 10 N; a rule only chooses the direction.' },
              { text: 'It looks at the cart\'s position', why: 'Neither rule uses $x$. (That is why "lean ahead" games could, in principle, drift off the track.)' },
              { text: 'It is random sometimes', why: 'Both rules are deterministic: the same state always gives the same push.' },
            ],
            answer: 0,
          },
        },
        { figure: 'DriveYourself', caption: 'Your turn. Step by step it is a puzzle; in real time you get 0.02 s per push.' },
        { note: 'A **policy** maps a state to an action; in code, a function. Judge it on many games, the same ones for every rule. A rule that uses where the pole is **heading** ($\\dot\\theta$), not only where it is, can balance indefinitely.' },
      ],
    },

    {
      id: 'return-discount', number: '1.5', title: 'Rewards, the return and discounting',
      goal: 'Add up a game\'s rewards into its return, discount them with γ, compute every step\'s return backwards, and say what γ = 0.99 means for CartPole.',
      builds: ['game-loop'],
      blocks: [
        { md: `The **reward** is the only thing that tells the agent what we want. CartPole's is as simple as rewards get: **+1 for every step**, including the last. A game of 200 steps earned 200.

The agent shouldn't just grab the next reward; it should get the most reward **in total, from now on**. That total is called the **return**, $G$. For the step at time $t$:

$$G_t = R_{t+1} + R_{t+2} + R_{t+3} + \\dots$$

(Reward $R_{t+1}$ is the one that arrives *after* the action at time $t$, hence the $+1$.)` },
        { h: 'Discounting' },
        { md: `Usually each reward is multiplied by $\\gamma$ (gamma, between 0 and 1) once for every step it has to wait:

$$G_t = R_{t+1} + \\gamma R_{t+2} + \\gamma^2 R_{t+3} + \\dots = \\sum_{k=0}^{\\infty} \\gamma^k R_{t+k+1}$$

Why? A reward later is less certain than one now, and with $\\gamma < 1$ the sum stays finite even for endless games. In CartPole every reward is 1, so a game that has $T$ steps left returns

$$G = 1 + \\gamma + \\gamma^2 + \\dots + \\gamma^{T-1} = \\frac{1 - \\gamma^T}{1 - \\gamma} \\;<\\; \\frac{1}{1-\\gamma}$$

With $\\gamma = 0.99$ that ceiling is 100: the agent effectively looks about **100 steps (2 seconds) ahead**. Rewards further away hardly count. That turns out to be plenty for balancing a pole.` },
        { figure: 'ReturnCurve', caption: 'The return of a game of $T$ steps. Raise $\\gamma$ towards 1 and the agent cares further ahead.' },
        {
          code: {
            file: 'returns.py', fn: 'discounted_return', notes: [
              ['G = 0.0', ['Start the sum at zero.']],
              ['for k, reward in enumerate(rewards):', ['`enumerate` gives each item **and** its position: `k` is 0, 1, 2, … and `reward` is the reward there.']],
              ['G += gamma ** k * reward', ['Add the $k$-th reward, discounted $k$ times: $\\gamma^k R_{k+1}$.'], { tex: 'G \\mathrel{+}= \\gamma^k R_{k+1}', calc: v => [`${f(v.G)} + ${f(v.gamma)}^${v.k} × ${f(v.reward)}`, v.G + v.gamma ** v.k * v.reward] }],
              ['return G', ['The return of the whole game, from its first step.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'A game lasts 10 steps (ten rewards of 1). With $\\gamma = 0.9$, what is its return $G_0$? (4 decimals)',
            answer: discountedReturn(new Array(10).fill(1), 0.9), tolerance: 0.0001, compute: () => discountedReturn(new Array(10).fill(1), 0.9),
            explain: '$(1 - 0.9^{10}) / (1 - 0.9) = (1 - 0.3487)/0.1 = 6.5132$. Undiscounted it would be 10; the later rewards count less and less.',
            misconceptions: [{ answer: 10, feedback: 'That is the undiscounted sum. Each reward is multiplied by $0.9^k$: $1 + 0.9 + 0.81 + \\dots$' }],
          },
        },
        { h: 'Every step\'s return, backwards' },
        { md: `Learning needs $G_t$ for **every** step of a game, not just the first. Computing each sum from scratch repeats work. Instead notice that each return contains the next one:

$$G_t = R_{t+1} + \\gamma\\,(R_{t+2} + \\gamma R_{t+3} + \\dots) = R_{t+1} + \\gamma\\,G_{t+1}$$

So start at the end, where nothing is left ($G = 0$), and walk backwards, one multiply and one add per step. This one line, $G_t = R_{t+1} + \\gamma G_{t+1}$, returns again and again: it is the seed of every learning method in this lab.` },
        {
          code: {
            file: 'returns.py', fn: 'all_returns', notes: [
              ['G = 0.0', ['After the last step there is no reward left.']],
              ['returns = []', ['Will hold $G_t$ for every step.']],
              ['for reward in reversed(rewards):', ['`reversed` walks the list from the end: the last reward first.']],
              ['G = reward + gamma * G', ['$G_t = R_{t+1} + \\gamma G_{t+1}$: this step\'s reward plus the discounted return that follows.'], { tex: 'G_t = R_{t+1} + \\gamma\\,G_{t+1}', calc: v => [`${f(v.reward)} + ${f(v.gamma)} × ${f(v.G)}`, v.reward + v.gamma * v.G] }],
              ['returns.insert(0, G)', ['`insert(0, …)` puts it at the **front**, so after the loop the list is in time order again.']],
              ['return returns', ['$[G_0, G_1, \\dots]$.']],
            ],
          },
        },
        {
          code: {
            file: 'experiments.py', fn: 'game_returns', notes: [
              ['total, trail = play(RULES[rule], seed)', ['Play one game with the named rule.']],
              ['rewards = [1.0] * int(total)', ['Multiplying a list repeats it: `[1.0] * 3` is `[1.0, 1.0, 1.0]`. One reward of 1 per step. `int` turns the float total into a whole number.']],
              ['returns = all_returns(rewards, gamma)', ['Every step\'s return.']],
              ['return returns', ['The list, to look at.']],
            ],
            caption: 'what the Python tab runs for this lesson',
          },
        },
        {
          predict: {
            prompt: 'A game has 3 steps left, every reward 1, $\\gamma = 0.9$. Walking backwards: $G_2 = 1$, $G_1 = 1 + 0.9 \\times 1 = 1.9$. What is $G_0$?',
            answer: allReturns([1, 1, 1], 0.9)[0], tolerance: 1e-9, compute: () => allReturns([1, 1, 1], 0.9)[0],
            explain: '$G_0 = 1 + 0.9 \\times 1.9 = 2.71$, the same as $1 + 0.9 + 0.81$.',
          },
        },
        {
          choice: {
            prompt: 'In CartPole with $\\gamma = 0.99$, a state near the start of a game that will last 500 steps, and one 400 steps from the end of a game that will last 400 steps, have nearly the same return. Why?',
            options: [
              { text: 'Both have about 100 discounted steps\' worth ahead: rewards more than a few hundred steps away count almost nothing', why: 'Yes: $(1 - 0.99^{500})/0.01 = 99.3$ and $(1-0.99^{400})/0.01 = 98.2$. Discounting makes the far future fade.' },
              { text: 'Because the rewards are all 1', why: 'They are, but undiscounted the returns would be 500 and 400. It is $\\gamma$ that brings them together.' },
              { text: 'Because γ makes every return 100', why: 'Only the ceiling is 100. A state 5 steps from falling returns about 4.9.' },
              { text: 'They don\'t: one is 500 and one is 400', why: 'Those are the undiscounted totals.' },
            ],
            answer: 0,
          },
        },
        { python: { program: 'returns', label: 'Step through the backwards walk in real Python' } },
        { note: 'The **return** $G_t = R_{t+1} + \\gamma R_{t+2} + \\gamma^2 R_{t+3} + \\dots$ is what the agent tries to maximise. It obeys $G_t = R_{t+1} + \\gamma G_{t+1}$, so every step\'s return comes from one backwards pass. In CartPole, $\\gamma = 0.99$ means "look about 100 steps ahead".' },
      ],
    },

    {
      id: 'same-as-gymnasium', number: '1.6', title: 'The same world in Gymnasium',
      goal: 'Use Gymnasium\'s CartPole-v1 and check, number for number, that this lab\'s world is the same one.',
      builds: ['game-loop'],
      blocks: [
        { md: `**Gymnasium** (formerly OpenAI Gym) is the standard Python library of RL worlds. Its CartPole is used like this:

\`\`\`python
import gymnasium as gym
env = gym.make("CartPole-v1")
state, info = env.reset(seed=0)
state, reward, terminated, truncated, info = env.step(1)
\`\`\`

The same \`reset\` and \`step\`, returning the same things in the same order: this lab's \`CartPole\` copies its interface on purpose, so everything you learn here works on Gymnasium's worlds, and on the hundreds of others written to the same interface.

But is it the same **world**? \`compare\` plays both side by side with the same pushes from the same states and measures every difference.` },
        {
          code: {
            file: 'gym_compare.py', fn: 'compare', notes: [
              ['ours = CartPole()', ['This lab\'s world.']],
              ['theirs = gym.make("CartPole-v1").unwrapped', ['Gymnasium\'s. `.unwrapped` is the bare world without Gymnasium\'s wrappers (such as the 500-step limit), so its state can be set directly.']],
              ['rng = random.Random(seed)', ['Random numbers for the pushes.']],
              ['state, info = ours.reset(seed=seed)', ['Start our world…']],
              ['theirs.reset(seed=seed)', ['…and theirs (it needs a reset before it will step)…']],
              ['theirs.state = np.array(state)', ['…then put theirs in exactly our starting state. Gymnasium draws its starts with NumPy\'s random numbers, ours with Python\'s, so the starts differ; copying the state makes the comparison fair.']],
              ['largest_gap = 0.0', ['The largest difference seen in any of the four numbers.']],
              ['disagreements = 0', ['Steps where the reward or the ending differed.']],
              ['games = 0', ['How many games were played.']],
              ['for t in range(steps):', ['5,000 steps by default (300 in the Python tab).']],
              ['x, x_dot, theta, theta_dot = state', ['Our current state, unpacked.']],
              ['action = rng.randrange(2) if rng.random() < 0.3', ['30% of the time a random push, otherwise "lean ahead": random enough to visit many states, steady enough for long games. `int(True)` is 1.'], { logic: 'With probability 0.3 toss a coin; otherwise push right exactly when θ + 0.25 θ̇ > 0.' }],
              ['state, reward, terminated, truncated, info = ours.step(action)', ['Our world steps.']],
              ['observation, their_reward', ['Theirs steps with the same action.']],
              ['gap = max(abs(a - b) for a, b in zip(state, theirs.state))', ['`zip` pairs our four numbers with theirs; `abs(a - b)` is each difference; `max(…)` the largest. The part inside `max(…)` is a **generator expression**: a loop written inline.'], { tex: '\\max_i |s_i - s\'_i|' }],
              ['largest_gap = max(largest_gap, gap)', ['Keep the worst so far.']],
              ['if reward != their_reward or terminated != their_terminated:', ['Did they disagree on the reward or on the ending?'], { logic: 'Count a disagreement if the two worlds paid different rewards **or** one ended the game and the other didn\'t.' }],
              ['disagreements += 1', ['Count it.']],
              ['if terminated or truncated:', ['Game over in our world?']],
              ['games += 1', ['Count the game.']],
              ['state, info = ours.reset()', ['New start (no seed: the generator carries on).']],
              ['theirs.reset()', ['Reset theirs…']],
              ['theirs.state = np.array(state)', ['…and copy our new start into it.']],
              ['print("games:"', ['Report.']],
              ['return largest_gap, disagreements, games', ['The three results.']],
            ],
          },
        },
        { md: `The result, measured with Gymnasium 1.4 over 5,000 steps: **largest difference 0.0, disagreements 0**. Not "close": every number of every state is identical to the last digit, because \`cartpole.py\` does the same arithmetic in the same order as Gymnasium's source.

(The browser can't run Gymnasium, but this lab's figures use a JavaScript copy of \`cartpole.py\`. Its tests check it against the Python program: one step from the same state gives the same numbers to $10^{-15}$. Over a long game a difference in the last digit of \`Math.sin\` can grow, as it does in any chaotic system, so a long browser game can differ slightly from Python's.)` },
        {
          choice: {
            prompt: 'Why does `compare` copy our state into Gymnasium\'s world after every reset?',
            options: [
              { text: 'The two worlds pick their random starts differently, so without copying they would start in different states', why: 'Yes. Gymnasium uses NumPy\'s generator; this lab uses Python\'s `random`. Copying the start makes the two play from the same place.' },
              { text: 'Gymnasium has no reset', why: 'It does; it is called just before.' },
              { text: 'To make the test pass', why: 'Copying the start doesn\'t make later steps agree: only the same physics does.' },
              { text: 'Because Gymnasium\'s states are integers', why: 'They are floats (NumPy arrays of 4).' },
            ],
            answer: 0,
          },
        },
        { python: { program: 'gym', label: 'Run the comparison in real Python' } },
        { note: 'This lab\'s `CartPole` **is** Gymnasium\'s `CartPole-v1`, number for number, with the same `reset`/`step` interface. Anything trained here can be trained on Gymnasium by changing one line.' },
      ],
    },
  ],
}
