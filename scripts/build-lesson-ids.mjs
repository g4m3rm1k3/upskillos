#!/usr/bin/env node
// Builds src/data/lessonIds.json — a "<chapterId>/<slug>" -> lesson.id map, where chapterId is
// "<courseId>-<N>" exactly as in the lesson's route (/chapter/<chapterId>/<slug>).
// Run: node scripts/build-lesson-ids.mjs [--check]
// Called automatically before dev/build via npm scripts.
//
// Each lesson is imported and its id read from the lesson object, the same way
// courseLoader.loadLesson() picks the object (default export, then `lesson`, then the first
// named object export). An earlier version searched the file's text for the first `id:` and
// so picked up ids of notebooks, quiz answers and code inside lesson text; 48 lessons had the
// wrong id. Importing needs the image-import hooks, because lessons import `.svg?url` diagrams.
//
// Keyed by chapter and slug, not course and slug: two chapters of one course may use the same
// slug, and each must keep its own entry.

import { writeFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { register } from 'module'

register('./lib/asset-import-hooks.mjs', import.meta.url)

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function isDir(p) {
  try { return statSync(p).isDirectory() } catch { return false }
}

// Mirrors courseLoader.loadLesson().
function lessonObject(mod) {
  if (mod.default) return mod.default
  if (mod.lesson) return mod.lesson
  return Object.entries(mod).find(([k, v]) => k !== 'default' && v && typeof v === 'object' && !Array.isArray(v))?.[1] ?? null
}

async function buildLessonIds() {
  const coursesDir = resolve(root, 'src/courses')
  const lessonIds = {}
  const withoutId = [], failures = []
  let count = 0

  const courseIds = readdirSync(coursesDir).filter(name => isDir(resolve(coursesDir, name))).sort()

  for (const courseId of courseIds) {
    const courseDir = resolve(coursesDir, courseId)
    const chapterDirs = readdirSync(courseDir)
      .filter(name => /^\d+-.+$/.test(name) && isDir(resolve(courseDir, name)))
      .sort()

    for (const chapterDir of chapterDirs) {
      const chapterId = `${courseId}-${parseInt(chapterDir, 10)}`
      const lessonFiles = readdirSync(resolve(courseDir, chapterDir))
        .filter(f => /^\d+-.+\.js$/.test(f))
        .sort()

      for (const lessonFile of lessonFiles) {
        const fm = lessonFile.replace(/\.js$/, '').match(/^(\d+)-(.+)$/)
        if (!fm) continue
        const slug = fm[2]
        const file = `${courseId}/${chapterDir}/${lessonFile}`
        let lesson
        try {
          lesson = lessonObject(await import(pathToFileURL(resolve(courseDir, chapterDir, lessonFile)).href))
        } catch (e) {
          failures.push(`${file}: ${e.message.split('\n')[0]}`)
          continue
        }
        if (typeof lesson?.id !== 'string' || !lesson.id) { withoutId.push(file); continue }
        lessonIds[`${chapterId}/${slug}`] = lesson.id
        count++
      }
    }
  }

  const dataDir = resolve(root, 'src/data')
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  const output = resolve(dataDir, 'lessonIds.json')
  const expected = JSON.stringify(lessonIds)
  if (process.argv.includes('--check')) {
    const current = existsSync(output) ? readFileSync(output, 'utf8').trim() : ''
    if (current !== expected) {
      console.error('✗ src/data/lessonIds.json is out of date. Run `npm run facts` and commit it.')
      process.exit(1)
    }
  } else {
    writeFileSync(output, expected)
  }
  console.log(`✓ Lesson id map ${process.argv.includes('--check') ? 'is current' : 'built'}: ${count} lessons`)
  // Reported, not fatal: these lessons have no stable id, so progress falls back to a route key.
  if (withoutId.length) {
    console.warn(`⚠ ${withoutId.length} lesson(s) have no id:`)
    for (const f of withoutId) console.warn(`  ${f}`)
  }
  if (failures.length) {
    console.warn(`⚠ ${failures.length} lesson file(s) could not be loaded:`)
    for (const f of failures) console.warn(`  ${f}`)
  }
}

buildLessonIds().catch(e => {
  console.error('Failed to build lesson ids:', e.message)
  process.exit(1)
})
