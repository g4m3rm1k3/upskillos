// The node classes a script extends (ADR 4):
//
//   export default class Player extends CharacterBody2D {
//     ready() { … }
//     update(dt) { … }
//     physicsUpdate(dt) { this.moveAndSlide(); }
//   }
//
// Every property here is also in the registry (core/registry.ts); the saved scene
// sets them after the constructor runs, so a script's own fields (speed = 200) are
// kept and the scene's values win for registered properties.

import { astar } from './pathfind';
import { apply as applyMat, invert } from '../core/math2d';
import { rng as seeded } from './random';
const mathRng = (seed: number) => { const r = seeded(seed); return () => r.next(); };
import { Vec2 } from './vec2';
import { IDENTITY, local, multiply, apply, type Mat2D } from '../core/math2d';
import type { Game } from './game';
import type { WorldShape } from './physics';
import type { AnimationClip, TilesetData } from '../core/types';
import { cellList, cellMap, solidRects, tileId } from '../core/tiles';
import { blendOf, clipTime, sampleTrack } from '../core/animation';
import { propDef } from '../core/registry';

export class Node {
  name = 'Node';
  /** Set by the engine. */
  _game: Game | null = null;
  _parent: Node | null = null;
  _children: Node[] = [];
  /** Set when a lifecycle method throws: the node stops being updated. */
  _broken = false;
  _freed = false;
  /** The project path of this node's script, for error messages. */
  _script: string | null = null;

  get parent(): Node | null { return this._parent; }
  get children(): Node[] { return [...this._children]; }

  /** The node's path from the scene root: "Player/Sprite". */
  get path(): string {
    const names: string[] = [];
    for (let n: Node | null = this; n && n._parent; n = n._parent) names.unshift(n.name);
    return names.join('/') || '.';
  }

  /** A node by a path relative to this one: "Sprite", "../Enemy", "Weapon/Muzzle". Throws if there is none. */
  get<T extends Node = Node>(path: string): T {
    let cur: Node | null = this;
    for (const part of path.split('/').filter((p) => p && p !== '.')) {
      cur = part === '..' ? cur._parent : cur._children.find((c) => c.name === part) ?? null;
      if (!cur) throw new Error(`${this.path === '.' ? 'The root' : `"${this.path}"`} has no node at "${path}"`);
    }
    return cur as T;
  }

  /** Like get, but null instead of an error when there is no such node. */
  find<T extends Node = Node>(path: string): T | null {
    try { return this.get<T>(path); } catch { return null; }
  }

  /** Add a child while the game runs (a spawned bullet, say). It gets ready() straight away. */
  addChild(node: Node): Node {
    if (node._parent) throw new Error(`"${node.name}" already has a parent`);
    const taken = new Set(this._children.map((c) => c.name));
    if (taken.has(node.name)) { let i = 2; while (taken.has(`${node.name}${i}`)) i++; node.name = `${node.name}${i}`; }
    node._parent = this;
    this._children.push(node);
    this._game?._attached(node);
    return node;
  }

  /** Remove this node (and its children) at the end of the frame. */
  queueFree(): void { this._game?._queueFree(this); }

  // ── groups (the specification's §42) ──────────────────────────────────
  _groups = new Set<string>();
  /** The groups it is in. */
  get groups(): string[] { return [...this._groups]; }
  addToGroup(group: string): void { this._groups.add(group); }
  removeFromGroup(group: string): void { this._groups.delete(group); }
  isInGroup(group: string): boolean { return this._groups.has(group); }

  // ── signals (§43) ──────────────────────────────────────────────────────
  _signals = new Map<string, { target: Node | null; method: string | ((...args: unknown[]) => void) }[]>();

  /**
   * When this node emits `signal`, call `method` on `target` (or call a function). Connecting the
   * same thing twice does nothing more.
   */
  connect(signal: string, target: Node | ((...args: unknown[]) => void), method?: string): void {
    const list = this._signals.get(signal) ?? [];
    const entry = typeof target === 'function' ? { target: null, method: target } : { target, method: method ?? '' };
    if (typeof target !== 'function' && !method) throw new Error(`connect("${signal}", node, method) needs the name of the method to call`);
    if (!list.some((e) => e.target === entry.target && e.method === entry.method)) list.push(entry);
    this._signals.set(signal, list);
  }

  disconnect(signal: string, target: Node | ((...args: unknown[]) => void), method?: string): void {
    const list = this._signals.get(signal);
    if (!list) return;
    this._signals.set(signal, list.filter((e) => !(typeof target === 'function' ? e.method === target : e.target === target && e.method === method)));
  }

  /** Call everything connected to `signal`, with these arguments. A mistake in one is reported against the node it belongs to; the rest still run. */
  emit(signal: string, ...args: unknown[]): void {
    for (const e of [...(this._signals.get(signal) ?? [])]) {
      if (e.target?._freed) continue;
      const run = () => {
        if (typeof e.method === 'function') { e.method(...args); return; }
        const fn = (e.target as unknown as Record<string, unknown>)[e.method];
        if (typeof fn !== 'function') throw new Error(`"${e.target!.path}" has no method "${e.method}" for the ${signal} signal of "${this.path}"`);
        (fn as (...a: unknown[]) => void).apply(e.target, args);
      };
      if (this._game) this._game._deliver(e.target ?? this, `signal ${signal}`, run); else run();
    }
  }

  // Lifecycle (ADR 4). Override these in a script.
  ready(): void {}
  update(_dt: number): void {}
  physicsUpdate(_dt: number): void {}
  destroyed(): void {}
}

export class Node2D extends Node {
  name = 'Node2D';
  private _position = new Vec2();
  private _scale = new Vec2(1, 1);
  /** Radians, clockwise on screen. */
  rotation = 0;
  visible = true;
  zIndex = 0;

  /** Where it is relative to its parent. Assign a new { x, y } or change .x and .y. */
  get position(): Vec2 { return this._position; }
  set position(v: { x: number; y: number }) { this._position = new Vec2(v.x, v.y); }

  get scale(): Vec2 { return this._scale; }
  set scale(v: { x: number; y: number }) { this._scale = new Vec2(v.x, v.y); }

  get rotationDegrees(): number { return (this.rotation * 180) / Math.PI; }
  set rotationDegrees(d: number) { this.rotation = (d * Math.PI) / 180; }

  /** Parent's world transform times this node's local one. */
  get worldTransform(): Mat2D {
    let m = local(this._position, this.rotation, this._scale);
    // Up the tree to the scene root, or to a CanvasLayer: its children are placed on the screen.
    for (let p = this._parent; p && !(p instanceof CanvasLayer); p = p._parent) if (p instanceof Node2D) m = multiply(local(p._position, p.rotation, p._scale), m);
    return m;
  }

  /** Where it is in the world (the scene's coordinates). */
  get globalPosition(): Vec2 {
    const m = this._parent ? parentWorld(this) : IDENTITY;
    return Vec2.from(apply(m, this._position));
  }
  set globalPosition(v: { x: number; y: number }) {
    const m = parentWorld(this);
    const det = m[0] * m[3] - m[1] * m[2];
    const dx = v.x - m[4], dy = v.y - m[5];
    this._position = new Vec2((m[3] * dx - m[2] * dy) / det, (-m[1] * dx + m[0] * dy) / det);
  }
}

function parentWorld(n: Node): Mat2D {
  for (let p = n._parent; p && !(p instanceof CanvasLayer); p = p._parent) if (p instanceof Node2D) return p.worldTransform;
  return IDENTITY;
}

/** Draws its children on the screen, not in the world: a HUD stays put when the camera moves. */
export class CanvasLayer extends Node {
  name = 'CanvasLayer';
  /** Higher layers are drawn over lower ones; every layer is over the world. */
  layer = 1;
}

export class Sprite2D extends Node2D {
  name = 'Sprite2D';
  /** The image's project path, e.g. "assets/player.png". */
  texture: string | null = null;
  flipX = false;
  flipY = false;
  opacity = 1;
  /** A colour the picture is multiplied by: '#ffffff' leaves it as it is. */
  modulate = '#ffffff';
}

/** A tileset as the engine uses it: its data, and how many tiles across and in all its image makes. */
export interface TilesetInfo { data: TilesetData; columns: number; count: number }

/**
 * A grid of tiles from a tileset. Its solid tiles stop bodies: they are merged into rectangles
 * (core/tiles.ts, solidRects) so a body sliding along many tiles cannot catch on their seams.
 * Cells are in cell coordinates from the layer's origin; tile −1 means none.
 */
export class TileMapLayer extends Node2D {
  name = 'TileMapLayer';
  tileset: string | null = null;
  collisionLayer = 1;
  _map = new Map<string, number>();
  /** Bumped by every change, so the renderer knows to redraw and the collision rectangles to be rebuilt. */
  _version = 0;
  private _rects: { version: number; tileset: string | null; rects: { x: number; y: number; w: number; h: number }[] } | null = null;

  /** Every painted cell as [x, y, tile, x, y, tile, …] (the saved form). Setting it replaces them all. */
  get cells(): number[] { return cellList(this._map); }
  set cells(v: number[]) { this._map = cellMap(v); this._version++; }

  _info(): TilesetInfo | null { return this.tileset ? this._game?._tileset(this.tileset) ?? null : null; }

  /** The size of one cell in pixels (from the tileset; 16 × 16 without one). */
  get tileSize(): Vec2 { const t = this._info(); return new Vec2(t?.data.tileWidth ?? 16, t?.data.tileHeight ?? 16); }

  /** The tile at a cell, or −1 for none. (A tile flipped in Tiled is the same tile number.) */
  getCell(x: number, y: number): number { const t = this._map.get(`${Math.floor(x)},${Math.floor(y)}`); return t === undefined ? -1 : tileId(t); }

  /** Put a tile in a cell (−1 erases it). */
  setCell(x: number, y: number, tile: number): void {
    const k = `${Math.floor(x)},${Math.floor(y)}`;
    if (!Number.isInteger(tile)) throw new Error(`setCell needs a whole tile number (or −1 to erase), not ${tile}`);
    const t = this._info();
    if (t && tile >= t.count) throw new Error(`"${this.path}": its tileset has ${t.count} tiles (0 to ${t.count - 1}), so there is no tile ${tile}`);
    if (tile < 0) this._map.delete(k); else this._map.set(k, tile);
    this._version++;
  }

  eraseCell(x: number, y: number): void { this.setCell(x, y, -1); }

  /** Every painted cell, as cell coordinates. */
  getUsedCells(): Vec2[] { return [...this._map.keys()].map((k) => { const [x, y] = k.split(',').map(Number); return new Vec2(x, y); }); }

  /** The cell a point in the layer's own coordinates falls in. */
  localToMap(p: { x: number; y: number }): Vec2 { const s = this.tileSize; return new Vec2(Math.floor(p.x / s.x), Math.floor(p.y / s.y)); }

  /** The centre of a cell, in the layer's own coordinates. */
  mapToLocal(cell: { x: number; y: number }): Vec2 { const s = this.tileSize; return new Vec2((Math.floor(cell.x) + 0.5) * s.x, (Math.floor(cell.y) + 0.5) * s.y); }

  /** Whether the tile in a cell is one its tileset marks solid. */
  isCellSolid(x: number, y: number): boolean { const t = this.getCell(x, y), info = this._info(); return t >= 0 && !!info && info.data.solid.includes(t); }

  /**
   * The shortest way from one world point to another that avoids this layer's solid tiles (A*, engine/pathfind.ts):
   * world points, one per cell centre, from the cell after the start to the goal's cell. [] if already there, null if
   * there is no way. Searched within the painted cells' rectangle and one cell round it. The layer must not be turned.
   */
  findPath(from: { x: number; y: number }, to: { x: number; y: number }, options: { diagonal?: boolean } = {}): Vec2[] | null {
    const m = this.worldTransform, back = invert(m);
    const cellOf = (p: { x: number; y: number }) => this.localToMap(applyMat(back, p));
    const used = this.getUsedCells();
    const a = cellOf(from), b = cellOf(to);
    const xs = [...used.map((c) => c.x), a.x, b.x], ys = [...used.map((c) => c.y), a.y, b.y];
    const bounds = { x0: Math.min(...xs) - 1, y0: Math.min(...ys) - 1, x1: Math.max(...xs) + 1, y1: Math.max(...ys) + 1 };
    const { path } = astar((x, y) => !this.isCellSolid(x, y), a, b, { bounds, diagonal: !!options.diagonal });
    if (!path) return null;
    return path.slice(1).map((c) => { const p = applyMat(m, this.mapToLocal(c)); return new Vec2(p.x, p.y); });
  }

  /** The solid tiles as world rectangles (axis-aligned, like every shape in Phase 4). */
  shapes(): WorldShape[] {
    const info = this._info();
    if (!info || !info.data.solid.length) return [];
    if (!this._rects || this._rects.version !== this._version || this._rects.tileset !== this.tileset) {
      this._rects = { version: this._version, tileset: this.tileset, rects: solidRects(this.cells, new Set(info.data.solid)) };
    }
    const m = this.worldTransform, sx = Math.hypot(m[0], m[1]), det = m[0] * m[3] - m[1] * m[2], sy = sx === 0 ? 0 : Math.abs(det / sx);
    const tw = info.data.tileWidth, th = info.data.tileHeight;
    return this._rects.rects.map((r) => {
      const c = apply(m, { x: (r.x + r.w / 2) * tw, y: (r.y + r.h / 2) * th });
      return { kind: 'rectangle' as const, x: c.x, y: c.y, hw: (r.w * tw * sx) / 2, hh: (r.h * th * sy) / 2 };
    });
  }
}

/** Changes other nodes' properties over time, from keyframes (core/animation.ts does the sampling). */
export class AnimationPlayer extends Node {
  name = 'AnimationPlayer';
  animations: AnimationClip[] = [];
  autoplay = '';
  speedScale = 1;
  _playing = false;
  _clip = '';
  _elapsed = 0;

  get currentAnimation(): string { return this._clip; }
  get currentTime(): number { const c = this._current(); return c ? clipTime(c, this._elapsed).time : 0; }

  play(name?: string): void {
    if (name !== undefined && name !== this._clip) {
      if (!this.animations.some((a) => a.name === name)) throw new Error(`"${this.path}" has no animation "${name}". It has: ${this.animations.map((a) => `"${a.name}"`).join(', ') || 'none'}`);
      this._clip = name; this._elapsed = 0;
    } else if (!this._clip) {
      throw new Error(`"${this.path}": play() needs an animation name the first time`);
    } else if (!this._playing) {
      const c = this._current();
      if (c && !c.loop && this._elapsed >= c.length) this._elapsed = 0;
    }
    this._playing = true;
    this._apply();
  }

  pause(): void { this._playing = false; }
  stop(): void { this._playing = false; this._elapsed = 0; }
  seek(time: number): void { this._elapsed = time; this._apply(); }
  isPlaying(): boolean { return this._playing; }

  /** Called when an animation that does not loop reaches its end. */
  animationFinished(_name: string): void {}

  _current(): AnimationClip | undefined { return this.animations.find((a) => a.name === this._clip); }

  /** Move on by dt seconds and set every track's property. True when an animation that does not loop has just ended. */
  _advance(dt: number): boolean {
    const c = this._current();
    if (!this._playing || !c) return false;
    this._elapsed += dt * this.speedScale;
    const { finished } = clipTime(c, this._elapsed);
    this._apply();
    if (finished) { this._playing = false; return true; }
    return false;
  }

  /** Set each track's property to its value at the current time. Paths start at this player's parent. */
  _apply(): void {
    const c = this._current();
    if (!c) return;
    const t = clipTime(c, this._elapsed).time;
    for (const tr of c.tracks) {
      const target = this._parent?.find(tr.path);
      if (!target) throw new Error(`Animation "${c.name}": there is no node "${tr.path}" (track paths start at the AnimationPlayer's parent)`);
      const def = propDef(nodeTypeOf(target), tr.property);
      if (!def) throw new Error(`Animation "${c.name}": ${nodeTypeOf(target)} "${tr.path}" has no property "${tr.property}"`);
      const v = sampleTrack(tr, t, blendOf(def.type));
      if (v === undefined) continue;
      (target as unknown as Record<string, unknown>)[tr.property] = def.type === 'vec2' ? new Vec2((v as Vec2).x, (v as Vec2).y) : v;
    }
  }
}

/** One named animation: pictures shown in turn, fps times a second. */
export interface SpriteAnimation { name: string; fps: number; loop: boolean; frames: string[] }

/** Draws a picture that changes: the current animation's frames, in turn. */
export class AnimatedSprite2D extends Node2D {
  name = 'AnimatedSprite2D';
  frames: SpriteAnimation[] = [];
  animation = 'default';
  playing = true;
  speedScale = 1;
  frame = 0;
  flipX = false;
  flipY = false;
  opacity = 1;
  /** A colour the picture is multiplied by: '#ffffff' leaves it as it is. */
  modulate = '#ffffff';
  /** Seconds into the current frame. */
  _elapsed = 0;

  /** Play an animation by name (or carry on with the current one). A finished animation that does not loop starts again. */
  play(name?: string): void {
    if (name !== undefined && name !== this.animation) {
      if (!this.frames.some((a) => a.name === name)) throw new Error(`"${this.path}" has no animation "${name}". It has: ${this.frames.map((a) => `"${a.name}"`).join(', ') || 'none'}`);
      this.animation = name; this.frame = 0; this._elapsed = 0;
    } else if (!this.playing) {
      const a = this._current();
      if (a && !a.loop && this.frame >= a.frames.length - 1) { this.frame = 0; this._elapsed = 0; }
    }
    this.playing = true;
  }

  /** Stop where it is; play() carries on from here. */
  pause(): void { this.playing = false; }

  /** Stop, and go back to the first picture. */
  stop(): void { this.playing = false; this.frame = 0; this._elapsed = 0; }

  isPlaying(): boolean { return this.playing; }

  /** Called when an animation that does not loop reaches its last picture. */
  animationFinished(_name: string): void {}

  _current(): SpriteAnimation | undefined { return this.frames.find((a) => a.name === this.animation); }

  /** The picture showing now, or null when there is none (no such animation, or no pictures). */
  _texture(): string | null {
    const a = this._current();
    if (!a || !a.frames.length) return null;
    return a.frames[Math.min(Math.max(0, Math.floor(this.frame)), a.frames.length - 1)];
  }

  /** Move on by dt seconds. True when an animation that does not loop has just finished. */
  _advance(dt: number): boolean {
    const a = this._current();
    if (!this.playing || !a || !a.frames.length) return false;
    this.frame = Math.min(Math.max(0, Math.floor(this.frame)), a.frames.length - 1);
    this._elapsed += dt * this.speedScale;
    const each = 1 / a.fps;
    while (this._elapsed >= each - 1e-9) {
      this._elapsed -= each;
      if (this.frame + 1 < a.frames.length) this.frame++;
      else if (a.loop) this.frame = 0;
      else { this.playing = false; this._elapsed = 0; return true; }
    }
    return false;
  }
}

/** What the player sees. Under the player, it follows. The first current camera in the tree is used. */
export class Camera2D extends Node2D {
  name = 'Camera2D';
  current = true;
  /** 2 shows everything twice as big. */
  zoom = 1;
  /** 0 follows exactly; higher values catch up more gently. */
  smoothing = 0;
  private _limitTopLeft = new Vec2(-10000000, -10000000);
  private _limitBottomRight = new Vec2(10000000, 10000000);
  /** The camera never shows anything outside this rectangle. */
  get limitTopLeft(): Vec2 { return this._limitTopLeft; }
  set limitTopLeft(v: { x: number; y: number }) { this._limitTopLeft = new Vec2(v.x, v.y); }
  get limitBottomRight(): Vec2 { return this._limitBottomRight; }
  set limitBottomRight(v: { x: number; y: number }) { this._limitBottomRight = new Vec2(v.x, v.y); }
}

/** Text. Its position is its top-left corner. */
export class Label extends Node2D {
  name = 'Label';
  text = 'Label';
  fontSize = 24;
  color = '#ffffff';
  /** Wrap onto new lines at this width in pixels; 0 does not wrap. */
  wrapWidth = 0;
  /** How many letters are shown; −1 shows them all (typewriter dialogue). */
  visibleCharacters = -1;
  /** How many letters the text has, so a typewriter knows when it has finished. */
  get totalCharacters(): number { return String(this.text).length; }
}

// ── UI widgets (core/widgets.ts says how they look and how containers place children) ──

/** A box for a menu or dialogue. Its position is its top-left corner. */
export class Panel extends Node2D {
  name = 'Panel';
  private _size = new Vec2(200, 120);
  get size(): Vec2 { return this._size; }
  set size(v: { x: number; y: number }) { this._size = new Vec2(v.x, v.y); }
  color = '#1e2433';
  borderColor = '#8899bb';
  borderWidth = 2;
}

/** A button: clicked, or pressed with Enter while it has the focus. It emits pressed and calls pressed(). */
export class Button extends Node2D {
  name = 'Button';
  text = 'Button';
  private _size = new Vec2(140, 40);
  get size(): Vec2 { return this._size; }
  set size(v: { x: number; y: number }) { this._size = new Vec2(v.x, v.y); }
  fontSize = 18;
  color = '#3b5bdb';
  textColor = '#ffffff';
  disabled = false;
  /** The pointer is over it (set by the engine each frame). */
  _hover = false;
  /** The mouse went down on it and has not come up yet. */
  _down = false;
  /** Runs when it is pressed (also emitted as the pressed signal). */
  pressed(): void {}
  /** Whether it has the keyboard focus: the arrow keys move the focus between buttons, Enter or Space presses. */
  get hasFocus(): boolean { return this._game?._focus === this; }
  /** Take the keyboard focus (a menu's first button, when the menu opens). */
  grabFocus(): void { if (this._game && !this.disabled) this._game._focus = this; }
  /** Give up the focus, so the arrow keys and Enter go back to the game. */
  releaseFocus(): void { if (this._game?._focus === this) this._game._focus = null; }
}

/** A bar that fills from left to right with value / maxValue. Its position is its top-left corner. */
export class ProgressBar extends Node2D {
  name = 'ProgressBar';
  private _size = new Vec2(160, 16);
  get size(): Vec2 { return this._size; }
  set size(v: { x: number; y: number }) { this._size = new Vec2(v.x, v.y); }
  value = 50;
  maxValue = 100;
  fillColor = '#40c057';
  backColor = '#2b2f3a';
  showText = false;
}

/** Places its visible 2D children one after another, `separation` pixels apart. */
export class BoxContainer extends Node2D {
  name = 'BoxContainer';
  separation = 8;
  /** True for a column (VBoxContainer). */
  get vertical(): boolean { return true; }
  /** The size its children take up, after the engine last placed them. */
  _layoutSize = { w: 0, h: 0 };
}
/** Places its children in a column, top to bottom. */
export class VBoxContainer extends BoxContainer {
  name = 'VBoxContainer';
  get vertical(): boolean { return true; }
}
/** Places its children in a row, left to right. */
export class HBoxContainer extends BoxContainer {
  name = 'HBoxContainer';
  get vertical(): boolean { return false; }
}

/** One particle, in world coordinates. */
interface Particle { x: number; y: number; vx: number; vy: number; age: number }

/** Sparks, smoke, bursts: particles that fly out, fall with gravity and fade (the engine moves them each frame). */
export class Particles2D extends Node2D {
  name = 'Particles2D';
  emitting = false;
  rate = 20;
  amount = 12;
  lifetime = 0.6;
  speed = 60;
  direction = -1.5708;
  spread = 3.14159;
  gravity = 0;
  size = 3;
  color = '#ffd43b';
  texture: string | null = null;
  seed = 1;
  /** The particles alive now. */
  _particles: Particle[] = [];
  private _random: (() => number) | null = null;
  private _owed = 0;
  /** How many particles are alive now. */
  get count(): number { return this._particles.length; }
  /** Make amount particles at once (or n). */
  burst(n: number = this.amount): void { for (let i = 0; i < n; i++) this._spawn(); }
  /** Remove every particle now. */
  clear(): void { this._particles = []; }

  private _spawn(): void {
    this._random ??= mathRng(this.seed);
    const r = this._random, a = this.direction + (r() * 2 - 1) * this.spread, v = this.speed * (0.5 + 0.5 * r());
    const at = this.globalPosition;
    this._particles.push({ x: at.x, y: at.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0 });
  }

  /** Move every particle on by dt, age them, and make new ones while emitting (the engine calls this). */
  _advance(dt: number): void {
    if (this.emitting) { this._owed += this.rate * dt; while (this._owed >= 1) { this._owed -= 1; this._spawn(); } }
    for (const p of this._particles) { p.vy += this.gravity * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.age += dt; }
    this._particles = this._particles.filter((p) => p.age < this.lifetime);
  }
}

/**
 * Plays a sound (assets made with project.writeSound). The engine keeps time: playing is true from play() until the
 * sound's length (divided by pitchScale) has passed, then finished() runs; the game's audio output does the playing.
 */
export class AudioStreamPlayer extends Node {
  name = 'AudioStreamPlayer';
  stream: string | null = null;
  volume = 1;
  pitchScale = 1;
  autoplay = false;
  loop = false;
  /** The game time the sound now playing ends (Infinity while it loops), or null when it is not playing. */
  _endsAt: number | null = null;
  /** Which play this is, for the audio output. */
  _playId = 0;
  /** Whether a sound is playing now. */
  get playing(): boolean { return this._endsAt !== null; }
  /** Play the stream from the start (again, if it was already playing). */
  play(): void { if (!this._game) throw new Error(`"${this.name}" is not in a running game`); this._game._playSound(this); }
  /** Stop playing. */
  stop(): void { this._game?._stopSound(this); }
  /** Runs when a sound ends by itself (not when stopped, and never while it loops). Also emitted as the finished signal. */
  finished(): void {}
}

/** A rectangle or circle: the solid part of the body or area it is directly under. */
export class CollisionShape2D extends Node2D {
  name = 'CollisionShape2D';
  shape: 'rectangle' | 'circle' = 'rectangle';
  private _size = new Vec2(16, 16);
  /** Width and height; a circle uses the width as its diameter. */
  get size(): Vec2 { return this._size; }
  set size(v: { x: number; y: number }) { this._size = new Vec2(v.x, v.y); }

  /** Where it is in the world, scaled by its body's scale (rectangles stay axis-aligned). */
  worldShape(): WorldShape {
    const m = this.worldTransform, sx = Math.hypot(m[0], m[1]), det = m[0] * m[3] - m[1] * m[2];
    const sy = sx === 0 ? 0 : Math.abs(det / sx);
    return this.shape === 'circle'
      ? { kind: 'circle', x: m[4], y: m[5], r: (this._size.x * sx) / 2 }
      : { kind: 'rectangle', x: m[4], y: m[5], hw: (this._size.x * sx) / 2, hh: (this._size.y * sy) / 2 };
  }
}

/** What every body shares: the layers it is on, and its shapes (its direct CollisionShape2D children). */
export class PhysicsBody2D extends Node2D {
  collisionLayer = 1;
  shapes(): WorldShape[] {
    return this._children.filter((c): c is CollisionShape2D => c instanceof CollisionShape2D && !c._freed).map((c) => c.worldShape());
  }
}

/** Solid and still: walls, floors, platforms. */
export class StaticBody2D extends PhysicsBody2D {
  name = 'StaticBody2D';
}

/** What bodies collide with: other bodies, and tile layers' solid tiles. */
export type Collider = PhysicsBody2D | TileMapLayer;

export interface SlideCollision { body: Collider; normal: Vec2 }

export class CharacterBody2D extends PhysicsBody2D {
  name = 'CharacterBody2D';
  collisionMask = 1;
  private _velocity = new Vec2();
  _onFloor = false; _onWall = false; _onCeiling = false;
  _collisions: SlideCollision[] = [];

  /** Pixels per second. moveAndSlide() moves by this. */
  get velocity(): Vec2 { return this._velocity; }
  set velocity(v: { x: number; y: number }) { this._velocity = new Vec2(v.x, v.y); }

  /**
   * Move by velocity × the current step's time (1/60 s in physicsUpdate). It stops at
   * solid bodies on its mask's layers and slides along them: the part of the velocity
   * going into a surface is removed, the rest is kept. Afterwards isOnFloor(),
   * isOnWall() and isOnCeiling() say what it touched.
   */
  moveAndSlide(): void {
    const g = this._game;
    this._onFloor = this._onWall = this._onCeiling = false;
    this._collisions = [];
    if (!g) return;
    g._moveBody(this, (other, n) => {
      const vn = this._velocity.dot(n);
      if (vn < 0) this._velocity = this._velocity.sub(n.scale(vn));
      if (n.y < -0.7) this._onFloor = true; else if (n.y > 0.7) this._onCeiling = true; else this._onWall = true;
      if (!this._collisions.some((c) => c.body === other)) this._collisions.push({ body: other, normal: n });
    });
  }

  /** Standing on something (touched a surface facing up in the last moveAndSlide). */
  isOnFloor(): boolean { return this._onFloor; }
  isOnWall(): boolean { return this._onWall; }
  isOnCeiling(): boolean { return this._onCeiling; }
  /** What the last moveAndSlide touched, and the normal of each surface (pointing away from it). */
  getSlideCollisions(): SlideCollision[] { return [...this._collisions]; }
}

/** Moves by itself: pulled by gravity, keeps its velocity, bounces off solid bodies. */
export class RigidBody2D extends PhysicsBody2D {
  name = 'RigidBody2D';
  collisionMask = 1;
  /** 1 is normal gravity; 0 floats. */
  gravityScale = 1;
  /** Speed kept on a hit: 0 stops, 1 bounces back as fast. */
  bounce = 0;
  private _velocity = new Vec2();
  get velocity(): Vec2 { return this._velocity; }
  set velocity(v: { x: number; y: number }) { this._velocity = new Vec2(v.x, v.y); }
  /** Override in a script: called when it hits a body, with the surface's normal. */
  onCollision(_body: Collider, _normal: Vec2): void {}
}

/** Notices bodies coming in and going out, without stopping them. */
export class Area2D extends Node2D {
  name = 'Area2D';
  collisionMask = 1;
  _inside = new Set<Collider>();
  shapes(): WorldShape[] {
    return this._children.filter((c): c is CollisionShape2D => c instanceof CollisionShape2D && !c._freed).map((c) => c.worldShape());
  }
  /** The bodies inside it now. */
  getOverlappingBodies(): Collider[] { return [...this._inside]; }
  /** Override in a script: called when a body comes in. */
  bodyEntered(_body: Collider): void {}
  /** Override in a script: called when a body goes out (or is removed). */
  bodyExited(_body: Collider): void {}
}

/** The built-in classes, by registry type name. */
export const NODE_CLASSES: Record<string, typeof Node> = { Node, Node2D, Sprite2D, AnimatedSprite2D, AnimationPlayer, TileMapLayer, Camera2D, Label, Panel, Button, ProgressBar, BoxContainer, VBoxContainer, HBoxContainer, Particles2D, AudioStreamPlayer, CanvasLayer, CollisionShape2D, StaticBody2D, CharacterBody2D, RigidBody2D, Area2D };

/** The registered type a runtime node is: its class, or the nearest built-in class it extends. */
export function nodeTypeOf(n: Node): string {
  for (let proto = Object.getPrototypeOf(n); proto; proto = Object.getPrototypeOf(proto)) {
    const hit = Object.entries(NODE_CLASSES).find(([, C]) => C.prototype === proto);
    if (hit) return hit[0];
  }
  return 'Node';
}
