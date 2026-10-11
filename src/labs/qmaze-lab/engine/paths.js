// Follows a list of actions through a map's own transitions, from the start (deterministic maps:
// the one outcome of each move). Stops at an ending.
export function followPath(env, actions) {
  const rewards = [], states = [env.start]
  let s = env.start
  for (const a of actions) {
    const [[, next, r, end]] = env.P[s][a]
    rewards.push(r); states.push(next); s = next
    if (end) break
  }
  return { rewards, states }
}
