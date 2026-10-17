// The shop's orders: python/data.py in JavaScript, every random draw in the same order, so the page
// and Python build exactly the same table, flaws included (parity.test.js checks the CSV text).

export class Rng {
  constructor(seed) { this.state = seed % 4294967296 }
  // state * 1664525 stays below 2^53, so this is exact in a JavaScript number.
  random() { this.state = (this.state * 1664525 + 1013904223) % 4294967296; return this.state / 4294967296 }
  below(n) { return Math.floor(this.random() * n) }
}

export const HEADER = ['order_id', 'date', 'town', 'item', 'price', 'quantity', 'channel']
export const ITEMS = [['Bike', 45000, 6], ['Helmet', 4500, 20], ['Lights, front and back', 2500, 22],
  ['Lock', 3000, 17], ['Inner tube', 700, 20], ['Service', 4000, 15]]
export const TOWNS = ['Leeds', 'York', 'Harrogate', 'Wakefield']
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export function dateOf(day) {
  let month = 0
  while (day >= MONTH_DAYS[month]) { day -= MONTH_DAYS[month]; month++ }
  return `2025-${String(month + 1).padStart(2, '0')}-${String(day + 1).padStart(2, '0')}`
}
export const pounds = pence => `${Math.floor(pence / 100)}.${String(pence % 100).padStart(2, '0')}`

function pick(rng, weights) {
  let r = rng.below(weights.reduce((s, w) => s + w, 0))
  for (let k = 0; k < weights.length; k++) { if (r < weights[k]) return k; r -= weights[k] }
}

// truth: an object to record the real price of each order whose price was lost or typed in pence.
export function makeOrders(n = 400, seed = 7, truth = null) {
  const rng = new Rng(seed), rows = []
  for (let k = 0; k < n; k++) {
    const [name, base] = ITEMS[pick(rng, ITEMS.map(([, , w]) => w))]
    const price = Math.floor(base * (90 + rng.below(21)) / 100)
    const quantity = base < 5000 ? 1 + rng.below(3) : 1
    let town = TOWNS[rng.below(TOWNS.length)]
    const channel = rng.below(100) < 45 ? 'web' : 'shop'
    const day = rng.below(365)
    const flaw = rng.below(100)
    let priceText = pounds(price)
    if (truth && (flaw < 3 || flaw === 9)) truth[`A${1001 + k}`] = priceText
    if (flaw < 3) priceText = ''
    else if (flaw < 7) town = town.toLowerCase()
    else if (flaw < 9) town = town + ' '
    else if (flaw === 9) priceText = String(price)
    rows.push([`A${1001 + k}`, dateOf(day), town, name, priceText, String(quantity), channel])
  }
  for (const k of [17, 233]) rows.push([...rows[k]])
  return rows
}

// The catalogue: one row per item, its category and list price. The pump was never sold.
export const CATEGORIES = { Bike: 'bikes', Helmet: 'kit', 'Lights, front and back': 'kit', Lock: 'kit', 'Inner tube': 'parts', Service: 'workshop', Pump: 'kit' }
export const CATALOGUE_HEADER = ['item', 'category', 'list_price']
export const makeCatalogue = () => [...ITEMS.map(([name, base]) => [name, base]), ['Pump', 1800]].map(([name, base]) => [name, CATEGORIES[name], pounds(base)])

export const RETURNS_HEADER = ['return_id', 'order_id', 'item', 'reason']
export const REASONS = ['faulty', 'wrong size', 'changed mind', 'arrived late']

// A word as a customer might type it: a letter dropped, doubled or swapped with the next, or lower case.
export function typo(rng, text) {
  const kind = rng.below(6)
  if (kind >= 4 || text.length < 3) return text
  const at = 1 + rng.below(text.length - 2)
  if (kind === 0) return text.slice(0, at) + text.slice(at + 1)
  if (kind === 1) return text.slice(0, at) + text[at] + text.slice(at)
  if (kind === 2) return text.slice(0, at) + text[at + 1] + text[at] + text.slice(at + 2)
  return text.toLowerCase()
}

// The returns form (python/data.py's make_returns); truth: an array to receive each return's real order id.
export function makeReturns(orders, n = 24, seed = 11, truth = null) {
  const rng = new Rng(seed), rows = [], realIds = []
  for (let k = 0; k <= n; k++) {
    const order = k < n ? orders[rng.below(400)] : orders[Number(realIds[3].slice(1)) - 1001]
    const real = order[0]
    let typed = real
    const form = rng.below(10)
    if (form === 0) typed = real.toLowerCase()
    else if (form === 1) typed = ' ' + real
    else if (form === 2) typed = real.slice(0, 3) + real[4] + real[3]
    else if (form === 3) typed = real.slice(0, 2) + real.slice(3)
    rows.push([`R${String(k + 1).padStart(2, '0')}`, typed, typo(rng, order[3]), REASONS[rng.below(REASONS.length)]])
    realIds.push(real)
  }
  truth?.push(...realIds)
  return rows
}

// About normal, mean 0, sd 1: twelve uniform draws added, minus 6 (only additions: exact in both languages).
export function noise(rng) { let t = 0; for (let k = 0; k < 12; k++) t += rng.random(); return t - 6 }
// x to one decimal place, as text, halves rounded up.
export function tenths(x) {
  const k = Math.floor(10 * x + 0.5), a = Math.abs(k)
  return `${k < 0 ? '-' : ''}${Math.floor(a / 10)}.${a % 10}`
}

// One row per day of 2025: temperature, rain, riders on the cycle path, website visits (python/data.py's
// make_days, every draw in the same order). truth: an object to receive the news day's usual visits.
export const DAYS_HEADER = ['date', 'high_c', 'rain_mm', 'riders', 'visits']
export const NEWS_DAY = 41
export function makeDays(seed = 5, truth = null) {
  const rng = new Rng(seed), rows = []
  for (let day = 0; day < 365; day++) {
    const season = -Math.cos(2 * Math.PI * (day - 15) / 365)
    const highText = tenths(14 + 7 * season + 2.5 * noise(rng))
    const wet = rng.below(100) < 45 - 15 * season
    const rainText = wet ? tenths(25 * rng.random() * rng.random()) : '0.0'
    const high = Number(highText), rain = Number(rainText)
    const weekend = (day + 2) % 7 >= 5
    const riders = Math.floor(300 + 22 * high - 12 * rain + (weekend ? 90 : 0) + 40 * noise(rng) + 0.5)
    let visits = Math.floor(180 * Math.exp(0.05 * high + 0.12 * noise(rng)))
    if (day === NEWS_DAY) { if (truth) truth[dateOf(day)] = visits; visits = 9412 }
    rows.push([dateOf(day), highText, rainText, String(Math.max(0, riders)), String(visits)])
  }
  return rows
}

// One row per web order sent by courier (python/data.py's make_deliveries).
export const DELIVERIES_HEADER = ['order_id', 'courier', 'days', 'on_time']
export const FAR_TOWNS = ['York', 'Harrogate']
export const ON_TIME = { Northern: [70, 97], Swift: [50, 85] }
export function makeDeliveries(orders, seed = 13) {
  const rng = new Rng(seed), rows = []
  for (const order of orders.slice(0, 400)) {
    if (order[6] !== 'web' || order[3] === 'Service') continue
    const t = order[2].trim(), far = FAR_TOWNS.includes(t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
    const courier = rng.below(100) < (far ? 80 : 20) ? 'Northern' : 'Swift'
    const onTime = rng.below(100) < ON_TIME[courier][far ? 0 : 1]
    const days = onTime ? 1 + rng.below(2) : 3 + rng.below(3)
    rows.push([order[0], courier, String(days), onTime ? 'yes' : 'no'])
  }
  return rows
}

// The website's A/B test of a new home page, on the days table's visits (python/data.py's make_trial).
export const TRIAL_HEADER = ['date', 'page', 'visitors', 'clicks']
export const TRIAL_START = 152, TRIAL_DAYS = 28
export const CLICK_RATE = { A: 200, B: 220 }
export function makeTrial(days, seed = 17) {
  const rng = new Rng(seed), rows = []
  for (let day = TRIAL_START; day < TRIAL_START + TRIAL_DAYS; day++) {
    const counts = { A: [0, 0], B: [0, 0] }
    for (let v = 0; v < Number(days[day][4]); v++) {
      const page = 'AB'[rng.below(2)]
      counts[page][0]++
      if (rng.below(1000) < CLICK_RATE[page]) counts[page][1]++
    }
    for (const page of 'AB') rows.push([days[day][0], page, String(counts[page][0]), String(counts[page][1])])
  }
  return rows
}

export const csvField = text => (/[,"\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text)
export const toCsv = (header, rows) => [header, ...rows].map(row => row.map(csvField).join(',')).join('\n') + '\n'

// The orders as a CSV file's text: what the lessons and figures start from.
let cached = null
export const ORDERS_CSV = () => (cached ??= toCsv(HEADER, makeOrders()))
export const CATALOGUE_CSV = () => toCsv(CATALOGUE_HEADER, makeCatalogue())
export const RETURNS_CSV = () => toCsv(RETURNS_HEADER, makeReturns(makeOrders()))
export const DAYS_CSV = () => toCsv(DAYS_HEADER, makeDays())
export const DELIVERIES_CSV = () => toCsv(DELIVERIES_HEADER, makeDeliveries(makeOrders()))
export const TRIAL_CSV = () => toCsv(TRIAL_HEADER, makeTrial(makeDays()))
