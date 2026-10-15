// Lesson 1.3: what a float really stores. Every JavaScript number (and every Python float) is a
// 64-bit IEEE 754 double: a sign, an 11-bit exponent and a 52-bit fraction. These read it exactly.

// The sign, exponent and fraction bits of a double, as text of 0s and 1s.
export function bitsOf(x) {
  const view = new DataView(new ArrayBuffer(8))
  view.setFloat64(0, x)
  const bits = [...new Uint8Array(view.buffer)].map(b => b.toString(2).padStart(8, '0')).join('')
  return { sign: bits[0], exponent: bits.slice(1, 12), fraction: bits.slice(12) }
}

// The exact decimal value a double holds: every double is a whole number times a power of 2,
// so its decimal expansion ends. 0.1 is stored as 0.1000000000000000055511151231257827…
export function exactDecimal(x) {
  if (!Number.isFinite(x)) return String(x)
  if (x === 0) return '0'
  const view = new DataView(new ArrayBuffer(8))
  view.setFloat64(0, Math.abs(x))
  const raw = view.getBigUint64(0)
  const exponentBits = Number((raw >> 52n) & 0x7ffn), fraction = raw & ((1n << 52n) - 1n)
  const mantissa = exponentBits === 0 ? fraction : fraction | (1n << 52n)
  const power = (exponentBits === 0 ? -1022 : exponentBits - 1023) - 52
  let text
  if (power >= 0) text = (mantissa << BigInt(power)).toString()
  else {
    const digits = (mantissa * 5n ** BigInt(-power)).toString().padStart(-power + 1, '0')
    text = `${digits.slice(0, digits.length + power)}.${digits.slice(digits.length + power)}`.replace(/0+$/, '').replace(/\.$/, '')
  }
  return (x < 0 ? '-' : '') + text
}

// The first n binary digits after the point of a fraction between 0 and 1, by doubling: each
// doubling moves the next binary digit in front of the point.
export function binaryDigits(x, n) {
  const steps = []
  let f = x
  for (let k = 0; k < n; k++) {
    const doubled = f * 2, digit = doubled >= 1 ? 1 : 0
    steps.push({ before: f, doubled, digit })
    f = doubled - digit
  }
  return steps
}
