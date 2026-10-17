// Photo compression: a small greyscale picture split into SVD layers. A slider keeps the first k
// layers and shows the copy, the k-th layer on its own, the strengths, the storage and the error.
// The pictures are drawn from formulas, so nothing is fetched.
import { useMemo, useState } from 'react'
import { fmt, Notes, Readout, Slider, Stat } from './parts.jsx'

const SIZE = 40

// Singular value decomposition by one-sided Jacobi rotations: turn pairs of columns until they are
// perpendicular. The column lengths are then the strengths. Returns columns u_i and v_i, strongest first.
export function photoSvd(A) {
  const m = A.length, n = A[0].length
  const W = Array.from({ length: n }, (_, j) => A.map(row => row[j]))
  const V = Array.from({ length: n }, (_, j) => Array.from({ length: n }, (_, i) => (i === j ? 1 : 0)))
  const rotate = (X, p, q, c, s) => {
    for (let i = 0; i < X[p].length; i++) {
      const a = X[p][i], b = X[q][i]
      X[p][i] = c * a - s * b
      X[q][i] = s * a + c * b
    }
  }
  for (let sweep = 0; sweep < 60; sweep++) {
    let turned = false
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      let alpha = 0, beta = 0, gamma = 0
      for (let i = 0; i < m; i++) { alpha += W[p][i] ** 2; beta += W[q][i] ** 2; gamma += W[p][i] * W[q][i] }
      if (Math.abs(gamma) <= 1e-13 * Math.sqrt(alpha * beta) || Math.abs(gamma) < 1e-300) continue
      turned = true
      const zeta = (beta - alpha) / (2 * gamma)
      const t = (zeta >= 0 ? 1 : -1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta))
      const c = 1 / Math.sqrt(1 + t * t), s = c * t
      rotate(W, p, q, c, s)
      rotate(V, p, q, c, s)
    }
    if (!turned) break
  }
  const order = W.map((column, j) => [Math.hypot(...column), j]).sort((a, b) => b[0] - a[0])
  return {
    sigma: order.map(([length]) => length),
    U: order.map(([length, j]) => W[j].map(value => (length > 1e-12 ? value / length : 0))),
    V: order.map(([, j]) => V[j]),
  }
}

// The sum of layers from (inclusive) to `to` (exclusive): σ_i u_i v_iᵀ.
export function layerSum({ sigma, U, V }, from, to) {
  const m = U[0].length, n = V[0].length
  const out = Array.from({ length: m }, () => new Array(n).fill(0))
  for (let k = from; k < Math.min(to, sigma.length); k++) for (let i = 0; i < m; i++) {
    const weight = sigma[k] * U[k][i]
    if (weight) for (let j = 0; j < n; j++) out[i][j] += weight * V[k][j]
  }
  return out
}

// What k layers cost and lose, for an m × n picture.
export function photoStats(sigma, k, m, n) {
  const total = sigma.reduce((sum, s) => sum + s * s, 0)
  const lost = sigma.slice(k).reduce((sum, s) => sum + s * s, 0)
  return { storage: k * (m + n + 1), original: m * n, error: Math.sqrt(lost), relative: Math.sqrt(lost / total), kept: 1 - lost / total }
}

// A seeded generator, so the static looks the same on every visit.
function noise(seed) {
  let state = seed
  return () => { state = (state * 1103515245 + 12345) % 2147483648; return state / 2147483648 }
}

export const SCENES = {
  Landscape: () => Array.from({ length: SIZE }, (_, y) => Array.from({ length: SIZE }, (_, x) => {
    const ridge = Math.min(14 + 1.1 * Math.abs(x - 11), 18 + 0.9 * Math.abs(x - 29))
    if (y >= 32) return 0.22 + ((x + 2 * y) % 5 === 0 ? 0.12 : 0)
    if (y >= ridge) return y < ridge + 2.5 && ridge < 19 ? 0.92 : 0.38 - 0.006 * (y - ridge)
    if (Math.hypot(x - 31, y - 7) < 4.5) return 1
    return 0.55 + 0.35 * (y / SIZE)
  })),
  Tartan: () => Array.from({ length: SIZE }, (_, y) => Array.from({ length: SIZE }, (_, x) => {
    const band = v => (v % 10 < 5 ? 1 : 0.35), thin = v => (v % 10 === 7 ? 1 : 0)
    return 0.6 * band(y) * band(x) + 0.35 * thin(y) + 0.35 * thin(x) * 0.8
  })),
  Static: () => { const next = noise(7); return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => next())) },
}

function Picture({ data, label, stretch }) {
  const flat = data.flat()
  const lo = stretch ? Math.min(...flat) : 0, hi = stretch ? Math.max(...flat) : 1
  const shade = value => Math.round(255 * Math.max(0, Math.min(1, (value - lo) / (hi - lo || 1))))
  return <figure className="la-photo-frame">
    <svg viewBox={`0 0 ${data[0].length} ${data.length}`} role="img" aria-label={label} shapeRendering="crispEdges">
      {data.map((row, i) => row.map((value, j) => { const g = shade(value); return <rect key={`${i}-${j}`} x={j} y={i} width="1.02" height="1.02" fill={`rgb(${g},${g},${g})`} /> }))}
    </svg>
    <figcaption>{label.split(':')[0]}</figcaption>
  </figure>
}

export function PhotoCompress() {
  const [scene, setScene] = useState('Landscape'), [k, setK] = useState(3)
  const picture = useMemo(() => SCENES[scene](), [scene])
  const svd = useMemo(() => photoSvd(picture), [picture])
  const copy = useMemo(() => layerSum(svd, 0, k), [svd, k])
  const layer = useMemo(() => layerSum(svd, k - 1, k), [svd, k])
  const { storage, original, relative, kept } = photoStats(svd.sigma, k, SIZE, SIZE)
  // The first layer (the average brightness) often dwarfs the rest; then the scale follows the second
  // and the first bar is drawn cut off, with its value written on it.
  const shown = svd.sigma.slice(0, 20), barW = 480 / shown.length
  const capped = shown[0] > 3 * shown[1], top = (capped ? 1.6 * shown[1] : shown[0]) || 1
  const height = s => Math.max(1, 112 * Math.min(s, top) / top)
  const meaning = `${scene}, keeping ${k} of ${SIZE} layers: ${storage} numbers instead of ${original} (${Math.round(100 * storage / original)}%), with ${fmt(100 * relative)}% error. Layer ${k} has strength ${fmt(svd.sigma[k - 1])}; the strongest has ${fmt(svd.sigma[0])}.`
  const small = Math.min(k, 24)
  return <>
    <div className="la-presets" role="group" aria-label="Choose a picture">{Object.keys(SCENES).map(name => <button key={name} type="button" aria-pressed={name === scene} onClick={() => setScene(name)}>{name}</button>)}</div>
    <div className="la-photo">
      <Picture data={picture} label={`Original: ${SIZE} by ${SIZE} pixels`} />
      <Picture data={copy} label={`First ${k} layers: ${meaning}`} />
      <Picture data={layer} label={`Layer ${k} on its own, contrast stretched`} stretch />
    </div>
    <svg className="la-plane la-photo-bars" viewBox="0 0 480 140" role="img" aria-label={`Strengths of the first 20 layers, strongest first. The first ${k} are kept.`}>
      <rect width="480" height="140" className="la-plane-bg" />
      {shown.map((s, i) => <rect key={i} className="la-bar" style={{ '--tone': `var(--c-${i < k ? 'out' : 'muted'})` }} x={i * barW + 3} y={128 - height(s)} width={barW - 6} height={height(s)} />)}
      {capped && <text className="la-plot-note" x={barW + 2} y="30">← {fmt(shown[0])}, off the scale</text>}
      <text className="la-plot-note" x="472" y="16" textAnchor="end">strength of each layer (first 20)</text>
    </svg>
    <div className="la-matrix-row">
      <Stat label="Numbers stored" value={storage} tone="out" note={`${Math.round(100 * storage / original)}% of the ${original} pixels`} />
      <Stat label="Error" value={`${fmt(100 * relative)}%`} tone="err" note="size of what was dropped" />
      <Stat label="Energy kept" value={`${fmt(100 * kept)}%`} tone="j" note="squared strengths kept" />
    </div>
    <div className="la-controls">
      <Slider label="Layers kept, k" tone="out" value={k} onChange={setK} min={1} max={SIZE} step={1} />
    </div>
    <Readout>{meaning}</Readout>
    <Notes try="Start the landscape at k = 1 and step up slowly. Watch the third picture: early layers are broad bands of sky and mountain, later ones are fine speckle. Then try the tartan, which is exactly a few layers, and the static, which never compresses."
      truth="The error is the square root of the sum of the squared strengths you dropped, and no other copy with k layers is closer (Eckart–Young). Storage grows by 81 numbers per layer for a 40 × 40 picture."
      trap="From k = 20 on, a 40 × 40 picture costs more as layers than as pixels. Compression only pays when a few layers carry most of the strength."
      code={`m = 24;\nn = 32;\nA = zeros(m, n);\nfor i = 1:m\n  for j = 1:n\n    A(i,j) = 0.5 + 0.3*sin(i/4)*cos(j/5);\n    if abs(i - 12) + abs(j - 16) < 8\n      A(i,j) = 1;\n    end\n  end\nend\n[U, S, V] = svd(A);\nk = ${small};\nAk = U(:,1:k)*S(1:k,1:k)*transpose(V(:,1:k));\nstorage = k*(m + n + 1)\nE = A - Ak;\nerr = sqrt(sum(sum(E.^2)))`} />
  </>
}
