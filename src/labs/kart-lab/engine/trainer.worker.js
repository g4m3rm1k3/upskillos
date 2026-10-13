// Trains one driver in the background with exactly the engine's training loop (tabular.js `train`
// and `trainLinear`), reports progress, records the last practice lap's updates for the trace
// viewer, and tests the frozen result on both tracks.
import { PyRandom, SUNLIT, HARBOUR } from './kart.js'
import { DEFAULTS, trainEpisode, evaluate, trainLinear, evaluateLinear, pack } from './tabular.js'

self.onmessage = ({ data }) => {
  try {
    const config = { ...DEFAULTS, ...data, track: 'sunlit' }, history = []
    const report = (e, lap) => { history.push(lap.total); if ((e + 1) % 100 === 0) self.postMessage({ type: 'progress', history: history.slice(-100) }) }
    if (config.method === 'linear') {
      const weights = trainLinear({ ...config, track: SUNLIT, onEpisode: (e, lap) => report(e, lap) })
      self.postMessage({ type: 'complete', history, checkpoint: pack({ kind: 'linear', weights }, config, config.episodes), evaluation: { sunlit: evaluateLinear(weights, SUNLIT), harbour: evaluateLinear(weights, HARBOUR) }, trace: [] })
      return
    }
    const rng = new PyRandom(config.seed), tables = config.method === 'double' ? [new Map(), new Map()] : [new Map()], trace = []
    for (let e = 0; e < config.episodes; e++) {
      const last = e === config.episodes - 1
      const lap = trainEpisode(tables, config, e, rng, SUNLIT, last ? t => trace.push(t) : undefined)
      report(e, lap)
    }
    self.postMessage({ type: 'complete', history, checkpoint: pack({ kind: 'table', tables }, config, config.episodes), evaluation: { sunlit: evaluate(tables, config, SUNLIT), harbour: evaluate(tables, config, HARBOUR) }, trace })
  } catch (error) { self.postMessage({ type: 'error', message: error.message }) }
}
