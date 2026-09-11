// DiffBlock.jsx
// The step's target code, with the lines the learner doesn't have yet
// marked green — this is the "show me what's new" piece.
//
// It deliberately lives in the LESSON panel, not in the editor. The editor
// holds the learner's own file; decorating that buffer with line numbers
// taken from the target would mark the wrong lines, and pre-filling the
// editor with the target would defeat the point of typing it. So: the
// reference (read-only, diffed) on one side, your real file on the other.
import { useMemo } from 'react';
import { diffLines } from './lineDiff.js';

export default function DiffBlock({ current, target, C }) {
  const ops = useMemo(() => diffLines(current, target), [current, target]);
  const addedCount = ops.filter((o) => o.type === 'add').length;

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', margin: '10px 0' }}>
      <div
        style={{
          padding: '5px 10px',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: addedCount === 0 ? C.teal : C.muted,
          background: C.surface2,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {addedCount === 0
          ? '✓ your file already matches this'
          : `${addedCount} new line${addedCount === 1 ? '' : 's'} — type them into the editor`}
      </div>

      <pre
        style={{
          margin: 0,
          padding: '8px 0',
          fontSize: 12.5,
          lineHeight: 1.55,
          overflowX: 'auto',
          background: '#1e1e1e',
          fontFamily: 'monospace',
        }}
      >
        {ops
          // Lines the learner has that the target doesn't isn't something
          // to type — showing removals here would just be noise.
          .filter((op) => op.type !== 'remove')
          .map((op, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                background: op.type === 'add' ? 'rgba(45, 212, 191, 0.16)' : 'transparent',
                borderLeft: op.type === 'add' ? '3px solid #2dd4bf' : '3px solid transparent',
                padding: '0 10px 0 7px',
                whiteSpace: 'pre',
              }}
            >
              <span style={{ color: op.type === 'add' ? '#2dd4bf' : '#4b5563', width: 14, flexShrink: 0, userSelect: 'none' }}>
                {op.type === 'add' ? '+' : ' '}
              </span>
              <span style={{ color: op.type === 'add' ? '#e6fffb' : '#8a8f98' }}>{op.line || ' '}</span>
            </div>
          ))}
      </pre>
    </div>
  );
}
