import katex from 'katex'
import { useMemo } from 'react'

const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Renders one display formula. Some lesson fields hold code rather than LaTeX
// (a CNC macro line such as "#100 = 10", a regex); KaTeX can't parse those,
// and showing them as red KaTeX error text hid what the author wrote. Anything
// that doesn't parse is shown as the original text in code type instead.
// scripts/check_latex.mjs still reports a failing value that contains a LaTeX
// command, since that one was meant to be a formula.
export default function KatexBlock({ expr, className = '' }) {
  const html = useMemo(() => {
    if (!expr) return ''
    try {
      return katex.renderToString(expr, {
        displayMode: true,
        throwOnError: true,
        trust: false,
        strict: false,
      })
    } catch {
      return `<code class="font-mono whitespace-pre-wrap">${escapeHtml(String(expr))}</code>`
    }
  }, [expr])

  return (
    <div
      className={`math-display overflow-x-auto ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
