// The lessons in order, grouped into parts. A lesson's `id` is its progress key: never change one.
// Numbers are not stored: a part's number is its place in PARTS and a lesson's is its place in its part, so a
// lesson can be inserted anywhere. Text refers to other lessons by id, `[[#gradient]]` for a lesson's number
// and `[[#part:part3]]` for a part's, and every string is resolved here, when the lab loads.
// Part 2 opens with the original chapter's six lessons (lessons/fall.js), ids unchanged.
import { PART1 } from './part1.js'
import { PART2 } from './part2.js'
import { PART3 } from './part3.js'
import { PART4 } from './part4.js'
import { PART5 } from './part5.js'
import { PART6 } from './part6.js'
import { FOUNDATIONS } from './foundations.js'
import { PROOF } from './proof.js'
import { CHANGE } from './change.js'
import { MANYVARS } from './manyvars.js'
import { AREAS } from './areas.js'
import { LINALG2 } from './linalg2.js'
import { LINALG3 } from './linalg3.js'
import { PROB2 } from './prob2.js'
import { PROB3 } from './prob3.js'
import { OPTIM } from './optimisation.js'
import { ALGO } from './algorithms.js'
import { ML2 } from './ml2.js'
import { ML3 } from './ml3.js'
import { THEORY } from './theory.js'
import { PAPERS1 } from './papers.js'
import { PAPERS2 } from './papers2.js'
import { EXERCISES as EX1 } from '../exercises/part1.js'
import { EXERCISES as EX2 } from '../exercises/part2.js'
import { EXERCISES as EX3 } from '../exercises/part3.js'
import { EXERCISES as EX4 } from '../exercises/part4.js'
import { EXERCISES as EX5 } from '../exercises/part5.js'
import { EXERCISES as EX6 } from '../exercises/part6.js'
import { EXERCISES as EXP } from '../exercises/proof.js'
import { EXERCISES as EXC } from '../exercises/change.js'
import { EXERCISES as EXM } from '../exercises/matrices.js'
import { EXERCISES as EXR } from '../exercises/chance.js'
import { EXERCISES as EXO } from '../exercises/optimise.js'
import { EXERCISES as EXA } from '../exercises/algorithms.js'
import { EXERCISES as EXL } from '../exercises/ml.js'
import { EXERCISES as EXT } from '../exercises/theory.js'
import { EXERCISES as EXPP } from '../exercises/papers.js'

// Each lesson's coding exercise lives in exercises/, keyed by lesson id, and is placed just before the
// lesson's closing note (or at its end).
const EXERCISES = { ...EX1, ...EX2, ...EX3, ...EX4, ...EX5, ...EX6, ...EXP, ...EXC, ...EXM, ...EXR, ...EXO, ...EXA, ...EXL, ...EXT, ...EXPP }

// Every lesson written anywhere, by id, and each part's lessons in teaching order. A part lists ids, so
// lessons from other files (lessons/foundations.js) can be placed anywhere inside it.
export const POOL = new Map([PART1, PROOF, PART2, PART3, PART4, OPTIM, ALGO, PART5, THEORY, PART6].flatMap(p => p.lessons).concat(FOUNDATIONS, CHANGE, MANYVARS, AREAS, LINALG2, LINALG3, PROB2, PROB3, ML2, ML3, PAPERS1, PAPERS2).map(l => [l.id, l]))
const ids = part => part.lessons.map(l => l.id)
const LAYOUT = [
  [PART1, ['symbols-welcome', 'functions', 'sets', 'logic', 'subscripts', 'sigma', 'powers', 'number-e', 'logarithms', 'composition', 'piecewise', 'inequalities', 'greek', 'argmin']],
  [PROOF, ids(PROOF)],
  [PART2, ['observe', 'measure', 'record', 'graph', 'change', 'rate', 'slope', 'instant', 'limits-precise', 'derivative', 'derivative-rules', 'product-quotient', 'exp-log-slopes', 'chain-rule', 'inverse-derivative', 'minimum', 'gradient-descent-1d', 'second-derivative', 'partial-derivatives', 'gradient', 'gradient-descent-2d', 'integral', 'fundamental-theorem', 'integration-techniques', 'taylor']],
  [PART3, ['vectors', 'vector-arithmetic', 'norm', 'dot-product', 'matrices', 'transformations', 'matrix-multiplication', 'transpose', 'inverse', 'systems', 'span-basis', 'gaussian-elimination', 'rank', 'determinant-n', 'orthogonality', 'orthogonal-matrices', 'least-squares', 'eigenvectors', 'spectral', 'positive-definite', 'svd', 'matrix-norms-trace', 'low-rank', 'matrix-gradients', 'matrix-calculus', 'multivariable-chain', 'jacobian', 'hessian', 'tensors']],
  [PART4, ['probability', 'axioms', 'distributions', 'expectation', 'variance', 'conditional', 'independence', 'bayes', 'densities', 'double-integrals', 'gaussian-integral', 'normal', 'common-distributions', 'joint-marginal', 'covariance', 'sums-of-variables', 'law-large-numbers', 'clt', 'sampling', 'change-of-variables', 'multivariate-gaussian', 'likelihood', 'mle', 'map', 'estimation', 'hypothesis-tests', 'monte-carlo', 'jensen', 'information', 'markov-chains', 'pca']],
  [OPTIM, ids(OPTIM)],
  [ALGO, ids(ALGO)],
  [PART5, ['linear-regression', 'regression-gradient', 'bias-variance', 'regularisation', 'logistic-regression', 'naive-bayes', 'softmax', 'entropy-kl', 'trees', 'k-means', 'gmm-em', 'svm', 'layers', 'initialisation', 'backpropagation', 'optimisers', 'normalisation', 'dropout', 'convolution', 'rnn-bptt', 'attention', 'transformer-block', 'contrastive', 'vae-elbo', 'gan', 'diffusion', 'bellman-rl', 'policy-gradient-derivation', 'ppo']],
  [THEORY, ids(THEORY)],
  [PART6, ['reading-papers', 'decode-practice', 'paper-dropout', 'paper-word2vec', 'paper-vae', 'paper-adam', 'paper-batchnorm', 'paper-resnet', 'paper-transformer', 'paper-ppo', 'paper-ddpm', 'paper-lora']],
]
const SOURCE = LAYOUT.map(([part, order]) => ({ ...part, lessons: order.map(id => POOL.get(id)) }))

const NUMBERS = new Map()
SOURCE.forEach((part, p) => {
  NUMBERS.set(`part:${part.id}`, String(p + 1))
  part.lessons.forEach((lesson, i) => NUMBERS.set(lesson.id, `${p + 1}.${i + 1}`))
})

// Every placeholder that names no lesson or part, collected for lessons.test.js.
export const UNRESOLVED = new Set()

export function refs(text) {
  if (typeof text !== 'string' || !text.includes('[[#')) return text
  return text.replace(/\[\[#([\w:-]+)\]\]/g, (whole, id) => {
    if (NUMBERS.has(id)) return NUMBERS.get(id)
    UNRESOLVED.add(id)
    return whole
  })
}

function withExercise(lesson) {
  const exercise = EXERCISES[lesson.id]
  if (!exercise) return lesson
  const blocks = [...lesson.blocks], at = blocks.at(-1)?.note ? blocks.length - 1 : blocks.length
  blocks.splice(at, 0, { exercise })
  return { ...lesson, blocks }
}

// Resolves every string inside plain objects and arrays; functions (compute, check) are kept as they are.
function resolve(value) {
  if (typeof value === 'string') return refs(value)
  if (Array.isArray(value)) return value.map(resolve)
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(v)]))
  }
  return value
}

export const PARTS = SOURCE.map((source, p) => {
  const part = { id: source.id, number: String(p + 1), title: refs(source.title) }
  part.lessons = source.lessons.map((lesson, i) => ({ ...resolve(withExercise(lesson)), number: `${p + 1}.${i + 1}`, part }))
  return part
})
export const LESSONS = PARTS.flatMap(part => part.lessons)
export const lessonById = id => LESSONS.find(l => l.id === id)
