// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';

// The Monaco stand-in records the options it is given.
const seen = vi.hoisted(() => ({ options: null }));
vi.mock('@monaco-editor/react', () => ({
  default: ({ defaultValue, options }) => { seen.options = options; return <textarea readOnly value={defaultValue} />; },
}));
vi.mock('../../utils/monacoThemes.js', () => ({ setupOpenCalcMonaco: vi.fn() }));
import EditorPane from './EditorPane.jsx';

let root;
let host;
async function render(activeFile) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  host ??= document.body.appendChild(document.createElement('div'));
  root ??= createRoot(host);
  await act(async () => root.render(<EditorPane C={{}} openFiles={[activeFile]} activeFile={activeFile} content="" onChange={() => {}} />));
}
afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
  root = null; host = null;
  localStorage.clear();
});

it('starts with auto-indent off, so typed indentation is not doubled, and remembers turning it on', async () => {
  await render('kit/count.py');
  const box = host.querySelector('input[aria-label="Auto-indent"]');
  expect(box.checked).toBe(false);
  expect(seen.options.autoIndent).toBe('none');
  expect(seen.options.detectIndentation).toBe(false);

  await act(async () => box.click());
  expect(seen.options.autoIndent).toBe('full');
  expect(localStorage.getItem('project-studio:auto-indent')).toBe('on');
});

it('indents with spaces, except in a Makefile or Go file, which need tabs', async () => {
  await render('kit/count.py');
  expect(seen.options.insertSpaces).toBe(true);
  await render('Makefile');
  expect(seen.options.insertSpaces).toBe(false);
  await render('store/main.go');
  expect(seen.options.insertSpaces).toBe(false);
});
