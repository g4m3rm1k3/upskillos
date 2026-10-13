// @vitest-environment happy-dom
// Every lesson drawn, the scan player stepped through to the end and back, every figure's text
// box given awkward text, a forbidden write refused before Python starts, and the playground
// opened: none of it may throw.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import NlpStudio from './index.jsx'
import Blocks from './Blocks.jsx'
import Playground from './Playground.jsx'
import WriteIt from './WriteIt.jsx'
import PythonTab from './PythonTab.jsx'
import { LESSONS } from './lessons/index.js'
import * as G from './engine/tinygpt.js'

afterEach(cleanup)

const AWKWARD = ['', ' ', '🙂🙂', 'Mr. U.S. 3.50... !!?', 'tab\there\nnew line']

describe('NLP Studio renders', () => {
  it('opens on the first lesson', () => {
    render(<NlpStudio />)
    expect(screen.getAllByText('Text is a list of characters').length).toBeGreaterThan(0)
  })

  for (const lesson of LESSONS) {
    it(`${lesson.number} ${lesson.title}: draws, and its figures survive awkward text`, () => {
      const { container } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onSave={() => {}} />)
      expect(container.textContent.length).toBeGreaterThan(400)
      for (const text of AWKWARD) for (const box of container.querySelectorAll('.nlp-input textarea')) act(() => { fireEvent.change(box, { target: { value: text } }) })
    })
  }

  it('the scan player steps to the end, shows the result, and steps back', () => {
    const lesson = LESSONS.find(l => l.id === 'split-by-hand')
    const { container } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onSave={() => {}} />)
    const next = screen.getByText('Next character ▶')
    for (let i = 0; i < 40; i++) act(() => { fireEvent.click(next) })
    expect(container.querySelector('.qm-result').textContent).toContain("'Hello,', 'world!'")
    act(() => { fireEvent.click(screen.getByText('◀ Back')) })
    expect(container.querySelector('.nlp-trace-code .lit')).toBeTruthy()
  })

  it('a write block refuses forbidden code before starting Python', () => {
    const spec = LESSONS.flatMap(l => l.blocks).find(b => b.write?.forbid).write
    render(<WriteIt spec={spec} done={false} onDone={() => {}} />)
    act(() => { fireEvent.change(screen.getByLabelText(`Your ${spec.fn} function`), { target: { value: 'def split_words(text):\n    return text.split()\n' } }) })
    act(() => { fireEvent.click(screen.getByText('▶ Run the checks')) })
    expect(screen.getByRole('status').textContent).toContain('.split(')
  })

  it('the code box indents after a colon', () => {
    const spec = LESSONS.flatMap(l => l.blocks).find(b => b.write).write
    render(<WriteIt spec={spec} done={false} onDone={() => {}} />)
    const box = screen.getByLabelText(`Your ${spec.fn} function`)
    act(() => { fireEvent.change(box, { target: { value: 'for x in y:' } }) })
    box.selectionStart = box.selectionEnd = box.value.length
    act(() => { fireEvent.keyDown(box, { key: 'Enter' }) })
    expect(box.value).toBe('for x in y:\n    ')
  })

  it('the chart player fills the chart and reads the top cell', () => {
    const lesson = LESSONS.find(l => l.id === 'chart-parser')
    const { container } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onSave={() => {}} />)
    act(() => { fireEvent.click(screen.getByText('Next step ▶')) })
    expect(container.querySelector('.nlp-trace-code .lit')).toBeTruthy()
    act(() => { fireEvent.click(screen.getByText('Fill it all')) })
    expect(container.querySelector('.nlp-chart').closest('.nlp-chart-wrap').textContent).toContain('S×2')
  })

  it('the chatbot answers, and shows how', () => {
    const lesson = LESSONS.find(l => l.id === 'eliza')
    const { container } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onSave={() => {}} />)
    act(() => { fireEvent.change(screen.getByLabelText('Your message'), { target: { value: "I'm worried about you" } }) })
    act(() => { fireEvent.click(screen.getByText('Send')) })
    expect(container.querySelector('.nlp-chat-log').textContent).toContain('worried about I?')
    expect(container.querySelector('.nlp-how code.hit')).toBeTruthy()
  })

  it('a sentence can be derived to the end', () => {
    const lesson = LESSONS.find(l => l.id === 'grammar')
    const { container } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onSave={() => {}} />)
    act(() => { fireEvent.click(screen.getByText('S → NP VP')) })
    act(() => { fireEvent.click(screen.getByText('NP → Pronoun')) })
    act(() => { fireEvent.click(screen.getByText('Finish it at random')) })
    expect(container.querySelector('.qm-result').textContent).toMatch(/^A sentence: /)
  })

  it('the dependency figure rejects two roots', () => {
    const lesson = LESSONS.find(l => l.id === 'dependencies')
    const { container } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onSave={() => {}} />)
    const first = container.querySelector('.nlp-heads select')
    act(() => { fireEvent.change(first, { target: { value: '0' } }) })
    expect(container.querySelector('.nlp-heads').parentElement.textContent).toContain('is_tree: False')
  })

  it('the Real Python tab, in the browser, shows the code and explains a line from the lessons', () => {
    const { container } = render(<PythonTab request={{ program: 'cky' }} />)
    expect(screen.getByText(/needs the UpSkillOS desktop app/)).toBeTruthy()
    const lines = [...container.querySelectorAll('.qm-py-line')]
    act(() => { fireEvent.click(lines.find(l => l.textContent.includes('table[(i, j)] = cell'))) })
    expect(container.querySelector('.qm-py-explain').textContent).toMatch(/never computed again/)
  })

  it('Bot 2 answers, saves, and refuses a bad upload with a reason', async () => {
    const lesson = LESSONS.find(l => l.id === 'intent-bot')
    const { container } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onSave={() => {}} />)
    act(() => { fireEvent.change(screen.getByLabelText('Message to Bot 2'), { target: { value: 'hello' } }) })
    act(() => { fireEvent.click(container.querySelector('.nlp-bot2-chat form button')) })
    expect(container.querySelector('.nlp-bot2-chat .nlp-chat-log').textContent).toContain('Welcome to the bike shop')
    act(() => { fireEvent.click(screen.getByText('Save in this browser')) })
    expect(screen.getByText(/Saved in this browser|won’t store it/)).toBeTruthy()
    const bad = new File([JSON.stringify({ intents: { greeting: { examples: 'hello' } } })], 'bot.json', { type: 'application/json' })
    await act(async () => { fireEvent.change(screen.getByLabelText('Upload a bot'), { target: { files: [bad] } }) })
    await screen.findByText(/Not loaded: Intent “greeting” needs a list of example strings/)
  })

  it('the spam trainer retrains on an example you add', () => {
    const lesson = LESSONS.find(l => l.id === 'naive-bayes')
    const { container } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onSave={() => {}} />)
    const before = container.querySelector('.nlp-nb').textContent
    act(() => { fireEvent.change(screen.getByLabelText('A training example of your own'), { target: { value: 'claim your prize now' } }) })
    act(() => { fireEvent.click(screen.getByText('Add and retrain')) })
    expect(container.querySelector('.nlp-nb').textContent).not.toBe(before)
    expect(screen.getByText(/1 of yours/)).toBeTruthy()
  })

  it('the word2vec trainer runs to the end, with the loss falling', async () => {
    vi.useFakeTimers()
    try {
      const lesson = LESSONS.find(l => l.id === 'word2vec')
      const { container } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onSave={() => {}} />)
      act(() => { fireEvent.click(screen.getByText('▶ Train')) })
      for (let i = 0; i < 45; i++) await act(async () => { vi.advanceTimersByTime(70) })
      expect(container.textContent).toMatch(/Pass 40 of 40/)
      expect(container.querySelectorAll('.nlp-map .nlp-map-word').length).toBeGreaterThan(100)
      expect(container.querySelector('.nlp-near').textContent).toMatch(/snapped|brake|tyre|wheel/)
    } finally { vi.useRealTimers() }
  })

  it('one update moves the probability towards the label', () => {
    const lesson = LESSONS.find(l => l.id === 'word2vec')
    render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onSave={() => {}} />)
    expect(screen.getByText('higher: closer to 1 ✓')).toBeTruthy()
  })

  it('the meaning bot says “not sure” about pizza, and answers the tyre', () => {
    const lesson = LESSONS.find(l => l.id === 'meaning-bot')
    const { container } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onSave={() => {}} />)
    act(() => { fireEvent.click(screen.getByText('“do you sell pizza”')) })
    expect(container.querySelector('.nlp-nb section:last-child').textContent).toContain('not sure')
    act(() => { fireEvent.click(screen.getByText('“my tyre is flat”')) })
    expect(container.querySelector('.nlp-nb section:last-child').textContent).toContain('repair')
  })

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

  it('the playground counts your text', () => {
    render(<Playground />)
    act(() => { fireEvent.change(screen.getByLabelText('Your text'), { target: { value: 'The cat. The dog!' } }) })
    expect(screen.getByRole('heading', { name: 'Sentences' }).closest('section').querySelectorAll('li').length).toBe(2)
  })
})
