// Messages between the editor and the game's iframe (ADR 3). Plain JSON (plus asset
// bytes), sent with postMessage. Stop is the editor removing the iframe, so it needs
// no message and works even when a game has hung.

import type { Project } from '../core/types';
import type { EnvSpec } from '../ml/env';
import type { AgentPolicy } from '../ml/policy';
import type { QEpisode, QLive, QOptions, QPolicy, QTransition } from '../ml/qlearning';
import type { DebugWidget } from '../engine/debug';

/** Train in view: Q-learning inside the visible game. `speed` is game frames per drawn frame (1 is real time). */
export interface TrainInView { spec: EnvSpec; options: QOptions; speed: number }

export type ToRuntime =
  /** saves: the project's save slots (JSON text by slot name), which the editor keeps (engine/saves.ts). */
  | { type: 'load'; project: Project; scene: string; assets: { path: string; mime: string; bytes: ArrayBuffer }[]; train?: TrainInView; saves?: Record<string, string> }
  /** Train in view: how fast to play (game frames per drawn frame). */
  | { type: 'trainSpeed'; speed: number }
  /** Train in view, paused: play on to the next update, and report it. */
  | { type: 'trainStep' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'restart' }
  | { type: 'inspect'; path: string }
  /** A trained agent plays (ml/): every frameSkip frames it looks at the game and holds an action's keys. null stops it. */
  | { type: 'agent'; spec: EnvSpec; policy: AgentPolicy | null }
  /** The Debug tab moved a slider or flipped a toggle (engine/debug.ts). */
  | { type: 'debugSet'; name: string; value: number | boolean }
  /** The Debug tab pressed a button. */
  | { type: 'debugPress'; name: string };

export type LogLevel = 'log' | 'info' | 'warn' | 'error';

export type FromRuntime =
  | { type: 'ready' }
  | { type: 'running'; scene: string }
  | { type: 'log'; level: LogLevel; text: string }
  | { type: 'error'; message: string; file: string | null; line: number | null; column: number | null; node: string | null; phase: string | null }
  | { type: 'state'; path: string; props: Record<string, unknown> | null }
  /** The debug global's controls now, for the Debug tab (sent when they change, at most ten times a second). */
  | { type: 'debug'; widgets: DebugWidget[] }
  /** The game saved into a slot (json) or emptied it (null): the editor keeps the change. */
  | { type: 'save'; slot: string; json: string | null }
  | { type: 'paused'; paused: boolean }
  /** Train in view: what the agent can do and sees, and how random play scores (measured headless first). */
  | { type: 'trainStart'; actions: string[]; observation: string[]; bins: number[][]; random: number }
  /** Train in view: what the learner is doing now (a few times a second). */
  | { type: 'trainLive'; live: QLive }
  | { type: 'trainEpisode'; episode: QEpisode }
  /** Train in view: the latest update, every number in it (when stepping, or a few times a second). */
  | { type: 'trainTransition'; transition: QTransition; live: QLive }
  | { type: 'trainDone'; policy: QPolicy; score: number }
  | { type: 'trainError'; message: string };

/** Every message carries this, so the editor ignores anything else posted to the window. */
export const CHANNEL = 'upskillos-game-studio';
