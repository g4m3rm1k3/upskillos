// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ editor: null, run: vi.fn() }));
vi.mock('@monaco-editor/react', () => ({ default: props => { mock.editor = props; return <textarea readOnly value={props.value} />; } }));
vi.mock('../../utils/monacoThemes.js', () => ({ setupOpenCalcMonaco: vi.fn() }));
vi.mock('../../context/ThemeContext.jsx', () => ({ useGlobalTheme: () => ({ codeTypography: {} }) }));
vi.mock('../ui/CodeSettingsModal.jsx', () => ({ getCodeFontFamily: () => 'monospace', getCodeFontSize: () => '13' }));
vi.mock('./DesktopDocsWorkspace.jsx', () => ({ default: () => <div>Real desktop project</div> }));
vi.mock('./WorkspaceTerminal.jsx', () => ({ default: React.forwardRef((props, ref) => { React.useImperativeHandle(ref, () => ({ run: mock.run, print: vi.fn() })); return <span>Scratch terminal</span>; }) }));
import DocsCodeWorkspace from './DocsCodeWorkspace.jsx';
let host, root;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear(); delete window.openCalcDesktop; mock.run.mockClear();
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); delete window.openCalcDesktop; delete globalThis.IS_REACT_ACT_ENVIRONMENT; });
it('opens browser output in a modal when Run is pressed', async () => {
  await act(async () => root.render(<DocsCodeWorkspace />));
  expect(document.querySelector('dialog').open).toBe(false);
  await act(async () => [...host.querySelectorAll('button')].find(b => b.textContent.includes('Run')).click());
  expect(document.querySelector('dialog').open).toBe(true);
  expect(mock.run).toHaveBeenCalledTimes(1);
});
it('loads the latest scratchpad when the code pane is reopened', async () => {
  await act(async () => root.render(<DocsCodeWorkspace />));
  await act(async () => mock.editor.onChange('keep my work'));
  await act(async () => root.unmount()); root = createRoot(host);
  await act(async () => root.render(<DocsCodeWorkspace />));
  expect(mock.editor.value).toBe('keep my work');
});
it('defaults to the real project when the desktop bridge exists', async () => {
  window.openCalcDesktop = { project: {} };
  await act(async () => root.render(<DocsCodeWorkspace />));
  expect(host.textContent).toContain('Desktop project · real files & shell');
  expect([...host.querySelectorAll('div')].find(el => el.textContent === 'Real desktop project').parentElement.className).toContain('flex');
});
