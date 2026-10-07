import { describe, expect, it } from 'vitest'
import { terminalText } from './terminalText.js'

describe('terminalText', () => {
  it('shows a redrawn line in its latest state, as a terminal does', () => {
    expect(terminalText('epoch 1\r 10%\r 50%\r100%\ndone')).toBe('100%\ndone')
  })
  it('keeps Windows line endings as plain new lines', () => {
    expect(terminalText('a\r\nb\r\n')).toBe('a\nb\n')
  })
  it('leaves text without carriage returns alone', () => {
    expect(terminalText('x = 1\ny = 2')).toBe('x = 1\ny = 2')
  })
})
