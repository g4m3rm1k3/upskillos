// The open project and its history: every change is a command (ADR 8).
//
// A command has a label ("Move Player"), the Scene API code that makes the same
// change, and the project as it was before and after, for undo and redo. Undo
// takes the command's line out of the GUI → code log; redo puts it back, so the log
// always replays to the project as it is.
//
// Snapshots are of the whole project model (never the asset bytes, which live in
// storage). A project model is small: a scene of a thousand nodes is a few
// hundred kilobytes of JSON.

import type { BrainData, NodeData, Project, PropValue, SceneData } from './types';
import { addInstance, addNode, connect, deleteNode, disconnect, duplicate, nodeHandle as nodeHandleFor, projectApi, rename, reparent, runSceneCode, setGroups, setProp, setScript } from './api';
import { expandScene } from './instances';
import { findNode, pathOf, sceneAt } from './project';
import { isA, propDef, propValue } from './registry';
import { placeNodes } from './sceneView';
import { decompose, invert, multiply } from './math2d';

/**
 * A value as JavaScript source: vectors as { x, y }, everything else as JSON. A number
 * is written as the shortest form that reads back as exactly the same value (so
 * 0.5 shows as 0.5 and π/2 as 1.5707963267948966, all 17 digits it needs): the log must
 * replay to the same project, not merely a close one.
 */
export function lit(v: unknown): string {
  if (typeof v === 'number') {
    if (Object.is(v, -0)) return '0';
    for (let p = 1; p <= 17; p++) { const s = v.toPrecision(p); if (Number(s) === v) return String(Number(s)); }
    return String(v);
  }
  if (Array.isArray(v)) return `[${v.map(lit).join(', ')}]`;
  if (v && typeof v === 'object') return `{ ${Object.entries(v).map(([k, x]) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${lit(x)}`).join(', ')} }`;
  return JSON.stringify(v);
}

export interface LogEntry { label: string; code: string }
interface HistoryEntry { label: string; code: string; before: string; after: string; logScene: string | null }
export type DocEvent = 'change' | 'history';

export class Doc {
  project: Project;
  undoStack: HistoryEntry[] = [];
  redoStack: HistoryEntry[] = [];
  /** GUI → code: one entry per command, in order; replays to the current project. */
  log: LogEntry[] = [];
  /** The scene the log's `scene` variable refers to. */
  private logScene: string | null = null;
  private live: { before: string } | null = null;
  private savedAt: HistoryEntry | null | undefined = null;
  private listeners = new Set<(e: DocEvent) => void>();

  constructor(project: Project) {
    this.project = project;
  }

  subscribe(fn: (e: DocEvent) => void): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit(e: DocEvent) { for (const fn of this.listeners) fn(e); }

  // ── the one way to change the project ───────────────────────────────────

  /**
   * Run a change as one command. `scenePath` is the scene the code talks about (it
   * gets a `scene = project.scene(…)` line when the log is on another scene), or null
   * for project-level changes. `code` may be a function of the result, for commands whose
   * code depends on it (the name a new node ended up with). If `fn` throws, the project
   * is put back and nothing is recorded.
   */
  run<T>(label: string, scenePath: string | null, code: string | ((out: T) => string), fn: () => T): T {
    const before = this.live?.before ?? JSON.stringify(this.project);
    const logScene = this.logScene;
    let out: T;
    try { out = fn(); }
    catch (e) { this.project = JSON.parse(before); this.live = null; this.logScene = logScene; this.emit('change'); throw e; }
    const after = JSON.stringify(this.project);
    // A command that changes nothing (the same value set again) is not a step: no undo entry, no line.
    if (after === before && !this.live) { this.logScene = logScene; this.emit('change'); return out; }
    let line = typeof code === 'function' ? code(out) : code;
    if (scenePath && scenePath !== this.logScene && !line.startsWith('scene = ')) line = `scene = project.scene(${lit(scenePath)})\n${line}`;
    if (scenePath) this.logScene = scenePath;
    this.undoStack.push({ label, code: line, before, after, logScene });
    this.redoStack = [];
    this.log.push({ label, code: line });
    this.live = null;
    this.emit('change'); this.emit('history');
    return out;
  }

  undo(): boolean {
    const e = this.undoStack.pop();
    if (!e) return false;
    this.project = JSON.parse(e.before);
    this.redoStack.push(e);
    this.log.pop();
    this.logScene = e.logScene;
    this.emit('change'); this.emit('history');
    return true;
  }

  redo(): boolean {
    const e = this.redoStack.pop();
    if (!e) return false;
    this.project = JSON.parse(e.after);
    this.undoStack.push(e);
    this.log.push({ label: e.label, code: e.code });
    const m = /^scene = project\.(?:scene|createScene)\(("[^"]*")/m.exec(e.code);
    if (m) this.logScene = JSON.parse(m[1]);
    this.emit('change'); this.emit('history');
    return true;
  }

  // ── live edits: a drag updates as it goes and is one command at the end ──

  beginLive(): void { if (!this.live) this.live = { before: JSON.stringify(this.project) }; }
  /** Change a property without recording it (during a drag). Call endLive or cancelLive after. */
  liveProp(sceneId: string, id: string, name: string, value: PropValue): void {
    setProp(this.scene(sceneId), id, name, value, this.project);
    this.emit('change');
  }
  endLive(label: string, sceneId: string, id: string, props: string[]): void {
    if (!this.live) return;
    const scene = this.scene(sceneId), view = this.view(sceneId), n = findNode(view, id)!;
    const code = props.map((k) => `scene.get(${lit(pathOf(view, id))}).${k} = ${lit(propValue(n.type, n.props, k))}`).join('\n');
    if (JSON.stringify(this.project) === this.live.before) { this.live = null; return; }
    this.run(label, scene.path, code, () => undefined);
  }
  cancelLive(): void {
    if (!this.live) return;
    this.project = JSON.parse(this.live.before);
    this.live = null;
    this.emit('change');
  }

  // ── saved or not ────────────────────────────────────────────────────────

  get dirty(): boolean { return this.savedAt !== this.undoStack.at(-1) && !(this.savedAt === null && this.undoStack.length === 0); }
  markSaved(): void { this.savedAt = this.undoStack.at(-1) ?? null; this.emit('history'); }

  // ── lookups ─────────────────────────────────────────────────────────────

  scene(id: string): SceneData {
    const s = this.project.scenes.find((x) => x.id === id);
    if (!s) throw new Error(`No scene ${id}`);
    return s;
  }
  node(sceneId: string, id: string): NodeData | undefined { return findNode(this.scene(sceneId), id); }

  // ── commands ────────────────────────────────────────────────────────────

  createScene(path: string, rootType = 'Node2D', rootName?: string): SceneData {
    return this.run(`Create scene ${path}`, null, `scene = project.createScene(${[path, rootType, rootName].filter((x) => x !== undefined).map(lit).join(', ')})`, () => {
      projectApi(this.project).createScene(path, rootType, rootName);
      this.logScene = path;
      return sceneAt(this.project, path)!;
    });
  }

  addNode(sceneId: string, type: string, parentId?: string, opts: { name?: string; props?: Record<string, PropValue> } = {}): NodeData {
    const scene = this.scene(sceneId), parentPath = pathOf(scene, parentId ?? scene.root.id);
    return this.run(`Add ${type}`, scene.path, (n: NodeData) => {
      const args: Record<string, unknown> = { name: n.name, ...(parentPath !== '.' ? { parent: parentPath } : {}), ...n.props };
      return `scene.add(${lit(type)}, ${lit(args)})`;
    }, () => addNode(this.project, this.scene(sceneId), type, { parent: parentId, name: opts.name, props: opts.props }));
  }

  /** A scene with its instances expanded: what the game runs and the editor shows (core/instances.ts). */
  view(sceneId: string): SceneData { return expandScene(this.project, this.scene(sceneId)); }

  /** A node's path, found in the expanded scene, so a node inside an instance has one ("Coin1/Sprite"). */
  private pathIn(sceneId: string, id: string): string {
    const scene = this.scene(sceneId);
    return findNode(scene, id) ? pathOf(scene, id) : pathOf(this.view(sceneId), id);
  }

  setProp(sceneId: string, id: string, name: string, value: PropValue, label?: string): void {
    const scene = this.scene(sceneId);
    this.run(label ?? `Set ${name}`, scene.path, `scene.get(${lit(this.pathIn(sceneId, id))}).${name} = ${lit(value)}`, () => setProp(this.scene(sceneId), id, name, value, this.project));
  }

  /** Several properties of one node as one command (one undo step), logged as one line each. */
  setProps(sceneId: string, id: string, values: Record<string, PropValue>, label = 'Set properties'): void {
    const scene = this.scene(sceneId), at = `scene.get(${lit(this.pathIn(sceneId, id))})`;
    const code = Object.entries(values).map(([k, v]) => `${at}.${k} = ${lit(v)}`).join('\n');
    this.run(label, scene.path, code, () => { for (const [k, v] of Object.entries(values)) setProp(this.scene(sceneId), id, k, v, this.project); });
  }

  /** Put an instance of another scene into this one. */
  addInstance(sceneId: string, source: string, parentId?: string, opts: { name?: string; props?: Record<string, PropValue> } = {}): NodeData {
    const scene = this.scene(sceneId);
    const parentPath = parentId ? pathOf(scene, parentId) : '.';
    return this.run(`Add an instance of ${source}`, scene.path, (n: NodeData) => `scene.instance(${lit(source)}, ${lit({ name: n.name, ...(parentPath !== '.' ? { parent: parentPath } : {}), ...n.props })})`,
      () => addInstance(this.project, this.scene(sceneId), source, { parent: parentId, name: opts.name, props: opts.props }));
  }

  setGroups(sceneId: string, id: string, groups: string[]): void {
    const scene = this.scene(sceneId);
    this.run(`Groups of ${findNode(this.view(sceneId), id)?.name}`, scene.path, `scene.get(${lit(this.pathIn(sceneId, id))}).groups = ${lit(groups)}`, () => setGroups(this.scene(sceneId), id, groups));
  }

  /** Connect a node's signal to a method of another node (the target, by id; logged by path). */
  connect(sceneId: string, id: string, signal: string, targetId: string, method: string): void {
    const scene = this.scene(sceneId);
    this.run(`Connect ${signal}`, scene.path, `scene.get(${lit(this.pathIn(sceneId, id))}).connect(${lit(signal)}, ${lit(this.pathIn(sceneId, targetId))}, ${lit(method)})`, () => connect(this.project, this.scene(sceneId), id, signal, targetId, method));
  }

  disconnect(sceneId: string, id: string, signal: string, targetId: string, method: string): void {
    const scene = this.scene(sceneId);
    this.run(`Disconnect ${signal}`, scene.path, `scene.get(${lit(this.pathIn(sceneId, id))}).disconnect(${lit(signal)}, ${lit(this.pathIn(sceneId, targetId))}, ${lit(method)})`, () => disconnect(this.scene(sceneId), id, signal, targetId, method));
  }

  rename(sceneId: string, id: string, name: string): string {
    const scene = this.scene(sceneId);
    return this.run(`Rename to ${name}`, scene.path, `scene.get(${lit(this.pathIn(sceneId, id))}).name = ${lit(name)}`, () => rename(this.scene(sceneId), id, name));
  }

  deleteNode(sceneId: string, id: string): void {
    const scene = this.scene(sceneId);
    this.run(`Delete ${findNode(this.view(sceneId), id)?.name}`, scene.path, `scene.get(${lit(this.pathIn(sceneId, id))}).delete()`, () => deleteNode(this.scene(sceneId), id));
  }

  duplicate(sceneId: string, id: string): NodeData {
    const scene = this.scene(sceneId);
    return this.run(`Duplicate ${findNode(this.view(sceneId), id)?.name}`, scene.path, `scene.get(${lit(this.pathIn(sceneId, id))}).duplicate()`, () => duplicate(this.project, this.scene(sceneId), id));
  }

  /**
   * Move a node under another. It stays where it is on screen (as in Godot's editor):
   * its position, rotation and scale are recalculated relative to the new parent, and
   * the log shows those changes too, so replaying it gives the same result.
   */
  reparent(sceneId: string, id: string, newParentId: string, index?: number): void {
    const scene = this.scene(sceneId);
    const args = [pathOf(scene, newParentId), ...(index !== undefined ? [index] : [])].map(lit).join(', ');
    const oldPath = this.pathIn(sceneId, id);
    const worldBefore = placeNodes(scene).find((p) => p.node.id === id)!.world;
    this.run(`Move ${findNode(scene, id)?.name}`, scene.path, () => {
      const s = this.scene(sceneId), n = findNode(s, id)!, path = pathOf(s, id);
      const lines = [`scene.get(${lit(oldPath)}).reparent(${args})`];
      for (const k of ['position', 'rotation', 'scale']) if (k in n.props || isA(n.type, 'Node2D')) {
        const v = propValue(n.type, n.props, k), d = propDef(n.type, k);
        if (d && JSON.stringify(v) !== JSON.stringify(d.default)) lines.push(`scene.get(${lit(path)}).${k} = ${lit(v)}`);
      }
      return lines.join('\n');
    }, () => {
      const s = this.scene(sceneId);
      reparent(s, id, newParentId, index);
      const n = findNode(s, id)!;
      if (!isA(n.type, 'Node2D')) return;
      // Keep the world placement: local = (new parent's world)⁻¹ · (the old world transform).
      const parentWorld = placeNodes(s).find((p) => p.node.id === id)!.parentWorld;
      const t = decompose(multiply(invert(parentWorld), worldBefore));
      const r4 = (x: number) => +x.toFixed(4);
      setProp(s, id, 'position', { x: r4(t.position.x), y: r4(t.position.y) });
      setProp(s, id, 'rotation', r4(t.rotation));
      setProp(s, id, 'scale', { x: r4(t.scale.x), y: r4(t.scale.y) });
    });
  }

  setScript(sceneId: string, id: string, path: string | null): void {
    const scene = this.scene(sceneId);
    this.run(path ? `Attach ${path}` : 'Detach script', scene.path, `scene.get(${lit(this.pathIn(sceneId, id))}).script = ${lit(path)}`, () => setScript(this.project, this.scene(sceneId), id, path));
  }

  writeScript(path: string, source: string, label = `Save ${path}`): void {
    this.run(label, null, `project.writeScript(${lit(path)}, ${lit(source)})`, () => projectApi(this.project).writeScript(path, source));
  }

  /** An SVG image from its source text (see ProjectApi.writeSvg). Returns its id. */
  writeSvg(path: string, source: string, label = `Save ${path}`): string {
    return this.run(label, null, `project.writeSvg(${lit(path)}, ${lit(source)})`, () => projectApi(this.project).writeSvg(path, source));
  }

  /** Save a trained agent's brain (Run › Train an agent… › Save as brain). */
  saveBrain(path: string, brain: Omit<BrainData, 'path'>): void {
    this.run(`Save brain ${path}`, null, `project.saveBrain(${lit(path)}, ${lit(brain)})`, () => projectApi(this.project).saveBrain(path, brain));
  }

  removeBrain(path: string): void {
    this.run(`Delete brain ${path}`, null, `project.removeBrain(${lit(path)})`, () => projectApi(this.project).removeBrain(path));
  }

  createTileset(path: string, opts: { image: string; tileWidth: number; tileHeight: number; margin?: number; spacing?: number; solid?: number[] }): void {
    this.run(`New tileset ${path}`, null, `project.createTileset(${lit(path)}, ${lit(opts)})`, () => { projectApi(this.project).createTileset(path, opts); });
  }

  /** Change one field of a tileset: its image, tile size, margin, spacing, or which tiles are solid. */
  setTileset(path: string, field: 'image' | 'tileWidth' | 'tileHeight' | 'margin' | 'spacing' | 'solid', value: unknown, label = `Edit ${path}`): void {
    this.run(label, null, `project.tileset(${lit(path)}).${field} = ${lit(value)}`, () => { (projectApi(this.project).tileset(path) as unknown as Record<string, unknown>)[field] = value; });
  }

  /** Paint cells of a TileMapLayer (tile −1 erases): one brush stroke, one command. */
  paintCells(sceneId: string, id: string, edits: [number, number, number][], label = 'Paint tiles'): void {
    const scene = this.scene(sceneId);
    this.run(label, scene.path, `scene.get(${lit(this.pathIn(sceneId, id))}).paint(${lit(edits)})`, () => { (nodeHandleFor(this.project, this.scene(sceneId), id) as unknown as { paint: (e: unknown) => void }).paint(edits); });
  }

  importAsset(path: string, info: { mime: string; width: number; height: number; origin?: string }): string {
    const i = { mime: info.mime, width: info.width, height: info.height, ...(info.origin ? { origin: info.origin } : {}) };
    return this.run(`Import ${path}`, null, `project.importAsset(${lit(path)}, ${lit(i)})`, () => projectApi(this.project).importAsset(path, i));
  }

  /** New bytes for an image at the same path (see ProjectApi.replaceAsset). Returns the new id. */
  replaceAsset(path: string, info: { mime: string; width: number; height: number; origin?: string }, label = `Update ${path}`): string {
    const i = { mime: info.mime, width: info.width, height: info.height, ...(info.origin ? { origin: info.origin } : {}) };
    return this.run(label, null, `project.replaceAsset(${lit(path)}, ${lit(i)})`, () => projectApi(this.project).replaceAsset(path, i));
  }

  setMainScene(path: string): void {
    this.run(`Main scene: ${path}`, null, `project.setMainScene(${lit(path)})`, () => projectApi(this.project).setMainScene(path));
  }

  /**
   * Run a block of Scene API code as one command: an example's build, or code a user
   * pastes. It goes into the log as it is, inside { } so its own variables stay local,
   * and replays like any other line.
   */
  runCode(label: string, code: string): void {
    this.run(label, null, `{\n${code.trim()}\n}`, () => runSceneCode(this.project, code));
    // The block may have left `scene` on any scene, so the next command names its scene again.
    this.logScene = null;
  }

  setProjectName(name: string): void {
    this.run('Rename project', null, `project.name = ${lit(name)}`, () => { projectApi(this.project).name = name; });
  }

  setSettings(patch: { width?: number; height?: number; background?: string; pixelArt?: boolean; gravity?: number }): void {
    this.run('Project settings', null, `project.setSettings(${lit(patch)})`, () => projectApi(this.project).setSettings(patch));
  }

  addAction(name: string, keys: string[]): void {
    this.run(`Add action ${name}`, null, `project.addAction(${lit(name)}, ${lit(keys)})`, () => projectApi(this.project).addAction(name, keys));
  }

  setActionKeys(name: string, keys: string[]): void {
    this.run(`Keys for ${name}`, null, `project.setActionKeys(${lit(name)}, ${lit(keys)})`, () => projectApi(this.project).setActionKeys(name, keys));
  }

  removeAction(name: string): void {
    this.run(`Remove action ${name}`, null, `project.removeAction(${lit(name)})`, () => projectApi(this.project).removeAction(name));
  }
}
