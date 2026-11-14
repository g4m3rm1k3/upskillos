/**
 * Pure text preprocessing shared between MarkdownProse (renders lesson prose
 * in the app) and scripts/check_latex.mjs (validates lesson LaTeX in CI / the
 * lesson builder). Kept dependency-free and JSX-free so it can be imported
 * from a plain Node script, not just from React.
 *
 * Converts the lesson-content notation to remark-math notation:
 *   \[…\]  →  $$…$$   (display / block math)
 *   \(…\)  →  $…$     (inline math)
 *   {{algebra:id|text}}  →  **text**  (bold label; preserves readability)
 *   bare \command  →  $\command…$  (wraps math the author forgot to delimit)
 */

/**
 * Scan forward from `start` (where src[start] === '\\') and collect a bare
 * LaTeX expression. Stops when all braces are closed and the next character is
 * NOT a math-continuation character (_ ^ { \).  Returns the end index.
 */
export function scanBareMath(src, start, openBraces = 0) {
  // \begin{env}...\end{env} is a multi-token LaTeX environment (cases,
  // aligned, array, matrix, ...) — the general bare-command scan below only
  // ever consumes one \command{...} unit, so without this it would wrap just
  // "\begin{cases}" alone and leave the rest of the environment as broken
  // unrendered text. Jump straight to the matching \end{env} instead.
  const envMatch = /^\\begin\{([a-zA-Z*]+)\}/.exec(src.slice(start))
  if (envMatch) {
    // Count nested environments of the same name (an array inside an array).
    const beginToken = `\\begin{${envMatch[1]}}`
    const endToken = `\\end{${envMatch[1]}}`
    let depth = 0
    let j = start
    while (j < src.length) {
      if (src.startsWith(beginToken, j)) { depth++; j += beginToken.length; continue }
      if (src.startsWith(endToken, j)) {
        j += endToken.length
        if (--depth === 0) return j
        continue
      }
      j++
    }
  }

  // \left(...\right) must stay balanced across the whole expression — and
  // can nest, e.g. \left(\left[...\right]\right) — so jump straight to the
  // matching \right instead of stopping at the first space/punctuation
  // inside the parens, which would split it into two broken fragments.
  if (src.startsWith('\\left', start)) {
    let leftDepth = 0
    let j = start
    while (j < src.length) {
      if (src.startsWith('\\left', j)) { leftDepth++; j += 5; continue }
      if (src.startsWith('\\right', j)) {
        leftDepth--
        j += 6
        if (leftDepth === 0) {
          return src[j] === '\\' ? j + 2 : j + 1 // consume the delimiter after \right, e.g. ) ] | \}
        }
        continue
      }
      j++
    }
    // unbalanced in the source — fall through to the general scan below
  }

  // openBraces: braces already opened before `start` (the "x_{" in "x_{\min}"),
  // so the scan runs on until they close too.
  let i = start
  let depth = openBraces
  let hadBraces = openBraces > 0

  while (i < src.length) {
    const c = src[i]
    // LaTeX spacing escapes (\, \; \: \! and an escaped literal space) are
    // two-character tokens whose second character (a comma, semicolon, etc)
    // would otherwise look like prose punctuation and wrongly end the scan
    // right after the bare backslash — e.g. "\forall\,y" stopping at "\forall\"
    // and leaving a dangling backslash for KaTeX to choke on.
    if (c === '\\' && / |,|;|:|!/.test(src[i + 1] ?? '')) {
      i += 2
      continue
    }
    if (c === '{') {
      depth++
      hadBraces = true
      i++
      continue
    }
    if (c === '}') {
      if (depth > 0) depth--
      i++
      if (depth === 0 && hadBraces) {
        const peek = i < src.length ? src[i] : ''
        if (peek === '_' || peek === '^' || peek === '{' || peek === '\\')
          continue
        break // all braces closed, not continuing — stop here
      }
      continue
    }
    if (depth === 0) {
      if (c === '\n') break
      // Bare command with no braces: stop at space or prose punctuation
      if (
        !hadBraces &&
        (c === ' ' ||
          c === ',' ||
          c === '.' ||
          c === ';' ||
          c === '!' ||
          c === '?')
      )
        break
    }
    i++
  }
  return i
}

/** Index of the first `token` at or after `from` that isn't escaped with a backslash, or -1. */
function indexOfUnescaped(src, token, from) {
  let at = src.indexOf(token, from)
  while (at !== -1 && src[at - 1] === '\\') at = src.indexOf(token, at + 1)
  return at
}

/** How many "{" in `text` are still open at its end (escaped \{ and \} don't count). */
function unclosedBraces(text) {
  let depth = 0
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\\') { i++; continue }
    if (text[i] === '{') depth++
    else if (text[i] === '}' && depth > 0) depth--
  }
  return depth
}

/** True when every "{" in `text` is closed and no "}" closes nothing (escaped \{ \} don't count). */
function bracesBalanced(text) {
  let depth = 0
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\\') { i++; continue }
    if (text[i] === '{') depth++
    else if (text[i] === '}' && --depth < 0) return false
  }
  return depth === 0
}

/**
 * A paragraph that is one formula written without delimiters, as many lesson
 * fields are ("e^{i\theta} = \cos\theta + i\sin\theta", a "work" or "symbol"
 * field): it has a LaTeX command, balanced braces, no delimiters, and no
 * ordinary word of three or more letters outside \text{...} and the commands
 * themselves. Wrapping it whole keeps it one formula; wrapping each command
 * separately cut it into pieces KaTeX can't parse ("\theta}", "\right]_0^4").
 */
export function isWholeFormula(paragraph) {
  const p = paragraph.trim()
  if (!/\\[a-zA-Z]{2}/.test(p)) return false
  // Delimiters inside \text{...} are maths nested in the formula's words, which
  // KaTeX supports ("\text{... a straight line ($180^\circ$).}"); elsewhere they
  // mean the paragraph is prose with its own formulas.
  const outsideTextArgs = p.replace(/\\text\s*\{(?:[^{}]|\{[^{}]*\})*\}/g, ' ')
  if (/(?<!\\)\$|\\\(|\\\[|`|\x00/.test(outsideTextArgs)) return false
  // Markdown structure (a list item, heading, quote or table row) is prose layout, not a formula.
  if (/^[ \t]*(?:[-*+>#|]|\d+[.)])[ \t]/m.test(p) || /\*\*/.test(p)) return false
  if (!bracesBalanced(p)) return false
  const outsideText = p
    .replace(/\\begin\s*\{[a-zA-Z*]+\}(?:\s*\{[^{}]*\})?/g, ' ') // \begin{array}{c|cccc}
    .replace(/\\(?:text|mathrm|textbf|textit|operatorname|mbox|begin|end)\s*\{(?:[^{}]|\{[^{}]*\})*\}/g, ' ')
    .replace(/\\[a-zA-Z]+/g, ' ')
  return !/[a-zA-Z]{3,}/.test(outsideText)
}

/**
 * Wraps each whole-formula paragraph of `src` in $...$ ($$ blocks when it has \\ rows),
 * passing the wrapped formula to `keep`, which returns a placeholder to put in its
 * place: wrapBareLatex must not look inside it (it would re-split a long one).
 */
function wrapWholeFormulas(src, keep) {
  return src.split(/(\n[ \t]*\n)/).map((part) => {
    if (!isWholeFormula(part)) return part
    const lead = /^\s*/.exec(part)[0]
    const trail = /\s*$/.exec(part)[0]
    const body = part.trim()
    // Display ($$) for a formula with \\ rows, or with $ nested in its \text{...}:
    // an inline $...$ would end at that inner $.
    const display = body.includes('\\\\') || /(?<!\\)\$/.test(body)
    return lead + keep(display ? `$$\n${body}\n$$` : `$${body}$`) + trail
  }).join('')
}

/**
 * Wrap bare \command expressions that are NOT already inside $, $$, \(, or \[
 * delimiters in $…$.  This fixes prose like "write \frac{a}{b} and cancel"
 * where the author forgot to add dollar signs.
 */
export function wrapBareLatex(src) {
  let out = ''
  let i = 0
  while (i < src.length) {
    // Skip past inline code spans untouched — prose describing code often
    // contains literal backslash sequences (e.g. `\r\n`, `\b`) that aren't
    // LaTeX at all and shouldn't be wrapped just because they start with a
    // backslash-letter.
    if (src[i] === '`') {
      const close = src.indexOf('`', i + 1)
      if (close !== -1) {
        out += src.slice(i, close + 1)
        i = close + 1
        continue
      }
    }
    // Skip past already-delimited math so we don't double-wrap. An escaped
    // dollar inside it ("$\$C$", a price in a formula) doesn't close it.
    if (src.startsWith('$$', i) && src[i - 1] !== '\\') {
      const close = indexOfUnescaped(src, '$$', i + 2)
      if (close !== -1) {
        out += src.slice(i, close + 2)
        i = close + 2
        continue
      }
    }
    if (src[i] === '$' && src[i - 1] !== '\\') {
      const close = indexOfUnescaped(src, '$', i + 1)
      if (close !== -1 && close - i < 300) {
        out += src.slice(i, close + 1)
        i = close + 1
        continue
      }
    }
    // src[i - 1] !== '\\' excludes LaTeX's "\\(" / "\\[6pt]" row-spacing
    // idiom (a literal \\ line-break followed by an optional [..] arg) —
    // see the matching note in preprocess() below for why this matters.
    if (src.startsWith('\\(', i) && src[i - 1] !== '\\') {
      const close = src.indexOf('\\)', i + 2)
      if (close !== -1) {
        out += src.slice(i, close + 2)
        i = close + 2
        continue
      }
    }
    if (src.startsWith('\\[', i) && src[i - 1] !== '\\') {
      const close = src.indexOf('\\]', i + 2)
      if (close !== -1) {
        out += src.slice(i, close + 2)
        i = close + 2
        continue
      }
    }
    // Bare \command — wrap in $...$. Only commands of two or more letters
    // (\frac, \lambda, \vec): every one-letter command (\d, \t, \r, \v, \b, \u,
    // \H, \S ...) is a LaTeX text accent or symbol, not maths, and in this
    // content a bare one is nearly always code — a regex (\d{4}, \w+), a C or
    // Python escape (\t, \r), or a typo (\a_y for \vec{a}_y). Wrapping them made
    // KaTeX draw "\d{4}" as a dotted "4" or a red parse error; left alone they
    // show as the literal text the author wrote.
    if (src[i] === '\\' && /^[a-zA-Z]{2}/.test(src.slice(i + 1, i + 3))) {
      // A command inside a brace its word opened ("x_{\min}", "e^{i\theta}")
      // belongs to that word: pull the word's start into the maths, and scan
      // on until the brace closes. Wrapping only "\min}" split the formula
      // and left KaTeX an unmatched "}".
      const word = /[^\s$]*$/.exec(out)[0]
      const open = unclosedBraces(word)
      if (open > 0) {
        const end = scanBareMath(src, i, open)
        out = out.slice(0, out.length - word.length) + '$' + word + src.slice(i, end) + '$'
        i = end
        continue
      }
      const end = scanBareMath(src, i)
      if (end > i + 1) {
        out += '$' + src.slice(i, end) + '$'
        i = end
        continue
      }
    }
    out += src[i]
    i++
  }
  return out
}

// A literal \n in lesson data is a paragraph break, except where it begins a LaTeX
// command whose name starts with n (\neq, \nabla, \nu ...). Matching only "\n not
// followed by a lowercase letter" left breaks such as "\nthen" or "\nimport" as text,
// which wrapBareLatex then wrapped as unknown commands.
const N_COMMANDS = 'nabla|natural|nearrow|neg|neq|ne|newline|nexists|ngeq|ngtr|ni|nleftarrow|nLeftarrow|nleftrightarrow|nleq|nless|nmid|not|notin|nparallel|nprec|nrightarrow|nRightarrow|nsim|nsubseteq|nsucc|nsupseteq|ntriangleleft|ntriangleright|nu|nvdash|nVdash|nwarrow|normalsize'
const ESCAPED_NEWLINE = new RegExp(`\\\\(?!(?:${N_COMMANDS})(?![a-zA-Z]))n`, 'g')

export function preprocess(text) {
  if (!text) return ''
  // Code fences (```...```) and inline code spans (`...` on one line) are set aside
  // first and put back last, so no step below ever touches code: not the \n
  // conversion (`b"\n"`), not \[ \] or \( \) (a regex such as `\[(\d{4})\]`), and
  // not bare-command or $ handling (`$primary: #3b82f6` in a Sass block).
  const CODE_FENCE = /^```[\s\S]*?^```/gm
  const INLINE_CODE = /`[^`\n]+`/g
  const codeParts = []
  const keep = (match) => {
    codeParts.push(match)
    return `\x00CODE${codeParts.length - 1}\x00`
  }
  const stripped = text.replace(CODE_FENCE, keep).replace(INLINE_CODE, keep)
  // Whole-formula paragraphs are set aside too, already wrapped, so wrapBareLatex
  // and the line-layout rules below can't re-split them.
  const formulas = []
  const keepFormula = (math) => {
    formulas.push(fixMath(math))
    return `\x00MATH${formulas.length - 1}\x00`
  }
  const normalized = wrapWholeFormulas(stripped.replace(ESCAPED_NEWLINE, '\n\n'), keepFormula)
  return (
    wrapBareLatex(normalized)
      // \[…\] → $$…$$ (block / display math). Matched as ONE pair (not two
      // independent replaces) so whatever whitespace/newlines already
      // surround \[ and \] are preserved as-is on both sides. This matters
      // inside list items: \[ / \] indented to match the item's 2-space
      // continuation (e.g. "  \[\n  A x = \\lambda x\n  \]") must produce
      // an equally-indented closing "$$", or remark/micromark sees the
      // unindented "$$" as falling outside the list item's container and
      // starting a brand-new (now unclosed) math block — which then
      // swallows everything up to the next "$$" it finds, however far away
      // (confirmed: this is what broke Diagonalisation.md's eigenspace
      // section — a 2-space-indented \[...\] inside a list item).
      //
      // (?<!\\) excludes LaTeX's own "\\[6pt]"/"\\[10pt]" row-spacing idiom
      // (a literal \\ line-break followed by an optional-arg [..]) — without
      // it, the second backslash + "[" reads as a display-math opener with
      // no matching closer, which permanently shifts the open/close parity
      // for every \[...\] in the rest of the document.
      .replace(/(?<!\\)\\\[([\s\S]*?)(?<!\\)\\\]/g, (_, inner) => `$$${inner}$$`)
      // \(…\) → $…$ (inline math)
      .replace(/(?<!\\)\\\(/g, '$')
      .replace(/(?<!\\)\\\)/g, '$')
      // {{algebra:topicId|linkText}} → **linkText**  (preserves visible text)
      .replace(/\{\{algebra:[^|]+\|([^}]+)\}\}/g, '**$1**')
      // "Step N:" mid-sentence → new paragraph with bold label.
      .replace(/\.\s+(Step\s+\d+:)/g, '.\n\n**$1**')
      // "(1) ... (2) ..." inline numbered steps → new paragraphs.
      // Matches a period/em-dash followed by a space then "(N)" at start of a new step.
      .replace(/[.—]\s+(\(\d+\))\s+/g, '.\n\n$1 ')
      // Sentence break after inline math: "$math$. Next sentence" → hard line break.
      // Only match horizontal whitespace (space/tab) — \s+ would also eat blank lines,
      // collapsing paragraph→"---" into a setext h2 underline for the whole paragraph.
      .replace(/(\$[^$\n]+\$)\.[ \t]+(?=\S)/g, '$1.  \n')
      // A whole line that's just "$$<equation>$$" (e.g. from a \[...\] that
      // was crammed inline with other text rather than on its own line)
      // parses as INLINE math, not display/block — remark-math only treats
      // $$ as block math when the delimiters sit alone on their own line.
      // Promote it to a proper 3-line block so it still gets display
      // rendering. A function replacer is used throughout — see the note
      // above about "$$" being special inside a replacement *string*.
      .replace(/^(\s*)\$\$(.+)\$\$(\s*)$/gm, (_, lead, inner, trail) =>
        inner.trim() ? `${lead}$$\n${inner.trim()}\n$$${trail}` : `${lead}$$${inner}$$${trail}`)
      // Multi-line display math where $$ is on the same line as content, e.g.:
      //   $$\exists x \in \mathbb{C} \text{ such that }
      //   p(x) = a_n(x - z_1)\cdots(x - z_n)$$
      // remark-math requires $$ to be alone on its own line (like a fenced
      // code block) — content immediately after/before $$ prevents it from
      // recognising the fence, so the delimiters leak into surrounding prose
      // and the whole section renders as broken red text.
      // Split opening $$ from its trailing content and closing $$ from its
      // leading content so each fence sits on its own line.
      .replace(/^(\s*)\$\$([^\s$\n])/gm, (_, lead, first) => `${lead}$$\n${first}`)
      .replace(/([^$\n])\$\$(\s*)$/gm, (_, last, trail) => `${last}\n$$${trail}`)
      .replace(MATH_SEGMENT, fixMath)
      .replace(/\x00MATH(\d+)\x00/g, (_, i) => formulas[Number(i)])
      .replace(/\x00CODE(\d+)\x00/g, (_, i) => codeParts[Number(i)])
  )
}

const MATH_SEGMENT = /(?<!\\)\$\$[\s\S]+?(?<!\\)\$\$|(?<!\\)\$[^$\n]+?(?<!\\)\$/g
const ENTITY = { lt: '<', gt: '>', amp: '&' }

// Repairs inside one delimited formula:
// - HTML entities ("$C_b &lt; 0.5$"): the page decodes them in prose, but KaTeX
//   gets the formula's raw text and can't parse "&lt;".
// - A bare % ("\text{80% efficiency}"): in TeX it starts a comment that swallows
//   the rest of the formula; lesson text always means a percent sign.
function fixMath(math) {
  return math
    .replace(/&(lt|gt|amp);/g, (_, name) => ENTITY[name])
    .replace(/(?<!\\)%/g, '\\%')
}

/**
 * Extract every $$...$$ and $...$ delimited math segment from already-preprocessed text.
 * An escaped dollar (\$) is a literal dollar sign in Markdown, as remark-math treats it
 * on the page, so it neither opens nor closes a segment here ("you win \$10").
 */
export function extractMathSegments(processedText) {
  // Code is never parsed as maths on the page ("$primary: #3b82f6" in a Sass block).
  processedText = processedText.replace(/^```[\s\S]*?^```/gm, ' ').replace(/`[^`\n]+`/g, ' ')
  const segments = []
  const pattern = /(?<!\\)\$\$([\s\S]+?)(?<!\\)\$\$|(?<!\\)\$([^$\n]+?)(?<!\\)\$/g
  let match
  while ((match = pattern.exec(processedText)) !== null) {
    segments.push(match[1] ?? match[2])
  }
  return segments
}
