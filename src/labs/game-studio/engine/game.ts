// The running game: builds the node tree from a scene, runs the lifecycle, and hands
// the renderer a plain list of what to draw each frame (ADR 2, ADR 4).
//
// Each frame, in this order:
//   1. physicsUpdate(1/60) on every node, as many times as fit in the time that has
//      passed (at most 0.25 s, so a stall does not run hundreds of steps);
//   2. update(dt) on every node, with the frame's own time;
//   3. nodes freed this frame are removed (destroyed() runs);
//   4. the renderer gets the frame;
//   5. "just pressed" input is forgotten.
// ready() runs children first, so a parent's ready() can use its children.
//
// A lifecycle method that throws is reported once, and that node is skipped from
// then on; the rest of the game keeps running.
//
// Agents (ml/): a node whose script has observe() and act(action) is an agent. If its `brain` field names a
// brain in the project (brains/ghost.json), then at the start of every decideEvery-th frame (4 unless the
// script says) the engine asks it what it sees, looks up what the brain does there, and calls act(). Training
// (ml/env.ts) drives the same two methods itself, so an agent behaves the same in training and in the game.
// An agent whose moves change (a card game: the cards in its hand) has legalActions(): it decides only when that
// list is not empty (its turn), the brain chooses among those moves only, and features(action) describes each move
// to a linear Q brain. Its temperature field (0 unless set) makes the brain's choice a softmax: a difficulty setting.

import type { Connection, NodeData, Project, PropValue, SceneData } from '../core/types';
import { propsOf } from '../core/registry';
import { decompose } from '../core/math2d';
import { Input } from './input';
import { NODE_CLASSES, AnimatedSprite2D, AnimationPlayer, TileMapLayer, type Collider, type TilesetInfo, Area2D, AudioStreamPlayer, BoxContainer, Button, Camera2D, CanvasLayer, CharacterBody2D, Label, Node, Node2D, PhysicsBody2D, RigidBody2D, Sprite2D, nodeTypeOf } from './nodes';
import { boxLayout, nodeSize, widgetParts, WIDGET_TYPES } from '../core/widgets';
import { apply, invert } from '../core/math2d';
import { scans, separate } from './physics';
import { tilesetGrid } from '../core/tiles';
import { expandScene, expandSceneRoot } from '../core/instances';
import { Vec2 } from './vec2';
import { actPolicy, decide, dot, isLinearQ, pick, type AgentPolicy } from '../ml/brain';
import { memoryStore, saveApi, type SaveApi, type SaveStore } from './saves';

export const PHYSICS_DT = 1 / 60;

interface DrawBase {
  id: number;
  x: number; y: number; rotation: number; scaleX: number; scaleY: number;
  alpha: number;
  /** Drawing order: higher is on top. */
  depth: number;
  /** On the screen (under a CanvasLayer), not in the world: the camera does not move or zoom it. */
  screen: boolean;
}
/** One thing to draw: an image (centred on x, y) or text (top-left at x, y). */
export type DrawItem =
  | (DrawBase & { kind: 'sprite'; texture: string; flipX: boolean; flipY: boolean })
  /** Text: its top-left at x, y, or its centre when `center`; wrapped at `wrap` pixels when given; only the first `visible` letters shown when given. */
  | (DrawBase & { kind: 'text'; text: string; fontSize: number; color: string; center?: boolean; wrap?: number; visible?: number })
  /** A tile layer: its top-left at x, y; cells as [x, y, tile, …]; `version` changes when the cells do. */
  | (DrawBase & { kind: 'tiles'; texture: string; tileWidth: number; tileHeight: number; margin: number; spacing: number; columns: number; cells: number[]; version: number })
  /** A filled rectangle centred on x, y (drawn by learning overlays: a Q table's values over a grid). */
  | (DrawBase & { kind: 'rect'; width: number; height: number; color: string; stroke?: string; strokeWidth?: number });

/** Where the camera looks: the world point at the centre of the screen, and how close. */
export interface View { x: number; y: number; zoom: number }

export interface Renderer {
  /** Everything to draw this frame, and the camera. Items not in the list are no longer drawn. */
  frame(items: DrawItem[], view: View): void;
}

/** Where sounds are played: the game says what to play and when to stop; this does the playing (runtime/main.ts). */
export interface AudioOut {
  play(id: number, stream: string, o: { volume: number; pitch: number; loop: boolean }): void;
  stop(id: number): void;
}

export interface ScriptError { message: string; file: string | null; stack: string; node: string; phase: string }

export interface GameOptions {
  /** The class for a node's script, or undefined if it has none. */
  scriptClass?: (path: string) => typeof Node | undefined;
  onError?: (e: ScriptError) => void;
  /** Where save slots are kept (engine/saves.ts). Without one, slots last only as long as this game. */
  saves?: SaveStore;
  /** Where sounds are played. Without one the game keeps time for sounds but plays nothing (training, tests). */
  audio?: AudioOut;
}

export class Game {
  readonly input: Input;
  root: Node;   // replaced when scene.change() switches scenes
  readonly time = { now: 0, frame: 0 };
  /** The button with the keyboard focus (Button.grabFocus), if any. */
  _focus: Button | null = null;
  /** The game's own data (the state global): it survives scene changes; a new Game starts it empty. */
  readonly state: Record<string, unknown> = {};
  /** The save global: slots kept in the options' store. */
  readonly save: SaveApi;
  /** The time step now running: 1/60 in physicsUpdate, the frame time in update. */
  stepDelta = 0;
  private accumulator = 0;
  private freeQueue = new Set<Node>();
  private ids = new WeakMap<Node, number>();
  private nextDrawId = 1;
  private started = false;
  /** Pixels per second per second, downward (the project's setting). */
  readonly gravity: number;
  /** Where the camera is looking (it eases toward its target when it has smoothing). */
  private view: View;
  private readonly screenSize: { w: number; h: number };

  constructor(project: Project, scene: SceneData, private renderer: Renderer, private opts: GameOptions = {}) {
    this.input = new Input(project.input);
    this.screenSize = { w: project.settings.width, h: project.settings.height };
    this.gravity = project.settings.gravity ?? 980;
    for (const ts of project.tilesets ?? []) {
      const a = project.assets.find((x) => x.path === ts.image);
      const g = a ? tilesetGrid(ts, a.width, a.height) : { columns: 0, count: 0 };
      this.tilesets.set(ts.path, { data: ts, columns: g.columns, count: g.count });
    }
    // With no camera, the screen shows the world from (0, 0) to (width, height).
    this.view = { x: this.screenSize.w / 2, y: this.screenSize.h / 2, zoom: 1 };
    this.input._toWorld = (p) => new Vec2(this.view.x + (p.x - this.screenSize.w / 2) / this.view.zoom, this.view.y + (p.y - this.screenSize.h / 2) / this.view.zoom);
    for (const b of project.brains ?? []) this.brains.set(b.path, b.policy as AgentPolicy);
    for (const a of project.assets) if (a.sound) this.soundLengths.set(a.path, a.sound.length);
    this.save = saveApi(opts.saves ?? memoryStore(), this.state);
    this.project = project;
    this.scenePath = scene.path;
    this.root = this.buildTree(expandScene(project, scene).root);
    this.root._game = this;
  }

  /** Each sound's length in seconds, by path. */
  private soundLengths = new Map<string, number>();
  private nextPlayId = 1;

  /** AudioStreamPlayer.play(): start its stream, and note when it will end. */
  _playSound(n: AudioStreamPlayer): void {
    if (!n.stream) throw new Error(`"${n.path}" has no sound to play: set its stream`);
    const length = this.soundLengths.get(n.stream);
    if (length === undefined) throw new Error(`There is no sound "${n.stream}" in the project`);
    this._stopSound(n);
    n._playId = this.nextPlayId++;
    n._endsAt = n.loop ? Infinity : this.time.now + length / Math.max(0.01, n.pitchScale);
    this.opts.audio?.play(n._playId, n.stream, { volume: n.volume, pitch: n.pitchScale, loop: n.loop });
  }

  _stopSound(n: AudioStreamPlayer): void {
    if (n._endsAt === null) return;
    n._endsAt = null;
    this.opts.audio?.stop(n._playId);
  }

  /** A node leaving the game: its sound stops, and destroyed() runs. */
  private retire(n: Node): void {
    n._freed = true;
    if (n instanceof AudioStreamPlayer) this._stopSound(n);
    this.call(n, 'destroyed');
  }

  /** The project's trained brains, by path. */
  private brains = new Map<string, AgentPolicy>();
  /** Brains given to nodes by path from outside the game (Watch it play), over their own `brain` field. */
  private agentOverrides = new Map<string, AgentPolicy>();
  private agentFrames = new WeakMap<Node, number>();
  /** The agent being trained (ml/env.ts drives it, so the engine leaves it alone). */
  trainee: Node | null = null;
  /** True while an agent trains: scripts can read it as ai.training (to have the player play itself, say). */
  training = false;

  private tilesets = new Map<string, TilesetInfo>();
  /** A tileset by its path, for TileMapLayer. */
  _tileset(path: string): TilesetInfo | null { return this.tilesets.get(path) ?? null; }

  /** Create the node for a saved one, its script class if it has one, and its children. */
  /** Build a tree from saved (expanded) data, and wire the signal connections saved in it. */
  private buildTree(data: NodeData): Node {
    const byId = new Map<string, Node>(), wiring: [Node, Connection][] = [];
    const root = this.build(data, byId, wiring);
    for (const [from, c] of wiring) {
      const to = byId.get(c.target);
      if (to) from.connect(c.signal, to, c.method);
    }
    return root;
  }

  private build(data: NodeData, byId: Map<string, Node> = new Map(), wiring: [Node, Connection][] = []): Node {
    const builtin = NODE_CLASSES[data.type];
    if (!builtin) throw new Error(`The engine has no node type "${data.type}"`);
    let Cls: typeof Node = builtin;
    if (data.script) {
      const S = this.opts.scriptClass?.(data.script);
      if (!S) throw new Error(`${data.script} did not load`);
      if (S !== builtin && !(S.prototype instanceof builtin)) {
        throw new Error(`${data.script}: the class must extend ${data.type}, because it is attached to a ${data.type} ("${data.name}"). Write: export default class … extends ${data.type}`);
      }
      Cls = S;
    }
    const node = new Cls();
    node.name = data.name;
    node._script = data.script;
    node._game = this;
    applyProps(node, data.type, data.props);
    for (const g of data.groups ?? []) node._groups.add(g);
    byId.set(data.id, node);
    for (const c of data.connections ?? []) wiring.push([node, c]);
    for (const c of data.children) { const child = this.build(c, byId, wiring); child._parent = node; node._children.push(child); }
    return node;
  }

  private project: Project;
  /** The running scene's file. */
  scenePath: string;
  private nextScene: string | null = null;

  /** Replace the running scene: the old one's nodes get destroyed(), the new one's ready(). */
  private switchScene(path: string): void {
    this.nextScene = null;
    const gone = (n: Node) => { for (const c of n._children) gone(c); this.retire(n); };
    gone(this.root);
    this.ids = new WeakMap();
    this._focus = null;
    this.scenePath = path;
    this.root = this.buildTree(expandSceneRoot(this.project, path));
    this.root._game = this;
    this.started = false;
    this.start();
  }

  /** Run ready() everywhere, children first. Call once before the first step. */
  start(): void {
    if (this.started) return;
    this.started = true;
    const readyAll = (n: Node) => { for (const c of n._children) readyAll(c); this.call(n, 'ready'); };
    readyAll(this.root);
    // Autoplay: the named animation starts now, so the first frame already shows its values.
    this.each((n) => { if (n instanceof AnimationPlayer && n.autoplay) this.guard(n, 'autoplay', () => n.play(n.autoplay)); });
    this.each((n) => { if (n instanceof AudioStreamPlayer && n.autoplay && n.stream) this.guard(n, 'autoplay', () => this._playSound(n)); });
    this.updateCamera(0, true);
    this.draw();
  }

  /** Advance by dt seconds (the time since the last frame). */
  step(dt: number): void {
    this.time.frame++;
    this.time.now += dt;
    this.driveAgents();
    this.layout();
    this.ui();
    this.accumulator = Math.min(this.accumulator + dt, 0.25);
    while (this.accumulator >= PHYSICS_DT - 1e-12) {
      this.stepDelta = PHYSICS_DT;
      this.input.inPhysics = true;
      this.each((n) => this.call(n, 'physicsUpdate', PHYSICS_DT));
      this.input.inPhysics = false;
      this.input.endPhysicsStep();
      this.physicsStep(PHYSICS_DT);
      this.accumulator -= PHYSICS_DT;
    }
    this.stepDelta = dt;
    // Animations move on before scripts' update, so update sees this frame's values: AnimationPlayers
    // first (a track may set a sprite's animation or frame), then animated sprites.
    this.each((n) => { if (n instanceof AnimationPlayer && this.guard(n, 'animation', () => n._advance(dt))) this.call(n, 'animationFinished', n.currentAnimation); });
    this.each((n) => { if (n instanceof AnimatedSprite2D && this.guard(n, 'animation', () => n._advance(dt))) this.call(n, 'animationFinished', n.animation); });
    this.each((n) => this.call(n, 'update', dt));
    // Sounds that have played to their end.
    this.each((n) => { if (n instanceof AudioStreamPlayer && n._endsAt !== null && n._endsAt <= this.time.now + 1e-9) { n._endsAt = null; this.call(n, 'finished'); } });
    this.flushFree();
    if (this.nextScene) this.switchScene(this.nextScene);
    this.updateCamera(dt);
    this.draw();
    this.input.endFrame();
  }

  // ── agents ────────────────────────────────────────────────────────────

  /** Agents with a brain decide now, on their decideEvery-th frame (the first frame included). */
  private driveAgents(): void {
    this.each((n) => {
      if (n === this.trainee || n._broken || !isAgent(n)) return;
      const field = (n as unknown as { brain?: unknown }).brain;
      const policy = this.agentOverrides.get(n.path) ?? (typeof field === 'string' ? this.brains.get(field) : undefined);
      if (!policy) return;
      const turns = typeof n.legalActions === 'function';
      // A turn-based agent decides as soon as its turn comes (it has legal moves), then every decideEvery frames.
      const legal = turns ? this.guard(n, 'legalActions', () => n.legalActions!()) : undefined;
      if (turns && !(Array.isArray(legal) && legal.length)) { this.agentFrames.set(n, 0); return; }
      const k = this.agentFrames.get(n) ?? 0;
      this.agentFrames.set(n, k + 1);
      if (k % decideEvery(n) !== 0) return;
      this.guard(n, 'act', () => {
        // An agent with features but no turns may do any of its actions.
        const moves = (legal as number[] | undefined) ?? (typeof n.features === 'function' && Array.isArray(n.actions) ? n.actions.map((_, i) => i) : undefined);
        n.act(decide(policy, { observation: n.observe(), legal: moves, features: typeof n.features === 'function' ? (a) => n.features!(a).map(Number) : undefined, temperature: Number(n.temperature) || 0 }));
      });
    });
  }

  /** Drive the agent at this path with a policy (Watch it play), or stop doing so (null). */
  setAgentPolicy(path: string, policy: AgentPolicy | null): void {
    if (policy) this.agentOverrides.set(path, policy); else this.agentOverrides.delete(path);
  }

  /** Whether a brain is in the project, and what it does for an observation: for scripts (the ai global). Built
   *  with a closure, so a script reaches these and not the game itself. */
  readonly ai = ((game: Game) => ({
    get training() { return game.training; },
    has(path: string) { return game.brains.has(path); },
    act(path: string, observation: number[]) {
      const p = game.brains.get(path);
      if (!p) throw new Error(`There is no brain "${path}" in the project (train one with Run › Train an agent…, then Save as brain)`);
      return actPolicy(p, observation);
    },
    /** A linear Q brain's value for each move, from each move's features (developer views, a practice partner). */
    values(path: string, features: number[][]) {
      const p = game.brains.get(path);
      if (!p) throw new Error(`There is no brain "${path}" in the project (train one with Run › Train an agent…, then Save as brain)`);
      if (!isLinearQ(p)) throw new Error(`${path} is not a linear Q brain: ai.values scores moves by their features`);
      return features.map((phi) => dot(p.weights, phi.map(Number)));
    },
    /** A linear Q brain's weights, one per feature (a copy): for showing why it chose. */
    weights(path: string) {
      const p = game.brains.get(path);
      if (!p || !isLinearQ(p)) throw new Error(`There is no linear Q brain "${path}" in the project`);
      return [...p.weights];
    },
    /** Which of these moves (by their features) a linear Q brain picks: an index into the list. temperature above 0 makes it a softmax choice. */
    choose(path: string, features: number[][], temperature = 0) {
      return pick(this.values(path, features), temperature);
    },
  }))(this);

  /** Run fn for a node as the engine runs its lifecycle methods: a mistake is reported once and stops the node. */
  _run<T>(n: Node, phase: string, fn: () => T): T | undefined { return this.guard(n, phase, fn); }

  /** Every node in tree order (parents before children). */
  each(fn: (n: Node) => void): void {
    const visit = (n: Node) => { if (n._freed) return; fn(n); for (const c of n._children) visit(c); };
    visit(this.root);
  }

  private call(n: Node, phase: string, ...args: unknown[]): void {
    this.guard(n, phase, () => ((n as unknown as Record<string, (...a: unknown[]) => void>)[phase]).apply(n, args));
    // The engine's events are signals too, so they can be connected without a script on the node.
    if (SIGNALS.has(phase) && !n._freed) n.emit(phase, ...args);
  }

  /** Run a connected method for a signal: a mistake is reported against the node the method belongs to. */
  _deliver(owner: Node, phase: string, fn: () => void): void { this.guard(owner, phase, fn); }

  /** Run fn for a node; if it throws, report it once and stop that node (its children carry on). */
  private guard<T>(n: Node, phase: string, fn: () => T): T | undefined {
    if (n._broken) return undefined;
    try { return fn(); }
    catch (e) {
      n._broken = true;
      const err = e instanceof Error ? e : new Error(String(e));
      this.opts.onError?.({ message: err.message, stack: err.stack ?? '', file: n._script, node: n.path, phase });
      return undefined;
    }
  }

  // ── physics ────────────────────────────────────────────────────────────

  /** Every body in the tree now (not freed). */
  private bodies(): PhysicsBody2D[] {
    const out: PhysicsBody2D[] = [];
    this.each((n) => { if (n instanceof PhysicsBody2D) out.push(n); });
    return out;
  }

  /**
   * Move a character or rigid body by velocity × stepDelta, in steps of at most 4 pixels
   * so it cannot pass through a thin wall, pushing it out of every solid body on its
   * mask's layers. `hit` is told each body touched and the surface normal (pointing away
   * from that body, towards the mover).
   */
  /** Everything a body can collide with: bodies, and tile layers (their solid tiles). */
  private colliders(): Collider[] {
    const out: Collider[] = [];
    this.each((n) => { if (n instanceof PhysicsBody2D || n instanceof TileMapLayer) out.push(n); });
    return out;
  }

  _moveBody(body: CharacterBody2D | RigidBody2D, hit: (other: Collider, normal: Vec2) => void): void {
    const others = this.colliders().filter((o) => o !== body && scans(body.collisionMask, o.collisionLayer));
    const dist = body.velocity.length() * this.stepDelta;
    const steps = Math.max(1, Math.ceil(dist / 4));
    for (let i = 0; i < steps; i++) {
      body.globalPosition = body.globalPosition.add(body.velocity.scale(this.stepDelta / steps));
      // Push out of one overlap at a time, recomputing where the shapes are after each
      // push (pushing out of one body can push into another), up to eight times.
      for (let pass = 0; pass < 8; pass++) {
        let found: { o: Collider; nx: number; ny: number; depth: number } | null = null;
        search: for (const mine of body.shapes()) for (const o of others) for (const theirs of o.shapes()) {
          const p = separate(mine, theirs);
          if (p) { found = { o, ...p }; break search; }
        }
        if (!found) break;
        body.globalPosition = body.globalPosition.add({ x: found.nx * found.depth, y: found.ny * found.depth });
        hit(found.o, new Vec2(found.nx, found.ny));
      }
    }
  }

  /** After every physicsUpdate: rigid bodies fall, move and bounce; areas notice who came and went. */
  private physicsStep(dt: number): void {
    for (const b of this.bodies()) {
      if (!(b instanceof RigidBody2D) || b._broken) continue;
      b.velocity = { x: b.velocity.x, y: b.velocity.y + this.gravity * b.gravityScale * dt };
      const touched = new Map<Collider, Vec2>();
      this._moveBody(b, (other, n) => {
        const vn = b.velocity.dot(n);
        // Reflect the part of the velocity going into the surface, keeping `bounce` of it.
        if (vn < 0) b.velocity = b.velocity.sub(n.scale((1 + b.bounce) * vn));
        if (!touched.has(other)) touched.set(other, n);
      });
      for (const [other, n] of touched) this.call(b, 'onCollision', other, n);
    }
    const all = this.colliders();
    this.each((n) => {
      if (!(n instanceof Area2D)) return;
      const mine = n.shapes();
      const now = new Set(all.filter((b) => scans(n.collisionMask, b.collisionLayer) && b.shapes().some((s) => mine.some((m) => separate(s, m)))));
      for (const b of n._inside) if (!now.has(b)) this.call(n, 'bodyExited', b);
      for (const b of now) if (!n._inside.has(b)) this.call(n, 'bodyEntered', b);
      n._inside = now;
    });
  }

  /** A node added while running (addChild). */
  _attached(node: Node): void {
    const bind = (n: Node) => { n._game = this; for (const c of n._children) bind(c); };
    bind(node);
    if (this.started) { const readyAll = (n: Node) => { for (const c of n._children) readyAll(c); this.call(n, 'ready'); }; readyAll(node); }
  }

  _queueFree(node: Node): void { this.freeQueue.add(node); }

  private flushFree(): void {
    for (const node of this.freeQueue) {
      if (node._freed || node === this.root) continue;
      const gone = (n: Node) => { for (const c of n._children) gone(c); this.retire(n); };
      gone(node);
      if (node._parent) node._parent._children = node._parent._children.filter((c) => c !== node);
      node._parent = null;
    }
    this.freeQueue.clear();
  }

  /** The camera in use: the first Camera2D in tree order with current on. */
  get camera(): Camera2D | null {
    let found: Camera2D | null = null;
    this.each((n) => { if (!found && n instanceof Camera2D && n.current) found = n; });
    return found;
  }

  /**
   * Point the view at the camera. With smoothing k, the view closes the gap by a
   * fraction 1 − e^(−k·dt) each frame: the same easing whatever the frame rate.
   */
  private updateCamera(dt: number, snap = false): void {
    const cam = this.camera;
    if (!cam) { this.view = { x: this.screenSize.w / 2, y: this.screenSize.h / 2, zoom: 1 }; return; }
    const target = this.limit(cam, cam.globalPosition);
    const f = snap || cam.smoothing <= 0 ? 1 : 1 - Math.exp(-cam.smoothing * dt);
    this.view = { ...this.limit(cam, { x: this.view.x + (target.x - this.view.x) * f, y: this.view.y + (target.y - this.view.y) * f }), zoom: cam.zoom };
  }

  /**
   * Keep the camera's view inside its limits: the centre may go no closer to a limit than
   * half the view's width (or height). A level smaller than the view is centred.
   */
  private limit(cam: Camera2D, c: { x: number; y: number }): { x: number; y: number } {
    const hw = this.screenSize.w / (2 * cam.zoom), hh = this.screenSize.h / (2 * cam.zoom);
    const tl = cam.limitTopLeft, br = cam.limitBottomRight;
    const axis = (v: number, lo: number, hi: number, half: number) => (lo + half > hi - half ? (lo + hi) / 2 : Math.min(hi - half, Math.max(lo + half, v)));
    return { x: axis(c.x, tl.x, br.x, hw), y: axis(c.y, tl.y, br.y, hh) };
  }

  // ── UI widgets (core/widgets.ts) ───────────────────────────────────────

  /** Whether a node and everything above it are visible. */
  private shown(n: Node): boolean {
    for (let p: Node | null = n; p; p = p._parent) if (p instanceof Node2D && !p.visible) return false;
    return true;
  }

  /** Whether a node is under a CanvasLayer (placed on the screen, not in the world). */
  private onScreen(n: Node): boolean {
    for (let p = n._parent; p; p = p._parent) if (p instanceof CanvasLayer) return true;
    return false;
  }

  /** Containers place their visible 2D children, innermost containers first so an outer one knows their sizes. */
  private layout(): void {
    const boxes: BoxContainer[] = [];
    this.each((n) => { if (n instanceof BoxContainer) boxes.push(n); });
    for (const box of boxes.reverse()) {
      const kids = box._children;
      const sizes = kids.map((c) => (c instanceof Node2D && c.visible ? this.sizeOf(c) : null));
      const at = boxLayout(box.vertical, box.separation, sizes);
      kids.forEach((c, i) => { const p = at[i]; if (p && c instanceof Node2D) c.position = p; });
      const placed = sizes.filter((s): s is { w: number; h: number } => !!s);
      const along = placed.reduce((t, s) => t + (box.vertical ? s.h : s.w), 0) + box.separation * Math.max(0, placed.length - 1);
      const across = placed.reduce((m, s) => Math.max(m, box.vertical ? s.w : s.h), 0);
      box._layoutSize = box.vertical ? { w: across, h: along } : { w: along, h: across };
    }
  }

  private sizeOf(n: Node): { w: number; h: number } {
    if (n instanceof BoxContainer) return n._layoutSize;
    return nodeSize(nodeTypeOf(n), (k) => (n as unknown as Record<string, unknown>)[k]) ?? { w: 0, h: 0 };
  }

  /** Buttons: the pointer over them, clicks (down and up on the same button), and the keyboard focus. */
  private ui(): void {
    const buttons: Button[] = [];
    this.each((n) => { if (n instanceof Button && !n._broken && this.shown(n)) buttons.push(n); });
    if (this._focus && (this._focus.disabled || !buttons.includes(this._focus))) this._focus = null;
    const down = this.input._keyJustDown('MouseLeft'), up = this.input._keyJustUp('MouseLeft');
    for (const b of buttons) {
      const p = apply(invert(b.worldTransform), this.onScreen(b) ? this.input.mouseScreen : this.input.mouse);
      b._hover = !b.disabled && p.x >= 0 && p.y >= 0 && p.x <= b.size.x && p.y <= b.size.y;
      if (down && b._hover) b._down = true;
      if (up) { const clicked = b._down && b._hover; b._down = false; if (clicked) this.press(b); }
    }
    const f = this._focus;
    if (!f) return;
    const k = (code: string) => this.input._keyJustDown(code);
    const dir = k('ArrowUp') ? { x: 0, y: -1 } : k('ArrowDown') ? { x: 0, y: 1 } : k('ArrowLeft') ? { x: -1, y: 0 } : k('ArrowRight') ? { x: 1, y: 0 } : null;
    if (dir) { const next = this.nearestButton(f, dir, buttons); if (next) this._focus = next; }
    else if (k('Enter') || k('NumpadEnter') || k('Space')) this.press(f);
  }

  /** The enabled button nearest in a direction from another: straight ahead counts more than off to the side. */
  private nearestButton(from: Button, dir: { x: number; y: number }, buttons: Button[]): Button | null {
    const centre = (b: Button) => apply(b.worldTransform, { x: b.size.x / 2, y: b.size.y / 2 });
    const c = centre(from);
    let best: Button | null = null, bestScore = Infinity;
    for (const b of buttons) {
      if (b === from || b.disabled) continue;
      const d = centre(b), dx = d.x - c.x, dy = d.y - c.y;
      const ahead = dx * dir.x + dy * dir.y, side = Math.abs(dx * dir.y - dy * dir.x);
      if (ahead <= 0) continue;
      const score = ahead + 2 * side;
      if (score < bestScore) { bestScore = score; best = b; }
    }
    return best;
  }

  private press(b: Button): void { if (!b.disabled) this.call(b, 'pressed'); }

  /** The draw list: visible sprites with a texture and visible labels, in world (or screen) coordinates. */
  private draw(): void {
    this.layout();
    const items: DrawItem[] = [];
    let order = 0;
    const idOf = (n: Node) => { let id = this.ids.get(n); if (id === undefined) { id = this.nextDrawId++; this.ids.set(n, id); } return id; };
    const visit = (n: Node, visible: boolean, z: number, screen: boolean) => {
      if (n._freed) return;
      let vis = visible, zz = z, scr = screen;
      if (n instanceof CanvasLayer) { scr = true; zz = 1e6 * n.layer; }
      if (n instanceof Node2D) { vis = visible && n.visible; zz = zz + n.zIndex; }
      if (vis && n instanceof TileMapLayer) {
        const info = n._info();
        if (info && n._map.size) {
          const t = decompose(n.worldTransform);
          items.push({ id: idOf(n), x: t.position.x, y: t.position.y, rotation: t.rotation, scaleX: t.scale.x, scaleY: t.scale.y, depth: zz + (order++) * 1e-6, screen: scr, alpha: 1,
            kind: 'tiles', texture: info.data.image, tileWidth: info.data.tileWidth, tileHeight: info.data.tileHeight, margin: info.data.margin, spacing: info.data.spacing, columns: info.columns, cells: n.cells, version: n._version });
        }
      }
      const picture = n instanceof Sprite2D ? n.texture : n instanceof AnimatedSprite2D ? n._texture() : null;
      if (vis && n instanceof Node2D && (picture || n instanceof Label)) {
        const t = decompose(n.worldTransform);
        const base = { id: idOf(n), x: t.position.x, y: t.position.y, rotation: t.rotation, scaleX: t.scale.x, scaleY: t.scale.y, depth: zz + (order++) * 1e-6, screen: scr };
        if (n instanceof Sprite2D || n instanceof AnimatedSprite2D) items.push({ ...base, kind: 'sprite', texture: picture!, flipX: n.flipX, flipY: n.flipY, alpha: n.opacity });
        else if (n instanceof Label) items.push({ ...base, kind: 'text', text: String(n.text), fontSize: n.fontSize, color: n.color, alpha: 1, ...(n.wrapWidth > 0 ? { wrap: n.wrapWidth } : {}), ...(n.visibleCharacters >= 0 ? { visible: Math.floor(n.visibleCharacters) } : {}) });
      }
      // A widget: its parts, placed through its transform (a rectangle by its centre, as rects are drawn).
      const type = vis && n instanceof Node2D ? nodeTypeOf(n) : '';
      if (WIDGET_TYPES.has(type)) {
        const b = n as Button, m = (n as Node2D).worldTransform, t = decompose(m);
        const parts = widgetParts(type, (k) => (n as unknown as Record<string, unknown>)[k], n instanceof Button ? { hover: b._hover, down: b._down && b._hover, focused: this._focus === b } : {}) ?? [];
        for (const part of parts) {
          // Parts get negative ids, so they never meet the ids of nodes drawn whole.
          const common = { id: -(idOf(n) * 8 + parts.indexOf(part) + 1), rotation: t.rotation, scaleX: t.scale.x, scaleY: t.scale.y, depth: zz + (order++) * 1e-6, screen: scr, alpha: 1 };
          if (part.kind === 'rect') {
            const c = apply(m, { x: part.x + part.w / 2, y: part.y + part.h / 2 });
            items.push({ ...common, x: c.x, y: c.y, kind: 'rect', width: part.w, height: part.h, color: part.color, ...(part.stroke ? { stroke: part.stroke, strokeWidth: part.strokeWidth } : {}) });
          } else {
            const c = apply(m, { x: part.x, y: part.y });
            items.push({ ...common, x: c.x, y: c.y, kind: 'text', text: part.text, fontSize: part.fontSize, color: part.color, ...(part.center ? { center: true } : {}), ...(part.wrap ? { wrap: part.wrap } : {}) });
          }
        }
      }
      for (const c of n._children) visit(c, vis, zz, scr);
    };
    visit(this.root, true, 0, false);
    this.renderer.frame(items, { ...this.view });
  }

  /** Scripts' `scene` global: the tree from its root. */
  get sceneApi() {
    const game = this;
    return {
      get root() { return game.root; },
      /** The running scene's file. */
      get path() { return game.scenePath; },
      get: <T extends Node = Node>(path: string) => this.root.get<T>(path),
      find: <T extends Node = Node>(path: string) => this.root.find<T>(path),
      /** Every node in a group, in tree order. */
      getNodesInGroup: (group: string) => { const out: Node[] = []; this.each((n) => { if (n._groups.has(group)) out.push(n); }); return out; },
      /** Call a method on every node in a group that has it. */
      callGroup: (group: string, method: string, ...args: unknown[]) => {
        const out: Node[] = []; this.each((n) => { if (n._groups.has(group)) out.push(n); });
        for (const n of out) { const fn = (n as unknown as Record<string, unknown>)[method]; if (typeof fn === 'function') this.guard(n, `callGroup ${method}`, () => (fn as (...a: unknown[]) => void).apply(n, args)); }
      },
      /** A new copy of a scene's nodes, not yet in the game: add it with addChild. */
      instantiate: (path: string) => this.buildTree(expandSceneRoot(this.project, path)),
      /** Switch to another scene at the end of this frame. */
      change: (path: string) => { if (!this.project.scenes.some((s) => s.path === path)) throw new Error(`There is no scene "${path}"`); this.nextScene = path; },
    };
  }
}

/** Set a node's saved properties (registry names) on the runtime object. */
export function applyProps(node: Node, type: string, props: Record<string, PropValue>): void {
  for (const def of propsOf(type)) {
    if (!(def.name in props)) continue;
    const v = props[def.name];
    (node as unknown as Record<string, unknown>)[def.name] = def.type === 'vec2' ? new Vec2((v as { x: number }).x, (v as { y: number }).y)
      : v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v;   // lists are copied, so a script cannot change the project
  }
}

/** The globals a script sees (ADR 4). */
export function scriptGlobals(game: Game): Record<string, unknown> {
  return { input: game.input, scene: game.sceneApi, time: game.time, state: game.state, save: game.save, math: MATH, physics: { gravity: game.gravity }, ai: game.ai, Vec2, PhysicsBody2D, ...NODE_CLASSES };
}

/** A node whose script makes it an agent: it can say what it sees and do an action. */
export type AgentNode = Node & {
  observe(): number[]; act(action: number): void; reward?(): number; done?(): boolean; actions?: string[]; observations?: string[]; decideEvery?: number;
  /** A turn-based agent: the moves it may make now ([] when it is not its turn). */
  legalActions?(): number[];
  /** What a move is like, as numbers (a linear Q brain scores w · features). featureNames name them. */
  features?(action: number): number[]; featureNames?: string[];
  /** How a brain chooses for it: 0 the best move, above 0 a softmax (a difficulty setting). */
  temperature?: number;
};
export function isAgent(n: Node): n is AgentNode {
  const a = n as unknown as Record<string, unknown>;
  return typeof a.observe === 'function' && typeof a.act === 'function';
}
/** Frames between an agent's decisions: its decideEvery, 4 unless it says. */
export const decideEvery = (n: AgentNode): number => Math.max(1, Math.round(Number(n.decideEvery) || 4));

/** Engine callbacks that are also emitted as signals of the same name. */
const SIGNALS = new Set(['bodyEntered', 'bodyExited', 'animationFinished', 'onCollision', 'pressed', 'finished']);

/** Small maths helpers scripts use all the time. */
export const MATH = {
  vec: (x = 0, y = 0) => new Vec2(x, y),
  clamp: (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v)),
  /** Partway from a to b: t = 0 is a, 1 is b. */
  lerp: (a: number, b: number, t: number) => a + (b - a) * t,
  degToRad: (d: number) => (d * Math.PI) / 180,
  radToDeg: (r: number) => (r * 180) / Math.PI,
  /** A random number in [lo, hi). */
  randRange: (lo: number, hi: number) => lo + Math.random() * (hi - lo),
};
