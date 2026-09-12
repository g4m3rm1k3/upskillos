// Drawing the map, and turning it into files a game engine can load.

import { EMPTY, usedBounds } from './tilemapDoc.js'
import { tileRect } from './tileset.js'

// Draws the tiles that fall inside `view` and no others.
//
// A pre-rendered full-map canvas would be simpler, but a 512x512 map of 32px
// tiles is a 16384px square — well past what browsers will allocate. Culling to
// the viewport instead keeps the cost proportional to what you can actually see,
// which is a fixed thousand-odd drawImage calls no matter how big the map gets.
export function drawLayer(ctx, doc, layer, image, view) {
  if (!image || !doc.tileset) return
  const { scale, offX, offY, width, height } = view
  const tw = doc.tileW * scale
  const th = doc.tileH * scale

  const firstCol = Math.max(0, Math.floor(-offX / tw))
  const firstRow = Math.max(0, Math.floor(-offY / th))
  const lastCol = Math.min(doc.cols - 1, Math.ceil((width - offX) / tw))
  const lastRow = Math.min(doc.rows - 1, Math.ceil((height - offY) / th))

  for (let y = firstRow; y <= lastRow; y++) {
    for (let x = firstCol; x <= lastCol; x++) {
      const tile = layer.cells[y * doc.cols + x]
      if (tile === EMPTY) continue
      if (tile >= doc.tileset.count) continue
      const r = tileRect(doc.tileset, tile)
      ctx.drawImage(image, r.x, r.y, r.w, r.h, offX + x * tw, offY + y * th, tw, th)
    }
  }
}

// The collision layer has no art of its own — any non-empty cell is solid, and
// it renders as a translucent wash so you can see the tiles underneath while
// still reading the collision shape at a glance.
export function drawCollision(ctx, doc, layer, view) {
  const { scale, offX, offY, width, height } = view
  const tw = doc.tileW * scale
  const th = doc.tileH * scale
  const firstCol = Math.max(0, Math.floor(-offX / tw))
  const firstRow = Math.max(0, Math.floor(-offY / th))
  const lastCol = Math.min(doc.cols - 1, Math.ceil((width - offX) / tw))
  const lastRow = Math.min(doc.rows - 1, Math.ceil((height - offY) / th))

  ctx.fillStyle = 'rgba(244,63,94,0.38)'
  for (let y = firstRow; y <= lastRow; y++) {
    for (let x = firstCol; x <= lastCol; x++) {
      if (layer.cells[y * doc.cols + x] === EMPTY) continue
      ctx.fillRect(offX + x * tw, offY + y * th, tw, th)
    }
  }
}

// Flattens the visible tile layers into one image at `scale`. This is the
// "background" output: a finished PNG you can drop behind a scene, as opposed
// to the tile data an engine would stream.
export function renderFlat(doc, image, { scale = 1, crop = false, background = null } = {}) {
  const bounds = crop ? usedBounds(doc) : null
  const left = bounds ? bounds.left : 0
  const top = bounds ? bounds.top : 0
  const cols = bounds ? bounds.cols : doc.cols
  const rows = bounds ? bounds.rows : doc.rows

  const canvas = document.createElement('canvas')
  canvas.width = cols * doc.tileW * scale
  canvas.height = rows * doc.tileH * scale
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  if (!image || !doc.tileset) return canvas

  const tw = doc.tileW * scale
  const th = doc.tileH * scale
  for (const layer of doc.layers) {
    // Collision is design metadata, not art — it never belongs in the picture.
    if (!layer.visible || layer.kind === 'collision') continue
    ctx.globalAlpha = layer.opacity
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tile = layer.cells[(y + top) * doc.cols + (x + left)]
        if (tile === EMPTY || tile >= doc.tileset.count) continue
        const r = tileRect(doc.tileset, tile)
        ctx.drawImage(image, r.x, r.y, r.w, r.h, x * tw, y * th, tw, th)
      }
    }
  }
  ctx.globalAlpha = 1
  return canvas
}

// --- engine formats ------------------------------------------------------

// Tiled's .tmj. Tiled is the de-facto interchange format for 2D maps — Phaser,
// Godot, LÖVE, Defold and most engines either read it directly or have a plugin
// that does, so emitting it is worth far more than any bespoke format.
//
// The one thing to know: Tiled tile ids are "global ids" starting at 1, with 0
// reserved for an empty cell. Our indices are 0-based with -1 for empty, so
// every id shifts by `firstgid`.
export function buildTiledMap(doc, imageName) {
  const firstgid = 1
  const layers = doc.layers.map((layer, i) => ({
    id: i + 1,
    name: layer.name,
    type: 'tilelayer',
    width: doc.cols,
    height: doc.rows,
    x: 0,
    y: 0,
    opacity: layer.opacity,
    visible: layer.visible,
    // Collision cells carry no tile art, so they would export as an invisible
    // layer of nothing. Emitting them as tile 1 keeps the shape intact and the
    // custom property tells the engine to treat the layer as geometry.
    data: Array.from(layer.cells, (v) =>
      v === EMPTY ? 0 : layer.kind === 'collision' ? firstgid : v + firstgid,
    ),
    properties:
      layer.kind === 'collision'
        ? [{ name: 'collision', type: 'bool', value: true }]
        : undefined,
  }))

  return {
    type: 'map',
    version: '1.10',
    tiledversion: '1.10.2',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    infinite: false,
    width: doc.cols,
    height: doc.rows,
    tilewidth: doc.tileW,
    tileheight: doc.tileH,
    nextlayerid: doc.layers.length + 1,
    nextobjectid: 1,
    layers,
    tilesets: doc.tileset
      ? [
          {
            firstgid,
            name: doc.tileset.name || 'tileset',
            image: imageName,
            imagewidth: doc.tileset.imageWidth,
            imageheight: doc.tileset.imageHeight,
            tilewidth: doc.tileW,
            tileheight: doc.tileH,
            margin: doc.tileset.margin,
            spacing: doc.tileset.spacing,
            columns: doc.tileset.cols,
            tilecount: doc.tileset.count,
          },
        ]
      : [],
  }
}

// A ready-to-paste Phaser 3 scene. The format is standard enough that writing
// it out is more useful than documenting it: it shows exactly which names in
// the JSON have to match which strings in the code, which is the part that
// actually trips people up.
export function buildPhaserSnippet(doc, mapName, imageName) {
  const tilesetName = doc.tileset?.name || 'tileset'
  const tileLayers = doc.layers.filter((l) => l.kind !== 'collision')
  const collision = doc.layers.find((l) => l.kind === 'collision')
  const lines = [
    'function preload() {',
    `  this.load.image('tiles', '${imageName}')`,
    `  this.load.tilemapTiledJSON('map', '${mapName}')`,
    '}',
    '',
    'function create() {',
    "  const map = this.make.tilemap({ key: 'map' })",
    `  // The first argument must match the tileset name inside the .tmj,`,
    `  // the second is the load.image key above.`,
    `  const tiles = map.addTilesetImage('${tilesetName}', 'tiles')`,
    '',
    ...tileLayers.map((l, i) => `  const layer${i} = map.createLayer('${l.name}', tiles, 0, 0)`),
  ]
  if (collision) {
    lines.push(
      '',
      `  // Collision comes through as its own layer of tile 1.`,
      `  const solid = map.createLayer('${collision.name}', tiles, 0, 0)`,
      '  solid.setVisible(false)',
      '  solid.setCollisionByExclusion([-1, 0])',
      '  this.physics.add.collider(player, solid)',
    )
  }
  lines.push('}')
  return lines.join('\n')
}

// --- file output ---------------------------------------------------------

export function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png')
  })
}

export function dataUrlToBlob(dataUrl) {
  const [head, body] = dataUrl.split(',')
  const mime = /:(.*?);/.exec(head)?.[1] ?? 'image/png'
  const bytes = atob(body)
  const buf = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i)
  return new Blob([buf], { type: mime })
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadText(text, filename, type = 'application/json') {
  downloadBlob(new Blob([text], { type }), filename)
}

export function slug(s) {
  return (
    String(s)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'map'
  )
}
