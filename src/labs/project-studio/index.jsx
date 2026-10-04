// Project Studio — an IDE-shaped lab for building a real, multi-file
// project one small step at a time.
//
// Unlike the notebook components (PySideNotebook and friends), nothing
// here is ephemeral: files live in a folder the learner picked, code runs
// from that folder (so cross-file imports resolve), and the project
// outlives the app. That's what makes it possible to build something
// worth open-sourcing rather than a throwaway snippet.
//
// The panes: a file tree, an editor over the real files, the lesson, and below the editor
// a real terminal in the project folder plus the output of the Run button. A step can carry
// checks ("Check my work"), run against the real folder by desktop/app/project-checks.cjs.
//
// Running needs the desktop app — it needs real filesystem and real process access. In a
// browser tab the lessons can still be read, and followed in your own editor and terminal.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useGlobalTheme } from '../../context/ThemeContext.jsx';
import { useProjectFs } from './useProjectFs.js';
import { TRACKS, TRACK_KEYS, trackTitle, getSupportFiles } from './trackLoader.js';
import { createProvidedFiles } from './providedFiles.js';
import FileTree from './FileTree.jsx';
import StudioPanes from './StudioPanes.jsx';
import { studioSeries, nextSeriesLesson } from './series.js';
import EditorPane from './EditorPane.jsx';
import LessonPanel from './LessonPanel.jsx';
import OutputPanel from './OutputPanel.jsx';
import TerminalPanel from './TerminalPanel.jsx';
import CppProjectRuntime from './CppProjectRuntime.jsx';
import { canTrace, handOffToCodeLens, inlineLocalHeaders } from './codeLensHandoff.js';
import { useProgress } from './progress.js';

const SAVE_DEBOUNCE_MS = 400;
const SERIES = studioSeries(TRACKS, TRACK_KEYS, trackTitle);

export default function ProjectStudio() {
  const C = useThemeColors();
  const { themeStyles } = useGlobalTheme();
  const monacoTheme = themeStyles?.monaco || (C.dark ? 'open-calc-dark' : 'open-calc-light');
  const progress = useProgress();

  const [trackKey, setTrackKey] = useState(() => (TRACKS[progress.position.trackKey] ? progress.position.trackKey : TRACK_KEYS[0] ?? null));
  const fs = useProjectFs(trackKey);
  const lessons = useMemo(() => (trackKey ? TRACKS[trackKey] ?? [] : []), [trackKey]);
  const [lessonId, setLessonId] = useState(() => progress.position.lessonId ?? lessons[0]?.id ?? null);
  const lesson = useMemo(() => lessons.find((l) => l.id === lessonId) ?? lessons[0], [lessons, lessonId]);
  const [stepIndex, setStepIndex] = useState(() => Math.max(0, progress.position.stepIndex ?? 0));
  const step = lesson?.steps?.[Math.min(stepIndex, (lesson?.steps?.length ?? 1) - 1)] ?? null;

  // Remember where the learner is, so reopening the lab lands on the same step.
  useEffect(() => {
    if (lesson) progress.savePosition({ trackKey, lessonId: lesson.id, stepIndex });
  }, [trackKey, lesson, stepIndex, progress.savePosition]);

  const [openFiles, setOpenFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [buffers, setBuffers] = useState({}); // rel -> content in the editor
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(null);
  const [providedError, setProvidedError] = useState(null);

  // What each open file looked like on disk when we last read or wrote it.
  // These are the learner's real project files and they're explicitly meant
  // to be opened in other editors too, so an in-memory buffer must never be
  // treated as authoritative — without this, an untouched stale buffer
  // silently overwrites whatever changed on disk underneath it.
  const loadedRef = useRef({});
  const projectIdentityRef = useRef(null);
  projectIdentityRef.current = `${trackKey}:${fs.root}`;

  const [output, setOutput] = useState([]);
  const [running, setRunning] = useState(false);
  const runIdRef = useRef(null);
  const stopRequestedRef = useRef(false);
  const earlyOutputRef = useRef([]);
  const startingRunRef = useRef(false);
  const saveTimers = useRef({});

  const [bottomTab, setBottomTab] = useState('terminal');
  const [bottomHeight, setBottomHeight] = useState(260);
  const [explorerVisible, setExplorerVisible] = useState(() => {
    try { return localStorage.getItem('project-studio:explorer-visible') !== 'false'; } catch { return true; }
  });
  useEffect(() => { try { localStorage.setItem('project-studio:explorer-visible', String(explorerVisible)); } catch {} }, [explorerVisible]);
  const [checkStates, setCheckStates] = useState({}); // stepId -> { running, results, error }

  // A new project folder means none of the open buffers belong to it any more.
  useEffect(() => {
    Object.values(saveTimers.current).forEach(clearTimeout);
    saveTimers.current = {};
    setSaving(false);
    setConflict(null);
    setOpenFiles([]);
    setActiveFile(null);
    setBuffers({});
    setCheckStates({});
    loadedRef.current = {};
  }, [fs.root, trackKey]);

  // ── open / edit / save ───────────────────────────────────────────────────
  const openFile = useCallback(async (rel) => {
    setOpenFiles((prev) => (prev.includes(rel) ? prev : [...prev, rel]));
    setActiveFile(rel);
    if (buffers[rel] === undefined) {
      const identity = projectIdentityRef.current;
      const content = await fs.readFile(rel);
      if (identity !== projectIdentityRef.current) return;
      loadedRef.current[rel] = content;
      setBuffers((prev) => ({ ...prev, [rel]: content }));
    }
  }, [buffers, fs]);

  const closeFile = useCallback((rel) => {
    setOpenFiles((prev) => prev.filter((f) => f !== rel));
    setActiveFile((cur) => (cur === rel ? (openFiles.find((f) => f !== rel) ?? null) : cur));
  }, [openFiles]);

  const editFile = useCallback((content) => {
    if (!activeFile) return;
    setBuffers((prev) => ({ ...prev, [activeFile]: content }));

    // Debounced write-through: the file on disk is the source of truth, so
    // an external editor or `git diff` always sees current work, but we
    // don't hammer the disk on every keystroke.
    clearTimeout(saveTimers.current[activeFile]);
    setSaving(true);
    const file = activeFile;
    const identity = projectIdentityRef.current;
    saveTimers.current[file] = setTimeout(async () => {
      // Re-check disk before writing. If it no longer matches what we loaded,
      // something outside the lab changed it, and blindly writing our buffer
      // would destroy that work.
      const onDisk = await fs.readFile(file);
      if (identity !== projectIdentityRef.current) return;
      if (onDisk !== loadedRef.current[file] && onDisk !== content) {
        setConflict(file);
        setSaving(false);
        return;
      }
      await fs.writeFile(file, content);
      loadedRef.current[file] = content;
      setSaving(false);
      fs.refresh();
    }, SAVE_DEBOUNCE_MS);
  }, [activeFile, fs]);

  // Discard our buffer and take whatever is on disk now.
  const reloadFromDisk = useCallback(async (rel) => {
    clearTimeout(saveTimers.current[rel]);
    const identity = projectIdentityRef.current;
    const content = await fs.readFile(rel);
    if (identity !== projectIdentityRef.current) return;
    loadedRef.current[rel] = content;
    setBuffers((prev) => ({ ...prev, [rel]: content }));
    setConflict(null);
    setSaving(false);
  }, [fs]);

  // Keep our buffer and overwrite disk — only ever from an explicit click.
  const overwriteDisk = useCallback(async (rel) => {
    const content = buffers[rel] ?? '';
    await fs.writeFile(rel, content);
    loadedRef.current[rel] = content;
    setConflict(null);
    setSaving(false);
  }, [buffers, fs]);

  // Write any pending edit now (before a run or a check), refusing if the file changed on
  // disk underneath us. Returns false if there was a conflict.
  const flushActive = useCallback(async () => {
    if (!activeFile || buffers[activeFile] === undefined) return true;
    clearTimeout(saveTimers.current[activeFile]);
    if (buffers[activeFile] !== loadedRef.current[activeFile]) {
      const onDisk = await fs.readFile(activeFile);
      if (onDisk !== loadedRef.current[activeFile] && onDisk !== buffers[activeFile]) {
        setConflict(activeFile);
        setSaving(false);
        return false;
      }
      await fs.writeFile(activeFile, buffers[activeFile]);
      loadedRef.current[activeFile] = buffers[activeFile];
    } else {
      await reloadFromDisk(activeFile);
    }
    setSaving(false);
    return true;
  }, [activeFile, buffers, fs, reloadFromDisk]);

  const createProvided = useCallback(async () => {
    if (!step?.provided || !fs.root) return;
    setProvidedError(null);
    try {
      if (!(await flushActive())) throw new Error('Resolve the open file conflict before creating the provided file.');
      await createProvidedFiles(fs.api, [
        ...getSupportFiles(trackKey, lesson.meta.support),
        { file: step.file, content: step.target, preserveExisting: Boolean(lesson.meta.support) },
      ]);
      await reloadFromDisk(step.file);
      await fs.refresh();
    } catch (error) {
      setProvidedError(error.message);
    }
  }, [step, fs, flushActive, reloadFromDisk, trackKey, lesson]);

  useEffect(() => { setProvidedError(null); }, [step?.id, fs.root]);

  // When a step names a file, open it. This is how new files and folders enter the project:
  // a step refers to a path that isn't there yet, and the first edit creates it.
  useEffect(() => {
    if (!step?.file || !fs.root) return;
    let cancelled = false;
    (async () => {
      const content = await fs.readFile(step.file);
      if (cancelled) return;
      if (loadedRef.current[step.file] === undefined) loadedRef.current[step.file] = content;
      setBuffers((prev) => (prev[step.file] === undefined ? { ...prev, [step.file]: content } : prev));
      setOpenFiles((prev) => (prev.includes(step.file) ? prev : [...prev, step.file]));
      setActiveFile(step.file);
    })();
    return () => { cancelled = true; };
  }, [step?.file, fs.root, fs.readFile]);

  // Files change outside the editor all the time here: the terminal creates them, and Git
  // rewrites them (`git switch`, `git restore`). So the tree is refreshed regularly, and an
  // open file that hasn't been edited here follows the disk. A file with unsaved edits is never
  // replaced; the save conflict banner handles that case.
  const buffersRef = useRef(buffers);
  buffersRef.current = buffers;
  const openFilesRef = useRef(openFiles);
  openFilesRef.current = openFiles;
  useEffect(() => {
    if (!fs.available || !fs.root) return undefined;
    let busy = false;
    const sync = async () => {
      if (busy) return;
      busy = true;
      const identity = projectIdentityRef.current;
      try {
        fs.refresh();
        for (const rel of openFilesRef.current) {
          const buf = buffersRef.current[rel];
          // Edited here and not yet written (or written and diverged): leave it alone.
          if (buf === undefined || buf !== loadedRef.current[rel]) continue;
          const onDisk = await fs.readFile(rel);
          if (identity !== projectIdentityRef.current) return;
          if (onDisk !== loadedRef.current[rel] && buffersRef.current[rel] === loadedRef.current[rel]) {
            loadedRef.current[rel] = onDisk;
            setBuffers((prev) => ({ ...prev, [rel]: onDisk }));
          }
        }
      } finally {
        busy = false;
      }
    };
    window.addEventListener('focus', sync);
    const timer = setInterval(sync, 2000);
    return () => { window.removeEventListener('focus', sync); clearInterval(timer); };
  }, [fs.available, fs.root, fs.refresh, fs.readFile]);

  // ── run ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!fs.available) return;
    const unsub = window.openCalcDesktop.onScriptOutput((evt) => {
      if (!runIdRef.current) { if (startingRunRef.current) earlyOutputRef.current.push(evt); return; }
      if (evt.runId !== runIdRef.current) return;
      if (evt.stream === 'exit') {
        setRunning(false);
        setOutput((prev) => [...prev, { stream: 'meta', text: `\n[process exited with code ${evt.code}]` }]);
        return;
      }
      setOutput((prev) => [...prev, evt]);
    });
    return unsub;
  }, [fs.available]);

  const runProject = useCallback(async () => {
    if (!lesson) return;
    if (!(await flushActive())) return;
    const target = lesson.run || step?.file;
    if (!target) return;

    setBottomTab('output');
    setOutput([]);
    setRunning(true);
    runIdRef.current = null;
    startingRunRef.current = true;
    earlyOutputRef.current = [];
    stopRequestedRef.current = false;
    if (lesson.meta.support) {
      try {
        await createProvidedFiles(fs.api, getSupportFiles(trackKey, lesson.meta.support));
        await fs.refresh();
      } catch (error) {
        setOutput([{ stream: 'stderr', text: error.message }]);
        setRunning(false);
        startingRunRef.current = false;
        return;
      }
    }
    let res;
    try { res = await fs.run(lesson.runtime || 'python', target); }
    catch (error) { res = { ok: false, reason: error.message }; }
    startingRunRef.current = false;
    if (!res.ok) {
      const reason = lesson.runtime === 'cpp' && res.reason?.includes('isn\'t supported')
        ? 'This desktop process does not have the C++ project runner loaded. Save your work, fully close UpSkillOS, and restart the desktop app from the updated source (npm run desktop:dev). An older installed build needs an updated desktop build; refreshing the page will not update its runner.'
        : res.reason || 'Failed to run.';
      setOutput([{ stream: 'stderr', text: reason }]);
      setRunning(false);
      return;
    }
    runIdRef.current = res.runId;
    const early = earlyOutputRef.current.filter(evt => evt.runId === res.runId);
    earlyOutputRef.current = [];
    // `console: true` in a lesson's frontmatter: a terminal program whose output appears here,
    // not a game in its own window.
    const launched = lesson.meta.console === 'true' ? 'Program started. Its output appears below.\n'
      : lesson.runtime === 'cpp' ? 'Game launched in a separate window. Use Escape in the game or Stop here to close it.\n'
      : 'Project launched.\n';
    setOutput(prev => [...prev, { stream: 'meta', text: launched },
      ...early.map(evt => evt.stream === 'exit' ? { stream: 'meta', text: `\n[process exited with code ${evt.code}]` } : evt)]);
    if (early.some(evt => evt.stream === 'exit')) setRunning(false);
    if (stopRequestedRef.current) await window.openCalcDesktop.stopRun(res.runId);
  }, [lesson, step, fs, flushActive, trackKey]);

  // Step through the active C++ file in CodeLens: every line's variables, the call stack and
  // the heap. Project Studio keeps its place (progress.js), and CodeLens's Back returns here.
  const navigate = useNavigate();
  const traceInCodeLens = useCallback(async () => {
    if (!activeFile || !(await flushActive())) return;
    const read = async (rel) => {
      const res = await fs.api?.read(rel);
      return res?.ok && !res.missing ? res.content : null;
    };
    const code = await inlineLocalHeaders(buffers[activeFile] ?? '', activeFile, read);
    handOffToCodeLens(code);
    navigate('/codelens');
  }, [activeFile, buffers, flushActive, fs, navigate]);

  const stopProject = useCallback(async () => {
    stopRequestedRef.current = true;
    if (!runIdRef.current) {
      setOutput(prev => [...prev, { stream: 'meta', text: 'Stop requested; waiting for the build to finish.\n' }]);
      return;
    }
    const result = await window.openCalcDesktop.stopRun(runIdRef.current);
    if (!result?.ok) {
      setOutput(prev => [...prev, { stream: 'stderr', text: 'Could not stop this process. Close the game window or fully close the desktop app.\n' }]);
    }
  }, []);

  // ── checks ───────────────────────────────────────────────────────────────
  const runChecks = useCallback(async () => {
    if (!step?.checks?.length || !fs.available) return;
    const id = step.id;
    setCheckStates((prev) => ({ ...prev, [id]: { ...prev[id], running: true, error: null } }));
    if (!(await flushActive())) {
      setCheckStates((prev) => ({ ...prev, [id]: { ...prev[id], running: false, error: 'A file changed on disk while it was open here. Choose which version to keep (above), then check again.' } }));
      return;
    }
    const res = await fs.api.check(step.checks);
    fs.refresh();
    if (!res?.ok) {
      setCheckStates((prev) => ({ ...prev, [id]: { running: false, results: null, error: res?.reason || 'The checks could not run.' } }));
      return;
    }
    setCheckStates((prev) => ({ ...prev, [id]: { running: false, results: res.results, error: null } }));
    const passed = res.results.length === step.checks.length && res.results.every(r => r.pass);
    if (step.optional) progress.setChallenge(id, passed ? 'passed' : 'needs practice');
    else if (passed) progress.markDone(id);
  }, [step, fs, flushActive, progress.markDone, progress.setChallenge]);

  const isStepDone = useCallback((s) => (s.checks?.length ? progress.isDone(s.id) : false), [progress]);
  const isLessonDone = useCallback((l) => {
    const checked = l.steps.filter((s) => !s.optional && s.checks?.length);
    return checked.length > 0 && checked.every((s) => progress.isDone(s.id));
  }, [progress]);

  // ── new file / folder / delete ───────────────────────────────────────────
  const newFile = useCallback(async (rel) => {
    const identity = projectIdentityRef.current;
    const result = await fs.api.create(rel);
    if (!result.ok) return result;
    // File creation is complete. Opening the editor must not keep + disabled.
    void fs.refresh().catch(error => setProvidedError(error.message));
    if (identity === projectIdentityRef.current) void openFile(rel).catch(error => setProvidedError(error.message));
    return result;
  }, [fs, openFile]);

  const newFolder = useCallback(async (rel) => {
    return fs.mkdir(rel);
  }, [fs]);

  const deleteEntry = useCallback(async (rel) => {
    if (!window.confirm(`Delete ${rel}? This removes it from disk.`)) return;
    await fs.remove(rel);
    setOpenFiles((prev) => prev.filter((f) => f !== rel));
    setBuffers((prev) => { const next = { ...prev }; delete next[rel]; return next; });
    setActiveFile((cur) => (cur === rel ? null : cur));
  }, [fs]);

  // Dragging the bar between the editor and the terminal.
  const startResize = useCallback((e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = bottomHeight;
    const move = (ev) => setBottomHeight(Math.min(Math.max(120, startH + (startY - ev.clientY)), 700));
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, [bottomHeight]);

  const selectLesson = useCallback((id) => { setLessonId(id); setStepIndex(0); }, []);
  const flushProject = useCallback(async () => {
    for (const [file, content] of Object.entries(buffers)) {
      clearTimeout(saveTimers.current[file]);
      if (content === loadedRef.current[file]) continue;
      const disk = await fs.readFile(file);
      if (disk !== loadedRef.current[file] && disk !== content) { setConflict(file); return false; }
      const result = await fs.writeFile(file, content);
      if (!result.ok) { setProvidedError(result.reason || `Could not save ${file}.`); return false; }
      loadedRef.current[file] = content;
    }
    setSaving(false);
    return true;
  }, [buffers, fs]);
  const renameFile = useCallback(async (from, to) => {
    if (!(await flushProject())) return { ok: false, reason: 'Resolve the file conflict or save error before renaming.' };
    const identity = projectIdentityRef.current;
    const result = await fs.api.rename(from, to);
    if (!result.ok) return result;
    if (identity !== projectIdentityRef.current) return result;
    clearTimeout(saveTimers.current[from]);
    if (loadedRef.current[from] !== undefined) { loadedRef.current[to] = loadedRef.current[from]; delete loadedRef.current[from]; }
    setBuffers(prev => { const next = { ...prev }; if (from in next) { next[to] = next[from]; delete next[from]; } return next; });
    setOpenFiles(prev => [...new Set(prev.map(file => file === from ? to : file))]);
    setActiveFile(prev => prev === from ? to : prev);
    void fs.refresh().catch(error => setProvidedError(error.message));
    return result;
  }, [flushProject, fs]);
  const selectTrack = useCallback(async (key) => {
    if (!(await flushProject())) return;
    if (running) { await stopProject(); if (startingRunRef.current) return; }
    setTrackKey(key); setLessonId(TRACKS[key][0]?.id); setStepIndex(0);
  }, [flushProject, running, stopProject]);
  const pickProject = useCallback(async () => {
    if (!(await flushProject())) return;
    if (running) { await stopProject(); if (startingRunRef.current) return; }
    await fs.pick();
  }, [flushProject, running, stopProject, fs]);
  const goPrev = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => {
    if (step && !step.optional) progress.markCovered?.(step.id);
    setStepIndex(i => Math.min((lesson?.steps.length ?? 1) - 1, i + 1));
  }, [lesson, step, progress.markCovered]);

  const series = SERIES.find(item => item.chapters.some(chapter => chapter.key === trackKey)) ?? SERIES[0];
  const continuation = lesson && series ? nextSeriesLesson(series, TRACKS, trackKey, lesson.id) : null;
  const continueSeries = async () => {
    if (!continuation || !(await flushProject())) return;
    if (step && !step.optional) progress.markCovered?.(step.id);
    if (continuation.trackKey !== trackKey) await selectTrack(continuation.trackKey);
    else { setLessonId(continuation.lesson.id); setStepIndex(0); }
  };
  const pickerStyle = { fontSize: 11, padding: '3px 6px', borderRadius: 5, background: C.surface2, color: C.text, border: `1px solid ${C.border}`, maxWidth: 270 };
  const explorerToggle = <button onClick={() => setExplorerVisible(value => !value)} aria-expanded={explorerVisible}
    style={{ padding: '5px 10px', fontSize: 12, borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface2, color: C.text, cursor: 'pointer' }}>
    {explorerVisible ? 'Hide explorer' : 'Show explorer'}
  </button>;
  const trackPicker = series && (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <label style={{ fontSize: 11 }}>Series <select aria-label="Series" value={series.key} style={pickerStyle}
        onChange={event => selectTrack(SERIES.find(item => item.key === event.target.value).chapters[0].key)}>
        {SERIES.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
      </select></label>
      {series.chapters.length > 1 && <label style={{ fontSize: 11 }}>Chapter <select aria-label="Chapter"
      value={trackKey}
      onChange={(e) => selectTrack(e.target.value)}
      style={pickerStyle}
    >
      {series.chapters.map((chapter, index) => <option key={chapter.key} value={chapter.key}>{index + 1}. {chapter.label}</option>)}
    </select></label>}
    </div>
  );

  const lessonPanel = lesson && step && (
    <LessonPanel
      lesson={lesson}
      lessons={lessons}
      stepIndex={lesson.steps.indexOf(step)}
      step={step}
      currentContent={step.file ? (buffers[step.file] ?? '') : ''}
      onCreateProvided={createProvided}
      providedError={providedError}
      onSelectStep={(id, index) => { setLessonId(id); setStepIndex(index); }}
      onDefer={() => { progress.setChallenge(step.id, 'deferred'); if (stepIndex < lesson.steps.length - 1) goNext(); else void continueSeries(); }}
      challengeStatus={progress.challengeStatus}
      isCovered={progress.isCovered}
      onCover={() => progress.markCovered(step.id)}
      onPrev={goPrev}
      onNext={goNext}
      onSelectLesson={selectLesson}
      continuationLabel={continuation ? `${continuation.trackKey === trackKey ? 'Continue to lesson' : 'Continue to chapter'}: ${continuation.trackKey === trackKey ? continuation.lesson.title : series.chapters.find(chapter => chapter.key === continuation.trackKey).label}` : null}
      onContinue={continueSeries}
      seriesNote={series?.planned}
      seriesLessons={series ? series.chapters.flatMap(chapter => TRACKS[chapter.key] ?? []) : lessons}
      checkState={checkStates[step.id]}
      onCheck={runChecks}
      canCheck={fs.available && !!fs.root}
      isStepDone={isStepDone}
      isLessonDone={isLessonDone}
      C={C}
    />
  );

  // ── web: the lessons can be read and followed in your own editor ─────────
  if (!fs.available) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: C.bg, color: C.text }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', borderBottom: `1px solid ${C.border}`, background: C.surface }}>
          <strong style={{ fontSize: 13 }}>Project Studio</strong>
          {trackPicker}
        </div>
        <div style={{ padding: '8px 14px', fontSize: 12, lineHeight: 1.6, color: C.text, background: C.amberBg, borderBottom: `1px solid ${C.border}` }}>
          You're reading this in a browser. Every step can be followed with your own editor and terminal; the
          built-in editor, terminal and <strong>Check my work</strong> need the desktop app, because a browser tab isn't
          allowed to read your files or run programs.
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 760, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}` }}>
            {lessonPanel}
          </div>
        </div>
      </div>
    );
  }

  // No folder yet. The lesson stays visible beside the chooser, because choosing (and naming)
  // the folder is the first thing a new track's first lesson explains.
  if (!fs.root) {
    return (
      <StudioPanes explorerVisible={explorerVisible} C={C}
        explorer={<FileTree entries={[]} root={null} onPick={pickProject} C={C} />}
        editor={
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', borderBottom: `1px solid ${C.border}`, background: C.surface }}>
            <strong style={{ fontSize: 13 }}>Project Studio</strong>
            {trackPicker}
            {explorerToggle}
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ChooseFolder fs={fs} C={C} />
          </div>
        </div>
        } lesson={lessonPanel} />
    );
  }

  const activeContent = activeFile ? (buffers[activeFile] ?? '') : '';
  const stepTarget = step?.file && step.file === activeFile ? step.target : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: C.bg, color: C.text }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 12px', borderBottom: `1px solid ${C.border}`, background: C.surface,
        }}
      >
        <strong style={{ fontSize: 13 }}>Project Studio</strong>
        {trackPicker}
        <div style={{ flex: 1 }} />
        {explorerToggle}
        {lesson?.run && (
          <button
            onClick={runProject}
            disabled={running}
            style={{
              fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 6, border: 'none',
              background: C.teal, color: '#fff', cursor: running ? 'default' : 'pointer', opacity: running ? 0.5 : 1,
            }}
          >
            {running ? 'Running…' : `▶ Run ${lesson.run}`}
          </button>
        )}
        {canTrace(lesson, activeFile) && (
          <button
            onClick={traceInCodeLens}
            title="Step through this file line by line in CodeLens: variables, the call stack and the heap at every step. Needs GDB. Traces one .cpp file (its own headers are included)."
            style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface2, color: C.text, cursor: 'pointer' }}
          >
            🔬 Trace in CodeLens
          </button>
        )}
        {running && (
          <button onClick={stopProject} style={{ fontSize: 12, padding: '5px 14px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface2, color: C.text }}>
            ■ Stop
          </button>
        )}
      </div>

      {lesson?.runtime === 'cpp' && <CppProjectRuntime C={C} />}
      {fs.root && fs.error && <p role="alert" style={{ padding: '6px 12px', color: C.amber }}>{fs.error}</p>}

      {conflict && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            padding: '7px 12px', fontSize: 12, lineHeight: 1.5,
            background: 'rgba(245,158,11,0.12)', borderBottom: `1px solid ${C.amber}`, color: C.text,
          }}
        >
          <span>
            <strong>{conflict}</strong> changed outside the lab since you opened it. Nothing was
            overwritten — pick which version to keep.
          </span>
          <div style={{ flex: 1 }} />
          <button onClick={() => reloadFromDisk(conflict)} style={conflictBtn(C)}>
            Load the version on disk
          </button>
          <button onClick={() => overwriteDisk(conflict)} style={conflictBtn(C, true)}>
            Keep what's in the editor
          </button>
        </div>
      )}

      <StudioPanes explorerVisible={explorerVisible} C={C} explorer={
          <FileTree
            entries={fs.entries}
            root={fs.root}
            activeFile={activeFile}
            onOpen={openFile}
            onDelete={deleteEntry}
            onRename={renameFile}
            onNewFile={newFile}
            onNewFolder={newFolder}
            onPick={pickProject}
            C={C}
          />
        } editor={<>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EditorPane
              openFiles={openFiles}
              activeFile={activeFile}
              content={activeContent}
              targetContent={stepTarget}
              onSelect={setActiveFile}
              onClose={closeFile}
              onChange={editFile}
              monacoTheme={monacoTheme}
              saving={saving}
              C={C}
            />
          </div>
          <div
            onPointerDown={startResize}
            title="Drag to resize"
            style={{ height: 5, cursor: 'row-resize', background: C.border, flexShrink: 0 }}
          />
          <div style={{ height: bottomHeight, maxHeight: '65%', flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', background: C.canvasSurface || (C.dark ? '#1e293b' : '#ffffff') }}>
            <div style={{ display: 'flex', background: C.surface, borderBottom: `1px solid ${C.border}` }}>
              {[['terminal', 'Terminal'], ['output', 'Output']].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setBottomTab(key)}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '5px 12px', border: 'none', cursor: 'pointer',
                    background: 'transparent', color: bottomTab === key ? C.text : C.hint,
                    borderBottom: bottomTab === key ? `2px solid ${C.blue}` : '2px solid transparent',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', background: C.canvasSurface || (C.dark ? '#1e293b' : '#ffffff') }}>
              <TerminalPanel root={fs.root} projectKey={trackKey} visible={bottomTab === 'terminal'} C={C} />
              {bottomTab === 'output' && (
                <OutputPanel lines={output} running={running} onClear={() => setOutput([])} C={C} fill />
              )}
            </div>
          </div>
        </>} lesson={lessonPanel} />
    </div>
  );
}

function conflictBtn(C, primary) {
  return {
    fontSize: 11,
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: 5,
    cursor: 'pointer',
    border: primary ? 'none' : `1px solid ${C.border}`,
    background: primary ? C.amber : 'transparent',
    color: primary ? '#1a1a1a' : C.text,
  };
}

function ChooseFolder({ fs, C }) {
  return (
    <Centered C={C}>
      <h2 style={{ margin: '0 0 8px', fontSize: 18, color: C.text }}>Choose a project folder</h2>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: C.hint, lineHeight: 1.7, maxWidth: 520 }}>
        Each Project Studio track remembers its own folder. Pick a separate empty folder for a new project, or select this project's existing folder to resume. Everything you build here lives in
        that folder as ordinary files — you can open it in another editor, put it under git, and publish
        it whenever you want. It's your project, not app data.
        {fs.missing && (
          <><br /><br /><span style={{ color: C.amber }}>The folder you used last time isn't there any more: <code>{fs.missing}</code></span></>
        )}
      </p>
      <button
        onClick={fs.pick}
        style={{ fontSize: 13, fontWeight: 600, padding: '8px 18px', borderRadius: 7, border: 'none', background: C.teal, color: '#fff', cursor: 'pointer' }}
      >
        Choose folder…
      </button>
      {fs.error && <p role="alert" style={{ color: C.amber }}>{fs.error}</p>}
    </Centered>
  );
}

function Centered({ children, C }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', minHeight: 420, textAlign: 'center', padding: 24, background: C.bg,
    }}>
      {children}
    </div>
  );
}
