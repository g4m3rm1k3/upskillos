// @vitest-environment happy-dom
// Every lesson drawn, every map selector in it switched through every map, the trainers stepped,
// and the Playground and Python tab opened: none of it may throw. (A map change once drew the old
// map's table on the new map and crashed the lab.)
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import QMazeLab from './index.jsx'
import Blocks from './Blocks.jsx'
import Playground from './Playground.jsx'
import PythonTab from './PythonTab.jsx'
import { LESSONS } from './lessons/index.js'
import { MAPS } from './engine/maps.js'

afterEach(cleanup)

const mapSelects = container => [...container.querySelectorAll('select')].filter(s => [...s.options].some(o => o.value === 'cheese_and_cat'))
function everyMap(container) {
  for (const select of mapSelects(container)) for (const option of [...select.options]) act(() => { fireEvent.change(select, { target: { value: option.value } }) })
}

describe('the lab renders', () => {
  it('opens on the first lesson', () => {
    render(<QMazeLab />)
    expect(screen.getAllByText('A grid world as data').length).toBeGreaterThan(0)
  })

  for (const lesson of LESSONS) {
    it(`${lesson.number} ${lesson.title}: draws, and survives every map`, () => {
      const { container } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onPython={() => {}} />)
      expect(container.textContent.length).toBeGreaterThan(200)
      everyMap(container)
      for (const label of ['One move', 'One episode', 'One sweep', 'One update']) for (const button of screen.queryAllByText(label)) act(() => { fireEvent.click(button) })
    })
  }

  it('the Playground trains on every map', () => {
    const { container } = render(<Playground />)
    const select = mapSelects(container)[0]
    for (const name of Object.keys(MAPS).filter(m => m !== 'custom')) {
      act(() => { fireEvent.change(select, { target: { value: name } }) })
      act(() => { fireEvent.click(screen.getByText('One episode')) })
    }
    act(() => { fireEvent.click(screen.getByText(/^Train all/)) })
    expect(container.querySelector('.qm-result')).toBeTruthy()
  })

  it('the Python tab shows the code and explains a line in the browser', () => {
    const { container } = render(<PythonTab request={{ program: 'q' }} />)
    expect(screen.getByText(/needs the UpSkillOS desktop app/)).toBeTruthy()
    const lines = [...container.querySelectorAll('.qm-py-line')]
    act(() => { fireEvent.click(lines.find(l => l.textContent.includes('target = reward + gamma'))) })
    expect(container.querySelector('.qm-py-explain').textContent).toMatch(/Q-learning target|reward/)
  })
})
