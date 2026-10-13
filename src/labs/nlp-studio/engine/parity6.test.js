// Part 6's engine against the real Python (python/chat.py): the generated dialogues, chat tokens,
// the loss mask, top-k, and a small chat model trained 12 steps, to within 1e-9, with its replies.
// Regenerate parity6.json with: python src/labs/nlp-studio/tools/make_parity.py
import { describe, expect, it } from 'vitest'
import parity from './parity6.json'
import * as Ch from './chat.js'
import * as G from './tinygpt.js'
import { Rng } from './vectors.js'
import { close } from './close.js'

describe('Part 6 gives the same answers as the Python', () => {
  const [train, held] = Ch.makeDialogues()
  it('the generated dialogues and their split', () => {
    expect(train).toEqual(parity.train)
    expect(held).toEqual(parity.held)
  })
  it('chat tokens, detokenizing, the dialogue format', () => {
    for (const [t, toks] of Object.entries(parity.chat_tokens)) expect(Ch.chatTokens(t), t).toEqual(toks)
    expect(["you're welcome.", 'order 512 ships tomorrow.', 'hello! how can i help?'].map(t => Ch.detokenize(Ch.chatTokens(t)))).toEqual(parity.detokenize)
    expect(Ch.formatDialogue([['user', 'where is order 512'], ['bot', 'order 512 ships tomorrow.']])).toEqual(parity.format)
  })
  it('tokens, roles, the loss mask, the vocabulary, top-k', () => {
    const [tokens, roles] = Ch.toTokens(train.slice(0, 20), new Rng(3))
    expect(tokens).toEqual(parity.tokens)
    expect(roles).toEqual(parity.roles)
    expect(Ch.lossMask(roles, 3, 10)).toEqual(parity.mask)
    expect(Ch.makeVocab(train)).toEqual(parity.vocab_full)
    close([1, 2, 3, 4].map(k => Ch.topK([0.1, 0.4, 0.2, 0.3], k)), parity.top_k, 'top_k')
  })
  it('a chat model trained 12 steps: the same weights, losses and replies', () => {
    const [vocab, model, losses] = Ch.trainChat(train.slice(0, 40), 12, { dim: 8, context: 16, hidden: 16, lr: 0.005, seed: 2 })
    expect(vocab).toEqual(parity.chat_train.vocab)
    close(losses, parity.chat_train.losses, 'losses')
    close(model, parity.chat_train.model, 'weights')
    for (const [m, r] of Object.entries(parity.chat_train.replies)) expect(Ch.reply(vocab, model, [], m), m).toEqual(r)
    expect(Ch.reply(vocab, model, ['«', 'hi', '¶', '»', 'hello', '¶'], 'where is order 512', { temperature: 0.8, k: 3, rng: new Rng(4) })).toEqual(parity.chat_train.sampled)
  })
  it('every held-out repair pairing is really absent from training', () => {
    for (const [part, problem] of Ch.HELD_OUT) expect(train.some(([u]) => u.includes(part) && u.includes(problem))).toBe(false)
  })
  it('a Bot 3 file round-trips, and other files are refused with a reason', () => {
    const [vocab, model] = Ch.trainChat(train.slice(0, 40), 3, { dim: 8, context: 16, hidden: 16 })
    const back = Ch.chatFromSafetensors(Ch.chatToSafetensors(vocab, model))
    expect(back.vocab).toEqual(vocab)
    expect(back.model.out).toEqual(model.out.map(r => r.map(Math.fround)))
    expect(() => Ch.chatFromSafetensors(G.toSafetensors(['a', 'b'], G.initModel(2, 2, 2, 2)))).toThrow(/Part 5 tiny GPT/)
    expect(() => Ch.chatFromSafetensors(new Uint8Array([1, 2]))).toThrow(/too short|header/)
  })
})
