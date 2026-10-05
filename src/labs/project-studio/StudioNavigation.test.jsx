// @vitest-environment happy-dom
import React,{act} from 'react';import{createRoot}from'react-dom/client';import{it,expect,vi}from'vitest';
vi.mock('react-router-dom',()=>({useNavigate:()=>()=>{}}));
vi.mock('../../hooks/useThemeColors',()=>({useThemeColors:()=>({dark:true,canvasSurface:'#1e293b',bg:'#020617',surface:'#1e293b',surface2:'#0f172a',text:'#e2e8f0',border:'#475569',hint:'#94a3b8'})}));
vi.mock('../../context/ThemeContext.jsx',()=>({useGlobalTheme:()=>({themeStyles:{}})}));
vi.mock('./progress.js',()=>{const state={position:{trackKey:'cpp-foundations'},savePosition:vi.fn(),isDone:()=>false,markDone:vi.fn()};return{useProgress:()=>state};});
vi.mock('./useProjectFs.js',()=>{const readFile=async()=>'';const refresh=async()=>{};return{useProjectFs:key=>({available:true,root:key==='cpp-foundations'?null:'/memory',entries:[],readFile,refresh,pick:vi.fn(),writeFile:async()=>({ok:true})})};});
vi.mock('./EditorPane.jsx',()=>({default:()=> <div>Code editor</div>}));
vi.mock('./TerminalPanel.jsx',()=>({default:()=> <div>Terminal</div>}));
vi.mock('./CppProjectRuntime.jsx',()=>({default:()=>null}));
vi.mock('../../components/math/MarkdownProse.jsx',()=>({default:({text})=><p>{text}</p>}));
import ProjectStudio from './index.jsx';
import {setEntryLink} from '../../utils/entryLinks.js';
it('shows grouped C++ chapters, keeps explorer available without a folder, and confines the bottom pane',async()=>{
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;localStorage.clear();window.openCalcDesktop={onScriptOutput:()=>()=>{}};
 const host=document.createElement('div');document.body.appendChild(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(<ProjectStudio/>));
  const series=host.querySelector('[aria-label="Series"]');expect(series.value).toBe('cpp-mastery');
  expect(host.querySelector('[data-pane="explorer"]').textContent).toContain('No folder selected for this chapter');
  await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Hide explorer').click());
  expect(host.querySelector('[data-pane="explorer"]')).toBeNull();
  const chapter=host.querySelector('[aria-label="Chapter"]');await act(async()=>{chapter.value='cpp-memory';chapter.dispatchEvent(new Event('change',{bubbles:true}));});
  expect(host.querySelector('[aria-label="Series"]').value).toBe('cpp-mastery');
  await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Show explorer').click());
  expect(host.querySelector('[data-pane="explorer"]')).not.toBeNull();
  const terminal=[...host.querySelectorAll('div')].find(el=>el.textContent==='Terminal'&&el.children.length===0);
  expect(terminal.parentElement.style.overflow).toBe('hidden');expect(terminal.parentElement.style.position).toBe('relative');
  expect(terminal.parentElement.style.background).toBe('#1e293b');
  await act(async()=>setEntryLink('project-studio','?track=circuit-clash'));
  expect(host.querySelector('[aria-label="Series"]').value).toBe('circuit-clash');
  expect(host.textContent).toContain('Launch Circuit Clash');
  await act(async()=>setEntryLink('project-studio','?track=missing-track'));
  expect(host.querySelector('[aria-label="Series"]').value).toBe('circuit-clash');
 }finally{await act(async()=>root.unmount());host.remove();delete window.openCalcDesktop;delete globalThis.IS_REACT_ACT_ENVIRONMENT;localStorage.clear();}
});
