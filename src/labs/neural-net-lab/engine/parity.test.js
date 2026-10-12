// The JavaScript engine against the real Python programs and real PyTorch (engine/parity.json,
// recorded by tools/make_parity.py): the same made-up data, the same gradient descent, the same
// hand-written network trained the same way, the same car split, and a general network whose
// gradients and SGD, momentum and Adam steps match PyTorch's (in 64-bit floats on both sides).
import { describe, expect, it } from 'vitest'
import parity from './parity.json'
import { makeLine, makeCurve, fitLine, initNet, trainNet } from './part1.js'
import { split, loadCars, meanAndSpread } from './cars.js'
import { lossAndGradients, makeOptimizer, optimizerStep } from './mlp.js'
import { makeBlobs, makeMoons, trainLogistic, confusion, scores, loadTumours, splitTumours, columnStats } from './part2.js'
import { softmax, trainSoftmax, confusionMatrix, loadDigits, splitDigits, oneHot, padToPixels } from './part3.js'
import { parseMnistSmall, toMnist, exampleDrawing } from './part4.js'
import { race, BEST_RATES, noisyPoints } from './part5.js'
import { KERNELS, convolve, maxPool, reluMap, cnnLossAndGradients } from './cnn.js'
import { makeMLP, forwardOne } from './mlp.js'
import { PyRandom } from '../../qmaze-lab/engine/mt.js'
import { readFileSync } from 'node:fs'

const close = (a, b, tol) => {
  if (Array.isArray(a)) { expect(a.length).toBe(b.length); a.forEach((x, i) => close(x, b[i], tol)); return }
  expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThan(tol)
}

describe('Part 1 programs', () => {
  it('the same made-up points', () => {
    close(makeLine(), parity.line, 1e-15)
    close(makeCurve(), parity.curve, 1e-15)
  })
  it('fit_line: the same 500 steps of gradient descent', () => {
    const r = fitLine()
    close([r.w, r.b], [parity.fit_line.w, parity.fit_line.b], 1e-12)
    close(r.history, parity.fit_line.history, 1e-12)
  })
  it('init_net and train_net: the same starting weights and the same 300 losses', () => {
    const net = initNet(8, 0)
    close([net.w1, net.b1, net.w2, net.b2], [parity.init_net.w1, parity.init_net.b1, parity.init_net.w2, parity.init_net.b2], 1e-15)
    const r = trainNet({ steps: 300 })
    close(r.history, parity.train_net.history, 1e-12)
    close([r.net.w1, r.net.b1, r.net.w2, r.net.b2], [parity.train_net.net.w1, parity.train_net.net.b1, parity.train_net.net.w2, parity.train_net.net.b2], 1e-12)
  })
  it('cars: the same cleaning, shuffle, split and statistics', () => {
    const [train, test] = split(loadCars())
    expect([train.length, test.length]).toEqual(parity.cars.n)
    expect(train.slice(0, 10).map(c => c[0])).toEqual(parity.cars.train)
    expect(test.slice(0, 10).map(c => c[0])).toEqual(parity.cars.test)
    close([meanAndSpread(train.map(c => c[1])), meanAndSpread(train.map(c => c[2]))], parity.cars.stats, 1e-9)
  })
})

describe('Part 2 programs', () => {
  it('the same made-up clouds and moons', () => {
    close(makeBlobs(), parity.blobs, 1e-15)
    close(makeMoons(), parity.moons, 1e-12)
  })
  it('train_logistic: the same 300 steps', () => {
    let last
    for (const step of trainLogistic()) last = step
    close([...last.w, last.b], [...parity.logistic.w, parity.logistic.b], 1e-12)
    close(last.history, parity.logistic.history, 1e-12)
  })
  it('confusion and scores', () => {
    for (const [t, counts] of Object.entries(parity.confusion.at)) expect(confusion(parity.confusion.probs, parity.confusion.labels, Number(t))).toEqual(counts)
    close(scores(...confusion(parity.confusion.probs, parity.confusion.labels)), parity.confusion.scores, 1e-15)
  })
  it('tumours: the same columns, shuffle, split and statistics', () => {
    const [rows, labels, names] = loadTumours()
    expect(names).toEqual(parity.tumours.names)
    const [[trainX], [testX, testY]] = splitTumours(rows, labels)
    expect([trainX.length, testX.length]).toEqual(parity.tumours.n)
    expect(testX.slice(0, 3)).toEqual(parity.tumours.first_test)
    expect(testY.slice(0, 20)).toEqual(parity.tumours.test_labels)
    close(columnStats(trainX).slice(0, 5), parity.tumours.stats, 1e-9)
  })
})

describe('Part 3 programs', () => {
  it('softmax, including scores too big for e^x', () => {
    close([[2, 1, 0.1], [0, 0, 0], [1000, 999, -5]].map(softmax), parity.softmax, 1e-15)
  })
  it('train_softmax: the same 500 steps on the iris flowers', () => {
    let last
    for (const step of trainSoftmax()) last = step
    close([last.weights, last.biases], [parity.train_softmax.weights, parity.train_softmax.biases], 1e-12)
    close(last.history, parity.train_softmax.history, 1e-12)
  })
  it('confusion matrix', () => { expect(confusionMatrix([0, 1, 1, 2, 0, 2], [0, 1, 2, 2, 1, 2], 3)).toEqual(parity.confusion_matrix) })
  it('digits: the same pixels, shuffle and split', () => {
    const [images, labels] = loadDigits()
    const [[trainX], [testX, testY]] = splitDigits(images, labels)
    expect([trainX.length, testX.length]).toEqual(parity.digits.n)
    expect(testY.slice(0, 30)).toEqual(parity.digits.test_labels)
    close(testX[0], parity.digits.first_test, 1e-15)
  })
  it('the drawing pad counts ink the way the data set did: rebuilt 32 × 32 bitmaps give back their 64 counts', () => {
    const [images] = loadDigits()
    for (const img of images.slice(0, 50)) {
      const counts = img.map(p => Math.round(p * 16))
      const grid = Array.from({ length: 32 }, (_, r) => Array.from({ length: 32 }, (_, c) => (r % 4) * 4 + (c % 4) < counts[Math.floor(r / 4) * 8 + Math.floor(c / 4)] ? 1 : 0))
      expect(padToPixels(grid, false)).toEqual(counts)
    }
  })
  for (const run of parity.networks_ce) {
    it(`a 4 → 6 → 3 network with CrossEntropyLoss, ${run.optimiser}: same gradients, losses and weights as PyTorch`, () => {
      const net = { inputs: 4, layers: run.start.map(([W, b], i) => ({ W: W.map(r => [...r]), b: [...b], activation: i === 0 ? 'relu' : 'none' })) }
      const opt = makeOptimizer(net, { kind: run.optimiser, rate: 0.05 }), Y = run.labels.map(l => oneHot(l, 3))
      for (let step = 0; step < 5; step++) {
        const { loss, grads } = lossAndGradients(net, run.x, Y, 'ce')
        if (step === 0) close(grads.map(g => [g.W, g.b]), run.grads, 1e-12)
        close(loss, run.losses[step], 1e-12)
        optimizerStep(net, opt, grads)
      }
      close(net.layers.map(l => [l.W, l.b]), run.end, 1e-10)
    })
  }
})

describe('Part 4', () => {
  it('the browser\'s MNIST sample holds the same digits as MNIST itself', () => {
    const { train, test } = parseMnistSmall(readFileSync(new URL('../data/mnist-small.dat', import.meta.url)))
    expect([train.X.length, test.X.length]).toEqual([3000, 1000])
    expect(train.labels.slice(0, 50)).toEqual(parity.mnist.train_labels)
    expect(test.labels.slice(0, 50)).toEqual(parity.mnist.test_labels)
    expect(train.X[0].map(v => Math.round(v * 255))).toEqual(parity.mnist.first_train)
  })
  it('preparing a drawing like MNIST: the same 28 × 28 image as preprocess.py', () => {
    close(toMnist(exampleDrawing()), parity.preprocess.example, 1e-12)
    close(toMnist(parity.preprocess.ring_input), parity.preprocess.ring, 1e-12)
  })
})

describe('Part 5', () => {
  for (const [kind, run] of Object.entries(parity.races)) {
    it(`${kind} down the valley: the same 60 steps`, () => {
      const r = race(kind, BEST_RATES[kind])
      close(r.path, run.path, 1e-12)
      close(r.error, run.error, 1e-12)
    })
  }
  it('the same noisy points (Python\'s numbers, stored in 32-bit floats by torch.tensor)', () => {
    const [xs, ys] = noisyPoints(30, 0, 0.3)
    close(xs, parity.noisy.xs, 1e-6)
    close(ys, parity.noisy.ys, 1e-6)
  })
  for (const run of parity.networks_wd) {
    it(`weight decay ${run.weight_decay} with ${run.optimiser}: the same weights as torch.optim after 5 steps`, () => {
      const net = { inputs: 2, layers: run.start.map(([W, b], i) => ({ W: W.map(r => [...r]), b: [...b], activation: i === 0 ? 'relu' : 'none' })) }
      const opt = makeOptimizer(net, { kind: run.optimiser, rate: 0.05, weightDecay: run.weight_decay })
      for (let step = 0; step < 5; step++) optimizerStep(net, opt, lossAndGradients(net, run.x, run.y).grads)
      close(net.layers.map(l => [l.W, l.b]), run.end, 1e-10)
    })
  }
  it('dropout: off (p = 0) changes nothing; on, it drops about p of the hidden neurons and scales the rest by 1/(1 − p)', () => {
    const net = makeMLP(3, [{ units: 200, activation: 'relu' }, { units: 1 }], 0), X = [[0.5, -1, 2]], Y = [[1]]
    close(lossAndGradients(net, X, Y, 'mse', { dropout: 0 }).loss, lossAndGradients(net, X, Y).loss, 1e-15)
    const rng = new PyRandom(1), masks = []
    const { as } = forwardOne(net, X[0], net.layers.map((layer, l) => l === 1 ? null : layer.W.map(() => { const m = rng.random() < 0.3 ? 0 : 1 / 0.7; masks.push(m); return m })))
    const dropped = masks.filter(m => m === 0).length
    expect(dropped).toBeGreaterThan(40); expect(dropped).toBeLessThan(80)
    expect(as[1].filter((a, k) => masks[k] === 0 && a !== 0)).toEqual([])
  })
})

describe('Part 6', () => {
  it('convolution and pooling by hand: the same pictures as conv.py', () => {
    for (const [name, kernel] of Object.entries(KERNELS)) close(convolve(toMnist(exampleDrawing()), kernel), parity.conv[name], 1e-12)
    close(maxPool(reluMap(convolve(toMnist(exampleDrawing()), KERNELS['vertical edges']))), parity.pooled, 1e-12)
  })
  it('the CNN: the same loss and the same gradient for every weight as PyTorch\'s Conv2d, MaxPool2d and Linear', () => {
    const p = parity.cnn, net = { filters: 8, W: p.W.map(r => [...r]), b: [...p.b], D: p.D.map(r => [...r]), c: [...p.c] }
    const { loss, grads } = cnnLossAndGradients(net, p.x, p.labels)
    close(loss, p.loss, 1e-12)
    close(grads.W, p.gW, 1e-12); close(grads.b, p.gb, 1e-12); close(grads.D, p.gD, 1e-12); close(grads.c, p.gc, 1e-12)
  })
})

describe('the general network matches PyTorch', () => {
  for (const run of parity.networks) {
    it(`${run.activation}, ${run.optimiser}, ${run.loss}: same gradients, same 5 losses, same weights after`, () => {
      const net = { inputs: 2, layers: run.start.map(([W, b], i) => ({ W: W.map(r => [...r]), b: [...b], activation: i < 2 ? run.activation : 'none' })) }
      const opt = makeOptimizer(net, { kind: run.optimiser, rate: 0.05 })
      for (let step = 0; step < 5; step++) {
        const { loss, grads } = lossAndGradients(net, run.x, run.y, run.loss)
        if (step === 0) close(grads.map(g => [g.W, g.b]), run.grads, 1e-12)
        close(loss, run.losses[step], 1e-12)
        optimizerStep(net, opt, grads)
      }
      close(net.layers.map(l => [l.W, l.b]), run.end, 1e-10)
    })
  }
})
