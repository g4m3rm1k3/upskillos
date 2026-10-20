import { def, flat, Matrix, err, fail, isError, isMatrix, raise, toNumber } from './helpers.js'
import { toBoolean, typeName } from '../values.js'
import { compare, lift1, lift2, attempt } from '../evaluate.js'

const C = 'Logical'

// Lazy functions receive thunks: arg(i)() evaluates argument i only when needed.
// That is why =IF(A1=0, "none", 1/A1) never shows #DIV/0!: the division is
// never calculated when A1 is 0.
const missing = (thunks, i) => thunks.nodes[i] === undefined || thunks.nodes[i].type === 'missing'

function logicalValues(args) {
  const out = []
  for (const a of args) {
    if (isMatrix(a)) {
      for (const v of a.values()) {
        if (isError(v)) raise(v)
        if (typeof v === 'boolean') out.push(v)
        else if (typeof v === 'number') out.push(v !== 0)
      }
    } else if (a !== null && a !== undefined) out.push(toBoolean(a))
  }
  if (!out.length) fail('#VALUE!', 'There were no TRUE/FALSE values to combine.')
  return out
}

export default {
  IF: def(C, 'IF(logical_test, [value_if_true], [value_if_false])', 'Returns one value if a condition is TRUE and another if it is FALSE.', (args) => {
    const test = args[0]()
    const choose = (t) => {
      if (isError(t)) return t
      if (toBoolean(t)) return missing(args, 1) ? (args.nodes.length > 1 ? 0 : true) : args[1]()
      return missing(args, 2) ? (args.nodes.length > 2 ? 0 : false) : args[2]()
    }
    if (isMatrix(test)) {
      // An array condition gives an array result: =IF(A1:A5>2, "big", "small").
      const yes = missing(args, 1) ? true : args[1](), no = missing(args, 2) ? false : args[2]()
      return lift2(test, lift2(yes, no, (a, b) => [a, b]), (t, pair) => {
        if (isError(t)) return t
        const [a, b] = Array.isArray(pair) ? pair : [pair, pair]
        return toBoolean(t) ? a : b
      })
    }
    return choose(test)
  }, {
    min: 1, max: 3, lazy: true,
    args: [['logical_test', 'Anything that is TRUE or FALSE, such as A1>10.'], ['value_if_true', 'The result when the test is TRUE.'], ['value_if_false', 'The result when the test is FALSE (default FALSE).']],
    example: ['=IF(B2>=50, "Pass", "Fail")', 'Pass or Fail'],
    learn: 'Only the branch that is chosen is calculated. You can nest IFs, but more than two or three get hard to read: IFS or a lookup table is often clearer.',
  }),
  IFS: def(C, 'IFS(logical_test1, value_if_true1, …)', 'Checks conditions in order and returns the value for the first one that is TRUE.', (args) => {
    if (args.nodes.length % 2) fail('#VALUE!', 'IFS needs pairs of a test and a value.')
    for (let i = 0; i < args.nodes.length; i += 2) {
      const t = args[i]()
      if (isError(t)) return t
      if (toBoolean(t)) return args[i + 1]()
    }
    return err('#N/A', 'None of the conditions was TRUE. Add TRUE as a last test for a default: …, TRUE, "other".')
  }, { min: 2, lazy: true, example: ['=IFS(B2>=90,"A", B2>=80,"B", TRUE,"C")', 'a grade'] }),
  SWITCH: def(C, 'SWITCH(expression, value1, result1, …, [default])', 'Compares an expression with a list of values and returns the matching result.', (args) => {
    const x = args[0]()
    if (isError(x)) return x
    const n = args.nodes.length
    for (let i = 1; i + 1 < n; i += 2) {
      const v = args[i]()
      if (!isError(v) && compare(x, v) === 0) return args[i + 1]()
    }
    return n % 2 === 0 ? args[n - 1]() : err('#N/A', 'No value matched and there is no default.')
  }, { min: 3, lazy: true, example: ['=SWITCH(A1, 1,"One", 2,"Two", "Many")', 'One / Two / Many'] }),
  IFERROR: def(C, 'IFERROR(value, value_if_error)', 'Returns value, or value_if_error if value is any error.', (args) => {
    const v = args[0]()
    if (isMatrix(v)) { let alt; return v.map((x) => (isError(x) ? (alt ??= args[1]()) : x)) }
    return isError(v) ? args[1]() : v
  }, { lazy: true, example: ['=IFERROR(A1/B1, 0)', '0 instead of #DIV/0!'], learn: 'IFERROR hides every error, including the ones that reveal real mistakes, such as a misspelt name (#NAME?). IFNA is safer for lookups: it only catches "not found".' }),
  IFNA: def(C, 'IFNA(value, value_if_na)', 'Returns value, or value_if_na if value is #N/A.', (args) => {
    const v = args[0]()
    if (isMatrix(v)) { let alt; return v.map((x) => (isError(x) && x.code === '#N/A' ? (alt ??= args[1]()) : x)) }
    return isError(v) && v.code === '#N/A' ? args[1]() : v
  }, { lazy: true, example: ['=IFNA(VLOOKUP(E2, A:B, 2, FALSE), "not found")', 'a friendly message'] }),
  AND: def(C, 'AND(logical1, [logical2], …)', 'TRUE if every argument is TRUE.', (args) => logicalValues(args).every(Boolean), { min: 1, example: ['=AND(A1>0, A1<10)', 'TRUE when A1 is between 0 and 10'] }),
  OR: def(C, 'OR(logical1, [logical2], …)', 'TRUE if any argument is TRUE.', (args) => logicalValues(args).some(Boolean), { min: 1 }),
  XOR: def(C, 'XOR(logical1, [logical2], …)', 'TRUE if an odd number of arguments are TRUE.', (args) => logicalValues(args).filter(Boolean).length % 2 === 1, { min: 1 }),
  NOT: def(C, 'NOT(logical)', 'Reverses TRUE and FALSE.', ([v]) => lift1(v, (x) => !toBoolean(x))),
  TRUE: def(C, 'TRUE()', 'The logical value TRUE.', () => true),
  FALSE: def(C, 'FALSE()', 'The logical value FALSE.', () => false),
  LET: def(C, 'LET(name1, value1, [name2, value2, …], calculation)', 'Gives names to intermediate results, then calculates with them.', (args, ctx) => {
    const n = args.nodes.length
    if (n % 2 === 0) fail('#VALUE!', 'LET needs name/value pairs followed by a final calculation.')
    const scope = new Map(ctx.scope ?? [])
    for (let i = 0; i + 1 < n; i += 2) {
      const nameNode = args.nodes[i]
      if (nameNode.type !== 'name') fail('#NAME?', 'Argument ' + (i + 1) + ' of LET must be a name, such as x or total.')
      scope.set(nameNode.name, args[i + 1](scope))
    }
    return args[n - 1](scope)
  }, {
    min: 3, lazy: true,
    example: ['=LET(r, A1, PI()*r^2)', 'the area of a circle with radius A1'],
    learn: 'LET is how spreadsheets do variables. Naming a value once avoids repeating a long expression, makes the formula readable, and calculates the value only once.',
  }),
  LAMBDA: def(C, 'LAMBDA([parameter1, …], calculation)', 'Creates a function. Call it straight away, or pass it to MAP, REDUCE or BYROW.', (args, ctx) => {
    const n = args.nodes.length
    const params = args.nodes.slice(0, n - 1).map((p) => { if (p.type !== 'name') fail('#VALUE!', 'LAMBDA parameters must be names.'); return p.name })
    const body = args[n - 1]
    const outer = ctx.scope ?? new Map()
    const fn = (...values) => {
      const scope = new Map(outer)
      params.forEach((p, i) => scope.set(p, values[i] ?? null))
      return body(scope)
    }
    fn.params = params
    fn.isLambda = true
    return fn
  }, { min: 1, lazy: true, example: ['=MAP(A1:A5, LAMBDA(x, x*2))', 'each value doubled'], learn: 'LAMBDA brings functions, the core idea of programming, into the spreadsheet: a reusable calculation with named inputs.' }),
  MAP: def(C, 'MAP(array, lambda)', 'Applies a LAMBDA to every element of an array.', ([arr, fn]) => {
    if (typeof fn !== 'function') fail('#VALUE!', 'The last argument of MAP must be a LAMBDA.')
    return Matrix.of(arr).map((v) => attempt(() => fn(v)))
  }, { returnsArray: true }),
  REDUCE: def(C, 'REDUCE(initial_value, array, lambda)', 'Combines the elements of an array into one value with a LAMBDA(accumulator, value).', ([init, arr, fn]) => {
    if (typeof fn !== 'function') fail('#VALUE!', 'The last argument of REDUCE must be a LAMBDA.')
    let acc = init ?? 0
    for (const v of Matrix.of(arr).values()) acc = fn(acc, v)
    return acc
  }, { example: ['=REDUCE(0, A1:A5, LAMBDA(acc, x, acc + x^2))', 'the sum of squares'] }),
  SCAN: def(C, 'SCAN(initial_value, array, lambda)', 'Like REDUCE, but keeps every step: the accumulator after each element, in an array the shape of the input.', ([init, arr, fn]) => {
    if (typeof fn !== 'function') fail('#VALUE!', 'The last argument of SCAN must be a LAMBDA.')
    let acc = init ?? 0
    return Matrix.of(arr).map((v) => { acc = fn(acc, v); return acc })
  }, {
    returnsArray: true,
    example: ['=SCAN(0, A1:A5, LAMBDA(total, x, total + x))', 'the running total'],
    learn: 'SCAN is a loop that carries one value forward: a running total, a running maximum, or exponential smoothing, where each smoothed value is the last one moved part of the way to the new data point.',
  }),
  MAKEARRAY: def(C, 'MAKEARRAY(rows, columns, lambda)', 'Builds an array of the given size; the LAMBDA(row, column) gives each entry, counting from 1.', ([r, c, fn]) => {
    if (typeof fn !== 'function') fail('#VALUE!', 'The last argument of MAKEARRAY must be a LAMBDA.')
    const rows = Math.trunc(toNumber(r)), cols = Math.trunc(toNumber(c))
    if (!(rows >= 1 && cols >= 1)) fail('#VALUE!', 'MAKEARRAY needs at least one row and one column.')
    return new Matrix(Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => attempt(() => fn(i + 1, j + 1)))))
  }, { returnsArray: true, example: ['=MAKEARRAY(3, 3, LAMBDA(r, c, r*c))', 'a times table'] }),
  BYROW: def(C, 'BYROW(array, lambda)', 'Applies a LAMBDA to each row, giving one value per row.', ([arr, fn]) => {
    if (typeof fn !== 'function') fail('#VALUE!', 'BYROW needs a LAMBDA.')
    return new Matrix(Matrix.of(arr).rows.map((row) => [attempt(() => fn(new Matrix([row])))]))
  }, { returnsArray: true }),
  BYCOL: def(C, 'BYCOL(array, lambda)', 'Applies a LAMBDA to each column, giving one value per column.', ([arr, fn]) => {
    if (typeof fn !== 'function') fail('#VALUE!', 'BYCOL needs a LAMBDA.')
    const M = Matrix.of(arr)
    return new Matrix([Array.from({ length: M.width }, (_, c) => attempt(() => fn(new Matrix(M.rows.map((row) => [row[c]])))))])
  }, { returnsArray: true }),
}

export { flat, toNumber, typeName }
