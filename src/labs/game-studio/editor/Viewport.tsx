// The 2D viewport: the scene as saved, drawn from the model (ADR 2). It is not a
// running game; it draws what placeNodes() says, which is where the engine will put
// everything.
//
//   left-drag on a node      move it (snapped to the grid if Snap is on); one undo step
//   left-click               select (Shift adds)
//   middle- or right-drag,   pan
//   or Space + drag
//   wheel                    zoom about the pointer
//   drop an image            a new Sprite2D there

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Store } from './store';
import { C, useStore } from './kit';
import { placeNodes, spriteLook, type PlacedNode } from '../core/sceneView';
import { findNode } from '../core/project';
import { apply, invert, multiply, type Mat2D } from '../core/math2d';
import { propValue } from '../core/registry';
import type { Vec2 } from '../core/types';
import { widgetParts, WIDGET_TYPES } from '../core/widgets';
import { bucketEdits, rectEdits, solidRects, tileFlags, tileId, tileRect, tileTransform, usedRect, type CellEdit } from '../core/tiles';

interface Camera { x: number; y: number; zoom: number }
export const ASSET_DRAG = 'application/x-game-studio-asset';
/** Dragged from the starter art: "path url". */
export const STARTER_DRAG = 'application/x-game-studio-starter';

const measure = document.createElement('canvas').getContext('2d')!;

/** A picture multiplied by a colour (a sprite's modulate), as the game tints it; made once per picture and colour. */
const tinted = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>();
function tintedImage(img: HTMLImageElement, colour: string): CanvasImageSource {
  if (!colour || colour.toLowerCase() === '#ffffff') return img;
  let byColour = tinted.get(img);
  if (!byColour) tinted.set(img, (byColour = new Map()));
  let c = byColour.get(colour);
  if (!c) {
    c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d')!;
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = colour; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(img, 0, 0);   // keep the picture's own transparency
    byColour.set(colour, c);
  }
  return c;
}
const labelFont = (size: number) => `${size}px system-ui, sans-serif`;

/** Text broken into lines no wider than `wrap` pixels (0: only at line breaks), as the game wraps it. */
function wrapLines(text: string, wrap: number): string[] {
  if (!wrap) return text.split('\n');
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && measure.measureText(next).width > wrap) { out.push(line); line = word; } else line = next;
    }
    out.push(line);
  }
  return out;
}

/** The rectangle a node is drawn in, in its own coordinates: a sprite's image (centred), a label's text (from its top-left). */
function localBox(store: Store, p: PlacedNode): { x: number; y: number; w: number; h: number } | null {
  const look = spriteLook(p.node);
  if (look) {
    const img = store.imageFor(look.texture);
    const w = img ? img.naturalWidth : 32, h = img ? img.naturalHeight : 32;
    return { x: -w / 2, y: -h / 2, w, h };
  }
  if (p.node.type === 'TileMapLayer') {
    // The painted cells' rectangle, so a click on the tiles selects the layer and Frame all includes them.
    const info = store.tilesetInfo(propValue('TileMapLayer', p.node.props, 'tileset') as string | null), r = usedRect(propValue('TileMapLayer', p.node.props, 'cells') as number[]);
    if (!info || !r) return null;
    const tw = info.data.tileWidth, th = info.data.tileHeight;
    return { x: r.x0 * tw, y: r.y0 * th, w: (r.x1 - r.x0 + 1) * tw, h: (r.y1 - r.y0 + 1) * th };
  }
  if (p.node.type === 'CollisionShape2D') {
    const sz = propValue('CollisionShape2D', p.node.props, 'size') as Vec2;
    const w = sz.x, h = propValue('CollisionShape2D', p.node.props, 'shape') === 'circle' ? sz.x : sz.y;
    return { x: -w / 2, y: -h / 2, w, h };
  }
  if (p.node.type === 'Label') {
    const size = propValue('Label', p.node.props, 'fontSize') as number, wrap = propValue('Label', p.node.props, 'wrapWidth') as number;
    measure.font = labelFont(size);
    const lines = wrapLines(String(propValue('Label', p.node.props, 'text')), wrap);
    return { x: 0, y: 0, w: wrap || Math.max(8, ...lines.map((l) => measure.measureText(l).width)), h: size * 1.2 * lines.length };
  }
  if (WIDGET_TYPES.has(p.node.type)) {
    const sz = propValue(p.node.type, p.node.props, 'size') as Vec2;
    return { x: 0, y: 0, w: sz.x, h: sz.y };
  }
  return null;
}

export function Viewport({ store, onFrameRef }: { store: Store; onFrameRef?: (fns: { frameAll: () => void; frameSelected: () => void; frameGameArea: () => void }) => void }) {
  useStore(store);
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const cam = useRef<Camera>({ x: 480, y: 270, zoom: 1 });
  const [mouse, setMouse] = useState<Vec2 | null>(null);
  const space = useRef(false);
  /** Painting: the cell under the pointer, and the stroke being made (where it started, and the last cell, so a fast drag leaves no gaps). */
  const hoverCell = useRef<{ x: number; y: number } | null>(null);
  const tileDrag = useRef<{ start: { x: number; y: number }; last: { x: number; y: number } } | null>(null);
  const drag = useRef<{ kind: 'pan' | 'move'; sx: number; sy: number; cx: number; cy: number; id?: string; grab?: Vec2; start?: Vec2; parentInv?: Mat2D; moved?: boolean; origin?: Vec2; startRot?: number; startScale?: Vec2 } | null>(null);

  /** Screen (CSS pixels in the canvas) ↔ world. */
  const view = useCallback((): Mat2D => {
    const el = canvas.current!, c = cam.current;
    return [c.zoom, 0, 0, c.zoom, el.clientWidth / 2 - c.x * c.zoom, el.clientHeight / 2 - c.y * c.zoom];
  }, []);
  const toWorld = useCallback((sx: number, sy: number): Vec2 => apply(invert(view()), { x: sx, y: sy }), [view]);

  const draw = useCallback(() => {
    const el = canvas.current, s = store.viewScene, p = store.project;
    if (!el || !p) return;
    const dpr = window.devicePixelRatio || 1, W = el.clientWidth, H = el.clientHeight;
    if (el.width !== Math.round(W * dpr) || el.height !== Math.round(H * dpr)) { el.width = Math.round(W * dpr); el.height = Math.round(H * dpr); }
    const g = el.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
    const v = view(), z = cam.current.zoom;
    const set = (m: Mat2D) => { const t = multiply(v, m); g.setTransform(dpr * t[0], dpr * t[1], dpr * t[2], dpr * t[3], dpr * t[4], dpr * t[5]); };
    // The game area, then the grid over it.
    set([1, 0, 0, 1, 0, 0]);
    g.fillStyle = p.settings.background; g.fillRect(0, 0, p.settings.width, p.settings.height);
    const step = store.grid;
    if (step * z >= 6) {
      const tl = toWorld(0, 0), br = toWorld(W, H);
      g.beginPath();
      for (let x = Math.floor(tl.x / step) * step; x <= br.x; x += step) { g.moveTo(x, tl.y); g.lineTo(x, br.y); }
      for (let y = Math.floor(tl.y / step) * step; y <= br.y; y += step) { g.moveTo(tl.x, y); g.lineTo(br.x, y); }
      g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 1 / z; g.stroke();
    }
    g.strokeStyle = 'rgba(90,169,255,0.7)'; g.lineWidth = 1.5 / z; g.strokeRect(0, 0, p.settings.width, p.settings.height);
    if (!s) return;
    const placed = placeNodes(s), sel = new Set(store.selection);
    // Sprites, in the engine's drawing order.
    for (const pn of [...placed].sort((a, b) => a.depth - b.depth)) {
      if (pn.node.type === 'TileMapLayer') {
        // Each cell's tile, cut from the tileset's image, at its place in the layer.
        const info = store.tilesetInfo(propValue('TileMapLayer', pn.node.props, 'tileset') as string | null);
        const cells = propValue('TileMapLayer', pn.node.props, 'cells') as number[];
        if (!pn.visible || !info || !cells.length) continue;
        const img = store.imageFor(info.data.image), tw = info.data.tileWidth, th = info.data.tileHeight;
        set(pn.world);
        g.imageSmoothingEnabled = p.settings.pixelArt === false;
        for (let i = 0; i < cells.length; i += 3) {
          const id = tileId(cells[i + 2]), flags = tileFlags(cells[i + 2]), r = tileRect(info.data, info.columns, id);
          if (img && id < info.count && !flags) g.drawImage(img, r.x, r.y, r.w, r.h, cells[i] * tw, cells[i + 1] * th, tw, th);
          else if (img && id < info.count) {
            // Flipped or turned (from Tiled): about the cell's centre, as the game does.
            const tf = tileTransform(flags), cx = cells[i] * tw + tw / 2, cy = cells[i + 1] * th + th / 2;
            set(multiply(pn.world, multiply([Math.cos(tf.rotation), Math.sin(tf.rotation), -Math.sin(tf.rotation), Math.cos(tf.rotation), cx, cy], [tf.flipX ? -1 : 1, 0, 0, 1, 0, 0])));
            g.drawImage(img, r.x, r.y, r.w, r.h, -tw / 2, -th / 2, tw, th);
            set(pn.world);
          }
          else { g.strokeStyle = C.bad; g.lineWidth = 1 / z; g.strokeRect(cells[i] * tw, cells[i + 1] * th, tw, th); }
        }
        continue;
      }
      const look = pn.visible ? spriteLook(pn.node) : null;
      if (!look) continue;
      const img = store.imageFor(look.texture), box = localBox(store, pn)!;
      set(multiply(pn.world, [look.flipX ? -1 : 1, 0, 0, look.flipY ? -1 : 1, 0, 0]));
      g.globalAlpha = look.opacity;
      g.imageSmoothingEnabled = p.settings.pixelArt === false;   // pixel art stays crisp when zoomed, as in the game
      if (img) g.drawImage(tintedImage(img, look.modulate), box.x, box.y);
      else { g.setLineDash([4 / z, 3 / z]); g.strokeStyle = C.faint; g.lineWidth = 1 / z; g.strokeRect(-16, -16, 32, 32); g.setLineDash([]); }
      g.globalAlpha = 1;
    }
    // Collision shapes: teal for bodies, green for areas. The game does not draw them; the editor shows them so you can line them up.
    const parents = new Map<string, string>();
    for (const pn of placed) for (const c of pn.node.children) parents.set(c.id, pn.node.type);
    for (const pn of placed) {
      // A tile layer's solid tiles, as the rectangles bodies collide with.
      if (pn.node.type === 'TileMapLayer' && pn.visible) {
        const info = store.tilesetInfo(propValue('TileMapLayer', pn.node.props, 'tileset') as string | null);
        if (!info || !info.data.solid.length) continue;
        set(pn.world);
        g.fillStyle = 'rgba(56,189,248,0.12)'; g.strokeStyle = 'rgba(56,189,248,0.8)'; g.lineWidth = 1.5 / z;
        for (const r of solidRects(propValue('TileMapLayer', pn.node.props, 'cells') as number[], new Set(info.data.solid))) {
          g.fillRect(r.x * info.data.tileWidth, r.y * info.data.tileHeight, r.w * info.data.tileWidth, r.h * info.data.tileHeight);
          g.strokeRect(r.x * info.data.tileWidth, r.y * info.data.tileHeight, r.w * info.data.tileWidth, r.h * info.data.tileHeight);
        }
        continue;
      }
      if (pn.node.type !== 'CollisionShape2D' || !pn.visible) continue;
      const box = localBox(store, pn)!, area = parents.get(pn.node.id) === 'Area2D';
      const circle = propValue('CollisionShape2D', pn.node.props, 'shape') === 'circle';
      set(pn.world);
      g.fillStyle = area ? 'rgba(110,231,183,0.18)' : 'rgba(56,189,248,0.2)';
      g.strokeStyle = area ? 'rgba(110,231,183,0.9)' : 'rgba(56,189,248,0.9)';
      g.lineWidth = 1.5 / z;
      g.beginPath();
      if (circle) g.arc(0, 0, box.w / 2, 0, Math.PI * 2); else g.rect(box.x, box.y, box.w, box.h);
      g.fill(); g.stroke();
    }
    // Widgets (panels, buttons, bars) at rest, as the game draws them (core/widgets.ts).
    for (const pn of placed) {
      if (!pn.visible || !WIDGET_TYPES.has(pn.node.type)) continue;
      set(pn.world);
      for (const part of widgetParts(pn.node.type, (k) => propValue(pn.node.type, pn.node.props, k)) ?? []) {
        if (part.kind === 'rect') {
          g.fillStyle = part.color; g.fillRect(part.x, part.y, part.w, part.h);
          if (part.stroke && part.strokeWidth) { g.strokeStyle = part.stroke; g.lineWidth = part.strokeWidth; g.strokeRect(part.x + part.strokeWidth / 2, part.y + part.strokeWidth / 2, part.w - part.strokeWidth, part.h - part.strokeWidth); }
        } else {
          g.font = labelFont(part.fontSize); g.fillStyle = part.color;
          g.textAlign = part.center ? 'center' : 'left'; g.textBaseline = part.center ? 'middle' : 'top';
          g.fillText(part.text, part.x, part.y);
          g.textAlign = 'left';
        }
      }
    }
    // Labels, over the sprites of their layer.
    for (const pn of placed) {
      if (!pn.visible || pn.node.type !== 'Label') continue;
      set(pn.world);
      const size = propValue('Label', pn.node.props, 'fontSize') as number;
      g.font = labelFont(size);
      g.fillStyle = propValue('Label', pn.node.props, 'color') as string;
      g.textBaseline = 'top';
      measure.font = g.font;
      let left = propValue('Label', pn.node.props, 'visibleCharacters') as number;   // −1: all of it
      wrapLines(String(propValue('Label', pn.node.props, 'text')), propValue('Label', pn.node.props, 'wrapWidth') as number).forEach((line, i) => {
        g.fillText(left < 0 ? line : line.slice(0, left), 0, i * size * 1.2);
        if (left >= 0) left = Math.max(0, left - line.length);
      });
    }
    // Each camera's frame: what it will show (the game's size, divided by its zoom), centred on it.
    for (const pn of placed) {
      if (pn.node.type !== 'Camera2D') continue;
      const zoom = propValue('Camera2D', pn.node.props, 'zoom') as number, on = propValue('Camera2D', pn.node.props, 'current') as boolean;
      const cw = p.settings.width / zoom, ch = p.settings.height / zoom;
      set([1, 0, 0, 1, pn.world[4], pn.world[5]]);
      g.setLineDash([8 / z, 5 / z]); g.strokeStyle = on ? 'rgba(192,132,252,0.9)' : 'rgba(192,132,252,0.35)'; g.lineWidth = 1.5 / z;
      g.strokeRect(-cw / 2, -ch / 2, cw, ch); g.setLineDash([]);
      // Its limits, when set: the camera never shows anything outside them.
      const tl = propValue('Camera2D', pn.node.props, 'limitTopLeft') as Vec2, br = propValue('Camera2D', pn.node.props, 'limitBottomRight') as Vec2;
      if (Math.abs(tl.x) < 1e6 || Math.abs(br.x) < 1e6 || Math.abs(tl.y) < 1e6 || Math.abs(br.y) < 1e6) {
        const cl = (v: number) => Math.max(-1e5, Math.min(1e5, v));
        set([1, 0, 0, 1, 0, 0]);
        g.setLineDash([2 / z, 4 / z]); g.strokeStyle = 'rgba(192,132,252,0.7)'; g.lineWidth = 1 / z;
        g.strokeRect(cl(tl.x), cl(tl.y), cl(br.x) - cl(tl.x), cl(br.y) - cl(tl.y)); g.setLineDash([]);
      }
    }
    // Markers for 2D nodes without a picture, and the selection.
    for (const pn of placed) {
      if (!pn.is2D) continue;
      const o = apply(multiply(v, pn.world), { x: 0, y: 0 });
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const isSel = sel.has(pn.node.id);
      if (!spriteLook(pn.node) && pn.node.id !== s.root.id) {
        g.strokeStyle = isSel ? C.warm : pn.node.type === 'CharacterBody2D' ? '#8bd450' : C.dim; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(o.x - 7, o.y); g.lineTo(o.x + 7, o.y); g.moveTo(o.x, o.y - 7); g.lineTo(o.x, o.y + 7); g.stroke();
        if (pn.node.type === 'CharacterBody2D') { g.beginPath(); g.arc(o.x, o.y, 5, 0, Math.PI * 2); g.stroke(); }
      }
      if (isSel) {
        const box = localBox(store, pn);
        if (box) {
          const m = multiply(v, pn.world), pts = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([a, b]) => apply(m, { x: box.x + a * box.w, y: box.y + b * box.h }));
          g.strokeStyle = C.warm; g.lineWidth = 1.5; g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.closePath(); g.stroke();
        }
        g.fillStyle = C.warm; g.beginPath(); g.arc(o.x, o.y, 3, 0, Math.PI * 2); g.fill();
        // The tool: a ring for rotate, corner squares for scale.
        if (store.tool === 'rotate') { g.strokeStyle = 'rgba(255,159,28,0.6)'; g.lineWidth = 1.5; g.beginPath(); g.arc(o.x, o.y, 28, 0, Math.PI * 2); g.stroke(); }
        if (store.tool === 'scale' && box) {
          const m = multiply(v, pn.world);
          for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 1]]) { const q = apply(m, { x: box.x + a * box.w, y: box.y + b * box.h }); g.fillStyle = C.warm; g.fillRect(q.x - 3, q.y - 3, 6, 6); }
        }
      }
    }
    // Painting a tile layer: its cell grid over the view, and the cell under the pointer.
    const layer = store.tileLayer, lp = layer && placed.find((x) => x.node.id === layer.id);
    const info = layer && store.tilesetInfo(propValue('TileMapLayer', layer.props, 'tileset') as string | null);
    if (lp && info) {
      const tw = info.data.tileWidth, th = info.data.tileHeight, inv = invert(lp.world);
      const corners = [toWorld(0, 0), toWorld(W, 0), toWorld(0, H), toWorld(W, H)].map((q) => apply(inv, q));
      const x0 = Math.floor(Math.min(...corners.map((q) => q.x)) / tw), x1 = Math.ceil(Math.max(...corners.map((q) => q.x)) / tw);
      const y0 = Math.floor(Math.min(...corners.map((q) => q.y)) / th), y1 = Math.ceil(Math.max(...corners.map((q) => q.y)) / th);
      set(lp.world);
      if (tw * z >= 4 && (x1 - x0) * (y1 - y0) < 200000) {
        g.beginPath();
        for (let x = x0; x <= x1; x++) { g.moveTo(x * tw, y0 * th); g.lineTo(x * tw, y1 * th); }
        for (let y = y0; y <= y1; y++) { g.moveTo(x0 * tw, y * th); g.lineTo(x1 * tw, y * th); }
        g.strokeStyle = 'rgba(255,159,28,0.18)'; g.lineWidth = 1 / z; g.stroke();
      }
      const h = hoverCell.current;
      if (h) { g.strokeStyle = store.tile.tool === 'erase' ? C.bad : C.warm; g.lineWidth = 2 / z; g.strokeRect(h.x * tw, h.y * th, tw, th); }
    }
  }, [store, view, toWorld]);

  // Redraw on every change, and when images finish loading.
  useEffect(() => { const id = requestAnimationFrame(draw); return () => cancelAnimationFrame(id); });
  useEffect(() => {
    const ro = new ResizeObserver(() => draw());
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [draw]);

  const frameRect = useCallback((x0: number, y0: number, x1: number, y1: number) => {
    const el = canvas.current; if (!el) return;
    const w = Math.max(x1 - x0, 32), h = Math.max(y1 - y0, 32);
    cam.current = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, zoom: Math.min(8, Math.max(0.05, Math.min(el.clientWidth / w, el.clientHeight / h) * 0.85)) };
    draw();
  }, [draw]);
  const frameGameArea = useCallback(() => { const p = store.project; if (p) frameRect(0, 0, p.settings.width, p.settings.height); }, [store, frameRect]);
  /** Fit everything drawn in the world (not the HUD); with nothing yet, the game area. */
  const frameAll = useCallback(() => {
    const s = store.expanded; if (!s) return frameGameArea();
    const pts: Vec2[] = [];
    for (const pn of placeNodes(s)) {
      if (pn.screen || !pn.visible) continue;
      const box = localBox(store, pn);
      if (box) for (const [a, b] of [[0, 0], [1, 1], [1, 0], [0, 1]]) pts.push(apply(pn.world, { x: box.x + a * box.w, y: box.y + b * box.h }));
    }
    if (!pts.length) return frameGameArea();
    frameRect(Math.min(...pts.map((q) => q.x)), Math.min(...pts.map((q) => q.y)), Math.max(...pts.map((q) => q.x)), Math.max(...pts.map((q) => q.y)));
  }, [store, frameRect, frameGameArea]);
  const frameSelected = useCallback(() => {
    const s = store.expanded; if (!s || !store.selection.length) return frameAll();
    const pts: Vec2[] = [];
    for (const pn of placeNodes(s)) if (store.selection.includes(pn.node.id)) {
      const box = localBox(store, pn) ?? { x: -32, y: -32, w: 64, h: 64 };
      for (const [a, b] of [[0, 0], [1, 1], [1, 0], [0, 1]]) pts.push(apply(pn.world, { x: box.x + a * box.w, y: box.y + b * box.h }));
    }
    frameRect(Math.min(...pts.map((q) => q.x)), Math.min(...pts.map((q) => q.y)), Math.max(...pts.map((q) => q.x)), Math.max(...pts.map((q) => q.y)));
  }, [store, frameRect, frameAll]);
  useEffect(() => { onFrameRef?.({ frameAll, frameSelected, frameGameArea }); }, [onFrameRef, frameAll, frameSelected, frameGameArea]);
  const projectKey = store.projectId;
  const sceneKey = store.sceneId;
  // A newly opened project or scene is framed to fit what is in it.
  useEffect(() => { requestAnimationFrame(frameAll); }, [projectKey, sceneKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /** The topmost node under a screen point: sprites by their image box, other 2D nodes by their marker. */
  const hit = (sx: number, sy: number): string | null => {
    const s = store.viewScene; if (!s) return null;
    const placed = placeNodes(s).filter((p) => p.is2D && p.visible && p.node.id !== s.root.id).sort((a, b) => b.depth - a.depth);
    const v = view();
    for (const pn of placed) {
      const box = localBox(store, pn);
      if (box) {
        let q: Vec2; try { q = apply(invert(multiply(v, pn.world)), { x: sx, y: sy }); } catch { continue; }
        if (q.x >= box.x && q.x <= box.x + box.w && q.y >= box.y && q.y <= box.y + box.h) return pn.node.id;
      } else {
        const o = apply(multiply(v, pn.world), { x: 0, y: 0 });
        if (Math.hypot(o.x - sx, o.y - sy) <= 9) return pn.node.id;
      }
    }
    return null;
  };

  // ── painting a tile layer ──────────────────────────────────────────────
  /** The cell of the layer being painted under a point on the canvas. */
  const cellAt = (sx: number, sy: number): { x: number; y: number } | null => {
    const layer = store.tileLayer, s = store.expanded;
    const info = layer && store.tilesetInfo(propValue('TileMapLayer', layer.props, 'tileset') as string | null);
    if (!layer || !s || !info) return null;
    const pn = placeNodes(s).find((x) => x.node.id === layer.id)!;
    const q = apply(invert(pn.world), toWorld(sx, sy));
    return { x: Math.floor(q.x / info.data.tileWidth), y: Math.floor(q.y / info.data.tileHeight) };
  };
  /** The cells on a line from a to b (Bresenham's line), so a quick drag paints every cell it crosses. */
  const line = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const out: { x: number; y: number }[] = [];
    let x = a.x, y = a.y, err = Math.abs(b.x - a.x) - Math.abs(b.y - a.y);
    const dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y), sxn = Math.sign(b.x - a.x), syn = Math.sign(b.y - a.y);
    for (;;) { out.push({ x, y }); if (x === b.x && y === b.y) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sxn; } if (e2 < dx) { err += dx; y += syn; } }
    return out;
  };
  const tileDown = (sx: number, sy: number, pick: boolean) => {
    const layer = store.tileLayer!, c = cellAt(sx, sy);
    if (!c) { store.say('Choose a tileset for this layer in the TileMap panel first'); return; }
    const cells = propValue('TileMapLayer', layer.props, 'cells') as number[];
    const tool = pick ? 'pick' : store.tile.tool;
    if (tool === 'pick') {
      // Pick the tile under the pointer, and go back to painting with it.
      const at = cells.findIndex((_, i) => i % 3 === 0 && cells[i] === c.x && cells[i + 1] === c.y);
      if (at >= 0) { store.tile = { ...store.tile, tileId: cells[at + 2], tool: 'paint' }; store.changed(); }
      return;
    }
    if (tool === 'bucket') {
      // Fill the joined area; an open area stops at the painted area or the game area, whichever is bigger, plus a margin.
      const info = store.tilesetInfo(propValue('TileMapLayer', layer.props, 'tileset') as string)!, p = store.project!;
      const u = usedRect(cells), gw = Math.ceil(p.settings.width / info.data.tileWidth), gh = Math.ceil(p.settings.height / info.data.tileHeight);
      const b = { x0: Math.min(u?.x0 ?? 0, 0) - 2, y0: Math.min(u?.y0 ?? 0, 0) - 2, x1: Math.max(u?.x1 ?? 0, gw) + 2, y1: Math.max(u?.y1 ?? 0, gh) + 2 };
      store.tileStroke = { layerId: layer.id, edits: bucketEdits(cells, c.x, c.y, store.tile.tileId, b) };
      store.commitStroke('Bucket fill');
      return;
    }
    tileDrag.current = { start: c, last: c };
    store.tileStroke = { layerId: layer.id, edits: tool === 'rect' ? rectEdits(c.x, c.y, c.x, c.y, store.tile.tileId) : [[c.x, c.y, tool === 'erase' ? -1 : store.tile.tileId]] };
    store.changed();
  };
  const tileMove = (sx: number, sy: number) => {
    const c = cellAt(sx, sy), t = tileDrag.current, st = store.tileStroke;
    hoverCell.current = c;
    if (!c || !t || !st) { draw(); return; }
    if (c.x === t.last.x && c.y === t.last.y) return;
    if (store.tile.tool === 'rect') st.edits = rectEdits(t.start.x, t.start.y, c.x, c.y, store.tile.tileId);
    else { const tile = store.tile.tool === 'erase' ? -1 : store.tile.tileId; st.edits = [...st.edits, ...line(t.last, c).map((q): CellEdit => [q.x, q.y, tile])]; }
    t.last = c;
    store.changed();
  };

  const onDown = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    (e.target as Element).setPointerCapture(e.pointerId);
    if (e.button === 1 || e.button === 2 || space.current) { drag.current = { kind: 'pan', sx, sy, cx: cam.current.x, cy: cam.current.y }; return; }
    if (store.tileLayer) { tileDown(sx, sy, e.altKey); return; }   // Alt-click picks the tile under the pointer
    const s = store.expanded;
    let id = hit(sx, sy);
    // Rotate and scale work on the selection wherever you press (not on another node), so a small node need not be grabbed exactly.
    if (!id && store.tool !== 'move' && store.selected && s && store.selected.id !== s.root.id) id = store.selected.id;
    if (!id || !s) { if (!e.shiftKey) store.select([]); return; }
    if (id !== store.selected?.id) store.select(e.shiftKey ? [...store.selection.filter((x) => x !== id), id] : [id]);
    const pn = placeNodes(store.viewScene ?? s).find((p) => p.node.id === id)!;   // where it is shown: its animated value while the Animation panel previews
    const start = propValue(pn.node.type, pn.node.props, 'position') as Vec2;
    drag.current = {
      kind: 'move', sx, sy, cx: 0, cy: 0, id, start, grab: toWorld(sx, sy), parentInv: invert(pn.parentWorld),
      origin: { x: pn.world[4], y: pn.world[5] }, startRot: propValue(pn.node.type, pn.node.props, 'rotation') as number, startScale: propValue(pn.node.type, pn.node.props, 'scale') as Vec2,
    };
  };

  const onMove = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    setMouse(toWorld(sx, sy));
    if (store.tileLayer && !drag.current) { tileMove(sx, sy); return; }
    const d = drag.current; if (!d) return;
    if (d.kind === 'pan') { cam.current = { ...cam.current, x: d.cx - (sx - d.sx) / cam.current.zoom, y: d.cy - (sy - d.sy) / cam.current.zoom }; draw(); return; }
    // A click that wobbles a pixel is still a click: moving starts after 3 pixels.
    if (!d.moved && Math.hypot(sx - d.sx, sy - d.sy) < 3) return;
    d.moved = true;
    const w = toWorld(sx, sy);
    if (store.tool === 'rotate') {
      // Turn by the angle the pointer has swept round the node's origin (15° steps with Snap).
      const o = d.origin!, a0 = Math.atan2(d.grab!.y - o.y, d.grab!.x - o.x), a1 = Math.atan2(w.y - o.y, w.x - o.x);
      let r = d.startRot! + (a1 - a0);
      if (store.snap) r = Math.round(r / (Math.PI / 12)) * (Math.PI / 12);
      store.liveEdit(d.id!, 'rotation', +r.toFixed(6));
      return;
    }
    if (store.tool === 'scale') {
      // Scale by how much farther from the origin the pointer is than where it started (0.1 steps with Snap).
      const o = d.origin!, r0 = Math.hypot(d.grab!.x - o.x, d.grab!.y - o.y) || 1, k = Math.hypot(w.x - o.x, w.y - o.y) / r0;
      const snapK = (v: number) => (store.snap ? Math.round(v * 10) / 10 : +v.toFixed(3));
      store.liveEdit(d.id!, 'scale', { x: snapK(d.startScale!.x * k), y: snapK(d.startScale!.y * k) });
      return;
    }
    // Move: the pointer's movement in the world, turned into the parent's coordinates, added to the start position.
    const a = apply(d.parentInv!, w), b = apply(d.parentInv!, d.grab!);
    let pos = { x: d.start!.x + a.x - b.x, y: d.start!.y + a.y - b.y };
    if (store.snap) pos = { x: Math.round(pos.x / store.grid) * store.grid, y: Math.round(pos.y / store.grid) * store.grid };
    store.liveEdit(d.id!, 'position', pos);
  };

  const onUp = () => {
    if (tileDrag.current) { tileDrag.current = null; store.commitStroke(store.tile.tool === 'erase' ? 'Erase tiles' : store.tile.tool === 'rect' ? 'Fill a rectangle' : 'Paint tiles'); return; }
    const d = drag.current; drag.current = null;
    if (d?.kind === 'move' && store.doc && store.sceneId) {
      const n = store.expanded && findNode(store.expanded, d.id!);   // a node inside an instance too
      const [verb, prop] = store.tool === 'rotate' ? ['Rotate', 'rotation'] : store.tool === 'scale' ? ['Scale', 'scale'] : ['Move', 'position'];
      store.endLiveEdit(`${verb} ${n?.name}`, d.id!, prop);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    const r = canvas.current!.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    const before = toWorld(sx, sy);
    const zoom = Math.min(16, Math.max(0.05, cam.current.zoom * Math.exp(-e.deltaY * 0.0015)));
    cam.current.zoom = zoom;
    const after = toWorld(sx, sy);
    cam.current = { ...cam.current, x: cam.current.x + before.x - after.x, y: cam.current.y + before.y - after.y };
    draw();
  };

  const onDrop = async (e: React.DragEvent) => {
    const s = store.scene; if (!s) return;
    let path = e.dataTransfer.getData(ASSET_DRAG);
    const starter = e.dataTransfer.getData(STARTER_DRAG);
    if (!path && !starter) return;
    e.preventDefault();
    // Where it was dropped, worked out now: the event is not valid after the import below.
    const r = canvas.current!.getBoundingClientRect();
    let w = toWorld(e.clientX - r.left, e.clientY - r.top);
    if (store.snap) w = { x: Math.round(w.x / store.grid) * store.grid, y: Math.round(w.y / store.grid) * store.grid };
    if (starter) {
      // From the starter art: add the image to the project (once), then make the sprite.
      const [p, url] = starter.split(' ');
      const added = await store.importStarter(p, url);
      if (!added) return;
      path = added;
    }
    const name = path.split('/').pop()!.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9]+(.)?/g, (_m, c: string | undefined) => (c ? c.toUpperCase() : '')).replace(/^./, (c) => c.toUpperCase()) || 'Sprite';
    store.addNode('Sprite2D', { parentId: s.root.id, name, props: { position: w, texture: path } });
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.code === 'Space' && !(e.target as HTMLElement).closest('input, textarea, .monaco-editor')) space.current = true; };
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') space.current = false; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  return (
    <div ref={wrap} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <canvas ref={canvas} data-testid="viewport" style={{ width: '100%', height: '100%', display: 'block', cursor: drag.current?.kind === 'pan' ? 'grabbing' : 'default' }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={() => setMouse(null)} onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()} onDragOver={(e) => { if (e.dataTransfer.types.includes(ASSET_DRAG) || e.dataTransfer.types.includes(STARTER_DRAG)) e.preventDefault(); }} onDrop={(e) => void onDrop(e)} />
      {!store.scene && store.project && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: C.dim, fontSize: 13, pointerEvents: 'none' }}>
          This project has no scene yet. Scene › New scene makes one.
        </div>
      )}
      <div style={{ position: 'absolute', left: 8, bottom: 6, color: C.faint, fontFamily: C.mono, fontSize: 11, pointerEvents: 'none' }}>
        {mouse ? `x ${Math.round(mouse.x)}  y ${Math.round(mouse.y)}` : ''}{`   zoom ${Math.round(cam.current.zoom * 100)}%`}
      </div>
    </div>
  );
}
