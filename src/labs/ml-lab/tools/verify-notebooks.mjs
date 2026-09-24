// Runs every lesson notebook (all cells of a notebook in one process, in order) with a local
// Python that has numpy/pandas/scikit-learn. Usage: node verify-notebooks.mjs /path/to/python [lab numbers...]
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { readdirSync } from 'node:fs'

const [python = 'python', ...only] = process.argv.slice(2)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dirs = readdirSync(join(root, 'labs')).filter(d => /^l\d\d-/.test(d)).sort()
const out = mkdtempSync(join(tmpdir(), 'ml-notebooks-'))
let failures = 0, count = 0
for (const dir of dirs) {
  const number = Number(dir.slice(1, 3))
  if (only.length && !only.map(Number).includes(number)) continue
  const file = number === 1 ? join(root, 'lessons.js') : join(root, 'labs', dir, 'lessons.js')
  const { lessons } = await import(pathToFileURL(file))
  for (const lesson of lessons.filter(l => l.notebook)) {
    count++
    const script = join(out, `${lesson.id}.py`)
    writeFileSync(script, lesson.notebook.cells.map((c, i) => `# --- cell ${i + 1}: ${c.title ?? ''}\n${c.code}\n`).join('\n'))
    const r = spawnSync(python, [script], { encoding: 'utf8', timeout: 120000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
    if (r.status !== 0) { failures++; console.log(`✗ ${lesson.id}\n${(r.stderr || r.error?.message || '').split('\n').slice(-8).join('\n')}`) }
    else console.log(`✓ ${lesson.id}`)
  }
}
console.log(`${count - failures}/${count} notebooks ran without error`)
process.exit(failures ? 1 : 0)
