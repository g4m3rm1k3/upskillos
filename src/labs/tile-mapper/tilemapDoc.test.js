import { describe, expect, it } from 'vitest'
import {
  AUTOTILE_TILES,
  EMPTY,
  autotileIndex,
  createCells,
  createDoc,
  createTerrain,
  drawRect,
  eraseTerrain,
  floodFill,
  getCell,
  normalizeDoc,
  paintTerrain,
  refreshAllAutotiles,
  resizeCells,
  shiftCells,
  stamp,
  stampAligned,
  terrainContains,
  terrainTiles,
  usedBounds,
} from './tilemapDoc.js'

// A tileset 8 columns wide, with a terrain block whose top-left is (0,0) —
// so the terrain occupies tileset indices 0-3, 8-11, 16-19, 24-27.
const TS_COLS = 8
const terrain = () => createTerrain(0, 0, 'Grass')

// Renders a layer as text: '.' for empty, otherwise the tile index in base 36.
function art(cells, cols, rows) {
  const out = []
  for (let y = 0; y < rows; y++) {
    let row = ''
    for (let x = 0; x < cols; x++) {
      const v = cells[y * cols + x]
      row += v === EMPTY ? '.' : v.toString(36)
    }
    out.push(row)
  }
  return out.join('\n')
}

const one = (tile) => ({ w: 1, h: 1, tiles: [tile] })

describe('createCells', () => {
  it('starts empty rather than full of tile 0', () => {
    const cells = createCells(3, 2)
    expect(art(cells, 3, 2)).toBe(['...', '...'].join('\n'))
  })
})

describe('stamp', () => {
  it('places a multi-tile block anchored at the cursor', () => {
    const cells = createCells(4, 4)
    stamp(cells, 4, 4, 1, 1, { w: 2, h: 2, tiles: [1, 2, 3, 4] })
    expect(art(cells, 4, 4)).toBe(['....', '.12.', '.34.', '....'].join('\n'))
  })

  it('clips at the map edge instead of wrapping', () => {
    const cells = createCells(3, 3)
    stamp(cells, 3, 3, 2, 2, { w: 2, h: 2, tiles: [1, 2, 3, 4] })
    expect(art(cells, 3, 3)).toBe(['...', '...', '..1'].join('\n'))
  })
})

describe('stampAligned', () => {
  it('tiles a pattern against the map grid, not the cursor', () => {
    const cells = createCells(4, 1)
    const brush = { w: 2, h: 1, tiles: [1, 2] }
    // Painting four separate cells left to right must reproduce the pattern
    // continuously — this is what stops a dragged 2x1 brush from smearing the
    // same tile across the whole row.
    for (let x = 0; x < 4; x++) stampAligned(cells, 4, 1, x, 0, brush)
    expect(art(cells, 4, 1)).toBe('1212')
  })

  it('keeps the pattern continuous when painted right to left', () => {
    const cells = createCells(4, 1)
    const brush = { w: 2, h: 1, tiles: [1, 2] }
    for (let x = 3; x >= 0; x--) stampAligned(cells, 4, 1, x, 0, brush)
    expect(art(cells, 4, 1)).toBe('1212')
  })
})

describe('drawRect', () => {
  it('fills a rectangle', () => {
    const cells = createCells(4, 3)
    drawRect(cells, 4, 3, 1, 0, 3, 2, one(5))
    expect(art(cells, 4, 3)).toBe(['.555', '.555', '.555'].join('\n'))
  })

  it('draws an outline when fill is off', () => {
    const cells = createCells(5, 4)
    drawRect(cells, 5, 4, 0, 0, 4, 3, one(7), { fill: false })
    expect(art(cells, 5, 4)).toBe(['77777', '7...7', '7...7', '77777'].join('\n'))
  })

  it('normalises a rectangle dragged up and to the left', () => {
    const a = createCells(4, 4)
    const b = createCells(4, 4)
    drawRect(a, 4, 4, 0, 0, 2, 2, one(1))
    drawRect(b, 4, 4, 2, 2, 0, 0, one(1))
    expect(art(a, 4, 4)).toBe(art(b, 4, 4))
  })
})

describe('floodFill', () => {
  it('fills a region bounded by different tiles', () => {
    const cells = createCells(5, 4)
    drawRect(cells, 5, 4, 0, 0, 4, 3, one(9), { fill: false })
    floodFill(cells, 5, 4, 2, 1, one(3))
    expect(art(cells, 5, 4)).toBe(['99999', '93339', '93339', '99999'].join('\n'))
  })

  it('does nothing when the target already holds the fill tile', () => {
    const cells = createCells(3, 3)
    cells.fill(4)
    floodFill(cells, 3, 3, 1, 1, one(4))
    expect(art(cells, 3, 3)).toBe(['444', '444', '444'].join('\n'))
  })

  it('terminates with a multi-tile brush over its own output', () => {
    // Without the `seen` mask this loops forever: the brush paints tiles that
    // still match the fill target, so the spans never stop growing.
    const cells = createCells(6, 6)
    floodFill(cells, 6, 6, 0, 0, { w: 2, h: 2, tiles: [1, 2, 3, 4] })
    expect(art(cells, 6, 6).includes('.')).toBe(false)
  })

  it('ignores a click outside the map', () => {
    const cells = createCells(3, 3)
    expect(() => floodFill(cells, 3, 3, 9, 9, one(1))).not.toThrow()
    expect(art(cells, 3, 3)).toBe(['...', '...', '...'].join('\n'))
  })
})

describe('terrainTiles / terrainContains', () => {
  it('lists the 16 tiles of a 4x4 block in bitmask order', () => {
    const tiles = terrainTiles(terrain(), TS_COLS)
    expect(tiles.length).toBe(AUTOTILE_TILES)
    expect(tiles.slice(0, 4)).toEqual([0, 1, 2, 3])
    expect(tiles.slice(4, 8)).toEqual([8, 9, 10, 11])
    expect(tiles[15]).toBe(27)
  })

  it('recognises its own tiles and rejects others', () => {
    const t = terrain()
    expect(terrainContains(t, TS_COLS, 0)).toBe(true)
    expect(terrainContains(t, TS_COLS, 27)).toBe(true)
    expect(terrainContains(t, TS_COLS, 4)).toBe(false) // same rows, past the block
    expect(terrainContains(t, TS_COLS, 32)).toBe(false) // below the block
    expect(terrainContains(t, TS_COLS, EMPTY)).toBe(false)
  })

  it('handles a block that is not at the tileset origin', () => {
    const t = createTerrain(4, 1)
    expect(terrainTiles(t, TS_COLS)[0]).toBe(12) // row 1, col 4
    expect(terrainContains(t, TS_COLS, 12)).toBe(true)
    expect(terrainContains(t, TS_COLS, 11)).toBe(false)
  })
})

describe('autotileIndex', () => {
  const t = { ...terrain(), edgeIsSolid: false }

  it('reports an isolated cell as mask 0', () => {
    const cells = createCells(3, 3)
    cells[4] = 0 // centre belongs to the terrain
    expect(autotileIndex(cells, 3, 3, 1, 1, t, TS_COLS)).toBe(0)
  })

  it('sets one bit per matching orthogonal neighbour', () => {
    const cells = createCells(3, 3)
    cells[4] = 0
    cells[1] = 0 // north
    expect(autotileIndex(cells, 3, 3, 1, 1, t, TS_COLS)).toBe(1)
    cells[5] = 0 // east
    expect(autotileIndex(cells, 3, 3, 1, 1, t, TS_COLS)).toBe(1 | 2)
    cells[7] = 0 // south
    expect(autotileIndex(cells, 3, 3, 1, 1, t, TS_COLS)).toBe(1 | 2 | 4)
    cells[3] = 0 // west
    expect(autotileIndex(cells, 3, 3, 1, 1, t, TS_COLS)).toBe(15)
  })

  it('ignores diagonals', () => {
    const cells = createCells(3, 3)
    cells[4] = 0
    cells[0] = 0
    cells[2] = 0
    cells[6] = 0
    cells[8] = 0
    expect(autotileIndex(cells, 3, 3, 1, 1, t, TS_COLS)).toBe(0)
  })

  it('treats the map edge as solid when edgeIsSolid is on', () => {
    const solid = terrain() // edgeIsSolid defaults to true
    const cells = createCells(3, 3)
    cells[0] = 0
    // Top-left corner: north and west are off-map, east and south are empty.
    expect(autotileIndex(cells, 3, 3, 0, 0, solid, TS_COLS)).toBe(1 | 8)
  })

  it('treats the map edge as open when edgeIsSolid is off', () => {
    const cells = createCells(3, 3)
    cells[0] = 0
    expect(autotileIndex(cells, 3, 3, 0, 0, t, TS_COLS)).toBe(0)
  })
})

describe('paintTerrain', () => {
  const t = { ...terrain(), edgeIsSolid: false }
  const tiles = terrainTiles(terrain(), TS_COLS)

  it('joins two adjacent cells to each other', () => {
    const cells = createCells(4, 1)
    paintTerrain(cells, 4, 1, 1, 0, t, TS_COLS)
    paintTerrain(cells, 4, 1, 2, 0, t, TS_COLS)
    // The left cell now points east (2), the right one west (8) — the newly
    // placed tile updated its neighbour, not just itself.
    expect(getCell(cells, 4, 1, 1, 0)).toBe(tiles[2])
    expect(getCell(cells, 4, 1, 2, 0)).toBe(tiles[8])
  })

  it('makes a fully enclosed cell the interior tile', () => {
    const cells = createCells(3, 3)
    for (const [x, y] of [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 2],
    ]) {
      paintTerrain(cells, 3, 3, x, y, t, TS_COLS)
    }
    expect(getCell(cells, 3, 3, 1, 1)).toBe(tiles[15])
  })

  it('does not disturb cells belonging to other art', () => {
    const cells = createCells(3, 1)
    cells[0] = 99 // a tile from elsewhere in the tileset
    paintTerrain(cells, 3, 1, 1, 0, t, TS_COLS)
    expect(getCell(cells, 3, 1, 0, 0)).toBe(99)
  })
})

describe('eraseTerrain', () => {
  const t = { ...terrain(), edgeIsSolid: false }
  const tiles = terrainTiles(terrain(), TS_COLS)

  it('rejoins the neighbours after a cell is removed', () => {
    const cells = createCells(3, 1)
    for (let x = 0; x < 3; x++) paintTerrain(cells, 3, 1, x, 0, t, TS_COLS)
    expect(getCell(cells, 3, 1, 1, 0)).toBe(tiles[2 | 8])

    eraseTerrain(cells, 3, 1, 1, 0, t, TS_COLS)
    expect(getCell(cells, 3, 1, 1, 0)).toBe(EMPTY)
    // The survivors must forget the neighbour that is gone.
    expect(getCell(cells, 3, 1, 0, 0)).toBe(tiles[0])
    expect(getCell(cells, 3, 1, 2, 0)).toBe(tiles[0])
  })
})

describe('refreshAllAutotiles', () => {
  const t = { ...terrain(), edgeIsSolid: false }
  const tiles = terrainTiles(terrain(), TS_COLS)

  it('re-derives every terrain cell after a bulk edit', () => {
    const cells = createCells(3, 1)
    // Paint the raw terrain tile directly, as a bulk fill would — no masks.
    cells[0] = tiles[0]
    cells[1] = tiles[0]
    cells[2] = tiles[0]
    refreshAllAutotiles(cells, 3, 1, t, TS_COLS)
    expect(getCell(cells, 3, 1, 0, 0)).toBe(tiles[2])
    expect(getCell(cells, 3, 1, 1, 0)).toBe(tiles[2 | 8])
    expect(getCell(cells, 3, 1, 2, 0)).toBe(tiles[8])
  })

  it('is stable — running it twice changes nothing', () => {
    const cells = createCells(4, 4)
    for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) cells[y * 4 + x] = tiles[0]
    refreshAllAutotiles(cells, 4, 4, t, TS_COLS)
    const once = art(cells, 4, 4)
    refreshAllAutotiles(cells, 4, 4, t, TS_COLS)
    expect(art(cells, 4, 4)).toBe(once)
  })
})

describe('resizeCells', () => {
  it('anchors the map top-left and pads with empty', () => {
    const cells = createCells(2, 2)
    cells.set([1, 2, 3, 4])
    const out = resizeCells(cells, 2, 2, 3, 3)
    expect(art(out, 3, 3)).toBe(['12.', '34.', '...'].join('\n'))
  })

  it('crops when shrinking', () => {
    const cells = createCells(3, 3)
    cells.set([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(art(resizeCells(cells, 3, 3, 2, 2), 2, 2)).toBe(['12', '45'].join('\n'))
  })
})

describe('shiftCells', () => {
  it('moves cells and drops what falls off the edge', () => {
    const cells = createCells(3, 1)
    cells.set([1, 2, 3])
    shiftCells(cells, 3, 1, 1, 0)
    expect(art(cells, 3, 1)).toBe('.12')
  })
})

describe('usedBounds', () => {
  it('spans every layer, not just the first', () => {
    const doc = createDoc({ cols: 4, rows: 4 })
    doc.layers[0].cells[1 * 4 + 1] = 5
    doc.layers[1].cells[2 * 4 + 3] = 6
    expect(usedBounds(doc)).toEqual({
      left: 1,
      top: 1,
      right: 3,
      bottom: 2,
      cols: 3,
      rows: 2,
    })
  })

  it('returns null for an untouched map', () => {
    expect(usedBounds(createDoc({ cols: 4, rows: 4 }))).toBeNull()
  })
})

describe('normalizeDoc', () => {
  it('rebuilds Int16Array layers from the plain arrays in a JSON file', () => {
    const doc = normalizeDoc({
      cols: 2,
      rows: 2,
      layers: [{ cells: [1, -1, -1, 2] }],
    })
    expect(doc.layers[0].cells).toBeInstanceOf(Int16Array)
    expect(art(doc.layers[0].cells, 2, 2)).toBe(['1.', '.2'].join('\n'))
  })

  it('repairs a layer whose cell count disagrees with the map size', () => {
    const doc = normalizeDoc({ cols: 4, rows: 4, layers: [{ cells: [1, 2] }] })
    expect(doc.layers[0].cells.length).toBe(16)
  })

  it('clamps an absurd map size', () => {
    const doc = normalizeDoc({ cols: 99999, rows: 0, layers: [{ cells: [] }] })
    expect(doc.cols).toBe(512)
    expect(doc.rows).toBe(1)
  })

  it('rejects something that is not a tilemap', () => {
    expect(() => normalizeDoc({ nope: true })).toThrow(/tilemap document/i)
  })
})
