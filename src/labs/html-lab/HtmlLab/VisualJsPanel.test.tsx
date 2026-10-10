// @vitest-environment happy-dom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import VisualJsPanel from './VisualJsPanel';
import { normalizeProject, transpileProject } from '../../visual-code/transpiler.ts';
import { parse } from 'acorn';
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
  const output = transpileProject(normalizeProject({ target: 'javascript', files: [{id:'a',name:'a.js',blocks:scoped.blocks}], activeFileId:'a' })).code;
  const ast = parse(output, {ecmaVersion:'latest'});
  expect(ast.body[0].type).toBe('ExpressionStatement');
  expect(output).toContain('let local = 1');
});
it('still converts supported JavaScript to structured editable blocks', () => {
  const imported = importVisualJs('console.log("hello");');
  expect(imported.preserved).toBe(false);
  expect(imported.blocks[0].type).toBe('log');
});

it('imports mixed syntax as separate blocks and reports button completion', async () => {
  const code = 'console.log("first");\n// explanation\nconst pattern = /[};]/;\nconsole.log("last");';
  const imported = importVisualJs(code);
  expect(imported.blocks.map(b => b.type)).toEqual(['log', 'call', 'log']);
  expect(imported.blocks[1].fields.expression).toContain('// explanation');
  const onCodeChange = vi.fn();
  render(<VisualJsPanel elements={[]} html="" jsFiles={[{id:'a',name:'a.js',code}]} activeJsFileId="a" onCodeChange={onCodeChange} />);
  fireEvent.click(screen.getByRole('button', {name:'← Import from JS'}));
  await waitFor(() => expect(screen.getAllByTitle('Delete')).toHaveLength(3));
  expect(screen.getByRole('button', {name:'✓ Imported from JS'})).toBeTruthy();
  expect(onCodeChange).not.toHaveBeenCalled();
});

it('edits imported text with a text field and keeps the pattern synchronized with code edits', async () => {
  const onCodeChange = vi.fn();
  render(<VisualJsPanel elements={[]} html="" jsFiles={[{id:'a',name:'a.js',code:'console.log("hello");'}]} activeJsFileId="a" tabVisitCount={1} onCodeChange={onCodeChange} />);
  fireEvent.click(await screen.findByTitle('Edit Log block'));
  expect((screen.getByLabelText('Expression pattern') as HTMLSelectElement).value).toBe('textValue');
  fireEvent.change(screen.getByLabelText('Text', {exact:true}), {target:{value:'changed'}});
  await waitFor(() => expect(onCodeChange).toHaveBeenLastCalledWith('a','console.log("changed");'));
  fireEvent.change(screen.getByLabelText('Expression code'), {target:{value:'42'}});
  expect((screen.getByLabelText('Expression pattern') as HTMLSelectElement).value).toBe('numberValue');
  fireEvent.change(screen.getByLabelText('Number', {exact:true}), {target:{value:'43'}});
  await waitFor(() => expect(onCodeChange).toHaveBeenLastCalledWith('a','console.log(43);'));
});

it('refreshes nested controls when their parent code changes', async () => {
  render(<VisualJsPanel elements={[]} html="" jsFiles={[{id:'a',name:'a.js',code:'console.log(load(1));'}]} activeJsFileId="a" tabVisitCount={1} onCodeChange={vi.fn()} />);
  fireEvent.click(await screen.findByTitle('Edit Log block'));
  expect((screen.getByLabelText('Number', {exact:true}) as HTMLInputElement).value).toBe('1');
  fireEvent.change(screen.getByLabelText('Expression code'), {target:{value:'load(true)'}});
  await waitFor(() => expect((screen.getByLabelText('Boolean') as HTMLSelectElement).value).toBe('true'));
  expect(screen.queryByLabelText('Number', {exact:true})).toBeNull();
});
