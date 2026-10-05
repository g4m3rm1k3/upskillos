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

/**
 * The rows a lesson shows for one step: every added and removed line, with `context` unchanged
 * lines around each change, and each longer run of unchanged lines folded into one
 * { type: 'skip', count } row. A file with nothing in it yet is shown whole, since all of it is new.
 */
export function diffHunks(ops, context = 3) {
  const changed = ops.map((op) => op.type !== 'same');
  // A new file (everything changed) or a finished one (nothing changed) is shown whole. An empty
  // file's one blank line isn't worth showing as removed.
  if (!changed.includes(false) || !changed.includes(true)) return ops.filter((op) => !(op.type === 'remove' && op.line === ''));
  const near = ops.map((_, i) => {
    for (let k = Math.max(0, i - context); k <= Math.min(ops.length - 1, i + context); k++) if (changed[k]) return true;
    return false;
  });
  const rows = [];
  for (let i = 0; i < ops.length; i++) {
    if (near[i]) { rows.push(ops[i]); continue; }
    const last = rows[rows.length - 1];
    if (last?.type === 'skip') last.count++;
    else rows.push({ type: 'skip', count: 1 });
  }
  return rows;
}

const indentOf = (line) => line.length - line.trimStart().length;

/**
 * Like diffLines, but a line whose only change is its indentation is one op,
 * { type: 'indent', line, from, delta, targetLineNumber }, instead of a removal and an addition:
 * wrapping code in a function or a class changes every line's indentation and nothing else, and
 * the learner should be told "indent these", not shown them twice.
 */
export function diffLinesIndentAware(current, target) {
  const a = (current ?? '').replace(/\r\n/g, '\n').split('\n');
  const b = (target ?? '').replace(/\r\n/g, '\n').split('\n');
  const table = lcsTable(a.map((l) => l.trimStart()), b.map((l) => l.trimStart()));
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i].trimStart() === b[j].trimStart()) {
      ops.push(a[i] === b[j] || !b[j].trim()
        ? { type: 'same', line: b[j], targetLineNumber: j + 1 }
        : { type: 'indent', line: b[j], from: a[i], delta: indentOf(b[j]) - indentOf(a[i]), targetLineNumber: j + 1 });
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
 * Runs of `min` or more lines indented by the same amount become one
 * { type: 'indented', count, delta, first, last } row: "select these lines and press Tab".
 */
export function foldIndents(rows, min = 3) {
  const out = [];
  for (let k = 0; k < rows.length; k++) {
    const row = rows[k];
    if (row.type !== 'indent') { out.push(row); continue; }
    let end = k;
    // Blank lines inside a block move with it; they don't break the run.
    while (end + 1 < rows.length && (rows[end + 1].type === 'indent' && rows[end + 1].delta === row.delta
      || rows[end + 1].type === 'same' && !rows[end + 1].line.trim() && rows[end + 2]?.type === 'indent' && rows[end + 2].delta === row.delta)) end++;
    const run = rows.slice(k, end + 1);
    const indented = run.filter((r) => r.type === 'indent');
    if (indented.length >= min) {
      out.push({ type: 'indented', count: indented.length, delta: row.delta, first: run[0].targetLineNumber, last: run[run.length - 1].targetLineNumber });
      k = end;
    } else out.push(row);
  }
  return out;
}
