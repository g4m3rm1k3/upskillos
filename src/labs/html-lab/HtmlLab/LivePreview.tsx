import { useEffect, useMemo, useRef, useState } from 'react';
import { buildHtmlBody, elementsToCss, generateExportHtml } from './htmlSync';
import type { LabElement, BodyStyles } from './types';
import type { CdnTag } from './cdnLibraries';
import { CONTAINER_TAGS } from './labReducer';
import { resolvePreviewMove, type PreviewDrop } from './previewMove';
import styles from './LivePreview.module.css';

// Installed before learner scripts so startup failures and early logs are visible.
// This runs only inside the preview document, never in the app document.
interface InspectorState { inspect?: boolean; selected?: string | null; canDelete?: boolean; canMove?: boolean; labels?: boolean; boxModel?: boolean }
function previewBridge(channel: string, containerTags: string[], initial: InspectorState) {
  const send = (payload: object) => parent.postMessage({ channel, ...payload }, '*');
  let inspect = initial.inspect ?? true;
  let selected: string | null = initial.selected ?? null;
  let labels = initial.labels ?? true;
  let boxModel = initial.boxModel ?? false;
  let overlay: HTMLDivElement | null = null;
  let actions: HTMLDivElement | null = null;
  let caption: HTMLSpanElement | null = null;
  let canDelete = initial.canDelete ?? false;
  let canMove = initial.canMove ?? false;
  let marker: HTMLDivElement | null = null;
  let dragging: { id: string; handle: Element; pointerId: number; drop: PreviewDrop | null } | null = null;
  let suppressClickUntil = 0;
  function endDrag(apply: boolean) {
    if (!dragging) return;
    const { handle, pointerId, drop } = dragging;
    dragging = null;
    if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
    if (marker) marker.style.display = 'none';
    if (actions) actions.style.pointerEvents = 'auto';
    suppressClickUntil = performance.now() + 300;
    if (apply && drop) send({ type: 'move', ...drop });
    draw();
  }
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
    if (actions) actions.style.display = inspect && target ? 'flex' : 'none';
    if (!inspect || !target) { endDrag(false); return; }
    const rect = target.getBoundingClientRect();
    Object.assign(overlay.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, background: boxModel ? '#38bdf822' : 'transparent' });
    const computed = getComputedStyle(target);
    if (caption) caption.textContent = boxModel ? `${Math.round(rect.width)} × ${Math.round(rect.height)} · padding ${computed.padding} · margin ${computed.margin}` : labels ? `<${target.tagName.toLowerCase()}>` : '';
    if (actions) {
      const visible = rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
      actions.style.display = visible ? 'flex' : 'none';
      actions.style.left = `${Math.max(0, Math.min(rect.right - actions.offsetWidth, innerWidth - actions.offsetWidth))}px`;
      actions.style.top = `${Math.max(0, Math.min(rect.top >= 36 ? rect.top - 36 : rect.top, innerHeight - 36))}px`;
      const remove = actions.querySelector<HTMLButtonElement>('[data-lab-action=delete]')!;
      remove.disabled = !canDelete;
      actions.querySelector<HTMLButtonElement>('[data-lab-action=move]')!.disabled = !canMove;
    }
  }
  addEventListener('message', event => {
    if (event.source !== parent || event.data?.channel !== channel) return;
    if (event.data.type === 'inspect') {
      inspect = event.data.inspect; selected = event.data.selected; labels = event.data.labels; boxModel = event.data.boxModel; canDelete = event.data.canDelete; canMove = event.data.canMove; draw();
    }
  });
  document.addEventListener('click', event => {
    if (!inspect) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (performance.now() < suppressClickUntil) return;
    if (event.composedPath().some(node => node instanceof Element && node.getAttribute('data-lab-action') === 'move')) return;
    if (event.composedPath().some(node => node instanceof Element && node.getAttribute('data-lab-action') === 'delete')) {
      if (selected && canDelete) send({ type: 'delete', id: selected });
      return;
    }
    const node = event.target as Element;
    const target = node.closest?.('[data-lab-id]');
    selected = target?.getAttribute('data-lab-id') || null;
    document.querySelector<HTMLElement>('[data-html-lab-overlay]')?.focus({ preventScroll: true });
    send({ type: 'select', id: selected }); draw();
  }, true);
  document.addEventListener('pointerdown', event => {
    if (!inspect) return;
    const handle = event.composedPath().find(node => node instanceof Element && node.getAttribute('data-lab-action') === 'move') as Element | undefined;
    if (handle && selected && canMove && event.button === 0) {
      dragging = { id: selected, handle, pointerId: event.pointerId, drop: null };
      handle.setPointerCapture(event.pointerId);
      if (actions) actions.style.pointerEvents = 'none';
    }
    event.preventDefault(); event.stopImmediatePropagation();
  }, true);
  document.addEventListener('pointermove', event => {
    if (!dragging) return;
    event.preventDefault(); event.stopImmediatePropagation();
    dragging.drop = null;
    if (marker) marker.style.display = 'none';
    if (event.clientX < 0 || event.clientY < 0 || event.clientX >= innerWidth || event.clientY >= innerHeight) return;
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const target = hit?.closest<HTMLElement>('[data-lab-id]');
    const moving = [...document.querySelectorAll('[data-lab-id]')].find(el => el.getAttribute('data-lab-id') === dragging!.id);
    if (!hit || (target && moving?.contains(target))) return;
    if (!target && hit !== document.body && hit !== document.documentElement) return;
    const rect = (target || document.body).getBoundingClientRect();
    const ratio = (event.clientY - rect.top) / Math.max(rect.height, 1);
    const inside = !target || (containerTags.includes(target.tagName.toLowerCase()) && ratio > .25 && ratio < .75);
    const placement = inside ? 'inside' : ratio < .5 ? 'before' : 'after';
    dragging.drop = { id: dragging.id, targetId: target?.dataset.labId || null, placement };
    if (marker) {
      Object.assign(marker.style, { display: 'block', left: `${Math.max(0, rect.left)}px`, top: `${inside ? Math.max(0, rect.top) : placement === 'before' ? rect.top : rect.bottom}px`, width: `${Math.min(rect.width, innerWidth)}px`, height: inside ? `${Math.min(rect.height, innerHeight)}px` : '3px', background: inside ? '#0ea5e922' : '#0284c7' });
      marker.textContent = `${placement === 'inside' ? 'Inside' : placement === 'before' ? 'Before' : 'After'} <${target?.tagName.toLowerCase() || 'body'}>`;
    }
  }, true);
  document.addEventListener('pointerup', event => { if (dragging) endDrag(true); if (inspect) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
  document.addEventListener('pointercancel', () => endDrag(false), true);
  document.addEventListener('lostpointercapture', () => endDrag(false), true);
  addEventListener('blur', () => endDrag(false));
  for (const type of ['mousedown', 'mouseup', 'dblclick']) {
    document.addEventListener(type, event => { if (inspect) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
  }
  window.addEventListener('keydown', event => {
    if (!inspect || !selected) return;
    if (event.key === 'Escape' && dragging) { event.preventDefault(); endDrag(false); return; }
    if (event.key === 'Escape') { selected = null; send({ type: 'select', id: null }); draw(); }
    if ((event.key === 'Delete' || event.key === 'Backspace') && canDelete && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault(); event.stopImmediatePropagation(); send({ type: 'delete', id: selected });
    }
  }, true);
  document.addEventListener('submit', event => { if (inspect) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
  addEventListener('DOMContentLoaded', () => {
    // Outside body: it cannot become a flex/grid item or match body > * rules.
    const host = document.createElement('div');
    host.setAttribute('data-html-lab-overlay', '');
    host.tabIndex = -1;
    host.style.cssText = 'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
    const shadow = host.attachShadow({ mode: 'open' });
    overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;box-sizing:border-box;outline:2px solid #0284c7;pointer-events:none;color:#0369a1;font:11px monospace;display:none;';
    caption = document.createElement('span');
    actions = document.createElement('div');
    actions.style.cssText = 'position:fixed;display:none;align-items:center;gap:6px;max-width:100vw;box-sizing:border-box;padding-left:8px;background:#075985;color:white;border-radius:5px;font:12px/1.3 system-ui;box-shadow:0 2px 8px #0004;pointer-events:auto;';
    caption.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    const remove = document.createElement('button');
    remove.type = 'button'; remove.textContent = '×';
    remove.setAttribute('data-lab-action', 'delete');
    remove.setAttribute('aria-label', 'Delete selected element');
    remove.title = 'Delete selected element (Delete / Backspace). Undo restores it.';
    remove.style.cssText = 'flex-shrink:0;width:36px;height:36px;border:0;border-radius:4px;background:#b91c1c;color:white;font:24px/1 system-ui;cursor:pointer;';
    const move = document.createElement('button');
    move.type = 'button'; move.textContent = '↕';
    move.setAttribute('data-lab-action', 'move');
    move.setAttribute('aria-label', 'Move selected element');
    move.title = 'Drag to move. Drop near an edge to reorder, or in a container to nest. Escape cancels.';
    move.style.cssText = 'flex-shrink:0;width:36px;height:36px;border:0;border-radius:4px;background:#075985;color:white;font:22px/1 system-ui;cursor:grab;touch-action:none;';
    marker = document.createElement('div');
    marker.setAttribute('role', 'status');
    marker.style.cssText = 'position:fixed;display:none;box-sizing:border-box;outline:2px solid #0284c7;pointer-events:none;color:#075985;font:bold 12px/1.5 system-ui;';
    actions.append(caption, move, remove);
    shadow.append(overlay, marker, actions); document.documentElement.append(host);
    new ResizeObserver(draw).observe(document.body);
    new MutationObserver(draw).observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    addEventListener('scroll', draw, true); addEventListener('resize', draw);
    send({ type: 'ready' }); draw();
  });
}

export function previewDocument(html: string, channel: string, initial: InspectorState = {}): string {
  const bridge = `(${previewBridge.toString()})(${JSON.stringify(channel)}, ${JSON.stringify([...CONTAINER_TAGS])}, ${JSON.stringify(initial)});`;
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
  onDelete?: (id: string) => void;
  onMove?: (id: string, parentId: string | null, order: number) => void;
}
interface Log { level: string; text: string }
export default function LivePreview({ elements, bodyStyles, customCss, javascript, error, cdnTags = [], pageTitle = '', faviconUrl = '', inspect, selectedId, showLabels = true, showOverlay = false, onSelect, onDelete, onMove }: Props) {
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
  const makeRun = () => ({ documentKey, javascript, html: previewDocument(generateExportHtml(elements, bodyStyles, customCss, error ? '' : javascript, cdnTags, pageTitle, faviconUrl), channel, { inspect, selected: selectedId, canDelete: !!onDelete, canMove: !!onMove, labels: showLabels, boxModel: showOverlay }) });
  const [run, setRun] = useState(makeRun);
  const [revision, setRevision] = useState(0);
  const elementStyles = useMemo(() => Object.fromEntries(elements.map(el => [el.id, el.styles])), [elements]);
  const latest = useRef({ css, elementStyles, inspect, selectedId, showLabels, showOverlay, onSelect, onDelete, onMove, elements });
  latest.current = { css, elementStyles, inspect, selectedId, showLabels, showOverlay, onSelect, onDelete, onMove, elements };
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
    frame?.contentWindow?.postMessage({ channel, type: 'inspect', inspect: latest.current.inspect, selected: latest.current.selectedId, labels: latest.current.showLabels, boxModel: latest.current.showOverlay, canDelete: !!latest.current.onDelete, canMove: !!latest.current.onMove }, '*');
  }
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.source !== iframe.current?.contentWindow || event.data?.channel !== channel) return;
      if (event.data.type === 'ready') sync();
      if (event.data.type === 'select') latest.current.onSelect(event.data.id);
      if (event.data.type === 'delete' && latest.current.inspect && latest.current.elements.some(el => el.id === event.data.id)) latest.current.onDelete?.(event.data.id);
      if (event.data.type === 'move' && latest.current.inspect) {
        const move = resolvePreviewMove(latest.current.elements, event.data);
        if (move) latest.current.onMove?.(move.id, move.parentId, move.order);
      }
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
      {inspect && onDelete && <button type="button" disabled={!selectedId} onClick={() => { if (selectedId) onDelete(selectedId); }}>Delete selected element</button>}
      <label><input type="checkbox" checked={autoRun} onChange={e => setAutoRun(e.target.checked)} /> Auto-run JS</label>
      <select aria-label="Preview width" value={viewport} onChange={e => setViewport(e.target.value)}><option value="100%">Fit width</option><option value="390px">Phone · 390px</option><option value="768px">Tablet · 768px</option></select>
      <button type="button" aria-expanded={consoleOpen} onClick={() => setConsoleOpen(v => !v)}>Console ({logs.length})</button>
    </div>
    <p className={styles.hint}>{inspect ? 'Select an element. Drag ↕ to move it, or use × to delete. Escape cancels a move.' : 'Buttons, forms and JavaScript are interactive.'} CSS updates live. HTML changes restart the page.</p>
    {(error || pending) && <p role="status" className={styles.notice}>{error ? `Code error — keeping the last working page. ${error}` : 'JavaScript changed. Run to apply it; the current page is still running.'}</p>}
    <div className={styles.stage}><iframe key={revision} ref={iframe} title="Live HTML preview" srcDoc={run.html} onLoad={sync} style={{ width: viewport }} sandbox="allow-scripts allow-forms allow-downloads allow-same-origin allow-modals" /></div>
    {consoleOpen && <div className={styles.console} aria-label="Preview console"><button type="button" onClick={() => setLogs([])}>Clear console</button>{logs.length ? logs.map((log, i) => <pre key={i} data-level={log.level}>{log.level}: {log.text}</pre>) : <p>No output yet. Use console.log() in your code.</p>}</div>}
  </section>;
}
