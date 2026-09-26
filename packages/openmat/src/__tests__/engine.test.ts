import { describe, it, expect } from 'vitest'
import { executeScript, normalizeVector, buildLinspace, rrefMatrix, polyfit, polyval } from '../index.js'

// ── executeScript — primary API ───────────────────────────────────────────────

describe('executeScript — arithmetic', () => {
  it('evaluates basic arithmetic and returns output', () => {
    const r = executeScript('x = 2 + 2')
    expect(r.output).toContain('4')
    expect(r.workspace.find((w: any) => w.name === 'x')?.value).toBe(4)
  })

  it('semicolon suppresses printed output', () => {
    const r = executeScript('x = 42;')
    // semicolon suppresses the auto-print; 'No output.' is the engine's sentinel
    expect(r.output).not.toContain('42')
    expect(r.workspace.find((w: any) => w.name === 'x')?.value).toBe(42)
  })

  it('disp() produces output', () => {
    const r = executeScript("disp('hello openmat')")
    expect(r.output).toContain('hello openmat')
  })

  it('fprintf produces output', () => {
    const r = executeScript("fprintf('val = %d\\n', 7)")
    expect(r.output).toContain('val = 7')
  })
})

describe('executeScript — matrices', () => {
  it('creates a matrix literal', () => {
    const r = executeScript('A = [1 2; 3 4];')
    const A = r.workspace.find((w: any) => w.name === 'A')?.value
    expect(A).toEqual([[1, 2], [3, 4]])
  })

  it('multiplies matrices', () => {
    const r = executeScript('A = [1 2; 3 4]; b = [1;1]; x = A * b;')
    const x = r.workspace.find((w: any) => w.name === 'x')?.value as number[]
    expect(x[0]).toBeCloseTo(3)
    expect(x[1]).toBeCloseTo(7)
  })

  it('transpose works', () => {
    const r = executeScript("v = [1 2 3]; w = v';")
    const w = r.workspace.find((w: any) => w.name === 'w')?.value as number[]
    expect(w).toEqual([1, 2, 3])
  })

  it('element-wise multiply .* works', () => {
    const r = executeScript('a = [2 3 4]; b = [1 2 3]; c = a .* b;')
    const c = r.workspace.find((w: any) => w.name === 'c')?.value as number[]
    expect(c).toEqual([2, 6, 12])
  })
})

describe('executeScript — control flow', () => {
  it('for loop', () => {
    const r = executeScript('s = 0;\nfor i = 1:5\n  s = s + i;\nend')
    const s = r.workspace.find((w: any) => w.name === 's')?.value
    expect(s).toBe(15)
  })

  it('while loop', () => {
    const r = executeScript('n = 1;\nwhile n < 8\n  n = n * 2;\nend')
    const n = r.workspace.find((w: any) => w.name === 'n')?.value
    expect(n).toBe(8)
  })

  it('if/elseif/else', () => {
    const r = executeScript('x = 5;\nif x > 10\n  y = 1;\nelseif x > 3\n  y = 2;\nelse\n  y = 3;\nend')
    const y = r.workspace.find((w: any) => w.name === 'y')?.value
    expect(y).toBe(2)
  })
})

describe('executeScript — user functions', () => {
  it('defines and calls a function', () => {
    const r = executeScript('function y = sq(x)\n  y = x^2;\nend\nresult = sq(7);')
    const result = r.workspace.find((w: any) => w.name === 'result')?.value
    expect(result).toBe(49)
  })

  it('function with multiple outputs', () => {
    const r = executeScript('function [mn, mx] = bounds(v)\n  mn = min(v);\n  mx = max(v);\nend\n[lo, hi] = bounds([3 1 4 1 5]);')
    const lo = r.workspace.find((w: any) => w.name === 'lo')?.value
    const hi = r.workspace.find((w: any) => w.name === 'hi')?.value
    expect(lo).toBe(1)
    expect(hi).toBe(5)
  })
})

describe('executeScript — plotting', () => {
  it('plot() produces figureJson', () => {
    const r = executeScript('x = 1:5; y = x .^ 2; plot(x, y)')
    expect(r.figureJson).not.toBeNull()
    const fig = JSON.parse(r.figureJson as string)
    expect(fig.type).toBe('opencalc_figure')
    expect(fig.elements.length).toBeGreaterThan(0)
  })

  it('title/xlabel/ylabel end up in figure', () => {
    const r = executeScript("plot(1:3, [1 4 9])\ntitle('My Chart')\nxlabel('X')")
    const fig = JSON.parse(r.figureJson as string)
    expect(fig.title).toBe('My Chart')
  })

  it('no plot → figureJson is null', () => {
    const r = executeScript('x = 42;')
    expect(r.figureJson).toBeNull()
  })
})

describe('executeScript — linear algebra', () => {
  it('rref() reduces an augmented matrix', () => {
    const r = executeScript('A = [2 1 5; 4 3 11];\nR = rref(A);')
    const R = r.workspace.find((w: any) => w.name === 'R')?.value as number[][]
    expect(R[0][0]).toBeCloseTo(1)
    expect(R[1][1]).toBeCloseTo(1)
    expect(R[0][2]).toBeCloseTo(2)
    expect(R[1][2]).toBeCloseTo(1)
  })

  it('eig() returns eigenvalues', () => {
    const r = executeScript('[V, D] = eig([2 0; 0 3]);')
    const D = r.workspace.find((w: any) => w.name === 'D')?.value as number[][]
    const eigenvals = [D[0][0], D[1][1]].map(Number).sort((a, b) => a - b)
    expect(eigenvals[0]).toBeCloseTo(2)
    expect(eigenvals[1]).toBeCloseTo(3)
  })

  it('svd() produces U S V', () => {
    const r = executeScript('[U, S, V] = svd([1 0; 0 2]);')
    const S = r.workspace.find((w: any) => w.name === 'S')?.value as number[][]
    const svals = [S[0][0], S[1][1]].map(Number).sort((a, b) => a - b)
    expect(svals[0]).toBeCloseTo(1)
    expect(svals[1]).toBeCloseTo(2)
  })

  it('backslash solves Ax=b', () => {
    const r = executeScript('A = [2 1; 1 3]; b = [5; 10]; x = A \\ b;')
    const x = r.workspace.find((w: any) => w.name === 'x')?.value as number[]
    // 2x+y=5, x+3y=10 → x=1, y=3
    expect(x[0]).toBeCloseTo(1)
    expect(x[1]).toBeCloseTo(3)
  })
})

describe('executeScript — compatibility warnings', () => {
  it('warns about symbolic commands', () => {
    const r = executeScript('syms x; y = x^2;')
    expect(r.compatibilityWarnings.length).toBeGreaterThan(0)
  })
})

// ── Pure utility functions ────────────────────────────────────────────────────

describe('normalizeVector', () => {
  it('passes a flat array through', () => {
    expect(normalizeVector([1, 2, 3])).toEqual([1, 2, 3])
  })
  it('flattens column vectors', () => {
    expect(normalizeVector([[1], [2], [3]])).toEqual([1, 2, 3])
  })
  it('wraps a scalar', () => {
    expect(normalizeVector(5 as any)).toEqual([5])
  })
})

describe('buildLinspace', () => {
  it('generates n equally spaced values', () => {
    const v = buildLinspace(0, 1, 5)
    expect(v).toHaveLength(5)
    expect(v[0]).toBeCloseTo(0)
    expect(v[4]).toBeCloseTo(1)
    expect(v[2]).toBeCloseTo(0.5)
  })
})

describe('rrefMatrix (utility)', () => {
  it('reduces a 2×3 augmented matrix', () => {
    const { matrix } = rrefMatrix([[1, 2, 3], [4, 5, 6]])
    expect(matrix[0][0]).toBeCloseTo(1)
    expect(matrix[1][0]).toBeCloseTo(0)
  })
})

describe('polyfit / polyval', () => {
  it('fits and evaluates a degree-1 polynomial', () => {
    const x = [0, 1, 2, 3]
    const y = [1, 3, 5, 7]   // y = 2x + 1
    const coeffs = polyfit(x, y, 1)
    expect(coeffs[0]).toBeCloseTo(2)
    expect(coeffs[1]).toBeCloseTo(1)
    const vals = polyval(coeffs, [0, 1, 2])
    expect(vals[0]).toBeCloseTo(1)
    expect(vals[1]).toBeCloseTo(3)
    expect(vals[2]).toBeCloseTo(5)
  })
})

describe('sum, prod and mean along a dimension', () => {
  const ws = (r: any, name: string) => r.workspace.find((w: any) => w.name === name)?.value
  it('dim 2 gives one result per row, dim 1 one per column, and no dim keeps the single total', () => {
    const r = executeScript('C = [1 2 2; 1 4 8; 1 6 4; 1 8 6];\nrows = sum(C, 2);\ncols = sum(C, 1);\nall = sum(C);\nm = mean(C, 1);\np = prod([1 2; 3 4], 2);')
    expect(ws(r, 'rows')).toEqual([5, 13, 11, 15])
    expect(ws(r, 'cols')).toEqual([4, 20, 20])
    expect(ws(r, 'all')).toBe(44)
    expect(ws(r, 'm')).toEqual([1, 5, 5])
    expect(ws(r, 'p')).toEqual([2, 12])
  })
  it('the row sums of X * diag(w) are the predictions X * w (ML Lab 03.2)', () => {
    const r = executeScript('X = [1 1 1; 1 2 4; 1 3 2; 1 4 3];\nw = [1; 2; 2];\na = sum(X * diag(w), 2);\nb = X * w;')
    expect(ws(r, 'a')).toEqual(ws(r, 'b'))
    expect(ws(r, 'b')).toEqual([5, 13, 11, 15])
  })
  it('rejects a dimension other than 1 or 2 with a clear message', () => {
    expect(() => executeScript('s = sum([1 2; 3 4], 3)')).toThrow(/dimension must be 1 \(down columns\) or 2 \(across rows\)/)
  })
})
