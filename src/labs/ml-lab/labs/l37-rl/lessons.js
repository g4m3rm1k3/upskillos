import { notebooks } from './notebooks.js'

// Math is written in LaTeX between $…$ (inline) or $$…$$ (display). Inside these
// single-quoted strings every LaTeX backslash is doubled: '\\gamma' renders γ.
export const lessons = [
  {
    id: 'l37-mdp',
    title: '37.1 · The agent–environment loop',
    sections: ['Not supervised learning', 'Time steps: $S_t$, $A_t$, $R_{t+1}$, $S_{t+1}$', 'The dynamics $p(s\', r \\mid s, a)$', 'The Markov property', 'The return $G_t$', 'Why discount', 'Put it into practice'],
    skill: 'Write a sequential decision problem as a Markov decision process, name every quantity in the agent–environment loop with its time index, and compute returns.',
    prerequisite: 'Core labs 01–33; probability and expected value (Lab 04), optimization (Lab 22).',
    math: ['calc.sum', 'calc.series', 'stat.conditional', 'stat.rv', 'la.markov', 'tool.openmat'],
    paragraphs: [
      'In supervised learning every example comes with the correct answer. In **reinforcement learning** (RL) an agent acts, and the world responds with a new situation and a number called a **reward**. Nobody labels the right move. Rewards may arrive many steps after the decision that earned them, and the data the agent sees depends on what it chose to do.',
      'The interaction happens in discrete **time steps** $t = 0, 1, 2, \\dots$. At step $t$ the agent observes the **state** $S_t$ and chooses an **action** $A_t$. The environment then returns a **reward** $R_{t+1}$ and the next state $S_{t+1}$. The reward carries the index $t+1$ because it arrives together with the next state, as the result of $A_t$. One episode is the sequence $S_0, A_0, R_1, S_1, A_1, R_2, S_2, \\dots$ until a terminal state. Capital letters are random variables (what happens in a particular run), and lower case $s, a, r$ are particular values. In code, $t$ is one pass through the loop: `s` holds $S_t$, `a` holds $A_t$, the step function returns $R_{t+1}$ and $S_{t+1}$, and the assignment `s = s_next` is what advances $t$ to $t+1$.',
      'A **Markov decision process** (MDP) specifies the states, the actions, a discount $\\gamma$, and the **dynamics** $p(s\', r \\mid s, a) = \\Pr(S_{t+1} = s\', R_{t+1} = r \\mid S_t = s, A_t = a)$: a probability for every next state and reward, given the current state and action. In the playground a state is one of the 35 cells, and the actions are up, right, down and left. Each move costs $-0.1$, the star pays $+10$ and the ditch $-10$, and both end the episode. With **slip**, the move is replaced by a uniformly random one of the four with probability slip. So the intended move happens with probability $1 - \\text{slip} + \\text{slip}/4$ (the random draw may pick it too), and each other direction with $\\text{slip}/4$. At slip 0.2 that is 0.85 and 0.05. The sum over $s\'$ and $r$ of $p(s\', r \\mid s, a)$ is 1 for every $(s, a)$, since something must happen.',
      '**Markov** means the current state carries everything needed to predict what happens next: $\\Pr(S_{t+1}, R_{t+1} \\mid S_t, A_t, S_{t-1}, A_{t-1}, \\dots, S_0) = p(S_{t+1}, R_{t+1} \\mid S_t, A_t)$. The route that led to a cell does not matter, only the cell. If your state leaves out something that matters, such as a robot’s velocity, the process is not Markov in that state, and you must add the missing information to it.',
      'The agent maximizes the **return**, the discounted sum of the rewards that follow step $t$: $G_t = R_{t+1} + \\gamma R_{t+2} + \\gamma^2 R_{t+3} + \\dots = \\sum_{k=0}^{\\infty} \\gamma^k R_{t+k+1}$, where rewards after the end of an episode count as 0. Factor out $\\gamma$ from every term after the first and the return has a recursive form, $G_t = R_{t+1} + \\gamma G_{t+1}$: the return from now is the next reward plus the discounted return from the next step. This one line is the root of every Bellman equation in this lab. It also gives a way to compute all the returns of a finished episode, by walking backwards from the end.',
      'The discount $\\gamma \\in [0, 1)$ makes a reward $k$ steps away worth $\\gamma^k$ of the same reward now. With $\\gamma = 0.95$, a reward 10 steps away is worth $0.95^{10} \\approx 0.60$. Discounting prefers faster success, and it keeps the sum finite even for endless tasks: if every reward is at most $c$, then $G_t \\le c(1 + \\gamma + \\gamma^2 + \\dots) = c/(1-\\gamma)$, which is the geometric series. For the hand-written route (seven moves at $-0.1$, then $+10$) the return from the start is $G_0 = -0.1\\,(1 - \\gamma^7)/(1 - \\gamma) + 10\\gamma^7 \\approx 6.38$ at $\\gamma = 0.95$.',
      'Procedure: define the state (what the agent observes, and whether it is Markov), the actions, when an episode ends, the reward (the only way you tell the agent what you want) and $\\gamma$. Before any learning, write a simple hand-coded policy as a baseline.',
    ],
    blocks: [
      { p: 0 },
      { p: 1 },
      { figure: 'PlayLoop', caption: 'You are the agent. Each button press is one time step: you choose $A_t$, the world returns $R_{t+1}$ and $S_{t+1}$, and a row is added to the log. Try to reach the star with slip 0, then with slip 0.3.' },
      { cell: 1 },
      { p: 2 },
      { figure: 'SlipBars', caption: 'The dynamics for one state and action: where the robot can end up, and with what probability.' },
      { predict: { prompt: 'With slip 0.4, what is the probability that the intended move happens?', answer: 0.7, tolerance: 0.001, explain: '1 − 0.4 + 0.4/4 = 0.7. The random replacement lands on the intended move a quarter of the time.', misconceptions: [{ answer: 0.6, feedback: 'That forgets that the random draw can pick the intended move too: add 0.4/4.' }] } },
      { cell: 3 },
      { p: 3 },
      { p: 4 },
      { figure: 'ReturnWeights', caption: 'The hand-written route: seven moves at −0.1, then +10. Each reward is weighted by γᵏ; the bottom row computes every $G_k$ backwards with $G_k = R_{k+1} + \\gamma G_{k+1}$.' },
      { cell: 2 },
      { p: 5 },
      { predict: { prompt: 'With γ = 0.95, what is a reward of 10 received 10 steps from now worth today? (Two decimals.)', answer: 5.99, tolerance: 0.006, explain: '10 × 0.95¹⁰ ≈ 10 × 0.599 = 5.99.' } },
      { p: 6 },
      { math: true },
      { derivation: true },
    ],
    formulaTex: '$$S_0, A_0, R_1, S_1, A_1, R_2, \\dots$$ $$p(s\', r \\mid s, a) = \\Pr(S_{t+1}=s\', R_{t+1}=r \\mid S_t=s, A_t=a)$$ $$G_t = \\sum_{k=0}^{\\infty} \\gamma^k R_{t+k+1} = R_{t+1} + \\gamma G_{t+1}$$',
    formula: 'S₀, A₀, R₁, S₁, …   p(s′, r | s, a)   G_t = Σₖ γᵏ R_{t+k+1} = R_{t+1} + γ G_{t+1}',
    mathCode: {
      rows: [
        ['$t$', 'for t in range(max_steps):', 'One pass through the loop is one time step.'],
        ['$S_t$', 's', 'The current state: a cell index, $s = y \\cdot W + x$.'],
        ['$A_t$', 'a = policy(s)', 'The action chosen in $S_t$: 0 up, 1 right, 2 down, 3 left.'],
        ['$S_{t+1}, R_{t+1} \\sim p(\\cdot, \\cdot \\mid S_t, A_t)$', 's_next, r, done = step(s, a, rng, slip)', 'The environment samples the next state and the reward. `rng` supplies the randomness of slip.'],
        ['$t \\leftarrow t + 1$', 's = s_next', 'The next state becomes the current state.'],
        ['$\\gamma$', 'gamma', 'The discount factor.'],
        ['$G_t = R_{t+1} + \\gamma G_{t+1}$', 'G[t] = rewards[t] + gamma * G[t + 1]', 'Returns computed backwards over a finished episode, with $G_T = 0$ at the end.'],
      ],
      code: {
        caption: 'The whole loop, with the math each line implements.',
        source: `s = start                                  # S_0
G, discount = 0.0, 1.0
for t in range(max_steps):                 # t = 0, 1, 2, ...
    a = policy(s)                          # A_t
    s_next, r, done = step(s, a, rng, slip)    # S_{t+1}, R_{t+1} ~ p(., . | S_t, A_t)
    G += discount * r                      # adds gamma^t * R_{t+1} to G_0
    discount *= gamma
    s = s_next                             # t <- t + 1
    if done:                               # terminal state: every later reward is 0
        break`,
      },
    },
    derivation: {
      title: 'From the loop to the return',
      steps: [
        { prompt: 'With slip 0.2, what is the probability that the intended move happens?', number: 0.85, tolerance: 1e-9, show: '`1 − 0.2 + 0.2/4 = 0.85`: the random replacement picks the intended move a quarter of the time' },
        { prompt: 'And the probability of each of the other three directions?', number: 0.05, tolerance: 1e-9, show: '`0.2/4 = 0.05`; check: `0.85 + 3 × 0.05 = 1`' },
        { prompt: 'Write $G_t$ in terms of the next reward $R_{t+1}$ (type R), the next return $G_{t+1}$ (type G) and γ.', answer: 'R+γ*G', show: '`G_t = R_{t+1} + γ G_{t+1}`', vars: { R: [-10, 10], G: [-20, 20], γ: [0, 0.99] }, hint: 'Write out $G_t = R_{t+1} + \\gamma R_{t+2} + \\gamma^2 R_{t+3} + \\dots$ and factor $\\gamma$ out of everything after the first term.' },
        { prompt: 'Every reward equals c forever. Write the return in terms of c and γ.', answer: 'c/(1-γ)', show: '`c/(1 − γ)`, the sum of the geometric series', vars: { c: [-5, 5], γ: [0.05, 0.95] } },
        { prompt: 'The hand-written route takes seven moves at −0.1 and then collects +10. With γ = 0.95, what is its return $G_0$? (Three decimals.)', number: -0.1 * (1 - 0.95 ** 7) / 0.05 + 10 * 0.95 ** 7, tolerance: 0.001, show: '`−0.1 (1 − 0.95⁷)/0.05 + 10 × 0.95⁷ ≈ −0.603 + 6.983 = 6.380`', why: 'The +10 is received as $R_8$, so it is discounted by $\\gamma^7$.' },
      ],
      result: 'The return obeys $G_t = R_{t+1} + \\gamma G_{t+1}$, and with $|R| \\le c$ it never exceeds $c/(1-\\gamma)$.',
    },
    notebook: notebooks['l37-mdp'],
    experiment: 'Set slip to 0 and show the hand-written policy. Then raise slip to 20%. How often does the baseline fall in the ditch? Use the numbers in this lesson to explain why a policy that hugs the ditch is risky.',
    question: 'Starting from $S_0$, an episode gives $R_1 = -0.1$, $R_2 = -0.1$ and $R_3 = +10$, then ends. With γ = 0.9, what is $G_0$? (Two decimals.)',
    answer: 7.91, tolerance: 0.005,
    explanation: '$G_0 = R_1 + \\gamma R_2 + \\gamma^2 R_3 = -0.1 - 0.09 + 0.81 \\times 10 = 7.91$.',
    reflection: 'Describe a decision in your work that is sequential: today\'s choice changes tomorrow\'s situation. What would $S_t$, $A_t$ and $R_{t+1}$ be, and is your state Markov?',
  },
  {
    id: 'l37-values',
    title: '37.2 · Policies and value functions',
    sections: ['Stochastic policies $\\pi(a \\mid s)$', 'ε-greedy as a probability array', 'Value functions $V^\\pi$ and $Q^\\pi$', 'The Bellman expectation equation', 'Policy evaluation as loops — and as a linear system', 'Optimal values $V^*$ and $Q^*$'],
    skill: 'Represent stochastic policies as probability arrays, define $V^\\pi$, $Q^\\pi$, $V^*$ and $Q^*$, derive the Bellman expectation equation, and evaluate a policy with it.',
    prerequisite: 'Lesson 37.1; conditional probability and expectation (Lab 04); solving linear systems (Lab 03).',
    math: ['stat.rv', 'stat.conditional', 'dm.prob', 'la.systems', 'la.pysolve', 'la.iterative', 'tool.notebook'],
    paragraphs: [
      'A **policy** tells the agent what to do. A deterministic policy is a function $a = \\pi(s)$. A **stochastic policy** gives a probability for every action, $\\pi(a \\mid s) = \\Pr(A_t = a \\mid S_t = s)$, with $\\sum_a \\pi(a \\mid s) = 1$ in every state. In code, a stochastic policy is an array of four probabilities per state. A deterministic policy is the special case where the array is one-hot, such as `[0, 1, 0, 0]` for “always right”. Learning algorithms need the stochastic kind: an agent that never tries an action can never discover that it was better.',
      'The playground’s **Exploration ε** slider sets exactly such a policy. With probability $\\varepsilon$ the agent ignores its preference and draws one of the $|\\mathcal{A}| = 4$ actions uniformly, which may be the preferred one; otherwise it takes the preferred action. So $\\pi(a \\mid s) = 1 - \\varepsilon + \\varepsilon/4$ for the preferred action and $\\varepsilon/4$ for each other one. At $\\varepsilon = 0.1$ the array is `[0.925, 0.025, 0.025, 0.025]` when “up” is preferred. A common variant draws only among the *other* actions, giving `[0.9, 0.033, 0.033, 0.033]`. Both are valid; always check which one your code implements, because the numbers differ.',
      'The **state-value function** of a policy is the expected return when starting in $s$ and following $\\pi$: $V^\\pi(s) = \\mathbb{E}_\\pi[G_t \\mid S_t = s]$. The **action-value function** fixes the first action: $Q^\\pi(s, a) = \\mathbb{E}_\\pi[G_t \\mid S_t = s, A_t = a]$. The expectation averages over everything random: the policy’s choices and the environment’s slips. The two are linked by averaging over the first action: $V^\\pi(s) = \\sum_a \\pi(a \\mid s)\\, Q^\\pi(s, a)$. In code, $V$ is an array with one number per cell, and $Q$ is a table with one row per cell and one column per action.',
      'Take the expectation of $G_t = R_{t+1} + \\gamma G_{t+1}$ given $S_t = s$. Condition on the action and the outcome, and use the Markov property to replace $\\mathbb{E}[G_{t+1} \\mid S_{t+1} = s\']$ by $V^\\pi(s\')$. The result is the **Bellman expectation equation** $$V^\\pi(s) = \\sum_a \\pi(a \\mid s) \\sum_{s\', r} p(s\', r \\mid s, a)\\,\\big[r + \\gamma V^\\pi(s\')\\big].$$ It says that a state’s value is the average, over what the policy does and what the world does, of the immediate reward plus the discounted value of where you land. The same argument gives $Q^\\pi(s, a) = \\sum_{s\', r} p(s\', r \\mid s, a)\\,[r + \\gamma V^\\pi(s\')]$.',
      '**Policy evaluation** turns the equation into computation. Start with $V = 0$ and repeatedly replace every $V(s)$ by the right-hand side. Each $\\sum$ becomes a `for` loop: the outer loop runs over actions weighted by `pi[s][a]`, and the inner loop over outcomes weighted by their probabilities. Terminal states keep $V = 0$. The values converge because each sweep shrinks errors by at least a factor $\\gamma$. Written for all states at once, the equation is linear: $V = r_\\pi + \\gamma P_\\pi V$, where $P_\\pi[s, s\']$ is the probability of moving from $s$ to $s\'$ under $\\pi$ and $r_\\pi[s]$ is the expected immediate reward. So $(I - \\gamma P_\\pi)V = r_\\pi$ can be solved directly, and the sweep loop is the Jacobi method for that linear system. The playground’s “Evaluate the hand-written policy” view runs this loop with your ε. At $\\varepsilon = 0.1$ and no slip, $V^\\pi(\\text{start}) = 3.951$, exactly the value at $\\varepsilon = 0$ and 10% slip, because both mean “with probability 0.1, move uniformly at random”.',
      'The **optimal value functions** are the best achievable by any policy: $V^*(s) = \\max_\\pi V^\\pi(s)$ and $Q^*(s, a) = \\max_\\pi Q^\\pi(s, a)$. One policy achieves the maximum in every state simultaneously, and $V^*(s) = \\max_a Q^*(s, a)$. Once $Q^*$ is known, acting greedily, $\\pi^*(s) = \\arg\\max_a Q^*(s, a)$, is optimal, which is why Q-learning (Lesson 37.4) aims to estimate $Q^*$. $V^\\pi$ is the value of a particular policy you are running; $V^*$ is the ceiling. At 10% slip the hand-written route has $V^\\pi(\\text{start}) = 3.95$, while $V^*(\\text{start}) = 4.64$. The gap is what planning or learning can still gain.',
    ],
    blocks: [
      { p: 0 },
      { p: 1 },
      { figure: 'PolicyBars', caption: 'The policy in one state is four probabilities. Slide ε and compare the two ways of exploring.' },
      { predict: { prompt: 'ε = 0.2, and the random draw covers all 4 actions. What probability does the preferred action get?', answer: 0.85, tolerance: 0.001, explain: '1 − 0.2 + 0.2/4 = 0.85; each other action gets 0.05.', misconceptions: [{ answer: 0.8, feedback: 'That is the “draw only among the others” variant. Here the random draw can also pick the preferred action: add 0.2/4.' }] } },
      { cell: 1 },
      { p: 2 },
      { p: 3 },
      { figure: 'BellmanBackup', caption: 'The Bellman expectation equation at the start cell, every term written out. The sum of the last column equals $V^\\pi(\\text{start})$.' },
      { p: 4 },
      { figure: 'Sweeps', caption: 'Policy evaluation: start from V = 0 and apply the equation to every cell, one sweep at a time.' },
      { cell: 2 },
      { cell: 3 },
      { cell: 4 },
      { p: 5 },
      { figure: 'VersusOptimal', caption: 'Left: the value of the policy you wrote. Right: the best achievable, with its arrows.' },
      { cell: 5 },
      { math: true },
      { derivation: true },
    ],
    formulaTex: '$$\\pi(a \\mid s) = \\Pr(A_t = a \\mid S_t = s)$$ $$V^\\pi(s) = \\mathbb{E}_\\pi[G_t \\mid S_t = s]$$ $$Q^\\pi(s,a) = \\mathbb{E}_\\pi[G_t \\mid S_t = s, A_t = a]$$ $$V^\\pi(s) = \\sum_a \\pi(a \\mid s) \\sum_{s\', r} p(s\', r \\mid s, a)\\big[r + \\gamma V^\\pi(s\')\\big]$$ $$V^*(s) = \\max_\\pi V^\\pi(s) = \\max_a Q^*(s, a)$$',
    formula: 'V^π(s) = Σₐ π(a|s) Σ p(s′,r|s,a)[r + γV^π(s′)]   V*(s) = max_π V^π(s) = maxₐ Q*(s,a)',
    mathCode: {
      rows: [
        ['$\\pi(\\cdot \\mid s)$', 'pi(s)  # e.g. [0.925, 0.025, 0.025, 0.025]', 'The policy in state $s$ as an array of four probabilities.'],
        ['$V^\\pi(s)$', 'V[s]', 'One number per cell; terminal cells stay 0.'],
        ['$Q^\\pi(s, a)$', 'Q[s, a]', 'One row per cell, one column per action.'],
        ['$\\sum_a \\pi(a \\mid s)\\,\\cdots$', 'for a, pa in enumerate(pi(s)):', 'Average over the policy’s choice of action.'],
        ['$\\sum_{s\', r} p(s\', r \\mid s, a)\\,\\cdots$', 'for p, s2, r, done in outcomes(s, a, slip):', 'Average over what the environment does.'],
        ['$r + \\gamma V^\\pi(s\')$', 'r + (0 if done else gamma * V[s2])', 'Immediate reward plus the discounted value of the landing cell.'],
        ['$V^*(s) = \\max_a Q^*(s, a)$', 'V_star = Q_star.max(axis=1)', 'The best action’s value in each state.'],
        ['$\\pi^*(s) = \\arg\\max_a Q^*(s, a)$', 'policy = Q_star.argmax(axis=1)', 'Acting greedily on $Q^*$ is optimal.'],
      ],
      code: {
        caption: 'Policy evaluation: the Bellman expectation equation as nested loops.',
        source: `V = np.zeros(N_STATES)
while True:
    V_new = np.zeros(N_STATES)
    for s in range(N_STATES):
        if terminal(s):
            continue                                        # V(terminal) = 0
        for a, pa in enumerate(pi(s)):                      # sum over a of pi(a|s)
            for p, s2, r, done in outcomes(s, a, slip):     # sum over s', r of p(s', r | s, a)
                V_new[s] += pa * p * (r + (0 if done else gamma * V[s2]))
    if np.max(np.abs(V_new - V)) < 1e-12:
        break
    V = V_new`,
      },
    },
    derivation: {
      title: 'ε-greedy arrays and the Bellman expectation equation',
      steps: [
        { prompt: 'With ε = 0.1 and 4 actions, where the random draw may pick any of the 4, what probability does the preferred action get?', number: 0.925, tolerance: 1e-9, show: '`1 − 0.1 + 0.1/4 = 0.925`' },
        { prompt: 'Write the preferred action’s probability for general ε and n actions.', answer: '1-ε+ε/n', show: '`1 − ε + ε/n`; each other action gets `ε/n`', vars: { ε: [0, 1], n: [2, 10] } },
        { prompt: 'In some state, π gives probabilities 0.7 and 0.3 to two actions whose values are $Q^\\pi = 4$ and $Q^\\pi = -2$. What is $V^\\pi$ there?', number: 2.2, tolerance: 1e-9, show: '`0.7 × 4 + 0.3 × (−2) = 2.2`' },
        { prompt: 'A deterministic step: reward r, landing in a state worth v, discount γ. Write this action’s term inside the Bellman equation.', answer: 'r+γ*v', show: '`r + γ v`', vars: { r: [-10, 10], v: [-10, 10], γ: [0, 0.99] } },
        { prompt: 'A move succeeds with probability 0.9 (reward −0.1, landing in a state worth 5) and otherwise stays put (reward −0.1, in a state worth 4). With γ = 0.9, what is $Q^\\pi(s, a)$? (Two decimals.)', number: 0.9 * (-0.1 + 0.9 * 5) + 0.1 * (-0.1 + 0.9 * 4), tolerance: 0.005, show: '`0.9 × (−0.1 + 4.5) + 0.1 × (−0.1 + 3.6) = 3.96 + 0.35 = 4.31`' },
        { prompt: 'In a state with $Q^*(s, \\cdot) = (3.1, 4.6, 2.0, 4.2)$, what is $V^*(s)$?', number: 4.6, tolerance: 1e-9, show: '`max = 4.6`, reached by the second action, which is $\\pi^*(s)$' },
      ],
      result: '$V^\\pi$ averages $r + \\gamma V^\\pi(s\')$ over the policy and the dynamics; $V^*$ replaces the average over actions by a maximum over them.',
    },
    notebook: notebooks['l37-values'],
    experiment: 'Choose “Evaluate the hand-written policy” and set slip to 0. Move Exploration ε from 0 to 0.3: read π(· | start) and V^π(start) under the grid. Then set ε to 0 and slip to 10%. Why is V^π(start) the same as at ε = 0.1 with no slip?',
    question: 'A state has $Q^\\pi = (5, 2, 0, 1)$ for its four actions, and π is ε-greedy around the first action with ε = 0.2, the random draw covering all four. What is $V^\\pi$? (Two decimals.)',
    answer: 4.4, tolerance: 0.005,
    explanation: 'π = (0.85, 0.05, 0.05, 0.05), so $V^\\pi = 0.85 \\times 5 + 0.05 \\times (2 + 0 + 1) = 4.25 + 0.15 = 4.40$.',
    reflection: 'Your own work has a “policy” (how you decide) and a “value” (how good your situation is). Where would a little randomness in your policy teach you something your usual choices never would?',
  },
  {
    id: 'l37-planning',
    title: '37.3 · Planning when the rules are known',
    sections: ['The Bellman optimality equation', 'Value iteration', 'Why it converges', 'Risk from randomness', 'When you cannot plan', 'Baselines again'],
    skill: 'Derive the Bellman optimality equation, compute an optimal policy by value iteration, and explain why it converges.',
    prerequisite: 'Lessons 37.1–37.2; dynamic programming ideas (a table filled by a recursion).',
    math: ['dp.intro', 'dp.grids', 'dp.expected', 'tool.dp', 'calc.sequences', 'la.conditioning'],
    paragraphs: [
      'Combine the two facts from Lesson 37.2: $V^*(s) = \\max_a Q^*(s, a)$ and $Q^*(s, a) = \\sum_{s\', r} p(s\', r \\mid s, a)\\,[r + \\gamma V^*(s\')]$. The result is the **Bellman optimality equation**: $$V^*(s) = \\max_a \\sum_{s\', r} p(s\', r \\mid s, a)\\,\\big[r + \\gamma V^*(s\')\\big].$$ It is the expectation equation with the average over actions replaced by the best action. A state is worth the best action’s expected immediate reward plus the discounted value of where it leads.',
      '**Value iteration** turns the equation into an update. Start with $V_0 = 0$ and apply $V_{k+1}(s) \\leftarrow \\max_a \\sum p(s\', r \\mid s, a)[r + \\gamma V_k(s\')]$ to every state, once per sweep. In code: loop over states, loop over actions to compute each action’s one-step lookahead, and keep the largest. Each sweep propagates value one more step back from the goal, which is dynamic programming: a table filled by a recursion. When $V$ stops changing, the greedy policy $\\arg\\max_a$ of the lookahead is optimal.',
      'Why it converges: write $\\mathcal{T}$ for one sweep. For any two value arrays, $\\max_s |\\mathcal{T}V(s) - \\mathcal{T}U(s)| \\le \\gamma \\max_s |V(s) - U(s)|$, because a max over actions and an average over outcomes cannot enlarge differences, and the only change passes through the factor $\\gamma$. So $\\mathcal{T}$ is a **contraction**. It has exactly one fixed point, $V^*$, and the error after $k$ sweeps is at most $\\gamma^k$ times the starting error. With $\\gamma = 0.95$, reducing an error of 10 below 0.01 takes at most 135 sweeps. Larger $\\gamma$ means longer horizons and slower convergence.',
      'With no slip, the optimal path runs right along the ditch: 8 moves. With 10% slip, a move next to the ditch has a real chance of falling in, so the optimal policy climbs to a higher row and accepts a longer path. The goal is the same; only the uncertainty changed the best plan. The values show it: at 10% slip $V^*(\\text{start}) = 4.64$, but the edge-walking route is worth only 3.95.',
      'Value iteration needs the full model: every $p(s\', r \\mid s, a)$. Real problems, such as a warehouse robot, a sequence of recommendations or a chemical process, rarely provide it. The agent must learn from sampled transitions instead (next lesson).',
      'Always compare with simple policies. The hand-written “walk along the ditch” is optimal without slip. An RL system that cannot beat a reasonable rule is not worth its complexity.',
    ],
    formulaTex: '$$V^*(s) = \\max_a \\sum_{s\', r} p(s\', r \\mid s, a)\\big[r + \\gamma V^*(s\')\\big]$$ $$V_{k+1}(s) \\leftarrow \\max_a \\sum_{s\', r} p(s\', r \\mid s, a)\\big[r + \\gamma V_k(s\')\\big]$$ $$\\|V_k - V^*\\|_\\infty \\le \\gamma^k \\|V_0 - V^*\\|_\\infty$$',
    formula: 'V(s) ← maxₐ Σₛ′ P(s′|s,a) [r(s,a,s′) + γ V(s′)]',
    mathCode: {
      rows: [
        ['$V_k$', 'V', 'The current estimate, one number per cell, starting at zeros.'],
        ['$\\sum_{s\', r} p(s\', r \\mid s, a)[r + \\gamma V_k(s\')]$', 'sum(p * (r + (0 if done else gamma * V[s2])) for p, s2, r, done in outcomes(s, a, slip))', 'One action’s one-step lookahead: this is $Q(s, a)$ under the current $V$.'],
        ['$\\max_a$', 'max(lookahead(s, a) for a in range(4))', 'Keep the best action’s lookahead.'],
        ['$\\|V_{k+1} - V_k\\|_\\infty$', 'np.max(np.abs(V_new - V))', 'The largest change in a sweep, used to stop.'],
        ['$\\pi^*(s) = \\arg\\max_a \\cdots$', 'np.argmax([lookahead(s, a) for a in range(4)])', 'The optimal action, read off after convergence.'],
      ],
      code: {
        caption: 'Value iteration: one sweep per pass of the outer loop.',
        source: `V = np.zeros(N_STATES)
for sweep in range(max_sweeps):
    V_new = np.zeros(N_STATES)
    for s in range(N_STATES):
        if terminal(s):
            continue
        V_new[s] = max(                                   # max over a
            sum(p * (r + (0 if done else gamma * V[s2]))  # sum over s', r
                for p, s2, r, done in outcomes(s, a, slip))
            for a in range(4))
    if np.max(np.abs(V_new - V)) < tol:
        break
    V = V_new`,
      },
    },
    derivation: {
      title: 'Why value iteration converges',
      steps: [
        { prompt: 'After one sweep the error is at most γ times the error e before it. Write that bound.', answer: 'γ*e', show: '`γ e`', vars: { γ: [0, 0.99], e: [0, 10] } },
        { prompt: 'Write the bound after k sweeps.', answer: 'γ^k*e', show: '`γᵏ e`', vars: { γ: [0.1, 0.99], e: [0, 10], k: [1, 20] } },
        { prompt: 'With γ = 0.95 and a starting error of 10, how many sweeps guarantee an error below 0.01? (The smallest whole number.)', number: Math.ceil(Math.log(1000) / Math.log(1 / 0.95)), tolerance: 1e-9, show: '`k ≥ ln(1000)/ln(1/0.95) ≈ 134.7`, so `135`', why: 'The bound is a guarantee. In the gridworld the change actually hits zero much sooner, because every path ends at the goal or the ditch.' },
        { prompt: 'A state next to the goal: moving right reaches the star (+10, episode ends) with probability 0.9, and with probability 0.1 the robot stays in a state worth V = 8, with reward 0. With γ = 0.95, what is this action’s lookahead value? (Two decimals.)', number: 9.76, tolerance: 0.005, show: '`0.9 × 10 + 0.1 × (0 + 0.95 × 8) = 9 + 0.76 = 9.76`' },
      ],
      result: 'Each sweep is a γ-contraction, so value iteration converges to the unique $V^*$ from any starting point, geometrically fast.',
    },
    notebook: notebooks['l37-planning'],
    experiment: 'Show “Value iteration” and move slip from 0% to 30%. Watch the arrows near the ditch, the value numbers in the cells and the average number of moves.',
    question: 'A state next to the goal: moving right reaches the star (+10, episode ends) with probability 0.9, and with probability 0.1 the robot stays in a state worth V = 8. With γ = 0.95 and a step reward of 0 for staying, what is the expected value of moving right? (Two decimals.)',
    answer: 9.76, tolerance: 0.01,
    explanation: '0.9 × 10 + 0.1 × (0 + 0.95 × 8) = 9 + 0.76 = 9.76.',
    reflection: 'For a process you know, which parts of the model $p(s\', r \\mid s, a)$ could you write down, and which would have to be learned?',
  },
  {
    id: 'l37-qlearning',
    title: '37.4 · Q-learning from trial and error',
    sections: ['Estimating $Q^*$ from samples', 'The TD error', 'Off-policy: explore with ε, learn the greedy policy', 'Learning rate, noise and overestimation', 'Sample efficiency', 'From tables to networks'],
    skill: 'Derive the Q-learning update from the Bellman optimality equation, train a tabular agent, and tune exploration, learning rate and training length.',
    prerequisite: 'Lessons 37.1–37.3; gradient-based learning (Labs 20–22).',
    math: ['stat.center', 'ds.gd', 'ai.stochastic', 'calc.sequences'],
    paragraphs: [
      'Q-learning (Watkins 1989) estimates $Q^*$ without the model. The Bellman optimality equation for action values is $Q^*(s, a) = \\mathbb{E}\\big[R_{t+1} + \\gamma \\max_{a\'} Q^*(S_{t+1}, a\') \\mid S_t = s, A_t = a\\big]$. We cannot compute the expectation without $p$, but every step of experience gives one sample of the quantity inside it. So we average samples as they arrive.',
      'After the transition $(S_t, A_t, R_{t+1}, S_{t+1})$, build the **target** $R_{t+1} + \\gamma \\max_{a\'} Q(S_{t+1}, a\')$, or just $R_{t+1}$ if $S_{t+1}$ is terminal. The **temporal-difference (TD) error** is $\\delta_t = \\text{target} - Q(S_t, A_t)$: how much better or worse the step turned out than predicted. Move the estimate a fraction $\\alpha$ of the way: $Q(S_t, A_t) \\leftarrow Q(S_t, A_t) + \\alpha\\,\\delta_t$. This is a running average: with $\\alpha = 1/n$ it would be exactly the mean of the $n$ targets seen so far. It is also a stochastic-gradient step on $\\tfrac12(\\text{target} - Q)^2$ with the target held fixed.',
      'The agent chooses actions ε-greedily (Lesson 37.2) so that it keeps trying everything. But the target uses $\\max_{a\'}$: it learns the value of acting greedily, whatever it actually did next. That makes Q-learning **off-policy**. Its on-policy cousin **SARSA** uses $Q(S_{t+1}, A_{t+1})$, the action the ε-greedy agent really takes next, and so learns the value of the exploring policy, which keeps further from the ditch while exploration is on. Tabular Q-learning converges to $Q^*$ if every state–action pair keeps being tried and $\\alpha$ shrinks suitably over time ($\\sum \\alpha = \\infty$, $\\sum \\alpha^2 < \\infty$).',
      'The learning rate $\\alpha$ trades speed for stability: with slip, rewards are random, and a large $\\alpha$ makes $Q$ chase the latest outcome. Taking a max over noisy estimates also biases them upward, because the max picks whichever estimate got lucky. In the notebook, the learned $Q(\\text{start}, \\text{up})$ is 4.89 against the true $Q^* = 4.64$. **Double Q-learning** removes this **maximization bias** by selecting the action with one table and evaluating it with another. Retrain with a new seed and the results differ, so always report RL results over several seeds.',
      'Even this tiny world needs around a hundred episodes of experience. Real tasks need far more, which is why RL is often trained in simulators, and why the simulator’s realism becomes the next risk.',
      'When there are too many states for a table (images, continuous sensors), a neural network approximates $Q$ (deep Q-networks, DQN) or the policy directly (policy gradients, Lab 58). The ideas stay the same: returns, exploration and bootstrapped targets. Stability becomes much harder, which is why DQN adds a replay buffer and a slowly updated target network.',
    ],
    formulaTex: '$$\\delta_t = R_{t+1} + \\gamma \\max_{a\'} Q(S_{t+1}, a\') - Q(S_t, A_t)$$ $$Q(S_t, A_t) \\leftarrow Q(S_t, A_t) + \\alpha\\,\\delta_t$$ $$A_t \\sim \\varepsilon\\text{-greedy}(Q(S_t, \\cdot))$$',
    formula: 'Q(s,a) ← Q(s,a) + α [r + γ maxₐ′ Q(s′,a′) − Q(s,a)]     act randomly with probability ε',
    mathCode: {
      rows: [
        ['$A_t \\sim \\varepsilon\\text{-greedy}$', 'a = rng.integers(4) if rng.random() < epsilon else greedy(Q[s])', 'Explore with probability ε, otherwise act greedily with random tie-breaking.'],
        ['$S_{t+1}, R_{t+1}$', 's_next, r, done = step(s, a, rng, slip)', 'One sampled transition: no model needed.'],
        ['$R_{t+1} + \\gamma \\max_{a\'} Q(S_{t+1}, a\')$', 'target = r if done else r + gamma * Q[s_next].max()', 'The bootstrapped target; just $R_{t+1}$ at a terminal state.'],
        ['$\\delta_t$', 'delta = target - Q[s, a]', 'The TD error: surprise relative to the current estimate.'],
        ['$Q(S_t, A_t) \\leftarrow Q(S_t, A_t) + \\alpha\\delta_t$', 'Q[s, a] += alpha * delta', 'Move a fraction α of the way to the target.'],
        ['$t \\leftarrow t+1$', 's = s_next', 'Continue from the new state.'],
      ],
      code: {
        caption: 'One Q-learning step, with the math’s names.',
        source: `A_t = int(rng.integers(4)) if rng.random() < epsilon else greedy(Q[S_t])
S_next, R_next, done = step(S_t, A_t, rng, slip)          # S_{t+1}, R_{t+1}
target = R_next if done else R_next + gamma * Q[S_next].max()
delta = target - Q[S_t, A_t]                               # TD error
Q[S_t, A_t] += alpha * delta
S_t = S_next`,
      },
    },
    derivation: {
      title: 'The Q-learning update',
      steps: [
        { prompt: 'Write the TD error with R for $R_{t+1}$, M for $\\max_{a\'} Q(S_{t+1}, a\')$ and Q for $Q(S_t, A_t)$.', answer: 'R+γ*M-Q', show: '`δ = R + γM − Q`', vars: { R: [-10, 10], M: [-10, 10], Q: [-10, 10], γ: [0, 0.99] } },
        { prompt: 'Write the updated value of Q after one step with learning rate α.', answer: 'Q+α*(R+γ*M-Q)', show: '`Q + α(R + γM − Q)`, which is the same as `(1 − α)Q + α·target`', vars: { R: [-10, 10], M: [-10, 10], Q: [-10, 10], γ: [0, 0.99], α: [0, 1] } },
        { prompt: 'With α = 1, R = −0.1, γ = 0.9 and M = 5, what does Q become, whatever it was before?', number: 4.4, tolerance: 1e-9, show: '`−0.1 + 0.9 × 5 = 4.4`: α = 1 replaces the estimate by the latest target' },
        { prompt: 'SARSA uses the action actually taken next instead of the max. The next state has Q = (5, 1, 1, 1), and exploration picked the third action. With R = −0.1 and γ = 0.9, what is SARSA’s target?', number: 0.8, tolerance: 1e-9, show: '`−0.1 + 0.9 × 1 = 0.8`, whereas Q-learning’s target is `−0.1 + 0.9 × 5 = 4.4`', why: 'SARSA charges the current state for the exploration mistakes the agent will make; Q-learning assumes it will act greedily from now on.' },
      ],
      result: 'Q-learning is a running average of sampled Bellman optimality targets, with step size α.',
    },
    notebook: notebooks['l37-qlearning'],
    experiment: 'Set training episodes to 25, 50, 100 and 400. When does Q-learning start reaching the star reliably? Then retrain with new seeds, and try ε = 0 and ε = 0.5.',
    question: 'Q(s, a) = 2, reward r = −0.1, γ = 0.9, the next state\'s best Q is 5, and α = 0.5. What is the updated Q(s, a)? (Two decimals.)',
    answer: 3.2, tolerance: 0.01,
    explanation: 'Target = −0.1 + 0.9 × 5 = 4.4, so δ = 4.4 − 2 = 2.4, and Q becomes 2 + 0.5 × 2.4 = 3.2.',
    reflection: 'Why is it risky to let an agent explore in the real system rather than in a simulator? What would exploration cost in your domain?',
  },
  {
    id: 'l37-reward',
    title: '37.5 · Reward misspecification',
    sections: ['The agent optimizes what you wrote', 'Reward hacking', 'Measure the real objective', 'Potential-based shaping', 'Safer reward design', 'Demonstrate understanding'],
    skill: 'Diagnose reward misspecification by comparing the optimized reward with the true objective, and add shaping that provably keeps the optimal policy.',
    prerequisite: 'Lessons 37.1–37.4; responsible decisions (Lab 31).',
    math: ['calc.series', 'dm.proof'],
    paragraphs: [
      'The reward is the only specification the agent receives. It will exploit any gap between the reward and what you meant, and it is very good at finding such gaps.',
      'The checkpoint bonus was meant to help: +2 for entering a cell on the safe route. But entering it again pays again. Circling between two cells earns +1.8 every two moves, and over 60 moves that beats the +10 star by far. At the default discount, value iteration, which knows the rules exactly, circles too. That proves the fault lies in the reward, not the learner. The policy never finishes, and the reward it optimizes is higher than ever: this is **reward hacking**.',
      'Detect it by measuring the true objective separately from the training reward: success rate, time to goal, safety events. Watch the agent\'s behaviour, not just the curve. A training reward that rises while the real outcome falls is the signature.',
      'There is a safe way to add hints. **Potential-based shaping** (Ng, Harada & Russell 1999) chooses a potential $\\Phi(s)$ (how promising a state looks) and adds $F(s, s\') = \\gamma\\Phi(s\') - \\Phi(s)$ to each reward. Along any path the added terms telescope: $\\sum_{k=0}^{T-1} \\gamma^k F(S_k, S_{k+1}) = \\gamma^T \\Phi(S_T) - \\Phi(S_0)$. Every path from a state therefore gains the same bonus, apart from where it ends. Returns shift by a constant $-\\Phi(S_0)$ when $\\Phi = 0$ at terminal states, so the ranking of policies, and the optimal policy, cannot change. A loop that returns to where it started earns nothing.',
      'Safer designs: reward outcomes, not proxies for progress; make bonuses one-time or potential-based; cap episode length; and test against a simple baseline policy. In high-stakes settings, keep a human in the loop and constrain actions.',
      'You have completed this specialization when you can: write an MDP with its dynamics $p(s\', r \\mid s, a)$ and the time-indexed loop; compute returns; represent stochastic policies; define and evaluate $V^\\pi$ and $Q^\\pi$ with the Bellman expectation equation; state $V^*$ and $Q^*$; solve a known model by value iteration and explain why it converges; train and tune Q-learning over several seeds; compare with a hand-written baseline; and diagnose reward misspecification by measuring the objective you actually care about. The Python challenge implements policy evaluation, value iteration and Q-learning.',
    ],
    formulaTex: '$$\\text{training reward} \\uparrow \\ \\text{while task outcome} \\downarrow \\ \\Rightarrow\\ \\text{misspecified}$$ $$r\' = r + \\gamma\\Phi(s\') - \\Phi(s)$$ $$\\sum_{k=0}^{T-1}\\gamma^k F_k = \\gamma^T\\Phi(S_T) - \\Phi(S_0)$$',
    formula: 'training reward ↑ while task outcome ↓  ⇒  the reward is misspecified',
    mathCode: {
      rows: [
        ['$R_{t+1}$ (task)', 'r.taskReward', 'What we actually care about: −0.1 per move, +10 star, −10 ditch.'],
        ['$R_{t+1}$ (optimized)', 'r.reward', 'What the agent is trained on; includes the +2 checkpoint bonus.'],
        ['$\\Phi(s)$', 'phi(s)', 'A potential: how promising a state looks.'],
        ['$F = \\gamma\\Phi(s\') - \\Phi(s)$', 'gamma * phi(s2) - phi(s)', 'The only kind of added reward that can never change the optimal policy.'],
      ],
    },
    derivation: {
      title: 'Why potential-based shaping is safe',
      steps: [
        { prompt: 'Write the shaped reward with r, γ, P1 for Φ(s) and P2 for Φ(s′).', answer: 'r+γ*P2-P1', show: '`r + γΦ(s′) − Φ(s)`', vars: { r: [-10, 10], γ: [0, 0.99], P1: [-5, 5], P2: [-5, 5] } },
        { prompt: 'With γ = 1, add F over a whole episode from $S_0$ to a terminal state with Φ = 0. Write the total using P0 for Φ(S₀).', answer: '-P0', show: '`−Φ(S₀)`: every intermediate Φ appears once with + and once with −', vars: { P0: [-5, 5] } },
        { prompt: 'With γ = 1, the robot goes from A to B and back to A. What total shaping bonus does the loop earn?', number: 0, tolerance: 1e-9, show: '`(Φ(B) − Φ(A)) + (Φ(A) − Φ(B)) = 0`', why: 'A re-collectable bonus pays for every entry, so loops earn; a potential-based one cannot.' },
        { prompt: 'Circling earns +2 every 2 moves and costs 0.1 per move. Ignoring discounting, what does circling earn over 60 moves with the re-collectable bonus?', number: 54, tolerance: 1e-9, show: '`30 × 2 − 60 × 0.1 = 54`' },
      ],
      result: 'Potential-based shaping adds $\\gamma^T\\Phi(S_T) - \\Phi(S_0)$ to every return, so it changes no ranking of policies.',
    },
    notebook: notebooks['l37-reward'],
    experiment: 'Switch to the checkpoint bonus and compare the two curves in the progress plot. Then run an episode and describe what the robot does.',
    question: 'Circling earns +2 every 2 moves and costs 0.1 per move. Ignoring discounting, what does circling earn over 60 moves?',
    answer: 54,
    explanation: '30 checkpoint entries × 2 − 60 × 0.1 = 60 − 6 = 54, far more than the best honest episode: +10 for the star minus 0.8 for 8 moves.',
    reflection: 'Think of a metric people in your organization are rewarded on. How could someone raise it without achieving what it was meant to measure?',
  },
]

export const sources = [
  { title: 'Sutton & Barto · Reinforcement Learning: An Introduction, 2nd ed. — ch. 3 (MDPs, the notation used here), ch. 4 (dynamic programming), ch. 6 (Q-learning, SARSA) (free book)', url: 'http://incompleteideas.net/book/the-book-2nd.html' },
  { title: 'Watkins & Dayan (1992) · Q-learning', url: 'https://doi.org/10.1007/BF00992698' },
  { title: 'van Hasselt (2010) · Double Q-learning', url: 'https://papers.nips.cc/paper/2010/hash/091d584fced301b442654dd8c23b3fc9-Abstract.html' },
  { title: 'Ng, Harada & Russell (1999) · Policy invariance under reward transformations', url: 'https://people.eecs.berkeley.edu/~russell/papers/icml99-shaping.pdf' },
  { title: 'DeepMind · Specification gaming: the flip side of AI ingenuity', url: 'https://deepmind.google/discover/blog/specification-gaming-the-flip-side-of-ai-ingenuity/' },
]
