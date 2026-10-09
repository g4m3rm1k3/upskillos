import { useEffect, useMemo, useRef, useState } from 'react';
import { buildHtmlBody, elementsToCss, generateExportHtml } from './htmlSync';
import type { LabElement, BodyStyles } from './types';
import type { CdnTag } from './cdnLibraries';
import styles from './LivePreview.module.css';

// Installed before learner scripts so startup failures and early logs are visible.
// This runs only inside the preview document, never in the app document.
function previewBridge(channel: string) {
  const send = (payload: object) => parent.postMessage({ channel, ...payload }, '*');
  let inspect = true;
  let selected: string | null = null;
  let labels = true;
  let boxModel = false;
  let overlay: HTMLDivElement | null = null;
  const describe = (value: unknown) => {
    if (typeof value === 'string') return value;
    if (value instanceof Error) return value.stack || value.message;
    try { return JSON.stringify(value) ?? String(value); } catch { return String(value); }
  };
  for (const level of ['log', 'info', 'warn', 'error'] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => { original(...args); send({ type: 'console', level, text: args.map(describe).join(' ').slice(0, 4000) }); };
  }
  addEventListener('error', (event) => send({ type: 'console', level: 'error', text: `${event.message || 'Resource failed to load'}${event.lineno ? ` (line ${event.lineno})` : ''}` }));
  addEventListener('unhandledrejection', event => send({ type: 'console', level: 'error', text: `Unhandled promise: ${describe(event.reason)}` }));
  function draw() {
    if (!overlay) return;
    const target = selected ? [...document.querySelectorAll<HTMLElement>('[data-lab-id]')].find(el => el.dataset.labId === selected) : null;
    overlay.style.display = inspect && target ? 'block' : 'none';
    if (!inspect || !target) return;
    const rect = target.getBoundingClientRect();
    Object.assign(overlay.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, background: boxModel ? '#38bdf822' : 'transparent' });
    const computed = getComputedStyle(target);
    overlay.textContent = boxModel ? `${Math.round(rect.width)} × ${Math.round(rect.height)} · padding ${computed.padding} · margin ${computed.margin}` : labels ? `<${target.tagName.toLowerCase()}>` : '';
  }
  addEventListener('message', event => {
    if (event.source !== parent || event.data?.channel !== channel) return;
    if (event.data.type === 'inspect') {
      inspect = event.data.inspect; selected = event.data.selected; labels = event.data.labels; boxModel = event.data.boxModel; draw();
    }
  });
  document.addEventListener('click', event => {
    if (!inspect) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const node = event.target as Element;
    const target = node.closest?.('[data-lab-id]');
    selected = target?.getAttribute('data-lab-id') || null;
    send({ type: 'select', id: selected }); draw();
  }, true);
  for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'dblclick']) {
    document.addEventListener(type, event => { if (inspect) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
  }
  document.addEventListener('submit', event => { if (inspect) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
  addEventListener('DOMContentLoaded', () => {
    // Outside body: it cannot become a flex/grid item or match body > * rules.
    const host = document.createElement('div');
    host.setAttribute('data-html-lab-overlay', '');
    host.style.cssText = 'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
    const shadow = host.attachShadow({ mode: 'closed' });
    overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;box-sizing:border-box;outline:2px solid #0284c7;pointer-events:none;color:#0369a1;font:11px monospace;display:none;';
    shadow.append(overlay); document.documentElement.append(host);
    new ResizeObserver(draw).observe(document.body);
    addEventListener('scroll', draw, true); addEventListener('resize', draw);
    send({ type: 'ready' }); draw();
  });
}

export function previewDocument(html: string, channel: string): string {
  const bridge = `(${previewBridge.toString()})(${JSON.stringify(channel)});`;
  return html.replace('<head>', `<head><script>${bridge.replace(/<\/script/gi, '<\\/script')}<\/script>`)
    .replace('<style>', '<style data-html-lab-css>');
}

interface Props {
  elements: LabElement[];
  bodyStyles: BodyStyles;
  customCss: string;
  javascript: string;
  error?: string | null;
  cdnTags?: CdnTag[];
  pageTitle?: string;
  faviconUrl?: string;
  inspect: boolean;
  selectedId: string | null;
  showLabels?: boolean;
  showOverlay?: boolean;
  onSelect: (id: string | null) => void;
}
interface Log { level: string; text: string }
export default function LivePreview({ elements, bodyStyles, customCss, javascript, error, cdnTags = [], pageTitle = '', faviconUrl = '', inspect, selectedId, showLabels = true, showOverlay = false, onSelect }: Props) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const appliedStyles = useRef<Record<string, Record<string, string>>>({});
  const channel = useRef(`html-lab-${Math.random().toString(36).slice(2)}`).current;
  const [autoRun, setAutoRun] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [viewport, setViewport] = useState('100%');
  const css = elementsToCss(elements, customCss, bodyStyles);
  const body = buildHtmlBody(elements);
  const documentKey = JSON.stringify([body, cdnTags, pageTitle, faviconUrl]);
  const makeRun = () => ({ documentKey, javascript, html: previewDocument(generateExportHtml(elements, bodyStyles, customCss, error ? '' : javascript, cdnTags, pageTitle, faviconUrl), channel) });
  const [run, setRun] = useState(makeRun);
  const [revision, setRevision] = useState(0);
  const elementStyles = useMemo(() => Object.fromEntries(elements.map(el => [el.id, el.styles])), [elements]);
  const latest = useRef({ css, elementStyles, inspect, selectedId, showLabels, showOverlay, onSelect });
  latest.current = { css, elementStyles, inspect, selectedId, showLabels, showOverlay, onSelect };
  const pending = run.javascript !== javascript;
  function sync() {
    const frame = iframe.current;
    // Same-origin preview access matches the lab's existing sandbox contract.
    // A learner page may navigate away; don't let that break the editor.
    try {
      const style = frame?.contentDocument?.querySelector('[data-html-lab-css]');
      if (style && style.textContent !== latest.current.css) style.textContent = latest.current.css;
      // Property edits are inline overrides, just like imported style attributes.
      // Patch only authored properties that changed; keep unrelated runtime styles.
      if (style) {
        for (const el of frame!.contentDocument!.querySelectorAll<HTMLElement>('[data-lab-id]')) {
          const id = el.dataset.labId!;
          const next = latest.current.elementStyles[id];
          if (!next) continue;
          const previous = appliedStyles.current[id] || {};
          for (const key of new Set([...Object.keys(previous), ...Object.keys(next)])) {
            if (previous[key] === next[key]) continue;
            const prop = key.startsWith('--') ? key : key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);
            if (!next[key]) el.style.removeProperty(prop);
            else el.style.setProperty(prop, next[key].replace(/\s*!important\s*$/, ''), /!important\s*$/.test(next[key]) ? 'important' : '');
          }
        }
        appliedStyles.current = latest.current.elementStyles;
      }
    } catch { /* Cross-origin navigation: Run returns to the learner document. */ }
    frame?.contentWindow?.postMessage({ channel, type: 'inspect', inspect: latest.current.inspect, selected: latest.current.selectedId, labels: latest.current.showLabels, boxModel: latest.current.showOverlay }, '*');
  }
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.source !== iframe.current?.contentWindow || event.data?.channel !== channel) return;
      if (event.data.type === 'ready') sync();
      if (event.data.type === 'select') latest.current.onSelect(event.data.id);
      if (event.data.type === 'console') {
        setLogs(old => [...old.slice(-199), { level: String(event.data.level), text: String(event.data.text) }]);
        if (event.data.level === 'error') setConsoleOpen(true);
      }
    }
    addEventListener('message', receive);
    return () => removeEventListener('message', receive);
  }, [channel]);
  useEffect(sync, [css, elementStyles, inspect, selectedId, showLabels, showOverlay]);
  useEffect(() => {
    if (error) return;
    if (run.documentKey !== documentKey || (autoRun && pending)) {
      setLogs([]); setRun(makeRun());
    }
    // CSS is patched separately; selecting an element never restarts the app.
  }, [documentKey, javascript, error, autoRun, run.documentKey, pending]);
  return <section className={styles.root} aria-label="Live page">
    <div className={styles.toolbar}>
      <strong>{inspect ? 'Inspect page' : 'Interact with page'}</strong>
      <button type="button" disabled={!!error} onClick={() => { setLogs([]); setRun(makeRun()); setRevision(r => r + 1); }}>↻ Run / Restart</button>
      <label><input type="checkbox" checked={autoRun} onChange={e => setAutoRun(e.target.checked)} /> Auto-run JS</label>
      <select aria-label="Preview width" value={viewport} onChange={e => setViewport(e.target.value)}><option value="100%">Fit width</option><option value="390px">Phone · 390px</option><option value="768px">Tablet · 768px</option></select>
      <button type="button" aria-expanded={consoleOpen} onClick={() => setConsoleOpen(v => !v)}>Console ({logs.length})</button>
    </div>
    <p className={styles.hint}>{inspect ? 'Click an element to edit its properties. Move and nest elements in Tree.' : 'Buttons, forms and JavaScript are interactive.'} CSS updates live. HTML changes restart the page.</p>
    {(error || pending) && <p role="status" className={styles.notice}>{error ? `Code error — keeping the last working page. ${error}` : 'JavaScript changed. Run to apply it; the current page is still running.'}</p>}
    <div className={styles.stage}><iframe key={revision} ref={iframe} title="Live HTML preview" srcDoc={run.html} onLoad={sync} style={{ width: viewport }} sandbox="allow-scripts allow-forms allow-downloads allow-same-origin allow-modals" /></div>
    {consoleOpen && <div className={styles.console} aria-label="Preview console"><button type="button" onClick={() => setLogs([])}>Clear console</button>{logs.length ? logs.map((log, i) => <pre key={i} data-level={log.level}>{log.level}: {log.text}</pre>) : <p>No output yet. Use console.log() in your code.</p>}</div>}
  </section>;
}
