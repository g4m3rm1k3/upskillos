// OutputPanel.jsx
// Streamed stdout/stderr from the running project, in a collapsible bottom
// pane. Same event shape the notebook components consume
// (desktop:script-output), just routed to a project run rather than a
// scratch script.
import { useEffect, useRef, useState } from 'react';

export default function OutputPanel({ lines, running, onClear, C }) {
  const [open, setOpen] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines, open]);

  return (
    <div style={{ borderTop: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '4px 10px', cursor: 'pointer', userSelect: 'none',
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <span style={{ fontSize: 10, color: C.hint }}>{open ? '▾' : '▸'}</span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted }}>
          Output
        </span>
        {running && <span style={{ fontSize: 10, color: C.teal }}>running…</span>}
        <div style={{ flex: 1 }} />
        {lines.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            style={{ border: 'none', background: 'transparent', color: C.hint, fontSize: 10, cursor: 'pointer' }}
          >
            clear
          </button>
        )}
      </div>

      {open && (
        <div
          ref={scrollRef}
          style={{
            height: 150, overflowY: 'auto', padding: '4px 12px 10px',
            fontFamily: 'monospace', fontSize: 12, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}
        >
          {lines.length === 0 && (
            <span style={{ color: C.hint }}>Run the project to see its output here.</span>
          )}
          {lines.map((l, i) => (
            <span key={i} style={{ color: l.stream === 'stderr' ? C.red : l.stream === 'meta' ? C.hint : C.text }}>
              {l.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
