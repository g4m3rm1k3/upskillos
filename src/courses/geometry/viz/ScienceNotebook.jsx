/**
 * ScienceNotebook.jsx
 * Clean lesson viewer for science / graphics courses.
 *
 * Cell types:
 *   type:'js'          — auto-run canvas / animation preview (read-only)
 *   type:'markdown'    — rich markdown prose
 *   type:'challenge'   — multiple-choice question with A/B/C/D buttons
 *   type:'coding'      — Monaco editor + Run + solutionCode reveal, checked one of two ways:
 *                        tests: JavaScript run after the learner's code, in a Web Worker the
 *                          sandboxed frame starts (it can call what they defined; there is no
 *                          DOM). It reports lines with __line(ok, text) and ends with
 *                          __verdict(pass, message). Their code never runs in the app, and the
 *                          frame stops it after 5 seconds.
 *                          timeoutMessage: what to say when it is stopped.
 *                        check(code) → bool or { pass, message }: inspects the source text.
 *   type:'walkthrough' — numbered steps with a live preview the learner follows
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { setupOpenCalcMonaco } from '../../../utils/monacoThemes.js'

import { makeNotebookTokens } from '../../../utils/themeTokens';
import { useGlobalTheme } from '../../../context/ThemeContext.jsx';
// ── Theme ──────────────────────────────────────────────────────────────────────
function useIsDark() {
  const isDark = () =>
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark')
  const [dark, setDark] = useState(isDark)
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(isDark()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

function makeT(dark) {
  return {
    ...makeNotebookTokens(dark),
    green:    dark ? '#34d399'  : '#16a34a',
    greenBg:  dark ? '#052e16'  : '#d1fae5',
    greenBd:  dark ? '#10b981'  : '#10b981',
    red:      dark ? '#f87171'  : '#dc2626',
    redBg:    dark ? '#450a0a'  : '#fee2e2',
    redBd:    dark ? '#ef4444'  : '#ef4444',
    yellow:   dark ? '#fbbf24'  : '#d97706',
    yellowBg: dark ? '#451a03'  : '#fef3c7',
    iframeBg: dark ? '#0f1923'  : '#ffffff',
  };
}

function iframeThemeVars(dark) {
  return dark ? `
    --color-background-primary:#0f172a;--color-background-secondary:#1e293b;
    --color-background-tertiary:#0f172a;--color-background-info:#172554;
    --color-border-primary:#334155;--color-border-secondary:#475569;
    --color-border-tertiary:#334155;
    --color-text-primary:#e2e8f0;--color-text-secondary:#94a3b8;
    --color-text-tertiary:#64748b;--color-text-info:#93c5fd;
  ` : `
    --color-background-primary:#ffffff;--color-background-secondary:#f8fafc;
    --color-background-tertiary:#f1f5f9;--color-background-info:#eff6ff;
    --color-border-primary:#e2e8f0;--color-border-secondary:#cbd5e1;
    --color-border-tertiary:#e2e8f0;
    --color-text-primary:#1e293b;--color-text-secondary:#475569;
    --color-text-tertiary:#64748b;--color-text-info:#1d4ed8;
  `
}

// ── Build iframe srcdoc ────────────────────────────────────────────────────────
function buildDoc(html = '', css = '', js = '', dark) {
  const escapedJs = js.replace(/<\/script>/gi, '<\\/script>')
  const iframeBg   = dark ? '#0f1923' : '#ffffff'
  const iframeText = dark ? '#e2e8f0' : '#1e293b'

  return `<!DOCTYPE html>
<html class="${dark ? 'dark' : ''}">
<head>
<meta charset="utf-8">
<style>
:root { ${iframeThemeVars(dark)} }
*,*::before,*::after{box-sizing:border-box}
body{margin:0;padding:14px;font-family:'Segoe UI',system-ui,sans-serif;font-size:14px;background:${iframeBg};color:${iframeText}}
html.dark .burns{background:#451a03!important;color:#fbbf24!important}
html.dark .stable{background:#052e16!important;color:#4ade80!important}
html.dark .dissolves{background:#052e16!important;color:#4ade80!important}
html.dark .separates{background:#450a0a!important;color:#f87171!important}
html.dark .atom-card,.fact-card,.result-box,.comp-item,.demo{background:#1e293b!important;border-color:#334155!important}
html.dark .ch1{background:#052e16!important;border-color:#166534!important}
html.dark .ch2{background:#172554!important;border-color:#1e40af!important}
html.dark .ch3{background:#2e1065!important;border-color:#7c3aed!important}
html.dark .ch4{background:#431407!important;border-color:#c2410c!important}
${css}
</style>
</head>
<body>
${html}
<script>
(function(){try{window.localStorage}catch(_){var _s={};var _m={getItem:function(k){return Object.prototype.hasOwnProperty.call(_s,k)?_s[k]:null},setItem:function(k,v){_s[String(k)]=String(v)},removeItem:function(k){delete _s[k]},clear:function(){_s={}},key:function(i){return Object.keys(_s)[i]||null},get length(){return Object.keys(_s).length}};try{Object.defineProperty(window,'localStorage',{value:_m,writable:true,configurable:true})}catch(__){}}})();
var isDark=document.documentElement.classList.contains('dark');
var BG=isDark?'#1e293b':'#fafaf8';var TEXT=isDark?'#e2e8f0':'#1e293b';var MUTED=isDark?'#94a3b8':'#64748b';
var GRID=isDark?'#334155':'#e2e8f0';var NAVY=isDark?'#93c5fd':'#1e3a5f';var GREEN=isDark?'#4ade80':'#1a3a2a';
var AMBER=isDark?'#fb923c':'#92400e';var PURPLE=isDark?'#a78bfa':'#7c3aed';var RED=isDark?'#f87171':'#dc2626';
var BORDER=isDark?'#475569':'#d1d5db';
try{(function(){
${escapedJs}
})()}catch(e){console.error(e.message)}
;(function(){
  function report(){window.parent.postMessage({type:'sn_resize',h:Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)},'*')}
  report();
  if(window.ResizeObserver){var ro=new ResizeObserver(report);ro.observe(document.body);ro.observe(document.documentElement)}
  else{window.addEventListener('load',report)}
  window.addEventListener('load',report);
  setTimeout(report,300);
})();
<\/script>
</body>
</html>`
}

// ── Build iframe srcdoc with console interception ─────────────────────────────
function buildDocWithConsole(html = '', css = '', js = '', dark, cellId = '') {
  const escapedJs  = js.replace(/<\/script>/gi, '<\\/script>')
  const iframeBg   = dark ? '#0f1923' : '#ffffff'
  const iframeText = dark ? '#e2e8f0' : '#1e293b'

  return `<!DOCTYPE html>
<html class="${dark ? 'dark' : ''}">
<head>
<meta charset="utf-8">
<style>
:root { ${iframeThemeVars(dark)} }
*,*::before,*::after{box-sizing:border-box}
body{margin:0;padding:14px;font-family:'Segoe UI',system-ui,sans-serif;font-size:14px;background:${iframeBg};color:${iframeText}}
html.dark .burns{background:#451a03!important;color:#fbbf24!important}
html.dark .stable{background:#052e16!important;color:#4ade80!important}
html.dark .dissolves{background:#052e16!important;color:#4ade80!important}
html.dark .separates{background:#450a0a!important;color:#f87171!important}
html.dark .atom-card,.fact-card,.result-box,.comp-item,.demo{background:#1e293b!important;border-color:#334155!important}
${css}
</style>
</head>
<body>
${html}
<script>
window.__snCellId='${cellId}';
(function(){
  var _l=console.log.bind(console),_e=console.error.bind(console),_w=console.warn.bind(console);
  function post(lv,args){
    var msg=args.map(function(a){try{return typeof a==='object'?JSON.stringify(a,null,2):String(a);}catch(_){return String(a);}}).join(' ');
    window.parent.postMessage({type:'sn_console',level:lv,msg:msg,cellId:'${cellId}'},'*');
  }
  console.log=function(){_l.apply(console,arguments);post('log',[].slice.call(arguments));};
  console.error=function(){_e.apply(console,arguments);post('error',[].slice.call(arguments));};
  console.warn=function(){_w.apply(console,arguments);post('warn',[].slice.call(arguments));};
  window.addEventListener('error',function(ev){post('error',[ev.message||'Runtime error']);ev.preventDefault();},true);
})();
(function(){try{window.localStorage}catch(_){var _s={};var _m={getItem:function(k){return Object.prototype.hasOwnProperty.call(_s,k)?_s[k]:null},setItem:function(k,v){_s[String(k)]=String(v)},removeItem:function(k){delete _s[k]},clear:function(){_s={}},key:function(i){return Object.keys(_s)[i]||null},get length(){return Object.keys(_s).length}};try{Object.defineProperty(window,'localStorage',{value:_m,writable:true,configurable:true})}catch(__){}}})();
var isDark=document.documentElement.classList.contains('dark');
var BG=isDark?'#1e293b':'#fafaf8';var TEXT=isDark?'#e2e8f0':'#1e293b';var MUTED=isDark?'#94a3b8':'#64748b';
var GRID=isDark?'#334155':'#e2e8f0';var NAVY=isDark?'#93c5fd':'#1e3a5f';var GREEN=isDark?'#4ade80':'#1a3a2a';
var AMBER=isDark?'#fb923c':'#92400e';var PURPLE=isDark?'#a78bfa':'#7c3aed';var RED=isDark?'#f87171':'#dc2626';
var BORDER=isDark?'#475569':'#d1d5db';
try{(function(){
${escapedJs}
})()}catch(e){console.error(e.message)}
;(function(){
  function report(){window.parent.postMessage({type:'sn_resize',h:Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)},'*')}
  report();
  if(window.ResizeObserver){var ro=new ResizeObserver(report);ro.observe(document.body);ro.observe(document.documentElement)}
  else{window.addEventListener('load',report)}
  window.addEventListener('load',report);
  setTimeout(report,300);
})();
<\/script>
</body>
</html>`
}

// ── Challenge iframe — question + answer buttons injected into preview ─────────
function buildChallengeDoc(html = '', css = '', js = '', options = [], dark) {
  const iframeBg   = dark ? '#0f1923' : '#ffffff'
  const iframeText = dark ? '#e2e8f0' : '#1e293b'
  const btnBase    = dark ? '#1e293b' : '#f8fafc'
  const btnBorder  = dark ? '#334155' : '#e2e8f0'
  const escapedJs  = js.replace(/<\/script>/gi, '<\\/script>')

  const optionsHtml = options.map(o => `
    <button class="opt-btn" data-label="${o.label}" onclick="pick(this)">
      <span class="opt-label">${o.label}</span>
      <span class="opt-text">${o.text}</span>
    </button>`).join('')

  return `<!DOCTYPE html>
<html class="${dark ? 'dark' : ''}">
<head>
<meta charset="utf-8">
<style>
:root{${iframeThemeVars(dark)}}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;padding:14px;font-family:'Segoe UI',system-ui,sans-serif;font-size:14px;background:${iframeBg};color:${iframeText}}
${css}
.sn-options{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.opt-btn{display:flex;align-items:flex-start;gap:12px;width:100%;padding:11px 14px;border-radius:9px;border:1.5px solid ${btnBorder};background:${btnBase};color:${iframeText};cursor:pointer;text-align:left;font-size:13px;line-height:1.5;transition:border-color .15s,background .15s}
.opt-btn:hover{border-color:var(--color-text-info,#3b82f6);background:var(--color-background-info,#eff6ff)}
.opt-btn.selected{border-color:var(--color-text-info,#3b82f6);background:var(--color-background-info,#eff6ff)}
.opt-btn.correct{border-color:#10b981;background:${dark ? '#052e16' : '#d1fae5'};color:${dark ? '#4ade80' : '#065f46'}}
.opt-btn.wrong{border-color:#ef4444;background:${dark ? '#450a0a' : '#fee2e2'};color:${dark ? '#f87171' : '#991b1b'}}
.opt-label{font-size:12px;font-weight:700;min-width:22px;height:22px;border-radius:50%;background:var(--color-background-tertiary,#f1f5f9);color:var(--color-text-secondary,#64748b);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.opt-btn.selected .opt-label,.opt-btn.correct .opt-label,.opt-btn.wrong .opt-label{background:currentColor;color:${iframeBg}}
.sn-feedback{margin-top:10px;padding:10px 14px;border-radius:8px;font-size:13px;line-height:1.6;display:none}
.sn-feedback.show{display:block}
.sn-feedback.pass{background:${dark ? '#052e16' : '#d1fae5'};color:${dark ? '#4ade80' : '#065f46'};border:1px solid #10b981}
.sn-feedback.fail{background:${dark ? '#450a0a' : '#fee2e2'};color:${dark ? '#f87171' : '#991b1b'};border:1px solid #ef4444}
</style>
</head>
<body>
${html}
<div class="sn-options">${optionsHtml}</div>
<div class="sn-feedback" id="sn-fb"></div>
<script>
var __answered = false;
var __correctLabel = null;
function __initChallenge(correctLabel, successMsg, failMsg) {
  __correctLabel = correctLabel;
  window.__successMsg = successMsg;
  window.__failMsg = failMsg;
}
function pick(btn) {
  if (__answered) return;
  __answered = true;
  var label = btn.getAttribute('data-label');
  var isCorrect = (label === __correctLabel);
  document.querySelectorAll('.opt-btn').forEach(function(b) {
    var bl = b.getAttribute('data-label');
    if (bl === __correctLabel) b.classList.add('correct');
    else if (bl === label && !isCorrect) b.classList.add('wrong');
  });
  var fb = document.getElementById('sn-fb');
  fb.textContent = isCorrect ? (window.__successMsg || 'Correct!') : (window.__failMsg || 'Not quite — try again.');
  fb.className = 'sn-feedback show ' + (isCorrect ? 'pass' : 'fail');
  window.parent.postMessage({type:'sn_answer',label:label,correct:isCorrect},'*');
}
(function(){try{window.localStorage}catch(_){var _s={};var _m={getItem:function(k){return Object.prototype.hasOwnProperty.call(_s,k)?_s[k]:null},setItem:function(k,v){_s[String(k)]=String(v)},removeItem:function(k){delete _s[k]},clear:function(){_s={}},key:function(i){return Object.keys(_s)[i]||null},get length(){return Object.keys(_s).length}};try{Object.defineProperty(window,'localStorage',{value:_m,writable:true,configurable:true})}catch(__){}}})();
var isDark=document.documentElement.classList.contains('dark');
var BG=isDark?'#1e293b':'#fafaf8';var TEXT=isDark?'#e2e8f0':'#1e293b';var MUTED=isDark?'#94a3b8':'#64748b';
var GRID=isDark?'#334155':'#e2e8f0';var NAVY=isDark?'#93c5fd':'#1e3a5f';var GREEN=isDark?'#4ade80':'#1a3a2a';
var AMBER=isDark?'#fb923c':'#92400e';var PURPLE=isDark?'#a78bfa':'#7c3aed';var RED=isDark?'#f87171':'#dc2626';
var BORDER=isDark?'#475569':'#d1d5db';
try{(function(){
${escapedJs}
})()}catch(e){}
;(function(){
  function report(){window.parent.postMessage({type:'sn_resize',h:Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)},'*')}
  report();
  if(window.ResizeObserver){var ro=new ResizeObserver(report);ro.observe(document.body);ro.observe(document.documentElement)}
  else{window.addEventListener('load',report)}
  window.addEventListener('load',report);
  setTimeout(report,300);
})();
<\/script>
</body>
</html>`
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
function MDText({ text, T }) {
  if (!text) return null
  return (
    <div style={{ fontSize: 14, lineHeight: 1.8, color: T.text }}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{
        h3: ({...p}) => <h3 style={{fontSize:'1.05rem',fontWeight:600,marginBottom:'0.5rem',color:T.accent}} {...p}/>,
        p:  ({...p}) => <p  style={{marginBottom:'1rem'}} {...p}/>,
        ul: ({...p}) => <ul style={{listStyleType:'disc',paddingLeft:'1.5rem',marginBottom:'1rem'}} {...p}/>,
        ol: ({...p}) => <ol style={{listStyleType:'decimal',paddingLeft:'1.5rem',marginBottom:'1rem'}} {...p}/>,
        li: ({...p}) => <li style={{marginBottom:'0.25rem'}} {...p}/>,
        strong: ({...p}) => <strong style={{color:T.text,fontWeight:600}} {...p}/>,
        // react-markdown 10 no longer says whether code is inline: a fenced block has a
        // language class or spans lines, and everything else is inline.
        code: ({node,className,children,...p}) => (/language-/.test(className || '') || String(children).includes('\n'))
          ? <code className={className} style={{display:'block',padding:'12px',background:T.panel2,borderRadius:8,margin:'10px 0',fontSize:12,fontFamily:'monospace',whiteSpace:'pre',overflowX:'auto'}} {...p}>{children}</code>
          : <code style={{fontFamily:'monospace',background:T.panel2,color:T.accent,padding:'2px 6px',borderRadius:4,fontSize:12}} {...p}>{children}</code>,
        blockquote: ({...p}) => <blockquote style={{borderLeft:`3px solid ${T.accent}`,paddingLeft:14,color:T.muted,margin:'10px 0'}} {...p}/>,
        table: ({...p}) => <table style={{borderCollapse:'collapse',width:'100%',margin:'12px 0',fontSize:13}} {...p}/>,
        th: ({...p}) => <th style={{padding:'6px 12px',borderBottom:`2px solid ${T.accent}`,textAlign:'left',color:T.accent,fontWeight:600}} {...p}/>,
        td: ({...p}) => <td style={{padding:'6px 12px',borderBottom:`1px solid ${T.border||'rgba(255,255,255,0.08)'}`,color:T.text}} {...p}/>,
        tr: ({...p}) => <tr {...p}/>
      }}>
        {text}
      </ReactMarkdown>
    </div>
  )
}

// ── Visual cell (type:'js') — auto-runs, no editor shown ──────────────────────
function VisualCell({ cell, cellIndex, T, dark, monacoTheme, forceCodeOpen }) {
  const iframeRef  = useRef(null)
  const [height, setHeight]     = useState(cell.outputHeight || 160)
  const [showCode, setShowCode] = useState(false)
  const [activeTab, setActiveTab] = useState('js')
  const manualRef  = useRef(false)

  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = buildDoc(cell.html || '', cell.css || '', cell.startCode || '', dark)
      manualRef.current = false
    }
  }, [cell.html, cell.css, cell.startCode, dark])

  // Auto-resize
  useEffect(() => {
    const handler = (e) => {
      if (!e.data || e.data.type !== 'sn_resize') return
      if (e.source !== iframeRef.current?.contentWindow) return
      if (!manualRef.current) setHeight(Math.max(80, e.data.h + 4))
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // Sync with global Ctrl+Shift+C toggle
  useEffect(() => {
    if (forceCodeOpen !== undefined) setShowCode(forceCodeOpen)
  }, [forceCodeOpen])

  function startResize(e) {
    e.preventDefault()
    manualRef.current = true
    const startY = e.clientY, startH = height
    const onMove = (ev) => setHeight(Math.max(80, startH + ev.clientY - startY))
    const onUp   = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const tabs = [
    { key: 'js',   lang: 'javascript', label: 'JS',   code: cell.startCode || '' },
    { key: 'html', lang: 'html',       label: 'HTML', code: cell.html      || '' },
    { key: 'css',  lang: 'css',        label: 'CSS',  code: cell.css       || '' },
  ].filter(t => t.code.trim())

  const currentTab = tabs.find(t => t.key === activeTab) || tabs[0] || { code: '', lang: 'javascript' }

  return (
    <div style={{ marginBottom: 20, borderRadius: 12, border: `1px solid ${T.border}`, background: T.panel }}>
      {/* Instruction + source toggle */}
      {cell.instruction && (
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1 }}><MDText text={cell.instruction} T={T} /></div>
          <button
            onClick={() => setShowCode(v => !v)}
            title="View source code (Ctrl+Shift+C)"
            style={{
              padding: '3px 10px', borderRadius: 5, flexShrink: 0, marginTop: 2,
              border: `1px solid ${showCode ? T.accent : T.border}`,
              background: showCode ? T.accent + '22' : 'transparent',
              color: showCode ? T.accent : T.muted,
              fontSize: 10, fontFamily: 'monospace', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
            {showCode ? '▼' : '▶'} {'{ }'} Source
          </button>
        </div>
      )}

      {/* Source code viewer */}
      {showCode && tabs.length > 0 && (
        <div style={{ borderBottom: `1px solid ${T.border}` }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 4, padding: '6px 12px', background: T.panel2, borderBottom: `1px solid ${T.border}` }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                padding: '3px 14px', borderRadius: 5, border: 'none', cursor: 'pointer',
                background: activeTab === t.key ? T.accent : 'transparent',
                color: activeTab === t.key ? '#fff' : T.muted,
                fontSize: 11, fontFamily: 'monospace', fontWeight: 600,
              }}>{t.label}</button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 10, color: T.muted, alignSelf: 'center', fontFamily: 'monospace' }}>
              read-only · Ctrl+Shift+C to close
            </span>
          </div>
          {/* Monaco editor (read-only — syntax errors highlighted in gutter) */}
          <Editor
            key={`src-${cellIndex}-${activeTab}-${dark}`}
            height={Math.min(420, Math.max(80, currentTab.code.split('\n').length * 19 + 24))}
            beforeMount={setupOpenCalcMonaco}
            language={currentTab.lang}
            value={currentTab.code}
            theme={monacoTheme || (dark ? 'open-calc-dark' : 'open-calc-light')}
            options={{
              readOnly: true, fontSize: 12, lineHeight: 19,
              minimap: { enabled: false }, scrollBeyondLastLine: false,
              wordWrap: 'off', renderLineHighlight: 'none',
              overviewRulerLanes: 0, folding: true,
              lineDecorationsWidth: 6, lineNumbersMinChars: 3,
              padding: { top: 8, bottom: 8 }, domReadOnly: true,
            }}
          />
        </div>
      )}

      {/* Preview iframe */}
      <div style={{ background: T.iframeBg, overflow: 'hidden' }}>
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts"
          style={{ width: '100%', height, border: 'none', display: 'block' }}
          title={`cell-${cellIndex}`}
        />
      </div>
      {/* Resize handle */}
      <div onMouseDown={startResize} title="Drag to resize"
        style={{ height: 8, cursor: 'ns-resize', background: T.border, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0 0 12px 12px' }}>
        <div style={{ width: 32, height: 3, borderRadius: 2, background: T.muted, opacity: 0.5 }} />
      </div>
    </div>
  )
}

// ── Challenge cell — options rendered as buttons in iframe ─────────────────────
function ChallengeCell({ cell, cellIndex, T, dark, monacoTheme, onPass }) {
  const iframeRef  = useRef(null)
  const [state, setState] = useState(null) // null | 'pass' | 'fail'

  // Derive the correct label from the check function
  // check(label) => true means that label is correct
  // We pre-compute it so we can pass it into the iframe JS
  const correctLabel = (() => {
    if (!cell.check || !cell.options) return null
    const found = cell.options.find(o => {
      try { return cell.check(o.label) } catch { return false }
    })
    return found ? found.label : null
  })()

  useEffect(() => {
    if (!iframeRef.current || !cell.options) return
    const escapedSuccess = (cell.successMessage || 'Correct!').replace(/'/g, "\\'")
    const escapedFail    = (cell.failMessage    || 'Not quite — try again.').replace(/'/g, "\\'")
    const initCall = `\n__initChallenge('${correctLabel}','${escapedSuccess}','${escapedFail}');`
    iframeRef.current.srcdoc = buildChallengeDoc(
      cell.html || '', cell.css || '',
      (cell.startCode || '') + initCall,
      cell.options, dark
    )
  }, [cell.html, cell.css, cell.startCode, cell.options, correctLabel, dark])

  // Listen for answer postMessage from iframe
  useEffect(() => {
    const handler = (e) => {
      if (!e.data || e.data.type !== 'sn_answer') return
      const passed = e.data.correct
      setState(passed ? 'pass' : 'fail')
      if (passed && onPass) onPass(cellIndex)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [cellIndex, onPass])

  const [height, setHeight] = useState(cell.outputHeight || 160)
  const manualRef = useRef(false)

  useEffect(() => {
    const handler = (e) => {
      if (!e.data || e.data.type !== 'sn_resize') return
      if (e.source !== iframeRef.current?.contentWindow) return
      if (!manualRef.current) setHeight(Math.max(80, e.data.h + 4))
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  function startResize(e) {
    e.preventDefault()
    manualRef.current = true
    const startY = e.clientY, startH = height
    const onMove = (ev) => setHeight(Math.max(80, startH + ev.clientY - startY))
    const onUp   = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div style={{
      marginBottom: 20, borderRadius: 12,
      border: `1.5px solid ${state === 'pass' ? T.greenBd : state === 'fail' ? T.redBd : T.yellow}`,
      overflow: 'hidden', background: T.panel,
    }}>
      {/* Challenge header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 20px', borderBottom: `1px solid ${T.border}`,
        background: T.yellowBg,
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: T.yellow + '33', border: `1.5px solid ${T.yellow}`,
          color: T.yellow, fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>?</div>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: T.yellow }}>
          Challenge
        </span>
        {state === 'pass' && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: T.green, fontWeight: 600 }}>✓ Correct</span>
        )}
        {state === 'fail' && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: T.red }}>Try again</span>
        )}
      </div>

      {/* Question instruction */}
      {cell.instruction && (
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}` }}>
          <MDText text={cell.instruction} T={T} />
        </div>
      )}

      {/* Options + feedback rendered inside iframe */}
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        style={{ width: '100%', height, border: 'none', display: 'block' }}
        title={`challenge-${cellIndex}`}
      />
      {/* Resize handle */}
      <div
        onMouseDown={startResize}
        title="Drag to resize"
        style={{
          height: 8, cursor: 'ns-resize', background: T.border,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div style={{ width: 32, height: 3, borderRadius: 2, background: T.muted, opacity: 0.5 }} />
      </div>
    </div>
  )
}

// ── Markdown cell ─────────────────────────────────────────────────────────────
function MarkdownCell({ cell, T }) {
  return (
    <div style={{
      background: T.panel, borderRadius: 12,
      border: `1px solid ${T.border}`, padding: '20px 24px', marginBottom: 20,
    }}>
      <MDText text={cell.instruction} T={T} />
    </div>
  )
}

// ── Coding cell — Monaco editor + Run + check() ───────────────────────────────
function CodingCell({ cell, cellIndex, T, dark, monacoTheme, onPass }) {
  const iframeRef = useRef(null)
  const [code, setCode]         = useState(cell.startCode || '')
  const [logs, setLogs]         = useState([])
  const [hasRun, setHasRun]     = useState(false)
  const [result, setResult]     = useState(null) // null | 'pass' | 'fail'
  const [showSolution, setShowSolution] = useState(false)
  const [showConsole, setShowConsole]   = useState(false)
  const [height, setHeight]     = useState(cell.outputHeight || 220)
  const [doc, setDoc]           = useState('')    // what the output frame runs
  const [runCount, setRunCount] = useState(0)     // remounts the frame on every Run
  const [message, setMessage]   = useState(null)  // why a check failed, from check() or the tests
  const [waiting, setWaiting]   = useState(false) // hidden tests are running in the frame
  const waitTimer = useRef(null)
  const manualRef = useRef(false)
  useEffect(() => () => clearTimeout(waitTimer.current), [])

  // A cell with hidden `tests` gets its verdict from the sandboxed frame, where the
  // learner's code ran: { type: 'sn_verdict', pass, message }. The app never runs their code.
  useEffect(() => {
    const handler = (e) => {
      if (!e.data || e.data.type !== 'sn_verdict') return
      if (e.source !== iframeRef.current?.contentWindow) return
      clearTimeout(waitTimer.current)
      setWaiting(false)
      setResult(e.data.pass ? 'pass' : 'fail')
      setMessage(e.data.message || null)
      if (e.data.pass && onPass) onPass(cellIndex)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [cellIndex, onPass])

  // Console messages from iframe
  useEffect(() => {
    const handler = (e) => {
      if (!e.data || e.data.type !== 'jsnb_console') return
      if (e.data.cellIndex !== cellIndex) return
      setLogs(prev => [...prev, { level: e.data.level, msg: e.data.msg }])
      setShowConsole(true)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [cellIndex])

  // Auto-resize from iframe
  useEffect(() => {
    const handler = (e) => {
      if (!e.data || e.data.type !== 'sn_resize') return
      if (e.source !== iframeRef.current?.contentWindow) return
      if (!manualRef.current) setHeight(Math.max(80, e.data.h + 4))
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  function startResize(e) {
    e.preventDefault()
    manualRef.current = true
    const startY = e.clientY, startH = height
    const onMove = (ev) => setHeight(Math.max(80, startH + ev.clientY - startY))
    const onUp   = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const activeCode = showSolution ? (cell.solutionCode || code) : code

  // Build an iframe doc that also pipes console to parent.
  function buildCodingDoc(html, css, js, tests) {
    const escape = (code) => code.replace(/<\/script>/gi, '<\\/script>')
    const iframeBg   = dark ? '#0f1923' : '#ffffff'
    const iframeText = dark ? '#e2e8f0' : '#1e293b'
    const head = `<!DOCTYPE html><html class="${dark?'dark':''}"><head><meta charset="utf-8">
<style>:root{${iframeThemeVars(dark)}}*,*::before,*::after{box-sizing:border-box}
body{margin:0;padding:14px;font-family:'Segoe UI',system-ui,sans-serif;font-size:14px;background:${iframeBg};color:${iframeText}}
${css || ''}</style></head><body>${html || ''}`
    const resize = `;(function(){function r(){window.parent.postMessage({type:'sn_resize',h:document.body.scrollHeight},'*')}
if(window.ResizeObserver){new ResizeObserver(r).observe(document.body)}else{window.addEventListener('load',r);}
window.addEventListener('load',r);})();`
    if (tests) {
      // Hidden tests: the learner's code and the tests run together in a Web Worker started
      // by this frame, so a slow or endless loop blocks only the worker. The frame draws each
      // result line, forwards the verdict, and stops the worker after 5 seconds.
      const worker = `var __post=function(m){postMessage(m)};
function __line(ok,text){__post({kind:'line',ok:!!ok,text:String(text)})}
function __verdict(pass,message){__post({kind:'verdict',pass:!!pass,message:message?String(message):''})}
console={log:function(){__post({kind:'log',level:'log',msg:[].slice.call(arguments).map(String).join(' ')})},warn:function(){__post({kind:'log',level:'warn',msg:[].slice.call(arguments).map(String).join(' ')})},error:function(){__post({kind:'log',level:'error',msg:[].slice.call(arguments).map(String).join(' ')})}};
try{(function(){
${js}
;(function(){
${tests}
})();
})();}catch(e){__verdict(false,'Your code stopped with an error: '+e.message);}`
      const literal = (value) => JSON.stringify(value).replace(/<\//g, '<\\/')
      return `${head}
<div id="tests"></div>
<script>
(function(){
  var out=document.getElementById('tests'), done=false;
  function finish(pass,message){if(done)return;done=true;clearTimeout(timer);try{w.terminate()}catch(_){}
    window.parent.postMessage({type:'sn_verdict',pass:pass,message:message},'*');}
  var w=new Worker(URL.createObjectURL(new Blob([${literal(worker)}],{type:'text/javascript'})));
  var timer=setTimeout(function(){finish(false,${literal(cell.timeoutMessage || 'No result after 5 seconds. Is there a loop that never ends?')})},5000);
  w.onmessage=function(e){var m=e.data;
    if(m.kind==='line'){var d=document.createElement('div');d.textContent=(m.ok?'PASS  ':'FAIL  ')+m.text;d.style.cssText='font:12.5px ui-monospace,monospace;padding:2px 0;color:'+(m.ok?'#16a34a':'#dc2626');out.appendChild(d);}
    else if(m.kind==='log'){window.parent.postMessage({type:'jsnb_console',level:m.level,msg:m.msg,cellIndex:${cellIndex}},'*');}
    else if(m.kind==='verdict'){finish(m.pass,m.message);}};
  w.onerror=function(e){e.preventDefault();window.parent.postMessage({type:'jsnb_console',level:'error',msg:e.message,cellIndex:${cellIndex}},'*');finish(false,'Your code could not run: '+e.message);};
})();
${resize}
<\/script></body></html>`
    }
    return `${head}
<script>
window.__cellId='coding-${cellIndex}';
(function(){
  var _l=console.log.bind(console),_e=console.error.bind(console),_w=console.warn.bind(console);
  function post(lv,args){var msg=args.map(function(a){try{return typeof a==='object'?JSON.stringify(a,null,2):String(a);}catch(_){return String(a);}}).join(' ');
    window.parent.postMessage({type:'jsnb_console',level:lv,msg:msg,cellIndex:${cellIndex}},'*');}
  console.log=function(){_l.apply(console,arguments);post('log',[].slice.call(arguments));};
  console.error=function(){_e.apply(console,arguments);post('error',[].slice.call(arguments));};
  console.warn=function(){_w.apply(console,arguments);post('warn',[].slice.call(arguments));};
  window.addEventListener('error',function(ev){if(ev.error)post('error',[ev.message]);ev.preventDefault();},true);
})();
try{(function(){\n${escape(js)}\n})();}catch(e){console.error('Error: '+e.message);}
${resize}
<\/script></body></html>`
  }

  const run = useCallback(() => {
    setLogs([])
    setHasRun(true)
    setShowConsole(true)
    setResult(null)
    setMessage(null)
    clearTimeout(waitTimer.current)
    // The frame is only mounted once the cell has run, so its document lives in state.
    setDoc(buildCodingDoc(cell.html || '', cell.css || '', activeCode, cell.tests))
    setRunCount(n => n + 1)
    if (cell.tests) {
      setWaiting(true)
      // The frame stops the learner's code itself after 5 seconds and reports it; this only
      // catches a frame that never answers at all.
      waitTimer.current = setTimeout(() => {
        setWaiting(false)
        setResult('fail')
        setMessage(cell.timeoutMessage || 'No result after 5 seconds. Is there a loop that never ends?')
      }, 8000)
    } else if (cell.check) {
      try {
        const checked = cell.check(activeCode)
        const detailed = checked && typeof checked === 'object'
        const passed = detailed ? !!checked.pass : !!checked
        setResult(passed ? 'pass' : 'fail')
        setMessage(detailed && checked.message ? checked.message : null)
        if (passed && onPass) onPass(cellIndex)
      } catch (_) { setResult('fail') }
    }
  }, [activeCode, cell, cellIndex, dark, onPass])

  const reset = () => {
    setCode(cell.startCode || '')
    setLogs([])
    setHasRun(false)
    setResult(null)
    setShowSolution(false)
    setMessage(null)
    setWaiting(false)
    clearTimeout(waitTimer.current)
    setDoc('')
  }

  const lineCount = activeCode.split('\n').length
  const editorH   = Math.min(400, Math.max(120, lineCount * 20 + 28))
  const logColor  = { log: T.text, error: T.red, warn: T.yellow }
  const logIcon   = { log: '>', error: '✗', warn: '⚠' }

  const accentBorder = result === 'pass' ? T.greenBd : result === 'fail' ? T.redBd : T.accent

  return (
    <div style={{ marginBottom: 24, borderRadius: 12, border: `1.5px solid ${accentBorder}`, overflow: 'hidden', background: T.panel }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 18px', borderBottom:`1px solid ${T.border}`, background: T.panel2 }}>
        <div style={{ width:26, height:26, borderRadius:'50%', background:T.accent+'22', border:`1.5px solid ${T.accent}`, color:T.accent, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>✎</div>
        <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:T.accent }}>Coding Challenge</span>
        {result==='pass' && <span style={{ marginLeft:'auto', fontSize:11, color:T.green, fontWeight:600 }}>✓ Passed</span>}
        {result==='fail' && <span style={{ marginLeft:'auto', fontSize:11, color:T.red }}>✗ Try again</span>}
      </div>

      {/* Instruction */}
      {cell.instruction && (
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${T.border}` }}>
          <MDText text={cell.instruction} T={T} />
        </div>
      )}

      {/* Preview pane */}
      {hasRun && (
        <div style={{ background: T.iframeBg, borderBottom:`1px solid ${T.border}` }}>
          <div style={{ fontSize:9, fontWeight:700, color:T.muted, letterSpacing:'.08em', textTransform:'uppercase', padding:'6px 14px 0' }}>Output</div>
          <iframe key={runCount} ref={iframeRef} sandbox="allow-scripts" srcDoc={doc}
            style={{ width:'100%', height, border:'none', display:'block' }}
            title={`coding-${cellIndex}`}
          />
          <div onMouseDown={startResize} title="Drag to resize"
            style={{ height:8, cursor:'ns-resize', background:T.border, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:32, height:3, borderRadius:2, background:T.muted, opacity:.5 }} />
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:T.panel2, borderBottom:`1px solid ${T.border}`, padding:'0 10px' }}>
        <span style={{ fontSize:11, color:T.muted, fontFamily:'monospace' }}>JavaScript</span>
        <div style={{ display:'flex', gap:6, padding:'6px 0' }}>
          {cell.solutionCode && (
            <button onClick={() => setShowSolution(s => !s)} style={{ padding:'4px 11px', borderRadius:6, border:`0.5px solid ${T.muted}`, background:'transparent', color:T.muted, fontSize:11, cursor:'pointer' }}>
              {showSolution ? 'Hide solution' : 'Show solution'}
            </button>
          )}
          <button onClick={reset} style={{ padding:'4px 11px', borderRadius:6, border:`0.5px solid ${T.border}`, background:'transparent', color:T.muted, fontSize:11, cursor:'pointer' }}>Reset</button>
          <button onClick={run} style={{ padding:'5px 16px', borderRadius:6, border:'none', background:'#0ea5e9', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>▶ Run</button>
        </div>
      </div>

      {/* Monaco editor */}
      <div style={{ background: dark ? '#0c1222' : '#f8fafc' }}>
        <Editor
          key={`coding-${cellIndex}-${dark}`}
          height={editorH}
          beforeMount={setupOpenCalcMonaco}
          language={cell.language || 'javascript'}
          value={showSolution ? (cell.solutionCode || code) : code}
          onChange={(val='') => { if (!showSolution) setCode(val) }}
          theme={monacoTheme || (dark ? 'open-calc-dark' : 'open-calc-light')}
          options={{ fontSize:13, lineHeight:20, minimap:{enabled:false}, scrollBeyondLastLine:false, wordWrap:'on', tabSize:2, readOnly:showSolution, renderLineHighlight:'none', overviewRulerLanes:0, folding:false, lineDecorationsWidth:6, lineNumbersMinChars:3, padding:{top:10,bottom:10} }}
        />
      </div>

      {/* Console */}
      {showConsole && (
        <div style={{ background:T.panel2, borderTop:`1px solid ${T.border}`, padding:'8px 14px', maxHeight:150, overflowY:'auto' }}>
          <div style={{ fontSize:10, fontWeight:600, color:T.muted, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:5 }}>Console</div>
          {logs.length === 0
            ? <div style={{ fontFamily:'monospace', fontSize:12, color:T.muted }}>Run the cell to see output.</div>
            : logs.map((l,i) => <div key={i} style={{ fontFamily:'monospace', fontSize:12, color:logColor[l.level]||T.text, display:'flex', gap:8 }}><span style={{color:T.muted}}>{logIcon[l.level]}</span><span style={{wordBreak:'break-all'}}>{l.msg}</span></div>)
          }
        </div>
      )}

      {/* Feedback */}
      {hasRun && waiting && (
        <div role="status" style={{ padding:'10px 18px', borderTop:`1px solid ${T.border}`, fontSize:13, color:T.muted }}>Running the tests…</div>
      )}
      {hasRun && result && (
        <div role="status" style={{ padding:'10px 18px', borderTop:`1px solid ${T.border}`, fontSize:13, fontWeight:500,
          background: result==='pass' ? T.greenBg : T.redBg,
          color: result==='pass' ? T.green : T.red }}>
          {result === 'pass' ? (cell.successMessage || '✓ Challenge complete!') : (cell.failMessage || '✗ Not quite — try again.')}
          {message && <div style={{ marginTop:6, fontWeight:400, whiteSpace:'pre-wrap' }}>{message}</div>}
        </div>
      )}
    </div>
  )
}

// ── Walkthrough cell — numbered steps + read-only preview ─────────────────────
function WalkthroughCell({ cell, cellIndex, T, dark, monacoTheme }) {
  const [step, setStep] = useState(0)
  const iframeRef = useRef(null)
  const [height, setHeight] = useState(cell.outputHeight || 280)
  const manualRef = useRef(false)
  const steps = cell.steps || []
  const currentStep = steps[step] || {}
  const cumulativeCode = steps.slice(0, step + 1).map(s => s.code || '').join('\n')

  useEffect(() => {
    if (iframeRef.current)
      iframeRef.current.srcdoc = buildDoc(cell.html || '', cell.css || '', cumulativeCode, dark)
  }, [step, dark])

  useEffect(() => {
    const handler = (e) => {
      if (!e.data || e.data.type !== 'sn_resize') return
      if (e.source !== iframeRef.current?.contentWindow) return
      if (!manualRef.current) setHeight(Math.max(80, e.data.h + 4))
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  function startResize(e) {
    e.preventDefault()
    manualRef.current = true
    const startY = e.clientY, startH = height
    const onMove = (ev) => setHeight(Math.max(80, startH + ev.clientY - startY))
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div style={{ marginBottom: 24, borderRadius: 12, border: `1.5px solid ${T.accent}`, overflow: 'hidden', background: T.panel }}>

      {/* Header: icon + label + step dots + counter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: `1px solid ${T.border}`, background: T.panel2, flexWrap: 'wrap' }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: T.accent + '22', border: `1.5px solid ${T.accent}`, color: T.accent, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>⟳</div>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: T.accent }}>Walkthrough</span>

        {/* Compact step dots — click any to jump */}
        <div style={{ display: 'flex', gap: 5, marginLeft: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {steps.map((s, i) => (
            <button key={i} onClick={() => setStep(i)} title={s.title || `Step ${i + 1}`} style={{
              width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
              background: i < step ? T.green : i === step ? T.accent : T.border,
              color: i <= step ? '#fff' : T.muted,
              fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .15s',
              outline: i === step ? `2px solid ${T.accent}` : 'none',
              outlineOffset: 1,
            }}>
              {i < step ? '✓' : i + 1}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: T.muted, whiteSpace: 'nowrap' }}>Step {step + 1} / {steps.length}</span>
      </div>

      {/* Lesson instruction */}
      {cell.instruction && (
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}` }}>
          <MDText text={cell.instruction} T={T} />
        </div>
      )}

      {/* Current step: explanation */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, minHeight: 80 }}>
        {currentStep.title && (
          <div style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 8 }}>{currentStep.title}</div>
        )}
        {currentStep.explanation && <MDText text={currentStep.explanation} T={T} />}
      </div>

      {/* Current step: new code */}
      {currentStep.code && (
        <div style={{ background: dark ? '#0c1222' : '#f8fafc', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, letterSpacing: '.08em', textTransform: 'uppercase', padding: '6px 14px 0' }}>New code this step</div>
          <Editor
            key={`wt-${cellIndex}-${step}-${dark}`}
            height={Math.min(280, Math.max(60, currentStep.code.split('\n').length * 20 + 20))}
            beforeMount={setupOpenCalcMonaco}
            language={cell.language || 'javascript'}
            value={currentStep.code}
            theme={monacoTheme || (dark ? 'open-calc-dark' : 'open-calc-light')}
            options={{ readOnly: true, fontSize: 12, lineHeight: 19, minimap: { enabled: false }, scrollBeyondLastLine: false, wordWrap: 'on', renderLineHighlight: 'none', overviewRulerLanes: 0, folding: false, lineDecorationsWidth: 6, lineNumbersMinChars: 3, padding: { top: 8, bottom: 8 }, domReadOnly: true }}
          />
        </div>
      )}

      {/* Live preview */}
      <div style={{ background: T.iframeBg }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, letterSpacing: '.08em', textTransform: 'uppercase', padding: '5px 14px 2px' }}>Live result (cumulative through step {step + 1})</div>
        <iframe ref={iframeRef} sandbox="allow-scripts"
          style={{ width: '100%', height, border: 'none', display: 'block' }}
          title={`walkthrough-${cellIndex}`}
        />
        <div onMouseDown={startResize} title="Drag to resize"
          style={{ height: 8, cursor: 'ns-resize', background: T.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 32, height: 3, borderRadius: 2, background: T.muted, opacity: .5 }} />
        </div>
      </div>

      {/* Prev / Next navigation */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 16px', borderTop: `1px solid ${T.border}`, background: T.panel2 }}>
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
          style={{ padding: '5px 16px', borderRadius: 6, border: `1px solid ${T.border}`, background: 'transparent', color: step === 0 ? T.muted : T.text, cursor: step === 0 ? 'default' : 'pointer', fontSize: 12 }}>← Prev</button>
        <button onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))} disabled={step === steps.length - 1}
          style={{ padding: '5px 18px', borderRadius: 6, border: 'none', background: step === steps.length - 1 ? T.border : T.accent, color: step === steps.length - 1 ? T.muted : '#fff', cursor: step === steps.length - 1 ? 'default' : 'pointer', fontSize: 12, fontWeight: 600 }}>Next →</button>
        {step === steps.length - 1 && (
          <span style={{ fontSize: 12, color: T.green, marginLeft: 8 }}>✓ All steps complete</span>
        )}
      </div>
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ cells, passedSet, T }) {
  const visualCells    = cells.filter(c => c.type !== 'markdown').length
  const challengeCells = cells.filter(c => c.type === 'challenge').length
  const passed         = passedSet.size
  if (challengeCells === 0) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 0 16px', marginBottom: 4,
    }}>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: T.border, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 3,
          width: `${challengeCells > 0 ? (passed / challengeCells) * 100 : 0}%`,
          background: passed === challengeCells ? T.green : T.accent,
          transition: 'width .4s ease',
        }} />
      </div>
      <span style={{ fontSize: 12, color: T.muted, whiteSpace: 'nowrap' }}>
        {passed} / {challengeCells} challenges
      </span>
    </div>
  )
}

// ── Main ScienceNotebook ──────────────────────────────────────────────────────
export default function ScienceNotebook({ lesson: lessonProp, params = {} }) {
  const lesson = lessonProp ?? params?.lesson
  const dark   = useIsDark()
  const { themeStyles } = useGlobalTheme()
  const monacoTheme = themeStyles?.monaco || (dark ? 'open-calc-dark' : 'open-calc-light')
  const T      = makeT(dark)
  const [passedChallenges, setPassedChallenges] = useState(new Set())
  const [globalConsoleOpen, setGlobalConsoleOpen] = useState(false)

  // Ctrl+Shift+C toggles console panel on all js cells
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        setGlobalConsoleOpen(v => !v)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handlePass = useCallback((idx) => {
    setPassedChallenges(prev => new Set([...prev, idx]))
  }, [])

  if (!lesson) return null

  const { title, subtitle, cells = [] } = lesson

  return (
    <div style={{ fontFamily: 'var(--font-sans, system-ui)', color: T.text, padding: '4px 0' }}>
      {/* Lesson header */}
      {title && (
        <div style={{ marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${T.border}` }}>
          {lesson.subject && (
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: T.accent, marginBottom: 5 }}>
              {lesson.subject}
            </div>
          )}
          <div style={{ fontSize: 20, fontWeight: 600, color: T.text, marginBottom: subtitle ? 6 : 0 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 14, color: T.muted, lineHeight: 1.6 }}>{subtitle}</div>}
        </div>
      )}

      {/* Progress */}
      <ProgressBar cells={cells} passedSet={passedChallenges} T={T} />

      {/* Cells */}
      {cells.map((cell, i) => {
        if (cell.type === 'markdown')    return <MarkdownCell key={i} cell={cell} T={T} />
        if (cell.type === 'challenge')   return <ChallengeCell key={i} cell={cell} cellIndex={i} T={T} dark={dark} monacoTheme={monacoTheme} onPass={handlePass} />
        if (cell.type === 'coding')      return <CodingCell key={i} cell={cell} cellIndex={i} T={T} dark={dark} monacoTheme={monacoTheme} onPass={handlePass} />
        if (cell.type === 'walkthrough') return <WalkthroughCell key={i} cell={cell} cellIndex={i} T={T} dark={dark} monacoTheme={monacoTheme} />
        // type:'js' and anything else = auto-run visual preview
        return <VisualCell key={i} cell={cell} cellIndex={i} T={T} dark={dark} monacoTheme={monacoTheme} forceCodeOpen={globalConsoleOpen} />
      })}
    </div>
  )
}
