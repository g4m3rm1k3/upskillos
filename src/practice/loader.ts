// App-wide practice library — challenges are their own effort, independent from
// src/concepts/ (no shared id scheme, no shared contract). A practice file gets a
// display `title` of its own; its filename only needs to be a unique key, numbered
// in whatever order the topics were authored in. Each concept gets up to 3 levels,
// and each level ships one variant per language it supports — verified against the
// exact same test-running engine lessons already use (testRunner.ts's
// `assert ...`-line format / the `-program` stdout-grading path), so nothing new
// had to be built to grade a submission, only to browse and present one across
// several languages at once.

export interface ChallengeVariant {
  /** Plain lang id ('javascript', 'python', 'java', 'csharp', 'cpp') routes to the
   *  per-assertion test harness. A '-program' suffix (e.g. 'python-program') grades
   *  the learner's whole-program stdout instead — for concepts with no natural
   *  function signature to call (e.g. "What is a Program?", "Statements"). */
  lang: string
  /** One line stating the task for THIS language — phrasing/identifier casing may
   *  legitimately differ per language (camelCase vs PascalCase, etc). */
  prompt: string
  /** '' (or omitted) means a bare/blank-slate challenge — write it from scratch.
   *  Non-empty means "finish this implementation" — the tests' assert lines (or
   *  the program's expected stdout) must exercise exactly what the starter declares. */
  starter?: string
  /** Raw assert-line test source (or, for '-program' challenges, plain JS assertions
   *  against a bound `output` string) — identical format to LessonStep.tests. Must
   *  NOT redeclare the function under test — buildJSHarness/etc. append these lines
   *  after the user's own code, so a stub here would silently shadow a correct
   *  submission instead of testing it. */
  tests: string
  /** A known-correct submission for this variant — never shown to learners. Exists
   *  purely so tooling can verify `tests` actually passes a valid answer (and, for
   *  non-blank starters, that the starter alone does NOT already pass it). */
  solution: string
}

export interface PracticeChallenge {
  level: 1 | 2 | 3
  variants: ChallengeVariant[]
}

export interface PracticeFile {
  id: string
  title: string
  challenges: PracticeChallenge[]
}

// PRACTICE_MANIFEST is generated (scripts/build-practice-manifest.mjs, wired into
// `npm run dev`/`npm run build`) — id/title/levelCount for every practice file,
// cheap enough to import eagerly so the Explorer's sidebar never needs a file's
// full challenge content (prompts, starters, solutions, tests) just to list it.
// Full content (below) is loaded lazily per file.
import { PRACTICE_MANIFEST, type PracticeMeta } from './manifest'

export type { PracticeMeta }

const MANIFEST_BY_ID: Record<string, PracticeMeta> = {}
for (const meta of PRACTICE_MANIFEST) MANIFEST_BY_ID[meta.id] = meta

// Lazy loaders — each resolves to the module's exports only when actually
// called, so opening one practice topic doesn't force every topic to load.
const RAW_MODULE_LOADERS = import.meta.glob(['./*.ts', '!./loader.ts', '!./manifest.ts']) as Record<string, () => Promise<{ default: PracticeChallenge[]; title?: string }>>

const PATH_BY_ID: Record<string, string> = {}
for (const path of Object.keys(RAW_MODULE_LOADERS)) {
  const id = path.replace(/^\.\//, '').replace(/\.ts$/, '')
  PATH_BY_ID[id] = path
}

// Memoized by id so concurrent callers for the same topic share one fetch, not
// one each.
const PRACTICE_CACHE = new Map<string, Promise<PracticeFile | null>>()

export function getPracticeFile(id: string): Promise<PracticeFile | null> {
  let cached = PRACTICE_CACHE.get(id)
  if (cached) return cached
  const path = PATH_BY_ID[id]
  cached = path
    ? RAW_MODULE_LOADERS[path]().then(mod => {
        const challenges = [...(mod.default ?? [])].sort((a, b) => a.level - b.level)
        return challenges.length > 0 ? { id, title: mod.title ?? id, challenges } : null
      })
    : Promise.resolve(null)
  PRACTICE_CACHE.set(id, cached)
  return cached
}

/** Sync — title/levelCount only, no fetch. Use for the sidebar list. */
export function getPracticeMeta(id: string): PracticeMeta | null {
  return MANIFEST_BY_ID[id] ?? null
}

export function getAvailablePracticeIds(): string[] {
  return PRACTICE_MANIFEST.map(p => p.id)
}
