// One-feature ordinary least squares, with an intercept and mean squared loss.
export function random(seed) {
  let state = seed >>> 0
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296 }
}
export function generateData({ seed = 42, count = 60, noise = 0.7, shape = 'linear' } = {}) {
  const rng = random(seed)
  return Array.from({ length: count }, (_, i) => {
    const x = -3 + 6 * rng()
    const error = noise * Math.sqrt(-2 * Math.log(Math.max(rng(), 1e-12))) * Math.cos(2 * Math.PI * rng())
    return { x, y: (shape === 'curved' ? x * x - 1 : 1.7 * x + 0.8) + error + (shape === 'outlier' && i === 0 ? 18 : 0) }
  })
}
export function splitData(points, seed = 42) {
  const shuffled = [...points], rng = random(seed)
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]] }
  const boundary = Math.max(1, Math.min(points.length - 1, Math.floor(points.length * 0.8)))
  return { train: shuffled.slice(0, boundary), validation: shuffled.slice(boundary) }
}
export const predict = (x, w, b) => w * x + b
export const mean = values => values.reduce((sum, x) => sum + x, 0) / values.length
export const mse = (points, w, b) => mean(points.map(({ x, y }) => (predict(x, w, b) - y) ** 2))
export function gradients(points, w, b) {
  return { w: 2 * mean(points.map(({ x, y }) => (predict(x, w, b) - y) * x)), b: 2 * mean(points.map(({ x, y }) => predict(x, w, b) - y)) }
}
export function closedForm(points) {
  const mx = mean(points.map(p => p.x)), my = mean(points.map(p => p.y))
  const variance = mean(points.map(p => (p.x - mx) ** 2))
  if (variance < 1e-14) return { w: 0, b: my, degenerate: true }
  const w = mean(points.map(p => (p.x - mx) * (p.y - my))) / variance
  return { w, b: my - w * mx, degenerate: false }
}
export function gradientCheck(points, w, b) {
  const eps = 1e-5, analytic = gradients(points, w, b)
  const numeric = { w: (mse(points, w + eps, b) - mse(points, w - eps, b)) / (2 * eps), b: (mse(points, w, b + eps) - mse(points, w, b - eps)) / (2 * eps) }
  const error = Math.max(...['w', 'b'].map(k => Math.abs(analytic[k] - numeric[k]) / Math.max(1, Math.abs(analytic[k]), Math.abs(numeric[k]))))
  return { analytic, numeric, error, passed: Number.isFinite(error) && error < 1e-5 }
}
export function initialModel(train, validation, w = 0, b = 0) {
  return { w, b, iteration: 0, stopped: '', last: null, history: [{ step: 0, train: mse(train, w, b), validation: mse(validation, w, b) }] }
}
export function stepModel(model, train, validation, rate) {
  if (model.stopped) return model
  const g = gradients(train, model.w, model.b), w = model.w - rate * g.w, b = model.b - rate * g.b
  const loss = mse(train, w, b), val = mse(validation, w, b)
  if (![w, b, loss, val].every(Number.isFinite) || Math.max(loss, val) > 1e12) return { ...model, stopped: 'Training diverged beyond the display limit. Lower the learning rate and reset. The last finite state is preserved.' }
  const iteration = model.iteration + 1
  return { w, b, iteration, stopped: iteration >= 2000 ? 'Reached 2,000 steps. Reset to start another run.' : '', last: { w: model.w, b: model.b, g, rate }, history: [...model.history, { step: iteration, train: loss, validation: val }] }
}
export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(line => line.trim())
  if (/^\s*x\s*,\s*y\s*$/i.test(lines[0] ?? '')) lines.shift()
  if (lines.length < 5 || lines.length > 2000) throw new Error('Provide 5–2,000 data rows, with an optional x,y header.')
  return lines.map((line, index) => {
    const fields = line.split(',').map(s => s.trim())
    if (fields.length !== 2 || fields.some(s => s === '' || !Number.isFinite(Number(s)))) throw new Error(`Row ${index + 1}: expected two finite numbers separated by a comma.`)
    const [x, y] = fields.map(Number)
    if (Math.max(Math.abs(x), Math.abs(y)) > 1e6) throw new Error(`Row ${index + 1}: use values within ±1,000,000; rescale large measurements first.`)
    return { x, y }
  })
}
