import { openDB } from 'idb'
import { docToJSON, normalizeDoc } from './tilemapDoc.js'

// Same shape as the sprite editor's storage, for the same reasons: layer data
// is binary, and a structured clone keeps an Int16Array intact where a
// localStorage round-trip would not.

const DB_NAME = 'tile-mapper'
const DB_VERSION = 1

let dbPromise = null
function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const maps = db.createObjectStore('maps', { keyPath: 'id' })
        maps.createIndex('updatedAt', 'updatedAt')
        db.createObjectStore('prefs')
      },
    })
  }
  return dbPromise
}

export async function saveMap(doc) {
  const db = await getDB()
  await db.put('maps', { ...docToJSON(doc), updatedAt: Date.now() })
}

export async function loadMap(id) {
  const db = await getDB()
  const raw = await db.get('maps', id)
  return raw ? normalizeDoc(raw) : null
}

export async function deleteMap(id) {
  const db = await getDB()
  await db.delete('maps', id)
}

export async function listMaps() {
  const db = await getDB()
  const rows = await db.getAll('maps')
  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      cols: r.cols,
      rows: r.rows,
      tileW: r.tileW,
      tileH: r.tileH,
      layerCount: Array.isArray(r.layers) ? r.layers.length : 0,
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
    // Private-browsing modes can refuse IndexedDB outright; losing a
    // preference is not worth breaking the editor over.
  }
}
