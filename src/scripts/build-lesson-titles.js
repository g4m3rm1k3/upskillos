#!/usr/bin/env node
// Builds src/data/lessonTitles.json — a "chapterId/lessonSlug" -> real title
// map so courseLoader.js can show hand-authored lesson titles without
// eager-loading every lesson's full content.
// Run: node src/scripts/build-lesson-titles.js
// Called automatically before dev/build via npm scripts

import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { register } from 'module'

// Lessons that import diagrams (`x.svg?url`) cannot be loaded by plain Node; these hooks
// stub image imports so those lessons get their real titles too.
register('../../scripts/lib/asset-import-hooks.mjs', import.meta.url)

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '../..')

function isDir(p) {
  try { return statSync(p).isDirectory() } catch { return false }
}

function titleFromSlug(slug) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

async function buildTitles(root) {
  const coursesDir = resolve(root, 'src/courses')
  const titles = {}
  const failures = []
  let lessonCount = 0

  const courseIds = readdirSync(coursesDir).filter(name => {
    if (name === 'courseLoader.js') return false
    return isDir(resolve(coursesDir, name))
  }).sort()

  for (const courseId of courseIds) {
    const courseDir = resolve(coursesDir, courseId)
    const chapterDirs = readdirSync(courseDir)
      .filter(name => /^\d+-.+$/.test(name) && isDir(resolve(courseDir, name)))
      .sort()

    for (const chapterDir of chapterDirs) {
      const chm = chapterDir.match(/^(\d+)-(.+)$/)
      if (!chm) continue
      const chapterId = `${courseId}-${parseInt(chm[1], 10)}`

      const lessonFiles = readdirSync(resolve(courseDir, chapterDir))
        .filter(f => /^\d+-.+\.js$/.test(f))
        .sort()

      for (const lessonFile of lessonFiles) {
        const fm = lessonFile.replace(/\.js$/, '').match(/^(\d+)-(.+)$/)
        if (!fm) continue
        const lessonSlug = fm[2]
        const lessonPath = resolve(courseDir, chapterDir, lessonFile)

        let lesson = {}
        try {
          // Dynamic import() requires a file:// URL, not a bare filesystem
          // path — a raw Windows path (C:\...) is not a valid ESM specifier
          // and silently threw here, meaning this loop's `continue` skipped
          // every single lesson and the title map came out empty.
          const mod = await import(pathToFileURL(lessonPath).href)
          lesson = mod?.default ?? mod?.lesson ?? {}
        } catch (e) {
          failures.push(`${courseId}/${chapterDir}/${lessonFile}: ${e.message.split('\n')[0]}`)
          continue
        }

        titles[`${chapterId}/${lessonSlug}`] = lesson.title ?? titleFromSlug(lessonSlug)
        lessonCount++
      }
    }
  }

  return { titles, lessonCount, failures }
}

async function main() {
  const { titles, lessonCount, failures } = await buildTitles(root)

  const dataDir = resolve(root, 'src/data')
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  const output = resolve(dataDir, 'lessonTitles.json')
  const expected = JSON.stringify(titles)
  if (process.argv.includes('--check')) {
    const current = existsSync(output) ? readFileSync(output, 'utf8').trim() : ''
    if (current !== expected) {
      console.error('✗ src/data/lessonTitles.json is out of date. Run `npm run facts` and commit it.')
      process.exit(1)
    }
  } else {
    writeFileSync(output, expected)
  }

  console.log(`✓ Lesson titles ${process.argv.includes('--check') ? 'are current' : 'built'}: ${lessonCount} lessons`)
  if (failures.length) {
    // Reported, not fatal: these lessons fall back to a title made from their filename.
    console.warn(`⚠ ${failures.length} lesson file(s) could not be imported for their title:`)
    for (const f of failures) console.warn(`  ${f}`)
  }
}

main().catch((e) => {
  console.error('Failed to build lesson titles:', e.message)
  process.exit(1)
})
