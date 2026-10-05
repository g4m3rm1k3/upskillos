// Every task is fair and real: its start does not already pass, its solution passes every step,
// and its links open it. Checks run exactly as in the editor (tasks/checker.ts), on the real engine.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { Doc } from '../core/doc';
import { newProject } from '../core/project';
import { problems } from '../core/serialize';
import { NODE_CLASSES } from '../engine/nodes';
import { importOrder, rewriteImports } from '../runtime/scripts';
import { evaluateTask, type ScriptLoader } from './checker';
import { TASKS, chains, nextTask } from './index';
import { gameStudioLink, parseTaskLink } from './links';
import type { GameTask } from './types';
import { TETRIS, tetrisStepCode } from './tetris';
import { QUEST_BUDDIES, qbStepCode } from './questBuddies';
import { QB_CHAIN, QB_FINISHED } from '../examples/questBuddiesBuild';
import { questBuddies } from '../examples/questBuddies';
import { QA_CHAIN, QA_FINISHED } from '../examples/questAdventureBuild';
import { questAdventure } from '../examples/questAdventure';
import { QUEST_ADVENTURE, qaStepCode } from './questAdventure';

const pngSize = (path: string) => { const b = readFileSync(fileURLToPath(new URL(`../starter/${path.replace(/^assets\//, '')}`, import.meta.url))); return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) }; };

/** Scripts as ES modules from data URLs, imports rewritten (as the game's iframe does with blob URLs). */
const load: ScriptLoader = async (project) => {
  const classes = new Map<string, unknown>(), urls = new Map<string, string>();
  const { order, imports } = importOrder(project.scripts);
  for (const path of order) {
    const src = rewriteImports(project.scripts.find((x) => x.path === path)!.source, new Map([...imports.get(path)!].map(([spec, target]) => [spec, urls.get(target)!])));
    urls.set(path, `data:text/javascript;base64,${Buffer.from(src).toString('base64')}`);
    const mod = await import(/* @vite-ignore */ urls.get(path)!);
    classes.set(path, mod.default);
    classes.set(`module:${path}`, mod);
  }
  return classes;
};

function begin(task: GameTask): Doc {
  const d = new Doc(newProject(task.title));
  for (const path of task.images) d.importAsset(path, { mime: 'image/png', ...pngSize(path) });
  d.runCode('Start', task.start);
  return d;
}

afterAll(() => { for (const k of ['input', 'scene', 'time', 'math', 'physics', 'Vec2', 'PhysicsBody2D', ...Object.keys(NODE_CLASSES)]) delete (globalThis as Record<string, unknown>)[k]; });

describe('every task', () => {
  for (const task of TASKS) {
    it(`"${task.title}": the start is sound and not already done; the solution passes every step`, async () => {
      const d = begin(task);
      expect(problems(d.project)).toEqual([]);
      const before = await evaluateTask(task, d.project, { ran: false }, load);
      expect(before.filter((r) => r === true).length, `${task.id} starts with every step done`).toBeLessThan(task.steps.length);
      expect(before[0], `${task.id}: the first step is already done at the start`).not.toBe(true);
      d.runCode('Solution', task.solution);
      expect(problems(d.project)).toEqual([]);
      const after = await evaluateTask(task, d.project, { ran: true, ...task.solvedEditor }, load);
      expect(after).toEqual(task.steps.map(() => true));
    }, 60000);
  }

});

describe('Tetris, step by step', () => {
  for (const task of TETRIS) {
    it(`"${task.title}": each step's code, from the start, passes that step and every one before it`, async () => {
      for (let k = 0; k < task.steps.length; k++) {
        const d = begin(task);
        d.runCode('Steps', tetrisStepCode(task.id, k));
        expect(problems(d.project)).toEqual([]);
        const got = await evaluateTask(task, d.project, { ran: true }, load);
        expect(got.slice(0, k + 1), `${task.id} after step ${k + 1}`).toEqual(got.slice(0, k + 1).map(() => true));
      }
    });
  }
});

describe('Quest Buddies (chapters 11 and 12), step by step', () => {
  for (const task of [...QUEST_BUDDIES, ...QUEST_ADVENTURE]) {
    it(`"${task.title}": each step's code, from the start, passes that step and every one before it`, async () => {
      for (let k = 0; k < task.steps.length; k++) {
        const d = begin(task);
        d.runCode('Steps', task.id.startsWith('qa-') ? qaStepCode(task.id, k) : qbStepCode(task.id, k));
        expect(problems(d.project)).toEqual([]);
        const got = await evaluateTask(task, d.project, { ran: true }, load);
        expect(got.slice(0, k + 1), `${task.id} after step ${k + 1}`).toEqual(got.slice(0, k + 1).map(() => true));
      }
    }, 60000);
  }
});

describe('Quest Buddies chapter 11 is one build, from an empty project', () => {
  // The standard for every game chapter (docs/game-studio-course-plan.md): each task starts exactly where the one
  // before it ended, and the finished example is nothing but the steps, in order.
  const built = (code: string) => {
    const d = new Doc(newProject('Quest Buddies'));
    for (const path of QUEST_BUDDIES[0].images) d.importAsset(path, { mime: 'image/png', ...pngSize(path) });
    d.runCode('Build', code);
    return JSON.stringify({ ...d.project, name: '' });
  };
  it('lists every task after the tour, in the course\'s order', () => {
    expect(QB_CHAIN).toEqual(QUEST_BUDDIES.filter((t) => t.id !== 'qb-tour').map((t) => t.id));
    expect(QUEST_BUDDIES.find((t) => t.id === 'qb-maps')!.start).toBe('');
  });
  it('each task starts where the one before ends, and the last ends at the finished example', () => {
    const tasks = QB_CHAIN.map((id) => QUEST_BUDDIES.find((t) => t.id === id)!);
    for (let i = 1; i < tasks.length; i++) expect(built(tasks[i].start), tasks[i].id).toBe(built(`${tasks[i - 1].start}\n${tasks[i - 1].solution}`));
    const last = tasks[tasks.length - 1];
    expect(questBuddies.code).toBe(QB_FINISHED);
    expect(built(questBuddies.code)).toBe(built(`${last.start}\n${last.solution}`));
    expect(QUEST_BUDDIES.find((t) => t.id === 'qb-tour')!.start).toBe(questBuddies.code);
  });
});

describe('Quest Buddies: Adventure (chapter 12) is one build, on top of chapter 11\'s game', () => {
  const built = (code: string) => {
    const d = new Doc(newProject('Quest Buddies: Adventure'));
    for (const path of QUEST_ADVENTURE[0].images) d.importAsset(path, { mime: 'image/png', ...pngSize(path) });
    d.runCode('Build', code);
    return JSON.stringify({ ...d.project, name: '' });
  };
  it('lists every task in the course\'s order, the first starting from chapter 11\'s finished game', () => {
    expect(QA_CHAIN).toEqual(QUEST_ADVENTURE.map((t) => t.id));
    expect(built(QUEST_ADVENTURE[0].start)).toBe(built(questBuddies.code));
  });
  it('each task starts where the one before ends, and the last ends at the finished example', () => {
    for (let i = 1; i < QUEST_ADVENTURE.length; i++) expect(built(QUEST_ADVENTURE[i].start), QUEST_ADVENTURE[i].id).toBe(built(`${QUEST_ADVENTURE[i - 1].start}\n${QUEST_ADVENTURE[i - 1].solution}`));
    const last = QUEST_ADVENTURE[QUEST_ADVENTURE.length - 1];
    expect(questAdventure.code).toBe(QA_FINISHED);
    expect(built(questAdventure.code)).toBe(built(`${last.start}\n${last.solution}`));
  });
});

describe('the course\'s Try it cards', () => {
  // Every GameStudioTask card in "Learn to Program by Making Games" names a task that exists, and a lab
  // checkpoint the lesson declares, so a renamed task fails here, not in a learner's browser.
  const LESSONS = import.meta.glob('../../../courses/making-games/*/*.js', { eager: true, import: 'default' }) as Record<string, { id: string; checkpoints: { id: string; type: string }[]; intuition: { visualizations?: { id: string; props?: Record<string, string> }[] } }>;
  it('name real tasks and declared lab checkpoints', () => {
    const cards = Object.values(LESSONS).flatMap((l) => (l.intuition.visualizations ?? []).filter((v) => v.id === 'GameStudioTask').map((v) => ({ lesson: l, props: v.props ?? {} })));
    expect(cards.length).toBeGreaterThanOrEqual(4);
    for (const { lesson, props } of cards) {
      expect(() => gameStudioLink(props.task), lesson.id).not.toThrow();
      expect(props.lesson).toBe(lesson.id);
      expect(lesson.checkpoints.find((c) => c.id === props.checkpoint)?.type, `${lesson.id} ${props.checkpoint}`).toBe('lab');
    }
  });
});

describe('links', () => {
  it('a lesson’s link opens its task and carries the way back; an unknown task fails here, not in the browser', () => {
    const link = gameStudioLink('first-script', { from: '/chapter/game-studio-1/first-script', lesson: 'gs1-3', checkpoint: 'cp-gs1-3-4' });
    expect(link).toBe('/lab/game-studio?task=first-script&from=%2Fchapter%2Fgame-studio-1%2Ffirst-script&lesson=gs1-3&checkpoint=cp-gs1-3-4');
    expect(parseTaskLink(`#${link}`)).toEqual({ task: 'first-script', from: '/chapter/game-studio-1/first-script', lesson: 'gs1-3', checkpoint: 'cp-gs1-3-4' });
    expect(() => gameStudioLink('flying-cars')).toThrow(/no task called "flying-cars"/);
    expect(parseTaskLink('#/lab/game-studio')).toBe(null);
    expect(nextTask('first-sprite')?.id).toBe('run-and-stop');
  });
});
