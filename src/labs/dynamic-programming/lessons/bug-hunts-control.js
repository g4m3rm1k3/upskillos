// Bug hunts for the decision-process lessons (Specialist, control group). Format: bug-hunts.js. Each
// symptom is a small input where the buggy code and specialist-oracles.js disagree, found by a search of
// buggy code against the oracle; each symptom is also a case of its lesson's challenge.
const pair = (Python, JavaScript) => ({ Python, JavaScript })

export const CONTROL_HUNTS = {
  'bellman-principle': {
    know: 'The state is (vertex, coupon used). A free edge is only possible while the coupon is unused, and it moves the route into the “used” half of the states.',
    swap: pair(['            if not used and d < dist[v][1]:', '            if d < dist[v][1]:'], ['      if (!used && d < dist[v][1]) {', '      if (d < dist[v][1]) {']),
    symptom: { args: [3, [[1, 2, 1], [0, 1, 5]]], expected: 1, buggy: 0 },
    bug: 'The coupon can be used again',
    why: 'Without the check, a route that has already spent the coupon may take another free edge, so every edge can be free. The route 0 → 1 → 2 costs 5 + 1, and one free edge leaves 1, but {call} returned {got} instead of {want}: both edges free.',
    fix: 'Take a free edge only while the coupon is unused: if not used and ….',
    clues: ['Route 0 → 1 → 2 with edges 5 and 1, one free edge: what does it cost?', 'From which states may a free edge be taken?', 'What does “used” mean once it is 1?'],
    decoys: [[['dist = [[INF, INF] for _ in range(n)]', 'const dist = Array.from({ length: n }, () => [Infinity, Infinity])'], 'Two states per vertex. Right.'], [['if d + w < dist[v][used]:', 'if (d + w < dist[v][used]) {'], 'Pay for the edge, coupon unchanged. Right.'], [['best = min(dist[n - 1])', 'const best = Math.min(...dist[n - 1])'], 'Either coupon state at the end. Right.']],
  },

  'finite-mdp': {
    know: 'An action’s next state is drawn from trans[s][a], each entry equally likely. Its expected future is the average of V over those entries: divide by how many next states the action has.',
    swap: pair(['        V = [max(reward[s][a] + sum(V[x] for x in trans[s][a]) / len(trans[s][a]) for a in range(len(trans[s]))) for s in range(n)]', '        V = [max(reward[s][a] + sum(V[x] for x in trans[s][a]) / len(trans[s]) for a in range(len(trans[s]))) for s in range(n)]'], ['        const value = add(F(reward[s][a]), div(total, F(next.length)))', '        const value = add(F(reward[s][a]), div(total, F(acts.length)))']),
    symptom: { args: [[[[0], [0]]], [[1, 2]], 2], expected: '4/1', buggy: '3/1' },
    bug: 'The future is divided by the number of actions',
    why: 'Dividing by the number of actions instead of the action’s next states shrinks the future whenever they differ. One state with two actions, rewards 1 and 2, both staying put: two decisions earn 2 + 2 = 4, but the second one is halved, and {call} returned {got} instead of {want}.',
    fix: 'Average over the action’s own next states: / len(trans[s][a]).',
    clues: ['One state, rewards 1 and 2, two decisions: what is the best total?', 'After the first decision, what is the expected future?', 'What is the division by, and what should it be by?'],
    decoys: [[['V = [Fraction(0)] * n', 'let V = new Array(n).fill(F(0))'], 'Nothing left to decide: 0. Right.'], [['for _ in range(H):', 'for (let t = 0; t < H; t++) {'], 'One pass per decision. Right.'], [['return f"{V[0].numerator}/{V[0].denominator}"', 'return str(V[0])'], 'H decisions from state 0. Right.']],
  },

  'value-iteration': {
    know: 'A reward now is worth its full amount; a reward one step later is worth g of it. The update is reward + g · V(next): only the future is discounted.',
    swap: pair(['        V = [max(reward[s][a] + g * V[nxt[s][a]] for a in range(len(nxt[s]))) for s in range(len(nxt))]', '        V = [max(g * (reward[s][a] + V[nxt[s][a]]) for a in range(len(nxt[s]))) for s in range(len(nxt))]'], ['        const value = add(F(reward[s][a]), mul(g, V[to]))', '        const value = mul(g, add(F(reward[s][a]), V[to]))']),
    symptom: { args: [[[0]], [[1]], [1, 2], 3], expected: '7/4', buggy: '7/8' },
    bug: 'The reward now is discounted too',
    why: 'g · (reward + V) discounts the reward earned now as if it came a step later, halving every total here. One state paying 1 a step with g = 1/2: three steps are worth 1 + 1/2 + 1/4 = 7/4, but {call} returned {got} instead of {want}.',
    fix: 'Discount only the future: reward + g · V(next).',
    clues: ['One state, reward 1, g = 1/2: what are three steps worth?', 'Which rewards should be multiplied by g, and how many times?', 'Where are the brackets in the update?'],
    decoys: [[['g = Fraction(gamma[0], gamma[1])', 'const g = F(gamma[0], gamma[1])'], 'The discount p/q. Right.'], [['V = [Fraction(0)] * len(nxt)', 'let V = nxt.map(() => F(0))'], 'Start from 0. Right.'], [['return f"{V[0].numerator}/{V[0].denominator}"', 'return str(V[0])'], 'The value of state 0 after K updates. Right.']],
  },

  'policy-iteration': {
    know: 'Improvement picks, in each state, the action with the best reward + γ · average V(next): the action’s whole value, now and after.',
    swap: pair(['            best = max(range(len(trans[s])), key=q)', '            best = max(range(len(trans[s])), key=lambda a: reward[s][a])'], ['      for (let a = 1; a < acts.length; a++) if (more(q(a), q(best))) best = a', '      for (let a = 1; a < acts.length; a++) if (reward[s][a] > reward[s][best]) best = a']),
    symptom: { args: [[[[1]], [[1], [0, 1]]], [[3], [1, 1]], [2, 3]], expected: '6/1', buggy: '5/1' },
    bug: 'Improvement looks only at the reward now',
    why: 'Choosing by the immediate reward ignores where an action leads. In state 1 both actions pay 1, so the first is kept, and its alternative, which sometimes returns to the rewarding state 0, is never tried: the loop stops at a worse policy, and {call} returned {got} instead of {want}.',
    fix: 'Compare actions by their whole value: key=q.',
    clues: ['In state 1 both actions pay 1. Do they lead to the same places?', 'Which action does improvement consider in state 1?', 'What should the comparison be based on?'],
    decoys: [[['policy = [0] * n', 'policy = new Array(n).fill(0)'], 'Any starting policy. Right.'], [['A[i][x] -= g / len(nxt)', 'A[i][x] = sub(A[i][x], div(g, F(next.length)))'], 'The evaluation equations. Right.'], [['if q(best) > q(policy[s]):', 'if (more(q(best), q(policy[s]))) { policy[s] = best; changed = true }'], 'Change only on a strict improvement. Right.']],
  },

  'average-reward': {
    know: 'Karp’s formula takes, for each vertex v, the smallest (D(n, v) − D(k, v)) / (n − k) over k, and then the largest of those over v. The inner minimum is what isolates a cycle.',
    swap: pair(['        worst = min(Fraction(D[n][v] - D[k][v], n - k) for k in range(n) if D[k][v] is not None)', '        worst = max(Fraction(D[n][v] - D[k][v], n - k) for k in range(n) if D[k][v] is not None)'], ['      if (worst === null || more(worst, mean)) worst = mean', '      if (worst === null || more(mean, worst)) worst = mean']),
    symptom: { args: [4, [[0, 0, -4], [2, 0, 7], [0, 2, 3]]], expected: '5/1', buggy: '14/1' },
    bug: 'The inner minimum became a maximum',
    why: 'With a maximum inside, a walk’s gain over a short prefix is taken as a cycle mean even when it is just the walk’s start. Here the best cycle is 0 → 2 → 0, mean (3 + 7)/2 = 5, but {call} returned {got} instead of {want}: more than any edge, so no cycle can have that mean.',
    fix: 'Take the smallest ratio for each vertex: min(…).',
    clues: ['List the cycles reachable from 0 and their mean weights.', 'Can any cycle have a mean larger than its heaviest edge?', 'In Karp’s formula, which of the two is a minimum?'],
    decoys: [[['D[0][0] = 0', 'D[0][0] = 0'], 'No edges: only vertex 0. Right.'], [['D[k][v] = D[k - 1][u] + w', 'D[k][v] = D[k - 1][u] + w'], 'The heaviest walk one edge longer. Right.'], [['if best is None or worst > best:', 'if (best === null || more(worst, best)) best = worst'], 'The largest over the vertices. Right.']],
  },

  'inventory': {
    know: 'An order placed in period i covers periods i … j − 1; the demand of period t waits t − i periods, so moving the order one period earlier adds one period of holding for everything it covered so far.',
    swap: pair(['            hold += need * h', '            hold += d[i] * h'], ['      hold += need * h', '      hold += d[i] * h']),
    symptom: { args: [[1], 0, 1], expected: 0, buggy: 1 },
    bug: 'Each period’s own demand is charged for holding',
    why: 'The holding added is d[i] · h, the demand of the period where the order is placed, which is used at once and never held, instead of everything already covered, which now waits a period longer. One period with demand 1 and no setup cost should cost 0, but {call} returned {got} instead of {want}.',
    fix: 'Charge the units already covered: hold += need * h, before adding d[i].',
    clues: ['One period, demand 1, K = 0: what does it cost?', 'Which units wait when the order moves one period earlier?', 'What is need, at the moment hold is updated?'],
    decoys: [[['need += d[i]', 'need += d[i]'], 'Period i’s demand joins the order. Right.'], [['cost = C[i] + (K if need > 0 else 0) + hold', 'const cost = C[i] + (need > 0 ? K : 0) + hold'], 'An order of nothing is no order. Right.'], [['return C[T]', 'return C[T]'], 'All periods met. Right.']],
  },

  'optimal-stopping': {
    know: 'Seeing offer x, you take it or pay c to continue, which is worth V − c. Leaving out the c makes continuing look better than it is.',
    swap: pair(['        V = sum(max(Fraction(x), V - c) for x in range(1, m + 1)) / m', '        V = sum(max(Fraction(x), V) for x in range(1, m + 1)) / m'], ['    const wait = sub(V, F(c))', '    const wait = V']),
    symptom: { args: [2, 2, 1], expected: '3/2', buggy: '7/4' },
    bug: 'Continuing is free',
    why: 'Without subtracting c, every look is free, so the value only goes up with more offers. Two offers of 1 or 2 with c = 1: rejecting a 1 to see the last offer gains 1/2 on average but costs 1, so you take the first offer, worth 3/2. {call} returned {got} instead of {want}.',
    fix: 'Continuing costs c: compare x with V − c.',
    clues: ['Two offers, 1 or 2, c = 1: should you ever reject the first?', 'What is continuing worth, after paying?', 'Where is c used in the code?'],
    decoys: [[['V = Fraction(m + 1, 2)', 'let V = F(m + 1, 2)'], 'The last offer must be taken: its average. Right.'], [['for _ in range(n - 1):', 'for (let k = 1; k < n; k++) {'], 'One more offer in front each time. Right.'], [['return f"{V.numerator}/{V.denominator}"', 'return str(V)'], 'The value with every offer to come. Right.']],
  },

  'resource-control': {
    know: 'A success leaves b − win tokens and a failure b − lose. The two outcomes use different amounts, so they lead to different futures.',
    swap: pair(['                value = q * (r + V[b - win_cost]) + (1 - q) * V[b - lose_cost]', '                value = q * (r + V[b - win_cost]) + (1 - q) * V[b - win_cost]'], ['        const value = add(mul(q, add(F(r), V[b - winCost])), mul(sub(F(1), q), V[b - loseCost]))', '        const value = add(mul(q, add(F(r), V[b - winCost])), mul(sub(F(1), q), V[b - winCost]))']),
    symptom: { args: [3, [[2, 1, 25, 1]]], expected: '7/16', buggy: '1/4' },
    bug: 'A failure uses the success price',
    why: 'Charging a failure win tokens instead of lose tokens leaves too few for later attempts. With 3 tokens and attempts costing 2 on success but 1 on failure, a failure still leaves 2 tokens to try again, but the code thinks it leaves 1: {call} returned {got} instead of {want}.',
    fix: 'After a failure, b − lose tokens are left: V[b - lose_cost].',
    clues: ['3 tokens; an attempt uses 2 if it works and 1 if not. After one failure, how many are left?', 'Can you try again then?', 'Which count does the failure term read?'],
    decoys: [[['best = Fraction(0)', 'let best = F(0)'], 'Stopping is worth 0. Right.'], [['if win_cost <= b and lose_cost <= b:', 'if (winCost <= b && loseCost <= b) {'], 'Enough tokens for either outcome. Right.'], [['V = [Fraction(0)] * (B + 1)', 'const V = [F(0)]'], 'No tokens, nothing more. Right.']],
  },

  'continuous-state': {
    know: 'A point at the fraction w of the way from grid point lo to lo + 1 is closer to lo when w is small, so V(lo) gets the weight 1 − w and V(lo + 1) the weight w.',
    swap: pair(['            return V[lo] if w == 0 else (1 - w) * V[lo] + w * V[lo + 1]', '            return V[lo] if w == 0 else w * V[lo] + (1 - w) * V[lo + 1]'], ['      return w[0] === 0n ? old[Number(lo)] : add(mul(sub(F(1), w), old[Number(lo)]), mul(w, old[Number(lo) + 1]))', '      return w[0] === 0n ? old[Number(lo)] : add(mul(w, old[Number(lo)]), mul(sub(F(1), w), old[Number(lo) + 1]))']),
    symptom: { args: [[0, 0, 2], [5, 4], 2, 2, 1], expected: '1/2', buggy: '3/2' },
    bug: 'The interpolation weights are swapped',
    why: 'With the weights swapped, a point near lo takes most of its value from lo + 1. From 1 unit, keeping it grows to 5/4, a quarter of the way from 1 to 2, where the next value should be 3/4 · V(1) + 1/4 · V(2) = 1/2; the code reads 3/2, and {call} returned {got} instead of {want}.',
    fix: 'Weight the nearer point more: (1 − w) · V(lo) + w · V(lo + 1).',
    clues: ['Stock 1 grows to 5/4. Which grid point is it nearer?', 'With w = 1/4, which value should weigh 3/4?', 'Which weight does the code give V(lo)?'],
    decoys: [[['if y >= G:', 'if (!more(F(G), y)) return old[G]'], 'Above the grid: the value at G. Right.'], [['lo = y.numerator // y.denominator', 'const lo = y[0] / y[1], w = sub(y, F(lo))'], 'The grid point below, and how far past it. Right.'], [['V = [Fraction(0)] * (G + 1)', 'let V = new Array(G + 1).fill(F(0))'], 'No periods left: 0. Right.']],
  },

  'lqr': {
    know: 'The next state is a·x + b·u, so the cost-to-go there is P·(a x + b u)², whose x² part is a²·P. Squaring the next state squares a.',
    swap: pair(['        P = q + a * a * P - (a * b * P) ** 2 / (r + b * b * P)', '        P = q + a * P - (a * b * P) ** 2 / (r + b * b * P)'], ['    P = sub(add(F(q), mul(F(a * a), P)), div(mul(abP, abP), add(F(r), mul(F(b * b), P))))', '    P = sub(add(F(q), mul(F(a), P)), div(mul(abP, abP), add(F(r), mul(F(b * b), P))))']),
    symptom: { args: [2, 1, 0, 1, 2, 1], expected: '8/3', buggy: '-4/3' },
    bug: 'a is not squared',
    why: 'Using a·P instead of a²·P mixes up the cost-to-go of the next state. With a = 2 the true term is 4P, and the recursion can even give a negative cost, which is impossible for a sum of squares: {call} returned {got} instead of {want}.',
    fix: 'The x² part of P (a x + b u)² is a² P: q + a * a * P − ….',
    clues: ['Expand P (a x + b u)². What multiplies x²?', 'Can the total cost of squares be negative?', 'Compare the code’s first terms with the expansion.'],
    decoys: [[['P = Fraction(qf)', 'let P = F(qf)'], 'At the end, P = qf. Right.'], [['for _ in range(N):', 'for (let k = 0; k < N; k++) {'], 'One step back at a time. Right.'], [['return f"{P.numerator}/{P.denominator}"', 'return str(P)'], 'The cost from x = 1 is P. Right.']],
  },

  'pomdp': {
    know: 'The belief must follow everything that changes the hidden state, not only what is observed. Repair makes the machine good, so after it the belief is 1, whatever it was before.',
    swap: pair(['        repair = -1 + V(t - 1, Fraction(1))', '        repair = -1 + V(t - 1, b)'], ['    const repair = add(F(-1), V(t - 1, one))', '    const repair = add(F(-1), V(t - 1, b))']),
    symptom: { args: [4, 0, 80], expected: '5/1', buggy: '0/1' },
    bug: 'Repair does not change the belief',
    why: 'Keeping the belief after a repair treats repair as a cost with no effect. A machine known to be bad (prior 0) is worth repairing once and then running three times, 5 in all; but if repair changes nothing, the best is never to run it, and {call} returned {got} instead of {want}.',
    fix: 'After a repair the machine is good: continue from belief 1.',
    clues: ['The machine is surely bad and there are 4 turns: what is the best plan?', 'After a repair, how likely is it that the machine is good?', 'Which belief does the repair line continue from?'],
    decoys: [[['run = b * 2 - (1 - b) * 3 + V(t - 1, b)', 'const run = add(sub(mul(b, F(2)), mul(sub(one, b), F(3))), V(t - 1, b))'], 'Running teaches nothing: the belief stays. Right.'], [['good = b * a + (1 - b) * (1 - a)', 'const good = add(mul(b, a), mul(sub(one, b), sub(one, a)))'], 'The chance of a good reading. Right.'], [['inspect += good * V(t - 1, b * a / good)', 'inspect = add(inspect, mul(good, V(t - 1, div(mul(b, a), good))))'], 'Bayes’ rule after a good reading. Right.']],
  },
}
