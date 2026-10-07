import { describe, expect, it } from 'vitest';
import { CONTRACTS } from '../../../scripts/dice-learning-contracts.mjs';
import { cppProse } from '../../../scripts/dice-prose.mjs';
import { TRACKS, TRACK_KEYS } from './trackLoader.js';

describe('C++ games: design the learning before the code', () => {
  const keys = TRACK_KEYS.filter(key => key.startsWith('dice-path-'));
  const lessons = keys.flatMap(key => TRACKS[key]);
  it('requires an outcome, recall, transfer and already-taught prerequisites for every published lesson', () => {
    const seen = new Set();
    for (const lesson of lessons) {
      const id = lesson.id.split('/')[1];
      const contract = CONTRACTS[id];
      expect(contract, id).toBeDefined();
      expect(contract.outcome.length, id).toBeGreaterThan(20);
      expect(contract.recall.length, id).toBeGreaterThan(20);
      expect(contract.transfer.length, id).toBeGreaterThan(20);
      expect(contract.concepts.length, id).toBeLessThanOrEqual(3);
      for (const prerequisite of contract.prerequisites) expect(seen.has(prerequisite), `${id} requires ${prerequisite} first`).toBe(true);
      expect(lesson.intro, id).toContain('**Outcome:**');
      seen.add(id);
    }
    expect([...seen].sort()).toEqual(Object.keys(CONTRACTS).sort());
  });
  it('keeps the original lifetime entry identity and gives each mechanism its own practice', () => {
    const objects = TRACKS['dice-path-objects'];
    const focused = objects.filter(l => /\/14/.test(l.id));
    expect(focused.map(l => l.id.split('/')[1])).toEqual([
      '14-lifetimes-and-ownership', '14b-file-persistence', '14c-borrowed-pointers', '14d-noncopyable-owners',
    ]);
    expect(focused[0].steps[0].id).toBe('dice-path-objects/14-lifetimes-and-ownership-step-1');
    expect(focused[0].steps.slice(1).every(s => !/-step-\d+$/.test(s.id))).toBe(true);
    for (const lesson of focused) {
      expect(lesson.steps.some(s => s.title.startsWith('Your turn'))).toBe(true);
      expect(lesson.steps.some(s => s.title.startsWith('Try it'))).toBe(true);
    }
    expect(focused[0].steps.some(s => s.target?.includes('int*'))).toBe(false);
    expect(focused[1].steps.some(s => s.target?.includes('= delete'))).toBe(false);
  });
  it('keeps header names visible without modifying code fences or already-formatted code', () => {
    expect(cppProse('Include <fstream> and use std::vector<int>.')).toBe('Include `<fstream>` and use `std::vector<int>`.');
    expect(cppProse('Use std::uniform_int_distribution<int>.')).toBe('Use `std::uniform_int_distribution<int>`.');
    const fenced = 'Already `<array>`\n```cpp\n#include <iostream>\nstd::vector<int> v;\n```';
    expect(cppProse(fenced)).toBe(fenced);
    const persistence = TRACKS['dice-path-objects'].find(l => l.id.endsWith('/14b-file-persistence'));
    expect(persistence.steps[0].prose).toContain('`<fstream>`');
  });
  it('inserts focused constructor and header steps without renumbering existing progress', () => {
    const objects = TRACKS['dice-path-objects'];
    const constructor = objects.find(l => l.id.endsWith('/11-valid-construction'));
    expect(constructor.steps.find(s => s.title === 'Reject creation that cannot satisfy the contract').id).toBe(constructor.id + '-step-2');
    const header = objects.find(l => l.id.endsWith('/15-headers-and-sources'));
    expect(header.steps.find(s => s.title === 'Define the methods in a source file').id).toBe(header.id + '-step-2');
    expect(header.steps.find(s => s.title.startsWith('Your turn')).id).toBe(header.id + '-step-5');
  });
});
