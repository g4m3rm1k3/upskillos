// A task: one thing to try in Game Studio, with checks that see when it is done
// (docs/game-studio-course-plan.md, "How Try it works").
//
// A lesson's "Try it" link opens a task; so does Help › Tutorials. The task panel shows the steps
// and ticks each one off when its check passes. Checks come in three kinds:
//   project  looks at the project: "a Sprite2D with a picture", "a script on Hero"
//   play     runs the learner's own game, headless, on the real engine, with keys held for it:
//            "holding → for 1 s moves Hero to the right"
//   editor   looks at what the learner has done in the editor: "the game has been run"
//
// A check returns true when the step is done, or a sentence saying what is not right yet, which
// the panel shows as a hint.

import type { NodeData, Project, SceneData } from '../core/types';
import type { DrawItem, Game, View } from '../engine/game';
import type { Node } from '../engine/nodes';
import type { EnvSpec } from '../ml/env';
import type { QOptions } from '../ml/qlearning';
import type { LinearQOptions } from '../ml/linearq';
import type { FinishedAgent } from './goals';

export type CheckResult = true | string;

/** What a project check can look at. */
export interface ProjectView {
  project: Project;
  /** The main scene, with instances expanded, or null when there is none. */
  main: SceneData | null;
  /** Every node of the main scene, in tree order. */
  nodes: NodeData[];
  /** The first node of the main scene with this name, or null. */
  byName(name: string): NodeData | null;
  /** A node's property, its default when not set. */
  prop(node: NodeData, name: string): unknown;
  /** A script's source, or null. */
  script(path: string | null): string | null;
}

export interface PlayOptions {
  /** How long to run, in seconds. */
  seconds: number;
  /** Frames a second to step at (60 unless given). */
  fps?: number;
  /** Keys held down the whole time (KeyboardEvent.code names: "ArrowRight", "Space"). */
  keys?: string[];
  /** When the keys go down, in seconds (0 unless given): after landing, say. */
  keysAt?: number;
  /** Run it as training does: ai.training is true (a practice partner plays the other seats), and this agent is left to the check. */
  training?: string;
  /** Arrange the game after it starts and before it runs: put the player on a coin, say. */
  setup?: (game: Game) => void;
  /** Called after every frame, with where the camera looked, to watch something as it happens: the highest point of a jump. */
  watch?: (game: Game, view: View) => void;
}

export interface PlayResult {
  game: Game;
  /** A node of the running game by path from the root, or null. */
  node<T extends Node = Node>(path: string): T | null;
  /** Script errors while it ran. */
  errors: string[];
  /** Where the camera looked on the last frame (the centre of the screen, in the world), and its zoom. */
  view: View;
  /** What was drawn on the last frame. */
  drawn: DrawItem[];
}

/** What a play check can do: run the learner's game, as many times as it needs, and call what a script exports. */
export interface PlayView {
  play(opts: PlayOptions): Promise<PlayResult>;
  /** Everything a script exports (its functions and constants), loaded as the game loads it. */
  module(path: string): Promise<Record<string, unknown>>;
}

/** What the learner has done in Run › Train an agent… since the task started (ml/). */
export interface TrainingView {
  /** The environment as typed in the dialog (when it is valid JSON), or null. */
  draft: EnvSpec | null;
  /** Every training run that finished: how it trained, on what (and with which settings), and how it then scored against random play. */
  runs: { method: 'q' | 'cem' | 'linear-q'; spec: EnvSpec; score: number; random: number; options?: QOptions | LinearQOptions; inView?: boolean }[];
  /** Updates stepped through one at a time (Train in view's Step), and Predict's answers checked: how many were right. */
  stepped?: number;
  predictions?: { right: number; total: number };
  /** Finished comparisons: each setting's options. */
  compared?: { options: QOptions[]; seeds: number }[];
  /** "Watch it play" has run the game with a trained agent at the controls. */
  watched: boolean;
  /** Brains saved from the dialog since the task started, by path. */
  saved?: string[];
}

/** What an editor check can look at. */
export interface EditorView {
  /** The game has been run since the task started. */
  ran: boolean;
  training?: TrainingView;
}

export type Check =
  | { kind: 'project'; test: (v: ProjectView) => CheckResult }
  | { kind: 'play'; test: (v: PlayView & ProjectView) => Promise<CheckResult> }
  | { kind: 'editor'; test: (v: EditorView & ProjectView) => CheckResult };

export interface TaskStep {
  /** What to do, in a sentence or two. */
  text: string;
  check: Check;
  /** A nudge shown when the step is still not done after a while. */
  hint?: string;
}

export interface GameTask {
  id: string;
  title: string;
  /** What you are making, in a sentence. */
  goal: string;
  /** The tutorial chain it belongs to (the course chapter), and its place in it. */
  chain: string;
  /** Starter-art images the start and solution use; added to the project first. */
  images: string[];
  /** Scene API code that makes the starting project. */
  start: string;
  steps: TaskStep[];
  /** Scene API code that completes the task from the start: the tests' proof, and "Show me". */
  solution: string;
  /** What to read next, said when it is done (the lesson usually takes over). */
  done: string;
  /** What a learning task builds towards, shown first: the finished game with a trained brain (tasks/goals.ts). */
  finished?: FinishedAgent;
  /** The environment Run › Train an agent… starts from in this task (instead of the example's). */
  agent?: EnvSpec;
  /** For steps done in the editor rather than the project (training an agent): what the editor looks like
   *  once they are done, for the tests that prove the solution passes every step. */
  solvedEditor?: Omit<EditorView, 'ran'>;
}
