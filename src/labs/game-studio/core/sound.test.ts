// Sound effects from recipes (core/sound.ts): the waves, the pitch slide, the envelope, and the .wav file.
import { describe, expect, it } from 'vitest';
import { SAMPLE_RATE, soundBytes, soundProblem, synthesize, toWav } from './sound';

/** How many times the samples cross from negative to positive: one per cycle. */
const cycles = (s: Float32Array, from = 0, to = s.length) => { let n = 0; for (let i = from + 1; i < to; i++) if (s[i - 1] < 0 && s[i] >= 0) n++; return n; };

describe('synthesize', () => {
  it('a steady 441 Hz square wave crosses upward 441 times a second, and is ±volume at full', () => {
    const s = synthesize({ wave: 'square', from: 441, to: 441, length: 1, attack: 0, volume: 0.5 });
    expect(s.length).toBe(SAMPLE_RATE);
    expect(Math.abs(cycles(s) - 441)).toBeLessThanOrEqual(1);
    expect(Math.max(...s.slice(0, 1000))).toBeCloseTo(0.5, 2);
  });

  it('the pitch slides exponentially: from 220 to 880 Hz over 2 s, the middle second is near 440 Hz', () => {
    const s = synthesize({ wave: 'sine', from: 220, to: 880, length: 2, attack: 0 });
    // Between t = 0.5 and 1.5 the pitch goes from 220·2^0.5 to 220·2^1.5: on average (311 to 622 Hz) 449 cycles.
    const mid = cycles(s, Math.round(0.5 * SAMPLE_RATE), Math.round(1.5 * SAMPLE_RATE));
    const expected = (220 * (Math.pow(2, 1.5) - Math.pow(2, 0.5))) / Math.log(2);   // ∫ 220·2^t dt from 0.5 to 1.5
    expect(Math.abs(mid - expected)).toBeLessThanOrEqual(2);
  });

  it('the envelope rises over attack, peaks, then falls to silence at the end', () => {
    const s = synthesize({ wave: 'square', from: 100, to: 100, length: 1, attack: 0.1, volume: 1 });
    const at = (t: number) => Math.abs(s[Math.round(t * SAMPLE_RATE)]);
    expect(at(0.05)).toBeCloseTo(0.5, 2);    // halfway up the attack
    expect(at(0.1)).toBeCloseTo(1, 2);
    expect(at(0.55)).toBeCloseTo(0.5, 2);    // halfway down the fall
    expect(at(0.9999)).toBeLessThan(0.01);
  });

  it('every wave stays between −1 and 1; triangle, saw and sine reach both ends', () => {
    for (const wave of ['triangle', 'saw', 'sine'] as const) {
      const s = synthesize({ wave, from: 50, to: 50, length: 0.5, attack: 0, volume: 1 }).slice(0, 2000);
      expect(Math.max(...s), wave).toBeGreaterThan(0.95);
      expect(Math.min(...s), wave).toBeLessThan(-0.95);
    }
  });

  it('noise: the same seed makes the same sound, a different seed a different one', () => {
    const r = { wave: 'noise' as const, from: 2000, to: 500, length: 0.2 };
    expect(synthesize({ ...r, seed: 3 })).toEqual(synthesize({ ...r, seed: 3 }));
    expect(synthesize({ ...r, seed: 3 })).not.toEqual(synthesize({ ...r, seed: 4 }));
  });

  it('says what is wrong with a recipe', () => {
    expect(soundProblem({ wave: 'kazoo' as never, from: 440, to: 440, length: 1 })).toMatch(/wave must be one of/);
    expect(soundProblem({ wave: 'sine', from: 5, to: 440, length: 1 })).toMatch(/from is a pitch in hertz/);
    expect(soundProblem({ wave: 'sine', from: 440, to: 440, length: 0 })).toMatch(/length is in seconds/);
    expect(soundProblem({ wave: 'sine', from: 440, to: 440, length: 1, attack: 2 })).toMatch(/attack/);
    expect(soundProblem({ wave: 'sine', from: 440, to: 440, length: 1, volume: 3 })).toMatch(/volume/);
    expect(() => synthesize({ wave: 'sine', from: 440, to: 440, length: -1 })).toThrow(/length/);
  });
});

describe('toWav', () => {
  it('writes a standard 16-bit mono .wav: RIFF header, the rate, and the samples', () => {
    const w = toWav(new Float32Array([0, 1, -1, 0.5]), 8000);
    const text = (a: number, n: number) => String.fromCharCode(...w.slice(a, a + n));
    const v = new DataView(w.buffer);
    expect([text(0, 4), text(8, 4), text(12, 4), text(36, 4)]).toEqual(['RIFF', 'WAVE', 'fmt ', 'data']);
    expect([v.getUint16(22, true), v.getUint32(24, true), v.getUint16(34, true), v.getUint32(40, true)]).toEqual([1, 8000, 16, 8]);
    expect([0, 1, 2, 3].map((i) => v.getInt16(44 + 2 * i, true))).toEqual([0, 32767, -32767, 16384]);
  });

  it('a recipe’s bytes are its samples as a .wav', () => {
    const r = { wave: 'square' as const, from: 600, to: 900, length: 0.1 };
    expect(soundBytes(r).length).toBe(44 + 2 * Math.round(0.1 * SAMPLE_RATE));
  });
});
