// Builds the stable progress key for a lesson object that has an `id` field
// (e.g. from courseLoader.js's getChapters()/getAllChapters(), which now
// includes it). Falls back to the old route-derived shape only if `id` is
// somehow missing — shouldn't happen (every real lesson file has one,
// confirmed), but better than producing an unusable key.

export interface QuizState {
  correct?: number
  attempted?: number
  total?: number
  attemptedAt?: number
}

export interface LessonProgress {
  completedCheckpoints?: string[]
  readingProgress?: number
  quiz?: QuizState
  [key: string]: unknown
}

export type ProgressMap = Record<string, LessonProgress>

export type IdLookup = Record<string, string>

export function buildProgressKey(courseId: string, lesson?: { id?: string; slug?: string } | null): string {
  return lesson?.id ? `${courseId}::${lesson.id}` : `${courseId}/${lesson?.slug ?? ''}`
}

// Pure, side-effect-free progress merge/migration logic — shared by
// AuthContext.jsx (sign-in conflict resolution) and ProgressContext.jsx
// (one-time old-key migration), and unit-tested directly in
// progressMigration.test.ts without needing to import Firebase or mount a
// React context.

// Course progress is accumulative — checkpoints are never un-done. Union
// both versions so no work is ever lost, regardless of which device/key was
// newer. Operates on whole `{ [lessonKey]: {...} }` dictionaries.
export function mergeProgress(local: ProgressMap | null | undefined, remote: ProgressMap | null | undefined): ProgressMap | null {
  if (!local && !remote) return null
  if (!local) return remote ?? null
  if (!remote) return local ?? null
  const merged: ProgressMap = { ...remote }
  for (const [id, localLesson] of Object.entries(local)) {
    if (!merged[id]) {
      merged[id] = localLesson
      continue
    }
    const r = merged[id]
    merged[id] = {
      ...r,
      completedCheckpoints: [
        ...new Set([...(r.completedCheckpoints ?? []), ...(localLesson.completedCheckpoints ?? [])]),
      ],
      readingProgress: Math.max(r.readingProgress ?? 0, localLesson.readingProgress ?? 0),
      // Keep whichever quiz attempt is more recent
      quiz: ((localLesson.quiz?.attemptedAt ?? 0) > (r.quiz?.attemptedAt ?? 0))
        ? localLesson.quiz
        : r.quiz,
    }
  }
  return merged
}

// Progress used to be keyed "<courseId>/<slug>" — built entirely from the
// URL (folder/file names), so renaming a lesson file silently orphaned every
// existing user's progress for it (confirmed real incident: the
// ai-engineering course rename). The new key is "<courseId>::<lesson.id>",
// namespaced by course because lesson ids are NOT globally unique (confirmed
// real collisions, e.g. "ch3-001" exists in both calculus and precalculus).
//
// This migrates every old-format entry it can resolve via idLookup (built by
// courseLoader.js's getLessonIdLookup(), mapping "<courseId>/<slug>" -> id),
// merging into any existing new-format entry for the same lesson rather than
// overwriting it. Entries it can't resolve (lesson genuinely gone, or
// already-unrecognized key shapes) are left untouched — never dropped.
export function migrateOldProgressKeys(
  progress: ProgressMap | null | undefined,
  idLookup: IdLookup
): { migrated: ProgressMap | null | undefined; changed: boolean } {
  if (!progress) return { migrated: progress, changed: false }
  let changed = false
  let result: ProgressMap = {}

  // Carry forward everything already in the new format first.
  for (const [key, value] of Object.entries(progress)) {
    if (key.includes('::')) result[key] = value
  }

  // Migrate old-format ("<courseId>/<slug>") entries, merging into whatever
  // is already at the destination key (from the pass above, or from an
  // earlier old-format entry that mapped to the same lesson).
  for (const [key, value] of Object.entries(progress)) {
    if (key.includes('::')) continue
    const slashIdx = key.indexOf('/')
    if (slashIdx === -1) { result[key] = value; continue } // unrecognized shape — leave alone
    const courseId = key.slice(0, slashIdx)
    const slug = key.slice(slashIdx + 1)
    const id = idLookup[`${courseId}/${slug}`]
    if (!id) { result[key] = value; continue } // can't resolve — leave the old entry alone, don't drop it
    const newKey = `${courseId}::${id}`
    changed = true
    result = mergeProgress({ [newKey]: value }, result) ?? result
  }

  return { migrated: result, changed }
}

// The first generated lesson-id map accidentally read the first textual `id:` in a lesson
// file. In some lessons that belonged to a notebook, quiz answer, or code sample. A deployed
// v1 migration could therefore have moved valid route-keyed progress onto one of those bad
// ids. Apply a small, explicit alias table so those records follow the corrected lesson id.
// Unknown and ambiguous keys are deliberately left untouched.
export function migrateProgressKeyAliases(
  progress: ProgressMap | null | undefined,
  aliases: Record<string, string>
): { migrated: ProgressMap | null | undefined; changed: boolean } {
  if (!progress) return { migrated: progress, changed: false }

  let changed = false
  let result: ProgressMap = { ...progress }
  for (const [oldKey, newKey] of Object.entries(aliases)) {
    const oldValue = result[oldKey]
    if (!oldValue || oldKey === newKey) continue

    const existing = result[newKey]
    const merged = mergeProgress(
      { [newKey]: oldValue },
      existing ? { [newKey]: existing } : null
    )
    if (merged?.[newKey]) result[newKey] = merged[newKey]
    delete result[oldKey]
    changed = true
  }
  return { migrated: result, changed }
}

// When two lessons in one course shared an id, their progress was saved under one key and
// cannot be told apart. Giving one lesson a new id would drop its learners' progress, so the
// shared record is copied to the new key and also kept for the lesson that keeps the old id.
// Learners see what they saw before (both lessons as far along as the shared record says).
export function copyProgressKeys(
  progress: ProgressMap | null | undefined,
  splits: Record<string, string[]>
): { migrated: ProgressMap | null | undefined; changed: boolean } {
  if (!progress) return { migrated: progress, changed: false }
  let changed = false
  const result: ProgressMap = { ...progress }
  for (const [oldKey, newKeys] of Object.entries(splits)) {
    const value = progress[oldKey]
    if (!value) continue
    for (const newKey of newKeys) {
      const merged = mergeProgress({ [newKey]: value }, result[newKey] ? { [newKey]: result[newKey] } : null)
      if (merged?.[newKey]) { result[newKey] = merged[newKey]; changed = true }
    }
  }
  return { migrated: result, changed }
}

export function normalizeLessonProgress(
  progress: ProgressMap | null | undefined,
  idLookup: IdLookup,
  aliases: Record<string, string>
): { migrated: ProgressMap | null | undefined; changed: boolean } {
  const routeMigration = migrateOldProgressKeys(progress, idLookup)
  const idRepair = migrateProgressKeyAliases(routeMigration.migrated, aliases)
  return {
    migrated: idRepair.migrated,
    changed: routeMigration.changed || idRepair.changed,
  }
}

// ── Generic sync-key merge strategies ───────────────────────────────────────
// Used by AuthContext.jsx's syncOnSignIn() for every SYNC_KEY except
// oc-progress (which uses mergeProgress above) — replaces a blind
// "if remote is newer, overwrite local" with something that can't drop data
// silently. None of these have per-entry timestamps today, so a same-key
// edited-differently-on-both-sides conflict can't be perfectly resolved —
// but nothing is ever discarded outright, only (rarely) shadowed, which is
// a real improvement over a full-object overwrite.

// Array of plain values or ids (pinned videos, completed mission ids) —
// union, order doesn't matter for this kind of data.
export function mergeArrayUnion<T>(local: T[] | null | undefined, remote: T[] | null | undefined): T[] {
  if (!Array.isArray(local)) return remote ?? []
  if (!Array.isArray(remote)) return local ?? []
  return [...new Set([...remote, ...local])]
}

// Array of rich objects identified by an `id` field (pinned lessons/tools —
// confirmed `{id, title, subtitle, path}` in PinsContext.jsx). A plain Set
// union doesn't dedupe these — two different object instances with the same
// id are never === each other — so dedupe by id explicitly instead.
export function mergeArrayUnionById<T extends Record<string, unknown>>(
  local: T[] | null | undefined,
  remote: T[] | null | undefined,
  idKey: string = 'id'
): T[] {
  if (!Array.isArray(local)) return remote ?? []
  if (!Array.isArray(remote)) return local ?? []
  const seen = new Set<unknown>()
  const merged: T[] = []
  for (const item of [...remote, ...local]) {
    const key = item?.[idKey]
    if (key != null && seen.has(key)) continue
    if (key != null) seen.add(key)
    merged.push(item)
  }
  return merged
}

// Flat keyed object with no per-entry timestamp (formula memory, calendar
// events keyed by id, etc.) — union of keys; local's value wins for a key
// present on both sides (this IS the device currently being synced from,
// the more defensible default without real timestamps to compare).
export function mergeKeyedObject(
  local: Record<string, unknown> | unknown[] | null | undefined,
  remote: Record<string, unknown> | unknown[] | null | undefined
): Record<string, unknown> {
  // typeof [] === 'object' too — explicitly excluded, since spreading an
  // array as if it were a plain object would silently destroy its array-ness
  // (it'd become a {0: x, 1: y, ...}-shaped plain object instead). Safer to
  // just fall back to one side than risk corrupting a shape mismatch.
  const isPlainObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
  if (!isPlainObject(local)) return isPlainObject(remote) ? remote : {}
  if (!isPlainObject(remote)) return local
  return { ...remote, ...local }
}

// Flat keyed object of numbers where "higher is better" and should never
// regress (e.g. video-watch-percent — the existing player code already
// refuses to downgrade progress on rewind, so a plain key-union "local
// wins" merge would wrongly undo that the moment a behind-device synced).
export function mergeMaxNumericObject(
  local: Record<string, number> | null | undefined,
  remote: Record<string, number> | null | undefined
): Record<string, number> {
  if (!local || typeof local !== 'object') return remote ?? {}
  if (!remote || typeof remote !== 'object') return local ?? {}
  const merged: Record<string, number> = { ...remote }
  for (const [key, val] of Object.entries(local)) {
    merged[key] = Math.max(Number(val) || 0, Number(merged[key]) || 0)
  }
  return merged
}

// A lone number that should never regress across devices (Vue Studio's
// furthest-milestone-reached index) — same "never lose progress" philosophy
// as mergeMaxNumericObject/mergeLearningTime below, just for a bare value
// instead of a keyed object.
export function mergeMaxNumber(local: unknown, remote: unknown): number {
  return Math.max(Number(local) || 0, Number(remote) || 0)
}

interface LearningTimeData {
  totalMs?: number
  [key: string]: unknown
}

// totalMs only ever grows locally (see useLearningTime.ts's setInterval
// accumulator), so — same "never regress" philosophy as
// mergeMaxNumericObject above — the correct merge is the max of the two.
// This under-counts true total time if someone studies on two devices at
// once (neither side's accumulation is ever summed with the other's), but
// it can never lose time either device already recorded, which matters
// more for a personal stat than exact precision.
export function mergeLearningTime(
  local: LearningTimeData | null | undefined,
  remote: LearningTimeData | null | undefined
): LearningTimeData {
  const localMs = Number(local?.totalMs) || 0
  const remoteMs = Number(remote?.totalMs) || 0
  return { totalMs: Math.max(localMs, remoteMs) }
}

interface BackendLabFile {
  id: string
  [key: string]: unknown
}
interface BackendLabSavedRequest {
  id: string
  [key: string]: unknown
}
interface BackendLabData {
  files?: BackendLabFile[]
  savedRequests?: BackendLabSavedRequest[]
  activeLessonId?: string
  [key: string]: unknown
}

// Backend Lab's persisted work (student's own code files + saved API
// requests) — both arrays are keyed by `id`, so union-by-id is the right
// merge (same reasoning as mergeArrayUnionById above: two different object
// instances with the same id are never === each other, a plain Set union
// wouldn't dedupe them). activeLessonId has no real merge — local wins if
// present, matching mergeKeyedObject's "device being synced from wins on
// conflict" default.
export function mergeBackendLabData(
  local: BackendLabData | null | undefined,
  remote: BackendLabData | null | undefined
): BackendLabData {
  const isPlainObject = (v: unknown): v is BackendLabData => !!v && typeof v === 'object' && !Array.isArray(v)
  if (!isPlainObject(local)) return isPlainObject(remote) ? remote : {}
  if (!isPlainObject(remote)) return local
  return {
    ...remote,
    ...local,
    files: mergeArrayUnionById(local.files ?? [], remote.files ?? []),
    savedRequests: mergeArrayUnionById(local.savedRequests ?? [], remote.savedRequests ?? []),
    activeLessonId: local.activeLessonId ?? remote.activeLessonId,
  }
}

interface CalendarData {
  events?: Array<Record<string, unknown>>
  [key: string]: unknown
}

// oc-calendar's real shape (confirmed in NavClock.jsx) is `{ events: [...],
// ...other config }` — events is a nested ARRAY, not a flat key-union target.
// A plain mergeKeyedObject would let local's whole `events` array silently
// shadow remote's. Union the events specifically (by id if present,
// otherwise fall back to whichever side has more — never drops events).
export function mergeCalendarData(
  local: CalendarData | null | undefined,
  remote: CalendarData | null | undefined
): CalendarData {
  const isPlainObject = (v: unknown): v is CalendarData => !!v && typeof v === 'object' && !Array.isArray(v)
  if (!isPlainObject(local)) return remote ?? {}
  if (!isPlainObject(remote)) return local ?? {}
  const merged: CalendarData = { ...remote, ...local }
  if (Array.isArray(local.events) || Array.isArray(remote.events)) {
    merged.events = mergeArrayUnionById(local.events ?? [], remote.events ?? [])
  }
  return merged
}

// One level deeper than mergeKeyedObject — for shapes like CNC tool
// libraries (`{ mill: {toolNum: {...}}, lathe: {toolNum: {...}} }`): merge
// each top-level group's own keys, instead of one side's whole "mill" group
// shadowing the other's entirely.
export function mergeNestedKeyedObject(
  local: Record<string, Record<string, unknown>> | null | undefined,
  remote: Record<string, Record<string, unknown>> | null | undefined
): Record<string, Record<string, unknown>> {
  if (!local || typeof local !== 'object') return remote ?? {}
  if (!remote || typeof remote !== 'object') return local ?? {}
  const merged: Record<string, Record<string, unknown>> = { ...remote }
  for (const [group, localGroup] of Object.entries(local)) {
    merged[group] = mergeKeyedObject(localGroup, merged[group])
  }
  return merged
}

// Callers (AuthContext.jsx) are untyped JS, so `unknown` params here buy no
// real safety — `any` matches the actual gradual-migration boundary.
export type MergeStrategy = (local: any, remote: any) => unknown

// Per-SYNC_KEY merge strategy, keyed by the same localStorage key names
// AuthContext.jsx's SYNC_KEYS list uses. oc-progress is handled separately
// (mergeProgress, lesson-keyed with checkpoint-union semantics) since it
// needs different per-entry logic than a plain key/array union.
export const SYNC_MERGE_STRATEGIES: Record<string, MergeStrategy> = {
  'open-calc-pinned-videos': mergeArrayUnion,
  'open-calc-video-progress': mergeMaxNumericObject,
  'rfl-completed-v2': mergeArrayUnion,
  'oc_formulas': mergeKeyedObject,
  'cnc_tool_libraries_v1': mergeNestedKeyedObject,
  'oc-calendar': mergeCalendarData,
  'oc-pins': mergeArrayUnionById,
  'oc-health-v1': mergeKeyedObject,
  'oc-rpg-data': mergeKeyedObject,
  'oc-compass': mergeKeyedObject,
  'oc-backend-lab': mergeBackendLabData,
  'oc-learning-time': mergeLearningTime,
  'oc-lesson-progress': mergeArrayUnion,
  'vue-studio-v3:milestone-idx': mergeMaxNumber,
  'oc-blog-read': mergeArrayUnion,
}
