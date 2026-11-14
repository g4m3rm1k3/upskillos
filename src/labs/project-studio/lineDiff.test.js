import { describe, expect, it } from 'vitest';
import { diffHunks, diffLines, diffLinesIndentAware, foldIndents } from './lineDiff.js';

const lines = (n, prefix = 'line') => Array.from({ length: n }, (_, i) => `${prefix} ${i + 1}`);

describe('diffHunks', () => {
  it('shows a new file whole', () => {
    const rows = diffHunks(diffLines('', 'a\nb\nc'));
    expect(rows.map((r) => r.type)).toEqual(['add', 'add', 'add']);
  });

  it('folds unchanged lines far from a change, keeping three either side', () => {
    const before = lines(20);
    const after = [...before.slice(0, 10), 'new', ...before.slice(10)];
    const rows = diffHunks(diffLines(before.join('\n'), after.join('\n')));
    expect(rows[0]).toEqual({ type: 'skip', count: 7 });
    expect(rows.slice(1, 4).map((r) => r.line)).toEqual(['line 8', 'line 9', 'line 10']);
    expect(rows[4]).toMatchObject({ type: 'add', line: 'new', targetLineNumber: 11 });
    expect(rows.slice(5, 8).map((r) => r.line)).toEqual(['line 11', 'line 12', 'line 13']);
    expect(rows[8]).toEqual({ type: 'skip', count: 7 });
  });

  it('shows a replaced line as a removal and an addition', () => {
    const rows = diffHunks(diffLines(lines(9).join('\n'), [...lines(4), 'five', ...lines(9).slice(5)].join('\n')));
    expect(rows.filter((r) => r.type !== 'same' && r.type !== 'skip')).toEqual([
      { type: 'remove', line: 'line 5', targetLineNumber: null },
      { type: 'add', line: 'five', targetLineNumber: 5 },
    ]);
  });

  it('shows everything when nothing has changed', () => {
    const rows = diffHunks(diffLines('a\nb', 'a\nb'));
    expect(rows.map((r) => r.type)).toEqual(['same', 'same']);
  });
});

describe('indentation-aware diffs', () => {
  const before = 'import pygame\n\npygame.init()\nscreen = make()\nrun(screen)\n';
  const after = 'import pygame\n\n\ndef main():\n    pygame.init()\n    screen = make()\n    run(screen)\n';

  it('reports a line that only moved right as indented, not removed and added', () => {
    const ops = diffLinesIndentAware(before, after);
    expect(ops.filter((o) => o.type === 'indent').map((o) => [o.line.trim(), o.delta])).toEqual([
      ['pygame.init()', 4], ['screen = make()', 4], ['run(screen)', 4],
    ]);
    expect(ops.filter((o) => o.type === 'add').map((o) => o.line)).toEqual(['', 'def main():']);
    expect(ops.filter((o) => o.type === 'remove')).toEqual([]);
  });

  it('folds a run of lines indented together into one instruction', () => {
    const rows = foldIndents(diffLinesIndentAware(before, after));
    expect(rows.find((r) => r.type === 'indented')).toEqual({ type: 'indented', count: 3, delta: 4, first: 5, last: 7 });
  });

  it('keeps a short run line by line', () => {
    const rows = foldIndents(diffLinesIndentAware('if x:\na()\n', 'if x:\n    a()\n'));
    expect(rows.map((r) => r.type)).toEqual(['same', 'indent', 'same']);
  });
});

describe('trailing whitespace', () => {
  it('does not count spaces at the end of a line as a change', async () => {
    const { diffLines, addedLineNumbers } = await import('./lineDiff.js');
    const target = 'def f():\n    return 1\n\nprint(f())';
    // An editor leaves the indent on the blank line, and a stray space after a line.
    const typed = 'def f():  \n    return 1\n    \nprint(f())';
    expect(addedLineNumbers(typed, target)).toEqual([]);
    expect(diffLines(typed, target).every((op) => op.type === 'same')).toBe(true);
  });
  it('still reports a line indented differently, because indentation is syntax', async () => {
    const { diffLinesIndentAware, addedLineNumbers } = await import('./lineDiff.js');
    const target = 'if x:\n    y()';
    const typed = 'if x:\n        y()  ';
    expect(addedLineNumbers(typed, target)).toEqual([2]);
    expect(diffLinesIndentAware(typed, target).map((op) => op.type)).toEqual(['same', 'indent']);
  });
});
