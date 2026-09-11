// EditorPane.jsx
// Tab strip + Monaco over the learner's REAL files. This buffer is theirs
// alone — it's never pre-filled with the step's answer, and it carries no
// diff decorations (the diff is shown against the target over in the
// lesson panel, see DiffBlock.jsx; marking this buffer with target line
// numbers would highlight the wrong lines).
//
// What it does add is a status line for the active step's file: how many
// lines are still missing, or ✓ when the file matches.
import Editor from '@monaco-editor/react';
import { setupOpenCalcMonaco } from '../../utils/monacoThemes.js';
import { addedLineNumbers, matchesTarget } from './lineDiff.js';

const LANG_BY_EXT = {
  py: 'python', js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  json: 'json', md: 'markdown', css: 'css', html: 'html', lisp: 'scheme', java: 'java', cs: 'csharp',
  cpp: 'cpp', c: 'c', h: 'cpp', toml: 'ini', ini: 'ini', txt: 'plaintext',
};

function languageFor(rel) {
  const ext = (rel || '').split('.').pop()?.toLowerCase();
  return LANG_BY_EXT[ext] || 'plaintext';
}

export default function EditorPane({
  openFiles, activeFile, content, onSelect, onClose, onChange,
  targetContent, monacoTheme, saving, C,
}) {
  const tracked = targetContent != null;
  const missing = tracked ? addedLineNumbers(content, targetContent).length : 0;
  const done = tracked && matchesTarget(content, targetContent);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', background: C.surface2, borderBottom: `1px solid ${C.border}`, overflowX: 'auto' }}>
        {openFiles.length === 0 && (
          <span style={{ padding: '6px 12px', fontSize: 11, color: C.hint }}>No file open</span>
        )}
        {openFiles.map((rel) => (
          <div
            key={rel}
            onClick={() => onSelect(rel)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
              color: rel === activeFile ? C.text : C.hint,
              background: rel === activeFile ? C.surface : 'transparent',
              borderRight: `1px solid ${C.border}`,
              borderTop: rel === activeFile ? `2px solid ${C.blue}` : '2px solid transparent',
            }}
          >
            {rel.split('/').pop()}
            <button
              onClick={(e) => { e.stopPropagation(); onClose(rel); }}
              style={{ border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: 11, opacity: 0.6 }}
            >
              ✕
            </button>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        {saving && <span style={{ padding: '6px 10px', fontSize: 10, color: C.hint }}>saving…</span>}
      </div>

      {tracked && (
        <div
          style={{
            padding: '5px 12px',
            fontSize: 11,
            fontWeight: 600,
            color: done ? C.teal : C.text,
            background: done ? 'rgba(45,212,191,0.10)' : C.surface2,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          {done
            ? '✓ This file matches the step — run it.'
            : `${missing} line${missing === 1 ? '' : 's'} still to add (marked green in the step, right).`}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor
          height="100%"
          path={activeFile || 'untitled'}
          language={languageFor(activeFile)}
          theme={monacoTheme || (C.dark ? 'open-calc-dark' : 'open-calc-light')}
          value={content}
          beforeMount={setupOpenCalcMonaco}
          onChange={(val) => onChange(val ?? '')}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            acceptSuggestionOnEnter: 'off',
            tabSize: 4,
          }}
        />
      </div>
    </div>
  );
}
