// HintLadder.jsx
// A hint ladder (hints.js): rungs are revealed one at a time, each giving away a little more.
// How many rungs the learner has opened is remembered on this device.
import { useCallback, useState } from 'react';
import MarkdownProse from '../../components/math/MarkdownProse.jsx';

const KEY = 'project-studio-hints-v1';

function loadAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

function useRevealed(id) {
  const [shown, setShown] = useState(() => Number(loadAll()[id]) || 0);
  const save = useCallback((next) => {
    setShown(next);
    try {
      const all = loadAll();
      if (next) all[id] = next; else delete all[id];
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {}
  }, [id]);
  return [shown, save];
}

export default function HintLadder({ id, hints, C, proseClass }) {
  const [shown, setShown] = useRevealed(id);
  const accent = C.hint ?? '#94a3b8';
  const next = hints[shown];

  return (
    <div data-hints={id} style={{ margin: '12px 0', border: `1px dashed ${C.border ?? accent}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '5px 10px', background: C.surface2, borderBottom: `1px solid ${C.border}`, fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: accent }}>
        Stuck? Hints, one at a time
      </div>
      <div style={{ padding: '6px 10px 10px', color: C.text }}>
        {hints.slice(0, shown).map((hint, i) => (
          <div key={hint.key} data-hint-rung={hint.key} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: accent }}>{i + 1}. {hint.label}</div>
            <MarkdownProse text={hint.text} className={proseClass} />
          </div>
        ))}
        {next ? (
          <button onClick={() => setShown(shown + 1)}
            style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.text, cursor: 'pointer' }}>
            Show hint {shown + 1} of {hints.length}: {next.label.toLowerCase()}
          </button>
        ) : (
          <button onClick={() => setShown(0)}
            style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, border: 'none', background: 'transparent', color: accent, cursor: 'pointer' }}>
            Hide hints
          </button>
        )}
      </div>
    </div>
  );
}
