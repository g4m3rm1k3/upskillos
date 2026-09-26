// Build-only: serve lazily loaded raw text as plain static files.
//
//   import.meta.glob('../posts/**/*.md', { query: '?raw', import: 'default' })
//
// normally turns every matched file into its own JavaScript module that Rollup
// parses, keeps in memory for the whole build and writes out as a chunk. There
// are thousands of these (docs, posts, lesson sources), and they were a large
// share of the build's memory.
//
// This plugin rewrites such globs into the same object Vite would produce —
// identical keys, each value a function returning a Promise of the text — but
// the files are emitted as assets and fetched on demand. Callers are unchanged.
//
// Only lazy globs with exactly { query: '?raw', import: 'default' } are
// rewritten; eager globs, other queries and negative patterns are left to Vite.
// Dev is untouched (apply: 'build').
import { readFileSync } from 'node:fs'
import { basename, dirname, posix, relative } from 'node:path'
import fg from 'fast-glob'
import { stripLiteral } from 'strip-literal'

const toPosix = p => p.split('\\').join('/')

// Find the argument text of each real `import.meta.glob(...)` call. Matching runs
// on the code with strings and comments blanked out (positions are preserved),
// so example code inside lesson text is never rewritten.
function findGlobCalls(original) {
  const code = stripLiteral(original)
  const calls = []
  const marker = 'import.meta.glob('
  let from = 0
  for (;;) {
    const start = code.indexOf(marker, from)
    if (start < 0) return calls
    let depth = 1, i = start + marker.length, quote = null
    for (; i < code.length && depth > 0; i++) {
      const c = code[i]
      if (quote) { if (c === '\\') i++; else if (c === quote) quote = null }
      else if (c === '"' || c === "'" || c === '`') quote = c
      else if (c === '(') depth++
      else if (c === ')') depth--
    }
    calls.push({ start, end: i, args: original.slice(start + marker.length, i - 1) })
    from = i
  }
}

// The arguments are literals (a pattern string or array, and an options object).
function parseArgs(args) {
  try { return new Function(`return [${args}]`)() } catch { return null }
}

export default function rawGlobAssets() {
  let root
  const refs = new Map() // absolute file → emitted asset reference

  return {
    name: 'raw-glob-assets',
    apply: 'build',
    enforce: 'pre',
    configResolved(config) { root = config.root },
    async transform(code, id) {
      if (id.includes('node_modules') || !/\.(m?[jt]sx?)$/.test(id.split('?')[0]) || !code.includes('import.meta.glob(')) return null
      const importerDir = dirname(id.split('?')[0])
      let out = code, changed = false
      for (const call of findGlobCalls(code).reverse()) {
        const parsed = parseArgs(call.args)
        if (!parsed) continue
        const [pattern, options = {}] = parsed
        const patterns = Array.isArray(pattern) ? pattern : [pattern]
        const optionKeys = Object.keys(options).sort().join(',')
        if (optionKeys !== 'import,query' || options.query !== '?raw' || options.import !== 'default') continue
        if (patterns.some(p => typeof p !== 'string' || p.startsWith('!'))) continue

        const isRelative = patterns[0].startsWith('.')
        const absolutePatterns = patterns.map(p => toPosix(p.startsWith('/') ? posix.join(toPosix(root), p) : posix.join(toPosix(importerDir), p)))
        const files = (await fg(absolutePatterns, { absolute: true, dot: false, ignore: ['**/node_modules/**'] }))
          .filter(f => f !== toPosix(id)).sort()

        const props = files.map(file => {
          let ref = refs.get(file)
          if (!ref) {
            ref = this.emitFile({ type: 'asset', name: basename(file), source: readFileSync(file) })
            refs.set(file, ref)
          }
          let key
          if (isRelative) { key = toPosix(relative(importerDir, file)); if (key[0] !== '.') key = `./${key}` }
          else { key = toPosix(relative(root, file)); if (key[0] !== '.') key = `/${key}` }
          return `${JSON.stringify(key)}: () => __rawGlobText(import.meta.ROLLUP_FILE_URL_${ref})`
        })
        out = `${out.slice(0, call.start)}({${props.join(',\n')}})${out.slice(call.end)}`
        changed = true
      }
      if (!changed) return null
      const helper = 'const __rawGlobText = url => fetch(url).then(r => { if (!r.ok) throw new Error(`Failed to load ${url}: ${r.status}`); return r.text() });\n'
      return { code: helper + out, map: null }
    },
  }
}
