// Runs a program written in plain JavaScript one line at a time.
//
// compile() rewrites each function of the program into a generator that pauses ("yields") just
// before each of its lines runs, reporting the line number and the function's variables. Calls to
// the program's own functions become `yield*`, so stepping can go into them. Nothing else changes:
// the lines that run are exactly the lines shown in the code panel.
//
// The program must keep to a simple shape, which compile() checks and reports by line number:
// one statement per line inside functions; a call to one of the program's own functions only at
// the start of a line, after "=", or after "return"; and `} else {` rather than `} else if`.
// Functions listed in `helpers` run normally and are never stepped into.

export function compile(source, { helpers = [] } = {}) {
  const lines = source.split('\n')
  const names = [...source.matchAll(/^function (\w+)\(/gm)].map(m => m[1])
  const traced = names.filter(name => !helpers.includes(name))
  const callPattern = traced.length ? new RegExp(`\\b(${traced.join('|')})\\(`, 'g') : null
  const out = []
  let inside = null, scope = []

  const thunks = () => {
    const unique = [...new Map(scope.map(v => [v.name, v])).keys()]
    return `({ ${unique.map(name => `${name}: () => ${name}`).join(', ')} })`
  }
  const calls = (text, number) => callPattern ? text.replace(callPattern, (match, name, offset) => {
    const before = text.slice(0, offset)
    if (/(^\s*|[^=!<>]=\s*|return\s+)$/.test(before)) return `yield* ${name}(`
    throw new Error(`line ${number}: call ${name}() at the start of a line, after "=", or after "return"`)
  }) : text

  lines.forEach((text, index) => {
    const number = index + 1
    const indent = text.match(/^ */)[0].length
    const trimmed = text.trim()
    const head = /^function (\w+)\((.*)\) \{$/.exec(text)
    if (head) {
      if (!traced.includes(head[1])) { inside = null; out.push(text); return }
      inside = head[1]
      scope = head[2].split(',').map(s => s.trim()).filter(Boolean).map(name => ({ name, indent: 2 }))
      out.push(`function* ${inside}(${head[2]}) { yield __rt.enter(${JSON.stringify(inside)}, ${number}, ${thunks()}); try {`)
      return
    }
    if (inside === null) { out.push(text); return }
    if (text === '}') { out.push(`yield __rt.returned(${number}, undefined) } finally { __rt.exit() } }`); inside = null; return }
    scope = scope.filter(v => v.indent <= indent)
    if (!trimmed || trimmed.startsWith('//') || /^}( else \{)?$/.test(trimmed)) { out.push(text); return }
    if (/^} else if/.test(trimmed)) throw new Error(`line ${number}: write "} else {" and an "if" inside it, not "} else if"`)
    const code = calls(text, number)
    if (/^(for|while) .*\{$/.test(trimmed)) {
      // A loop reports its header line at the start of every pass, with the loop variable in view.
      for (const m of trimmed.matchAll(/^for \((?:let|const) (\w+)/g)) scope.push({ name: m[1], indent: indent + 2 })
      out.push(`${code} yield __rt.line(${number}, ${thunks()});`)
      return
    }
    const ret = /^\s*return(?: (.*))?$/.exec(code)
    if (ret) {
      out.push(`yield __rt.line(${number}, ${thunks()}); { const __result = ${ret[1] ?? 'undefined'}; yield __rt.returned(${number}, __result); return __result }`)
      return
    }
    out.push(`yield __rt.line(${number}, ${thunks()}); ${code.trim()}`)
    for (const name of declared(trimmed)) scope.push({ name, indent })
  })

  return {
    source, lines, traced, helpers,
    // Instantiate the program against a runtime: returns its functions (generators for traced ones).
    load(runtime) {
      return new Function('__rt', `${out.join('\n')}\nreturn { ${names.join(', ')} }`)(runtime)
    },
  }
}

function declared(statement) {
  const single = /^(?:const|let) (\w+)/.exec(statement)
  if (single) return [single[1]]
  const list = /^(?:const|let) \[([^\]]+)\]/.exec(statement)
  return list ? list[1].split(',').map(s => s.trim()) : []
}

// Holds the call stack while a compiled program runs, and turns each pause into an event.
export function createRuntime() {
  const stack = []
  return {
    stack,
    // `done` is the line this function finished just before this pause (null right after entering).
    enter(fn, line, vars) { stack.push({ fn, line, start: line, vars, entered: true, done: null }); return { kind: 'enter', fn, line } },
    line(line, vars) { const top = stack.at(-1); top.done = top.entered ? null : top.line; top.line = line; top.vars = vars; top.entered = false; return { kind: 'line', fn: top.fn, line } },
    returned(line, value) { const top = stack.at(-1); top.done = top.line === line ? null : top.line; top.line = line; top.returned = { value }; return { kind: 'return', fn: top.fn, line, value } },
    exit() { stack.pop() },
  }
}

// A variable's current value, copied so later changes can't alter what was shown. A variable whose
// line hasn't run yet (or whose block has ended) has no value.
export function read(thunk) {
  try { return { value: copy(thunk()) } } catch { return null }
}

export function copy(value) {
  if (Array.isArray(value)) return value.map(copy)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, copy(v)]))
  return value
}

// Drives a compiled program: one event per pause, plus the stepping commands a debugger has.
export class Tracer {
  constructor(program, data, { onEvent } = {}) {
    this.runtime = createRuntime()
    this.functions = program.load(this.runtime)
    this.data = data
    this.generator = this.functions.run(data)
    this.event = null
    this.count = 0
    this.onEvent = onEvent
  }
  get stack() { return this.runtime.stack }
  next() {
    const { value, done } = this.generator.next()
    if (done) throw new Error('run() finished')
    this.event = value; this.count++
    this.onEvent?.(value, this)
    return value
  }
  // Step into: the very next pause, wherever it is.
  stepInto() { return this.next() }
  // Step over: run until the next line at this depth or shallower (calls on this line run in full).
  stepOver(limit = 1e6) {
    const depth = this.stack.length
    for (let i = 0; i < limit; i++) {
      const e = this.next()
      if (this.stack.length <= depth && e.kind !== 'enter') return e
    }
  }
  // Step out: run until this function has returned to its caller.
  stepOut(limit = 1e6) {
    const depth = this.stack.length
    for (let i = 0; i < limit; i++) {
      const e = this.next()
      if (this.stack.length < depth && e.kind === 'line') return e
    }
  }
  // Run until `until()` becomes true (checked after every pause).
  runUntil(until, limit = 1e6) {
    for (let i = 0; i < limit; i++) { const e = this.next(); if (until(e)) return e }
  }
}
