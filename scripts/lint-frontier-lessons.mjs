#!/usr/bin/env node
// Checks every Frontier lesson against the series' teaching rules (src/labs/project-studio/frontierLint.js)
// and prints what it finds, lesson by lesson. Exit code 1 if any rule is broken.
//
//   node scripts/lint-frontier-lessons.mjs            all chapters
//   node scripts/lint-frontier-lessons.mjs --warnings  warnings too
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { lintSeries } from '../src/labs/project-studio/frontierLint.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export function frontierLessons(base = resolve(root, 'src/labs/project-studio/tracks')) {
  const tracks = readdirSync(base, { withFileTypes: true }).filter(d => d.isDirectory() && d.name.startsWith('frontier-')).map(d => {
    const files = readdirSync(resolve(base, d.name)).filter(f => f.endsWith('.md')).sort()
    const first = readFileSync(resolve(base, d.name, files[0]), 'utf8')
    return { name: d.name, order: Number(first.match(/^trackOrder:\s*([\d.]+)/m)?.[1] ?? Infinity), files }
  }).sort((a, b) => a.order - b.order)
  return tracks.flatMap(t => t.files.map(f => ({ id: `${t.name}/${f.slice(0, -3)}`, text: readFileSync(resolve(base, t.name, f), 'utf8') })))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const showWarnings = process.argv.includes('--warnings')
  const lessons = frontierLessons()
  const problems = lintSeries(lessons).filter(p => showWarnings || p.level === 'error')
  for (const { id } of lessons) {
    const mine = problems.filter(p => p.lesson === id)
    console.log(`${mine.length ? '✗' : '✓'} ${id}`)
    for (const p of mine) console.log(`    ${p.level === 'error' ? '' : '(warning) '}[${p.rule}] ${p.step ? `"${p.step}": ` : ''}${p.message}`)
  }
  const errors = problems.filter(p => p.level === 'error').length
  console.log(`\n${lessons.length} lessons, ${errors} problem${errors === 1 ? '' : 's'}`)
  process.exit(errors ? 1 : 0)
}
