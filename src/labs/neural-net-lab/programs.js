// The programs the Python tab can run: each an entry function in python/ with JSON arguments (see
// python-steps/PythonTab.jsx for what each field does).
import { SOURCES } from './source.js'

const lineOf = (file, text) => SOURCES[file].split('\n').findIndex(l => l.includes(text)) + 1

export const PROGRAMS = {
  line: {
    label: '1.3 Fit a line by gradient descent', file: 'neuron.py', module: 'neuron', function: 'fit_line',
    about: 'One neuron, w · x + b, fitted to 20 made-up points: work out the two slopes, step against them, 500 times.',
    kwargs: () => ({ steps: 500, seed: 0 }),
    watch: { w: ['w'], b: ['b'], xs: ['xs'], ys: ['ys'], history: ['history'] }, picture: 'line',
    actions: ['b = b - rate * grad_b'], actionLabel: 'Next step', actionTitle: 'Run until w and b have taken their next step',
    episodeEnd: () => [],
  },
  layer: {
    label: '1.4 One layer by hand', file: 'layer.py', module: 'layer', function: 'show_layer',
    about: 'Three neurons looking at one input, x = 2: what each adds up to, and what ReLU, sigmoid and tanh make of it.',
    kwargs: () => ({ x: 2.0 }), watch: {}, picture: null, actions: [], episodeEnd: () => [],
  },
  net: {
    label: '1.7 Train a network by hand', file: 'tinynet.py', module: 'tinynet', function: 'train_net',
    about: 'A 1 → 8 → 1 ReLU network written in plain Python, backpropagation and all, fitted to points on a sine curve.',
    kwargs: () => ({ hidden: 8, steps: 2000, seed: 0 }),
    watch: { net: ['net'], xs: ['xs'], ys: ['ys'], history: ['history'] }, picture: 'curve',
    actions: ['grads = backward('], actionLabel: 'Next point', actionTitle: 'Run until the next point has been backpropagated',
    episodeEnd: () => [['tinynet.py', lineOf('tinynet.py', 'history.append(loss)')]], endLabel: 'Next step',
  },
  torch: {
    label: '1.8 Hand-made vs PyTorch', file: 'torch_net.py', module: 'torch_net', function: 'compare',
    about: 'The same network trained by hand and by PyTorch, from the same starting weights: how far apart do their errors get?',
    kwargs: () => ({ steps: 200 }), watch: { history: ['history'] }, picture: null, actions: [],
    episodeEnd: () => [['torch_net.py', lineOf('torch_net.py', 'history.append(loss.item())')]], endLabel: 'Next PyTorch step',
  },
  cars: {
    label: '1.9 Predict fuel economy', file: 'cars.py', module: 'cars', function: 'train_cars',
    about: 'Real data: 392 cars. Learn miles per gallon from weight and horsepower, then test on cars the model never saw.',
    kwargs: () => ({ steps: 3000, seed: 0 }), watch: {}, picture: null, actions: [],
    episodeEnd: () => [['cars.py', lineOf('cars.py', 'optimizer.step()')]], endLabel: 'Next step',
  },
}
