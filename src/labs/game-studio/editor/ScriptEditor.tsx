// The script editor: Monaco, with the engine's globals declared so completion and
// hover work (input, scene, Vec2, the node classes). Edits stay in the editor until
// saved (Ctrl/Cmd+S, or Run, which saves first); an unsaved script shows ● on its tab.

import React, { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { Store } from './store';
import { C, useStore } from './kit';
import { ENGINE_DTS } from './engineTypes';
import { svgSize } from '../core/api';
import { SAMPLE_RATE, soundProblem, synthesize, type SoundRecipe } from '../core/sound';

/** An SVG image beside its text: the picture as it stands now, unsaved edits included, or what is wrong with it. */
function SvgPreview({ text }: { text: string }) {
  const size = svgSize(text);
  return (
    <div data-testid="svg-preview" style={{ width: 300, borderRight: `1px solid ${C.border}`, padding: 10, overflow: 'auto', fontSize: 12, color: C.dim, background: '#2a2d33' }}>
      <div style={{ color: C.faint, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>PREVIEW</div>
      {typeof size === 'string'
        ? <div data-testid="svg-problem" style={{ color: C.warn }}>{size}</div>
        : <>
          <div style={{ background: 'repeating-conic-gradient(#3a3d44 0% 25%, #30333a 0% 50%) 50% / 16px 16px', display: 'inline-block', padding: 6, borderRadius: 4 }}>
            <img alt="" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`} style={{ display: 'block', width: Math.min(size.width * 2, 270), maxWidth: 270 }} />
          </div>
          <div style={{ marginTop: 6 }}>{size.width} × {size.height} pixels (shown {Math.min(size.width * 2, 270) / size.width}×). Save (Ctrl/Cmd+S) and every sprite using it shows it.</div>
        </>}
    </div>
  );
}

/** A sound's recipe beside its text: the waveform as it stands now (unsaved edits included), ▶ to hear it, and what
 *  each number means. */
function SoundPreview({ store, text }: { store: Store; text: string }) {
  let recipe: SoundRecipe | null = null, problem: string | null = null;
  try { recipe = JSON.parse(text); problem = soundProblem(recipe!); } catch (e) { problem = e instanceof Error ? e.message : String(e); }
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const g = c.getContext('2d')!, w = c.width, h = c.height;
    g.fillStyle = '#1f2126'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.15)'; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
    if (problem || !recipe) return;
    // Each column shows the highest and lowest sample it covers: the waveform's outline.
    const s = synthesize(recipe), per = s.length / w;
    g.strokeStyle = '#69db7c'; g.beginPath();
    for (let x = 0; x < w; x++) {
      let lo = 0, hi = 0;
      for (let i = Math.floor(x * per); i < Math.min(s.length, Math.floor((x + 1) * per) + 1); i++) { lo = Math.min(lo, s[i]); hi = Math.max(hi, s[i]); }
      g.moveTo(x + 0.5, h / 2 - hi * h / 2); g.lineTo(x + 0.5, h / 2 - lo * h / 2);
    }
    g.stroke();
  });
  return (
    <div data-testid="sound-preview" style={{ width: 300, borderRight: `1px solid ${C.border}`, padding: 10, overflow: 'auto', fontSize: 12, color: C.dim, background: '#2a2d33' }}>
      <div style={{ color: C.faint, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>WAVEFORM</div>
      <canvas ref={canvas} width={270} height={90} style={{ display: 'block', borderRadius: 4 }} />
      {problem
        ? <div data-testid="sound-problem" style={{ color: C.warn, marginTop: 6 }}>{problem}</div>
        : <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <button data-testid="hear-recipe" onClick={() => store.hearRecipe(recipe!)} style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 4, padding: '3px 10px', cursor: 'pointer' }}>▶ Hear it</button>
          <span>{Math.round(recipe!.length * SAMPLE_RATE)} samples. Save (Ctrl/Cmd+S) to use it.</span>
        </div>}
      <div style={{ marginTop: 10, lineHeight: 1.5 }}>
        <div><b>wave</b>: square (bright), triangle (soft), sine (pure), saw (buzzy), noise (hiss)</div>
        <div><b>from</b>, <b>to</b>: the pitch at the start and end, in hertz; it slides between them. 440 is the A above middle C; double it for an octave up.</div>
        <div><b>length</b>: seconds. <b>attack</b>: seconds to fade in, then it fades out to the end.</div>
        <div><b>volume</b>: 0 to 1. <b>seed</b>: which noise.</div>
      </div>
    </div>
  );
}

type MonacoEditor = Parameters<OnMount>[0];

// When an editor closes, Monaco cancels its own pending work (hover, highlights, diagnostics) and
// reports each cancellation as an error nobody handles: an Error named and saying "Canceled". It is
// expected, not a fault (VS Code ignores these too), so only that exact error is silenced here.
const isCancel = (r: unknown) => r instanceof Error && r.name === 'Canceled' && r.message === 'Canceled';
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (e) => { if (isCancel(e.reason)) e.preventDefault(); });
  window.addEventListener('error', (e) => { if (isCancel(e.error)) e.preventDefault(); });
}
let typesAdded = false;

export function ScriptEditor({ store, path }: { store: Store; path: string }) {
  useStore(store);
  const ed = useRef<MonacoEditor | null>(null);
  const text = store.scriptText(path);
  const svg = path.endsWith('.svg'), wav = path.endsWith('.wav');

  const reveal = store.reveal;
  useEffect(() => {
    if (!reveal || reveal.path !== path || !ed.current) return;
    ed.current.revealLineInCenter(reveal.line);
    ed.current.setPosition({ lineNumber: reveal.line, column: reveal.column });
    ed.current.focus();
    store.reveal = null;
  }, [reveal, path, store]);

  // Every project script is a Monaco model, not only the one open, so an import of another
  // script ("./grid.js") resolves, and completion knows what that script exports.
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const syncModels = () => {
    const monaco = monacoRef.current;
    if (!monaco || !store.project) return;
    for (const sc of store.project.scripts) {
      if (sc.path === path) continue;   // the open one belongs to the editor
      const uri = monaco.Uri.parse(`file:///${sc.path}`), text = store.scriptText(sc.path);
      const model = monaco.editor.getModel(uri);
      if (!model) monaco.editor.createModel(text, 'javascript', uri);
      else if (model.getValue() !== text) model.setValue(text);
    }
    // A script that was deleted (or belongs to another project) is no longer importable.
    const paths = new Set(store.project.scripts.map((x) => `/${x.path}`));
    for (const m of monaco.editor.getModels()) if (m.uri.path.startsWith('/scripts/') && !paths.has(m.uri.path) && m.uri.path !== `/${path}`) m.dispose();
  };
  useEffect(syncModels);

  const onMount: OnMount = (editor, monaco) => {
    ed.current = editor;
    // For browser tests, in development only (like window.__gameStudio).
    if (import.meta.env?.DEV) (window as unknown as { __gameStudioMonaco?: unknown }).__gameStudioMonaco = monaco;
    if (!typesAdded) {
      typesAdded = true;
      monaco.languages.typescript.javascriptDefaults.addExtraLib(ENGINE_DTS, 'file:///game-studio-engine.d.ts');
      // JavaScript itself and the Game API, but not the browser's DOM: scripts do not use it, and its
      // own Node type would hide the engine's Node from completion and hover. checkJs underlines a
      // misspelt name (this.isOnFlor()) before the game runs; the example scripts check clean.
      // Monaco checks only syntax in JavaScript unless told otherwise. The "could be typed" hints are
      // noise in plain JavaScript, so they are off.
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false, noSuggestionDiagnostics: true });
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({ target: monaco.languages.typescript.ScriptTarget.ES2020, lib: ['es2020'], allowNonTsExtensions: true, allowJs: true, checkJs: true, module: monaco.languages.typescript.ModuleKind.ESNext, moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs });
    }
    monacoRef.current = monaco;
    // A kept model may hold text from before (another project with the same script path): show this project's.
    const own = editor.getModel();
    if (own && own.getValue() !== text) own.setValue(text);
    syncModels();
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => { store.saveScript(path); });
    if (store.reveal?.path === path) {
      const r = store.reveal; store.reveal = null;
      editor.revealLineInCenter(r.line); editor.setPosition({ lineNumber: r.line, column: r.column }); editor.focus();
    }
  };

  return (
    <div data-testid="script-editor" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', padding: '3px 8px', fontSize: 11, color: C.faint, borderBottom: `1px solid ${C.border}`, fontFamily: C.mono }}>
        <span style={{ flex: 1 }}>{path}{store.isScriptDirty(path) ? '  ● unsaved (Ctrl/Cmd+S)' : '  saved'}</span>
        {path.startsWith('scripts/tools/') && (
          <button data-testid="run-tool" onClick={() => store.runTool(path)} title="Run this tool: its function builds part of the project, as one step you can undo (GUI → code shows it as project.runTool)" style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 4, padding: '1px 10px', marginRight: 12, cursor: 'pointer', fontFamily: 'system-ui, sans-serif' }}>▶ Run tool</button>
        )}
        <span role="link" data-testid="script-reference" onClick={() => store.showReference()} title="Every class, method and global a script can use" style={{ color: C.accent, cursor: 'pointer', fontFamily: 'system-ui, sans-serif' }}>API reference</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* The preview on the left: a task's panel sits over the right of this area. */}
        {svg && <SvgPreview text={text} />}
        {wav && <SoundPreview store={store} text={text} />}
        <div style={{ flex: 1, minWidth: 0 }}>
        <Editor
          path={`file:///${path}`}
          keepCurrentModel   // every script stays a model (see syncModels), so closing a tab does not dispose one
          language={svg ? 'xml' : wav ? 'json' : 'javascript'}
          theme="vs-dark"
          value={text}
          onChange={(v) => store.editScript(path, v ?? '')}
          onMount={onMount}
          options={{ fontSize: 13, minimap: { enabled: false }, tabSize: 2, scrollBeyondLastLine: false, automaticLayout: true, wordWrap: svg ? 'on' : 'off' }}
        />
        </div>
      </div>
    </div>
  );
}
