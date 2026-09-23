import React, { useState } from 'react'
import Editor from '@monaco-editor/react'
import { setupOpenCalcMonaco } from '../../utils/monacoThemes.js'
import { useGlobalTheme } from '../../context/ThemeContext.jsx'
import CodeSettingsModal, { getCodeFontFamily, getCodeFontSize } from '../../components/ui/CodeSettingsModal.jsx'

export default function PythonEditor({ code, onChange, filename = 'my-regression.py', packages = ['numpy'] }) {
  const { themeStyles, isDarkGlobal, codeTypography } = useGlobalTheme()
  const [settingsOpen, setSettingsOpen] = useState(false)
  return <div className="ml-python-workspace">
    <div className="ml-editor-toolbar">
      <div><strong>{filename}</strong><span>Python · {packages.map(p => ({ numpy: 'NumPy', pandas: 'pandas', 'scikit-learn': 'scikit-learn', scipy: 'SciPy' })[p] || p).join(' · ')}</span></div>
      <div className="ml-editor-settings">
        <button onClick={() => setSettingsOpen(open => !open)} aria-label="Code settings">Code settings</button>
        <CodeSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    </div>
    <div className="ml-python-editor">
      <Editor
        height="520px"
        language="python"
        value={code}
        onChange={value => onChange(value ?? '')}
        beforeMount={setupOpenCalcMonaco}
        theme={themeStyles?.monaco ?? (isDarkGlobal ? 'open-calc-dark' : 'open-calc-light')}
        loading={<p className="ml-editor-loading" role="status">Loading Python editor…</p>}
        options={{
          ariaLabel: 'Editable Python / NumPy',
          fontFamily: getCodeFontFamily(codeTypography?.font),
          fontSize: parseInt(getCodeFontSize(codeTypography?.fontSize), 10),
          fontLigatures: codeTypography?.ligatures ?? true,
          minimap: { enabled: false },
          lineNumbers: 'on',
          tabSize: 4,
          insertSpaces: true,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          padding: { top: 16, bottom: 16 },
          bracketPairColorization: { enabled: true },
          guides: { indentation: true, bracketPairs: true },
          wordWrap: 'on',
        }}
      />
    </div>
    <p className="ml-editor-footer">Tab indents · Ctrl/Cmd + F finds · Changes save on this device</p>
  </div>
}
