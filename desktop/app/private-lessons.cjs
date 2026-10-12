// Private lessons for Project Studio: folders on this computer, chosen with "Open private lessons…",
// each shown as a course of its own (a series, with a chapter per subfolder). For lessons about
// apps that aren't open source: the lessons stay in their folders (a private git repository, say),
// and only the list of folders is remembered, in the app's settings, never in the repository.
//
//   My App Lessons/            the course; its name is the folder's name
//     01-01-setup.md           loose lessons: the course's first chapter
//     accounts/                a chapter of its own
//       01-01-sign-in.md
//       support/…              files a lesson's `support:` front matter names
//
// The same layout and lesson format as Drafts (drafts.cjs); the renderer is privateLessons.js.
const fs = require('node:fs')
const path = require('node:path')
const { listFolder, slugOf } = require('./drafts.cjs')

// One fixed place: run from source the app's userData folder is "Electron", packaged it is
// "UpSkillOS", and the list should be the same either way.
function settingsFile(app) {
  return path.join(app.getPath('appData'), 'UpSkillOS', 'private-lessons.json')
}
function readSettings(app) {
  try { return JSON.parse(fs.readFileSync(settingsFile(app), 'utf8')) } catch { return { libraries: [] } }
}
function writeSettings(app, settings) {
  fs.mkdirSync(path.dirname(settingsFile(app)), { recursive: true })
  fs.writeFileSync(settingsFile(app), JSON.stringify(settings, null, 2))
}

// Run from source, the public repository is two folders above desktop/app. A private folder
// inside it could be committed and published, so it's refused.
function publicRepo(app) {
  return app.isPackaged ? null : path.resolve(app.getAppPath(), '..', '..')
}
function inside(folder, parent) {
  const rel = path.relative(parent, folder)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

// Every remembered folder, read now: { libraries: [{ id, name, folder, missing, chapters }] }
function list(app) {
  return {
    libraries: readSettings(app).libraries.map(({ id, folder }) => {
      const name = path.basename(folder)
      if (!fs.existsSync(folder)) return { id, name, folder, missing: true, chapters: [] }
      return { id, name, ...listFolder(folder, { prefix: `private-${id}`, looseName: name, create: false }) }
    }),
  }
}

// Choose a folder and remember it. Resolves { ok, id } or { ok: false, reason }.
async function add(app, dialog, window) {
  const result = await dialog.showOpenDialog(window, { title: 'Open private lessons', properties: ['openDirectory'] })
  if (result.canceled || !result.filePaths?.length) return { ok: false, canceled: true }
  return addFolder(app, result.filePaths[0])
}
function addFolder(app, folder) {
  const repo = publicRepo(app)
  if (repo && inside(path.resolve(folder), repo)) {
    return { ok: false, reason: 'That folder is inside the public UpSkillOS repository, so anything in it could be published. Keep private lessons in a folder of their own, outside it.' }
  }
  const settings = readSettings(app)
  const existing = settings.libraries.find(lib => path.resolve(lib.folder) === path.resolve(folder))
  if (existing) return { ok: true, id: existing.id }
  const base = slugOf(path.basename(folder)) || 'lessons'
  let id = base
  for (let n = 2; settings.libraries.some(lib => lib.id === id); n++) id = `${base}-${n}`
  settings.libraries.push({ id, folder })
  writeSettings(app, settings)
  return { ok: true, id }
}

// Forget a folder (its files are left alone).
function remove(app, id) {
  const settings = readSettings(app)
  settings.libraries = settings.libraries.filter(lib => lib.id !== id)
  writeSettings(app, settings)
  return { ok: true }
}

async function open(app, id) {
  const { shell } = require('electron')
  const lib = readSettings(app).libraries.find(item => item.id === id)
  if (!lib) return { ok: false, reason: 'That private lesson folder is no longer in the list.' }
  const error = await shell.openPath(lib.folder)
  return error ? { ok: false, reason: error } : { ok: true }
}

module.exports = { list, add, addFolder, remove, open, settingsFile }
