// @vitest-environment happy-dom
// Every lesson drawn and its buttons pressed, the Playground trained, and the Python tab opened on
// every program and asked to explain every line of every file: none of it may throw.
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import CartPoleLab from './index.jsx'
import Blocks from './Blocks.jsx'
import Playground from './Playground.jsx'
import PythonTab from './PythonTab.jsx'
import { LESSONS } from './lessons/index.js'
import { PROGRAMS } from './programs.js'
import { SOURCES } from './source.js'

afterEach(cleanup)
const NEWLINE = String.fromCharCode(10)

const PRESS = ['push right →', '← push left', 'One move', 'One game', 'One step', 'One update', 'Next', 'Train 50 games']

describe('the lab renders', () => {
  it('opens on the first lesson', () => {
    render(<CartPoleLab />)
    expect(screen.getAllByText('CartPole as four numbers').length).toBeGreaterThan(0)
  })

  for (const lesson of LESSONS) {
    it(`${lesson.number} ${lesson.title}: draws, and its buttons work`, () => {
      const { container } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onPython={() => {}} />)
      expect(container.textContent.length).toBeGreaterThan(200)
      for (const label of PRESS) for (const button of screen.queryAllByText(label)) act(() => { fireEvent.click(button) })
    })
  }

  it('the Playground trains', () => {
    const { container } = render(<Playground />)
    act(() => { fireEvent.click(screen.getAllByText('One game')[0]) })
    expect(container.textContent).toMatch(/game/)
  })

  it('the Python tab opens on every program', () => {
    for (const id of Object.keys(PROGRAMS)) {
      const { unmount } = render(<PythonTab request={{ program: id }} />)
      expect(screen.getByText(/needs the UpSkillOS desktop app/)).toBeTruthy()
      unmount()
    }
  })

  it('the Python tab explains every line of every file in the browser', () => {
    const done = new Set()
    for (const id of Object.keys(PROGRAMS)) {
      const { container, unmount } = render(<PythonTab request={{ program: id }} />)
      for (const tab of [...container.querySelectorAll('.qm-py-files button')]) {
        const file = tab.textContent
        if (done.has(file)) continue
        done.add(file)
        act(() => { fireEvent.click(tab) })
        const lines = [...container.querySelectorAll('.qm-py-line')]
        expect(lines.length).toBe(SOURCES[file].split(NEWLINE).length)
        for (const line of lines) act(() => { fireEvent.click(line) })
      }
      unmount()
    }
    expect([...done].sort()).toEqual(Object.keys(SOURCES).sort())
  }, 120000)

  it('the Python tab gives a line its maths, logic and callers', () => {
    const { container } = render(<PythonTab request={{ program: 'rule' }} />)
    act(() => { fireEvent.click([...container.querySelectorAll('.qm-py-files button')].find(b => b.textContent === 'cartpole.py') ?? container) })
    const explain = text => { act(() => { fireEvent.click([...container.querySelectorAll('.qm-py-line')].find(l => l.textContent.includes(text))) }); return container.querySelector('.ps-explain').textContent }
    expect(explain('terminated = x < -self.x_limit')).toMatch(/The logic, in words.*lost/s)
    expect(explain('x = x + self.tau * x_dot')).toMatch(/In maths/)
    expect(explain('def step(self, action)')).toMatch(/Called from.*env\.step/s)
  })
})
