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

  for (const lesson of LESSONS.filter(l => ['part1', 'part2', 'part3', 'part4'].includes(l.part.id))) {
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

  it('the playground counts your text', () => {
    render(<Playground />)
    act(() => { fireEvent.change(screen.getByLabelText('Your text'), { target: { value: 'The cat. The dog!' } }) })
    expect(screen.getByRole('heading', { name: 'Sentences' }).closest('section').querySelectorAll('li').length).toBe(2)
  })
})
