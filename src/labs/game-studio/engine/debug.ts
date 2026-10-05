// The debug panel: the debug global, in the style of Dear ImGui ("immediate mode"). A script asks for a control every
// frame and uses what it returns:
//
//   this.speed = debug.slider('speed', this.speed, 0, 200)    // a slider in the editor's Debug tab
//   debug.watch('epsilon', brain.epsilon)                       // a read-out
//   if (debug.button('reset')) this.reset()                     // true on the frame it is pressed
//
// Nothing is declared ahead: the panel shows whatever was asked for recently. The first call's value is where a
// slider starts; once someone moves it, the call returns the slider's value instead. Outside the editor (an exported
// game, training) nobody moves anything, so every call returns the script's own value: the game plays the same.

export type DebugWidget =
  | { kind: 'slider'; name: string; value: number; min: number; max: number; step: number }
  | { kind: 'toggle'; name: string; value: boolean }
  | { kind: 'watch'; name: string; value: string }
  | { kind: 'button'; name: string };

export class DebugPanel {
  /** What was asked for, by name, and the frame it was last asked for. */
  private widgets = new Map<string, { w: DebugWidget; frame: number }>();
  /** Values set from the editor, by name. */
  private set = new Map<string, number | boolean>();
  /** Buttons pressed in the editor, not yet seen by a script. */
  private pressed = new Set<string>();
  /** Bumped whenever the list or a value changes, so the editor is only told when there is news. */
  version = 0;

  constructor(private frame: () => number) {}

  private note(w: DebugWidget): void {
    const old = this.widgets.get(w.name);
    if (!old || JSON.stringify(old.w) !== JSON.stringify(w)) this.version++;
    this.widgets.set(w.name, { w, frame: this.frame() });
  }

  private named(name: unknown): string {
    if (typeof name !== 'string' || !name) throw new Error('A debug control needs a name: debug.slider(\'speed\', …)');
    return name;
  }

  /** The script's global. */
  readonly api = ((panel: DebugPanel) => ({
    /** A number to tune: the slider's value once moved, the given value until then. */
    slider(name: string, value: number, min: number, max: number, step = 0): number {
      const n = panel.named(name);
      if (![value, min, max].every(Number.isFinite) || max <= min) throw new Error(`debug.slider('${n}', value, min, max): three numbers, with max above min`);
      const v = panel.set.has(n) ? Number(panel.set.get(n)) : value;
      panel.note({ kind: 'slider', name: n, value: v, min, max, step: step > 0 ? step : (max - min) / 100 });
      return v;
    },
    /** A switch: the panel's once flipped, the given value until then. */
    toggle(name: string, value: boolean): boolean {
      const n = panel.named(name);
      const v = panel.set.has(n) ? !!panel.set.get(n) : !!value;
      panel.note({ kind: 'toggle', name: n, value: v });
      return v;
    },
    /** A read-out: shows the value (numbers to 4 significant figures). */
    watch(name: string, value: unknown): void {
      const n = panel.named(name);
      const text = typeof value === 'number' ? (Number.isInteger(value) ? String(value) : value.toPrecision(4)) : typeof value === 'string' ? value : JSON.stringify(value);
      panel.note({ kind: 'watch', name: n, value: String(text) });
    },
    /** A button: true on the one call after it is pressed in the panel. */
    button(name: string): boolean {
      const n = panel.named(name);
      panel.note({ kind: 'button', name: n });
      if (!panel.pressed.has(n)) return false;
      panel.pressed.delete(n);
      return true;
    },
  }))(this);

  /** What to show: controls asked for in the last second (60 frames), in the order first asked. */
  list(): DebugWidget[] {
    const now = this.frame();
    return [...this.widgets.values()].filter((x) => now - x.frame <= 60).map((x) => x.w);
  }

  /** The editor moved a slider or flipped a toggle. */
  setValue(name: string, value: number | boolean): void { this.set.set(name, value); this.version++; }
  /** The editor pressed a button. */
  press(name: string): void { this.pressed.add(name); }
}
