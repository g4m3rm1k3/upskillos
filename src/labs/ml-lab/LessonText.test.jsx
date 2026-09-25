// @vitest-environment happy-dom
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import LessonText, { displayMathOnOwnLines } from './LessonText.jsx'

afterEach(cleanup)

describe('LessonText math', () => {
  it('renders $$…$$ written inside a sentence as display math, and $…$ inline', () => {
    const { container } = render(<LessonText>{'The equation: $$V = r + \\gamma V$$ It holds for $s$ and $$Q = 1$$ too.'}</LessonText>)
    expect(container.querySelectorAll('.katex-display')).toHaveLength(2)
    expect(container.querySelectorAll('.katex')).toHaveLength(3)
    expect(container.textContent).toMatch(/The equation:.*It holds for.*too\./s)
  })
  it('leaves an escaped dollar and text without math unchanged', () => {
    expect(displayMathOnOwnLines('costs \\$5 and \\$6')).toBe('costs \\$5 and \\$6')
    expect(displayMathOnOwnLines('no math here')).toBe('no math here')
    expect(displayMathOnOwnLines(undefined)).toBe(undefined)
  })
})
