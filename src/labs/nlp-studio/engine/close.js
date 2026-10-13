// For the parity tests: deep equality, with floats compared to within 1e-9.
import { expect } from 'vitest'

// Deep equality with a tolerance for floats; "-inf" in the JSON is -Infinity.
export function close(got, want, where = '') {
  if (want === '-inf') want = -Infinity
  if (typeof want === 'number') {
    expect(typeof got, where).toBe('number')
    if (!Number.isFinite(want)) return expect(got, where).toBe(want)
    return expect(Math.abs(got - want), `${where}: ${got} vs ${want}`).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(want)))
  }
  if (Array.isArray(want)) { expect(Array.isArray(got), where).toBe(true); expect(got.length, where).toBe(want.length); want.forEach((w, k) => close(got[k], w, `${where}[${k}]`)); return }
  if (want && typeof want === 'object') { expect(Object.keys(got ?? {}).sort(), where).toEqual(Object.keys(want).sort()); for (const k of Object.keys(want)) close(got[k], want[k], `${where}.${k}`); return }
  expect(got, where).toEqual(want)
}
