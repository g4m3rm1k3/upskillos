// The JavaScript engine against recorded runs of the Python programs (tools/make_parity.py):
// the same notebook, the same starting weights, every loss of pretraining and the same answers,
// number for number; then Part 2's KV cache, sampling and costs.
import { describe, expect, it } from 'vitest'
import parity from './parity.json'
import { initModel, newCache, forwardCached } from './gpt.js'
import { notebook, pretrain, complete, exactMatch, QUESTIONS, encode, decode, NEWLINE } from './arith.js'
import { generate, cacheMatches, generationCost } from './generate.js'
import { baseModel } from './models.js'

describe('engine = python', () => {
  it('writes the same notebook and starts from the same weights', () => {
    expect(notebook().slice(0, 120)).toBe(parity.notebook_start)
    expect(initModel(17).tok[0]).toEqual(parity.init_tok_row0)
  })
  it('pretrains to exactly the same losses, weights and answers', () => {
    const [model, losses] = pretrain()
    expect(losses.slice(0, 50)).toEqual(parity.losses_first)
    expect(losses.slice(-50)).toEqual(parity.losses_last)
    expect(model.out[0]).toEqual(parity.out_row0)
    expect(QUESTIONS.map(([a, b]) => complete(model, a, b))).toEqual(parity.completions)
    expect(exactMatch(model)).toBe(parity.exact_match)
  }, 120000)
  it('gives the same cached logits, the same samples and the same costs', () => {
    const [model] = baseModel(), cache = newCache()
    expect(encode('3+5=8\n1+1=').map(t => forwardCached(model, cache, t))).toEqual(parity.cached_logits)
    expect(cacheMatches(model, encode('3+5=8\n2+2=4\n1+1='))).toBe(parity.cache_matches)
    expect(QUESTIONS.map(([a, b]) => decode(generate(model, encode(`${a}+${b}=`), NEWLINE, 3, 1.0, null, 10 * a + b)))).toEqual(parity.sampled_t1)
    expect(QUESTIONS.map(([a, b]) => decode(generate(model, encode(`${a}+${b}=`), NEWLINE, 3, 0.7, 3, 10 * a + b)))).toEqual(parity.sampled_t07_k3)
    expect([generationCost(4, 3), generationCost(1, 63)]).toEqual(parity.cost)
  }, 120000)
})

describe('the KV cache', () => {
  it('generates exactly what greedy decoding does, on all 100 questions', () => {
    const [model] = baseModel()
    expect(QUESTIONS.map(([a, b]) => decode(generate(model, encode(`${a}+${b}=`), NEWLINE, 3)))).toEqual(parity.completions)
  }, 120000)
  it('stops when every position is used: 1 prompt token + 16 new, the last predicted by position 15', () => {
    const model = initModel(17)
    expect(generate(model, [0], -1, 100).length).toBe(16)
  })
})
