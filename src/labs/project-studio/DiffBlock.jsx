// DiffBlock.jsx
// The step's target code, compared with the learner's file: lines to add marked green, lines to
// delete marked red, and only a few unchanged lines around each change, so a six-line edit to a
// long file reads as six lines. The whole file is one click away.
//
// It deliberately lives in the LESSON panel, not in the editor. The editor
// holds the learner's own file; decorating that buffer with line numbers
// taken from the target would mark the wrong lines, and pre-filling the
// editor with the target would defeat the point of typing it. So: the
// reference (read-only, diffed) on one side, your real file on the other.
import { useMemo, useState } from 'react';
import { diffHunks, diffLinesIndentAware, foldIndents } from './lineDiff.js';

const ROW_STYLE = {
  add: { background: 'rgba(45, 212, 191, 0.16)', border: '#2dd4bf', mark: '+', markColour: '#2dd4bf', text: '#e6fffb' },
  remove: { background: 'rgba(248, 113, 113, 0.14)', border: '#f87171', mark: '−', markColour: '#f87171', text: '#fecaca' },
  indent: { background: 'rgba(251, 191, 36, 0.10)', border: '#fbbf24', mark: '⇥', markColour: '#fbbf24', text: '#fde68a' },
  same: { background: 'transparent', border: 'transparent', mark: ' ', markColour: '#4b5563', text: '#8a8f98' },
};

function summary(added, removed, indented) {
  if (added === 0 && removed === 0 && indented === 0) return '✓ your file already matches this';
  const parts = [];
  if (added) parts.push(`${added} new line${added === 1 ? '' : 's'} to type`);
  if (removed) parts.push(`${removed} line${removed === 1 ? '' : 's'} to delete`);
  if (indented) parts.push(`${indented} line${indented === 1 ? '' : 's'} to indent`);
  return parts.join(', ');
}

export default function DiffBlock({ current, target, C }) {
  // A file the learner hasn't started has nothing in it to delete.
  const ops = useMemo(() => {
    const all = diffLinesIndentAware(current, target);
    return (current ?? '').trim() ? all : all.filter((op) => op.type !== 'remove');
  }, [current, target]);
  const [whole, setWhole] = useState(false);
  const added = ops.filter((o) => o.type === 'add').length;
  const removed = ops.filter((o) => o.type === 'remove').length;
  const indented = ops.filter((o) => o.type === 'indent').length;
  const rows = useMemo(() => (whole ? ops : foldIndents(diffHunks(ops))), [ops, whole]);
  const folded = rows.some((row) => row.type === 'skip' || row.type === 'indented');

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', margin: '10px 0' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          padding: '5px 10px',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: added === 0 && removed === 0 && indented === 0 ? C.teal : C.muted,
          background: C.surface2,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <span>{summary(added, removed, indented)}</span>
        {(folded || whole) && (
          <button onClick={() => setWhole((value) => !value)}
            style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, border: `1px solid ${C.border}`, background: 'transparent', color: C.text, cursor: 'pointer', textTransform: 'none', letterSpacing: 0 }}>
            {whole ? 'Show only the changes' : 'Show whole file'}
          </button>
        )}
      </div>

      <pre style={{ margin: 0, padding: '8px 0', fontSize: 12.5, lineHeight: 1.55, overflowX: 'auto', background: '#1e1e1e', fontFamily: 'monospace' }}>
        {rows.map((row, i) => {
          if (row.type === 'skip') {
            return (
              <div key={i} style={{ padding: '2px 10px 2px 52px', color: '#6b7280', fontStyle: 'italic', userSelect: 'none' }}>
                ⋯ {row.count} unchanged line{row.count === 1 ? '' : 's'}
              </div>
            );
          }
          if (row.type === 'indented') {
            const spaces = Math.abs(row.delta);
            return (
              <div key={i} data-diff="indented"
                style={{ background: ROW_STYLE.indent.background, borderLeft: `3px solid ${ROW_STYLE.indent.border}`, padding: '2px 10px 2px 52px', color: ROW_STYLE.indent.text, whiteSpace: 'pre-wrap' }}>
                ⇥ lines {row.first}–{row.last}: {row.delta > 0 ? 'indent' : 'unindent'} these {row.count} lines by {spaces} space{spaces === 1 ? '' : 's'}
                {spaces === 4 ? ` (select them and press ${row.delta > 0 ? 'Tab' : 'Shift+Tab'})` : ''}
              </div>
            );
          }
          const style = ROW_STYLE[row.type];
          return (
            <div key={i} data-diff={row.type}
              style={{ display: 'flex', background: style.background, borderLeft: `3px solid ${style.border}`, padding: '0 10px 0 4px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              <span style={{ color: '#4b5563', width: 32, flexShrink: 0, textAlign: 'right', paddingRight: 6, userSelect: 'none' }}>
                {row.targetLineNumber ?? ''}
              </span>
              <span style={{ color: style.markColour, width: 14, flexShrink: 0, userSelect: 'none' }}>{style.mark}</span>
              <span style={{ color: style.text, minWidth: 0, flex: 1, textDecoration: row.type === 'remove' ? 'line-through' : 'none' }}>{row.line || ' '}</span>
            </div>
          );
        })}
      </pre>
    </div>
  );
}
