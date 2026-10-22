// "Check yourself" for the decision-process lessons (Specialist, control group). Format and checks:
// checks.js and checks.test.js; the numbers come from specialist-oracles.js.
const MDP3 = [[[0], [1, 2]], [[2], [0, 1]], [[0, 1], [2]]], MDP3_R = [[1, 0], [2, -1], [0, 3]]
const DET4 = [[1, 2], [2, 3], [3, 0], [0, 1]], DET4_R = [[1, 0], [0, 4], [2, -1], [-3, 5]]

export const CONTROL_CHECKS = {
  'bellman-principle': [
    {
      know: 'The state is (vertex, coupon used or not); a free edge moves from unused to used.',
      ask: 'Edges 0 → 1 costing 3, 1 → 3 costing 3, 0 → 2 costing 1, 2 → 3 costing 8; one free edge. The cheapest cost from 0 to 3?',
      args: [4, [[0, 1, 3], [1, 3, 3], [0, 2, 1], [2, 3, 8]]], answer: 1,
      misconceptions: [{ answer: 3, feedback: '3 puts the coupon on the cheapest route without it, 0 → 1 → 3. On 0 → 2 → 3 it removes the 8, leaving 1.' }],
      explain: 'Without the coupon 0 → 1 → 3 (6) is cheaper than 0 → 2 → 3 (9). With the coupon on the 8, the second costs 1.',
    },
    {
      know: 'An optimal route’s remaining part must be optimal for the state it reaches.',
      ask: 'Why is the vertex alone not a good enough state here?',
      options: [
        { text: 'Two routes to a vertex can differ in whether the coupon is left, and so in what the rest can cost', right: true, why: 'The cheapest route to the vertex may have spent the coupon, while a dearer one kept it for an expensive edge later.' },
        { text: 'Because the graph can have cycles', why: 'Dijkstra handles cycles with non-negative weights; the problem is the missing coupon information.' },
        { text: 'Because the weights are whole numbers', why: 'The weights’ type doesn’t matter; what the state forgets does.' },
      ],
    },
    {
      know: 'The search runs on 2n states, each edge giving at most two relaxations.',
      ask: 'About how much work does it take for n vertices and m edges, with a heap?',
      options: [
        { text: 'About (n + m) log n steps', right: true, why: 'Dijkstra on twice the vertices and twice the edges.' },
        { text: 'About 2ⁿ steps', why: 'Only one extra bit of state is added, not a set.' },
        { text: 'About n · m steps', why: 'That is Bellman–Ford; non-negative weights allow Dijkstra.' },
      ],
    },
  ],

  'finite-mdp': [
    {
      know: 'V(t, s) = max over a of reward(s, a) + the average of V(t − 1, x) over the next states.',
      ask: 'In the three-state lesson example, what is the best expected total of 2 decisions from state 0? Type a fraction.',
      args: [MDP3, MDP3_R, 2], answer: 5 / 2,
      misconceptions: [{ answer: 2, feedback: '2 takes action 0 twice. Action 1 first leads to state 1 or 2, worth 2 or 3 with one decision left: 5/2.' }],
      explain: 'V(1, ·) = 1, 2, 3. From state 0: action 0 gives 1 + 1 = 2; action 1 gives 0 + (2 + 3)/2 = 5/2.',
    },
    {
      know: 'The best action can depend on how many decisions are left.',
      ask: 'Why does a finite horizon need t in the state?',
      options: [
        { text: 'An investment that pays later is worth it only if enough decisions remain', right: true, why: 'With one decision left the best is greedy; with more, giving up reward now can pay.' },
        { text: 'Because the rewards change over time', why: 'They don’t here; the remaining horizon alone changes the best action.' },
        { text: 'It doesn’t: the best action is the same at every t', why: 'The lesson example takes action 0 with 1 left but action 1 with 2 left.' },
      ],
    },
    {
      know: 'Each of H rounds updates every state through every action and next state.',
      ask: 'About how much work does it take?',
      options: [
        { text: 'About H · (the number of state-action-next-state triples)', right: true, why: 'Each round looks at every transition once.' },
        { text: 'About (actions)^H', why: 'That is the tree of decisions; the table shares the states.' },
        { text: 'About H steps', why: 'Each round updates every state, not one.' },
      ],
    },
  ],

  'value-iteration': [
    {
      know: 'V_k(s) = max over a of reward(s, a) + γ · V_{k−1}(next), from V₀ = 0.',
      ask: 'In the four-state ring of the lesson, discount 1/2, what is V₂(0)?',
      args: [DET4, DET4_R, [1, 2], 2], answer: 3,
      misconceptions: [{ answer: 5, feedback: '5 adds V₁(1) = 4 without the discount: 1 + 4. The future is worth half: 1 + 2.' }],
      explain: 'V₁ = 1, 4, 2, 5. V₂(0) = max(1 + V₁(1)/2, 0 + V₁(2)/2) = max(3, 1) = 3.',
    },
    {
      know: 'The Bellman update shrinks the distance between two value functions by the factor γ.',
      ask: 'Why does value iteration converge for γ < 1?',
      options: [
        { text: 'Each update multiplies the error by at most γ, so it shrinks geometrically', right: true, why: 'The update is a contraction; its unique fixed point is the optimal value.' },
        { text: 'Because the rewards are bounded, whatever γ is', why: 'With γ = 1 and a positive cycle the values grow without limit.' },
        { text: 'Because the states are visited in order', why: 'All states are updated together; it is the discount that makes it converge.' },
      ],
    },
    {
      know: 'After k updates the error is at most γᵏ times the starting error.',
      ask: 'With γ = 1/2, about how many more updates cut the error by a factor of 1000?',
      options: [
        { text: 'About 10', right: true, why: 'Ten halvings: (1/2)¹⁰ = 1/1024, just past 1/1000.' },
        { text: 'About 1000', why: 'The error shrinks geometrically, not by a fixed amount.' },
        { text: 'About 3', why: 'Three halvings give (1/2)³ = 1/8, far from 1/1000.' },
      ],
    },
  ],

  'policy-iteration': [
    {
      know: 'Evaluate a policy exactly; improve every state; stop when nothing changes.',
      ask: 'Discount 1/2. State 0: action A earns 0 and moves to state 1, action B earns 1 and stays. State 1 earns 2 and stays. The optimal value of state 0?',
      args: [[[[1], [0]], [[1]]], [[0, 1], [2]], [1, 2]], answer: 2,
      misconceptions: [{ answer: 4, feedback: '4 is state 1’s value. Moving there from state 0 earns nothing first and is discounted: 0 + 4/2 = 2.' }],
      explain: 'State 1 is worth 2 / (1 − 1/2) = 4. From state 0, A gives 0 + 4/2 = 2 and B gives 1 / (1 − 1/2) = 2: both 2.',
    },
    {
      know: 'Each improvement gives a policy at least as good in every state.',
      ask: 'Why does policy iteration stop after finitely many rounds?',
      options: [
        { text: 'There are finitely many policies, and each round strictly improves until none can be', right: true, why: 'No policy repeats, so the rounds can’t go on forever.' },
        { text: 'Because the values shrink by γ each round', why: 'That is value iteration’s argument; here it is the finite number of policies.' },
        { text: 'It may not: it can cycle between equal policies', why: 'Changing only on strict improvement rules that out.' },
      ],
    },
    {
      know: 'Evaluation solves n linear equations; improvement looks at every action.',
      ask: 'What is the most expensive part of a round for n states?',
      options: [
        { text: 'Solving the n equations, about n³ steps', right: true, why: 'Gaussian elimination; improvement is cheaper.' },
        { text: 'Improvement, about 2ⁿ steps', why: 'Improvement chooses each state’s action separately: linear in the actions.' },
        { text: 'Both are about n steps', why: 'A linear system of n unknowns takes far more than n steps.' },
      ],
    },
  ],

  'average-reward': [
    {
      know: 'The long-run reward per step from 0 is the largest mean weight of a cycle reachable from 0.',
      ask: 'Edges 0 → 1 (0), 1 → 2 (0), 2 → 1 (7), and a loop at 0 earning 2. The best long-run reward per step? Type a fraction.',
      args: [3, [[0, 1, 0], [1, 2, 0], [2, 1, 7], [0, 0, 2]]], answer: 7 / 2,
      misconceptions: [{ answer: 2, feedback: '2 stays on the loop at 0. The cycle 1 → 2 → 1 earns 7 every two steps.' }],
      explain: 'Cycles: the loop at 0, mean 2, and 1 → 2 → 1, mean 7/2. Walk to 1 and go round it: 7/2.',
    },
    {
      know: 'Over a long walk, the first steps matter less and less.',
      ask: 'Why does only the best reachable cycle matter for the long-run average?',
      options: [
        { text: 'Any finite start is averaged away, and an infinite walk ends up repeating cycles', right: true, why: 'The best it can do per step is the best cycle mean it can reach.' },
        { text: 'Because the walk must return to 0', why: 'It need not; it goes to the best cycle and stays.' },
        { text: 'Because the heaviest edge is always on the best cycle', why: 'An edge can be heavy but on a cycle with light ones; the mean decides.' },
      ],
    },
    {
      know: 'Karp’s table has n + 1 rows of n vertices, each cell looking at the edges into a vertex.',
      ask: 'About how much work does Karp’s method take for n vertices and m edges?',
      options: [
        { text: 'About n · m steps', right: true, why: 'n + 1 rows, each relaxing every edge once.' },
        { text: 'About n! steps', why: 'That is listing cycles; the table avoids it.' },
        { text: 'About m steps', why: 'The edges are relaxed once per row, n times.' },
      ],
    },
  ],

  'inventory': [
    {
      know: 'C(j) = min over i of C(i) + K + h · Σ (t − i) d[t]: the last order is placed in period i.',
      ask: 'Demand 1 in each of 4 periods; an order costs 3, holding a unit for a period costs 1. The least total cost?',
      args: [[1, 1, 1, 1], 3, 1], answer: 8,
      misconceptions: [{ answer: 12, feedback: '12 orders every period. Two orders of 2 cost 3 + 1 each: 8.' }],
      explain: 'Order 2 in period 0 (3 + 1 held) and 2 in period 2 (3 + 1 held): 8. One order of 4 costs 3 + 6 = 9.',
    },
    {
      know: 'Wagner and Whitin showed that some best plan orders only when the stock has run out.',
      ask: 'Why can the table keep only “nothing left over” states?',
      options: [
        { text: 'Ordering while stock remains could be moved later without costing more, so some best plan orders only at empty stock', right: true, why: 'Then every plan splits into blocks, each covered by one order.' },
        { text: 'Because holding is free', why: 'Holding costs h per unit per period; the argument works for any h ≥ 0.' },
        { text: 'Because every period has demand', why: 'Periods with no demand are allowed; the argument doesn’t need demand.' },
      ],
    },
    {
      know: 'Each C(j) tries every earlier order period i.',
      ask: 'About how much work does the table take for T periods?',
      options: [
        { text: 'About T² steps', right: true, why: 'T cells, each trying up to T order periods, with holding added as i moves.' },
        { text: 'About 2^T steps', why: 'That is trying every set of order periods; the table shares them.' },
        { text: 'About T steps', why: 'Each cell tries every earlier order period, not one.' },
      ],
    },
  ],

  'optimal-stopping': [
    {
      know: 'V(1) = (m + 1)/2, and V(k) is the average over x of max(x, V(k − 1) − c).',
      ask: 'Two offers, each 1 to 6 with equal chance, free to look. The best expected offer taken? Type a fraction.',
      args: [2, 6, 0], answer: 17 / 4,
      misconceptions: [{ answer: 3.5, feedback: '7/2 takes the first offer always. Rejecting 1, 2 and 3 for the last offer’s 3.5 is better.' }],
      explain: 'Take a first offer of 4, 5 or 6; otherwise take the last, worth 3.5. (3 · 3.5 + 4 + 5 + 6) / 6 = 17/4.',
    },
    {
      know: 'Once an offer is seen, its value is known; the future is not.',
      ask: 'Why is the best rule a threshold: take an offer of at least V(k − 1) − c?',
      options: [
        { text: 'Continuing is worth the same whatever the current offer is, so take any offer worth more than that', right: true, why: 'The offers are independent, so the value of continuing doesn’t depend on x.' },
        { text: 'Because offers get worse over time', why: 'They don’t: every offer has the same distribution.' },
        { text: 'Because the best offer is always the last', why: 'The last offer is a random one; it is taken only because it must be.' },
      ],
    },
    {
      know: 'Each V(k) averages over the m possible offers.',
      ask: 'About how much work does it take for n offers of m values?',
      options: [
        { text: 'About n · m steps', right: true, why: 'n values of V, each an average over m offers.' },
        { text: 'About mⁿ steps', why: 'That is one per sequence of offers; V shares them.' },
        { text: 'About n steps', why: 'Each V averages over all m possible offers.' },
      ],
    },
  ],

  'resource-control': [
    {
      know: 'An attempt is worth p · (r + V(b − win)) + (1 − p) · V(b − lose); stopping is worth 0.',
      ask: '3 tokens. Attempt A always works, paying 2 and using 1 token. Attempt B works half the time, paying 7 and using 2, or fails using 1. The best expected total? Type a fraction.',
      args: [3, [[1, 1, 100, 2], [2, 1, 50, 7]]], answer: 27 / 4,
      misconceptions: [{ answer: 6, feedback: '6 uses A three times. B’s 7 is worth the risk when the tokens it leaves can still be used.' }],
      explain: 'V(1) = 2 (A). V(2) = max(A: 2 + 2, B: (7 + 0)/2 + 2/2) = 4.5. V(3) = max(A: 2 + 4.5, B: (7 + 2)/2 + 4.5/2) = max(6.5, 6.75) = 27/4.',
    },
    {
      know: 'A failure that keeps some tokens leaves a better future than one that uses them all.',
      ask: 'Why does the failure term read V(b − lose), not V(b − win)?',
      options: [
        { text: 'A failure uses lose tokens, so that many fewer are left, with their own value', right: true, why: 'Different outcomes, different states.' },
        { text: 'It makes no difference', why: 'It does whenever win ≠ lose: tokens left after a failure can buy more attempts.' },
        { text: 'Because failures are less likely', why: 'The chance is in the weight 1 − p; the state is about tokens.' },
      ],
    },
    {
      know: 'Each V(b) looks at every action once, and at stopping.',
      ask: 'About how much work does it take for B tokens and a actions?',
      options: [
        { text: 'About B · a steps', right: true, why: 'B values, each comparing a attempts and stopping.' },
        { text: 'About a^B steps', why: 'That is the tree of attempts and outcomes; V shares the token counts.' },
        { text: 'About B steps', why: 'Each value compares every action.' },
      ],
    },
  ],

  'continuous-state': [
    {
      know: 'V(t, x) = max over c of u[c] + V(t − 1) at (x − c) · g, read by linear interpolation.',
      ask: 'Grid 0, 1, 2; consuming 1 earns 4 and 2 earns 7; the rest shrinks to half. Two periods from stock 2: the best total?',
      args: [[0, 4, 7], [1, 2], 2, 2, 2], answer: 7,
      misconceptions: [{ answer: 8, feedback: '8 = 4 + 4 assumes the unit kept is still a whole unit next period. It shrinks to 1/2, worth half of V(1) = 4: 2.' }],
      explain: 'Consume 2 now: 7. Consume 1: 4, and the unit kept shrinks to 1/2, worth (0 + 4)/2 = 2: 6. Consume 0: stock 1 next, worth 4. Best 7.',
    },
    {
      know: 'Interpolation estimates the value between grid points from its two neighbours.',
      ask: 'Why does a finer grid usually help?',
      options: [
        { text: 'The interpolation error shrinks as the grid points get closer', right: true, why: 'Between nearby points a smooth value function is nearly straight.' },
        { text: 'It always gives the exact value', why: 'Only where the value function is straight between grid points; otherwise it is an estimate.' },
        { text: 'It doesn’t change the answer', why: 'Interpolated values depend on where the grid points are.' },
      ],
    },
    {
      know: 'Each grid point tries every consumption level.',
      ask: 'About how much work does it take for G grid points and T periods?',
      options: [
        { text: 'About T · G² steps', right: true, why: 'T rows of G points, each trying up to G consumption levels.' },
        { text: 'About G^T steps', why: 'That is the tree of choices; the grid shares the states.' },
        { text: 'About T · G steps', why: 'Each point compares every consumption level, not one.' },
      ],
    },
  ],

  'lqr': [
    {
      know: 'P ← q + a²P − (abP)² / (r + b²P), from P = qf; the answer is P after N steps.',
      ask: 'x′ = 2x + u, cost x² + u² each step and x² at the end, one step from x = 1. The least total cost?',
      args: [2, 1, 1, 1, 1, 1], answer: 3,
      misconceptions: [{ answer: 5, feedback: '5 uses no control: 1 + 2². Choosing u = −1 makes x′ = 1: 1 + 1 + 1 = 3.' }],
      explain: 'P = 1 + 4 · 1 − (2 · 1)² / (1 + 1) = 5 − 2 = 3, with u = −a b P x / (r + b² P) = −1.',
    },
    {
      know: 'Linear dynamics and quadratic costs make the cost-to-go a quadratic in x.',
      ask: 'Why is one number P enough to describe the cost-to-go?',
      options: [
        { text: 'Minimising a quadratic over u leaves a quadratic in x, so the form P x² is kept at every step', right: true, why: 'Induction from the final cost qf x².' },
        { text: 'Because x is always 1', why: 'x changes from step to step; the cost-to-go is P x² for every x.' },
        { text: 'Because the controls are whole numbers', why: 'The controls are real numbers here, chosen by completing the square.' },
      ],
    },
    {
      know: 'The best control turns out to be linear in the state x.',
      ask: 'What is the best control at a step, with P the cost-to-go of the next state?',
      options: [
        { text: 'u = −a b P x / (r + b² P)', right: true, why: 'Setting the derivative of r u² + P (a x + b u)² to zero.' },
        { text: 'u = −x', why: 'That would cancel x only when a = b = 1, ignoring the cost of u.' },
        { text: 'u = 0', why: 'Doing nothing ignores that a good control lowers future costs.' },
      ],
    },
  ],

  'pomdp': [
    {
      know: 'V(t, b) = max(run, repair, inspect), each its reward plus V(t − 1) at the new belief.',
      ask: 'One turn; the machine is good with chance 60%; readings are right 80% of the time. The best expected total?',
      args: [1, 60, 80], answer: 0,
      misconceptions: [{ answer: 1.2, feedback: '1.2 counts only the good case. Running a bad machine (40%) loses 3: 0.6 · 2 − 0.4 · 3 = 0.' }],
      explain: 'Run: 0.6 · 2 − 0.4 · 3 = 0. Repair: −1. Inspect: 0, with no turn left to use what it shows. Best 0.',
    },
    {
      know: 'An inspection earns nothing now but changes the belief.',
      ask: 'Why can inspecting be worth a turn?',
      options: [
        { text: 'It sorts the future: run when it looks good, repair when it looks bad', right: true, why: 'Better informed decisions later can be worth more than a turn of running now.' },
        { text: 'Because it makes the machine good', why: 'It only reads the state; repair changes it.' },
        { text: 'It never is', why: 'With enough turns left and an uncertain machine, information pays.' },
      ],
    },
    {
      know: 'The belief replaces the hidden state as the state of the DP.',
      ask: 'Why is the belief a good enough state?',
      options: [
        { text: 'Given the belief, the chances of every future reading and reward are fixed', right: true, why: 'So two histories with the same belief have the same best future.' },
        { text: 'Because the belief is the true state', why: 'It is a probability, not the state itself.' },
        { text: 'Because readings are always right', why: 'They are right only with chance a; the belief accounts for that.' },
      ],
    },
  ],
}
