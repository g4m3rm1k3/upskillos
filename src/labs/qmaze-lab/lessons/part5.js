// Part 6: applying it. Build a world, check it, solve it, learn it; then run the same code on your
// own machine and on Gymnasium's worlds, and diagnose a learner that isn't learning.
export const PART5 = {
  id: 'part5', title: 'Part 6 · Apply it', lessons: [
    {
      id: 'build-a-map', number: '6.1', title: 'Build a world and solve it',
      goal: 'Design a grid world as an MDP, check it can be solved, compute its optimum, and train all three learners on it.',
      builds: ['comparing-methods', 'reward-design'],
      blocks: [
        { md: `Applying reinforcement learning to a new problem always follows the same steps. This lesson walks through them on a world you draw yourself.

1. **Define the MDP.** What is a state (and is it Markov, lesson 2.2)? What are the actions? What does each move pay, and when does an episode end? Write the rewards so they say what you want and nothing else (lesson 3.13).
2. **Check it.** Can the goal be reached at all? Are there endings, so episodes finish?
3. **If you have a model, solve it exactly.** Value iteration gives $V^*$ and the optimal policy: the yardstick for everything learned (lesson 2.5).
4. **Choose a learner.** Small and discrete: a table (Q-learning, or SARSA if exploring is dangerous). Too many states, or states with features (a picture, real numbers): a network (A2C, or DQN, Part 5).
5. **Train on several seeds**, and judge by greedy play, not the training curve (lesson 3.9).
6. **Diagnose** when it falls short (next lesson).` },
        { figure: 'MapBuilder', caption: 'Pick a cell type and click cells to paint. The map is checked and solved after every change; then train a learner on it. The Python dictionary below the map is your world, ready for `maps.py`.' },
        { note: 'Challenges. Each needs a map that makes a lesson\'s point:\n\n1. A map where **Q-learning and SARSA choose different routes** (hint: a short route past danger and a longer safe one, lesson 3.11).\n2. A map where **γ decides** between two rewards (move the γ slider and watch the arrows flip, lesson 1.5).\n3. A **slippery** map where the optimal route is longer than the shortest one (lesson 2.5).\n4. A map where Q-learning from zeros **settles for the wrong reward**, then fix it with initial Q = 1 (lesson 3.13).', kind: 'try' },
        { note: 'Applying RL: define the MDP carefully (especially rewards and the state), check it, compute the optimum when you can, pick the simplest learner that fits, train on several seeds and judge greedily.' },
      ],
    },

    {
      id: 'on-your-machine', number: '6.2', title: 'On your own machine, on Gymnasium, and when it doesn\'t learn',
      goal: 'Run the lab\'s programs on your own computer, train them on Gymnasium\'s real FrozenLake and CliffWalking, and diagnose a learner from its symptoms.',
      builds: ['build-a-map', 'gymnasium'],
      blocks: [
        { md: `Everything in this lab is ordinary Python. Use **Download all the lab's Python files** in lesson 6.1 (or copy them from the Python tab), unzip, and in that folder:

\`\`\`text
python -m venv .venv
.venv/bin/python -m pip install numpy torch gymnasium        (Windows: .venv\\Scripts\\python)
.venv/bin/python -c "from experiments import learn_q; Q, totals = learn_q('qmaze'); print(Q.round(2))"
\`\`\`

A **virtual environment** (\`venv\`) is a private folder of Python packages for one project, so this project's NumPy and PyTorch can't clash with anything else on your machine.` },
        { h: 'Your learners on Gymnasium\'s worlds' },
        { md: `\`train_q_learning\` and \`train_sarsa\` need an environment with \`n_states\`, \`n_actions\`, \`reset\` and \`step\`, using this lab's action numbers. Gymnasium's worlds have everything except those two attributes and the numbering, so a small **adapter** class fills the gap:` },
        {
          code: {
            file: 'gym_adapter.py', fn: '__init__', notes: [
              ['self.env = env', ['The Gymnasium environment being wrapped.']],
              ['self.n_states = env.observation_space.n', ['Gymnasium describes the possible states with a **space**; for grid worlds a `Discrete(n)` space whose `.n` is the number of states.']],
              ['self.n_actions = env.action_space.n', ['The same for actions: 4.']],
              ['self.action_map = action_map', ['Our action number → Gymnasium\'s (lesson 2.6).']],
            ],
          },
        },
        {
          code: {
            file: 'gym_adapter.py', fn: 'step', notes: [
              ['state, reward, terminated, truncated, info = self.env.step(self.action_map[action])', ['Translate the action, then let Gymnasium make the move.']],
              ['return int(state), float(reward), terminated, truncated, info', ['Gymnasium returns NumPy number types; `int` and `float` turn them into plain Python numbers, which index the Q-table and add up exactly like this lab\'s.']],
            ],
          },
        },
        {
          code: {
            file: 'gym_adapter.py', from: 16, to: 30, notes: [
              ['def reset(self, seed=None)', ['The same signature as `GridWorld.reset`.']],
              ['state, info = self.env.reset(seed=seed)', ['Gymnasium\'s own reset.']],
              ['return int(state), info', ['A plain int state, as the Q-table indexing expects.']],
              ['def frozen_lake(map_name="4x4")', ['Ready-made adapters for the two worlds this lab copies.']],
              ['return GymGrid(gym.make("FrozenLake-v1", map_name=map_name, is_slippery=True), FROZEN_LAKE_ACTION)', ['The slippery lake, with FrozenLake\'s action numbering.']],
              ['return GymGrid(gym.make("CliffWalking-v1"), CLIFF_ACTION)', ['The cliff, with CliffWalking\'s.']],
            ],
          },
        },
        { md: `Then, unchanged:

\`\`\`python
from gym_adapter import frozen_lake, cliff_walking
from qlearning import train_q_learning
from sarsa import train_sarsa

Q, totals = train_q_learning(frozen_lake(), episodes=3000, alpha=0.1, gamma=0.99)
Q, totals = train_sarsa(cliff_walking(), episodes=500, alpha=0.5, gamma=1.0, epsilon_start=0.1, epsilon_end=0.1)
\`\`\`

Run with this lab's settings and seed 0, the Q-learning table succeeds on Gymnasium's own FrozenLake **74.3%** of the time over 1,000 greedy episodes, and on CliffWalking the greedy routes return **−13** (Q-learning) and **−17** (SARSA): exactly what lessons 3.11 and 3.12 found on the lab's copies. The code you understand line by line works on the standard library.` },
        { h: 'When it doesn\'t learn' },
        { md: `| Symptom | Likely cause | What to try |
|---|---|---|
| Never reaches the goal; curve flat | The reward is too rare for random exploring to find | More episodes; a step cost; optimistic initial values; check the goal is reachable (5.1) |
| Settles for a worse ending | Stopped exploring too soon (local optimum) | Longer ε schedule; optimistic initial Q (3.13) |
| Values jump about and never settle | α too large for a noisy world; or the reward isn't Markov | Smaller α; check the state contains everything the reward depends on (2.2, 3.12) |
| Learns slowly from far away | γ too small, so distant rewards vanish | γ closer to 1 (1.5, 3.9) |
| Fine while training, worse greedily (or the reverse) | The exploring and greedy policies differ, e.g. near danger | Compare with SARSA; judge the right one for how it will be used (3.11) |
| A2C becomes certain of a bad move early | Learning rate too high, entropy too low | Lower lr; raise \`entropy_coef\` (4.5, 4.6) |
| Results differ wildly between runs | Normal for RL | Always run several seeds and report the spread |

Most problems are found by looking at the right picture: the values and arrows on the map, the learning curve, and the greedy evaluation. Those are exactly the views this lab gives you.` },
        { note: 'The lab\'s programs run as they are on your machine and, through a ten-line adapter, on Gymnasium. When learning fails, read the symptoms: exploration, step size, discount, reward design, or the state itself.' },
      ],
    },
  ],
}
