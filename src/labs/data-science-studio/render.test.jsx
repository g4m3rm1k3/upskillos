// @vitest-environment happy-dom
// Every lesson drawn, every figure's inputs given awkward text and every slider moved to its ends,
// a spreadsheet formula solved and a wrong one explained, the playground and the Real Python tab
// opened: none of it may throw.
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render as plainRender, screen } from '@testing-library/react'
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

  it('a spreadsheet exercise: a wrong formula is worked out and explained, the right one solves it', () => {
    let solved = 0
    const lesson = LESSONS.find(l => l.id === 'table-rows')
    const { container } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => { solved++ }} onSave={() => {}} />)
    const box = container.querySelector('.ds-formula input')
    act(() => { fireEvent.change(box, { target: { value: '=COUNTIF(D2:D403,"Lock")' } }) })
    act(() => { fireEvent.submit(box.closest('form')) })
    expect(container.querySelector('.ds-formula').textContent).toMatch(/It gives/)
    expect(solved).toBe(0)
    act(() => { fireEvent.change(box, { target: { value: '=SUM(' } }) })
    act(() => { fireEvent.submit(box.closest('form')) })
    expect(container.querySelector('.ds-formula').textContent).toMatch(/can’t read that formula/)
    act(() => { fireEvent.change(box, { target: { value: '=countif(d2:d403,"Bike")' } }) })
    act(() => { fireEvent.submit(box.closest('form')) })
    expect(container.querySelector('.ds-formula').textContent).toMatch(/Right: 28/)
    expect(solved).toBe(1)
  })

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
