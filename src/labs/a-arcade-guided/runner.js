// One run of a program: the tracer, the data, and what the panels need that the program itself
// doesn't keep: the lines run so far, game lengths, where the cart was a step ago, the inputs each
// function last received, which stored data the last command changed, which line last changed
// each value (its origin), and which part of the agent-environment loop is running (its phase).
import { PROGRAMS, makeDef } from './programs/index.js'
import { Tracer, copy, read } from './tracer.js'
import { assigned } from './analysis.js'

export class Runner {
  // options: { source } runs an edited program; { data } overrides starting values (alpha, gamma, …).
  constructor(id = 'q', supplied = true, options = {}) {
    this.id = id; this.supplied = supplied; this.options = options
    this.def = options.source ? makeDef(id, options.source) : PROGRAMS[id]
    this.data = this.def.makeData(supplied, options.data)
    this.history = []; this.games = []; this.lastCalls = {}
    this.ghost = undefined; this.lastDrawn = undefined; this.lastSteps = 0
    this.changes = { keys: new Set(), detail: [] }
    this.dataOrigins = {}
    this.tracer = new Tracer(this.def.program, this.data, { onEvent: e => this.seen(e) })
  }
  get started() { return this.tracer.count > 0 }
  get event() { return this.tracer.event }
  get stack() { return this.tracer.stack }
  get drawn() { return this.def.drawn(this.data) }
  get info() { return this.def.info }

  seen(e) {
    const top = this.stack.at(-1)
    if (e.kind !== 'return') {
      this.history.push({ fn: e.fn, line: e.line, depth: this.stack.length, kind: e.kind })
      if (this.history.length > 80) this.history.shift()
    }
    if (e.kind === 'enter') {
      this.lastCalls[e.fn] = top.vars
      top.origins = Object.fromEntries(this.info.functions[e.fn].params.map(p => [p, { line: e.line, count: this.tracer.count }]))
    } else if (top.done) {
      // The line this function just finished: record what it gave a value to.
      const { names, data } = assigned(this.info.lines[top.done - 1])
      for (const name of names) top.origins[name] = { line: top.done, count: this.tracer.count }
      for (const key of data) this.dataOrigins[key] = { line: top.done, fn: top.fn, count: this.tracer.count }
    }
    const drawn = this.def.drawn(this.data)
    if (drawn !== this.lastDrawn) { this.ghost = this.lastDrawn; this.lastDrawn = drawn }
    const steps = this.def.steps(this.data) ?? 0
    if (steps === 0 && this.lastSteps > 0) { this.games.push(this.lastSteps); if (this.games.length > 40) this.games.shift() }
    this.lastSteps = steps
  }

  // Which part of the loop is running: the phase of the line the loop (or a world's steps) is on.
  get phase() {
    let phase = null
    for (const frame of this.stack) if (this.def.orchestrators.includes(frame.fn)) phase = this.info.extra[frame.line]?.phase ?? phase
    return phase
  }

  // Everything the panels show at this moment, copied, so it can be shown again later (Step back).
  // It has the same shape the panels read from a live runner: each variable is still a function,
  // now returning the copied value (or throwing, as a not-yet-set variable does).
  snapshot() {
    const data = copy(this.data)
    const frozen = vars => Object.fromEntries(Object.entries(vars).map(([name, thunk]) => {
      if (name === 'data') return [name, () => data]
      const got = read(thunk)
      return [name, got ? () => got.value : () => { throw new Error('not set') }]
    }))
    return {
      id: this.id, def: this.def, info: this.info, data, started: this.started, event: this.event, phase: this.phase,
      stack: this.stack.map(f => ({ fn: f.fn, line: f.line, vars: frozen(f.vars), origins: { ...f.origins } })),
      dataOrigins: { ...this.dataOrigins },
      drawn: copy(this.drawn), ghost: copy(this.ghost),
      changes: this.changes, history: this.history.slice(-14), games: [...this.games],
      lastCalls: Object.fromEntries(Object.entries(this.lastCalls).map(([fn, vars]) => [fn, frozen(vars)])),
      tracer: { count: this.tracer.count },
    }
  }

  // Every command records which stored data it changed, for the highlights on the right.
  command(fn) {
    const before = copy(this.data)
    const result = fn()
    this.changes = diff(before, this.data)
    return result
  }
  stepInto() { return this.command(() => this.tracer.stepInto()) }
  stepOver() { return this.command(() => this.tracer.count === 0 ? this.tracer.stepInto() : this.tracer.stepOver()) }
  stepOut() { return this.command(() => this.stack.length > 1 ? this.tracer.stepOut() : this.tracer.stepOver()) }
  // Run until the drawn cart has moved `times` times (one physics step each).
  nextAction(times = 1) {
    return this.command(() => {
      for (let k = 0; k < times; k++) {
        const from = this.drawn
        this.tracer.runUntil(() => this.drawn !== from && this.drawn !== undefined)
      }
      // Stop on the first real line of the next step: not a function's entry, and not the loop's
      // header (which every step passes through, so stopping there looks like nothing happened).
      const header = e => /^\s*(for|while) /.test(this.info.lines[e.line - 1])
      if (this.event?.kind !== 'line' || header(this.event)) this.tracer.runUntil(e => e.kind === 'line' && !header(e))
    })
  }
  // Run until a given line is about to run (false if it doesn't come within `limit` pauses).
  runToLine(line, limit = 2e6) {
    return this.command(() => !!this.tracer.runUntil(e => e.kind === 'line' && e.line === line, limit))
  }
  // Run until the loop reaches a given phase (after leaving the current one).
  runToPhase(phase, limit = 2e6) {
    return this.command(() => {
      if (this.phase === phase) this.tracer.runUntil(() => this.phase !== phase, limit)
      return !!this.tracer.runUntil(e => e.kind === 'line' && this.phase === phase, limit)
    })
  }
  runUntil(predicate, limit = 2e6) { return this.command(() => this.tracer.runUntil(e => predicate(e, this), limit)) }
}

// The paths in `data` whose values differ, e.g. Q[165][1] or actorWeights[2].
export function diff(before, after) {
  const keys = new Set(), detail = []
  const walk = (a, b, path, key) => {
    if (Array.isArray(b) || (b && typeof b === 'object')) {
      if (a === undefined || a === null) { keys.add(key); detail.push({ path, before: a, after: b }); return }
      for (const k of Object.keys(b)) walk(a?.[k], b[k], `${path}${Array.isArray(b) ? `[${k}]` : `.${k}`}`, key)
      return
    }
    if (a !== b) { keys.add(key); if (detail.length < 12) detail.push({ path, before: a, after: b }) }
  }
  for (const key of Object.keys(after)) walk(before[key], after[key], key, key)
  return { keys, detail }
}
