// lineDiff.js
// A small line-level diff, used to show what a step ADDS to the file the
// learner already has. No diff library is installed in this repo, and
// Monaco's own createDiffEditor is the side-by-side model that was
// explicitly not wanted here — this feeds inline decorations instead.
//
// Classic LCS (longest common subsequence) over lines: build the length
// table, then walk it backwards to recover the edit script.

function lcsTable(a, b) {
  const table = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  return table;
}

/**
 * Diff two blocks of text by line.
 * Returns ops: [{ type: 'same' | 'add' | 'remove', line, targetLineNumber }]
 * where targetLineNumber is the 1-based line in `target` for 'same'/'add'
 * ops (what Monaco needs to decorate), and null for 'remove'.
 */
export function diffLines(current, target) {
  const a = (current ?? '').replace(/\r\n/g, '\n').split('\n');
  const b = (target ?? '').replace(/\r\n/g, '\n').split('\n');
  const table = lcsTable(a, b);

  const ops = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ops.push({ type: 'same', line: a[i], targetLineNumber: j + 1 });
      i++; j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      ops.push({ type: 'remove', line: a[i], targetLineNumber: null });
      i++;
    } else {
      ops.push({ type: 'add', line: b[j], targetLineNumber: j + 1 });
      j++;
    }
  }
  while (i < a.length) { ops.push({ type: 'remove', line: a[i], targetLineNumber: null }); i++; }
  while (j < b.length) { ops.push({ type: 'add', line: b[j], targetLineNumber: j + 1 }); j++; }
  return ops;
}

/**
 * The 1-based line numbers, in `target`, that `current` doesn't have yet.
 * These are the lines highlighted green in the editor — literally "the
 * code this step is asking you to add."
 */
export function addedLineNumbers(current, target) {
  return diffLines(current, target)
    .filter((op) => op.type === 'add')
    .map((op) => op.targetLineNumber);
}

/**
 * Whitespace-tolerant equality: has the learner effectively reproduced the
 * target? Trailing whitespace and a missing/extra final newline shouldn't
 * count as "not done yet", but indentation must still match, since in
 * Python indentation IS syntax.
 */
export function matchesTarget(current, target) {
  const norm = (s) => (s ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
  return norm(current) === norm(target);
}

/** Group consecutive added line numbers into {start, end} ranges. */
export function toRanges(lineNumbers) {
  const ranges = [];
  for (const n of lineNumbers) {
    const last = ranges[ranges.length - 1];
    if (last && n === last.end + 1) last.end = n;
    else ranges.push({ start: n, end: n });
  }
  return ranges;
}
