// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import MarkdownProse from '../../components/math/MarkdownProse.jsx';
import { KEY_GLOSSARY, KeyHint, expandKeyHints } from './keyHints.jsx';
import { TRACKS, TRACK_KEYS } from './trackLoader.js';

async function render(text, current) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div');
  const root = createRoot(host);
  const components = { keyhint: (props) => <KeyHint id={props['data-id'] ?? props.dataId} current={current} C={{}} /> };
  await act(async () => root.render(<MarkdownProse text={expandKeyHints(text)} components={components} />));
  return { host, done: () => act(async () => root.unmount()) };
}

describe('key hints', () => {
  it('show the keys in full up to the teaching lesson, and only the name afterwards', async () => {
    const early = await render('Undo with {{key:u}}.', 'nvim-start/01-04-undo-fix-and-help');
    expect(early.host.textContent).toBe('Undo with u (undo).');
    await early.done();

    const before = await render('Press {{key:u}}.', 'nvim-start/01-01-modes-insert-save-quit');
    expect(before.host.textContent).toContain('u (undo)');
    await before.done();

    const later = await render('Now {{key:i}} and type.', 'nvim-start/01-04-undo-fix-and-help');
    const hint = later.host.querySelector('[role="button"]');
    expect(hint.textContent).toBe('insert before the cursor');
    expect(later.host.querySelector('[role="tooltip"]')).toBeNull();
    await act(async () => { hint.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(later.host.querySelector('[role="tooltip"]').textContent).toContain('i');
    expect(later.host.querySelector('[role="tooltip"]').textContent).toContain('taught in 1.1');
    await later.done();
  });

  it('every {{key:…}} in a lesson names a key in the glossary, taught by a real lesson', () => {
    const refs = new Set(TRACK_KEYS.flatMap((t) => TRACKS[t].map((l) => l.id)));
    for (const [id, entry] of Object.entries(KEY_GLOSSARY)) expect(refs, `${id}: taught in ${entry.taught}`).toContain(entry.taught);
    for (const track of TRACK_KEYS) {
      for (const lesson of TRACKS[track]) {
        const text = [lesson.intro, ...lesson.steps.flatMap((s) => [s.prose, s.explain])].join('\n');
        for (const [, id] of String(text).matchAll(/\{\{key:([^}]+)\}\}/g)) {
          expect(KEY_GLOSSARY, `${lesson.id} uses {{key:${id}}}`).toHaveProperty([id]);
        }
      }
    }
  });
});
