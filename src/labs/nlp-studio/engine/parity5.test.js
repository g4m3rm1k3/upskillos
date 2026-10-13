// Part 5's engine against the real Python (python/lm.py, tinygpt.py): perplexity, sampling, BPE,
// attention, and the tiny GPT trained for 15 steps with and without attention, to within 1e-9.
// Then the file format: a .safetensors file written by the page is read by the Python.
// Regenerate parity5.json with: python src/labs/nlp-studio/tools/make_parity.py
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import parity from './parity5.json'
import * as L from './lm.js'
import * as G from './tinygpt.js'
import { Rng } from './vectors.js'
import { words, bigramModel } from './counting.js'
import { count } from './text.js'
import { SENTENCES } from './corpus.js'
import { MESSAGES } from './data.js'
import { close } from './close.js'

const PYTHON = ['python3', 'python'].find(cmd => { try { return spawnSync(cmd, ['--version']).status === 0 } catch { return false } })
const bikeText = SENTENCES.join('. ') + '.'
const small = { dim: 8, context: 8, hidden: 16, lr: 0.01, seed: 3 }

describe('Part 5 gives the same answers as the Python', () => {
  it('perplexity, softmax with temperature, sampling', () => {
    close([[-0.5, -1, -2], Array(4).fill(-2.302585092994046), [-0.01]].map(L.perplexity), parity.perplexity, 'perplexity')
    close([0.1, 0.5, 1, 2, 10].map(t => L.softmax([2, 1, 0.1], t)), parity.softmax, 'softmax')
    expect([0, 0.19, 0.2, 0.69, 0.7, 0.99].map(r => L.sample([0.2, 0.5, 0.3], r))).toEqual(parity.sample)
  })
  it('sampling words from the bigram model at three temperatures', () => {
    const model = bigramModel(words(MESSAGES.map(([t]) => t).join(' ')))
    for (const [t, out] of Object.entries(parity.generate_bigram)) expect(L.generateBigram(model, 'claim', 10, Number(t), new Rng(9)), `T=${t}`).toEqual(out)
  })
  it('BPE merges and encodings', () => {
    const merges = L.trainBpe(count(words(SENTENCES.join(' '))), 40)
    expect(merges).toEqual(parity.merges)
    for (const [w, toks] of Object.entries(parity.encode)) expect(L.bpeEncode(w, merges), w).toEqual(toks)
  })
  it('the softmax-cross-entropy gradient and attention', () => {
    close(L.crossEntropyGrad([1, 2, 0.5], 1), parity.cross_entropy_grad, 'grad')
    close(L.attention([[1, 0], [0, 1], [1, 1]], [[1, 0], [0, 1], [1, -1]], [[1, 2], [3, 4], [5, 6]]), parity.attention, 'attention')
  })
  it('the tiny GPT after 15 steps of Adam: the same weights, losses and sampled text', () => {
    const [vocab, model, losses] = G.train(bikeText, 15, small)
    expect(vocab).toEqual(parity.gpt.vocab)
    close(losses, parity.gpt.losses, 'losses')
    close(model, parity.gpt.model, 'weights')
    expect(G.generate(vocab, model, 'my chain', 20, 0.8, new Rng(5))).toBe(parity.gpt.sample)
    const [, plain, plainLosses] = G.train(bikeText, 15, { ...small, useAttention: false })
    close(plainLosses, parity.no_attention.losses, 'no-attention losses')
    close(plain, parity.no_attention.model, 'no-attention weights')
    close([G.averageLoss(vocab, model, bikeText.slice(-200)), G.averageLoss(vocab, plain, bikeText.slice(-200), false)], parity.average_loss, 'average loss')
  })
  it('the tensor attention inside the GPT equals the plain-list attention function', () => {
    const [vocab, model] = G.train(bikeText, 5, small)
    const ids = [...'the shop'].map(c => vocab.indexOf(c))
    const x = G.add(G.embed(new G.Tensor(model.tok), ids), G.embed(new G.Tensor(model.pos), ids.map((_, i) => i)))
    const q = G.matmul(x, new G.Tensor(model.wq)).data, k = G.matmul(x, new G.Tensor(model.wk)).data, v = G.matmul(x, new G.Tensor(model.wv)).data
    const weights = G.forward(model, ids)[2].data
    const mixed = weights.map(row => v[0].map((_, c) => row.reduce((s, w, j) => s + w * v[j][c], 0)))
    close(mixed, L.attention(q, k, v), 'attention')
  })
})

describe('.safetensors', () => {
  const [vocab, model] = G.train(bikeText, 10, small)
  const bytes = G.toSafetensors(vocab, model)
  const f32 = x => Math.fround(x)

  it('round-trips in the page (to float32 precision), and refuses broken files with a reason', () => {
    const back = G.fromSafetensors(bytes)
    expect(back.vocab).toEqual(vocab)
    for (const n of G.PARAMS) expect(back.model[n]).toEqual(model[n].map(r => r.map(f32)))
    expect(() => G.fromSafetensors(bytes.slice(0, 5))).toThrow(/too short/)
    expect(() => G.fromSafetensors(bytes.slice(0, 200))).toThrow(/doesn’t fit|wrong size/)
    const notOurs = G.toSafetensors(vocab, model); notOurs.set(new TextEncoder().encode('{"__metadata__":{"format":"other"}}'.padEnd(Number(new DataView(notOurs.buffer).getBigUint64(0, true)))), 8)
    expect(() => G.fromSafetensors(notOurs)).toThrow(/isn’t a tiny GPT/)
  })

  it.skipIf(!PYTHON)('a file written by the page is read by the Python, number for number', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'nlp-st-')), file = path.join(dir, 'tiny.safetensors')
    writeFileSync(file, bytes)
    const py = path.resolve(import.meta.dirname, '../python')
    const script = `import sys, json; sys.path.insert(0, ${JSON.stringify(py)}); import tinygpt\nvocab, model = tinygpt.load_safetensors(${JSON.stringify(file)})\nprint(json.dumps({"vocab": vocab, "model": model}))`
    const r = spawnSync(PYTHON, ['-c', script], { encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(r.status, r.stderr).toBe(0)
    const got = JSON.parse(r.stdout)
    expect(got.vocab).toEqual(vocab)
    for (const n of G.PARAMS) expect(got.model[n], n).toEqual(model[n].map(row => row.map(f32)))
  })
})
