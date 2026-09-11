// Project Studio — an IDE-shaped lab for building a real, multi-file
// project one small step at a time.
//
// Unlike the notebook components (PySideNotebook and friends), nothing
// here is ephemeral: files live in a folder the learner picked, code runs
// from that folder (so cross-file imports resolve), and the project
// outlives the app. That's what makes it possible to build something
// worth open-sourcing rather than a throwaway snippet.
//
// Desktop-only by necessity — it needs real filesystem and real process
// access. In a browser tab it explains that instead of breaking.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useGlobalTheme } from '../../context/ThemeContext.jsx';
import { useProjectFs } from './useProjectFs.js';
import { TRACKS, TRACK_KEYS } from './trackLoader.js';
import FileTree from './FileTree.jsx';
import EditorPane from './EditorPane.jsx';
import LessonPanel from './LessonPanel.jsx';
import OutputPanel from './OutputPanel.jsx';

const SAVE_DEBOUNCE_MS = 400;

export default function ProjectStudio() {
  const C = useThemeColors();
  const { themeStyles } = useGlobalTheme();
  const monacoTheme = themeStyles?.monaco || (C.dark ? 'open-calc-dark' : 'open-calc-light');
  const fs = useProjectFs();

  const [trackKey, setTrackKey] = useState(TRACK_KEYS[0] ?? null);
  const lessons = useMemo(() => (trackKey ? TRACKS[trackKey] ?? [] : []), [trackKey]);
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? null);
  const lesson = useMemo(() => lessons.find((l) => l.id === lessonId) ?? lessons[0], [lessons, lessonId]);
  const [stepIndex, setStepIndex] = useState(0);
  const step = lesson?.steps?.[stepIndex] ?? null;

  const [openFiles, setOpenFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [buffers, setBuffers] = useState({}); // rel -> content in the editor
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(null);

  // What each open file looked like on disk when we last read or wrote it.
  // These are the learner's real project files and they're explicitly meant
  // to be opened in other editors too, so an in-memory buffer must never be
  // treated as authoritative — without this, an untouched stale buffer
  // silently overwrites whatever changed on disk underneath it.
  const loadedRef = useRef({});

  const [output, setOutput] = useState([]);
  const [running, setRunning] = useState(false);
  const runIdRef = useRef(null);
  const saveTimers = useRef({});

  // ── open / edit / save ───────────────────────────────────────────────────
  const openFile = useCallback(async (rel) => {
    setOpenFiles((prev) => (prev.includes(rel) ? prev : [...prev, rel]));
    setActiveFile(rel);
    if (buffers[rel] === undefined) {
      const content = await fs.readFile(rel);
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
    saveTimers.current[activeFile] = setTimeout(async () => {
      // Re-check disk before writing. If it no longer matches what we loaded,
      // something outside the lab changed it, and blindly writing our buffer
      // would destroy that work.
      const onDisk = await fs.readFile(activeFile);
      if (onDisk !== loadedRef.current[activeFile] && onDisk !== content) {
        setConflict(activeFile);
        setSaving(false);
        return;
      }
      await fs.writeFile(activeFile, content);
      loadedRef.current[activeFile] = content;
      setSaving(false);
    }, SAVE_DEBOUNCE_MS);
  }, [activeFile, fs]);

  // Discard our buffer and take whatever is on disk now.
  const reloadFromDisk = useCallback(async (rel) => {
    clearTimeout(saveTimers.current[rel]);
    const content = await fs.readFile(rel);
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

  // When a step names a file, open it — creating it empty if it doesn't
  // exist yet. This is how new files and folders enter the project: a step
  // simply refers to a path that isn't there yet.
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

  // ── run ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!fs.available) return;
    const unsub = window.openCalcDesktop.onScriptOutput((evt) => {
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
    // Flush a pending debounced save first, or we'd run stale bytes — but
    // only for a file actually edited here. An untouched buffer has nothing
    // to contribute and may be older than what's on disk, so writing it back
    // can only lose work. Untouched files get re-read instead, so a run
    // always executes the current bytes.
    if (activeFile && buffers[activeFile] !== undefined) {
      clearTimeout(saveTimers.current[activeFile]);
      if (buffers[activeFile] !== loadedRef.current[activeFile]) {
        const onDisk = await fs.readFile(activeFile);
        if (onDisk !== loadedRef.current[activeFile] && onDisk !== buffers[activeFile]) {
          setConflict(activeFile);
          setSaving(false);
          return;
        }
        await fs.writeFile(activeFile, buffers[activeFile]);
        loadedRef.current[activeFile] = buffers[activeFile];
      } else {
        await reloadFromDisk(activeFile);
      }
      setSaving(false);
    }

    const target = lesson.run || step?.file;
    if (!target) return;

    setOutput([]);
    setRunning(true);
    const res = await fs.run(lesson.runtime || 'python', target);
    if (!res.ok) {
      setOutput([{ stream: 'stderr', text: res.reason || 'Failed to run.' }]);
      setRunning(false);
      return;
    }
    runIdRef.current = res.runId;
  }, [lesson, step, activeFile, buffers, fs, reloadFromDisk]);

  // ── new file / folder / delete ───────────────────────────────────────────
  const newFile = useCallback(async () => {
    const rel = window.prompt('New file (path relative to the project root):');
    if (!rel) return;
    await fs.writeFile(rel, '');
    await fs.refresh();
    openFile(rel);
  }, [fs, openFile]);

  const newFolder = useCallback(async () => {
    const rel = window.prompt('New folder (path relative to the project root):');
    if (!rel) return;
    await fs.mkdir(rel);
  }, [fs]);

  const deleteEntry = useCallback(async (rel) => {
    if (!window.confirm(`Delete ${rel}? This removes it from disk.`)) return;
    await fs.remove(rel);
    setOpenFiles((prev) => prev.filter((f) => f !== rel));
    setBuffers((prev) => { const next = { ...prev }; delete next[rel]; return next; });
    setActiveFile((cur) => (cur === rel ? null : cur));
  }, [fs]);

  // ── non-desktop / no-project states ──────────────────────────────────────
  if (!fs.available) {
    return (
      <Centered C={C}>
        <h2 style={{ margin: '0 0 8px', fontSize: 18, color: C.text }}>🖥️ Project Studio needs the desktop app</h2>
        <p style={{ margin: 0, fontSize: 13, color: C.hint, lineHeight: 1.7, maxWidth: 520 }}>
          This lab reads and writes real files in a folder on your computer and runs them with a real
          interpreter — neither of which a browser tab is allowed to do. Open it in the OpenCalc desktop
          app (<code>npm run desktop:dev</code>) to use it.
        </p>
      </Centered>
    );
  }

  if (!fs.root) {
    return (
      <Centered C={C}>
        <h2 style={{ margin: '0 0 8px', fontSize: 18, color: C.text }}>Choose a project folder</h2>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: C.hint, lineHeight: 1.7, maxWidth: 520 }}>
          Pick (or create) an empty folder anywhere on your machine. Everything you build here lives in
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
      </Centered>
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
        {TRACK_KEYS.length > 1 && (
          <select
            value={trackKey}
            onChange={(e) => { setTrackKey(e.target.value); setLessonId(TRACKS[e.target.value][0]?.id); setStepIndex(0); }}
            style={{ fontSize: 11, padding: '3px 6px', borderRadius: 5, background: C.surface2, color: C.text, border: `1px solid ${C.border}` }}
          >
            {TRACK_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={runProject}
          disabled={running}
          style={{
            fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 6, border: 'none',
            background: C.teal, color: '#fff', cursor: running ? 'default' : 'pointer', opacity: running ? 0.5 : 1,
          }}
        >
          {running ? 'Running…' : `▶ Run ${lesson?.run || step?.file || ''}`}
        </button>
      </div>

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

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ width: 210, flexShrink: 0, borderRight: `1px solid ${C.border}`, background: C.surface }}>
          <FileTree
            entries={fs.entries}
            root={fs.root}
            activeFile={activeFile}
            onOpen={openFile}
            onDelete={deleteEntry}
            onNewFile={newFile}
            onNewFolder={newFolder}
            onPick={fs.pick}
            C={C}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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
          <OutputPanel lines={output} running={running} onClear={() => setOutput([])} C={C} />
        </div>

        {lesson && step && (
          <div style={{ width: 420, flexShrink: 0, borderLeft: `1px solid ${C.border}` }}>
            <LessonPanel
              lesson={lesson}
              lessons={lessons}
              stepIndex={stepIndex}
              step={step}
              currentContent={step.file ? (buffers[step.file] ?? '') : ''}
              onPrev={() => setStepIndex((i) => Math.max(0, i - 1))}
              onNext={() => setStepIndex((i) => Math.min(lesson.steps.length - 1, i + 1))}
              onSelectLesson={(id) => { setLessonId(id); setStepIndex(0); }}
              C={C}
            />
          </div>
        )}
      </div>
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
