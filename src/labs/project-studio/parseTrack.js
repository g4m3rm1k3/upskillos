// parseTrack.js
// Turns a lesson markdown file into ordered steps.
//
// Format (see tracks/*/*.md):
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
  return { lang, file: attrs.file || null };
}

/**
 * Split a step's body into { prose, target, file, lang, explain }.
 * The first fence carrying a `file=` attribute is the step's target; prose
 * is what precedes it, explanation is what follows.
 */
function parseStepBody(body) {
  const fenceRe = /```([^\n]*)\n([\s\S]*?)```/g;
  let match;
  while ((match = fenceRe.exec(body)) !== null) {
    const { lang, file } = parseFenceInfo(match[1]);
    if (!file) continue;
    return {
      prose: body.slice(0, match.index).trim(),
      explain: body.slice(match.index + match[0].length).trim(),
      target: match[2].replace(/\n$/, ''),
      file,
      lang,
    };
  }
  // A step with no target file is legitimate — a pure "read this / predict
  // what happens" beat between two code steps.
  return { prose: body.trim(), explain: '', target: null, file: null, lang: null };
}

export function parseLesson(text, id) {
  const { meta, body } = parseFrontmatter(text);

  // Split on level-2 headings: "## Step 1 — Title" (any "## " heading, so a
  // lesson can also open with "## Overview" before its first step).
  const parts = body.split(/^##\s+(.+?)\s*$/m);
  const intro = parts[0].trim();

  const steps = [];
  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i];
    const parsed = parseStepBody(parts[i + 1] ?? '');
    steps.push({ id: `${id}-step-${steps.length + 1}`, title: heading, ...parsed });
  }

  return {
    id,
    title: meta.title || id,
    runtime: meta.runtime || 'python',
    run: meta.run || null,
    intro,
    steps,
  };
}
