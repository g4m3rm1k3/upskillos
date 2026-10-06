// progress.js
// Where the learner is (track, lesson, step) and which checked steps they have completed.
// Kept in localStorage: it is a convenience for picking up where you left off. The learner's
// real progress is their project folder and its Git history, which this never touches.
//
// A pass records where it was earned: { root, rev }, the project folder and a fingerprint of the
// step's checks. It counts only in that folder and while the lesson's checks are unchanged, so a
// badge describes the folder that is open now. Passes saved before this existed are plain `true`:
// they can't say which folder they came from, so they keep counting everywhere.
import { useCallback, useMemo, useState } from 'react';

const KEY = 'project-studio-progress-v1';


// proof: { root, rev } from the check run, or nothing (legacy / no folder known).
function counts(entry, proof) {
  if (!entry) return false;
  if (entry === true || !proof) return true;
  return entry.root === proof.root && entry.rev === proof.rev;
}

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

  const markDone = useCallback((stepId, proof) => {
    setState((prev) => {
      const entry = proof ? { root: proof.root, rev: proof.rev } : true;
      const old = prev.done[stepId];
      if (old === entry || (old && proof && old.root === proof.root && old.rev === proof.rev)) return prev;
      const next = { ...prev, done: { ...prev.done, [stepId]: entry } };
      save(next);
      return next;
    });
  }, []);

  // A failed recheck withdraws an earlier pass: the badge describes the folder as it is now.
  const clearDone = useCallback((stepId) => {
    setState((prev) => {
      if (!prev.done[stepId]) return prev;
      const done = { ...prev.done };
      delete done[stepId];
      const next = { ...prev, done };
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
  const setChallenge = useCallback((stepId, status, proof) => {
    setState(prev => {
      const done = { ...prev.done };
      if (status === 'passed') done[stepId] = proof ? { root: proof.root, rev: proof.rev } : true;
      else delete done[stepId];
      const next = { ...prev, done, challenges: { ...prev.challenges, [stepId]: status } };
      save(next); return next;
    });
  }, []);
  const isCovered = useCallback(id => !!state.covered[id], [state.covered]);
  const challengeStatus = useCallback(id => state.challenges[id] || (state.done[id] ? 'passed' : 'not attempted'), [state.challenges, state.done]);
  const isDone = useCallback((stepId, proof) => counts(state.done[stepId], proof), [state.done]);

  return useMemo(() => ({ position: state.position, savePosition, markDone, clearDone, isDone, markCovered, isCovered, setChallenge, challengeStatus }), [state, savePosition, markDone, clearDone, isDone, markCovered, isCovered, setChallenge, challengeStatus]);
}
