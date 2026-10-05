// figures.js
// Interactive figures in a lesson: a ```figure fence places one between paragraphs, where it
// was written, the way prediction and hint fences do.
//
//   ```figure
//   name: aml/MeanMedianOutlier
//   caption: Drag the slowest run. The mean follows it; the median doesn't.
//   props: {"values": [4.1, 4.1, 3.8, 4.0, 4.3]}
//   ```
//
// `name` is <module>/<export>, resolved by figures/index.js. `caption` is Markdown. `props`
// is one line of JSON passed to the figure component. A line that doesn't start with a key
// continues the caption.
const KEYS = ['name', 'caption', 'props'];

export function parseFigure(raw) {
  const fields = { name: '', caption: '', props: {} };
  let propsText = null;
  let last = null;
  for (const line of raw.replace(/\r\n/g, '\n').split('\n')) {
    const m = line.match(/^(\w+):\s?(.*)$/);
    if (m && KEYS.includes(m[1])) {
      last = m[1];
      if (last === 'props') propsText = m[2];
      else fields[last] = m[2];
      continue;
    }
    if (!last) {
      if (line.trim()) throw new Error(`Figure line before any key: ${line}`);
      continue;
    }
    if (last === 'caption') fields.caption += `\n${line}`;
    else if (line.trim()) throw new Error(`Figure ${last} must fit on one line: ${line}`);
  }
  fields.name = fields.name.trim();
  fields.caption = fields.caption.trim();
  if (!/^[\w-]+\/[\w/-]*\w$/.test(fields.name)) throw new Error(`A figure needs a name like aml/MeanMedianOutlier, got "${fields.name}"`);
  if (propsText != null && propsText.trim()) {
    try {
      fields.props = JSON.parse(propsText);
    } catch (e) {
      throw new Error(`Figure ${fields.name} has props that aren't JSON: ${e.message}`);
    }
    if (typeof fields.props !== 'object' || Array.isArray(fields.props) || fields.props === null) {
      throw new Error(`Figure ${fields.name} props must be a JSON object`);
    }
  }
  return fields;
}

export const FIGURE_MARKER = (i) => `@@figure-${i}@@`;
