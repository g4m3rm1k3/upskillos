// python/arith.py and python/pretrain.py in JavaScript: the vocabulary, the notebook of sums,
// exact match over all 100 questions, and pretraining (which the page runs a slice at a time).
import { Rng, greedy, initModel, newAdamState, trainStep } from './gpt.js'

export const VOCAB = ['\n', '+', '=', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '?', '<user>', '<bot>', '<end>']
export const INDEX = Object.fromEntries(VOCAB.map((t, k) => [t, k]))
export const NEWLINE = INDEX['\n']
export const QUESTIONS = Array.from({ length: 100 }, (_, k) => [Math.floor(k / 10), k % 10])

export const encode = text => [...text].map(c => INDEX[c])
export const decode = ids => ids.map(t => VOCAB[t]).join('')

export function notebook(lines = 400, seed = 0) {
  const rng = new Rng(seed)
  let out = ''
  for (let n = 0; n < lines; n++) {
    const [a, b] = QUESTIONS[rng.below(QUESTIONS.length)]
    out += `${a}+${b}=${a + b}\n`
  }
  return out
}

export const complete = (model, a, b) => decode(greedy(model, encode(`${a}+${b}=`), NEWLINE, 3))
export const exactMatch = model => QUESTIONS.filter(([a, b]) => complete(model, a, b) === String(a + b)).length

// Pretraining, a slice of steps at a time: trainer.step(n) runs n more steps.
export function makePretrainer({ dim = 16, context = 16, hidden = 64, lr = 0.01, seed = 1, lines = 400 } = {}) {
  const ids = encode(notebook(lines, 0))
  const model = initModel(VOCAB.length, dim, context, hidden, seed)
  const state = newAdamState(model)
  const rng = new Rng(seed + 1)
  const losses = []
  return {
    model, losses,
    step(n = 1) {
      for (let s = 0; s < n; s++) {
        const start = rng.below(ids.length - context - 1)
        const window = ids.slice(start, start + context + 1)
        losses.push(trainStep(model, state, window.slice(0, -1), window.slice(1), null, lr))
      }
      return losses
    },
  }
}
export function pretrain(steps = 1500, options) { const t = makePretrainer(options); t.step(steps); return [t.model, t.losses] }
