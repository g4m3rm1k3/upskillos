// Syntax-highlighted fenced code blocks for rendered markdown — shared by
// MarkdownProse.jsx (the live lesson page) and MarkdownCellEditor.jsx's
// preview pane. Before this, fenced ```code``` blocks rendered as plain
// unstyled monospace text even though prismjs is already a dependency and
// already used this way for inline code in PrismInlineCode.jsx — this just
// extends the same technique to multi-line blocks with language detection.
import Prism from '../../utils/prism.js'
import './CodeBlock.css'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-markup' // html
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
// C#; also registers the alias "dotnet", which lessons use for C# that is shown, not run
// (a ```csharp fence is a runnable example in the lesson engine).
import 'prismjs/components/prism-csharp'
import 'prismjs/components/prism-javascript'

// react-markdown wraps fenced code in its own <pre> automatically — don't
// add a second one here, just style it via the `pre` component override
// below and keep this one focused on the inner <code> + highlighting.

import { createContext, useContext } from 'react'

const InPreContext = createContext(false)
export function CodeBlockPre({ children }) {
  return (
    <InPreContext.Provider value={true}>
      <pre className="oc-code-block my-6 p-4 rounded-xl overflow-x-auto text-sm leading-relaxed border shadow-inner max-w-[75ch] sidebar-scroll">
        {children}
      </pre>
    </InPreContext.Provider>
  )
}

export function CodeBlockCode({ className, children, inlineClassName }) {
  const inPre = useContext(InPreContext)
  
  if (!className?.startsWith('language-')) {
    if (inPre) {
      // Plain text code block (no language specified)
      return <code className="font-mono">{children}</code>
    }
    // True inline code (`code`)
    return <code className={inlineClassName}>{children}</code>
  }
  const lang = className.replace('language-', '').toLowerCase()
  const code = String(children).replace(/\n$/, '')
  const grammar = Prism.languages[lang]
  if (!grammar) {
    // Unrecognized language — still render as a plain (unhighlighted) block
    // rather than crashing or silently dropping the content.
    return <code className={`${className} font-mono`}>{code}</code>
  }
  const html = Prism.highlight(code, grammar, lang)
  // eslint-disable-next-line react/no-danger
  return <code className={`${className} font-mono`} dangerouslySetInnerHTML={{ __html: html }} />
}
