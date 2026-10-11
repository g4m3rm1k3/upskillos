// TerminalPanel.jsx
// The learner's real shell, running in the project folder (desktop/app/terminal.cjs), drawn
// with xterm.js. Several can be open at once, as tabs: a dev server keeps one terminal busy,
// and Git commands need another. Each shell is restarted whenever the project folder
// changes, so its starting directory is always the project.
//
// On Windows each tab can be PowerShell or a Linux shell in a WSL distro (desktop/app/
// runtimes/wsl.cjs). A new tab opens the shell last chosen for this project.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const api = () => (typeof window !== 'undefined' ? window.openCalcDesktop?.terminal : null);

// The shell last chosen for a project, kept in this browser only. 'powershell' (or nothing) is
// the platform's own shell.
const shellKey = (projectKey) => `project-studio:terminal-shell:${projectKey ?? ''}`;
function savedShell(projectKey) {
  try { return localStorage.getItem(shellKey(projectKey)) || null; } catch { return null; }
}
function saveShell(projectKey, id) {
  try { localStorage.setItem(shellKey(projectKey), id); } catch {}
}

let nextKey = 1;

export default function TerminalPanel({ root, projectKey, visible, C }) {
  const [tabs, setTabs] = useState(() => [{ key: nextKey++, label: 'Terminal 1', status: 'starting', shellId: savedShell(projectKey) }]);
  const [active, setActive] = useState(tabs[0].key);
  // { shells: [{ id, label }], wsl }: what this computer can open (empty off Windows).
  const [choices, setChoices] = useState({ shells: [], wsl: null });

  useEffect(() => {
    let cancelled = false;
    api()?.shells?.().then((res) => { if (!cancelled && res) setChoices(res); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const addTab = useCallback(() => {
    const key = nextKey++;
    setTabs((prev) => [...prev, { key, label: `Terminal ${prev.length + 1}`, status: 'starting', shellId: savedShell(projectKey) }]);
    setActive(key);
  }, [projectKey]);

  // Switching the shell restarts that tab's terminal with the new one.
  const chooseShell = useCallback((key, shellId) => {
    saveShell(projectKey, shellId);
    setTabs((prev) => prev.map((t) => (t.key === key ? { ...t, shellId } : t)));
  }, [projectKey]);

  const closeTab = useCallback((key) => {
    setTabs((prev) => {
      if (prev.length === 1) return prev;
      const next = prev.filter((t) => t.key !== key);
      setActive((cur) => (cur === key ? next[next.length - 1].key : cur));
      return next;
    });
  }, []);

  const setStatus = useCallback((key, status, shell) => {
    setTabs((prev) => prev.map((t) => (t.key === key ? { ...t, status, shell: shell ?? t.shell } : t)));
  }, []);

  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div style={{ display: visible ? 'flex' : 'none', flexDirection: 'column', height: '100%', minHeight: 0, background: '#0c0c0c' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', fontSize: 11, color: C.hint, background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
        {tabs.map((t) => (
          <span
            key={t.key}
            onClick={() => setActive(t.key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
              background: t.key === active ? C.surface : 'transparent', color: t.key === active ? C.text : C.hint,
            }}
          >
            {t.label}
            {tabs.length > 1 && (
              <span
                role="button"
                aria-label={`Close ${t.label}`}
                title="Close this terminal (stops whatever is running in it)"
                onClick={(e) => { e.stopPropagation(); closeTab(t.key); }}
                style={{ opacity: 0.7 }}
              >
                ×
              </span>
            )}
          </span>
        ))}
        <button onClick={addTab} style={smallBtn(C)} title="Open another terminal in the project folder" aria-label="New terminal">+</button>
        <div style={{ flex: 1 }} />
        {choices.shells.length > 1 && (
          <select
            aria-label="Shell"
            title="The shell this terminal runs. Changing it restarts this terminal."
            value={activeTab?.shellId && choices.shells.some((s) => s.id === activeTab.shellId) ? activeTab.shellId : 'powershell'}
            onChange={(e) => chooseShell(activeTab.key, e.target.value)}
            style={{ ...smallBtn(C), background: C.surface }}
          >
            {choices.shells.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        )}
        {choices.wsl && !choices.wsl.installed && (
          <button
            onClick={() => window.openCalcDesktop?.openExternal?.(choices.wsl.installUrl)}
            style={smallBtn(C)}
            title="WSL runs Linux inside Windows, for lessons written for bash. Opens Microsoft's install instructions."
          >
            Linux (WSL): not installed
          </button>
        )}
        <span style={{ marginRight: 6 }}>{statusText(activeTab)}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {tabs.map((t) => (
          <TerminalSession
            key={t.key}
            root={root} projectKey={projectKey}
            visible={visible && t.key === active}
            startOpts={t.shellId?.startsWith('wsl:') ? { shell: t.shellId } : undefined}
            onStatus={(status, shell) => setStatus(t.key, status, shell)}
            C={C}
          />
        ))}
      </div>
    </div>
  );
}

function statusText(tab) {
  if (!tab) return '';
  if (tab.status === 'running' && tab.shell) return `${shellName(tab.shell)} in your project folder`;
  if (tab.status === 'starting') return 'Starting the shell…';
  if (tab.status === 'exited') return 'The shell has ended';
  return 'The terminal is unavailable';
}

// One shell and its screen. Kept mounted while its tab is hidden, so a running program (a dev
// server) keeps running and its output is still there when you switch back.
//
// The Neovim editor pane (NeovimPane.jsx) reuses it with `startOpts` ({ editor: 'nvim', file },
// read when a session starts), `onSession` (told the session id, or null when it ends) and
// `endedText` (the line shown when the program exits); `showClear` hides Clear, which means
// nothing to a full-screen program; a change of `focusKey` moves the keyboard to the terminal.
export function TerminalSession({ root, projectKey, visible, onStatus, startOpts, onSession, endedText, restartTitle, showClear = true, focusKey, C }) {
  const hostRef = useRef(null);
  const termRef = useRef(null);
  const fitRef = useRef(null);
  const idRef = useRef(null);
  const [error, setError] = useState(null);
  const [generation, setGeneration] = useState(0);
  const onStatusRef = useRef(onStatus ?? (() => {}));
  onStatusRef.current = onStatus ?? (() => {});
  const onSessionRef = useRef(onSession);
  onSessionRef.current = onSession;
  const startOptsRef = useRef(startOpts);
  startOptsRef.current = startOpts;
  const endedTextRef = useRef(endedText);
  endedTextRef.current = endedText;

  useEffect(() => {
    const term = new Terminal({
      fontFamily: 'Cascadia Mono, Consolas, Menlo, monospace',
      fontSize: 13,
      cursorBlink: true,
      scrollback: 5000,
      theme: { background: '#0c0c0c', foreground: '#cccccc' },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);
    termRef.current = term;
    fitRef.current = fit;
    const sub = term.onData((data) => { if (idRef.current) api()?.write(idRef.current, data); });
    const resizeSub = term.onResize(({ cols, rows }) => { if (idRef.current) api()?.resize(idRef.current, cols, rows); });
    return () => {
      sub.dispose();
      resizeSub.dispose();
      term.dispose();
      termRef.current = null;
    };
  }, []);

  useEffect(() => {
    const t = api();
    if (!t) return undefined;
    const offData = t.onData(({ id, data }) => { if (id === idRef.current) termRef.current?.write(data); });
    const offExit = t.onExit(({ id, code }) => {
      if (id !== idRef.current) return;
      idRef.current = null;
      onSessionRef.current?.(null);
      onStatusRef.current('exited');
      const text = endedTextRef.current?.(code) ?? `The shell ended with exit code ${code}. Press Restart to open a new one.`;
      termRef.current?.write(`\r\n\x1b[90m[${text}]\x1b[0m\r\n`);
    });
    return () => { offData(); offExit(); };
  }, []);

  // Start a shell for this project folder (again whenever the folder or `generation` changes).
  useEffect(() => {
    const t = api();
    if (!t || !root || !termRef.current) return undefined;
    let cancelled = false;
    const term = termRef.current;
    term.reset();
    onStatusRef.current('starting');
    setError(null);
    try { fitRef.current?.fit(); } catch {}
    t.start({ ...startOptsRef.current, cols: term.cols, rows: term.rows, projectKey }).then((res) => {
      if (cancelled) {
        if (res.ok) t.kill(res.id);
        return;
      }
      if (!res.ok) {
        onStatusRef.current('error');
        setError(res.reason);
        return;
      }
      idRef.current = res.id;
      onSessionRef.current?.(res.id);
      onStatusRef.current('running', res.shell);
    });
    return () => {
      cancelled = true;
      if (idRef.current) t.kill(idRef.current);
      idRef.current = null;
      onSessionRef.current?.(null);
    };
    // A change of shell (the Shell selector) restarts the session, like a change of folder.
  }, [root, projectKey, generation, startOpts?.shell]);

  useEffect(() => {
    if (!hostRef.current) return undefined;
    const ro = new ResizeObserver(() => {
      if (!visible) return;
      try { fitRef.current?.fit(); } catch {}
    });
    ro.observe(hostRef.current);
    return () => ro.disconnect();
  }, [visible]);

  useEffect(() => {
    if (visible && focusKey != null) termRef.current?.focus();
  }, [focusKey]);

  useEffect(() => {
    if (visible) {
      requestAnimationFrame(() => {
        try { fitRef.current?.fit(); } catch {}
        termRef.current?.focus();
      });
    }
  }, [visible]);

  return (
    <div style={{ position: 'absolute', inset: 0, display: visible ? 'flex' : 'none', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, padding: '3px 8px 0' }}>
        {showClear && <button onClick={() => termRef.current?.clear()} style={smallBtn(C)} title="Clear the screen (the shell keeps running)">Clear</button>}
        <button onClick={() => setGeneration((g) => g + 1)} style={smallBtn(C)} title={restartTitle ?? 'Close this shell and open a new one in the project folder'}>Restart</button>
      </div>
      {error && <div style={{ padding: '8px 12px', fontSize: 12, color: C.amber }}>{error}</div>}
      <div ref={hostRef} style={{ flex: 1, minHeight: 0, padding: '2px 0 0 6px' }} />
    </div>
  );
}

function shellName(file) {
  const base = String(file).split(/[\\/]/).pop().replace(/\.exe$/i, '');
  if (base.toLowerCase() === 'powershell') return 'Windows PowerShell';
  if (base.toLowerCase() === 'pwsh') return 'PowerShell';
  return base;
}

function smallBtn(C) {
  return {
    fontSize: 11, padding: '1px 8px', borderRadius: 4, cursor: 'pointer',
    border: `1px solid ${C.border}`, background: 'transparent', color: C.text,
  };
}
