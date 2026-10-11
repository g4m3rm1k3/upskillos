import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Keep children mounted when closed: terminal processes and scrollback survive.
export default function WorkspaceOutputDialog({ open, onClose, children, title = 'Terminal & output' }) {
  const dialog = useRef(null);
  useEffect(() => {
    if (open && !dialog.current.open) dialog.current.showModal();
    if (!open && dialog.current.open) dialog.current.close();
  }, [open]);
  return createPortal(
    <dialog ref={dialog} aria-label={title} onCancel={onClose} onClose={onClose}
      className="rounded-xl border border-slate-600 bg-slate-950 text-slate-100 p-0 backdrop:bg-black/60"
      style={{ width: 'min(1100px, 94vw)', height: 'min(760px, 85vh)', maxWidth: '94vw', maxHeight: '85vh' }}>
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex items-center justify-between gap-4 px-4 py-3 border-b border-slate-700">
          <span className="font-semibold text-sm">{title}</span>
          <button autoFocus onClick={onClose} className="rounded px-3 py-1 bg-slate-800 text-sm" aria-label="Close output">Close · Esc</button>
        </header>
        <div className="flex-1 min-h-0 flex flex-col">{children}</div>
      </div>
    </dialog>, document.body,
  );
}
