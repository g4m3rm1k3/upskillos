import { createModel, trainEpisode, evaluate, pack } from './learning.js'
import { random } from './game.js'
self.onmessage = ({ data }) => {
  try {
    const model = createModel(data), rng = random(data.seed), history = [], trace = []
    for (let i = 0; i < data.episodes; i++) {
      history.push(trainEpisode(model, i, rng, i === data.episodes - 1 ? transition => trace.push(transition) : undefined))
      if ((i + 1) % 50 === 0) self.postMessage({ type: 'progress', episodes: i + 1, history: history.slice(-50) })
    }
    self.postMessage({ type: 'complete', checkpoint: pack(model), evaluation: evaluate(model), history, trace })
  } catch (error) { self.postMessage({ type: 'error', message: error.message }) }
}
