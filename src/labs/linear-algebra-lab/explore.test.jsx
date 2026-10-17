// @vitest-environment happy-dom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { executeScript } from '../../engines/openmat/openmatEngine.js'
import Explore, { covariance, cross, curvedJacobian, curvedMap, cutStress, det3, EXPERIMENTS, fitLine, hillGradient, hillHeight, layerSum, linkMatrixOf, pageRankStep, photoStats, photoSvd, SCENES, solveLinear, springModes, svd2, trussForces } from './Explore.jsx'
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
  it('puts every cut on Mohr\'s circle and finds zero shear at the principal angle', () => {
    const [sx, sy, tau] = [80, 20, 30], c = (sx + sy) / 2, R = Math.hypot((sx - sy) / 2, tau)
    for (const deg of [0, 17, 45, 90, 133]) {
      const { normal, shear } = cutStress(sx, sy, tau, deg)
      expect(Math.hypot(normal - c, shear)).toBeCloseTo(R, 9)
    }
    const principal = 0.5 * Math.atan2(2 * tau, sx - sy) * 180 / Math.PI
    expect(cutStress(sx, sy, tau, principal).shear).toBeCloseTo(0, 9)
    expect(cutStress(sx, sy, tau, principal).normal).toBeCloseTo(c + R, 9)
    expect(cutStress(sx, sy, tau, 30).normal).toBeCloseTo(executeScript('sigma = [80 30; 30 20];\nth = 30*pi/180;\nn = [cos(th); sin(th)];\nx = dot(n, sigma*n);').workspace.find(w => w.name === 'x').value, 9)
  })
  it('finds the spring modes of the vibrations lesson', () => {
    const { omega, modes } = springModes(1, 1, 1)
    expect(omega[0]).toBeCloseTo(1, 10); expect(omega[1]).toBeCloseTo(Math.sqrt(3), 10)
    expect(modes[0][0]).toBeCloseTo(Math.SQRT1_2, 10); expect(modes[0][1]).toBeCloseTo(Math.SQRT1_2, 10)
    expect(Math.abs(modes[1][0] + modes[1][1])).toBeLessThan(1e-9)
    const uneven = springModes(1, 2, 4)
    expect(uneven.modes[0][0] * uneven.modes[1][0] + uneven.modes[0][1] * uneven.modes[1][1]).toBeCloseTo(0, 10)
  })
  it('splits a picture into SVD layers that rebuild it, strongest first, with the predicted error', () => {
    const small = [[3, 0], [4, 5]]
    photoSvd(small).sigma.forEach((s, i) => expect(s).toBeCloseTo(svd2(small).sigma[i], 10))
    const A = [[2, 7, 1, 8, 2], [8, 1, 8, 2, 8], [4, 5, 9, 0, 4], [5, 2, 3, 5, 3]]
    const svd = photoSvd(A)
    const engine = executeScript(`A = [${A.map(row => row.join(' ')).join('; ')}];\ns = svd(A);`).workspace.find(w => w.name === 's').value
    engine.slice(0, 4).forEach((s, i) => expect(svd.sigma[i]).toBeCloseTo(s, 9))
    const rebuilt = layerSum(svd, 0, 5)
    A.forEach((row, i) => row.forEach((value, j) => expect(rebuilt[i][j]).toBeCloseTo(value, 9)))
    const two = layerSum(svd, 0, 2)
    const error = Math.sqrt(A.flatMap((row, i) => row.map((value, j) => (value - two[i][j]) ** 2)).reduce((a, b) => a + b, 0))
    expect(photoStats(svd.sigma, 2, 4, 5).error).toBeCloseTo(error, 9)
    expect(photoStats(svd.sigma, 2, 4, 5).storage).toBe(20)
    for (const [name, make] of Object.entries(SCENES)) {
      const picture = make(), { sigma } = photoSvd(picture)
      for (let i = 1; i < sigma.length; i++) expect(sigma[i], name).toBeLessThanOrEqual(sigma[i - 1] + 1e-12)
      const full = layerSum(photoSvd(picture), 0, sigma.length)
      expect(Math.max(...picture.flatMap((row, i) => row.map((value, j) => Math.abs(value - full[i][j]))))).toBeLessThan(1e-9)
    }
    // The tartan is a few layers exactly; the static needs nearly all of them.
    expect(photoStats(photoSvd(SCENES.Tartan()).sigma, 3, 40, 40).relative).toBeLessThan(1e-9)
    expect(photoStats(photoSvd(SCENES.Static()).sigma, 10, 40, 40).relative).toBeGreaterThan(0.25)
    expect(photoStats(photoSvd(SCENES.Landscape()).sigma, 10, 40, 40).relative).toBeLessThan(0.1)
  })
  it('reproduces the PageRank of the lesson and treats a page with no links as linking everywhere', () => {
    const L = linkMatrixOf([[1, 2], [2], [0], [0, 2]])
    let r = [0.25, 0.25, 0.25, 0.25]
    for (let k = 0; k < 100; k++) r = pageRankStep(L, r, 0.85)
    ;[0.379734, 0.198887, 0.383879, 0.0375].forEach((v, i) => expect(r[i]).toBeCloseTo(v, 5))
    expect(linkMatrixOf([[1], []]).map(row => row[1])).toEqual([0.5, 0.5])
  })
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
  it('solves the truss like the hand calculation, and refuses a singular system', () => {
    const { forces } = trussForces(2, 2, 10)
    const expected = [5, -10 / Math.SQRT2, -10 / Math.SQRT2, 0, 5, 5]
    forces.forEach((f, i) => expect(f).toBeCloseTo(expected[i], 9))
    const offCentre = trussForces(1, 2, 12).forces
    expect(offCentre[4] + offCentre[5]).toBeCloseTo(12, 9)
    expect(offCentre[5]).toBeCloseTo(12 * 1 / 4, 9)
    expect(solveLinear([[1, 2], [2, 4]], [1, 2])).toBeNull()
  })
  it('uses hand-derived gradients and Jacobians that match nudged estimates', () => {
    const h = 1e-6
    for (const p of [[0.4, 0.6], [-2, 1], [1.5, -1.5]]) {
      const g = hillGradient(p)
      expect(g[0]).toBeCloseTo((hillHeight([p[0] + h, p[1]]) - hillHeight([p[0] - h, p[1]])) / (2 * h), 6)
      expect(g[1]).toBeCloseTo((hillHeight([p[0], p[1] + h]) - hillHeight([p[0], p[1] - h])) / (2 * h), 6)
      const J = curvedJacobian(p)
      for (let j = 0; j < 2; j++) {
        const plus = curvedMap(j ? [p[0], p[1] + h] : [p[0] + h, p[1]]), minus = curvedMap(j ? [p[0], p[1] - h] : [p[0] - h, p[1]])
        for (let i = 0; i < 2; i++) expect(J[i][j]).toBeCloseTo((plus[i] - minus[i]) / (2 * h), 6)
      }
    }
  })
})
