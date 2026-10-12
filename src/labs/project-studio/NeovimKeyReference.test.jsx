// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@monaco-editor/react', () => ({ default: () => <textarea readOnly /> }));
vi.mock('../../utils/monacoThemes.js', () => ({ setupOpenCalcMonaco: vi.fn() }));
vi.mock('./NeovimPane.jsx', () => ({ default: () => <div data-testid="nvim" /> }));
import EditorPane from './EditorPane.jsx';
import { filterKeyGroups, keyReferenceGroups } from './NeovimKeyReference.jsx';
import { NEOVIM_KEYS } from './keys/neovim.js';

describe('Neovim key reference', () => {
  it('lists every glossary key once, grouped by chapter in catalogue order', () => {
    const groups = keyReferenceGroups();
    expect(groups.map((g) => g.track).slice(0, 3)).toEqual(['nvim-start', 'nvim-motions', 'nvim-operators']);
    expect(new Set(groups.map((g) => g.track)).size).toBe(groups.length);
    const ids = groups.flatMap((g) => g.keys.map((k) => k.id));
    expect(ids.sort()).toEqual(Object.keys(NEOVIM_KEYS).sort());
    expect(groups[0].keys[0]).toMatchObject({ id: 'i', lesson: '1.1' });
  });

  it('finds keys by name, by VS Code key, and needs every word to match', () => {
    const groups = keyReferenceGroups();
    const ids = (q) => filterKeyGroups(groups, q).flatMap((g) => g.keys.map((k) => k.id));
    expect(ids('cmd+z')).toEqual(['u']);
    expect(ids('delete line')).toContain('dd');
    expect(ids('delete line')).not.toContain('x');
    expect(ids('no such key')).toEqual([]);
    expect(ids('')).toHaveLength(Object.keys(NEOVIM_KEYS).length);
  });
});

describe('Keys button on the editor pane', () => {
  let root;
  afterEach(async () => {
    await act(async () => root?.unmount());
    delete window.openCalcDesktop;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  async function render(editorKind) {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window.openCalcDesktop = { terminal: {} };
    const host = document.createElement('div');
    root = createRoot(host);
    await act(async () => root.render(<EditorPane C={{}} openFiles={['a.js']} activeFile="a.js" content=""
      editorKind={editorKind} onEditorKind={() => {}} onSelect={() => {}} onClose={() => {}} onChange={() => {}} />));
    return host;
  }

  it('appears only with Neovim, opens the list, and Esc closes it', async () => {
    const monaco = await render('monaco');
    expect([...monaco.querySelectorAll('button')].some((b) => b.textContent === 'Keys')).toBe(false);
    await act(async () => root.unmount());

    const host = await render('nvim');
    const button = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Keys');
    await act(async () => button.click());
    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog.textContent).toContain('VS Code: Cmd+Z');
    await act(async () => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });
});
