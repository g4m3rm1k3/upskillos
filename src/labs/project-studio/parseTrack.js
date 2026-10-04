// parseTrack.js
// Turns a lesson markdown file into ordered steps.
//
// Format (see tracks/*/*.md). Optional frontmatter keys: `reference: optional` collapses full
// files, `support:` supplies infrastructure files, `console: true` marks a terminal program
// whose output appears in the output pane (see index.jsx).
//
//   ---
//   title: A Window That Stays Open
//   runtime: python
//   run: main.py
//   ---
//
//   ## Step 1 — Make a window appear
//
//   prose...
//
//   ```python file=main.py
//   ...the FULL content main.py should have after this step...
//   ```
//
//   ### Why this works
//
//   explanation...
//
// The fenced block is the file's complete target content at that step, not
// a diff — the diff against whatever the learner currently has on disk is
// computed at runtime (lineDiff.js). That means an author never hand-writes
// or maintains a diff, and the highlight is always accurate to the real
// file rather than to an assumption about it.
//
// A step can also carry a ```check fence (see checks.js): what the "Check my work" button
// verifies in the learner's real project folder. It is taken out of the prose.
import { parseChecks } from './checks.js';
import { MARKER, parsePrediction } from './predictions.js';
import { HINTS_MARKER, parseHints } from './hints.js';

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { meta: {}, body: text };

  const meta = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { meta, body: text.slice(match[0].length) };
}

// ```python file=src/viewport.py  →  { lang: 'python', file: 'src/viewport.py' }
function parseFenceInfo(info) {
  const parts = (info || '').trim().split(/\s+/);
  const lang = parts[0] || '';
  const attrs = {};
  for (const part of parts.slice(1)) {
    const idx = part.indexOf('=');
    if (idx > 0) attrs[part.slice(0, idx)] = part.slice(idx + 1).replace(/^["']|["']$/g, '');
  }
  return { lang, file: attrs.file || null, edit: attrs.edit || null, mode: attrs.mode || 'append', provided: parts.includes('provided') };
}

/**
 * Split a step's body into { prose, target, file, lang, explain, checks }.
 * The first fence carrying a `file=` attribute is the step's target; prose
 * is what precedes it, explanation is what follows.
 */
function parseStepBody(rawBody) {
  const checks = [];
  const predictions = [];
  const hints = [];
  const body = rawBody
    .replace(/```check[^\n]*\n([\s\S]*?)```\n?/g, (_, inner) => {
      checks.push(...parseChecks(inner));
      return '';
    })
    // A ```predict fence (predictions.js) stays where it was written, as a marker line the
    // lesson panel replaces with the prediction box.
    .replace(/```predict[^\n]*\n([\s\S]*?)```\n?/g, (_, inner) => {
      predictions.push(parsePrediction(inner));
      return `\n${MARKER(predictions.length - 1)}\n\n`;
    })
    // A ```hints fence (hints.js) works the same way: the panel shows its rungs one at a time.
    .replace(/```hints[^\n]*\n([\s\S]*?)```\n?/g, (_, inner) => {
      hints.push(parseHints(inner));
      return `\n${HINTS_MARKER(hints.length - 1)}\n\n`;
    });

  const fenceRe = /```([^\n]*)\n([\s\S]*?)```/g;
  // Only the first `file=` block is the step's target. Any later one would be shown as an
  // ordinary code block and never opened or checked, so it's recorded for the lesson tests to
  // reject: a step changes one file.
  const fileFences = [...body.matchAll(fenceRe)].filter((m) => parseFenceInfo(m[1]).file);
  const extraTargets = fileFences.slice(1).map((m) => parseFenceInfo(m[1]).file);
  const edits = [...body.matchAll(fenceRe)].filter(m => parseFenceInfo(m[1]).edit);
  if (edits.length) {
    if (edits.length !== 1 || fileFences.length) throw new Error('An edit step must contain exactly one edit fence and no full-file target');
    const m = edits[0];
    const { edit: file, lang, mode } = parseFenceInfo(m[1]);
    if (!['append', 'replace'].includes(mode)) throw new Error(`Unknown edit mode: ${mode}`);
    return { prose: body.trim(), explain: '', file, lang, target: null, checks, predictions, hints,
      edit: { mode, code: m[2] }, extraTargets: [] };
  }
  let match;
  while ((match = fenceRe.exec(body)) !== null) {
    const { lang, file, provided } = parseFenceInfo(match[1]);
    if (!file) continue;
    return {
      prose: body.slice(0, match.index).trim(),
      explain: body.slice(match.index + match[0].length).trim(),
      target: match[2].replace(/\n$/, ''),
      file,
      lang,
      provided,
      checks,
      predictions,
      hints,
      extraTargets,
    };
  }
  // A step with no target file is legitimate — a pure "read this / predict
  // what happens" beat between two code steps, or a step done in the terminal.
  return { prose: body.trim(), explain: '', target: null, file: null, lang: null, checks, predictions, hints };
}

export function parseLesson(text, id) {
  // Files checked out on Windows can have CRLF line endings; every pattern here expects \n.
  const { meta, body } = parseFrontmatter(String(text).replace(/\r\n/g, '\n'));

  // Split on level-2 headings: "## Step 1 — Title" (any "## " heading, so a
  // lesson can also open with "## Overview" before its first step).
  const parts = body.split(/^##\s+(.+?)\s*$/m);
  const intro = parts[0].trim();

  const steps = [];
  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i];
    const parsed = parseStepBody(parts[i + 1] ?? '');
    steps.push({ id: `${id}-step-${steps.length + 1}`, title: heading, optional: meta.pedagogy === 'typed' && /^Challenge\s*[—:-]/i.test(heading), ...parsed });
  }

  return {
    id,
    title: meta.title || id,
    runtime: meta.runtime || 'python',
    run: meta.run || null,
    meta,
    intro,
    steps,
  };
}
