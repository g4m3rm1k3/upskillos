// progress.js
// Where the learner is (track, lesson, step) and which checked steps they have completed.
// Kept in localStorage: it is a convenience for picking up where you left off. The learner's
// real progress is their project folder and its Git history, which this never touches.
import { useCallback, useMemo, useState } from 'react';

const KEY = 'project-studio-progress-v1';

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { position: v.position || {}, done: v.done || {}, covered: v.covered || {}, challenges: v.challenges || {} };
  } catch {
    return { position: {}, done: {}, covered: {}, challenges: {} };
  }
}

function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export function useProgress() {
  const [state, setState] = useState(load);

  const savePosition = useCallback((position) => {
    setState((prev) => {
      const p = prev.position;
      if (p.trackKey === position.trackKey && p.lessonId === position.lessonId && p.stepIndex === position.stepIndex) return prev;
      const next = { ...prev, position };
      save(next);
      return next;
    });
  }, []);

  const markDone = useCallback((stepId) => {
    setState((prev) => {
      if (prev.done[stepId]) return prev;
      const next = { ...prev, done: { ...prev.done, [stepId]: true } };
      save(next);
      return next;
    });
  }, []);

  const markCovered = useCallback((stepId) => {
    setState(prev => {
      if (prev.covered[stepId]) return prev;
      const next = { ...prev, covered: { ...prev.covered, [stepId]: true } };
      save(next); return next;
    });
  }, []);
  const setChallenge = useCallback((stepId, status) => {
    setState(prev => {
      const done = { ...prev.done };
      if (status === 'passed') done[stepId] = true;
      else delete done[stepId];
      const next = { ...prev, done, challenges: { ...prev.challenges, [stepId]: status } };
      save(next); return next;
    });
  }, []);
  const isCovered = useCallback(id => !!state.covered[id], [state.covered]);
  const challengeStatus = useCallback(id => state.challenges[id] || (state.done[id] ? 'passed' : 'not attempted'), [state.challenges, state.done]);
  const isDone = useCallback((stepId) => !!state.done[stepId], [state.done]);

  return useMemo(() => ({ position: state.position, savePosition, markDone, isDone, markCovered, isCovered, setChallenge, challengeStatus }), [state, savePosition, markDone, isDone, markCovered, isCovered, setChallenge, challengeStatus]);
}
