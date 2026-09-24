import { describe, it, expect } from 'vitest'
import { compile, equivalent } from './expr.js'

const D = { w: [-2, 2], b: [-2, 2], x: [-3, 3], y: [-3, 3] }
describe('derivation expressions', () => {
  it('parses operators, precedence, implicit multiplication and unicode', () => {
    expect(compile('2 + 3 * 4 ^ 2')({})).toBe(50)
    expect(compile('-2^2')({})).toBe(-4)
    expect(compile('2x(x+1)', ['x'])({ x: 3 })).toBe(24)
    expect(compile('wx + b', ['w', 'x', 'b'])({ w: 2, x: 3, b: 1 })).toBe(7)
    expect(compile('x² − 2·x', ['x'])({ x: 5 })).toBe(15)
    expect(compile('σ(0) + exp(0) + e^0', [])({})).toBe(2.5)
    expect(compile('x1 * x2', ['x1', 'x2'])({ x1: 2, x2: 5 })).toBe(10)
    expect(compile('log2(8) + log₂(4)', [])({})).toBe(5)
  })
  it('accepts algebraically equal answers and rejects different ones', () => {
    const ref = '2*(w*x + b - y)*x'
    expect(equivalent('2x(wx+b-y)', ref, D).ok).toBe(true)
    expect(equivalent('2*w*x^2 + 2*b*x - 2*x*y', ref, D).ok).toBe(true)
    expect(equivalent('2(wx+b-y)', ref, D).ok).toBe(false)
    expect(equivalent('(wx+b-y)x', ref, D).ok).toBe(false)
    expect(equivalent('σ(z)(1-σ(z))', 'exp(-z)/(1+exp(-z))^2', { z: [-4, 4] }).ok).toBe(true)
  })
  it('accepts Greek variables typed as plain words', () => {
    expect(equivalent('log(phi/(1-phi))', 'log(φ/(1-φ))', { φ: [0.1, 0.9] }).ok).toBe(true)
    expect(equivalent('theta - (exp(theta)-2)/exp(theta)', 'θ - 1 + 2*exp(-θ)', { θ: [-1, 2] }).ok).toBe(true)
    expect(equivalent('exp(-(xi-x)^2/(2tau^2))', 'exp(-(xi-x)^2/(2*τ^2))', { xi: [0, 5], x: [0, 5], τ: [0.5, 2] }).ok).toBe(true)
  })
  it('explains parse errors instead of throwing', () => {
    expect(equivalent('2*(w*x', '1', D).error).toMatch(/closing bracket/)
    expect(equivalent('2*q', '1', D).error).toMatch(/Unknown name/)
    expect(equivalent('2 $ x', '1', D).error).toMatch(/Unexpected character/)
  })
})
