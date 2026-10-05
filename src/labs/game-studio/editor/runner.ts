// Running a game from the editor (ADR 3): a sandboxed iframe with the built runtime
// in it. The project goes in as a message; logs, errors and live state come out.
// Stop removes the iframe, so it works even if the game has hung, and nothing the
// game did can reach the editor or the project.

import type { Project } from '../core/types';
import { CHANNEL, type FromRuntime, type ToRuntime, type TrainInView } from '../runtime/protocol';

/** The built runtime (npm run game:runtime), loaded only when a game first runs. */
let runtimeSource: Promise<string> | null = null;
export function loadRuntimeSource(): Promise<string> {
  runtimeSource ??= import('../runtime/dist/game-runtime.js?raw').then((m) => m.default as string);
  return runtimeSource;
}

/** The whole page a game runs in: used by Run, and by Export as the game's index.html. */
export function gameHtml(runtime: string, title: string, background: string): string {
  const safe = runtime.replace(/<\/script/gi, '<\\/script');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title.replace(/</g, '&lt;')}</title>
<style>html,body{margin:0;height:100%;background:${background};overflow:hidden}#game{width:100%;height:100%}</style>
</head><body><div id="game"></div><script>${safe}</script></body></html>`;
}

export interface RunningGame {
  send(m: ToRuntime): void;
  stop(): void;
  readonly frame: HTMLIFrameElement;
}

export interface RunOptions {
  project: Project;
  scene: string;
  /** The bytes of each image the project uses. */
  assets: { path: string; mime: string; bytes: ArrayBuffer }[];
  container: HTMLElement;
  onMessage: (m: FromRuntime) => void;
  /** Train in view instead of playing: Q-learning in the visible game. */
  train?: TrainInView;
  /** The project's save slots, sent with the project (engine/saves.ts). */
  saves?: Record<string, string>;
}

export async function runGame(o: RunOptions): Promise<RunningGame> {
  const runtime = await loadRuntimeSource();
  const frame = document.createElement('iframe');
  // allow-scripts only: the game runs, but has no access to the editor, its storage or the page.
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.setAttribute('title', 'Running game');
  Object.assign(frame.style, { width: '100%', height: '100%', border: '0', display: 'block', background: o.project.settings.background });
  frame.srcdoc = gameHtml(runtime, o.project.name, o.project.settings.background);

  const post = (m: ToRuntime) => frame.contentWindow?.postMessage({ channel: CHANNEL, ...m }, '*');
  const onMsg = (ev: MessageEvent) => {
    if (ev.source !== frame.contentWindow || ev.data?.channel !== CHANNEL) return;
    const m = ev.data as FromRuntime;
    if (m.type === 'ready') post({ type: 'load', project: structuredClone(o.project), scene: o.scene, assets: o.assets, ...(o.train ? { train: structuredClone(o.train) } : {}), ...(o.saves ? { saves: { ...o.saves } } : {}) });
    o.onMessage(m);
  };
  window.addEventListener('message', onMsg);
  o.container.appendChild(frame);
  return {
    frame,
    send: post,
    stop() { window.removeEventListener('message', onMsg); frame.remove(); },
  };
}
