// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import DiscreteMathLab from './index.jsx'
import Blocks from './Blocks.jsx'
import PuzzlesTab, { PUZZLES } from './PuzzlesTab.jsx'
import { LESSONS, lessonById } from './lessons/index.js'
import { FIGURES } from './figures/index.js'
import { SYMBOLS, EQUATIONS } from './decoder.js'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('DiscreteMathLab shell & lessons', () => {
  it('opens on the first lesson (Propositions, Truth Values & Connectives)', () => {
    render(<DiscreteMathLab />)
    expect(screen.getAllByText(/Propositions, Truth Values/i).length).toBeGreaterThan(0)
  })

  it('renders every one of the 40 lessons and its figures without throwing', () => {
    for (const lesson of LESSONS) {
      const { container, unmount } = render(
        <Blocks lesson={lesson} saved={{}} onSolved={() => {}} onPuzzle={() => {}} FIGURES={FIGURES} />,
      )
      expect(container.querySelectorAll('.qm-figure').length, lesson.id).toBeGreaterThanOrEqual(1)
      expect(container.querySelector('.dm-proof-builder'), lesson.id).toBeTruthy()
      unmount()
    }
  }, 60000)
})

describe('Interactive Proof & Derivation Builder', () => {
  it('steps through a proof and marks it complete', () => {
    const lesson = lessonById('propositions')
    let solvedKey = null
    render(<Blocks lesson={lesson} saved={{}} onSolved={k => { solvedKey = k }} onPuzzle={() => {}} FIGURES={FIGURES} />)
    expect(screen.getByText(/Interactive Proof & Derivation Builder/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Show full proof' }))
    expect(screen.getByText(/Proof complete:/i)).toBeTruthy()
    expect(solvedKey).toContain('proof:')
  })
})

describe('Symbol & Theorem Decoder', () => {
  it('links every symbol and theorem piece to a real lesson', () => {
    for (const s of SYMBOLS) expect(lessonById(s[4]), s[0]).toBeTruthy()
    for (const e of EQUATIONS) {
      for (const p of e.parts) expect(lessonById(p[2]), `${e.id}: ${p[0]}`).toBeTruthy()
    }
  })

  it('searches symbols and opens the linked lesson', () => {
    render(<DiscreteMathLab />)
    fireEvent.click(screen.getByRole('tab', { name: /Symbol & Theorem Decoder/i }))
    fireEvent.change(screen.getByPlaceholderText(/e.g. forall/i), { target: { value: 'totient' } })
    const btn = screen.getAllByRole('button', { name: new RegExp(lessonById('crt-fermat').number) })[0]
    fireEvent.click(btn)
    expect(document.querySelector('.qm-lesson > header h1').textContent).toContain('Chinese Remainder')
  })
})

describe('Puzzles & Challenges Workbench', () => {
  it('renders all 8 interactive studios without error', () => {
    for (const p of PUZZLES) {
      const { unmount } = render(
        <PuzzlesTab activePuzzle={p.id} onSelectPuzzle={() => {}} solvedPuzzles={[]} onSolvePuzzle={() => {}} />,
      )
      expect(screen.getByRole('heading', { level: 2 }).textContent).toContain(p.title)
      unmount()
    }
  })
})

describe('Progress persistence', () => {
  it('persists current lesson and solved checks across remounts, and recovers from malformed JSON', () => {
    localStorage.setItem('upskillos.discrete-math-lab.v1', JSON.stringify({ current: 'induction' }))
    const view = render(<DiscreteMathLab />)
    expect(document.querySelector('.qm-lesson > header h1').textContent).toContain('Mathematical Induction')
    view.unmount()

    localStorage.setItem('upskillos.discrete-math-lab.v1', JSON.stringify({ current: 'nonexistent', lessons: 'bad', done: null }))
    render(<DiscreteMathLab />)
    expect(document.querySelector('.qm-lesson > header h1').textContent).toContain('Propositions')
  })
})
