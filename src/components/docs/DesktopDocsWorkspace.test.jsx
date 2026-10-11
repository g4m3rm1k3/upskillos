// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ fs: null, editor: null, mounts: 0 }));
vi.mock('../../labs/project-studio/useProjectFs.js', () => ({ useProjectFs: () => mock.fs }));
vi.mock('../../hooks/useThemeColors.js', () => ({ useThemeColors: () => ({}) }));
vi.mock('../../context/ThemeContext.jsx', () => ({ useGlobalTheme: () => ({ codeTypography: {} }) }));
vi.mock('../../utils/monacoThemes.js', () => ({ setupOpenCalcMonaco: vi.fn() }));
vi.mock('../ui/CodeSettingsModal.jsx', () => ({ getCodeFontFamily: () => 'monospace', getCodeFontSize: () => '13' }));
vi.mock('@monaco-editor/react', () => ({ default: props => { mock.editor = props; return <textarea readOnly value={props.value} />; } }));
vi.mock('../../labs/project-studio/TerminalPanel.jsx', () => ({ default: () => { React.useEffect(() => { mock.mounts++; }, []); return <span>Native shell</span>; } }));
import DesktopDocsWorkspace from './DesktopDocsWorkspace.jsx';
let host, root;
const click = async text => { const b = [...document.querySelectorAll('button')].find(b => b.textContent === text); expect(b).toBeTruthy(); await act(async () => b.click()); };
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear(); mock.mounts = 0;
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  mock.fs = { root: 'C:/tutorial', entries: [{ type: 'file', name: 'main.py', rel: 'main.py' }], api: { read: vi.fn().mockResolvedValue({ ok: true, content: 'original' }), write: vi.fn().mockResolvedValue({ ok: true }) }, refresh: vi.fn(), pick: vi.fn() };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); delete globalThis.IS_REACT_ACT_ENVIRONMENT; });
async function render(props = {}) { await act(async () => root.render(<DesktopDocsWorkspace {...props} />)); }
async function open() { const row = [...host.querySelectorAll('span')].find(el => el.textContent === 'main.py'); await act(async () => row.click()); }
it('keeps unsaved edits across files and recovers them after remount', async () => {
  await render(); await open();
  await act(async () => mock.editor.onChange('my draft'));
  expect(host.textContent).toContain('Unsaved draft');
  await act(async () => root.unmount()); root = createRoot(host); await render();
  expect(mock.editor.value).toBe('my draft');
  await click('Save all');
  expect(mock.fs.api.write).toHaveBeenCalledWith('main.py', 'my draft');
  expect(host.textContent).not.toContain('Unsaved draft');
});
it('retains a draft and explains external conflicts', async () => {
  await render(); await open(); await act(async () => mock.editor.onChange('draft'));
  mock.fs.api.read.mockResolvedValue({ ok: true, content: 'someone else' });
  await click('Save all');
  expect(mock.fs.api.write).not.toHaveBeenCalled();
  expect(host.querySelector('[role=alert]').textContent).toContain('changed on disk');
  expect(mock.editor.value).toBe('draft');
});
it('closes output without unmounting the native shell', async () => {
  await render(); await click('Terminal / output');
  expect(document.querySelector('dialog').open).toBe(true);
  await click('Close · Esc');
  expect(document.querySelector('dialog').open).toBe(false);
  await click('Terminal / output'); expect(mock.mounts).toBe(1);
});
it('requires explicit snippet insertion and never replaces existing code', async () => {
  await render({ pendingRun: { code: 'tutorial code', language: 'python' } }); await open();
  expect(mock.editor.value).toBe('original');
  await click('Append to file');
  expect(mock.editor.value).toBe('original\ntutorial code');
  expect(mock.fs.api.write).not.toHaveBeenCalled();
});
