// For each line that does arithmetic: the same arithmetic with this step's numbers (`calc`), and for
// the lines of the main loop, which part of the agent-environment loop it is (`phase`).
// calc(v, C) gets the running function's variables v (values before the line runs) and the
// program's constants C, and returns [the sum written out, its result]. trace.test.js runs both
// programs and checks every result against what the line actually produced.
const s = x => typeof x === 'number' ? (x < 0 ? `(${fmt(x)})` : fmt(x)) : Array.isArray(x) ? `[${x.map(fmt).join(', ')}]` : String(x)
const fmt = x => typeof x !== 'number' ? String(x) : Number.isInteger(x) ? String(x) : Math.abs(x) < 1e-4 && x !== 0 ? x.toExponential(2) : x.toFixed(4)
const next = seed => (1664525 * seed + 1013904223) % 4294967296
// What random(data) will return next, without changing the seed: random() is deterministic.
const peek = (data, k = 1) => { let seed = data.seed; for (let i = 0; i < k; i++) seed = next(seed); return seed / 4294967296 }
const uniform = (v, k) => { const u = peek(v.data, k); return [`u = ${fmt(u)}:  ${fmt(u)} × 0.1 − 0.05`, u * 0.1 - 0.05] }

const cart = {
  resetCart: [
    { has: 'const x = random(data)', calc: v => uniform(v, 1) },
    { has: 'const velocity = random(data)', calc: v => uniform(v, 1) },
    { has: 'const angle = random(data)', calc: v => uniform(v, 1) },
    { has: 'const spin = random(data)', calc: v => uniform(v, 1) },
  ],
  stepCart: [
    { has: 'const force = action', calc: (v, C) => [`action is ${v.action}, so ${v.action === 1 ? `+${C.FORCE}` : `−${C.FORCE}`}`, v.action === 1 ? C.FORCE : -C.FORCE] },
    { has: 'const sin = Math.sin(angle)', calc: v => [`sin(${s(v.angle)})`, Math.sin(v.angle)] },
    { has: 'const cos = Math.cos(angle)', calc: v => [`cos(${s(v.angle)})`, Math.cos(v.angle)] },
    { has: 'const temp =', calc: (v, C) => [`(${s(v.force)} + ${C.POLE_MASS} × ${C.HALF_LENGTH} × ${s(v.spin)} × ${s(v.spin)} × ${s(v.sin)}) / ${fmt(C.TOTAL_MASS)}`, (v.force + C.POLE_MASS * C.HALF_LENGTH * v.spin * v.spin * v.sin) / C.TOTAL_MASS] },
    { has: 'const angularAcceleration =', calc: (v, C) => [`(${C.GRAVITY} × ${s(v.sin)} − ${s(v.cos)} × ${s(v.temp)}) / (${C.HALF_LENGTH} × (4/3 − ${C.POLE_MASS} × ${s(v.cos)} × ${s(v.cos)} / ${fmt(C.TOTAL_MASS)}))`, (C.GRAVITY * v.sin - v.cos * v.temp) / (C.HALF_LENGTH * (4 / 3 - C.POLE_MASS * v.cos * v.cos / C.TOTAL_MASS))] },
    { has: 'const acceleration =', calc: (v, C) => [`${s(v.temp)} − ${C.POLE_MASS} × ${C.HALF_LENGTH} × ${s(v.angularAcceleration)} × ${s(v.cos)} / ${fmt(C.TOTAL_MASS)}`, v.temp - C.POLE_MASS * C.HALF_LENGTH * v.angularAcceleration * v.cos / C.TOTAL_MASS] },
    { has: 'const nextX = x + TAU * velocity', calc: (v, C) => [`${s(v.x)} + ${C.TAU} × ${s(v.velocity)}`, v.x + C.TAU * v.velocity] },
    { has: 'const nextVelocity =', calc: (v, C) => [`${s(v.velocity)} + ${C.TAU} × ${s(v.acceleration)}`, v.velocity + C.TAU * v.acceleration] },
    { has: 'const nextAngle =', calc: (v, C) => [`${s(v.angle)} + ${C.TAU} × ${s(v.spin)}`, v.angle + C.TAU * v.spin] },
    { has: 'const nextSpin =', calc: (v, C) => [`${s(v.spin)} + ${C.TAU} × ${s(v.angularAcceleration)}`, v.spin + C.TAU * v.angularAcceleration] },
    { has: 'const terminated =', calc: v => [`|${s(v.nextX)}| > 2.4  or  |${s(v.nextAngle)}| > 0.2094`, Math.abs(v.nextX) > 2.4 || Math.abs(v.nextAngle) > Math.PI / 15] },
    { has: 'const truncated = steps >= 500', calc: v => [`${v.steps} ≥ 500`, v.steps >= 500] },
  ],
}

export const EXTRAS = {
  q: {
    ...cart,
    run: [
      { has: 'data.state = resetCart(data)', phase: 'observe' },
      { has: 'while (true)', phase: 'repeat' },
      { has: 'const row = stateToRow(data.state)', phase: 'represent' },
      { has: 'const action = chooseAction(data, row)', phase: 'choose' },
      { has: 'const result = stepCart(', phase: 'act' },
      { has: 'learn(data, row, action, result)', phase: 'learn' },
      { has: 'data.steps = data.steps + 1', phase: 'repeat', calc: v => [`${v.data.steps} + 1`, v.data.steps + 1] },
      { has: 'data.total = data.total + result.reward', phase: 'repeat', calc: v => [`${v.data.total} + ${v.result.reward}`, v.data.total + v.result.reward] },
      { has: 'if (result.terminated || result.truncated)', phase: 'repeat', calc: v => [`${v.result.terminated} or ${v.result.truncated}`, v.result.terminated || v.result.truncated] },
      { has: 'data.episode = data.episode + 1', phase: 'repeat', calc: v => [`${v.data.episode} + 1`, v.data.episode + 1] },
      { has: 'data.steps = 0', phase: 'repeat' },
      { has: 'data.total = 0', phase: 'repeat' },
      { has: 'data.state = resetCart(data)', phase: 'observe' },
      { has: 'data.state = result.nextState', phase: 'repeat' },
    ],
    stateToRow: [
      { has: 'row = row * (EDGES[i].length + 1) + bin', calc: (v, C) => [`${v.row} × ${C.EDGES[v.i].length + 1} + ${v.bin}`, v.row * (C.EDGES[v.i].length + 1) + v.bin] },
    ],
    countEdgesBelow: [
      { has: 'if (value >= edge)', calc: v => [`${s(v.value)} ≥ ${s(v.edge)}`, v.value >= v.edge] },
      { has: 'count = count + 1', calc: v => [`${v.count} + 1`, v.count + 1] },
    ],
    chooseAction: [
      { has: 'const values = data.Q[row]', calc: v => [`Q[${v.row}]`, v.data.Q[v.row]] },
      { has: 'const roll = random(data)', calc: v => ['the next random number', peek(v.data)] },
      { has: 'if (roll < data.epsilon)', calc: v => [`${s(v.roll)} < ${s(v.data.epsilon)}`, v.roll < v.data.epsilon] },
      { has: 'const pick = random(data)', calc: v => ['the next random number', peek(v.data)] },
      { has: 'return Math.floor(pick * values.length)', calc: v => [`floor(${s(v.pick)} × ${v.values.length})`, Math.floor(v.pick * v.values.length)] },
    ],
    argmax: [
      { has: 'if (values[a] > values[best])', calc: v => [`values[${v.a}] > values[${v.best}]:  ${s(v.values[v.a])} > ${s(v.values[v.best])}`, v.values[v.a] > v.values[v.best]] },
    ],
    learn: [
      { has: 'const old = data.Q[row][action]', calc: v => [`Q[${v.row}][${v.action}]`, v.data.Q[v.row][v.action]] },
      { has: 'const future =', calc: v => v.result.terminated ? ['terminated is true, so 0', 0] : [`max(${v.data.Q[v.nextRow].map(s).join(', ')})`, Math.max(...v.data.Q[v.nextRow])] },
      { has: 'const target =', calc: v => [`${s(v.result.reward)} + ${s(v.data.gamma)} × ${s(v.future)}`, v.result.reward + v.data.gamma * v.future] },
      { has: 'const error = target - old', calc: v => [`${s(v.target)} − ${s(v.old)}`, v.target - v.old] },
      { has: 'if (data.learning)', calc: v => [`learning is ${v.data.learning}`, v.data.learning] },
      { has: 'data.Q[row][action] = old + data.alpha * error', calc: v => [`${s(v.old)} + ${s(v.data.alpha)} × ${s(v.error)}`, v.old + v.data.alpha * v.error] },
    ],
  },
  a2c: {
    ...cart,
    run: [
      { has: 'for (const world of data.worlds)', phase: 'observe' },
      { has: 'world.state = resetCart(data)', phase: 'observe' },
      { has: 'world.steps = 0', phase: 'observe' },
      { has: 'while (true)', phase: 'repeat' },
      { has: 'const batch = []', phase: 'remember' },
      { has: 'for (const world of data.worlds)', phase: 'choose' },
      { has: 'const trajectory = playSteps(data, world)', phase: 'choose' },
      { has: 'batch.push(trajectory)', phase: 'remember' },
      { has: 'if (data.learning)', phase: 'learn' },
      { has: 'updateWeights(data, batch)', phase: 'learn' },
    ],
    playSteps: [
      { has: 'const trajectory = []', phase: 'remember' },
      { has: 'for (let i = 0; i < STEPS_PER_WORLD; i++)', phase: 'choose' },
      { has: 'const probRight = actorProbability', phase: 'choose' },
      { has: 'const roll = random(data)', phase: 'choose', calc: v => ['the next random number', peek(v.data)] },
      { has: 'let action = probRight >= 0.5 ? 1 : 0', phase: 'choose', calc: v => [`${s(v.probRight)} ≥ 0.5 ? 1 : 0`, v.probRight >= 0.5 ? 1 : 0] },
      { has: 'if (data.learning)', phase: 'choose', calc: v => [`learning is ${v.data.learning}`, v.data.learning] },
      { has: 'action = roll < probRight ? 1 : 0', phase: 'choose', calc: v => [`${s(v.roll)} < ${s(v.probRight)} ? 1 : 0`, v.roll < v.probRight ? 1 : 0] },
      { has: 'const result = stepCart(', phase: 'act' },
      { has: 'trajectory.push({', phase: 'remember' },
      { has: 'world.steps = world.steps + 1', phase: 'repeat', calc: v => [`${v.world.steps} + 1`, v.world.steps + 1] },
      { has: 'if (result.terminated || result.truncated)', phase: 'repeat', calc: v => [`${v.result.terminated} or ${v.result.truncated}`, v.result.terminated || v.result.truncated] },
      { has: 'world.state = resetCart(data)', phase: 'observe' },
      { has: 'world.steps = 0', phase: 'repeat' },
      { has: 'world.state = result.nextState', phase: 'repeat' },
      { has: 'return trajectory', phase: 'remember' },
    ],
    features: [
      { has: 'return [state[0] / 2.4', calc: v => [`[${s(v.state[0])}/2.4, ${s(v.state[1])}/2, ${s(v.state[2])}/0.21, ${s(v.state[3])}/2, 1]`, [v.state[0] / 2.4, v.state[1] / 2, v.state[2] / 0.21, v.state[3] / 2, 1]] },
    ],
    dot: [
      { has: 'sum = sum + weights[j] * values[j]', calc: v => [`${s(v.sum)} + ${s(v.weights[v.j])} × ${s(v.values[v.j])}`, v.sum + v.weights[v.j] * v.values[v.j]] },
    ],
    sigmoid: [
      { has: 'const clamped =', calc: v => [`keep ${s(v.z)} between −30 and 30`, Math.max(-30, Math.min(30, v.z))] },
      { has: 'return 1 / (1 + Math.exp(-clamped))', calc: v => [`1 / (1 + e^(−${s(v.clamped)})) = 1 / (1 + ${fmt(Math.exp(-v.clamped))})`, 1 / (1 + Math.exp(-v.clamped))] },
    ],
    criticFeatures: [
      { has: 'return [1, x, v, a, w', calc: v => [`[1, x, v, a, w, x², v², a², w², a·w, x·v] with x=${s(v.x)}, v=${s(v.v)}, a=${s(v.a)}, w=${s(v.w)}`, [1, v.x, v.v, v.a, v.w, v.x * v.x, v.v * v.v, v.a * v.a, v.w * v.w, v.a * v.w, v.x * v.v]] },
    ],
    nStepTargets: [
      { has: 'const last = trajectory[trajectory.length - 1]', calc: v => [`trajectory[${v.trajectory.length - 1}]`, v.trajectory[v.trajectory.length - 1]] },
      { has: 'if (t.terminated)', calc: v => [`terminated is ${v.t.terminated}`, v.t.terminated] },
      { has: 'if (t.truncated && !t.terminated)', calc: v => [`truncated ${v.t.truncated} and not terminated ${!v.t.terminated}`, v.t.truncated && !v.t.terminated] },
      { has: 'total = t.reward + data.gamma * total', calc: v => [`${s(v.t.reward)} + ${s(v.data.gamma)} × ${s(v.total)}`, v.t.reward + v.data.gamma * v.total] },
    ],
    updateWeights: [
      { has: 'const advantage = targets[i] - value', calc: v => [`${s(v.targets[v.i])} − ${s(v.value)}`, v.targets[v.i] - v.value] },
      { has: 'const logProbSlope = t.action - probRight', calc: v => [`${v.t.action} − ${s(v.probRight)}`, v.t.action - v.probRight] },
      { has: 'const entropySlope =', calc: v => [`−ln(${s(v.probRight)} / ${s(1 - v.probRight)}) × ${s(v.probRight)} × ${s(1 - v.probRight)}`, -Math.log(v.probRight / (1 - v.probRight)) * v.probRight * (1 - v.probRight)] },
      { has: 'actorSlope[j] = actorSlope[j] +', calc: v => [`${s(v.actorSlope[v.j])} + (${s(v.logProbSlope)} × ${s(v.advantage)} + ${s(v.data.entropyBonus)} × ${s(v.entropySlope)}) × ${s(v.phi[v.j])}`, v.actorSlope[v.j] + (v.logProbSlope * v.advantage + v.data.entropyBonus * v.entropySlope) * v.phi[v.j]] },
      { has: 'criticSlope[j] = criticSlope[j] + advantage * psi[j]', calc: v => [`${s(v.criticSlope[v.j])} + ${s(v.advantage)} × ${s(v.psi[v.j])}`, v.criticSlope[v.j] + v.advantage * v.psi[v.j]] },
      { has: 'count = count + 1', calc: v => [`${v.count} + 1`, v.count + 1] },
    ],
    applyStep: [
      { has: 'const mean = slope.map(s => s / count)', calc: v => [`each slope ÷ ${v.count}`, v.slope.map(x => x / v.count)] },
      { has: 'const length = Math.hypot(...mean)', calc: v => [`√(${v.mean.map(x => `${s(x)}²`).join(' + ')})`, Math.hypot(...v.mean)] },
      { has: 'const scale = Math.min(1, 1 / length)', calc: v => [`min(1, 1 / ${s(v.length)})`, Math.min(1, 1 / v.length)] },
      { has: 'weights[j] = weights[j] + rate * mean[j] * scale', calc: v => [`${s(v.weights[v.j])} + ${s(v.rate)} × ${s(v.mean[v.j])} × ${s(v.scale)}`, v.weights[v.j] + v.rate * v.mean[v.j] * v.scale] },
    ],
  },
}

// The parts of the agent-environment loop, in order, for the phase bar.
export const PHASES = {
  q: [['observe', 'Observe', 'The world gives the state: 4 numbers.'], ['represent', 'Represent', 'Turn the 4 numbers into a table row.'], ['choose', 'Choose', 'The policy picks a push.'], ['act', 'Act', 'The world applies it: next state, reward, ended?'], ['learn', 'Learn', 'Move one table entry towards its target.'], ['repeat', 'Repeat', 'Count, then go on or start a new game.']],
  a2c: [['observe', 'Observe', 'Start the 8 worlds from fresh states.'], ['choose', 'Choose', 'The actor gives p; sample a push.'], ['act', 'Act', 'The world applies it.'], ['remember', 'Remember', 'Keep the transition for the batch.'], ['repeat', 'Repeat', 'Next step, or a new game in that world.'], ['learn', 'Learn', 'One update from all 40 transitions.']],
}
// The functions whose lines decide the phase (the loop and, for A2C, each world's steps).
export const ORCHESTRATORS = { q: ['run'], a2c: ['run', 'playSteps'] }
