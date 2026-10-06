// What a learner does at each step of "Reinforcement Learning in pygame", for the walkthrough
// test (rlPygame.desktop.test.js). Keyed "<lesson file name>#<step title>".
//
// By default a step's file (its ```lang file=... block) is typed in for you. An entry adds:
//   run:   commands the lesson tells the learner to type in the terminal (PowerShell)
//   wrong: wrong answers, tried on a copy of the project before the step; each lists the
//          indexes of the step's checks that must fail ("fails").
//   edit:  [[from, to], ...] applied to the step's own target, written to the step's file
//          (how a wrong answer is usually made: the right file with one mistake in it).
// A wrong answer's copy of the project shares the real .venv (a directory junction), so a wrong
// answer that changes installed packages sets copyVenv: true to get a copy of its own.

// Lesson 4.4: a test file that passes on the real grid.py and catches none of the mutants.
const HAPPY_PATH = `from grid import GridWorld


def test_reaching_the_goal():
    env = GridWorld(["S.G"])
    env.reset()
    env.step(3)
    _, reward, terminated, truncated, _ = env.step(3)
    assert reward == 1.0 and terminated and not truncated


def test_starts_at_s():
    env = GridWorld(["S.G"])
    assert env.reset()[0] == 0


def test_hole_costs_one():
    env = GridWorld(["SH"])
    env.reset()
    assert env.step(3)[1] == -1.0
`;

// Lesson 4.4: six honest tests that still leave slip_ignored and timeout_beats_goal alive.
const SIX_BUT_BLIND = `from grid import GridWorld

WORLD = ["S.#", "...", "H.G"]


def make(**options):
    env = GridWorld(WORLD, **options)
    env.reset(seed=0)
    return env


def test_walls_block_movement():
    env = make()
    env.step(3)
    env.step(3)
    assert env.cell == (0, 1)


def test_edges_block_movement():
    env = make()
    env.step(0)
    assert env.cell == (0, 0)


def test_goal_ends_with_plus_one():
    env = make()
    env.cell = (2, 1)
    _, reward, terminated, _, _ = env.step(3)
    assert reward == 1.0 and terminated


def test_hole_ends_with_minus_one():
    env = make()
    env.cell = (1, 0)
    _, reward, terminated, _, _ = env.step(1)
    assert reward == -1.0 and terminated


def test_time_runs_out_after_max_steps():
    env = make(max_steps=2)
    assert env.step(0)[3] is False
    assert env.step(0)[3] is True


def test_reset_starts_a_fresh_episode():
    env = make(max_steps=3)
    env.step(1)
    env.step(1)
    env.reset()
    assert env.steps == 0
`;

// Lesson 8.4: a capstone test file with too few tests.
const CAPSTONE_THREE_TESTS = `from capstone_env import CapstoneEnv


def test_reset():
    assert CapstoneEnv().reset(seed=0)[0] == 0


def test_states():
    assert CapstoneEnv().observation_space.n == 50


def test_actions():
    assert CapstoneEnv().action_space.n == 4
`;

export const WALKTHROUGH = {
  // ── 0.1 ──────────────────────────────────────────────────────────────────
  '00-01-project-and-venv#Make a virtual environment': {
    run: ['python -m venv .venv'],
    wrong: [{ name: 'did nothing', fails: [0, 1] }],
  },
  '00-01-project-and-venv#Pin the packages': {
    wrong: [
      { name: 'asked for the toy-text extra', edit: [['gymnasium==1.3.0', 'gymnasium[toy-text]==1.3.0']], fails: [2, 4] },
      { name: 'did not pin pygame-ce', edit: [['pygame-ce==2.5.8', 'pygame-ce']], fails: [1] },
    ],
  },
  '00-01-project-and-venv#Install them': {
    run: ['.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [
      { name: 'did nothing', fails: [0, 1] },
      {
        name: 'installed the original pygame instead of pygame-ce',
        copyVenv: true,
        run: ['.venv\\Scripts\\python -m pip install -q numpy==2.5.3 pygame==2.6.1 gymnasium==1.3.0 pytest==9.1.1'],
        fails: [1],
      },
    ],
  },

  // ── 0.2 ──────────────────────────────────────────────────────────────────
  '00-02-know-your-machine#Which Python ran this?': {
    wrong: [{ name: 'tested the environment the wrong way round', edit: [['sys.prefix != sys.base_prefix', 'sys.prefix == sys.base_prefix']], fails: [0] }],
  },
  '00-02-know-your-machine#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '00-02-know-your-machine#Which packages?': {
    wrong: [
      { name: 'reads comment lines as packages', edit: [['        if not line or line.startswith("#"):', '        if not line:']], fails: [0] },
      { name: 'says ok without comparing versions', edit: [['        if have == wanted:', '        if True:']], fails: [0] },
    ],
  },
  '00-02-know-your-machine#Which GPU?': {
    wrong: [{ name: 'kept the spaces around each field', edit: [['[part.strip() for part in row.split(",")]', 'row.split(",")']], fails: [0] }],
  },

  // ── 0.3 ──────────────────────────────────────────────────────────────────
  '00-03-a-window-and-a-loop#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0, 1] }],
  },
  '00-03-a-window-and-a-loop#A window that stays open': {
    wrong: [{ name: 'does not return the frame count', edit: [['    pygame.quit()\n    return frames\n', '    pygame.quit()\n']], fails: [0] }],
  },
  '00-03-a-window-and-a-loop#Sixty frames a second': {
    wrong: [{ name: 'never ticks the clock', edit: [['        clock.tick(60)\n', '']], fails: [0] }],
  },
  '00-03-a-window-and-a-loop#Draw a grid': {
    wrong: [{ name: 'swapped rows and columns', edit: [['(col * CELL + 8, row * CELL + 8,', '(row * CELL + 8, col * CELL + 8,']], fails: [0] }],
  },
  '00-03-a-window-and-a-loop#Arrow keys move the player': {
    wrong: [{ name: 'walks through walls', edit: [['row = min(max(cell[0] + delta[0], 0), size - 1)', 'row = cell[0] + delta[0]']], fails: [0] }],
  },

  // ── 1.1 ──────────────────────────────────────────────────────────────────
  '01-01-the-shape-of-a-q-table#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '01-01-the-shape-of-a-q-table#A table of zeros': {
    wrong: [{ name: 'made a grid-shaped table', edit: [['np.zeros((rows * cols, len(ACTIONS)))', 'np.zeros((rows, cols))']], fails: [0] }],
  },
  '01-01-the-shape-of-a-q-table#Number the cells': {
    wrong: [{ name: 'numbered down the columns', edit: [['return row * cols + col', 'return col * cols + row']], fails: [0] }],
  },
  '01-01-the-shape-of-a-q-table#Ask the table two questions': {
    wrong: [{ name: 'collapsed the wrong axis', edit: [['Q.max(axis=1)', 'Q.max(axis=0)']], fails: [0] }],
  },
  '01-01-the-shape-of-a-q-table#Back to a grid, and onto a colour scale': {
    wrong: [{ name: 'divides by zero when all values are equal', edit: [['    if high == low:\n        return np.zeros(values.shape)\n', '']], fails: [0] }],
  },
  '01-01-the-shape-of-a-q-table#See the table': {
    wrong: [{ name: 'shades with raw values', edit: [['shade = normalise(state_values(Q))', 'shade = state_values(Q)']], fails: [0] }],
  },

  // ── 1.2 ──────────────────────────────────────────────────────────────────
  '01-02-indexing-and-broadcasting#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '01-02-indexing-and-broadcasting#A row is a window into the table': {
    wrong: [{ name: 'only counts rises', edit: [['np.abs(new - old).max()', '(new - old).max()']], fails: [0] }],
  },
  '01-02-indexing-and-broadcasting#Break ties at random': {
    wrong: [
      { name: 'still takes the first best', edit: [['    best = np.flatnonzero(row == row.max())\n    return int(rng.choice(best))', '    return int(row.argmax())']], fails: [0] },
      { name: 'returns a NumPy integer', edit: [['return int(rng.choice(best))', 'return rng.choice(best)']], fails: [0] },
    ],
  },
  '01-02-indexing-and-broadcasting#Pick one value from every row': {
    wrong: [{ name: 'took whole columns instead of one value per row', edit: [['return Q[np.arange(len(Q)), actions]', 'return Q[:, actions]']], fails: [0] }],
  },
  '01-02-indexing-and-broadcasting#Broadcasting: combining different shapes': {
    wrong: [
      { name: 'forgot keepdims', edit: [['Q.max(axis=1, keepdims=True)', 'Q.max(axis=1)']], fails: [0] },
      { name: 'walks through walls', edit: [['np.clip(row[:, None] + deltas[:, 0], 0, rows - 1)', 'row[:, None] + deltas[:, 0]']], fails: [0] },
    ],
  },
  '01-02-indexing-and-broadcasting#See every best move': {
    wrong: [{ name: 'still draws only the first best move', edit: [['np.flatnonzero(best[state]):', 'np.flatnonzero(best[state])[:1]:']], fails: [0] }],
  },

  // ── 2.1 ──────────────────────────────────────────────────────────────────
  '02-01-probability-by-simulation#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '02-01-probability-by-simulation#A yes-or-no event': {
    wrong: [
      { name: 'counts exactly p as true', edit: [['rng.random() < p', 'rng.random() <= p']], fails: [0] },
      { name: 'compared the wrong way round', edit: [['rng.random() < p', 'rng.random() > p']], fails: [0] },
    ],
  },
  '02-01-probability-by-simulation#Choosing among several outcomes': {
    wrong: [
      { name: 'searched from the left', edit: [['side="right"', 'side="left"']], fails: [0] },
      { name: 'can run off the end', edit: [['    return min(index, len(probs) - 1)', '    return index']], fails: [0] },
    ],
  },
  '02-01-probability-by-simulation#A slippery floor': {
    wrong: [{ name: 'gave each side the whole slip', edit: [['probs[side] += slip / 2', 'probs[side] += slip']], fails: [0] }],
  },
  '02-01-probability-by-simulation#Walk on the ice': {
    wrong: [{ name: 'drew the bars hanging below the floor', edit: [['(x, FLOOR - height, 60, height)', '(x, FLOOR, 60, height)']], fails: [0] }],
  },

  // ── 2.2 ──────────────────────────────────────────────────────────────────
  '02-02-expectation-and-uncertainty#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '02-02-expectation-and-uncertainty#The expected value': {
    wrong: [{ name: 'averaged the values, ignoring their probabilities', edit: [['np.sum(np.asarray(values) * np.asarray(probs))', 'np.mean(values)']], fails: [0] }],
  },
  '02-02-expectation-and-uncertainty#The variance: how far single results scatter': {
    // For the ±1 ice the mean absolute distance is also 0.64; the die case in the test catches it.
    wrong: [{ name: 'used absolute distances instead of squared', edit: [['(np.asarray(values) - mean) ** 2', 'np.abs(np.asarray(values) - mean)']], fails: [0] }],
  },
  '02-02-expectation-and-uncertainty#From probabilities to data': {
    wrong: [{ name: 'divided by n', edit: [['np.std(xs, ddof=1)', 'np.std(xs)']], fails: [0] }],
  },
  '02-02-expectation-and-uncertainty#How far off is an average?': {
    wrong: [{ name: 'divided by n instead of its square root', edit: [['sample_std(xs) / np.sqrt(len(xs))', 'sample_std(xs) / len(xs)']], fails: [0] }],
  },
  '02-02-expectation-and-uncertainty#Watch the averages narrow': {
    wrong: [{ name: 'scored the slides as wins', edit: [['np.where(rng.random(n) < SLIP, -1.0, 1.0)', 'np.where(rng.random(n) > SLIP, -1.0, 1.0)']], fails: [0] }],
  },

  // ── 2.3 ──────────────────────────────────────────────────────────────────
  '02-03-the-running-average#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '02-03-the-running-average#One update rule': {
    wrong: [{ name: 'moved by the target instead of the error', edit: [['estimate + step * (target - estimate)', 'estimate + step * target']], fails: [0] }],
  },
  '02-03-the-running-average#The exact mean, one result at a time': {
    wrong: [{ name: 'counted from 0', edit: [['enumerate(xs, start=1)', 'enumerate(xs)']], fails: [0] }],
  },
  '02-03-the-running-average#A constant step': {
    wrong: [
      { name: 'left the step out of the weights', edit: [['return step * (1 - step) ** np.arange(n)', 'return (1 - step) ** np.arange(n)']], fails: [0] },
      { name: 'ignored the starting estimate', edit: [['    estimate = start\n', '    estimate = 0.0\n']], fails: [0] },
    ],
  },
  '02-03-the-running-average#Watch them follow a change': {
    wrong: [{ name: 'drew high values at the bottom', edit: [['round(BOTTOM - (value - LOW) / (HIGH - LOW) * (BOTTOM - TOP))', 'round(TOP + (value - LOW) / (HIGH - LOW) * (BOTTOM - TOP))']], fails: [0] }],
  },

  // ── 3.1 ──────────────────────────────────────────────────────────────────
  '03-01-a-room-of-slot-machines#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '03-01-a-room-of-slot-machines#A machine with a hidden average': {
    wrong: [{ name: 'draws a new mean on every pull', edit: [['return float(self.rng.normal(self.means[arm], 1.0))', 'return float(self.rng.normal(0.0, 1.0))']], fails: [0] }],
  },
  '03-01-a-room-of-slot-machines#A learner that keeps averages': {
    wrong: [{ name: 'updates before counting the pull', edit: [['        self.N[arm] += 1\n        self.Q[arm] = update(self.Q[arm], reward, 1 / self.N[arm])', '        self.Q[arm] = update(self.Q[arm], reward, 1 / (self.N[arm] + 2))\n        self.N[arm] += 1']], fails: [0] }],
  },
  '03-01-a-room-of-slot-machines#The room': {
    wrong: [{ name: 'timer forgets the leftover time', edit: [['        self.waited -= fired * self.interval\n', '        self.waited = 0\n']], fails: [0] }],
  },

  // ── 3.2 ──────────────────────────────────────────────────────────────────
  '03-02-explore-or-exploit#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '03-02-explore-or-exploit#Explore on purpose: ε-greedy': {
    wrong: [{ name: 'random pulls never reach the last machine', edit: [['rng.integers(len(self.Q))', 'rng.integers(len(self.Q) - 1)']], fails: [0] }],
  },
  '03-02-explore-or-exploit#Optimism as exploration': {
    wrong: [{ name: 'ignored the starting value', edit: [['self.Q = np.full(k, float(initial))', 'self.Q = np.zeros(k)']], fails: [0] }],
  },
  '03-02-explore-or-exploit#A fair experiment': {
    wrong: [{ name: 'room and learner share one generator', edit: [['agent_rng = np.random.default_rng([seed, 1])', 'agent_rng = world_rng']], fails: [0] }],
  },
  '03-02-explore-or-exploit#A chart you can reuse': {
    wrong: [{ name: 'traced both band edges left to right', edit: [['upper + lower[::-1]', 'upper + lower']], fails: [0] }],
  },

  // ── 3.3 ──────────────────────────────────────────────────────────────────
  '03-03-uncertainty-and-change#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '03-03-uncertainty-and-change#Explore where you\'re unsure': {
    wrong: [
      { name: 'bonus grows with the count instead of shrinking', edit: [['np.sqrt(np.log(self.N.sum()) / self.N)', 'np.sqrt(np.log(self.N.sum()) * self.N)']], fails: [0] },
      { name: 'does not try untried machines first', edit: [['        if len(untried):\n            return int(self.rng.choice(untried))\n', '']], fails: [0] },
    ],
  },
  '03-03-uncertainty-and-change#Machines that drift': {
    wrong: [{ name: 'machines never move', edit: [['        self.means += self.rng.normal(0.0, self.drift, len(self.means))\n', '']], fails: [0] }],
  },
  '03-03-uncertainty-and-change#Experiments in any room': {
    wrong: [{ name: 'still always builds a plain Bandit', edit: [['    bandit = make_bandit(k, world_rng)', '    bandit = Bandit(k, world_rng)']], fails: [0] }],
  },
  '03-03-uncertainty-and-change#One comparison window for every experiment': {
    wrong: [{ name: 'draw still reads the global list', edit: [['zip(strategies, experiments)', 'zip(STRATEGIES, experiments)']], fails: [0] }],
  },

  // ── 4.1 ──────────────────────────────────────────────────────────────────
  '04-01-the-grid-world#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '04-01-the-grid-world#The map': {
    wrong: [{ name: 'accepts a ragged map', edit: [['        if len({len(row) for row in layout}) != 1:\n            raise ValueError("every row of the map must be the same length")\n', '']], fails: [0] }],
  },
  '04-01-the-grid-world#Moving around': {
    wrong: [{ name: 'walks through walls', edit: [['        if self.tile((row, col)) == "#":\n            return cell\n', '']], fails: [0] }],
  },
  '04-01-the-grid-world#The episode contract: reset and step': {
    wrong: [
      { name: 'a goal on the last step also counts as a time-out', edit: [['truncated = not terminated and self.steps >= self.max_steps', 'truncated = self.steps >= self.max_steps']], fails: [0] },
      { name: 'reset forgets to zero the step counter', edit: [['        self.cell = self.start\n        self.steps = 0\n        return', '        self.cell = self.start\n        return']], fails: [0] },
    ],
  },
  '04-01-the-grid-world#Play it': {
    wrong: [{ name: 'draws every tile as floor', edit: [['TILES.get(env.tile((row, col)), TILES["."])', 'TILES["."]']], fails: [0] }],
  },

  // ── 4.2 ──────────────────────────────────────────────────────────────────
  '04-02-the-workbench#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '04-02-the-workbench#Agents: an agreement': {
    wrong: [{ name: 'random agent never picks the last action', edit: [['self.rng.integers(self.n_actions)', 'self.rng.integers(self.n_actions - 1)']], fails: [0] }],
  },
  '04-02-the-workbench#The workbench': {
    wrong: [
      { name: 'never pays off the steps it ran', edit: [['        self.owed -= steps\n', '']], fails: [0] },
      { name: 'tells the agent the wrong state', edit: [['self.agent.learn(self.state, action', 'self.agent.learn(next_state, action']], fails: [0] },
    ],
  },

  // ── 4.3 ──────────────────────────────────────────────────────────────────
  '04-03-returns-and-discounting#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '04-03-returns-and-discounting#Adding up a whole episode': {
    wrong: [{ name: 'discounted from the front instead of the back', edit: [['for reward in reversed(rewards):', 'for reward in rewards:']], fails: [0] }],
  },
  '04-03-returns-and-discounting#Playing one episode': {
    wrong: [{ name: 'never tells the agent what happened', edit: [['        agent.learn(state, action, reward, next_state, terminated, truncated)\n', '']], fails: [0] }],
  },
  '04-03-returns-and-discounting#Judging a policy': {
    wrong: [{ name: 'walls become action -1', edit: [['max(ARROWS.find(ch), 0)', 'ARROWS.find(ch)']], fails: [0] }],
  },
  '04-03-returns-and-discounting#Which route is better?': {
    wrong: [{ name: 'a top-route arrow points back the way it came', edit: [['"^#>>v",\n       "^##Hv",', '"^#><v",\n       "^##Hv",']], fails: [0] }],
  },

  // ── 4.4 ──────────────────────────────────────────────────────────────────
  '04-04-testing-your-environment#The mutants': {
    wrong: [{ name: 'did not create the files', fails: [0, 1] }],
  },
  '04-04-testing-your-environment#Write your own tests': {
    wrong: [{ name: 'three happy-path tests', files: { 'tests/test_my_grid.py': HAPPY_PATH }, fails: [1] }],
  },
  '04-04-testing-your-environment#Hunt the mutants': {
    wrong: [{ name: 'six tests, but none for slip or a goal on the last step', files: { 'tests/test_my_grid.py': SIX_BUT_BLIND }, fails: [0] }],
  },

  // ── 4.5 ──────────────────────────────────────────────────────────────────
  '04-05-the-world-as-tables#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '04-05-the-world-as-tables#What can one action do?': {
    wrong: [{ name: 'certain outcome on the wrong action', edit: [['    probs[action] = 1.0\n', '    probs[0] = 1.0\n']], fails: [0] }],
  },
  '04-05-the-world-as-tables#The whole world as tables': {
    wrong: [{ name: 'overwrites probabilities that land on the same cell', edit: [['P[state, action, next_state] += p', 'P[state, action, next_state] = p']], fails: [0] }],
  },
  '04-05-the-world-as-tables#Two descriptions that must agree': {
    wrong: [{ name: 'summed over the actions instead of the next states', edit: [['return (P * R).sum(axis=2)', 'return (P * R).sum(axis=1)']], fails: [0] }],
  },
  '04-05-the-world-as-tables#See where an action can lead': {
    wrong: [{ name: 'swapped x and y', edit: [['row, col = pos[1] // CELL, pos[0] // CELL', 'row, col = pos[0] // CELL, pos[1] // CELL']], fails: [0] }],
  },

  // ── 5.1 ──────────────────────────────────────────────────────────────────
  '05-01-policy-evaluation#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '05-01-policy-evaluation#Values from one step ahead': {
    wrong: [{ name: 'forgot to discount the next value', edit: [['(P * (R + gamma * V)).sum(axis=2)', '(P * (R + V)).sum(axis=2)']], fails: [0] }],
  },
  '05-01-policy-evaluation#Sweep until nothing changes': {
    wrong: [
      { name: 'took the best action instead of the policy\'s average', edit: [['new = (policy * q_from_v(P, R, V, gamma)).sum(axis=1)', 'new = q_from_v(P, R, V, gamma).max(axis=1)']], fails: [0] },
      { name: 'stops after one sweep', edit: [['        if change < tolerance:\n', '        if True:\n']], fails: [0] },
    ],
  },
  '05-01-policy-evaluation#Watch the values spread': {
    wrong: [{ name: 'negative values shaded teal', edit: [['return mix(WARM, COLD, min(value / LOW, 1.0))', 'return mix(WARM, HOT, min(value / LOW, 1.0))']], fails: [0] }],
  },

  // ── 5.2 ──────────────────────────────────────────────────────────────────
  '05-02-value-iteration#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '05-02-value-iteration#Better arrows from any values': {
    wrong: [{ name: 'rows no longer add up to 1', edit: [['    return best / best.sum(axis=1, keepdims=True)\n', '    return best\n']], fails: [0] }],
  },
  '05-02-value-iteration#Value iteration': {
    wrong: [{ name: 'averaged the actions instead of taking the best', edit: [['        new = q_from_v(P, R, V, gamma).max(axis=1)\n', '        new = q_from_v(P, R, V, gamma).mean(axis=1)\n']], fails: [0] }],
  },
  '05-02-value-iteration#Plan in the window: both methods': {
    wrong: [{ name: 'always runs value iteration', edit: [['    if mode == "random":', '    if False:']], fails: [0] }],
  },
  '05-02-value-iteration#Arrows from the values on screen': {
    wrong: [{ name: 'draws four arrows where every action ties', edit: [[' or (policy[state] > 0).all():', ':']], fails: [0] }],
  },

  // ── 6.1 ──────────────────────────────────────────────────────────────────
  '06-01-monte-carlo#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '06-01-monte-carlo#A table-keeping agent': {
    wrong: [{ name: 'never counts updates', edit: [['        self.N[state, action] += 1\n', '']], fails: [0] }],
  },
  '06-01-monte-carlo#Monte Carlo: average what actually happened': {
    wrong: [{ name: 'walked the episode forwards', edit: [['for s, a, r in reversed(self.episode):', 'for s, a, r in self.episode:']], fails: [0] }],
  },
  '06-01-monte-carlo#Training, and judging what was learned': {
    wrong: [{ name: 'judged the worst actions instead of the best', edit: [['greedy_policy(Q)', 'greedy_policy(-Q)']], fails: [0] }],
  },

  // ── 6.2 ──────────────────────────────────────────────────────────────────
  '06-02-temporal-difference#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '06-02-temporal-difference#Learn from the next step': {
    wrong: [
      { name: 'bootstraps even after an ending', edit: [['target = reward if terminated else reward + self.gamma * self.V[next_state]', 'target = reward + self.gamma * self.V[next_state]']], fails: [0] },
      { name: 'treats a time-out as an ending', edit: [['target = reward if terminated else', 'target = reward if terminated or truncated else']], fails: [0] },
    ],
  },
  '06-02-temporal-difference#Monte Carlo, for comparison': {
    wrong: [{ name: 'walked the episode forwards', edit: [['            for s, r in reversed(self.episode):', '            for s, r in self.episode:']], fails: [0] }],
  },
  '06-02-temporal-difference#A walk with known answers': {
    wrong: [{ name: 'forgot the square root', edit: [['return float(np.sqrt(np.mean((V[1:6] - TRUE_VALUES) ** 2)))', 'return float(np.mean((V[1:6] - TRUE_VALUES) ** 2))']], fails: [0] }],
  },

  // ── 6.3 ──────────────────────────────────────────────────────────────────
  '06-03-sarsa-and-the-cliff#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '06-03-sarsa-and-the-cliff#Cliffs in the grid world': {
    wrong: [
      { name: 'the cliff does not send you back', edit: [['        if tile == CLIFF:\n            self.cell = self.start\n', '']], fails: [0] },
      { name: 'made the cliff end the episode', edit: [['ENDS = "GH"', 'ENDS = "GHC"']], fails: [0] },
    ],
  },
  '06-03-sarsa-and-the-cliff#Show the cliff': {
    wrong: [{ name: 'no colour for cliff tiles', edit: [[',\n         "C": (127, 29, 29)}', '}']], fails: [0] }],
  },
  '06-03-sarsa-and-the-cliff#SARSA: TD control': {
    wrong: [
      { name: 'used the best next action instead of the one it will take', edit: [['target = reward + self.gamma * self.Q[next_state, self.next_action]', 'target = reward + self.gamma * self.Q[next_state].max()']], fails: [0] },
      { name: 'keeps the next action across a time-out', edit: [['        if terminated or truncated:\n            self.next_action = None', '        if terminated:\n            self.next_action = None']], fails: [0] },
    ],
  },

  // ── 7.1 ──────────────────────────────────────────────────────────────────
  '07-01-q-learning#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '07-01-q-learning#Q-learning': {
    wrong: [
      { name: 'averaged the next actions instead of taking the best', edit: [['reward + self.gamma * self.Q[next_state].max()', 'reward + self.gamma * self.Q[next_state].mean()']], fails: [0] },
      { name: 'treats a time-out as an ending', edit: [['target = reward if terminated else reward + self.gamma * self.Q[next_state].max()', 'target = reward if terminated or truncated else reward + self.gamma * self.Q[next_state].max()']], fails: [0] },
    ],
  },
  '07-01-q-learning#Expected SARSA': {
    wrong: [{ name: 'gave every action the whole epsilon', edit: [['return (1 - self.epsilon) * best + self.epsilon / len(row)', 'return (1 - self.epsilon) * best + self.epsilon']], fails: [0] }],
  },
  '07-01-q-learning#Race them on the cliff': {
    wrong: [{ name: 'swapped rows and columns on the map', edit: [['(MAP_LEFT + col * MAP_CELL + MAP_CELL // 2 + offset, MAP_TOP + row * MAP_CELL + MAP_CELL // 2 + offset)', '(MAP_LEFT + row * MAP_CELL + MAP_CELL // 2 + offset, MAP_TOP + col * MAP_CELL + MAP_CELL // 2 + offset)']], fails: [0] }],
  },

  // ── 7.2 ──────────────────────────────────────────────────────────────────
  '07-02-judging-honestly#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '07-02-judging-honestly#Keep training where you left off': {
    wrong: [{ name: 're-seeds every call anyway', edit: [['    if seed is not None:\n        env.reset(seed=seed)\n', '    env.reset(seed=seed or 0)\n']], fails: [0] }],
  },
  '07-02-judging-honestly#Judge the greedy policy on its own episodes': {
    wrong: [{ name: 'keeps exploring while being judged', edit: [['int(Q[state].argmax())', 'int(np.random.default_rng().integers(len(Q[state])))']], fails: [0] }],
  },
  '07-02-judging-honestly#A learning curve that measures the right thing': {
    wrong: [
      { name: 'judges on the training environment', edit: [['curve[i] = greedy_returns(judge,', 'curve[i] = greedy_returns(env,']], fails: [0] },
      { name: 'replays the same training luck every chunk', edit: [['train(env, agent, every, seed=None)', 'train(env, agent, every, seed=seed)']], fails: [0] },
    ],
  },

  // ── 7.3 ──────────────────────────────────────────────────────────────────
  '07-03-tuning#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '07-03-tuning#Optimistic starts': {
    wrong: [{ name: 'accepts initial but ignores it', edit: [['self.Q = np.full((n_states, n_actions), float(initial))', 'self.Q = np.zeros((n_states, n_actions))']], fails: [0] }],
  },
  '07-03-tuning#One number per setting': {
    wrong: [{ name: 'scored the last state instead of the start', edit: [['return greedy_value(env, agent.Q, gamma)[0]', 'return greedy_value(env, agent.Q, gamma)[-1]']], fails: [0] }],
  },
  '07-03-tuning#The heatmap': {
    wrong: [{ name: 'colours can run past the ends of the scale', edit: [['mix(COLD, HOT, min(max(t, 0.0), 1.0))', 'mix(COLD, HOT, t)']], fails: [0] }],
  },

  // ── 7.4 ──────────────────────────────────────────────────────────────────
  '07-04-double-q-learning#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '07-04-double-q-learning#A world built to fool a maximiser': {
    wrong: [{ name: 'B pays the mean exactly, with no noise', edit: [['reward = 0.0 if self.state == 0 else float(self.rng.normal(self.mean, 1.0))', 'reward = 0.0 if self.state == 0 else self.mean']], fails: [0] }],
  },
  '07-04-double-q-learning#Count the left turns': {
    wrong: [{ name: 'counted the last action instead of the first', edit: [['            lefts[episode] += action == 0\n', '']], fails: [0] }],
  },
  '07-04-double-q-learning#Double Q-learning': {
    wrong: [{ name: 'chose and valued with the same table', edit: [['target = reward + self.gamma * other[next_state, best]', 'target = reward + self.gamma * update[next_state, best]']], fails: [0] }],
  },

  // ── 7.5 ──────────────────────────────────────────────────────────────────
  '07-05-reward-design#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '07-05-reward-design#A coin that pays every time': {
    wrong: [{ name: 'no colour for coins', edit: [[', "c": (217, 119, 6)}', '}']], fails: [0] }],
  },
  '07-05-reward-design#Shaping as a wrapper': {
    wrong: [
      { name: 'kept the potential after an ending', edit: [['after = 0.0 if terminated else self.potential[next_state]', 'after = self.potential[next_state]']], fails: [0] },
      { name: 'left out gamma', edit: [['reward += self.gamma * after - self.potential[self.state]', 'reward += after - self.potential[self.state]']], fails: [0] },
    ],
  },
  '07-05-reward-design#A tempting mistake': {
    wrong: [{ name: 'pays the bonus everywhere', edit: [['self.bonus = (distance_to_goal(env) == 1) * bonus', 'self.bonus = np.ones(env.n_states) * bonus']], fails: [0] }],
  },

  // ── 8.1 ──────────────────────────────────────────────────────────────────
  '08-01-gymnasium-environment#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '08-01-gymnasium-environment#The Env class': {
    wrong: [{ name: 'never hands the seeded generator to the grid', edit: [['        self.grid.rng = self.np_random\n', '']], fails: [0] }],
  },
  '08-01-gymnasium-environment#Pictures: render modes': {
    wrong: [{ name: 'rgb_array returns nothing', edit: [['            return np.transpose(pygame.surfarray.array3d(surface), (1, 0, 2))', '            return None']], fails: [0] }],
  },
  '08-01-gymnasium-environment#Register and make': {
    wrong: [{ name: 'registered a 200-step limit', edit: [['max_episode_steps=100)', 'max_episode_steps=200)']], fails: [0] }],
  },

  // ── 8.2 ──────────────────────────────────────────────────────────────────
  '08-02-frozenlake#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '08-02-frozenlake#Gymnasium\'s own rules as tables': {
    wrong: [{ name: 'marked the wrong state as terminal', edit: [['terminal[next_state] |= done', 'terminal[state] |= done']], fails: [0] }],
  },
  '08-02-frozenlake#Train your agent on FrozenLake': {
    wrong: [{ name: 'kept the 1/N step', edit: [['epsilon=0.1, gamma=GAMMA, step=0.1)', 'epsilon=0.1, gamma=GAMMA, step=None)']], fails: [0] }],
  },
  '08-02-frozenlake#Judge by success, and draw the policy': {
    wrong: [{ name: 'judged with discounting, not success', edit: [['reached = greedy_returns(make_lake(), Q, episodes, 1.0, seed)', 'reached = greedy_returns(make_lake(), Q, episodes, GAMMA, seed)']], fails: [0] }],
  },

  // ── 8.3 ──────────────────────────────────────────────────────────────────
  '08-03-cartpole#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '08-03-cartpole#From four numbers to one cell': {
    wrong: [{ name: 'the top edge falls off the last bin', edit: [['index = np.minimum((fraction * self.bins).astype(int), self.bins - 1)', 'index = (fraction * self.bins).astype(int)']], fails: [0] }],
  },
  '08-03-cartpole#A wrapper that hands out cells': {
    wrong: [{ name: 'never declared the new observation space', edit: [['        self.observation_space = spaces.Discrete(discretizer.n_states)\n', '']], fails: [0] }],
  },
  '08-03-cartpole#Train a balancer': {
    wrong: [{ name: 'explores all the time', edit: [['epsilon=0.1, gamma=0.99, step=0.1)', 'epsilon=1.0, gamma=0.99, step=0.1)']], fails: [0] }],
  },

  // ── 8.4 ──────────────────────────────────────────────────────────────────
  '08-04-capstone#Your environment': {
    wrong: [{ name: 'forgot to register Capstone-v0', edit: [['\n\ngym.register(id="Capstone-v0", entry_point=CapstoneEnv, max_episode_steps=200)', '']], fails: [1] }],
  },
  '08-04-capstone#Your tests': {
    wrong: [{ name: 'only three tests', files: { 'tests/test_capstone.py': CAPSTONE_THREE_TESTS }, fails: [1] }],
  },
  '08-04-capstone#Your experiment': {
    wrong: [{ name: 'never compares with the baseline', edit: [['    print("beats the random baseline" if mean - 2 * error > baseline else "does not beat the random baseline")\n', '']], fails: [0] }],
  },
  '08-04-capstone#Your report': {
    wrong: [{ name: 'left out the limitations', edit: [['### Limitations', '### Caveats']], fails: [3] }],
  },
};
