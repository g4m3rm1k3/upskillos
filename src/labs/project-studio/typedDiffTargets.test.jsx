// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { parseLesson } from './parseTrack.js';
import { withTypedDiffTargets } from './typedDiffTargets.js';
import { TRACKS } from './trackLoader.js';
import DiffBlock from './DiffBlock.jsx';

const lesson = (id, mode, code, meta = '') => parseLesson(`---\ntypedDiff: true\n${meta}\n---\n## Type\nBefore\n\n\`\`\`csharp edit=A.cs mode=${mode}\n${code}\n\`\`\`\nAfter`, id);
it('accumulates across lessons, resets replacements, and preserves explanations without mutating source', () => {
  const raw = [lesson('a', 'replace', 'one'), lesson('b', 'append', 'two'), lesson('c', 'replace', 'three')];
  const result = withTypedDiffTargets(raw);
  expect(result.map(l => l.steps[0].target)).toEqual(['one', 'one\ntwo', 'three']);
  expect(result[1].steps[0]).toMatchObject({ prose: 'Before', explain: 'After', diffBefore: 'one' });
  expect(result[0].steps[0].diffBefore).toBe('');
  expect(result[2].steps[0].diffBefore).toBe('one\ntwo');
  expect(raw[0].steps[0].target).toBeNull();
  expect(result[0].steps[0].provided).not.toBe(true);
  expect(withTypedDiffTargets([{ meta: {}, steps: [] }])[0].steps).toEqual([]);
  expect(() => withTypedDiffTargets([lesson('bad', 'append', 'two')])).toThrow('append before creation');
});
it('gives every Circuit Clash required edit the exact accumulated reference without later code', () => {
  const files = new Map();
  const raw = TRACKS['circuit-clash'];
  const rendered = withTypedDiffTargets(raw);
  for (const l of rendered) for (const s of l.steps) {
    if (!s.edit || s.optional) continue;
    files.set(s.file, (s.edit.mode === 'append' ? files.get(s.file) : '') + s.edit.code);
    expect(s.target).toBe(files.get(s.file).replace(/\n$/, ''));
    expect(s.prose).not.toContain('edit=');
    expect(s.provided).not.toBe(true);
  }
  expect(raw.flatMap(l => l.steps).every(s => s.target == null)).toBe(true);
});
it('uses the existing live diff to detect a mistake and acknowledge the corrected file', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div');
  const root = createRoot(host);
  const target = withTypedDiffTargets([lesson('a', 'replace', 'float seconds = 0.5f;')])[0].steps[0].target;
  try {
    await act(async () => root.render(<DiffBlock C={{}} current="int seconds = 0;" target={target} />));
    expect(host.textContent).toContain('1 new line to type');
    expect(host.textContent).toContain('1 line to delete');
    await act(async () => root.render(<DiffBlock C={{}} current={target} target={target} />));
    expect(host.textContent).toContain('your file already matches this');
  } finally {
    await act(async () => root.unmount());
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
it('keeps optional experiments out of later references and tracks files independently', () => {
  const a = lesson('a', 'replace', 'one');
  const optional = lesson('optional', 'append', 'experiment');
  optional.steps[0].optional = true;
  const b = lesson('b', 'replace', 'other');
  b.steps[0].file = 'B.cs';
  const c = lesson('c', 'append', 'two');
  const result = withTypedDiffTargets([a, optional, b, c]);
  expect(result[1].steps[0].target).toBeNull();
  expect(result[2].steps[0].target).toBe('other');
  expect(result[3].steps[0].target).toBe('one\ntwo');
});
