// @vitest-environment happy-dom
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import FileTree from './FileTree.jsx';
let root,host,create,folder;
beforeEach(async()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);create=vi.fn(async()=>({ok:true}));folder=vi.fn(async()=>({ok:true}));await act(async()=>root.render(<FileTree entries={[]} root="/pong" C={{}} onNewFile={create} onNewFolder={folder}/>));});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();delete globalThis.IS_REACT_ACT_ENVIRONMENT;});
async function enter(text){const input=host.querySelector('input');await act(async()=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,text);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});}
async function submit(){await act(async()=>host.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));}
it('opens a file name field with + and creates the entered relative path',async()=>{await act(async()=>host.querySelector('[aria-label="New file"]').click());await enter('src/player.cpp');await submit();expect(create).toHaveBeenCalledWith('src/player.cpp');expect(host.querySelector('form')).toBeNull();});
it('shows a failed creation and retains the field for retry',async()=>{create.mockResolvedValue({ok:false,reason:'main.cpp already exists'});await act(async()=>host.querySelector('[aria-label="New file"]').click());await enter('main.cpp');await submit();expect(host.querySelector('[role="alert"]').textContent).toContain('already exists');expect(host.querySelector('input').value).toBe('main.cpp');});
it('creates folders using the same visible entry flow and supports cancel',async()=>{await act(async()=>host.querySelector('[aria-label="New folder"]').click());await enter('src');await submit();expect(folder).toHaveBeenCalledWith('src');await act(async()=>host.querySelector('[aria-label="New file"]').click());await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Cancel').click());expect(host.querySelector('form')).toBeNull();expect(create).not.toHaveBeenCalled();});
it('can create a second file immediately after the first',async()=>{
 await act(async()=>host.querySelector('[aria-label="New file"]').click());await enter('wrong.cpp');await submit();
 const plus=host.querySelector('[aria-label="New file"]');expect(plus.disabled).toBe(false);
 await act(async()=>plus.click());await enter('game.h');await submit();
 expect(create.mock.calls).toEqual([['wrong.cpp'],['game.h']]);expect(plus.disabled).toBe(false);
});
it('prefills rename and submits the original and corrected paths without opening the file',async()=>{
 const rename=vi.fn(async()=>({ok:true}));const open=vi.fn();
 await act(async()=>root.render(<FileTree entries={[{name:'wrong.cpp',rel:'wrong.cpp',type:'file'}]} root="/pong" C={{}} onRename={rename} onOpen={open} onNewFile={create} onNewFolder={folder}/>));
 await act(async()=>host.querySelector('[aria-label="Rename wrong.cpp"]').click());
 expect(host.querySelector('input').value).toBe('wrong.cpp');await enter('main.cpp');await submit();
 expect(rename).toHaveBeenCalledWith('wrong.cpp','main.cpp');expect(open).not.toHaveBeenCalled();expect(host.querySelector('form')).toBeNull();
});
it('asks before deleting in the page, never with window.confirm, and deletes only on confirming',async()=>{
 const remove=vi.fn(async()=>({ok:true}));const confirm=vi.fn(()=>true);window.confirm=confirm;
 await act(async()=>root.render(<FileTree entries={[{name:'old.py',rel:'old.py',type:'file'}]} root="/kit" C={{}} onDelete={remove} onNewFile={create} onNewFolder={folder}/>));
 const deleteButton=()=>host.querySelector('[aria-label="Delete old.py"]');
 await act(async()=>deleteButton().click());
 expect(host.querySelector('form').textContent).toContain('Delete old.py?');expect(remove).not.toHaveBeenCalled();
 await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Cancel').click());
 expect(host.querySelector('form')).toBeNull();expect(remove).not.toHaveBeenCalled();
 await act(async()=>deleteButton().click());await submit();
 expect(remove).toHaveBeenCalledWith('old.py');expect(host.querySelector('form')).toBeNull();expect(confirm).not.toHaveBeenCalled();
});
