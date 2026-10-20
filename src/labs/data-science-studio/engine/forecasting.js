// Part 9's engine: python/forecasting.py in JavaScript, every loop in the same order so the floats
// agree (parity.test.js holds it to the Python; agree.test.js holds SCAN, OFFSET and CORREL to it).
import { weekday } from './models.js'
import { dayOfYear } from './samples.js'
import { mean, total } from './summary.js'

export const weekOf = date => Math.floor((dayOfYear(date) + 2) / 7)
export function resample(dates, values, by) {
  const out = []
  dates.forEach((date, k) => {
    const key = by === 'month' ? date.slice(0, 7) : weekOf(date), last = out[out.length - 1]
    if (last && last[0] === key) { last[1] += values[k]; last[2] += 1 } else out.push([key, values[k], 1])
  })
  return out
}

export function movingAverageSlow(ys, k) {
  const out = []
  for (let end = k - 1; end < ys.length; end++) { let s = 0; for (let i = end - k + 1; i <= end; i++) s += ys[i]; out.push(s / k) }
  return out
}
export function movingAverage(ys, k) {
  let s = 0
  for (let i = 0; i < k; i++) s += ys[i]
  const out = [s / k]
  for (let end = k; end < ys.length; end++) { s += ys[end] - ys[end - k]; out.push(s / k) }
  return out
}
export function centredAverage(ys, k) {
  const h = (k - 1) / 2, out = ys.map(() => null)
  movingAverage(ys, k).forEach((m, t) => { out[t + h] = m })
  return out
}
export function seasonalIndices(ys, trend, period) {
  const gaps = Array.from({ length: period }, () => [])
  ys.forEach((y, t) => { if (trend[t] !== null) gaps[t % period].push(y - trend[t]) })
  const raw = gaps.map(mean), shift = mean(raw)
  return raw.map(r => r - shift)
}
export function decompose(ys, period) {
  const trend = centredAverage(ys, period), season = seasonalIndices(ys, trend, period)
  return [trend, season, ys.map((y, t) => (trend[t] === null ? null : y - trend[t] - season[t % period]))]
}
export const difference = (ys, lag) => ys.slice(lag).map((y, t) => y - ys[t])

export function autocorrelation(ys, lag) {
  const m = mean(ys)
  const top = total(ys.slice(0, ys.length - lag).map((y, t) => (y - m) * (ys[t + lag] - m)))
  return top / total(ys.map(y => (y - m) ** 2))
}
export const acf = (ys, maxLag) => Array.from({ length: maxLag }, (_, k) => autocorrelation(ys, k + 1))

export const naiveForecasts = ys => [null, ...ys.slice(0, -1)]
export const seasonalNaive = (ys, period) => [...Array(period).fill(null), ...ys.slice(0, -period)]
export function meanForecasts(ys) {
  const out = [null]
  let s = 0
  for (let t = 1; t < ys.length; t++) { s += ys[t - 1]; out.push(s / t) }
  return out
}
export const scored = (ys, forecasts) => ys.map((y, k) => [y, forecasts[k]]).filter(([, f]) => f !== null && f !== undefined)
export const mae = pairs => mean(pairs.map(([y, f]) => Math.abs(y - f)))
export const rmseOf = pairs => Math.sqrt(mean(pairs.map(([y, f]) => (y - f) ** 2)))
export const mape = pairs => 100 * mean(pairs.map(([y, f]) => Math.abs(y - f) / Math.abs(y)))

export function exponentialSmoothing(ys, alpha) {
  let level = ys[0]
  const out = [null]
  for (let t = 1; t < ys.length; t++) { out.push(level); level += alpha * (ys[t] - level) }
  return out
}
export const smoothingWeights = (alpha, k) => Array.from({ length: k }, (_, j) => alpha * (1 - alpha) ** j)
export function bestAlpha(ys, alphas) {
  let best = null
  for (const a of alphas) { const e = rmseOf(scored(ys, exponentialSmoothing(ys, a))); if (best === null || e < best[1]) best = [a, e] }
  return best
}

// states (optional): a list that receives [level, trend] after each day, for the figures.
export function holt(ys, alpha, beta, states = null) {
  let level = ys[1], trend = ys[1] - ys[0]
  const out = [null, null]
  for (let t = 2; t < ys.length; t++) {
    out.push(level + trend)
    const last = level
    level = alpha * ys[t] + (1 - alpha) * (level + trend)
    trend = beta * (level - last) + (1 - beta) * trend
    if (states) states.push([level, trend])
  }
  return out
}
export function holtAhead(ys, alpha, beta, h) {
  let level = ys[1], trend = ys[1] - ys[0]
  for (let t = 2; t < ys.length; t++) {
    const last = level
    level = alpha * ys[t] + (1 - alpha) * (level + trend)
    trend = beta * (level - last) + (1 - beta) * trend
  }
  return Array.from({ length: h }, (_, j) => level + (j + 1) * trend)
}

// seasons (optional): a list that receives a copy of the seven indices after each day (9.8's figure).
export function holtWinters(ys, alpha, beta, gamma, period, h = 1, seasons = null) {
  let level = mean(ys.slice(0, period)), trend = 0
  const season = ys.slice(0, period).map(y => y - level), out = ys.map(() => null)
  for (let t = period; t < ys.length; t++) {
    if (t + h - 1 < ys.length) out[t + h - 1] = level + h * trend + season[(t + h - 1) % period]
    const last = level
    level = alpha * (ys[t] - season[t % period]) + (1 - alpha) * (level + trend)
    trend = beta * (level - last) + (1 - beta) * trend
    season[t % period] = gamma * (ys[t] - level) + (1 - gamma) * season[t % period]
    if (seasons) seasons.push([...season])
  }
  return out
}

export function walkForward(n, start, horizon) {
  const out = []
  for (let end = start; end <= n - horizon; end++) out.push([end, end + horizon - 1])
  return out
}
export function weekdayProfile(dates, ys) {
  const groups = Array.from({ length: 7 }, () => [])
  dates.forEach((date, k) => groups[weekday(date)].push(ys[k]))
  return groups.map(mean)
}

// JS-only lesson helpers (not in the Python).
// The MAE of a forecaster's one-step forecasts for the days from `from` on.
export const maeFrom = (ys, forecasts, from) => mae(scored(ys.slice(from), forecasts.slice(from)))
// Holt-Winters' forecasts 1 to h days past the end of ys (as holt_ahead does for Holt).
export function holtWintersAhead(ys, alpha, beta, gamma, period, h) {
  let level = mean(ys.slice(0, period)), trend = 0
  const season = ys.slice(0, period).map(y => y - level)
  for (let t = period; t < ys.length; t++) {
    const last = level
    level = alpha * (ys[t] - season[t % period]) + (1 - alpha) * (level + trend)
    trend = beta * (level - last) + (1 - beta) * trend
    season[t % period] = gamma * (ys[t] - level) + (1 - gamma) * season[t % period]
  }
  return Array.from({ length: h }, (_, j) => level + (j + 1) * trend + season[(ys.length + j) % period])
}
// The shares of Holt-Winters with the smallest RMSE over a small grid, scored on days 2 periods to `until`.
export function tuneHoltWinters(ys, until, period, grid) {
  let best = null
  for (const a of grid.alpha) for (const b of grid.beta) for (const g of grid.gamma) {
    const f = holtWinters(ys.slice(0, until), a, b, g, period)
    const e = rmseOf(scored(ys.slice(2 * period, until), f.slice(2 * period, until)))
    if (best === null || e < best.rmse) best = { alpha: a, beta: b, gamma: g, rmse: e }
  }
  return best
}
