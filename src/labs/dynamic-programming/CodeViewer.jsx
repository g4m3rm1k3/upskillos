import React, { useState } from 'react'
import Prism from '../../utils/prism.js'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-javascript'

export default function CodeViewer({
  code = '',
  language = 'Python',
  filename = '',
  showLineNumbers = true,
  allowCopy = true,
}) {
  const [copied, setCopied] = useState(false)
  const langKey = language.toLowerCase() === 'python' || language === 'py' ? 'python' : 'javascript'
  const grammar = Prism.languages[langKey] || Prism.languages.javascript
  const highlighted = grammar ? Prism.highlight(code.trimEnd(), grammar, langKey) : code.trimEnd()
  const lines = code.trimEnd().split('\n')

  function handleCopy() {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const defaultFilename = filename || (langKey === 'python' ? 'solution.py' : 'solution.js')

  return (
    <div className="dp-code-viewer" data-language={langKey}>
      <div className="dp-code-header">
        <div className="dp-code-filename">
          <span className="dp-file-icon" aria-hidden="true">{langKey === 'python' ? '🐍' : '⚡'}</span>
          <span>{defaultFilename}</span>
        </div>
        <div className="dp-code-actions">
          <span className="dp-code-badge">{language}</span>
          {allowCopy && (
            <button
              type="button"
              className="dp-copy-btn"
              onClick={handleCopy}
              title="Copy code to clipboard"
              aria-label="Copy code"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>
      <div className="dp-code-body">
        {showLineNumbers && (
          <div className="dp-code-gutter" aria-hidden="true">
            {lines.map((_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
        )}
        <pre className={`dp-code-content language-${langKey}`}>
          <code
            className={`language-${langKey}`}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
          <span className="sr-only">{code}</span>
        </pre>
      </div>
    </div>
  )
}
