// Part 4: A2C. From a table to a function, softmax policies, the policy gradient, the critic and the
// advantage, every line of a2c.py, and the three methods compared. The browser's A2C (engine/a2c.js)
// is checked against real PyTorch runs (a2c-parity.test.js); its gradients against autograd.
import { softmax } from '../engine/a2c.js'

export const PART4 = {
  id: 'part4', title: 'Part 4 · A2C: learning a policy directly', lessons: [
    {
      id: 'table-to-function', number: '4.1', title: 'From a table to a function',
      goal: 'Turn a state number into a one-hot vector, show that a linear layer applied to it is a table lookup, and read PyTorch\'s `nn.Linear` weights.',
      builds: ['q-table'],
      blocks: [
        { md: `Q-learning and SARSA store one number per state and action. That works for 100 states. It doesn't work for a maze seen as a picture, a robot's joint angles, or a game screen: far too many states, and the table can't **generalise** (learning about one cell teaches it nothing about the cell next door).

The fix used everywhere in modern reinforcement learning is to replace the table by a **function with adjustable numbers** (parameters, or **weights**), usually a neural network, and to learn the weights. This part builds one such method, **A2C**, and starts with the smallest possible network so that every number can be followed.` },
        { h: 'One-hot vectors' },
        { md: `A network takes a **vector** of numbers as input, not a state number. The simplest way to turn state $s$ into a vector is **one-hot encoding**: a vector as long as the number of states, all zeros except a 1 at position $s$.

$$s = 2,\\ n = 5 \\quad\\longrightarrow\\quad x = [0, 0, 1, 0, 0]$$

In PyTorch: \`nn.functional.one_hot(torch.tensor(2), 5)\` gives \`tensor([0, 0, 1, 0, 0])\`.

PyTorch's basic data type is the **tensor**: like a NumPy array (numbers in rows and columns), but able to track how every result was computed, so that it can work out gradients automatically (lesson 4.3).` },
        { h: 'A linear layer on a one-hot vector' },
        { md: `A **linear layer** computes $z = W x$: a weight matrix times the input. \`nn.Linear(n_states, 4, bias=False)\` holds $W$ with shape $(4, n_\\text{states})$: one row per output, one column per input.

Multiply $W$ by a one-hot $x$ and every column is multiplied by 0 except column $s$:

$$W x = \\sum_j W_{:, j}\\, x_j = W_{:, s}$$

So the output is **column $s$ of $W$**: four numbers stored for state $s$. A linear layer on one-hot input *is* a table, stored the other way round from the Q-table (states along the columns). That's why this lab's first A2C has no hidden layer: you can see exactly what it learns.` },
        { figure: 'OneHotLinear', props: { map: 'cheese_and_cat' }, caption: 'A freshly made (random) weight matrix W for Cheese and cat: 4 rows (actions), 16 columns (states). Click a cell: its one-hot vector selects one column, and those four numbers are the output.' },
        {
          code: {
            file: 'a2c.py', fn: '__init__', notes: [
              ['super().__init__()', ['`ActorCritic` is a subclass of `nn.Module`, PyTorch\'s base class for networks. This line runs `nn.Module`\'s own setup, which lets it find the layers created below.']],
              ['self.n_states = n_states', ['Kept so `forward` knows how long each one-hot vector must be.']],
              ['if hidden:', ['With `hidden=0` (the default, and Part 4\'s first network) there is no hidden layer. Lesson 4.6 adds one.']],
              ['self.body = nn.Sequential(nn.Linear(n_states, hidden), nn.Tanh())', ['A hidden layer: a linear layer followed by `tanh`, a squashing function. Only used when `hidden` is not 0.']],
              ['width = hidden', ['The heads then take `hidden` numbers in.']],
              ['self.body = nn.Identity()', ['No hidden layer: `nn.Identity` passes its input through unchanged.']],
              ['width = n_states', ['The heads take the one-hot vector itself: `n_states` numbers.']],
              ['self.actor = nn.Linear(width, n_actions, bias=hidden > 0)', ['The **actor**: 4 outputs, one score per action. Without a hidden layer its weight matrix is `(4, n_states)`, and `bias=False` (no extra added constant), so it is exactly a table.']],
              ['self.critic = nn.Linear(width, 1, bias=hidden > 0)', ['The **critic**: 1 output, the state\'s value $V(s)$. Without a hidden layer, a table with one number per state.']],
            ],
          },
        },
        {
          code: {
            file: 'a2c.py', fn: 'forward', notes: [
              ['x = nn.functional.one_hot(states, self.n_states).float()', ['`states` is a tensor of state numbers (one per copy of the map, lesson 4.5). Each becomes a one-hot row; `.float()` turns the 0s and 1s into decimals, which layers need.']],
              ['h = self.body(x)', ['Unchanged without a hidden layer.']],
              ['logits = self.actor(h)', ['Four action scores per state, called **logits** (next lesson).']],
              ['values = self.critic(h).squeeze(-1)', ['One value per state. `squeeze(-1)` removes the last size-1 dimension: shape `(8, 1)` becomes `(8,)`.']],
              ['return logits, values', ['Calling `net(states)` runs `forward` and gives both.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'On Classic QMaze (100 states), how many weights does the linear actor `nn.Linear(100, 4, bias=False)` have?',
            answer: 400, compute: () => 100 * 4,
            explain: 'A $4 \\times 100$ matrix: 400 weights, the same count as the Q-table. Nothing is gained in size yet; what changes is **how** the numbers are learned (by gradients) and what they mean (action preferences, not values).',
          },
        },
        { note: 'One-hot input × a linear layer = a table lookup: column $s$ of $W$. Networks replace tables so that, with richer inputs, what is learned about one state carries over to similar ones.' },
      ],
    },

    {
      id: 'softmax-policies', number: '4.2', title: 'A policy made of numbers: softmax',
      goal: 'Turn four action scores (logits) into probabilities with softmax, sample an action, and compute log-probabilities and entropy.',
      builds: ['table-to-function', 'policies'],
      blocks: [
        { md: `Q-learning picks actions from values with ε-greedy. A2C does something different: its actor outputs a **policy directly**, a probability for every action, and the agent samples from it. To get probabilities from four arbitrary scores $z_1, \\dots, z_4$ (the **logits**), use **softmax**:

$$\\pi(a \\mid s) = \\frac{e^{z_a}}{\\sum_{b} e^{z_b}}$$

Why this formula:

- $e^{z}$ is always positive, so every probability is positive.
- Dividing by the sum makes them add up to 1.
- A larger score gives a larger probability, smoothly: no action ever gets exactly 0, so the agent always explores a little.
- Adding the same number to every logit changes nothing ($e^{z + c} = e^c e^z$, and $e^c$ cancels). Only **differences** between logits matter.` },
        { figure: 'SoftmaxFigure', caption: 'Move the logits. Try "Add 1 to every logit" (nothing changes), "All equal" (a quarter each), and one logit far above the others (nearly certain).' },
        {
          predict: {
            prompt: 'Logits $[1, 0, 0, 0]$. What is the probability of the first action? (4 decimals)',
            answer: Math.E / (Math.E + 3), tolerance: 6e-5, compute: () => softmax([1, 0, 0, 0])[0],
            explain: '$e^1 / (e^1 + 3e^0) = 2.718 / 5.718 = 0.4754$.',
            misconceptions: [{ answer: 0.25, tolerance: 1e-6, feedback: 'That would be all logits equal. The first is 1 higher, so its $e^z$ is $e \\approx 2.718$ times the others\'.' }],
          },
        },
        { h: 'Sampling, log-probabilities and entropy' },
        { md: `PyTorch packages this as a **distribution** object:

\`\`\`python
policy = Categorical(logits=logits)   # softmax happens inside
action = policy.sample()              # draw an action with those probabilities
policy.log_prob(action)               # log π(action | s)
policy.entropy()                      # H = −Σ π log π
\`\`\`

- **Log-probability** $\\log \\pi(a \\mid s)$: the natural logarithm of the probability. Learning works with logs because they turn products into sums and because their gradient is simple (next lesson). Since probabilities are at most 1, log-probabilities are at most 0.
- **Entropy** $H = -\\sum_a \\pi(a|s) \\log \\pi(a|s)$ measures how spread out the policy is: the largest value, $\\log 4 \\approx 1.386$, when all four actions are equally likely; 0 when one action is certain. A2C adds a small reward for entropy to stop the policy becoming certain too early.` },
        {
          predict: {
            prompt: 'What is the entropy of the uniform policy over 4 actions? (3 decimals)',
            answer: Math.log(4), tolerance: 6e-4, compute: () => -4 * 0.25 * Math.log(0.25),
            explain: '$-4 \\cdot \\tfrac14 \\log \\tfrac14 = \\log 4 = 1.386$, the largest possible with 4 actions.',
          },
        },
        { note: 'The actor\'s logits become a policy by **softmax**. The agent samples its action; `log_prob` and `entropy` are what the learning rule needs.' },
      ],
    },

    {
      id: 'policy-gradient', number: '4.3', title: 'The policy gradient',
      goal: 'Derive the policy gradient with the log-derivative trick, compute $\\nabla_z \\log \\pi(a) = \\text{onehot}(a) - \\pi$, and explain why a baseline reduces noise.',
      builds: ['softmax-policies', 'discounting'],
      blocks: [
        { md: `The actor's weights $\\theta$ (theta: all the numbers in $W$) should make the expected return as large as possible:

$$J(\\theta) = \\mathbb{E}_{\\pi_\\theta}[\\, G_0 \\,]$$

**Gradient ascent** improves $J$ by moving the weights a small step in the direction that increases it fastest, its **gradient** $\\nabla_\\theta J$ (the vector of partial derivatives: how much $J$ changes for a small change in each weight):

$$\\theta \\leftarrow \\theta + \\text{lr} \\cdot \\nabla_\\theta J$$

The difficulty: $J$ is an average over random episodes, and we can't differentiate through the world. The **policy gradient theorem** gets round it.` },
        { h: 'The log-derivative trick' },
        { md: `Take one decision: in state $s$ the agent samples action $a$ with probability $\\pi_\\theta(a \\mid s)$ and then gets a return $G$ (which depends on $a$ but not directly on $\\theta$). The expected return is $\\sum_a \\pi_\\theta(a \\mid s)\\, G(a)$, so its gradient is

$$\\nabla_\\theta \\sum_a \\pi_\\theta(a|s)\\, G(a) = \\sum_a \\nabla_\\theta \\pi_\\theta(a|s)\\, G(a)$$

Now use the identity $\\nabla \\pi = \\pi \\, \\nabla \\log \\pi$ (because the derivative of $\\log f$ is $f'/f$):

$$= \\sum_a \\pi_\\theta(a|s)\\, \\nabla_\\theta \\log \\pi_\\theta(a|s)\\, G(a) = \\mathbb{E}_{a \\sim \\pi}\\big[\\, \\nabla_\\theta \\log \\pi_\\theta(a|s)\\, G \\,\\big]$$

It is an **expectation again**, so it can be estimated from samples: play, and for each action taken, use $\\nabla \\log \\pi(a|s) \\cdot G$. Summed over every step of an episode, this is the **policy gradient theorem**, and the algorithm that uses it directly is **REINFORCE** (Williams, 1992).

Meaning: push up the log-probability of each action taken, **in proportion to how good the outcome was**. Good outcome: that action becomes more likely. Bad outcome: less likely.` },
        { h: 'The gradient of log-softmax' },
        { md: `For a softmax policy the gradient with respect to the logits has a beautifully simple form. With $\\log \\pi(a) = z_a - \\log \\sum_b e^{z_b}$:

$$\\frac{\\partial \\log \\pi(a)}{\\partial z_j} = \\mathbb{1}[j = a] - \\frac{e^{z_j}}{\\sum_b e^{z_b}} = \\mathbb{1}[j = a] - \\pi(j)$$

($\\mathbb{1}[j = a]$ is 1 when $j$ is the action taken, else 0.) As a vector: **onehot(a) − π**. The taken action's logit goes up by $1 - \\pi(a)$; every other logit goes down by its own probability. And with the linear one-hot actor, logit $z_j$ for state $s$ *is* the weight $W_{j, s}$, so this is directly the gradient for column $s$ of $W$; every other column gets 0.` },
        { figure: 'GradientStep', caption: 'One gradient step on one state\'s logits: $z \\leftarrow z + \\text{lr} \\cdot A \\cdot (\\text{onehot}(a) - \\pi)$. Choose the action taken and how good it turned out (A). Positive A: that action becomes more likely; negative: less likely; 0: nothing changes.' },
        {
          predict: {
            prompt: 'All four logits are equal (π = ¼ each) and the agent took RIGHT. What is the RIGHT component of $\\text{onehot}(a) - \\pi$?',
            answer: 0.75, tolerance: 1e-9, compute: () => 1 - softmax([0, 0, 0, 0])[2],
            explain: '$1 - 0.25 = 0.75$; each of the other three components is $0 - 0.25 = -0.25$. The components always add up to 0: raising one probability means lowering the others.',
          },
        },
        { h: 'A baseline' },
        { md: `REINFORCE is very noisy: $G$ includes everything random that happened afterwards. And it has a quirk: if all returns are positive, *every* action taken is pushed up, just by different amounts.

Both are fixed by subtracting a **baseline** $b(s)$ that depends only on the state: use $G - b(s)$ instead of $G$. It doesn't change the expected gradient (because $\\sum_a \\pi(a|s) \\nabla \\log \\pi(a|s) = \\nabla \\sum_a \\pi(a|s) = \\nabla 1 = 0$), but it can shrink the noise a lot. The natural choice is $b(s) = V(s)$, the expected return from $s$: then the action is pushed up only if it did **better than expected**. That quantity, $G - V(s)$, is called the **advantage**, and learning $V(s)$ is the critic's job. Next lesson.` },
        {
          code: {
            file: 'a2c_check.py', fn: 'check_gradients', notes: [
              ['torch.manual_seed(seed)', ['Repeatable starting weights.']],
              ['net = ActorCritic(n_states=16, n_actions=4)', ['A fresh linear network for Cheese and cat\'s 16 states.']],
              ['states = torch.tensor([0, 1, 1, 2])', ['A tiny made-up batch: four decisions, in states 0, 1, 1 and 2…']],
              ['actions = torch.tensor([2, 3, 2, 2])', ['…the actions taken…']],
              ['returns = torch.tensor([0.5, -0.2, 0.1, 0.9])', ['…and the returns that followed.']],
              ['logits, values = net(states)', ['The forward pass for the four states.']],
              ['policy = Categorical(logits=logits)', ['Their softmax policies.']],
              ['advantages = returns - values', ['$A_i = R_i - V(s_i)$.']],
              ['actor_loss = -(policy.log_prob(actions) * advantages.detach()).mean()', ['PyTorch **minimises** losses, so to go **up** the policy gradient the loss is its negative. `.detach()` treats the advantage as a fixed number: the actor must not change the critic.']],
              ['critic_loss = advantages.pow(2).mean()', ['The critic\'s squared error.']],
              ['loss = actor_loss + 0.5 * critic_loss', ['The two parts together (no entropy term here, to keep the check short).']],
              ['loss.backward()', ['**Autograd**: PyTorch works out the gradient of `loss` with respect to every weight and stores it in each weight\'s `.grad`.']],
              ['n = len(states)', ['$N = 4$.']],
              ['probabilities = torch.softmax(logits, dim=-1).detach()', ['$\\pi$ for each of the four states: softmax along the last dimension (the 4 actions). `.detach()`: plain numbers for the hand calculation.']],
              ['one_hot = torch.nn.functional.one_hot(actions, 4).float()', ['$\\text{onehot}(a_i)$ for each decision.']],
              ['hand_actor = torch.zeros(4, 16)', ['The hand-computed actor gradient, the same shape as the actor\'s weights.']],
              ['hand_critic = torch.zeros(1, 16)', ['And the critic\'s.']],
              ['for i in range(n)', ['One decision at a time.']],
              ['s = states[i]', ['Its state: which column it touches.']],
              ['hand_actor[:, s] += -advantages[i].detach() * (one_hot[i] - probabilities[i]) / n', ['The formula from this lesson, written by hand: column $s$ of the gradient gets $-A_i(\\text{onehot}(a_i) - \\pi_i)/N$ (minus, because it is the loss\'s gradient).']],
              ['hand_critic[0, s] += -0.5 * 2 * advantages[i].detach() / n', ['The critic\'s part (next lesson): the derivative of $0.5 \\cdot \\text{mean}(A^2)$ with respect to $V(s_i)$.']],
              ['actor_gap = (net.actor.weight.grad - hand_actor).abs().max().item()', ['The largest difference between autograd and the hand formula. Running it prints about $7 \\times 10^{-9}$ for the actor and 0 for the critic: rounding error in 32-bit floats. The derivation is right.']],
              ['critic_gap = (net.critic.weight.grad - hand_critic).abs().max().item()', ['The same for the critic.']],
              ['print("actor gradient, column of state 1 (autograd):"', ['Show one column both ways…']],
              ['print("actor gradient, column of state 1 (by hand): "', ['…side by side.']],
              ['print("largest difference: actor"', ['And the largest differences.']],
              ['return actor_gap, critic_gap', ['Both gaps, for tests.']],
            ],
          },
        },
        { python: { program: 'a2c_check', label: 'Run the gradient check in real Python' } },
        { note: '**Policy gradient:** $\\nabla J = \\mathbb{E}[\\nabla \\log \\pi(a|s)\\,(G - b(s))]$. For softmax, $\\nabla_z \\log \\pi(a) = \\text{onehot}(a) - \\pi$. Taken actions with better-than-expected outcomes become more likely.' },
      ],
    },

    {
      id: 'critic-advantage', number: '4.4', title: 'The critic and the advantage',
      goal: 'Train a critic $V(s)$ by regression on returns, compute the advantage with a one-step and an n-step return, and put the actor and critic losses together.',
      builds: ['policy-gradient', 'td-learning'],
      blocks: [
        { md: `An **actor–critic** method has two learners:

- The **actor** is the policy $\\pi(a|s)$: it chooses.
- The **critic** is a value estimate $V(s)$: it judges, telling the actor whether an outcome was better or worse than expected.

The critic learns exactly like TD (lesson 3.2): it is pushed towards a target $R$ built from rewards and its own estimate of where the agent ended up. As a **loss** to minimise, that's the squared error, the critic's **regression** on its targets:

$$L_\\text{critic} = \\big(R - V(s)\\big)^2, \\qquad \\frac{\\partial L_\\text{critic}}{\\partial V(s)} = -2\\big(R - V(s)\\big)$$

Gradient descent on it moves $V(s)$ towards $R$: the TD update in gradient form.` },
        { h: 'The advantage' },
        { md: `With a one-step target the advantage is

$$A = r + \\gamma V(s') - V(s)$$

which is exactly the **TD error** $\\delta$ of lesson 3.2. A positive TD error means "that went better than I expected from $s$", so the action taken should become more likely. This is the bridge between Part 3 and Part 4: the same number that teaches the critic also teaches the actor.` },
        {
          predict: {
            prompt: 'γ = 0.95. The critic thinks $V(s) = 0.5$ and $V(s\') = 0.6$. The move paid $r = -0.04$. What is the advantage?',
            answer: -0.04 + 0.95 * 0.6 - 0.5, tolerance: 1e-9, compute: () => -0.04 + 0.95 * 0.6 - 0.5,
            explain: '$-0.04 + 0.95 \\cdot 0.6 - 0.5 = -0.04 + 0.57 - 0.5 = 0.03$: slightly better than expected, so this action gets a small push up.',
          },
        },
        { h: 'n-step returns' },
        { md: `One step of real reward plus a guess is noisy in one way (the guess may be wrong); a whole episode of real rewards is noisy in another (lots of randomness). A2C compromises: it plays **n** moves (here 5), then bootstraps. Using lesson 1.5's backward recursion, starting from the critic's estimate of the state reached after the last move:

$$R_{T} = V(s_T), \\qquad R_t = r_{t+1} + \\gamma R_{t+1}$$

and if an episode ended in between, the recursion restarts there: after a **terminated** move the future is 0; after a **truncated** one it is the critic's estimate of the state where it was cut off.` },
        {
          predict: {
            prompt: 'Two moves, rewards −0.04 and −0.04, no ending, and the critic says the state reached is worth $V = 0.8$. γ = 0.95. What is the return target $R_0$ for the first move?',
            answer: -0.04 + 0.95 * (-0.04 + 0.95 * 0.8), tolerance: 1e-9, compute: () => -0.04 + 0.95 * (-0.04 + 0.95 * 0.8),
            explain: 'Backwards: $R_1 = -0.04 + 0.95 \\cdot 0.8 = 0.72$, then $R_0 = -0.04 + 0.95 \\cdot 0.72 = 0.644$.',
            misconceptions: [{ answer: 0.72, tolerance: 1e-9, feedback: 'That is $R_1$, the target for the second move. One more step back: $R_0 = r_1 + \\gamma R_1$.' }],
          },
        },
        { h: 'The whole loss' },
        { md: `For a batch of $N$ moves with targets $R_i$ and advantages $A_i = R_i - V(s_i)$:

$$L = \\underbrace{-\\frac1N \\sum_i \\log \\pi(a_i|s_i)\\, A_i}_{\\text{actor}} \\;+\\; c_v \\underbrace{\\frac1N \\sum_i A_i^2}_{\\text{critic}} \\;-\\; c_e \\underbrace{\\frac1N \\sum_i H_i}_{\\text{entropy}}$$

- The actor term is the policy gradient (with a minus sign, because optimisers minimise). $A_i$ is treated as a fixed number here.
- The critic term pulls $V$ towards the targets. $c_v = 0.5$ (\`value_coef\`) sets its weight.
- The entropy term (\`entropy_coef\` $c_e = 0.01$) rewards keeping the policy spread out, so the agent doesn't stop exploring too early. Its gradient for logit $j$ works out to $c_e \\, \\pi_j (\\log \\pi_j + H) / N$.

Minimising this one number with one optimiser step trains both networks at once.` },
        { note: 'Critic: regress $V(s)$ on n-step return targets. Actor: policy gradient with **advantage** $A = R - V(s)$, the TD error\'s big brother. Plus a little entropy to keep exploring.' },
      ],
    },

    {
      id: 'a2c', number: '4.5', title: 'A2C in PyTorch, line by line',
      goal: 'Follow every line of `train_a2c`: parallel copies of the world, a 5-move rollout, the returns, the three losses, and the optimiser step.',
      builds: ['critic-advantage'],
      blocks: [
        { md: `**A2C**, Advantage Actor–Critic (Mnih et al., 2016, as the synchronous version of A3C), is the actor–critic of the last lesson plus one practical idea: run **several copies of the world at once** and learn from all of them together. Each update uses moves from 8 copies at different points in their episodes, which makes the batch less correlated and the gradient less noisy. The copies run **in step** (synchronously): all 8 move, then the next move, and so on.` },
        {
          code: {
            file: 'a2c.py', fn: 'train_a2c', notes: [
              ['torch.manual_seed(seed)', ['Seeds PyTorch\'s random numbers: the starting weights and every sampled action. Same seed, same run.']],
              ['envs = [GridWorld(name) for _ in range(n_envs)]', ['8 independent copies of the map. `_` is the usual name for a loop variable that isn\'t used.']],
              ['states = [env.reset(seed=seed + i)[0] for i, env in enumerate(envs)]', ['Start each copy; `[0]` keeps the state and drops `info`. A list of 8 ints.']],
              ['net = ActorCritic(envs[0].n_states, envs[0].n_actions, hidden)', ['The actor and critic (lesson 4.1).']],
              ['optimizer = torch.optim.Adam(net.parameters(), lr=lr)', ['**Adam**: an optimiser that turns gradients into weight changes. Like plain gradient descent, but each weight\'s step is scaled by a running average of its own recent gradients, which makes the step size much less fussy to choose.']],
              ['totals = []', ['The return of every finished episode, in any copy.']],
              ['running = [0.0] * n_envs', ['Each copy\'s total reward so far in its current episode.']],
              ['for update in range(updates)', ['One trip round this loop: a rollout of 5 moves in 8 copies, then one gradient step.']],
              ['log_probs, values, entropies = [], [], []', ['What the network said at each move, kept with their gradient history so `backward` can follow them.']],
              ['rewards, ended, end_values = [], [], []', ['What the worlds said: plain numbers.']],
              ['for t in range(n_steps)', ['5 moves.']],
              ['logits, value = net(torch.tensor(states))', ['One forward pass for all 8 states at once: logits shape `(8, 4)`, values shape `(8,)`.']],
              ['policy = Categorical(logits=logits)', ['8 softmax policies, one per copy (lesson 4.2).']],
              ['actions = policy.sample()', ['Each copy samples its action: this is all the exploring A2C does; no ε.']],
              ['log_probs.append(policy.log_prob(actions))', ['$\\log \\pi(a|s)$ for the 8 actions taken.']],
              ['entropies.append(policy.entropy())', ['$H$ of each copy\'s policy.']],
              ['values.append(value)', ['$V(s)$ for each copy\'s state.']],
              ['step_rewards, step_ended, step_end_values = [], [], []', ['This move\'s results, one entry per copy.']],
              ['for i, env in enumerate(envs)', ['Now the worlds answer, one copy at a time.']],
              ['next_state, reward, terminated, truncated, info = env.step(actions[i].item())', ['`.item()` turns a one-number tensor into a plain Python int, which `step` expects.']],
              ['running[i] += reward', ['Add to this copy\'s episode return.']],
              ['end_value = 0.0', ['What the future is worth if this move ended the episode: 0 if it terminated…']],
              ['if truncated and not terminated:', ['…but if it was cut off by the time limit, the world would have gone on (lesson 1.3), so…']],
              ['with torch.no_grad():', ['`torch.no_grad()` switches off gradient tracking for the lines inside: this value is used as a number, never learned through.']],
              ['end_value = net(torch.tensor([next_state]))[1].item()', ['…use the critic\'s estimate of the state where it stopped. Inside `torch.no_grad()`: this number is a target, not something to learn through.']],
              ['if terminated or truncated:', ['The episode in this copy is over.']],
              ['totals.append(running[i])', ['Record its return for the learning curve.']],
              ['running[i] = 0.0', ['And start counting the next episode from 0.']],
              ['next_state, info = env.reset()', ['Start this copy\'s next episode straight away: the copies never wait for each other.']],
              ['states[i] = next_state', ['Where this copy is now.']],
              ['step_rewards.append(reward)', ['Collect this copy\'s reward…']],
              ['step_ended.append(terminated or truncated)', ['…whether its episode ended…']],
              ['step_end_values.append(end_value)', ['…and what the future is worth if so.']],
              ['rewards.append(torch.tensor(step_rewards))', ['The 8 rewards of this move, as one tensor.']],
              ['ended.append(torch.tensor(step_ended))', ['A tensor of 8 `True`/`False`.']],
              ['end_values.append(torch.tensor(step_end_values))', ['8 end values.']],
              ['with torch.no_grad():', ['No gradients for the bootstrap value either.']],
              ['R = net(torch.tensor(states))[1]', ['After 5 moves: the critic\'s estimate of where each copy is now, $V(s_T)$, the bootstrap for the last move (inside `no_grad`).']],
              ['returns = []', ['The targets, built backwards.']],
              ['for t in reversed(range(n_steps))', ['Backwards through the 5 moves, as in lesson 1.5.']],
              ['R = rewards[t] + gamma * torch.where(ended[t], end_values[t], R)', ['$R_t = r_{t+1} + \\gamma R_{t+1}$, except where the episode ended at this move: then the future is `end_values[t]` (0, or the critic\'s estimate for a truncation). `torch.where(condition, a, b)` picks from `a` where the condition is true and from `b` elsewhere, for all 8 copies at once.']],
              ['returns.insert(0, R)', ['Keep them in time order.']],
              ['returns = torch.stack(returns)', ['A list of 5 tensors of 8 → one tensor of shape `(5, 8)`. The same for `values` and `log_probs` below.']],
              ['values = torch.stack(values)', ['$V(s)$ for the 40 moves, shape `(5, 8)`, still connected to the critic\'s weights.']],
              ['log_probs = torch.stack(log_probs)', ['$\\log \\pi(a|s)$ for the 40 moves, connected to the actor\'s weights.']],
              ['advantages = returns - values', ['$A = R - V(s)$ for all 40 moves.']],
              ['actor_loss = -(log_probs * advantages.detach()).mean()', ['The actor\'s loss, averaged over the 40 moves.']],
              ['critic_loss = advantages.pow(2).mean()', ['The critic\'s squared error.']],
              ['entropy = torch.stack(entropies).mean()', ['The average entropy.']],
              ['loss = actor_loss + value_coef * critic_loss - entropy_coef * entropy', ['The whole loss of lesson 4.4.']],
              ['optimizer.zero_grad()', ['Clear the gradients left from the previous update: PyTorch **adds** new gradients to old ones otherwise.']],
              ['loss.backward()', ['Autograd: the gradient of `loss` for every weight, into `.grad`.']],
              ['optimizer.step()', ['Adam changes every weight once. One update done.']],
              ['return net, totals', ['The trained network and every finished episode\'s return.']],
            ],
          },
        },
        {
          code: {
            file: 'a2c.py', fn: 'policy_table', notes: [
              ['with torch.no_grad():', ['Only reading the network: no gradients needed.']],
              ['logits, values = net(torch.arange(net.n_states))', ['`torch.arange(n)` is the tensor `[0, 1, …, n−1]`: every state at once.']],
              ['probabilities = torch.softmax(logits, dim=-1)', ['$\\pi(a|s)$ for every state.']],
              ['return probabilities.tolist(), values.tolist()', ['`.tolist()` turns tensors into ordinary Python lists, e.g. for drawing arrows on a map.']],
            ],
          },
        },
        { figure: 'A2CTrainer', props: { map: 'cheese_and_cat', maps: ['cheese_and_cat', 'corridor', 'qmaze', 'cliff', 'frozen_lake', 'cats_and_cheese'] }, caption: 'A2C in the browser: the same algorithm and the same formulas as `train_a2c` (checked against real PyTorch runs: after every update the weights agree to within about $2 \\times 10^{-7}$), but its random numbers are Python\'s, not PyTorch\'s, so runs differ in detail. Step one update to see the 8 copies move; then run them all.' },
        { python: { program: 'a2c', map: 'cheese_and_cat', label: 'Step through train_a2c in real PyTorch' } },
        { md: `Things to notice when you run it:

- The arrows start as four equal short stubs (a quarter each) and sharpen into one long arrow per cell as the policy becomes confident.
- The critic's colours spread backwards from the cheese, like value iteration's sweeps.
- Raise \`entropy_coef\` to 0.1 and the policy stays fuzzy longer; set it to 0 and it can lock in early.
- On the Cliff A2C finds a **safe** route, as SARSA did: it is on-policy, learning the value of the policy it is actually following, sampling included.` },
        { note: '**A2C:** 8 copies × 5 moves with the current policy; n-step returns; advantage $A = R - V$; loss = actor + 0.5 · critic − 0.01 · entropy; one Adam step. Repeat.' },
      ],
    },

    {
      id: 'comparing-methods', number: '4.6', title: 'Three methods compared, and what a hidden layer changes',
      goal: 'Compare Q-learning, SARSA and A2C on every map, explain the differences, and know when a network helps and when it hurts.',
      builds: ['a2c', 'cliff'],
      blocks: [
        { md: `Three different ideas reach the same goal:

| | Q-learning | SARSA | A2C |
|---|---|---|---|
| Learns | $Q^*$, values of the best moves | $Q^\\pi$ of its ε-greedy policy | a policy $\\pi$ and a critic $V^\\pi$ |
| On- or off-policy | off | on | on |
| Explores by | ε-greedy | ε-greedy | sampling its own softmax policy, plus entropy |
| Update | one table entry per move | one table entry per move | gradient step on a batch of moves |
| Stores | a table | a table | weights (here, two tables in disguise) |

Run all three on every map with this lab's default settings:` },
        { figure: 'MethodsCompare', caption: 'Each method trained once (seed 0) on each map, then judged by 100 greedy episodes. Bold: within 0.02 of the optimum.' },
        { md: `What to read in the table:

- On the deterministic mazes all three find optimal or near-optimal routes.
- On the **Cliff**, the two on-policy methods (SARSA, A2C) choose a safer, longer route than Q-learning's edge walk (lesson 3.8).
- On **Cats and cheese** all three settle for the small cheese with these settings; only Q-learning with optimistic initial values found the big one (lesson 3.10). A policy-gradient method explores only as much as its own probabilities and entropy bonus make it.
- On the **frozen lake** results vary from run to run and seed to seed; judge them over many episodes and several seeds.` },
        { h: 'A hidden layer' },
        { md: `\`train_a2c(..., hidden=32)\` puts a 32-unit hidden layer with tanh between the one-hot input and the two heads. More power, surely? Measured with this lab's Python program (1,500 to 3,000 updates):

- At learning rate 0.05, the setting that works for the linear version, it still solves the corridor and Cheese and cat, but **collapses** on Classic QMaze, the Cliff and the frozen lake (and on Cats and cheese with one seed of two): the policy becomes certain of a bad action early and stops learning.
- At 0.01 it solves Cheese and cat on all 3 seeds, Classic QMaze on 1 seed of 3, the Cliff on none, and the frozen lake to 48–76% success.

Why worse? With a one-hot input every state is already its own column: there is nothing similar between states for a hidden layer to discover. All it adds is **shared** weights, so a change made for one state disturbs others, plus more settings that must be tuned. A network pays off when states have **features** that make similar states look similar (coordinates, a picture of the maze, distances), so that learning in one place generalises to the next. That's the step to deep reinforcement learning, such as the DQN in the QMaze tutorial, which feeds the network the whole maze as an image.` },
        { python: { program: 'a2c_hidden', map: 'cheese_and_cat', label: 'Run A2C with a hidden layer in real PyTorch' } },
        {
          choice: {
            prompt: 'You must learn a 12 × 12 maze where the agent is shown only its cell number. Which is the most sensible first choice?',
            options: [
              { text: 'Tabular Q-learning (144 × 4 table)', why: 'Right. Small, discrete, fully observed: a table learns exactly and needs few settings. Reach for networks when states are too many or have features worth generalising over.' },
              { text: 'A2C with a large hidden layer', why: 'With one-hot cell numbers a hidden layer has nothing to generalise over, and this lab measured it doing worse than a table.' },
              { text: 'Value iteration', why: 'Only if you know `P`. "Learn" means the agent must find out by playing.' },
            ],
            answer: 0,
          },
        },
        { note: 'Q-learning learns optimal values off-policy; SARSA and A2C learn about the policy they follow and so play safer when exploration is risky. Networks earn their keep when inputs have features to generalise over; on one-hot grids, a table is the honest choice.' },
      ],
    },
  ],
}
