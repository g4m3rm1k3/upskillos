import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useProjectFs } from '../../labs/project-studio/useProjectFs.js';
import FileTree from '../../labs/project-studio/FileTree.jsx';
import TerminalPanel from '../../labs/project-studio/TerminalPanel.jsx';
import { useThemeColors } from '../../hooks/useThemeColors.js';
import { useGlobalTheme } from '../../context/ThemeContext.jsx';
import { setupOpenCalcMonaco } from '../../utils/monacoThemes.js';
import { getCodeFontFamily, getCodeFontSize } from '../ui/CodeSettingsModal.jsx';
import WorkspaceOutputDialog from './WorkspaceOutputDialog.jsx';
import { draftKey, readDrafts, saveWorkspaceBuffer } from './desktopWorkspaceFiles.js';

const PROJECT_KEY = 'markdown-hub';
const LANG = { py: 'python', js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', cs: 'csharp', csproj: 'xml', cpp: 'cpp', h: 'cpp', c: 'c', html: 'html', css: 'css', json: 'json', md: 'markdown', java: 'java', rs: 'rust', go: 'go', sh: 'shell', ps1: 'powershell', yaml: 'yaml', yml: 'yaml' };

export default function DesktopDocsWorkspace(props) {
  const fs = useProjectFs(PROJECT_KEY);
  const C = useThemeColors();
  return <div className="flex flex-col flex-1 min-h-0 h-full" style={{ color: C.text, background: C.surface }}>
    {fs.error && <p role="alert" className="p-3 text-sm">{fs.error}</p>}
    {fs.root ? <Project key={fs.root} fs={fs} C={C} {...props} /> :
      <div className="p-6 space-y-4 text-sm">
        <h2 className="text-lg font-semibold">Your tutorial. Your project.</h2>
        <p>Open a folder to edit real files alongside the tutorial. Use the terminal for installed languages, packages, Git, and development servers.</p>
        <p>Terminal and output open in a separate modal, leaving the editor full height.</p>
        {fs.missing && <p role="alert">The previous folder is unavailable: {fs.missing}</p>}
        <button disabled={fs.loading} className="rounded bg-sky-600 text-white px-4 py-2" onClick={() => fs.pick().catch(() => {})}>Open project folder</button>
      </div>}
  </div>;
}

function Project({ fs, C, pendingRun, onCodeChange, monacoTheme }) {
  const [buffers, setBuffers] = useState(() => readDrafts(fs.root));
  const [active, setActive] = useState(() => Object.keys(readDrafts(fs.root))[0] || null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [explorer, setExplorer] = useState(true);
  const [output, setOutput] = useState(false);
  const [terminalStarted, setTerminalStarted] = useState(false);
  const operation = useRef(false);
  const [snippet, setSnippet] = useState(null);
  const [wrap, setWrap] = useState(false);
  const { codeTypography } = useGlobalTheme();
  const state = useRef({ buffers, active });
  state.current = { buffers, active };
  const saveRef = useRef(null);
  const dirty = Object.values(buffers).some(b => b.content !== b.base);
  const button = { border: `1px solid ${C.border}`, background: C.surface2, borderRadius: 5, padding: '4px 8px', fontSize: 12 };

  // Persist synchronously with each edit, including when the code pane is closed.
  function update(next) {
    state.current.buffers = next;
    setBuffers(next);
    try { localStorage.setItem(draftKey(fs.root), JSON.stringify(next)); }
    catch { setError('Draft backup could not be stored. Save your files before closing this workspace.'); }
  }
  useEffect(() => { if (pendingRun) setSnippet(pendingRun); }, [pendingRun]);
  useEffect(() => {
    const buffer = buffers[active];
    onCodeChange?.({ code: buffer?.content || '', language: LANG[active?.split('.').pop()] || 'plaintext', filename: active || '', fileList: Object.entries(buffers).map(([name, b]) => ({ name, content: b.content })), getTerminalOutput: () => '' });
  }, [buffers, active, onCodeChange]);
  useEffect(() => {
    const guard = event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);

  async function action(work) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true); setError(null);
    try { return await work(); } catch (e) { setError(e.message); return { ok: false, reason: e.message }; }
    finally { operation.current = false; setBusy(false); }
  }
  async function open(path) {
    if (state.current.buffers[path]?.content !== state.current.buffers[path]?.base) { setActive(path); return; }
    const res = await fs.api.read(path);
    if (!res.ok || res.missing) throw new Error(res.reason || `${path} no longer exists.`);
    update({ ...state.current.buffers, [path]: { content: res.content, base: res.content } });
    setActive(path);
  }
  async function saveAll() {
    for (const [path, buffer] of Object.entries(state.current.buffers)) {
      if (buffer.content === buffer.base) continue;
      const result = await saveWorkspaceBuffer(fs.api, path, buffer);
      if (!result.ok) throw new Error(result.reason || `Could not save ${path}`);
      update({ ...state.current.buffers, [path]: { ...state.current.buffers[path], base: buffer.content } });
    }
    return true;
  }
  saveRef.current = () => action(saveAll);
  async function mutate(work) {
    const result = await work();
    if (!result?.ok) throw new Error(result?.reason || 'The operation failed.');
    await fs.refresh();
    return result;
  }
  function close(path) {
    const b = state.current.buffers[path];
    if (b.content !== b.base && !window.confirm(`Discard unsaved changes to ${path}?`)) return;
    const next = { ...state.current.buffers }; delete next[path]; update(next);
    if (active === path) setActive(Object.keys(next)[0] || null);
  }

  return <>
    <header className="flex flex-wrap items-center gap-2 p-2 border-b" style={{ borderColor: C.border }}>
      <button style={button} disabled={busy} onClick={() => action(async () => { await saveAll(); await fs.pick(); })}>Open folder</button>
      <button style={button} onClick={() => setExplorer(v => !v)}>{explorer ? 'Hide files' : 'Show files'}</button>
      <button style={button} disabled={busy || !dirty} onClick={() => action(saveAll)}>{busy ? 'Working…' : 'Save all'}</button>
      <button style={button} disabled={busy} onClick={() => action(async () => { await saveAll(); setTerminalStarted(true); setOutput(true); })}>Terminal / output</button>
      <button style={button} aria-pressed={wrap} onClick={() => setWrap(v => !v)}>Wrap</button>
    </header>
    {error && <p role="alert" className="p-3 text-xs text-amber-600">{error}</p>}
    {snippet && <div className="p-3 text-xs border-b space-x-2">
      <span>Tutorial snippet ready. Select a file to append it without replacing your work.</span>
      <button style={button} disabled={!active || busy} onClick={() => {
        const b = state.current.buffers[active];
        update({ ...state.current.buffers, [active]: { ...b, content: b.content + '\n' + snippet.code } }); setSnippet(null);
      }}>Append to file</button>
      <button style={button} onClick={() => setSnippet(null)}>Dismiss</button>
    </div>}
    <div className="flex flex-1 min-h-0 min-w-0">
      {explorer && <aside className="w-44 shrink-0 border-r overflow-hidden" style={{ borderColor: C.border, pointerEvents: busy ? 'none' : undefined }}>
        <FileTree C={C} root={fs.root} entries={fs.entries} activeFile={active}
          onPick={() => action(async () => { await saveAll(); await fs.pick(); })}
          onOpen={path => action(() => open(path))}
          onNewFile={path => action(async () => { const r = await mutate(() => fs.api.create(path)); await open(path); return r; })}
          onNewFolder={path => action(() => mutate(() => fs.api.mkdir(path)))}
          onRename={(from, to) => action(async () => {
            await saveAll(); const r = await mutate(() => fs.api.rename(from, to));
            const next = { ...state.current.buffers }; delete next[from]; update(next); await open(to); return r;
          })}
          onDelete={path => action(async () => {
            if (!window.confirm(`Delete ${path} from disk?`)) return;
            await mutate(() => fs.api.remove(path));
            const next = { ...state.current.buffers }; delete next[path]; update(next);
            if (active === path) setActive(Object.keys(next)[0] || null);
          })} />
      </aside>}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <div className="flex overflow-x-auto shrink-0 border-b" style={{ borderColor: C.border }}>
          {Object.entries(buffers).map(([path, b]) => <div key={path} className="flex shrink-0 items-center border-r text-xs" style={{ background: active === path ? C.blueBg : C.surface2 }}>
            <button className="px-3 py-2" disabled={busy} title={path} onClick={() => action(() => open(path))}>{path}{b.content !== b.base ? ' ●' : ''}</button>
            <button disabled={busy} className="pr-2" aria-label={`Close ${path}`} onClick={() => close(path)}>×</button>
          </div>)}
        </div>
        <div className="flex-1 min-h-0">
          {active && buffers[active] ? <Editor height="100%" path={`mdhub://${encodeURIComponent(fs.root)}/${active}`}
            value={buffers[active].content} language={LANG[active.split('.').pop()] || 'plaintext'}
            theme={monacoTheme || (C.dark ? 'open-calc-dark' : 'open-calc-light')} beforeMount={setupOpenCalcMonaco}
            onMount={(editor, monaco) => { editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveRef.current?.()); }}
            onChange={content => { const path = state.current.active; if (path) update({ ...state.current.buffers, [path]: { ...state.current.buffers[path], content: content ?? '' } }); }}
            options={{ readOnly: busy, automaticLayout: true, minimap: { enabled: false }, fontSize: parseInt(getCodeFontSize(codeTypography.fontSize), 10), fontFamily: getCodeFontFamily(codeTypography.font), fontLigatures: codeTypography.ligatures, wordWrap: wrap ? 'on' : 'off', scrollBeyondLastLine: false, bracketPairColorization: { enabled: true }, padding: { top: 12 }, tabSize: 4 }} />
            : <div className="p-6 text-sm opacity-70">Open a file or create one in the explorer to begin coding.</div>}
        </div>
        <footer className="flex items-center gap-2 px-2 py-1 text-xs border-t" style={{ borderColor: C.border }}>
          <span className="truncate flex-1" title={fs.root}>{active || fs.root} · {dirty ? 'Unsaved draft' : 'Saved'}</span>
          <button style={button} disabled={busy} onClick={() => action(() => fs.refresh())}>Refresh files</button>
          <button style={button} disabled={!active || busy} onClick={() => action(async () => {
            if (!window.confirm(`Reload ${active} from disk and discard its draft?`)) return;
            const res = await fs.api.read(active);
            if (!res.ok || res.missing) throw new Error(res.reason || 'File no longer exists. Draft retained.');
            update({ ...state.current.buffers, [active]: { content: res.content, base: res.content } });
          })}>Reload file</button>
        </footer>
      </div>
    </div>
    <WorkspaceOutputDialog open={output} onClose={() => setOutput(false)}>
      <p className="px-4 py-2 text-xs text-slate-400">Run your project commands here. Closing this modal keeps the shell running; leaving the workspace stops it.</p>
      <div className="flex-1 min-h-0">{terminalStarted && <TerminalPanel root={fs.root} projectKey={PROJECT_KEY} visible={output} C={C} />}</div>
    </WorkspaceOutputDialog>
  </>;
}
