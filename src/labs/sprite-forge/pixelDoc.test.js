import { describe, expect, it } from 'vitest'
import {
  contentBounds,
  createPixels,
  drawEllipse,
  drawLine,
  drawRect,
  flipH,
  flipV,
  floodFill,
  getPixel,
  mirrorPoints,
  normalizeDoc,
  paintBrush,
  replaceValue,
  resizePixels,
  rotate90,
  shift,
} from './pixelDoc.js'

// Renders a frame as text so a failure shows the actual shape rather than a
// diff of 1024 array indices. '.' is transparent, any other char is that
// pixel's palette index.
function art(px, w, h) {
  const rows = []
  for (let y = 0; y < h; y++) {
    let row = ''
    for (let x = 0; x < w; x++) row += px[y * w + x] === 0 ? '.' : String(px[y * w + x])
    rows.push(row)
  }
  return rows.join('\n')
}

function fromArt(str) {
  const rows = str.trim().split('\n').map((r) => r.trim())
  const h = rows.length
  const w = rows[0].length
  const px = createPixels(w, h)
  rows.forEach((row, y) => {
    ;[...row].forEach((c, x) => {
      px[y * w + x] = c === '.' ? 0 : Number(c)
    })
  })
  return { px, w, h }
}

describe('paintBrush', () => {
  it('puts a 1px brush exactly under the cursor', () => {
    const px = createPixels(5, 5)
    paintBrush(px, 5, 5, 2, 3, 1, 1)
    expect(getPixel(px, 5, 5, 2, 3)).toBe(1)
    expect(px.reduce((a, b) => a + b, 0)).toBe(1)
  })

  it('anchors odd sizes on the cursor', () => {
    const px = createPixels(5, 5)
    paintBrush(px, 5, 5, 2, 2, 1, 3)
    expect(art(px, 5, 5)).toBe(['.....', '.111.', '.111.', '.111.', '.....'].join('\n'))
  })

  it('clips at the edges instead of wrapping', () => {
    const px = createPixels(4, 4)
    paintBrush(px, 4, 4, 0, 0, 1, 3)
    // A brush hanging off the top-left must not reappear on the opposite edge.
    expect(art(px, 4, 4)).toBe(['11..', '11..', '....', '....'].join('\n'))
  })
})

describe('drawLine', () => {
  it('draws a connected diagonal', () => {
    const px = createPixels(5, 5)
    drawLine(px, 5, 5, 0, 0, 4, 4, 1)
    expect(art(px, 5, 5)).toBe(['1....', '.1...', '..1..', '...1.', '....1'].join('\n'))
  })

  it('includes both endpoints', () => {
    const px = createPixels(6, 1)
    drawLine(px, 6, 1, 1, 0, 4, 0, 2)
    expect(art(px, 6, 1)).toBe('.2222.')
  })

  it('leaves no gaps on a shallow slope', () => {
    const w = 9
    const h = 3
    const px = createPixels(w, h)
    drawLine(px, w, h, 0, 0, 8, 2, 1)
    // Every column must be touched — a gap here is the dotted-trail bug that
    // interpolating between pointermove samples exists to prevent.
    for (let x = 0; x < w; x++) {
      const column = [0, 1, 2].some((y) => px[y * w + x] !== 0)
      expect(column, `column ${x}`).toBe(true)
    }
  })
})

describe('drawRect', () => {
  it('draws an outline, not a fill', () => {
    const px = createPixels(5, 4)
    drawRect(px, 5, 4, 0, 0, 4, 3, 1)
    expect(art(px, 5, 4)).toBe(['11111', '1...1', '1...1', '11111'].join('\n'))
  })

  it('fills when asked', () => {
    const px = createPixels(4, 3)
    drawRect(px, 4, 3, 1, 1, 3, 2, 1, { fill: true })
    expect(art(px, 4, 3)).toBe(['....', '.111', '.111'].join('\n'))
  })

  it('normalises a rect dragged up and to the left', () => {
    const a = createPixels(4, 4)
    const b = createPixels(4, 4)
    drawRect(a, 4, 4, 0, 0, 3, 3, 1)
    drawRect(b, 4, 4, 3, 3, 0, 0, 1)
    expect(art(a, 4, 4)).toBe(art(b, 4, 4))
  })
})

describe('drawEllipse', () => {
  it('produces a symmetric outline on a small odd box', () => {
    const px = createPixels(7, 7)
    drawEllipse(px, 7, 7, 0, 0, 6, 6, 1)
    const rendered = art(px, 7, 7)
    const rows = rendered.split('\n')
    // Mirror symmetry in both axes is the property that matters: an asymmetric
    // small circle is immediately obvious as a wobble in the sprite.
    expect(rows).toEqual([...rows].reverse())
    for (const row of rows) expect(row).toBe([...row].reverse().join(''))
  })

  it('fills without leaving holes', () => {
    const w = 9
    const h = 7
    const px = createPixels(w, h)
    drawEllipse(px, w, h, 0, 0, w - 1, h - 1, 1, { fill: true })
    // Scanning each row, the filled pixels must be one unbroken run.
    for (let y = 0; y < h; y++) {
      const row = Array.from(px.slice(y * w, y * w + w))
      const first = row.indexOf(1)
      const last = row.lastIndexOf(1)
      if (first === -1) continue
      for (let x = first; x <= last; x++) expect(row[x], `row ${y} col ${x}`).toBe(1)
    }
  })

  it('degenerates to a line for a zero-height box', () => {
    const px = createPixels(5, 3)
    drawEllipse(px, 5, 3, 0, 1, 4, 1, 1)
    expect(art(px, 5, 3)).toBe(['.....', '11111', '.....'].join('\n'))
  })
})

describe('floodFill', () => {
  it('fills an enclosed region without leaking through the wall', () => {
    const { px, w, h } = fromArt(`
      11111
      1...1
      1...1
      11111
    `)
    floodFill(px, w, h, 2, 2, 2)
    expect(art(px, w, h)).toBe(['11111', '12221', '12221', '11111'].join('\n'))
  })

  it('leaks through a one-pixel gap, since it is 4-connected', () => {
    const { px, w, h } = fromArt(`
      111.1
      1...1
      11111
    `)
    floodFill(px, w, h, 2, 1, 2)
    // The gap at (3,0) connects inside to outside — worth pinning down, because
    // "my fill escaped" is always a hole in the outline, not a bug in the fill.
    expect(getPixel(px, w, h, 3, 0)).toBe(2)
  })

  it('is a no-op when the target already has the fill value', () => {
    const { px, w, h } = fromArt(`
      22
      22
    `)
    const before = art(px, w, h)
    floodFill(px, w, h, 0, 0, 2)
    expect(art(px, w, h)).toBe(before)
  })

  it('ignores clicks outside the canvas', () => {
    const px = createPixels(3, 3)
    expect(() => floodFill(px, 3, 3, 5, 5, 1)).not.toThrow()
    expect(px.reduce((a, b) => a + b, 0)).toBe(0)
  })

  it('fills a spiral that needs spans on both sides of the seed', () => {
    const { px, w, h } = fromArt(`
      1111111
      1.....1
      1.111.1
      1.1.1.1
      1.1.1.1
      1...1.1
      1111111
    `)
    floodFill(px, w, h, 1, 1, 2)
    // The channel winds left, down, right and back up, so the fill has to walk
    // spans upward as well as downward and pick the inner column up from below.
    expect(art(px, w, h)).toBe(
      ['1111111', '1222221', '1211121', '1212121', '1212121', '1222121', '1111111'].join('\n'),
    )
  })
})

describe('transforms', () => {
  it('flips horizontally', () => {
    const { px, w, h } = fromArt(`
      12.
      3..
    `)
    flipH(px, w, h)
    expect(art(px, w, h)).toBe(['.21', '..3'].join('\n'))
  })

  it('flips vertically', () => {
    const { px, w, h } = fromArt(`
      12
      34
    `)
    flipV(px, w, h)
    expect(art(px, w, h)).toBe(['34', '12'].join('\n'))
  })

  it('rotates a square 90 degrees clockwise', () => {
    const { px, w, h } = fromArt(`
      12
      34
    `)
    rotate90(px, w, h)
    expect(art(px, w, h)).toBe(['31', '42'].join('\n'))
  })

  it('refuses to rotate a non-square frame', () => {
    const { px, w, h } = fromArt(`
      12
      34
      56
    `)
    const before = art(px, w, h)
    rotate90(px, w, h)
    expect(art(px, w, h)).toBe(before)
  })

  it('four rotations return to the original', () => {
    const { px, w, h } = fromArt(`
      12.
      .3.
      ..4
    `)
    const before = art(px, w, h)
    rotate90(px, w, h)
    rotate90(px, w, h)
    rotate90(px, w, h)
    rotate90(px, w, h)
    expect(art(px, w, h)).toBe(before)
  })

  it('wraps a shift around the edges so tiles stay seamless', () => {
    const { px, w, h } = fromArt(`
      12
      34
    `)
    shift(px, w, h, 1, 0, true)
    expect(art(px, w, h)).toBe(['21', '43'].join('\n'))
  })

  it('drops pixels off the edge when wrap is off', () => {
    const { px, w, h } = fromArt(`
      12
      34
    `)
    shift(px, w, h, 1, 0, false)
    expect(art(px, w, h)).toBe(['.1', '.3'].join('\n'))
  })
})

describe('replaceValue', () => {
  it('swaps one palette index for another everywhere', () => {
    const { px, w, h } = fromArt(`
      121
      212
    `)
    replaceValue(px, 2, 3)
    expect(art(px, w, h)).toBe(['131', '313'].join('\n'))
  })
})

describe('resizePixels', () => {
  it('anchors existing art top-left when growing', () => {
    const { px, w, h } = fromArt(`
      12
      34
    `)
    const out = resizePixels(px, w, h, 3, 3)
    expect(art(out, 3, 3)).toBe(['12.', '34.', '...'].join('\n'))
  })

  it('crops when shrinking rather than resampling', () => {
    const { px, w, h } = fromArt(`
      123
      456
      789
    `)
    const out = resizePixels(px, w, h, 2, 2)
    expect(art(out, 2, 2)).toBe(['12', '45'].join('\n'))
  })
})

describe('contentBounds', () => {
  it('returns the tight box around non-transparent pixels', () => {
    const { px, w, h } = fromArt(`
      ....
      .11.
      .1..
      ....
    `)
    expect(contentBounds(px, w, h)).toEqual({
      left: 1,
      top: 1,
      right: 2,
      bottom: 2,
      width: 2,
      height: 2,
    })
  })

  it('returns null for an empty frame', () => {
    expect(contentBounds(createPixels(4, 4), 4, 4)).toBeNull()
  })
})

describe('mirrorPoints', () => {
  it('reflects across the vertical centre', () => {
    expect(mirrorPoints(8, 8, 1, 3, { mirrorX: true })).toEqual([
      [1, 3],
      [6, 3],
    ])
  })

  it('produces four points with both axes active', () => {
    expect(mirrorPoints(8, 8, 1, 2, { mirrorX: true, mirrorY: true })).toEqual([
      [1, 2],
      [6, 2],
      [1, 5],
      [6, 5],
    ])
  })

  it('returns one point with symmetry off', () => {
    expect(mirrorPoints(8, 8, 4, 4)).toEqual([[4, 4]])
  })
})

describe('normalizeDoc', () => {
  it('rebuilds Uint8Array frames from the plain arrays in a JSON file', () => {
    const doc = normalizeDoc({
      width: 4,
      height: 4,
      palette: ['#ffffff'],
      frames: [{ pixels: [1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1] }],
    })
    expect(doc.frames[0].pixels).toBeInstanceOf(Uint8Array)
    expect(art(doc.frames[0].pixels, 4, 4)).toBe(['1..1', '.11.', '.11.', '1..1'].join('\n'))
  })

  it('repairs a frame whose pixel count does not match its dimensions', () => {
    const doc = normalizeDoc({
      width: 5,
      height: 5,
      palette: ['#ffffff'],
      // Claims 5x5 but carries only 4 bytes: the file is damaged, and the
      // editor has to open it anyway rather than throw the art away.
      frames: [{ pixels: [1, 1, 1, 1] }],
    })
    expect(doc.frames[0].pixels.length).toBe(25)
  })

  it('raises a below-minimum canvas size to the smallest supported one', () => {
    const doc = normalizeDoc({ width: 2, height: 2, frames: [{ pixels: [1, 1, 1, 1] }] })
    expect([doc.width, doc.height]).toEqual([4, 4])
  })

  it('supplies a palette and a frame when both are missing', () => {
    const doc = normalizeDoc({ width: 8, height: 8, frames: [] })
    expect(doc.palette.length).toBeGreaterThan(0)
    expect(doc.frames.length).toBe(1)
  })

  it('clamps absurd dimensions into the supported range', () => {
    const doc = normalizeDoc({ width: 9999, height: 0, frames: [{ pixels: [] }] })
    expect(doc.width).toBe(128)
    expect(doc.height).toBe(4)
  })

  it('rejects something that is not a sprite document', () => {
    expect(() => normalizeDoc({ hello: 'world' })).toThrow(/sprite document/i)
  })
})
