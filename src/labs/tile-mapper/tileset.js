// Everything about the tileset image: where the tiles are in it, how to get
// one on screen, and how to build one from a PNG or straight out of Sprite
// Forge.
//
// The tileset lives in the document as a data URL rather than a file handle or
// a blob. It costs some size (a 256x256 PNG is roughly 30-60KB of base64) but
// it makes the document genuinely self-contained: one .tilemap.json holds the
// art and the map together, so a saved map still opens months later with no
// missing-image dialog.

export function sliceInfo({ imageWidth, imageHeight, tileW, tileH, margin = 0, spacing = 0 }) {
  // The +spacing on both sides of the division is the standard way to count
  // cells in a padded grid: n cells need n-1 gaps, so adding one phantom gap
  // to the numerator makes the division come out even.
  const cols = Math.max(0, Math.floor((imageWidth - margin * 2 + spacing) / (tileW + spacing)))
  const rows = Math.max(0, Math.floor((imageHeight - margin * 2 + spacing) / (tileH + spacing)))
  return { cols, rows, count: cols * rows }
}

// Pixel rect of one tile index within the tileset image.
export function tileRect(tileset, index) {
  const col = index % tileset.cols
  const row = Math.floor(index / tileset.cols)
  return {
    x: tileset.margin + col * (tileset.tileW + tileset.spacing),
    y: tileset.margin + row * (tileset.tileH + tileset.spacing),
    w: tileset.tileW,
    h: tileset.tileH,
  }
}

export function isValidTile(tileset, index) {
  return tileset && index >= 0 && index < tileset.count
}

export function buildTileset({ dataUrl, imageWidth, imageHeight, tileW, tileH, margin = 0, spacing = 0, name = 'Tileset' }) {
  const { cols, rows, count } = sliceInfo({ imageWidth, imageHeight, tileW, tileH, margin, spacing })
  return { name, dataUrl, imageWidth, imageHeight, tileW, tileH, margin, spacing, cols, rows, count }
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode that image'))
    img.src = src
  })
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read that file'))
    reader.readAsDataURL(file)
  })
}

// --- Sprite Forge bridge -------------------------------------------------

// Reaching into the sprite editor's own storage is deliberate: the two labs are
// one pipeline, and asking someone to export a PNG and re-import it just to use
// art they made in the next room over is the kind of friction that stops people
// finishing anything. Frames become tiles in order, packed into as square a
// sheet as the frame count allows.
export async function tilesetFromSprite(spriteId) {
  const { loadSprite } = await import('../sprite-forge/db.js')
  const { renderSheet } = await import('../sprite-forge/render.js')
  const doc = await loadSprite(spriteId)
  if (!doc) throw new Error('That sprite is no longer saved in this browser')

  // A long single row is awkward to pick from once there are more than a
  // handful of tiles, so square it up.
  const columns = Math.max(1, Math.round(Math.sqrt(doc.frames.length)))
  const { canvas } = renderSheet(doc, { columns, scale: 1, spacing: 0, margin: 0 })
  return buildTileset({
    dataUrl: canvas.toDataURL('image/png'),
    imageWidth: canvas.width,
    imageHeight: canvas.height,
    tileW: doc.width,
    tileH: doc.height,
    name: doc.name,
  })
}

export async function listSprites() {
  const { listSprites: list } = await import('../sprite-forge/db.js')
  return list()
}

// --- guessing sensible import defaults -----------------------------------

// Offered as a starting point in the import dialog, never applied silently.
// A tile size that divides the image evenly is far more likely to be right than
// one that leaves a remainder, and 16 beats 32 beats 8 in practice.
export function guessTileSize(imageWidth, imageHeight) {
  for (const size of [16, 32, 8, 24, 48, 64]) {
    if (imageWidth % size === 0 && imageHeight % size === 0) return size
  }
  return 16
}
