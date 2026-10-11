// NeovimPane.jsx
// The editor pane when Editor: Neovim is chosen: Neovim running in a real terminal over the same
// project files Monaco edits (desktop/app/runtimes/neovim.cjs). Choosing it installs Neovim
// first if this computer has none, with no further click; the learner's own Neovim is used when
// it is new enough.
//
// The rest of Project Studio keeps working unchanged. A file opened from the tree or by a step
// opens in Neovim (through the session's control channel, never as typed keys). Files Neovim
// writes reach the lab through its existing disk sync (index.jsx), so the step's status line
// still counts missing lines. `nvimEditor` lets the lab write Neovim's unsaved buffers before
// Run or Check, as Monaco's autosave would have, and reload files the lab changed on disk.
import { useEffect, useState } from 'react';
import { TerminalSession } from './TerminalPanel.jsx';

const desktop = () => (typeof window !== 'undefined' ? window.openCalcDesktop : null);

// The session the visible pane is showing, or null. One editor pane exists at a time.
let currentSession = null;

export const nvimEditor = {
  writeAll: () => (currentSession ? desktop()?.terminal?.nvim?.(currentSession, 'writeAll') : null),
  checktime: () => (currentSession ? desktop()?.terminal?.nvim?.(currentSession, 'checktime') : null),
};

const PHASE_TEXT = {
  'downloading-neovim': 'Downloading Neovim',
  'extracting-neovim': 'Unpacking Neovim',
};

export default function NeovimPane({ root, projectKey, activeFile, C }) {
  // checking → (installing →) ready, or error
  const [state, setState] = useState({ phase: 'checking' });
  const [attempt, setAttempt] = useState(0);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const d = desktop();
    if (!d?.getRuntimeStatus) { setState({ phase: 'error', error: 'Neovim needs the desktop app.' }); return undefined; }
    let cancelled = false;
    const off = d.onRuntimeProgress?.((evt) => {
      if (cancelled || evt.runtime !== 'neovim' || evt.phase === 'done' || evt.phase === 'error') return;
      setState({ phase: 'installing', text: PHASE_TEXT[evt.phase] ?? 'Installing Neovim', percent: evt.percent ?? 0 });
    });
    (async () => {
      setState({ phase: 'checking' });
      const res = await d.getRuntimeStatus('neovim');
      if (cancelled) return;
      if (!res?.ok) { setState({ phase: 'error', error: res?.reason ?? 'Restart the updated desktop app to enable Neovim.' }); return; }
      if (res.status.installed) { setState({ phase: 'ready', status: res.status }); return; }
      setState({ phase: 'installing', text: 'Downloading Neovim', percent: 0 });
      const installed = await d.installRuntime('neovim');
      if (cancelled) return;
      if (!installed?.ok) { setState({ phase: 'error', error: installed?.reason ?? 'The download failed.' }); return; }
      const after = await d.getRuntimeStatus('neovim');
      if (cancelled) return;
      setState(after?.ok && after.status.installed
        ? { phase: 'ready', status: after.status }
        : { phase: 'error', error: 'Neovim installed, but the app could not find it afterwards.' });
    })();
    return () => { cancelled = true; off?.(); };
  }, [attempt]);

  useEffect(() => {
    currentSession = session;
    return () => { if (currentSession === session) currentSession = null; };
  }, [session]);

  // Show the lab's active file in Neovim. The session opened the first one itself at start;
  // opening the file it already shows changes nothing. The keyboard follows (focusKey below), so
// a file clicked in the tree can be typed in straight away, as in Monaco.
  useEffect(() => {
    if (session && activeFile) desktop()?.terminal?.nvim?.(session, 'open', activeFile);
  }, [session, activeFile]);

  if (state.phase !== 'ready') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0c0c0c', color: '#cccccc', fontSize: 13 }}>
        <div style={{ maxWidth: 420, padding: 20, lineHeight: 1.5 }}>
          {state.phase === 'checking' && 'Looking for Neovim…'}
          {state.phase === 'installing' && (
            <>
              <div style={{ marginBottom: 8 }}>{state.text}… {state.percent}%</div>
              <div style={{ height: 4, background: '#333', borderRadius: 2 }}>
                <div style={{ height: 4, width: `${state.percent}%`, background: C.blue, borderRadius: 2, transition: 'width 0.2s' }} />
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>
                One download of about 10 MB, kept inside the app. Nothing else on this computer changes.
              </div>
            </>
          )}
          {state.phase === 'error' && (
            <>
              <div style={{ color: C.amber, marginBottom: 10 }}>Neovim couldn't be set up: {state.error}</div>
              <button onClick={() => setAttempt((a) => a + 1)} style={{ fontSize: 12, padding: '4px 10px', cursor: 'pointer' }}>Try again</button>
              <span style={{ marginLeft: 10, fontSize: 11, color: '#888' }}>or switch the editor back to Monaco.</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: '100%', background: '#0c0c0c' }}>
      <TerminalSession
        root={root}
        projectKey={projectKey}
        visible
        startOpts={{ editor: 'nvim', file: activeFile }}
        onSession={setSession}
        endedText={() => 'Neovim has closed. Press Restart to open it again, or switch the editor to Monaco.'}
        restartTitle="Start Neovim again on the open file"
        showClear={false}
        focusKey={activeFile}
        C={C}
      />
    </div>
  );
}
