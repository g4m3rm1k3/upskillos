// Part 11's engine: python/ml_data.py in JavaScript, every loop in the same order so the floats agree
// (parity.test.js holds it to the Python).
import { Rng, ORDERS_CSV, CATALOGUE_CSV, RETURNS_CSV, DELIVERIES_CSV, FAR_TOWNS } from './data.js'
import { readCsv, toPence } from './tables.js'
import { cleanOrders } from './cleaning.js'
import { weekday } from './models.js'
import { dayOfYear } from './samples.js'
import { mean, std } from './summary.js'

export function dateFeatures(date) { const w = weekday(date); return [w, Number(date.slice(5, 7)), dayOfYear(date), w >= 5 ? 1 : 0] }
export function cyclical(value, period) { const angle = (2 * Math.PI * value) / period; return [Math.sin(angle), Math.cos(angle)] }

export function targetMeans(keys, ys, m) {
  const overall = mean(ys), sums = new Map(), counts = new Map()
  keys.forEach((k, i) => { sums.set(k, (sums.get(k) ?? 0) + ys[i]); counts.set(k, (counts.get(k) ?? 0) + 1) })
  return [Object.fromEntries([...sums.keys()].map(k => [k, (sums.get(k) + m * overall) / (counts.get(k) + m)])), overall]
}
export function outOfFoldEncode(keys, ys, folds, m) {
  const out = keys.map(() => 0)
  for (const fold of folds) {
    const held = new Set(fold), rest = keys.map((_, i) => i).filter(i => !held.has(i))
    const [means, overall] = targetMeans(rest.map(i => keys[i]), rest.map(i => ys[i]), m)
    for (const i of fold) out[i] = keys[i] in means ? means[keys[i]] : overall
  }
  return out
}

export function fnv1a(text) {
  let h = 2166136261
  for (const b of new TextEncoder().encode(text)) { h = (h ^ b) >>> 0; h = Math.imul(h, 16777619) >>> 0 }
  return h
}
export function featureHash(tokens, k) { const counts = Array(k).fill(0); for (const t of tokens) counts[fnv1a(t) % k]++; return counts }
export function tokens(text) {
  const out = []
  let word = ''
  for (const ch of text.toLowerCase()) {
    if ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9')) word += ch
    else if (word) { out.push(word); word = '' }
  }
  if (word) out.push(word)
  return out
}
export function tfIdf(docs) {
  const vocab = [...new Set(docs.flat())].sort(), n = docs.length, df = Object.fromEntries(vocab.map(w => [w, 0]))
  for (const d of docs) for (const w of new Set(d)) df[w]++
  const idf = Object.fromEntries(vocab.map(w => [w, Math.log(n / df[w])]))
  return [vocab, docs.map(d => { const counts = {}; for (const t of d) counts[t] = (counts[t] ?? 0) + 1; return vocab.map(w => (counts[w] ?? 0) * idf[w]) })]
}

export function fitScaler(rows) {
  const columns = rows[0].map((_, j) => rows.map(r => r[j]))
  return [columns.map(mean), columns.map(c => { const s = std(c); return s > 0 ? s : 1 })]
}
export const scale = (rows, [means, sds]) => rows.map(row => row.map((x, j) => (x - means[j]) / sds[j]))
export function knnPredict(trainX, trainY, x, k) {
  const dists = trainX.map((row, i) => { let d = 0; row.forEach((a, j) => { d += (a - x[j]) ** 2 }); return [d, i] })
  dists.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  return mean(dists.slice(0, k).map(([, i]) => trainY[i]))
}

export function confusion(ys, predictions) {
  let tp = 0, fn = 0, fp = 0, tn = 0
  ys.forEach((y, i) => { const p = predictions[i]; if (y === 1 && p === 1) tp++; else if (y === 1) fn++; else if (p === 1) fp++; else tn++ })
  return [[tp, fn], [fp, tn]]
}
export function precisionRecallF1([[tp, fn], [fp]]) {
  const precision = tp + fp ? tp / (tp + fp) : 0, recall = tp + fn ? tp / (tp + fn) : 0
  return [precision, recall, precision + recall ? (2 * precision * recall) / (precision + recall) : 0]
}

export function stratifiedFolds(labels, k, seed) {
  const rng = new Rng(seed), folds = Array.from({ length: k }, () => [])
  let place = 0
  for (const label of [...new Set(labels)].sort((a, b) => a - b)) {
    const rows = labels.map((y, i) => [y, i]).filter(([y]) => y === label).map(([, i]) => i)
    for (let i = 0; i < rows.length - 1; i++) { const j = i + rng.below(rows.length - i);[rows[i], rows[j]] = [rows[j], rows[i]] }
    for (const r of rows) { folds[place % k].push(r); place++ }
  }
  return folds.map(f => f.sort((a, b) => a - b))
}
export const positivesPerFold = (labels, folds) => folds.map(f => f.filter(i => labels[i] === 1).length)

// JS-only lesson helpers (not in the Python): the tables the lessons and figures share.
let deliveriesCache = null
// The 162 deliveries with what a model may use: late (1) or not, courier, far town, and the order's date.
export function deliveryTable() {
  if (deliveriesCache) return deliveriesCache
  const prices = Object.fromEntries(readCsv(CATALOGUE_CSV()).map(r => [r.item, toPence(r.list_price)]))
  const clean = cleanOrders(readCsv(ORDERS_CSV()), prices), byId = Object.fromEntries(clean.map(r => [r.order_id, r]))
  deliveriesCache = readCsv(DELIVERIES_CSV()).map(r => ({ late: r.on_time === 'yes' ? 0 : 1, onTime: r.on_time === 'yes' ? 1 : 0, north: r.courier === 'Northern' ? 1 : 0, far: FAR_TOWNS.includes(byId[r.order_id].town) ? 1 : 0, date: byId[r.order_id].date }))
  return deliveriesCache
}
let returnedCache = null
// 1 for each of the 400 cleaned orders that has a return, matched by its cleaned order id.
export function returnedFlags() {
  if (returnedCache) return returnedCache
  const prices = Object.fromEntries(readCsv(CATALOGUE_CSV()).map(r => [r.item, toPence(r.list_price)]))
  const ids = new Set(readCsv(RETURNS_CSV()).map(r => r.order_id.trim().toUpperCase()))
  returnedCache = cleanOrders(readCsv(ORDERS_CSV()), prices).map(r => (ids.has(r.order_id) ? 1 : 0))
  return returnedCache
}
