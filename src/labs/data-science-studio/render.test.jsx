// @vitest-environment happy-dom
// Every lesson drawn, every figure's inputs given awkward text and every slider moved to its ends,
// a spreadsheet formula solved and a wrong one explained, the playground and the Real Python tab
// opened: none of it may throw.
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render as plainRender, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DataScienceStudio from './index.jsx'
import Blocks from './Blocks.jsx'
import Playground from './Playground.jsx'
import PythonTab from './PythonTab.jsx'
import { LESSONS } from './lessons/index.js'

afterEach(cleanup)
// Lessons open other labs (the Spreadsheet Lab) with the router, as inside the app.
const render = ui => plainRender(<MemoryRouter>{ui}</MemoryRouter>)

const AWKWARD = ['', ' ', '🙂', '1', 'a,b,"c', '-5 -5 -5', '1e308 1e308', 'x\ny']

describe('Data Science Studio renders', () => {
  it('opens on the first lesson', () => {
    render(<DataScienceStudio />)
    expect(screen.getAllByText('A table is a list of rows').length).toBeGreaterThan(0)
  })

  for (const lesson of LESSONS) {
    it(`${lesson.number} ${lesson.title}: draws, and its figures survive awkward input and extreme sliders`, () => {
      const { container } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onSave={() => {}} />)
      expect(container.textContent.length).toBeGreaterThan(800)
      expect(container.textContent).not.toMatch(/Missing figure|# no function|# missing file/)
      const boxes = [...container.querySelectorAll('.qm-figure .ds-input input, .qm-figure .ds-input textarea')]
      for (const text of AWKWARD) for (const box of boxes) act(() => { fireEvent.change(box, { target: { value: text } }) })
      for (const range of container.querySelectorAll('.qm-figure input[type=range]')) for (const v of [range.min, range.max]) act(() => { fireEvent.change(range, { target: { value: v } }) })
      for (const select of container.querySelectorAll('.qm-figure select')) for (const o of select.options) act(() => { fireEvent.change(select, { target: { value: o.value } }) })
      for (const button of container.querySelectorAll('.qm-figure .qm-fig-controls button')) act(() => { fireEvent.click(button) })
    })
  }

  it('a spreadsheet exercise: the real Spreadsheet Lab in the lesson; a wrong formula, then the right one solves it', async () => {
    let solved = 0
    const lesson = LESSONS.find(l => l.id === 'table-rows')
    const { container } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => { solved++ }} onSave={() => {}} />)
    const block = container.querySelector('.ds-formula')
    // The spreadsheet is loaded lazily: under a full parallel test run that can take several seconds.
    const grid = await waitFor(() => { const g = block.querySelector('[role=grid]'); if (!g) throw new Error('no grid yet'); return g }, { timeout: 20000 })
    // The data is folded to its first rows: a fold button on row 1, and a bar saying what is hidden.
    expect(block.querySelector('.ss-fold-button')).not.toBeNull()
    expect(block.textContent).toMatch(/397 more rows folded/)
    const type = text => {
      act(() => { fireEvent.keyDown(grid, { key: '=' }) })
      const editor = block.querySelector('input[aria-label^="Editing B405"]')
      act(() => { fireEvent.change(editor, { target: { value: text } }) })
      act(() => { fireEvent.keyDown(editor, { key: 'Enter' }) })
    }
    type('=COUNTIF(D2:D403,"Lock")')
    expect(block.textContent).toMatch(/B405 gives/)
    expect(solved).toBe(0)
    type('=countif(d2:d403,"Bike")')
    expect(block.textContent).toMatch(/Right: 28/)
    expect(solved).toBe(1)
  }, 30000)

  it('the playground summarises pasted data, and survives rubbish', () => {
    const { container } = render(<Playground />)
    expect(container.textContent).toMatch(/40 rows · 7 columns/)
    for (const text of [...AWKWARD, 'a,b\n1,2\n3,x\n,4']) act(() => { fireEvent.change(screen.getByLabelText('Your CSV'), { target: { value: text } }) })
    expect(container.textContent).toMatch(/3 rows · 2 columns/)
  })

  it('the Real Python tab shows each program’s code and its notes in the browser', () => {
    const { container } = render(<PythonTab request={{ program: 'welford' }} onLesson={() => {}} />)
    expect(container.textContent).toMatch(/needs the UpSkillOS desktop app/)
    for (const option of container.querySelectorAll('select option')) act(() => { fireEvent.change(container.querySelector('select'), { target: { value: option.value } }) })
    expect(container.querySelectorAll('.qm-py-dot').length).toBeGreaterThan(5)
  })
})
