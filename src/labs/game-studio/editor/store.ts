// The editor's state (ADR 2): the open project (a Doc, which owns the project and its
// history), plus what is only about editing: the scene on screen, the selection,
// unsaved script text, the running game and its output. React components read this
// and call its methods; none of them owns project data.

import { Doc } from '../core/doc';
import { newProject, pathOf, sceneAt, findNode, walk as walkNodes } from '../core/project';
import type { AnimationClip, NodeData, Project, PropValue, SceneData, TilesetData } from '../core/types';
import { applyClip, setKey, trackPath } from '../core/animation';
import { applyEdits, tilesetGrid, type CellEdit } from '../core/tiles';
import { expandScene } from '../core/instances';
import { matchImage, planImport, readMap } from '../core/tiled';
import { isA, propValue } from '../core/registry';
import type { FromRuntime } from '../runtime/protocol';
import { runGame, type RunningGame } from './runner';
import { checkSyntax } from '../runtime/scripts';
import * as storage from './storage';
import { starterImage, type StarterMap } from './starterLibrary';
import { taskById } from '../tasks';
import type { TaskLink } from '../tasks/links';
import type { CheckResult, GameTask, TrainingView } from '../tasks/types';
import type { GameExample } from '../examples/types';
import { mapNodeOf, mapToSceneCode, sceneToMap, type ArtMap } from '../core/artMaps';
import { gameHtmlFile, gameZip, projectZip, readProjectZip } from '../core/archive';
import { soundBytes, type SoundRecipe } from '../core/sound';
import type { DebugWidget } from '../engine/debug';
import { loadRuntimeSource } from './runner';
import type { EnvSpec } from '../ml/env';
import type { CemOptions, Generation } from '../ml/cem';
import type { QEpisode, QLive, QOptions, QTransition } from '../ml/qlearning';
import type { TrainInView } from '../runtime/protocol';
import { isLinearQ, isQPolicy, type AgentPolicy } from '../ml/policy';
import type { LinearQOptions } from '../ml/linearq';
import type { CompareConfig, CompareRun } from '../ml/compare';

import { EXAMPLES } from '../examples';
import { sendArt } from '../../../utils/artBridge.js';

/** How Run › Train an agent… trains: Q-learning (a table of values) or the cross-entropy method (a search over weights). */
export type TrainMethod = 'q' | 'cem' | 'linear-q';

export interface OutputLine { level: 'log' | 'info' | 'warn' | 'error' | 'system'; text: string; file?: string | null; line?: number | null; column?: number | null; node?: string | null }

export type Tab = { kind: 'scene' } | { kind: 'script'; path: string };

/** A class name from a node name: "player 1" → "Player1". */
export const className = (name: string): string => (name.replace(/[^A-Za-z0-9]+(.)?/g, (_m, c: string | undefined) => (c ? c.toUpperCase() : '')).replace(/^[^A-Za-z_]+/, '').replace(/^./, (c) => c.toUpperCase()) || 'MyNode');

/** A new script for a node: the lifecycle it will use, ready to fill in. */
/** Where art in another lab goes back to in Game Studio (src/utils/artBridge.js). */
export interface ArtLink { project?: string; projectName?: string; asset?: string; scene?: string; node?: string | null; place?: boolean }
export interface SpriteMessage { type: 'sprite'; name: string; doc: string; frames: { blob: Blob; width: number; height: number; duration: number }[]; tags: { name: string; from: number; to: number }[]; link?: ArtLink }
export interface MapMessage { type: 'map'; name: string; doc: string; map: ArtMap; tileset: { blob: Blob; name: string; imageWidth: number; imageHeight: number }; link?: ArtLink }
export type ArtMessage = SpriteMessage | MapMessage;

export function scriptTemplate(nodeName: string, type: string): string {
  const cls = className(nodeName);
  if (isA(type, 'CharacterBody2D')) {
    return `export default class ${cls} extends ${type} {
  speed = 200;

  physicsUpdate(dt) {
    // A direction from four input actions (Project › Input map), length at most 1.
    const direction = input.vector('move_left', 'move_right', 'move_up', 'move_down');
    this.velocity = direction.scale(this.speed);
    this.moveAndSlide();
  }
}
`;
  }
  return `export default class ${cls} extends ${type} {
  ready() {
    // Runs once, when the node and its children are in the game.
  }

  update(dt) {
    // Runs every frame. dt is the time since the last frame, in seconds.
  }
}
`;
}

export class Store {
  projectId: string | null = null;
  doc: Doc | null = null;
  sceneId: string | null = null;
  selection: string[] = [];
  /** Asset bytes and loaded images, by asset id. */
  blobs = new Map<string, Blob>();
  images = new Map<string, HTMLImageElement>();
  /** Script text being edited but not yet saved, by path. */
  buffers = new Map<string, string>();
  tabs: Tab[] = [{ kind: 'scene' }];
  tab: Tab = { kind: 'scene' };
  running: { game: RunningGame; scene: string; paused: boolean; live: Record<string, unknown> | null } | null = null;
  output: OutputLine[] = [];
  snap = true;
  /** The viewport's tool: what dragging a node does (W, E, R). */
  tool: 'move' | 'rotate' | 'scale' = 'move';
  grid = 16;
  message = '';
  /** The line to show in the script editor, after clicking an error. */
  reveal: { path: string; line: number; column: number } | null = null;
  version = 0;
  private listeners = new Set<() => void>();
  private unsubDoc: (() => void) | null = null;
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;

  subscribe = (fn: () => void): (() => void) => { this.listeners.add(fn); return () => this.listeners.delete(fn); };
  getVersion = (): number => this.version;
  changed(): void { this.version++; for (const fn of this.listeners) fn(); }
  say(msg: string): void { this.message = msg; this.changed(); }

  get project(): Project | null { return this.doc?.project ?? null; }
  get scene(): SceneData | null {
    if (!this.doc || !this.sceneId) return null;
    return this.doc.project.scenes.find((s) => s.id === this.sceneId) ?? null;
  }
  /** The scene with its instances expanded (core/instances.ts): what the tree, Inspector and viewport show. */
  get expanded(): SceneData | null {
    const s = this.scene;
    if (!s || !this.doc) return null;
    const key = `${this.version}|${s.id}`;
    if (this.expandedCache.key !== key) {
      let v: SceneData;
      try { v = expandScene(this.doc.project, s); } catch { v = s; }   // a loop: the problem report says so
      this.expandedCache = { key, value: v };
    }
    return this.expandedCache.value;
  }
  private expandedCache: { key: string; value: SceneData | null } = { key: '', value: null };

  /** The selected node as shown (a node inside an instance has an id with a ":"). */
  get selected(): NodeData | null {
    const s = this.expanded;
    return s && this.selection.length ? findNode(s, this.selection[this.selection.length - 1]) ?? null : null;
  }
  get dirty(): boolean { return !!this.doc?.dirty || [...this.buffers.keys()].some((p) => this.isScriptDirty(p)); }

  // ── projects ────────────────────────────────────────────────────────────

  private attach(id: string, doc: Doc): void {
    // A running game belongs to the old project: stop it, or it keeps playing over the new one
    // (switching while the game ran looked as if the old project would not close).
    this.stop();
    this.task = null;
    this.anim = { ...this.anim, playerId: null, clip: '', time: 0, playing: false };
    this.tileStroke = null; this.animDrag = null;
    this.unsubDoc?.();
    this.projectId = id;
    this.doc = doc;
    this.sceneId = doc.project.settings.mainScene ? sceneAt(doc.project, doc.project.settings.mainScene)!.id : doc.project.scenes[0]?.id ?? null;
    this.selection = []; this.buffers.clear(); this.tabs = [{ kind: 'scene' }]; this.tab = { kind: 'scene' }; this.output = []; this.guide = null;
    this.unsubDoc = doc.subscribe(() => {
      // Undo can remove the scene on screen or selected nodes: keep the editor's view valid.
      const scenes = doc.project.scenes;
      if (!scenes.some((s) => s.id === this.sceneId)) this.sceneId = scenes[0]?.id ?? null;
      const s = this.scene;
      // A node inside an instance (its id has a ":") is found in the expanded scene.
      let view: SceneData | null = null;
      const shown = (id: string) => { if (!id.includes(':')) return !!findNode(s!, id); try { view ??= expandScene(doc.project, s!); } catch { return false; } return !!findNode(view, id); };
      this.selection = s ? this.selection.filter(shown) : [];
      this.tabs = this.tabs.filter((t) => t.kind === 'scene' || doc.project.scripts.some((x) => x.path === t.path) || doc.project.assets.some((a) => a.path === t.path && (a.svg !== undefined || !!a.sound)));
      if (this.tab.kind === 'script' && !this.tabs.some((t) => t.kind === 'script' && t.path === (this.tab as { path: string }).path)) this.tab = { kind: 'scene' };
      this.drawSvgs();
      this.scheduleRecovery();
      if (this.task) this.scheduleCheck();
      this.changed();
    });
    this.drawSvgs();
    this.changed();
    // Art sent from Sprite Forge or Tile Mapper while no project was open goes into this one.
    if (this.inbox.length) { const waiting = this.inbox; this.inbox = []; queueMicrotask(() => { for (const m of waiting) void this.receiveArt(m); }); }
  }

  newProject(name: string): void {
    const doc = new Doc(newProject(name));
    doc.markSaved();
    this.blobs.clear(); this.images.clear();
    this.attach(storage.newProjectId(), doc);
    this.say(`New project "${name}"`);
  }

  /** The example whose guide is showing, if the project came from one. */
  guide: GameExample | null = null;

  /** The API reference entry showing beside the viewport: '' for its contents, null when it is closed. */
  reference: string | null = null;

  showReference(name = ''): void { this.reference = name; this.changed(); }

  /**
   * Start a new project from an example: its images come from the starter art, then its
   * code runs as one command, so GUI → code shows exactly how it was built.
   */
  async openExample(ex: GameExample): Promise<void> {
    this.newProject(ex.title);
    for (const path of ex.images) {
      const img = starterImage(path);
      if (!img) { this.say(`The example needs ${path}, which is not in the starter art`); return; }
      if (!(await this.importStarter(path, img.url))) return;
    }
    this.act((d) => d.runCode(`Build the example "${ex.title}"`, ex.code));
    const p = this.doc!.project;
    this.sceneId = p.scenes.find((x) => x.path === p.settings.mainScene)?.id ?? p.scenes[0]?.id ?? null;
    this.selection = [];
    this.guide = ex;
    this.say(`Opened the example "${ex.title}". It is a new project: Save keeps your own copy.`);
  }

  // ── questions: asked inside the editor, never with the browser's confirm() ──
  // A browser can be told to stop showing confirm() boxes, and then confirm() quietly answers "no":
  // switching projects silently did nothing. So the editor asks its own questions (QuestionDialog).

  question: { text: string; choices: { label: string; value: string; primary?: boolean }[]; resolve: (v: string) => void } | null = null;

  /** Ask, and wait for the answer: one of the choices' values ('cancel' if it is closed). */
  ask(text: string, choices: { label: string; value: string; primary?: boolean }[]): Promise<string> {
    this.question?.resolve('cancel');
    return new Promise((done) => {
      this.question = { text, choices, resolve: (v) => { this.question = null; this.changed(); done(v); } };
      this.changed();
    });
  }

  /** Before replacing the open project: if it has unsaved changes, ask to save it, leave it, or stay. True to go on. */
  async leaveProject(): Promise<boolean> {
    if (!this.project || !this.dirty) return true;
    const answer = await this.ask(`"${this.project.name}" has changes that are not saved.`, [
      { label: 'Save, then continue', value: 'save', primary: true },
      { label: 'Continue without saving', value: 'discard' },
      { label: 'Cancel', value: 'cancel' },
    ]);
    if (answer === 'save') { await this.save(); return !this.dirty; }
    return answer === 'discard';
  }

  // ── tasks: "Try it" from the course, and Help › Tutorials (docs/game-studio-course-plan.md) ──

  /** The task being done, its link back to the lesson, and its checks' latest results. */
  task: { def: GameTask; link: TaskLink | null; results: CheckResult[]; ran: boolean; finished: boolean; runs: TrainingView['runs']; watched: boolean; sawFinished?: boolean; saved?: string[]; stepped?: number; predictions?: { right: number; total: number }; compared?: NonNullable<TrainingView['compared']> } | null = null;
  /** The environment as typed in Run › Train an agent… (when it parses), for a task's checks. */
  trainDraft: EnvSpec | null = null;
  /** Called once when a task's every step passes (Game Studio marks the lesson's checkpoint). */
  onTaskDone: ((task: GameTask, link: TaskLink | null) => void) | null = null;
  private checker: Worker | null = null;
  private checkTimer: ReturnType<typeof setTimeout> | null = null;
  private checkId = 0;

  /** Start a task: a new project made from its start, with its task panel. */
  async startTask(id: string, link: TaskLink | null = null): Promise<boolean> {
    const def = taskById(id);
    if (!def) { this.say(`There is no task called "${id}"`); return false; }
    this.newProject(def.title);
    for (const path of def.images) {
      const img = starterImage(path);
      if (!img || !(await this.importStarter(path, img.url))) { this.say(`The task needs ${path}, which is not in the starter art`); return false; }
    }
    this.act((d) => d.runCode(`Start the task "${def.title}"`, def.start));
    const p = this.doc!.project;
    this.sceneId = p.scenes.find((x) => x.path === p.settings.mainScene)?.id ?? p.scenes[0]?.id ?? null;
    this.selection = [];
    this.guide = null;
    this.task = { def, link, results: def.steps.map(() => 'Not checked yet'), ran: false, finished: false, runs: [], watched: false };
    // A task that trains an agent starts from its own environment, not one left from earlier training.
    if (def.agent) { this.stopTraining(); this.training = { ...this.training, spec: null, generations: [], episodes: [], table: null, visits: null, policy: null, score: null, random: null, error: null, total: 0, described: null }; this.trainDraft = null; }
    this.say(`Task: ${def.title}. The steps are beside the viewport.`);
    this.scheduleCheck(0);
    return true;
  }

  /** Apply the task's solution (one undo step), for when the learner is stuck. */
  showSolution(): void {
    const t = this.task;
    if (!t) return;
    this.act((d) => d.runCode(`Show me: ${t.def.title}`, t.def.solution));
    // The solution writes scripts; open editors show the new text.
    for (const sc of this.doc?.project.scripts ?? []) this.buffers.delete(sc.path);
    this.changed();
  }

  closeTask(): void { this.task = null; this.changed(); }

  /** Check the task again soon (after edits settle). Play checks run in a worker. */
  scheduleCheck(delay = 400): void {
    if (!this.task || !this.doc) return;
    if (this.checkTimer) clearTimeout(this.checkTimer);
    this.checkTimer = setTimeout(() => {
      const t = this.task, doc = this.doc;
      if (!t || !doc) return;
      if (!this.checker) {
        this.checker = new Worker(new URL('../tasks/checker.worker.ts', import.meta.url), { type: 'module' });
        this.checker.onmessage = (e: MessageEvent<{ id: number; results: CheckResult[] }>) => {
          if (e.data.id !== this.checkId || !this.task) return;   // an older check, overtaken by a newer one
          this.task = { ...this.task, results: e.data.results };
          if (!this.task.finished && e.data.results.length && e.data.results.every((r) => r === true)) {
            this.task = { ...this.task, finished: true };
            this.onTaskDone?.(this.task.def, this.task.link);
          }
          this.changed();
        };
      }
      // Checked as typed: open scripts count with their unsaved text (Run saves them first anyway).
      const project = JSON.parse(JSON.stringify(doc.project)) as Project;
      for (const sc of project.scripts) sc.source = this.scriptText(sc.path);
      this.checker.postMessage({ id: ++this.checkId, taskId: t.def.id, project, editor: { ran: t.ran, training: { draft: this.trainDraft, runs: t.runs, watched: t.watched, saved: t.saved ?? [], stepped: t.stepped ?? 0, predictions: t.predictions ?? { right: 0, total: 0 }, compared: t.compared ?? [] } } });
    }, delay);
  }

  async openProject(id: string): Promise<void> {
    const p = await storage.loadProject(id);
    const doc = new Doc(p);
    doc.markSaved();
    this.blobs.clear(); this.images.clear();
    await Promise.all(p.assets.map(async (a) => { const b = await storage.getAsset(id, a.id); if (b) this.blobs.set(a.id, b); }));
    await this.loadImages();
    this.attach(id, doc);
    this.say(`Opened "${p.name}"`);
  }

  // ── export and import (core/archive.ts) ──────────────────────────────────

  /** Every image's bytes, by project path, for an archive. */
  private async assetBytes(): Promise<Map<string, Uint8Array>> {
    const p = this.doc!.project;
    return new Map(await Promise.all(p.assets.filter((a) => this.blobs.has(a.id)).map(async (a) => [a.path, new Uint8Array(await this.blobs.get(a.id)!.arrayBuffer())] as const)));
  }

  /** Offer a file to save (the browser's download). */
  download: (name: string, data: Blob) => void = (name, data) => {
    const a = document.createElement('a'), url = URL.createObjectURL(data);
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  private fileName(ext: string): string { return `${(this.doc?.project.name ?? 'game').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'game'}${ext}`; }

  /** The whole project as a .zip, to keep, move to another browser, or read the scripts anywhere. */
  async exportProject(): Promise<void> {
    if (!this.doc) return;
    for (const path of [...this.buffers.keys()]) if (this.isScriptDirty(path)) this.saveScript(path);
    const bytes = await this.assetBytes();
    this.download(this.fileName('.zip'), new Blob([projectZip(this.doc.project, (path) => bytes.get(path)) as BlobPart], { type: 'application/zip' }));
    this.say(`Exported the project as ${this.fileName('.zip')}: open it with Project › Import project (.zip)…`);
  }

  /**
   * The game, without the editor: a website .zip (index.html, game.js, project.json, assets/) for any
   * static host, or one .html file that opens by double-click.
   */
  async exportGame(kind: 'website' | 'html'): Promise<void> {
    if (!this.doc) return;
    for (const path of [...this.buffers.keys()]) if (this.isScriptDirty(path)) this.saveScript(path);
    try {
      const [runtime, bytes] = await Promise.all([loadRuntimeSource(), this.assetBytes()]);
      const get = (path: string) => bytes.get(path);
      if (kind === 'website') {
        const name = this.fileName('-website.zip');
        this.download(name, new Blob([gameZip(this.doc.project, runtime, get) as BlobPart], { type: 'application/zip' }));
        this.say(`Exported ${name}: unzip it onto any web host (GitHub Pages works) and open index.html there`);
      } else {
        const name = this.fileName('.html');
        this.download(name, new Blob([gameHtmlFile(this.doc.project, runtime, get)], { type: 'text/html' }));
        this.say(`Exported ${name}: it runs on its own; double-click it, or send it to someone`);
      }
    } catch (e) { this.say(`Could not export the game: ${e instanceof Error ? e.message : String(e)}`); }
  }

  /** A project .zip (from Export project) as a new project in this browser, then opened. */
  async importProject(file: File): Promise<boolean> {
    try {
      const { project, bytes } = readProjectZip(new Uint8Array(await file.arrayBuffer()));
      if (!(await this.leaveProject())) return false;
      const id = storage.newProjectId();
      for (const a of project.assets) await storage.putAsset(id, a.id, new Blob([bytes.get(a.id)! as BlobPart], { type: a.mime }));
      await storage.saveProject(id, project);
      await this.openProject(id);
      this.say(`Imported "${project.name}" from ${file.name}`);
      return true;
    } catch (e) {
      this.say(`Could not import ${file.name}: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }

  async save(): Promise<void> {
    if (!this.doc || !this.projectId) return;
    for (const path of [...this.buffers.keys()]) if (this.isScriptDirty(path)) this.saveScript(path);
    await storage.saveProject(this.projectId, this.doc.project);
    this.doc.markSaved();
    this.say(`Saved "${this.doc.project.name}"`);
  }

  private scheduleRecovery(): void {
    if (this.recoveryTimer) clearTimeout(this.recoveryTimer);
    this.recoveryTimer = setTimeout(() => { if (this.doc && this.projectId && this.doc.dirty) void storage.saveRecovery(this.projectId, this.doc.project); }, 2000);
  }

  close(): void {
    this.stop();
    this.unsubDoc?.();
    this.doc = null; this.projectId = null; this.sceneId = null; this.selection = [];
    this.changed();
  }

  // ── scenes and nodes ────────────────────────────────────────────────────

  /** A command, with any error shown instead of thrown. */
  act<T>(fn: (doc: Doc) => T): T | undefined {
    if (!this.doc) return undefined;
    try { return fn(this.doc); }
    catch (e) { this.say(e instanceof Error ? e.message : String(e)); return undefined; }
  }

  createScene(path: string, rootType = 'Node2D'): void {
    const s = this.act((d) => d.createScene(path, rootType));
    if (s) { this.sceneId = s.id; this.selection = [s.root.id]; this.changed(); }
  }

  openScene(id: string): void { this.sceneId = id; this.selection = []; this.tab = { kind: 'scene' }; this.changed(); }

  select(ids: string[]): void {
    this.selection = ids;
    // Selecting an AnimationPlayer makes it the one the Animation panel edits.
    const n = this.selected;
    if (n?.type === 'AnimationPlayer' && this.anim.playerId !== n.id) {
      const clips = propValue(n.type, n.props, 'animations') as AnimationClip[];
      this.anim = { ...this.anim, playerId: n.id, clip: clips[0]?.name ?? '', time: 0, playing: false };
    }
    this.changed();
    if (this.running) this.inspectLive();
  }

  // ── the Animation panel ────────────────────────────────────────────────
  // While it shows an animation, the viewport and Inspector show the scene as it is at the
  // playhead, and editing a property that animation has a track for sets its key at the
  // playhead instead of the node's own value. So what you see is what you edit.

  /** The AnimationPlayer the panel edits, the animation, the playhead in seconds, and whether it is previewing. */
  anim: { open: boolean; playerId: string | null; clip: string; time: number; playing: boolean } = { open: false, playerId: null, clip: '', time: 0, playing: false };
  /** A drag of an animated property: its value while dragging, before it becomes a key. */
  animDrag: { id: string; prop: string; value: PropValue } | null = null;

  get animPlayer(): NodeData | null {
    const s = this.expanded;
    const n = s && this.anim.playerId ? findNode(s, this.anim.playerId) : undefined;
    return n?.type === 'AnimationPlayer' ? n : null;
  }
  get animClips(): AnimationClip[] { const n = this.animPlayer; return n ? propValue(n.type, n.props, 'animations') as AnimationClip[] : []; }
  /** The animation the panel is showing, when it is open and the game is not running. */
  get animClip(): AnimationClip | null {
    if (!this.anim.open || this.running) return null;
    return this.animClips.find((c) => c.name === this.anim.clip) ?? null;
  }

  /** The scene as the viewport shows it: with the panel's animation applied at the playhead, and a brush stroke in progress. */
  get viewScene(): SceneData | null {
    const s = this.expanded, c = this.animClip;
    if (!s || ((!c || !this.anim.playerId) && !this.tileStroke && !this.animDrag)) return s;
    let v = c && this.anim.playerId ? applyClip(s, this.anim.playerId, c, this.anim.time) : JSON.parse(JSON.stringify(s)) as SceneData;
    if (this.animDrag) { const n = findNode(v, this.animDrag.id); if (n) n.props[this.animDrag.prop] = this.animDrag.value; }
    if (this.tileStroke) { const n = findNode(v, this.tileStroke.layerId); if (n) n.props.cells = applyEdits(propValue(n.type, n.props, 'cells') as number[], this.tileStroke.edits); }
    return v;
  }

  // ── the TileMap panel ──────────────────────────────────────────────────
  // While it is open and a TileMapLayer is selected, the viewport paints that layer with the
  // tool and tile chosen here, instead of selecting and moving nodes.

  tile: { open: boolean; tool: 'paint' | 'erase' | 'rect' | 'bucket' | 'pick'; tileId: number; collision: boolean } = { open: false, tool: 'paint', tileId: 0, collision: false };
  /** A brush stroke being made: shown in the viewport, committed as one command when the button comes up. */
  tileStroke: { layerId: string; edits: CellEdit[] } | null = null;

  /** The layer being painted, when the panel is open and the game is not running. */
  get tileLayer(): NodeData | null {
    const n = this.selected;
    return this.tile.open && !this.running && n?.type === 'TileMapLayer' ? n : null;
  }

  /** A tileset and the grid its image makes, or null when there is no such tileset. */
  tilesetInfo(path: string | null): { data: TilesetData; columns: number; rows: number; count: number } | null {
    const p = this.project, ts = path ? p?.tilesets?.find((t) => t.path === path) : undefined;
    if (!p || !ts) return null;
    const a = p.assets.find((x) => x.path === ts.image);
    return { data: ts, ...(a ? tilesetGrid(ts, a.width, a.height) : { columns: 0, rows: 0, count: 0 }) };
  }

  /** End a brush stroke: its edits (the last for each cell wins) as one command. */
  commitStroke(label = 'Paint tiles'): void {
    const st = this.tileStroke, s = this.scene;
    this.tileStroke = null;
    if (!st || !s || !st.edits.length) { this.changed(); return; }
    const last = new Map<string, CellEdit>();
    for (const e of st.edits) last.set(`${e[0]},${e[1]}`, e);
    this.act((d) => d.paintCells(s.id, st.layerId, [...last.values()], label));
  }

  /** Whether the panel's animation has a track for this node's property. */
  isAnimated(nodeId: string, prop: string): boolean {
    const s = this.expanded, c = this.animClip;
    if (!s || !c || !this.anim.playerId) return false;
    const path = trackPath(s, this.anim.playerId, nodeId);
    return path !== null && c.tracks.some((t) => t.path === path && t.property === prop);
  }

  /** Set a key at the playhead for a node's property (adding the track if needed), as one command. */
  setKeyAt(nodeId: string, prop: string, value: PropValue, label?: string): void {
    const s = this.scene, player = this.animPlayer, c = this.animClip;
    if (!s || !player || !c) return;
    const path = trackPath(this.expanded!, player.id, nodeId);
    if (path === null) { this.say('Only nodes under the AnimationPlayer\u2019s parent can be animated by it'); return; }
    const time = +this.anim.time.toFixed(4);
    const clips = setKey(this.animClips, c.name, path, prop, time, value as never);
    this.act((d) => d.setProp(s.id, player.id, 'animations', clips, label ?? `Key ${path}.${prop} at ${time} s`));
  }

  /** Change a node's property from the editor: its key at the playhead if the panel's animation animates it, else the node's own value. */
  setNodeProp(nodeId: string, prop: string, value: PropValue, label?: string): void {
    const s = this.scene;
    if (!s) return;
    if (this.isAnimated(nodeId, prop)) this.setKeyAt(nodeId, prop, value, label);
    else this.act((d) => d.setProp(s.id, nodeId, prop, value, label));
  }

  /** A drag in the viewport, as it goes: an animated property is held aside until the drag ends. */
  liveEdit(nodeId: string, prop: string, value: PropValue): void {
    if (this.isAnimated(nodeId, prop)) { this.animDrag = { id: nodeId, prop, value }; this.changed(); return; }
    this.doc!.beginLive();
    this.doc!.liveProp(this.sceneId!, nodeId, prop, value);
  }

  /** The end of a drag: one command, a key or the node's own value. */
  endLiveEdit(label: string, nodeId: string, prop: string): void {
    const held = this.animDrag;
    if (held) { this.animDrag = null; this.setKeyAt(nodeId, prop, held.value, label); this.changed(); return; }
    if (this.doc && this.sceneId) this.doc.endLive(label, this.sceneId, nodeId, [prop]);
  }

  /** Put an instance of another scene under the selected node (or the root), and select it. */
  addInstance(source: string): void {
    const s = this.scene;
    if (!s) return;
    const sel = this.selected, parent = sel && !sel.inherited ? sel.id : s.root.id;
    const n = this.act((d) => d.addInstance(s.id, source, parent));
    if (n) { this.select([n.id]); this.say(`Added an instance of ${source}`); }
  }

  /** Add a node under the selected one (or the root). */
  addNode(type: string, opts: { parentId?: string; name?: string; props?: Record<string, unknown> } = {}): NodeData | undefined {
    const s = this.scene;
    if (!s) { this.say('Create a scene first'); return undefined; }
    const parentId = opts.parentId ?? this.selected?.id ?? s.root.id;
    const n = this.act((d) => d.addNode(s.id, type, parentId, { name: opts.name, props: opts.props as never }));
    if (n) this.select([n.id]);
    return n;
  }

  // ── assets ──────────────────────────────────────────────────────────────

  /** Import an image file the user chose. */
  async importImage(file: File): Promise<string | undefined> {
    if (!this.doc) return undefined;
    const base = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+/, '') || 'image.png';
    let path = `assets/${base}`, k = 2;
    while (this.doc.project.assets.some((a) => a.path === path)) path = `assets/${base.replace(/(\.[^.]+)$/, `-${k++}$1`)}`;
    return this.addImage(path, file);
  }

  /**
   * Import files chosen together: images first, then Tiled maps (.tmx, .tmj), each using any
   * tileset files (.tsx, .tsj) chosen with it. A map becomes one command in the scene being edited.
   */
  async importFiles(files: File[]): Promise<void> {
    const isMap = (f: File) => /\.(tmx|tmj)$/i.test(f.name), isTileset = (f: File) => /\.(tsx|tsj)$/i.test(f.name);
    for (const f of files) if (!isMap(f) && !isTileset(f)) await this.importImage(f);
    const tilesets = new Map<string, string>();
    for (const f of files.filter(isTileset)) tilesets.set(f.name, await f.text());
    for (const f of files.filter(isMap)) this.importTiledMap(f.name, await f.text(), tilesets);
  }

  /** Import a Tiled map into the scene being edited (or a new scene named after it). Says what it made, or what to do. */
  importTiledMap(name: string, text: string, tilesetFiles: Map<string, string>): boolean {
    if (!this.doc) return false;
    try {
      const map = readMap(text);
      if (!this.scene) this.createScene(`scenes/${name.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_-]+/g, '_') || 'map'}.scene`);
      const s = this.scene!, before = new Set(s.root.children.map((c) => c.id));
      const p = this.doc.project;
      const plan = planImport(map, name, { tilesetFiles, findImage: (img) => matchImage(img, p.assets.map((a) => a.path)), existing: new Set((p.tilesets ?? []).map((t) => t.path)), scenePath: s.path });
      this.doc.runCode(`Import ${name}`, plan.code);
      const added = this.scene!.root.children.filter((c) => !before.has(c.id)).map((c) => c.id);
      if (added.length) this.select([added[0]]);
      this.say(`Imported ${name}: ${plan.notes.join('; ')}`);
      return true;
    } catch (e) {
      this.say(`Could not import ${name}: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }

  /** Open a Tiled sample map from the starter art: its images are added first, then the map is imported. */
  async importStarterMap(map: StarterMap): Promise<boolean> {
    for (const img of map.images) if (!(await this.importStarter(img.path, img.url))) return false;
    return this.importTiledMap(map.name, map.text, map.tilesets);
  }

  /** Add an image from the starter art. If the project already has it, that is used. */
  async importStarter(path: string, url: string): Promise<string | undefined> {
    if (!this.doc) return undefined;
    if (this.doc.project.assets.some((a) => a.path === path)) return path;
    try { return await this.addImage(path, await (await fetch(url)).blob()); }
    catch (e) { this.say(e instanceof Error ? e.message : String(e)); return undefined; }
  }

  /**
   * Check an image loads, record it in the project (a command), and store its bytes. With `replace`,
   * the image already at the path gets these bytes instead (a new id, so undo brings the old back).
   */
  private async addImage(path: string, blob: Blob, opts: { origin?: string; replace?: boolean } = {}): Promise<string | undefined> {
    if (!this.doc || !this.projectId) return undefined;
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error(`${path} is not an image this browser can read`)); i.src = url; });
      const info = { mime: blob.type || 'image/png', width: img.naturalWidth, height: img.naturalHeight, origin: opts.origin };
      const id = this.act((d) => (opts.replace ? d.replaceAsset(path, info) : d.importAsset(path, info)));
      if (!id) { URL.revokeObjectURL(url); return undefined; }
      this.blobs.set(id, blob);
      this.images.set(id, img);
      await storage.putAsset(this.projectId, id, blob);
      this.say(`${opts.replace ? 'Updated' : 'Imported'} ${path} (${img.naturalWidth} × ${img.naturalHeight})`);
      return path;
    } catch (e) {
      URL.revokeObjectURL(url);
      this.say(e instanceof Error ? e.message : String(e));
      return undefined;
    }
  }

  // ── Sprite Forge and Tile Mapper (src/utils/artBridge.js) ─────────────────

  /** Art that arrived while no project was open: it goes into the next one opened. */
  inbox: ArtMessage[] = [];
  /** Opens another lab's window (GameStudio sets it: router navigation). */
  openLab: (lab: 'sprite-forge' | 'tile-mapper') => void = () => {};

  /** A sprite or map sent from Sprite Forge or Tile Mapper. */
  async receiveArt(m: ArtMessage): Promise<void> {
    const from = m.type === 'sprite' ? 'Sprite Forge' : 'Tile Mapper';
    if (!this.doc || !this.projectId) { this.inbox.push(m); this.say(`${m.name} from ${from} is waiting: open or create a project and it goes in`); return; }
    if (this.running) this.stop();
    let link = m.link;
    if (link?.project && link.project !== this.projectId) { link = undefined; this.say(`${m.name} came from another project, so it is added to this one as new`); }
    try {
      if (m.type === 'sprite') await this.receiveSprite(m, link);
      else if (m.type === 'map') await this.receiveMap(m, link);
    } catch (e) { this.say(`Could not add ${m.name} from ${from}: ${e instanceof Error ? e.message : String(e)}`); }
  }

  private async receiveSprite(m: SpriteMessage, link: ArtLink | undefined): Promise<void> {
    const p = this.doc!.project, origin = `sprite-forge:${m.doc}`;
    // Where it goes: back where it came from (the link, or images made from the same sprite), else new paths.
    const mine = p.assets.filter((a) => a.origin === origin).map((a) => a.path);
    const back = (link?.asset && p.assets.some((a) => a.path === link.asset) ? link.asset : null) ?? mine[0] ?? null;
    const slug = m.name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'sprite';
    const free = (path: string) => !p.assets.some((a) => a.path === path) && !p.assets.some((a) => a.path.startsWith(`${path.replace(/\.png$/, '')}/`));
    const unique = (base: string, ext: string) => { let b = base; for (let k = 2; !free(`${b}${ext}`); k++) b = `${base}-${k}`; return b; };
    let paths: string[];
    if (m.frames.length === 1) paths = [back ?? `${unique(`assets/${slug}`, '.png')}.png`];
    else {
      const base = back ? back.replace(/\/\d+\.png$/, '').replace(/\.png$/, '') : unique(`assets/${slug}`, '');
      paths = m.frames.map((_, i) => `${base}/${i + 1}.png`);
    }
    const had = new Set(p.assets.map((a) => a.path)), isNew = paths.every((x) => !had.has(x));
    for (const [i, f] of m.frames.entries()) await this.addImage(paths[i], f.blob, { origin, replace: had.has(paths[i]) });
    // Made from "New sprite…": put it in the scene too, in the middle of the game area.
    const s = this.scene;
    if (isNew && link?.place && s) {
      const name = m.name.replace(/[^A-Za-z0-9_]+/g, '') || 'Sprite', at = { x: p.settings.width / 2, y: p.settings.height / 2 };
      const avg = m.frames.reduce((t, f) => t + f.duration, 0) / m.frames.length, fps = Math.max(1, Math.round(1000 / (avg || 100)));
      const anims = m.tags.length ? m.tags.map((t) => ({ name: t.name, fps, loop: true, frames: paths.slice(t.from, t.to + 1) })) : [{ name: 'default', fps, loop: true, frames: paths }];
      const n = m.frames.length === 1
        ? this.addNode('Sprite2D', { parentId: s.root.id, name, props: { texture: paths[0], position: at } })
        : this.addNode('AnimatedSprite2D', { parentId: s.root.id, name, props: { frames: anims, animation: anims[0].name, position: at } });
      if (n) this.select([n.id]);
    }
    this.say(`From Sprite Forge: ${m.frames.length === 1 ? paths[0] : `${paths.length} frames, ${paths[0]} …`}${isNew ? '' : ' (updated; Ctrl+Z puts the old picture back)'}`);
  }

  private async receiveMap(m: MapMessage, link: ArtLink | undefined): Promise<void> {
    const d = this.doc!, p = d.project;
    // The tileset's picture: one already in the project with the same bytes, else a new image.
    const bytes = new Uint8Array(await m.tileset.blob.arrayBuffer());
    let image: string | null = null;
    for (const a of p.assets) {
      const b = this.blobs.get(a.id);
      if (b && b.size === bytes.length && new Uint8Array(await b.arrayBuffer()).every((v, i) => v === bytes[i])) { image = a.path; break; }
    }
    if (!image) {
      const slug = m.tileset.name.toLowerCase().replace(/\.[a-z]+$/, '').replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'tiles';
      let path = `assets/${slug}.png`;
      for (let k = 2; p.assets.some((a) => a.path === path); k++) path = `assets/${slug}-${k}.png`;
      image = (await this.addImage(path, m.tileset.blob)) ?? null;
      if (!image) return;
    }
    // Which scene, and which node's layers: where it came from, else a new Node2D in the scene on screen.
    let scene = (link?.scene && p.scenes.find((x) => x.path === link.scene)) || this.scene;
    if (!scene) { this.createScene('scenes/main.scene'); scene = this.scene; }
    if (!scene) return;
    const parentId = link?.node && findNode(scene, link.node) ? link.node : null;
    const plan = mapToSceneCode(p, m.map, image, { scenePath: scene.path, parentId });
    const before = new Set(scene.root.children.map((c) => c.id));
    d.runCode(`From Tile Mapper: ${m.name}`, plan.code);
    const now = this.doc!.project.scenes.find((x) => x.path === scene!.path)!;
    const node = parentId ?? now.root.children.find((c) => !before.has(c.id))?.id ?? null;
    this.sceneId = now.id; this.tab = { kind: 'scene' };
    if (node) this.select([node]);
    this.say(`From Tile Mapper: ${m.name} (${plan.notes.join('; ')})${parentId ? '; Ctrl+Z puts the old map back' : ''}`);
    // Tell Tile Mapper where the map went, so sending it again updates it here.
    if (node) sendArt('tile-mapper', { type: 'linked', doc: m.doc, link: { project: this.projectId, scene: now.path, node } });
  }

  /** Open an image in Sprite Forge; what it sends back replaces this image. */
  editInSpriteForge(path: string): void {
    const a = this.doc?.project.assets.find((x) => x.path === path), blob = a && this.blobs.get(a.id);
    if (!a || !blob) { this.say(`There is no image "${path}" to edit`); return; }
    if (a.width > 128 || a.height > 128) { this.say(`Sprite Forge edits pictures up to 128 × 128 pixels; ${path} is ${a.width} × ${a.height}`); return; }
    const doc = a.origin?.startsWith('sprite-forge:') ? a.origin.slice('sprite-forge:'.length) : undefined;
    sendArt('sprite-forge', { type: 'edit-sprite', name: path.replace(/^.*\//, '').replace(/\.[^.]+$/, ''), blob, doc, link: { project: this.projectId!, projectName: this.doc!.project.name, asset: path } });
    this.openLab('sprite-forge');
  }

  /** Draw a new sprite in Sprite Forge; sent back, it is added to the project and the scene. */
  newSprite(): void {
    if (!this.doc) return;
    sendArt('sprite-forge', { type: 'new-sprite', name: 'sprite', link: { project: this.projectId!, projectName: this.doc.project.name, place: true } });
    this.openLab('sprite-forge');
  }

  /** Open a map (a TileMapLayer, or the node holding a map's layers) in Tile Mapper. */
  editInTileMapper(nodeId: string): void {
    const s = this.scene;
    if (!s || !this.doc) return;
    try {
      const out = sceneToMap(this.doc.project, s, nodeId);
      const a = this.doc.project.assets.find((x) => x.path === out.image), blob = a && this.blobs.get(a.id);
      if (!a || !blob) throw new Error(`the tileset's image ${out.image} is missing`);
      sendArt('tile-mapper', { type: 'edit-map', name: out.map.name, map: out.map, tileset: { blob, name: out.image.replace(/^.*\//, ''), imageWidth: a.width, imageHeight: a.height }, link: { project: this.projectId!, projectName: this.doc.project.name, scene: s.path, node: out.parentId } });
      if (out.notes.length) this.say(`Opened in Tile Mapper: ${out.notes.join('; ')}`);
      this.openLab('tile-mapper');
    } catch (e) { this.say(e instanceof Error ? e.message : String(e)); }
  }

  /** Whether a node can be opened in Tile Mapper (a tile layer, or the node holding a map's layers). */
  isMapNode(nodeId: string): boolean { const s = this.scene; return !!s && !!mapNodeOf(s, nodeId); }

  /** Make a new map in Tile Mapper; sent back, it goes into the scene on screen. */
  newMap(): void {
    const s = this.scene;
    if (!this.doc || !s) { this.say('Open a scene first: the map goes into it'); return; }
    sendArt('tile-mapper', { type: 'new-map', name: 'map', link: { project: this.projectId!, projectName: this.doc.project.name, scene: s.path, node: null } });
    this.openLab('tile-mapper');
  }

  /**
   * An SVG image (project.writeSvg) is its source text: give each one new to the editor its bytes and a loaded picture,
   * as an imported image has. An id's source never changes (writing again makes a new id), so each is drawn once.
   */
  private drawSvgs(): void {
    for (const a of this.doc?.project.assets ?? []) {
      // A made sound (project.writeSound): its .wav, made from its recipe. Like an SVG, a new recipe is a new id.
      if (a.sound && !this.blobs.has(a.id)) { this.blobs.set(a.id, new Blob([soundBytes(a.sound) as BlobPart], { type: 'audio/wav' })); continue; }
      if (a.svg === undefined || this.blobs.has(a.id)) continue;
      const blob = new Blob([a.svg], { type: 'image/svg+xml' }), id = a.id;
      this.blobs.set(id, blob);
      const i = new Image();
      i.onload = () => { this.images.set(id, i); this.changed(); };
      i.src = URL.createObjectURL(blob);
    }
  }

  private async loadImages(): Promise<void> {
    await Promise.all([...this.blobs].map(([id, blob]) => new Promise<void>((ok) => {
      const i = new Image(); i.onload = () => { this.images.set(id, i); ok(); }; i.onerror = () => ok(); i.src = URL.createObjectURL(blob);
    })));
  }

  /** Play a sound asset in the editor, to hear it (the ▶ beside a sound). */
  previewSound(path: string): void {
    const a = this.doc?.project.assets.find((x) => x.path === path), blob = a && this.blobs.get(a.id);
    if (!blob) { this.say(`There is no sound "${path}"`); return; }
    const audio = new Audio(URL.createObjectURL(blob));
    void audio.play().catch(() => this.say('The browser would not play the sound'));
  }

  imageFor(path: string | null): HTMLImageElement | undefined {
    const a = path ? this.doc?.project.assets.find((x) => x.path === path) : undefined;
    return a ? this.images.get(a.id) : undefined;
  }

  // ── scripts ─────────────────────────────────────────────────────────────

  // An SVG image (assets/….svg) is text too, and opens in the same editor: its saved text is the asset's source.
  // So is a made sound (assets/….wav): its text is its recipe, as JSON.
  private savedText(path: string): string | undefined {
    if (path.endsWith('.wav')) { const r = this.doc?.project.assets.find((a) => a.path === path)?.sound; return r ? `${JSON.stringify(r, null, 2)}\n` : undefined; }
    return path.endsWith('.svg') ? this.doc?.project.assets.find((a) => a.path === path)?.svg : this.doc?.project.scripts.find((s) => s.path === path)?.source;
  }
  scriptText(path: string): string { return this.buffers.get(path) ?? this.savedText(path) ?? ''; }
  isScriptDirty(path: string): boolean {
    const b = this.buffers.get(path);
    return b !== undefined && b !== this.savedText(path);
  }
  editScript(path: string, text: string): void { this.buffers.set(path, text); if (this.task) this.scheduleCheck(700); this.changed(); }
  saveScript(path: string): void {
    const b = this.buffers.get(path);
    if (b === undefined || !this.isScriptDirty(path)) return;
    if (path.endsWith('.svg')) {
      // A picture that is not a picture yet (no xmlns, no size) stays unsaved, with the reason said.
      if (this.act((d) => d.writeSvg(path, b)) === undefined) return;
    } else if (path.endsWith('.wav')) {
      // A recipe that does not read as JSON, or is not a sound yet, stays unsaved, with the reason said.
      let recipe: SoundRecipe;
      try { recipe = JSON.parse(b); } catch (e) { this.say(`${path} is not saved: ${e instanceof Error ? e.message : String(e)}`); return; }
      if (this.act((d) => d.writeSound(path, recipe)) === undefined) return;
    } else this.act((d) => d.writeScript(path, b));
    this.buffers.delete(path);
    this.changed();
  }

  /** A new sound effect, a coin's "ding" to start from, opened as its recipe. */
  newSound(stem: string): void {
    const name = stem.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
    if (!name || !this.doc) return;
    let path = `assets/${name}.wav`, k = 2;
    while (this.doc.project.assets.some((a) => a.path === path)) path = `assets/${name}_${k++}.wav`;
    const start: SoundRecipe = { wave: 'square', from: 880, to: 1760, length: 0.15, attack: 0.005, volume: 0.4 };
    if (this.act((d) => d.writeSound(path, start, `New sound ${path}`)) !== undefined) this.openScript(path);
  }

  /** Play a recipe that may not be saved yet (the sound editor's ▶). */
  hearRecipe(recipe: SoundRecipe): void {
    const audio = new Audio(URL.createObjectURL(new Blob([soundBytes(recipe) as BlobPart], { type: 'audio/wav' })));
    void audio.play().catch(() => this.say('The browser would not play the sound'));
  }

  /** A new SVG image, a plain rectangle to start from, opened as text. */
  newSvg(stem: string): void {
    // A name can have folders and capitals: cards/5H makes assets/cards/5H.svg.
    const name = stem.trim().replace(/[^A-Za-z0-9_\-/]+/g, '_').replace(/\/+/g, '/').replace(/^[_/]+|[_/]+$/g, '');
    if (!name || !this.doc) return;
    let path = `assets/${name}.svg`, k = 2;
    while (this.doc.project.assets.some((a) => a.path === path)) path = `assets/${name}_${k++}.svg`;
    const start = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140">\n  <rect x="1" y="1" width="98" height="138" rx="8" fill="white" stroke="#555555" stroke-width="2"/>\n</svg>\n`;
    if (this.act((d) => d.writeSvg(path, start, `New SVG image ${path}`)) !== undefined) this.openScript(path);
  }

  /** A new tool script (Files › New tool…): scripts/tools/<name>.js, a function of the project to run with ▶ Run tool. */
  newTool(stem: string): void {
    const name = stem.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
    if (!name || !this.doc) return;
    let path = `scripts/tools/${name}.js`, k = 2;
    while (this.doc.project.scripts.some((x) => x.path === path)) path = `scripts/tools/${name}_${k++}.js`;
    const start = `// A tool: code that builds part of the project, run from the editor with ▶ Run tool (like a Godot EditorScript).\n// project is the Scene API: the same calls the editor makes when you click (GUI → code shows them).\nexport default function (project) {\n}\n`;
    if (this.act((d) => { d.writeScript(path, start, `New tool ${path}`); return true; })) this.openScript(path);
  }

  /** Run a tool script, saved first so it runs what you see: one undoable step, project.runTool(path) in GUI → code. */
  runTool(path: string): void {
    if (!this.doc) return;
    if (this.isScriptDirty(path)) this.saveScript(path);
    const ok = this.act((d) => { d.runTool(path); return true; });
    if (ok) this.say(`Ran ${path}`);
  }

  openScript(path: string, reveal?: { line: number; column: number }): void {
    if (!this.tabs.some((t) => t.kind === 'script' && t.path === path)) this.tabs.push({ kind: 'script', path });
    this.tab = { kind: 'script', path };
    this.reveal = reveal ? { path, ...reveal } : null;
    this.changed();
  }
  closeTab(path: string): void {
    this.tabs = this.tabs.filter((t) => !(t.kind === 'script' && t.path === path));
    if (this.tab.kind === 'script' && this.tab.path === path) this.tab = { kind: 'scene' };
    this.changed();
  }

  /** Make a new script for the selected node from the template, attach it, and open it. */
  newScriptFor(nodeId: string): void {
    const s = this.scene, n = s && findNode(s, nodeId);
    if (!s || !n || !this.doc) return;
    const stem = n.name.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'script';
    let path = `scripts/${stem}.js`, k = 2;
    while (this.doc.project.scripts.some((x) => x.path === path)) path = `scripts/${stem}_${k++}.js`;
    this.act((d) => { d.writeScript(path, scriptTemplate(n.name, n.type), `New script ${path}`); d.setScript(s.id, nodeId, path); });
    this.openScript(path);
  }

  // ── running ─────────────────────────────────────────────────────────────

  async run(which: 'project' | 'scene', container: HTMLElement, opts: { agent?: boolean; train?: TrainInView } = {}): Promise<void> {
    if (!this.doc) return;
    this.watchingAgent = !!opts.agent && !!this.training.policy;
    this.trainLive = null;
    if (!opts.train) this.inView = false;
    // Scripts are saved into the project before running, so the game runs what you see.
    for (const path of [...this.buffers.keys()]) if (this.isScriptDirty(path)) this.saveScript(path);
    const p = this.doc.project;
    const scene = which === 'project' ? p.settings.mainScene : this.scene?.path;
    if (!scene) { this.say(which === 'project' ? 'Set a main scene first (Project settings)' : 'Open a scene first'); return; }
    this.stop();
    // A script that does not parse would stop the game from loading: say where, and do not start.
    const syntax = checkSyntax(p.scripts);
    if (syntax.length) {
      this.output = [{ level: 'system', text: `Not running: ${syntax.length} script${syntax.length === 1 ? ' has a' : 's have'} syntax error${syntax.length === 1 ? '' : 's'}` },
        ...syntax.map((e) => ({ level: 'error' as const, text: e.message, file: e.file, line: e.line, column: e.column }))];
      this.say('Fix the syntax error first: click it in Output to go to it');
      return;
    }
    this.output = [{ level: 'system', text: `▶ Running ${scene}` }];
    this.debugWidgets = [];
    const assets = await Promise.all(p.assets.map(async (a) => ({ path: a.path, mime: a.mime, bytes: await (this.blobs.get(a.id) ?? new Blob()).arrayBuffer() })));
    const game = await runGame({ project: p, scene, assets, container, onMessage: (m) => this.onRuntime(m), saves: this.savedGames(), ...(opts.train ? { train: opts.train } : {}) });
    this.running = { game, scene, paused: false, live: null };
    if (this.task && !this.task.ran) { this.task = { ...this.task, ran: true }; this.scheduleCheck(0); }
    if (this.task && this.watchingAgent && !this.task.watched) { this.task = { ...this.task, watched: true }; this.scheduleCheck(0); }
    this.changed();
    game.frame.focus();
  }

  // ── saved games (engine/saves.ts) ─────────────────────────────────────
  // The game's frame cannot reach browser storage, so the editor keeps each project's save slots, in this
  // page's storage under the project's id. They are not part of the project: Export does not include them.
  private savesKey(): string | null { return this.projectId ? `game-studio-saves:${this.projectId}` : null; }

  /** This project's save slots: JSON text by slot name. */
  savedGames(): Record<string, string> {
    const key = this.savesKey();
    if (!key) return {};
    try { return JSON.parse(localStorage.getItem(key) ?? '{}'); } catch { return {}; }
  }

  private keepSave(slot: string, json: string | null): void {
    const key = this.savesKey();
    if (!key) return;
    const all = this.savedGames();
    if (json === null) delete all[slot]; else all[slot] = json;
    try { localStorage.setItem(key, JSON.stringify(all)); } catch { this.say('Could not keep the saved game: this browser blocks storage'); }
  }

  /** Run › Clear saved games: every slot of this project emptied, so the game starts as if never played. */
  clearSavedGames(): void {
    const key = this.savesKey();
    const n = Object.keys(this.savedGames()).length;
    if (key) try { localStorage.removeItem(key); } catch { /* blocked: nothing kept */ }
    this.say(n ? `Cleared ${n} saved game${n === 1 ? '' : 's'}` : 'There were no saved games');
  }

  /** The running game's debug controls (the debug global), for the Debug tab. */
  debugWidgets: DebugWidget[] = [];
  /** Move a debug slider or flip a toggle in the running game. */
  setDebug(name: string, value: number | boolean): void {
    this.running?.game.send({ type: 'debugSet', name, value });
    this.debugWidgets = this.debugWidgets.map((w) => (w.name === name && (w.kind === 'slider' || w.kind === 'toggle') ? { ...w, value } as DebugWidget : w));
    this.changed();
  }
  /** Press a debug button in the running game. */
  pressDebug(name: string): void { this.running?.game.send({ type: 'debugPress', name }); }

  private onRuntime(m: FromRuntime): void {
    if (!this.running) return;
    if (m.type === 'debug') { this.debugWidgets = m.widgets; this.changed(); return; }
    if (m.type === 'save') {
      this.keepSave(m.slot, m.json);
      this.output.push({ level: 'system', text: m.json === null ? `Save slot "${m.slot}" emptied` : `Saved to slot "${m.slot}"` });
    }
    if (m.type === 'log') this.output.push({ level: m.level, text: m.text });
    else if (m.type === 'error') this.output.push({ level: 'error', text: m.message, file: m.file, line: m.line, column: m.column, node: m.node });
    else if (m.type === 'paused') this.running.paused = m.paused;
    else if (m.type === 'state') this.running.live = m.props;
    else if (m.type === 'trainStart') this.training = { ...this.training, described: { actions: m.actions, observation: m.observation, bins: m.bins }, random: m.random };
    else if (m.type === 'trainLive') this.trainLive = m.live;
    else if (m.type === 'trainTransition') { this.trainTransition = m.transition; this.trainLive = m.live; }
    else if (m.type === 'trainEpisode') {
      const e = m.episode, t = this.training;
      const ep: QEpisode = { episode: e.episode, total: e.total, epsilon: e.epsilon, visited: e.visited, steps: e.steps, ...(e.greedy === undefined ? {} : { greedy: e.greedy }) };
      this.training = { ...t, episodes: [...t.episodes, ep], table: e.table ?? t.table, visits: e.visits ?? t.visits };
    }
    else if (m.type === 'trainDone') this.trainingFinished(m.policy, m.score);
    else if (m.type === 'trainError') { this.training = { ...this.training, running: false, error: m.message }; this.trainLive = null; }
    else if (m.type === 'running') {
      this.inspectLive();
      // Watching a trained agent: it takes the controls as soon as the game is running.
      if (this.watchingAgent && this.training.spec && this.training.policy) this.running.game.send({ type: 'agent', spec: this.training.spec, policy: this.training.policy });
    }
    if (this.output.length > 500) this.output.splice(0, this.output.length - 500);
    this.changed();
  }

  // ── training an agent (ml/: a Gymnasium-style environment; Q-learning or the cross-entropy method) ─────

  training: {
    running: boolean; method: TrainMethod; spec: EnvSpec | null; random: number | null;
    /** Cross-entropy: one entry per generation. Q-learning: one per episode. */
    generations: Generation[]; episodes: QEpisode[];
    /** Q-learning: the table at the latest check (and how often each state was updated), to show while it trains. */
    table: number[][] | null; visits: number[] | null;
    policy: AgentPolicy | null; score: number | null; error: string | null; total: number;
    /** What the agent can do and sees, by name, and its bins (from the trainer: a script agent's come from its script). */
    described: { actions: string[]; observation: string[]; bins: number[][]; features?: string[] } | null;
    /** Linear Q: the weights at the latest check, to show while it trains. */
    weights?: number[] | null;
  } = { running: false, method: 'q', spec: null, random: null, generations: [], episodes: [], table: null, visits: null, policy: null, score: null, error: null, total: 0, described: null };
  /** Compare: settings, each trained over the same seeds in a worker of its own, and the runs as they finish. */
  comparison: { configs: CompareConfig[]; seeds: number[]; runs: CompareRun[]; running: boolean; error: string | null; random: number | null } = { configs: [], seeds: [1, 2, 3, 4, 5], runs: [], running: false, error: null, random: null };
  private comparer: Worker | null = null;

  /** Add a setting to the comparison (the dialog's current one), or remove one. */
  addCompareConfig(c: CompareConfig): void { this.comparison = { ...this.comparison, configs: [...this.comparison.configs, c], runs: [] }; this.changed(); }
  removeCompareConfig(i: number): void { this.comparison = { ...this.comparison, configs: this.comparison.configs.filter((_, k) => k !== i), runs: [] }; this.changed(); }
  setCompareSeeds(n: number): void { this.comparison = { ...this.comparison, seeds: Array.from({ length: Math.max(1, Math.min(30, Math.round(n))) }, (_, k) => k + 1), runs: [] }; this.changed(); }

  /** Train every setting with every seed, headless; the runs arrive one at a time. */
  startCompare(spec: EnvSpec): void {
    if (!this.doc || !this.comparison.configs.length) return;
    this.stopCompare();
    for (const path of [...this.buffers.keys()]) if (this.isScriptDirty(path)) this.saveScript(path);
    this.comparison = { ...this.comparison, runs: [], running: true, error: null, random: null };
    const w = this.comparer = new Worker(new URL('../ml/train.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent) => {
      const m = e.data as { type: string; message?: string; score?: number; actions?: string[]; observation?: string[]; bins?: number[][] } & CompareRun;
      const c = this.comparison;
      if (m.type === 'describe') this.training = { ...this.training, described: this.training.described ?? { actions: m.actions!, observation: m.observation!, bins: m.bins! } };
      else if (m.type === 'random') this.comparison = { ...c, random: m.score! };
      else if (m.type === 'compareRun') this.comparison = { ...c, runs: [...c.runs, { config: m.config, seed: m.seed, returns: m.returns, greedy: m.greedy }] };
      else if (m.type === 'compareDone') {
        this.comparison = { ...c, running: false }; this.stopCompare(false);
        if (this.task) { this.task = { ...this.task, compared: [...(this.task.compared ?? []), { options: c.configs.map((k) => k.options), seeds: c.seeds.length }] }; this.scheduleCheck(0); }
      }
      else if (m.type === 'error') { this.comparison = { ...c, running: false, error: m.message! }; this.stopCompare(false); }
      this.changed();
    };
    w.onerror = (e) => { this.comparison = { ...this.comparison, running: false, error: e.message || 'The comparison stopped' }; this.stopCompare(false); this.changed(); };
    w.postMessage({ project: JSON.parse(JSON.stringify(this.doc.project)), spec, method: 'compare', configs: this.comparison.configs, seeds: this.comparison.seeds });
    this.changed();
  }

  stopCompare(mark = true): void {
    this.comparer?.terminate(); this.comparer = null;
    if (mark && this.comparison.running) { this.comparison = { ...this.comparison, running: false }; this.changed(); }
  }

  /** The dialog's table-learning settings, kept between openings. */
  tdSettings: import('./TrainDialog').TdSettings | null = null;
  /** Train in view: what the learner in the visible game is doing now, and how fast it plays. */
  trainLive: QLive | null = null;
  trainSpeed = 4;
  /** The settings of the latest table-learning run (in the worker or in view), for a task's checks. */
  private lastOptions: QOptions | LinearQOptions | null = null;
  /** Train in view: the latest update, with every number in it, and the settings it was made with. */
  trainTransition: QTransition | null = null;
  trainOptions: QOptions | null = null;
  /** The latest training ran in view (in the game), not in the worker. */
  inView = false;
  /** The game running from "Watch it play": the trained agent holds the controls. */
  watchingAgent = false;
  private trainer: Worker | null = null;

  /** The agent spec to start from: the example's, if the project is one that has it, else a sketch to fill in. */
  defaultAgentSpec(): EnvSpec {
    const p = this.doc?.project;
    if (this.task?.def.agent) return this.task.def.agent;
    const ex = this.guide?.agent ? this.guide : EXAMPLES.find((e) => e.title === p?.name && e.agent);
    if (ex?.agent) return ex.agent;
    const scene = p?.scenes.find((x) => x.path === p.settings.mainScene);
    const body = scene ? [...walkNodes(scene.root)].find((n) => /Body2D$/.test(n.type)) : undefined;
    const name = body?.name ?? 'Player';
    return {
      actions: [[], ['move_left'], ['move_right'], ['jump']],
      observation: [{ path: `${name}:position.x`, scale: 1 / (p?.settings.width ?? 960) }, { path: `${name}:position.y`, scale: 1 / (p?.settings.height ?? 540) }],
      reward: [{ path: `${name}:position.x`, scale: 0.01 }],
      terminated: [],
      frameSkip: 4,
      maxSteps: 600,
    };
  }

  /** Train in a worker; each episode's (or generation's) scores arrive as it finishes. */
  startTraining(spec: EnvSpec, job: { method: 'q'; options: QOptions } | { method: 'cem'; options: CemOptions } | { method: 'linear-q'; options: LinearQOptions }): void {
    if (!this.doc) return;
    this.stopTraining();
    for (const path of [...this.buffers.keys()]) if (this.isScriptDirty(path)) this.saveScript(path);
    const total = job.method === 'cem' ? job.options.generations : job.options.episodes;
    this.inView = false;
    this.lastOptions = job.method === 'cem' ? null : job.options;
    this.training = { running: true, method: job.method, spec, random: null, generations: [], episodes: [], table: null, visits: null, policy: null, score: null, error: null, total, described: null };
    const w = this.trainer = new Worker(new URL('../ml/train.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent) => {
      const m = e.data as { type: string; score?: number; policy?: AgentPolicy; message?: string; actions?: string[]; observation?: string[]; bins?: number[][]; features?: string[]; weights?: number[] } & Generation & QEpisode;
      const t = this.training;
      if (m.type === 'describe') this.training = { ...t, described: { actions: m.actions!, observation: m.observation!, bins: m.bins!, features: m.features ?? [] } };
      else if (m.type === 'random') this.training = { ...t, random: m.score! };
      else if (m.type === 'generation') this.training = { ...t, generations: [...t.generations, { generation: m.generation, best: m.best, eliteMean: m.eliteMean, mean: m.mean, champion: m.champion }], policy: m.champion };
      else if (m.type === 'episode') {
        const ep: QEpisode = { episode: m.episode, total: m.total, epsilon: m.epsilon, visited: m.visited, steps: m.steps, ...(m.greedy === undefined ? {} : { greedy: m.greedy }) };
        this.training = { ...t, episodes: [...t.episodes, ep], table: m.table ?? t.table, visits: m.visits ?? t.visits, weights: m.weights ?? t.weights ?? null };
      }
      else if (m.type === 'done') { this.stopTraining(false); this.trainingFinished(m.policy!, m.score!); }
      else if (m.type === 'error') { this.training = { ...t, running: false, error: m.message! }; this.stopTraining(false); }
      this.changed();
    };
    w.onerror = (e) => { this.training = { ...this.training, running: false, error: e.message || 'The trainer stopped' }; this.stopTraining(false); this.changed(); };
    w.postMessage({ project: JSON.parse(JSON.stringify(this.doc.project)), spec, ...job });
    this.changed();
  }

  /** Training finished (in the worker, or in view): keep the policy, and tell a task's checks. */
  private trainingFinished(policy: AgentPolicy, score: number): void {
    const t = this.training;
    this.training = { ...t, running: false, policy, score, table: isQPolicy(policy) ? policy.table : t.table, visits: isQPolicy(policy) ? policy.visits ?? null : t.visits, weights: isLinearQ(policy) ? policy.weights : t.weights ?? null };
    this.trainLive = null;
    if (this.task && t.spec) { this.task = { ...this.task, runs: [...this.task.runs, { method: t.method, spec: t.spec, score, random: t.random ?? 0, ...(this.lastOptions ? { options: this.lastOptions } : {}), inView: this.inView }] }; this.scheduleCheck(0); }
    this.changed();
  }

  /** Train in view: Q-learning inside the visible game, every episode drawn. `speed` is game frames per drawn frame. */
  async trainInView(spec: EnvSpec, options: QOptions, container: HTMLElement, speed = 4): Promise<void> {
    if (!this.doc) return;
    this.stopTraining();
    this.training = { running: true, method: 'q', spec, random: null, generations: [], episodes: [], table: null, visits: null, policy: null, score: null, error: null, total: options.episodes, described: null };
    this.trainSpeed = speed;
    this.trainOptions = options;
    this.lastOptions = options;
    this.trainTransition = null;
    this.inView = true;
    await this.run('project', container, { train: { spec, options, speed } });
    this.changed();
  }

  /** Train in view: pause (if it is not paused), then play on to the next update and show it. */
  stepTraining(): void {
    const r = this.running;
    if (!r || !this.inView || !this.training.running) return;
    if (!r.paused) { r.game.send({ type: 'pause' }); r.paused = true; }
    r.game.send({ type: 'trainStep' });
    if (this.task) { this.task = { ...this.task, stepped: (this.task.stepped ?? 0) + 1 }; this.scheduleCheck(); }
    this.changed();
  }

  /** Predict's answer for one update was checked: right or not (a task can ask for a few right). */
  notePrediction(right: boolean): void {
    if (!this.task) return;
    const p = this.task.predictions ?? { right: 0, total: 0 };
    this.task = { ...this.task, predictions: { right: p.right + (right ? 1 : 0), total: p.total + 1 } };
    this.scheduleCheck(0);
  }

  /** Train in view's speed: game frames per drawn frame (1 is real time). */
  setTrainSpeed(speed: number): void {
    this.trainSpeed = speed;
    this.running?.game.send({ type: 'trainSpeed', speed });
    this.changed();
  }

  /** Save the trained agent as a brain in the project (an undo step, and a line of GUI → code). */
  saveBrain(path: string): boolean {
    const t = this.training;
    if (!this.doc || !t.policy || !t.described || t.running) { this.say('Train an agent first'); return false; }
    const ok = this.act((d) => {
      d.saveBrain(path, {
        actions: t.described!.actions, observation: t.described!.observation, method: t.method, policy: JSON.parse(JSON.stringify(t.policy)),
        trained: { steps: t.total, score: Math.round((t.score ?? 0) * 1000) / 1000, random: Math.round((t.random ?? 0) * 1000) / 1000 },
      });
      return true;
    });
    if (!ok) return false;
    this.say(t.spec?.agent ? `Saved ${path}. Give ${t.spec.agent}'s script brain = '${path}' and the game uses it.` : `Saved ${path}.`);
    if (this.task) { this.task = { ...this.task, saved: [...(this.task.saved ?? []), path] }; this.scheduleCheck(0); }
    return true;
  }

  /** The dialog's environment as typed: a task's checks look at it (adding bins, say). */
  setTrainDraft(spec: EnvSpec | null): void {
    if (JSON.stringify(spec) === JSON.stringify(this.trainDraft)) return;
    this.trainDraft = spec;
    this.scheduleCheck();
  }

  stopTraining(mark = true): void {
    this.trainer?.terminate(); this.trainer = null;
    if (mark && this.training.running) { this.training = { ...this.training, running: false }; this.changed(); }
  }

  private inspectLive(): void {
    const s = this.expanded, n = this.selected;   // the running game's tree has instances expanded too
    if (this.running && s && n) this.running.game.send({ type: 'inspect', path: pathOf(s, n.id) });
  }
  /** Ask the running game for the selected node's live values (the Inspector polls this). */
  refreshLive(): void { this.inspectLive(); }

  pause(): void { if (this.running) this.running.game.send({ type: this.running.paused ? 'resume' : 'pause' }); }
  restart(): void { if (this.running) { this.output.push({ level: 'system', text: '↻ Restart' }); this.running.game.send({ type: 'restart' }); this.changed(); } }
  /** The game running is a task's finished agent (watchFinished), not the project. */
  previewing = false;

  /**
   * A learning task's finished agent: its game, built from its code on the side (its images from the starter art, its
   * SVG images from their source), run in the game area with its trained brain. The project is not touched: ■ Stop,
   * and ▶ Run runs yours again.
   */
  async watchFinished(container: HTMLElement): Promise<void> {
    const f = this.task?.def.finished;
    if (!f) return;
    this.stop();
    try {
      const d = new Doc(newProject('The finished agent'));
      const assets: { path: string; mime: string; bytes: ArrayBuffer }[] = [];
      for (const path of f.images) {
        const img = starterImage(path);
        if (!img) throw new Error(`The finished agent needs ${path}, which is not in the starter art`);
        const blob = await (await fetch(img.url)).blob();
        const bitmap = await createImageBitmap(blob);
        d.importAsset(path, { mime: blob.type || 'image/png', width: bitmap.width, height: bitmap.height });
        assets.push({ path, mime: blob.type || 'image/png', bytes: await blob.arrayBuffer() });
      }
      d.runCode('The finished agent', f.code);
      const p = d.project;
      for (const a of p.assets) if (a.svg !== undefined) assets.push({ path: a.path, mime: a.mime, bytes: new TextEncoder().encode(a.svg).buffer as ArrayBuffer });
      for (const a of p.assets) if (a.sound) assets.push({ path: a.path, mime: a.mime, bytes: soundBytes(a.sound).buffer as ArrayBuffer });
      const scene = p.settings.mainScene;
      if (!scene) throw new Error('The finished agent has no main scene');
      this.output = [{ level: 'system', text: '▶ The finished agent: what this task builds. Your project is unchanged; ■ Stop, then ▶ Run, to run yours.' }];
      const game = await runGame({ project: p, scene, assets, container, onMessage: (m) => {
        if (m.type === 'running' && f.agent && this.running) this.running.game.send({ type: 'agent', spec: f.agent.spec, policy: f.agent.policy });
        this.onRuntime(m);
      } });
      this.running = { game, scene, paused: false, live: null };
      this.previewing = true;
      if (this.task) { this.task = { ...this.task, sawFinished: true }; }
      this.changed();
      game.frame.focus();
    } catch (e) { this.say(e instanceof Error ? e.message : String(e)); }
  }

  stop(): void {
    if (!this.running) return;
    this.running.game.stop();
    this.running = null;
    this.previewing = false;
    // Training in view stops with the game; what it learned so far is in the last table it reported.
    if (this.inView && this.training.running) this.training = { ...this.training, running: false };
    this.trainLive = null;
    this.output.push({ level: 'system', text: '■ Stopped' });
    this.changed();
  }
}
