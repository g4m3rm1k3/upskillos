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

export const csvField = text => (/[,"\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text)
export const toCsv = (header, rows) => [header, ...rows].map(row => row.map(csvField).join(',')).join('\n') + '\n'

// The orders as a CSV file's text: what the lessons and figures start from.
let cached = null
export const ORDERS_CSV = () => (cached ??= toCsv(HEADER, makeOrders()))
export const CATALOGUE_CSV = () => toCsv(CATALOGUE_HEADER, makeCatalogue())
export const RETURNS_CSV = () => toCsv(RETURNS_HEADER, makeReturns(makeOrders()))
