// @vitest-environment happy-dom
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {it,expect,vi} from 'vitest';
vi.mock('@xterm/xterm',()=>({Terminal:class {cols=80;rows=24;loadAddon(){}open(){}onData(){return {dispose(){}}}onResize(){return {dispose(){}}}dispose(){}reset(){}write(){}focus(){}}}));
vi.mock('@xterm/addon-fit',()=>({FitAddon:class {fit(){}}}));
import TerminalPanel from './TerminalPanel.jsx';
it('starts the shell for the selected track and closes the previous shell on switching',async()=>{
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const bridge={start:vi.fn(async opts=>({ok:true,id:opts.projectKey,shell:'pwsh'})),kill:vi.fn(),write:vi.fn(),resize:vi.fn(),onData:()=>()=>{},onExit:()=>()=>{}};
 window.openCalcDesktop={terminal:bridge};
 const host=document.createElement('div');document.body.appendChild(host);const root=createRoot(host);
 try {
  await act(async()=>root.render(<TerminalPanel root="/pong" projectKey="cpp-game" visible={false} C={{}}/>));
  expect(bridge.start).toHaveBeenLastCalledWith({cols:80,rows:24,projectKey:'cpp-game'});
  await act(async()=>root.render(<TerminalPanel root="/sheet" projectKey="spreadsheet" visible={false} C={{}}/>));
  expect(bridge.kill).toHaveBeenCalledWith('cpp-game');
  expect(bridge.start).toHaveBeenLastCalledWith({cols:80,rows:24,projectKey:'spreadsheet'});
 }finally{await act(async()=>root.unmount());host.remove();delete window.openCalcDesktop;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});
it('offers WSL distros on Windows and restarts the terminal in the chosen one',async()=>{
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const bridge={start:vi.fn(async opts=>({ok:true,id:`t${bridge.start.mock.calls.length}`,shell:'pwsh'})),kill:vi.fn(),write:vi.fn(),resize:vi.fn(),onData:()=>()=>{},onExit:()=>()=>{},
  shells:async()=>({shells:[{id:'powershell',label:'PowerShell'},{id:'wsl:Ubuntu',label:'Ubuntu (WSL)'}],wsl:{installed:true}})};
 window.openCalcDesktop={terminal:bridge};
 localStorage.clear();
 const host=document.createElement('div');document.body.appendChild(host);const root=createRoot(host);
 try {
  await act(async()=>root.render(<TerminalPanel root="/shelf" projectKey="term-basics" visible={false} C={{}}/>));
  const select=host.querySelector('select[aria-label="Shell"]');
  expect([...select.options].map(o=>o.textContent)).toEqual(['PowerShell','Ubuntu (WSL)']);
  await act(async()=>{select.value='wsl:Ubuntu';select.dispatchEvent(new Event('change',{bubbles:true}));});
  expect(bridge.kill).toHaveBeenCalledWith('t1');
  expect(bridge.start).toHaveBeenLastCalledWith({shell:'wsl:Ubuntu',cols:80,rows:24,projectKey:'term-basics'});
  expect(localStorage.getItem('project-studio:terminal-shell:term-basics')).toBe('wsl:Ubuntu');
 }finally{await act(async()=>root.unmount());host.remove();delete window.openCalcDesktop;delete globalThis.IS_REACT_ACT_ENVIRONMENT;localStorage.clear();}
});
