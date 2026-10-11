import { random, resetWorld, stepWorld, encode, chooseAction, qUpdate, makeTable, makeNetwork, actor, collectRollouts, a2cUpdate } from './engine.js'
import snapshots from './snapshots.json'

export const PHASES = ['Observe', 'Represent', 'Choose', 'Act', 'Learn']
export class Session {
  constructor(world = 'cartpole', algorithm = 'q', supplied = true, seed = 7) {
    this.world = world; this.algorithm = algorithm; this.rng = random(seed)
    this.table = supplied ? snapshots[world].table.map(row => [...row]) : makeTable(world)
    this.network = supplied ? structuredClone(snapshots.a2c.network) : makeNetwork()
    this.state = resetWorld(world, this.rng); this.steps = 0; this.total = 0; this.episode = 1
    this.phase = 0; this.lastPhase = -1; this.done = false; this.trace = null
    this.history = []; this.returns = []; this.rollout = []; this.batch = null
    this.workers = Array.from({ length: 7 }, () => ({ state: resetWorld('cartpole', this.rng), steps: 0 }))
    this.updates = 0
  }
  interrupt() { this.phase = 0; this.trace = null; this.rollout = []; this.lastPhase = -1 }
  advance(options) {
    const { learning, epsilon, alpha, gamma, randomActions, blind, rewardEnabled = true, representation = true } = options
    const visible = state => blind && this.world === 'cartpole' ? [state[0], 0, state[2], 0] : [...state]
    const represented = state => representation ? encode(this.world, state) : { bins: [], index: 0 }
    const phase = this.phase; this.lastPhase = phase
    if (phase === 0) {
      if (this.done) { this.state = resetWorld(this.world, this.rng); this.steps = 0; this.total = 0; this.done = false; this.episode++ }
      this.trace = { state: [...this.state], observed: visible(this.state), episode: this.episode, step: this.steps + 1 }
    } else if (phase === 1) {
      this.trace.encoding = represented(this.trace.observed)
      this.trace.row = [...this.table[this.trace.encoding.index]]
      if (this.algorithm === 'a2c') this.trace.policy = actor(this.trace.observed, this.network.actor)
    } else if (phase === 2) {
      const t = this.trace
      if (this.algorithm === 'q') Object.assign(t, chooseAction(t.row, randomActions ? 1 : learning ? epsilon : 0, this.rng))
      else {
        const p = randomActions ? .5 : t.policy.probabilities[1]
        t.action = learning || randomActions ? (this.rng() < p ? 1 : 0) : (p >= .5 ? 1 : 0)
        t.explore = Boolean(randomActions); t.sampled = learning || randomActions
      }
    } else if (phase === 3) {
      Object.assign(this.trace, stepWorld(this.world, this.state, this.trace.action, ++this.steps))
      this.trace.environmentReward = this.trace.reward
      if (!rewardEnabled) this.trace.reward = 0
      this.state = this.trace.next; this.total += this.trace.environmentReward
      this.trace.total = this.total
      this.done = this.trace.terminated || this.trace.truncated
    } else {
      const t = this.trace
      if (this.algorithm === 'q') {
        const next = represented(visible(t.next)), row = this.table[t.encoding.index]
        // A copy previews the exact update when learning is frozen.
        t.update = qUpdate(learning ? row : [...row], t.action, t.reward, this.table[next.index], t.terminated, alpha, gamma)
        t.alpha = alpha; t.gamma = gamma
        t.applied = learning; t.nextIndex = next.index
        if (learning) this.updates++
      } else if (learning) {
        this.rollout.push({ state: t.observed, next: visible(t.next), action: t.action, reward: t.reward, terminated: t.terminated, truncated: t.truncated })
        if (this.rollout.length === 5) {
          const others = collectRollouts(this.network, this.rng, this.workers)
          // The same ablations apply to every synchronous worker.
          others.forEach(trajectory => trajectory.forEach(item => {
            item.state = visible(item.state); item.next = visible(item.next)
            if (!rewardEnabled) item.reward = 0
          }))
          this.batch = a2cUpdate(this.network, [this.rollout, ...others], { gamma, criticEnabled: options.criticEnabled !== false, entropy: options.entropyEnabled === false ? 0 : .01 })
          this.rollout = []; this.updates++; t.batch = this.batch
        }
      } else this.rollout = []
      if (this.done) this.returns = [...this.returns.slice(-39), { episode: this.episode, steps: this.steps, total: this.total, success: this.world === 'maze' ? t.terminated : t.truncated && !t.terminated }]
      this.history = [...this.history.slice(-119), structuredClone(t)]
    }
    this.phase = (phase + 1) % 5
  }
}
