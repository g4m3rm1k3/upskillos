// @vitest-environment happy-dom
// Every lesson drawn and its buttons pressed, and the Python tab opened on every program: none of
// it may throw.
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import LlmLab from './index.jsx'
import Blocks from '../python-steps/Blocks.jsx'
import PythonTab from './PythonTab.jsx'
import { LESSONS } from './lessons/index.js'
import { FIGURES } from './figures/index.js'
import { PROGRAMS } from './programs.js'
import { codeLines } from './source.js'

afterEach(cleanup)
const PRESS = ['Pretrain 1500 steps', '⌫', 'Clear', '+', '=', '7', '0.5', '2', 'Sample 1,000 answers', 'Score 20 runs at each temperature', 'Measure in this browser']

describe('the lab renders', () => {
  it('opens on the first lesson', () => {
    render(<LlmLab />)
    expect(screen.getAllByText('What a language model computes').length).toBeGreaterThan(0)
  })
  for (const lesson of LESSONS) {
    it(`${lesson.number} ${lesson.title}: draws, and its buttons work`, () => {
      const { container } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onPython={() => {}} FIGURES={FIGURES} codeLines={codeLines} />)
      expect(container.textContent.length).toBeGreaterThan(200)
      expect(container.textContent).not.toMatch(/Missing figure/)
      for (const label of PRESS) for (const button of screen.queryAllByText(label)) act(() => { fireEvent.click(button) })
    }, 60000)
  }
  for (const id of Object.keys(PROGRAMS)) {
    it(`the Python tab opens on ${id}`, () => {
      render(<PythonTab request={{ program: id }} onLesson={() => {}} />)
      expect(screen.getAllByText(PROGRAMS[id].label).length).toBeGreaterThan(0)
    })
  }
})
