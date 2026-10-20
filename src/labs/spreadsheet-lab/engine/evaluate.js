// Runs a parsed formula. Pure: everything it needs from the workbook comes in
// through `ctx`, so it can be tested without a grid and replayed step by step
// by the "Evaluate" panel (see the `trace` hook).
//
// ctx = {
//   sheet, row, col             the cell being calculated (for ROW(), relative refs)
//   getCell(sheet, row, col)    a single value
//   getRange(sheet, r1, c1, r2, c2)  a Matrix (open-ended ranges like A:A are clipped by the workbook)
//   getSpill(sheet, row, col)   the block a formula spilled (for A1#)
//   functions                   the function library
//   scope                       LET / LAMBDA variable bindings (a Map)
//   trace(node, value)          optional: called after each node is evaluated
//   external(lang, code, args)  optional: runs PY / JS / MATLAB cells
// }

import { CellError, ErrorSignal, Matrix, err, fail, isError, isMatrix, raise, toNumber, toText, checkNumber } from './values.js'

export function evaluate(tree, ctx) {
  try {
    return evalNode(tree, ctx)
  } catch (e) {
    if (e instanceof ErrorSignal) return e.error
    if (e instanceof RangeError) return err('#NUM!', 'The calculation went too deep (' + e.message + ').')
    throw e
  }
}

// Runs fn and turns a thrown error signal into an error value, so one bad
// element of an array does not stop the rest.
export function attempt(fn) {
  try { return fn() } catch (e) { if (e instanceof ErrorSignal) return e.error; throw e }
}

export function evalNode(node, ctx) {
  const value = evalInner(node, ctx)
  ctx.trace?.(node, value)
  return value
}

function evalInner(node, ctx) {
  switch (node.type) {
    case 'number': case 'string': case 'bool': return node.value
    case 'error': return err(node.value)
    case 'missing': return undefined
    case 'group': return evalNode(node.arg, ctx)
    case 'array': return new Matrix(node.rows.map((row) => row.map((v) => (v && v.error ? err(v.error) : v))))
    case 'cell': return ctx.getCell(node.sheet ?? ctx.sheet, node.row, node.col)
    case 'range': return ctx.getRange(node.sheet ?? ctx.sheet, node.r1, node.c1, node.r2, node.c2)
    case 'spill': return ctx.getSpill(node.sheet ?? ctx.sheet, node.row, node.col)
    case 'name': {
      if (ctx.scope?.has(node.name)) return ctx.scope.get(node.name)
      if (ctx.names?.has(node.name)) return evalNode(ctx.names.get(node.name), ctx)
      // A function's name on its own is the function as a value, to pass to
      // GROUPBY, MAP or BYROW: =GROUPBY(A1:A9, B1:B9, SUM). (Excel calls this an
      // eta-reduced lambda.)
      const def = ctx.functions?.[node.name]
      if (def && !def.lazy) {
        const fn = (...values) => (def.scalar ? scalarCall(def, values, ctx) : def.fn(values, ctx))
        fn.isLambda = true
        return fn
      }
      return err('#NAME?', '"' + node.name + '" is not a function, a LET variable or a defined name. Text must be in double quotes.')
    }
    case 'unary': {
      const v = evalNode(node.arg, ctx)
      return lift1(v, (x) => (node.op === '-' ? -toNumber(x) : toNumber(x)))
    }
    case 'percent': return lift1(evalNode(node.arg, ctx), (x) => toNumber(x) / 100)
    case 'binary': return binary(node.op, evalNode(node.left, ctx), evalNode(node.right, ctx))
    case 'call': return call(node, ctx)
    default: return err('#VALUE!', 'Unknown expression ' + node.type)
  }
}

// ── Operators ─────────────────────────────────────────────────────────────
const ARITH = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => { if (b === 0) fail('#DIV/0!', 'The formula divides by zero (an empty cell counts as zero).'); return a / b },
  '^': (a, b) => {
    if (a === 0 && b === 0) fail('#NUM!', '0^0 is undefined.')
    if (a < 0 && !Number.isInteger(b)) fail('#NUM!', 'A negative number cannot be raised to a fractional power.')
    return Math.pow(a, b)
  },
}

export function binary(op, a, b) {
  return lift2(a, b, (x, y) => {
    if (op in ARITH) {
      if (isError(x)) raise(x)
      if (isError(y)) raise(y)
      return checkNumber(ARITH[op](toNumber(x), toNumber(y)))
    }
    if (op === '&') return toText(x) + toText(y)
    const c = compare(x, y)
    switch (op) {
      case '=': return c === 0
      case '<>': return c !== 0
      case '<': return c < 0
      case '>': return c > 0
      case '<=': return c <= 0
      case '>=': return c >= 0
      default: return fail('#VALUE!', 'Unknown operator ' + op)
    }
  })
}

// Excel's ordering: numbers < text < FALSE < TRUE. Text compares without regard
// to case. A blank is 0 against a number, "" against text, FALSE against a logical.
const RANK = { number: 0, string: 1, boolean: 2 }
export function compare(a, b) {
  if (isError(a)) raise(a)
  if (isError(b)) raise(b)
  if (a === null || a === undefined) a = typeof b === 'string' ? '' : typeof b === 'boolean' ? false : 0
  if (b === null || b === undefined) b = typeof a === 'string' ? '' : typeof a === 'boolean' ? false : 0
  const ta = RANK[typeof a], tb = RANK[typeof b]
  if (ta !== tb) return ta - tb
  if (typeof a === 'string') {
    const x = a.toLowerCase(), y = b.toLowerCase()
    return x < y ? -1 : x > y ? 1 : 0
  }
  return a < b ? -1 : a > b ? 1 : 0
}

// ── Arrays ────────────────────────────────────────────────────────────────
// Operations work element by element on arrays: ={1,2,3}*2 is {2,4,6}.
// A single row or column stretches to match the other side (broadcasting);
// elsewhere a size mismatch gives #N/A for the missing elements, as in Excel.

export function lift1(v, fn) {
  if (isMatrix(v)) return v.map((x) => attempt(() => fn(x)))
  return fn(v)
}

export function lift2(a, b, fn) {
  if (!isMatrix(a) && !isMatrix(b)) return fn(a, b)
  const A = Matrix.of(a), B = Matrix.of(b)
  const h = Math.max(A.height, B.height), w = Math.max(A.width, B.width)
  const pick = (M, r, c) => {
    const rr = M.height === 1 ? 0 : r, cc = M.width === 1 ? 0 : c
    if (rr >= M.height || cc >= M.width) return err('#N/A', 'The arrays are different sizes, so this element has no partner.')
    return M.get(rr, cc)
  }
  return Matrix.fill(h, w, (r, c) => attempt(() => fn(pick(A, r, c), pick(B, r, c))))
}

// ── Function calls ────────────────────────────────────────────────────────
function call(node, ctx) {
  // A LAMBDA bound to a name with LET is called like a built-in: f(3).
  const bound = ctx.scope?.get(node.name)
  if (typeof bound === 'function') return bound(...node.args.map((a) => evalNode(a, ctx)))
  const def = ctx.functions[node.name]
  if (!def) return err('#NAME?', 'There is no function called ' + node.name + '. Check the spelling.')
  const n = node.args.length
  if (n < (def.min ?? 0) || n > (def.max ?? Infinity)) {
    const expect = def.min === def.max ? String(def.min) : def.max === Infinity ? 'at least ' + def.min : def.min + ' to ' + def.max
    return err('#VALUE!', node.name + ' takes ' + expect + ' argument' + (expect === '1' ? '' : 's') + ' but was given ' + n + '. Syntax: ' + def.syntax)
  }
  if (def.lazy) {
    // IF, IFERROR, CHOOSE, LET…: arguments are evaluated only when the function asks.
    // Each argument's error comes back as a value, so IFERROR(1/0, …) can catch it.
    const thunks = node.args.map((a) => (scope) => attempt(() => evalNode(a, scope ? { ...ctx, scope } : ctx)))
    thunks.nodes = node.args
    return def.fn(thunks, ctx)
  }
  // An error in an argument is passed to the function as a value, not thrown
  // past it: ISERROR(1/0) is TRUE. Functions that need a number raise it again.
  // A function that needs a reference, not a value (OFFSET, ROW, COLUMN), names the
  // arguments in `refs`: a single cell there is read as a one-cell range, which keeps its address.
  const args = node.args.map((a, i) => attempt(() => evalNode(def.refs?.includes(i) && a.type === 'cell' ? { type: 'range', sheet: a.sheet, r1: a.row, c1: a.col, r2: a.row, c2: a.col } : a, ctx)))
  if (def.scalar) return scalarCall(def, args, ctx)
  return def.fn(args, ctx)
}

// Functions marked `scalar` work on single values; given an array they are
// applied to each element and return an array, so =SQRT(A1:A3) spills three results.
function scalarCall(def, args, ctx) {
  const positions = def.scalar === true ? args.map((_, i) => i) : def.scalar
  const arrays = positions.filter((i) => isMatrix(args[i]))
  if (!arrays.length) return def.fn(args, ctx)
  const h = Math.max(...arrays.map((i) => args[i].height)), w = Math.max(...arrays.map((i) => args[i].width))
  return Matrix.fill(h, w, (r, c) => attempt(() => {
    const scalarArgs = args.map((a, i) => {
      if (!positions.includes(i) || !isMatrix(a)) return a
      const rr = a.height === 1 ? 0 : r, cc = a.width === 1 ? 0 : c
      return rr < a.height && cc < a.width ? a.get(rr, cc) : err('#N/A')
    })
    const v = def.fn(scalarArgs, ctx)
    return isMatrix(v) ? v.get(0, 0) : v
  }))
}

export { CellError }
