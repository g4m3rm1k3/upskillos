// FileTree.jsx
// Real project files, from project:tree. Structurally this follows
// FullPageIDE.jsx's FileTreeNode/FileExplorer (src/tools/js-playground),
// but that one renders an in-memory Record<path,string> with no
// persistence — this renders actual directory entries off disk, so it
// carries folders, nesting, and create/delete against real paths.
import { useState } from 'react';

function Node({ node, depth, activeFile, onOpen, onDelete, C }) {
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
          <Node key={child.rel} node={child} depth={depth + 1} activeFile={activeFile} onOpen={onOpen} onDelete={onDelete} C={C} />
        ))}
      </div>
    );
  }

  return row(
    <>
      <span style={{ width: 10 }} />
      <span style={{ opacity: 0.8 }}>📄</span>
      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(node.rel); }}
        title={`Delete ${node.name}`}
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

export default function FileTree({ entries, root, activeFile, onOpen, onDelete, onNewFile, onNewFolder, onPick, C }) {
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
        <button onClick={onNewFile} title="New file" style={iconBtn(C)}>＋</button>
        <button onClick={onNewFolder} title="New folder" style={iconBtn(C)}>📁</button>
      </div>

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
            Empty project. The first step will create its file for you, or use ＋ above.
          </p>
        )}
        {entries.map((node) => (
          <Node key={node.rel} node={node} depth={0} activeFile={activeFile} onOpen={onOpen} onDelete={onDelete} C={C} />
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
