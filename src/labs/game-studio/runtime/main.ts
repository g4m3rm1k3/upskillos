// The game's iframe (ADR 3). Built into one self-contained script
// (vite.game-runtime.config.js) that the editor writes into a sandboxed iframe,
// and that an exported game runs as it is.
//
// It waits for a `load` message with the project, turns the assets into textures,
// loads the scripts as modules, builds the engine's node tree and runs it inside a
// Phaser scene. Logs and errors go back to the editor; nothing goes back into the
// project.

import * as Phaser from 'phaser';
import { Game, MATH, scriptGlobals, type AudioOut, type ScriptError } from '../engine/game';
import { memoryStore, type SaveStore } from '../engine/saves';
import { NODE_CLASSES, Node, nodeTypeOf } from '../engine/nodes';
import { Vec2 } from '../engine/vec2';
import { sceneAt } from '../core/project';
import { propsOf } from '../core/registry';
import { CHANNEL, type FromRuntime, type LogLevel, type ToRuntime, type TrainInView } from './protocol';
import { loadScripts, locate, type LoadedScripts } from './scripts';
import { PhaserRenderer } from './phaserRenderer';
import { GameEnv, observeGame, pressAction, type EnvSpec } from '../ml/env';
import { evaluate } from '../ml/cem';
import { QLearner, evaluateQ, type QTransition } from '../ml/qlearning';
import { overlayItems } from '../ml/overlay';
import { isQPolicy } from '../ml/brain';
import type { DrawItem, Renderer, View } from '../engine/game';
import { actPolicy, type AgentPolicy } from '../ml/policy';

const send = (m: FromRuntime) => parent.postMessage({ channel: CHANNEL, ...m }, '*');

// ── console and uncaught errors go to the editor's Output ─────────────────
const fmt = (a: unknown): string => {
  if (typeof a === 'string') return a;
  if (a instanceof Error) return a.message;
  try { return JSON.stringify(a); } catch { return String(a); }
};
for (const level of ['log', 'info', 'warn', 'error'] as LogLevel[]) {
  const orig = console[level].bind(console);
  console[level] = (...args: unknown[]) => { orig(...args); send({ type: 'log', level, text: args.map(fmt).join(' ') }); };
}

let scripts: LoadedScripts | null = null;
const report = (e: { message: string; stack?: string; file?: string | null }, node: string | null, phase: string | null) => {
  const where = scripts && e.stack ? locate(e.stack, scripts.sourceName) : null;
  send({ type: 'error', message: e.message, file: where?.file ?? e.file ?? null, line: where?.line ?? null, column: where?.column ?? null, node, phase });
};
addEventListener('error', (ev) => { report(ev.error ?? { message: ev.message }, null, null); ev.preventDefault(); });
addEventListener('unhandledrejection', (ev) => { const r = ev.reason; report(r instanceof Error ? r : { message: String(r) }, null, null); ev.preventDefault(); });

// ── running ───────────────────────────────────────────────────────────────
let phaser: Phaser.Game | null = null;
let game: Game | null = null;
let lastLoad: Extract<ToRuntime, { type: 'load' }> | null = null;
let paused = false;
/** The save slots, made at the first load and kept through restarts (engine/saves.ts). */
let saves: SaveStore | null = null;

/** An exported game keeps its slots in its own page's storage, under the game's name. If that storage is
 *  blocked (a private window), the slots last only while the page is open. */
function pageStore(name: string): SaveStore {
  const key = `game-studio-saves:${name}`;
  let initial: Record<string, string> = {};
  try { initial = JSON.parse(localStorage.getItem(key) ?? '{}'); } catch { /* none, or blocked */ }
  const store = memoryStore(initial, () => {
    try { localStorage.setItem(key, JSON.stringify(Object.fromEntries(store.list().map((s) => [s, store.get(s)!])))); } catch { /* blocked: memory only */ }
  });
  return store;
}

async function start(msg: Extract<ToRuntime, { type: 'load' }>): Promise<void> {
  lastLoad = msg;
  phaser?.destroy(true);
  phaser = null; game = null; paused = false; trainer = null;
  const { project } = msg;
  // In the editor, slots come with the load and every change goes back to it; standing alone, the page keeps them.
  saves ??= window.parent === window ? pageStore(project.name) : memoryStore(msg.saves ?? {}, (slot, json) => send({ type: 'save', slot, json }));
  const scene = sceneAt(project, msg.scene);
  if (!scene) { report({ message: `There is no scene "${msg.scene}"` }, null, null); return; }

  // A script's `class … extends CharacterBody2D` runs when the module loads, so the classes must be there first.
  Object.assign(globalThis, NODE_CLASSES, { Vec2, math: MATH });
  try { scripts = await loadScripts(project.scripts); }
  catch (e) {
    const err = e as Error & { file?: string; line?: number; column?: number };
    if (err.line) send({ type: 'error', message: err.message, file: err.file ?? null, line: err.line, column: err.column ?? 1, node: null, phase: 'load' });
    else report(err, null, 'load');
    return;
  }

  const urls = new Map(msg.assets.map((a) => [a.path, URL.createObjectURL(new Blob([a.bytes], { type: a.mime }))]));
  const sounds = new Set(msg.assets.filter((a) => a.mime.startsWith('audio/')).map((a) => a.path));
  const onError = (e: ScriptError) => report({ message: e.message, stack: e.stack, file: e.file }, e.node, e.phase);

  const s = project.settings;
  const scenes = class extends Phaser.Scene {
    preload() {
      this.load.on('loaderror', (file: Phaser.Loader.File) => console.warn(`Could not load ${file.key}: the browser could not read it`));
      for (const [path, url] of urls) if (sounds.has(path)) this.load.audio(path, url); else this.load.image(path, url);
    }
    create() {
      const classes = scripts!.classes;
      if (msg.train) { void startTraining(this, msg.train, project, classes); return; }
      try {
        const real = new PhaserRenderer(this);
        // Watching a trained agent on a grid: its table is drawn over the game.
        const renderer: Renderer = { frame: (items, view) => {
          const o = agent?.spec.overlay, p = agent?.policy;
          real.frame(o && p && isQPolicy(p) ? [...items, ...overlayItems(o, p.table, p.visits)] : items, view);
        } };
        game = new Game(project, scene!, renderer, {
          scriptClass: (path) => { const c = classes.get(path); return typeof c === 'function' ? (c as typeof Node) : undefined; },
          onError,
          saves: saves!,
          audio: phaserAudio(this),
        });
      } catch (e) { report(e as Error, null, 'build'); return; }
      Object.assign(globalThis, scriptGlobals(game));
      if (agent?.spec.agent) game.setAgentPolicy(agent.spec.agent, agent.policy);   // still watching after a restart
      game.start();
      send({ type: 'running', scene: scene!.path });
    }
    update(_time: number, delta: number) {
      if (trainer) { if (!paused) trainFrame(); return; }
      if (game && !paused) { if (agent) drive(game); game.step(Math.min(delta / 1000, 0.25)); }
    }
  };
  phaser = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: s.width, height: s.height, backgroundColor: s.background,
    scene: scenes, banner: false, input: { keyboard: false }, pixelArt: s.pixelArt !== false, roundPixels: s.pixelArt !== false,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  });
}

/** Sounds played with Phaser's sound manager: one Phaser sound per play, gone when it ends or is stopped. Browsers
 *  only start audio after the player has clicked or pressed a key in the game, so a sound before that is silent. */
function phaserAudio(scene: Phaser.Scene): AudioOut {
  const playing = new Map<number, Phaser.Sound.BaseSound>();
  return {
    play(id, stream, o) {
      if (!scene.cache.audio.exists(stream)) { console.warn(`Could not play ${stream}: it did not load`); return; }
      const s = scene.sound.add(stream, { volume: o.volume, rate: o.pitch, loop: o.loop });
      s.once('complete', () => { playing.delete(id); s.destroy(); });
      playing.set(id, s);
      s.play();
    },
    stop(id) { const s = playing.get(id); if (s) { playing.delete(id); s.stop(); s.destroy(); } },
  };
}

// ── Train in view: Q-learning inside the visible game (ml/qlearning.ts) ───
// The learner is the one Train an agent's worker runs, one tick at a time; here it gets a few ticks per drawn frame,
// as many game frames as the speed allows, and only the last of them is drawn. Random play's score and the final
// score are measured headless first and last, so the view shows only training.
interface Trainer { env: GameEnv; learner: QLearner; buffer: BufferedRenderer; real: PhaserRenderer; speed: number; credit: number; lastLive: number; finishing: boolean; headless: GameEnv; last: QTransition | null; sent: QTransition | null }
let trainer: Trainer | null = null;

/** Keeps only the last frame a burst of game steps draws, for the real renderer to show once. */
class BufferedRenderer implements Renderer {
  last: [DrawItem[], View] | null = null;
  frame(items: DrawItem[], view: View): void { this.last = [items, view]; }
}

async function startTraining(scene: Phaser.Scene, t: TrainInView, project: Extract<ToRuntime, { type: 'load' }>['project'], classes: Map<string, unknown>): Promise<void> {
  const load = async () => classes;
  const buffer = new BufferedRenderer(), real = new PhaserRenderer(scene);
  try {
    const headless = await GameEnv.create(project, t.spec, load);
    const random = evaluate(headless, 'random', headless.turnBased ? 100 : 3, 7);
    const env = await GameEnv.create(project, t.spec, load, { renderer: buffer });
    trainer = { env, learner: new QLearner(env, t.options), buffer, real, speed: t.speed, credit: 0, lastLive: 0, finishing: false, headless, last: null, sent: null };
    send({ type: 'trainStart', actions: env.actionNames, observation: env.observationNames, bins: env.bins, random });
    send({ type: 'running', scene: lastLoad!.scene });
  } catch (e) { send({ type: 'trainError', message: e instanceof Error ? e.message : String(e) }); }
}

function trainFrame(): void {
  const t = trainer!;
  if (t.finishing) return;
  // Each tick plays frameSkip game frames (a reset plays none); `speed` game frames are allowed per drawn frame.
  t.credit += t.speed;
  const began = performance.now();
  try {
    while (t.credit >= 1 && performance.now() - began < 14) {
      const before = t.learner.live.mode;
      tickOnce(t);
      t.credit -= before === 'reset' ? 1 : t.env.frameSkip;
      if (t.finishing) break;
    }
  } catch (e) { t.finishing = true; send({ type: 'trainError', message: e instanceof Error ? e.message : String(e) }); }
  if (t.credit > 4 * t.speed + 8) t.credit = 0;   // a slow machine does not pile up debt
  drawTraining(t);
  const now = performance.now();
  if (now - t.lastLive > 150) {
    t.lastLive = now;
    send({ type: 'trainLive', live: t.learner.live });
    if (t.last && t.last !== t.sent) { t.sent = t.last; send({ type: 'trainTransition', transition: t.last, live: t.learner.live }); }
  }
}

/** One tick of the learner, and what it reports, sent on to the editor. */
function tickOnce(t: Trainer): void {
  const out = t.learner.tick();
  game = t.env.running;   // the Inspector shows the episode being played
  if (out.transition) t.last = out.transition;
  if (out.episode) send({ type: 'trainEpisode', episode: out.episode });
  if (out.policy) {
    t.finishing = true;
    const score = evaluateQ(t.headless, out.policy, t.headless.turnBased ? 100 : 3, 7);
    send({ type: 'trainDone', policy: out.policy, score });
  }
}

/** Paused, one update at a time: play on to the next update (through any reset or check), draw it and report it. */
function stepTraining(): void {
  const t = trainer;
  if (!t || t.finishing) return;
  const before = t.last;
  try { for (let k = 0; k < 100000 && t.last === before && !t.finishing; k++) tickOnce(t); }
  catch (e) { t.finishing = true; send({ type: 'trainError', message: e instanceof Error ? e.message : String(e) }); return; }
  drawTraining(t);
  send({ type: 'trainLive', live: t.learner.live });
  if (t.last && t.last !== before) { t.sent = t.last; send({ type: 'trainTransition', transition: t.last, live: t.learner.live }); }
}

/** Draw the last frame the learner's game drew, with the table over it when the spec asks. */
function drawTraining(t: Trainer): void {
  if (t.buffer.last) {
    const [items, view] = t.buffer.last;
    const o = t.env.spec.overlay;
    if (o) { const q = t.learner.snapshot(); t.real.frame([...items, ...overlayItems(o, q.table, q.visits)], view); }
    else t.real.frame(items, view);
    t.buffer.last = null;
  }
}

// ── a trained agent playing (ml/) ─────────────────────────────────────────
// Every frameSkip frames it reads the same numbers it was trained on and holds the keys of its action,
// as GameEnv.step does in training.
let agent: { spec: EnvSpec; policy: AgentPolicy; frame: number; held: string[] } | null = null;
function drive(g: Game): void {
  const a = agent!;
  if (a.spec.agent) return;   // a script agent: the engine drives it (setAgentPolicy)
  if (a.frame++ % (a.spec.frameSkip ?? 4) !== 0) return;
  const action = a.spec.actions?.[actPolicy(a.policy, observeGame(g, a.spec))] ?? [];
  pressAction(g, lastLoad!.project.input, a.held, action);
  a.held = action;
}

// Keys go to the engine's input map. Phaser's own keyboard is off: scripts use actions.
window.addEventListener('keydown', (e) => { if (trainer) return; game?.input.key(e.code, true); if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); });
window.addEventListener('keyup', (e) => { if (!trainer) game?.input.key(e.code, false); });
window.addEventListener('blur', () => game?.input.releaseAll());
// The pointer, in the game's pixels (the canvas is scaled to fit), and its buttons as the keys MouseLeft and MouseRight.
const pointerAt = (e: PointerEvent) => {
  const c = phaser?.canvas, s = lastLoad?.project.settings;
  if (!c || !s || !game) return false;
  const r = c.getBoundingClientRect();
  game.input._move((e.clientX - r.left) * s.width / r.width, (e.clientY - r.top) * s.height / r.height);
  return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
};
const BUTTONS = ['MouseLeft', 'MouseMiddle', 'MouseRight'];
window.addEventListener('pointermove', (e) => { if (!trainer) pointerAt(e); });
window.addEventListener('pointerdown', (e) => { if (!trainer && pointerAt(e) && BUTTONS[e.button]) game!.input.key(BUTTONS[e.button], true); });
window.addEventListener('pointerup', (e) => { if (!trainer) { pointerAt(e); if (BUTTONS[e.button]) game?.input.key(BUTTONS[e.button], false); } });
window.addEventListener('contextmenu', (e) => e.preventDefault());

/** The live values of a node's registered properties, for the Inspector while running. */
function inspect(path: string): Record<string, unknown> | null {
  const n = game?.root.find(path);
  if (!n) return null;
  const out: Record<string, unknown> = {};
  for (const def of propsOf(nodeTypeOf(n))) {
    const v = (n as unknown as Record<string, unknown>)[def.name];
    out[def.name] = v && typeof v === 'object' ? { x: (v as { x: number }).x, y: (v as { y: number }).y } : v;
  }
  return out;
}

addEventListener('message', (ev: MessageEvent) => {
  const m = ev.data as ToRuntime & { channel?: string };
  if (m?.channel !== CHANNEL) return;
  if (m.type === 'load') void start(m);
  else if (m.type === 'pause' || m.type === 'resume') { paused = m.type === 'pause'; game?.input.releaseAll(); send({ type: 'paused', paused }); }
  else if (m.type === 'restart' && lastLoad) void start(lastLoad);
  else if (m.type === 'trainSpeed') { if (trainer) trainer.speed = Math.max(1, m.speed); }
  else if (m.type === 'trainStep') stepTraining();
  else if (m.type === 'inspect') send({ type: 'state', path: m.path, props: inspect(m.path) });
  else if (m.type === 'agent') {
    if (agent && game) { pressAction(game, lastLoad!.project.input, agent.held, []); if (agent.spec.agent) game.setAgentPolicy(agent.spec.agent, null); }
    agent = m.policy ? { spec: m.spec, policy: m.policy, frame: 0, held: [] } : null;
    // A script agent (an NPC) is driven by the engine, as a brain in the project would drive it.
    if (agent?.spec.agent && game) game.setAgentPolicy(agent.spec.agent, agent.policy);
  }
});

send({ type: 'ready' });

// ── an exported game (ADR 10) ─────────────────────────────────────────────
// With no editor around it, the game loads its own project: from the page itself (the one-file export
// sets window.GAME_DATA), or from project.json and the images beside index.html (the website export).
// Every path is relative, so it runs from any static host, a GitHub Pages subpath included.
type GameData = { project: Extract<ToRuntime, { type: 'load' }>['project']; assets: { path: string; mime: string; data: string }[] };
async function standalone(): Promise<void> {
  try {
    const inline = (window as unknown as { GAME_DATA?: GameData }).GAME_DATA;
    const project = inline?.project ?? await (await fetch('project.json')).json();
    const assets = inline
      ? inline.assets.map((a) => ({ path: a.path, mime: a.mime, bytes: Uint8Array.from(atob(a.data), (c) => c.charCodeAt(0)).buffer }))
      : await Promise.all(project.assets.map(async (a: { path: string; mime: string }) => {
        const r = await fetch(a.path);
        if (!r.ok) throw new Error(`Could not load ${a.path} (${r.status})`);
        return { path: a.path, mime: a.mime, bytes: await r.arrayBuffer() };
      }));
    if (!project.settings.mainScene) throw new Error('The game has no main scene');
    await start({ type: 'load', project, scene: project.settings.mainScene, assets });
    window.focus();
  } catch (e) {
    // Said on the page: there is no editor to show it, and a blank page explains nothing.
    const box = document.createElement('pre');
    box.textContent = `This game could not start: ${e instanceof Error ? e.message : String(e)}${location.protocol === 'file:' ? '\n\nOpened from a file? Browsers do not let a page read files beside it. Use the one-file export, or put the folder on a web server.' : ''}`;
    Object.assign(box.style, { color: '#fff', font: '14px system-ui, sans-serif', padding: '24px', whiteSpace: 'pre-wrap' });
    document.body.appendChild(box);
  }
}
if (window.parent === window) void standalone();
