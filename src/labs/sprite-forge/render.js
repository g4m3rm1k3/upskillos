// Turning indexed pixel data into actual images: on-screen previews, the
// packed sprite sheet, the atlas JSON that goes with it, and the reverse trip
// for importing a PNG back into the palette.

import { TRANSPARENT, contentBounds } from './pixelDoc.js'
import { hexToRgb, nearestPaletteValue, rgbToHex } from './palettes.js'

// Palette lookups happen once per frame render rather than once per pixel —
// parsing 4000 hex strings per repaint is the difference between a smooth
// 60fps drag and a visibly laggy one.
function paletteBytes(palette) {
  const out = new Uint8Array((palette.length + 1) * 3)
  for (let i = 0; i < palette.length; i++) {
    const [r, g, b] = hexToRgb(palette[i])
    out[(i + 1) * 3] = r
    out[(i + 1) * 3 + 1] = g
    out[(i + 1) * 3 + 2] = b
  }
  return out
}

// Writes one frame into an ImageData at 1:1. Scaling is left to drawImage with
// smoothing disabled, which is both faster than scaling here and the only way
// to get true nearest-neighbour blow-up in every browser.
export function writeFrameImageData(pixels, palette, imageData) {
  const pal = paletteBytes(palette)
  const data = imageData.data
  for (let i = 0; i < pixels.length; i++) {
    const v = pixels[i]
    const o = i * 4
    if (v === TRANSPARENT) {
      data[o] = 0
      data[o + 1] = 0
      data[o + 2] = 0
      data[o + 3] = 0
      continue
    }
    const p = v * 3
    data[o] = pal[p]
    data[o + 1] = pal[p + 1]
    data[o + 2] = pal[p + 2]
    data[o + 3] = 255
  }
  return imageData
}

// A detached 1:1 canvas holding one frame, ready to be drawImage'd anywhere.
// Callers that repaint often should pass a reusable canvas in to avoid
// allocating a new backing store on every pointermove.
export function frameToCanvas(pixels, width, height, palette, reuse = null) {
  const canvas = reuse ?? document.createElement('canvas')
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(width, height)
  writeFrameImageData(pixels, palette, img)
  ctx.putImageData(img, 0, 0)
  return canvas
}

// --- sheet packing -------------------------------------------------------

// Frame rectangles for a fixed-grid sheet. Every cell is the same size, which
// is what engines expect from a "sprite sheet" (as opposed to a packed atlas
// with tight, variable rects) and what keeps frame lookup a multiplication
// instead of a table read.
export function layoutSheet(doc, { columns, scale = 1, spacing = 0, margin = 0 } = {}) {
  const count = doc.frames.length
  const cols = Math.max(1, Math.min(columns || count, count))
  const rows = Math.ceil(count / cols)
  const cw = doc.width * scale
  const ch = doc.height * scale
  const rects = doc.frames.map((frame, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    return {
      index: i,
      name: frame.name,
      duration: frame.duration || 100,
      x: margin + col * (cw + spacing),
      y: margin + row * (ch + spacing),
      w: cw,
      h: ch,
    }
  })
  return {
    cols,
    rows,
    cellW: cw,
    cellH: ch,
    spacing,
    margin,
    width: margin * 2 + cols * cw + spacing * (cols - 1),
    height: margin * 2 + rows * ch + spacing * (rows - 1),
    rects,
  }
}

// Renders the packed sheet. `background` null keeps the sheet transparent,
// which is almost always what you want; a solid color is there for the times
// you need to eyeball the sheet itself in an image viewer.
export function renderSheet(doc, options = {}) {
  const layout = layoutSheet(doc, options)
  const canvas = document.createElement('canvas')
  canvas.width = layout.width
  canvas.height = layout.height
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  if (options.background) {
    ctx.fillStyle = options.background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  const scratch = document.createElement('canvas')
  for (const rect of layout.rects) {
    const frame = doc.frames[rect.index]
    frameToCanvas(frame.pixels, doc.width, doc.height, doc.palette, scratch)
    ctx.drawImage(scratch, 0, 0, doc.width, doc.height, rect.x, rect.y, rect.w, rect.h)
  }
  return { canvas, layout }
}

// A single frame blown up to `scale`, for exporting one sprite on its own.
export function renderFrame(doc, index, scale = 1) {
  const frame = doc.frames[index]
  const canvas = document.createElement('canvas')
  canvas.width = doc.width * scale
  canvas.height = doc.height * scale
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  const scratch = frameToCanvas(frame.pixels, doc.width, doc.height, doc.palette)
  ctx.drawImage(scratch, 0, 0, canvas.width, canvas.height)
  return canvas
}

// --- atlas metadata ------------------------------------------------------

// TexturePacker JSON Array — what Phaser 3 load.atlas, PixiJS and several
// others read directly. Frame names carry the animation tag when there is one
// so engines that build animations by name prefix work without extra config.
export function buildPhaserAtlas(doc, layout, imageName) {
  return {
    frames: layout.rects.map((rect) => ({
      filename: frameFileName(doc, rect.index),
      frame: { x: rect.x, y: rect.y, w: rect.w, h: rect.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: rect.w, h: rect.h },
      sourceSize: { w: rect.w, h: rect.h },
      duration: rect.duration,
    })),
    meta: {
      app: 'Sprite Forge (UpSkillOS)',
      version: '1.0',
      image: imageName,
      format: 'RGBA8888',
      size: { w: layout.width, h: layout.height },
      scale: String(layout.cellW / doc.width),
      frameTags: doc.tags.map((t) => ({ name: t.name, from: t.from, to: t.to, direction: 'forward' })),
    },
  }
}

// The minimal description an engine needs to slice a fixed grid: cell size,
// spacing, margin, count. Phaser load.spritesheet, Godot AtlasTexture and
// Unity's sprite editor all take exactly these numbers.
export function buildGridDescriptor(doc, layout, imageName) {
  return {
    image: imageName,
    frameWidth: layout.cellW,
    frameHeight: layout.cellH,
    margin: layout.margin,
    spacing: layout.spacing,
    columns: layout.cols,
    rows: layout.rows,
    frameCount: doc.frames.length,
    animations: (doc.tags.length
      ? doc.tags
      : [{ name: 'default', from: 0, to: doc.frames.length - 1 }]
    ).map((t) => ({
      name: t.name,
      frames: range(t.from, t.to),
      frameRate: suggestFrameRate(doc, t),
      repeat: -1,
    })),
  }
}

function range(from, to) {
  const out = []
  for (let i = Math.min(from, to); i <= Math.max(from, to); i++) out.push(i)
  return out
}

// Frame durations are authored in milliseconds because that is what reads
// naturally while timing an animation, but engines want a frame rate. Averaging
// over the tag's own frames keeps a tag with uniform timing exact and gives a
// sane approximation when durations vary.
function suggestFrameRate(doc, tag) {
  const frames = range(tag.from, tag.to)
    .map((i) => doc.frames[i])
    .filter(Boolean)
  if (!frames.length) return 12
  const avg = frames.reduce((s, f) => s + (f.duration || 100), 0) / frames.length
  return Math.max(1, Math.round(1000 / avg))
}

function frameFileName(doc, index) {
  const tag = doc.tags.find((t) => index >= Math.min(t.from, t.to) && index <= Math.max(t.from, t.to))
  const base = slug(doc.name || 'sprite')
  const n = String(index).padStart(String(doc.frames.length - 1).length, '0')
  return tag ? `${base}_${slug(tag.name)}_${n}.png` : `${base}_${n}.png`
}

export function slug(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sprite'
}

// A per-frame report the export panel shows before you commit: how much of the
// cell each frame actually fills, and whether the art wanders between frames.
// A drifting bounding box is the usual cause of an animation that looks like it
// is sliding rather than moving.
export function analyzeFrames(doc) {
  const rows = doc.frames.map((f, i) => {
    const b = contentBounds(f.pixels, doc.width, doc.height)
    const used = f.pixels.reduce((n, v) => n + (v === TRANSPARENT ? 0 : 1), 0)
    return {
      index: i,
      name: f.name,
      empty: !b,
      bounds: b,
      coverage: used / (doc.width * doc.height),
    }
  })
  const filled = rows.filter((r) => r.bounds)
  const drift = filled.length
    ? {
        left: Math.max(...filled.map((r) => r.bounds.left)) - Math.min(...filled.map((r) => r.bounds.left)),
        bottom:
          Math.max(...filled.map((r) => r.bounds.bottom)) - Math.min(...filled.map((r) => r.bounds.bottom)),
      }
    : { left: 0, bottom: 0 }
  return { rows, drift, emptyCount: rows.filter((r) => r.empty).length }
}

// --- file output ---------------------------------------------------------

export function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG encode failed'))), 'image/png')
  })
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoking immediately can cancel the download in some browsers, so give the
  // navigation a tick to start before releasing the object URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadText(text, filename, type = 'application/json') {
  downloadBlob(new Blob([text], { type }), filename)
}

// --- PNG import ----------------------------------------------------------

export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not decode that image'))
    }
    img.src = url
  })
}

// Reads an image into indexed frames.
//
// `cellW`/`cellH` let an existing sprite sheet be sliced back into frames on
// import, which is the whole point of supporting import at all: you can pull a
// sheet in, fix one frame, and push it back out. With them omitted the image is
// treated as a single frame and resampled to fit the document.
//
// Resampling is deliberately nearest-neighbour: on pixel art, any smoothing
// invents intermediate colors that then quantize to noise along every edge.
export function imageToFrames(img, { width, height, palette, cellW = 0, cellH = 0, extractPalette = false }) {
  const src = document.createElement('canvas')
  src.width = img.naturalWidth || img.width
  src.height = img.naturalHeight || img.height
  const sctx = src.getContext('2d', { willReadFrequently: true })
  sctx.imageSmoothingEnabled = false
  sctx.drawImage(img, 0, 0)

  const cells = []
  if (cellW > 0 && cellH > 0) {
    const cols = Math.max(1, Math.floor(src.width / cellW))
    const rows = Math.max(1, Math.floor(src.height / cellH))
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) cells.push({ sx: c * cellW, sy: r * cellH, sw: cellW, sh: cellH })
    }
  } else {
    cells.push({ sx: 0, sy: 0, sw: src.width, sh: src.height })
  }

  const activePalette = extractPalette ? extractPaletteFrom(sctx, src.width, src.height) : palette
  const frames = cells.map((cell) => {
    const pixels = new Uint8Array(width * height)
    const data = sctx.getImageData(cell.sx, cell.sy, cell.sw, cell.sh).data
    for (let y = 0; y < height; y++) {
      // Map destination pixel centres back into the source cell — sampling at
      // centres rather than corners avoids a half-pixel shift when up-scaling.
      const sy = Math.min(cell.sh - 1, Math.floor(((y + 0.5) * cell.sh) / height))
      for (let x = 0; x < width; x++) {
        const sx = Math.min(cell.sw - 1, Math.floor(((x + 0.5) * cell.sw) / width))
        const o = (sy * cell.sw + sx) * 4
        // Anything half-transparent or more becomes fully transparent: an
        // indexed format has no alpha channel to preserve the difference.
        pixels[y * width + x] =
          data[o + 3] < 128 ? TRANSPARENT : nearestPaletteValue(activePalette, data[o], data[o + 1], data[o + 2])
      }
    }
    return pixels
  })

  return { frames, palette: activePalette }
}

// Popularity quantization on a 4-bit-per-channel grid. Pixel art is already
// flat and low-color, so bucketing to 4096 bins and taking the most common
// buckets recovers the original palette almost exactly — no need for the
// median-cut or octree machinery a photograph would demand.
export function extractPaletteFrom(ctx, w, h, max = 32) {
  const data = ctx.getImageData(0, 0, w, h).data
  const counts = new Map()
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4)
    const prev = counts.get(key)
    if (prev) {
      prev.n++
      prev.r += data[i]
      prev.g += data[i + 1]
      prev.b += data[i + 2]
    } else {
      counts.set(key, { n: 1, r: data[i], g: data[i + 1], b: data[i + 2] })
    }
  }
  const top = [...counts.values()].sort((a, b) => b.n - a.n).slice(0, max)
  // Average the real colors inside each bucket instead of using the bucket
  // centre, so a palette round-trips through import unchanged.
  const colors = top.map((c) => rgbToHex(c.r / c.n, c.g / c.n, c.b / c.n))
  return colors.length ? colors : ['#000000', '#ffffff']
}
