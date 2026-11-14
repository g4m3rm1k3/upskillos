// FileTree.jsx
// Real project files, from project:tree. Structurally this follows
// FullPageIDE.jsx's FileTreeNode/FileExplorer (src/tools/js-playground),
// but that one renders an in-memory Record<path,string> with no
// persistence — this renders actual directory entries off disk, so it
// carries folders, nesting, and create/delete against real paths.
import { useEffect, useState } from 'react';

function Node({ node, depth, activeFile, onOpen, onDelete, onRename, C }) {
  const [open, setOpen] = useState(depth < 2);
  const isActive = node.type === 'file' && node.rel === activeFile;

  const row = (label, onClick, extra) => (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 8px',
        paddingLeft: 8 + depth * 12,
        fontSize: 12,
        cursor: 'pointer',
        color: isActive ? '#fff' : C.text,
        background: isActive ? C.blue : 'transparent',
        borderRadius: 4,
        userSelect: 'none',
      }}
      className="group"
    >
      {label}
      {extra}
    </div>
  );

  if (node.type === 'dir') {
    return (
      <div>
        {row(
          <>
            <span style={{ color: C.hint, fontSize: 10, width: 10 }}>{open ? '▾' : '▸'}</span>
            <span style={{ color: C.amber ?? C.hint }}>📁</span>
            <span style={{ flex: 1 }}>{node.name}</span>
          </>,
          () => setOpen((o) => !o),
        )}
        {open && node.children?.map((child) => (
          <Node key={child.rel} node={child} depth={depth + 1} activeFile={activeFile} onOpen={onOpen} onDelete={onDelete} onRename={onRename} C={C} />
        ))}
      </div>
    );
  }

  return row(
    <>
      <span style={{ width: 10 }} />
      <span style={{ opacity: 0.8 }}>📄</span>
      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</span>
      <button onClick={event => { event.stopPropagation(); onRename(node.rel); }} title={`Rename ${node.name}`} aria-label={`Rename ${node.name}`} style={{ border: 'none', background: 'transparent', color: isActive ? '#fff' : C.text, cursor: 'pointer', fontSize: 11 }}>Rename</button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(node.rel); }}
        title={`Delete ${node.name}`}
        aria-label={`Delete ${node.name}`}
        style={{
          border: 'none', background: 'transparent', cursor: 'pointer',
          color: isActive ? '#fff' : C.hint, fontSize: 11, padding: '0 2px', opacity: 0.5,
        }}
      >
        ✕
      </button>
    </>,
    () => onOpen(node.rel),
  );
}

export default function FileTree({ entries, root, activeFile, onOpen, onDelete, onRename, onNewFile, onNewFolder, onPick, C }) {
  const [creating, setCreating] = useState(null);
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [renameFrom, setRenameFrom] = useState(null);
  useEffect(() => { setCreating(null); setName(''); setError(null); }, [root]);
  const begin = kind => { setCreating(kind); setName(''); setError(null); };
  const beginRename = rel => { if (busy) return; setRenameFrom(rel); setCreating('rename'); setName(rel); setError(null); };
  // Deleting asks here, in the page, not with window.confirm: after a native dialog closes,
  // Electron can leave text fields and terminals ignoring the keyboard until the window loses
  // and regains focus, which looks like the whole app freezing.
  const beginDelete = rel => { if (busy) return; setRenameFrom(rel); setCreating('delete'); setName(rel); setError(null); };
  const submit = async event => {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      const result = creating === 'delete' ? await onDelete(renameFrom)
        : creating === 'rename' ? await onRename(renameFrom, name.trim())
          : await (creating === 'file' ? onNewFile : onNewFolder)(name.trim());
      if (!result?.ok) throw new Error(result?.reason || 'Could not create the item.');
      setCreating(null); setName('');
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div
        style={{
          padding: '6px 8px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, flex: 1 }}>
          Explorer
        </span>
        <button onClick={() => begin('file')} disabled={!root || busy} title="New file" aria-label="New file" style={iconBtn(C)}>＋</button>
        <button onClick={() => begin('folder')} disabled={!root || busy} title="New folder" aria-label="New folder" style={iconBtn(C)}>📁</button>
      </div>

      {creating === 'delete' && (
        <form onSubmit={submit} style={{ padding: 8, borderBottom: `1px solid ${C.border}` }}>
          <p style={{ margin: 0, fontSize: 12, color: C.text }}>Delete <code>{renameFrom}</code>? This removes it from disk.</p>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button type="submit" autoFocus disabled={busy} style={{ padding: '4px 8px', borderRadius: 4, border: `1px solid ${C.border}`, background: C.surface2, color: C.text }}>{busy ? 'Working…' : 'Delete'}</button>
            <button type="button" disabled={busy} onClick={() => setCreating(null)} onKeyDown={event => { if (event.key === 'Escape') setCreating(null); }} style={{ padding: '4px 8px', borderRadius: 4, border: `1px solid ${C.border}`, background: C.surface2, color: C.text }}>Cancel</button>
          </div>
          {error && <p role="alert" style={{ fontSize: 12, color: C.amber }}>{error}</p>}
        </form>
      )}

      {creating && creating !== 'delete' && (
        <form onSubmit={submit} style={{ padding: 8, borderBottom: `1px solid ${C.border}` }}>
          <label style={{ display: 'block', fontSize: 12, color: C.text }}>
            {creating === 'rename' ? `Rename ${renameFrom}` : creating === 'file' ? 'New file name' : 'New folder name'}
            <input autoFocus value={name} disabled={busy} onChange={event => setName(event.target.value)}
              onKeyDown={event => { if (event.key === 'Escape' && !busy) setCreating(null); }}
              placeholder={creating === 'file' ? 'main.cpp or src/player.cpp' : 'src'}
              style={{ width: '100%', boxSizing: 'border-box', marginTop: 4, padding: 6, borderRadius: 4, background: C.surface2, color: C.text, border: `1px solid ${C.border}` }} />
          </label>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button type="submit" disabled={busy || !name.trim()} style={{ padding: '4px 8px', borderRadius: 4, border: `1px solid ${C.border}`, background: C.surface2, color: C.text }}>{busy ? 'Working…' : creating === 'rename' ? 'Rename' : 'Create'}</button>
            <button type="button" disabled={busy} onClick={() => setCreating(null)} style={{ padding: '4px 8px', borderRadius: 4, border: `1px solid ${C.border}`, background: C.surface2, color: C.text }}>Cancel</button>
          </div>
          {error && <p role="alert" style={{ fontSize: 12, color: C.amber }}>{error}</p>}
        </form>
      )}

      <div
        onClick={onPick}
        title={root || 'Choose a project folder'}
        style={{
          padding: '4px 8px',
          fontSize: 10,
          fontFamily: 'monospace',
          color: C.hint,
          borderBottom: `1px solid ${C.border}`,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          direction: 'rtl', // keep the deepest folder visible when it's too long
          textAlign: 'left',
        }}
      >
        {root || 'Choose a folder…'}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 4 }}>
        {entries.length === 0 && (
          <p style={{ fontSize: 11, color: C.hint, padding: 8, lineHeight: 1.6 }}>
            {root ? 'Empty project. The first step will create its file for you, or use ＋ above.' : 'No folder selected for this chapter. Choose its project folder to see your files.'}
          </p>
        )}
        {entries.map((node) => (
          <Node key={node.rel} node={node} depth={0} activeFile={activeFile} onOpen={onOpen} onDelete={beginDelete} onRename={beginRename} C={C} />
        ))}
      </div>
    </div>
  );
}

function iconBtn(C) {
  return {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: C.hint,
    fontSize: 12,
    padding: '0 3px',
  };
}
