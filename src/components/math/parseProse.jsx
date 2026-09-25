/**
 * Shared prose parser — converts mixed text+math strings into React elements.
 *
 * Handles (in priority order):
 *  - `inline code` via <code> (contents left literal)
 *  - \[...\]  display LaTeX via KatexBlock (block-level)
 *  - \(...\)  inline LaTeX via KatexInline
 *  - $...$    inline LaTeX via KatexInline
 *  - \command  bare LaTeX without delimiters (e.g. "\lim_{x\to 3}\frac{…}")
 *  - **bold** via <strong>
 *  - {{algebra:topicId|linkText}} popovers
 *  - Plain text spans
 */
import KatexInline from './KatexInline.jsx'
import KatexBlock from './KatexBlock.jsx'
import AlgebraMicroLesson from '../lesson/AlgebraMicroLesson.jsx'

function isLikelyInlineMath(expr) {
  const t = expr.trim()
  if (!t) return false
  if (/^\d+(?:[.,]\d+)?$/.test(t)) return false
  if (/^[\d,]+(?:\.\d+)?$/.test(t)) return false
  
  // If the expression has absolutely no spaces, it's highly likely a continuous math token (e.g. n, P(k), n!, n,k)
  if (!t.includes(' ')) return true
  
  return /[\\^_{}=<>+\-*/()|!\[\]]|\b(?:lim|sin|cos|tan|log|ln|sqrt|frac|Delta|varepsilon|theta|pi|int|sum|prod)\b/i.test(t)
}

/**
 * Scan a bare LaTeX expression starting at position i (where text[i] === '\\').
 * Returns the end index (exclusive) of the expression.
 *
 * Strategy: track brace depth. At depth=0, stop when we hit a sentence-ending
 * punctuation followed by whitespace/end, OR a newline, OR end of string.
 * A bare \command with no following braces/subscripts ends at the next space.
 */
function scanBareLatex(text, i) {
  let j = i
  let depth = 0
  let hasBraces = false

  while (j < text.length) {
    const c = text[j]

    if (c === '{') { depth++; hasBraces = true; j++; continue }
    if (c === '}') {
      if (depth > 0) depth--
      j++
      if (depth === 0 && hasBraces) {
        // Just closed the outermost brace — peek ahead
        const peek = j < text.length ? text[j] : ''
        // More LaTeX: subscript, superscript, open brace, another command
        if (peek === '_' || peek === '^' || peek === '{' || peek === '\\') continue
        // Sentence-terminal punctuation → stop before it
        if ((peek === '.' || peek === '?' || peek === '!' || peek === ';') &&
            (j + 1 >= text.length || /\s/.test(text[j + 1]))) break
        // End of string or newline → stop
        if (peek === '' || peek === '\n') break
        // Otherwise keep going (e.g. space then more LaTeX tokens)
      }
      continue
    }

    // Depth-0 checks for un-braced commands
    if (depth === 0) {
      if (c === '\n') break
      // Space: stop if this is a bare \command with no braces yet
      if (c === ' ' && !hasBraces) break
      // Sentence-terminal at depth 0 (no braces): stop
      if (!hasBraces && (c === '.' || c === '?' || c === '!' || c === ';')) {
        const next = j + 1 < text.length ? text[j + 1] : ''
        if (!next || /\s/.test(next)) break
      }
    }

    j++
  }

  return j
}

/**
 * After any inline math expression ends, if the very next characters are '. '
 * (period + whitespace or period + another math delimiter), emit the period and
 * a <br> so each sentence/step in a worked example starts on its own line.
 * This fires globally for every $…$ and \(…\) — no per-lesson changes needed.
 *
 * keyNext is a thunk () => number so we can increment the shared keyIdx counter.
 */
function eatPostMathBreak(text, i, parts, keyNext) {
  if (i >= text.length || text[i] !== '.') return i
  const after = i + 1 < text.length ? text[i + 1] : ''
  // Only break when the period genuinely ends a sentence:
  // followed by space, another math delimiter, or end of string.
  const isSentenceEnd = after === ' ' || after === '\n' || after === '$' ||
    text.startsWith('\\(', i + 1) || text.startsWith('\\[', i + 1) || after === ''
  if (!isSentenceEnd) return i
  parts.push(<span key={`sep${keyNext()}`}>.</span>)
  parts.push(<br key={`br${keyNext()}`} />)
  i++ // consume the period
  while (i < text.length && text[i] === ' ') i++ // consume trailing spaces
  return i
}

export function parseProse(text) {
  if (!text) return []
  const parts = []
  let i = 0
  let keyIdx = 0

  while (i < text.length) {
    // Newline → <br />, double newline → paragraph gap
    if (text[i] === '\n') {
      if (i + 1 < text.length && text[i + 1] === '\n') {
        parts.push(<span key={`nl${keyIdx++}`} className="block mb-3" />)
        i += 2
        while (i < text.length && text[i] === '\n') i++
      } else {
        parts.push(<br key={`br${keyIdx++}`} />)
        i++
      }
      continue
    }

    // `inline code` — checked before bold/italic/math so * and $ inside code stay literal
    if (text[i] === '`' && !text.startsWith('``', i)) {
      const end = text.indexOf('`', i + 1)
      const newline = text.indexOf('\n', i + 1)
      if (end > i + 1 && (newline === -1 || end < newline)) {
        parts.push(
          <code key={`c${keyIdx++}`} className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[0.9em]">
            {text.slice(i + 1, end)}
          </code>
        )
        i = end + 1
        continue
      }
    }

    // <span class="tooltip" data-tooltip="...">label</span>
    if (text.startsWith('<span class="tooltip" data-tooltip="', i)) {
      const attrStart = i + '<span class="tooltip" data-tooltip="'.length
      const attrEnd = text.indexOf('">', attrStart)
      if (attrEnd !== -1) {
        const tooltip = text.slice(attrStart, attrEnd)
        const labelStart = attrEnd + 2
        const closeTag = '</span>'
        const labelEnd = text.indexOf(closeTag, labelStart)
        if (labelEnd !== -1) {
          const label = text.slice(labelStart, labelEnd)
          parts.push(
            <span key={`tt${keyIdx++}`} className="tooltip" data-tooltip={tooltip} title={tooltip} tabIndex={0}>
              {label}
            </span>
          )
          i = labelEnd + closeTag.length
          continue
        }
      }
    }

    // **bold** — recursively parse inner content so $math$ and \(...\) render
    if (text.startsWith('**', i)) {
      const end = text.indexOf('**', i + 2)
      if (end !== -1) {
        parts.push(<strong key={`b${keyIdx++}`}>{parseProse(text.slice(i + 2, end))}</strong>)
        i = end + 2
        continue
      }
    }

    // *italic* — single asterisk, not part of **bold**
    if (text[i] === '*' && text[i + 1] !== '*') {
      const end = text.indexOf('*', i + 1)
      if (end !== -1 && text[end + 1] !== '*') {
        parts.push(<em key={`em${keyIdx++}`}>{parseProse(text.slice(i + 1, end))}</em>)
        i = end + 1
        continue
      }
    }

    // \[...\] display math — render as block KaTeX
    if (text.startsWith('\\[', i)) {
      const end = text.indexOf('\\]', i + 2)
      if (end !== -1) {
        const expr = text.slice(i + 2, end).trim()
        parts.push(
          <div key={`kb${keyIdx++}`} className="my-3 overflow-x-auto">
            <KatexBlock expr={expr} />
          </div>
        )
        i = end + 2
        while (i < text.length && text[i] === ' ') i++
        continue
      }
    }

    // \(...\) inline math
    if (text.startsWith('\\(', i)) {
      const end = text.indexOf('\\)', i + 2)
      if (end !== -1) {
        const expr = text.slice(i + 2, end).trim()
        parts.push(
          <span key={`ki${keyIdx++}`} className="math-hover-trigger inline-block transition-colors hover:text-brand-600 cursor-default">
            <KatexInline expr={expr} />
          </span>
        )
        i = end + 2
        i = eatPostMathBreak(text, i, parts, () => keyIdx++)
        continue
      }
    }

    // $inline math$
    if (text[i] === '$') {
      const end = text.indexOf('$', i + 1)
      if (end !== -1) {
        const candidate = text.slice(i + 1, end)
        if (isLikelyInlineMath(candidate)) {
          parts.push(
            <span key={`k${keyIdx++}`} className="math-hover-trigger inline-block transition-colors hover:text-brand-600 cursor-default">
              <KatexInline expr={candidate} />
            </span>
          )
          i = end + 1
          i = eatPostMathBreak(text, i, parts, () => keyIdx++)
          continue
        }
      }
      parts.push('$')
      i += 1
      continue
    }

    // \command — bare LaTeX without delimiters
    // e.g. "Compute \lim_{x \to 3} \frac{x^2-9}{x^2-3x}."
    if (text[i] === '\\' && i + 1 < text.length && /[a-zA-Z]/.test(text[i + 1])) {
      const end = scanBareLatex(text, i)
      if (end > i + 1) {
        const expr = text.slice(i, end).trim()
        parts.push(
          <span key={`kl${keyIdx++}`} className="math-hover-trigger inline-block transition-colors hover:text-brand-600 cursor-default">
            <KatexInline expr={expr} />
          </span>
        )
        i = end
        continue
      }
      // Couldn't parse — output the backslash literally and move on
      parts.push(<span key={`t${keyIdx++}`}>\</span>)
      i++
      continue
    }

    // {{algebra:topicId|linkText}} popover
    if (text[i] === '{' && text[i + 1] === '{' && text.startsWith('algebra:', i + 2)) {
      const end = text.indexOf('}}', i + 2)
      if (end !== -1) {
        const content = text.slice(i + 10, end)
        const pipeIdx = content.indexOf('|')
        if (pipeIdx !== -1) {
          const topicId = content.substring(0, pipeIdx)
          const linkText = content.substring(pipeIdx + 1)
          parts.push(
            <AlgebraMicroLesson key={`alg${keyIdx++}`} topicId={topicId}>
              <KatexInline expr={linkText} />
            </AlgebraMicroLesson>
          )
          i = end + 2
          continue
        }
      }
    }

    // Plain text — scan to next special marker
    const nextBold      = text.indexOf('**', i)
    const nextAsterisk  = text.indexOf('*', i)
    const nextDollar    = text.indexOf('$', i)
    const nextAlg       = text.indexOf('{{algebra:', i)
    const nextDisplay   = text.indexOf('\\[', i)
    const nextInline    = text.indexOf('\\(', i)
    const nextBackslash = text.indexOf('\\', i)
    const nextTooltip   = text.indexOf('<span class="tooltip" data-tooltip="', i)
    const nextNewline   = text.indexOf('\n', i)
    const candidates = [nextBold, nextAsterisk, nextDollar, nextAlg, nextDisplay, nextInline, nextBackslash, nextTooltip, nextNewline].filter(v => v !== -1)
    const stop = candidates.length ? Math.min(...candidates) : text.length
    if (stop > i) {
      parts.push(<span key={`t${keyIdx++}`}>{text.slice(i, stop)}</span>)
      i = stop
    } else {
      // Newline → line break
      if (text[i] === '\n') {
        parts.push(<br key={`br${keyIdx++}`} />)
        i++
        continue
      }

      // Safety valve: unhandled character (e.g. lone \ not followed by a letter).
      // Output it literally and advance — prevents infinite loop.
      parts.push(<span key={`t${keyIdx++}`}>{text[i]}</span>)
      i++
    }
  }

  return parts.length > 0 ? parts : [text]
}
