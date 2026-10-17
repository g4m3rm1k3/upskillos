// @vitest-environment happy-dom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { executeScript } from '../../engines/openmat/openmatEngine.js'
import Explore, { covariance, cross, det3, EXPERIMENTS, fitLine, svd2 } from './Explore.jsx'
import { sse } from './explore/data.jsx'

afterEach(cleanup)
const lesson = { id: 'laml-first-run', module: 'First steps' }

describe('playground experiments', () => {
  for (const [id, name] of EXPERIMENTS) {
    it(`${name}: renders a labelled picture and its OpenMAT code runs`, () => {
      const { container } = render(<Explore lesson={lesson} />)
      fireEvent.click(screen.getByRole('button', { name }))
      expect(screen.getAllByRole('img').length).toBeGreaterThan(0)
      const code = container.querySelector('.la-details pre')?.textContent
      if (id === 'descent') return expect(code).toBeUndefined()
      const result = executeScript(code)
      expect(result.output).not.toMatch(/NaN|error/i)
    })
  }

  it('row operations keep the solution and expose a contradiction', () => {
    render(<Explore lesson={{ id: 'laml-elimination' }} />)
    const picture = () => screen.getByRole('img', { name: /row 1 is/ }).getAttribute('aria-label')
    expect(picture()).toMatch(/cross at \[1\.00; 2\.00\]/)
    fireEvent.click(screen.getByRole('button', { name: 'R2 ← R2 − k·R1' }))
    expect(picture()).toMatch(/row 2 is 0\.00x \+ -3\.00y = -6\.00/)
    expect(picture()).toMatch(/cross at \[1\.00; 2\.00\]/)
    fireEvent.click(screen.getByRole('button', { name: 'No answer' }))
    fireEvent.click(screen.getByRole('button', { name: 'R2 ← R2 − k·R1' }))
    expect(picture()).toMatch(/0 = -4\.00: impossible/)
  })
})

describe('playground mathematics', () => {
  it('fits least-squares lines that no other line beats', () => {
    const pts = [[0, 1], [1, 3], [2, 4], [3, 7]]
    const { slope, offset } = fitLine(pts)
    expect(slope).toBeCloseTo(1.9, 10); expect(offset).toBeCloseTo(0.9, 10)
    for (const [ds, dc] of [[0.1, 0], [0, 0.1], [-0.05, 0.05]]) expect(sse(pts, slope + ds, offset + dc)).toBeGreaterThan(sse(pts, slope, offset))
    expect(fitLine([[1, 2], [2, 4]], false)).toEqual({ slope: 2, offset: 0 })
  })
  it('computes sample covariance, singular values and 3D determinants', () => {
    expect(covariance([[1, 0], [-1, 0], [0, 2], [0, -2]]).C).toEqual([[2 / 3, 0], [0, 8 / 3]])
    const { sigma, v, Av } = svd2([[3, 0], [4, 5]])
    expect(sigma[0]).toBeCloseTo(Math.sqrt(45), 10); expect(sigma[1]).toBeCloseTo(Math.sqrt(5), 10)
    expect(v[0][0] * v[1][0] + v[0][1] * v[1][1]).toBeCloseTo(0, 10)
    expect(Av[0][0] * Av[1][0] + Av[0][1] * Av[1][1]).toBeCloseTo(0, 10)
    expect(det3([1, 0, 0], [0, 1, 0], [0, 0, 1])).toBe(1)
    expect(det3([0, 1, 0], [1, 0, 0], [0, 0, 1])).toBe(-1)
    expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1])
  })
})
