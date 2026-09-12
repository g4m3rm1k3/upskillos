import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clampDim,
  createDoc,
  createLayer,
  refreshAllAutotiles,
  resizeCells,
  shiftCells,
} from './tilemapDoc.js'
import { saveMap } from './db.js'

const HISTORY_LIMIT = 60

// Undo holds whole-document snapshots with structural sharing: an edit to one
// layer copies that layer's Int16Array and reuses every other layer's by
// reference. A 40x25 layer is 2KB, so even sixty steps of history on a
// multi-layer map stays comfortably small, and layer reordering, tileset
// swaps and resizes all become the same trivial case.
export function useTilemapDoc(initial) {
  const [doc, setDoc] = useState(() => initial ?? createDoc())
  const past = useRef([])
  const future = useRef([])
  const [depths, setDepths] = useState({ canUndo: false, canRedo: false })

  const syncDepths = useCallback(() => {
    setDepths({ canUndo: past.current.length > 0, canRedo: future.current.length > 0 })
  }, [])

  const commit = useCallback(
    (next) => {
      setDoc((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next
        if (!resolved || resolved === prev) return prev
        past.current = [...past.current.slice(-(HISTORY_LIMIT - 1)), prev]
        future.current = []
        return resolved
      })
      syncDepths()
    },
    [syncDepths],
  )

  const apply = useCallback((next) => {
    setDoc((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next
      return resolved && resolved !== prev ? resolved : prev
    })
  }, [])

  const undo = useCallback(() => {
    setDoc((prev) => {
      if (!past.current.length) return prev
      const target = past.current[past.current.length - 1]
      past.current = past.current.slice(0, -1)
      future.current = [...future.current, prev]
      return target
    })
    syncDepths()
  }, [syncDepths])

  const redo = useCallback(() => {
    setDoc((prev) => {
      if (!future.current.length) return prev
      const target = future.current[future.current.length - 1]
      future.current = future.current.slice(0, -1)
      past.current = [...past.current, prev]
      return target
    })
    syncDepths()
  }, [syncDepths])

  const replaceDoc = useCallback(
    (next) => {
      past.current = []
      future.current = []
      setDoc(next)
      syncDepths()
    },
    [syncDepths],
  )

  return { doc, commit, apply, undo, redo, replaceDoc, ...depths }
}

// --- document edits ------------------------------------------------------

export function withLayerCells(doc, index, cells) {
  const layers = doc.layers.slice()
  layers[index] = { ...layers[index], cells }
  return { ...doc, layers, updatedAt: Date.now() }
}

export function updateLayer(doc, index, patch) {
  const layers = doc.layers.slice()
  layers[index] = { ...layers[index], ...patch }
  return { ...doc, layers, updatedAt: Date.now() }
}

export function addLayer(doc, kind = 'tiles') {
  // Names have to be unique: they are the keys an engine looks layers up by
  // after export, and two layers called "Collision" in a .tmj means one of them
  // is unreachable from code.
  const sameKind = doc.layers.filter((l) => l.kind === kind).length
  const name =
    kind === 'collision'
      ? sameKind === 0
        ? 'Collision'
        : `Collision ${sameKind + 1}`
      : `Layer ${doc.layers.length + 1}`
  return {
    ...doc,
    layers: [...doc.layers, createLayer(doc.cols, doc.rows, name, kind)],
    updatedAt: Date.now(),
  }
}

export function removeLayer(doc, index) {
  if (doc.layers.length <= 1) return doc
  const layers = doc.layers.slice()
  layers.splice(index, 1)
  return { ...doc, layers, updatedAt: Date.now() }
}

export function duplicateLayer(doc, index) {
  const src = doc.layers[index]
  const layers = doc.layers.slice()
  layers.splice(index + 1, 0, {
    ...src,
    id: `${src.id}_copy_${Date.now().toString(36)}`,
    name: `${src.name} copy`,
    cells: src.cells.slice(),
  })
  return { ...doc, layers, updatedAt: Date.now() }
}

// Layer order is paint order: index 0 is drawn first, so it sits at the back.
export function moveLayer(doc, from, to) {
  if (from === to || to < 0 || to >= doc.layers.length) return doc
  const layers = doc.layers.slice()
  const [l] = layers.splice(from, 1)
  layers.splice(to, 0, l)
  return { ...doc, layers, updatedAt: Date.now() }
}

export function clearLayer(doc, index) {
  const layer = doc.layers[index]
  return withLayerCells(doc, index, createLayerCells(layer.cells.length))
}

function createLayerCells(length) {
  const cells = new Int16Array(length)
  cells.fill(-1)
  return cells
}

export function resizeDoc(doc, nextCols, nextRows) {
  const cols = clampDim(nextCols)
  const rows = clampDim(nextRows)
  if (cols === doc.cols && rows === doc.rows) return doc
  return {
    ...doc,
    cols,
    rows,
    layers: doc.layers.map((l) => ({ ...l, cells: resizeCells(l.cells, doc.cols, doc.rows, cols, rows) })),
    updatedAt: Date.now(),
  }
}

export function shiftDoc(doc, dx, dy) {
  return {
    ...doc,
    layers: doc.layers.map((l) => ({ ...l, cells: shiftCells(l.cells.slice(), doc.cols, doc.rows, dx, dy) })),
    updatedAt: Date.now(),
  }
}

// Re-derives every autotiled cell on every layer. Offered as an explicit action
// because it is the repair for a map whose terrain tiles were painted by hand,
// pasted, or imported before the terrain existed.
export function refreshTerrains(doc) {
  if (!doc.terrains.length || !doc.tileset) return doc
  return {
    ...doc,
    layers: doc.layers.map((l) => {
      if (l.kind === 'collision') return l
      const cells = l.cells.slice()
      for (const terrain of doc.terrains) {
        refreshAllAutotiles(cells, doc.cols, doc.rows, terrain, doc.tileset.cols)
      }
      return { ...l, cells }
    }),
    updatedAt: Date.now(),
  }
}

export function addTerrain(doc, terrain) {
  return { ...doc, terrains: [...doc.terrains, terrain], updatedAt: Date.now() }
}

export function removeTerrain(doc, id) {
  return { ...doc, terrains: doc.terrains.filter((t) => t.id !== id), updatedAt: Date.now() }
}

export function updateTerrain(doc, id, patch) {
  return {
    ...doc,
    terrains: doc.terrains.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    updatedAt: Date.now(),
  }
}

// --- autosave ------------------------------------------------------------

export function useAutosave(doc, { enabled = true, delay = 800 } = {}) {
  const [status, setStatus] = useState('idle')
  const latest = useRef(doc)
  latest.current = doc

  useEffect(() => {
    if (!enabled) return undefined
    setStatus('dirty')
    const t = setTimeout(async () => {
      try {
        await saveMap(latest.current)
        setStatus('saved')
      } catch {
        setStatus('error')
      }
    }, delay)
    return () => clearTimeout(t)
  }, [doc, enabled, delay])

  useEffect(() => {
    if (!enabled) return undefined
    return () => {
      saveMap(latest.current).catch(() => {})
    }
  }, [enabled])

  return status
}
