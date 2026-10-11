// keyHints.jsx
// Key hints in lesson prose. A lesson writes {{key:<id>}} (ids are in keys/*.js). Up to and
// including the lesson that teaches the key, the hint shows it in full: the keys, then the name.
// In later lessons it shows only the name, underlined, and the keys appear on hover, focus or tap,
// so the learner recalls them first and checks second.
import { useState } from 'react';
import { TRACKS, TRACK_KEYS } from './trackLoader.js';
import { NEOVIM_KEYS } from './keys/neovim.js';

export const KEY_GLOSSARY = { ...NEOVIM_KEYS };

const MARKER = /\{\{key:([^}]+)\}\}/g;

// {{key:ciw}} → an element MarkdownProse hands to KeyHint (rehype-raw keeps unknown tags).
export function expandKeyHints(text) {
  return String(text ?? '').replace(MARKER, (_, id) => `<keyhint data-id="${id.replace(/"/g, '&quot;')}"></keyhint>`);
}

// Every lesson's id ("<track>/<file name>") in catalogue order, for comparing positions.
const ORDER = TRACK_KEYS.flatMap((track) => TRACKS[track].map((lesson) => lesson.id));
const position = (ref) => ORDER.indexOf(ref);
const lessonOf = (ref) => TRACKS[ref.split('/')[0]]?.find((lesson) => lesson.id === ref);

// The current lesson's id, or null for a lesson outside the catalogue (a draft or scrap lesson).
export function lessonRef(lesson) {
  return lesson && ORDER.includes(lesson.id) ? lesson.id : null;
}

export function KeyHint({ id, current, C }) {
  const [open, setOpen] = useState(false);
  const entry = KEY_GLOSSARY[id];
  if (!entry) return <code title="Unknown key hint (a mistake in the lesson)">{id}</code>;
  const taughtAt = position(entry.taught);
  const here = current ? position(current) : -1;
  const kbd = <kbd style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.9em', padding: '0 4px', borderRadius: 4, border: `1px solid ${C?.border ?? '#888'}`, background: C?.surface2 ?? 'transparent' }}>{entry.keys}</kbd>;
  // Not yet past the teaching lesson (or outside the catalogue, as a draft is): show it all.
  if (here < 0 || taughtAt < 0 || here <= taughtAt) return <span>{kbd} ({entry.name})</span>;
  const taughtIn = lessonOf(entry.taught)?.title?.split(' — ')[0];
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={`${entry.name}: ${entry.keys}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen((o) => !o)}
      style={{ position: 'relative', borderBottom: `1px dotted ${C?.blue ?? 'currentColor'}`, cursor: 'help' }}
    >
      {entry.name}
      {open && (
        <span role="tooltip" style={{
          position: 'absolute', left: 0, bottom: '1.6em', zIndex: 20, whiteSpace: 'nowrap',
          padding: '4px 8px', borderRadius: 6, fontSize: 12, lineHeight: 1.4,
          background: C?.surface ?? '#111', color: C?.text ?? '#eee', border: `1px solid ${C?.border ?? '#444'}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        }}>
          {kbd}{taughtIn ? <span style={{ opacity: 0.7 }}> · taught in {taughtIn}</span> : null}
        </span>
      )}
    </span>
  );
}
