// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
vi.mock('@monaco-editor/react', () => ({ default: ({ value }) => <textarea readOnly value={value} /> }));
vi.mock('../../utils/monacoThemes.js', () => ({ setupOpenCalcMonaco: vi.fn() }));
vi.mock('@xterm/xterm', () => ({ Terminal: class { cols = 80; rows = 24; loadAddon() {} open() {} onData() { return { dispose() {} }; } onResize() { return { dispose() {} }; } dispose() {} reset() {} write() {} focus() {} clear() {} } }));
vi.mock('@xterm/addon-fit', () => ({ FitAddon: class { fit() {} } }));
import EditorPane from './EditorPane.jsx';
import { nvimEditor } from './NeovimPane.jsx';

function desktopBridge({ installed }) {
  let progress = null;
  const terminal = {
    start: vi.fn(async () => ({ ok: true, id: 'nv1', shell: 'nvim' })),
    nvim: vi.fn(async () => ({ ok: true })),
    kill: vi.fn(), write: vi.fn(), resize: vi.fn(), onData: () => () => {}, onExit: () => () => {},
  };
  const bridge = {
    terminal,
    getRuntimeStatus: vi.fn(async () => ({ ok: true, status: { installed } })),
    installRuntime: vi.fn(async () => {
      progress?.({ runtime: 'neovim', phase: 'downloading-neovim', percent: 40 });
      installed = true;
      return { ok: true };
    }),
    onRuntimeProgress: (cb) => { progress = cb; return () => { progress = null; }; },
  };
  return bridge;
}

async function withPane(bridge, run) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.openCalcDesktop = bridge;
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  const onEditorKind = vi.fn();
  const render = (props) => act(async () => root.render(<EditorPane C={{}} openFiles={['src/main.cpp', 'README.md']}
    activeFile="src/main.cpp" content="" onChange={() => {}} root="/proj" projectKey="cpp-game"
    editorKind="nvim" onEditorKind={onEditorKind} {...props} />));
  try {
    await run({ host, render, onEditorKind });
  } finally {
    await act(async () => root.unmount());
    host.remove();
    delete window.openCalcDesktop;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
}

it('installs Neovim when it is missing, then opens the active file in it', async () => {
  const bridge = desktopBridge({ installed: false });
  await withPane(bridge, async ({ host, render }) => {
    await render();
    expect(bridge.installRuntime).toHaveBeenCalledWith('neovim');
    expect(bridge.terminal.start).toHaveBeenCalledWith(expect.objectContaining({ editor: 'nvim', file: 'src/main.cpp', projectKey: 'cpp-game' }));
    expect(host.querySelector('textarea')).toBeNull();

    // Choosing another file opens it in the running session; Run writes Neovim's buffers.
    await render({ activeFile: 'README.md' });
    expect(bridge.terminal.nvim).toHaveBeenLastCalledWith('nv1', 'open', 'README.md');
    await nvimEditor.writeAll();
    expect(bridge.terminal.nvim).toHaveBeenLastCalledWith('nv1', 'writeAll');
  });
});

it('uses an installed Neovim without downloading, and Monaco stays the same editor as before', async () => {
  const bridge = desktopBridge({ installed: true });
  await withPane(bridge, async ({ host, render, onEditorKind }) => {
    await render();
    expect(bridge.installRuntime).not.toHaveBeenCalled();
    expect(bridge.terminal.start).toHaveBeenCalledTimes(1);

    const select = host.querySelector('select[aria-label="Editor"]');
    await act(async () => { select.value = 'monaco'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(onEditorKind).toHaveBeenCalledWith('monaco');

    await render({ editorKind: 'monaco', content: 'int main() {}' });
    expect(host.querySelector('textarea').value).toBe('int main() {}');
    expect(bridge.terminal.kill).toHaveBeenCalledWith('nv1');
    // With no session, the lab's calls into Neovim do nothing.
    expect(nvimEditor.writeAll()).toBeNull();
  });
});
