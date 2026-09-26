// Tests for the progress-key migration that fixes a real, confirmed
// incident: course progress used to be keyed "<courseId>/<slug>" (built
// from the URL/filename), so renaming a lesson file silently orphaned
// every existing user's progress for it. This is what would have caught
// that regression automatically instead of needing a user report.

import { describe, it, expect } from 'vitest'
import {
  buildProgressKey,
  mergeProgress,
  migrateOldProgressKeys,
  migrateProgressKeyAliases,
  normalizeLessonProgress,
  mergeArrayUnion,
  mergeArrayUnionById,
  mergeKeyedObject,
  mergeMaxNumericObject,
  mergeNestedKeyedObject,
  mergeCalendarData,
  mergeBackendLabData,
  mergeLearningTime,
} from './progressMigration.ts'

describe('migrateOldProgressKeys', () => {
  const idLookup = {
    'ai-engineering/ae0-01-dev-environment': 'ae-p0-01-dev-environment', // not actually used below, just shape reference
    'ai-engineering/dev-environment': 'ae-p0-01-dev-environment',
    'sql-0/what-is-data': 'sql-0-007',
  }

  it('migrates every old-format entry to the new key', () => {
    const progress = {
      'ai-engineering/dev-environment': { completedCheckpoints: ['read-intuition'] },
      'sql-0/what-is-data': { completedCheckpoints: ['read-math'], readingProgress: 40 },
    }
    const { migrated, changed } = migrateOldProgressKeys(progress, idLookup)
    expect(changed).toBe(true)
    expect(migrated!['ai-engineering::ae-p0-01-dev-environment']).toEqual({ completedCheckpoints: ['read-intuition'] })
    expect(migrated!['sql-0::sql-0-007']).toEqual({ completedCheckpoints: ['read-math'], readingProgress: 40 })
    // old keys should not remain
    expect(migrated!['ai-engineering/dev-environment']).toBeUndefined()
    expect(migrated!['sql-0/what-is-data']).toBeUndefined()
  })

  it('merges an old-format entry into an existing new-format entry instead of overwriting it', () => {
    const progress = {
      'ai-engineering/dev-environment': {
        completedCheckpoints: ['read-intuition'],
        readingProgress: 30,
        quiz: { correct: 2, attempted: 3, total: 5, attemptedAt: 100 },
      },
      'ai-engineering::ae-p0-01-dev-environment': {
        completedCheckpoints: ['read-math'],
        readingProgress: 80,
        quiz: { correct: 4, attempted: 5, total: 5, attemptedAt: 200 },
      },
    }
    const { migrated, changed } = migrateOldProgressKeys(progress, idLookup)
    expect(changed).toBe(true)
    const merged = migrated!['ai-engineering::ae-p0-01-dev-environment']
    // checkpoints unioned, not dropped
    expect(new Set(merged.completedCheckpoints)).toEqual(new Set(['read-intuition', 'read-math']))
    // reading progress takes the max
    expect(merged.readingProgress).toBe(80)
    // later quiz attempt wins
    expect(merged.quiz!.attemptedAt).toBe(200)
    expect(migrated!['ai-engineering/dev-environment']).toBeUndefined()
  })

  it('leaves an unresolvable old-format entry untouched rather than dropping it', () => {
    const progress = {
      'some-course/some-lesson-that-no-longer-exists': { completedCheckpoints: ['x'] },
    }
    const { migrated, changed } = migrateOldProgressKeys(progress, idLookup)
    expect(changed).toBe(false)
    expect(migrated!['some-course/some-lesson-that-no-longer-exists']).toEqual({ completedCheckpoints: ['x'] })
  })

  it('is a no-op when everything is already new-format', () => {
    const progress = { 'ai-engineering::ae-p0-01-dev-environment': { completedCheckpoints: ['a'] } }
    const { migrated, changed } = migrateOldProgressKeys(progress, idLookup)
    expect(changed).toBe(false)
    expect(migrated).toEqual(progress)
  })

  it('handles an empty/null progress object', () => {
    expect(migrateOldProgressKeys(null, idLookup)).toEqual({ migrated: null, changed: false })
    expect(migrateOldProgressKeys({}, idLookup).changed).toBe(false)
  })
})

describe('migrateProgressKeyAliases', () => {
  const aliases = {
    'three-js::ambient-demo': 'three-js::three-js-3-0-lighting-equation',
  }

  it('moves progress saved under a bad generated id to the corrected lesson id', () => {
    const progress = {
      'three-js::ambient-demo': { completedCheckpoints: ['read-intuition'], readingProgress: 40 },
      'unrelated::lesson': { completedCheckpoints: ['keep-me'] },
    }
    const { migrated, changed } = migrateProgressKeyAliases(progress, aliases)
    expect(changed).toBe(true)
    expect(migrated!['three-js::ambient-demo']).toBeUndefined()
    expect(migrated!['three-js::three-js-3-0-lighting-equation']).toEqual(progress['three-js::ambient-demo'])
    expect(migrated!['unrelated::lesson']).toEqual(progress['unrelated::lesson'])
  })

  it('merges into progress already saved under the corrected id without losing data', () => {
    const progress = {
      'three-js::ambient-demo': {
        completedCheckpoints: ['old-key-checkpoint'],
        readingProgress: 70,
        quiz: { attemptedAt: 100 },
      },
      'three-js::three-js-3-0-lighting-equation': {
        completedCheckpoints: ['correct-key-checkpoint'],
        readingProgress: 20,
        quiz: { attemptedAt: 200 },
      },
    }
    const { migrated } = migrateProgressKeyAliases(progress, aliases)
    const repaired = migrated!['three-js::three-js-3-0-lighting-equation']
    expect(new Set(repaired.completedCheckpoints)).toEqual(new Set(['old-key-checkpoint', 'correct-key-checkpoint']))
    expect(repaired.readingProgress).toBe(70)
    expect(repaired.quiz!.attemptedAt).toBe(200)
  })

  it('preserves keys that have no safe alias', () => {
    const progress = { 'geometry::ScienceNotebook': { completedCheckpoints: ['ambiguous'] } }
    expect(migrateProgressKeyAliases(progress, aliases)).toEqual({ migrated: progress, changed: false })
  })
})

describe('normalizeLessonProgress', () => {
  it('handles an old route key and a bad generated id in one pass', () => {
    const progress = {
      'demo/intro': { completedCheckpoints: ['route'] },
      'demo::nested-id': { completedCheckpoints: ['bad-id'] },
      'demo::lesson-id': { completedCheckpoints: ['already-correct'] },
    }
    const { migrated, changed } = normalizeLessonProgress(
      progress,
      { 'demo/intro': 'lesson-id' },
      { 'demo::nested-id': 'demo::lesson-id' }
    )
    expect(changed).toBe(true)
    expect(migrated!['demo/intro']).toBeUndefined()
    expect(migrated!['demo::nested-id']).toBeUndefined()
    expect(new Set(migrated!['demo::lesson-id'].completedCheckpoints)).toEqual(
      new Set(['route', 'bad-id', 'already-correct'])
    )
  })
})

describe('buildProgressKey', () => {
  it('uses the new id-based scheme when the lesson has an id', () => {
    expect(buildProgressKey('geometry', { id: 'geo-1-001', slug: 'intro-geometry' })).toBe('geometry::geo-1-001')
  })

  it('falls back to the old slug-based scheme if id is somehow missing', () => {
    expect(buildProgressKey('geometry', { slug: 'intro-geometry' })).toBe('geometry/intro-geometry')
  })
})

describe('mergeProgress (whole-dictionary union, used both for migration and sign-in conflicts)', () => {
  it('unions checkpoints, takes max reading progress, keeps the later quiz attempt', () => {
    const local = { lesson1: { completedCheckpoints: ['a'], readingProgress: 20, quiz: { attemptedAt: 50 } } }
    const remote = { lesson1: { completedCheckpoints: ['b'], readingProgress: 60, quiz: { attemptedAt: 10 } } }
    const merged = mergeProgress(local, remote)
    expect(new Set(merged!.lesson1.completedCheckpoints)).toEqual(new Set(['a', 'b']))
    expect(merged!.lesson1.readingProgress).toBe(60)
    expect(merged!.lesson1.quiz!.attemptedAt).toBe(50)
  })

  it('never drops a lesson present only on one side', () => {
    const local = { onlyLocal: { completedCheckpoints: ['a'] } }
    const remote = { onlyRemote: { completedCheckpoints: ['b'] } }
    const merged = mergeProgress(local, remote)
    expect(merged!.onlyLocal).toBeDefined()
    expect(merged!.onlyRemote).toBeDefined()
  })
})

describe('generic sync-key merge strategies', () => {
  it('mergeArrayUnion unions primitive-value arrays without duplicates', () => {
    expect(new Set(mergeArrayUnion(['a', 'b'], ['b', 'c']))).toEqual(new Set(['a', 'b', 'c']))
  })

  it('mergeArrayUnionById dedupes by id instead of by reference (a plain Set union would not dedupe objects)', () => {
    const local = [{ id: 1, title: 'Local copy' }, { id: 2, title: 'Local only' }]
    const remote = [{ id: 1, title: 'Remote copy' }, { id: 3, title: 'Remote only' }]
    const merged = mergeArrayUnionById(local, remote)
    expect(merged).toHaveLength(3)
    expect(merged.map(p => p.id).sort()).toEqual([1, 2, 3])
  })

  it('mergeKeyedObject unions keys, never drops a key unique to either side', () => {
    const local = { formulaA: 'x+1', formulaB: 'y*2' }
    const remote = { formulaA: 'old', formulaC: 'z/3' }
    const merged = mergeKeyedObject(local, remote)
    expect(merged.formulaA).toBe('x+1') // local wins on conflict
    expect(merged.formulaB).toBe('y*2') // local-only survives
    expect(merged.formulaC).toBe('z/3') // remote-only survives
  })

  it('mergeKeyedObject falls back safely instead of corrupting when given an array by mistake', () => {
    // typeof [] === 'object' — a naive merge would silently turn this into {0: ..., 1: ...}
    expect(mergeKeyedObject(['a', 'b'], { x: 1 })).toEqual({ x: 1 })
    expect(mergeKeyedObject({ x: 1 }, ['a', 'b'])).toEqual({ x: 1 })
  })

  it('mergeMaxNumericObject never lets watch progress regress', () => {
    const local = { vid1: 20 } // this device is behind
    const remote = { vid1: 80, vid2: 50 }
    const merged = mergeMaxNumericObject(local, remote)
    expect(merged.vid1).toBe(80) // kept the higher value, did not downgrade to 20
    expect(merged.vid2).toBe(50)
  })

  it('mergeNestedKeyedObject merges within each group instead of one side shadowing the whole group', () => {
    const local = { mill: { T1: { diameter: 6 } } }
    const remote = { mill: { T2: { diameter: 10 } }, lathe: { T1: { diameter: 3 } } }
    const merged = mergeNestedKeyedObject(local, remote)
    expect(merged.mill.T1).toEqual({ diameter: 6 }) // local-only tool survives
    expect(merged.mill.T2).toEqual({ diameter: 10 }) // remote-only tool survives
    expect(merged.lathe.T1).toEqual({ diameter: 3 }) // remote-only group survives entirely
  })

  it('mergeCalendarData unions nested events by id instead of one side\'s whole events array shadowing the other', () => {
    const local = { events: [{ id: 'e1', title: 'Local event' }], notify: true }
    const remote = { events: [{ id: 'e2', title: 'Remote event' }], notify: false }
    const merged = mergeCalendarData(local, remote)
    expect(merged.events!.map(e => e.id).sort()).toEqual(['e1', 'e2'])
    expect(merged.notify).toBe(true) // local wins on the plain config field
  })

  it('mergeLearningTime takes the max instead of summing, so it can never lose time but also never double-counts', () => {
    expect(mergeLearningTime({ totalMs: 1000 }, { totalMs: 4000 }).totalMs).toBe(4000)
    expect(mergeLearningTime({ totalMs: 9000 }, { totalMs: 2000 }).totalMs).toBe(9000)
    expect(mergeLearningTime(null, { totalMs: 500 }).totalMs).toBe(500)
    expect(mergeLearningTime({ totalMs: 500 }, undefined).totalMs).toBe(500)
    expect(mergeLearningTime(null, null).totalMs).toBe(0)
  })
})
