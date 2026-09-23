// Forecasting hourly resource usage with baselines, lag features and
// walk-forward evaluation. Every feature for a forecast made at time t uses
// only values at or before t — unless the leaky option is chosen.
import { random, normal, mean, range, solve } from '../../kit/math.js'

export function usage({ days = 35, seed = 2, noise = 3 } = {}) {
  const rng = random(seed), n = days * 24, y = []
  let ar = 0
  for (let t = 0; t < n; t++) {
    const hour = t % 24, dow = Math.floor(t / 24) % 7
    const daily = 18 * Math.max(0, Math.sin(Math.PI * (hour - 7) / 13)) // busy 7:00–20:00
    const weekly = dow >= 5 ? -12 : 0 // quieter weekends
    ar = 0.75 * ar + noise * normal(rng)
    const spike = rng() < 0.01 ? 25 * rng() : 0
    y.push(Math.max(0, 30 + 0.02 * t + daily * (dow >= 5 ? 0.4 : 1) + weekly + ar + spike))
  }
  return y
}

export function acf(y, maxLag = 200) {
  const m = mean(y), d = y.map(v => v - m), c0 = d.reduce((t, v) => t + v * v, 0)
  return range(maxLag + 1).map(k => d.slice(k).reduce((t, v, i) => t + v * d[i], 0) / c0)
}

// Features for a direct h-step forecast made at origin t (target y[t + h]).
export const FEATURES = ['y[t]', 'y[t−1]', 'y[t−2]', 'same hour yesterday', 'same hour last week', 'mean of last 24 h']
export function features(y, t, h, leaky = false) {
  const tgt = t + h
  const row = [y[t], y[t - 1], y[t - 2], y[tgt - 24 * Math.ceil(h / 24)], y[tgt - 168], mean(y.slice(t - 23, t + 1))]
  if (leaky) row[5] = mean(y.slice(tgt - 1, tgt + 2)) // smoothed value around the target, computed later by a reporting job: future information
  return row
}
function ridgeFit(X, yv, lambda = 1e-3) {
  const p = X[0].length + 1, Z = X.map(r => [1, ...r]), n = Z.length
  const A = range(p).map(i => range(p).map(j => Z.reduce((t, r) => t + r[i] * r[j], 0) / n + (i === j && i > 0 ? lambda : 0)))
  const w = solve(A, range(p).map(i => Z.reduce((t, r, k) => t + r[i] * yv[k], 0) / n))
  return x => w[0] + x.reduce((t, v, j) => t + v * w[j + 1], 0)
}

// Walk-forward: at each origin in the evaluation period, forecast y[t + h]
// using only data up to t; refit the regression every `refit` origins.
export function walkForward(y, h, { start = 21 * 24, refit = 24, leaky = false } = {}) {
  const origins = range(y.length - h - start).map(i => start + i)
  const out = { persistence: [], seasonal: [], regression: [], actual: [], time: [] }
  let model = null
  origins.forEach((t, i) => {
    if (i % refit === 0) {
      const tr = range(t - h - 168 + 1).map(j => j + 168).filter(j => j + h <= t && j + h < y.length - 2)
      model = ridgeFit(tr.map(j => features(y, j, h, leaky)), tr.map(j => y[j + h]))
    }
    out.persistence.push(y[t]); out.seasonal.push(y[t + h - 24 * Math.ceil(h / 24)]); out.regression.push(model(features(y, t, h, leaky)))
    out.actual.push(y[t + h]); out.time.push(t + h)
  })
  const mae = k => mean(out[k].map((p, i) => Math.abs(p - out.actual[i])))
  return { ...out, mae: { persistence: mae('persistence'), seasonal: mae('seasonal'), regression: mae('regression') } }
}
