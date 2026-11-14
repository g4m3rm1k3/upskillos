#!/usr/bin/env node
// The schema for a lesson file is whatever the in-app Lesson Builder can load
// and re-export — not a hand-maintained field checklist. Older course tracks
// (e.g. c-plus-plus) predate the builder and use a different shape entirely
// (plain-string "hook", "mentalModel" instead of "intuition"); this script
// doesn't try to lint those, it just confirms that running a lesson through
// the builder's own lessonToState() -> serializeLesson() round-trip succeeds.
// That's the same code path LessonBuilderPage.jsx uses to open a lesson for
// editing, so a failure here means the builder would actually crash on it.
//
// CI always passes the PR's changed files explicitly, so this only ever
// gates new/edited lessons — it's informational (not a merge gate) when run
// with no args across the whole content base.
//
// Usage:
//   node scripts/validate-lesson-schema.mjs                  # informational: every lesson file
//   node scripts/validate-lesson-schema.mjs <file> [file...] # validate specific files (PR diff) — used by CI

import { readdirSync, statSync } from 'fs'
import { register } from 'module'
import { resolve, dirname, relative } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { lessonToState } from '../src/components/lesson-builder/builderUtils.js'

// Lessons that import diagrams (`import url from '../diagrams/x.svg?url'`) failed to
// import in plain Node ("Unknown file extension .svg"), so they were never validated.
register('./lib/asset-import-hooks.mjs', import.meta.url)
import { serializeLesson } from '../src/components/lesson-builder/lessonSerializer.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const coursesDir = resolve(root, 'src/courses')

function isDir(path) {
  try { return statSync(path).isDirectory() } catch { return false }
}

function findAllLessonFiles() {
  const files = []
  for (const courseId of readdirSync(coursesDir)) {
    const courseDir = resolve(coursesDir, courseId)
    if (!isDir(courseDir)) continue
    for (const chapterDir of readdirSync(courseDir)) {
      const chapterPath = resolve(courseDir, chapterDir)
      if (!isDir(chapterPath)) continue
      for (const fileName of readdirSync(chapterPath)) {
        if (fileName.endsWith('.js')) files.push(resolve(chapterPath, fileName))
      }
    }
  }
  return files
}

// Derive the same { chapterId, lessonSlug } that LessonBuilderPage.jsx gets
// from the route params, straight from the file's path on disk.
function deriveIdsFromPath(file) {
  const rel = relative(coursesDir, file).replaceAll('\\', '/')
  const [courseId, chapterFolder, fileName] = rel.split('/')
  const chapterNum = chapterFolder?.match(/^(\d+)-/)?.[1]
  const lessonSlug = fileName?.replace(/\.js$/, '').replace(/^\d+-/, '')
  return {
    chapterId: courseId && chapterNum ? `${courseId}-${chapterNum}` : '',
    lessonSlug: lessonSlug ?? '',
  }
}

async function main() {
  const args = process.argv.slice(2)
  // Explicit args (e.g. from `git diff` in CI) are trusted as-is; otherwise
  // validate every lesson file in the repo.
  const files = args.length > 0 ? args.map(p => resolve(root, p)) : findAllLessonFiles()

  let failed = false
  for (const file of files) {
    const label = relative(root, file)
    let mod
    try {
      mod = await import(pathToFileURL(file).href)
    } catch (error) {
      failed = true
      console.error(`✗ ${label}\n    failed to import: ${error.message}`)
      continue
    }

    const lesson = mod.default
    if (!lesson || typeof lesson !== 'object') {
      failed = true
      console.error(`✗ ${label}\n    no default export object`)
      continue
    }

    const { chapterId, lessonSlug } = deriveIdsFromPath(file)
    try {
      const state = lessonToState(lesson, chapterId, lessonSlug)
      const code = serializeLesson(state)
      if (!code.trim().startsWith('export default {')) {
        throw new Error('serializeLesson() produced unexpected output')
      }
      // lessonToState() is defensive by design (every field falls back to ''/[]),
      // so it won't throw on a lesson shape it doesn't understand — it'll just
      // silently produce an empty builder state. That silence is itself the
      // signal that the builder can't actually represent this lesson.
      if (state.sections.length === 0 && !state.hook.question) {
        throw new Error('builder loaded the file but found no recognizable sections or hook — schema mismatch')
      }
      console.log(`✓ ${label}`)
    } catch (error) {
      failed = true
      console.error(`✗ ${label}\n    Lesson Builder can't load this lesson: ${error.message}`)
    }
  }

  console.log(`\n${files.length} lesson file(s) checked.`)
  process.exit(failed ? 1 : 0)
}

main()
