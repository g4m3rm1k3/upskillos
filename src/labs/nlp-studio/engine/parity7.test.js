// Part 7's engine against the real Python (python/pretrained.py, chat.py's fine-tuning): GPT-2's
// byte table, pooling, the chat template, fact retrieval, LoRA as a function, and fine-tuning a
// small chat model with LoRA and in full for 5 steps, to within 1e-9.
// Regenerate parity7.json with: python src/labs/nlp-studio/tools/make_parity.py
import { describe, expect, it } from 'vitest'
import parity from './parity7.json'
import * as P from './pretrained.js'
import * as Ch from './chat.js'
import { close } from './close.js'

describe('Part 7 gives the same answers as the Python', () => {
  it('GPT-2’s byte table and byte symbols (including a space as Ġ and é as Ã©)', () => {
    expect(P.bytesToUnicode()).toEqual(parity.table)
    for (const [t, s] of Object.entries(parity.byte_symbols)) expect(P.byteSymbols(t), JSON.stringify(t)).toBe(s)
    expect(P.byteSymbols(' ')).toBe('Ġ')
    expect(P.byteSymbols('é')).toBe('Ã©')
  })
  it('mean pooling, normalizing, the chat template, top facts, the grounded messages, LoRA as a function', () => {
    close(P.meanPool([[1, 2], [3, 4], [100, 100]], [1, 1, 0]), parity.mean_pool, 'mean_pool')
    close([P.normalize([3, 4]), P.normalize([0, 0])], parity.normalize, 'normalize')
    expect([P.chatTemplate([{ role: 'system', content: 'S' }, { role: 'user', content: 'hi' }]), P.chatTemplate([{ role: 'user', content: 'x' }], false)]).toEqual(parity.chat_template)
    close(P.topFacts([0.6, 0.8, 0], [[0.6, 0.8, 0], [1, 0, 0], [0, 0.6, 0.8], [0, 1, 0]], 3), parity.top_facts, 'top_facts')
    expect(P.groundedMessages(P.FACTS.slice(0, 2), 'are you open on saturday?')).toEqual(parity.grounded)
    close(P.loraMatmul([[1, 2]], [[1, 0], [0, 1]], [[1], [1]], [[0.5, -0.5]], 2), parity.lora_matmul, 'lora_matmul')
  })
  it('fine-tuning: the new Sunday conversations, LoRA init, 5 LoRA steps, the merge, and 5 full steps', () => {
    const [train] = Ch.makeDialogues()
    const small = { dim: 8, context: 16, hidden: 16, lr: 0.005, seed: 2 }
    expect(Ch.sundayUpdate()).toEqual(parity.sunday_update)
    const [vocab, base] = Ch.trainChat(train.slice(0, 40), 6, small)
    close(Ch.initLora(base, ['wq'], 2), parity.lora.init, 'init')
    const lora = Ch.initLora(base, ['wq', 'w1'], 2)
    expect(Ch.loraSize(lora)).toBe(parity.lora.size)
    close(Ch.finetuneChat(vocab, base, Ch.sundayUpdate(), 5, { lora, lr: 0.01 }), parity.lora.losses, 'lora losses')
    close(lora, parity.lora.after, 'lora after')
    close(Ch.mergeLora(base, lora).wq, parity.lora.merged_wq, 'merged')
    const full = Ch.cloneModel(base)
    close(Ch.finetuneChat(vocab, full, Ch.sundayUpdate(), 5, { lr: 0.01 }), parity.full.losses, 'full losses')
    close(full.w1, parity.full.w1, 'full w1')
  })
  it('LoRA starts as no change at all: B is zero, so merging before training gives the same weights', () => {
    const [vocab, base] = Ch.trainChat(Ch.makeDialogues()[0].slice(0, 20), 2, { dim: 8, context: 16, hidden: 16 })
    const lora = Ch.initLora(base, ['wq', 'wv', 'w1'], 3)
    expect(Ch.mergeLora(base, lora)).toEqual(Ch.cloneModel(base))
    expect(Ch.reply(vocab, base, [], 'hello', {})).toEqual(Ch.reply(vocab, Ch.mergeLora(base, lora), [], 'hello', {}))
  })
})
