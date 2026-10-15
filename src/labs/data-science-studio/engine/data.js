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

export function makeOrders(n = 400, seed = 7) {
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
    if (flaw < 3) priceText = ''
    else if (flaw < 7) town = town.toLowerCase()
    else if (flaw < 9) town = town + ' '
    else if (flaw === 9) priceText = String(price)
    rows.push([`A${1001 + k}`, dateOf(day), town, name, priceText, String(quantity), channel])
  }
  for (const k of [17, 233]) rows.push([...rows[k]])
  return rows
}

export const csvField = text => (/[,"\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text)
export const toCsv = (header, rows) => [header, ...rows].map(row => row.map(csvField).join(',')).join('\n') + '\n'

// The orders as a CSV file's text: what the lessons and figures start from.
let cached = null
export const ORDERS_CSV = () => (cached ??= toCsv(HEADER, makeOrders()))
