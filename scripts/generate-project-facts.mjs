#!/usr/bin/env node
// Generates the project's facts — what exists, counted by the same rules the app uses — so no
// page or document has to state a number by hand.
//
//   node scripts/generate-project-facts.mjs           write the outputs
//   node scripts/generate-project-facts.mjs --check   exit 1 if the committed outputs are stale
//
// Outputs:
//   src/data/projectFacts.json          read by the About page
//   docs/generated/project-inventory.md for people reading the repository
//   README.md                           the blocks between <!-- facts:NAME --> markers
//
// Reads src/data/lessonTitles.json and src/data/lessonIds.json, so run it after
// src/scripts/build-lesson-titles.js and scripts/build-lesson-ids.mjs (npm run facts does).
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rel = p => relative(root, p).split('\\').join('/')
const isDir = p => { try { return statSync(p).isDirectory() } catch { return false } }
const readJson = p => JSON.parse(readFileSync(p, 'utf8'))
const titleFromSlug = s => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

// The rules below mirror the loaders; if a loader changes, change the rule here with it.
const RULES = {
  course: 'A folder in src/courses/ that has a meta.json or at least one lesson file (src/courses/courseLoader.js).',
  lesson: 'A file src/courses/<course>/<N>-<chapter>/<NNN>-<slug>.js — exactly the pattern the course loader discovers. Its route is /chapter/<course>-<N>/<slug>.',
  chapter: 'A folder src/courses/<course>/<N>-<chapter>/ containing at least one lesson.',
  lab: 'A folder in src/labs/ with a meta.js (src/labs/labRegistryLoader.js).',
  game: 'An entry in GAMES in src/games/registry.js.',
}

// ── Courses and lessons ────────────────────────────────────────────────────────
const coursesDir = join(root, 'src/courses')
const titles = readJson(join(root, 'src/data/lessonTitles.json'))
const ids = readJson(join(root, 'src/data/lessonIds.json'))

const courses = [], lessons = []
for (const courseId of readdirSync(coursesDir).filter(n => isDir(join(coursesDir, n))).sort()) {
  const courseDir = join(coursesDir, courseId)
  const metaPath = join(courseDir, 'meta.json')
  const meta = existsSync(metaPath) ? readJson(metaPath) : null
  let chapters = 0, count = 0
  for (const chapterDir of readdirSync(courseDir).filter(n => /^\d+-.+$/.test(n) && isDir(join(courseDir, n))).sort()) {
    const chapterNum = parseInt(chapterDir, 10)
    const files = readdirSync(join(courseDir, chapterDir)).filter(f => /^\d+-.+\.js$/.test(f)).sort()
    if (files.length) chapters++
    for (const file of files) {
      const slug = file.replace(/\.js$/, '').replace(/^\d+-/, '')
      const path = join(courseDir, chapterDir, file)
      const idMatch = readFileSync(path, 'utf8').match(/\bid\s*:\s*['"`]([^'"`]+)['"`]/)
      lessons.push({
        course: courseId, file: rel(path), route: `/chapter/${courseId}-${chapterNum}/${slug}`,
        idKey: `${courseId}/${slug}`, titleKey: `${courseId}-${chapterNum}/${slug}`, id: idMatch?.[1] ?? null,
      })
      count++
    }
  }
  if (!meta && !count) continue
  courses.push({
    id: courseId, label: meta?.label ?? titleFromSlug(courseId), domain: meta?.domain ?? 'other',
    description: meta?.description ?? '', chapters, lessons: count,
  })
}

// ── Labs and games ─────────────────────────────────────────────────────────────
// Lab meta.js files lazy-import React components, so their plain fields are read as text.
const labsDir = join(root, 'src/labs')
const field = (text, name) => text.match(new RegExp(`\\b${name}\\s*:\\s*(["'\`])((?:\\\\.|(?!\\1).)*)\\1`))?.[2]
const labs = readdirSync(labsDir).filter(n => existsSync(join(labsDir, n, 'meta.js'))).sort().map(id => {
  const text = readFileSync(join(labsDir, id, 'meta.js'), 'utf8')
  return { id, label: field(text, 'label') ?? titleFromSlug(id), kind: field(text, 'kind') ?? 'lab', path: field(text, 'path') ?? `/lab/${id}` }
})
const { GAMES } = await import(pathToFileURL(join(root, 'src/games/registry.js')).href)
const games = GAMES.map(g => ({ id: g.key, label: g.label, path: g.path }))

// ── Problems worth fixing ──────────────────────────────────────────────────────
const groupDuplicates = (items, key) => {
  const map = new Map()
  for (const it of items) { const k = key(it); if (k != null) map.set(k, [...(map.get(k) ?? []), it.file]) }
  return [...map].filter(([, files]) => files.length > 1).map(([value, files]) => ({ value, files }))
}
const issues = {
  lessonsWithoutId: lessons.filter(l => !l.id).map(l => l.file),
  lessonsWithoutTitle: lessons.filter(l => !(l.titleKey in titles)).map(l => l.file),
  duplicateIds: groupDuplicates(lessons, l => l.id),
  duplicateIdKeys: groupDuplicates(lessons, l => l.idKey),
  duplicateRoutes: groupDuplicates(lessons, l => l.route),
  labIdsUsedByGames: games.filter(g => labs.some(l => l.id === g.id)).map(g => g.id),
}
// A lesson whose id-map key is shared with another file gets that file's id at runtime.
const describeIssue = {
  lessonsWithoutId: 'Lesson files with no `id:` field. Progress for these falls back to a route-derived key, which breaks if the file is renamed.',
  lessonsWithoutTitle: 'Lesson files missing from src/data/lessonTitles.json. They show a title made from the filename. Run `node src/scripts/build-lesson-titles.js` and read its warnings.',
  duplicateIds: 'The same `id:` in more than one lesson file. Progress for one of them is recorded against the other.',
  duplicateIdKeys: 'The same course and slug in more than one chapter. src/data/lessonIds.json is keyed by "<course>/<slug>", so these files share one entry and one of them gets the other\'s id.',
  duplicateRoutes: 'More than one file with the same route. Only one of them can be reached.',
  labIdsUsedByGames: 'Identifiers used by both a lab and a game.',
}

const facts = {
  generatedBy: 'scripts/generate-project-facts.mjs — do not edit by hand; run `npm run facts`',
  rules: RULES,
  counts: { courses: courses.length, chapters: courses.reduce((n, c) => n + c.chapters, 0), lessons: lessons.length, labs: labs.length, games: games.length },
  courses, labs, games, issues,
}

// ── Markdown inventory ─────────────────────────────────────────────────────────
const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map(r => `| ${r.join(' | ')} |`)].join('\n')
const esc = s => String(s).replace(/\|/g, '\\|')
const issueCount = Object.values(issues).reduce((n, v) => n + v.length, 0)
const md = `<!-- Generated by scripts/generate-project-facts.mjs. Do not edit by hand: run \`npm run facts\`. -->

# Project inventory

${facts.counts.courses} courses · ${facts.counts.chapters} chapters · ${facts.counts.lessons} lessons · ${facts.counts.labs} labs · ${facts.counts.games} games

## How things are counted

${Object.entries(RULES).map(([k, v]) => `- **${k[0].toUpperCase() + k.slice(1)}:** ${v}`).join('\n')}

## Courses

${table(['Course', 'Id', 'Domain', 'Chapters', 'Lessons'], courses.map(c => [esc(c.label), `\`${c.id}\``, c.domain, c.chapters, c.lessons]))}

## Labs

${table(['Lab', 'Id', 'Kind', 'Route'], labs.map(l => [esc(l.label), `\`${l.id}\``, l.kind, `\`${l.path}\``]))}

## Games

${table(['Game', 'Id', 'Route'], games.map(g => [esc(g.label), `\`${g.id}\``, `\`${g.path}\``]))}

## Problems found

${issueCount === 0 ? 'None.' : Object.entries(issues).filter(([, v]) => v.length).map(([k, v]) => `### ${k} (${v.length})\n\n${describeIssue[k]}\n\n${v.map(x => typeof x === 'string' ? `- \`${x}\`` : `- \`${x.value}\`: ${x.files.map(f => `\`${f}\``).join(', ')}`).join('\n')}`).join('\n\n')}
`

// ── README: generated blocks between <!-- facts:NAME --> and <!-- /facts:NAME --> ──
const c = facts.counts
const readmePath = join(root, 'README.md')
const readmeNow = readFileSync(readmePath, 'utf8')
const eol = readmeNow.includes('\r\n') ? '\r\n' : '\n'
const README_BLOCKS = {
  headline: `**${c.lessons} lessons. ${c.courses} courses. ${c.labs} interactive labs and simulators. ${c.games} games built on real math and physics. All free. All open source.**`,
  scale: `| Lessons | **${c.lessons}** |${eol}| Courses | **${c.courses}** |${eol}| Interactive labs & simulators | **${c.labs}** |${eol}| Games built on real math & physics | **${c.games}** |`,
  'courses-heading': `### ${c.courses} Courses`,
  'labs-heading': `### ${c.labs} Interactive Labs and Simulators`,
  built: `- **${c.lessons} lessons** across **${c.courses} courses** covering the full STEM-to-employability pipeline`,
}
// Markers sit on their own lines: a line that starts with an HTML comment is rendered as raw HTML.
const readme = Object.entries(README_BLOCKS).reduce((text, [name, body]) =>
  text.replace(new RegExp(`(<!-- facts:${name} -->)[\\s\\S]*?(<!-- /facts:${name} -->)`), `$1${eol}${body}${eol}$2`), readmeNow)

// ── Write or check ─────────────────────────────────────────────────────────────
const outputs = [
  [join(root, 'src/data/projectFacts.json'), JSON.stringify(facts, null, 2) + '\n'],
  [join(root, 'docs/generated/project-inventory.md'), md],
  [readmePath, readme],
]
const norm = s => s.replace(/\r\n/g, '\n')
if (process.argv.includes('--check')) {
  const stale = outputs.filter(([p, text]) => !existsSync(p) || norm(readFileSync(p, 'utf8')) !== norm(text)).map(([p]) => rel(p))
  if (stale.length) {
    console.error(`✗ Project facts are out of date: ${stale.join(', ')}`)
    console.error('  Courses, lessons, labs or games changed without regenerating them. Run `npm run facts` and commit the result.')
    process.exit(1)
  }
  console.log(`✓ Project facts are current (${facts.counts.courses} courses, ${facts.counts.lessons} lessons, ${facts.counts.labs} labs, ${facts.counts.games} games).`)
} else {
  for (const [p, text] of outputs) { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text) }
  console.log(`✓ Project facts written: ${facts.counts.courses} courses, ${facts.counts.lessons} lessons, ${facts.counts.labs} labs, ${facts.counts.games} games.`)
}
if (issueCount) console.warn(`⚠ ${issueCount} content problem(s) listed under "Problems found" in docs/generated/project-inventory.md`)
