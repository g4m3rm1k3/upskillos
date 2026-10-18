// @vitest-environment happy-dom
// Progress: one synced key, cleaned on read, merged across devices without ever un-doing anything,
// and passed code becoming the learner's toolbox.
import { afterEach, describe, expect, it } from 'vitest'
import { STORE, readLesson, writeLesson, myPieces, lessonDone, clean } from './progress.js'
import { mergeMlFoundations, SYNC_MERGE_STRATEGIES } from '../../context/progressMigration.ts'
import { LESSONS, PIECE_OF } from './lessons/index.js'

afterEach(() => localStorage.clear())

describe('progress', () => {
  it('lives in one key that the account sync knows how to merge', async () => {
    writeLesson('maps', { stages: { try: true }, checks: ['a'], code: { 'maps-parse': { code: 'x', passed: true, hints: 1 } } })
    expect(Object.keys(JSON.parse(localStorage.getItem(STORE)))).toEqual(['maps'])
    expect(SYNC_MERGE_STRATEGIES[STORE]).toBe(mergeMlFoundations)
    const src = await import('../../context/AuthContext.jsx?raw').then(m => m.default)
    expect(src).toContain(`'${STORE}'`)
  })
  it('drops junk when reading', () => {
    localStorage.setItem(STORE, JSON.stringify({ maps: { stages: { try: 'yes', watch: true }, checks: ['a', 'a', 3], code: { x: { code: 5 }, y: { code: 'ok', passed: 'true' } } } }))
    expect(readLesson('maps')).toEqual({ stages: { watch: true }, checks: ['a'], code: { y: { code: 'ok', passed: false, hints: 0, shown: false } } })
  })
  it('merging never un-does a stage, a check or a pass', () => {
    const local = { maps: { stages: { try: true }, checks: ['a'], code: { c1: { code: 'new draft', passed: false }, c2: { code: 'mine', passed: true } } } }
    const remote = { maps: { stages: { watch: true }, checks: ['b'], code: { c1: { code: 'passed there', passed: true }, c3: { code: 'z', passed: false } } }, moves: { stages: { try: true }, checks: [], code: {} } }
    const m = mergeMlFoundations(local, remote)
    expect(m.maps.stages).toEqual({ try: true, watch: true })
    expect(m.maps.checks.sort()).toEqual(['a', 'b'])
    expect(m.maps.code.c1).toEqual({ code: 'passed there', passed: true })
    expect(m.maps.code.c2.passed).toBe(true)
    expect(m.maps.code.c3).toBeTruthy()
    expect(m.moves).toBeTruthy()
  })
  it('a passed challenge becomes that piece in the toolbox; a failed or fix-it one does not', () => {
    const all = { maps: clean({ code: { 'maps-parse': { code: 'def parse_map(t): ...', passed: true }, 'maps-moves': { code: 'def legal_moves(m, c): ...', passed: false }, 'maps-fix-grid': { code: 'def legal_moves_grid(): ...', passed: true } } }) }
    expect(myPieces(all, PIECE_OF)).toEqual({ parse_map: 'def parse_map(t): ...' })
  })
  it('a lesson is done when all its challenges pass', () => {
    const lesson = LESSONS.maps
    const passAll = { stages: {}, checks: [], code: Object.fromEntries(lesson.challenges.map(c => [c.id, { code: '', passed: true }])) }
    expect(lessonDone(lesson, clean(passAll))).toBe(true)
    expect(lessonDone(lesson, clean({ code: { [lesson.challenges[0].id]: { code: '', passed: true } } }))).toBe(false)
    expect(lessonDone(LESSONS.finish, clean({ stages: { keep: true } }))).toBe(true)
  })
})
