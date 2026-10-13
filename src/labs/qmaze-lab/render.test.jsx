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

  it('the Python tab opens values, shows any running function\'s variables, and offers maps.py', async () => {
    const int = v => ({ t: 'int', v })
    const pause = {
      type: 'pause', watch: {}, output: '', stack: [
        { file: 'play.py', function: 'play_random', line: 12, locals: { name: { t: 'str', v: 'cheese_and_cat' } }, consts: {} },
        { file: 'gridworld.py', function: '__init__', line: 16, consts: { MAPS: { t: 'dict', len: 1, items: { corridor: { t: 'dict', len: 1 } } } },
          locals: { self: { t: 'object', cls: 'GridWorld', attrs: { rows: { t: 'list', len: 2, items: [{ t: 'str', v: 'S..' }, { t: 'str', v: '.#C' }] }, n_rows: int(2) } } } },
      ],
    }
    window.openCalcDesktop = { aarcade: { status: async () => ({ ready: true, versions: 'test' }), send: async () => pause } }
    try {
      const { container } = render(<PythonTab request={{ program: 'q' }} />)
      await act(async () => {})
      expect([...container.querySelectorAll('.qm-py-files button')].map(b => b.textContent)).toContain('maps.py')
      await act(async () => { fireEvent.click(screen.getByText(/^▶ Load/)) })
      const mid = () => container.querySelector('.qm-py-mid').textContent
      expect(mid()).toContain('GridWorld object')
      act(() => { fireEvent.click(container.querySelector('.qm-py-mid .qm-py-open')) })
      expect(mid()).toContain('".#C"')
      expect(mid()).toContain('MAPS')
      act(() => { fireEvent.click(screen.getByText('play_random()')) })
      expect(mid()).toContain('"cheese_and_cat"')
      expect(mid()).toContain('waiting at play.py line 12')
      act(() => { fireEvent.click(screen.getByText('Back to __init__()')) })
      expect(mid()).toContain('GridWorld object')
    } finally { delete window.openCalcDesktop }
  })
})
