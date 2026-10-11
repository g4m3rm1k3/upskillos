import { describe, it, expect } from 'vitest'
import { compile, Tracer, read } from './tracer.js'
import { PROGRAMS, ORIGINAL } from './programs/index.js'
import { analyse } from './analysis.js'
import { Runner } from './runner.js'
import { PIECES } from './pieces.js'
import { a2cUpdate, evaluate, encode } from './engine.js'

describe('the tracer', () => {
  const program = compile(`function run(data) {
  data.out = twice(3)
  while (true) {
    data.n = data.n + 1
  }
}

function twice(x) {
  const y = x * 2
  return y
}`)
  it('pauses before each line, steps into calls and back out', () => {
    const t = new Tracer(program, { n: 0 })
    expect(t.stepInto()).toMatchObject({ kind: 'enter', fn: 'run', line: 1 })
    expect(t.stepInto()).toMatchObject({ kind: 'line', fn: 'run', line: 2 })
    expect(t.stepInto()).toMatchObject({ kind: 'enter', fn: 'twice' })
    expect(read(t.stack.at(-1).vars.x).value).toBe(3)
    expect(t.stepInto()).toMatchObject({ kind: 'line', fn: 'twice', line: 9 })
    expect(t.stepInto()).toMatchObject({ kind: 'line', line: 10 })
    expect(read(t.stack.at(-1).vars.y).value).toBe(6)
    expect(t.stepOut()).toMatchObject({ kind: 'line', fn: 'run', line: 3 })
    expect(t.data.out).toBe(6)
  })
  it('steps over a call as one step', () => {
    const t = new Tracer(program, { n: 0 })
    t.stepInto(); t.stepInto()
    expect(t.stepOver()).toMatchObject({ kind: 'line', fn: 'run', line: 3 })
  })
  it('refuses the shapes it cannot trace, by line number', () => {
    expect(() => compile('function run(d) {\n  const a = 1 + f(2)\n}\n\nfunction f(x) {\n  return x\n}')).toThrow(/line 2/)
    expect(() => compile('function run(d) {\n  if (d) {\n  } else if (d) {\n  }\n}')).toThrow(/line 3/)
  })
})

describe('the programs are the tested engine, written to be read', () => {
  it('Q-learning: the supplied table balances, and its greedy choices match the engine\'s', () => {
    const r = new Runner('q', true)
    r.tracer.runUntil(() => r.games.length >= 2, 5e6)
    expect(r.games.slice(0, 2)).toEqual([500, 500])
    const table = PROGRAMS.q.makeData(true).Q
    const engine = evaluate('cartpole', s => { const row = table[encode('cartpole', s).index]; return row.indexOf(Math.max(...row)) }, [7])
    expect(engine[0].steps).toBe(500)
  })
  it('A2C: one update from the program equals the engine\'s update on the same batch', () => {
    const r = new Runner('a2c', true); r.data.learning = true
    let batch
    r.tracer.runUntil(e => e.kind === 'enter' && e.fn === 'updateWeights' && (batch = read(r.stack.at(-1).vars.batch).value), 1e7)
    const net = { actor: [...r.data.actorWeights], critic: [...r.data.criticWeights] }
    a2cUpdate(net, batch.map(tr => tr.map(s => ({ ...s, next: s.nextState }))), { gamma: .99, actorRate: .01, criticRate: .02, entropy: .01 })
    r.tracer.stepOut()
    expect(r.data.actorWeights).toEqual(net.actor)
    expect(r.data.criticWeights).toEqual(net.critic)
  })
  it('Next action moves the drawn cart by exactly one physics step', () => {
    for (const id of ['q', 'a2c']) {
      const r = new Runner(id, true)
      r.nextAction(); const a = r.drawn; r.nextAction()
      expect(r.ghost).toBe(a); expect(r.drawn).not.toBe(a)
      expect(r.event.kind).toBe('line')
    }
  })
})

describe('"with this step\'s numbers" is exactly what the line then does', () => {
  // Run each program; at every line with a calculation, work it out, run the line, and compare.
  const verify = (id, supplied, data, events) => {
    const r = new Runner(id, supplied, { data }), info = r.info, C = info.constantValues
    let checked = 0, e = r.tracer.stepInto()
    while (r.tracer.count < events) {
      const x = e.kind === 'line' && info.extra[e.line]
      if (!x?.calc) { e = r.tracer.stepInto(); continue }
      const frame = r.stack.at(-1), depth = r.stack.length, line = e.line, text = info.lines[line - 1].trim()
      const values = () => Object.fromEntries(Object.entries(frame.vars).map(([n, t]) => [n, read(t)?.value]))
      const before = values()
      const [shown, result] = x.calc(before, C)
      expect(typeof shown, text).toBe('string')
      // Where the line writes: a plain name is read afterwards; an element (a[j], data.Q[r][c]) is
      // located with the indices as they were before the line ran (a loop may change j next).
      const lhs = text.replace(/^(?:const|let) /, '').split(/\s=(?!=)/)[0].trim()
      const live = Object.fromEntries(Object.entries(frame.vars).map(([n, t]) => { try { return [n, t()] } catch { return [n, undefined] } }))
      const target = /^(if|return) |^\w+$/.test(lhs) ? null : new Function(...Object.keys(live), `return () => ${lhs}`)(...Object.values(live))
      e = r.tracer.stepOver()
      let actual
      if (/^(if|} else if) /.test(text)) actual = r.stack.length === depth && e.kind === 'line' && e.line === line + 1
      else if (/^return /.test(text)) { expect(e.kind, text).toBe('return'); actual = e.value }
      else actual = target ? target() : values()[lhs]
      if (typeof result === 'number') expect(actual, `${id} line ${line}: ${text}`).toBeCloseTo(result, 10)
      else expect(actual, `${id} line ${line}: ${text}`).toEqual(result)
      checked++
    }
    return checked
  }
  it('Q-learning, learning from zero', () => { expect(verify('q', false, { alpha: .5, gamma: .9 }, 20000)).toBeGreaterThan(1000) })
  it('Q-learning, the trained table', () => { expect(verify('q', true, {}, 8000)).toBeGreaterThan(400) })
  it('A2C, learning', () => { expect(verify('a2c', true, { learning: true }, 25000)).toBeGreaterThan(2000) })
  for (const id of ['q', 'a2c']) it(`${id}: every calculation and phase matches a line`, () => {
    for (const [name, fn] of Object.entries(PROGRAMS[id].info.functions)) expect(fn.unmatchedExtras.map(x => x.has), name).toEqual([])
  })
})

describe('origins and phases', () => {
  it('records the line that last gave each value its value', () => {
    const r = new Runner('q', false, { data: { alpha: .5 } })
    r.runUntil(e => e.kind === 'line' && r.info.lines[e.line - 1].includes('const error = target - old'))
    const origins = r.stack.at(-1).origins
    expect(r.info.lines[origins.target.line - 1]).toContain('const target =')
    expect(r.info.lines[origins.row.line - 1]).toContain('function learn')
    r.runUntil(e => e.kind === 'line' && r.info.lines[e.line - 1].includes('data.steps = data.steps + 1'))
    r.stepOver()
    expect(r.info.lines[r.dataOrigins.steps.line - 1]).toContain('data.steps = data.steps + 1')
  })
  it('knows which part of the loop is running, and can run to a part', () => {
    const r = new Runner('q', true)
    expect(r.runToPhase('learn')).toBe(true)
    expect(r.phase).toBe('learn')
    expect(r.stack.some(f => f.fn === 'run' && r.info.lines[f.line - 1].includes('learn('))).toBe(true)
    const a = new Runner('a2c', true, { data: { learning: true } })
    expect(a.runToPhase('learn')).toBe(true)
    expect(a.info.lines[a.stack.at(-1).line - 1]).toContain('if (data.learning)')
    a.stepOver()
    expect(a.info.lines[a.stack.at(-1).line - 1]).toContain('updateWeights(data, batch)')
  })
})

describe('edited programs', () => {
  it('runs a learner\'s edit, and reports an untraceable edit by line number', () => {
    const edited = ORIGINAL.q.replace('reward: 1,', 'reward: 2,')
    const r = new Runner('q', false, { source: edited, data: { alpha: .5 } })
    r.runUntil(e => e.kind === 'line' && r.info.lines[e.line - 1].includes('const error'))
    expect(read(r.stack.at(-1).vars.target).value).toBe(2)
    expect(r.def.edited).toBe(true)
    expect(() => new Runner('q', false, { source: ORIGINAL.q.replace('const old = data.Q[row][action]', 'const old = 1 + stateToRow(result.nextState)') })).toThrow(/line \d+/)
  })
})

describe('every line, function and name is explained, and the notes still match the code', () => {
  for (const [id, def] of Object.entries(PROGRAMS)) {
    const info = analyse(def.program, def.explain)
    const { FUNCTIONS, VARS, DATA } = def.explain
    it(`${id}: every statement inside a function has its own note`, () => {
      for (const [name, fn] of Object.entries(info.functions)) {
        expect(fn.unmatched.map(n => n.has), `${name}: notes that match no line`).toEqual([])
        for (let n = fn.start + 1; n < fn.end; n++) {
          const text = info.lines[n - 1].trim()
          if (!text || /^}( else \{)?$/.test(text)) continue
          expect(info.notes[n], `${name}, line ${n}: ${text}`).toBeTruthy()
        }
      }
    })
    it(`${id}: every function says what its inputs are, and every name has a meaning`, () => {
      for (const [name, fn] of Object.entries(info.functions)) {
        expect(FUNCTIONS[name], name).toBeTruthy()
        expect(FUNCTIONS[name].inputs.map(i => i[0]), name).toEqual(fn.params)
        for (const p of fn.params) expect(VARS[p], `${name}(${p})`).toBeTruthy()
      }
      for (const text of info.lines) {
        for (const m of text.matchAll(/^\s*(?:const|let) (\w+)/g)) expect(VARS[m[1]], m[1]).toBeTruthy()
        for (const m of text.matchAll(/^\s*(?:const|let) \[([^\]]+)\]/g)) for (const n of m[1].split(',')) expect(VARS[n.trim()], n).toBeTruthy()
        for (const m of text.matchAll(/for \((?:let|const) (\w+)/g)) expect(VARS[m[1]], m[1]).toBeTruthy()
      }
    })
    it(`${id}: every maths link and data entry exists`, () => {
      const data = def.makeData(true)
      for (const note of Object.values(def.explain.LINES).flat()) if (note.piece) expect(PIECES[note.piece], note.piece).toBeTruthy()
      for (const f of Object.values(FUNCTIONS)) if (f.piece) expect(PIECES[f.piece], f.piece).toBeTruthy()
      for (const key of Object.keys(DATA)) expect(key in data, key).toBe(true)
    })
  }
})
