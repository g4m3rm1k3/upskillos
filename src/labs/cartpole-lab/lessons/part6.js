// Part 6: DQN and beyond. Q-learning with a network and why it is unstable, the replay buffer, the
// target network and the DQN loop, every method compared, and changing the world.
import { CartPole } from '../engine/cartpole.js'
import { RULES } from '../engine/policies.js'
import { PyRandom } from '../../qmaze-lab/engine/mt.js'

const ruleIn = physics => { const out = []; for (let seed = 0; seed < 50; seed++) { const env = new CartPole(physics), rng = new PyRandom(seed); let [st] = env.reset(seed), r, n = 0; do { r = env.step(RULES.lean_ahead.run(st, rng)); st = r[0]; n++ } while (!r[2] && !r[3]); out.push(n) } return out.reduce((a, b) => a + b, 0) / out.length }

export const PART6 = {
  id: 'part6', title: 'Part 6 · DQN and beyond', lessons: [
    {
      id: 'dqn-network', number: '6.1', title: 'Q-learning with a network',
      goal: 'Replace the Q-table with a network that outputs a row of Q-values, write Q-learning as a loss, and name the two things that make it unstable.',
      builds: ['a2c-update', 'td-target'],
      blocks: [
        { md: `Part 3's table had one row per slot combination and couldn't generalise. Part 4 replaced tables by functions, for the **policy**. Now do it for **values**: a network that takes the four real numbers and outputs a whole row of the Q-table,

$$\\mathbf s \\;\\mapsto\\; \\big(Q(s, \\text{left}),\\ Q(s, \\text{right})\\big)$$

computed instead of looked up. No slots, nothing lost to aliasing (lesson 2.3), and what is learned about one state carries over to nearby ones.

Q-learning becomes regression: make the network's $Q(s, a)$ close to the target $y = r + \\gamma \\max_{a'} Q(s', a')$, by gradient descent on the squared TD error,

$$L(\\theta) = \\big(Q_\\theta(s, a) - y\\big)^2$$

where $\\theta$ stands for all the network's weights. The target is treated as a fixed number (no gradient through it): a **semi-gradient**. This is **DQN**, the Deep Q-Network that learned to play Atari games from pixels (Mnih et al., 2015).` },
        {
          code: {
            file: 'dqn.py', fn: 'QNet.__init__', notes: [
              ['super().__init__()', ['`nn.Module`\'s setup.']],
              ['self.layers = nn.Sequential(nn.Linear(4, hidden), nn.ReLU()', ['4 → 64 → 64 → 2, two hidden layers. **ReLU** ("rectified linear unit") is $\\max(0, x)$: negatives become 0. It is the most common squashing function in modern networks; tanh would work too. The last layer has no squashing: Q-values can be any size (here up to about 100).'], { tex: '\\text{ReLU}(x) = \\max(0, x)' }],
            ],
          },
        },
        {
          code: {
            file: 'dqn.py', fn: 'QNet.forward', notes: [
              ['return self.layers(states)', ['States in, rows of Q-values out: shape (batch, 2).']],
            ],
          },
        },
        { md: `Done naively (update after every move, on that move alone), this famously **diverges**: the values blow up or oscillate. Two reasons:

1. **Correlated data.** Consecutive moves are nearly the same situation. Gradient descent on 64 almost identical examples drags the whole network towards that one corner of the state space and forgets the rest. (Tables didn't have this problem: an update only changes its own row.)
2. **A moving target.** The target $r + \\gamma\\max Q_\\theta(s')$ uses the same weights being trained. Every step changes the target it is chasing, and errors can feed on themselves.

DQN's two fixes are the next two lessons: a **replay buffer** for the first, a **target network** for the second.` },
        {
          choice: {
            prompt: 'Why didn\'t Part 3\'s table suffer from correlated data the way a network does?',
            options: [
              { text: 'A table update changes only one entry, so learning about one corner can\'t disturb another; a network\'s weights are shared by all states', why: 'Yes. Sharing is what makes networks generalise, and also what lets a burst of similar updates disturb everything.' },
              { text: 'Tables use ε-greedy', why: 'DQN does too. The difference is in what one update can change.' },
              { text: 'Tables don\'t use gradient descent', why: 'True, but the point is locality: one update, one entry.' },
              { text: 'CartPole\'s binned states are never correlated', why: 'Consecutive binned states are just as correlated; it doesn\'t matter for a table.' },
            ],
            answer: 0,
          },
        },
        { note: '**DQN**: a network outputs $Q(s, \\cdot)$ from the real state; train it by regression to $r + \\gamma\\max Q(s\')$. Naively it is unstable: consecutive moves are **correlated**, and the target **moves** with the weights.' },
      ],
    },

    {
      id: 'replay', number: '6.2', title: 'The replay buffer',
      goal: 'Store moves in a fixed-size memory with `deque`, sample a random batch, and turn it into tensors with `zip(*batch)`.',
      builds: ['dqn-network'],
      blocks: [
        { md: `Keep the last 50,000 moves in a **replay buffer**. Each learning step draws 64 of them **at random**: they come from many different games and moments, so they are nearly independent, and each move gets learned from several times, not once. (It works only because Q-learning is off-policy, lesson 3.6: old moves made by an older, more exploring policy are still valid data for the greedy policy's values.)` },
        { figure: 'ReplayFig', caption: 'The last 64 moves against 64 drawn from memory, as points of (angle, spin).' },
        {
          code: {
            file: 'dqn.py', from: 25, to: 39, notes: [
              ['self.memory = deque(maxlen=capacity)', ['A `deque` ("deck", double-ended queue) from the `collections` module: like a list, but with `maxlen` it forgets its oldest item automatically when full. Exactly a "last 50,000 moves" memory.']],
              ['self.rng = rng', ['Random numbers for drawing samples.']],
              ['self.memory.append((state, action, reward, next_state, terminated))', ['One move, as a tuple of five. Only `terminated` is stored, not `truncated`: a move at step 500 keeps its future, as in lesson 3.3.']],
              ['batch = self.rng.sample(self.memory, n)', ['`random.sample(population, n)`: n different items, chosen at random.']],
              ['states, actions, rewards, next_states, ends = zip(*batch)', ['**Transposing** with `zip(*…)`: `batch` is 64 tuples of 5; `*batch` passes them as 64 arguments to `zip`, which groups the first items together, the second items together, …: 5 tuples of 64.'], { tex: '[(s, a, r, s\', d)]_{64} \\;\\to\\; (s_{1..64}),\\ (a_{1..64}),\\ \\dots' }],
              ['return (torch.tensor(states), torch.tensor(actions), torch.tensor(rewards),', ['Five tensors: states (64, 4), actions (64,) of ints, rewards (64,), next states (64, 4)…']],
              ['return len(self.memory)', ['`__len__` is what Python calls for `len(buffer)`: a **special method** (also called a dunder method, for its double underscores).']],
            ],
          },
        },
        {
          choice: {
            prompt: '`batch = [((1, 2), 0, 1.0), ((3, 4), 1, 1.0)]` (two moves of three items). What is `list(zip(*batch))`?',
            options: [
              { text: '`[((1, 2), (3, 4)), (0, 1), (1.0, 1.0)]`', why: 'Yes: the states together, the actions together, the rewards together.' },
              { text: '`[((1, 2), 0, 1.0), ((3, 4), 1, 1.0)]`', why: 'That is the batch unchanged. `zip(*…)` regroups by position.' },
              { text: '`[(1, 3), (2, 4)]`', why: 'zip pairs the items of the tuples it is given, here the three items of each move, not the numbers inside a state.' },
              { text: 'An error: zip needs lists', why: 'zip takes any number of iterables, tuples included.' },
            ],
            answer: 0,
          },
        },
        { note: 'A **replay buffer** (`deque(maxlen=…)`) keeps the latest moves; learning draws random batches from it, which breaks the correlation between consecutive moves and reuses each move many times. `zip(*batch)` turns a list of moves into one tuple per field.' },
      ],
    },

    {
      id: 'dqn-loop', number: '6.3', title: 'The target network and the DQN loop',
      goal: 'Read `train_dqn` line by line: ε-greedy acting from the network, storing moves, learning from batches against a frozen target network, and syncing it.',
      builds: ['replay'],
      blocks: [
        { md: `The second fix: compute targets with a **copy** of the network, $Q_{\\bar\\theta}$, whose weights are frozen and only refreshed (copied from the learning network) every 1,000 moves:

$$y = r + \\gamma\\,(1 - d)\\,\\max_{a'} Q_{\\bar\\theta}(s', a') \\qquad L = \\frac1{64}\\sum \\big(Q_\\theta(s, a) - y\\big)^2$$

($d$ is 1 if the move terminated the game, else 0: multiplying by $1 - d$ drops the future exactly when the pole fell, the same rule as lesson 3.3 written as arithmetic.) For 1,000 moves the target stands still and the network can actually reach it; then the target jumps to the improved values.` },
        {
          code: {
            file: 'dqn.py', fn: 'train_dqn', notes: [
              ['def train_dqn(steps=50000', ['50,000 moves; every setting a keyword with a default.']],
              ['torch.manual_seed(seed)', ['Repeatable starting weights.']],
              ['rng = random.Random(seed)', ['Repeatable exploring and sampling.']],
              ['env = CartPole()', ['One world (DQN doesn\'t need 8: the buffer supplies variety).']],
              ['net = QNet()', ['The learning network, $Q_\\theta$.']],
              ['target_net = QNet()', ['A second network of the same shape, $Q_{\\bar\\theta}$…']],
              ['target_net.load_state_dict(net.state_dict())', ['…made an exact copy: `state_dict()` is a dictionary of every weight; `load_state_dict` copies them in.']],
              ['optimizer = torch.optim.Adam(net.parameters(), lr=lr)', ['Adam trains only `net`. The target network is never trained, only copied.']],
              ['buffer = ReplayBuffer(buffer_size, rng)', ['An empty memory of 50,000.']],
              ['state, info = env.reset(seed=seed)', ['Start the first game.']],
              ['lengths = []', ['Every finished game\'s length.']],
              ['for step in range(steps):', ['One move per trip: DQN counts moves, not games.']],
              ['epsilon = linear(epsilon_start, epsilon_end, step / explore_steps)', ['ε falls from 1.0 to 0.05 over the first 15,000 moves.'], { calc: x => [`linear(${x.epsilon_start}, ${x.epsilon_end}, ${x.step} / ${x.explore_steps})`, x.epsilon_start + (x.epsilon_end - x.epsilon_start) * Math.min(x.step / x.explore_steps, 1)] }],
              ['if rng.random() < epsilon:', ['Explore?'], { logic: 'With probability ε, push at random; otherwise push the way the network currently values more.' }],
              ['action = rng.randrange(2)', ['A random push.']],
              ['with torch.no_grad():', ['Choosing needs no gradients.']],
              ['action = int(net(torch.tensor(state)).argmax())', ['The greedy push: the index of the larger of the network\'s two Q-values. `argmax` is lesson 3.1\'s greedy choice, on a computed row.']],
              ['next_state, reward, terminated, truncated, info = env.step(action)', ['Act.']],
              ['buffer.add(state, action, reward, next_state, terminated)', ['Remember the move.']],
              ['state = next_state', ['Move on.']],
              ['if terminated or truncated:', ['Game over?']],
              ['lengths.append(env.steps)', ['Record it…']],
              ['state, info = env.reset()', ['…and start the next.']],
              ['if len(buffer) >= start_learning:', ['Wait for 1,000 moves of mostly random play before learning, so the first batches aren\'t all from one game.'], { logic: 'Learn only once at least 1,000 moves are remembered.' }],
              ['states, actions, rewards, next_states, ends = buffer.sample(batch_size)', ['64 random remembered moves, as tensors.']],
              ['q = net(states)[torch.arange(batch_size), actions]', ['`net(states)` is 64 rows of 2 values. Indexing with two tensors, `[rows, columns]`, picks one value per row: row `i`, column `actions[i]`. So `q[i]` is $Q_\\theta(s_i, a_i)$ for the push actually made: the table\'s `Q[state, action]`, 64 at once.'], { tex: 'q_i = Q_\\theta(s_i, a_i)' }],
              ['with torch.no_grad():', ['The target is a fixed number: no gradients.']],
              ['best_next = target_net(next_states).max(dim=1).values', ['The **target network\'s** best value in each next state: `max(dim=1)` takes the max across each row (dimension 1, the actions); `.values` keeps the maxima (it also returns their positions).'], { tex: '\\max_{a\'} Q_{\\bar\\theta}(s\'_i, a\')' }],
              ['targets = rewards + gamma * (1 - ends) * best_next', ['$y_i = r_i + \\gamma(1 - d_i)\\max Q_{\\bar\\theta}(s\'_i)$: where the game ended, `1 - ends` is 0 and the future drops out.'], { tex: 'y_i = r_i + \\gamma(1 - d_i)\\max_{a\'} Q_{\\bar\\theta}(s\'_i, a\')' }],
              ['loss = ((q - targets) ** 2).mean()', ['The mean squared TD error.'], { tex: 'L = \\frac1{64}\\sum_i (q_i - y_i)^2' }],
              ['optimizer.zero_grad()', ['Clear.']],
              ['loss.backward()', ['Gradients, through `net` only.']],
              ['optimizer.step()', ['One Adam step: every move after the first 1,000 makes one update.']],
              ['if step % sync_every == 0:', ['`%` is the remainder: true every 1,000th move.'], { logic: 'Every 1,000 moves, refresh the target network.' }],
              ['target_net.load_state_dict(net.state_dict())', ['Copy the learning network into the target network: the targets jump to the improved values.']],
              ['return net, lengths', ['The network and the curve.']],
            ],
          },
        },
        { figure: 'Measured', props: { method: 'dqn', window: 20 }, caption: 'Measured in Python: DQN, three seeds, 50,000 moves each.' },
        { md: `DQN is the least steady method in this lab. Measured while choosing its settings (seed 0): with a 10,000-move buffer the games climbed to about 290 and then **collapsed** back to about 120: once the buffer held only good, long games, the network forgot what failure looks like and its values drifted. With the same settings but a 50,000-move buffer (so the early failures stay in memory), the run kept improving instead: its last eighth of games averaged 403, and greedy play afterwards 293. Across three seeds (the chart above) greedy play scores 293, 397 and 157: still the least steady method here. Stabilising DQN is a whole research topic (Double DQN, prioritised replay, Huber loss, …); CartPole is small enough to see the problem with your own eyes.` },
        { python: { program: 'dqn', label: 'Step through DQN in real Python' } },
        { note: 'DQN = Q-learning + a network + **replay** (random batches from memory) + a **target network** (frozen copy, synced every 1,000 moves). Target $y = r + \\gamma(1 - d)\\max Q_{\\bar\\theta}(s\')$, loss $(Q_\\theta(s,a) - y)^2$.' },
      ],
    },

    {
      id: 'compare-all', number: '6.4', title: 'Six methods, one family',
      goal: 'Place every method in this lab by what it learns, when it updates and what number drives the update, and compare them on measured results.',
      builds: ['dqn-loop', 'reading-the-table'],
      blocks: [
        { md: `Every method in this lab is the agent–environment loop of lesson 1.3 plus a rule for learning. They differ in three choices:

1. **What is learned**: values (a table, or a Q-network) and acting greedily on them; or a policy directly; or both (actor and critic).
2. **When it updates**: after every move, after every game, or after a batch of moves.
3. **What number drives the update**: for value methods, the **target**; for policy methods, the number that multiplies $\\nabla\\log\\pi$.

And every one of those numbers is built from lesson 1.5's $G_t = R_{t+1} + \\gamma G_{t+1}$: either the real rewards all the way (REINFORCE), or a few real rewards and then an estimate (Q-learning, SARSA, A2C, DQN). That trade, **real rewards (unbiased, noisy) against estimates (biased, steady)**, is the central dial of reinforcement learning.` },
        { figure: 'CompareAll', caption: 'Press the button to train the browser methods; the PyTorch rows were measured in Python.' },
        { md: `Reading the table:

- **Tables** learn fast in moves and are trivially cheap, but only see slots, and depend on luck (lesson 3.5).
- **Linear REINFORCE**, 8 numbers, learns a readable rule ("lean ahead"); a policy gradient's updates are noisy, so it improves steadily rather than quickly.
- **REINFORCE with a network** reaches 500 within 300 games, but every update waits for a game to end.
- **A2C** uses a critic to update every 40 moves with less noise: the most reliable here, 500 on every seed.
- **DQN** is the most sample-efficient on paper (every move is reused), and the least steady (lesson 6.3).

For CartPole, any of them works, and so does one line of physics. What carries over to harder problems is the machinery: the loop, returns, bootstrapped targets, policy gradients, critics, replay, and the habit of checking several seeds.` },
        {
          choice: {
            prompt: 'Which pair of methods uses the most and the least real reward in its learning signal?',
            options: [
              { text: 'REINFORCE uses the whole game\'s rewards ($G_t$); Q-learning uses one reward and then an estimate', why: 'Yes. A2C sits between: 5 rewards, then the critic.' },
              { text: 'DQN the most, A2C the least', why: 'DQN\'s target is one reward plus an estimate, like Q-learning\'s.' },
              { text: 'They all use the same amount', why: 'The number of real rewards before bootstrapping is exactly what differs: 1, 5 or all of them.' },
              { text: 'SARSA the most, because it waits for the next action', why: 'It waits for one more action, not more rewards: still one reward plus an estimate.' },
            ],
            answer: 0,
          },
        },
        { note: 'One family: the loop + a learning rule. Value methods regress towards targets; policy methods step along $A\\,\\nabla\\log\\pi$. Every signal is $G_t = R_{t+1} + \\gamma G_{t+1}$ cut off somewhere and finished with an estimate: real rewards for less bias, estimates for less noise.' },
      ],
    },

    {
      id: 'your-cartpole', number: '6.5', title: 'Your own CartPole, and when it doesn\'t learn',
      goal: 'Change the world\'s physics, retrain a learner, run any of this on your own machine and on Gymnasium, and debug a learner that doesn\'t learn.',
      builds: ['compare-all'],
      blocks: [
        { h: 'Change the world' },
        { md: `\`CartPole\` takes its physics as keyword arguments, and \`BinnedCartPole\` passes extras on (\`**physics\`, lesson 2.2):

\`\`\`python
heavy = CartPole(pole_mass=0.5)               # a heavier pole
long = BinnedCartPole(half_length=1.0)        # a 2 m pole, seen through slots
Q, totals = train_q_learning(long, episodes=500)
\`\`\`

A longer pole falls more slowly (try it: balancing a broom is easier than a pencil), a weaker push makes catching it harder. The hand rule was tuned for one world; a learner adapts.` },
        { figure: 'WorldChanger', caption: 'Change the physics: the hand rule may stop working; train linear REINFORCE in the new world and read the rule it learns instead.' },
        {
          predict: {
            prompt: 'With a weak push of 3 N (instead of 10), how many steps does "lean ahead" average over 50 games? (1 decimal)',
            answer: ruleIn({ force: 3 }), tolerance: 0.05, compute: () => ruleIn({ force: 3 }),
            explain: 'Set the force to 3 in the figure. The rule was tuned for 10 N; with a weaker push it reacts the same way but can\'t catch the pole as fast.',
          },
        },
        { h: 'On your own machine' },
        { md: `Every program is in \`src/labs/cartpole-lab/python/\`, plain files with no lab code in them. With Python 3, NumPy, PyTorch and Gymnasium (\`pip install numpy torch gymnasium\`), from that folder:

\`\`\`python
from experiments import learn_q
Q, totals, greedy = learn_q(episodes=500, seed=0)
print(sum(greedy) / len(greedy))

from a2c import train_a2c, play_greedy
net, lengths = train_a2c(updates=5000)
print(play_greedy(net))
\`\`\`

To use **Gymnasium's** CartPole instead of the lab's, change the world line, for example in \`train_reinforce\`: \`env = gym.make("CartPole-v1")\` (Gymnasium's states are NumPy arrays; \`torch.tensor(state)\` accepts them). Lesson 1.6 showed the two are the same world, number for number. Any other Gymnasium world with a small state and discrete actions (\`Acrobot-v1\`, \`MountainCar-v0\`) works the same way once the 4 in the networks' first layer and the 2 in the last are changed to that world's sizes.` },
        { h: 'When it doesn\'t learn' },
        { md: `A checklist, in the order that finds most bugs fastest:

1. **Check the loop by hand.** Step through one game in the Python tab: does the state change? Do \`terminated\` and \`truncated\` come out when they should?
2. **Terminated vs truncated.** Is the future dropped only when the pole fell (lessons 3.3, 5.3, 6.3)? Treating the 500-step limit as failure teaches the agent to fear success.
3. **Compare with a baseline.** Random pushes average about 22 steps; a learner stuck there isn't learning at all. Is the reward really reaching the update?
4. **Look at the numbers.** Q-values should approach at most $1/(1-\\gamma) = 100$ (lesson 3.4). Far above: the target is wrong. Probabilities stuck at exactly 0.5: the policy isn't being updated.
5. **Check the gradient** on a tiny batch against a hand formula (lesson 5.5), or with a finite difference: nudge one weight by $10^{-4}$ and see whether the loss changes by gradient × $10^{-4}$.
6. **Learning rate.** Too big: the curve rises and collapses (lessons 4.1, 6.3). Too small: nothing for a long time. Change it by factors of 3, not 10%.
7. **Several seeds.** Before believing a change helped, run three seeds (lesson 3.5).
8. **Look at how games end.** "Cart off the track" and "pole fell" are different problems (lessons 3.5, 3.8).` },
        {
          choice: {
            prompt: 'A new learner\'s games stay around 20 steps after 1,000 games, and its probabilities are all exactly 0.5. What do you check first?',
            options: [
              { text: 'Whether the update is reaching the weights at all: zero_grad/backward/step in the right order, the loss connected to the network, the rate not 0', why: 'Yes. Exactly 0.5 everywhere means the weights never moved: random play averages about 22, which matches. It is a plumbing bug, not a tuning problem.' },
              { text: 'Increase γ', why: 'A bad γ makes learning worse, not absent. Unchanged probabilities point to the update itself.' },
              { text: 'Train for 10,000 games', why: 'If the weights never change, more games change nothing.' },
              { text: 'Use finer slots', why: 'There are no slots in a policy network; and the symptom says nothing is being learned at all.' },
            ],
            answer: 0,
          },
        },
        { note: 'Change the world with keyword arguments; the learners don\'t care. Swap in Gymnasium by changing one line. When learning fails: walk through the loop, check terminated vs truncated, compare with random, look at the numbers, check gradients, tune the rate by factors, use several seeds, and look at how games end.' },
      ],
    },
  ],
}
