// @vitest-environment happy-dom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react'
import { labs } from './labs/index.js'
import LessonFlow from './LessonFlow.jsx'

vi.mock('@monaco-editor/react', () => ({ default: ({ value, options }) => <textarea aria-label={options.ariaLabel} value={value} readOnly /> }))
afterEach(() => { cleanup(); localStorage.clear() })

describe('ordered lesson blocks', () => {
  it('every block points at something that exists', async () => {
    for (const lab of labs) {
      const figures = lab.figures ? await lab.figures() : {}
      for (const lesson of lab.lessons.filter(l => l.blocks)) {
        const paras = new Set()
        for (const b of lesson.blocks) {
          if (b.p != null) { expect(b.p, lesson.id).toBeLessThan(lesson.paragraphs.length); expect(paras.has(b.p), `${lesson.id} paragraph ${b.p} twice`).toBe(false); paras.add(b.p) }
          if (b.cell != null) expect(b.cell, lesson.id).toBeLessThan(lesson.notebook.cells.length)
          if (b.figure) expect(typeof figures[b.figure], `${lesson.id}: figure ${b.figure}`).toBe('function')
          if (b.predict) { expect(Number.isFinite(b.predict.answer), lesson.id).toBe(true); expect(b.predict.explain.length).toBeGreaterThan(10) }
          if (b.derivation) expect(lesson.derivation, lesson.id).toBeTruthy()
          if (b.ladder) expect(lab.ladders?.[b.ladder], `${lesson.id}: ladder ${b.ladder}`).toBeTruthy()
          if (b.tool) { const t = lab.tools?.[b.tool]; expect(t, `${lesson.id}: tool ${b.tool}`).toBeTruthy(); expect(t.compare.every(r => r.length === 4), `${lesson.id}: ${b.tool} rows are quantity, hand, Python, tool`).toBe(true); expect(t.href).toMatch(/^\//) }
          if (b.bridge) { expect((b.bridge.label ?? b.bridge.title).length, lesson.id).toBeGreaterThan(5); expect(b.bridge.body.length, lesson.id).toBeGreaterThan(0) }
        }
        expect(paras.size, `${lesson.id}: every paragraph placed`).toBe(lesson.paragraphs.length)
      }
    }
  })
  for (const lab of labs.filter(l => l.figures)) {
    it(`lab ${lab.number}: every figure its lessons use renders and survives its controls`, async () => {
      const figures = await lab.figures()
      const used = new Map()
      lab.lessons.forEach(l => (l.blocks ?? []).filter(b => b.figure).forEach(b => used.set(`${b.figure}|${JSON.stringify(b.props ?? {})}`, b)))
      for (const b of used.values()) {
        const Fig = figures[b.figure]
        const { container, unmount } = render(<Fig {...(b.props ?? {})} />)
        expect(container.textContent.length, `lab ${lab.number} ${b.figure}`).toBeGreaterThan(10)
        for (const button of [...container.querySelectorAll('button')].slice(0, 6)) await act(async () => { if (!button.disabled && button.isConnected) fireEvent.click(button) })
        for (const input of [...container.querySelectorAll('input[type=range]')].slice(0, 4)) await act(async () => { fireEvent.change(input, { target: { value: input.max } }) })
        expect(container.textContent, `lab ${lab.number} ${b.figure} computed NaN`).not.toMatch(/[=:×]\s*NaN|NaN\s*[×+−-]/)
        unmount()
      }
    }, 60000)
  }
  it('renders paragraphs, figures and predictions in order, and checks a prediction', async () => {
    const lab = labs.find(l => l.number === 37), lesson = lab.lessons[0], saved = {}
    const onSave = vi.fn()
    render(<LessonFlow lab={lab} lesson={lesson} saved={saved} onSave={onSave} renderMath={() => <p>math block</p>} renderDerivation={() => <p>derivation block</p>} />)
    await vi.waitFor(() => expect(screen.getByRole('img', { name: /Robot at state/ })).toBeTruthy(), { timeout: 4000 })
    const order = [...document.querySelectorAll('.ml-flow > *')].map(n => n.className.split(' ')[0])
    expect(order.slice(0, 4)).toEqual(['ml-reading-section', 'ml-reading-section', 'ml-inline-figure', 'ml-nb-cell'])
    fireEvent.click(screen.getByRole('button', { name: 'Move up' }))
    expect(screen.getByRole('table', { name: 'Transition log' }).textContent).toContain('up')
    const input = screen.getAllByLabelText('Your prediction')[0]
    fireEvent.change(input, { target: { value: '0.6' } })
    await act(async () => { fireEvent.submit(input.closest('form')) })
    expect(screen.getByText(/forgets that the random draw/)).toBeTruthy()
    fireEvent.change(input, { target: { value: '0.7' } })
    await act(async () => { fireEvent.submit(input.closest('form')) })
    expect(onSave).toHaveBeenCalledWith({ predicted: [6] })
    expect(screen.getByText('math block')).toBeTruthy()
  })
  it('a refresher is closed until opened, and a tool task opens its tool in a new tab after preparing it', async () => {
    const lab = labs.find(l => l.number === 3), lesson = lab.lessons.find(l => l.id === 'l03-matmul')
    window.open = vi.fn()
    render(<LessonFlow lab={lab} lesson={lesson} saved={{}} onSave={() => {}} renderMath={() => null} renderDerivation={() => null} />)
    const task = await screen.findByRole('region', { name: 'Check it in OpenMAT' })
    fireEvent.click(task.querySelector('button'))
    expect(window.open).toHaveBeenCalledWith('#/openmat', '_blank', 'noopener')
    expect(JSON.parse(localStorage.getItem('openmat-documents')).map(d => d.name)).toEqual(['ml-lab-03-2-matrix-product.m'])
    expect(task.textContent).toMatch(/Added ml-lab-03-2-matrix-product\.m to OpenMAT/)
    cleanup()
    const l5 = labs.find(l => l.number === 5), lik = l5.lessons.find(l => l.id === 'l05-likelihood')
    render(<LessonFlow lab={l5} lesson={lik} saved={{}} onSave={() => {}} renderMath={() => null} renderDerivation={() => null} />)
    const bridge = (await screen.findByText(/Refresher \(optional\): logarithms/)).closest('details')
    expect(bridge.open).toBe(false)
  })
})

import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
describe('figure colours', () => {
  it('every chart colour a figure uses is defined in ml.css (an undefined one draws nothing)', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const css = readFileSync(join(here, 'ml.css'), 'utf8')
    const defined = new Set([...css.matchAll(/(--chart-[a-z0-9-]+)\s*:/g)].map(m => m[1]))
    for (const dir of readdirSync(join(here, 'labs'))) {
      let src
      try { src = readFileSync(join(here, 'labs', dir, 'figures.jsx'), 'utf8') } catch { continue }
      for (const [, name] of src.matchAll(/var\((--chart-[a-z0-9-]+)\)/g)) expect(defined.has(name), `${dir}: ${name}`).toBe(true)
    }
  })
})
