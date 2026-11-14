// Walks a lesson object and validates every bit of LaTeX it contains, the
// same way scripts/check_latex.mjs does in CI. Kept free of Node-only APIs
// (no fs/path) so it can also run in the browser — the Lesson Builder uses
// this to warn a contributor about broken LaTeX before they submit, instead
// of only finding out from a failed CI check after opening a PR.
import katex from 'katex'
import { preprocess, extractMathSegments } from './latexPreprocess.js'

// 'math' is used in walkthrough steps and similar fields — always raw LaTeX,
// never prose with embedded delimiters. Must bypass preprocess/wrapBareLatex
// (which mangles subscripted operators like A_{\max} into A_{$\max}$}).
const RAW_TEX_KEYS = new Set(['tex', 'expression', 'math'])
const KATEX_OPTIONS = { throwOnError: true, strict: false, trust: false }

function checkRawTex(tex, path, errors) {
  // A raw value with no LaTeX command ("#100 = 10", a CNC macro line) is code or
  // plain text; KatexBlock shows it as text when KaTeX can't parse it.
  if (!/\\[a-zA-Z]/.test(tex)) return
  try {
    katex.renderToString(tex, KATEX_OPTIONS)
  } catch (error) {
    errors.push({ path, message: error.message })
  }
}

function checkProse(text, path, errors) {
  const processed = preprocess(text)
  for (const segment of extractMathSegments(processed)) {
    try {
      katex.renderToString(segment, KATEX_OPTIONS)
    } catch (error) {
      errors.push({ path, message: `${error.message} (in "${segment.slice(0, 60)}")` })
    }
  }
}

// Deliberately doesn't hand-enumerate fields by name, since lesson schemas
// vary across course tracks. Any string under a "tex"/"expression" key is
// raw LaTeX; every other string is prose that may contain delimited math —
// except keys in SKIP_KEYS, which hold opaque/non-prose content that was
// never meant to go through KaTeX:
//   props        — opaque pass-through data for viz components
//   code         — Python/MATLAB/JS source; \n \t etc. are escape sequences, not LaTeX
//   initialProps — entire notebook initialProps subtree (contains code cells)
//   output       — cell output text, not authored prose
const SKIP_KEYS = new Set(['props', 'code', 'initialProps', 'output'])

function walk(value, path, parentKey, errors) {
  if (value == null) return
  if (SKIP_KEYS.has(parentKey)) return
  if (typeof value === 'string') {
    if (RAW_TEX_KEYS.has(parentKey)) checkRawTex(value, path, errors)
    else checkProse(value, path, errors)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, `${path}[${i}]`, parentKey, errors))
    return
  }
  if (typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) {
      walk(v, `${path}.${key}`, key, errors)
    }
  }
}

/** Returns [{ path, message }] for every piece of broken LaTeX found in `lesson`. */
export function checkLessonLatex(lesson, label = 'lesson') {
  const errors = []
  walk(lesson, label, null, errors)
  return errors
}
