/* eslint-disable @typescript-eslint/no-explicit-any */
import { math, isSymObj, isSymArr } from './math-instance.js'
import {
  toPlain, isComplexLike, realValue, isMatrix, isCollection,
  mapDeep, normalizeVector, flattenNumbers, toNumericMatrix,
  inferSize, makeDiagonal, makeRandomArray, toColumnSeries,
  buildLinspace, buildLogspace, meshgrid, clampValue,
  diffArray, cumulative, dotProduct, crossProduct,
  dotMultiply, dotDivide, dotPow, polyfit, polyval,
  interp1Array, trapzArray, gradientArray,
} from './math-utils.js'
import {
  statMean, statMedian, statStd, statVar, statMin, statMax,
  statSum, statProd, statSort, statUnique, statMod, statRem,
  statFix, statAny, statAll, statFind,
  reshapeArray, repmatArray, histArray, companionRoots,
} from './stats.js'
import {
  rrefMatrix, matrixRank, conditionNumber, determinantValue,
  luFactorization, orthonormalBasis, svdDecomp,
} from './linalg.js'
import { sprintfFormat, formatValue, buildWorkspaceSnapshot } from './format.js'
import {
  makePlotState, buildFigureFromPlotState,
  convertSurfaceTo3DConfig, convertPointSeries3DConfig,
} from './plot.js'
import { detectMatlabCompatibilityWarnings } from './compat.js'
import {
  _erf, _gammaln, _gammainc, _betacf, _betainc,
  _norminvScalar, _tcdfScalar, _tpdfScalar, _tinvScalar,
  _chi2cdfScalar, _chi2pdfScalar, _chi2invScalar, _ewDistrib,
} from './distributions.js'
import {
  stripMatlabComment, parseBlocks, preprocessLine,
  replaceBackslash, joinContinuationLines,
} from './transpiler.js'
import type {
  EngineOptions, EngineExtension, ExecutionResult, NotebookResult, PlotState,
} from './types.js'

// ── Control-flow sentinels ────────────────────────────────────────────────────

export const BREAK    = Symbol("BREAK")
export const CONTINUE = Symbol("CONTINUE")
export const RETURN   = Symbol("RETURN")

type ControlFlow = typeof BREAK | typeof CONTINUE | typeof RETURN

// ── Elementwise unary registration helper ────────────────────────────────────

/**
 * Registers a unary function on the math instance so it broadcasts
 * element-wise over arrays and matrices.
 */
export function registerElementwiseUnary(name: string, fn: (x: number) => number): void {
  (math as any).import({
    [name]: (v: unknown) =>
      isCollection(v) ? mapDeep(v, (x: unknown) => fn(Number(x))) : fn(Number(v)),
  }, { override: true, wrap: false })
}

// ── HELP_TEXT ─────────────────────────────────────────────────────────────────

export const HELP_TEXT = `
OpenMAT — MATLAB-compatible numeric engine
==========================================

ARITHMETIC & OPERATORS
  +  -  *  /  ^       Scalar and matrix operations
  .*  ./  .^           Element-wise operations
  A'                  Conjugate transpose (A.' for non-conjugate)
  A \\ b               Left division (solve A*x = b)

MATRICES
  [1 2; 3 4]          Matrix literal (rows separated by ;)
  zeros(m,n)  ones(m,n)  eye(n)  rand(m,n)  randn(m,n)
  size(A)  length(A)  numel(A)  transpose(A)
  inv(A)  det(A)  trace(A)  rank(A)  norm(A)
  horzcat(A,B)  vertcat(A,B)  repmat(A,m,n)  reshape(A,m,n)
  diag(v)  tril(A)  triu(A)  kron(A,B)  cross(a,b)  dot(a,b)

LINEAR ALGEBRA
  rref(A)             Reduced row echelon form
  [L,U,P] = lu(A)    LU decomposition with pivoting
  [U,S,V] = svd(A)   Singular value decomposition
  eig(A)  svd(A)  rank(A)  cond(A)  orth(A)  null(A)

STATISTICS
  mean  median  std  var  min  max  sum  prod
  sum(A,1) column sums   sum(A,2) row sums   (also prod, mean)
  sort  unique  find  any  all  mod  rem  fix
  hist(v,bins)  cumsum  cumprod  diff

PLOTTING
  plot(x,y)  scatter(x,y)  bar(labels,values)  stem(x,y)
  title('...')  xlabel('...')  ylabel('...')  legend('...')
  hold on / hold off  grid on / grid off  xlim([a b])  ylim([a b])
  surf(X,Y,Z)  mesh(X,Y,Z)  scatter3(x,y,z)  plot3(x,y,z)
  colormap('parula')  colorbar

CONTROL FLOW
  if / elseif / else / end
  for var = expr ... end
  while cond ... end
  break  continue  return
  try ... catch err ... end
  switch expr; case val ... otherwise ... end

FUNCTIONS
  function [out1,out2] = name(in1,in2)  ...  end
  Anonymous: f = @(x) x.^2 + 1

STRING & DISPLAY
  disp(x)  fprintf('%g\\n', x)  sprintf('%d items', n)
  num2str(x)  str2num(s)  strsplit(s)  strjoin(c)

SYMBOLIC (limited)
  syms x y         Declare symbolic variables
  diff(expr, x)    Symbolic derivative
  simplify(expr)   Simplify
  subs(expr, x, val)  Substitute
  sym2poly(expr)   Extract polynomial coefficients

DISTRIBUTIONS
  normpdf  normcdf  norminv  tpdf  tcdf  tinv
  chi2pdf  chi2cdf  chi2inv  betapdf  betacdf  betainv
  exppdf  expcdf  expinv  unifpdf  unifcdf  unifinv
  randperm(n)  randsample(n,k)

MISCELLANEOUS
  linspace(a,b,n)  logspace(a,b,n)  meshgrid(x,y)
  interp1(x,y,xi)  polyfit(x,y,n)  polyval(p,x)
  trapz(x,y)  gradient(f,h)
  magic(n)  pascal(n)  hilb(n)
  ode45(f,tspan,y0)  fzero(f,x0)  integral(f,a,b)
  struct(field,val,...)  fieldnames(s)  isfield(s,name)
`.trim()

// ── 3D merge helper (engine-internal) ────────────────────────────────────────

function merge3DRequest(
  existing: Record<string, any> | null,
  incoming: Record<string, any>,
): Record<string, any> {
  if (!existing) return incoming
  const merged = { ...existing, ...incoming }
  const ef = existing.functions ?? []
  const inf = incoming.functions ?? []
  merged.functions = [...ef, ...inf]
  return merged
}

// ── Engine factory ────────────────────────────────────────────────────────────

export function createExecutionEngine(options: EngineOptions = {}): {
  parser: any
  logs: string[]
  plotState: PlotState
  subplotState: any
  variables: Set<string>
  functionNames: Set<string>
  getPlot3DRequest(): Record<string, any> | null
  getControls(): any[]
  clearVariables(names: string[]): void
} {
  const extensions  = options.extensions  ?? []
  const initialWorkspace = options.initialWorkspace ?? []

  const parser = (math as any).parser()
  const logs: string[] = []
  const plotState: PlotState = makePlotState()
  const subplotState: any = { active: false, rows: 1, cols: 1, current: 0, slots: [] }
  const variables = new Set<string>()
  const functionNames = new Set<string>()
  const controls: any[] = []
  let plot3DRequest: Record<string, any> | null = null

  // Restore initial workspace variables
  initialWorkspace.forEach(entry => {
    parser.set(entry.name, entry.value)
    variables.add(entry.name)
  })

  // Bind control values (slider/dropdown overrides)
  const controlValues: Record<string, number> = options.controlValues ?? {}

  // ── Plot registration helper ───────────────────────────────────────────────
  function registerPlot(kind: string, ...args: any[]): void {
    const [xRaw, yRaw, ...rest] = args

    if (kind === "plot" || kind === "area") {
      let x: number[], y: number[]
      if (args.length === 1) {
        y = normalizeVector(xRaw)
        x = Array.from({ length: y.length }, (_, i) => i + 1)
      } else {
        x = normalizeVector(xRaw); y = normalizeVector(yRaw)
      }
      const labelArg = rest.find((a: any) => typeof a === "string")
      if (!plotState.hold) plotState.series = []
      plotState.series.push({ kind: kind as any, x, y, label: labelArg })
      return
    }

    if (kind === "scatter") {
      const x = normalizeVector(xRaw), y = normalizeVector(yRaw)
      if (!plotState.hold) plotState.series = []
      plotState.series.push({ kind: "scatter", x, y })
      return
    }

    if (kind === "stem") {
      let x: number[], y: number[]
      if (args.length === 1) {
        y = normalizeVector(xRaw)
        x = Array.from({ length: y.length }, (_, i) => i + 1)
      } else {
        x = normalizeVector(xRaw); y = normalizeVector(yRaw)
      }
      if (!plotState.hold) plotState.series = []
      plotState.series.push({ kind: "stem", x, y })
      return
    }

    if (kind === "bar") {
      const raw = toPlain(xRaw)
      if (Array.isArray(raw) && !Array.isArray(raw[0]) && typeof raw[0] === "string") {
        const labels = raw.map(String)
        const values = normalizeVector(yRaw)
        if (!plotState.hold) plotState.series = []
        plotState.series.push({ kind: "bar", x: [], y: [], labels, values })
      } else {
        const vals = normalizeVector(xRaw)
        if (!plotState.hold) plotState.series = []
        plotState.series.push({ kind: "bar", x: [], y: [], values: vals, labels: vals.map((_, i) => String(i + 1)) })
      }
      return
    }

    if (kind === "surf" || kind === "mesh" || kind === "contour" || kind === "contourf") {
      plot3DRequest = merge3DRequest(plot3DRequest, convertSurfaceTo3DConfig(kind, args, plotState))
      return
    }

    if (kind === "scatter3" || kind === "plot3") {
      plot3DRequest = merge3DRequest(plot3DRequest, convertPointSeries3DConfig(kind, args, plotState))
      return
    }
  }

  // ── Built-in math functions ────────────────────────────────────────────────
  parser.set("pi", Math.PI)
  parser.set("e",  Math.E)
  parser.set("Inf", Infinity); parser.set("inf", Infinity)
  parser.set("NaN", NaN);     parser.set("nan", NaN)
  parser.set("true", true);   parser.set("false", false)
  parser.set("eps", Number.EPSILON)
  parser.set("i", math.complex(0, 1))

  // ── Array builders ────────────────────────────────────────────────────────
  parser.set("linspace",  (a: any, b: any, n: any) => buildLinspace(a, b, n == null ? 100 : Number(n)))
  parser.set("logspace",  (a: any, b: any, n: any) => buildLogspace(a, b, n == null ? 50  : Number(n)))
  parser.set("colon",     (a: any, b: any, c: any) => {
    if (c === undefined) return buildLinspace(a, b, Math.round(Math.abs(Number(b) - Number(a)) + 1))
    const step = Number(b), from = Number(a), to = Number(c)
    if (Math.abs(step) < 1e-14) return []
    const count = Math.floor((to - from) / step) + 1
    return Array.from({ length: Math.max(0, count) }, (_, i) => from + i * step)
  })
  parser.set("zeros",  (r: any, c: any) => { const R = Number(r||1), C = Number(c ?? r ?? 1); return Array.from({length:R}, () => Array(C).fill(0)) })
  parser.set("ones",   (r: any, c: any) => { const R = Number(r||1), C = Number(c ?? r ?? 1); return Array.from({length:R}, () => Array(C).fill(1)) })
  parser.set("eye",    (n: any) => { const N = Number(n); return Array.from({length:N}, (_,i) => Array.from({length:N}, (_,j) => i===j?1:0)) })
  parser.set("rand",   (r: any, c: any) => makeRandomArray(c == null ? [Number(r||1)] : [Number(r||1), Number(c)]))
  parser.set("randn",  (r: any, c: any) => {
    const shape = c == null ? [Number(r||1)] : [Number(r||1), Number(c)]
    const box = (n: number) => {
      const out: number[] = []
      while (out.length < n) {
        const u = 1 - Math.random(), v = Math.random()
        const z = Math.sqrt(-2*Math.log(u)) * Math.cos(2*Math.PI*v)
        const w = Math.sqrt(-2*Math.log(u)) * Math.sin(2*Math.PI*v)
        out.push(z, w)
      }
      return out.slice(0, n)
    }
    const [rr, cc] = shape.length >= 2 ? [shape[0], shape[1]] : [1, shape[0]]
    return Array.from({length:rr}, () => box(cc))
  })
  parser.set("meshgrid", (x: any, y: any) => meshgrid(x, y))

  // ── Matrix builders / info ─────────────────────────────────────────────────
  parser.set("diag",     (v: any, k?: any) => {
    const p = toPlain(v)
    if (!Array.isArray(p)) return [[Number(p)]]
    if (isMatrix(p)) return toPlain(math.diag(p as any, k ?? 0))
    return k == null ? makeDiagonal(v) : toPlain(math.diag(p as any, Number(k)))
  })
  parser.set("tril",     (A: any, k?: any) => toPlain(math.map(A, (_: any, i: any, j: any) => j <= i + (k??0) ? _ : 0)))
  parser.set("triu",     (A: any, k?: any) => toPlain(math.map(A, (_: any, i: any, j: any) => j >= i + (k??0) ? _ : 0)))
  parser.set("horzcat",  (...args: any[]) => {
    const rows = (toNumericMatrix(args[0]) ?? [normalizeVector(args[0])]).length
    return Array.from({length: rows}, (_, r) => args.flatMap((a: any) => {
      const m = toNumericMatrix(a)
      return m ? m[r] ?? [] : [realValue(a)]
    }))
  })
  parser.set("vertcat",  (...args: any[]) => args.flatMap((a: any) => {
    const m = toNumericMatrix(a)
    return m ?? [normalizeVector(a)]
  }))
  parser.set("kron",     (A: any, B: any) => {
    const Am = toNumericMatrix(A)!, Bm = toNumericMatrix(B)!
    const [ma,na] = [Am.length, Am[0].length], [mb,nb] = [Bm.length, Bm[0].length]
    const C = Array.from({length:ma*mb}, () => new Array(na*nb).fill(0))
    for (let i=0;i<ma;i++) for (let j=0;j<na;j++) for (let p=0;p<mb;p++) for (let q=0;q<nb;q++)
      C[i*mb+p][j*nb+q] = Am[i][j] * Bm[p][q]
    return C
  })
  parser.set("size",     (A: any, dim?: any) => {
    const s = inferSize(A)
    return dim != null ? s[Number(dim) - 1] : s
  })
  parser.set("length",   (A: any) => { const s = inferSize(A); return Math.max(s[0], s[1]) })
  parser.set("numel",    (A: any) => { const p = toPlain(A); return Array.isArray(p) ? (p as any[]).flat(Infinity).length : 1 })
  parser.set("isempty",  (A: any) => { const p = toPlain(A); return (!p || (Array.isArray(p) && (p as any[]).flat(Infinity).length === 0)) ? 1 : 0 })
  parser.set("isvector", (A: any) => { const [r,c] = inferSize(A); return (r===1||c===1) ? 1 : 0 })
  parser.set("isscalar", (A: any) => { const [r,c] = inferSize(A); return (r===1&&c===1) ? 1 : 0 })
  parser.set("ismatrix", (A: any) => isMatrix(toPlain(A)) ? 1 : 0)
  parser.set("isnumeric",(A: any) => typeof toPlain(A) === "number" || isMatrix(toPlain(A)) ? 1 : 0)
  parser.set("ischar",   (A: any) => typeof toPlain(A) === "string" ? 1 : 0)
  parser.set("islogical",(A: any) => typeof toPlain(A) === "boolean" ? 1 : 0)
  parser.set("isa",      (A: any, t: any) => typeof toPlain(A) === String(t) ? 1 : 0)
  parser.set("class",    (A: any) => typeof toPlain(A))
  parser.set("reshape",  (A: any, r: any, c: any) => reshapeArray(A, r, c))
  parser.set("repmat",   (A: any, m: any, n: any) => repmatArray(A, m, n))
  parser.set("flatten",  (A: any) => flattenNumbers(A))
  parser.set("colon",    (a: any, s: any, b: any) => {
    if (b === undefined) { const from=Number(a),to=Number(s); const n=Math.round(Math.abs(to-from)+1); return buildLinspace(from,to,n) }
    const step=Number(s),from=Number(a),to=Number(b)
    if (Math.abs(step)<1e-14) return []
    const count=Math.floor((to-from)/step)+1
    return Array.from({length:Math.max(0,count)}, (_,i)=>from+i*step)
  })

  // ── Numeric math ──────────────────────────────────────────────────────────
  parser.set("abs",    (v: any) => isCollection(v) ? mapDeep(v, (x: any) => Math.abs(Number(x))) : Math.abs(Number(v)))
  parser.set("sqrt",   (v: any) => isCollection(v) ? mapDeep(v, (x: any) => Math.sqrt(Number(x))) : Math.sqrt(Number(v)))
  parser.set("exp",    (v: any) => isCollection(v) ? mapDeep(v, (x: any) => Math.exp(Number(x)))  : Math.exp(Number(v)))
  parser.set("log",    (v: any) => isCollection(v) ? mapDeep(v, (x: any) => Math.log(Number(x)))  : Math.log(Number(v)))
  parser.set("log2",   (v: any) => isCollection(v) ? mapDeep(v, (x: any) => Math.log2(Number(x))) : Math.log2(Number(v)))
  parser.set("log10",  (v: any) => isCollection(v) ? mapDeep(v, (x: any) => Math.log10(Number(x))): Math.log10(Number(v)))
  parser.set("sin",    (v: any) => isCollection(v) ? mapDeep(v, (x: any) => Math.sin(Number(x)))  : Math.sin(Number(v)))
  parser.set("cos",    (v: any) => isCollection(v) ? mapDeep(v, (x: any) => Math.cos(Number(x)))  : Math.cos(Number(v)))
  parser.set("tan",    (v: any) => isCollection(v) ? mapDeep(v, (x: any) => Math.tan(Number(x)))  : Math.tan(Number(v)))
  parser.set("asin",   (v: any) => isCollection(v) ? mapDeep(v, (x: any) => Math.asin(Number(x))) : Math.asin(Number(v)))
  parser.set("acos",   (v: any) => isCollection(v) ? mapDeep(v, (x: any) => Math.acos(Number(x))) : Math.acos(Number(v)))
  parser.set("atan",   (v: any) => isCollection(v) ? mapDeep(v, (x: any) => Math.atan(Number(x))) : Math.atan(Number(v)))
  parser.set("atan2",  (y: any, x: any) => Math.atan2(Number(y), Number(x)))
  parser.set("sinh",   (v: any) => isCollection(v) ? mapDeep(v, (x: any) => Math.sinh(Number(x))) : Math.sinh(Number(v)))
  parser.set("cosh",   (v: any) => isCollection(v) ? mapDeep(v, (x: any) => Math.cosh(Number(x))) : Math.cosh(Number(v)))
  parser.set("tanh",   (v: any) => isCollection(v) ? mapDeep(v, (x: any) => Math.tanh(Number(x))) : Math.tanh(Number(v)))
  parser.set("ceil",   (v: any) => isCollection(v) ? mapDeep(v, (x: any) => Math.ceil(Number(x)))  : Math.ceil(Number(v)))
  parser.set("floor",  (v: any) => isCollection(v) ? mapDeep(v, (x: any) => Math.floor(Number(x))) : Math.floor(Number(v)))
  parser.set("round",  (v: any, d?: any) => {
    const f = d != null ? Math.pow(10, Number(d)) : 1
    return isCollection(v) ? mapDeep(v, (x: any) => Math.round(Number(x)*f)/f) : Math.round(Number(v)*f)/f
  })
  parser.set("fix",    (v: any) => statFix(v))
  parser.set("sign",   (v: any) => isCollection(v) ? mapDeep(v, (x: any) => Math.sign(Number(x))) : Math.sign(Number(v)))
  parser.set("real",   (v: any) => isComplexLike(v) ? v.re : Number(v))
  parser.set("imag",   (v: any) => isComplexLike(v) ? v.im : 0)
  parser.set("conj",   (v: any) => isComplexLike(v) ? math.complex(v.re, -v.im) : v)
  parser.set("angle",  (v: any) => isComplexLike(v) ? Math.atan2(v.im, v.re) : 0)
  parser.set("complex",(re: any, im: any) => math.complex(Number(re), Number(im ?? 0)))
  parser.set("mod",    (a: any, b: any) => isCollection(a) ? mapDeep(a, (x: any) => statMod(x, b)) : statMod(a, b))
  parser.set("rem",    (a: any, b: any) => isCollection(a) ? mapDeep(a, (x: any) => statRem(x, b)) : statRem(a, b))
  parser.set("power",  (a: any, b: any) => isCollection(a) ? mapDeep(a, (x: any) => Number(x)**Number(b)) : Number(a)**Number(b))
  parser.set("max",    (a: any, b: any) => {
    if (b !== undefined) {
      if (isCollection(a) && isCollection(b)) return normalizeVector(a).map((v: number, i: number) => Math.max(v, normalizeVector(b)[i]))
      if (isCollection(a)) return normalizeVector(a).map((v: number) => Math.max(v, Number(b)))
      return Math.max(realValue(a), realValue(b))
    }
    return statMax(a)
  })
  parser.set("min",    (a: any, b: any) => {
    if (b !== undefined) {
      if (isCollection(a) && isCollection(b)) return normalizeVector(a).map((v: number, i: number) => Math.min(v, normalizeVector(b)[i]))
      if (isCollection(a)) return normalizeVector(a).map((v: number) => Math.min(v, Number(b)))
      return Math.min(realValue(a), realValue(b))
    }
    return statMin(a)
  })
  // sum/prod/mean(A, dim), as in MATLAB: dim 1 reduces down each column (one result per column),
  // dim 2 across each row (one result per row). Results are plain vectors, the way OpenMAT stores
  // [a; b; c]. Without dim the existing behaviour is kept: every entry reduced to one number.
  const alongDim = (reduce: (xs: number[]) => number, whole: (v: any) => number) => (v: any, dim?: any) => {
    if (dim === undefined) return whole(v)
    const d = Number(realValue(dim))
    if (d !== 1 && d !== 2) throw new Error(`dimension must be 1 (down columns) or 2 (across rows), not ${d}`)
    const plain = toPlain(v)
    if (!isMatrix(plain)) return d === 1 ? normalizeVector(plain).map((x: number) => reduce([x])) : reduce(normalizeVector(plain))
    const rows = toNumericMatrix(plain)!
    return d === 2 ? rows.map((r: number[]) => reduce(r)) : rows[0].map((_: number, j: number) => reduce(rows.map((r: number[]) => r[j])))
  }
  parser.set("sum",    alongDim(xs => xs.reduce((a, b) => a + b, 0), statSum))
  parser.set("prod",   alongDim(xs => xs.reduce((a, b) => a * b, 1), statProd))
  parser.set("mean",   alongDim(xs => xs.reduce((a, b) => a + b, 0) / xs.length, statMean))
  parser.set("median", (v: any) => statMedian(v))
  parser.set("std",    (v: any, f?: any) => statStd(v, f))
  parser.set("var",    (v: any, f?: any) => statVar(v, f))
  parser.set("sort",   (v: any, d?: any) => statSort(v, d))
  parser.set("unique", (v: any) => statUnique(v))
  parser.set("find",   (v: any) => statFind(v))
  parser.set("any",    (v: any) => statAny(v))
  parser.set("all",    (v: any) => statAll(v))
  parser.set("cumsum", (v: any) => cumulative(v, (a: number, b: number) => a + b, null))
  parser.set("cumprod",(v: any) => cumulative(v, (a: number, b: number) => a * b, null))
  parser.set("diff",   (v: any) => diffArray(v))
  parser.set("cross",       (a: any, b: any) => crossProduct(a, b))
  parser.set("dot",         (a: any, b: any) => dotProduct(a, b))
  parser.set("dotMultiply", (a: any, b: any) => toPlain(dotMultiply(a, b)))
  parser.set("dotDivide",   (a: any, b: any) => toPlain(dotDivide(a, b)))
  parser.set("dotPow",      (a: any, b: any) => toPlain(dotPow(a, b)))
  parser.set("clamp",  (v: any, lo: any, hi: any) => clampValue(v, lo, hi))

  // ── Linear algebra ─────────────────────────────────────────────────────────
  parser.set("det",   (A: any) => determinantValue(A))
  parser.set("trace", (A: any) => { const m = toNumericMatrix(A)!; return m.reduce((s: number, r: number[], i: number) => s + (r[i]??0), 0) })
  parser.set("rref",  (A: any) => rrefMatrix(A).matrix)
  parser.set("rank",  (A: any) => matrixRank(A))
  parser.set("cond",  (A: any) => conditionNumber(A))
  parser.set("orth",  (A: any) => orthonormalBasis(A, "orth"))
  parser.set("null",  (A: any) => orthonormalBasis(A, "null"))
  parser.set("nullspace", (A: any) => orthonormalBasis(A, "null"))
  parser.set("svd",   (A: any) => svdDecomp(A))
  parser.set("lu",    (A: any) => luFactorization(A))
  parser.set("chol",  (A: any) => toPlain(math.lup(A).L))
  parser.set("pinv",  (A: any) => toPlain(math.pinv(A)))
  parser.set("norm",  (A: any, p?: any) => {
    const plain = toPlain(A)
    if (!Array.isArray(plain) || !Array.isArray((plain as any)[0])) {
      const v = normalizeVector(A)
      const pv = p == null ? 2 : (String(p) === "Inf" ? Infinity : Number(p))
      return pv === Infinity ? Math.max(...v.map(Math.abs))
           : pv === 1       ? v.reduce((s: number, x: number) => s + Math.abs(x), 0)
           :                  Math.pow(v.reduce((s: number, x: number) => s + Math.abs(x)**pv, 0), 1/pv)
    }
    return realValue(toPlain(math.norm(A)))
  })

  // ── Statistics ────────────────────────────────────────────────────────────
  parser.set("hist",    (v: any, bins?: any) => histArray(v, bins ?? 10))
  parser.set("histc",   (v: any, bins?: any) => histArray(v, bins ?? 10))
  parser.set("reshape", (A: any, r: any, c: any) => reshapeArray(A, r, c))
  parser.set("repmat",  (A: any, m: any, n: any) => repmatArray(A, m, n))
  parser.set("roots",   (coeffs: any) => companionRoots(coeffs))
  parser.set("polyfit", (x: any, y: any, n: any) => polyfit(x, y, n))
  parser.set("polyval", (p: any, x: any) => polyval(p, x))
  parser.set("interp1", (x: any, y: any, xi: any) => interp1Array(x, y, xi))
  parser.set("trapz",   (x: any, y?: any) => trapzArray(x, y))
  parser.set("gradient",(f: any, h?: any) => gradientArray(f, h))

  // ── String helpers ────────────────────────────────────────────────────────
  parser.set("disp",    (v: any) => { logs.push(formatValue(v)); return null })
  parser.set("display", (v: any) => { logs.push(formatValue(v)); return null })
  parser.set("fprintf", (fmt: any, ...args: any[]) => { logs.push(sprintfFormat(fmt, ...args)); return null })
  parser.set("printf",  (fmt: any, ...args: any[]) => { logs.push(sprintfFormat(fmt, ...args)); return null })
  parser.set("sprintf", (fmt: any, ...args: any[]) => sprintfFormat(fmt, ...args))
  parser.set("num2str", (v: any, fmt?: any) => fmt ? sprintfFormat(fmt, v) : String(realValue(toPlain(v))))
  parser.set("str2num", (s: any) => Number(String(s).trim()))
  parser.set("str2double", (s: any) => Number(String(s).trim()))
  parser.set("int2str", (v: any) => String(Math.round(Number(v))))
  parser.set("char",    (v: any) => String.fromCharCode(Number(v)))
  parser.set("strtrim", (s: any) => String(s).trim())
  parser.set("strsplit",(s: any, d?: any) => String(s).split(d ? String(d) : /\s+/))
  parser.set("strjoin", (c: any, d?: any) => (Array.isArray(c) ? c : [c]).map(String).join(d ? String(d) : " "))
  parser.set("strrep",  (s: any, old: any, rep: any) => String(s).replace(new RegExp(String(old), "g"), String(rep)))
  parser.set("strcmp",  (a: any, b: any) => String(a) === String(b) ? 1 : 0)
  parser.set("strcmpi", (a: any, b: any) => String(a).toLowerCase() === String(b).toLowerCase() ? 1 : 0)
  parser.set("strcat",  (...args: any[]) => args.map(String).join(""))
  parser.set("length",  (v: any) => { const s = inferSize(v); return Math.max(s[0], s[1]) })
  parser.set("upper",   (s: any) => String(s).toUpperCase())
  parser.set("lower",   (s: any) => String(s).toLowerCase())
  parser.set("contains",(s: any, p: any) => String(s).includes(String(p)) ? 1 : 0)
  parser.set("startsWith",(s: any, p: any) => String(s).startsWith(String(p)) ? 1 : 0)
  parser.set("endsWith",  (s: any, p: any) => String(s).endsWith(String(p)) ? 1 : 0)
  parser.set("regexprep",(s: any, pat: any, rep: any) => String(s).replace(new RegExp(String(pat), "g"), String(rep)))

  // ── Type conversion ───────────────────────────────────────────────────────
  parser.set("double",  (v: any) => realValue(v))
  parser.set("int8",    (v: any) => Math.trunc(realValue(v)))
  parser.set("int16",   (v: any) => Math.trunc(realValue(v)))
  parser.set("int32",   (v: any) => Math.trunc(realValue(v)))
  parser.set("int64",   (v: any) => Math.trunc(realValue(v)))
  parser.set("uint8",   (v: any) => Math.max(0, Math.min(255, Math.trunc(realValue(v)))))
  parser.set("uint16",  (v: any) => Math.max(0, Math.min(65535, Math.trunc(realValue(v)))))
  parser.set("uint32",  (v: any) => Math.max(0, Math.trunc(realValue(v))))
  parser.set("logical", (v: any) => isCollection(v) ? mapDeep(v, (x: any) => Boolean(x)) : Boolean(v))
  parser.set("cell2mat",(c: any) => { const p = toPlain(c); return Array.isArray(p) ? p.flat() : p })
  parser.set("num2cell",(v: any) => normalizeVector(v).map(x => [x]))
  parser.set("mat2str", (A: any) => {
    const m = toNumericMatrix(A)
    if (!m) return String(realValue(A))
    return "[" + m.map(row => row.join(" ")).join("; ") + "]"
  })

  // ── Comparison operators ──────────────────────────────────────────────────
  parser.set("eq",  (a: any, b: any) => isCollection(a) ? mapDeep(a, (x: any) => Number(x) === Number(b)) : Number(a) === Number(b))
  parser.set("ne",  (a: any, b: any) => isCollection(a) ? mapDeep(a, (x: any) => Number(x) !== Number(b)) : Number(a) !== Number(b))
  parser.set("lt",  (a: any, b: any) => isCollection(a) ? mapDeep(a, (x: any) => Number(x) <  Number(b)) : Number(a) <  Number(b))
  parser.set("le",  (a: any, b: any) => isCollection(a) ? mapDeep(a, (x: any) => Number(x) <= Number(b)) : Number(a) <= Number(b))
  parser.set("gt",  (a: any, b: any) => isCollection(a) ? mapDeep(a, (x: any) => Number(x) >  Number(b)) : Number(a) >  Number(b))
  parser.set("ge",  (a: any, b: any) => isCollection(a) ? mapDeep(a, (x: any) => Number(x) >= Number(b)) : Number(a) >= Number(b))

  // ── Logical operators ─────────────────────────────────────────────────────
  parser.set("and", (a: any, b: any) => Boolean(a) && Boolean(b))
  parser.set("or",  (a: any, b: any) => Boolean(a) || Boolean(b))
  parser.set("not", (a: any) => isCollection(a) ? mapDeep(a, (x: any) => !x) : !a)
  parser.set("xor", (a: any, b: any) => Boolean(a) !== Boolean(b))
  parser.set("bitand", (a: any, b: any) => (Math.trunc(Number(a)) & Math.trunc(Number(b))))
  parser.set("bitor",  (a: any, b: any) => (Math.trunc(Number(a)) | Math.trunc(Number(b))))
  parser.set("bitxor", (a: any, b: any) => (Math.trunc(Number(a)) ^ Math.trunc(Number(b))))

  // ── Plotting ──────────────────────────────────────────────────────────────
  parser.set("plot",    (...args: any[]) => { registerPlot("plot",    ...args); return null })
  parser.set("scatter", (...args: any[]) => { registerPlot("scatter", ...args); return null })
  parser.set("bar",     (...args: any[]) => { registerPlot("bar",     ...args); return null })
  parser.set("stem",    (...args: any[]) => { registerPlot("stem",    ...args); return null })
  parser.set("area",    (...args: any[]) => { registerPlot("area",    ...args); return null })
  parser.set("surf",    (...args: any[]) => { registerPlot("surf",    ...args); return null })
  parser.set("surfc",   (...args: any[]) => { registerPlot("surf",    ...args); return null })
  parser.set("mesh",    (...args: any[]) => { registerPlot("mesh",    ...args); return null })
  parser.set("contour", (...args: any[]) => { registerPlot("contour", ...args); return null })
  parser.set("contourf",(...args: any[]) => { registerPlot("contourf",...args); return null })
  parser.set("scatter3",(...args: any[]) => { registerPlot("scatter3",...args); return null })
  parser.set("plot3",   (...args: any[]) => { registerPlot("plot3",   ...args); return null })
  parser.set("figure",  () => null)
  parser.set("clf",     () => { plotState.series = []; return null })
  parser.set("close",   () => null)
  parser.set("subplot", (r: any, c: any, n: any) => {
    if (!subplotState.active) {
      subplotState.active = true
      subplotState.rows   = Number(r)
      subplotState.cols   = Number(c)
      subplotState.slots  = Array(Number(r) * Number(c)).fill(null)
    }
    if (subplotState.current > 0)
      subplotState.slots[subplotState.current - 1] = { ...makePlotState(), ...plotState, series: [...plotState.series] }
    subplotState.current = Number(n)
    const slot = subplotState.slots[Number(n) - 1]
    if (slot) { plotState.series = [...slot.series]; plotState.title = slot.title }
    else { Object.assign(plotState, makePlotState()) }
    return null
  })
  parser.set("hold",    (v: any) => { plotState.hold = String(v).toLowerCase() !== "off"; return null })
  parser.set("grid",    (v: any) => { plotState.grid = String(v).toLowerCase() !== "off"; return null })
  parser.set("axis",    (v: any) => {
    const s = String(v).toLowerCase()
    if (s === "tight") plotState.axisMode = "tight"
    else if (s === "equal") plotState.axisMode = "equal"
    else if (s === "auto") plotState.axisMode = "auto"
    else if (Array.isArray(toPlain(v))) {
      const a = normalizeVector(v)
      if (a.length >= 2) plotState.xlim = [a[0], a[1]]
      if (a.length >= 4) plotState.ylim = [a[2], a[3]]
      if (a.length >= 6) plotState.zlim = [a[4], a[5]]
    }
    return null
  })
  parser.set("xlim",    (v: any) => { plotState.xlim = normalizeVector(v) as [number,number]; return null })
  parser.set("ylim",    (v: any) => { plotState.ylim = normalizeVector(v) as [number,number]; return null })
  parser.set("zlim",    (v: any) => { plotState.zlim = normalizeVector(v) as [number,number]; return null })
  parser.set("title",   (v: any) => { plotState.title = String(v); return null })
  parser.set("xlabel",  (v: any) => { plotState.xlabel = String(v); return null })
  parser.set("ylabel",  (v: any) => { plotState.ylabel = String(v); return null })
  parser.set("xline",   (v: any) => { const x = Number(v); plotState.series.push({ kind: "plot", x: [x, x], y: [-1e9, 1e9], label: undefined }); return x })
  parser.set("yline",   (v: any) => { const y = Number(v); plotState.series.push({ kind: "plot", x: [-1e9, 1e9], y: [y, y], label: undefined }); return y })
  parser.set("zlabel",  (v: any) => { plotState.zlabel = String(v); return null })
  parser.set("legend",  (...args: any[]) => {
    plotState.legend = args.map(String)
    plotState.series.forEach((s, i) => { if (args[i] != null) s.label = String(args[i]) })
    return null
  })
  parser.set("colormap",(v: any) => { plotState.colormap = String(v) as any; return null })
  parser.set("colorbar",() => { plotState.colorbar = true; return null })
  parser.set("view",    (v: any) => { plotState.view = String(v); return null })
  parser.set("set",     () => null)
  parser.set("get",     () => null)
  parser.set("gca",     () => null)
  parser.set("gcf",     () => null)
  parser.set("shading", () => null)
  parser.set("lighting",() => null)
  parser.set("camlight",() => null)

  // ── Linear algebra (extended) ─────────────────────────────────────────────
  parser.set("eig",   (A: any) => {
    const result = math.eigs(toNumericMatrix(A) as number[][])
    const vals = toPlain(result.values ?? [])
    const vecs = result.eigenvectors
      ? toPlain(math.transpose(result.eigenvectors.map((e: any) => e.vector)))
      : null
    return vecs
      ? { __multi: [vecs, makeDiagonal(vals as number[])], values: vals, vectors: vecs }
      : vals
  })
  parser.set("expm",  (A: any) => toPlain(math.expm(toNumericMatrix(A) as any)))
  parser.set("mldivide", (A: any, b: any) => {
    const Ap = toPlain(A), bp = toPlain(b)
    const sz = inferSize(Ap)
    if (sz[0] !== sz[1]) return toPlain(math.multiply(math.pinv(Ap as any), bp as any))
    try {
      const sol = toPlain(math.lusolve(Ap as any, bp as any))
      if (Array.isArray(sol) && Array.isArray(sol[0]) && (sol[0] as any[]).length === 1
          && (!Array.isArray(bp) || !Array.isArray((bp as any[])[0])))
        return (sol as any[]).map((r: any) => r[0])
      return sol
    } catch { return toPlain(math.multiply(math.pinv(Ap as any), bp as any)) }
  })
  parser.set("linsolve", (A: any, b: any) => parser.get("mldivide")(A, b))
  parser.set("lsqminnorm", (A: any, b: any) => toPlain(math.multiply(math.pinv(toPlain(A) as any), toPlain(b) as any)))
  parser.set("pascal", (n: any) => {
    const N = Number(n)
    const m: number[][] = Array.from({length:N}, () => Array(N).fill(0))
    for (let i=0;i<N;i++) m[i][0] = 1
    for (let j=0;j<N;j++) m[0][j] = 1
    for (let i=1;i<N;i++) for (let j=1;j<N;j++) m[i][j] = m[i-1][j] + m[i][j-1]
    return m
  })
  parser.set("hilb", (n: any) => {
    const N = Number(n)
    return Array.from({length:N}, (_,i) => Array.from({length:N}, (_,j) => 1/(i+j+1)))
  })
  parser.set("toeplitz", (c: any, r?: any) => {
    const cv = normalizeVector(c), rv = r ? normalizeVector(r) : [...cv]
    const rows = cv.length, cols = rv.length
    return Array.from({length:rows}, (_,i) => Array.from({length:cols}, (_,j) => {
      if (j >= i) return rv[j-i]
      return cv[i-j]
    }))
  })
  parser.set("transpose", (A: any) => toPlain(math.transpose(A)))
  parser.set("ctranspose",(A: any) => toPlain(math.ctranspose ? math.ctranspose(A) : math.transpose(A)))
  parser.set("fliplr",   (A: any) => {
    const p = toPlain(A)
    if (isMatrix(p)) return (p as number[][]).map(row => [...row].reverse())
    return [...normalizeVector(A)].reverse()
  })
  parser.set("flipud",   (A: any) => {
    const p = toPlain(A)
    if (isMatrix(p)) return [...(p as number[][])].reverse()
    return [...normalizeVector(A)].reverse()
  })
  parser.set("rot90",    (A: any, k?: any) => {
    let m = toNumericMatrix(A) ?? [normalizeVector(A)]
    const times = ((Number(k ?? 1) % 4) + 4) % 4
    for (let t = 0; t < times; t++) {
      const R = m.length, C = m[0].length
      m = Array.from({length:C}, (_,j) => Array.from({length:R}, (_,i) => m[R-1-i][j]))
    }
    return m
  })
  parser.set("circshift",(A: any, n: any) => {
    const v = normalizeVector(A), s = ((Number(n) % v.length) + v.length) % v.length
    return [...v.slice(v.length - s), ...v.slice(0, v.length - s)]
  })
  parser.set("cummax", (v: any) => { let m = -Infinity; return normalizeVector(v).map(x => { m = Math.max(m, x); return m }) })
  parser.set("cummin", (v: any) => { let m = Infinity;  return normalizeVector(v).map(x => { m = Math.min(m, x); return m }) })
  parser.set("movmean",(v: any, w: any) => {
    const arr = normalizeVector(v), ww = Number(w)
    return arr.map((_,i) => { const half = Math.floor(ww/2); const sl = arr.slice(Math.max(0,i-half), Math.min(arr.length,i+half+1)); return statMean(sl) })
  })
  parser.set("conv",    (a: any, b: any) => {
    const av = normalizeVector(a), bv = normalizeVector(b)
    const out = Array(av.length + bv.length - 1).fill(0)
    av.forEach((ai,i) => bv.forEach((bi,j) => { out[i+j] += ai*bi }))
    return out
  })
  parser.set("fft",     (v: any) => {
    const x = normalizeVector(v), N = x.length
    return Array.from({length:N}, (_,k) => {
      let re = 0, im = 0
      x.forEach((xi,n) => { const phi = -2*Math.PI*k*n/N; re += xi*Math.cos(phi); im += xi*Math.sin(phi) })
      return math.complex(re, im)
    })
  })
  parser.set("ifft", (v: any) => {
    const x = v as any[], N = x.length
    return Array.from({length:N}, (_,n) => {
      let re = 0, im = 0
      x.forEach((xk: any, k: number) => {
        const r = isComplexLike(xk) ? xk.re : Number(xk)
        const ii = isComplexLike(xk) ? xk.im : 0
        const phi = 2*Math.PI*k*n/N
        re += r*Math.cos(phi) - ii*Math.sin(phi)
        im += r*Math.sin(phi) + ii*Math.cos(phi)
      })
      return math.complex(re/N, im/N)
    })
  })
  parser.set("fftshift",(v: any) => { const x = normalizeVector(v); const h = Math.floor(x.length/2); return [...x.slice(h), ...x.slice(0,h)] })
  parser.set("abs2",    (v: any) => isComplexLike(v) ? Math.sqrt(v.re**2+v.im**2) : Math.abs(Number(v)))
  parser.set("factorial",(n: any) => { let f=1; for (let i=2;i<=Number(n);i++) f*=i; return f })
  parser.set("nchoosek",(n: any, k: any) => {
    const N=Number(n), K=Number(k); if (K<0||K>N) return 0
    let r=1; for (let i=0;i<K;i++) r=r*(N-i)/(i+1); return Math.round(r)
  })
  parser.set("gcd",     (a: any, b: any) => { let x=Math.abs(Math.round(Number(a))),y=Math.abs(Math.round(Number(b))); while(y){const t=y;y=x%y;x=t}; return x })
  parser.set("lcm",     (a: any, b: any) => { const g=parser.get("gcd")(a,b); return g===0?0:Math.abs(Math.round(Number(a))*Math.round(Number(b)))/g })
  parser.set("isprime", (n: any) => { const x=Math.abs(Math.round(Number(n))); if(x<2)return 0; for(let i=2;i<=Math.sqrt(x);i++)if(x%i===0)return 0; return 1 })
  parser.set("primes",  (n: any) => {
    const N=Number(n), sieve=Array(N+1).fill(true); sieve[0]=sieve[1]=false
    for(let i=2;i*i<=N;i++)if(sieve[i])for(let j=i*i;j<=N;j+=i)sieve[j]=false
    return Array.from({length:N+1},(_,i)=>i).filter(i=>sieve[i])
  })

  // ── Statistical distributions ─────────────────────────────────────────────
  parser.set("normpdf",  _ewDistrib((x, mu=0, sig=1) => Math.exp(-0.5*((x-mu)/sig)**2)/(sig*Math.sqrt(2*Math.PI))))
  parser.set("normcdf",  _ewDistrib((x, mu=0, sig=1) => 0.5*(1+_erf((x-mu)/(sig*Math.SQRT2)))))
  parser.set("norminv",  _ewDistrib((p, mu=0, sig=1) => mu + sig*_norminvScalar(p)))
  parser.set("tpdf",     _ewDistrib((x, df) => _tpdfScalar(x, df)))
  parser.set("tcdf",     _ewDistrib((x, df) => _tcdfScalar(x, df)))
  parser.set("tinv",     _ewDistrib((p, df) => _tinvScalar(p, df)))
  parser.set("chi2pdf",  _ewDistrib((x, df) => _chi2pdfScalar(x, df)))
  parser.set("chi2cdf",  _ewDistrib((x, df) => _chi2cdfScalar(x, df)))
  parser.set("chi2inv",  _ewDistrib((x, df) => _chi2invScalar(x, df)))
  parser.set("betapdf",  _ewDistrib((x, a, b) => { if(x<=0||x>=1)return 0; return Math.exp((a-1)*Math.log(x)+(b-1)*Math.log(1-x)-(_gammaln(a)+_gammaln(b)-_gammaln(a+b))) }))
  parser.set("betacdf",  _ewDistrib((x, a, b) => _betainc(x, a, b)))
  parser.set("betainv",  _ewDistrib((p, a, b) => { let x=0.5,lo=0,hi=1; for(let i=0;i<80;i++){const f=_betainc(x,a,b)-p;if(Math.abs(f)<1e-10)break;f<0?(lo=x):(hi=x);x=(lo+hi)/2}; return x }))
  parser.set("exppdf",   _ewDistrib((x, mu=1) => x<0?0:Math.exp(-x/mu)/mu))
  parser.set("expcdf",   _ewDistrib((x, mu=1) => x<0?0:1-Math.exp(-x/mu)))
  parser.set("expinv",   _ewDistrib((p, mu=1) => -mu*Math.log(1-p)))
  parser.set("unifpdf",  _ewDistrib((x, a=0, b=1) => x>=a&&x<=b?1/(b-a):0))
  parser.set("unifcdf",  _ewDistrib((x, a=0, b=1) => x<a?0:x>b?1:(x-a)/(b-a)))
  parser.set("unifinv",  _ewDistrib((p, a=0, b=1) => a+p*(b-a)))
  parser.set("poisspdf", _ewDistrib((x, lam) => { const k=Math.round(x); let logp=-lam+k*Math.log(lam); for(let i=2;i<=k;i++)logp-=Math.log(i); return Math.exp(logp) }))
  parser.set("poisscdf", _ewDistrib((x, lam) => { const k=Math.floor(x); let sum=0,p=Math.exp(-lam); for(let i=0;i<=k;i++){sum+=p;p*=lam/(i+1)} return sum }))
  parser.set("binopdf",  _ewDistrib((k, n, p) => { const K=Math.round(k),N=Math.round(n); let lnc=0; for(let i=0;i<K;i++)lnc+=Math.log(N-i)-Math.log(i+1); return Math.exp(lnc+K*Math.log(p)+(N-K)*Math.log(1-p)) }))
  parser.set("binocdf",  _ewDistrib((k, n, p) => { let s=0; for(let i=0;i<=Math.floor(k);i++)s+=parser.get("binopdf")(i,n,p); return s }))
  parser.set("gampdf",   _ewDistrib((x, a, b) => x<=0?0:Math.exp((a-1)*Math.log(x)-x/b-_gammaln(a)-a*Math.log(b))))
  parser.set("gamcdf",   _ewDistrib((x, a, b) => x<=0?0:_gammainc(a, x/b)))
  parser.set("gaminv",   _ewDistrib((p, a, b) => { const chi=_chi2invScalar(p, 2*a); return chi/2*b }))
  parser.set("gammaln",  (x: any) => _gammaln(Number(x)))
  parser.set("gammainc", (x: any, a: any) => _gammainc(Number(a), Number(x)))
  parser.set("erf",      (x: any) => _ewDistrib(_erf)(x))
  parser.set("erfinv",   (y: any) => {
    let x = 0
    for (let i = 0; i < 80; i++) { const fx = _erf(x) - Number(y); if (Math.abs(fx) < 1e-12) break; x -= fx / (2/Math.sqrt(Math.PI) * Math.exp(-x*x)) }
    return x
  })
  parser.set("erfc",     (x: any) => 1 - (_ewDistrib(_erf)(x) as number))
  parser.set("beta",     (a: any, b: any) => Math.exp(_gammaln(Number(a)) + _gammaln(Number(b)) - _gammaln(Number(a)+Number(b))))
  parser.set("betainc",  (x: any, a: any, b: any) => _betainc(Number(x), Number(a), Number(b)))

  // ── Sampling / random ─────────────────────────────────────────────────────
  parser.set("randperm", (n: any) => {
    const arr = Array.from({length:Number(n)}, (_,i)=>i+1)
    for (let i=arr.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]] }
    return arr
  })
  parser.set("randsample",(n: any, k: any) => {
    const perm = parser.get("randperm")(n)
    return perm.slice(0, Number(k))
  })
  parser.set("datasample",(data: any, k: any) => {
    const v = normalizeVector(data), perm = parser.get("randperm")(v.length)
    return perm.slice(0, Number(k)).map((i: number) => v[i-1])
  })

  // ── Regression / model fitting ────────────────────────────────────────────
  parser.set("regress", (y: any, X: any) => {
    const yv = normalizeVector(y), n = yv.length, Xm = toNumericMatrix(X)!, p = Xm[0].length
    const Xt = toPlain(math.transpose(Xm)) as number[][]
    const XtX = toPlain(math.multiply(Xt, Xm)) as number[][]
    const XtXinv = toPlain(math.inv(XtX)) as number[][]
    const b = normalizeVector(toPlain(math.multiply(math.multiply(XtXinv, Xt), yv)))
    const yhat = Xm.map(row => row.reduce((s,xi,i) => s + xi*b[i], 0))
    const r = yv.map((yi,i) => yi - yhat[i])
    const df = n - p, sse = r.reduce((s,ri) => s + ri*ri, 0), s2 = sse/df
    const ymean = statMean(yv), sst = yv.reduce((s,yi) => s + (yi-ymean)**2, 0)
    const R2 = 1 - sse/sst, F = ((sst-sse)/(p-1))/s2
    const fp = 1 - _betainc(F*(p-1)/(F*(p-1)+df), (p-1)/2, df/2)
    const XtXinvDiag = normalizeVector(toPlain(math.diag(XtXinv)))
    const se_b = XtXinvDiag.map(v => Math.sqrt(Math.abs(s2*v)))
    const tcrit = _tinvScalar(0.975, df)
    const bint = b.map((bi,i) => [bi - tcrit*se_b[i], bi + tcrit*se_b[i]])
    const rint = r.map(ri => [ri - 2*Math.sqrt(s2), ri + 2*Math.sqrt(s2)])
    const stats = [R2, F, fp, s2]
    return { __multi: [b, bint, r, rint, stats], b, bint, r, rint, stats }
  })
  parser.set("fitlm", (x: any, y: any) => {
    const yv = normalizeVector(y), n = yv.length
    const xp = toPlain(x)
    const X: number[][] = isMatrix(xp) ? (toNumericMatrix(x)!.map(row => [1,...row])) : normalizeVector(x).map(xi => [1, xi])
    const p = X[0].length
    const Xt = Array.from({length:p}, (_,i) => X.map(row => row[i]))
    const XtX = Array.from({length:p}, (_,i) => Array.from({length:p}, (_,j) => X.reduce((s,row) => s + row[i]*row[j], 0)))
    const XtXinv = toPlain(math.inv(XtX)) as number[][]
    const Xty = Array.from({length:p}, (_,i) => X.reduce((s,row,k) => s + row[i]*yv[k], 0))
    const b = XtXinv.map(row => row.reduce((s,v,k) => s + v*Xty[k], 0))
    const yhat = X.map(row => row.reduce((s,xi,i) => s + xi*b[i], 0))
    const residuals = yv.map((yi,i) => yi - yhat[i])
    const df = n - p, sse = residuals.reduce((s,ri) => s + ri*ri, 0), s2 = sse/df
    const ymean = statMean(yv), sst = yv.reduce((s,yi) => s + (yi-ymean)**2, 0)
    const R2 = 1 - sse/sst, R2adj = 1 - (1-R2)*(n-1)/df
    const F = (sst-sse)/(p-1)/s2
    const se = XtXinv.map((row,i) => Math.sqrt(Math.abs(s2*row[i])))
    const tStats = b.map((bi,i) => bi/se[i])
    const pValues = tStats.map(t => 2*(1 - _tcdfScalar(Math.abs(t), df)))
    const names = ['(Intercept)', ...Array.from({length:p-1},(_,i) => `x${i+1}`)]
    const hdr = `  ${'Name'.padEnd(16)} ${'Estimate'.padStart(12)}  ${'SE'.padStart(12)}  ${'tStat'.padStart(8)}  ${'pValue'.padStart(8)}`
    const rows2 = b.map((bi,i) => `  ${names[i].padEnd(16)} ${bi.toFixed(6).padStart(12)}  ${se[i].toFixed(6).padStart(12)}  ${tStats[i].toFixed(4).padStart(8)}  ${pValues[i].toFixed(4).padStart(8)}`)
    const Fpval = 1 - _betainc(F*(p-1)/(F*(p-1)+Math.max(1,df)), (p-1)/2, df/2)
    const summary = [`Linear regression model`, ``, `Coefficients:`, hdr, `  ${'-'.repeat(64)}`, ...rows2, ``, `R-squared: ${R2.toFixed(6)},  Adjusted R-squared: ${R2adj.toFixed(6)}`, `F-statistic: ${F.toFixed(4)},  p-value: ${Fpval.toFixed(4)}`].join('\n')
    logs.push(summary)
    return {
      Coefficients: { Estimate: b, SE: se, tStat: tStats, pValue: pValues },
      Fitted: yhat, Residuals: residuals, R2, R2adj, MSE: s2, df,
      Rsquared: { Ordinary: R2, Adjusted: R2adj }, DFE: df, NumCoefficients: p,
      ModelFitVsNullModel: { Fstat: F, Pvalue: Fpval },
    }
  })
  parser.set("pkg",     () => null)
  parser.set("corr",    (x: any, y: any) => {
    const xv = normalizeVector(x), yv2 = normalizeVector(y)
    const mx = statMean(xv), my = statMean(yv2)
    const num = xv.reduce((s,xi,i) => s + (xi-mx)*(yv2[i]-my), 0)
    const den = Math.sqrt(xv.reduce((s,xi) => s + (xi-mx)**2, 0) * yv2.reduce((s,yi) => s + (yi-my)**2, 0))
    return den === 0 ? 0 : num/den
  })
  parser.set("table",   (...cols: any[]) => { const out: any = {}; cols.forEach((col,i) => { out[`Var${i+1}`] = normalizeVector(col) }); return out })
  parser.set("plotResiduals", (lm: any, type: any) => {
    const fitted = normalizeVector(lm.Fitted), res = normalizeVector(lm.Residuals)
    if (String(type) === 'fitted') { registerPlot("scatter", fitted, res) }
    else {
      const n_r = res.length, sorted = [...res].sort((a,b)=>a-b)
      const zvals = sorted.map((_,i) => _norminvScalar((i+0.5)/n_r))
      registerPlot("scatter", zvals, sorted)
    }
    return null
  })

  // ── Numerical methods ─────────────────────────────────────────────────────
  parser.set("ode45", (f: any, tspan: any, y0: any) => {
    const tv=normalizeVector(tspan), t0=tv[0], tf=tv[tv.length-1]
    const yInit=normalizeVector(y0)
    const steps=Math.min(5000,Math.max(50,Math.ceil(Math.abs(tf-t0)/0.01)))
    const h=(tf-t0)/steps
    const T=[t0], Y=[yInit.slice()]
    let t=t0, y=yInit.slice()
    for(let s=0;s<steps;s++){
      const k1=normalizeVector(toPlain(f(t,y)))
      const y2=y.map((yi,i)=>yi+0.5*h*k1[i])
      const k2=normalizeVector(toPlain(f(t+0.5*h,y2)))
      const y3=y.map((yi,i)=>yi+0.5*h*k2[i])
      const k3=normalizeVector(toPlain(f(t+0.5*h,y3)))
      const y4=y.map((yi,i)=>yi+h*k3[i])
      const k4=normalizeVector(toPlain(f(t+h,y4)))
      y=y.map((yi,i)=>yi+(h/6)*(k1[i]+2*k2[i]+2*k3[i]+k4[i]))
      t+=h; T.push(t); Y.push(y.slice())
    }
    return { __multi: [T, Y] }
  })
  parser.set("ode23", (f: any, tspan: any, y0: any) => parser.get("ode45")(f, tspan, y0))
  parser.set("fzero", (f: any, x0: any) => {
    const xv=normalizeVector(x0)
    if (xv.length>=2) {
      let [a,b]=xv, fa=realValue(toPlain(f(a))), fb=realValue(toPlain(f(b)))
      for(let i=0;i<100;i++){const c=(a+b)/2,fc=realValue(toPlain(f(c)));if(Math.abs(fc)<1e-12||(b-a)/2<1e-12)return c;if(fa*fc<0){b=c;fb=fc}else{a=c;fa=fc}}
      return (a+b)/2
    }
    let x=xv[0], dx=Math.abs(x)*0.01+0.01
    for(let i=0;i<80;i++){const fx=realValue(toPlain(f(x))),fx2=realValue(toPlain(f(x+dx)));if(fx2===fx)break;const xn=x-fx*dx/(fx2-fx);dx=xn-x;x=xn;if(Math.abs(realValue(toPlain(f(x))))<1e-12)break}
    return x
  })
  parser.set("integral", (f: any, a: any, b: any) => {
    const simp = (f: any, lo: number, hi: number, tol: number, depth: number): number => {
      const c=(lo+hi)/2
      const fa=realValue(toPlain(f(lo))),fb2=realValue(toPlain(f(hi))),fc=realValue(toPlain(f(c)))
      const s1=(hi-lo)*(fa+4*fc+fb2)/6
      const d=(lo+c)/2,e=(c+hi)/2
      const fd=realValue(toPlain(f(d))),fe=realValue(toPlain(f(e)))
      const s2=(c-lo)*(fa+4*fd+fc)/6+(hi-c)*(fc+4*fe+fb2)/6
      if(depth>=12||Math.abs(s2-s1)<15*tol) return s2+(s2-s1)/15
      return simp(f,lo,c,tol/2,depth+1)+simp(f,c,hi,tol/2,depth+1)
    }
    return simp(f, Number(a), Number(b), 1e-6, 0)
  })
  parser.set("fminbnd", (f: any, a: any, b: any) => {
    const phi=(Math.sqrt(5)-1)/2; let lo=Number(a),hi=Number(b)
    let c=hi-phi*(hi-lo),d=lo+phi*(hi-lo)
    for(let i=0;i<100;i++){if(realValue(toPlain(f(c)))<realValue(toPlain(f(d))))hi=d;else lo=c;if(hi-lo<1e-10)break;c=hi-phi*(hi-lo);d=lo+phi*(hi-lo)}
    return (lo+hi)/2
  })
  parser.set("fminsearch", (f: any, x0: any) => {
    const xv=normalizeVector(x0)
    if(xv.length===1){const a=xv[0]-10,b=xv[0]+10;return[parser.get("fminbnd")(f,a,b)]}
    return xv
  })

  // ── Struct helpers ────────────────────────────────────────────────────────
  parser.set("struct",     (...args: any[]) => {
    if (args.length === 0) return {}
    const out: any = {}
    for (let i = 0; i < args.length - 1; i += 2) out[String(args[i])] = args[i+1] ?? null
    return out
  })
  parser.set("fieldnames", (s: any) => { if (s==null||typeof s!=="object"||Array.isArray(s)) return []; return Object.keys(s) })
  parser.set("isfield",    (s: any, name: any) => { if (s==null||typeof s!=="object"||Array.isArray(s)) return 0; return Object.prototype.hasOwnProperty.call(s, String(name)) ? 1 : 0 })
  parser.set("rmfield",    (s: any, name: any) => {
    if (s==null||typeof s!=="object"||Array.isArray(s)) return s
    const out={...s}; const names=Array.isArray(name)?name.map(String):[String(name)]
    names.forEach(n => delete out[n]); return out
  })
  parser.set("orderfields",(s: any) => { if (s==null||typeof s!=="object"||Array.isArray(s)) return s; return Object.fromEntries(Object.entries(s).sort(([a],[b]) => a.localeCompare(b))) })
  parser.set("getfield",   (s: any, name: any) => { if (s==null||typeof s!=="object"||Array.isArray(s)) return null; return s[String(name)]??null })
  parser.set("setfield",   (s: any, name: any, val: any) => { if (s==null||typeof s!=="object"||Array.isArray(s)) return s; return {...s,[String(name)]:val} })
  parser.set("mldivide",   (A: any, b: any) => {
    const Ap=toPlain(A),bp=toPlain(b); const sz=inferSize(Ap)
    if(sz[0]!==sz[1]) return toPlain(math.multiply(math.pinv(Ap as any),bp as any))
    try {
      const sol=toPlain(math.lusolve(Ap as any,bp as any))
      if(Array.isArray(sol)&&Array.isArray(sol[0])&&(sol[0] as any[]).length===1&&(!Array.isArray(bp)||!Array.isArray((bp as any[])[0]))) return (sol as any[]).map((r:any)=>r[0])
      return sol
    } catch { return toPlain(math.multiply(math.pinv(Ap as any),bp as any)) }
  })

  // ── Interactive controls ──────────────────────────────────────────────────
  const controlSet = new Set<string>()

  const registerControl = (
    type: string, name: any, min: any, max: any,
    step: any = 1, defaultValue: any = null, meta: Record<string, any> = {},
  ): number => {
    const key = String(name)
    const lower = Number(min), upper = Number(max)
    const safeMin = Number.isFinite(lower) ? lower : 0
    const safeMax = Number.isFinite(upper) ? upper : safeMin + 1
    const safeStep = Math.abs(Number(step)) || 1
    const fallback = defaultValue == null ? safeMin : Number(defaultValue)
    const rawValue = Object.prototype.hasOwnProperty.call(controlValues, key)
      ? Number(controlValues[key]) : fallback
    const value = clampValue(
      Number.isFinite(rawValue) ? rawValue : fallback,
      Math.min(safeMin, safeMax), Math.max(safeMin, safeMax),
    )
    parser.set(key, value); variables.add(key)
    if (!controlSet.has(key)) {
      controls.push({
        name: key, type,
        min: Math.min(safeMin, safeMax), max: Math.max(safeMin, safeMax),
        step: safeStep, value, defaultValue: fallback, ...meta,
      })
      controlSet.add(key)
    }
    return value
  }

  parser.set("slider",  (name: any, min: any, max: any, step: any = 1, defaultValue: any = null) =>
    registerControl("slider", name, min, max, step, defaultValue))
  parser.set("animate", (name: any, min: any, max: any, step: any = 1, defaultValue: any = null, speed: any = 1, loop: any = 1) =>
    registerControl("animate", name, min, max, step, defaultValue,
      { speed: Math.abs(Number(speed)) || 1, loop: Boolean(Number(loop)) }))

  parser.set("openmat_slider", (name: any, min: any, max: any, step?: any, defaultVal?: any) =>
    registerControl("slider", name, min, max, step ?? 1, defaultVal))
  parser.set("openmat_dropdown", (name: any, opts: any, defaultIdx?: any) => {
    const n = String(name), def = defaultIdx != null ? Number(defaultIdx) : 0
    const optArr = Array.isArray(toPlain(opts)) ? normalizeVector(opts).map(String) : [String(opts)]
    if (!controlSet.has(n)) {
      controls.push({ name: n, type: "dropdown", options: optArr, value: controlValues[n] ?? def, defaultValue: def })
      controlSet.add(n)
    }
    const idx = controlValues[n] ?? def
    parser.set(n, idx); variables.add(n)
    return idx
  })

  // ── Magic square ──────────────────────────────────────────────────────────
  parser.set("magic", (n: any) => {
    n = Math.round(Number(n))
    if (n<1||n===1) return [[1]]
    if (n===2) return [[1,3],[4,2]]
    if (n%2===1) {
      const m=Array.from({length:n},()=>new Array(n).fill(0))
      let r=0,c=Math.floor(n/2)
      for(let num=1;num<=n*n;num++){m[r][c]=num;const nr=(r-1+n)%n,nc=(c+1)%n;if(m[nr][nc]!==0){r=(r+1)%n}else{r=nr;c=nc}}
      return m
    }
    if (n%4===0) {
      const m=Array.from({length:n},(_,i)=>Array.from({length:n},(__,j)=>i*n+j+1))
      for(let i=0;i<n;i++) for(let j=0;j<n;j++) if(((Math.floor(i/(n/4))+Math.floor(j/(n/4)))%2)===0) m[i][j]=n*n+1-m[i][j]
      return m
    }
    return Array.from({length:n},(_,i)=>Array.from({length:n},(__,j)=>i*n+j+1))
  })

  // ── Missing array / math utilities ───────────────────────────────────────
  parser.set("flip", (v: any, dim?: any) => {
    const p = toPlain(v)
    if (isMatrix(p)) { const d = dim != null ? Number(dim) : 1; return d === 2 ? (p as number[][]).map((r: number[]) => [...r].reverse()) : [...(p as number[][])].reverse() }
    return [...normalizeVector(v)].reverse()
  })
  parser.set("cat", (dim: any, ...args: any[]) => {
    if (Number(dim) === 1) return args.flatMap((a: any) => { const p = toPlain(a); return isMatrix(p) ? p : [normalizeVector(p)] })
    const ps = args.map(toPlain)
    if (ps.every((p: any) => !isMatrix(p))) return ps.flatMap((p: any) => normalizeVector(p))
    const mats = ps.map((p: any) => isMatrix(p) ? p : [normalizeVector(p)]) as number[][][]
    return mats[0].map((_: any, i: number) => mats.flatMap((m: number[][]) => m[i] || []))
  })
  parser.set("arrayfun", (f: any, v: any, ...rest: any[]) =>
    normalizeVector(v).map((x: number, i: number) => { const extra = rest.map((r: any) => normalizeVector(r)[i]); return realValue(toPlain(f(x, ...extra))) }))
  parser.set("cellfun",  (f: any, v: any, ...rest: any[]) =>
    normalizeVector(v).map((x: number, i: number) => { const extra = rest.map((r: any) => normalizeVector(r)[i]); return realValue(toPlain(f(x, ...extra))) }))
  parser.set("cell",     (m: any, n?: any) => { const r = Number(m || 1), c = n != null ? Number(n) : r; return Array.from({ length: r }, () => Array(c).fill(null)) })
  parser.set("bitshift", (a: any, n: any) => { const nn = Number(n); return nn >= 0 ? (Number(a)|0) << nn : (Number(a)|0) >> (-nn) })
  parser.set("isnan",    (v: any) => isCollection(v) ? mapDeep(v, (x: any) => isNaN(Number(x)) ? 1 : 0) : (isNaN(Number(v)) ? 1 : 0))
  parser.set("isinf",    (v: any) => isCollection(v) ? mapDeep(v, (x: any) => (!isFinite(Number(x)) && !isNaN(Number(x))) ? 1 : 0) : ((!isFinite(Number(v)) && !isNaN(Number(v))) ? 1 : 0))
  parser.set("isfinite", (v: any) => isCollection(v) ? mapDeep(v, (x: any) => isFinite(Number(x)) ? 1 : 0) : (isFinite(Number(v)) ? 1 : 0))
  const _deepEq = (a: any, b: any, nanEqual: boolean): boolean => {
    const pa = toPlain(a), pb = toPlain(b)
    if (Array.isArray(pa) && Array.isArray(pb)) {
      if (pa.length !== pb.length) return false
      return (pa as any[]).every((row: any, i: number) => _deepEq(row, (pb as any[])[i], nanEqual))
    }
    const na = Number(pa), nb = Number(pb)
    if (nanEqual && isNaN(na) && isNaN(nb)) return true
    return na === nb
  }
  parser.set("isequal",    (a: any, b: any) => _deepEq(a, b, false) ? 1 : 0)
  parser.set("isequaln",   (a: any, b: any) => _deepEq(a, b, true)  ? 1 : 0)
  parser.set("isequaltol", (a: any, b: any, tol: any = 1e-9) => {
    const flat = (v: any): number[] => Array.isArray(v) ? (v as any[]).flatMap(flat) : [Number(v)]
    const fa = flat(toPlain(a)), fb = flat(toPlain(b))
    return fa.length === fb.length && fa.every((x: number, i: number) => Math.abs(x - fb[i]) <= Number(tol)) ? 1 : 0
  })
  parser.set("strfind",    (s: any, p: any) => {
    const str = String(s), pat = String(p)
    const idxs: number[] = []; let i = 0
    while ((i = str.indexOf(pat, i)) !== -1) { idxs.push(i + 1); i++ }
    return idxs
  })
  parser.set("rad2deg", (v: any) => isCollection(toPlain(v)) ? mapDeep(toPlain(v), (x: any) => Number(x) * (180 / Math.PI)) : Number(v) * (180 / Math.PI))
  parser.set("deg2rad", (v: any) => isCollection(toPlain(v)) ? mapDeep(toPlain(v), (x: any) => Number(x) * (Math.PI / 180)) : Number(v) * (Math.PI / 180))
  parser.set("hypot",   (...args: any[]) => Math.hypot(...args.map(Number)))
  parser.set("log1p",   (v: any) => isCollection(v) ? mapDeep(v, (x: any) => Math.log1p(Number(x))) : Math.log1p(Number(v)))
  parser.set("expm1",   (v: any) => isCollection(v) ? mapDeep(v, (x: any) => Math.expm1(Number(x))) : Math.expm1(Number(v)))

  // ── Utility / console ─────────────────────────────────────────────────────
  parser.set("who",    () => Array.from(variables))
  parser.set("whos",   () => buildWorkspaceSnapshot(parser, variables))
  parser.set("help",   () => { logs.push(HELP_TEXT); return HELP_TEXT })
  parser.set("clc",    () => { logs.length = 0; return null })
  parser.set("input",  (prompt: any) => { logs.push(`input('${prompt}'): interactive input not supported — returning 0.`); return 0 })
  parser.set("pause",  () => null)
  parser.set("format", () => null)
  parser.set("drawnow",() => null)
  parser.set("print",  () => null)
  parser.set("saveas", () => null)
  parser.set("rng",    () => null)
  const _ticStart = { t: 0 }
  parser.set("tic",    () => { _ticStart.t = Date.now(); return null })
  parser.set("toc",    () => (Date.now() - _ticStart.t) / 1000)
  parser.set("clock",  () => { const d = new Date(); return [d.getFullYear(), d.getMonth()+1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()] })

  // ── Missing plot aliases ──────────────────────────────────────────────────
  parser.set("semilogy",  (...args: any[]) => { plotState.series=[]; registerPlot("plot", args[0], args[1]); return null })
  parser.set("semilogx",  (...args: any[]) => { plotState.series=[]; registerPlot("plot", args[0], args[1]); return null })
  parser.set("loglog",    (...args: any[]) => { plotState.series=[]; registerPlot("plot", args[0], args[1]); return null })
  parser.set("errorbar",  (...args: any[]) => registerPlot("plot", args[0], args[1]))
  parser.set("fill",      (...args: any[]) => registerPlot("area", args[0], args[1]))
  parser.set("imagesc",   (Z: any) => { plot3DRequest = convertSurfaceTo3DConfig("surf", [Z], plotState); return null })
  parser.set("quiver",    () => { logs.push("quiver: vector field not yet rendered."); return null })
  parser.set("polarplot", (...args: any[]) => registerPlot("plot", args[0], args[1]))
  parser.set("pie",       (v: any) => registerPlot("bar", [], v))
  parser.set("sgtitle",   (t: any) => { plotState.title = String(t); return t })
  parser.set("text",      () => null)

  // ── QR and Schur decompositions ───────────────────────────────────────────
  parser.set("qr", (A: any, economy?: any) => {
    const { Q, R } = math.qr(A as any)
    let Qp = toPlain(Q) as number[][], Rp = toPlain(R) as number[][]
    if (economy === 0 || economy === "0") {
      const m = Qp.length, n = Array.isArray(Qp[0]) ? Qp[0].length : 1, k = Math.min(m, n)
      Qp = Qp.map((row: number[]) => row.slice(0, k))
      Rp = Rp.slice(0, k)
    }
    return { __multi: [Qp, Rp], Q: Qp, R: Rp }
  })
  parser.set("schur", (A: any) => {
    const m = toNumericMatrix(A)
    if (!m?.length) throw new Error("schur requires a square matrix")
    const n = m.length
    const eigRes = (math as any).eigs(m)
    const vals = toPlain(eigRes.values) as any[]
    const vecs = eigRes.eigenvectors || []
    const cols = vecs.map((ev: any) => {
      const v = normalizeVector(ev.vector ?? [])
      const nrm = Math.hypot(...v.map((x: any) => Math.abs(realValue(x)))) || 1
      return v.map((x: any) => realValue(x) / nrm)
    })
    const Q = Array.from({ length: n }, (_: any, i: number) => cols.map((c: number[]) => c[i] ?? 0)) as number[][]
    const T = Array.from({ length: n }, (_: any, i: number) => Array.from({ length: n }, (_2: any, j: number) => i === j ? realValue(vals[i] ?? 0) : 0)) as number[][]
    return { __multi: [Q, T], Q, T }
  })

  // ── F-distribution ────────────────────────────────────────────────────────
  parser.set("fcdf", (x: any, df1: any, df2: any) =>
    _ewDistrib((xv: number, d1: number, d2: number) => xv <= 0 ? 0 : _betainc(d1*xv/(d1*xv+d2), d1/2, d2/2))(x, df1, df2))
  parser.set("fpdf", (x: any, df1: any, df2: any) =>
    _ewDistrib((xv: number, d1: number, d2: number) => xv <= 0 ? 0 : Math.exp(_gammaln((d1+d2)/2)-_gammaln(d1/2)-_gammaln(d2/2)+(d1/2-1)*Math.log(xv)+(d1/2)*Math.log(d1/d2)-((d1+d2)/2)*Math.log(1+d1*xv/d2)))(x, df1, df2))
  parser.set("finv", (p: any, df1: any, df2: any) =>
    _ewDistrib((pv: number, d1: number, d2: number) => {
      if (pv <= 0) return 0; if (pv >= 1) return Infinity
      const fcdf2 = (xv: number) => xv <= 0 ? 0 : _betainc(d1*xv/(d1*xv+d2), d1/2, d2/2)
      const fpdf2 = (xv: number) => xv <= 0 ? 0 : Math.exp(_gammaln((d1+d2)/2)-_gammaln(d1/2)-_gammaln(d2/2)+(d1/2-1)*Math.log(xv)+(d1/2)*Math.log(d1/d2)-((d1+d2)/2)*Math.log(1+d1*xv/d2))
      let xv = Math.max(1e-6, d1 / Math.max(1, d2))
      for (let ii = 0; ii < 80; ii++) { const fx2 = fcdf2(xv) - pv; if (Math.abs(fx2) < 1e-12) break; const fd2 = fpdf2(xv); if (fd2 < 1e-300) break; xv = Math.max(1e-10, xv - fx2/fd2) }
      return xv
    })(p, df1, df2))

  // ── Extension functions ───────────────────────────────────────────────────
  extensions.forEach(extension => {
    Object.entries((extension as any)?.functions ?? {}).forEach(([name, fn]) => {
      if (typeof fn !== "function") return
      parser.set(name, (...args: any[]) =>
        toPlain((fn as any)(...args, { math, parser, variables, logs, plotState, setPlot3DRequest: (config: any) => { plot3DRequest = config } })),
      )
      functionNames.add(name)
    })
  })

  return {
    parser, logs, plotState, subplotState, variables, functionNames,
    getPlot3DRequest() { return plot3DRequest },
    getControls() { return controls },
    clearVariables(names: string[]) {
      if (names.length === 0) { Array.from(variables).forEach(name => parser.remove(name)); variables.clear(); return }
      names.forEach(name => { parser.remove(name); variables.delete(name) })
    },
  }
}

// ── Script execution ──────────────────────────────────────────────────────────

export function executeScript(source: string, options: EngineOptions = {}): ExecutionResult {
  const extensions = options.extensions ?? []
  const compatibilityWarnings = detectMatlabCompatibilityWarnings(source)
  const engine = createExecutionEngine({
    extensions,
    controlValues: options.controlValues ?? {},
    initialWorkspace: options.initialWorkspace ?? [],
  })
  const { parser, logs, plotState, subplotState, variables, functionNames } = engine
  const symVars = new Set<string>()
  const userFunctions: Record<string, any> = {}

  // ── Truthiness (MATLAB semantics) ─────────────────────────────────────────
  function isTruthy(val: any): boolean {
    if (val == null) return false
    if (typeof val === "number") return val !== 0
    if (typeof val === "boolean") return val
    if (Array.isArray(val)) return (val as any[]).flat(Infinity).some((x: any) => x !== 0 && x != null)
    return Boolean(val)
  }

  // ── Error formatting ──────────────────────────────────────────────────────
  function formatExecutionError(error: any, meta: { lineNo?: number | null; rawLine?: string; normalizedLine?: string } = {}): Error {
    const pieces: string[] = []
    if (meta.lineNo != null) pieces.push(`Line ${meta.lineNo}`)
    if (meta.rawLine) pieces.push(`Source: ${meta.rawLine}`)
    if (meta.normalizedLine && meta.normalizedLine !== meta.rawLine) pieces.push(`Normalized: ${meta.normalizedLine}`)
    pieces.push(error?.message || String(error))
    return new Error(pieces.join("\n"))
  }

  // ── Line executor ─────────────────────────────────────────────────────────
  function executeLine(rawLine: string, lineNo: number | null = null): any {
    const trimmedRaw = stripMatlabComment(rawLine).trim()
    if (!trimmedRaw) return null
    const hasSemicolon = /;\s*$/.test(trimmedRaw)
    const withoutSemicolon = trimmedRaw.replace(/;\s*$/, "")

    if (/^clear(\s+.+)?$/i.test(withoutSemicolon)) {
      const args = withoutSemicolon.replace(/^clear/i, "").trim().split(/\s+/).filter(Boolean)
      engine.clearVariables(args)
      return null
    }

    const symsMatch = withoutSemicolon.match(/^syms\s+([\w\s]+)$/i)
    if (symsMatch) {
      const names = symsMatch[1].trim().split(/\s+/).filter((n: string) => /^[A-Za-z_]\w*$/.test(n))
      names.forEach((name: string) => {
        symVars.add(name)
        variables.add(name)
        parser.set(name, { __sym: name, toString: () => name })
      })
      return hasSemicolon ? null : names.join("  ")
    }

    const symFnMatch = withoutSemicolon.match(/^([A-Za-z_]\w*\s*=\s*)?sym\(\s*(.+?)\s*\)$/i)
    if (symFnMatch) {
      const [, assignLhs, rawArg] = symFnMatch
      const lhsName = assignLhs ? assignLhs.replace(/\s*=\s*$/, "").trim() : null
      const wrap = (v: any) => { const s = String(v); return { __sym: s, toString: () => s } }
      const quotedNameMatch = rawArg.match(/^['"]([A-Za-z_]\w*)['"]$/)
      let result: any
      if (quotedNameMatch) {
        const name = quotedNameMatch[1]
        symVars.add(name); variables.add(name)
        result = { __sym: name, toString: () => name }
      } else {
        const argVal = toPlain(parser.evaluate(preprocessLine(rawArg, variables, functionNames)))
        result = Array.isArray(argVal)
          ? argVal.map((row: any) => (Array.isArray(row) ? row.map(wrap) : wrap(row)))
          : wrap(argVal)
      }
      if (lhsName) { parser.set(lhsName, result); variables.add(lhsName) }
      if (!hasSemicolon) logs.push(`${lhsName ?? "ans"} =\n${formatValue(result)}`)
      return hasSemicolon ? null : result
    }

    const symResult = (node: any) => {
      try { node = math.simplify(node) } catch {}
      if (node.type === "ArrayNode") {
        const items = node.items ?? []
        if (items.length > 0 && items[0].type !== "ArrayNode") {
          return items.map((item: any) => {
            try { item = math.simplify(item) } catch {}
            const s = item.toString()
            return { __sym: s, toString: () => s }
          })
        }
      }
      const s = node.toString()
      return { __sym: s, __shape: [1, 1], toString: () => s }
    }

    const resolveSymExpr = (str: string) => {
      const s = str.trim()
      try { const v = parser.get(s); if (v && typeof v === "object" && "__sym" in v) return String((v as any).__sym) } catch {}
      return s
    }

    const evalSymFn = (exprStr: string): string => {
      const direct = resolveSymExpr(exprStr)
      if (direct !== exprStr) return direct
      const expandM = exprStr.match(/^expand\((.+)\)$/i)
      if (expandM) {
        const inner = evalSymFn(expandM[1].trim())
        try { let n = (math as any).parse(inner); try { n = (math as any).simplify(n) } catch {}; return n.toString() }
        catch { return inner }
      }
      return exprStr
    }

    const extractPolyCoeffs = (exprStr: string, varName = "x") => {
      const MAX = 8
      const byDeg = new Array(MAX + 1).fill(0)
      let node = (math as any).parse(exprStr)
      for (let n = 0; n <= MAX; n++) {
        try {
          const val = Number(node.compile().evaluate({ [varName]: 0 }))
          let fact = 1; for (let i = 1; i <= n; i++) fact *= i
          byDeg[n] = Math.round((val / fact) * 1e10) / 1e10
        } catch { break }
        if (n < MAX) { try { node = (math as any).derivative(node, varName) } catch { break } }
      }
      let hi = MAX
      while (hi > 0 && Math.abs(byDeg[hi]) < 1e-9) hi--
      const result: number[] = []
      for (let i = hi; i >= 0; i--) result.push(byDeg[i])
      return result.length ? result : [0]
    }

    const exprHasSymVars = (expr: string) => {
      for (const name of symVars) if (new RegExp(`\\b${name}\\b`).test(expr)) return true
      return false
    }

    const diffMatch = withoutSemicolon.match(/^([A-Za-z_]\w*\s*=\s*)?diff\(\s*([^,]+?)\s*,\s*([A-Za-z_]\w*)\s*(?:,\s*(\d+))?\s*\)$/i)
    if (diffMatch && symVars.size > 0) {
      const [, assignLhs, rawExpr, varName] = diffMatch
      const order = parseInt(diffMatch[4] ?? "1", 10)
      try {
        let node = (math as any).parse(evalSymFn(rawExpr))
        for (let i = 0; i < order; i++) node = (math as any).derivative(node, varName)
        const result = symResult(node)
        if (assignLhs) { const lhs = assignLhs.replace(/\s*=\s*$/, "").trim(); parser.set(lhs, result); variables.add(lhs) }
        const display = Array.isArray(result) ? result.map((r: any) => r.__sym).join("  ") : result.__sym
        if (!hasSemicolon) logs.push(`${assignLhs ? assignLhs.replace(/\s*=\s*$/, "").trim() : "ans"} =\n${display}`)
        return hasSemicolon ? null : result
      } catch { /* fall through */ }
    }

    const simplifyMatch = withoutSemicolon.match(/^([A-Za-z_]\w*\s*=\s*)?simplify\(\s*([^)]+?)\s*\)$/i)
    if (simplifyMatch && symVars.size > 0) {
      const [, assignLhs, rawExpr] = simplifyMatch
      try {
        const result = symResult((math as any).parse(evalSymFn(rawExpr)))
        if (assignLhs) { const lhs = assignLhs.replace(/\s*=\s*$/, "").trim(); parser.set(lhs, result); variables.add(lhs) }
        const display = Array.isArray(result) ? result.map((r: any) => r.__sym).join("  ") : result.__sym
        if (!hasSemicolon) logs.push(`${assignLhs ? assignLhs.replace(/\s*=\s*$/, "").trim() : "ans"} =\n${display}`)
        return hasSemicolon ? null : result
      } catch { /* fall through */ }
    }

    const expandMatch = withoutSemicolon.match(/^([A-Za-z_]\w*\s*=\s*)?expand\(\s*(.+?)\s*\)$/i)
    if (expandMatch && symVars.size > 0) {
      const [, assignLhs, rawExpr] = expandMatch
      try {
        const result = symResult((math as any).parse(evalSymFn(rawExpr)))
        if (assignLhs) { const lhs = assignLhs.replace(/\s*=\s*$/, "").trim(); parser.set(lhs, result); variables.add(lhs) }
        const display = Array.isArray(result) ? result.map((r: any) => r.__sym).join("  ") : result.__sym
        if (!hasSemicolon) logs.push(`${assignLhs ? assignLhs.replace(/\s*=\s*$/, "").trim() : "ans"} =\n${display}`)
        return hasSemicolon ? null : result
      } catch { /* fall through */ }
    }

    const sym2polyMatch = withoutSemicolon.match(/^([A-Za-z_]\w*\s*=\s*)?sym2poly\(\s*(.+?)\s*\)$/i)
    if (sym2polyMatch && symVars.size > 0) {
      const [, assignLhs, rawExpr] = sym2polyMatch
      try {
        const coeffs = extractPolyCoeffs(evalSymFn(rawExpr))
        if (assignLhs) { const lhs = assignLhs.replace(/\s*=\s*$/, "").trim(); parser.set(lhs, coeffs); variables.add(lhs) }
        if (!hasSemicolon) logs.push(`${assignLhs ? assignLhs.replace(/\s*=\s*$/, "").trim() : "ans"} =\n${formatValue(coeffs)}`)
        return hasSemicolon ? null : coeffs
      } catch { /* fall through */ }
    }

    const subsMatch = withoutSemicolon.match(/^([A-Za-z_]\w*\s*=\s*)?subs\(\s*([^,]+?)\s*,\s*([A-Za-z_]\w*)\s*,\s*([^)]+?)\s*\)$/i)
    if (subsMatch) {
      const [, assignLhs, rawExpr, varName, valStr] = subsMatch
      try {
        const val = toPlain(parser.evaluate(preprocessLine(valStr.trim(), variables, functionNames)))
        const evaluated = toPlain((math as any).parse(evalSymFn(rawExpr)).compile().evaluate({ [varName]: val }))
        if (assignLhs) { const lhs = assignLhs.replace(/\s*=\s*$/, "").trim(); parser.set(lhs, evaluated); variables.add(lhs) }
        if (!hasSemicolon) logs.push(`${assignLhs ? assignLhs.replace(/\s*=\s*$/, "").trim() : "ans"} =\n${formatValue(evaluated)}`)
        return hasSemicolon ? null : evaluated
      } catch { /* fall through */ }
    }

    if (symVars.size > 0 && exprHasSymVars(withoutSemicolon)) {
      const simpleAssign = withoutSemicolon.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/)
      const rhsRaw  = simpleAssign ? simpleAssign[2].trim() : withoutSemicolon
      const lhsName = simpleAssign ? simpleAssign[1].trim() : null
      const mjsRhs  = rhsRaw.replace(/\.\^/g, "^").replace(/\.\*/g, "*").replace(/\.\//g, "/")
      try {
        const result = symResult((math as any).parse(mjsRhs))
        if (lhsName) {
          parser.set(lhsName, result); variables.add(lhsName)
          const display = Array.isArray(result) ? result.map((r: any) => r.__sym).join("  ") : result.__sym
          if (!hasSemicolon) logs.push(`${lhsName} =\n${display}`)
        } else {
          const display = Array.isArray(result) ? result.map((r: any) => r.__sym).join("  ") : result.__sym
          if (!hasSemicolon) logs.push(`ans =\n${display}`)
        }
        return hasSemicolon ? null : result
      } catch { /* fall through */ }
    }

    const line = preprocessLine(withoutSemicolon, variables, functionNames)
    if (!line) return null
    try {
      const anonymousAssign = withoutSemicolon.match(/^([A-Za-z_]\w*)\s*=\s*@\(([^)]*)\)\s*(.+)$/)
      if (anonymousAssign) {
        const [, name, paramsRaw, bodyRaw] = anonymousAssign
        const params = paramsRaw.split(",").map((e: string) => e.trim()).filter(Boolean)
        const body = preprocessLine(bodyRaw, variables, functionNames)
        const anonymousFn = (...args: any[]) => {
          if (args.some((a: any) => isSymObj(a) || isSymArr(a))) {
            let exprBody = bodyRaw.replace(/\.\^/g, "^").replace(/\.\*/g, "*").replace(/\.\//g, "/")
            params.forEach((param: string, idx: number) => {
              const arg = args[idx]
              const argStr = isSymObj(arg) ? `(${(arg as any).__sym})`
                           : isSymArr(arg) ? `[${(arg as any[]).map((a: any) => a.__sym).join(", ")}]`
                           : String(args[idx] ?? 0)
              exprBody = exprBody.replace(new RegExp(`\\b${param}\\b`, "g"), argStr)
            })
            try { return symResult((math as any).parse(exprBody)) } catch(e) { throw e }
          }
          const saved = new Map<string, any>()
          params.forEach((param: string, index: number) => {
            try { saved.set(param, parser.get(param)) } catch { saved.set(param, undefined) }
            parser.set(param, args[index] ?? null)
          })
          const result = toPlain(parser.evaluate(body))
          params.forEach((param: string) => {
            if (saved.get(param) === undefined) parser.remove(param)
            else parser.set(param, saved.get(param))
          })
          return result
        }
        parser.set(name, anonymousFn)
        functionNames.add(name); variables.add(name)
        return hasSemicolon ? null : anonymousFn
      }

      const multiAssign = line.match(/^\[([^\]]+)\]\s*=\s*(.+)$/)
      if (multiAssign) {
        const names = multiAssign[1].split(",").map((n: string) => n.trim()).filter(Boolean)
        const rhs = replaceBackslash(preprocessLine(multiAssign[2], variables, functionNames))
        const result = toPlain(parser.evaluate(rhs)) as any
        const values = result?.__multi ?? (Array.isArray(result) ? result : [])
        names.forEach((name: string, idx: number) => { parser.set(name, values[idx]); variables.add(name) })
        return hasSemicolon ? null : (values.length === 1 ? values[0] : values)
      }

      const indexedAssign = line.match(/^([A-Za-z_]\w*)\[([^\]]+)\]\s*=\s*(.+)$/)
      if (indexedAssign) {
        const [, name, idxExpr, valExpr] = indexedAssign
        let arr = parser.get(name)
        const val = toPlain(parser.evaluate(valExpr))

        const evalIdx = (expr: string, len: number): number[] => {
          const trimmed = String(expr).trim()
          if (trimmed === ":") return Array.from({ length: len }, (_, k) => k + 1)
          const expanded = trimmed.replace(/\bend\b/g, String(len))
          const result = toPlain(parser.evaluate(expanded)) as any
          return isCollection(result) ? normalizeVector(result).map(Number) : [Number(result)]
        }

        const topCommas: number[] = []
        let depth = 0
        for (let ci = 0; ci < idxExpr.length; ci++) {
          const ch = idxExpr[ci]
          if ("([{".includes(ch)) depth++
          else if (")]}".includes(ch)) depth--
          else if (ch === "," && depth === 0) topCommas.push(ci)
        }

        if (topCommas.length === 0) {
          const rawIdxResult = toPlain(parser.evaluate(idxExpr.replace(/\bend\b/g, String(Array.isArray(arr) ? arr.length : 1)))) as any
          const flatRaw: any[] = Array.isArray(rawIdxResult) ? (rawIdxResult as any[]).flat(Infinity) : [rawIdxResult]
          const isLogicalMask = flatRaw.length > 0 && flatRaw.every((x: any) => typeof x === "boolean")
          if (isLogicalMask && Array.isArray(rawIdxResult) && Array.isArray(rawIdxResult[0])) {
            const numVal = Number(val)
            const result = (toNumericMatrix(arr) || arr).map((row: any, i: number) =>
              row.map((elem: any, j: number) => (rawIdxResult[i]?.[j] ? numVal : elem)),
            )
            parser.set(name, result)
          } else if (isLogicalMask) {
            const updated = [...normalizeVector(arr)]
            flatRaw.forEach((b: any, i: number) => { if (b) updated[i] = Number(val) })
            parser.set(name, updated)
          } else {
            const updated = Array.isArray(arr) ? [...arr] : arr
            const indices = evalIdx(idxExpr, Array.isArray(updated) ? updated.length : 1)
            if (indices.length === 1) {
              if (Array.isArray(updated)) updated[indices[0] - 1] = val
            } else {
              const vals = isCollection(val) ? normalizeVector(val) : indices.map(() => val)
              indices.forEach((idx: number, k: number) => { if (Array.isArray(updated)) updated[idx - 1] = vals[k] ?? val })
            }
            parser.set(name, updated)
          }
        } else if (topCommas.length === 1) {
          const rowExpr = idxExpr.slice(0, topCommas[0]).trim()
          const colExpr = idxExpr.slice(topCommas[0] + 1).trim()
          let mat = toNumericMatrix(arr)
          if (!mat) mat = [[Number(arr) || 0]]
          mat = mat.map((r: number[]) => [...r])
          const nRows = mat.length
          const nCols = (mat[0] as number[])?.length ?? 0
          const isEmpty = Array.isArray(val) && (val as any[]).flat(Infinity).length === 0
          const rowIsColon = rowExpr.trim() === ":"
          const colIsColon = colExpr.trim() === ":"
          if (isEmpty) {
            if (colIsColon && !rowIsColon) {
              const toDelete = new Set(evalIdx(rowExpr, nRows).map((r: number) => r - 1))
              parser.set(name, mat.filter((_: any, r: number) => !toDelete.has(r)))
            } else if (rowIsColon && !colIsColon) {
              const toDelete = new Set(evalIdx(colExpr, nCols).map((c: number) => c - 1))
              parser.set(name, mat.map((row: number[]) => row.filter((_: any, c: number) => !toDelete.has(c))))
            }
            variables.add(name)
            if (!hasSemicolon) { const _v = parser.get(name); if (_v != null) logs.push(`${name} =\n${formatValue(_v)}`) }
            return hasSemicolon ? null : parser.get(name)
          }
          const rowIdxs = evalIdx(rowExpr, nRows)
          const colIdxs = evalIdx(colExpr, nCols)
          const maxRow = Math.max(...rowIdxs)
          const maxCol = Math.max(...colIdxs)
          while (mat.length < maxRow) mat.push(Array((mat[0] as number[])?.length ?? maxCol).fill(0))
          mat.forEach((r: number[]) => { while (r.length < maxCol) r.push(0) })
          const valFlat = isCollection(val) ? normalizeVector(val) : null
          let vi = 0
          rowIdxs.forEach((ri: number) => { colIdxs.forEach((ci: number) => { const v = valFlat ? (valFlat[vi++] ?? 0) : Number(val); mat[ri - 1][ci - 1] = v }) })
          parser.set(name, mat)
        }
        variables.add(name)
        if (!hasSemicolon) { const _v = parser.get(name); if (_v != null) logs.push(`${name} =\n${formatValue(_v)}`) }
        return hasSemicolon ? null : parser.get(name)
      }

      const assign = line.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/)
      if (assign) {
        const [, name, expr] = assign
        const result = toPlain(parser.evaluate(replaceBackslash(expr)))
        parser.set(name, result)
        parser.set("ans", result)
        variables.add(name)
        if (!hasSemicolon && result != null && result !== "") logs.push(`${name} =\n${formatValue(result)}`)
        return hasSemicolon ? null : result
      }
      const result = toPlain(parser.evaluate(replaceBackslash(line)))
      parser.set("ans", result)
      if (!hasSemicolon && result != null && result !== "") logs.push(`ans =\n${formatValue(result)}`)
      return (hasSemicolon || result == null || result === "") ? null : result
    } catch (error) {
      throw formatExecutionError(error, { lineNo, rawLine: trimmedRaw, normalizedLine: line })
    }
  }

  // ── Block / node executors ────────────────────────────────────────────────
  function executeBlock(nodes: any[]): any {
    let last: any = null
    for (const node of nodes) {
      const sig = executeNode(node)
      if (sig === BREAK || sig === CONTINUE || sig === RETURN) return sig
      if (sig != null && sig !== BREAK && sig !== CONTINUE && sig !== RETURN) last = sig
    }
    return last
  }

  function executeNode(node: any): any {
    if (node.type === "line") return executeLine(node.raw, node.lineNo ?? null)
    if (node.type === "if") {
      for (const branch of node.branches) {
        const condExpr = replaceBackslash(preprocessLine(branch.cond.replace(/;\s*$/, ""), variables, functionNames))
        const condVal = toPlain(parser.evaluate(condExpr))
        if (isTruthy(condVal)) return executeBlock(branch.body)
      }
      if (node.elseBody) return executeBlock(node.elseBody)
      return null
    }
    if (node.type === "for") {
      const iterExpr = replaceBackslash(preprocessLine(node.iterExpr.replace(/;\s*$/, ""), variables, functionNames))
      const iterVal = toPlain(parser.evaluate(iterExpr)) as any
      const items = Array.isArray(iterVal) ? normalizeVector(iterVal) : [realValue(iterVal)]
      let last: any = null
      for (const item of items) {
        parser.set(node.varName, item); variables.add(node.varName)
        const sig = executeBlock(node.body)
        if (sig === BREAK) break
        if (sig === RETURN) return sig
        if (sig !== CONTINUE && sig != null) last = sig
      }
      return last
    }
    if (node.type === "while") {
      let last: any = null
      const WHILE_LIMIT = 100000
      let guard = 0
      while (guard++ < WHILE_LIMIT) {
        const condExpr = replaceBackslash(preprocessLine(node.condExpr.replace(/;\s*$/, ""), variables, functionNames))
        const condVal = toPlain(parser.evaluate(condExpr))
        if (!isTruthy(condVal)) break
        const sig = executeBlock(node.body)
        if (sig === BREAK) break
        if (sig === RETURN) return sig
        if (sig !== CONTINUE && sig != null) last = sig
      }
      if (guard >= WHILE_LIMIT) logs.push(`⚠ while loop exceeded ${WHILE_LIMIT.toLocaleString()} iterations and was stopped.`)
      return last
    }
    if (node.type === "function") {
      const { name, ins, outs, body } = node
      userFunctions[name] = { ins, outs, body }
      parser.set(name, (...args: any[]) => {
        const saved: Record<string, any> = {}
        ins.forEach((param: string, i: number) => { saved[param] = parser.get(param); parser.set(param, args[i] ?? null) })
        outs.forEach((o: string) => { saved[o] = parser.get(o) })
        parser.set("nargin",  args.length)
        parser.set("nargout", outs.length)
        executeBlock(body)
        const result = outs.length === 1
          ? parser.get(outs[0])
          : outs.length > 1 ? { __multi: outs.map((o: string) => parser.get(o)) } : null
        Object.entries(saved).forEach(([k, v]) => v == null ? null : parser.set(k, v))
        return result
      })
      functionNames.add(name)
      return null
    }
    if (node.type === "try") {
      try {
        const sig = executeBlock(node.tryBody)
        if (sig === BREAK || sig === CONTINUE || sig === RETURN) return sig
        return sig
      } catch (err: any) {
        if (node.catchBody) {
          if (node.catchVar) { parser.set(node.catchVar, err?.message || String(err)); variables.add(node.catchVar) }
          return executeBlock(node.catchBody)
        }
        return null
      }
    }
    if (node.type === "switch") {
      const exprPrep = replaceBackslash(preprocessLine(String(node.expr).replace(/;\s*$/, ""), variables, functionNames))
      let switchVal: any
      try { switchVal = toPlain(parser.evaluate(exprPrep)) } catch { return null }
      for (const caseNode of node.cases) {
        const casePrep = replaceBackslash(preprocessLine(String(caseNode.val).replace(/;\s*$/, ""), variables, functionNames))
        let caseVal: any
        try { caseVal = toPlain(parser.evaluate(casePrep)) } catch { continue }
        const svNum = realValue(switchVal), cvNum = realValue(caseVal)
        const svStr = typeof switchVal === "string" ? switchVal : null
        const cvStr = typeof caseVal  === "string" ? caseVal  : null
        const matches = Array.isArray(caseVal)
          ? normalizeVector(caseVal).some((v: number) => v === svNum)
          : (svStr != null && cvStr != null ? svStr === cvStr : svNum === cvNum)
        if (matches) return executeBlock(caseNode.body)
      }
      if (node.otherwise) return executeBlock(node.otherwise)
      return null
    }
    if (node.type === "break") return BREAK
    if (node.type === "continue") return CONTINUE
    if (node.type === "return") return RETURN
    return null
  }

  // ── Source pre-processing helpers ─────────────────────────────────────────

  function expandMidLineSemicolons(src: string): string {
    const result: string[] = []
    for (const rawLine of src.split(/\r?\n/)) {
      const code = stripMatlabComment(rawLine)
      if (!code.includes(";")) { result.push(rawLine); continue }
      const parts: string[] = []
      let cur = "", depth = 0, inStr = false, strCh: string | null = null
      for (let ci = 0; ci < code.length; ci++) {
        const ch = code[ci]
        if (inStr) {
          cur += ch
          if (ch === strCh) {
            if (code[ci + 1] === strCh) { cur += code[++ci]; continue }
            inStr = false
          }
          continue
        }
        if (ch === "'" || ch === '"') { inStr = true; strCh = ch; cur += ch; continue }
        if ("([".includes(ch)) depth++
        else if (")]".includes(ch)) depth = Math.max(0, depth - 1)
        if (ch === ";" && depth === 0) { parts.push(cur.trim()); cur = "" }
        else cur += ch
      }
      parts.push(cur.trim())
      const nonEmpty = parts.filter(Boolean)
      if (nonEmpty.length <= 1) { result.push(rawLine); continue }
      nonEmpty.slice(0, -1).forEach((p: string) => result.push(p + ";"))
      if (nonEmpty[nonEmpty.length - 1]) result.push(nonEmpty[nonEmpty.length - 1])
    }
    return result.join("\n")
  }

  function joinUnclosedStrings(src: string): string {
    function isTransposeQuote(str: string, pos: number): boolean {
      let j = pos - 1
      while (j >= 0 && (str[j] === " " || str[j] === "\t")) j--
      if (j < 0) return false
      return /[)\]\w']/.test(str[j])
    }
    const rawLines = src.split(/\r?\n/)
    const out: string[] = []
    let pending: string | null = null
    for (const line of rawLines) {
      const working: string = pending !== null ? pending + "\\n" + line : line
      let inStr = false, strCh: string | null = null
      for (let i = 0; i < working.length; i++) {
        const c = working[i]
        if (inStr) {
          if (c === strCh) {
            if (working[i + 1] === strCh) { i++; continue }
            inStr = false; strCh = null
          }
        } else {
          if (c === "%") break
          if (c === '"') { inStr = true; strCh = c }
          else if (c === "'") {
            if (!isTransposeQuote(working, i)) { inStr = true; strCh = c }
          }
        }
      }
      if (inStr) { pending = working }
      else { out.push(working); pending = null }
    }
    if (pending !== null) out.push(pending)
    return out.join("\n")
  }

  function joinUnclosedBrackets(src: string): string {
    function stripComment(line: string): string {
      let inStr = false, strCh: string | null = null
      for (let i = 0; i < line.length; i++) {
        const c = line[i]
        if (inStr) {
          if (c === strCh) {
            if (line[i + 1] === strCh) { i++; continue }
            inStr = false; strCh = null
          }
        } else if (c === "'" || c === '"') { inStr = true; strCh = c }
        else if (c === "%") return line.slice(0, i)
      }
      return line
    }
    function countBracketDelta(text: string): number {
      let inStr = false, strCh: string | null = null, delta = 0
      for (let i = 0; i < text.length; i++) {
        const c = text[i]
        if (inStr) {
          if (c === strCh) {
            if (text[i + 1] === strCh) { i++; continue }
            inStr = false; strCh = null
          }
        } else if (c === "%") break
        else if (c === '"') { inStr = true; strCh = c }
        else if (c === "'") {
          let j = i - 1
          while (j >= 0 && (text[j] === " " || text[j] === "\t")) j--
          if (j < 0 || !/[)\]\w']/.test(text[j])) { inStr = true; strCh = c }
        } else if (c === "[") delta++
        else if (c === "]") delta--
      }
      return delta
    }
    const rawLines = src.split(/\r?\n/)
    const out: string[] = []
    let depth = 0, pendingRaw = ""
    for (const line of rawLines) {
      const combined = pendingRaw ? pendingRaw + " " + line.trim() : line
      depth += countBracketDelta(stripComment(line))
      if (depth > 0) { pendingRaw = combined }
      else { out.push(combined); pendingRaw = ""; depth = 0 }
    }
    if (pendingRaw) out.push(pendingRaw)
    return out.join("\n")
  }

  function patchOperators(src: string): string {
    return src.split(/\r?\n/).map(line => {
      let result = "", inStr = false, strCh: string | null = null, i = 0
      while (i < line.length) {
        const c = line[i]
        if (inStr) {
          result += c
          if (c === strCh) {
            if (line[i + 1] === strCh) { result += line[i + 1]; i += 2; continue }
            inStr = false; strCh = null
          }
          i++; continue
        }
        if (c === "%") { result += line.slice(i); break }
        if (c === '"') { inStr = true; strCh = c; result += c; i++; continue }
        if (c === "'") {
          const j = result.trimEnd().length - 1
          const prev = j >= 0 ? result.trimEnd()[j] : ""
          if (/[)\]\w]/.test(prev)) { result += c; i++; continue }
          inStr = true; strCh = c; result += c; i++; continue
        }
        if (line[i] === "&" && line[i + 1] === "&") { result += " and "; i += 2; continue }
        if (line[i] === "|" && line[i + 1] === "|") { result += " or "; i += 2; continue }
        if (c === "~" && line[i + 1] === "=") { result += "!="; i += 2; continue }
        if (c === "." && line[i + 1] === "'") {
          const prevTrimmed = result.trimEnd()
          const lastCh = prevTrimmed.slice(-1)
          if (/[\w)\]]/.test(lastCh)) {
            let objEnd = prevTrimmed.length
            let objStart = objEnd - 1
            if (lastCh === ")" || lastCh === "]") {
              const close = lastCh, open = close === ")" ? "(" : "["
              let d = 1; objStart--
              while (objStart >= 0 && d > 0) {
                if (prevTrimmed[objStart] === close) d++
                else if (prevTrimmed[objStart] === open) d--
                if (d > 0) objStart--
              }
              while (objStart > 0 && /[\w]/.test(prevTrimmed[objStart - 1])) objStart--
            } else {
              while (objStart > 0 && /[\w]/.test(prevTrimmed[objStart - 1])) objStart--
            }
            const prefix = prevTrimmed.slice(0, objStart)
            const obj = prevTrimmed.slice(objStart, objEnd)
            result = prefix + `transpose(${obj})`
            i += 2; continue
          }
        }
        if (c === "~" && line[i + 1] !== "=") {
          const prevTrimmedNot = result.trimEnd()
          const lastChNot = prevTrimmedNot.slice(-1)
          const afterOperator = !lastChNot || /[=+\-*/<>!&|,(\[{]/.test(lastChNot)
          if (afterOperator) {
            let j = i + 1
            while (j < line.length && line[j] === " ") j++
            const startToken = j
            if (line[j] === "(") {
              let depth = 1; j++
              while (j < line.length && depth > 0) {
                if (line[j] === "(") depth++
                else if (line[j] === ")") depth--
                j++
              }
            } else {
              while (j < line.length && /[\w.]/.test(line[j])) j++
              if (line[j] === "(") {
                let depth = 1; j++
                while (j < line.length && depth > 0) {
                  if (line[j] === "(") depth++
                  else if (line[j] === ")") depth--
                  j++
                }
              }
            }
            if (j > startToken) {
              const token = line.slice(startToken, j)
              result += `not(${token})`
              i = j; continue
            }
          }
        }
        if (c === "." && line[i + 1] === "(") {
          const objEnd = result.trimEnd().length - 1
          if (objEnd >= 0) {
            const trimmed = result.trimEnd()
            let objStart = objEnd
            if (trimmed[objEnd] === ")") {
              let d = 0, j2 = objEnd
              while (j2 >= 0) {
                if (trimmed[j2] === ")") d++
                else if (trimmed[j2] === "(") { if (!--d) { objStart = j2; break } }
                j2--
              }
            } else {
              while (objStart > 0 && /[\w]/.test(trimmed[objStart - 1])) objStart--
            }
            const obj = trimmed.slice(objStart)
            const prefix = trimmed.slice(0, objStart)
            let depth = 0, j3 = i + 1, fieldExpr = ""
            while (j3 < line.length) {
              const ch = line[j3]
              if (ch === "(") depth++
              else if (ch === ")") { if (!--depth) { j3++; break } }
              fieldExpr += ch; j3++
            }
            fieldExpr = fieldExpr.slice(1)
            result = prefix + `getfield(${obj},${fieldExpr})`
            i = j3; continue
          }
        }
        result += c; i++
      }
      return result
    }).join("\n")
  }

  function replaceBackslashDiv(src: string): string {
    return src.split(/\r?\n/).map(line => {
      let inStr = false, strCh: string | null = null
      const bsPos: number[] = []
      for (let i = 0; i < line.length; i++) {
        const c = line[i]
        if (inStr) {
          if (c === strCh) {
            if (line[i + 1] === strCh) { i++; continue }
            inStr = false; strCh = null
          }
        } else if (c === "%") break
        else if (c === '"') { inStr = true; strCh = c }
        else if (c === "'") {
          let j = i - 1
          while (j >= 0 && (line[j] === " " || line[j] === "\t")) j--
          if (j < 0 || !/[)\]\w']/.test(line[j])) { inStr = true; strCh = c }
        } else if (c === "\\") bsPos.push(i)
      }
      if (!bsPos.length) return line
      let out = line
      for (let pi = bsPos.length - 1; pi >= 0; pi--) {
        const bs = bsPos[pi]
        let li = bs - 1
        while (li >= 0 && out[li] === " ") li--
        if (li < 0) continue
        let leftEnd = li, leftStart = li
        if (out[li] === ")") {
          let d = 0, j = li
          for (; j >= 0; j--) {
            if (out[j] === ")") d++
            else if (out[j] === "(") { if (!--d) { leftStart = j; break } }
          }
          let k = leftStart - 1; while (k >= 0 && out[k] === " ") k--
          if (k >= 0 && out[k] === "-") {
            let pk = k - 1; while (pk >= 0 && out[pk] === " ") pk--
            if (pk < 0 || !/[\w)\]]/.test(out[pk])) leftStart = k
          }
        } else {
          while (leftStart > 0 && /[\w.]/.test(out[leftStart - 1])) leftStart--
          let k = leftStart - 1; while (k >= 0 && out[k] === " ") k--
          if (k >= 0 && out[k] === "-") {
            let pk = k - 1; while (pk >= 0 && out[pk] === " ") pk--
            if (pk < 0 || !/[\w)\]]/.test(out[pk])) leftStart = k
          }
        }
        let ri = bs + 1; while (ri < out.length && out[ri] === " ") ri++
        if (ri >= out.length) continue
        const rightStart = ri
        let rightEnd: number | undefined, rr = ri
        if (out[rr] === "-") rr++
        if (rr < out.length && out[rr] === "(") {
          let d = 0, j = rr
          for (; j < out.length; j++) {
            if (out[j] === "(") d++
            else if (out[j] === ")") { if (!--d) { rightEnd = j; break } }
          }
        } else {
          rightEnd = rr
          while (rightEnd + 1 < out.length && /[\w.]/.test(out[rightEnd + 1])) rightEnd++
          if (rightEnd + 1 < out.length && out[rightEnd + 1] === "(") {
            let d = 0, j = rightEnd + 1
            for (; j < out.length; j++) {
              if (out[j] === "(") d++
              else if (out[j] === ")") { if (!--d) { rightEnd = j; break } }
            }
          }
        }
        if (rightEnd === undefined) continue
        const left = out.slice(leftStart, leftEnd + 1).trim()
        const right = out.slice(rightStart, rightEnd + 1).trim()
        out = out.slice(0, leftStart) + `mldivide(${left},${right})` + out.slice(rightEnd + 1)
      }
      return out
    }).join("\n")
  }

  // ── Execute ───────────────────────────────────────────────────────────────
  const normalizedSource = expandMidLineSemicolons(
    joinContinuationLines(replaceBackslashDiv(patchOperators(joinUnclosedBrackets(joinUnclosedStrings(source)))))
  )
  const lines = normalizedSource.split(/\r?\n/)
  const tree = parseBlocks(lines)

  for (const node of tree) {
    executeNode(node)
  }

  let figureJson: string | null
  if (subplotState.active) {
    if (subplotState.current > 0) {
      subplotState.slots[subplotState.current - 1] = { ...makePlotState(), ...plotState, series: [...plotState.series] }
    }
    const panels = subplotState.slots.map((slot: any) =>
      slot && slot.series.length > 0 ? buildFigureFromPlotState(slot) : null,
    )
    figureJson = JSON.stringify({ type: "opencalc_subplots", rows: subplotState.rows, cols: subplotState.cols, panels })
  } else {
    figureJson = buildFigureFromPlotState(plotState)
  }

  const outputBlocks: string[] = []
  if (logs.length) outputBlocks.push(logs.filter(Boolean).join("\n"))

  const result: ExecutionResult = {
    output: outputBlocks.filter(Boolean).join("\n\n") || (figureJson ? "Plot rendered." : "No output."),
    figureJson,
    workspace: buildWorkspaceSnapshot(parser, variables),
    plot3DRequest: engine.getPlot3DRequest(),
    controls: engine.getControls(),
    compatibilityWarnings,
  }

  extensions.forEach((extension: any) => {
    if (typeof extension?.onRun === "function") {
      try { extension.onRun(result, { parser, variables, logs, plotState, subplotState }) } catch {}
    }
  })

  return result
}

// ── Convenience wrapper ───────────────────────────────────────────────────────

export function runOpenMatScript(source: string, options: { sliderOverrides?: Record<string, number>; extensions?: EngineExtension[] } = {}): {
  logs: string[]
  figureJson: string | null
  variables: string[]
} {
  const result = executeScript(source, {
    controlValues: options.sliderOverrides ?? {},
    extensions: options.extensions ?? [],
  })
  return {
    logs: result.output ? result.output.split("\n") : [],
    figureJson: result.figureJson,
    variables: (result.workspace ?? []).map((w: any) => w.name),
  }
}
