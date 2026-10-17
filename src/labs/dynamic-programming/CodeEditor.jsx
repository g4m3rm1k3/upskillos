import React, { useRef, useState, useEffect } from 'react'
import Prism from '../../utils/prism.js'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-javascript'

export default function CodeEditor({
  code = '',
  onChange,
  language = 'Python',
  setLanguage,
  disabled = false,
  onRun,
  onCheck,
  onReset,
  ariaLabel,
}) {
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef(null)
  const preRef = useRef(null)
  const gutterRef = useRef(null)

  const langKey = language.toLowerCase() === 'python' || language === 'py' ? 'python' : 'javascript'
  const grammar = Prism.languages[langKey] || Prism.languages.javascript
  const highlighted = grammar ? Prism.highlight(code || ' ', grammar, langKey) : (code || ' ')
  const lines = (code || '').split('\n')
  const lineCount = Math.max(lines.length, 1)

  function handleScroll(e) {
    const { scrollTop, scrollLeft } = e.target
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop
      preRef.current.scrollLeft = scrollLeft
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop
    }
  }

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey && onCheck) onCheck()
      else onRun?.()
      return
    }

    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      const target = e.currentTarget
      const start = target.selectionStart
      const end = target.selectionEnd
      const indent = langKey === 'python' ? '    ' : '  '
      const nextCode = code.slice(0, start) + indent + code.slice(end)
      onChange?.(nextCode)
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + indent.length
        }
      })
    }
  }

  function handleCopy() {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const filename = langKey === 'python' ? 'solution.py' : 'solution.js'

  return (
    <div className={`dp-code-editor ${disabled ? 'is-disabled' : ''}`} data-language={langKey}>
      <div className="dp-editor-topbar">
        <div className="dp-editor-tab">
          <span className="dp-file-icon" aria-hidden="true">{langKey === 'python' ? '🐍' : '⚡'}</span>
          <span className="dp-tab-name">{filename}</span>
        </div>
        {setLanguage && (
          <fieldset className="dp-editor-lang-picker" disabled={disabled}>
            <legend className="sr-only">Editor language</legend>
            {['Python', 'JavaScript'].map((lang) => (
              <label key={lang} className={language === lang ? 'is-active' : ''}>
                <input
                  type="radio"
                  name="dp-editor-lang"
                  checked={language === lang}
                  onChange={() => setLanguage(lang)}
                  disabled={disabled}
                />
                {lang}
              </label>
            ))}
          </fieldset>
        )}
        <div className="dp-editor-tools">
          {onReset && (
            <button
              type="button"
              className="dp-editor-tool-btn"
              onClick={onReset}
              disabled={disabled}
              title="Reset code to starter template"
            >
              Reset
            </button>
          )}
          <button
            type="button"
            className="dp-editor-tool-btn"
            onClick={handleCopy}
            title="Copy code to clipboard"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <span className="dp-shortcut-hint" title="Press Ctrl+Enter to run">
            Ctrl+↵ to run
          </span>
        </div>
      </div>

      <div className="dp-editor-workspace">
        <div ref={gutterRef} className="dp-editor-gutter" aria-hidden="true">
          {Array.from({ length: lineCount }).map((_, i) => (
            <div key={i} className="dp-gutter-line">
              {i + 1}
            </div>
          ))}
        </div>

        <div className="dp-editor-area">
          <pre ref={preRef} className={`dp-editor-highlight language-${langKey}`} aria-hidden="true">
            <code
              className={`language-${langKey}`}
              dangerouslySetInnerHTML={{ __html: highlighted + '\n' }}
            />
          </pre>
          <textarea
            ref={textareaRef}
            className="dp-editor-input"
            aria-label={ariaLabel || `Your ${language} solution`}
            value={code}
            disabled={disabled}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            wrap="off"
            rows={14}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
          />
        </div>
      </div>
    </div>
  )
}
