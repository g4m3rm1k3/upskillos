import { describe, it, expect } from 'vitest'
import { detectMatlabCompatibilityWarnings, executeScript, normalizeVector, buildLinspace, rrefMatrix, polyfit, polyval } from '../index.js'

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

  it('fprintf supports MATLAB numeric formats, widths and literal percent signs', () => {
    const r = executeScript("fprintf('%08.2f %X %.2e %%', 3.5, 255, 1200)")
    expect(r.output).toContain('00003.50 FF 1.20e+3 %')
  })

  it('concatenates MATLAB character vectors without numeric coercion', () => {
    const r = executeScript("name = ['Open', 'MAT']; rows = ['Open'; 'Calc']; disp(name); message = strcat(name, ' works');")
    expect(r.workspace.find((entry: any) => entry.name === 'name')).toMatchObject({
      className: 'char',
      value: 'OpenMAT',
    })
    expect(r.workspace.find((entry: any) => entry.name === 'rows')).toMatchObject({
      className: 'string array',
      value: ['Open', 'Calc'],
    })
    expect(r.workspace.find((entry: any) => entry.name === 'message')?.value).toBe('OpenMAT works')
    expect(r.output).toContain('OpenMAT')
  })

  it('supports MATLAB degree-based trigonometry for scalars and arrays', () => {
    const r = executeScript(`theta = 30;
v0 = 20;
vx = v0 * cosd(theta);
vy = v0 * sind(theta);
A = [3; 4];
thetaA = atan2d(A(2), A(1));
quadrants = atan2d([0 1 -1], [1 0 0]);
roundTrip = rad2deg(deg2rad([0 45 180]));`)

    expect(r.workspace.find((entry: any) => entry.name === 'vx')?.value).toBeCloseTo(10 * Math.sqrt(3))
    expect(r.workspace.find((entry: any) => entry.name === 'vy')?.value).toBeCloseTo(10)
    expect(r.workspace.find((entry: any) => entry.name === 'thetaA')?.value).toBeCloseTo(53.1301023542)
    expect(r.workspace.find((entry: any) => entry.name === 'quadrants')?.value).toEqual([0, 90, -90])
    expect(r.workspace.find((entry: any) => entry.name === 'roundTrip')?.value).toEqual([0, 45, 180])
  })

  it('accepts continuation markers after notebook line breaks are collapsed', () => {
    const source = `noise = [0.2; -0.3; 0.1; -0.4; 0.5; -0.2; 0.3; -0.1; 0.4; -0.5; ... 0.1; -0.2; 0.3; -0.1; 0.2; -0.4; 0.3; -0.2; 0.1; -0.3; ... 0.4; -0.1; 0.2; -0.3; 0.1; -0.2; 0.3; -0.4; 0.2; -0.1; ... 0.3; -0.2; 0.4; -0.3; 0.1; -0.2; 0.3; -0.1; 0.2; -0.3; ... 0.1; -0.4; 0.2; -0.1; 0.3; -0.2; 0.4; -0.1; 0.2; -0.3];`
    const r = executeScript(source)
    const noise = r.workspace.find((entry: any) => entry.name === 'noise')?.value as number[]

    expect(noise).toHaveLength(50)
    expect(noise.slice(8, 13)).toEqual([0.4, -0.5, 0.1, -0.2, 0.3])
  })

  it('joins ordinary MATLAB continuation lines without changing ellipses inside strings', () => {
    const r = executeScript("x = 1 + ... % continue the expression\n    2; label = 'wait...';")
    expect(r.workspace.find((entry: any) => entry.name === 'x')?.value).toBe(3)
    expect(r.workspace.find((entry: any) => entry.name === 'label')?.value).toBe('wait...')
  })

  it('preserves vector shapes across MATLAB array builders and least-squares workflows', () => {
    const r = executeScript(`x = linspace(0, 10, 50)';
y = 2 * x + 1 + randn(50, 1) * 0.5;
X = [x, ones(50, 1)];
w = X \\ y;
y_pred = X * w;
slope = w(1);
intercept = w(2);
plot(x, y)
hold on
plot(x, y_pred)`)

    const X = r.workspace.find((entry: any) => entry.name === 'X')?.value as number[][]
    const w = r.workspace.find((entry: any) => entry.name === 'w')?.value as number[]
    const prediction = r.workspace.find((entry: any) => entry.name === 'y_pred')?.value as number[]
    expect(X).toHaveLength(50)
    expect(X[0]).toHaveLength(2)
    expect(w).toHaveLength(2)
    expect(w.every(Number.isFinite)).toBe(true)
    expect(prediction).toHaveLength(50)
    expect(r.figureJson).not.toBeNull()
  })

  it('matches MATLAB constructor dimensions, including size-vector arguments', () => {
    const r = executeScript('square = zeros(3); row = ones(size([1 2 3])); column = randn(4, 1); scalar = rand();')
    expect(r.workspace.find((entry: any) => entry.name === 'square')?.value).toEqual([
      [0, 0, 0], [0, 0, 0], [0, 0, 0],
    ])
    expect(r.workspace.find((entry: any) => entry.name === 'row')?.value).toEqual([1, 1, 1])
    expect(r.workspace.find((entry: any) => entry.name === 'column')?.value).toHaveLength(4)
    expect(typeof r.workspace.find((entry: any) => entry.name === 'scalar')?.value).toBe('number')
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

  it('calls a local function declared after the script body', () => {
    const r = executeScript(`result = custom_collatz(27);
disp('Steps to reach 1:');
disp(result);

function steps = custom_collatz(n)
    steps = 0;
    while n > 1
        if mod(n, 2) == 0
            n = n / 2;
        else
            n = 3 * n + 1;
        end
        steps = steps + 1;
        if steps > 1000
            break;
        end
    end
end`)

    expect(r.workspace.find((entry: any) => entry.name === 'result')?.value).toBe(111)
    expect(r.output).toContain('Steps to reach 1:')
    expect(r.output).toContain('111')
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
    expect(fig.xlabel).toBe('X')
    expect(fig.elements.find((e: any) => e.role === 'xlabel').content).toBe('X')
  })

  it('runs a MATLAB pendulum notebook with TeX labels, subplots and annotations', () => {
    const source = String.raw`g = 9.8;
L = linspace(0.1, 4.0, 200);
T = 2*pi*sqrt(L/g);

figure;
subplot(1,2,1);
plot(L, T, 'm-', 'LineWidth', 2);
xlabel('L [m]'); ylabel('T [s]');
title('Pendulum period vs length');
grid on;

subplot(1,2,2);
plot(sqrt(L), T, 'r-', 'LineWidth', 2);
xlabel('\surdL  [m^{1/2}]'); ylabel('T [s]');
title('T vs \surdL — linear as Buckingham Pi predicts');
grid on;
slope = 2*pi/sqrt(g);
text(0.5, slope*0.5+0.2, sprintf('slope = 2\pi/\surdg = %.3f', slope), ...
     'Color','r','FontSize',10);

a_2sf = 9.8;
t_4sf = 3.147;
product = a_2sf * t_4sf;
fprintf('\nSig figs example:\n');
fprintf('  %.1f × %.3f = %.4f\n', a_2sf, t_4sf, product);
fprintf('  Rounded to 2 sf: %.0f\n', round(product, 2, 'significant'));
fprintf('  Rule: multiply/divide → answer has fewest input sig figs\n');`

    const result = executeScript(source)
    const figure = JSON.parse(result.figureJson as string)
    const secondPanel = JSON.parse(figure.panels[1])

    expect(figure.type).toBe('opencalc_subplots')
    expect(figure.panels).toHaveLength(2)
    expect(secondPanel.elements).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'text', content: String.raw`\surdL  [m^{1/2}]` }),
      expect.objectContaining({ type: 'text', content: expect.stringContaining(String.raw`2\pi/\surdg`), color: 'red', size: 10 }),
      expect.objectContaining({ type: 'curve', color: 'red', width: 2 }),
    ]))
    expect(result.output).toContain('Sig figs example:')
    expect(result.output).toContain('9.8 × 3.147 = 30.8406')
    expect(result.output).toContain('Rounded to 2 sf: 31')
  })

  it('rounds to decimal places or significant digits like MATLAB', () => {
    const result = executeScript("a = round(30.8406, 1); b = round(30.8406, 2, 'significant');")
    expect(result.workspace.find((entry: any) => entry.name === 'a')?.value).toBe(30.8)
    expect(result.workspace.find((entry: any) => entry.name === 'b')?.value).toBe(31)
  })

  it('preserves TeX backslashes in both character vectors and strings', () => {
    const result = executeScript(String.raw`a = '\alpha'; b = "\beta";`)
    expect(result.workspace.find((entry: any) => entry.name === 'a')?.value).toBe(String.raw`\alpha`)
    expect(result.workspace.find((entry: any) => entry.name === 'b')?.value).toBe(String.raw`\beta`)
  })

  it('accepts MATLAB format commands and changes numeric display precision', () => {
    const short = executeScript('format short\nx = 1/3')
    const long = executeScript('format long\nx = 1/3')
    const bank = executeScript('format bank\nx = 1/3')

    expect(long.output.length).toBeGreaterThan(short.output.length)
    expect(bank.output).toContain('0.33')
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
  it('ignores words inside strings and comments, but not transposes next to them', () => {
    expect(executeScript("disp('Rank of the weather table:')\nx = 1; % a table of values").compatibilityWarnings).toEqual([])
    expect(executeScript("A = [1 2; 3 4];\nB = A';\ndisp('it''s a table')").compatibilityWarnings).toEqual([])
    expect(detectMatlabCompatibilityWarnings("A = [1 2]; t = table(A')").length).toBe(1)
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

// ── MATLAB compatibility: A(:) and ans ───────────────────────────────────────

describe('executeScript — A(:) and ans', () => {
  const value = (src: string, name: string) => {
    const v = executeScript(src).workspace.find((w: any) => w.name === name)?.value as any
    return v?.toArray ? v.toArray() : v
  }

  it('A(:) lists every element column by column', () => {
    expect(value('A = [1 2; 3 4]; v = A(:);', 'v')).toEqual([1, 3, 2, 4])
    expect(value('A = [1 2; 3 4]; s = sum(A(:));', 's')).toBe(10)
    expect(value('v = [5 6 7]; w = v(:);', 'w')).toEqual([5, 6, 7])
  })

  it('A(:) = v sets every element, in column order, keeping the shape', () => {
    expect(value('A = [1 2; 3 4]; A(:) = 0;', 'A')).toEqual([[0, 0], [0, 0]])
    expect(value('A = [1 2; 3 4]; A(:) = [9 8 7 6];', 'A')).toEqual([[9, 7], [8, 6]])
    expect(() => executeScript('A = [1 2; 3 4]; A(:) = [1 2];')).toThrow(/needs v to have 4 elements/)
  })

  it('ans holds the value of the last expression and appears in the workspace', () => {
    expect(value('3 + 4', 'ans')).toBe(7)
    expect(value('x = [1 2 3];\nmean(x)', 'ans')).toBe(2)
    expect(value('3 + 4;\ny = ans * 2;', 'y')).toBe(14)
  })
})

describe('executeScript — element-wise operators with decimals, signs and powers', () => {
  const ans = (src: string) => {
    const v = executeScript(src).workspace.find((w: any) => w.name === 'ans')?.value as any
    return v?.toArray ? v.toArray() : v
  }
  it.each([
    ['4 .* 2.5', 10],
    ['2.5 .* 3.1', 7.75],
    ['(3 + 1) .* 2.5', 10],
    ['1e2 .* 0.5', 50],
    ['.5 .* 4', 2],
    ['6 ./ 1.5', 4],
    ['2 .^ 0.5', Math.SQRT2],
    ['3 .* -2', -6],
    ['x2 = 3; x2 .* 2', 6],
    ['2 .* 3 .^ 2', 18],
    ['3 .^ 2 .* 2', 18],
    ['2 .* 3^2', 18],
    ['3^2 .* 2', 18],
    ['[1 2 3] .* [4 5 6]', [4, 10, 18]],
    ['[1 2 3] .^ 2 ./ 2', [0.5, 2, 4.5]],
  ])('%s = %j', (src, expected) => {
    const v = ans(src)
    if (Array.isArray(expected)) expect(v).toEqual(expected)
    else expect(v).toBeCloseTo(expected as number, 10)
  })
})

describe('one-output and multi-output linear algebra', () => {
  const ws = (src: string) => Object.fromEntries(executeScript(src).workspace.map((e: any) => [e.name, e.value]))
  it('eig and svd return values with one output and factors with several', () => {
    const w = ws('A=[2 1;1 2]; e=eig(A); [V,D]=eig(A); s=svd([3 0;4 5]); [U,S,W]=svd([3 0;4 5]);')
    expect(w.e).toEqual([1, 3])
    expect(w.D).toEqual([[1, 0], [0, 3]])
    expect((w.s as number[]).map(v => +v.toFixed(4))).toEqual([6.7082, 2.2361])
    expect((w.S as number[][])[1][1]).toBeCloseTo(2.23607, 4)
  })
  it('max and min with two outputs return the value and its position', () => {
    const w = ws('b=[7; 9; 5; 9]; [lo, i]=min(b); [hi, j]=max(b); [cm, ci]=max([1 8; 6 2]); m=max(b);')
    expect([w.lo, w.i, w.hi, w.j, w.m]).toEqual([5, 3, 9, 2, 9])
    expect([w.cm, w.ci]).toEqual([[6, 8], [2, 1]])
  })
  it('diag builds a matrix from a row or column, even one produced by concatenation', () => {
    const w = ws('u=1000; D=diag([1 u]); C=diag([2; 3]); M=diag([1 2; 3 4]);')
    expect(w.D).toEqual([[1, 0], [0, 1000]])
    expect(w.C).toEqual([[2, 0], [0, 3]])
    expect(w.M).toEqual([1, 4])
  })
  it('rank and cond accept a single row or column', () => {
    const w = ws('A=[1 0 1; 0 1 1]; r1=rank(A(:,1)); r0=rank([0;0]); rr=rank([3 4]);')
    expect([w.r1, w.r0, w.rr]).toEqual([1, 0, 1])
  })
  it('chol returns the upper factor and rejects indefinite input', () => {
    const w = ws('R=chol([4 2;2 3]); back=R\'*R;')
    expect(w.R[1][0]).toBe(0)
    expect(w.R[0]).toEqual([2, 1])
    expect(w.R[1][1]).toBeCloseTo(Math.SQRT2, 10)
    expect((w.back as number[][]).flat().map(v => +v.toFixed(10))).toEqual([4, 2, 2, 3])
    expect(() => executeScript('R=chol([1 2;2 1]);')).toThrow(/positive definite/)
  })
})

describe('executeScript — MATLAB compatibility fixes', () => {
  const value = (r: any, name: string) => r.workspace.find((w: any) => w.name === name)?.value
  it('bar(x, y) draws y at the positions x', () => {
    const fig = JSON.parse(executeScript("bar([1 2 3], [5 2 0.5])\ntitle('t')").figureJson as string)
    const bars = fig.elements.find((e: any) => e.type === 'bars')
    expect(bars.values).toEqual([5, 2, 0.5])
    expect(bars.labels).toEqual(['1', '2', '3'])
    expect(JSON.parse(executeScript('bar([4 1])').figureJson as string).elements.find((e: any) => e.type === 'bars').values).toEqual([4, 1])
  })
  it('find(x, n) returns only the first n matches', () => {
    const r = executeScript('v = [0 3 0 5 7];\na = find(v > 2, 1);\nb = find(v, 2);\nc = find(v);')
    expect(value(r, 'a')).toBe(2)
    expect(value(r, 'b')).toEqual([2, 4])
    expect(value(r, 'c')).toEqual([2, 4, 5])
  })
  it("norm(A, 'fro'), norm(A, 1) and norm(A, Inf) for matrices and vectors", () => {
    const r = executeScript("A = [1 -2; 3 4];\nf = norm(A, 'fro');\no = norm(A, 1);\ni = norm(A, Inf);\nv = norm([3 4], 'fro');")
    expect(value(r, 'f')).toBeCloseTo(Math.sqrt(30), 12)
    expect(value(r, 'o')).toBeCloseTo(6, 12)
    expect(value(r, 'i')).toBeCloseTo(7, 12)
    expect(value(r, 'v')).toBeCloseTo(5, 12)
  })
})
