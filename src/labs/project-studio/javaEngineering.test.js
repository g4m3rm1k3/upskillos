import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { TRACKS } from './trackLoader.js';
import { parseLesson } from './parseTrack.js';
const lessons = TRACKS['java-engineering'];

describe('typed software engineering curriculum', () => {
  it('is discoverable, has distinct progress keys, and supplies no learner code bundles', () => {
    expect(lessons[0].id).toContain('00-start');
    expect(lessons.at(-1).id).toContain('29-transfer');
    const ids = lessons.flatMap(l => [l.id, ...l.steps.map(s => s.id)]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of lessons) {
      expect(l.runtime).toBe('java');
      expect(l.meta.pedagogy).toBe('typed');
      expect(l.meta.support).toBeUndefined();
      for (const s of l.steps) {
        expect(s.target, s.id).toBeNull();
        expect(s.provided, s.id).not.toBe(true);
        expect(s.extraTargets || []).toEqual([]);
        if (s.edit) {
          expect(s.edit.code.trim().split('\n').length, s.id).toBeLessThanOrEqual(22);
          // Fragment size is a UI/authoring constraint, not evidence of teaching quality.
          // Explanations and prerequisite coverage require the editorial review in the curriculum guide.
        }
      }
    }
    expect(fs.existsSync(new URL('./tracks/java-engineering/support', import.meta.url))).toBe(false);
  });
  it('keeps challenges separate from the guided build and does not imply open-ended work was verified', () => {
    const challenges = lessons.flatMap(l => l.steps.filter(s => s.optional));
    expect(challenges.length).toBeGreaterThan(0);
    for (const step of challenges) {
      expect(step.file).toBeNull();
      expect(step.prose).toContain('optional');
      for (const check of step.checks) expect(check.args[0]).toContain('challenges/');
    }
  });
});

describe('fragment authoring', () => {
  it('opens the named file without turning a fragment into a full-file target', () => {
    const l = parseLesson('## Add method\nExplanation\n```java edit=Main.java mode=append\nvoid run() {}\n```', 'test');
    expect(l.steps[0]).toMatchObject({ file: 'Main.java', target: null, edit: { mode: 'append', code: 'void run() {}\n' } });
    expect(l.steps[0].prose).toContain('void run()');
  });
  it('rejects ambiguous or invalid fragment instructions', () => {
    expect(() => parseLesson('## Bad\n```java edit=A.java mode=delete\nx\n```', 't')).toThrow('Unknown edit mode');
    expect(() => parseLesson('## Bad\n```java edit=A.java\nx\n```\n```java file=B.java\ny\n```', 't')).toThrow('exactly one');
  });
  it('marks only challenge headings optional and preserves existing ids', () => {
    const l = parseLesson('---\npedagogy: typed\n---\n## Explain challenges\ntext\n## Challenge — transfer\ntry it', 'stable');
    expect(l.steps.map(s => s.optional)).toEqual([false, true]);
    expect(l.steps[1].id).toBe('stable-step-2');
  });
});
