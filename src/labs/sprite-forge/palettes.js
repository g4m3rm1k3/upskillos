// Preset palettes for pixel art. Working from a fixed, small palette is the
// single biggest thing that makes hand-made sprites read as a coherent set,
// so the lab ships with the classics rather than a free-form color picker
// only — you can still add/edit any swatch once a preset is loaded.
//
// Every palette is a plain array of '#rrggbb' strings. Index 0 of a frame's
// pixel data always means "transparent", so palette[0] is stored at pixel
// value 1 — see pixelDoc.js.

export const PALETTES = [
  {
    id: 'pico8',
    name: 'PICO-8 (16)',
    note: 'The PICO-8 fantasy-console palette — punchy, high contrast.',
    colors: [
      '#000000', '#1d2b53', '#7e2553', '#008751',
      '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
      '#ff004d', '#ffa300', '#ffec27', '#00e436',
      '#29adff', '#83769c', '#ff77a8', '#ffccaa',
    ],
  },
  {
    id: 'sweetie16',
    name: 'Sweetie 16',
    note: 'Soft, well-ramped 16 — good for characters and UI alike.',
    colors: [
      '#1a1c2c', '#5d275d', '#b13e53', '#ef7d57',
      '#ffcd75', '#a7f070', '#38b764', '#257179',
      '#29366f', '#3b5dc9', '#41a6f6', '#73eff7',
      '#f4f4f4', '#94b0c2', '#566c86', '#333c57',
    ],
  },
  {
    id: 'db16',
    name: 'DawnBringer 16',
    note: 'A muted, naturalistic 16 — the go-to for tiles and terrain.',
    colors: [
      '#140c1c', '#442434', '#30346d', '#4e4a4e',
      '#854c30', '#346524', '#d04648', '#757161',
      '#597dce', '#d27d2c', '#8595a1', '#6daa2c',
      '#d2aa99', '#6dc2ca', '#dad45e', '#deeed6',
    ],
  },
  {
    id: 'gameboy',
    name: 'Game Boy DMG (4)',
    note: 'Four greens. Forces you to solve everything with value alone.',
    colors: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
  },
  {
    id: 'gray8',
    name: 'Grayscale (8)',
    note: 'Value study palette — block out light and shadow first.',
    colors: [
      '#000000', '#242424', '#484848', '#6c6c6c',
      '#909090', '#b4b4b4', '#d8d8d8', '#ffffff',
    ],
  },
  {
    id: 'endesga8',
    name: 'Bright 8',
    note: 'A tiny saturated set for readable UI icons and pickups.',
    colors: [
      '#100f0f', '#ffffff', '#e43b44', '#f77622',
      '#feae34', '#63c74d', '#0095e9', '#b55088',
    ],
  },
]

export const DEFAULT_PALETTE_ID = 'pico8'

export function getPalette(id) {
  return (PALETTES.find((p) => p.id === id) ?? PALETTES[0]).colors.slice()
}

// --- color helpers -------------------------------------------------------

export function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex(r, g, b) {
  const to = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

// Relative luminance, used only to decide whether a swatch needs a light or
// dark outline/label so the selected swatch stays visible on any palette.
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

// Nearest palette entry to an RGB triple, returned as a *pixel value*
// (1-based, because 0 is transparent). Plain squared-Euclidean distance in
// RGB: not perceptually ideal, but predictable, which matters more when you
// are matching flat pixel-art colors than when resampling photos.
export function nearestPaletteValue(palette, r, g, b) {
  let best = 1
  let bestDist = Infinity
  for (let i = 0; i < palette.length; i++) {
    const [pr, pg, pb] = hexToRgb(palette[i])
    const d = (pr - r) ** 2 + (pg - g) ** 2 + (pb - b) ** 2
    if (d < bestDist) {
      bestDist = d
      best = i + 1
    }
  }
  return best
}
