#!/usr/bin/env node
// Builds src/data/lessonIds.json — a "<courseId>/<slug>" -> lesson.id map.
// Run: node scripts/build-lesson-ids.mjs
// Called automatically before dev/build via npm scripts.
//
// Reads each lesson file's RAW TEXT and regex-extracts its `id:` field,
// rather than importing/evaluating the module (a deleted predecessor,
// build-search-index.js, tried that and silently produced zero results
// for every lesson, because plain Node can't resolve the JSX/import graph
// those modules pull in — see src/scripts/build-lesson-titles.js, its
// still-needed successor, for the same lesson learned). Reading raw text
// sidesteps that entirely and is the same technique already used for the equivalent
// in-app lookup in courseLoader.js.

import { writeFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function isDir(p) {
  try { return statSync(p).isDirectory() } catch { return false }
}

function buildLessonIds() {
  const coursesDir = resolve(root, 'src/courses')
  const lessonIds = {}
  let count = 0

  const courseIds = readdirSync(coursesDir).filter(name => isDir(resolve(coursesDir, name))).sort()

  for (const courseId of courseIds) {
    const courseDir = resolve(coursesDir, courseId)
    const chapterDirs = readdirSync(courseDir)
      .filter(name => /^\d+-.+$/.test(name) && isDir(resolve(courseDir, name)))

    for (const chapterDir of chapterDirs) {
      const lessonFiles = readdirSync(resolve(courseDir, chapterDir))
        .filter(f => /^\d+-.+\.js$/.test(f))

      for (const lessonFile of lessonFiles) {
        const fm = lessonFile.replace(/\.js$/, '').match(/^(\d+)-(.+)$/)
        if (!fm) continue
        const slug = fm[2]
        const filePath = resolve(courseDir, chapterDir, lessonFile)

        let text
        try { text = readFileSync(filePath, 'utf-8') } catch { continue }
        const m = text.match(/\bid\s*:\s*['"`]([^'"`]+)['"`]/)
        if (!m) continue
        lessonIds[`${courseId}/${slug}`] = m[1]
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
}

buildLessonIds()
