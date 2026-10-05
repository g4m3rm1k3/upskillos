// Sound effects made from a recipe (project.writeSound), the way writeSvg makes pictures from SVG text: the project
// keeps the recipe, and the .wav file's bytes are made from it whenever they are needed (to play it, to export it).
//
// A recipe is the classic game sound-effect generator's model (the one behind sfxr): one wave at a time.
//   wave     the shape of the wave: 'square' (bright, retro), 'triangle' (soft), 'sine' (pure), 'saw' (buzzy),
//            or 'noise' (hiss: explosions, hits, footsteps)
//   from, to the pitch at the start and at the end, in hertz (cycles per second); it slides between them
//            exponentially, so a slide sounds even (each octave takes the same time). 440 Hz is the A above middle C.
//   length   seconds
//   attack   seconds to rise from silence to full volume, then it fades back to silence by the end
//   volume   0 to 1
//   seed     which noise: the same seed always makes the same hiss
//
// The samples: at time t the pitch is f(t) = from · (to / from)^(t / length). The wave's phase φ grows by f(t) / rate
// each sample (rate samples per second), and the wave is read off the phase: a square is +1 for the first half of
// each cycle and −1 for the second, a saw rises from −1 to +1, a triangle goes up and down, a sine is sin(2πφ). The
// envelope multiplies it: t / attack while rising, then a straight fall to 0 at the end.

export type Wave = 'square' | 'triangle' | 'sine' | 'saw' | 'noise';
export interface SoundRecipe { wave: Wave; from: number; to: number; length: number; attack?: number; volume?: number; seed?: number }

export const SAMPLE_RATE = 22050;
export const WAVES: Wave[] = ['square', 'triangle', 'sine', 'saw', 'noise'];

/** What is wrong with a recipe, or null. */
export function soundProblem(r: SoundRecipe): string | null {
  if (!r || typeof r !== 'object') return 'A sound needs a recipe: { wave, from, to, length }';
  if (!WAVES.includes(r.wave)) return `wave must be one of ${WAVES.join(', ')} (got ${JSON.stringify(r.wave)})`;
  for (const k of ['from', 'to'] as const) if (!(Number.isFinite(r[k]) && r[k] >= 20 && r[k] <= 10000)) return `${k} is a pitch in hertz, from 20 to 10000 (got ${JSON.stringify(r[k])})`;
  if (!(Number.isFinite(r.length) && r.length > 0 && r.length <= 10)) return `length is in seconds, more than 0 and at most 10 (got ${JSON.stringify(r.length)})`;
  if (r.attack !== undefined && !(Number.isFinite(r.attack) && r.attack >= 0 && r.attack <= r.length)) return `attack is in seconds, from 0 to the length (got ${JSON.stringify(r.attack)})`;
  if (r.volume !== undefined && !(Number.isFinite(r.volume) && r.volume >= 0 && r.volume <= 1)) return `volume is from 0 to 1 (got ${JSON.stringify(r.volume)})`;
  return null;
}

/** The recipe's samples, from −1 to 1, at SAMPLE_RATE. */
export function synthesize(r: SoundRecipe): Float32Array {
  const bad = soundProblem(r);
  if (bad) throw new Error(bad);
  const n = Math.max(1, Math.round(r.length * SAMPLE_RATE)), out = new Float32Array(n);
  const attack = r.attack ?? 0.01, volume = r.volume ?? 0.5;
  // A small, fixed random-number generator (mulberry32), so the same seed makes the same noise everywhere.
  let s = (r.seed ?? 1) >>> 0;
  const random = () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  let phase = 0, noise = random() * 2 - 1;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const f = r.from * Math.pow(r.to / r.from, t / r.length);
    const before = phase;
    phase = (phase + f / SAMPLE_RATE) % 1;
    let v: number;
    switch (r.wave) {
      case 'square': v = phase < 0.5 ? 1 : -1; break;
      case 'saw': v = 2 * phase - 1; break;
      case 'triangle': v = phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase; break;
      case 'sine': v = Math.sin(2 * Math.PI * phase); break;
      // Noise holds one random value per cycle, so its pitch still shapes it (low: rumble, high: hiss).
      default: if (phase < before) noise = random() * 2 - 1; v = noise;
    }
    const env = t < attack ? t / attack : Math.max(0, (r.length - t) / Math.max(1e-9, r.length - attack));
    out[i] = v * env * volume;
  }
  return out;
}

/** A mono 16-bit .wav file of samples from −1 to 1. */
export function toWav(samples: Float32Array, rate = SAMPLE_RATE): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2), view = new DataView(bytes.buffer);
  const text = (at: number, s: string) => { for (let i = 0; i < s.length; i++) bytes[at + i] = s.charCodeAt(i); };
  text(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); text(8, 'WAVE');
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), true);
  return bytes;
}

/** A recipe's .wav bytes. */
export const soundBytes = (r: SoundRecipe): Uint8Array => toWav(synthesize(r));
