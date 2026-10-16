// Points on a circle, the chords joining every pair, and the pieces the chords cut the disc into.

export const R = 120
export const C = 130

// Point positions in degrees, chosen so no three chords ever meet at one point.
export const ANGLES = {
  2: [200, 20],
  3: [270, 30, 150],
  4: [250, 340, 70, 160],
  5: [270, 342, 54, 126, 198],
  6: [279, 327, 31, 79, 163, 214],
}

// Six evenly spaced points: the three long chords all meet in the middle.
export const EVEN_SIX = [270, 330, 30, 90, 150, 210]

export const points = angles =>
  angles.map(d => [C + R * Math.cos((d * Math.PI) / 180), C + R * Math.sin((d * Math.PI) / 180)])

// Every pair of points, in a fixed order: (0,1), (0,2), ... (n-2, n-1).
export function chords(n) {
  const out = []
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) out.push([a, b])
  return out
}

// Two chords cross inside the circle when their ends alternate around it.
export const cross = ([a, b], [c, d]) => (a < c && c < b && b < d) || (c < a && a < d && d < b)

const side = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])

// Keep the part of a convex polygon on one side of the line through p and q.
function clip(poly, p, q, sign) {
  const out = []
  for (let i = 0; i < poly.length; i++) {
    const s = poly[i]
    const e = poly[(i + 1) % poly.length]
    const ss = sign * side(p, q, s)
    const se = sign * side(p, q, e)
    if (ss >= 0) out.push(s)
    if (ss * se < 0) {
      const t = ss / (ss - se)
      out.push([s[0] + t * (e[0] - s[0]), s[1] + t * (e[1] - s[1])])
    }
  }
  return out
}

const area = poly =>
  Math.abs(poly.reduce((sum, p, i) => {
    const q = poly[(i + 1) % poly.length]
    return sum + p[0] * q[1] - q[0] * p[1]
  }, 0)) / 2

// The pieces of the disc, as polygons. Each chord's line cuts the disc exactly where the chord does,
// so cutting by every line in turn gives every piece.
export function pieces(angles) {
  const pts = points(angles)
  let polys = [Array.from({ length: 180 }, (_, i) => [C + R * Math.cos((i * Math.PI) / 90), C + R * Math.sin((i * Math.PI) / 90)])]
  for (const [a, b] of chords(angles.length))
    polys = polys.flatMap(poly => [clip(poly, pts[a], pts[b], 1), clip(poly, pts[a], pts[b], -1)]).filter(p => p.length > 2 && area(p) > 0.5)
  return polys
}

export const centroid = poly => [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length]
