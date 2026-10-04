// The scripts a task's solution writes, by path: for the tutorial pictures script
// (e2e/tutorials.shots.mjs), which types them into the editor as a learner would.
import { newProject } from '../core/project';
import { runSceneCode } from '../core/api';
import { taskById } from './index';

export function solutionScripts(taskId: string, solved = true): Record<string, string> {
  const t = taskById(taskId);
  if (!t) throw new Error(`No task "${taskId}"`);
  const p = newProject();
  for (const path of t.images) p.assets.push({ id: `a${p.assets.length + 1}`, path, kind: 'image', mime: 'image/png', width: 512, height: 512 });
  runSceneCode(p, t.start);
  if (solved) runSceneCode(p, t.solution);
  return Object.fromEntries(p.scripts.map((s) => [s.path, s.source]));
}

/** The scripts a task starts with, by path (a stub to write into, for the pictures script). */
export const startScripts = (taskId: string): Record<string, string> => solutionScripts(taskId, false);
