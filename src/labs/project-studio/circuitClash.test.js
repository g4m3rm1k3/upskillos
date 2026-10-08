import { it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TRACKS } from './trackLoader.js';
import { GAMES } from '../../games/registry.js';
import { typeCircuitStep } from './circuitClash.walkthrough.js';

const lessons = TRACKS['circuit-clash'];
it('opens with a playable destination and explains the native implementation boundary', () => {
  const lesson = lessons[0];
  expect(lesson.steps[0].prose).toContain('#/game/circuit-clash');
  expect(lesson.meta.track).toBe('Circuit Clash — C# Software Engineering');
  expect(lesson.intro).toContain('Raylib-cs');
  expect(GAMES.some(g => g.key === 'circuit-clash')).toBe(true);
  expect(lesson.steps.at(-1).optional).toBe(true);
});

it('uses small learner-typed edits, unique progress keys, and nonblocking challenges throughout', () => {
  const ids = new Set();
  for (const lesson of lessons) {
    expect(lesson.meta.pedagogy).toBe('typed');
    expect(lesson.meta.support).toBeUndefined();
    for (const step of lesson.steps) {
      expect(ids.has(step.id), step.id).toBe(false);
      ids.add(step.id);
      expect(step.target, step.id).toBeNull();
      expect(step.provided, step.id).not.toBe(true);
      expect(step.extraTargets || [], step.id).toEqual([]);
      if (step.title.startsWith('Challenge')) {
        expect(step.optional, step.id).toBe(true);
        expect(step.edit, 'Optional work must not supply a required implementation fragment').toBeUndefined();
      }
      if (step.edit) expect(step.edit.code.trimEnd().split('\n').length, step.id).toBeLessThanOrEqual(32);
    }
  }
});

it('reconstructs the guided game without optional work, supplied files, or hidden author insertions', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'circuit-structure-'));
  try {
    for (const lesson of lessons) for (const step of lesson.steps) typeCircuitStep(root, step);
    const read = file => fs.readFileSync(path.join(root, file), 'utf8');
    expect(read('Game/Game.csproj')).toContain('Raylib-cs');
    expect(read('Core/Core.csproj')).not.toContain('Raylib');
    expect(read('Checks/Checks.csproj')).not.toContain('../Game');
    expect(read('Core/Geometry.cs')).toContain('Vector3.Cross');
    expect(read('Game/World.cs')).toContain('Art.Face(a,c,b,color)');
    expect(read('Game/Art.cs')).toContain('Geometry.Transform');
    expect(read('Core/Race.Tick.cs')).toContain('Contacts(); Combat(dt); Collect(dt);');
    expect(read('Core/Training.cs')).toContain('learner.Update');
    expect(read('Game/Program.cs')).toContain('Raylib.CloseWindow()');
    expect(read('Checks/Program.cs')).toContain('ALL CHECKS PASSED');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

it('rejects an append with no preceding learner-created file', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'circuit-append-'));
  try {
    expect(() => typeCircuitStep(root, { file: 'Missing.cs', edit: { mode: 'append', code: '}' } })).toThrow('Append before creation');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

it('keeps published progress keys while adding foundation and build checkpoints', () => {
  const find = title => lessons.flatMap(l => l.steps).find(s => s.title === title);
  expect(find('Play the destination first').id).toBe('circuit-clash/00-play-the-game-step-1');
  expect(find('Own the state and seed the experiment').id).toBe('circuit-clash/12-race-contracts-step-1');
  expect(find('Validate learned data at its input boundary').id).toBe('circuit-clash/20-save-the-garage-step-4');
});

it('introduces prerequisite practice before its game and learning applications', () => {
  const position = name => lessons.findIndex(l => l.id === `circuit-clash/${name}`);
  for (const [earlier, later] of [
    ['02a-know-the-type', '08-karts-and-state'],
    ['04a-debugging-and-scope', '05-objects-and-collections'],
    ['05b-search-and-cost', '07-track-math'],
    ['05c-graphs-and-queries', '12-race-contracts'],
    ['09a-from-mesh-to-pixels', '10-first-window'],
    ['20a-learning-and-probability', '21-q-update-experiment'],
    ['24a-measure-learning', '25-application-lifecycle'],
    ['24b-work-and-ownership', '25-application-lifecycle'],
  ]) {
    expect(position(earlier), earlier).toBeGreaterThanOrEqual(0);
    expect(position(earlier), `${earlier} before ${later}`).toBeLessThan(position(later));
  }
});
