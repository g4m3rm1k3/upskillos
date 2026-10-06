import { describe, expect, it } from 'vitest'
import { parseLesson, LessonFormatError } from './lessonFormat.js'
import { compareOutput } from '../../components/notebooks/compareOutput.js'

const fence = '```'

describe('type-along cells', () => {
  it('shows the code to read, starts the editor empty, and keeps the expected output', () => {
    const { cells } = parseLesson([
      '# A lesson',
      '',
      'Read this, then type it.',
      '',
      `${fence}python type`,
      'x = 2',
      'print(x * 3)',
      fence,
      '',
      `${fence}output`,
      '6',
      fence,
      '',
      'Why it printed 6.',
    ].join('\n'))
    expect(cells[0]).toMatchObject({
      prose: ['Read this, then type it.'],
      code: '',
      typeIt: true,
      solution: 'x = 2\nprint(x * 3)',
      expectedOutput: '6',
    })
    // The prose after the output block belongs to what comes next.
    expect(cells[1]).toMatchObject({ proseOnly: true, prose: ['Why it printed 6.'] })
  })

  it('allows a type-along cell without an expected output', () => {
    const { cells } = parseLesson(`# T\n\nText.\n\n${fence}python type\nx = 1\n${fence}\n`)
    expect(cells[0].typeIt).toBe(true)
    expect(cells[0].expectedOutput).toBeUndefined()
  })

  it('rejects an output block that does not follow a type-along cell', () => {
    expect(() => parseLesson(`# T\n\n${fence}output\n6\n${fence}\n`)).toThrow(LessonFormatError)
  })
})

describe('compareOutput', () => {
  it('ignores trailing spaces, carriage returns and trailing blank lines', () => {
    expect(compareOutput('a  \r\nb\n\n', 'a\nb')).toEqual({ matches: true })
  })

  it('reports the first line that differs', () => {
    expect(compareOutput('a\nb\nc', 'a\nB\nc')).toEqual({ matches: false, line: 2, yours: 'b', expected: 'B' })
  })

  it('reports a missing line', () => {
    expect(compareOutput('a', 'a\nb')).toEqual({ matches: false, line: 2, yours: undefined, expected: 'b' })
  })
})
