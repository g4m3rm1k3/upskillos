// Part 5: deep Q-learning. The maze as a picture and a Q-network that reads it, the replay memory and
// the target network, and every line of dqn.py with what it learns. The browser's DQN
// (engine/dqn.js) is checked against real PyTorch runs (dqn-parity.test.js).
import { GridWorld } from '../engine/gridworld.js'

const inputs = map => 2 * new GridWorld(map).nStates

export const PART_DQN = {
  id: 'deep-q', title: 'Part 5 · Deep Q-learning: a network that sees the maze', lessons: [
    {
      id: 'q-network', number: '5.1', title: 'A Q-network that sees the maze',
      goal: 'Explain why a table can\'t hold Classic QMaze\'s real state, turn the maze into a picture of numbers, and read the network that maps it to four Q values.',
      builds: ['comparing-methods', 'markov-property', 'q-learning'],
      blocks: [
        { md: `Lesson 2.2 found a flaw in Classic QMaze: stepping onto a cell you've **already visited** costs −0.25 instead of −0.04. The reward depends on the history, so the cell number alone is not a Markov state. The true state is "where the rat is **and** which cells it has visited", and a Q-table would need a row for every combination: with 100 cells, about $2^{100}$ rows. No table can hold that.

The original QMaze tutorial, which gave this lab its name, solved it by showing a **neural network a picture of the maze**, with the visited cells marked, and asking it for the four Q values. That is **deep Q-learning** (a **DQN**, deep Q-network; Mnih et al., 2013 and 2015, who used it to learn Atari games from the screen). The network doesn't store a row per state: it **computes** one from whatever it is shown, so states it has never seen get sensible values if they look like ones it has.` },
        { h: 'The picture' },
        { md: `This lab's picture is two layers of numbers, each with one number per cell, laid end to end:

1. **Visited**: 1 where the rat has been this game, 0 elsewhere.
2. **The rat**: 1 in the cell it is in now, 0 elsewhere.

The walls aren't in it: within one maze they never change, so they would tell the network nothing it can't learn from bumping into them, exactly as the table did.` },
        {
          code: {
            file: 'dqn.py', fn: 'picture', notes: [
              ['visited = [1.0 if marks and s in env.visited else 0.0 for s in range(env.n_states)]', ['One number per cell: 1.0 if the rat has visited it this game. `env.visited` is the set the world keeps for the revisit penalty (lesson 2.2). With `marks=False` this layer is all zeros: the experiment in lesson 5.3.']],
              ['here = [1.0 if s == env.state else 0.0 for s in range(env.n_states)]', ['One number per cell: 1.0 only where the rat is. On its own this layer is the one-hot state of lesson 4.1.']],
              ['return visited + here', ['`+` on two lists joins them: one list of `2 × n_states` numbers.']],
            ],
          },
        },
        { figure: 'PictureView', props: { map: 'qmaze' }, caption: 'Move the rat and watch the two layers change. The network on the right is untrained; what matters is the shape of the calculation: 200 numbers in, four out.' },
        {
          predict: {
            prompt: 'Classic QMaze is 10 × 10 cells. How many numbers does the network receive?',
            answer: 200, tolerance: 0, compute: () => inputs('qmaze'),
            explain: '100 cells × 2 layers = 200. Cheese and cat (4 × 4) gives 32.',
          },
        },
        { h: 'The network' },
        { md: `The Q-network is two layers, like lesson 4.6's network with a hidden layer, but with ReLU in place of tanh:

$$\\mathbf h = \\text{ReLU}(W_1 \\mathbf x + \\mathbf b_1), \\qquad \\big(Q(s, \\leftarrow),\\ Q(s, \\uparrow),\\ Q(s, \\rightarrow),\\ Q(s, \\downarrow)\\big) = W_2 \\mathbf h + \\mathbf b_2$$

$\\mathbf x$ is the picture (200 numbers), $\\mathbf h$ is 64 hidden numbers, and the output is a **row of the Q-table**, computed instead of looked up. ReLU (rectified linear unit) is $\\max(0, z)$: it switches a hidden unit off when its sum is negative, which is what lets the network combine features ("near the cheese" **and** "came this way already") instead of just adding them.` },
        {
          code: {
            file: 'dqn.py', from: 34, to: 44, notes: [
              ['def __init__(self, n_inputs, hidden=64, rng=None)', ['`n_inputs` is the picture\'s length; `rng`, if given, draws the starting weights (below).']],
              ['super().__init__()', ['Lets PyTorch\'s `nn.Module` set itself up: from now on it tracks every weight inside this object.']],
              ['self.layers = nn.Sequential(nn.Linear(n_inputs, hidden), nn.ReLU(), nn.Linear(hidden, 4)).double()', ['`nn.Sequential` runs its parts in order: $W_1\\mathbf x + \\mathbf b_1$, then ReLU, then $W_2\\mathbf h + \\mathbf b_2$. `.double()` makes every weight a 64-bit float. PyTorch normally uses 32-bit floats (faster, and accurate enough); 64 bits here lets the browser\'s copy of this program agree with PyTorch to the last few digits.']],
              ['if rng is not None', ['Only the network being trained gets weights drawn from `rng`; the target network (lesson 5.2) copies them instead.']],
              ['init_weights(self.layers, rng)', ['Replace PyTorch\'s random starting weights with ones drawn from Python\'s `random` (below).']],
              ['return self.layers(pictures)', ['`net(pictures)` calls this. Given one picture (200 numbers) it returns 4; given a batch (32 × 200) it returns 32 × 4, all at once.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'With 200 inputs, 64 hidden units and 4 outputs, how many weights and biases does the network have in all?',
            answer: 200 * 64 + 64 + 64 * 4 + 4, tolerance: 0, compute: () => inputs('qmaze') * 64 + 64 + 64 * 4 + 4,
            explain: '$W_1$ is 64 × 200 = 12,800, $\\mathbf b_1$ is 64, $W_2$ is 4 × 64 = 256, $\\mathbf b_2$ is 4: **13,124** numbers, against 400 in Classic QMaze\'s Q-table. They cover every picture, not just 100.',
          },
        },
        { md: `Where do the starting weights come from? \`nn.Linear\` starts its weights uniformly at random between $-1/\\sqrt{\\text{inputs}}$ and $+1/\\sqrt{\\text{inputs}}$, so that each hidden unit's sum starts at a sensible size whatever the number of inputs. \`init_weights\` uses that same rule, but draws the numbers from Python's \`random\`, which the browser can reproduce exactly:` },
        {
          code: {
            file: 'dqn.py', fn: 'init_weights', notes: [
              ['with torch.no_grad()', ['Changing weights by hand is not part of any calculation to differentiate: tell autograd not to record it.']],
              ['for layer in layers', ['Every part of the `nn.Sequential`: Linear, ReLU, Linear.']],
              ['if isinstance(layer, nn.Linear)', ['Only the Linear layers have weights; ReLU has none.']],
              ['bound = 1 / math.sqrt(layer.in_features)', ['$1/\\sqrt{\\text{inputs}}$: $1/\\sqrt{200} \\approx 0.071$ for the first layer, $1/8$ for the second.']],
              ['rows, cols = layer.weight.shape', ['A Linear layer stores $W$ as (outputs × inputs): 64 × 200 for the first.']],
              ['weights = [[rng.uniform(-bound, bound) for _ in range(cols)] for _ in range(rows)]', ['A list of lists, row by row. `rng.uniform(a, b)` is `a + (b - a) * rng.random()`.']],
              ['layer.weight.copy_(torch.tensor(weights, dtype=torch.float64))', ['Copy them into the layer. A method ending in `_` changes its tensor in place.']],
              ['biases = [rng.uniform(-bound, bound) for _ in range(rows)]', ['One bias per output, by the same rule.']],
              ['layer.bias.copy_(torch.tensor(biases, dtype=torch.float64))', ['Into the layer.']],
            ],
          },
        },
        { note: '**Deep Q-learning** replaces the Q-table with a network that computes a row of it from a picture of the state. Classic QMaze\'s picture marks the visited cells as well as the rat, which makes it a Markov state no table could hold: $2^{100}$ histories, 13,124 weights.' },
      ],
    },

    {
      id: 'replay-and-target', number: '5.2', title: 'Replay memory and a target network',
      goal: 'Write the DQN loss as a squared TD error, and explain the two things that keep it stable: learning from a random replay of old moves, and a target network that holds still.',
      builds: ['q-network'],
      blocks: [
        { md: `How does a network learn Q? The same way the table did (lesson 3.8): after a move from $s$ with action $a$, reward $r$, into $s'$, the Q-learning target is

$$y = r + \\gamma \\max_{a'} Q(s', a') \\qquad (\\text{just } r \\text{ if the move ended the game})$$

The table moved one entry towards $y$. A network has no entry to move; instead, it changes its weights to make the **squared error** smaller, by gradient descent, exactly as A2C's critic did (lesson 4.4):

$$L = \\big(Q(s, a) - y\\big)^2$$

Only $Q(s, a)$ is pushed: $y$ is treated as a fixed number, computed without gradients. Two problems appear as soon as you try this one move at a time, and DQN's two ideas fix them.` },
        { h: 'Problem 1: consecutive moves are almost the same' },
        { md: `Moves in a row come from neighbouring cells with nearly identical pictures. Learning from them in order is like studying one page of a textbook a hundred times, then the next: the network keeps adjusting to the last few cells and forgets the rest.

**Replay memory**: keep the last 10,000 moves, and for each update learn from **32 drawn at random**. A batch then mixes moves from all over the maze and from many games, and every move gets reused many times instead of once.` },
        {
          code: {
            file: 'dqn.py', from: 47, to: 66, notes: [
              ['self.memory = deque(maxlen=capacity)', ['A **deque** (double-ended queue) with a maximum length: when it is full, adding a move drops the oldest. The memory always holds the most recent `capacity` moves.']],
              ['self.rng = rng', ['The random numbers for drawing batches: the same generator as the agent\'s, so the whole run is repeatable.']],
              ['self.memory.append((seen, action, reward, next_seen, terminated))', ['One move, as a tuple: the picture before, the move, the reward, the picture after, and whether the game ended.']],
              ['batch = [self.memory[self.rng.randrange(len(self.memory))] for _ in range(n)]', ['$n$ moves, each picked uniformly at random. The same move can come up twice in one batch (sampling **with replacement**); with 10,000 to choose from, that is rare and harmless.']],
              ['seens, actions, rewards, next_seens, ends = zip(*batch)', ['`zip(*batch)` turns 32 tuples of 5 into 5 tuples of 32: all the pictures together, all the actions together, and so on.']],
              ['return (torch.tensor(seens, dtype=torch.float64), torch.tensor(actions),', ['Five tensors: pictures (32 × 200), actions (32), rewards (32), next pictures (32 × 200), and the endings as 0.0 or 1.0.']],
              ['return len(self.memory)', ['`len(buffer)` calls this: how many moves are remembered.']],
            ],
          },
        },
        { h: 'Problem 2: the target moves when you aim at it' },
        { md: `The target $y$ contains $\\max Q(s', a')$, computed by the same network that is being changed. Every update shifts the targets too, and the network can end up chasing its own tail, values spiralling up or swinging back and forth.

**Target network**: keep a second, frozen copy of the network and compute $y$ with **it**. Copy the learning network's weights into it every 500 moves. Between copies the targets hold still, and each stretch of learning is ordinary regression towards fixed numbers.` },
        {
          predict: {
            prompt: 'A move from the batch: reward −0.04, the game didn\'t end, γ = 0.95, and the **target** network\'s four values for the next picture are $[0.1, 0.5, -0.2, 0.3]$. What is the target $y$?',
            answer: -0.04 + 0.95 * 0.5, tolerance: 1e-9, compute: () => -0.04 + 0.95 * Math.max(0.1, 0.5, -0.2, 0.3),
            explain: '$y = -0.04 + 0.95 \\times \\max(0.1, 0.5, -0.2, 0.3) = -0.04 + 0.475 = 0.435$. Then the loss is $(Q(s, a) - 0.435)^2$ with $Q(s, a)$ from the **learning** network.',
            misconceptions: [{ answer: 0.5, tolerance: 1e-9, feedback: 'That is the best next value alone. The target adds the reward and discounts the future: $r + \\gamma \\max Q$.' }],
          },
        },
        {
          choice: {
            prompt: 'Why compute the target with a frozen copy of the network rather than the network being trained?',
            options: [
              { text: 'So that the targets don\'t shift with every update: between copies, learning is regression towards fixed numbers', why: 'Right. With one network, raising Q(s, a) also raises the targets that use it, and the values can chase themselves.' },
              { text: 'Because the frozen copy is more accurate', why: 'It is older, so if anything slightly less accurate. Its value is that it holds still.' },
              { text: 'To save computer time', why: 'It costs extra time and memory: a whole second network.' },
            ],
            answer: 0,
          },
        },
        { note: '**DQN\'s loss** is the squared TD error $(Q(s,a) - y)^2$ with $y = r + \\gamma\\max_{a\'} Q_{\\text{target}}(s\', a\')$ held fixed. **Replay memory** breaks the link between consecutive moves and reuses each move many times; the **target network** keeps $y$ still between copies.' },
      ],
    },

    {
      id: 'dqn-loop', number: '5.3', title: 'DQN, line by line, and what the picture buys',
      goal: 'Follow every line of `train_dqn`, train it in the browser, and show by measurement that the visited marks are what lets it solve Classic QMaze.',
      builds: ['replay-and-target'],
      blocks: [
        { md: `Here is the whole program. Its shape is Q-learning's (lesson 3.8): choose ε-greedily, move, learn. What's new is where the values come from (the network), where the learning examples come from (the replay memory), and where the targets come from (the target network). Note one change of rhythm: DQN counts **moves**, not games, and decays ε over the first half of them.` },
        {
          code: {
            file: 'dqn.py', fn: 'train_dqn', notes: [
              ['def train_dqn(name="qmaze", steps=20000', ['Every setting has a default that works on Classic QMaze: 20,000 moves, 64 hidden units, batches of 32, γ = 0.95, Adam with lr = 0.001, memory of 10,000, learning starts at move 500, target copied every 500 moves, ε from 1 to 0.05 over 10,000 moves.']],
              ['rng = random.Random(seed)', ['All the program\'s random choices: starting weights, exploring, batches.']],
              ['env = GridWorld(name)', ['The maze.']],
              ['net = QNet(2 * env.n_states, hidden, rng)', ['The network being trained, with its starting weights drawn from `rng`.']],
              ['target_net = QNet(2 * env.n_states, hidden)', ['The target network: same shape…']],
              ['target_net.load_state_dict(net.state_dict())', ['…same weights. `state_dict()` is a dictionary of every weight tensor by name; `load_state_dict` copies them in.']],
              ['optimizer = torch.optim.Adam(net.parameters(), lr=lr)', ['Adam (lesson 4.5) will step the learning network\'s 13,124 weights. The target network\'s are never stepped, only copied.']],
              ['buffer = ReplayBuffer(buffer_size, rng)', ['The replay memory (lesson 5.2).']],
              ['env.reset(seed=seed)', ['Start the first game.']],
              ['seen = picture(env, marks)', ['What the network sees now.']],
              ['totals = []', ['The return of each finished game.']],
              ['total = 0.0', ['This game\'s return so far.']],
              ['for step in range(steps)', ['One move per trip round the loop; games start and end inside it.']],
              ['epsilon = linear(epsilon_start, epsilon_end, step / explore_steps)', ['ε falls from 1 to 0.05 over the first 10,000 moves, then stays (lesson 3.6).']],
              ['if rng.random() < epsilon', ['Explore…']],
              ['action = rng.randrange(4)', ['…a random move.']],
              ['with torch.no_grad()', ['Choosing a move is not learning: no gradients needed.']],
              ['action = int(net(torch.tensor(seen, dtype=torch.float64)).argmax())', ['Exploit: the network\'s four values for this picture, and the index of the largest. `int(...)` turns the one-number tensor into a plain Python number.']],
              ['next_state, reward, terminated, truncated, info = env.step(action)', ['Move.']],
              ['total += reward', ['Keep score.']],
              ['next_seen = picture(env, marks)', ['The picture after the move (the new cell now marked visited).']],
              ['buffer.add(seen, action, reward, next_seen, terminated)', ['Remember the move. Only `terminated` is stored: a game cut off by the time limit still had a future, so its target still bootstraps (lesson 1.3).']],
              ['seen = next_seen', ['Move on.']],
              ['if terminated or truncated', ['Game over…']],
              ['totals.append(total)', ['…record its return…']],
              ['total = 0.0', ['…start counting again…']],
              ['env.reset()', ['…and start a new game.']],
              ['seen = picture(env, marks)', ['A fresh picture: only the start cell visited.']],
              ['if len(buffer) >= start_learning', ['Wait until 500 moves are remembered, so the first batches aren\'t all from the first game.']],
              ['seens, actions, rewards, next_seens, ends = buffer.sample(batch_size)', ['32 random old moves.']],
              ['q = net(seens)[torch.arange(batch_size), actions]', ['The learning network\'s values for all 32 pictures (32 × 4), then one per row: row $i$, column `actions[i]`. That picks $Q(s_i, a_i)$, the value of the move actually made.']],
              ['with torch.no_grad()', ['The targets are fixed numbers: no gradients through them.']],
              ['best_next = target_net(next_seens).max(dim=1).values', ['The **target** network\'s best value in each next picture: $\\max_{a\'} Q_{\\text{target}}(s\'_i, a\')$. `.max(dim=1)` takes the largest across each row.']],
              ['targets = rewards + gamma * (1 - ends) * best_next', ['$y_i = r_i + \\gamma \\max Q_{\\text{target}}(s\'_i)$, with `(1 - ends)` switching the future off for moves that ended the game. One line for all 32.']],
              ['loss = ((q - targets) ** 2).mean()', ['The squared TD errors, averaged over the batch.']],
              ['optimizer.zero_grad()', ['Clear the previous update\'s gradients (PyTorch adds them up otherwise).']],
              ['loss.backward()', ['Autograd: the slope of the loss for every one of the 13,124 weights.']],
              ['optimizer.step()', ['Adam moves every weight a little downhill.']],
              ['if step % sync_every == 0', ['Every 500 moves…']],
              ['target_net.load_state_dict(net.state_dict())', ['…copy the learning network into the target network.']],
              ['return net, totals', ['The trained network and the return of every game.']],
            ],
          },
        },
        {
          code: {
            file: 'dqn.py', fn: 'greedy_game', notes: [
              ['env = GridWorld(name)', ['A fresh maze.']],
              ['env.reset(seed=seed)', ['Start.']],
              ['trail = [env.state]', ['The cells visited, for drawing.']],
              ['total = 0.0', ['The return.']],
              ['done = False', ['Not over.']],
              ['while not done', ['One move per trip.']],
              ['with torch.no_grad()', ['Just playing.']],
              ['action = int(net(torch.tensor(picture(env, marks), dtype=torch.float64)).argmax())', ['Always the best move by the network: no exploring.']],
              ['next_state, reward, terminated, truncated, info = env.step(action)', ['Move.']],
              ['total += reward', ['Score.']],
              ['trail.append(next_state)', ['Where it went.']],
              ['done = terminated or truncated', ['Stop at the cheese or the time limit.']],
              ['return total, trail', ['How it did, and the route.']],
            ],
          },
        },
        {
          code: {
            file: 'dqn.py', fn: 'learn_dqn', notes: [
              ['net, totals = train_dqn(name, **settings)', ['Train, passing on any settings by name.']],
              ['total, trail = greedy_game(net, name, settings.get("marks", True))', ['Then one greedy game, with the same kind of picture. `settings.get("marks", True)` reads `marks` if it was given, else `True`.']],
              ['return net, totals, total, trail', ['Everything, for the Python tab.']],
            ],
          },
        },
        { figure: 'DQNTrainer', props: { map: 'cheese_and_cat' }, caption: 'The browser\'s copy of `train_dqn`, the same numbers as PyTorch. Train Cheese and cat (a few seconds), then Classic QMaze with and without the visited marks.' },
        { h: 'Measured: what the visited marks buy' },
        { md: `Each run: 20,000 moves on Classic QMaze (3,000 on Cheese and cat), then one greedy game. Seeds 0–4:

| | seed 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| Cheese and cat, with marks | 0.80 | 0.80 | 0.80 | 0.80 | 0.80 |
| Cheese and cat, no marks | 0.80 | 0.80 | 0.80 | 0.80 | 0.80 |
| Classic QMaze, with marks | −0.64 | −0.64 | −0.64 | −0.64 | −0.64 |
| Classic QMaze, no marks | −49.79 | −0.56 | −47.69 | −49.16 | −48.32 |

- On **Cheese and cat** there is no revisit penalty, the rat's cell is a Markov state, and the marks make no difference: every run finds the 6-move route.
- On **Classic QMaze without marks**, four seeds of five never reach the cheese. The greedy rat goes back and forth until the 200-move limit, paying the revisit penalty every time. It can't know it has been somewhere, because nothing in its picture says so.
- **With marks**, every seed reaches the cheese, in 42 moves (return −0.64). The best route, which Q-learning's table finds (lesson 3.9), takes 40 (−0.56): close, not perfect.

So the network's real advantage here is not speed: Q-learning's table solves this maze in a fraction of a second, and DQN takes 20,000 moves and about 20 seconds in the browser. The advantage is that it can take a **state too big for any table**, here a maze plus its history. That is why DQN mattered: Atari screens, like CartPole's four real numbers (CartPole Lab, Part 6), have far too many possible states to list.` },
        {
          choice: {
            prompt: 'Without visited marks, why does the greedy DQN rat on Classic QMaze go back and forth instead of finding the cheese?',
            options: [
              { text: 'Its picture shows only where it is, so in the same cell it always makes the same choice, and it can\'t tell that going back costs the revisit penalty', why: 'Right. The penalty depends on the history, which isn\'t in its input: the state isn\'t Markov (lesson 2.2). With marks, it is.' },
              { text: 'The network is too small', why: 'The same network, with marks in its picture, reaches the cheese on every seed.' },
              { text: 'It didn\'t train for long enough', why: 'One seed without marks does find the best route; more training doesn\'t give the others the information they lack.' },
            ],
            answer: 0,
          },
        },
        { python: { program: 'dqn', map: 'cheese_and_cat', label: 'Step through train_dqn in real PyTorch' } },
        { note: '**DQN**: Q-learning with a network for the table, a **replay memory** of old moves for its examples, and a **target network** for its targets. On Classic QMaze its picture, with the visited cells marked, is a Markov state too big for a table; without the marks, 4 seeds of 5 never reach the cheese.' },
      ],
    },
  ],
}
