// The Phaser adapter (ADR 2): the only file that knows the game is drawn by Phaser.
// The engine hands it a list of what to draw and where the camera looks, each frame;
// it keeps one Phaser object per item, creating, updating and removing them to match.
//
// Two Phaser cameras: the main one looks at the world (it moves and zooms with the
// engine's view); a second one draws what is on the screen (under a CanvasLayer), so a
// HUD never moves or zooms. Each object is shown to exactly one of them.
//
// A tile layer is a real Phaser Tilemap with one TilemapLayer, rebuilt only when its cells
// change (the item's version). Phaser's layer starts at cell (0, 0), so it covers the painted
// cells' rectangle and is placed where that rectangle's top-left corner is.

import * as Phaser from 'phaser';
import type { DrawItem, Renderer, View } from '../engine/game';
import { tileFlags, tileId, tileTransform } from '../core/tiles';

type Obj = Phaser.GameObjects.Image | Phaser.GameObjects.Text | Phaser.GameObjects.Rectangle | Phaser.Tilemaps.TilemapLayer;
interface Rec { obj: Obj; kind: DrawItem['kind']; screen: boolean; map?: Phaser.Tilemaps.Tilemap; version?: string; offset?: { x: number; y: number } }

export class PhaserRenderer implements Renderer {
  private objects = new Map<number, Rec>();
  private ui: Phaser.Cameras.Scene2D.Camera;

  constructor(private scene: Phaser.Scene) {
    const { width, height } = scene.scale;
    this.ui = scene.cameras.add(0, 0, width, height, false, 'screen');
  }

  frame(items: DrawItem[], view: View): void {
    const main = this.scene.cameras.main;
    main.setZoom(view.zoom);
    main.centerOn(view.x, view.y);
    const seen = new Set<number>();
    for (const it of items) {
      seen.add(it.id);
      let rec = this.objects.get(it.id);
      const wrongImage = rec && it.kind === 'sprite' && (rec.obj as Phaser.GameObjects.Image).texture.key !== it.texture;
      if (it.kind === 'tiles') {
        const version = `${it.texture}|${it.tileWidth}|${it.tileHeight}|${it.margin}|${it.spacing}|${it.version}`;
        if (!rec || rec.kind !== 'tiles' || rec.screen !== it.screen || rec.version !== version) {
          this.drop(rec);
          rec = this.tiles(it, version);
          (it.screen ? main : this.ui).ignore(rec.obj);
          this.objects.set(it.id, rec);
        }
        // Place the layer's top-left (the painted rectangle's corner) through the node's transform.
        const ox = rec.offset!.x * it.scaleX, oy = rec.offset!.y * it.scaleY, c = Math.cos(it.rotation), sn = Math.sin(it.rotation);
        rec.obj.setPosition(it.x + ox * c - oy * sn, it.y + ox * sn + oy * c);
        rec.obj.setRotation(it.rotation);
        rec.obj.setScale(it.scaleX, it.scaleY);
        rec.obj.setAlpha(it.alpha);
        rec.obj.setDepth(it.depth);
        continue;
      }
      if (!rec || rec.kind !== it.kind || rec.screen !== it.screen || wrongImage) {
        this.drop(rec);
        const obj: Obj = it.kind === 'sprite'
          ? this.scene.add.image(0, 0, this.scene.textures.exists(it.texture) ? it.texture : '__MISSING')
          : it.kind === 'rect' ? this.scene.add.rectangle(0, 0, it.width, it.height, 0xffffff)
          : this.scene.add.text(0, 0, '', { fontFamily: 'system-ui, sans-serif' }).setOrigin(0, 0);
        // Each object is drawn by one camera only.
        (it.screen ? main : this.ui).ignore(obj);
        rec = { obj, kind: it.kind, screen: it.screen };
        this.objects.set(it.id, rec);
      }
      const o = rec.obj;
      o.setPosition(it.x, it.y);
      o.setRotation(it.rotation);
      o.setScale(it.scaleX, it.scaleY);
      o.setAlpha(it.alpha);
      o.setDepth(it.depth);
      if (it.kind === 'sprite') {
        const img = o as Phaser.GameObjects.Image;
        img.setFlip(it.flipX, it.flipY);
        if (it.tint) img.setTint(Phaser.Display.Color.HexStringToColor(it.tint).color); else img.clearTint();
      }
      else if (it.kind === 'rect') {
        const r = o as Phaser.GameObjects.Rectangle;
        r.setSize(it.width, it.height);
        r.setFillStyle(Phaser.Display.Color.HexStringToColor(it.color).color, 1);
        if (it.stroke && it.strokeWidth) r.setStrokeStyle(it.strokeWidth, Phaser.Display.Color.HexStringToColor(it.stroke).color, 1);
        else r.isStroked = false;
      }
      else if (it.kind === 'text') {
        const t = o as Phaser.GameObjects.Text;
        t.setFontSize(it.fontSize);
        t.setColor(it.color);
        // A button's words are centred on it; a label's top-left is its position. Wrapped at `wrap` pixels when given.
        t.setOrigin(it.center ? 0.5 : 0, it.center ? 0.5 : 0);
        if (it.visible === undefined) {
          if ((t.style.wordWrapWidth ?? 0) !== (it.wrap ?? 0)) t.setWordWrapWidth(it.wrap || null);
          if (t.text !== it.text) t.setText(it.text);
        } else {
          // Typewriter: wrap the whole text first, then show its first `visible` letters on those same lines.
          t.setWordWrapWidth(it.wrap || null);
          const lines = it.wrap ? t.getWrappedText(it.text) : it.text.split('\n');
          let left = it.visible;
          const shown = lines.map((l) => { const part = l.slice(0, Math.max(0, left)); left -= l.length; return part; });
          t.setWordWrapWidth(null);
          const text = shown.join('\n');
          if (t.text !== text) t.setText(text);
        }
      }
    }
    for (const [id, rec] of this.objects) if (!seen.has(id)) { this.drop(rec); this.objects.delete(id); }
  }

  private drop(rec: Rec | undefined): void {
    if (!rec) return;
    rec.obj.destroy();
    rec.map?.destroy();
  }

  /** A Phaser tilemap holding a tile layer's cells. */
  private tiles(it: Extract<DrawItem, { kind: 'tiles' }>, version: string): Rec {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < it.cells.length; i += 3) { x0 = Math.min(x0, it.cells[i]); x1 = Math.max(x1, it.cells[i]); y0 = Math.min(y0, it.cells[i + 1]); y1 = Math.max(y1, it.cells[i + 1]); }
    const map = this.scene.make.tilemap({ tileWidth: it.tileWidth, tileHeight: it.tileHeight, width: x1 - x0 + 1, height: y1 - y0 + 1 });
    const key = this.scene.textures.exists(it.texture) ? it.texture : '__MISSING';
    const set = map.addTilesetImage(key, key, it.tileWidth, it.tileHeight, it.margin, it.spacing, 0)!;
    const layer = map.createBlankLayer('tiles', set, 0, 0)!;
    for (let i = 0; i < it.cells.length; i += 3) {
      const tile = layer.putTileAt(tileId(it.cells[i + 2]), it.cells[i] - x0, it.cells[i + 1] - y0);
      // A tile flipped or turned in Tiled.
      const flags = tileFlags(it.cells[i + 2]);
      if (flags && tile) { const tf = tileTransform(flags); tile.rotation = tf.rotation; tile.flipX = tf.flipX; }
    }
    return { obj: layer, kind: 'tiles', screen: it.screen, map, version, offset: { x: x0 * it.tileWidth, y: y0 * it.tileHeight } };
  }
}
