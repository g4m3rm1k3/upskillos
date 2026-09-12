import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MAX_PALETTE,
  clampSize,
  cloneFrame,
  createDoc,
  createFrame,
  replaceValue,
  resizePixels,
  withFramePixels,
} from './pixelDoc.js'
import { saveSprite } from './db.js'

const HISTORY_LIMIT = 80

// Undo history holds whole document snapshots, not deltas.
//
// That is affordable here precisely because of the indexed-pixel model: a
// snapshot shares the Uint8Array of every frame the edit did not touch, so one
// stroke on a 64x64 frame costs 4KB plus a shallow object. Deltas would buy
// little and cost a lot of correctness — palette edits, frame reordering and
// canvas resizes all become the same trivial case under snapshots.
export function useSpriteDoc(initial) {
  const [doc, setDoc] = useState(() => initial ?? createDoc())
  const past = useRef([])
  const future = useRef([])
  // Only the *availability* of undo/redo needs to be React state — the stacks
  // themselves live in refs so pushing to them never triggers a render.
  const [depths, setDepths] = useState({ canUndo: false, canRedo: false })

  const syncDepths = useCallback(() => {
    setDepths({ canUndo: past.current.length > 0, canRedo: future.current.length > 0 })
  }, [])

  // Records the current document as an undo point, then applies the change.
  // Every discrete user action goes through here.
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

  // Applies a change *without* recording history. Nothing in the editor needs
  // it for drawing — SpriteCanvas accumulates a whole stroke off-React and
  // commits once — but a live-preview control (dragging a palette color picker)
  // wants to show its effect without filling the undo stack with every
  // intermediate value.
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

  // Replacing the open document (new / open / import) starts a fresh history:
  // undoing across a document boundary would silently resurrect art the user
  // believes they closed.
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
//
// Pure (doc) => doc transforms, kept out of the hook so they can be composed
// and tested without React in the picture.

export function setFramePixels(doc, index, pixels) {
  return withFramePixels(doc, index, pixels)
}

export function addFrame(doc, afterIndex, { copy = false } = {}) {
  const frames = doc.frames.slice()
  const source = frames[afterIndex]
  const frame = copy && source ? cloneFrame(source, `${source.name} copy`) : createFrame(doc.width, doc.height, `Frame ${frames.length + 1}`)
  if (source && !copy) frame.duration = source.duration
  frames.splice(afterIndex + 1, 0, frame)
  return { ...doc, frames, tags: shiftTagsForInsert(doc.tags, afterIndex + 1), updatedAt: Date.now() }
}

export function removeFrame(doc, index) {
  if (doc.frames.length <= 1) return doc
  const frames = doc.frames.slice()
  frames.splice(index, 1)
  return { ...doc, frames, tags: clampTags(shiftTagsForRemove(doc.tags, index), frames.length), updatedAt: Date.now() }
}

export function moveFrame(doc, from, to) {
  if (from === to || to < 0 || to >= doc.frames.length) return doc
  const frames = doc.frames.slice()
  const [f] = frames.splice(from, 1)
  frames.splice(to, 0, f)
  // Tags describe index ranges, and reordering frames across a tag boundary has
  // no single correct answer. Clamping keeps them valid; the user can retune.
  return { ...doc, frames, tags: clampTags(doc.tags, frames.length), updatedAt: Date.now() }
}

export function updateFrame(doc, index, patch) {
  const frames = doc.frames.slice()
  frames[index] = { ...frames[index], ...patch }
  return { ...doc, frames, updatedAt: Date.now() }
}

export function setAllDurations(doc, duration) {
  return { ...doc, frames: doc.frames.map((f) => ({ ...f, duration })), updatedAt: Date.now() }
}

export function resizeDoc(doc, nextW, nextH) {
  const w = clampSize(nextW)
  const h = clampSize(nextH)
  if (w === doc.width && h === doc.height) return doc
  return {
    ...doc,
    width: w,
    height: h,
    frames: doc.frames.map((f) => ({ ...f, pixels: resizePixels(f.pixels, doc.width, doc.height, w, h) })),
    updatedAt: Date.now(),
  }
}

export function setPaletteColor(doc, index, hex) {
  const palette = doc.palette.slice()
  palette[index] = hex
  // The preset id stops being true the moment a swatch is edited, and the
  // export metadata reports it, so drop it rather than claim a palette the
  // sprite no longer uses.
  return { ...doc, palette, paletteId: 'custom', updatedAt: Date.now() }
}

export function addPaletteColor(doc, hex = '#ffffff') {
  if (doc.palette.length >= MAX_PALETTE) return doc
  return { ...doc, palette: [...doc.palette, hex], paletteId: 'custom', updatedAt: Date.now() }
}

// Removing a swatch has to rewrite pixel data, because every value above the
// removed index shifts down by one. Pixels that used the removed color become
// transparent — the alternative (silently remapping them to a neighbour) hides
// the loss, and this way undo puts it all back anyway.
export function removePaletteColor(doc, index) {
  if (doc.palette.length <= 1) return doc
  const removedValue = index + 1
  const palette = doc.palette.slice()
  palette.splice(index, 1)
  const frames = doc.frames.map((f) => {
    const px = f.pixels.slice()
    replaceValue(px, removedValue, 0)
    for (let i = 0; i < px.length; i++) if (px[i] > removedValue) px[i] -= 1
    return { ...f, pixels: px }
  })
  return { ...doc, palette, frames, paletteId: 'custom', updatedAt: Date.now() }
}

// Swapping in a whole new palette keeps pixel *indices* untouched, so the art
// is instantly recolored rather than requantized. Indices past the end of the
// shorter palette would render as nothing, so the new palette is padded out.
export function applyPalette(doc, colors, paletteId = 'custom') {
  const next = colors.slice(0, MAX_PALETTE)
  while (next.length < doc.palette.length) next.push(doc.palette[next.length])
  return { ...doc, palette: next, paletteId, updatedAt: Date.now() }
}

export function mapFrames(doc, fn) {
  return { ...doc, frames: doc.frames.map((f, i) => ({ ...f, pixels: fn(f.pixels.slice(), i) })), updatedAt: Date.now() }
}

// --- tags ----------------------------------------------------------------

function clampTags(tags, count) {
  return tags
    .map((t) => ({
      ...t,
      from: Math.max(0, Math.min(t.from, count - 1)),
      to: Math.max(0, Math.min(t.to, count - 1)),
    }))
    .filter((t) => t.from <= t.to)
}

function shiftTagsForInsert(tags, at) {
  return tags.map((t) => ({
    ...t,
    from: t.from >= at ? t.from + 1 : t.from,
    // A frame inserted *inside* a tag extends it; one inserted before it
    // shifts the whole range. Either way the tag keeps covering the same art.
    to: t.to >= at ? t.to + 1 : t.to,
  }))
}

function shiftTagsForRemove(tags, at) {
  return tags.map((t) => ({
    ...t,
    from: t.from > at ? t.from - 1 : t.from,
    to: t.to >= at ? t.to - 1 : t.to,
  }))
}

// --- autosave ------------------------------------------------------------

// Debounced write-behind. Pixel art is edited in fast bursts, so saving on
// every change would hammer IndexedDB during a drag; a short idle delay gets
// one write per pause instead. The flush on unmount is what makes closing the
// lab mid-sentence safe.
export function useAutosave(doc, { enabled = true, delay = 700 } = {}) {
  const [status, setStatus] = useState('idle')
  const latest = useRef(doc)
  latest.current = doc

  useEffect(() => {
    if (!enabled) return undefined
    setStatus('dirty')
    const t = setTimeout(async () => {
      try {
        await saveSprite(latest.current)
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
      saveSprite(latest.current).catch(() => {})
    }
  }, [enabled])

  return status
}
