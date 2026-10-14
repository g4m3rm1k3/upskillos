// Draws one share of the lessons and presses their buttons; lessons-1/2/3.test.jsx each call it for a
// third, so that each third runs in its own worker (all of them in one worker ran out of memory).
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import Blocks from '../python-steps/Blocks.jsx'
import { LESSONS } from './lessons/index.js'
import { FIGURES } from './figures/index.js'
import { codeLines } from './source.js'

const PRESS = ['Next term →', 'All', 'Roll again', 'Play the games', 'Back to the trained w', '+', '−']

export function drawLessons(share, shares) {
  afterEach(() => { cleanup(); localStorage.clear() })
  const size = Math.ceil(LESSONS.length / shares)
  describe('the lessons', () => {
    for (const lesson of LESSONS.slice(share * size, (share + 1) * size)) {
      it(`${lesson.number} ${lesson.title}: draws, and its buttons work`, () => {
        const { container } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onPython={() => {}} FIGURES={FIGURES} codeLines={codeLines} />)
        expect(container.textContent.length).toBeGreaterThan(200)
        expect(container.textContent).not.toMatch(/Missing figure|NaN/)
        expect([...container.querySelectorAll('.katex-error')].map(e => e.getAttribute('title') || e.textContent)).toEqual([])
        for (const label of PRESS) for (const button of screen.queryAllByText(label, { exact: true })) act(() => { fireEvent.click(button) })
        for (const select of container.querySelectorAll('.qm-fig select')) for (const option of [...select.options].slice(0, 4)) act(() => { fireEvent.change(select, { target: { value: option.value } }) })
        expect(container.textContent).not.toMatch(/NaN/)
      }, 60000)
    }
  })
}
