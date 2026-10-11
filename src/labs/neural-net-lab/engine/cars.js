// python/cars.py's data steps in JavaScript: the same CSV, the same cleaning, the same shuffle and
// split (Python's random.shuffle, seeded), the same averages and spreads.
import carsCsv from '../python/cars.csv?raw'
import { shuffle } from './part1.js'

export function loadCars() {
  const [, ...lines] = carsCsv.replace(/\r\n/g, '\n').trim().split('\n')
  return lines.map(l => l.split(',')).filter(f => f[2] !== '?').map(([name, mpg, hp, weight]) => [name, Number(weight), Number(hp), Number(mpg)])
}
export const allCars = () => {
  const [, ...lines] = carsCsv.replace(/\r\n/g, '\n').trim().split('\n')
  return lines.map(l => { const [name, mpg, hp, weight, year] = l.split(','); return { name, mpg: Number(mpg), horsepower: hp === '?' ? null : Number(hp), weight: Number(weight), year: Number(year) } })
}

export function split(cars, testFraction = 0.2, seed = 0) {
  const shuffled = shuffle(cars, seed)
  const nTest = Math.trunc(shuffled.length * testFraction)
  return [shuffled.slice(nTest), shuffled.slice(0, nTest)]
}

export function meanAndSpread(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return [mean, Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length)]
}

export function scale(cars, [[wm, ws], [hm, hs]]) {
  return cars.map(([, weight, hp]) => [(weight - wm) / ws, (hp - hm) / hs])
}

export function carData(seed = 0) {
  const [train, test] = split(loadCars(), 0.2, seed)
  const stats = [meanAndSpread(train.map(c => c[1])), meanAndSpread(train.map(c => c[2]))]
  return { train, test, stats, X: scale(train, stats), Y: train.map(c => [c[3]]), Xtest: scale(test, stats), Ytest: test.map(c => [c[3]]) }
}
