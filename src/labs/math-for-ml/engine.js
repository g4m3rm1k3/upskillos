// Ideal fall from rest, g = 10 m/s², before impact. These are simulated data,
// not measurements or an inference from them. Keep every view on this model.
export const END_TIME = 2
export const heightAt = t => 20 - 5 * t * t
export const SAMPLES = [0, 0.5, 1, 1.5, 2]
export function interval(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b > END_TIME || b <= a) {
    throw new RangeError('Choose 0 ≤ start < end ≤ 2 seconds.')
  }
  const startHeight = heightAt(a), endHeight = heightAt(b)
  const change = endHeight - startHeight, elapsed = b - a
  return { startHeight, endHeight, change, elapsed, velocity: change / elapsed }
}
export const format = n => Number(n.toFixed(3)).toString()
