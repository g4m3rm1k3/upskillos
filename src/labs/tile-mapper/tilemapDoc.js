// The tilemap document model and every grid operation the editor performs.
//
// A layer is one Int16Array, one entry per cell, holding an index into the
// tileset — or EMPTY (-1) for nothing. Int16 rather than Uint8 because a
// tileset of more than 256 tiles is ordinary, and signed so that "empty" is a
// real value rather than a reserved tile index that shifts everything by one.
//
// As in the sprite editor, everything here is a pure function over
// (cells, cols, rows, ...) that mutates the array it is handed and returns it.
// Callers own the copying, which keeps undo to a single slice() per edit.

export const EMPTY = -1
export const MAX_DIM = 512
export const MIN_DIM = 1
export const DOC_VERSION = 1

let seq = 0
export function uid(prefix = 'id') {
  seq += 1
  return `${prefix}_${Date.now().toString(36)}_${seq.toString(36)}`
}

export function createCells(cols, rows) {
  const cells = new Int16Array(cols * rows)
  // Int16Array zero-fills, and 0 is a perfectly good tile index — so an
  // unfilled layer has to be explicitly emptied or the map starts covered in
  // whatever tile happens to be first in the tileset.
  cells.fill(EMPTY)
  return cells
}

export function createLayer(cols, rows, name = 'Layer', kind = 'tiles') {
  return {
    id: uid('l'),
    name,
    kind, // 'tiles' paints from the tileset; 'collision' is a boolean mask
    visible: true,
    locked: false,
    opacity: 1,
    cells: createCells(cols, rows),
  }
}

export function createDoc({ cols = 40, rows = 25, tileW = 16, tileH = 16, name = 'Untitled map' } = {}) {
  return {
    version: DOC_VERSION,
    id: uid('map'),
    name,
    cols,
    rows,
    tileW,
    tileH,
    tileset: null, // set by the import dialog — see tileset.js
    layers: [createLayer(cols, rows, 'Ground'), createLayer(cols, rows, 'Collision', 'collision')],
    // Autotile terrains: each names a 4x4 block of the tileset whose 16 tiles
    // cover every combination of matching neighbours. See autotileIndex below.
    terrains: [],
    updatedAt: Date.now(),
  }
}

// --- cell access --------------------------------------------------------

export function inBounds(cols, rows, x, y) {
  return x >= 0 && y >= 0 && x < cols && y < rows
}

export function getCell(cells, cols, rows, x, y) {
  return inBounds(cols, rows, x, y) ? cells[y * cols + x] : EMPTY
}

export function setCell(cells, cols, rows, x, y, value) {
  if (inBounds(cols, rows, x, y)) cells[y * cols + x] = value
  return cells
}

// --- stamps -------------------------------------------------------------

// A stamp is a rectangular block of tiles lifted from the tileset — selecting
// a 3x2 region there and painting it as one unit is how you place a whole
// doorway or a tree in a single click instead of nine.
export function stamp(cells, cols, rows, x, y, brush) {
  for (let dy = 0; dy < brush.h; dy++) {
    for (let dx = 0; dx < brush.w; dx++) {
      setCell(cells, cols, rows, x + dx, y + dy, brush.tiles[dy * brush.w + dx])
    }
  }
  return cells
}

// Drag-painting a multi-tile stamp should tile it continuously rather than
// restamp from the cursor every time, or a 2x2 brush dragged across the map
// produces a smear of top-left corners. Anchoring the pattern to the map grid
// (not the cursor) keeps a dragged stamp seamless.
export function stampAligned(cells, cols, rows, x, y, brush, anchorX = 0, anchorY = 0) {
  const ox = (((x - anchorX) % brush.w) + brush.w) % brush.w
  const oy = (((y - anchorY) % brush.h) + brush.h) % brush.h
  setCell(cells, cols, rows, x, y, brush.tiles[oy * brush.w + ox])
  return cells
}

export function drawRect(cells, cols, rows, x0, y0, x1, y1, brush, { fill = true } = {}) {
  const left = Math.min(x0, x1)
  const right = Math.max(x0, x1)
  const top = Math.min(y0, y1)
  const bottom = Math.max(y0, y1)
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      const edge = x === left || x === right || y === top || y === bottom
      if (!fill && !edge) continue
      stampAligned(cells, cols, rows, x, y, brush, left, top)
    }
  }
  return cells
}

// Line between two cells, so a dragged pointer that skips cells between frames
// still paints a continuous run.
export function drawLine(cells, cols, rows, x0, y0, x1, y1, brush, anchorX = 0, anchorY = 0) {
  let x = x0
  let y = y0
  const dx = Math.abs(x1 - x)
  const dy = Math.abs(y1 - y)
  const sx = x < x1 ? 1 : -1
  const sy = y < y1 ? 1 : -1
  let err = dx - dy
  for (;;) {
    stampAligned(cells, cols, rows, x, y, brush, anchorX, anchorY)
    if (x === x1 && y === y1) break
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
  return cells
}

// Span-based 4-connected fill over tile indices — the same algorithm the pixel
// editor uses, matching on tile index instead of palette index.
export function floodFill(cells, cols, rows, x, y, brush) {
  if (!inBounds(cols, rows, x, y)) return cells
  const target = cells[y * cols + x]
  const replacement = brush.tiles[0]
  // A single-tile brush painting the tile that is already there would loop
  // forever without this guard; a multi-tile brush still has work to do, since
  // the pattern varies cell to cell.
  if (brush.w === 1 && brush.h === 1 && target === replacement) return cells
  const stack = [x, y]
  const seen = new Uint8Array(cols * rows)
  while (stack.length) {
    const sy = stack.pop()
    const sx = stack.pop()
    const row = sy * cols
    if (cells[row + sx] !== target || seen[row + sx]) continue
    let lx = sx
    while (lx > 0 && cells[row + lx - 1] === target && !seen[row + lx - 1]) lx--
    let rx = sx
    while (rx < cols - 1 && cells[row + rx + 1] === target && !seen[row + rx + 1]) rx++
    for (let i = lx; i <= rx; i++) {
      seen[row + i] = 1
      stampAligned(cells, cols, rows, i, sy, brush)
    }
    for (const ny of [sy - 1, sy + 1]) {
      if (ny < 0 || ny >= rows) continue
      const nrow = ny * cols
      for (let i = lx; i <= rx; i++) {
        if (cells[nrow + i] === target && !seen[nrow + i]) stack.push(i, ny)
      }
    }
  }
  return cells
}

// --- autotiling ---------------------------------------------------------

// A terrain is a 4x4 block of the tileset. Which of its 16 tiles a cell gets
// is decided by which of its four orthogonal neighbours are the same terrain:
//
//     bit 0 (1) — north        index = N | E<<1 | S<<2 | W<<3
//     bit 1 (2) — east         tile  = block[index % 4][index / 4]
//     bit 2 (4) — south
//     bit 3 (8) — west
//
// So tile 0 is an isolated stub, tile 15 is fully surrounded interior, and the
// twelve between are the edges and corners. Authoring the block in that order
// is the whole contract — paint the 16 tiles in Sprite Forge, and the map
// picks the right one for every cell forever after.
export const AUTOTILE_SIZE = 4
export const AUTOTILE_TILES = AUTOTILE_SIZE * AUTOTILE_SIZE

export function createTerrain(col, row, name = 'Terrain') {
  return { id: uid('t'), name, col, row, edgeIsSolid: true }
}

// The tileset indices of a terrain's 16 tiles, in bitmask order.
export function terrainTiles(terrain, tilesetCols) {
  const out = new Array(AUTOTILE_TILES)
  for (let i = 0; i < AUTOTILE_TILES; i++) {
    const c = terrain.col + (i % AUTOTILE_SIZE)
    const r = terrain.row + Math.floor(i / AUTOTILE_SIZE)
    out[i] = r * tilesetCols + c
  }
  return out
}

export function terrainContains(terrain, tilesetCols, tile) {
  if (tile === EMPTY) return false
  const c = tile % tilesetCols
  const r = Math.floor(tile / tilesetCols)
  return (
    c >= terrain.col &&
    c < terrain.col + AUTOTILE_SIZE &&
    r >= terrain.row &&
    r < terrain.row + AUTOTILE_SIZE
  )
}

// Whether the neighbour at (x,y) counts as "same terrain" for the bitmask.
// Outside the map, `edgeIsSolid` decides: on, the terrain reads as continuing
// past the border, so a ground layer meets the map edge cleanly instead of
// drawing a coastline around the entire screen.
function matches(cells, cols, rows, x, y, terrain, tilesetCols) {
  if (!inBounds(cols, rows, x, y)) return terrain.edgeIsSolid
  return terrainContains(terrain, tilesetCols, cells[y * cols + x])
}

export function autotileIndex(cells, cols, rows, x, y, terrain, tilesetCols) {
  let mask = 0
  if (matches(cells, cols, rows, x, y - 1, terrain, tilesetCols)) mask |= 1
  if (matches(cells, cols, rows, x + 1, y, terrain, tilesetCols)) mask |= 2
  if (matches(cells, cols, rows, x, y + 1, terrain, tilesetCols)) mask |= 4
  if (matches(cells, cols, rows, x - 1, y, terrain, tilesetCols)) mask |= 8
  return mask
}

// Recompute one cell's tile from its neighbours. Only touches cells that
// already belong to the terrain — refreshing a cell that holds something else
// would overwrite unrelated art.
export function refreshAutotile(cells, cols, rows, x, y, terrain, tilesetCols) {
  if (!inBounds(cols, rows, x, y)) return cells
  if (!terrainContains(terrain, tilesetCols, cells[y * cols + x])) return cells
  const mask = autotileIndex(cells, cols, rows, x, y, terrain, tilesetCols)
  cells[y * cols + x] = terrainTiles(terrain, tilesetCols)[mask]
  return cells
}

// Paint one cell as terrain, then refresh it and its four neighbours: placing a
// tile changes what its neighbours should look like just as much as what it
// looks like itself.
export function paintTerrain(cells, cols, rows, x, y, terrain, tilesetCols) {
  if (!inBounds(cols, rows, x, y)) return cells
  cells[y * cols + x] = terrainTiles(terrain, tilesetCols)[0]
  for (const [nx, ny] of [
    [x, y],
    [x, y - 1],
    [x + 1, y],
    [x, y + 1],
    [x - 1, y],
  ]) {
    refreshAutotile(cells, cols, rows, nx, ny, terrain, tilesetCols)
  }
  return cells
}

// Erasing has to refresh the neighbours too, or the hole keeps its old
// interior tiles and the terrain appears to float over a gap.
export function eraseTerrain(cells, cols, rows, x, y, terrain, tilesetCols) {
  if (!inBounds(cols, rows, x, y)) return cells
  cells[y * cols + x] = EMPTY
  for (const [nx, ny] of [
    [x, y - 1],
    [x + 1, y],
    [x, y + 1],
    [x - 1, y],
  ]) {
    refreshAutotile(cells, cols, rows, nx, ny, terrain, tilesetCols)
  }
  return cells
}

// Re-derive every terrain cell on a layer. Used after a bulk edit (fill, or a
// resize) where refreshing neighbours one at a time would miss cells.
export function refreshAllAutotiles(cells, cols, rows, terrain, tilesetCols) {
  const source = cells.slice()
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!terrainContains(terrain, tilesetCols, source[y * cols + x])) continue
      // Masks are computed against the pre-edit snapshot so that cells updated
      // earlier in the sweep do not change the answer for cells after them.
      const mask = autotileIndex(source, cols, rows, x, y, terrain, tilesetCols)
      cells[y * cols + x] = terrainTiles(terrain, tilesetCols)[mask]
    }
  }
  return cells
}

// --- whole-map operations ------------------------------------------------

export function resizeCells(cells, cols, rows, nCols, nRows) {
  const out = createCells(nCols, nRows)
  const cw = Math.min(cols, nCols)
  const ch = Math.min(rows, nRows)
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) out[y * nCols + x] = cells[y * cols + x]
  }
  return out
}

export function shiftCells(cells, cols, rows, dx, dy) {
  const out = createCells(cols, rows)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const sx = x - dx
      const sy = y - dy
      if (sx < 0 || sy < 0 || sx >= cols || sy >= rows) continue
      out[y * cols + x] = cells[sy * cols + sx]
    }
  }
  cells.set(out)
  return cells
}

// Bounding box of non-empty cells across every visible layer, or null for an
// empty map. The exporter reports it so you can crop a map down to what you
// actually drew instead of shipping a screen of empty tiles.
export function usedBounds(doc) {
  let left = doc.cols
  let top = doc.rows
  let right = -1
  let bottom = -1
  for (const layer of doc.layers) {
    for (let y = 0; y < doc.rows; y++) {
      for (let x = 0; x < doc.cols; x++) {
        if (layer.cells[y * doc.cols + x] === EMPTY) continue
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
      }
    }
  }
  if (right < 0) return null
  return { left, top, right, bottom, cols: right - left + 1, rows: bottom - top + 1 }
}

export function countUsedTiles(doc) {
  let n = 0
  for (const layer of doc.layers) {
    for (let i = 0; i < layer.cells.length; i++) if (layer.cells[i] !== EMPTY) n++
  }
  return n
}

// --- serialization ------------------------------------------------------

export function clampDim(v) {
  const n = Math.round(Number(v))
  if (!Number.isFinite(n)) return 20
  return Math.max(MIN_DIM, Math.min(MAX_DIM, n))
}

export function docToJSON(doc) {
  return {
    ...doc,
    layers: doc.layers.map((l) => ({ ...l, cells: Array.from(l.cells) })),
  }
}

export function normalizeDoc(raw) {
  if (!raw || !Array.isArray(raw.layers)) throw new Error('Not a tilemap document')
  const cols = clampDim(raw.cols)
  const rows = clampDim(raw.rows)
  const layers = raw.layers.map((l, i) => {
    const src = l.cells instanceof Int16Array ? l.cells : Int16Array.from(l.cells ?? [])
    const cells =
      src.length === cols * rows
        ? src.slice()
        : resizeCells(src, raw.cols || cols, raw.rows || rows, cols, rows)
    return {
      id: l.id ?? uid('l'),
      name: l.name ?? `Layer ${i + 1}`,
      kind: l.kind === 'collision' ? 'collision' : 'tiles',
      visible: l.visible !== false,
      locked: Boolean(l.locked),
      opacity: Number.isFinite(l.opacity) ? l.opacity : 1,
      cells,
    }
  })
  return {
    version: DOC_VERSION,
    id: raw.id ?? uid('map'),
    name: raw.name ?? 'Untitled map',
    cols,
    rows,
    tileW: Math.max(1, raw.tileW || 16),
    tileH: Math.max(1, raw.tileH || 16),
    tileset: raw.tileset ?? null,
    layers: layers.length ? layers : [createLayer(cols, rows, 'Ground')],
    terrains: Array.isArray(raw.terrains) ? raw.terrains : [],
    updatedAt: raw.updatedAt ?? Date.now(),
  }
}
