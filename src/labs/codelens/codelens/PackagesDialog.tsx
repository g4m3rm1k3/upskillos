// The Packages menu (desktop app): what is installed in CodeLens's Python environment, and
// installing, changing the version of, or removing a package. CodeLens installs the common
// packages a program imports by itself (desktop/app/runtimes/codelens-python.cjs); this is
// for everything else, and for choosing versions.
import { useCallback, useEffect, useState } from 'react'
import { Package, RefreshCw, Trash2, X } from 'lucide-react'
import { useCodeLensTheme } from './ThemeContext'
import { runInCodeLensPython, type CodeLensPythonStatus } from './interpreter/codelensPythonEnv'

interface Installed { name: string; version: string }

export default function PackagesDialog({ status, onClose }: { status: CodeLensPythonStatus; onClose: () => void }) {
  const { theme: { ui } } = useCodeLensTheme()
  const [packages, setPackages] = useState<Installed[] | null>(null)
  const [requirement, setRequirement] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [filter, setFilter] = useState('')

  const refresh = useCallback(async () => {
    setBusy('Reading the installed packages…')
    const run = await runInCodeLensPython({ action: 'list' }, setBusy).promise
    setBusy(null)
    try {
      setPackages(JSON.parse(run?.stdout || '[]'))
    } catch {
      setMessage({ text: run?.stderr || 'Could not read the installed packages.', error: true })
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const change = async (request: { action: 'install'; requirement: string } | { action: 'uninstall'; name: string }, done: string) => {
    setMessage(null)
    setBusy(request.action === 'install' ? `Installing ${request.requirement}…` : `Removing ${request.name}…`)
    const run = await runInCodeLensPython(request, line => setBusy(line.length > 100 ? `${line.slice(0, 99)}…` : line)).promise
    setBusy(null)
    if (run?.code === 0) {
      setMessage({ text: done, error: false })
      if (request.action === 'install') setRequirement('')
    } else {
      setMessage({ text: run?.stderr.trim() || 'pip failed.', error: true })
    }
    refresh()
  }

  const shown = (packages ?? []).filter(p => !filter || p.name.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div role="dialog" aria-modal="true" aria-label="Python packages" style={{ position: 'fixed', inset: 0, zIndex: 60, background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: 'min(640px, 100%)', maxHeight: '85vh', display: 'flex', flexDirection: 'column', background: ui.panelBg, border: `1px solid ${ui.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: ui.headerBg, borderBottom: `1px solid ${ui.border}` }}>
          <Package size={15} color={ui.accent} />
          <span style={{ fontWeight: 600, fontSize: 14, color: ui.text }}>Python packages</span>
          <button onClick={onClose} aria-label="Close" style={{ marginLeft: 'auto', background: 'none', border: 'none', color: ui.textMuted, cursor: 'pointer' }}><X size={16} /></button>
        </div>
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
          <p style={{ margin: 0, fontSize: 12, color: ui.textMuted, lineHeight: 1.5 }}>
            CodeLens traces Python in its own environment{status.base ? `, made from your Python ${status.base.version}` : ''}, so
            nothing here changes your own installation. Common packages (pygame, numpy, pandas, matplotlib…) are installed
            the first time a program imports them. Install anything else here by its name on PyPI, which can differ from the
            name you import (<code>import cv2</code> is <code>opencv-python</code>), and add <code>==version</code> to choose a version.
          </p>
          <form
            onSubmit={e => { e.preventDefault(); if (requirement.trim() && !busy) change({ action: 'install', requirement: requirement.trim() }, `Installed ${requirement.trim()}.`) }}
            style={{ display: 'flex', gap: 8 }}
          >
            <input
              value={requirement}
              onChange={e => setRequirement(e.target.value)}
              placeholder="pygame-ce, or numpy==2.2.5"
              aria-label="Package to install"
              spellCheck={false}
              style={{ flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, background: ui.bg, color: ui.text, border: `1px solid ${ui.border}`, borderRadius: 6, padding: '6px 8px' }}
            />
            <button type="submit" disabled={!requirement.trim() || !!busy} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: busy ? 'default' : 'pointer', background: ui.accentSolid, color: '#fff', opacity: !requirement.trim() || busy ? 0.5 : 1 }}>
              Install
            </button>
          </form>
          {busy && <div role="status" style={{ fontSize: 12, color: ui.amberSoft }}>{busy}</div>}
          {message && <div role={message.error ? 'alert' : 'status'} style={{ fontSize: 12, color: message.error ? ui.redSoft : ui.green, whiteSpace: 'pre-wrap' }}>{message.text}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: ui.text }}>Installed{packages ? ` (${packages.length})` : ''}</span>
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter" aria-label="Filter installed packages"
              style={{ marginLeft: 'auto', width: 140, fontSize: 12, background: ui.bg, color: ui.text, border: `1px solid ${ui.border}`, borderRadius: 6, padding: '4px 8px' }} />
            <button onClick={refresh} disabled={!!busy} title="Read the list again" aria-label="Refresh" style={{ background: 'none', border: 'none', color: ui.textMuted, cursor: 'pointer' }}><RefreshCw size={14} /></button>
          </div>
          <div style={{ overflow: 'auto', minHeight: 80, border: `1px solid ${ui.border}`, borderRadius: 8 }}>
            {shown.map(p => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderBottom: `1px solid ${ui.border}`, fontSize: 12 }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: ui.text }}>{p.name}</span>
                <button
                  onClick={() => setRequirement(`${p.name}==${p.version}`)}
                  title="Edit this version above, then Install"
                  style={{ fontFamily: 'JetBrains Mono, monospace', color: ui.cyan, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {p.version}
                </button>
                {p.name !== 'pip' && (
                  <button
                    onClick={() => change({ action: 'uninstall', name: p.name }, `Removed ${p.name}.`)}
                    disabled={!!busy}
                    aria-label={`Remove ${p.name}`}
                    title={`Remove ${p.name}`}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: ui.textMuted, cursor: busy ? 'default' : 'pointer' }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
            {packages && shown.length === 0 && <div style={{ padding: 10, fontSize: 12, color: ui.textFaint }}>Nothing{filter ? ' matches' : ' installed yet'}.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
