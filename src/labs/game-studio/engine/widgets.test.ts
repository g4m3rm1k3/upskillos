// UI widgets in the running game: buttons (clicks, focus, the pressed signal), containers, progress bars, and the
// editor placing them where the game does (core/widgets.ts, engine/game.ts).
import { describe, expect, it } from 'vitest';
import { Doc } from '../core/doc';
import { newProject } from '../core/project';
import { placeNodes } from '../core/sceneView';
import { Game, type DrawItem } from './game';
import { Button, Node, Node2D } from './nodes';
import { boxLayout, nodeSize, shade, widgetParts } from '../core/widgets';

function build(make: (d: Doc, id: string) => void, classes: Record<string, typeof Node> = {}) {
  const d = new Doc(newProject());
  const s = d.createScene('scenes/main.scene');
  make(d, s.id);
  const frames: DrawItem[][] = [];
  const g = new Game(d.project, d.scene(s.id), { frame: (items) => { frames.push(items); } }, { scriptClass: (p) => classes[p] });
  g.start();
  return { d, sceneId: s.id, g, frames };
}

/** Move the pointer (screen pixels), press and release the left button, a frame apart. */
function click(g: Game, x: number, y: number, upAt = { x, y }) {
  g.input._move(x, y); g.step(1 / 60);
  g.input.key('MouseLeft', true); g.step(1 / 60);
  g.input._move(upAt.x, upAt.y); g.step(1 / 60);
  g.input.key('MouseLeft', false); g.step(1 / 60);
}
const tap = (g: Game, code: string) => { g.input.key(code, true); g.step(1 / 60); g.input.key(code, false); g.step(1 / 60); };

describe('Button', () => {
  const menu = (log: string[], disabled = false) => {
    class Logged extends Button { pressed() { log.push(`pressed ${this.name}`); } }
    return build((d, id) => {
      d.writeScript('scripts/b.js', '');
      const hud = d.addNode(id, 'CanvasLayer', undefined, { name: 'HUD' });
      const play = d.addNode(id, 'Button', hud.id, { name: 'Play', props: { position: { x: 100, y: 100 }, size: { x: 120, y: 40 } } });
      d.setScript(id, play.id, 'scripts/b.js');
      const quit = d.addNode(id, 'Button', hud.id, { name: 'Quit', props: { position: { x: 100, y: 160 }, size: { x: 120, y: 40 }, disabled } });
      d.setScript(id, quit.id, 'scripts/b.js');
    }, { 'scripts/b.js': Logged });
  };

  it('a click (down and up on it) calls pressed() and emits the pressed signal', () => {
    const log: string[] = [];
    const { g } = menu(log);
    g.root.get('HUD/Play').connect('pressed', () => log.push('signal'));
    click(g, 150, 120);
    expect(log).toEqual(['pressed Play', 'signal']);
  });

  it('down on it but up somewhere else does not press it; neither does a click beside it', () => {
    const log: string[] = [];
    const { g } = menu(log);
    click(g, 150, 120, { x: 400, y: 400 });
    click(g, 90, 120);
    expect(log).toEqual([]);
  });

  it('a disabled button cannot be clicked or take the focus', () => {
    const log: string[] = [];
    const { g } = menu(log, true);
    click(g, 150, 180);
    const quit = g.root.get<Button>('HUD/Quit');
    quit.grabFocus();
    expect(log).toEqual([]);
    expect(quit.hasFocus).toBe(false);
  });

  it('the arrow keys move the focus to the nearest button that way; Enter presses the focused one', () => {
    const log: string[] = [];
    const { g } = menu(log);
    const play = g.root.get<Button>('HUD/Play'), quit = g.root.get<Button>('HUD/Quit');
    play.grabFocus();
    tap(g, 'ArrowDown');
    expect(quit.hasFocus).toBe(true);
    tap(g, 'ArrowDown');                     // nothing further down: the focus stays
    expect(quit.hasFocus).toBe(true);
    tap(g, 'ArrowUp'); tap(g, 'Enter');
    expect(log).toEqual(['pressed Play']);
    play.releaseFocus(); tap(g, 'Enter');
    expect(log).toEqual(['pressed Play']);   // no focus: Enter is the game's again
  });

  it('a button in the world is clicked where the camera shows it; one under a CanvasLayer where it is on screen', () => {
    const log: string[] = [];
    class Logged extends Button { pressed() { log.push(this.name); } }
    const { g } = build((d, id) => {
      d.writeScript('scripts/b.js', '');
      const cam = d.addNode(id, 'Camera2D', undefined, { name: 'Cam', props: { position: { x: 1000, y: 270 } } });
      void cam;
      const sign = d.addNode(id, 'Button', undefined, { name: 'Sign', props: { position: { x: 1000, y: 270 }, size: { x: 40, y: 40 } } });
      d.setScript(id, sign.id, 'scripts/b.js');
      const hud = d.addNode(id, 'CanvasLayer', undefined, { name: 'HUD' });
      const menu = d.addNode(id, 'Button', hud.id, { name: 'Menu', props: { position: { x: 0, y: 0 }, size: { x: 40, y: 40 } } });
      d.setScript(id, menu.id, 'scripts/b.js');
    }, { 'scripts/b.js': Logged });
    // The camera centres x 1000 on the screen's middle (480): the sign's corner is on screen at (480, 270).
    click(g, 490, 280);
    click(g, 10, 10);
    expect(log).toEqual(['Sign', 'Menu']);
  });

  it('is drawn as a box with its words centred on it, lighter under the pointer', () => {
    const { g, frames } = menu([]);
    const parts = () => frames.at(-1)!.filter((i) => i.screen && (i.kind === 'rect' || i.kind === 'text'));
    const [box, words] = parts();
    expect(box).toMatchObject({ kind: 'rect', x: 160, y: 120, width: 120, height: 40, color: '#3b5bdb' });
    expect(words).toMatchObject({ kind: 'text', x: 160, y: 120, text: 'Button', center: true });
    g.input._move(150, 120); g.step(1 / 60);
    expect(parts()[0]).toMatchObject({ color: shade('#3b5bdb', 0.18) });
  });

  it('loses the focus when the scene changes', () => {
    const { d, g } = menu([]);
    d.createScene('scenes/other.scene');
    g.root.get<Button>('HUD/Play').grabFocus();
    g.sceneApi.change('scenes/other.scene'); g.step(1 / 60);
    expect(g._focus).toBeNull();
  });
});

describe('containers', () => {
  it('a VBoxContainer stacks its children separation apart; a hidden child is skipped and the rest close up', () => {
    const { g } = build((d, id) => {
      const box = d.addNode(id, 'VBoxContainer', undefined, { name: 'Box', props: { position: { x: 20, y: 30 }, separation: 10 } });
      for (const n of ['A', 'B', 'C']) d.addNode(id, 'Button', box.id, { name: n, props: { size: { x: 100, y: 40 } } });
    });
    const at = () => ['A', 'B', 'C'].map((n) => g.root.get<Node2D>(`Box/${n}`).globalPosition).map((p) => [p.x, p.y]);
    expect(at()).toEqual([[20, 30], [20, 80], [20, 130]]);
    g.root.get<Node2D>('Box/B').visible = false; g.step(1 / 60);
    expect(at()[2]).toEqual([20, 80]);
  });

  it('an HBoxContainer inside a VBoxContainer: the row takes its tallest child’s height', () => {
    const { g } = build((d, id) => {
      const col = d.addNode(id, 'VBoxContainer', undefined, { name: 'Col', props: { separation: 4 } });
      const row = d.addNode(id, 'HBoxContainer', col.id, { name: 'Row', props: { separation: 6 } });
      d.addNode(id, 'ProgressBar', row.id, { name: 'Hp', props: { size: { x: 50, y: 10 } } });
      d.addNode(id, 'Button', row.id, { name: 'Heal', props: { size: { x: 30, y: 24 } } });
      d.addNode(id, 'Panel', col.id, { name: 'Below', props: { size: { x: 10, y: 10 } } });
    });
    const pos = (p: string) => { const v = g.root.get<Node2D>(p).globalPosition; return [v.x, v.y]; };
    expect(pos('Col/Row/Heal')).toEqual([56, 0]);
    expect(pos('Col/Below')).toEqual([0, 28]);   // 24 (the button) + 4
  });

  it('the editor places children of containers exactly where the game does', () => {
    const { d, sceneId, g } = build((d, id) => {
      const col = d.addNode(id, 'VBoxContainer', undefined, { name: 'Col', props: { position: { x: 5, y: 7 }, separation: 3 } });
      d.addNode(id, 'Label', col.id, { name: 'Title', props: { text: 'Inventory', fontSize: 20 } });
      const row = d.addNode(id, 'HBoxContainer', col.id, { name: 'Row' });
      d.addNode(id, 'Button', row.id, { name: 'Use', props: { size: { x: 60, y: 30 } } });
      d.addNode(id, 'Button', row.id, { name: 'Drop', props: { size: { x: 60, y: 30 } } });
    });
    const placed = placeNodes(d.scene(sceneId));
    for (const path of ['Col/Title', 'Col/Row', 'Col/Row/Use', 'Col/Row/Drop']) {
      const p = placed.find((x) => x.node.name === path.split('/').at(-1))!;
      const v = g.root.get<Node2D>(path).globalPosition;
      expect([p.world[4], p.world[5]], path).toEqual([v.x, v.y]);
    }
  });

  it('boxLayout and nodeSize: the layout rules, by numbers', () => {
    expect(boxLayout(true, 5, [{ w: 1, h: 10 }, null, { w: 1, h: 20 }, { w: 1, h: 1 }])).toEqual([{ x: 0, y: 0 }, null, { x: 0, y: 15 }, { x: 0, y: 40 }]);
    expect(boxLayout(false, 0, [{ w: 7, h: 1 }, { w: 3, h: 1 }])).toEqual([{ x: 0, y: 0 }, { x: 7, y: 0 }]);
    // A label: 0.55 × fontSize per letter, 1.2 × fontSize per line; wrapped, as many rows as the width needs.
    const label = (props: Record<string, unknown>) => nodeSize('Label', (k) => ({ text: 'abcd', fontSize: 10, wrapWidth: 0, ...props })[k]);
    expect(label({})).toEqual({ w: 22, h: 12 });
    expect(label({ text: 'ab\nabcdef' })).toEqual({ w: 33, h: 24 });
    expect(label({ text: 'abcdefghij', wrapWidth: 20 })).toEqual({ w: 20, h: 36 });   // 55 px of text in rows of 20: 3 rows
  });
});

describe('ProgressBar', () => {
  const bar = (props: Record<string, unknown>) => widgetParts('ProgressBar', (k) => ({ size: { x: 200, y: 10 }, value: 50, maxValue: 100, fillColor: '#0f0', backColor: '#000', showText: false, ...props })[k]);
  it('fills value / maxValue of its width, never less than empty or more than full', () => {
    expect(bar({ value: 25 })![1]).toMatchObject({ w: 50 });
    expect(bar({ value: -5 })![1]).toMatchObject({ w: 0 });
    expect(bar({ value: 500 })![1]).toMatchObject({ w: 200 });
    expect(bar({ maxValue: 0 })![1]).toMatchObject({ w: 0 });
  });
  it('shows "value / maxValue" when asked', () => {
    expect(bar({ showText: true, value: 7, maxValue: 10 })![2]).toMatchObject({ kind: 'text', text: '7 / 10', center: true });
  });
});
