// What a learner does at each step of Q-Arcade, for the walkthrough test (qArcade.desktop.test.js).
// Keyed "<track>/<lesson file name>#<step title>".
//
// By default a step's file (its ```lang file=... block) is typed in for you. An entry adds:
//   run:   commands the lesson tells the learner to type in the terminal (PowerShell)
//   files: { path: content } written as they are: a Your turn answer, from the chapter's
//          answers/ folder (answer('qarcade-setup', 'window.py')).
//   wrong: wrong answers, tried on a copy of the project before the step; each lists the indexes
//          of the step's checks that must fail ("fails").
//   edit:  [[from, to], ...] applied to the step's own target, written to the step's file (how a
//          wrong answer is usually made: the right file with one mistake in it).
//   editFiles: { path: [[from, to], ...] } applied to a file as it is in the project now.
// A wrong answer's copy of the project shares the real .venv (a directory junction), so a wrong
// answer that changes installed packages sets copyVenv: true to get a copy of its own.
import fs from 'node:fs';

export function answer(track, name) {
  return fs.readFileSync(new URL(`./${track}/answers/${name}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
}

// A Your turn answer with one change: how its wrong answers are made.
function answerWith(track, name, pairs) {
  let content = answer(track, name);
  for (const [from, to] of pairs) {
    if (!content.includes(from)) throw new Error(`Wrong answer edit not found in ${track}/answers/${name}: ${from}`);
    content = content.replace(from, to);
  }
  return content;
}

const S = 'qarcade-setup';
const C = 'qarcade-corridor';
const K = 'qarcade-cartpole';

export const WALKTHROUGH = {
  // ── 0.1 ──────────────────────────────────────────────────────────────────
  [`${S}/00-01-a-project-with-its-own-python#Make a virtual environment`]: {
    run: ['python -m venv .venv'],
    wrong: [{ name: 'did nothing', fails: [0, 1] }],
  },
  [`${S}/00-01-a-project-with-its-own-python#Pin the packages`]: {
    wrong: [
      { name: 'asked for the classic-control extra', edit: [['gymnasium==1.3.0', 'gymnasium[classic-control]==1.3.0']], fails: [2, 4] },
      { name: 'did not pin pygame-ce', edit: [['pygame-ce==2.5.8', 'pygame-ce']], fails: [1] },
    ],
  },
  [`${S}/00-01-a-project-with-its-own-python#Install them`]: {
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
  [`${S}/00-01-a-project-with-its-own-python#Your turn: keep the environment out of Git`]: {
    files: { '.gitignore': answer(S, 'gitignore.txt') },
    wrong: [
      { name: 'did nothing', fails: [0, 1, 2] },
      { name: 'only ignored the environment', files: { '.gitignore': '.venv/\n' }, fails: [1, 2] },
    ],
  },

  // ── 0.2 ──────────────────────────────────────────────────────────────────
  [`${S}/00-02-a-window-and-a-loop#Read the tests first`]: {
    wrong: [{ name: 'did not create the files', fails: [0, 1] }],
  },
  [`${S}/00-02-a-window-and-a-loop#A window that stays open`]: {
    wrong: [
      { name: 'does not return the frame count', edit: [['    pygame.quit()\n    return frames\n', '    pygame.quit()\n']], fails: [0] },
      { name: 'stops one frame late', edit: [['frames >= max_frames', 'frames > max_frames']], fails: [0] },
    ],
  },
  [`${S}/00-02-a-window-and-a-loop#Sixty frames a second`]: {
    wrong: [{ name: 'never ticks the clock', edit: [['        clock.tick(60)\n', '']], fails: [0] }],
  },
  [`${S}/00-02-a-window-and-a-loop#A dot that moves`]: {
    wrong: [
      { name: 'swapped left and right', edit: [['        x -= STEP\n    elif key == pygame.K_RIGHT:\n        x += STEP', '        x += STEP\n    elif key == pygame.K_RIGHT:\n        x -= STEP']], fails: [0] },
      { name: 'every other key moves right', edit: [['    elif key == pygame.K_RIGHT:\n        x += STEP', '    else:\n        x += STEP']], fails: [0] },
    ],
  },
  [`${S}/00-02-a-window-and-a-loop#Your turn: stop at the edges`]: {
    files: { 'window.py': answer(S, 'window.py') },
    wrong: [
      { name: 'did not change move', fails: [0] },
      { name: 'stops only at the left edge', files: { 'window.py': answerWith(S, 'window.py', [['return max(STEP // 2, min(WIDTH - STEP // 2, x))', 'return max(STEP // 2, x)']]) }, fails: [0] },
      { name: 'lets the dot half off the right edge', files: { 'window.py': answerWith(S, 'window.py', [['min(WIDTH - STEP // 2, x)', 'min(WIDTH, x)']]) }, fails: [0] },
    ],
  },

  // ── 1.1 ──────────────────────────────────────────────────────────────────
  [`${C}/01-01-a-corridor-you-can-play#Read the tests first`]: {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  [`${C}/01-01-a-corridor-you-can-play#The state`]: {
    wrong: [
      { name: 'reset returns only the state', edit: [['        return self.cell, {}', '        return self.cell']], fails: [0] },
      { name: 'reset starts on the coin', edit: [['    def reset(self, seed=None):\n        self.cell = START', '    def reset(self, seed=None):\n        self.cell = COIN']], fails: [0] },
    ],
  },
  [`${C}/01-01-a-corridor-you-can-play#Moving`]: {
    wrong: [{ name: 'right moves left', edit: [['            self.cell += 1\n        else:\n            self.cell -= 1', '            self.cell -= 1\n        else:\n            self.cell += 1']], fails: [0] }],
  },
  [`${C}/01-01-a-corridor-you-can-play#The two ends`]: {
    wrong: [
      { name: 'the coin pays as much as the treasure', edit: [['reward = 0.1', 'reward = 1.0']], fails: [0] },
      { name: 'the coin does not end the episode', edit: [['            reward = 0.1\n            terminated = True', '            reward = 0.1']], fails: [0] },
    ],
  },
  [`${C}/01-01-a-corridor-you-can-play#Your turn: running out of time`]: {
    files: { 'corridor.py': answer(C, 'corridor.py') },
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'truncates even on the step that ends it', files: { 'corridor.py': answerWith(C, 'corridor.py', [['truncated = not terminated and self.steps >= self.max_steps', 'truncated = self.steps >= self.max_steps']]) }, fails: [0] },
      { name: 'truncates one step late', files: { 'corridor.py': answerWith(C, 'corridor.py', [['self.steps >= self.max_steps', 'self.steps > self.max_steps']]) }, fails: [0] },
    ],
  },
  [`${C}/01-01-a-corridor-you-can-play#Play it yourself`]: {
    wrong: [{ name: 'swapped the keys', edit: [['    if key == pygame.K_LEFT:\n        return LEFT\n    if key == pygame.K_RIGHT:\n        return RIGHT', '    if key == pygame.K_LEFT:\n        return RIGHT\n    if key == pygame.K_RIGHT:\n        return LEFT']], fails: [0, 1] }],
  },

  // ── 1.2 ──────────────────────────────────────────────────────────────────
  [`${C}/01-02-the-q-table#Read the tests first`]: {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  [`${C}/01-02-the-q-table#A table of zeros`]: {
    wrong: [
      { name: 'rows and columns the wrong way round', edit: [['np.zeros((n_states, n_actions))', 'np.zeros((n_actions, n_states))']], fails: [0] },
      { name: 'a list of lists', edit: [['np.zeros((n_states, n_actions))', '[[0.0] * n_actions for _ in range(n_states)]']], fails: [0] },
    ],
  },
  [`${C}/01-02-the-q-table#The best action`]: {
    wrong: [
      { name: 'returns the best value, not its position', edit: [['int(np.argmax(row))', 'float(np.max(row))']], fails: [0] },
      { name: 'picks the smallest', edit: [['np.argmax(row)', 'np.argmin(row)']], fails: [0] },
    ],
  },
  [`${C}/01-02-the-q-table#Your turn: break ties at random`]: {
    files: { 'qtable.py': answer(C, 'qtable.py') },
    wrong: [
      { name: 'did nothing', fails: [0, 1] },
      { name: 'picks among every action, not the best', files: { 'qtable.py': answerWith(C, 'qtable.py', [['best = np.flatnonzero(row == row.max())', 'best = np.arange(len(row))']]) }, fails: [0, 1] },
      { name: 'returns a NumPy integer', files: { 'qtable.py': answerWith(C, 'qtable.py', [['return int(rng.choice(best))', 'return rng.choice(best)']]) }, fails: [0, 1] },
    ],
  },

  // ── 1.3 ──────────────────────────────────────────────────────────────────
  [`${C}/01-03-the-update-by-hand#Read the tests first`]: {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  [`${C}/01-03-the-update-by-hand#A little of the way`]: {
    wrong: [
      { name: 'jumps to the target', edit: [['estimate + alpha * (target - estimate)', 'target']], fails: [0] },
      { name: 'moves away from the target', edit: [['(target - estimate)', '(estimate - target)']], fails: [0] },
    ],
  },
  [`${C}/01-03-the-update-by-hand#What to aim for`]: {
    wrong: [
      { name: 'adds a next value after an ending', edit: [['    if terminated:\n        return reward\n', '']], fails: [0] },
      { name: 'forgets the discount', edit: [['reward + gamma * next_row.max()', 'reward + next_row.max()']], fails: [0] },
      { name: 'averages the next actions instead of taking the best', edit: [['next_row.max()', 'next_row.mean()']], fails: [0] },
    ],
  },
  [`${C}/01-03-the-update-by-hand#Your turn: one update`]: {
    files: { 'qlearning.py': answer(C, 'qlearning.py') },
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: "uses this state's row instead of the next state's", files: { 'qlearning.py': answerWith(C, 'qlearning.py', [['q_target(reward, Q[next_state], terminated, gamma)', 'q_target(reward, Q[state], terminated, gamma)']]) }, fails: [0] },
      { name: 'never stores the new value', files: { 'qlearning.py': answerWith(C, 'qlearning.py', [['    Q[state, action] = nudge(Q[state, action], target, alpha)', '    nudge(Q[state, action], target, alpha)']]) }, fails: [0] },
    ],
  },
  [`${C}/01-03-the-update-by-hand#Watch the values flow back`]: {
    wrong: [{ name: 'never moves on to the next state', edit: [['            state = next_state\n', '']], fails: [0, 1] }],
  },

  // ── 1.4 ──────────────────────────────────────────────────────────────────
  [`${C}/01-04-explore-or-exploit#Read the tests first`]: {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  [`${C}/01-04-explore-or-exploit#An agent object`]: {
    wrong: [
      { name: 'explores more by default', edit: [['epsilon=0.1', 'epsilon=0.3']], fails: [0] },
      { name: 'learns with a step of 1', edit: [['self.alpha, self.gamma)', '1.0, self.gamma)']], fails: [0] },
    ],
  },
  [`${C}/01-04-explore-or-exploit#An episode`]: {
    wrong: [
      { name: 'learns even when told not to', edit: [['        if learn:\n            agent.learn', '        if True:\n            agent.learn']], fails: [0] },
      { name: 'returns after the first step', edit: [['        if terminated or truncated:\n            return total', '        return total']], fails: [0] },
    ],
  },
  [`${C}/01-04-explore-or-exploit#Your turn: explore sometimes`]: {
    files: { 'agent.py': answer(C, 'agent.py') },
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'explores when it should exploit', files: { 'agent.py': answerWith(C, 'agent.py', [['self.rng.random() < self.epsilon', 'self.rng.random() > self.epsilon']]) }, fails: [0] },
      { name: 'returns NumPy integers', files: { 'agent.py': answerWith(C, 'agent.py', [['return int(self.rng.integers(self.Q.shape[1]))', 'return self.rng.integers(self.Q.shape[1])']]) }, fails: [0] },
    ],
  },
  [`${C}/01-04-explore-or-exploit#The experiment`]: {
    wrong: [{ name: 'counts the wrong end as found', edit: [['return env.cell == TREASURE', 'return env.cell != TREASURE']], fails: [0, 1] }],
  },

  // ── 1.5 ──────────────────────────────────────────────────────────────────
  [`${C}/01-05-watch-it-learn#Read the tests first`]: {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  [`${C}/01-05-watch-it-learn#One step per frame`]: {
    wrong: [
      { name: 'never starts a new episode', edit: [['            self.state, _ = self.env.reset()\n', '']], fails: [0] },
      { name: 'forgets to learn', edit: [['        self.agent.learn(self.state, action, reward, next_state, terminated)\n', '']], fails: [0] },
    ],
  },
  [`${C}/01-05-watch-it-learn#What it believes`]: {
    wrong: [{ name: 'marks only one of two tied actions', edit: [['BEST if row[1] == best else OTHER', 'BEST if row[1] > row[0] else OTHER']], fails: [0] }],
  },
  [`${C}/01-05-watch-it-learn#Your turn: how far ahead to look`]: {
    files: { 'discount.py': answer(C, 'discount.py') },
    wrong: [
      { name: 'did nothing', fails: [0, 1] },
      { name: 'ignores the gamma it was given', files: { 'discount.py': answerWith(C, 'discount.py', [['gamma=gamma, ', '']]) }, fails: [0, 1] },
    ],
  },

  // ── 2.1 ──────────────────────────────────────────────────────────────────
  [`${K}/02-01-the-cart-and-the-pole#Read the tests first`]: {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  [`${K}/02-01-the-cart-and-the-pole#Meet CartPole`]: {
    wrong: [
      { name: 'keeps stepping after the end', edit: [['        if terminated or truncated:\n            break\n', '']], fails: [0] },
      { name: 'leaves out the starting row', edit: [['    rows = [(obs, 0.0, False, False)]', '    rows = []']], fails: [0] },
    ],
  },
  [`${K}/02-01-the-cart-and-the-pole#One tick of physics`]: {
    wrong: [
      { name: 'moves the cart with its new velocity', edit: [['x + TAU * x_dot, x_dot + TAU * x_acc', 'x + TAU * (x_dot + TAU * x_acc), x_dot + TAU * x_acc']], fails: [0] },
      { name: 'pushes the wrong way', edit: [['FORCE if action == 1 else -FORCE', '-FORCE if action == 1 else FORCE']], fails: [0] },
      { name: 'wrote 3 / 4 for 4 / 3', edit: [['4 / 3', '3 / 4']], fails: [0] },
    ],
  },
  [`${K}/02-01-the-cart-and-the-pole#From metres to pixels`]: {
    wrong: [{ name: 'puts the middle of the track at the left edge', edit: [['int(WIDTH / 2 + x * SCALE)', 'int(x * SCALE)']], fails: [0] }],
  },
  [`${K}/02-01-the-cart-and-the-pole#Your turn: the tip of the pole`]: {
    files: { 'cartpole_view.py': answer(K, 'cartpole_view_tip.py') },
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'draws the tip below the base', files: { 'cartpole_view.py': answerWith(K, 'cartpole_view_tip.py', [['by - length * math.cos(theta)', 'by + length * math.cos(theta)']]) }, fails: [0] },
      { name: 'swapped sin and cos', files: { 'cartpole_view.py': answerWith(K, 'cartpole_view_tip.py', [['bx + length * math.sin(theta), by - length * math.cos(theta)', 'bx + length * math.cos(theta), by - length * math.sin(theta)']]) }, fails: [0] },
    ],
  },
  [`${K}/02-01-the-cart-and-the-pole#Balance it yourself`]: {
    wrong: [{ name: 'pushes left whenever no key is held', edit: [['    return 1 - last', '    return 0']], fails: [0, 1] }],
  },

  // ── 2.2 ──────────────────────────────────────────────────────────────────
  [`${K}/02-02-simple-rules-measured#Read the tests first`]: {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  [`${K}/02-02-simple-rules-measured#Playing many episodes`]: {
    wrong: [{ name: 'stops after the first episode', edit: [['            obs, _ = env.reset()', '            break']], fails: [0] }],
  },
  [`${K}/02-02-simple-rules-measured#Your turn: push towards the lean`]: {
    files: { 'baselines.py': answer(K, 'baselines_lean.py') },
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'pushes away from the lean', files: { 'baselines.py': answerWith(K, 'baselines_lean.py', [['return 1 if obs[2] > 0 else 0', 'return 0 if obs[2] > 0 else 1']]) }, fails: [0] },
      { name: 'reads the spin instead of the angle', files: { 'baselines.py': answerWith(K, 'baselines_lean.py', [['return 1 if obs[2] > 0 else 0', 'return 1 if obs[3] > 0 else 0']]) }, fails: [0] },
    ],
  },
  [`${K}/02-02-simple-rules-measured#Lean and spin`]: {
    wrong: [{ name: 'subtracts the spin', edit: [['obs[2] + obs[3] > 0', 'obs[2] - obs[3] > 0']], fails: [0, 1] }],
  },

  // ── 2.3 ──────────────────────────────────────────────────────────────────
  [`${K}/02-03-four-numbers-into-one-cell#Read the tests first`]: {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  [`${K}/02-03-four-numbers-into-one-cell#Where the cuts go`]: {
    wrong: [
      { name: 'keeps the outer edges', edit: [['[1:-1]', '']], fails: [0] },
      { name: 'makes one slot too many', edit: [['count + 1', 'count + 2']], fails: [0] },
    ],
  },
  [`${K}/02-03-four-numbers-into-one-cell#Which slot`]: {
    wrong: [
      { name: 'puts edge values in the slot below', edit: [['int(np.digitize(value, edges))', 'int(np.digitize(value, edges, right=True))']], fails: [0] },
      { name: 'returns a NumPy integer', edit: [['int(np.digitize(value, edges))', 'np.digitize(value, edges)']], fails: [0] },
    ],
  },
  [`${K}/02-03-four-numbers-into-one-cell#Your turn: four slots, one row number`]: {
    files: { 'bins.py': answer(K, 'bins.py') },
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'adds the slots up without multiplying', files: { 'bins.py': answerWith(K, 'bins.py', [['index = index * count + bin_index(value, value_edges)', 'index = index + bin_index(value, value_edges)']]) }, fails: [0] },
    ],
  },
  [`${K}/02-03-four-numbers-into-one-cell#How big is the table?`]: {
    wrong: [{ name: 'halved the spin slots', editFiles: { 'bins.py': [['COUNTS = (1, 1, 6, 12)', 'COUNTS = (1, 1, 6, 6)']] }, fails: [0, 1] }],
  },

  // ── 2.4 ──────────────────────────────────────────────────────────────────
  [`${K}/02-04-the-corridor-agent-on-cartpole#Read the tests first`]: {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  [`${K}/02-04-the-corridor-agent-on-cartpole#A wrapper`]: {
    wrong: [
      { name: 'does not keep the observation', edit: [['        self.obs, info = self.env.reset(seed=seed)\n        return state_index(self.obs, self.edges, self.counts), info', '        obs, info = self.env.reset(seed=seed)\n        return state_index(obs, self.edges, self.counts), info']], fails: [0] },
      { name: 'step returns the raw observation', edit: [['        return state_index(self.obs, self.edges, self.counts), reward, terminated, truncated, info', '        return self.obs, reward, terminated, truncated, info']], fails: [0] },
    ],
  },
  [`${K}/02-04-the-corridor-agent-on-cartpole#Your turn: a schedule`]: {
    files: { 'cartpole_table.py': answer(K, 'cartpole_table_linear.py') },
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'keeps going past the end', files: { 'cartpole_table.py': answerWith(K, 'cartpole_table_linear.py', [['min(progress, 1.0)', 'progress']]) }, fails: [0] },
      { name: 'runs from end to start', files: { 'cartpole_table.py': answerWith(K, 'cartpole_table_linear.py', [['start + (end - start) * min(progress, 1.0)', 'end + (start - end) * min(progress, 1.0)']]) }, fails: [0] },
    ],
  },
  [`${K}/02-04-the-corridor-agent-on-cartpole#Training`]: {
    wrong: [
      { name: 'never lowers epsilon', edit: [['        agent.epsilon = linear(1.0, 0.01, episode / (0.8 * episodes))\n', '']], fails: [0] },
      { name: 'cares only about the next step (gamma 0)', edit: [['gamma=0.99', 'gamma=0.0']], fails: [0] },
    ],
  },

  // ── 2.5 ──────────────────────────────────────────────────────────────────
  [`${K}/02-05-judging-an-agent-honestly#Read the tests first`]: {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  [`${K}/02-05-judging-an-agent-honestly#Greedy, and on new starts`]: {
    wrong: [
      { name: 'learns while being judged', edit: [['learn=False', 'learn=True']], fails: [0] },
      { name: 'keeps exploring while being judged', edit: [['    agent.epsilon = 0.0\n', '']], fails: [0] },
    ],
  },
  [`${K}/02-05-judging-an-agent-honestly#Your turn: how much to trust an average`]: {
    files: { 'judge.py': answer(K, 'judge.py') },
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'divides by n instead of its square root', files: { 'judge.py': answerWith(K, 'judge.py', [['values.std(ddof=1) / np.sqrt(len(values))', 'values.std(ddof=1) / len(values)']]) }, fails: [0] },
      { name: 'divides by n inside the deviation', files: { 'judge.py': answerWith(K, 'judge.py', [['values.std(ddof=1)', 'values.std()']]) }, fails: [0] },
    ],
  },
  [`${K}/02-05-judging-an-agent-honestly#Ten agents, three step sizes`]: {
    wrong: [{ name: 'judges only the first seed', edit: [['    for seed in range(seeds):', '    for seed in range(1):']], fails: [0, 1] }],
  },

  // ── 2.6 ──────────────────────────────────────────────────────────────────
  [`${K}/02-06-where-tables-break#Read the tests first`]: {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  [`${K}/02-06-where-tables-break#Your turn: count the rows it used`]: {
    files: { 'tables.py': answer(K, 'tables_visited.py') },
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'asks the question of each column', files: { 'tables.py': answerWith(K, 'tables_visited.py', [['Q.any(axis=1)', 'Q.any(axis=0)']]) }, fails: [0] },
      { name: 'counts values instead of rows', files: { 'tables.py': answerWith(K, 'tables_visited.py', [['np.count_nonzero(Q.any(axis=1))', 'np.count_nonzero(Q)']]) }, fails: [0] },
    ],
  },
  [`${K}/02-06-where-tables-break#Two ways to fail`]: {
    wrong: [{ name: 'calls every ending a fall', edit: [['counts["cart left the track" if abs(env.obs[0]) > 2.4 else "pole fell"] += 1', 'counts["pole fell"] += 1']], fails: [0, 1] }],
  },
};
