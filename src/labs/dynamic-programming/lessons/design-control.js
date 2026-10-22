// "Design it yourself" for the decision-process lessons (Specialist, control group). Format: designs.js.
// Lessons with a live table ask for one of its cells; bellman-principle, policy-iteration and pomdp (no
// table) ask a second hand-solved case. Every number was printed by specialist-oracles.js or the trace
// before it was typed.

export const CONTROL_DESIGNS = {
  'bellman-principle': {
    problem: 'Find the cheapest route from 0 to n − 1 in a weighted directed graph when one edge of the route may be taken for free, for graphs of up to 20 000 vertices.',
    tryFirst: {
      prompt: 'Edges 0 → 1 costing 5 and 1 → 2 costing 3, and a coupon for one free edge. What does the cheapest route from 0 to 2 cost?',
      args: [3, [[0, 1, 5], [1, 2, 3]]], answer: 3,
      misconceptions: [{ answer: 5, feedback: 'The coupon should go on the dearer edge: free 5, pay 3.' }],
      explain: 'The only route is 0 → 1 → 2, costing 5 + 3; the coupon takes the 5 off: 3.',
    },
    steps: [
      { kind: 'state', ask: 'What is a state?', options: [
        { text: 'A vertex and whether the coupon is still unused', right: true, why: 'Two routes to the same vertex, one with the coupon left, have different futures.' },
        { text: 'A vertex alone', why: 'The cheapest way to a vertex may have spent the coupon, leaving nothing for a dear edge later.' },
        { text: 'A vertex and the cost so far', why: 'The cost is what is minimised; it doesn’t say whether the coupon can still be used.' },
      ] },
      { kind: 'split', ask: 'What is the last choice on a route into (v, used)?', options: [
        { text: 'The last edge, and whether it was the free one', right: true, why: 'Paying keeps the coupon state; the free edge moves from unused to used.' },
        { text: 'The edge with the coupon, chosen at the end', why: 'Choosing the free edge after the route is fixed is a different problem: the route itself may change with the coupon.' },
      ] },
      { kind: 'recurrence', ask: 'How does an edge u → v of weight w relax the states?', options: [
        { text: '(u, s) → (v, s) costs w; and (u, unused) → (v, used) costs 0', right: true, why: 'Pay the edge keeping the coupon state, or spend the coupon on it if it is still unused.' },
        { text: '(u, s) → (v, s) costs w; and (u, s) → (v, used) costs 0 for either s', why: 'From a used state the coupon is gone; this lets it be used again and again.' },
      ] },
      { kind: 'base', ask: 'Where does the search start?', options: [
        { text: '(0, unused) at cost 0', right: true, why: 'At the start nothing is paid and the coupon is in hand.' },
        { text: '(0, used) at cost 0', why: 'Then the coupon is spent before the first edge, and every route pays in full.' },
      ] },
      { kind: 'order', ask: 'In what order are the states settled?', options: [
        { text: 'By cost, cheapest first (Dijkstra), since no weight is negative', right: true, why: 'A state settled at the lowest cost can’t be improved later.' },
        { text: 'By vertex number', why: 'Edges can go from a larger vertex to a smaller one; there is no index order.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The cheaper of (n − 1, unused) and (n − 1, used)', right: true, why: 'Spending the coupon is allowed, not required.' },
        { text: '(n − 1, unused)', why: 'That is the cheapest route paying every edge; the coupon is never used.' },
      ] },
    ],
    apply: {
      prompt: 'Edges 0 → 1 costing 1, 1 → 3 costing 9, 0 → 2 costing 4, 2 → 3 costing 4; one free edge. The cheapest cost from 0 to 3?',
      args: [4, [[0, 1, 1], [1, 3, 9], [0, 2, 4], [2, 3, 4]]], answer: 1,
      misconceptions: [{ answer: 4, feedback: '4 puts the coupon on the cheapest route without it, 0 → 2 → 3. The route 0 → 1 → 3 with the 9 free costs only 1.' }],
      explain: 'Without the coupon 0 → 2 → 3 (8) beats 0 → 1 → 3 (10), but with the 9 free the second costs 1. The coupon changes which route is best.',
    },
  },

  'finite-mdp': {
    problem: 'Find the largest expected total reward of H decisions in a Markov decision process where actions lead to equally likely next states, exactly, for H up to 40.',
    tryFirst: {
      prompt: 'State 0: action A earns 1 and stays; action B earns 0 and moves to state 1. State 1 earns 5 and stays. The best total of 3 decisions from state 0?',
      args: [[[[0], [1]], [[1]]], [[1, 0], [5]], 3], answer: 10,
      misconceptions: [{ answer: 3, feedback: 'Taking 1 every time is greedy. Giving up 1 now to reach state 1 earns 5 twice.' }],
      explain: 'Move to state 1 (0), then earn 5 twice: 10. Staying earns only 3.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'V(t, s): the best expected total with t decisions left in state s', right: true, why: 'With a finite horizon, the best action can depend on how many decisions are left.' },
        { text: 'V(s): the best expected total from s', why: 'With 1 decision left the best is greedy; with 3 left, investing can be better. One value per state can’t hold both.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'The first action, then a chance next state', right: true, why: 'The action is chosen; the next state is drawn; the rest is the same problem with t − 1 left.' },
        { text: 'The first action and the next state, both chosen', why: 'The next state is chance: it must be averaged, not chosen.' },
      ] },
      { kind: 'recurrence', ask: 'How is V(t, s) found?', options: [
        { text: 'max over a of reward(s, a) + the average of V(t − 1, x) over the next states x', right: true, why: 'Best action now, expected value of the rest.' },
        { text: 'max over a of reward(s, a) + the largest V(t − 1, x) over the next states x', why: 'That pretends the luckiest next state always comes.' },
        { text: 'max over a of reward(s, a), summed over t steps', why: 'That ignores where actions lead, so investing in a better state is never seen.' },
      ] },
      { kind: 'base', ask: 'What holds with no decisions left?', options: [
        { text: 'V(0, s) = 0', right: true, why: 'No action is taken, so nothing more is earned.' },
        { text: 'V(0, s) = the best reward in s', why: 'With no decisions left no action is taken, so no reward.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells filled?', options: [
        { text: 't = 1, 2, …, H, all states for each t', right: true, why: 'V(t, ·) reads only V(t − 1, ·).' },
        { text: 'State by state, all t for state 0 first', why: 'V(t, 0) reads V(t − 1) of other states, not filled yet.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'V(H, 0)', right: true, why: 'All H decisions, starting from state 0.' },
        { text: 'The largest V(H, s)', why: 'The process starts in state 0, not in the best state.' },
      ] },
    ],
    apply: { cell: [2, 0], misconceptions: [
      { answer: 2, feedback: '2 is action 0, staying for 1 + V(1, 0). Action 1 averages V(1, 1) = 2 and V(1, 2) = 3: 2.5.' },
    ] },
  },

  'value-iteration': {
    problem: 'Apply K Bellman updates with discount p/q to a deterministic Markov decision process, starting from 0, and give the value of state 0 exactly.',
    tryFirst: {
      prompt: 'One state paying 1 every step, discount 1/2. After 3 updates from V = 0, what is V?',
      args: [[[0]], [[1]], [1, 2], 3], answer: 7 / 4,
      misconceptions: [{ answer: 3, feedback: '3 adds the rewards without discount. Each update halves what came before: 1 + 1/2 + 1/4.' }],
      explain: 'V₁ = 1, V₂ = 1 + V₁/2 = 3/2, V₃ = 1 + V₂/2 = 7/4.',
    },
    steps: [
      { kind: 'state', ask: 'What is kept between updates?', options: [
        { text: 'One value per state, V_k(s)', right: true, why: 'Each update reads the previous values of all states.' },
        { text: 'Only V(0)', why: 'V(0) depends on the states its actions lead to, so their values are needed too.' },
      ] },
      { kind: 'split', ask: 'What does one update consider for state s?', options: [
        { text: 'Each action: its reward now and the discounted old value of where it leads', right: true, why: 'That is the Bellman equation with the old values on the right.' },
        { text: 'Each action’s reward alone', why: 'Without the future, the values never change after the first update.' },
      ] },
      { kind: 'recurrence', ask: 'What is V_k(s), from the old values?', options: [
        { text: 'max over a of reward(s, a) + γ · V_{k−1}(next)', right: true, why: 'The reward now is worth its full amount; only the future is discounted.' },
        { text: 'max over a of γ · (reward(s, a) + V_{k−1}(next))', why: 'That discounts the reward earned now as if it came later.' },
        { text: 'max over a of reward(s, a) + V_{k−1}(next)', why: 'Without γ the values grow without limit and the update does not converge.' },
      ] },
      { kind: 'base', ask: 'Where does it start?', options: [
        { text: 'V₀(s) = 0 for every state', right: true, why: 'Any start works for the limit; 0 makes V_k the best total of k steps.' },
        { text: 'V₀(s) = the best reward in s', why: 'That works for the limit too, but V_k is then no longer the K-step total asked for.' },
      ] },
      { kind: 'order', ask: 'How are the states updated within one sweep?', options: [
        { text: 'All from the old values, then replaced together', right: true, why: 'That keeps V_k exactly the k-step value.' },
        { text: 'In place, each state using the newest values of the others', why: 'That converges too, but after K sweeps it gives different numbers from the K-step values asked for.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'V_K(0)', right: true, why: 'The value of state 0 after all K updates.' },
        { text: 'V_K(0) · (1 − γ)', why: 'That rescales the value to a per-step average; the question asks for the value itself.' },
      ] },
    ],
    apply: { cell: [3, 0], misconceptions: [
      { answer: 2.25, feedback: '2.25 is action 1, 0 + V₂(2)/2. Action 0 gives 1 + V₂(1)/2 = 4.25.' },
      { answer: 7.5, feedback: '7.5 leaves out the discount: 1 + V₂(1). The future is worth half: 1 + 6.5/2.' },
    ] },
  },

  'policy-iteration': {
    problem: 'Find the optimal discounted value of state 0 in a Markov decision process exactly, for up to 30 states, by alternating exact policy evaluation and improvement.',
    tryFirst: {
      prompt: 'Discount 1/2. State 0: action A earns 1 and stays; action B earns 0 and moves to state 1. State 1 earns 3 and stays. The optimal value of state 0?',
      args: [[[[0], [1]], [[1]]], [[1, 0], [3]], [1, 2]], answer: 3,
      misconceptions: [{ answer: 2, feedback: '2 is staying: 1 + 1/2 + 1/4 + … Moving to state 1 is worth 0 + (1/2) · 6 = 3.' }],
      explain: 'State 1 is worth 3 / (1 − 1/2) = 6. From state 0, staying is worth 1 / (1 − 1/2) = 2, moving 0 + 6/2 = 3.',
    },
    steps: [
      { kind: 'state', ask: 'What is kept between rounds?', options: [
        { text: 'A policy (one action per state) and its exact values', right: true, why: 'Evaluation gives the values; improvement changes the policy.' },
        { text: 'Only the policy, without its values', why: 'Improvement compares actions by their values; without them there is nothing to compare.' },
      ] },
      { kind: 'split', ask: 'What are the two steps of a round?', options: [
        { text: 'Evaluate the policy exactly, then improve every state greedily', right: true, why: 'Exact values make the improvement step sound.' },
        { text: 'Improve every state, then evaluate only state 0', why: 'Improvement needs the values of all states.' },
      ] },
      { kind: 'recurrence', ask: 'How is a policy evaluated?', options: [
        { text: 'Solve V = r + γ P V, a system of linear equations, exactly', right: true, why: 'With the actions fixed, the values satisfy these equations, and γ < 1 makes the solution unique.' },
        { text: 'V(s) = reward of its action + γ · V(next), filled in state order', why: 'States can lead back to each other, so no order has their values ready.' },
      ] },
      { kind: 'base', ask: 'Where does it start?', options: [
        { text: 'Any policy, such as action 0 everywhere', right: true, why: 'Every round improves or stops, so any start reaches the optimum.' },
        { text: 'The optimal policy, found first', why: 'Finding it is the whole problem.' },
      ] },
      { kind: 'order', ask: 'When does it stop?', options: [
        { text: 'When no state’s action changes, changing only on strict improvement', right: true, why: 'Then the values satisfy the optimality equations; changing on ties could cycle forever.' },
        { text: 'After one round of evaluation and improvement', why: 'One improvement can leave other states still improvable; it must repeat until nothing changes.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The last policy’s value at state 0', right: true, why: 'That policy is optimal, so its value is the answer.' },
        { text: 'The best reward in state 0 divided by 1 − γ', why: 'That assumes staying in state 0 forever, which need not be best.' },
      ] },
    ],
    apply: {
      prompt: 'Discount 2/3. State 0: A earns 0 → 1; B earns 2 → 0 or 1. State 1: A earns 4 → 0; B earns −1 and stays. The optimal value of state 0?',
      args: [[[[1], [0, 1]], [[0], [1]]], [[0, 2], [4, -1]], [2, 3]], answer: 15 / 2,
      misconceptions: [{ answer: 4.8, feedback: '24/5 is the starting policy, A everywhere. Improving state 0 to B is better: 15/2.' }],
      explain: 'With B in state 0 and A in state 1: V₀ = 2 + (2/3)(V₀ + V₁)/2 and V₁ = 4 + (2/3)V₀, which give V₀ = 15/2.',
    },
  },

  'average-reward': {
    problem: 'Find the best long-run reward per step of a walk from vertex 0 in a weighted directed graph: the largest mean weight of a reachable cycle, exactly, for up to 200 vertices.',
    tryFirst: {
      prompt: 'Edges 0 → 1 earning 1 and 1 → 0 earning 2. What is the long-run reward per step?',
      args: [2, [[0, 1, 1], [1, 0, 2]]], answer: 3 / 2,
      misconceptions: [
        { answer: 2, feedback: '2 is the best edge, but every lap uses both edges.' },
        { answer: 3, feedback: '3 is a lap’s total; per step it is half that.' },
      ],
      explain: 'The walk goes round 0 → 1 → 0 forever: 3 per two steps, 3/2 per step.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell of Karp’s table hold?', options: [
        { text: 'D(k, v): the heaviest walk of exactly k edges from 0 to v', right: true, why: 'Walks of n edges must repeat a vertex; comparing lengths isolates the cycles.' },
        { text: 'D(v): the heaviest walk from 0 to v', why: 'With a positive cycle there is no heaviest walk: it can loop forever.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'The last edge u → v of the walk', right: true, why: 'The rest is a walk of k − 1 edges to u.' },
        { text: 'Which cycle the walk will repeat', why: 'That is the answer being looked for, not a step of the walk.' },
      ] },
      { kind: 'recurrence', ask: 'How is D(k, v) found?', options: [
        { text: 'max over edges u → v of D(k − 1, u) + w', right: true, why: 'The heaviest k-edge walk ends with some edge into v.' },
        { text: 'max over edges u → v of D(k − 1, u) + w, divided by k', why: 'The averaging comes at the end, in Karp’s formula; D keeps totals.' },
      ] },
      { kind: 'base', ask: 'What is the base case?', options: [
        { text: 'D(0, 0) = 0, and D(0, v) = −∞ for other v', right: true, why: 'With no edges, the walk is at 0.' },
        { text: 'D(0, v) = 0 for every v', why: 'That starts walks at every vertex, including ones that can’t be reached from 0.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells filled?', options: [
        { text: 'k = 1, 2, …, n', right: true, why: 'D(k, ·) reads only D(k − 1, ·).' },
        { text: 'Vertex by vertex', why: 'D(k, v) reads other vertices at k − 1, not filled yet.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'max over v of min over k of (D(n, v) − D(k, v)) / (n − k)', right: true, why: 'Karp’s formula: the inner minimum isolates the cycle in an n-edge walk.' },
        { text: 'max over v of max over k of (D(n, v) − D(k, v)) / (n − k)', why: 'The maximum can pick the gain of a walk’s start, not of a cycle, and exceed every cycle mean.' },
      ] },
    ],
    apply: { cell: [2, 1], misconceptions: [
      { answer: 10, feedback: '10 uses D(1, 0) + 5, but there is no 1-edge walk to 0 (−∞). Only D(1, 1) + 1 = 6 is possible.' },
    ] },
  },

  'inventory': {
    problem: 'Meet a demand in every period from stock, paying a fixed cost per order and a cost per unit held overnight; find the least total cost for up to 1000 periods.',
    tryFirst: {
      prompt: 'Demand 2 and 2 in two periods; an order costs 10 and holding a unit for a period costs 1. The least total cost?',
      args: [[2, 2], 10, 1], answer: 12,
      misconceptions: [{ answer: 20, feedback: 'Ordering twice costs 20. One order of 4 holds 2 units for a period: 10 + 2.' }],
      explain: 'Order 4 in the first period (10) and hold 2 of them for one period (2): 12.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'C(j): the least cost of meeting periods 0 … j − 1 with nothing left over', right: true, why: 'Some best plan orders only when stock is empty, so the plan splits at those moments.' },
        { text: 'C(j): the least cost of meeting periods 0 … j − 1 with one order, placed in period 0', why: 'A single order holds late demand for a long time; splitting into several orders is often cheaper.' },
        { text: 'C(j): the least cost of the first j periods, ignoring stock', why: 'Stock carried over costs holding; ignoring it underprices early orders.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'The period i of the last order, which covers periods i … j − 1', right: true, why: 'Each choice leaves C(i) and one order’s cost.' },
        { text: 'How much to order in the last period', why: 'The last order may be placed earlier and cover several periods.' },
      ] },
      { kind: 'recurrence', ask: 'How is C(j) found?', options: [
        { text: 'min over i of C(i) + K + h · Σ (t − i) d[t] over t in i … j − 1', right: true, why: 'The order, then each unit held from period i until its period t.' },
        { text: 'min over i of C(i) + K + h · Σ d[t] over t in i … j − 1', why: 'That charges each unit one period, however long it waits.' },
        { text: 'C(j − 1) + K', why: 'Ordering every period ignores that one order can serve several.' },
      ] },
      { kind: 'base', ask: 'What is the base case?', options: [
        { text: 'C(0) = 0', right: true, why: 'Nothing to meet yet, so nothing is paid.' },
        { text: 'C(0) = K', why: 'No order has been placed yet; the first order is paid when it is chosen.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells filled?', options: [
        { text: 'j = 1, 2, …, T', right: true, why: 'C(j) reads C(i) for i < j.' },
        { text: 'j = T down to 1', why: 'C(T) needs the earlier C(i) first.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'C(T)', right: true, why: 'Every period met, with nothing left over.' },
        { text: 'The smallest C(j)', why: 'C(0) = 0 is smallest; every period must be met.' },
      ] },
    ],
    apply: { cell: [0, 3], misconceptions: [
      { answer: 16, feedback: '16 places the last order in period 2 (C(2) + 8). One order in period 0 covering everything costs 8 + 6 = 14.' },
    ] },
  },

  'optimal-stopping': {
    problem: 'Offers arrive one at a time; take one and stop, or pay to see the next; the last must be taken. Find the best expected payoff exactly, for up to 30 offers.',
    tryFirst: {
      prompt: 'Two offers, each 1 or 2 with equal chance, free to look. The best expected offer taken?',
      args: [2, 2, 0], answer: 7 / 4,
      misconceptions: [{ answer: 1.5, feedback: '3/2 always takes the first offer. Rejecting a 1 to see the second is better on average.' }],
      explain: 'Take a first offer of 2; reject a 1 and take the second, worth 3/2 on average. (2 + 3/2) / 2 = 7/4.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'V(k): the expected payoff with k offers still to come, before seeing the next', right: true, why: 'The offers are independent, so the past doesn’t change the future.' },
        { text: 'V(x): the payoff given only the current offer x', why: 'How many offers are left changes whether waiting is worth it.' },
        { text: 'The best offer seen so far', why: 'A rejected offer can’t be taken back, so the best seen so far is not available.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'Take the offer just seen, or pay c to continue', right: true, why: 'Those are the only two moves.' },
        { text: 'Which of the offers seen so far to take', why: 'Rejected offers are gone; only the current one can be taken.' },
      ] },
      { kind: 'recurrence', ask: 'How is V(k) found?', options: [
        { text: 'The average over x of max(x, V(k − 1) − c)', right: true, why: 'For each offer, the better of taking it and continuing, before knowing which comes.' },
        { text: 'The average over x of max(x, V(k − 1))', why: 'Continuing costs c; leaving it out overvalues waiting.' },
        { text: 'max(the average offer, V(k − 1) − c)', why: 'The decision is made after seeing the offer, so the max goes inside the average.' },
      ] },
      { kind: 'base', ask: 'What is the base case?', options: [
        { text: 'V(1) = (m + 1) / 2: the last offer must be taken', right: true, why: 'No choice is left: its average.' },
        { text: 'V(1) = m: wait for the best', why: 'There is nothing to wait for; the last offer is what it is.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells filled?', options: [
        { text: 'k = 1, 2, …, n', right: true, why: 'V(k) reads V(k − 1), filled just before it.' },
        { text: 'k = n down to 1', why: 'V(n) needs V(n − 1) first.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'V(n)', right: true, why: 'All n offers still to come, at the start.' },
        { text: 'The largest offer, m', why: 'The best offer may never come; V(n) is what can be expected.' },
      ] },
    ],
    apply: { cell: [0, 1], misconceptions: [
      { answer: 3.5, feedback: '3.5 is V(1), the last offer. With two to come, reject first offers of 1 to 3: (3 · 3.5 + 4 + 5 + 6) / 6 = 4.25.' },
    ] },
  },

  'resource-control': {
    problem: 'Spend B tokens on attempts that succeed by chance and use different numbers of tokens on success and failure; find the best expected total exactly, for B up to 40.',
    tryFirst: {
      prompt: '2 tokens. An attempt works half the time, paying 10 and using 2 tokens; a failure uses 1. An attempt needs 2 tokens. The best expected total?',
      args: [2, [[2, 1, 50, 10]]], answer: 5,
      misconceptions: [{ answer: 7.5, feedback: 'After a failure 1 token is left, too few for another attempt, which needs 2.' }],
      explain: 'One attempt: half the time 10, half the time a failure leaving 1 token, which can’t buy another attempt. 5.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'V(b): the best expected total with b tokens left', right: true, why: 'What can still be done depends only on the tokens.' },
        { text: 'V(b, number of successes so far)', why: 'Past successes are already earned; they don’t change what is possible next.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'Stop, or which attempt to make next', right: true, why: 'Then chance decides between success and failure.' },
        { text: 'Which attempt to make and whether it succeeds', why: 'Success is chance, not a choice: it must be averaged.' },
      ] },
      { kind: 'recurrence', ask: 'What is an attempt [win, lose, p, r] worth with b tokens?', options: [
        { text: 'p · (r + V(b − win)) + (1 − p) · V(b − lose)', right: true, why: 'Each outcome leaves its own number of tokens.' },
        { text: 'p · (r + V(b − win)) + (1 − p) · V(b − win)', why: 'A failure uses lose tokens, not win; charging win leaves too few for later.' },
        { text: 'p · r + V(b − win)', why: 'That charges the success price on failure too and ignores that a failure keeps more tokens.' },
      ] },
      { kind: 'base', ask: 'What is the base case?', options: [
        { text: 'V(0) = 0, and stopping is worth 0 at any b', right: true, why: 'With nothing affordable, nothing more is earned.' },
        { text: 'V(b) = 0 only for b = 0', why: 'Stopping must be allowed everywhere, or a bad attempt could be forced.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells filled?', options: [
        { text: 'b = 1, 2, …, B', right: true, why: 'Every attempt uses at least one token, so V(b) reads smaller counts.' },
        { text: 'b = B down to 1', why: 'V(B) needs smaller counts first.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'V(B)', right: true, why: 'All B tokens still to spend, at the start.' },
        { text: 'B times the best attempt’s expected payoff per token', why: 'Leftover tokens and failure costs make that wrong; the DP accounts for both.' },
      ] },
    ],
    apply: { cell: [0, 2], misconceptions: [
      { answer: 1.5, feedback: '1.5 is attempt B. Attempt A: 50% · (10 + V(0)) + 50% · V(1) = 5 + 0.375 = 5.375.' },
      { answer: 5, feedback: '5 ignores what a failure leaves: 1 token, worth V(1) = 0.75, half the time.' },
    ] },
  },

  'continuous-state': {
    problem: 'Consume from a stock that grows by a fraction each period, with values kept only on a grid and read between grid points by linear interpolation; find the best total exactly.',
    tryFirst: {
      prompt: 'Grid 0, 1, 2; consuming 1 earns 3 and 2 earns 5; the rest grows by 3/2. Two periods from stock 2: the best total?',
      args: [[0, 3, 5], [3, 2], 2, 2, 2], answer: 7,
      misconceptions: [{ answer: 8, feedback: 'Consuming 1 leaves 1, which grows to 1.5: halfway between 1 and 2, worth (3 + 5)/2 = 4, not 5.' }],
      explain: 'Consume 1 (3), keep 1, which grows to 1.5; next period that is worth half of V(1) = 3 plus half of V(2) = 5: 4. Total 7, more than consuming 2 now (5).',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'V(t, x): the best total with t periods left, at grid stock x', right: true, why: 'The continuous stock is represented by its values on the grid.' },
        { text: 'V(t, y) for every real stock y', why: 'There are infinitely many; the grid and interpolation make it finite.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'How much to consume now', right: true, why: 'Then the rest grows and the problem repeats with one period less.' },
        { text: 'Which grid point the stock will be at next', why: 'The next stock follows from the choice; it usually lies between grid points.' },
      ] },
      { kind: 'recurrence', ask: 'How is V(t, x) found?', options: [
        { text: 'max over c of u[c] + V(t − 1) at (x − c) · g, by linear interpolation', right: true, why: 'The next stock is read between its two grid neighbours.' },
        { text: 'max over c of u[c] + V(t − 1) at the grid point nearest (x − c) · g', why: 'Rounding is another scheme, but it gives different numbers from the interpolated values asked for.' },
        { text: 'max over c of u[c] + V(t − 1, x − c)', why: 'That forgets that the stock kept grows by g.' },
      ] },
      { kind: 'base', ask: 'What are the base and boundary rules?', options: [
        { text: 'V(0, x) = 0; above G, the value at G', right: true, why: 'No periods left, nothing earned; and a rule for leaving the grid must be stated.' },
        { text: 'V(0, x) = u[x]: consume everything at the end', why: 'With no periods left nothing more is consumed.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells filled?', options: [
        { text: 't = 1, 2, …, T, every grid point for each t', right: true, why: 'Row t reads only row t − 1.' },
        { text: 'Grid point by grid point', why: 'A point reads others in the row before, possibly not filled yet.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'V(T, x0)', right: true, why: 'T periods from the starting stock.' },
        { text: 'V(T, G)', why: 'That starts from a full grid, not from x0.' },
      ] },
    ],
    apply: { cell: [2, 1], misconceptions: [
      { answer: 5, feedback: '5 consumes the unit now. Keeping it grows it to 1.25, worth 0.75 · V(1,1) + 0.25 · V(1,2) = 6.' },
    ] },
  },

  'lqr': {
    problem: 'Steer x′ = a x + b u from x = 1 for N steps, paying q x² + r u² each step and qf x² at the end; find the least total cost exactly.',
    tryFirst: {
      prompt: 'One step, x′ = x + u, cost x² + u² now and nothing at the end, from x = 1. The least cost?',
      args: [1, 1, 1, 1, 0, 1], answer: 1,
      misconceptions: [{ answer: 0, feedback: 'The first step costs q · x² = 1 whatever u is; u = 0 adds nothing more.' }],
      explain: 'x = 1 costs 1 now; the end costs nothing, so u = 0 is best: 1.',
    },
    steps: [
      { kind: 'state', ask: 'What represents the cost-to-go?', options: [
        { text: 'One number P with cost-to-go P · x²', right: true, why: 'Quadratic costs and linear dynamics keep the cost-to-go a multiple of x².' },
        { text: 'A table of the cost-to-go at many values of x', why: 'That approximates on a grid; the quadratic form is exact with one number.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'The control u at the current step', right: true, why: 'Then the next state is a x + b u, with cost-to-go P x′².' },
        { text: 'The whole sequence of controls at once', why: 'That is the batch problem; the recursion chooses one u at a time.' },
      ] },
      { kind: 'recurrence', ask: 'How is P updated one step back?', options: [
        { text: 'P ← q + a²P − (abP)² / (r + b²P)', right: true, why: 'Minimising q x² + r u² + P (a x + b u)² over u gives this.' },
        { text: 'P ← q + aP − (abP)² / (r + b²P)', why: 'The next state is squared, so a is squared too.' },
        { text: 'P ← q + a²P', why: 'That uses no control at all; choosing u lowers the cost.' },
      ] },
      { kind: 'base', ask: 'What is the base case?', options: [
        { text: 'P = qf at the end', right: true, why: 'The final state costs qf x², so P starts at qf.' },
        { text: 'P = q at the end', why: 'The last state costs qf, not q.' },
      ] },
      { kind: 'order', ask: 'In what order is P computed?', options: [
        { text: 'From the end back, N times', right: true, why: 'Each step needs the cost-to-go after it.' },
        { text: 'From the start forward', why: 'The cost-to-go depends on what comes later.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'P after N steps back, since x = 1', right: true, why: 'The cost from x = 1 is P · 1².' },
        { text: 'The smallest P seen', why: 'Only the P for all N steps is the cost from the start.' },
      ] },
    ],
    apply: { cell: [0, 3], misconceptions: [
      { answer: 2.5, feedback: '2.5 is 1 + P(2), no control. The control removes (P(2))² / (1 + P(2)) = 0.9: 1.6.' },
    ] },
  },

  'pomdp': {
    problem: 'A machine is good or bad, hidden; each turn run it, repair it, or inspect it with a noisy reading. Find the best expected total exactly, for up to 30 turns.',
    tryFirst: {
      prompt: 'One turn, the machine is surely good. Run earns 2 if good and −3 if bad; repair costs 1; inspect earns 0. The best expected total?',
      args: [1, 100, 80], answer: 2,
      misconceptions: [{ answer: 0, feedback: 'The machine is surely good: running earns 2.' }],
      explain: 'With the machine certainly good, run it: 2.',
    },
    steps: [
      { kind: 'state', ask: 'What is the state of the DP?', options: [
        { text: 'The belief b, the chance that the machine is good, and the turns left', right: true, why: 'The hidden state is unknown, but b sums up everything seen.' },
        { text: 'The machine’s true state', why: 'It is hidden: decisions can only depend on what is known.' },
        { text: 'The last reading only', why: 'Earlier readings and the prior still count: two good readings are stronger evidence than one.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'Run, repair or inspect; for inspect, then a chance reading', right: true, why: 'The action is chosen; the reading is chance.' },
        { text: 'Run or repair, choosing according to the true state', why: 'The true state is not known when choosing.' },
      ] },
      { kind: 'recurrence', ask: 'How does a “good” reading change b, with readings right with chance a?', options: [
        { text: 'b′ = b·a / (b·a + (1 − b)(1 − a))', right: true, why: 'Bayes’ rule: the chance of good and reads good, over the chance of reading good.' },
        { text: 'b′ = b·a', why: 'Without dividing by the reading’s chance the result is not a probability.' },
        { text: 'b′ = a', why: 'The prior matters: a machine that is rarely good stays doubtful after one good reading.' },
      ] },
      { kind: 'base', ask: 'What is the base case?', options: [
        { text: 'V(0, b) = 0', right: true, why: 'No turns left, so nothing more is earned.' },
        { text: 'V(0, b) = 2b − 3(1 − b)', why: 'With no turns left the machine is not run again.' },
      ] },
      { kind: 'order', ask: 'How are the values computed?', options: [
        { text: 'Recursively over (turns left, belief), storing each value', right: true, why: 'The same beliefs come up by many histories; the store shares them.' },
        { text: 'On a fixed grid of beliefs, all at once', why: 'That approximates; the beliefs that actually occur are exact fractions, and only those are needed.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'V(H, prior)', right: true, why: 'All turns, from the prior belief.' },
        { text: 'V(H, 1)', why: 'That assumes the machine starts good.' },
      ] },
    ],
    apply: {
      prompt: 'Two turns, the machine is good with chance 50%, readings right 90%. The best expected total?',
      args: [2, 50, 90], answer: 1,
      misconceptions: [{ answer: 0.75, feedback: 'Inspecting, then running after a good reading, earns 3/4. Repairing first and then running earns −1 + 2 = 1.' }],
      explain: 'Repair (−1) makes the machine good; then run (2): 1. Inspecting first earns only 3/4: after a good reading running is worth 1.5, after a bad one nothing is worth doing.',
    },
  },
}
