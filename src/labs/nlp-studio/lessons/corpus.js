// The lab's own lesson text as a sample to count: real English, long enough for Zipf's law to
// show, and nobody else's writing. Maths, code spans and Markdown marks are taken out first.
import { LESSONS } from './index.js'

let cached = null
export function corpus() {
  cached ??= LESSONS.flatMap(l => l.blocks.flatMap(b => [b.md, b.note].filter(Boolean)))
    .join('\n\n')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$\n]*\$/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/[*_#>|]/g, ' ')
    .replace(/[ \t]+/g, ' ')
  return cached
}
