import { describe, it, expect } from 'vitest';
import { checksPassed } from './checkEvidence.js';
import { parseLesson } from './parseTrack.js';

describe('one rule for a passing check run', () => {
  const two = [{ kind: 'run' }, { kind: 'run' }];
  it('does not count a run where every check was skipped', () => {
    expect(checksPassed([{ kind: 'file' }], [{ pass: true, skipped: true }])).toBe(false);
  });
  it('passes an OS pair when the check that ran passed', () => {
    expect(checksPassed(two, [{ pass: true, skipped: true }, { pass: true }])).toBe(true);
  });
  it('fails on any real failure, and on missing results', () => {
    expect(checksPassed(two, [{ pass: true }, { pass: false }])).toBe(false);
    expect(checksPassed(two, [{ pass: true }])).toBe(false);
    expect(checksPassed(two, null)).toBe(false);
  });
});

describe('optional challenges outside typed lessons', () => {
  it('treats a Challenge opening with **Optional as optional, and keeps step ids', () => {
    const l = parseLesson('## Build it\ntext\n## Challenge: more\n**Optional, ★★.** Try it\n## Challenge: required\nDo this', 'forge');
    expect(l.steps.map(s => s.optional)).toEqual([false, true, false]);
    expect(l.steps.map(s => s.id)).toEqual(['forge-step-1', 'forge-step-2', 'forge-step-3']);
  });
});

describe('a keyed heading', () => {
  it('takes its own id and no number, so later steps keep theirs', () => {
    const l = parseLesson('## One\na\n## Inserted later {#warm-up}\nb\n## Two\nc', 'pong');
    expect(l.steps.map((s) => [s.id, s.title])).toEqual([
      ['pong-step-1', 'One'], ['pong-warm-up', 'Inserted later'], ['pong-step-2', 'Two'],
    ]);
  });
});
