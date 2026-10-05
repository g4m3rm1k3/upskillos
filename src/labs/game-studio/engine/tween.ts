// Tweens: change a node's properties smoothly over time (the tween global). tween.to(node, { position: { x: 100, y: 40 },
// opacity: 0 }, 0.3) moves the node there and fades it out over 0.3 s. Godot's create_tween().tween_property() does the
// same.
//
// Each frame a tween's time t runs from 0 to its duration; u = t / duration goes from 0 to 1; an easing curve e(u) bends
// that (fast then slow, overshoot, bounce), and each property is set to start + (end − start) × e(u). Numbers, { x, y }
// and colours ("#rrggbb", channel by channel) can be tweened.

/** Easing curves: u from 0 to 1 in, e(u) out, with e(0) = 0 and e(1) = 1. */
export const EASES: Record<string, (u: number) => number> = {
  linear: (u) => u,
  inQuad: (u) => u * u,
  outQuad: (u) => 1 - (1 - u) * (1 - u),
  inOutQuad: (u) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u)),
  outCubic: (u) => 1 - Math.pow(1 - u, 3),
  // Overshoots by about 10% and settles back: a pop.
  outBack: (u) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); },
  // Falls and bounces three times, each lower.
  outBounce: (u) => {
    const n = 7.5625, d = 2.75;
    if (u < 1 / d) return n * u * u;
    if (u < 2 / d) { u -= 1.5 / d; return n * u * u + 0.75; }
    if (u < 2.5 / d) { u -= 2.25 / d; return n * u * u + 0.9375; }
    u -= 2.625 / d; return n * u * u + 0.984375;
  },
};

export interface TweenOptions {
  /** The easing curve: a name in EASES ('outQuad' unless given). */
  ease?: string;
  /** Seconds to wait before starting. */
  delay?: number;
  /** Run when it finishes (not when stopped). */
  then?: () => void;
  /** Go there and back: when it finishes, run again from the end to the start. */
  yoyo?: boolean;
  /** How many more times to run after the first (−1: for ever, until stopped). */
  repeat?: number;
}

type Value = number | { x: number; y: number } | string;
interface Track { name: string; from: Value; to: Value }

const isVec = (v: unknown): v is { x: number; y: number } => !!v && typeof v === 'object' && typeof (v as { x: unknown }).x === 'number' && typeof (v as { y: unknown }).y === 'number';
const isColour = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const rgb = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const hex = (ch: number[]) => `#${ch.map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0')).join('')}`;

/** Partway from a to b by f (f may go past 0..1 for outBack). */
export function mix(a: Value, b: Value, f: number): Value {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * f;
  if (isVec(a) && isVec(b)) return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  if (isColour(a) && isColour(b)) { const p = rgb(a), q = rgb(b); return hex(p.map((x, i) => x + (q[i] - x) * f)); }
  throw new Error('Only numbers, { x, y } and colours ("#rrggbb") can be tweened');
}

/** One tween: some properties of one target, going from where they are to where they are told. */
export class Tween {
  private t = -0;
  private tracks: Track[] | null = null;
  private runs = 0;
  /** Finished or stopped: it no longer changes anything. */
  finished = false;
  private stopped = false;

  constructor(readonly target: Record<string, unknown>, private props: Record<string, Value>, readonly duration: number, private opts: TweenOptions = {}) {
    if (!(duration >= 0)) throw new Error(`A tween's duration is in seconds, 0 or more (got ${duration})`);
    if (opts.ease !== undefined && !EASES[opts.ease]) throw new Error(`There is no easing "${opts.ease}": use one of ${Object.keys(EASES).join(', ')}`);
    this.t = -(opts.delay ?? 0);
  }

  /** Stop where it is: nothing more changes, and then does not run. */
  stop(): void { this.stopped = true; this.finished = true; }

  /** Move on by dt seconds. Returns false once finished. */
  advance(dt: number): boolean {
    if (this.finished) return false;
    this.t += dt;
    if (this.t < 0) return true;
    // The start values are read when it starts (after any delay), so a tween begins from wherever the node is then.
    this.tracks ??= Object.entries(this.props).map(([name, to]) => {
      const from = this.target[name] as Value;
      mix(from, to, 0);   // checks the kinds match, before anything moves
      return { name, from: isVec(from) ? { x: from.x, y: from.y } : from, to };
    });
    const u = this.duration === 0 ? 1 : Math.min(1, this.t / this.duration);
    const e = EASES[this.opts.ease ?? 'outQuad'](u);
    for (const tr of this.tracks) this.target[tr.name] = mix(tr.from, tr.to, e);
    if (u < 1) return true;
    // The end of one run: go again (back, if yoyo) or finish.
    const repeat = this.opts.repeat ?? 0;
    if (repeat < 0 || this.runs < repeat || (this.opts.yoyo && this.runs === 0 && repeat === 0)) {
      this.runs++;
      if (this.opts.yoyo) for (const tr of this.tracks) [tr.from, tr.to] = [tr.to, tr.from];
      this.t -= this.duration;
      return true;
    }
    this.finished = true;
    if (!this.stopped) this.opts.then?.();
    return false;
  }
}
