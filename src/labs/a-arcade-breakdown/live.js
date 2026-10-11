// The numbers the running program is using right now, gathered in one place so every piece in
// pieces.js can show its symbols with real values. Nothing here is recalculated: each value is read
// from the session's own record of the step it just ran, or computed by the same engine functions.
import { actor, value, encode } from './engine.js'

export function liveValues(session, options, trace = session.trace) {
  const s = trace?.observed ?? session.state
  const L = {
    world: session.world, algorithm: session.algorithm, cartpole: session.world === 'cartpole',
    s, a: trace?.action, r: trace?.environmentReward ?? trace?.reward, s2: trace?.next,
    terminated: trace?.terminated, truncated: trace?.truncated, physics: trace?.physics,
    step: trace?.step ?? session.steps, total: session.total, gamma: options.gamma,
    alpha: options.alpha, epsilon: options.epsilon,
  }
  if (session.algorithm === 'q') {
    L.encoding = trace?.encoding ?? encode(session.world, s)
    L.row = trace?.row ?? session.table[L.encoding.index]
    L.explore = trace?.explore
    L.update = trace?.update
    L.nextIndex = trace?.nextIndex
  } else {
    const policy = actor(s, session.network.actor)
    Object.assign(L, { phi: policy.phi, score: policy.score, p: policy.probabilities[1],
      V: options.criticEnabled === false ? 0 : value(s, session.network.critic),
      actorWeights: session.network.actor, criticWeights: session.network.critic,
      collected: session.rollout.length, batch: session.batch,
      rec: session.batch?.records[0], grad: session.batch?.actorGradient, criticGrad: session.batch?.criticGradient })
  }
  return L
}
