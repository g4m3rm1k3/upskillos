#!/usr/bin/env node
// Validates every bit of LaTeX in a lesson actually renders, so a contributor
// (or the in-app Lesson Builder) finds out about a typo'd \frac or an
// unbalanced brace immediately, instead of a broken-looking lesson shipping.
// The actual walk/check logic lives in checkLessonLatex.js, shared with the
// Lesson Builder's own pre-submit check — this file is just the CLI/file
// discovery wrapper around it.
//
// Usage:
//   node scripts/check_latex.mjs                 # every lesson
//   node scripts/check_latex.mjs <courseId>       # only that course (e.g. "physics")
//   node scripts/check_latex.mjs --files <file> [file...]  # specific files (PR diff)

import { readdirSync, statSync } from 'fs'
import { register } from 'module'
import { resolve, dirname, relative } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { checkLessonLatex } from '../src/components/math/checkLessonLatex.js'

// Lessons that import diagrams (`import url from '../diagrams/x.svg?url'`) failed to
// import in plain Node ("Unknown file extension .svg"), so their LaTeX was never checked.
register('./lib/asset-import-hooks.mjs', import.meta.url)

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const coursesDir = resolve(root, 'src/courses')

function isDir(path) {
  try { return statSync(path).isDirectory() } catch { return false }
}

function findLessonFiles(courseFilter) {
  const files = []
  for (const courseId of readdirSync(coursesDir)) {
    if (courseFilter && courseId !== courseFilter) continue
    const courseDir = resolve(coursesDir, courseId)
    if (!isDir(courseDir)) continue
    for (const chapterDir of readdirSync(courseDir)) {
      const chapterPath = resolve(courseDir, chapterDir)
      if (!isDir(chapterPath)) continue
      for (const fileName of readdirSync(chapterPath)) {
        // Test files (e.g. a viz folder's *.test.js) aren't lessons, and import vitest.
        if (fileName.endsWith('.js') && !fileName.endsWith('.test.js')) files.push(resolve(chapterPath, fileName))
      }
    }
  }
  return files
}

async function main() {
  const args = process.argv.slice(2)
  let files
  if (args[0] === '--files') {
    files = args.slice(1).map(p => resolve(root, p))
  } else {
    files = findLessonFiles(args[0])
  }

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
    if (!lesson || typeof lesson !== 'object') continue

    const errors = checkLessonLatex(lesson, label)
    if (errors.length > 0) {
      failed = true
      console.error(`✗ ${label}`)
      for (const err of errors) console.error(`    ${err.path}: ${err.message}`)
    } else {
      console.log(`✓ ${label}`)
    }
  }

  console.log(`\n${files.length} lesson file(s) checked.`)
  process.exit(failed ? 1 : 0)
}

main()
