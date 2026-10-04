// The task panel, beside the viewport: what to make, the steps (ticked off as Game Studio sees each
// done), a hint for the step you are on, "Show me" when stuck, and the way back to the lesson (or
// on to the next task, in a tutorial). The checks run in tasks/checker.ts.

import { TRAIN_HUD_HEIGHT, trainHudShown } from './TrainHud';
import React, { useState } from 'react';
import type { Store } from './store';
import { C, useStore } from './kit';
import { nextTask } from '../tasks';

// Pictures of each step done in the editor, made by e2e/tutorials.shots.mjs (npm run game:shots).
const SHOTS = import.meta.glob('../tasks/shots/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const shot = (task: string, step: number): string | undefined => SHOTS[`../tasks/shots/${task}-${step}.webp`];

export function TaskPanel({ store, onBack, onWatchFinished }: { store: Store; onBack: (route: string) => void; onWatchFinished?: () => void }) {
  useStore(store);
  const [open, setOpen] = useState(true);
  const [hint, setHint] = useState<number | null>(null);
  const [big, setBig] = useState<string | null>(null);
  const t = store.task;
  if (!t || !store.project) return null;
  const current = t.results.findIndex((r) => r !== true);
  const next = nextTask(t.def.id);
  const btn: React.CSSProperties = { background: C.raised, border: `1px solid ${C.border}`, borderRadius: 3, color: C.text, fontSize: 12, cursor: 'pointer', padding: '2px 8px' };
  return (
    <>
    {big && (
      <div data-testid="task-picture-big" onClick={() => setBig(null)} title="Click to close" style={{ position: 'fixed', inset: 0, background: '#000c', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
        <img src={big} alt="" style={{ maxWidth: '92%', maxHeight: '92%', borderRadius: 4, boxShadow: '0 10px 40px #000' }} />
      </div>
    )}
    <div data-testid="task-panel" style={{ position: 'absolute', right: 10, top: 10, width: 340, maxWidth: 'calc(100% - 20px)', maxHeight: store.running && trainHudShown(store) ? `calc(100% - ${TRAIN_HUD_HEIGHT + 20}px)` : 'calc(100% - 20px)', overflowY: 'auto', background: '#16181cf2', border: `1px solid ${t.finished ? C.ok : C.accent}`, borderRadius: 6, padding: '8px 10px', fontSize: 12, color: C.dim, lineHeight: 1.5, zIndex: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: C.faint, fontSize: 11 }}>TRY IT · {t.def.chain}</span>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={() => setOpen(!open)} title={open ? 'Collapse' : 'Show the task'} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer' }}>{open ? '▾' : '▸'}</button>
        <button type="button" onClick={async () => { if ((await store.ask('Stop this task? Your project stays open.', [{ label: 'Stop the task', value: 'yes' }, { label: 'Keep going', value: 'cancel', primary: true }])) === 'yes') store.closeTask(); }} title="Stop the task" style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 14 }}>×</button>
      </div>
      <b style={{ color: C.text, fontSize: 13 }}>{t.def.title}</b>
      {open && (
        <>
          <div style={{ margin: '2px 0 6px' }}>{t.def.goal}</div>
          {t.def.finished && (
            <div data-testid="task-goal" style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: '5px 7px', marginBottom: 8, background: '#1d2a22' }}>
              <div style={{ color: C.faint, fontSize: 10, fontWeight: 700, letterSpacing: 0.4 }}>WHAT YOU ARE BUILDING</div>
              <div style={{ margin: '2px 0 4px' }}>{t.def.finished.what}</div>
              <button type="button" data-testid="task-watch-finished" onClick={onWatchFinished} disabled={!onWatchFinished} style={{ ...btn, background: store.previewing ? C.accent : C.raised }}
                title="Runs the finished game, trained brain and all, in the game area. Your project is not changed.">{store.previewing ? '■ Stop to go back to yours' : t.sawFinished ? '▶ Watch it again' : '▶ Watch the finished agent'}</button>
            </div>
          )}
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {t.def.steps.map((step, i) => {
              const ok = t.results[i] === true, here = i === current;
              return (
                <li key={i} data-testid={`task-step-${i}`} data-done={ok ? 'yes' : 'no'} style={{ display: 'flex', gap: 6, marginBottom: 6, opacity: !ok && !here ? 0.6 : 1 }}>
                  <span style={{ color: ok ? C.ok : here ? C.warm : C.faint, fontWeight: 700, width: 14, flexShrink: 0 }}>{ok ? '✓' : i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: ok ? C.dim : C.text }}>{step.text}</div>
                    {here && typeof t.results[i] === 'string' && t.results[i] !== 'Not checked yet' && <div data-testid="task-why" style={{ color: C.warn, fontSize: 11, marginTop: 2 }}>Not yet: {t.results[i] as string}</div>}
                    {here && shot(t.def.id, i) && (
                      <img data-testid="task-picture" src={shot(t.def.id, i)} alt={`Step ${i + 1}, done in the editor`} title="What it looks like when this step is done (the orange outline shows where). Click to enlarge."
                        onClick={() => setBig(shot(t.def.id, i)!)} style={{ display: 'block', width: '100%', marginTop: 4, borderRadius: 3, border: `1px solid ${C.border}`, cursor: 'zoom-in' }} />
                    )}
                    {here && step.hint && (hint === i
                      ? <div style={{ color: C.faint, fontSize: 11, marginTop: 2 }}>Hint: {step.hint}</div>
                      : <span role="link" data-testid="task-hint" onClick={() => setHint(i)} style={{ color: C.accent, fontSize: 11, cursor: 'pointer' }}>Hint</span>)}
                  </div>
                </li>
              );
            })}
          </ol>
          {t.finished ? (
            <div data-testid="task-finished" style={{ borderTop: `1px solid ${C.border}`, paddingTop: 6, marginTop: 4 }}>
              <div style={{ color: C.ok, fontWeight: 700 }}>✓ Done!</div>
              <div style={{ margin: '2px 0 6px' }}>{t.def.done}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {t.link?.from && <button type="button" data-testid="task-back" style={{ ...btn, background: C.ok, color: '#0b1320', borderColor: C.ok, fontWeight: 600 }} onClick={() => onBack(t.link!.from!)}>Back to the lesson →</button>}
                {!t.link?.from && next && <button type="button" data-testid="task-next" style={{ ...btn, background: C.ok, color: '#0b1320', borderColor: C.ok, fontWeight: 600 }} onClick={() => void store.startTask(next.id)}>Next task: {next.title} →</button>}
                {!t.link?.from && !next && <button type="button" style={btn} onClick={() => store.closeTask()}>Finish</button>}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', borderTop: `1px solid ${C.border}`, paddingTop: 6, marginTop: 4 }}>
              <span style={{ flex: 1, color: C.faint, fontSize: 11 }}>{t.results.filter((r) => r === true).length} of {t.def.steps.length} done · checks run as you work</span>
              <button type="button" data-testid="task-show-me" style={btn} title="Do the task for you (one undo step: Ctrl+Z takes it back)" onClick={async () => { if ((await store.ask('Show the finished task? Ctrl+Z takes it back.', [{ label: 'Show me', value: 'yes', primary: true }, { label: 'Cancel', value: 'cancel' }])) === 'yes') store.showSolution(); }}>Show me</button>
            </div>
          )}
        </>
      )}
    </div>
    </>
  );
}
