// @vitest-environment happy-dom
// Parts 5–8 of NLP Studio drawn and driven: the trainers run, models load (stand-ins for the real
// Hugging Face models), and every lesson survives awkward text. Split from render.test.jsx so that
// the trainers here and the figures there each get a worker (and a memory limit) of their own.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import Blocks from './Blocks.jsx'
import { LESSONS } from './lessons/index.js'
import * as G from './engine/tinygpt.js'

// Part 7's figures load real models from Hugging Face; here they get small stand-ins instead.
vi.mock('./engine/pretrained.js', async original => {
  const real = await original()
  const tokenizer = { encode: t => [...t].map((_, i) => i), model: { vocab: Array(50257), convert_ids_to_tokens: ids => ids.map(i => `t${i}`) } }
  const embedder = async sentences => ({ tolist: () => sentences.map(s => real.normalize([s.length % 7 + 1, s.includes('chain') ? 5 : 1, s.includes('open') ? 5 : 1])) })
  const generator = async messages => [{ generated_text: [...messages, { role: 'assistant', content: `stand-in reply to: ${messages.at(-1).content}` }] }]
  const models = { tokenizer, embedder, chat: generator }
  return { ...real, load: async (kind, onProgress) => { onProgress?.(1, 'stand-in'); return models[kind] }, isLoaded: () => false }
})

afterEach(cleanup)

const AWKWARD = ['', ' ', '🙂🙂', 'Mr. U.S. 3.50... !!?', 'tab\there\nnew line']

describe('NLP Studio renders, Parts 5–8', () => {
  for (const lesson of LESSONS.filter(l => ['part5', 'part6', 'part7', 'part8'].includes(l.part.id))) {
    it(`${lesson.number} ${lesson.title}: draws, and its figures survive awkward text`, () => {
      const { container } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onSave={() => {}} />)
      expect(container.textContent.length).toBeGreaterThan(400)
      for (const text of AWKWARD) for (const box of container.querySelectorAll('.nlp-input textarea')) act(() => { fireEvent.change(box, { target: { value: text } }) })
    })
  }

  it('the tiny GPT trains in the page, measures held-out loss, and downloads and reloads', async () => {
    vi.useFakeTimers()
    try {
      const lesson = LESSONS.find(l => l.id === 'tiny-gpt')
      const { container } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onSave={() => {}} />)
      const fig = [...container.querySelectorAll('.qm-figure')].find(f => f.textContent.includes('Training text'))
      act(() => { fireEvent.change(fig.querySelector('input[type=range]'), { target: { value: '500' } }) })
      act(() => { fireEvent.click(screen.getByText('▶ Train')) })
      for (let i = 0; i < 12; i++) await act(async () => { vi.advanceTimersByTime(5) })
      expect(fig.textContent).toMatch(/Step 500 of 500/)
      expect(fig.textContent).toMatch(/Held-out loss now/)
      expect(fig.querySelector('.nlp-attmap .nlp-att')).toBeTruthy()
      const bytes = G.toSafetensors(...(() => { const t = G.makeTrainer('abc abc abc abc abc abc abc abc abc abc abc abc abc', { dim: 4, context: 4, hidden: 8 }); return [t.vocab, t.model] })())
      const upload = new File([bytes], 'mine.safetensors')
      await act(async () => { fireEvent.change(screen.getByLabelText('Upload a model'), { target: { files: [upload] } }) })
      await vi.waitFor(() => expect(fig.textContent).toMatch(/Loaded mine\.safetensors: 4 characters/))
      const bad = new File([new Uint8Array([1, 2, 3])], 'broken.safetensors')
      await act(async () => { fireEvent.change(screen.getByLabelText('Upload a model'), { target: { files: [bad] } }) })
      await vi.waitFor(() => expect(fig.textContent).toMatch(/Not loaded: The file is too short/))
    } finally { vi.useRealTimers() }
  })

  it('Part 5 figures: perplexity, temperature, BPE and attention respond', () => {
    for (const id of ['language-model', 'sampling', 'bpe', 'attention']) {
      const lesson = LESSONS.find(l => l.id === id)
      const { container, unmount } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onSave={() => {}} />)
      for (const range of container.querySelectorAll('.qm-figure input[type=range]')) act(() => { fireEvent.change(range, { target: { value: range.max } }) })
      expect(container.textContent.length).toBeGreaterThan(1000)
      unmount()
    }
  })

  it('Bot 3: train a little, chat, and refuse a Part 5 file with a reason', async () => {
    vi.useFakeTimers()
    try {
      const lesson = LESSONS.find(l => l.id === 'bot3')
      const { container } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onSave={() => {}} />)
      const fig = [...container.querySelectorAll('.qm-figure')].find(f => f.textContent.includes('Train Bot 3'))
      act(() => { fireEvent.change(fig.querySelector('input[type=range]'), { target: { value: '1000' } }) })
      act(() => { fireEvent.click(screen.getByText('▶ Train Bot 3')) })
      for (let i = 0; i < 25; i++) await act(async () => { vi.advanceTimersByTime(5) })
      expect(fig.textContent).toMatch(/Step 1000 of 1000/)
      expect(fig.textContent).toMatch(/Held-out repairs/)
      act(() => { fireEvent.change(screen.getByLabelText('Message to Bot 3'), { target: { value: 'my chain is rusty' } }) })
      act(() => { fireEvent.click(fig.querySelector('.nlp-chat-form .qm-primary')) })
      expect(fig.querySelector('.nlp-chat-log').textContent).toMatch(/rusty/)
      const part5 = new File([G.toSafetensors(['a', 'b'], G.initModel(2, 2, 2, 2))], 'gpt.safetensors')
      await act(async () => { fireEvent.change(screen.getByLabelText('Upload a Bot 3 model'), { target: { files: [part5] } }) })
      await vi.waitFor(() => expect(fig.textContent).toMatch(/Not loaded: That is a Part 5 tiny GPT/))
    } finally { vi.useRealTimers() }
   }, 60000)

  it('Part 6 figures without a trained Bot 3 say where to get one; the format and template figures draw', () => {
    for (const id of ['chat-format', 'dialogue-data', 'loss-mask', 'decoding', 'three-bots']) {
      const lesson = LESSONS.find(l => l.id === id)
      const { container, unmount } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onSave={() => {}} />)
      expect(container.textContent.length).toBeGreaterThan(800)
      unmount()
    }
  })

  it('Part 7: the model figures load (stand-ins here), tokenize, compare meanings, chat and ground', async () => {
    for (const id of ['real-tokenizer', 'sentence-embeddings', 'pretrained-chat', 'grounding']) {
      const lesson = LESSONS.find(l => l.id === id)
      const { container, unmount } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onSave={() => {}} />)
      for (const b of [...container.querySelectorAll('.nlp-load button')]) await act(async () => { fireEvent.click(b) })
      await vi.waitFor(() => expect(container.querySelectorAll('.nlp-load').length).toBe(0))
      if (id === 'real-tokenizer') expect(container.textContent).toMatch(/GPT-2: \d+ tokens/)
      if (id === 'sentence-embeddings') await vi.waitFor(() => expect(container.querySelector('.nlp-sim')).toBeTruthy())
      if (id === 'pretrained-chat') {
        act(() => { fireEvent.change(screen.getByLabelText('Message to SmolLM2'), { target: { value: 'hello there' } }) })
        await act(async () => { fireEvent.click(container.querySelector('.nlp-chat-form .qm-primary')) })
        await vi.waitFor(() => expect(container.textContent).toMatch(/stand-in reply to: hello there/))
      }
      if (id === 'grounding') {
        await act(async () => { fireEvent.click(screen.getByText('Ask')) })
        await vi.waitFor(() => expect(container.querySelector('.nlp-stages')).toBeTruthy())
      }
      unmount()
    }
  })

  it('Part 7: LoRA on a trained Bot 3 changes the Sunday answer and reports what it trained', async () => {
    const { setBot } = await import('./figures/part6.jsx')
    const { makeDialogues, trainChat } = await import('./engine/chat.js')
    const [vocab, model] = trainChat(makeDialogues()[0], 300, { dim: 8, context: 32, hidden: 16, lr: 0.01 })
    act(() => setBot({ vocab, model, source: 'a test model' }))
    const lesson = LESSONS.find(l => l.id === 'lora')
    const { container } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onSave={() => {}} />)
    act(() => { fireEvent.change(container.querySelector('.qm-figure input[type=range]:last-of-type'), { target: { value: '50' } }) })
    await act(async () => { fireEvent.click(screen.getByText('Fine-tune')) })
    await vi.waitFor(() => expect(container.textContent).toMatch(/trained \d[\d,]* numbers of/), { timeout: 20000 })
    act(() => setBot(null))
  }, 60000)

  it('Part 8: the help desk answers or refuses, and its tests run and choose a threshold', async () => {
    const H = await import('./engine/helpdesk.js')
    const desk = LESSONS.find(l => l.id === 'help-desk')
    let view = render(<Blocks lesson={desk} saved={{}} onSolved={() => {}} onSave={() => {}} />)
    const faqBox = view.container.querySelector('.nlp-input textarea')
    act(() => { fireEvent.change(faqBox, { target: { value: H.FAQ } }) })
    await act(async () => { fireEvent.click(view.container.querySelector('.nlp-load button')) })
    await vi.waitFor(() => expect(view.container.querySelectorAll('.nlp-load').length).toBe(0))
    expect(view.container.textContent).toMatch(/7 entries, 14 example questions/)
    act(() => { fireEvent.change(screen.getByLabelText('Ask the help desk'), { target: { value: 'my chain broke' } }) })
    await vi.waitFor(() => expect(view.container.textContent).toMatch(/Closest example questions/))
    act(() => { fireEvent.change(view.container.querySelector('.qm-figure input[type=range]'), { target: { value: '0.9' } }) })
    expect(view.container.textContent).toMatch(/I don’t know/)
    act(() => { fireEvent.change(faqBox, { target: { value: 'nothing useful' } }) })
    expect(view.container.textContent).toMatch(/0 entries, 0 example questions/)
    act(() => { fireEvent.change(faqBox, { target: { value: H.FAQ } }) })
    view.unmount()

    view = render(<Blocks lesson={LESSONS.find(l => l.id === 'help-desk-tests')} saved={{}} onSolved={() => {}} onSave={() => {}} />)
    act(() => { fireEvent.change(view.container.querySelector('.nlp-input textarea'), { target: { value: H.TESTS } }) })
    await act(async () => { fireEvent.click(view.container.querySelector('.nlp-load button')) })
    await vi.waitFor(() => expect(screen.getByText('Run the 15 tests').disabled).toBe(false))
    await act(async () => { fireEvent.click(screen.getByText('Run the 15 tests')) })
    await vi.waitFor(() => expect(view.container.textContent).toMatch(/Cheapest threshold/))
    expect(view.container.querySelectorAll('.qm-log tbody tr').length).toBe(15)
    expect([...view.container.querySelectorAll('.qm-figure button')].some(b => b.textContent === 'Download helpdesk.json')).toBe(true)
    view.unmount()
  })

})
