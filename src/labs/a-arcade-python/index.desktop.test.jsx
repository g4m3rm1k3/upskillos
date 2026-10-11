// @vitest-environment happy-dom
// The lab's page, driving the real Python stepper (the desktop app's IPC replaced by a direct
// connection to the same aarcade_stepper.py). Skipped when the lab's venv doesn't exist.
import React from 'react'
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import AArcadePython from './index.jsx'

const root = path.resolve(import.meta.dirname, '../../..')
const python = path.join(process.env.APPDATA ?? '', 'UpSkillOS', 'aarcade-python', 'venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')

describe.skipIf(!existsSync(python))('A-Arcade Python, with real Python behind it', () => {
  let proc
  beforeAll(async () => {
    proc = spawn(python, ['-u', path.join(root, 'desktop/app/runtimes/aarcade_stepper.py')], { env: { ...process.env, AARCADE_PROGRAM_DIR: mkdtempSync(path.join(tmpdir(), 'aarcade-ui-')), OMP_NUM_THREADS: '1', PYTHONIOENCODING: 'utf-8' } })
    const waiting = []
    readline.createInterface({ input: proc.stdout }).on('line', line => waiting.shift()?.(JSON.parse(line)))
    const next = () => new Promise(resolve => waiting.push(resolve))
    await next()
    let id = 0
    window.openCalcDesktop = { aarcade: {
      status: async () => ({ ready: true, versions: 'numpy · gymnasium · torch' }),
      send: command => { const reply = next(); proc.stdin.write(JSON.stringify({ ...command, id: ++id }) + '\n'); return reply },
      restart: async () => ({ ok: true }), setup: async () => ({ ok: true }), onOutput: () => () => {},
    } }
  }, 60000)
  afterAll(() => { proc?.kill(); delete window.openCalcDesktop })
  afterEach(cleanup)

  const page = () => render(<MemoryRouter><AArcadePython /></MemoryRouter>)
  const click = name => fireEvent.click(screen.getByRole('button', { name }))
  const ready = () => waitFor(() => expect(screen.getByText(/lines run$/)).toBeTruthy(), { timeout: 30000 })

  it('starts the real program, explains the line, and the Q-table fills as it plays', async () => {
    const { container } = page()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Start' }).disabled).toBe(false))
    click('Start')
    await ready()
    expect(container.querySelector('.ap-line.current').textContent).toContain('env = TableCartPole(counts)')
    expect(screen.getByText('▶ This line runs next')).toBeTruthy()
    // Two pushes: Gymnasium's real observation draws the cart, and the table appears, all zeros.
    click('Next action'); await waitFor(() => expect(container.querySelector('.ap-cart svg').getAttribute('aria-label')).toMatch(/cart at/), { timeout: 30000 })
    click('Next action'); await waitFor(() => expect(container.querySelector('.ap-qtable')).toBeTruthy(), { timeout: 30000 })
    // Run to the line that writes the table: its arithmetic is shown with real numbers, then one entry fills.
    fireEvent.click(within(screen.getByRole('tablist', { name: 'Files' })).getByRole('tab', { name: 'qlearning.py' }))
    fireEvent.click([...container.querySelectorAll('.ap-line')].find(l => l.textContent.includes('Q[state, action] = nudge')))
    click('▶ Run until this line runs')
    await waitFor(() => expect(container.querySelector('.ap-calc-inline')?.textContent).toMatch(/this line will work out: Q\[\d+, \d\]/), { timeout: 30000 })
    expect(container.querySelector('.ap-qcell.writing')).toBeTruthy()
    const filledBefore = container.querySelectorAll('.ap-qtable .ap-qcell:not(.empty):not(.best)').length
    click('Step over')
    await waitFor(() => expect(container.querySelectorAll('.ap-qtable .ap-qcell:not(.empty):not(.best)').length).toBe(filledBefore + 1), { timeout: 30000 })
    expect(screen.getByText('Just returned')).toBeTruthy()
    // Step back shows the table as it was.
    click('◀ Step back')
    expect(container.querySelectorAll('.ap-qtable .ap-qcell:not(.empty):not(.best)').length).toBe(filledBefore)
  }, 120000)

  it('A2C: the Learn phase reaches backward(), and the gradient view fills in', async () => {
    const { container } = page()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Start' }).disabled).toBe(false))
    fireEvent.change(screen.getByRole('combobox', { name: 'Program' }), { target: { value: 'a2c' } })
    await ready()
    const backward = () => [...container.querySelectorAll('.ap-line.current')].some(l => l.textContent.includes('loss.backward()'))
    for (let i = 0; i < 12 && !backward(); i++) {
      fireEvent.click(within(screen.getByRole('toolbar', { name: 'Parts of the loop' })).getByRole('button', { name: /^Learn/ }))
      await waitFor(() => expect(screen.getByText(/lines run$/)).toBeTruthy(), { timeout: 30000 })
      if (!backward()) { click('Step over'); await ready() }
    }
    expect(backward()).toBe(true)
    fireEvent.click(screen.getByRole('tab', { name: 'Gradient (after backward)' }))
    expect(screen.getAllByText(/no gradient yet/).length).toBeGreaterThan(0)
    click('Step over')
    await waitFor(() => expect(screen.queryByText(/no gradient yet/)).toBeNull(), { timeout: 30000 })
    expect(container.querySelectorAll('.ap-heat rect').length).toBeGreaterThan(500)
  }, 180000)
})
