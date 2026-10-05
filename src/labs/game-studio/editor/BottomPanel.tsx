// The bottom panel: Output (the game's console and errors; click an error to open its
// script at that line), GUI → code (every editor action as the Scene API call that
// does the same thing, ADR 8), Animation (the selected AnimationPlayer's timeline) and TileMap
// (the selected TileMapLayer's tileset, tools and palette).

import React, { useEffect, useRef, useState } from 'react';
import type { Store } from './store';
import { Btn, C, useStore } from './kit';
import { Timeline } from './Timeline';
import { TilePanel } from './TilePanel';

const COLOR = { log: C.text, info: C.accent, warn: C.warn, error: C.bad, system: C.faint } as const;

export function BottomPanel({ store }: { store: Store }) {
  useStore(store);
  type Tab = 'output' | 'code' | 'debug' | 'animation' | 'tilemap';
  const [tab, setTabState] = useState<Tab>('output');
  // The Animation panel previews, and the TileMap panel paints, only while showing.
  const setTab = (t: Tab) => {
    setTabState(t);
    store.anim = { ...store.anim, open: t === 'animation', playing: false };
    store.tile = { ...store.tile, open: t === 'tilemap' };
    store.changed();
  };
  // Selecting an AnimationPlayer opens its timeline, and a TileMapLayer its tiles, as in Godot.
  const sel = store.selected, opens = sel?.type === 'AnimationPlayer' ? 'animation' : sel?.type === 'TileMapLayer' ? 'tilemap' : null;
  useEffect(() => { if (opens) setTab(opens); }, [sel?.id]);   // eslint-disable-line react-hooks/exhaustive-deps
  const end = useRef<HTMLDivElement>(null);
  const log = store.doc?.log ?? [];
  const count = tab === 'output' ? store.output.length : log.length;
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [count, tab]);
  const errors = store.output.filter((o) => o.level === 'error').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 6px', background: C.panel2, borderBottom: `1px solid ${C.border}` }}>
        {(['output', 'code', 'debug', 'animation', 'tilemap'] as const).map((t) => (
          <button key={t} type="button" data-testid={`tab-${t}`} onClick={() => setTab(t)} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? C.accent : 'transparent'}`, color: tab === t ? C.text : C.dim, padding: '5px 9px', fontSize: 12, cursor: 'pointer' }}>
            {t === 'output' ? `Output${errors ? ` (${errors} error${errors === 1 ? '' : 's'})` : ''}` : t === 'code' ? `GUI → code (${log.length})` : t === 'debug' ? `Debug${store.debugWidgets.length ? ` (${store.debugWidgets.length})` : ''}` : t === 'animation' ? 'Animation' : 'TileMap'}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        {tab === 'output' && <Btn small onClick={() => { store.output = []; store.changed(); }}>Clear</Btn>}
        {tab === 'code' && <Btn small onClick={() => void navigator.clipboard?.writeText(log.map((l) => l.code).join('\n'))} title="Copy the whole log as a script">Copy</Btn>}
      </div>
      {tab === 'debug' && <div data-testid="panel-debug" style={{ flex: 1, overflowY: 'auto', padding: '6px 10px', fontSize: 12 }}>
        {!store.running ? <div style={{ color: C.faint }}>Run the game: controls a script asks for with the debug global (debug.slider, debug.toggle, debug.button, debug.watch) appear here, and change the running game.</div>
          : !store.debugWidgets.length ? <div style={{ color: C.faint }}>No debug controls yet. In a script: this.speed = debug.slider('speed', this.speed, 0, 200)</div>
          : store.debugWidgets.map((w) => (
            <div key={w.name} data-testid={`debug-${w.name}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '3px 0' }}>
              <span style={{ width: 140, color: C.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</span>
              {w.kind === 'slider' && <>
                <input data-testid={`debug-slider-${w.name}`} type="range" min={w.min} max={w.max} step={w.step} value={w.value} onChange={(e) => store.setDebug(w.name, Number(e.target.value))} style={{ width: 220 }} />
                <input data-testid={`debug-number-${w.name}`} type="number" step={w.step} value={Number(w.value.toPrecision(6))} onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v)) store.setDebug(w.name, v); }} style={{ width: 80, background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 3, padding: '1px 4px', fontFamily: C.mono }} />
              </>}
              {w.kind === 'toggle' && <input data-testid={`debug-toggle-${w.name}`} type="checkbox" checked={w.value} onChange={(e) => store.setDebug(w.name, e.target.checked)} />}
              {w.kind === 'button' && <Btn small testid={`debug-button-${w.name}`} onClick={() => store.pressDebug(w.name)}>{w.name}</Btn>}
              {w.kind === 'watch' && <span style={{ fontFamily: C.mono, color: C.text }}>{w.value}</span>}
            </div>
          ))}
      </div>}
      {tab === 'animation' && <div data-testid="panel-animation" style={{ flex: 1, minHeight: 0, padding: '4px 8px' }}><Timeline store={store} /></div>}
      {tab === 'tilemap' && <div data-testid="panel-tilemap" style={{ flex: 1, minHeight: 0, padding: '4px 8px' }}><TilePanel store={store} /></div>}
      {(tab === 'output' || tab === 'code') && <div data-testid={`panel-${tab}`} style={{ flex: 1, overflowY: 'auto', fontFamily: C.mono, fontSize: 12, padding: '4px 8px' }}>
        {tab === 'output' && (store.output.length ? store.output.map((o, i) => (
          <div key={i} data-testid={`output-${i}`} onClick={() => o.file && store.openScript(o.file, { line: o.line ?? 1, column: o.column ?? 1 })}
            style={{ color: COLOR[o.level], cursor: o.file ? 'pointer' : 'default', whiteSpace: 'pre-wrap', padding: '1px 0' }}>
            {o.level === 'error' ? '✖ ' : o.level === 'warn' ? '▲ ' : ''}
            {o.file && <span style={{ textDecoration: 'underline' }}>{o.file}{o.line ? `:${o.line}:${o.column ?? 1}` : ''}</span>}
            {o.file ? '  ' : ''}{o.text}{o.node ? <span style={{ color: C.faint }}>{`   (node ${o.node})`}</span> : null}
          </div>
        )) : <div style={{ color: C.faint }}>Run the game (F5) to see its console.log output and errors here.</div>)}
        {tab === 'code' && (log.length ? log.map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '1px 0' }}>
            <span style={{ color: C.faint, width: 150, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'system-ui', fontSize: 11 }}>{l.label}</span>
            <span style={{ color: C.text, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{l.code}</span>
          </div>
        )) : <div style={{ color: C.faint }}>Everything you do in the editor appears here as the code that does the same thing.</div>)}
        <div ref={end} />
      </div>}
    </div>
  );
}
