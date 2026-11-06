// Every level file: valid, its solution passes the final step and the hidden ship check, its
// starting code fails the check, and its world runs with the solution's answers.
import { describe, expect, it } from 'vitest'
import { LEVELS, LEVEL_PROBLEMS, validateLevel } from './levels.js'
import { allPassed, directCaller, runCases } from './checks.js'
import { compile } from './compile.js'
import { WORLDS } from './worlds/index.js'
import { readSave, withLevel, writeSave, importSave } from './save.js'

function seeded(seed = 7) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

describe('Live Machine levels', () => {
  it('all level files are valid', () => {
    expect(LEVEL_PROBLEMS).toEqual([])
    expect(LEVELS.length).toBeGreaterThan(0)
  })

  it('level ids are unique', () => {
    const ids = LEVELS.map(l => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('reports missing fields readably', () => {
    expect(validateLevel({ id: 'x' }).length).toBeGreaterThan(3)
  })

  for (const level of LEVELS) {
    describe(level.id, () => {
      it('solution compiles and passes the last step and the ship check', async () => {
        const out = await compile(level.solution, level.language)
        expect(out.errors).toEqual([])
        const call = directCaller(out.code, level.entry)
        expect(allPassed(await runCases(call, level.steps.at(-1).goal.cases))).toBe(true)
        expect(allPassed(await runCases(call, level.check.cases))).toBe(true)
      })

      it('starting code compiles but fails the ship check', async () => {
        const out = await compile(level.starter, level.language)
        expect(out.errors).toEqual([])
        const call = directCaller(out.code, level.entry)
        expect(allPassed(await runCases(call, level.check.cases))).toBe(false)
      })

      it('each step\'s goal is not already met by the starting code', async () => {
        const out = await compile(level.starter, level.language)
        const call = directCaller(out.code, level.entry)
        for (const step of level.steps) expect(allPassed(await runCases(call, step.goal.cases)), step.id).toBe(false)
      })

      it('its world runs 300 ticks on the solution', async () => {
        const world = WORLDS[level.world]
        const out = await compile(level.solution, level.language)
        const call = directCaller(out.code, level.entry)
        const rand = seeded()
        let w = world.create(rand)
        for (let i = 0; i < 300; i++) w = world.advance(w, await call(world.inputs(w)), rand)
        expect(w.tick).toBe(300)
        expect(world.stats(w).length).toBeGreaterThan(0)
      })
    })
  }
})

describe('lights world', () => {
  it('drains power with every light on and blacks out', () => {
    const { create, advance, inputs } = WORLDS.lights
    const rand = seeded(3)
    let w = create(rand)
    for (let i = 0; i < 60; i++) w = advance(w, inputs(w).map(() => ({ ok: true, value: true })), rand)
    expect(w.blackout).toBe(true)
    expect(w.rooms.every(r => !r.lit)).toBe(true)
  })

  it('compile reports a syntax error with its line', async () => {
    const out = await compile('function lightOn(room) {\n  return (\n}', 'javascript')
    expect(out.ok).toBe(false)
    expect(out.errors[0].line).toBeGreaterThan(1)
  })
})

describe('save', () => {
  it('round-trips through storage and export', () => {
    const store = new Map()
    const storage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) }
    const s = withLevel(readSave(storage), 'lm-x', { code: 'abc', step: 2 })
    writeSave(s, storage)
    expect(readSave(storage).levels['lm-x'].step).toBe(2)
    expect(importSave(JSON.stringify(s)).current).toBe('lm-x')
    expect(() => importSave('{"nope":1}')).toThrow()
  })
})
