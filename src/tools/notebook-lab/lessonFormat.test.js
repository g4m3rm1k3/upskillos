import { describe, expect, it } from 'vitest'
import { parseLesson, LessonFormatError, proseItems, parseIpynbLesson } from './lessonFormat.js'
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

describe('Markdown blocks in prose', () => {
  it('keeps a table together, one row per line', () => {
    const items = proseItems(['Before.', '', '| a | b |', '|---|---|', '| 1 | 2 |', '', 'After.'])
    expect(items).toEqual(['Before.', '| a | b |\n|---|---|\n| 1 | 2 |', 'After.'])
  })

  it('gives every heading level its own item and drops horizontal rules', () => {
    expect(proseItems(['---', '# Part A', 'Text.', '### Step 1.1', '#### Detail'])).toEqual(['# Part A', 'Text.', '### Step 1.1', '#### Detail'])
  })

  it('splits a paragraph from a list that follows it without a blank line', () => {
    expect(proseItems(['**The loop:**', '1. Read', '2. Type', 'Then run.'])).toEqual(['**The loop:**', '1. Read\n2. Type', 'Then run.'])
  })
})

describe('Jupyter notebook lessons', () => {
  const nb = {
    cells: [
      { cell_type: 'markdown', source: ['# The title\n', '\n', '| a | b |\n', '|---|---|\n', '| 1 | 2 |'] },
      { cell_type: 'markdown', source: ['Type this: `print(6)`'] },
      { cell_type: 'code', source: ['# Step 1: type the code from the cell above, then run this cell\n', '\n'], outputs: [] },
      { cell_type: 'markdown', source: ['Expected output: 6'] },
      { cell_type: 'markdown', source: ['Now run this.'] },
      { cell_type: 'code', source: ['print(6)'], outputs: [{ output_type: 'stream', name: 'stdout', text: ['6\n'] }] },
      { cell_type: 'markdown', source: ['The end.'] },
    ],
  }

  it('makes Markdown the explanation of the code cell after it, and a placeholder an empty editor', () => {
    const { title, cells } = parseIpynbLesson(JSON.stringify(nb))
    expect(title).toBe('The title')
    expect(cells.map(c => [c.prose, c.code, !!c.proseOnly])).toEqual([
      [['# The title', '| a | b |\n|---|---|\n| 1 | 2 |'], '', true],
      [['Type this: `print(6)`'], '', false],
      [['Expected output: 6'], '', true],
      [['Now run this.'], 'print(6)', false],
      [['The end.'], '', true],
    ])
    expect(cells[3]).toMatchObject({ id: 4, output: '6', status: 'idle' })
  })
})
