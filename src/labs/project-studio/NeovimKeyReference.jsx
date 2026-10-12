// NeovimKeyReference.jsx
// The Keys reference on the Neovim editor pane: every key the Neovim series teaches, grouped by
// the chapter that teaches it, with the nearest VS Code key where there is one. It is there in any
// lesson where the learner chose Neovim, so a key they've forgotten is one search away. The list
// is the key-hint glossary (keys/neovim.js), so a chapter's new keys appear here as it adds them.
import { useEffect, useMemo, useRef, useState } from 'react';
import { NEOVIM_KEYS } from './keys/neovim.js';
import { TRACKS, TRACK_KEYS, trackTitle } from './trackLoader.js';

// Chapters in catalogue order, each with its keys in the order they're taught.
export function keyReferenceGroups(glossary = NEOVIM_KEYS) {
  const order = TRACK_KEYS.flatMap((track) => TRACKS[track].map((lesson) => lesson.id));
  const lessonNumber = (ref) => TRACKS[ref.split('/')[0]]?.find((l) => l.id === ref)?.title?.split(' — ')[0] ?? '';
  const entries = Object.entries(glossary)
    .map(([id, entry]) => ({ id, ...entry, at: order.indexOf(entry.taught), lesson: lessonNumber(entry.taught) }))
    .sort((a, b) => a.at - b.at);
  const groups = [];
  for (const entry of entries) {
    const track = entry.taught.split('/')[0];
    if (groups.at(-1)?.track !== track) groups.push({ track, title: trackTitle(track), keys: [] });
    groups.at(-1).keys.push(entry);
  }
  return groups;
}

// Every word of the query must appear in the keys, the name, the VS Code key or the chapter.
export function filterKeyGroups(groups, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return groups;
  return groups
    .map((g) => ({ ...g, keys: g.keys.filter((k) => {
      const text = `${k.keys} ${k.name} ${k.vscode ?? ''} ${g.title}`.toLowerCase();
      return words.every((w) => text.includes(w));
    }) }))
    .filter((g) => g.keys.length);
}

export default function NeovimKeyReference({ onClose, C }) {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => filterKeyGroups(keyReferenceGroups(), query), [query]);
  const input = useRef(null);
  useEffect(() => { input.current?.focus(); }, []);
  const kbd = { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, padding: '0 5px', borderRadius: 4, border: `1px solid ${C.border}`, background: C.surface2, whiteSpace: 'nowrap' };

  return (
    <div
      role="dialog"
      aria-label="Neovim keys"
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
      style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 30, width: 'min(420px, 100%)',
        display: 'flex', flexDirection: 'column', background: C.surface, color: C.text,
        borderLeft: `1px solid ${C.border}`, boxShadow: '-6px 0 18px rgba(0,0,0,0.3)', fontSize: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: `1px solid ${C.border}` }}>
        <input
          ref={input}
          type="search"
          aria-label="Search keys"
          placeholder="Search: delete, word, Cmd+Z…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, fontSize: 12, padding: '4px 8px', background: C.surface2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 4 }}
        />
        <button onClick={onClose} aria-label="Close keys" style={{ border: 'none', background: 'transparent', color: C.hint, cursor: 'pointer', fontSize: 13 }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px 12px' }}>
        {groups.length === 0 && <div style={{ padding: '12px 0', color: C.hint }}>No key matches “{query}”.</div>}
        {groups.map((g) => (
          <section key={g.track}>
            <h3 style={{ margin: '12px 0 4px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, color: C.hint }}>{g.title}</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {g.keys.map((k) => (
                  <tr key={k.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '4px 8px 4px 0', width: 1 }}><kbd style={kbd}>{k.keys}</kbd></td>
                    <td style={{ padding: '4px 0' }}>
                      {k.name}
                      {k.vscode && <div style={{ fontSize: 11, color: C.hint }}>VS Code: {k.vscode}</div>}
                    </td>
                    <td style={{ padding: '4px 0 4px 8px', textAlign: 'right', color: C.hint, whiteSpace: 'nowrap' }} title="The lesson that teaches it">{k.lesson}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
      <div style={{ padding: '6px 10px', borderTop: `1px solid ${C.border}`, color: C.hint, fontSize: 11 }}>
        Esc closes this list; click the editor to type in Neovim again. Inside Neovim, <code>:help</code> plus a key (<code>:help dd</code>) gives the full manual entry.
      </div>
    </div>
  );
}
