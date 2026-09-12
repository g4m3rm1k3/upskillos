import { openDB } from 'idb'
import { docToJSON, normalizeDoc } from './pixelDoc.js'

// Sprites live in IndexedDB rather than localStorage because frame data is
// binary: a Uint8Array survives a structured clone verbatim, while localStorage
// would force a base64 or JSON round-trip on every autosave.
//
// Two stores: `sprites` holds whole documents keyed by id, `prefs` holds the
// handful of editor settings worth remembering between sessions (which sprite
// was open, last used export options). Keeping prefs out of the document means
// autosaving art never rewrites settings and vice versa.

const DB_NAME = 'sprite-forge'
const DB_VERSION = 1

let dbPromise = null
function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const sprites = db.createObjectStore('sprites', { keyPath: 'id' })
        sprites.createIndex('updatedAt', 'updatedAt')
        db.createObjectStore('prefs')
      },
    })
  }
  return dbPromise
}

// Documents are stored with plain-array pixels, same shape as the file export.
// It costs a conversion on each save but means a sprite pulled straight out of
// the database can be handed to JSON.stringify, and one read from a file can go
// straight in — one format, not two.
export async function saveSprite(doc) {
  const db = await getDB()
  await db.put('sprites', { ...docToJSON(doc), updatedAt: Date.now() })
}

export async function loadSprite(id) {
  const db = await getDB()
  const raw = await db.get('sprites', id)
  return raw ? normalizeDoc(raw) : null
}

export async function deleteSprite(id) {
  const db = await getDB()
  await db.delete('sprites', id)
}

// Summaries for the sprite picker — name, size, frame count — so the list never
// has to rebuild a document to describe one.
export async function listSprites() {
  const db = await getDB()
  const rows = await db.getAll('sprites')
  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      width: r.width,
      height: r.height,
      frameCount: Array.isArray(r.frames) ? r.frames.length : 0,
      updatedAt: r.updatedAt ?? 0,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getPref(key, fallback = null) {
  try {
    const db = await getDB()
    const v = await db.get('prefs', key)
    return v === undefined ? fallback : v
  } catch {
    return fallback
  }
}

export async function setPref(key, value) {
  try {
    const db = await getDB()
    await db.put('prefs', value, key)
  } catch {
    // Private-browsing modes can refuse IndexedDB entirely. Losing a
    // preference is not worth breaking the editor over.
  }
}
