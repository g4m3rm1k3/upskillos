// The programs the Python tab can run: each an entry function in python/ with JSON arguments (see
// python-steps/PythonTab.jsx for what each field does).
const NET = [[[0.5, -0.3], [0.2, 0.8]], [0.1, -0.1], [1.0, -1.0], 0.2]

export const PROGRAMS = {
  symbols: { label: '1.9 Part 1\'s symbols', file: 'symbols.py', module: 'symbols', function: 'show_symbols', about: 'A prediction, Σ, Π, the mean, e, the sigmoid and argmin, each worked out once.', kwargs: () => ({}), watch: {}, picture: null, actions: [], episodeEnd: () => [] },
  change: { label: '2.17 Rates and gradient descent', file: 'calculus.py', module: 'calculus', function: 'show_change', about: 'The falling ball\'s average rates closing in on −10 m/s, then gradient descent on a parabola.', kwargs: () => ({}), watch: { path: ['path'] }, picture: 'path', actions: [], episodeEnd: () => [] },
  linalg: { label: '3.12 Vectors and matrices', file: 'linalg.py', module: 'linalg', function: 'show_linalg', about: 'Addition, length, dot product, matrix times vector, determinant, inverse, least squares and eigenvalues, all as plain loops.', kwargs: () => ({}), watch: {}, picture: null, actions: [], episodeEnd: () => [] },
  stats: { label: '4.13 Probability and statistics', file: 'stats.py', module: 'stats', function: 'show_stats', about: 'Dice by counting, expectation and variance, Bayes, likelihood and PCA.', kwargs: () => ({}), watch: {}, picture: null, actions: [], episodeEnd: () => [] },
  regression: { label: '5.2 Linear regression by gradient descent', file: 'models.py', module: 'models', function: 'fit_line', about: 'θ ← θ − η∇J on the hours-and-scores data.', kwargs: () => ({ xs: [1, 2, 3, 4, 5, 6], ys: [52, 55, 61, 64, 70, 71], rate: 0.02, steps: 200 }), knobs: [['rate', 'η']], watch: {}, picture: null, actions: ['w = w - rate * gw'], actionLabel: 'Next step', actionTitle: 'Run until the weights take their next step', episodeEnd: () => [] },
  backprop: { label: '5.8 Backpropagation', file: 'models.py', module: 'models', function: 'backprop', about: 'The tiny network\'s forward pass, then every gradient by the chain rule, from the output back.', kwargs: () => ({ params: NET, x: [1.0, 2.0], y: 1.0 }), watch: {}, picture: null, actions: [], episodeEnd: () => [] },
  models: { label: '5.10 The big equations', file: 'models.py', module: 'models', function: 'show_models', about: 'Regression, ridge, logistic regression, softmax and attention on their examples.', kwargs: () => ({}), watch: {}, picture: null, actions: [], episodeEnd: () => [] },
}
