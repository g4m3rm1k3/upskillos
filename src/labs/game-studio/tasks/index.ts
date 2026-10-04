// Every task, in course order. Tasks with the same chain are a tutorial (a course chapter).
import type { GameTask } from './types';
import { FIRST_STEPS } from './firstSteps';
import { PHYSICS } from './physics';
import { CAMERA_HUD } from './cameraHud';
import { ANIMATION, TILEMAPS } from './animationTiles';
import { SCENES } from './scenes';
import { TETRIS } from './tetris';
import { LEARNING } from './learning';
import { CRIBBAGE } from './cribbage';

export type { GameTask };
export const TASKS: GameTask[] = [...FIRST_STEPS, ...PHYSICS, ...CAMERA_HUD, ...ANIMATION, ...TILEMAPS, ...SCENES, ...TETRIS, ...LEARNING, ...CRIBBAGE];

export function taskById(id: string): GameTask | undefined { return TASKS.find((t) => t.id === id); }

/** The tutorials: chains of tasks, in order. */
export function chains(): { name: string; tasks: GameTask[] }[] {
  const out: { name: string; tasks: GameTask[] }[] = [];
  for (const t of TASKS) { let c = out.find((x) => x.name === t.chain); if (!c) out.push(c = { name: t.chain, tasks: [] }); c.tasks.push(t); }
  return out;
}

/** The task after this one in its chain, if any. */
export function nextTask(id: string): GameTask | undefined {
  const t = taskById(id), list = t ? TASKS.filter((x) => x.chain === t.chain) : [];
  return list[list.findIndex((x) => x.id === id) + 1];
}
