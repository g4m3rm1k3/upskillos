// Running a task's checks against a project. Used by the editor (in a worker, so the game's
// globals — Node, scene, input… — never touch the editor's page) and by the tests (in Node).
//
// Play checks run the learner's real game on the real engine, headless and faster than real
// time, with keys held for them: the same way the example tests play the examples.

import type { Project } from '../core/types';
import { expandScene } from '../core/instances';
import { walk } from '../core/project';
import { propValue } from '../core/registry';
import { Game, MATH, scriptGlobals, type DrawItem, type View } from '../engine/game';
import { NODE_CLASSES, PhysicsBody2D, type Node } from '../engine/nodes';
import { Vec2 } from '../engine/vec2';
import type { CheckResult, EditorView, GameTask, PlayOptions, PlayResult, ProjectView } from './types';

/**
 * Load a project's scripts as classes, by path, and everything each exports under "module:" and its path. Throws
 * with a sentence (a syntax error, a missing import).
 */
export type ScriptLoader = (project: Project) => Promise<Map<string, unknown>>;

export function projectView(project: Project): ProjectView {
  const scene = project.scenes.find((s) => s.path === project.settings.mainScene) ?? null;
  let main = null;
  try { main = scene ? expandScene(project, scene) : null; } catch { main = scene; }
  const nodes = main ? [...walk(main.root)] : [];
  return {
    project, main, nodes,
    byName: (name) => nodes.find((n) => n.name === name) ?? null,
    prop: (node, name) => propValue(node.type, node.props, name),
    script: (path) => (path ? project.scripts.find((s) => s.path === path)?.source ?? null : null),
  };
}

/** Each step's result, in order: true when done, else what is not right yet. */
export async function evaluateTask(task: GameTask, project: Project, editor: EditorView, load: ScriptLoader): Promise<CheckResult[]> {
  const view = projectView(project);
  let classes: Map<string, unknown> | null = null;
  const play = async (opts: PlayOptions): Promise<PlayResult> => {
    // The node classes first: a script's class extends one as soon as it is loaded.
    Object.assign(globalThis, NODE_CLASSES, { Vec2, math: MATH, PhysicsBody2D });
    classes ??= await load(project);
    const scene = project.scenes.find((s) => s.path === project.settings.mainScene);
    if (!scene) throw new Error('There is no main scene to run');
    const errors: string[] = [];
    let view: View = { x: 0, y: 0, zoom: 1 }, drawn: DrawItem[] = [];
    const game = new Game(project, scene, { frame: (items, v) => { drawn = items; view = v; } }, { scriptClass: (p) => classes!.get(p) as typeof Node | undefined, onError: (e) => errors.push(`${e.file ?? e.node}: ${e.message}`) });
    if (opts.training) game.training = true;
    Object.assign(globalThis, scriptGlobals(game));
    if (opts.training) { const n = game.root.find(opts.training); if (!n) throw new Error(`There is no node "${opts.training}" to train`); game.trainee = n; }
    game.start();
    opts.setup?.(game);
    const fps = opts.fps ?? 60, pressAt = Math.round((opts.keysAt ?? 0) * fps);
    for (let i = 0; i < Math.round(opts.seconds * fps); i++) {
      if (i === pressAt) for (const k of opts.keys ?? []) game.input.key(k, true);
      game.step(1 / fps);
      opts.watch?.(game, view);
    }
    return { game, node: <T extends Node = Node>(path: string) => game.root.find<T>(path), errors, view, drawn };
  };
  const module = async (path: string): Promise<Record<string, unknown>> => {
    Object.assign(globalThis, NODE_CLASSES, { Vec2, math: MATH, PhysicsBody2D });
    classes ??= await load(project);
    const m = classes.get(`module:${path}`);
    if (!m) throw new Error(`There is no ${path} in the project`);
    return m as Record<string, unknown>;
  };
  const out: CheckResult[] = [];
  for (const step of task.steps) {
    try {
      const c = step.check;
      out.push(c.kind === 'project' ? c.test(view) : c.kind === 'editor' ? c.test({ ...view, ...editor }) : await c.test({ ...view, play, module }));
    } catch (e) {
      out.push(e instanceof Error ? e.message : String(e));
    }
  }
  return out;
}
