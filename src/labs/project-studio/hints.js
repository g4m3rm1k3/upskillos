// hints.js
// A hint ladder: a ```hints fence in a lesson step gives help one rung at a time, each rung
// giving away a little more, so the learner takes only as much help as they need.
//
//   ```hints
//   nudge: What does the failing check expect the program to print?
//   concept: sys.argv is a list; the first item is the script's own name.
//   shape: Check the list's length first; print the usage line and exit if it's too short.
//   answer: The full answer, usually with a code block and why it's written that way.
//   ```
//
// Rungs must come in this order, and any of them may be left out, but there must be at least
// one. A line that doesn't start with a key continues the rung before it, so a rung can hold
// several paragraphs and code blocks (indent nothing: a nested ``` fence would end this one,
// so code inside a rung uses ~~~ fences).
export const RUNGS = [
  ['nudge', 'A nudge'],
  ['concept', 'The idea that solves it'],
  ['shape', 'The shape of the answer'],
  ['answer', 'The answer'],
];
const KEYS = RUNGS.map(([key]) => key);

export function parseHints(raw) {
  const found = [];
  for (const line of raw.replace(/\r\n/g, '\n').split('\n')) {
    const m = line.match(/^(\w+):\s?(.*)$/);
    if (m && KEYS.includes(m[1])) {
      const previous = found[found.length - 1];
      if (previous && KEYS.indexOf(m[1]) <= KEYS.indexOf(previous.key)) {
        throw new Error(`Hint rung "${m[1]}" is out of order (order: ${KEYS.join(', ')})`);
      }
      found.push({ key: m[1], text: m[2] });
      continue;
    }
    if (!found.length) {
      if (line.trim()) throw new Error(`Hint line before any rung: ${line}`);
      continue;
    }
    found[found.length - 1].text += `\n${line}`;
  }
  if (!found.length) throw new Error('A hints fence needs at least one rung');
  return found.map(({ key, text }) => {
    const body = text.trim();
    if (!body) throw new Error(`Hint rung "${key}" is empty`);
    return { key, label: RUNGS.find(([k]) => k === key)[1], text: body };
  });
}

export const HINTS_MARKER = (i) => `@@hints-${i}@@`;

// Splits step prose on prediction and hint markers. The result alternates text, kind, index:
// ['text', 'predict', '0', 'more text', 'hints', '0', 'end'].
export const BLOCK_SPLIT = /^@@(predict|hints)-(\d+)@@$/m;
