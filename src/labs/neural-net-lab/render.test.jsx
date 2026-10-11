// @vitest-environment happy-dom
// Every lesson drawn and its buttons pressed, the Model Studio trained on every data set with every
// optimiser, and the Python tab opened on every program and asked to explain every line of every
// file: none of it may throw.
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import NeuralNetLab from './index.jsx'
import Blocks from '../python-steps/Blocks.jsx'
import ModelStudio from './ModelStudio.jsx'
import PythonTab from './PythonTab.jsx'
import { LESSONS } from './lessons/index.js'
import { FIGURES } from './figures/index.js'
import { PROGRAMS } from './programs.js'
import { SOURCES, codeLines } from './source.js'

afterEach(cleanup)
const NEWLINE = String.fromCharCode(10)
const PRESS = ['One step', '100 steps', '50 steps', '2. Backward', '1. Forward', 'Use weights learned by gradient descent', 'sigmoid', 'tanh', 'Clear points']

describe('the lab renders', () => {
  it('opens on the first lesson', () => {
    render(<NeuralNetLab />)
    expect(screen.getAllByText('Data, a model and a prediction').length).toBeGreaterThan(0)
  })

  for (const lesson of LESSONS) {
    it(`${lesson.number} ${lesson.title}: draws, and its buttons work`, () => {
      const { container } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onPython={() => {}} FIGURES={FIGURES} codeLines={codeLines} />)
      expect(container.textContent.length).toBeGreaterThan(200)
      expect(container.textContent).not.toMatch(/Missing figure/)
      for (const label of PRESS) for (const button of screen.queryAllByText(label)) act(() => { fireEvent.click(button) })
    })
  }

  it('the Model Studio trains on every data set with every optimiser', () => {
    const { container } = render(<ModelStudio />)
    const [dataSelect, , optSelect] = container.querySelectorAll('.qm-fig-controls select')
    for (const data of ['line', 'curve', 'cars', 'blobs', 'moons', 'xor', 'ring', 'tumours']) for (const kind of ['sgd', 'momentum', 'adam']) {
      act(() => { fireEvent.change(dataSelect, { target: { value: data } }) })
      act(() => { fireEvent.change(optSelect, { target: { value: kind } }) })
      act(() => { fireEvent.click(screen.getByText('100 steps')) })
      expect(container.textContent, `${data}, ${kind}`).toMatch(/100 steps · training loss \d/)
    }
    act(() => { fireEvent.click(screen.getByText('+ add a layer')) })
    expect(container.querySelector('.nn-code').textContent).toMatch(/nn\.Linear\(30, 8\).*BCEWithLogitsLoss/s)
  }, 60000)

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
    const { container } = render(<PythonTab request={{ program: 'net' }} />)
    const explain = text => { act(() => { fireEvent.click([...container.querySelectorAll('.qm-py-line')].find(l => l.textContent.includes(text))) }); return container.querySelector('.ps-explain').textContent }
    expect(explain('d_z = d_h if z[j] > 0 else 0.0')).toMatch(/The logic, in words.*passes back/s)
    expect(explain('d_y_hat = 2 * (y_hat - y)')).toMatch(/In maths/)
    expect(explain('def backward(')).toMatch(/Called from.*grads = backward/s)
  })
})
