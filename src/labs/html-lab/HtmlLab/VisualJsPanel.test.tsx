// @vitest-environment happy-dom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import VisualJsPanel from './VisualJsPanel';
import { importVisualJs } from './visualJsImport';
afterEach(cleanup);
it('keeps imported source untouched until an edit, and writes empty source when the last block is deleted', async () => {
  const onCodeChange = vi.fn();
  render(<VisualJsPanel elements={[]} html="" jsFiles={[{id:'a',name:'a.js',code:'console.log("hello");'}]} activeJsFileId="a" tabVisitCount={1} onCodeChange={onCodeChange} />);
  await waitFor(() => expect(screen.getAllByTitle('Delete')).toHaveLength(1));
  expect(onCodeChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByTitle('Delete'));
  await waitFor(() => expect(onCodeChange).toHaveBeenCalledWith('a',''));
});
it('does not write into either file when switching the active file', async () => {
  const onCodeChange = vi.fn();
  const files = [{id:'a',name:'a.js',code:'console.log("A");'}, {id:'b',name:'b.js',code:'console.log("B");'}];
  const props = {elements:[],html:'',jsFiles:files,tabVisitCount:1,onCodeChange};
  const {rerender} = render(<VisualJsPanel {...props} activeJsFileId="a" />);
  await waitFor(() => expect(screen.getAllByTitle('Delete')).toHaveLength(1));
  rerender(<VisualJsPanel {...props} activeJsFileId="b" />);
  await waitFor(() => expect(screen.getByText(/Visual JS · b.js/)).toBeTruthy());
  expect(onCodeChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByTitle('Delete'));
  await waitFor(() => expect(onCodeChange).toHaveBeenCalledWith('b',''));
});
it('preserves code with scope, comments or unsupported syntax instead of rewriting it', () => {
  for (const code of ['(() => { let local = 1; console.log(local); })();', '// Keep this explanation\nconsole.log("hi");', 'const pattern = /[};]/;']) {
    const imported = importVisualJs(code);
    if (imported.preserved) expect(imported.blocks[0].fields.expression).toBe(code);
  }
  const scoped = importVisualJs('(() => { let local = 1; })();');
  expect(scoped.preserved).toBe(true);
});
it('still converts supported JavaScript to structured editable blocks', () => {
  const imported = importVisualJs('console.log("hello");');
  expect(imported.preserved).toBe(false);
  expect(imported.blocks[0].type).toBe('log');
});
