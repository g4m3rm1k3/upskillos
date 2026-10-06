// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { it, expect } from 'vitest';
import { useProgress } from './progress.js';
import { checkRevision } from './checkEvidence.js';

it('preserves old checked progress while persisting coverage and deferred/failed challenges separately', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.setItem('project-studio-progress-v1', JSON.stringify({ position: { trackKey: 'existing' }, done: { old: true } }));
  const host = document.createElement('div');
  let root = createRoot(host), state;
  function Harness() { state = useProgress(); return null; }
  try {
    await act(async () => root.render(<Harness />));
    expect(state.isDone('old')).toBe(true);
    await act(async () => { state.markCovered('lesson'); state.setChallenge('challenge', 'deferred'); });
    expect(state.isCovered('lesson')).toBe(true);
    expect(state.isDone('lesson')).toBe(false);
    expect(state.isDone('challenge')).toBe(false);
    await act(async () => state.setChallenge('challenge', 'passed'));
    expect(state.isDone('challenge')).toBe(true);
    await act(async () => state.setChallenge('challenge', 'needs practice'));
    expect(state.isDone('challenge')).toBe(false);
    await act(async () => root.unmount());
    root = createRoot(host);
    await act(async () => root.render(<Harness />));
    expect(state.challengeStatus('challenge')).toBe('needs practice');
    expect(state.isCovered('lesson')).toBe(true);
    expect(state.isDone('old')).toBe(true);
  } finally {
    await act(async () => root.unmount()); localStorage.clear(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

it('counts a pass only in the folder it was earned in, and only for the same checks', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.setItem('project-studio-progress-v1', JSON.stringify({ done: { legacy: true } }));
  const host = document.createElement('div');
  const root = createRoot(host);
  let state;
  function Harness() { state = useProgress(); return null; }
  const here = { root: 'C:/pong', rev: checkRevision([{ kind: 'run' }]) };
  try {
    await act(async () => root.render(<Harness />));
    await act(async () => state.markDone('step', here));
    expect(state.isDone('step', here)).toBe(true);
    expect(state.isDone('step', { ...here, root: 'C:/other' })).toBe(false);
    expect(state.isDone('step', { ...here, rev: checkRevision([{ kind: 'tests' }]) })).toBe(false);
    expect(state.isDone('legacy', here)).toBe(true);
    await act(async () => state.clearDone('step'));
    expect(state.isDone('step', here)).toBe(false);
  } finally {
    await act(async () => root.unmount()); localStorage.clear(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
