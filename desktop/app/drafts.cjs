// Draft lessons for Project Studio, read from a folder on this computer: Documents\UpSkillOS Drafts.
// Drop a lesson's .md file in, switch back to the app, and it appears under the Drafts series. No
// rebuild, no registration, and nothing in the repository changes.
//
//   UpSkillOS Drafts/
//     01-01-an-idea.md          a loose lesson: the chapter "Drafts"
//     chess/                    a chapter of its own
//       01-01-the-board.md
//       support/tests/test_board.py   files for its `support:` front matter
//
// The renderer parses the lessons (src/labs/project-studio/drafts.js); this only reads files.
const fs = require('node:fs')
const path = require('node:path')

const README = `UpSkillOS Drafts

Lessons in this folder appear in Project Studio under the "Drafts" series.

- A .md file here is a lesson in the chapter "Drafts".
- A folder here is a chapter of its own. Its .md files are its lessons, in file-name order,
  and its support/ folder holds the files a lesson's "support:" front matter names.

Save a file, switch back to UpSkillOS, and the lesson is updated. The lesson format is in
docs/contributing/project-studio-series.md in the UpSkillOS repository.
`

// Text files above this size are skipped: a lesson or a support file is never this big.
const MAX_BYTES = 1024 * 1024

function draftsFolder(app) {
  return path.join(app.getPath('documents'), 'UpSkillOS Drafts')
}

function ensureFolder(root) {
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true })
    fs.writeFileSync(path.join(root, 'README.txt'), README)
  }
  return root
}

function entries(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }) } catch { return [] }
}

function readText(file) {
  try {
    if (fs.statSync(file).size > MAX_BYTES) return null
    return fs.readFileSync(file, 'utf8')
  } catch { return null }
}

function lessonsIn(dir) {
  return entries(dir)
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md') && e.name.toLowerCase() !== 'readme.md')
    .map((e) => ({ name: e.name.replace(/\.md$/i, ''), content: readText(path.join(dir, e.name)) }))
    .filter((lesson) => lesson.content != null)
}

// Every file under support/, keyed by its path inside support/ with forward slashes.
function supportIn(dir, prefix = '') {
  const out = {}
  for (const e of entries(dir)) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name
    if (e.isDirectory()) Object.assign(out, supportIn(path.join(dir, e.name), rel))
    else if (e.isFile()) {
      const content = readText(path.join(dir, e.name))
      if (content != null) out[rel] = content
    }
  }
  return out
}

// A chapter key from a folder name: lower case, letters, digits and dashes, starting draft-.
function chapterKey(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `draft-${slug || 'chapter'}`
}

// { folder, chapters: [{ key, name, lessons: [{ name, content }], support: { path: content } }] }
function listFolder(root) {
  ensureFolder(root)
  const chapters = []
  const loose = lessonsIn(root)
  if (loose.length) chapters.push({ key: 'draft', name: 'Drafts', lessons: loose, support: supportIn(path.join(root, 'support')) })
  const used = new Set(['draft'])
  for (const e of entries(root)) {
    if (!e.isDirectory() || e.name === 'support' || e.name.startsWith('.')) continue
    const dir = path.join(root, e.name)
    const lessons = lessonsIn(dir)
    if (!lessons.length) continue
    let key = chapterKey(e.name)
    while (used.has(key)) key += '-2'
    used.add(key)
    chapters.push({ key, name: e.name, lessons, support: supportIn(path.join(dir, 'support')) })
  }
  return { folder: root, chapters }
}

function list(app) {
  return listFolder(draftsFolder(app))
}

async function open(app) {
  const { shell } = require('electron')
  const error = await shell.openPath(ensureFolder(draftsFolder(app)))
  return error ? { ok: false, reason: error } : { ok: true }
}

module.exports = { list, open, listFolder, chapterKey }
