// The JavaScript engine against recorded runs of the Python programs (tools/make_parity.py):
// the same notebook, the same starting weights, every loss of pretraining and the same answers,
// number for number.
import { describe, expect, it } from 'vitest'
import parity from './parity.json'
import { initModel } from './gpt.js'
import { notebook, pretrain, complete, exactMatch, QUESTIONS } from './arith.js'

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
})
