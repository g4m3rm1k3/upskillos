// The programs the Python tab can run: each an entry function in python/ with JSON arguments (see
// python-steps/PythonTab.jsx for what each field does).
import { SOURCES } from './source.js'

// The stepper reports only the first 32 items of a list, but a NumPy array in full: watch lists as arrays.
const all = name => [`__import__('numpy').array(${name})`, name]
const lineOf = (file, text) => SOURCES[file].split('\n').findIndex(l => l.includes(text)) + 1

export const PROGRAMS = {
  line: {
    label: '1.3 Fit a line by gradient descent', file: 'neuron.py', module: 'neuron', function: 'fit_line',
    about: 'One neuron, w · x + b, fitted to 20 made-up points: work out the two slopes, step against them, 500 times.',
    kwargs: () => ({ steps: 500, seed: 0 }),
    watch: { w: ['w'], b: ['b'], xs: all('xs'), ys: all('ys'), history: all('history') }, picture: 'line',
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
    watch: { net: ['net'], xs: all('xs'), ys: all('ys'), history: all('history') }, picture: 'curve',
    actions: ['grads = backward('], actionLabel: 'Next point', actionTitle: 'Run until the next point has been backpropagated',
    episodeEnd: () => [['tinynet.py', lineOf('tinynet.py', 'history.append(loss)')]], endLabel: 'Next step',
  },
  torch: {
    label: '1.8 Hand-made vs PyTorch', file: 'torch_net.py', module: 'torch_net', function: 'compare',
    about: 'The same network trained by hand and by PyTorch, from the same starting weights: how far apart do their errors get?',
    kwargs: () => ({ steps: 200 }), watch: { history: all('history') }, picture: null, actions: [],
    episodeEnd: () => [['torch_net.py', lineOf('torch_net.py', 'history.append(loss.item())')]], endLabel: 'Next PyTorch step',
  },
  cars: {
    label: '1.9 Predict fuel economy', file: 'cars.py', module: 'cars', function: 'train_cars',
    about: 'Real data: 392 cars. Learn miles per gallon from weight and horsepower, then test on cars the model never saw.',
    kwargs: () => ({ steps: 3000, seed: 0 }), watch: {}, picture: null, actions: [],
    episodeEnd: () => [['cars.py', lineOf('cars.py', 'optimizer.step()')]], endLabel: 'Next step',
  },
  logistic: {
    label: '2.2 Logistic regression by hand', file: 'logistic.py', module: 'logistic', function: 'train_logistic',
    about: 'One neuron with sigmoid on 40 points in two clouds: the gradient (p − y)·x added up point by point, then a step.',
    kwargs: () => ({ steps: 300, seed: 0 }),
    watch: { w: ['w'], b: ['b'], points: all('points'), labels: all('labels'), history: all('history') }, picture: 'plane',
    actions: ['b -= rate * grad_b'], actionLabel: 'Next step', actionTitle: 'Run until the weights have taken their next step',
    episodeEnd: () => [],
  },
  moons: {
    label: '2.4 A hidden layer in PyTorch', file: 'torch_classify.py', module: 'torch_classify', function: 'train_moons',
    about: 'A 2 → 16 → 1 network learns to separate two interleaved moons, with BCEWithLogitsLoss.',
    kwargs: () => ({ hidden: 16, steps: 3000, seed: 0 }), choices: { hidden: [16, 4, 0] }, watch: { history: all('history') }, picture: null, actions: [],
    episodeEnd: () => [['torch_classify.py', lineOf('torch_classify.py', 'history.append(loss.item())')]], endLabel: 'Next step',
  },
  tumours: {
    label: '2.5 Tumours: malignant or benign', file: 'tumours.py', module: 'tumours', function: 'train_tumours',
    about: 'Real data: 569 tumours, 30 measurements each. Train on 456, test on 113, and count the four kinds of answer.',
    kwargs: () => ({ steps: 1000, seed: 0 }), watch: {}, picture: null, actions: [],
    episodeEnd: () => [['tumours.py', lineOf('tumours.py', 'optimizer.step()')]], endLabel: 'Next step',
  },
  iris_hand: {
    label: '3.2 Softmax regression by hand', file: 'iris.py', module: 'iris', function: 'train_softmax',
    about: 'Three neurons, one per iris species, on petal length and width: softmax, the slope p − one-hot, and a step.',
    kwargs: () => ({ steps: 500 }), watch: { history: all('history') }, picture: null,
    actions: ['history.append(loss)'], actionLabel: 'Next step', actionTitle: 'Run until the next step is done',
    episodeEnd: () => [],
  },
  iris: {
    label: '3.3 Iris in PyTorch', file: 'torch_iris.py', module: 'torch_iris', function: 'train_iris',
    about: 'All four measurements → 8 hidden → 3 scores, with CrossEntropyLoss; then the confusion matrix.',
    kwargs: () => ({ steps: 1000, seed: 0 }), watch: {}, picture: null, actions: [],
    episodeEnd: () => [['torch_iris.py', lineOf('torch_iris.py', 'optimizer.step()')]], endLabel: 'Next step',
  },
  digits: {
    label: '3.4 Handwritten digits', file: 'digits.py', module: 'digits', function: 'train_digits',
    about: '1,797 digits as 64 ink counts: 64 → 32 → 10, tested on 359 digits it never saw.',
    kwargs: () => ({ hidden: 32, steps: 500, seed: 0 }), choices: { hidden: [32, 0] }, watch: {}, picture: null, actions: [],
    episodeEnd: () => [['digits.py', lineOf('digits.py', 'optimizer.step()')]], endLabel: 'Next step',
  },
  mnist_load: {
    label: '4.1 Read MNIST', file: 'mnist.py', module: 'mnist', function: 'load_mnist',
    about: 'Downloads MNIST\'s test files the first time (about 1.7 MB) and reads them: the header with struct, then 10,000 images as a tensor.',
    kwargs: () => ({ split: 'test' }), watch: {}, picture: null, actions: [], episodeEnd: () => [],
  },
  mnist: {
    label: '4.3 Train on MNIST', file: 'mnist_net.py', module: 'mnist_net', function: 'train_mnist',
    about: 'All 60,000 training digits (downloaded the first time, 11 MB), 784 → 128 → 10, mini-batches of 64, two epochs; tested on 10,000.',
    kwargs: () => ({ epochs: 2, seed: 0 }), watch: {}, picture: null, actions: [],
    episodeEnd: () => [['mnist_net.py', lineOf('mnist_net.py', 'history.append(loss.item())')]], endLabel: 'Next batch',
  },
  preprocess: {
    label: '4.4 Prepare a drawing like MNIST', file: 'preprocess.py', module: 'preprocess', function: 'example',
    about: 'A 7 drawn small in a corner, cropped, shrunk into 20 × 20 and centred by its centre of mass in 28 × 28.',
    kwargs: () => ({}), watch: {}, picture: null, actions: [], episodeEnd: () => [],
  },
  race: {
    label: '5.1 Race the optimisers', file: 'optimizers.py', module: 'optimizers', function: 'race_all',
    about: 'Plain gradient descent, momentum and Adam, written by hand, each taking 60 steps down the same narrow valley.',
    kwargs: () => ({}), watch: {}, picture: null, actions: [], episodeEnd: () => [],
  },
  optim_check: {
    label: '5.2 Hand-written vs torch.optim', file: 'optim_check.py', module: 'optim_check', function: 'check_against_torch',
    about: 'The hand-written momentum and Adam beside torch.optim\'s on the same valley: identical to the last digit?',
    kwargs: () => ({}), watch: {}, picture: null, actions: [], episodeEnd: () => [],
  },
  init: {
    label: '5.4 Starting weights', file: 'init_check.py', module: 'init_check', function: 'same_start',
    about: 'Every weight starts at 0.5: after 200 steps of training, are the four hidden neurons still identical?',
    kwargs: () => ({}), watch: {}, picture: null, actions: [], episodeEnd: () => [],
  },
  overfit: {
    label: '5.5 Overfitting', file: 'overfit.py', module: 'overfit', function: 'train_big',
    about: 'A 1 → 64 → 64 → 1 network on 30 noisy points: its error on them and on the true curve, step by step.',
    kwargs: () => ({ steps: 3000, seed: 0 }), choices: { weight_decay: [0, 0.001, 0.01], dropout: [0, 0.2, 0.5] }, watch: { train: all('train_history'), test: all('test_history') }, picture: 'overfit', actions: [],
    episodeEnd: () => [['overfit.py', lineOf('overfit.py', 'test_history.append(')]], endLabel: 'Next step',
  },
}
