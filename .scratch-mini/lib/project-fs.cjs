const fs = require('node:fs/promises')
const path = require('node:path')

// Turn a path the page sent into a real path, and refuse anything outside the project folder.
function resolveInside(root, rel) {
  const full = path.resolve(root, rel || '.')
  const back = path.relative(root, full)
  if (back.startsWith('..') || path.isAbsolute(back)) {
    throw new Error(`Path escapes the project folder: ${rel}`)
  }
  return full
}

const HIDDEN = new Set(['node_modules', '.git', 'dist'])

async function list(root, rel = '.') {
  const entries = await fs.readdir(resolveInside(root, rel), { withFileTypes: true })
  return entries
    .filter((e) => !HIDDEN.has(e.name))
    .map((e) => ({ name: e.name, dir: e.isDirectory() }))
    .sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name))
}

async function read(root, rel) {
  return fs.readFile(resolveInside(root, rel), 'utf8')
}

async function write(root, rel, text) {
  const full = resolveInside(root, rel)
  await fs.mkdir(path.dirname(full), { recursive: true })
  await fs.writeFile(full, text, 'utf8')
}

module.exports = { resolveInside, list, read, write }
