// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
vi.mock('@monaco-editor/react', () => ({ default: ({value, language}) => <textarea readOnly value={value} data-language={language} /> }));
vi.mock('../../utils/monacoThemes.js', () => ({ setupOpenCalcMonaco: vi.fn() }));
import EditorPane from './EditorPane.jsx';
it('keeps learner content separate from the reference and detects extra lines as a mismatch', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div'), root = createRoot(host), onChange = vi.fn();
  const render = content => act(async () => root.render(<EditorPane C={{}} openFiles={['Scratch/Scratch.csproj']}
    activeFile="Scratch/Scratch.csproj" content={content} targetContent="<Project />" onChange={onChange} />));
  try {
    await render('');
    expect(host.querySelector('textarea').value).toBe('');
    expect(host.querySelector('textarea').dataset.language).toBe('xml');
    expect(onChange).not.toHaveBeenCalled();
    await render('<Project />\nextra');
    expect(host.textContent).toContain('Your file differs');
    expect(host.textContent).not.toContain('0 lines still to add');
    await render('<Project />');
    expect(host.textContent).toContain('This file matches the step');
  } finally {
    await act(async () => root.unmount());
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
