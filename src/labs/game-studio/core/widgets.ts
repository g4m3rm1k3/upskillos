// UI widgets: what Panel, Button and ProgressBar look like, and where a VBoxContainer or HBoxContainer puts its
// children. One description, used by the running game (engine/game.ts draws these parts) and by the editor's
// viewport (editor/Viewport.tsx), so the editor shows what Run will show.
//
// Every widget's position is its top-left corner, as a Label's is, and its size is its width and height. Parts are
// in the widget's own coordinates, from that corner.
//
// Containers place their visible 2D children one after another, top to bottom (VBox) or left to right (HBox),
// `separation` pixels apart, starting at the container's own position. A child's size is its `size` if it has one,
// or a Label's estimated text size, or 0. Like Godot's containers, they set their children's positions every frame,
// so a script cannot move a child inside one: move the container instead.

/** Something to draw for a widget: a rectangle (from its top-left) or text (top-left, or centred on x, y). */
export type WidgetPart =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; color: string; stroke?: string; strokeWidth?: number }
  | { kind: 'text'; x: number; y: number; text: string; fontSize: number; color: string; center: boolean; wrap: number };

/** How a button is being used right now (the game knows; the editor shows it at rest). */
export interface WidgetState { hover?: boolean; down?: boolean; focused?: boolean }

export const WIDGET_TYPES = new Set(['Panel', 'Button', 'ProgressBar']);
export const CONTAINER_TYPES = new Set(['VBoxContainer', 'HBoxContainer']);

type Get = (name: string) => unknown;
const vec = (v: unknown) => v as { x: number; y: number };

/** A colour made lighter (amount > 0) or darker (amount < 0), for a button's hover and pressed looks. */
export function shade(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16), ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const out = ch.map((c) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount)));
  return `#${out.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** The parts a widget is drawn with, or null if the type is not a widget. */
export function widgetParts(type: string, get: Get, state: WidgetState = {}): WidgetPart[] | null {
  if (type === 'Panel') {
    const s = vec(get('size')), bw = Number(get('borderWidth'));
    return [{ kind: 'rect', x: 0, y: 0, w: s.x, h: s.y, color: String(get('color')), ...(bw > 0 ? { stroke: String(get('borderColor')), strokeWidth: bw } : {}) }];
  }
  if (type === 'Button') {
    const s = vec(get('size')), disabled = !!get('disabled');
    const base = String(get('color'));
    // Hover lightens it, pressing darkens it, focus (keyboard) outlines it; a disabled button is greyed.
    const fill = disabled ? shade(base, -0.45) : state.down ? shade(base, -0.25) : state.hover ? shade(base, 0.18) : base;
    return [
      { kind: 'rect', x: 0, y: 0, w: s.x, h: s.y, color: fill, ...(state.focused && !disabled ? { stroke: '#ffffff', strokeWidth: 2 } : {}) },
      { kind: 'text', x: s.x / 2, y: s.y / 2, text: String(get('text')), fontSize: Number(get('fontSize')), color: disabled ? shade(String(get('textColor')), -0.5) : String(get('textColor')), center: true, wrap: 0 },
    ];
  }
  if (type === 'ProgressBar') {
    const s = vec(get('size')), max = Number(get('maxValue')), value = Number(get('value'));
    const f = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
    const parts: WidgetPart[] = [
      { kind: 'rect', x: 0, y: 0, w: s.x, h: s.y, color: String(get('backColor')) },
      { kind: 'rect', x: 0, y: 0, w: s.x * f, h: s.y, color: String(get('fillColor')) },
    ];
    if (get('showText')) parts.push({ kind: 'text', x: s.x / 2, y: s.y / 2, text: `${Math.round(value)} / ${Math.round(max)}`, fontSize: Math.max(8, Math.round(s.y * 0.7)), color: '#ffffff', center: true, wrap: 0 });
    return parts;
  }
  return null;
}

/** How wide a line of text is, estimated the same way everywhere (the game cannot measure text before it draws). */
export const textWidth = (text: string, fontSize: number): number => text.length * fontSize * 0.55;

/** A node's size for layout and clicks: a widget's or container child's `size`, or a Label's text, or null. */
export function nodeSize(type: string, get: Get): { w: number; h: number } | null {
  if (WIDGET_TYPES.has(type)) { const s = vec(get('size')); return { w: s.x, h: s.y }; }
  if (type === 'Label') {
    const fs = Number(get('fontSize')), wrap = Number(get('wrapWidth')) || 0, text = String(get('text'));
    const lines = text.split('\n');
    if (wrap > 0) {
      // Each line wraps into ceil(its width / wrap) rows.
      const rows = lines.reduce((n, l) => n + Math.max(1, Math.ceil(textWidth(l, fs) / wrap)), 0);
      return { w: wrap, h: rows * fs * 1.2 };
    }
    return { w: Math.max(...lines.map((l) => textWidth(l, fs))), h: lines.length * fs * 1.2 };
  }
  return null;
}

/** Where a container puts each child (its local position), from the children's sizes (null: not laid out). */
export function boxLayout(vertical: boolean, separation: number, sizes: ({ w: number; h: number } | null)[]): ({ x: number; y: number } | null)[] {
  let at = 0;
  return sizes.map((s) => {
    if (!s) return null;
    const p = vertical ? { x: 0, y: at } : { x: at, y: 0 };
    at += (vertical ? s.h : s.w) + separation;
    return p;
  });
}
