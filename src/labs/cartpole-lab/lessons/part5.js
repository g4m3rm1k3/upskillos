// Part 5: actor–critic. Why a critic, the advantage and n-step returns; the A2C network; the
// rollout over 8 worlds; the targets and the update; and the gradient checked by hand.

const nStep = (rewards, values, last, gamma) => { let R = last; const out = []; for (let t = rewards.length - 1; t >= 0; t--) { R = rewards[t] + gamma * R; out.unshift(R) } return out.map((r, t) => r - values[t]) }

export const PART5 = {
  id: 'part5', title: 'Part 5 · Actor and critic', lessons: [
    {
      id: 'critic-advantage', number: '5.1', title: 'A critic and the advantage',
      goal: 'Explain why REINFORCE is noisy, what a critic $V(s)$ learns, and compute one-step and n-step advantages by hand.',
      builds: ['reinforce-torch', 'td-target'],
      blocks: [
        { md: `REINFORCE judges each push by $G_t$, the return of the rest of the **one** game it happened in. That game's future also depended on every later random push, so $G_t$ is a noisy measure of how good the push was. Noise means small learning rates and many games.

Part 3 had a cure for noise: **bootstrapping**, using an estimate of the future instead of waiting for it. Combine the two ideas:

- An **actor**: the policy $\\pi(a\\mid s)$, improved by the policy gradient (Part 4).
- A **critic**: a second function, $V(s)$, that estimates the return from state $s$ under the current policy. It is learned like any regression (lesson 4.1): predict the return, measure the squared error, descend.

The critic then supplies the baseline **and** the future:

$$A = \\underbrace{r + \\gamma V(s')}_{\\text{what happened, plus the critic's estimate of what follows}} - \\underbrace{V(s)}_{\\text{what the critic expected}}$$

That is lesson 3.3's TD error $\\delta$, used as the advantage. It is available after **one** step, not at the end of the game, and much less noisy than $G_t - b$: only one random reward instead of the whole rest of the game. (It can be biased, since $V$ is only an estimate; the art is the balance.)` },
        { h: 'Between one step and the whole game: n-step returns' },
        { md: `Use $n$ real rewards, then the critic:

$$R^{(n)}_t = r_{t+1} + \\gamma r_{t+2} + \\dots + \\gamma^{n-1} r_{t+n} + \\gamma^n V(s_{t+n})$$

$n = 1$ is the TD error's target; $n = \\infty$ is REINFORCE's $G_t$. A2C uses $n = 5$, worked backwards exactly like lesson 1.5's returns: $R \\leftarrow r + \\gamma R$, starting from $R = V(s_5)$ instead of 0.

Two endings again (lesson 1.1): if the game **terminated** inside the 5 steps, the future there is 0; if it was **truncated** (step 500), the future is the critic's value of the last state of that game.` },
        { figure: 'NStepFig', caption: 'One world\'s 5 steps. Change the critic\'s values and where the game ends, and watch the targets and advantages change.' },
        {
          predict: {
            prompt: 'Five rewards of 1, nothing ends, $V(s_5) = 37$, $\\gamma = 0.99$, and the critic said $V(s_0) = 40$. What is the advantage at step 0? (3 decimals)',
            answer: nStep([1, 1, 1, 1, 1], [40, 0, 0, 0, 0], 37, 0.99)[0], tolerance: 0.0005, compute: () => nStep([1, 1, 1, 1, 1], [40, 0, 0, 0, 0], 37, 0.99)[0],
            explain: '$R = 1 + 0.99 + 0.99^2 + 0.99^3 + 0.99^4 + 0.99^5 \\times 37 = 4.901 + 35.189 = 40.090$, so $A = 40.090 - 40 = 0.090$: slightly better than expected.',
          },
        },
        {
          choice: {
            prompt: 'Why is $r + \\gamma V(s\') - V(s)$ a less noisy advantage than REINFORCE\'s $G_t - b$?',
            options: [
              { text: 'It contains one random reward and the critic\'s average over futures, instead of every random event until the game ends', why: 'Yes. The critic replaces the rest of one particular game by an estimate of all of them.' },
              { text: 'Because V is always right', why: 'V is an estimate and can be wrong; that is the price (bias) paid for less noise.' },
              { text: 'Because it uses γ', why: 'Both use γ.' },
              { text: 'It isn\'t less noisy, only faster', why: 'It is both: available after one step, and with far less randomness in it.' },
            ],
            answer: 0,
          },
        },
        { note: 'An **actor–critic** learns a policy (actor) and a value function (critic). The critic turns returns into **advantages**: $R^{(n)} - V(s)$, with $R^{(n)}$ = $n$ real rewards plus $\\gamma^n V(s_{t+n})$. Less noise than REINFORCE, and no waiting for the end of the game.' },
      ],
    },

    {
      id: 'a2c-network', number: '5.2', title: 'The A2C network',
      goal: 'Build an actor and a critic sharing one hidden layer in PyTorch, and follow a batch of states through it.',
      builds: ['critic-advantage'],
      blocks: [
        { md: `Actor and critic both need to understand the state, so they can share the first layer: one hidden layer (the **body**) feeds two **heads**, a linear layer of 2 scores for the actor and a linear layer of 1 value for the critic.

$$\\mathbf h = \\tanh(W\\mathbf s + \\mathbf b) \\qquad \\mathbf z = W_\\pi \\mathbf h + \\mathbf b_\\pi \\qquad V(s) = \\mathbf w_V \\cdot \\mathbf h + b_V$$

64 hidden units: $4 \\cdot 64 + 64 + 64 \\cdot 2 + 2 + 64 + 1 = 515$ weights.` },
        {
          code: {
            file: 'a2c.py', fn: 'ActorCritic.__init__', notes: [
              ['super().__init__()', ['`nn.Module`\'s own setup, as in every network.']],
              ['self.body = nn.Sequential(nn.Linear(4, hidden), nn.Tanh())', ['The shared body: 4 → 64, tanh.']],
              ['self.actor = nn.Linear(hidden, 2)', ['The actor head: 64 → 2 scores.']],
              ['self.critic = nn.Linear(hidden, 1)', ['The critic head: 64 → 1 value.']],
            ],
          },
        },
        {
          code: {
            file: 'a2c.py', fn: 'ActorCritic.forward', notes: [
              ['h = self.body(states)', ['States in, shape (8, 4) for 8 worlds; hidden features out, (8, 64). Every PyTorch layer works on a whole **batch** of rows at once.']],
              ['logits = self.actor(h)', ['(8, 2): two scores per world.']],
              ['values = self.critic(h).squeeze(-1)', ['The critic gives (8, 1); `.squeeze(-1)` removes the last dimension of size 1, leaving (8,): one value per world.']],
              ['return logits, values', ['Both heads\' answers.']],
            ],
          },
        },
        {
          choice: {
            prompt: 'Why share the body between actor and critic?',
            options: [
              { text: 'Both need the same understanding of the state; sharing learns it once, from both losses', why: 'Yes. Features useful for valuing a state are usually useful for choosing in it. (Separate networks also work; sharing is cheaper.)' },
              { text: 'PyTorch requires it', why: 'Lesson 4.7\'s network had no critic at all; any structure is allowed.' },
              { text: 'So the critic can choose actions', why: 'Only the actor head chooses; the critic only judges.' },
              { text: 'To make the network linear', why: 'The tanh body makes it non-linear.' },
            ],
            answer: 0,
          },
        },
        { note: 'One **body** (4 → 64, tanh) and two **heads**: actor (64 → 2 scores) and critic (64 → 1 value). Layers work on batches: (8, 4) states in, (8, 2) logits and (8,) values out.' },
      ],
    },

    {
      id: 'a2c-rollout', number: '5.3', title: 'A2C: eight worlds, five steps',
      goal: 'Read A2C\'s rollout: 8 CartPoles stepped together, what is remembered at each step, and how a game that ends inside the rollout is handled.',
      builds: ['a2c-network'],
      blocks: [
        { md: `**A2C** (Advantage Actor–Critic, Mnih et al. 2016) plays several copies of the world side by side, here 8, so each update learns from 8 different situations at once (they are less alike than 8 consecutive steps of one game). It collects $n = 5$ steps from each, so 40 moves, then makes one update, and carries on: games are not restarted at updates; each world just continues, and is reset when its game ends.` },
        { figure: 'BatchShapes', caption: 'One update\'s data: 5 steps (down) of 8 worlds (across).' },
        {
          code: {
            file: 'a2c.py', from: 24, to: 58, notes: [
              ['def train_a2c(updates=5000', ['5,000 updates × 40 moves = 200,000 moves in all.']],
              ['torch.manual_seed(seed)', ['Repeatable starting weights and sampled pushes.']],
              ['envs = [CartPole() for _ in range(n_envs)]', ['8 independent worlds. `_` is the usual name for a loop variable that isn\'t used.']],
              ['states = [env.reset(seed=seed + i)[0] for i, env in enumerate(envs)]', ['Start each with its own seed; `[0]` keeps the state and drops `info`.']],
              ['net = ActorCritic()', ['Actor and critic, random weights.']],
              ['optimizer = torch.optim.Adam(net.parameters(), lr=lr)', ['Adam over all 515 weights.']],
              ['lengths = []', ['Every finished game\'s length.']],
              ['for update in range(updates):', ['One update per trip.']],
              ['log_probs, values, entropies = [], [], []', ['For each of the 5 steps: log π, V(s) and the policy\'s entropy, all still connected to the weights.']],
              ['rewards, ended, end_values = [], [], []', ['And the world\'s answers, for the targets.']],
              ['for t in range(n_steps):', ['5 steps of all 8 worlds.']],
              ['logits, value = net(torch.tensor(states))', ['All 8 states through the network in one call: (8, 2) logits and (8,) values.']],
              ['policy = Categorical(logits=logits)', ['8 distributions at once, one per world.']],
              ['actions = policy.sample()', ['8 pushes, each sampled from its world\'s π.']],
              ['log_probs.append(policy.log_prob(actions))', ['log π(a|s) for the 8 pushes made.']],
              ['entropies.append(policy.entropy())', ['How spread out each π is (lesson 5.4).']],
              ['values.append(value)', ['The critic\'s V(s) for the 8 states.']],
              ['step_rewards, step_ended, step_end_values = [], [], []', ['This step\'s answers, one per world.']],
              ['for i, env in enumerate(envs):', ['Step each world with its push.']],
              ['next_state, reward, terminated, truncated, info = env.step(actions[i].item())', ['World `i` answers.']],
              ['end_value = 0.0', ['The future to use if a game ended here: 0 unless…']],
              ['if truncated and not terminated:', ['…the game was cut off at 500 steps with the pole still up.'], { logic: 'If the game stopped only because time ran out (the pole is still balanced), its future is real: ask the critic for the value of that final state. If the pole fell, the future stays 0.' }],
              ['with torch.no_grad():', ['No gradient through this estimate: it is part of a target.']],
              ['end_value = net(torch.tensor([next_state]))[1].item()', ['The critic\'s value of the final state: `[1]` takes the values from (logits, values), `.item()` makes it a float.']],
              ['if terminated or truncated:', ['Game over in world `i`?']],
              ['lengths.append(env.steps)', ['Record its length.']],
              ['next_state, info = env.reset()', ['Start world `i` again at once; the other 7 carry on.']],
              ['states[i] = next_state', ['World `i`\'s current state (the new game\'s start if it was reset).']],
              ['step_rewards.append(reward)', ['Remember the reward…']],
              ['step_ended.append(terminated or truncated)', ['…whether a game ended here…']],
              ['step_end_values.append(end_value)', ['…and the future to use if so.']],
              ['rewards.append(torch.tensor(step_rewards))', ['This step\'s 8 rewards as a tensor…']],
              ['ended.append(torch.tensor(step_ended))', ['…8 true/false values (a tensor of booleans)…']],
              ['end_values.append(torch.tensor(step_end_values))', ['…and 8 end values.']],
            ],
          },
        },
        {
          choice: {
            prompt: 'World 3\'s game is cut off at step 500 in the middle of a rollout. What does A2C do?',
            options: [
              { text: 'Records the length, asks the critic for the value of the final state as that game\'s future, and resets world 3 straight away', why: 'Yes. Truncated is not failure: the future is estimated, not zero. The world restarts so all 8 keep stepping together.' },
              { text: 'Treats it as a failure with future 0', why: 'That would teach the agent that reaching 500 is bad. `end_value` handles exactly this.' },
              { text: 'Stops all 8 worlds and makes an update', why: 'Updates happen every 5 steps, whatever the worlds do.' },
              { text: 'Leaves world 3 finished until the next update', why: 'It is reset at once: `next_state, info = env.reset()`.' },
            ],
            answer: 0,
          },
        },
        { python: { program: 'a2c', label: 'Step through A2C in real Python: the 8 worlds and the network' } },
        { note: 'A2C\'s **rollout**: 8 worlds, 5 steps, one network call per step for all 8. It remembers log π, V(s), entropy, rewards, endings, and for games cut off by the time limit, the critic\'s value of the final state.' },
      ],
    },

    {
      id: 'a2c-update', number: '5.4', title: 'A2C: targets, loss and update',
      goal: 'Compute A2C\'s n-step returns with `torch.where`, write its three-part loss, and explain `detach`, entropy and gradient clipping.',
      builds: ['a2c-rollout'],
      blocks: [
        { md: `After the rollout: targets for all 40 moves, then one loss with three parts.

$$L = \\underbrace{-\\frac1{40}\\sum A\\,\\log\\pi(a\\mid s)}_{\\text{actor}} \\;+\\; c_V \\underbrace{\\frac1{40}\\sum A^2}_{\\text{critic}} \\;-\\; c_H\\, \\underbrace{\\frac1{40}\\sum H(\\pi(\\cdot\\mid s))}_{\\text{entropy}}$$

- **Actor**: lesson 4.7's loss with the critic's advantage. The advantage is treated as a fixed number here (\`detach\`): the actor shouldn't change the critic's values to make its own loss look smaller.
- **Critic**: the squared advantage is the squared error between $V(s)$ and its target: regression, lesson 4.1. Weighted by $c_V = 0.5$.
- **Entropy**: $H = -\\sum_a \\pi(a)\\log\\pi(a)$ is largest when the pushes are equally likely. Subtracting it (with a small $c_H = 0.01$) rewards keeping a little randomness, so the policy doesn't become certain too early and stop exploring.` },
        {
          code: {
            file: 'a2c.py', from: 60, to: 80, notes: [
              ['with torch.no_grad():', ['The bootstrap value is part of the target: no gradients.']],
              ['R = net(torch.tensor(states))[1]', ['$V(s_5)$ for all 8 worlds: where each will be after the rollout. The starting point of the backwards walk.']],
              ['returns = []', ['Will hold the 5 rows of targets.']],
              ['for t in reversed(range(n_steps)):', ['Backwards: steps 4, 3, 2, 1, 0.']],
              ['R = rewards[t] + gamma * torch.where(ended[t], end_values[t], R)', ['`torch.where(condition, a, b)` picks, for each world, `a` where the condition holds and `b` where it doesn\'t. So: if world `i`\'s game ended at step `t`, its future is that game\'s end value (0, or V(final) if cut off); otherwise the R from the step after.'], { tex: 'R_t = r_t + \\gamma \\cdot \\begin{cases} \\text{end value}_t & \\text{a game ended at } t \\\\ R_{t+1} & \\text{otherwise} \\end{cases}', logic: 'For each of the 8 worlds: if its game ended at this step, the future is that game\'s end value (0 if the pole fell, the critic\'s estimate if time ran out); otherwise it is the return already worked out for the next step.' }],
              ['returns.insert(0, R)', ['At the front, so `returns` ends up in time order.']],
              ['returns = torch.stack(returns)', ['A (5, 8) tensor of targets.']],
              ['values = torch.stack(values)', ['(5, 8) critic values, connected to the weights.']],
              ['log_probs = torch.stack(log_probs)', ['(5, 8) log-probabilities, connected to the weights.']],
              ['advantages = returns - values', ['(5, 8) advantages: target minus prediction.'], { tex: 'A = R - V(s)' }],
              ['actor_loss = -(log_probs * advantages.detach()).mean()', ['`.detach()` gives the same numbers cut off from the gradient record: the actor\'s loss can\'t push on the critic.'], { tex: 'L_\\pi = -\\frac1{40}\\sum A\\,\\log\\pi(a\\mid s)' }],
              ['critic_loss = advantages.pow(2).mean()', ['Mean squared advantage: the critic\'s regression error. `.pow(2)` squares each element.'], { tex: 'L_V = \\frac1{40}\\sum (R - V(s))^2' }],
              ['entropy = torch.stack(entropies).mean()', ['The policy\'s average entropy over the 40 moves. For two pushes it is at most $\\ln 2 \\approx 0.693$ (a coin toss).'], { tex: 'H = -\\sum_a \\pi(a)\\log\\pi(a)' }],
              ['loss = actor_loss + value_coef * critic_loss - entropy_coef * entropy', ['One number. Minimising it improves the actor, fits the critic, and keeps some randomness.'], { tex: 'L = L_\\pi + 0.5\\,L_V - 0.01\\,H' }],
              ['optimizer.zero_grad()', ['Clear old gradients.']],
              ['loss.backward()', ['Gradients for all 515 weights; the shared body gets gradients from both heads.']],
              ['nn.utils.clip_grad_norm_(net.parameters(), 0.5)', ['**Gradient clipping**: if the whole gradient (all 515 numbers seen as one long vector) is longer than 0.5, scale it down to length 0.5. Protects against one unlucky batch making a huge step. The `_` at the end is PyTorch\'s mark for "changes its input in place".'], { tex: '\\mathbf g \\leftarrow \\mathbf g \\cdot \\min\\!\\left(1, \\frac{0.5}{\\lVert \\mathbf g \\rVert}\\right)' }],
              ['optimizer.step()', ['One Adam step.']],
              ['return net, lengths', ['The trained network and every game\'s length.']],
            ],
          },
        },
        {
          code: {
            file: 'a2c.py', fn: 'play_greedy', notes: [
              ['env = CartPole()', ['A fresh world for judging.']],
              ['lengths = []', ['One length per game.']],
              ['for game in range(games):', ['20 games.']],
              ['state, info = env.reset(seed=seed + game)', ['New starts, seeds 1000…']],
              ['done = False', ['Loop.']],
              ['while not done:', ['Until the game ends.']],
              ['with torch.no_grad():', ['Just playing: no gradients.']],
              ['logits, value = net(torch.tensor(state))', ['One state through the network.']],
              ['state, reward, terminated, truncated, info = env.step(int(logits.argmax()))', ['The likelier push: `argmax` is the index of the bigger score; `int` makes it a plain number.']],
              ['done = terminated or truncated', ['Over?']],
              ['lengths.append(env.steps)', ['The game\'s length.']],
              ['return lengths', ['20 lengths.']],
            ],
          },
        },
        { figure: 'Measured', props: { method: 'a2c', window: 50 }, caption: 'Measured in Python: A2C, three seeds, 200,000 moves each (around 1,500 games: most early games are short).' },
        {
          choice: {
            prompt: 'What would go wrong without `.detach()` in the actor loss?',
            options: [
              { text: 'The actor\'s loss would also train the critic, pushing V(s) to make advantages of likely actions large, instead of making V accurate', why: 'Yes. Gradients would flow from the actor loss into the critic head and body through the advantage. The critic must only learn from its own loss.' },
              { text: 'Nothing: `.detach()` only saves memory', why: 'It changes the gradients: without it the advantage\'s dependence on V would be differentiated too.' },
              { text: 'The actor would stop learning', why: 'The actor would still get gradients; the critic would get wrong ones.' },
              { text: 'PyTorch would raise an error', why: 'It would run silently and train worse.' },
            ],
            answer: 0,
          },
        },
        { python: { program: 'a2c', label: 'Step through an A2C update: targets, loss, backward, step' } },
        { note: 'A2C\'s update: n-step targets backwards with `torch.where` for games that ended; loss = actor $-\\text{mean}(A\\log\\pi)$ with $A$ detached + 0.5 × critic $\\text{mean}(A^2)$ − 0.01 × entropy; clip the gradient to length 0.5; one Adam step.' },
      ],
    },

    {
      id: 'gradient-check', number: '5.5', title: 'Checking the gradient by hand',
      goal: 'Derive the gradients of A2C\'s actor and critic losses for linear heads, and check them against autograd.',
      builds: ['a2c-update', 'policy-gradient'],
      blocks: [
        { md: `Autograd is reliable, but **you** should be able to say what it computes. With linear heads (no hidden layer: scores $\\mathbf z_i = W\\mathbf s_i$, value $V_i = \\mathbf c \\cdot \\mathbf s_i$) and a batch of $N$ moves:

**Actor.** $L_\\pi = -\\frac1N\\sum_i A_i \\log\\pi(a_i\\mid s_i)$ with $A_i$ fixed (detached). Lesson 4.3's slope, times $-A_i/N$:

$$\\frac{\\partial L_\\pi}{\\partial W_{k,j}} = -\\frac1N \\sum_i A_i\\,\\big(\\mathbb 1[k = a_i] - \\pi_{ik}\\big)\\, s_{ij}$$

In matrix form each move adds $-\\frac{A_i}{N}(\\mathbf e_{a_i} - \\boldsymbol\\pi_i)\\,\\mathbf s_i^\\top$: an **outer product** of a 2-vector and a 4-vector, a 2 × 4 matrix like $W$.

**Critic.** $\\frac12 L_V = \\frac12\\cdot\\frac1N\\sum_i (R_i - \\mathbf c\\cdot\\mathbf s_i)^2$. The derivative of $(R - V)^2$ in $V$ is $-2(R - V) = -2A$, and $\\partial V/\\partial \\mathbf c = \\mathbf s$:

$$\\frac{\\partial (\\tfrac12 L_V)}{\\partial \\mathbf c} = -\\frac{0.5 \\cdot 2}{N}\\sum_i A_i\\,\\mathbf s_i$$` },
        {
          code: {
            file: 'a2c_check.py', fn: 'check_gradients', notes: [
              ['torch.manual_seed(seed)', ['Repeatable starting weights.']],
              ['actor = torch.nn.Linear(4, 2, bias=False)', ['A linear actor: $W$ is 2 × 4, no bias.']],
              ['critic = torch.nn.Linear(4, 1, bias=False)', ['A linear critic: $\\mathbf c$ is 1 × 4.']],
              ['states = torch.tensor([[0.01, 0.2, -0.03, -0.4]', ['4 made-up CartPole states, shape (4, 4).']],
              ['actions = torch.tensor([1, 0, 1, 0])', ['The pushes taken.']],
              ['returns = torch.tensor([9.0, 4.0, 1.0, 6.0])', ['Their targets.']],
              ['logits = actor(states)', ['(4, 2) scores.']],
              ['values = critic(states).squeeze(-1)', ['(4,) values.']],
              ['policy = Categorical(logits=logits)', ['Softmax over each row.']],
              ['advantages = returns - values', ['$A_i = R_i - V_i$.']],
              ['actor_loss = -(policy.log_prob(actions) * advantages.detach()).mean()', ['A2C\'s actor loss.']],
              ['critic_loss = advantages.pow(2).mean()', ['A2C\'s critic loss.']],
              ['loss = actor_loss + 0.5 * critic_loss', ['No entropy term, to keep the hand formula short.']],
              ['loss.backward()', ['Autograd fills `actor.weight.grad` and `critic.weight.grad`.']],
              ['n = len(states)', ['$N = 4$.']],
              ['probabilities = torch.softmax(logits, dim=-1).detach()', ['$\\boldsymbol\\pi_i$ for each state: softmax along the last dimension (across the two pushes).']],
              ['one_hot = torch.nn.functional.one_hot(actions, 2).float()', ['$\\mathbf e_{a_i}$: `[0, 1]` for push right, `[1, 0]` for left.']],
              ['A = advantages.detach()', ['The advantages as fixed numbers.']],
              ['hand_actor = torch.zeros(2, 4)', ['The hand-computed gradient, built up move by move.']],
              ['hand_critic = torch.zeros(1, 4)', ['And the critic\'s.']],
              ['for i in range(n):', ['Each move\'s share:']],
              ['hand_actor += -A[i] * torch.outer(one_hot[i] - probabilities[i], states[i]) / n', ['$-\\frac{A_i}{N}(\\mathbf e_{a_i} - \\boldsymbol\\pi_i)\\mathbf s_i^\\top$. `torch.outer(u, v)` is the matrix of every $u_k v_j$.'], { tex: '-\\tfrac{A_i}{N}(\\mathbf e_{a_i} - \\boldsymbol\\pi_i)\\,\\mathbf s_i^\\top' }],
              ['hand_critic[0] += -0.5 * 2 * A[i] * states[i] / n', ['$-\\frac{0.5\\cdot 2}{N} A_i \\mathbf s_i$.'], { tex: '-\\tfrac{0.5 \\cdot 2}{N} A_i\\,\\mathbf s_i' }],
              ['actor_gap = (actor.weight.grad - hand_actor).abs().max().item()', ['The largest difference between autograd and the formula, over all 8 actor weights.']],
              ['critic_gap = (critic.weight.grad - hand_critic).abs().max().item()', ['And over the critic\'s 4.']],
              ['print("actor gradient (autograd):"', ['Show both.']],
              ['print("actor gradient (by hand): "', ['…']],
              ['print("largest difference: actor"', ['Measured: actor $6 \\times 10^{-8}$, critic 0. The differences are 32-bit rounding: the formulas are what autograd computes.']],
              ['return actor_gap, critic_gap', ['Both gaps.']],
            ],
          },
        },
        { python: { program: 'a2c_check', label: 'Run the gradient check in real Python' } },
        { note: 'For linear heads, $\\partial L_\\pi/\\partial W = -\\frac1N\\sum_i A_i(\\mathbf e_{a_i} - \\boldsymbol\\pi_i)\\mathbf s_i^\\top$ and $\\partial(\\frac12 L_V)/\\partial\\mathbf c = -\\frac1N\\sum_i A_i\\mathbf s_i$. Autograd agrees to 32-bit rounding. With a hidden layer, the chain rule just goes one layer further back.' },
      ],
    },
  ],
}
