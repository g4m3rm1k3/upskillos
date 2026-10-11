// The code broken apart: for each piece's marked lines (engine.js), what each line does, which
// symbol in the piece's maths it is, and the value it produced on the step the program just ran.
// `has` is a piece of text that must appear in the line; codeLines.test.js checks every one still
// matches, so these notes cannot silently drift away from the code.
const n = (x, d = 3) => Number.isFinite(x) ? x.toFixed(d) : null
const list = (a, d = 3) => a ? `[${a.map(x => x.toFixed(d)).join(', ')}]` : null
const world1 = L => L.batch?.records.slice(0, 5)

export const CODE_LINES = {
  'start-state': [
    { has: 'Array.from({ length: 4 }', say: 'Make 4 numbers. Each: a random u in [0, 1), minus 0.5 (now −0.5 to 0.5), times 0.1 (now −0.05 to 0.05).', tex: 's_0^{(i)} \\sim \\mathcal{U}(-0.05, 0.05)' },
  ],
  'cartpole-physics': [
    { has: 'const [x, velocity, angle, spin] = state', say: 'Unpack the state vector into four named numbers.', tex: '(x, \\dot x, \\theta, \\dot\\theta) = s', now: L => L.cartpole ? list(L.s) : null },
    { has: 'const push =', say: 'Action 1 means +10 N (right); action 0 means −10 N (left).', tex: 'F = \\pm 10', now: L => L.physics ? String(L.physics.push) : null },
    { has: 'const sin =', say: 'Work out sin θ and cos θ once, because three formulas need them.', tex: '\\sin\\theta,\\ \\cos\\theta', now: L => L.physics ? `${n(L.physics.sin, 4)}, ${n(L.physics.cos, 4)}` : null },
    { has: 'const temp =', say: 'The push plus the pole\'s swinging force, shared over the total mass (1.1 kg).', tex: '\\text{temp}', now: L => L.physics ? n(L.physics.temp) : null },
    { has: 'const angularAcceleration =', say: 'How fast the pole\'s spin is changing: gravity tipping it, minus the push correcting it.', tex: '\\ddot\\theta', now: L => L.physics ? n(L.physics.angularAcceleration) : null },
    { has: 'const acceleration =', say: 'How fast the cart\'s velocity is changing: the push, minus the pole pulling back.', tex: '\\ddot x', now: L => L.physics ? n(L.physics.acceleration) : null },
  ],
  euler: [
    { has: 'const next = state.map', say: 'For each of the 4 numbers (value, at position i): new = old + 0.02 × its rate. The rates are (ẋ, ẍ, θ̇, θ̈).', tex: 's_{t+1} = s_t + \\tau\\,\\dot s_t', now: L => L.physics ? list(L.s2) : null },
  ],
  reward: [
    { has: 'const reward = 1', say: 'CartPole pays 1 for every step, the last one included.', tex: 'r_{t+1} = 1', now: L => L.cartpole && L.r !== undefined ? String(L.r) : null },
    { has: 'const terminated =', say: 'Ended for real if the cart is past 2.4 m or the pole past 12° (π/15 rad). Math.abs drops the sign, so both sides count.', tex: '|x| > 2.4 \\lor |\\theta| > \\pi/15', now: L => L.terminated === undefined ? null : String(L.terminated) },
    { has: 'const truncated =', say: 'Stopped by the clock at 500 steps; the MDP itself has not ended.', tex: 't + 1 \\ge 500', now: L => L.truncated === undefined ? null : String(L.truncated) },
  ],
  discretise: [
    { has: 'const bins =', say: 'For each number v (position i), keep the edges it is at or above (filter) and count them (length). That count is its bin.', tex: 'b_i = \\#\\{e \\in E_i : s^{(i)} \\ge e\\}', now: L => L.encoding?.bins?.length ? `[${L.encoding.bins.join(', ')}]` : null },
    { has: 'const index =', say: 'Combine the bins like digits: start at 0; for each bin, multiply the running index by that number\'s bin count (2, 2, 8, 8) and add the bin.', tex: '((b_0 \\cdot 2 + b_1) \\cdot 8 + b_2) \\cdot 8 + b_3', now: L => L.encoding ? String(L.encoding.index) : null },
  ],
  'q-table': [
    { has: 'Array.from({ length: world', say: 'A list of 256 rows (25 for the maze); each row is a list of 2 zeros (4 for the maze). Row = state, column = action.', tex: 'Q[s][a] = 0', now: L => L.row ? list(L.row) : null },
  ],
  'epsilon-greedy': [
    { has: 'const explore =', say: 'Draw u in [0, 1). If u < ε, this step explores. Happens with probability ε.', tex: 'u < \\varepsilon', now: L => L.explore === undefined ? null : String(L.explore) },
    { has: 'const action =', say: 'Exploring: a random index (u × number of actions, rounded down). Otherwise: the index of the largest value in the row (argmax).', tex: 'a_t = \\arg\\max_a Q(s_t, a)', now: L => L.a === undefined || L.algorithm !== 'q' ? null : String(L.a) },
  ],
  'td-update': [
    { has: 'const before = row[action]', say: 'The current estimate for the action that was taken.', tex: 'Q(s_t, a_t)', now: L => L.update ? n(L.update.before) : null },
    { has: 'const bootstrap =', say: 'The best estimate available from the next state, or 0 if the game truly ended (no future).', tex: '\\max_{a\'} Q(s_{t+1}, a\')', now: L => L.update ? n(L.update.bootstrap) : null },
    { has: 'const target =', say: 'What the estimate should be, according to this one experience: the real reward plus γ times the future estimate.', tex: 'y = r_{t+1} + \\gamma \\max_{a\'} Q(s_{t+1}, a\')', now: L => L.update ? n(L.update.target) : null },
    { has: 'const error =', say: 'How wrong the estimate was: target minus current.', tex: '\\delta = y - Q(s_t, a_t)', now: L => L.update ? n(L.update.error) : null },
    { has: 'row[action] = before + alpha * error', say: 'Move the estimate a fraction α of the way towards the target. Only this one entry of the table changes.', tex: 'Q(s_t, a_t) \\leftarrow Q(s_t, a_t) + \\alpha\\,\\delta', now: L => L.update ? n(L.update.after) : null },
  ],
  features: [
    { has: 'export const features', say: 'Divide each state number by roughly its largest typical size, and add a constant 1 (the bias).', tex: '\\boldsymbol\\phi(s)', now: L => L.phi ? list(L.phi) : null },
  ],
  'dot-product': [
    { has: 'const dot =', say: 'Walk both lists together: multiply element i of a by element i of b, keep a running sum starting from 0.', tex: '\\mathbf{a} \\cdot \\mathbf{b} = \\sum_i a_i b_i' },
  ],
  actor: [
    { has: 'const phi = features(state)', say: 'Turn the state into the 5 scaled features.', tex: '\\boldsymbol\\phi(s)', now: L => L.phi ? list(L.phi) : null },
    { has: 'const score = dot(phi, weights)', say: 'One number: each feature times its weight, added up.', tex: 'z = \\mathbf{w}_\\pi \\cdot \\boldsymbol\\phi(s)', now: L => L.score === undefined ? null : n(L.score) },
    { has: 'const p = sigmoid(score)', say: 'Squash the score into a probability of pushing right.', tex: 'p = \\sigma(z)', now: L => L.p === undefined ? null : n(L.p) },
  ],
  critic: [
    { has: 'const [x, v, a, w] = features(s)', say: 'Take the first four actor features (the scaled state numbers). Here w is the scaled angular velocity, not a weight.', tex: '(\\hat x, \\hat v, \\hat\\theta, \\hat\\omega)', now: L => L.phi ? list(L.phi.slice(0, 4)) : null },
    { has: 'return [1, x, v, a, w', say: 'The critic\'s 11 features: a constant, the four numbers, their squares, and two products.', tex: '\\boldsymbol\\psi(s)' },
  ],
  nstep: [
    { has: 'let target = estimate(trajectory.at(-1).next)', say: 'Start the running total at the critic\'s value of the state after the 5th step (or 0 with the critic removed).', tex: 'G \\leftarrow V(s_{t+5})' },
    { has: 'const reversed = []', say: 'Results are produced last-step-first, so collect them here and reverse at the end.' },
    { has: 'for (let i = trajectory.length - 1', say: 'Walk the 5 steps backwards: i = 4, 3, 2, 1, 0.' },
    { has: 'const t = trajectory[i]', say: 'The transition at step i.' },
    { has: 'if (t.terminated) target = 0', say: 'If this step ended the game for real, nothing after it belongs to this game: the future is 0.', tex: 'G \\leftarrow 0' },
    { has: 'else if (t.truncated)', say: 'If the clock stopped the game, the future still exists: use the critic\'s estimate of it.', tex: 'G \\leftarrow V(s_{t+1})' },
    { has: 'target = t.reward + gamma * target', say: 'The return recursion: this step\'s reward plus γ times the total from later steps.', tex: 'G \\leftarrow r_{t+1} + \\gamma G', now: L => world1(L) ? `world 1, steps 1–5: ${list(world1(L).map(r => r.target))}` : null },
  ],
  advantage: [
    { has: 'const baseline = estimate(t.state)', say: 'What the critic expected from this state.', tex: 'V(s_t)', now: L => world1(L) ? list(world1(L).map(r => r.baseline)) : null },
    { has: 'const advantage = target - baseline', say: 'What happened minus what was expected. Positive: better than usual.', tex: '\\hat A_t = G_t - V(s_t)', now: L => world1(L) ? list(world1(L).map(r => r.advantage)) : null },
  ],
  'policy-gradient': [
    { has: 'const logProbGradient = t.action - p', say: 'The slope of log π(action) with respect to the score: a − p. Positive when right was chosen, negative when left was.', tex: '\\frac{d}{dz}\\log\\pi(a \\mid s) = a - p', now: L => world1(L) ? list(world1(L).map(r => r.logProbGradient)) : null },
    { has: 'const entropyGradient =', say: 'The slope of the entropy with respect to the score (see Entropy bonus). The max(1e-12, …) only avoids log(0).', tex: '\\tfrac{dH}{dz}', now: L => world1(L) ? list(world1(L).map(r => r.entropyGradient)) : null },
    { has: 'phi.forEach((f, j) => { ga[j]', say: 'For each feature j: add (a − p) × advantage, plus the entropy term, times that feature. ga collects the sum over all 40 transitions.', tex: 'g_j \\mathrel{+}= \\big((a - p)\\hat A + \\beta \\tfrac{dH}{dz}\\big)\\phi_j' },
  ],
  entropy: [
    { has: 'const logProbGradient = t.action - p', say: 'The policy-gradient part (see The policy gradient).' },
    { has: 'const entropyGradient =', say: '−log(p / (1 − p)) × p(1 − p): positive when p < 0.5, negative when p > 0.5, so it always pushes p back towards 0.5.', tex: '\\frac{dH}{dz} = -\\log\\frac{p}{1-p}\\,p(1-p)', now: L => world1(L) ? list(world1(L).map(r => r.entropyGradient)) : null },
    { has: 'phi.forEach((f, j) => { ga[j]', say: 'The entropy term is added with weight β = entropy (0.01).', tex: '\\beta' },
  ],
  'critic-update': [
    { has: 'psi.forEach((f, j) => { gc[j] += advantage * f })', say: 'For each critic feature j: add advantage × feature. gc collects the sum over all 40 transitions; this is the downhill direction of the squared error.', tex: 'g^V_j \\mathrel{+}= \\hat A\\,\\psi_j' },
  ],
  clipping: [
    { has: 'const mean = grad.map(g => g / count)', say: 'Divide each summed slope by 40: the average gradient.', tex: '\\mathbf{g} = \\tfrac{1}{N}\\sum_i \\mathbf{g}_i', now: L => L.grad ? list(L.grad.mean, 4) : null },
    { has: 'const norm = Math.hypot(...mean)', say: 'Its length (Math.hypot is √ of the sum of squares). If over 1, scale = 1 / length; otherwise 1.', tex: '\\|\\mathbf{g}\\|,\\ \\min(1, 1/\\|\\mathbf{g}\\|)', now: L => L.grad ? `${n(L.grad.norm)}, scale ${n(L.grad.scale)}` : null },
    { has: 'weights.forEach((w, i) => { weights[i] = w + rate * mean[i] * scale })', say: 'Each weight moves by learning rate × its gradient × the clipping scale. This is the only line where the actor (or critic) changes.', tex: '\\mathbf{w} \\leftarrow \\mathbf{w} + \\alpha\\,\\text{scale}\\,\\mathbf{g}', now: L => L.batch ? list(L.batch.after.actor) : null },
  ],
  rollout: [
    { has: 'for (let i = 0; i < horizon; i++)', say: 'Each of the other 7 worlds takes 5 steps. Your visible world, world 1 in the batch, is stepped by the main loop one operation at a time.' },
    { has: 'const state = [...worker.state]', say: 'Copy the world\'s state, and ask the actor for its probabilities there.', tex: '\\pi(\\cdot \\mid s)' },
    { has: 'const action = rng() < probabilities[1]', say: 'Sample: right if a random u is below p.', tex: 'a \\sim \\pi(\\cdot \\mid s)' },
    { has: 'const transition = stepWorld', say: 'The world answers: next state, reward, ending flags.', tex: 's\', r' },
    { has: 'trajectory.push', say: 'Record the transition.', tex: '(s, a, r, s\')' },
    { has: 'worker.state = transition.next', say: 'Move on to the next state.' },
    { has: 'if (transition.terminated || transition.truncated)', say: 'A finished game restarts at once, so every world always contributes 5 transitions.' },
  ],
  evaluation: [
    { has: 'const rng = random(seed)', say: 'A fresh random generator from a fixed seed: the same seed always gives the same start.' },
    { has: 'for (let steps = 1;', say: 'Play at most 500 steps (100 in the maze).' },
    { has: 'const result = stepWorld(world, state, policy(state), steps)', say: 'The frozen greedy policy chooses; the world answers. Nothing is learned.' },
    { has: 'total += result.reward', say: 'Add up the undiscounted reward: the score is the game length.' },
    { has: 'if (result.terminated || result.truncated) return', say: 'Report how long the game lasted and whether it survived to the limit.' },
  ],
}
// Termination and the reward are decided on the same three lines.
CODE_LINES['episode-end'] = CODE_LINES.reward
