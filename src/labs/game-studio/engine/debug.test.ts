// The debug panel (engine/debug.ts): immediate-mode controls, values set from the editor, and no change without one.
import { describe, expect, it } from 'vitest';
import { DebugPanel } from './debug';

describe('debug', () => {
  it('a slider returns the script\'s value until the editor moves it, then the editor\'s', () => {
    let frame = 0;
    const p = new DebugPanel(() => frame);
    expect(p.api.slider('speed', 70, 0, 200)).toBe(70);
    expect(p.list()).toEqual([{ kind: 'slider', name: 'speed', value: 70, min: 0, max: 200, step: 2 }]);
    p.setValue('speed', 140);
    frame++;
    expect(p.api.slider('speed', 70, 0, 200)).toBe(140);
    expect(p.list()[0]).toMatchObject({ value: 140 });
  });

  it('a toggle flips; a button is true once after each press; a watch shows a value', () => {
    const p = new DebugPanel(() => 0);
    expect(p.api.toggle('god mode', false)).toBe(false);
    p.setValue('god mode', true);
    expect(p.api.toggle('god mode', false)).toBe(true);
    expect(p.api.button('reset')).toBe(false);
    p.press('reset');
    expect(p.api.button('reset')).toBe(true);
    expect(p.api.button('reset')).toBe(false);
    p.api.watch('epsilon', 0.123456); p.api.watch('pos', { x: 1, y: 2 }); p.api.watch('count', 7);
    expect(p.list().filter((w) => w.kind === 'watch').map((w) => (w as { value: string }).value)).toEqual(['0.1235', '{"x":1,"y":2}', '7']);
  });

  it('shows only what was asked for in the last second, and counts changes so the editor is told only of news', () => {
    let frame = 0;
    const p = new DebugPanel(() => frame);
    p.api.watch('a', 1); const v1 = p.version;
    p.api.watch('a', 1); expect(p.version).toBe(v1);        // the same: no news
    p.api.watch('a', 2); expect(p.version).toBe(v1 + 1);
    frame = 100;
    p.api.watch('b', 1);
    expect(p.list().map((w) => w.name)).toEqual(['b']);    // a was last asked for 100 frames ago
  });

  it('says what is wrong', () => {
    const p = new DebugPanel(() => 0);
    expect(() => p.api.slider('', 1, 0, 2)).toThrow(/needs a name/);
    expect(() => p.api.slider('x', 1, 5, 2)).toThrow(/max above min/);
  });
});
