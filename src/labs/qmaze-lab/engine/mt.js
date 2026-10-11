// Python's random.Random, exactly: the Mersenne Twister (MT19937) seeded the way CPython seeds an
// int, and random(), getrandbits(k ≤ 32), randrange(n) and choice(seq) built from it the way
// CPython builds them. The lab's figures replay the Python programs with it, so their numbers
// match what Python prints; parity.test.js checks that against real Python output.
const N = 624, M = 397

export class PyRandom {
  constructor(seed = 0) { this.mt = new Uint32Array(N); this.seed(seed) }

  initGenrand(s) {
    const mt = this.mt
    mt[0] = s >>> 0
    for (let i = 1; i < N; i++) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30)
      mt[i] = (Math.imul(1812433253, prev) + i) >>> 0
    }
    this.index = N
  }

  // CPython's random_seed for an int: the absolute value cut into 32-bit words, low word first.
  seed(n) {
    let rest = BigInt(Math.abs(Math.trunc(n)))
    const key = []
    do { key.push(Number(rest & 0xffffffffn)); rest >>= 32n } while (rest > 0n)
    this.initGenrand(19650218)
    const mt = this.mt
    let i = 1, j = 0
    for (let k = Math.max(N, key.length); k > 0; k--) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30)
      mt[i] = ((mt[i] ^ Math.imul(prev, 1664525)) + key[j] + j) >>> 0
      i++; j++
      if (i >= N) { mt[0] = mt[N - 1]; i = 1 }
      if (j >= key.length) j = 0
    }
    for (let k = N - 1; k > 0; k--) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30)
      mt[i] = ((mt[i] ^ Math.imul(prev, 1566083941)) - i) >>> 0
      i++
      if (i >= N) { mt[0] = mt[N - 1]; i = 1 }
    }
    mt[0] = 0x80000000
    this.index = N
  }

  uint32() {
    const mt = this.mt
    if (this.index >= N) {
      for (let k = 0; k < N; k++) {
        const y = (mt[k] & 0x80000000) | (mt[(k + 1) % N] & 0x7fffffff)
        mt[k] = mt[(k + M) % N] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0)
      }
      this.index = 0
    }
    let y = mt[this.index++]
    y ^= y >>> 11
    y ^= (y << 7) & 0x9d2c5680
    y ^= (y << 15) & 0xefc60000
    y ^= y >>> 18
    return y >>> 0
  }

  random() {
    const a = this.uint32() >>> 5, b = this.uint32() >>> 6
    return (a * 67108864 + b) / 9007199254740992
  }

  getrandbits(k) { return k === 0 ? 0 : this.uint32() >>> (32 - k) }

  randrange(n) {
    const k = n.toString(2).length
    let r = this.getrandbits(k)
    while (r >= n) r = this.getrandbits(k)
    return r
  }

  choice(seq) { return seq[this.randrange(seq.length)] }
}
