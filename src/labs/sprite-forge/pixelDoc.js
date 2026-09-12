// The sprite document model and every raster operation the editor performs.
//
// Pixels are stored *palette-indexed*: one Uint8Array per frame, one byte per
// pixel, where 0 means transparent and n>0 means palette[n-1]. Two reasons
// this beats storing RGBA:
//
//   1. A palette swap is free and non-destructive — edit palette[3] and every
//      pixel drawn with it changes across every frame. That is how real
//      pixel-art pipelines do recolors (team colors, damage flashes, night).
//   2. A 64x64 frame is 4KB, so undo history can hold plain snapshots without
//      any diffing machinery, and IndexedDB stores frames verbatim.
//
// Everything in here is a pure function over (pixels, w, h, ...) that mutates
// the array it is handed and returns it. Callers own the copying, which is
// what makes undo a matter of one slice() at stroke start.

import { getPalette, DEFAULT_PALETTE_ID } from './palettes.js'

export const TRANSPARENT = 0
export const MAX_PALETTE = 64
export const DOC_VERSION = 1

// Keeps the editor honest about memory and render cost. 128 is already far
// larger than most sprite work; beyond it the per-pixel grid overlay stops
// being useful anyway.
export const MIN_SIZE = 4
export const MAX_SIZE = 128

let seq = 0
export function uid(prefix = 'id') {
  seq += 1
  return `${prefix}_${Date.now().toString(36)}_${seq.toString(36)}`
}

export function createPixels(w, h) {
  return new Uint8Array(w * h)
}

export function createFrame(w, h, name = 'Frame') {
  return { id: uid('f'), name, duration: 100, pixels: createPixels(w, h) }
}

export function createDoc({
  width = 32,
  height = 32,
  paletteId = DEFAULT_PALETTE_ID,
  name = 'Untitled sprite',
} = {}) {
  return {
    version: DOC_VERSION,
    id: uid('doc'),
    name,
    width,
    height,
    paletteId,
    palette: getPalette(paletteId),
    frames: [createFrame(width, height, 'Frame 1')],
    // Named frame ranges, e.g. { name: 'run', from: 0, to: 5 }. Exported into
    // the atlas JSON so a game engine can define animations straight from the
    // sheet instead of hard-coding frame indices.
    tags: [],
    updatedAt: Date.now(),
  }
}

// --- single-pixel access -------------------------------------------------

export function inBounds(w, h, x, y) {
  return x >= 0 && y >= 0 && x < w && y < h
}

export function getPixel(px, w, h, x, y) {
  return inBounds(w, h, x, y) ? px[y * w + x] : TRANSPARENT
}

export function setPixel(px, w, h, x, y, value) {
  if (inBounds(w, h, x, y)) px[y * w + x] = value
  return px
}

// --- brushes and strokes -------------------------------------------------

// Square brush, anchored so odd sizes centre on the cursor and even sizes
// extend down-right. Pixel artists expect a 1px brush to hit exactly the
// pixel under the cursor, which rules out a symmetric half-pixel offset.
export function paintBrush(px, w, h, x, y, value, size = 1) {
  const s = Math.max(1, size | 0)
  const start = -((s - 1) >> 1)
  for (let dy = 0; dy < s; dy++) {
    for (let dx = 0; dx < s; dx++) {
      setPixel(px, w, h, x + start + dx, y + start + dy, value)
    }
  }
  return px
}

// Bresenham. Used both for the line tool and to close the gaps between
// pointermove samples while drawing freehand — without it, a fast drag
// leaves a dotted trail instead of a stroke.
export function drawLine(px, w, h, x0, y0, x1, y1, value, size = 1) {
  let x = x0 | 0
  let y = y0 | 0
  const ex = x1 | 0
  const ey = y1 | 0
  const dx = Math.abs(ex - x)
  const dy = Math.abs(ey - y)
  const sx = x < ex ? 1 : -1
  const sy = y < ey ? 1 : -1
  let err = dx - dy
  for (;;) {
    paintBrush(px, w, h, x, y, value, size)
    if (x === ex && y === ey) break
    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x += sx
    }
    if (e2 < dx) {
      err += dx
      y += sy
    }
  }
  return px
}

function normRect(x0, y0, x1, y1) {
  return {
    left: Math.min(x0, x1),
    top: Math.min(y0, y1),
    right: Math.max(x0, x1),
    bottom: Math.max(y0, y1),
  }
}

export function drawRect(px, w, h, x0, y0, x1, y1, value, { fill = false, size = 1 } = {}) {
  const { left, top, right, bottom } = normRect(x0, y0, x1, y1)
  if (fill) {
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) setPixel(px, w, h, x, y, value)
    }
    return px
  }
  drawLine(px, w, h, left, top, right, top, value, size)
  drawLine(px, w, h, left, bottom, right, bottom, value, size)
  drawLine(px, w, h, left, top, left, bottom, value, size)
  drawLine(px, w, h, right, top, right, bottom, value, size)
  return px
}

// Ellipse by mask rather than by midpoint arc: fill every pixel whose centre
// falls inside the ellipse, then for outlines keep only mask pixels that touch
// a non-mask 4-neighbour. Midpoint arcs are faster but drop or double pixels
// at the poles on small radii — exactly the size range that matters here,
// where a 7x5 ellipse has to look deliberate.
export function drawEllipse(px, w, h, x0, y0, x1, y1, value, { fill = false } = {}) {
  const { left, top, right, bottom } = normRect(x0, y0, x1, y1)
  const cx = (left + right) / 2
  const cy = (top + bottom) / 2
  const rx = Math.max((right - left) / 2 + 0.5, 0.5)
  const ry = Math.max((bottom - top) / 2 + 0.5, 0.5)

  const bw = right - left + 1
  const bh = bottom - top + 1
  const mask = new Uint8Array(bw * bh)
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const nx = (left + x - cx) / rx
      const ny = (top + y - cy) / ry
      if (nx * nx + ny * ny <= 1) mask[y * bw + x] = 1
    }
  }

  const at = (x, y) => (x < 0 || y < 0 || x >= bw || y >= bh ? 0 : mask[y * bw + x])
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      if (!mask[y * bw + x]) continue
      const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1)
      if (fill || edge) setPixel(px, w, h, left + x, top + y, value)
    }
  }
  return px
}

// Span-based 4-connected flood fill. The stack holds seed coordinates rather
// than whole spans and re-checks each one on pop, which keeps the code short;
// at these canvas sizes the redundant pushes cost nothing measurable.
export function floodFill(px, w, h, x, y, value) {
  if (!inBounds(w, h, x, y)) return px
  const target = px[y * w + x]
  if (target === value) return px
  const stack = [x, y]
  while (stack.length) {
    const sy = stack.pop()
    const sx = stack.pop()
    const row = sy * w
    if (px[row + sx] !== target) continue
    let lx = sx
    while (lx > 0 && px[row + lx - 1] === target) lx--
    let rx = sx
    while (rx < w - 1 && px[row + rx + 1] === target) rx++
    for (let i = lx; i <= rx; i++) px[row + i] = value
    for (const ny of [sy - 1, sy + 1]) {
      if (ny < 0 || ny >= h) continue
      const nrow = ny * w
      for (let i = lx; i <= rx; i++) {
        if (px[nrow + i] === target) stack.push(i, ny)
      }
    }
  }
  return px
}

// Global swap of one palette index for another across the whole frame — the
// "recolor this shade" operation, and also how a palette entry is retired
// without leaving orphaned pixels pointing past the end of the palette.
export function replaceValue(px, from, to) {
  for (let i = 0; i < px.length; i++) if (px[i] === from) px[i] = to
  return px
}

// --- whole-frame transforms ---------------------------------------------

export function flipH(px, w, h) {
  for (let y = 0; y < h; y++) {
    const row = y * w
    for (let x = 0; x < w >> 1; x++) {
      const a = row + x
      const b = row + w - 1 - x
      const t = px[a]
      px[a] = px[b]
      px[b] = t
    }
  }
  return px
}

export function flipV(px, w, h) {
  for (let y = 0; y < h >> 1; y++) {
    for (let x = 0; x < w; x++) {
      const a = y * w + x
      const b = (h - 1 - y) * w + x
      const t = px[a]
      px[a] = px[b]
      px[b] = t
    }
  }
  return px
}

// Quarter turn clockwise. Only defined for square frames, because anything
// else would silently change the sprite dimensions mid-edit.
export function rotate90(px, w, h) {
  if (w !== h) return px
  const out = new Uint8Array(px.length)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) out[x * w + (h - 1 - y)] = px[y * w + x]
  }
  px.set(out)
  return px
}

// Shift the image by (dx, dy). `wrap` matters for tiling work: a wrapped
// shift lets you check that a tile still seams correctly after an edit.
export function shift(px, w, h, dx, dy, wrap = true) {
  const out = new Uint8Array(px.length)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sx = x - dx
      let sy = y - dy
      if (wrap) {
        sx = ((sx % w) + w) % w
        sy = ((sy % h) + h) % h
      } else if (sx < 0 || sy < 0 || sx >= w || sy >= h) {
        continue
      }
      out[y * w + x] = px[sy * w + sx]
    }
  }
  px.set(out)
  return px
}

// Resize the *canvas*, not the art: copy the old grid into a new one anchored
// top-left, cropping or padding with transparency as needed.
export function resizePixels(px, w, h, nw, nh) {
  const out = new Uint8Array(nw * nh)
  const cw = Math.min(w, nw)
  const ch = Math.min(h, nh)
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) out[y * nw + x] = px[y * w + x]
  }
  return out
}

// Tight bounding box of non-transparent pixels, or null for an empty frame.
// The exporter reports this so you can catch a frame whose art has drifted
// off-centre — the usual cause of an animation that jitters during playback.
export function contentBounds(px, w, h) {
  let left = w
  let top = h
  let right = -1
  let bottom = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[y * w + x] === TRANSPARENT) continue
      if (x < left) left = x
      if (x > right) right = x
      if (y < top) top = y
      if (y > bottom) bottom = y
    }
  }
  if (right < 0) return null
  return { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1 }
}

// --- symmetry ------------------------------------------------------------

// Expands one stamp position into every position the active symmetry modes
// require. Mirroring at the *input* level (rather than mirroring the finished
// frame) is what makes symmetric drawing feel live: each dab appears on both
// sides as you draw, and asymmetric detail can still be added afterwards with
// symmetry switched back off.
export function mirrorPoints(w, h, x, y, { mirrorX = false, mirrorY = false } = {}) {
  const pts = [[x, y]]
  if (mirrorX) pts.push([w - 1 - x, y])
  if (mirrorY) pts.push([x, h - 1 - y])
  if (mirrorX && mirrorY) pts.push([w - 1 - x, h - 1 - y])
  return pts
}

// --- document-level helpers ---------------------------------------------

export function cloneFrame(frame, name) {
  return {
    ...frame,
    id: uid('f'),
    name: name ?? `${frame.name} copy`,
    pixels: frame.pixels.slice(),
  }
}

export function withFramePixels(doc, index, pixels) {
  const frames = doc.frames.slice()
  frames[index] = { ...frames[index], pixels }
  return { ...doc, frames, updatedAt: Date.now() }
}

export function totalDuration(doc) {
  return doc.frames.reduce((sum, f) => sum + (f.duration || 100), 0)
}

// Frames come back from IndexedDB as whatever the structured clone produced,
// and an imported .json file has plain arrays. Normalising here means the rest
// of the editor can assume a Uint8Array of exactly w*h bytes.
export function normalizeDoc(raw) {
  if (!raw || !Array.isArray(raw.frames)) throw new Error('Not a sprite document')
  const width = clampSize(raw.width)
  const height = clampSize(raw.height)
  const palette = (Array.isArray(raw.palette) ? raw.palette : []).slice(0, MAX_PALETTE)
  const frames = raw.frames.map((f, i) => {
    const src = f.pixels instanceof Uint8Array ? f.pixels : new Uint8Array(f.pixels ?? [])
    const pixels =
      src.length === width * height
        ? src.slice()
        : resizeFromFlat(src, raw.width, raw.height, width, height)
    return {
      id: f.id ?? uid('f'),
      name: f.name ?? `Frame ${i + 1}`,
      duration: Number.isFinite(f.duration) ? f.duration : 100,
      pixels,
    }
  })
  return {
    version: DOC_VERSION,
    id: raw.id ?? uid('doc'),
    name: raw.name ?? 'Untitled sprite',
    width,
    height,
    paletteId: raw.paletteId ?? 'custom',
    palette: palette.length ? palette : getPalette(DEFAULT_PALETTE_ID),
    frames: frames.length ? frames : [createFrame(width, height, 'Frame 1')],
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    updatedAt: raw.updatedAt ?? Date.now(),
  }
}

function resizeFromFlat(src, ow, oh, nw, nh) {
  const safeOw = Number.isFinite(ow) && ow > 0 ? ow : nw
  const safeOh = Number.isFinite(oh) && oh > 0 ? oh : nh
  return resizePixels(src, safeOw, safeOh, nw, nh)
}

export function clampSize(v) {
  const n = Math.round(Number(v))
  if (!Number.isFinite(n)) return 32
  return Math.max(MIN_SIZE, Math.min(MAX_SIZE, n))
}

// Serializable form for file export / import. Uint8Array does not survive
// JSON.stringify, so pixels go out as plain number arrays; everything else is
// already JSON-safe.
export function docToJSON(doc) {
  return {
    ...doc,
    frames: doc.frames.map((f) => ({ ...f, pixels: Array.from(f.pixels) })),
  }
}
