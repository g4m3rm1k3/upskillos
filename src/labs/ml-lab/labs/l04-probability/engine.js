// Probability by counting simulated outcomes, checked against exact formulas.
import { random } from '../../kit/math.js'

export function posterior(prior, sensitivity, falseAlarm) {
  const alarm = sensitivity * prior + falseAlarm * (1 - prior)
  return alarm > 0 ? sensitivity * prior / alarm : NaN
}

// One simulated machine per draw: first its true state, then whether it alarms.
export function simulateAlarms({ n = 1000, prior = 0.02, sensitivity = 0.9, falseAlarm = 0.05, seed = 1 } = {}) {
  const rng = random(seed), counts = { tp: 0, fn: 0, fp: 0, tn: 0 }, trace = []
  for (let i = 0; i < n; i++) {
    const fault = rng() < prior, alarm = rng() < (fault ? sensitivity : falseAlarm)
    counts[fault ? (alarm ? 'tp' : 'fn') : (alarm ? 'fp' : 'tn')]++
    if ((i + 1) % Math.max(1, Math.floor(n / 200)) === 0 || i === n - 1) {
      const alarms = counts.tp + counts.fp
      trace.push({ n: i + 1, estimate: alarms ? counts.tp / alarms : NaN, alarms })
    }
  }
  return { counts, trace }
}

// Expected counts in a population of `size` (natural frequencies).
export function naturalFrequencies(size, prior, sensitivity, falseAlarm) {
  const faulty = size * prior, healthy = size - faulty
  return { faulty, healthy, tp: faulty * sensitivity, fn: faulty * (1 - sensitivity), fp: healthy * falseAlarm, tn: healthy * (1 - falseAlarm) }
}

export const standardError = (p, n) => Math.sqrt(p * (1 - p) / n)

// Sums of two fair dice: exact distribution and a simulated running mean.
export const diceExact = Array.from({ length: 11 }, (_, i) => ({ sum: i + 2, p: (6 - Math.abs(i + 2 - 7)) / 36 }))
export function rollDice(n, seed = 1) {
  const rng = random(seed), counts = Array(13).fill(0), running = []
  let total = 0
  for (let i = 0; i < n; i++) {
    const s = 1 + Math.floor(rng() * 6) + 1 + Math.floor(rng() * 6)
    counts[s]++; total += s
    if ((i + 1) % Math.max(1, Math.floor(n / 150)) === 0 || i === n - 1) running.push([i + 1, total / (i + 1)])
  }
  const mean = total / n
  const variance = counts.reduce((t, c, s) => t + c * (s - mean) ** 2, 0) / n
  return { counts, running, mean, variance }
}
export const expectation = (values, probs) => values.reduce((t, v, i) => t + v * probs[i], 0)
export function varianceOf(values, probs) { const m = expectation(values, probs); return values.reduce((t, v, i) => t + probs[i] * (v - m) ** 2, 0) }
