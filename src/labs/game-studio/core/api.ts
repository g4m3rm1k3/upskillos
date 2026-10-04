// The Scene API at edit time: the calls the GUI → code log shows (ADR 8).
//
//   project.createScene('scenes/main.scene', 'Node2D', 'Main')
//   scene = project.scene('scenes/main.scene')
//   scene.add('Sprite2D', { name: 'Player', position: { x: 200, y: 150 }, texture: 'assets/player.png' })
//   scene.get('Player').position = { x: 240, y: 150 }
//
// The names and property paths are the runtime Game API's, so a line learned from
// the log works in a script. Every function here changes the project directly and
// checks its arguments; the editor's commands (core/doc.ts) call these same
// functions, which is why replaying the log gives the same project.

import type { AssetData, BrainData, NodeData, Project, PropValue, SceneData, TilesetData, Vec2 } from './types';
import { applyEdits, cellMap, rectEdits, textEdits, tilesetProblem, type CellEdit } from './tiles';
import { checkProp, isNodeType, nodeType, propDef, propsOf, propValue } from './registry';
import { expandScene, expandSceneRoot, wouldLoop } from './instances';
import { checkName, cloneWithNewIds, contains, findNode, newNode, nextId, nodeAt, parentOf, pathOf, sceneAt, uniqueName } from './project';

const same = (a: PropValue, b: PropValue) => JSON.stringify(a) === JSON.stringify(b);

// ── changes, by id (what commands use) ───────────────────────────────────

/**
 * Set a property. With the project, it also works for a node inside an instance (its id has a ":"),
 * by writing an override on the instance, and an instance's own property is stored only when it
 * differs from the source scene's.
 */
export function setProp(scene: SceneData, id: string, name: string, value: PropValue, p?: Project): void {
  if (id.includes(':')) { if (!p) throw new Error('Changing a node inside an instance needs the project'); setOverride(p, scene, id, name, value); return; }
  const n = findNode(scene, id);
  if (!n) throw new Error(`No node ${id}`);
  const def = propDef(n.type, name);
  if (!def) throw new Error(`${n.type} has no property "${name}"`);
  const bad = checkProp(def, value);
  if (bad) throw new Error(bad);
  const v = value && typeof value === 'object' ? JSON.parse(JSON.stringify(value)) as PropValue : value;   // a copy the caller cannot change later
  // An instance's baseline is its source scene's root; anything else's is the type's default.
  const base = n.instance && p && sceneAt(p, n.instance) ? propValue(n.type, expandSceneRoot(p, n.instance).props, name) : def.default;
  if (same(v, base)) delete n.props[name]; else n.props[name] = v;
}

/** Change a property of a node inside an instance: an override saved on the instance, by the node's path in it. */
export function setOverride(p: Project, scene: SceneData, id: string, name: string, value: PropValue): void {
  const view = findIn(expandScene(p, scene).root, id);
  if (!view?.inherited) throw new Error(`No node ${id}`);
  const def = propDef(view.type, name);
  if (!def) throw new Error(`${view.type} has no property "${name}"`);
  const bad = checkProp(def, value);
  if (bad) throw new Error(bad);
  const owner = findNode(scene, view.inherited.instance)!, path = view.inherited.path;
  // The value without this scene's override: the source scene's.
  const src = nodeAtPath(expandSceneRoot(p, owner.instance!), path)!;
  const base = propValue(src.type, src.props, name);
  const o = { ...(owner.overrides ?? {}) }, mine = { ...(o[path] ?? {}) };
  if (same(value, base)) delete mine[name]; else mine[name] = JSON.parse(JSON.stringify(value)) as PropValue;
  if (Object.keys(mine).length) o[path] = mine; else delete o[path];
  if (Object.keys(o).length) owner.overrides = o; else delete owner.overrides;
}

/** A node by id anywhere under `root`. */
function findIn(root: NodeData, id: string): NodeData | undefined {
  if (root.id === id) return root;
  for (const c of root.children) { const f = findIn(c, id); if (f) return f; }
  return undefined;
}

/** A node by a path of names below `root` ("" is root itself). */
function nodeAtPath(root: NodeData, path: string): NodeData | undefined {
  let cur: NodeData | undefined = root;
  for (const name of path.split('/').filter(Boolean)) { cur = cur?.children.find((c) => c.name === name); if (!cur) return undefined; }
  return cur;
}

/** Nodes from an instance belong to their scene: renaming, moving or deleting them happens there. */
function notInherited(id: string, what: string): void {
  if (id.includes(':')) throw new Error(`That node is part of an instance; ${what} it in its own scene (or change it there for every instance)`);
}

/** Put an instance of another scene into this one. */
export function addInstance(p: Project, scene: SceneData, source: string, opts: { name?: string; parent?: string; index?: number; props?: Record<string, PropValue> } = {}): NodeData {
  const src = sceneAt(p, source);
  if (!src) throw new Error(`There is no scene "${source}"`);
  if (wouldLoop(p, scene.path, source)) throw new Error(`${source} cannot go inside ${scene.path}: ${source === scene.path ? 'a scene cannot contain itself' : `it already contains ${scene.path}, so they would contain each other`}`);
  const parent = opts.parent === undefined ? scene.root : findNode(scene, opts.parent);
  if (!parent) throw new Error('No such parent');
  notInherited(parent.id, 'add to');
  const n = newNode(p, src.root.type, uniqueName(parent.children, opts.name ?? src.root.name));
  n.instance = source;
  parent.children.splice(opts.index ?? parent.children.length, 0, n);
  for (const [k, v] of Object.entries(opts.props ?? {})) setProp(scene, n.id, k, v, p);
  return n;
}

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Set the groups a node is in. */
export function setGroups(scene: SceneData, id: string, groups: string[]): void {
  notInherited(id, 'change the groups of');
  const n = findNode(scene, id);
  if (!n) throw new Error(`No node ${id}`);
  for (const g of groups) if (!IDENT.test(g)) throw new Error(`"${g}" cannot be a group name: use letters, digits and _, not starting with a digit`);
  const list = [...new Set(groups)];
  if (list.length) n.groups = list; else delete n.groups;
}

/** Connect a node's signal to a method of another node in the scene. */
export function connect(p: Project, scene: SceneData, id: string, signal: string, targetId: string, method: string): void {
  notInherited(id, 'connect the signals of');
  const n = findNode(scene, id);
  if (!n) throw new Error(`No node ${id}`);
  if (!IDENT.test(signal)) throw new Error(`"${signal}" cannot be a signal name: use letters, digits and _`);
  if (!IDENT.test(method)) throw new Error(`"${method}" cannot be a method name: use letters, digits and _`);
  if (!findIn(expandScene(p, scene).root, targetId)) throw new Error('There is no such target node in this scene');
  const list = n.connections ?? [];
  if (list.some((c) => c.signal === signal && c.target === targetId && c.method === method)) throw new Error(`${signal} is already connected to that method`);
  n.connections = [...list, { signal, target: targetId, method }];
}

export function disconnect(scene: SceneData, id: string, signal: string, targetId: string, method: string): void {
  const n = findNode(scene, id);
  if (!n?.connections) return;
  n.connections = n.connections.filter((c) => !(c.signal === signal && c.target === targetId && c.method === method));
  if (!n.connections.length) delete n.connections;
}

export function rename(scene: SceneData, id: string, wanted: string): string {
  notInherited(id, 'rename');
  const bad = checkName(wanted);
  if (bad) throw new Error(bad);
  const n = findNode(scene, id)!, parent = parentOf(scene, id);
  n.name = parent ? uniqueName(parent.children, wanted, id) : wanted;
  return n.name;
}

export function addNode(p: Project, scene: SceneData, type: string, opts: { name?: string; parent?: string; index?: number; script?: string | null; props?: Record<string, PropValue> } = {}): NodeData {
  if (!isNodeType(type) || !nodeType(type).addable) throw new Error(`Unknown node type "${type}"`);
  const parent = opts.parent === undefined ? scene.root : findNode(scene, opts.parent);
  if (!parent) throw new Error('No such parent');
  const n = newNode(p, type, uniqueName(parent.children, opts.name ?? type));
  const nameBad = checkName(n.name);
  if (nameBad) throw new Error(nameBad);
  parent.children.splice(opts.index ?? parent.children.length, 0, n);
  for (const [k, v] of Object.entries(opts.props ?? {})) setProp(scene, n.id, k, v);
  if (opts.script !== undefined) setScript(p, scene, n.id, opts.script);
  return n;
}

export function deleteNode(scene: SceneData, id: string): void {
  notInherited(id, 'delete');
  if (id === scene.root.id) throw new Error('The root of a scene cannot be deleted');
  const parent = parentOf(scene, id)!;
  const gone = parent.children.find((c) => c.id === id)!;
  parent.children = parent.children.filter((c) => c.id !== id);
  // Connections to anything deleted go with it.
  const ids = new Set<string>();
  const collect = (n: NodeData) => { ids.add(n.id); n.children.forEach(collect); };
  collect(gone);
  const isGone = (target: string) => ids.has(target) || ids.has(target.split(':')[0]);
  const prune = (n: NodeData) => { if (n.connections) { n.connections = n.connections.filter((c) => !isGone(c.target)); if (!n.connections.length) delete n.connections; } n.children.forEach(prune); };
  prune(scene.root);
}

export function reparent(scene: SceneData, id: string, newParentId: string, index?: number): void {
  notInherited(id, 'move'); notInherited(newParentId, 'add to');
  if (id === scene.root.id) throw new Error('The root of a scene cannot be moved');
  const n = findNode(scene, id)!, to = findNode(scene, newParentId);
  if (!to) throw new Error('No such parent');
  if (contains(n, newParentId)) throw new Error('A node cannot become a child of itself or of its own children');
  const from = parentOf(scene, id)!;
  const at = from.children.indexOf(n);
  from.children.splice(at, 1);
  let i = index ?? to.children.length;
  if (from === to && index !== undefined && index > at) i--;
  n.name = uniqueName(to.children, n.name);
  to.children.splice(Math.max(0, Math.min(i, to.children.length)), 0, n);
}

export function duplicate(p: Project, scene: SceneData, id: string): NodeData {
  notInherited(id, 'duplicate');
  if (id === scene.root.id) throw new Error('The root of a scene cannot be duplicated');
  const n = findNode(scene, id)!, parent = parentOf(scene, id)!;
  const copy = cloneWithNewIds(p, n);
  copy.name = uniqueName(parent.children, n.name);
  parent.children.splice(parent.children.indexOf(n) + 1, 0, copy);
  return copy;
}

export function setScript(p: Project, scene: SceneData, id: string, path: string | null): void {
  if (path !== null && !p.scripts.some((s) => s.path === path)) throw new Error(`No script "${path}" in the project`);
  findNode(scene, id)!.script = path;
}

// ── handles: the API as the log and a script write it ────────────────────

export interface NodeHandle {
  readonly id: string;
  readonly type: string;
  readonly path: string;
  name: string;
  script: string | null;
  readonly children: NodeHandle[];
  get(path: string): NodeHandle;
  reparent(parentPath: string, index?: number): void;
  delete(): void;
  duplicate(): NodeHandle;
  /** The scene it is an instance of, or null. */
  readonly instance: string | null;
  groups: string[];
  connect(signal: string, targetPath: string, method: string): void;
  disconnect(signal: string, targetPath: string, method: string): void;
  [prop: string]: unknown;
}

export function nodeHandle(p: Project, scene: SceneData, id: string): NodeHandle {
  const n = () => { const x = findNode(scene, id); if (!x) throw new Error(`That node was deleted`); return x; };
  /** The node as the game sees it: for an instance, or a node inside one, from the expanded scene. */
  const view = () => {
    const x = findNode(scene, id);
    if (x && !x.instance) return x;
    const e = findIn(expandScene(p, scene).root, id);
    if (!e) throw new Error(`That node was deleted`);
    return e;
  };
  const viewPath = () => (findNode(scene, id) ? pathOf(scene, id) : pathOf(expandScene(p, scene), id));
  const h: Record<string, unknown> = {};
  Object.defineProperties(h, {
    id: { get: () => id, enumerable: true },
    type: { get: () => view().type, enumerable: true },
    path: { get: () => viewPath(), enumerable: true },
    name: { get: () => view().name, set: (v: string) => { rename(scene, id, String(v)); }, enumerable: true },
    script: { get: () => view().script, set: (v: string | null) => setScript(p, scene, id, v), enumerable: true },
    children: { get: () => view().children.map((c) => nodeHandle(p, scene, c.id)) },
    get: { value: (path: string) => sceneHandle(p, scene).get(viewPath() === '.' ? path : `${viewPath()}/${path}`) },
    reparent: { value: (parentPath: string, index?: number) => { const to = nodeAt(scene, parentPath); if (!to) throw new Error(`No node at "${parentPath}"`); reparent(scene, id, to.id, index); } },
    delete: { value: () => deleteNode(scene, id) },
    duplicate: { value: () => nodeHandle(p, scene, duplicate(p, scene, id).id) },
    instance: { get: () => findNode(scene, id)?.instance ?? null, enumerable: true },
    groups: { get: () => [...(view().groups ?? [])], set: (v: string[]) => setGroups(scene, id, v), enumerable: true },
    connect: { value: (signal: string, targetPath: string, method: string) => { const t = sceneHandle(p, scene).get(targetPath); connect(p, scene, id, signal, t.id, method); } },
    disconnect: { value: (signal: string, targetPath: string, method: string) => { const t = sceneHandle(p, scene).get(targetPath); disconnect(scene, id, signal, t.id, method); } },
  });
  // A TileMapLayer can be painted cell by cell (the editor's brush strokes are logged as paint calls).
  if (view().type === 'TileMapLayer') {
    const cells = () => propValue('TileMapLayer', view().props, 'cells') as number[];
    const edit = (edits: CellEdit[]) => {
      for (const e of edits) if (!Array.isArray(e) || e.length !== 3 || !e.every(Number.isInteger)) throw new Error('Each cell is [x, y, tile], whole numbers (tile −1 erases)');
      setProp(scene, id, 'cells', applyEdits(cells(), edits), p);
    };
    Object.defineProperties(h, {
      getCell: { value: (x: number, y: number) => cellMap(cells()).get(`${x},${y}`) ?? -1 },
      setCell: { value: (x: number, y: number, tile: number) => edit([[x, y, tile]]) },
      paint: { value: (edits: CellEdit[]) => edit(edits) },
      fill: { value: (x: number, y: number, w: number, hgt: number, tile: number) => { if (!(w > 0 && hgt > 0)) throw new Error('fill needs a width and height of at least 1'); edit(rectEdits(x, y, x + w - 1, y + hgt - 1, tile)); } },
      fromText: { value: (rows: string[], legend: Record<string, number>, at?: { x: number; y: number }) => edit(textEdits(rows, legend, at)) },
    });
  }
  for (const def of propsOf(view().type)) {
    Object.defineProperty(h, def.name, {
      get: () => { const v = view(); return propValue(v.type, v.props, def.name); },
      set: (v: PropValue) => setProp(scene, id, def.name, v, p),
      enumerable: true,
    });
  }
  return h as NodeHandle;
}

export interface SceneHandle {
  readonly path: string;
  readonly root: NodeHandle;
  get(path: string): NodeHandle;
  add(type: string, opts?: Record<string, unknown>): NodeHandle;
  /** Put an instance of another scene here: instance('scenes/coin.scene', { name, parent, position }). */
  instance(source: string, opts?: Record<string, unknown>): NodeHandle;
}

function sceneHandle(p: Project, scene: SceneData): SceneHandle {
  return {
    get path() { return scene.path; },
    get root() { return nodeHandle(p, scene, scene.root.id); },
    get(path: string) {
      // A path into an instance ("Coin1/Sprite") is found in the expanded scene.
      const n = nodeAt(scene, path) ?? nodeAt(expandScene(p, scene), path);
      if (!n) throw new Error(`No node at "${path}" in ${scene.path}`);
      return nodeHandle(p, scene, n.id);
    },
    instance(source: string, opts: Record<string, unknown> = {}) {
      const { name, parent, index, ...props } = opts;
      const parentNode = parent === undefined || parent === '.' ? scene.root : nodeAt(scene, String(parent));
      if (!parentNode) throw new Error(`No node at "${parent}"`);
      return nodeHandle(p, scene, addInstance(p, scene, source, { name: name as string | undefined, parent: parentNode.id, index: index as number | undefined, props: props as Record<string, PropValue> }).id);
    },
    /** add(type, { name, parent: 'Path/To/Parent', index, script, ...properties }) */
    add(type: string, opts: Record<string, unknown> = {}) {
      const { name, parent, index, script, ...props } = opts;
      const parentNode = parent === undefined || parent === '.' ? scene.root : nodeAt(scene, String(parent));
      if (!parentNode) throw new Error(`No node at "${parent}"`);
      const n = addNode(p, scene, type, { name: name as string | undefined, parent: parentNode.id, index: index as number | undefined, script: script as string | null | undefined, props: props as Record<string, PropValue> });
      return nodeHandle(p, scene, n.id);
    },
  };
}

export interface SettingsPatch { width?: number; height?: number; background?: string; pixelArt?: boolean; gravity?: number }

export interface ProjectApi {
  name: string;
  /** Change the game's size or background: setSettings({ width: 640, height: 360 }). */
  setSettings(patch: SettingsPatch): void;
  createScene(path: string, rootType?: string, rootName?: string): SceneHandle;
  scene(path: string): SceneHandle;
  setMainScene(path: string): void;
  writeScript(path: string, source: string): void;
  /** Save a trained agent's brain at brains/<name>.json (Run › Train an agent… does this). Replaces one already there. */
  saveBrain(path: string, brain: Omit<BrainData, 'path'>): void;
  removeBrain(path: string): void;
  addAction(name: string, keys: string[]): void;
  setActionKeys(name: string, keys: string[]): void;
  removeAction(name: string): void;
  /** Records an imported file. Its bytes are stored separately, under the returned id. */
  importAsset(path: string, info: { kind?: 'image'; mime: string; width: number; height: number; origin?: string }): string;
  /**
   * New bytes for an image, at the same path (edited in Sprite Forge, say): every node using the path
   * shows the new picture. It gets a new id, so undo brings back the old one, whose bytes are kept.
   */
  replaceAsset(path: string, info: { mime: string; width: number; height: number; origin?: string }): string;
  /**
   * An SVG image from its source text, at assets/….svg: code can draw a picture (a card, a button, a tile) instead of
   * importing one. Replaces one already at the path (a new id, so undo brings it back). Returns the asset's id.
   */
  writeSvg(path: string, source: string): string;
  /** A new tileset file: an image cut into tiles of this size. */
  createTileset(path: string, opts: { image: string; tileWidth: number; tileHeight: number; margin?: number; spacing?: number; solid?: number[] }): TilesetHandle;
  /** An existing tileset: set its fields, e.g. project.tileset('tilesets/a.tileset').solid = [1, 2]. */
  tileset(path: string): TilesetHandle;
}

export interface TilesetHandle { readonly path: string; image: string; tileWidth: number; tileHeight: number; margin: number; spacing: number; solid: number[] }

function tilesetHandle(p: Project, path: string): TilesetHandle {
  const get = () => { const t = (p.tilesets ?? []).find((x) => x.path === path); if (!t) throw new Error(`No tileset at "${path}"`); return t; };
  const h = {} as TilesetHandle;
  Object.defineProperty(h, 'path', { get: () => path, enumerable: true });
  for (const k of ['image', 'tileWidth', 'tileHeight', 'margin', 'spacing', 'solid'] as const) {
    Object.defineProperty(h, k, {
      enumerable: true,
      get: () => { const v = get()[k]; return Array.isArray(v) ? [...v] : v; },
      set: (v: unknown) => {
        const t = get(), next = { ...t, [k]: Array.isArray(v) ? [...v].sort((a, b) => a - b) : v } as TilesetData;
        const bad = tilesetProblem(next);
        if (bad) throw new Error(bad);
        if (k === 'image' && !p.assets.some((a) => a.path === v)) throw new Error(`There is no image "${String(v)}" in the project`);
        Object.assign(t, next);
      },
    });
  }
  return h;
}

/** What is wrong with a brain's data, or null: its policy must fit its actions (a row per action, or a value per action). */
export function brainProblem(b: BrainData): string | null {
  const nA = Array.isArray(b.actions) ? b.actions.length : 0;
  if (!nA) return `${b.path}: a brain needs its actions`;
  if (!Array.isArray(b.observation)) return `${b.path}: a brain needs the names of what it sees`;
  if (b.method !== 'q' && b.method !== 'cem') return `${b.path}: the method is "q" or "cem"`;
  const pol = b.policy as { kind?: string; bins?: unknown; table?: unknown; weights?: unknown };
  if (b.method === 'q') {
    if (pol?.kind !== 'q' || !Array.isArray(pol.bins) || !Array.isArray(pol.table)) return `${b.path}: a Q brain needs bins and a table`;
    const states = (pol.bins as number[][]).reduce((n, c) => (c.length ? n * (c.length + 1) : n), 1);
    if ((pol.table as number[][]).length !== states) return `${b.path}: its bins make ${states} states, but its table has ${(pol.table as number[][]).length} rows`;
    if ((pol.table as number[][]).some((row) => !Array.isArray(row) || row.length !== nA || row.some((q) => typeof q !== 'number'))) return `${b.path}: every row of its table needs a number for each of its ${nA} actions`;
  } else if (!Array.isArray(pol?.weights) || (pol.weights as number[][]).length !== nA) return `${b.path}: a linear brain needs a row of weights for each of its ${nA} actions`;
  return null;
}

export function checkProjectPath(path: string, folder: string, ext: RegExp): string | null {
  if (!path.startsWith(`${folder}/`)) return `"${path}" must be in ${folder}/`;
  if (!ext.test(path)) return `"${path}" has the wrong extension`;
  if (/[^A-Za-z0-9_\-./]/.test(path) || path.includes('..') || path.includes('//')) return `"${path}": use letters, digits, - _ . and / only`;
  return null;
}

/**
 * What is wrong with an SVG's source, or its size in pixels. A browser draws an SVG as a picture only when its root
 * element has xmlns="http://www.w3.org/2000/svg", and the game needs width and height to know how big it is.
 */
export function svgSize(source: string): { width: number; height: number } | string {
  const root = /<svg\b([^>]*)>/.exec(source);
  if (!root) return 'An SVG image needs an <svg …> element';
  const attr = (name: string) => new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`).exec(root[1])?.[1];
  if (attr('xmlns') !== 'http://www.w3.org/2000/svg') return 'The <svg> element needs xmlns="http://www.w3.org/2000/svg", or a browser will not draw it as a picture';
  const size = (name: string) => { const v = attr(name); const m = v === undefined ? null : /^\s*(\d+(?:\.\d+)?)\s*(px)?\s*$/.exec(v); return m ? Math.round(Number(m[1])) : null; };
  const width = size('width'), height = size('height');
  if (!width || !height) return 'The <svg> element needs a width and height in pixels, such as width="100" height="140"';
  if (width > 4096 || height > 4096) return 'An SVG image can be at most 4096 pixels across';
  return { width, height };
}

export function projectApi(p: Project): ProjectApi {
  return {
    get name() { return p.name; },
    set name(v: string) { if (!String(v).trim()) throw new Error('A project needs a name'); p.name = String(v).trim(); },
    setSettings(patch) {
      for (const k of Object.keys(patch)) if (!['width', 'height', 'background', 'pixelArt', 'gravity'].includes(k)) throw new Error(`There is no setting "${k}"`);
      for (const k of ['width', 'height'] as const) {
        const v = patch[k];
        if (v !== undefined && !(Number.isInteger(v) && v >= 64 && v <= 4096)) throw new Error(`${k} must be a whole number of pixels from 64 to 4096`);
      }
      if (patch.background !== undefined && !/^#[0-9a-f]{6}$/i.test(patch.background)) throw new Error('background must be a colour like "#1d2330"');
      if (patch.pixelArt !== undefined && typeof patch.pixelArt !== 'boolean') throw new Error('pixelArt must be true or false');
      if (patch.gravity !== undefined && !(Number.isFinite(patch.gravity) && Math.abs(patch.gravity) <= 100000)) throw new Error('gravity must be a number of pixels per second per second');
      Object.assign(p.settings, patch);
    },
    createScene(path, rootType = 'Node2D', rootName) {
      const bad = checkProjectPath(path, 'scenes', /\.scene$/);
      if (bad) throw new Error(bad);
      if (sceneAt(p, path)) throw new Error(`There is already a scene at "${path}"`);
      const name = rootName ?? path.split('/').pop()!.replace(/\.scene$/, '').replace(/^./, (c) => c.toUpperCase());
      const scene: SceneData = { id: nextId(p, 's'), path, root: newNode(p, rootType, name) };
      p.scenes.push(scene);
      if (!p.settings.mainScene) p.settings.mainScene = path;
      return sceneHandle(p, scene);
    },
    scene(path) {
      const s = sceneAt(p, path);
      if (!s) throw new Error(`No scene at "${path}"`);
      return sceneHandle(p, s);
    },
    setMainScene(path) {
      if (!sceneAt(p, path)) throw new Error(`No scene at "${path}"`);
      p.settings.mainScene = path;
    },
    writeScript(path, source) {
      const bad = checkProjectPath(path, 'scripts', /\.js$/);
      if (bad) throw new Error(bad);
      const s = p.scripts.find((x) => x.path === path);
      if (s) s.source = String(source); else p.scripts.push({ path, source: String(source) });
    },
    saveBrain(path, brain) {
      const bad = checkProjectPath(path, 'brains', /\.json$/) ?? brainProblem({ path, ...brain });
      if (bad) throw new Error(bad);
      const data: BrainData = JSON.parse(JSON.stringify({ path, actions: brain.actions, observation: brain.observation, method: brain.method, policy: brain.policy, trained: brain.trained }));
      p.brains ??= [];
      const i = p.brains.findIndex((b) => b.path === path);
      if (i >= 0) p.brains[i] = data; else p.brains.push(data);
    },
    removeBrain(path) {
      if (!(p.brains ?? []).some((b) => b.path === path)) throw new Error(`No brain at "${path}"`);
      p.brains = p.brains.filter((b) => b.path !== path);
    },
    addAction(name, keys) {
      if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new Error('Action names are lower_case_with_underscores');
      if (p.input.some((a) => a.name === name)) throw new Error(`There is already an action "${name}"`);
      p.input.push({ name, keys: [...keys] });
    },
    setActionKeys(name, keys) {
      const a = p.input.find((x) => x.name === name);
      if (!a) throw new Error(`No action "${name}"`);
      a.keys = [...keys];
    },
    removeAction(name) {
      p.input = p.input.filter((a) => a.name !== name);
    },
    createTileset(path, opts) {
      p.tilesets ??= [];
      if (p.tilesets.some((t) => t.path === path)) throw new Error(`There is already a tileset at "${path}"`);
      const ts: TilesetData = { path, image: opts.image, tileWidth: opts.tileWidth, tileHeight: opts.tileHeight, margin: opts.margin ?? 0, spacing: opts.spacing ?? 0, solid: [...(opts.solid ?? [])].sort((a, b) => a - b) };
      const bad = tilesetProblem(ts);
      if (bad) throw new Error(bad);
      if (!p.assets.some((a) => a.path === ts.image)) throw new Error(`There is no image "${ts.image}" in the project: import it first`);
      p.tilesets.push(ts);
      return tilesetHandle(p, path);
    },
    tileset(path) { if (!(p.tilesets ?? []).some((t) => t.path === path)) throw new Error(`No tileset at "${path}"`); return tilesetHandle(p, path); },
    importAsset(path, info) {
      const bad = checkProjectPath(path, 'assets', /\.(png|jpe?g|webp|gif|svg)$/i);
      if (bad) throw new Error(bad);
      if (p.assets.some((a) => a.path === path)) throw new Error(`There is already an asset at "${path}"`);
      const a: AssetData = { id: nextId(p, 'a'), path, kind: info.kind ?? 'image', mime: info.mime, width: info.width, height: info.height };
      if (info.origin) a.origin = info.origin;
      p.assets.push(a);
      return a.id;
    },
    writeSvg(path, source) {
      const bad = checkProjectPath(path, 'assets', /\.svg$/);
      if (bad) throw new Error(bad);
      const text = String(source), size = svgSize(text);
      if (typeof size === 'string') throw new Error(`${path}: ${size}`);
      const a: AssetData = { id: nextId(p, 'a'), path, kind: 'image', mime: 'image/svg+xml', width: size.width, height: size.height, svg: text };
      const i = p.assets.findIndex((x) => x.path === path);
      if (i >= 0) p.assets[i] = a; else p.assets.push(a);
      return a.id;
    },
    replaceAsset(path, info) {
      const i = p.assets.findIndex((a) => a.path === path);
      if (i < 0) throw new Error(`There is no asset at "${path}"`);
      const old = p.assets[i];
      const a: AssetData = { id: nextId(p, 'a'), path, kind: old.kind, mime: info.mime, width: info.width, height: info.height };
      const origin = info.origin ?? old.origin;
      if (origin) a.origin = origin;
      p.assets[i] = a;
      return a.id;
    },
  };
}

/**
 * Run code written against the Scene API (the GUI → code log, or a user's
 * snippet) on a project. `scene` starts as the main scene, if there is one.
 */
export function runSceneCode(p: Project, code: string): void {
  const project = projectApi(p);
  // eslint-disable-next-line no-new-func
  new Function('project', 'initialScene', `"use strict";\nlet scene = initialScene;\n${code}`)(project, p.settings.mainScene ? project.scene(p.settings.mainScene) : undefined);
}
