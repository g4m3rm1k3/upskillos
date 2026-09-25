// Runs every coding ladder's checks through a real Python (the same harness the app sends to
// Pyodide): accepted solutions must pass and each planted mistake must fail with its diagnosis.
// Usage: node verify-ladders.mjs /path/to/python-with-numpy
//    or: node verify-ladders.mjs /path/to/pyodide@0.26.4/pyodide.mjs   (the release the app loads)
import { spawnSync } from 'node:child_process'
import { readdirSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { buildCheck, buildProbe, parseCheck, grade } from '../kit/ladder.js'

const [python = 'python3'] = process.argv.slice(2)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let failures = 0, count = 0

let py = null
if (python.endsWith('.mjs')) {
  const { loadPyodide } = await import(pathToFileURL(resolve(python)))
  py = await loadPyodide({ packageBaseUrl: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/' })
  await py.loadPackage(['numpy'], { messageCallback: () => {} })
  console.log(`Pyodide ${py.version}`)
}
async function execute(harness, learner) {
  if (!py) {
    const r = spawnSync(python, ['-c', harness], { encoding: 'utf8', timeout: 60000 })
    return r.status === 0 ? { stdout: r.stdout } : { failed: `python exited ${r.status}: ${r.stderr}` }
  }
  await py.loadPackagesFromImports(learner).catch(() => {})     // as the app's worker does (importsFrom)
  let stdout = ''
  py.setStdout({ batched: t => { stdout += `${t}\n` } })
  const scope = py.toPy({})
  try { await py.runPythonAsync(harness, { globals: scope }); return { stdout } } catch (e) { return { failed: String(e.message) } } finally { scope.destroy() }
}

async function runStep(step, code) {
  const harness = step.kind === 'probe' ? buildProbe(code, step.probe) : buildCheck(code, step.check)
  const r = await execute(harness, code)
  if (r.failed) return { passed: false, summary: r.failed }
  const { report } = parseCheck(r.stdout)
  if (step.kind === 'probe') {
    if (!report?.ok) return { passed: false, summary: report?.error ?? 'no report' }
    const e = step.evaluate(report.vars)
    return { passed: e.passed, summary: e.message, lines: [] }
  }
  return grade(report, step.check.cases, step.check)
}
const all = g => [g.summary, g.error, ...(g.lines ?? []).flatMap(l => [l.text, l.hint, l.error])].filter(Boolean).join('\n')

for (const dir of readdirSync(join(root, 'labs')).filter(d => /^l\d\d-/.test(d)).sort()) {
  const file = join(root, 'labs', dir, 'ladder.verify.js')
  if (!existsSync(file)) continue
  const { verify } = await import(pathToFileURL(file))
  const specs = await import(pathToFileURL(join(root, 'labs', dir, 'ladder.js')))
  for (const [name, v] of Object.entries(verify)) {
    const spec = specs[name]
    const stepById = Object.fromEntries(spec.steps.map(s => [s.id, s]))
    for (const [id, codes] of Object.entries(v.pass)) for (const make of [].concat(codes)) {
      count++
      const g = await runStep(stepById[id], make(stepById[id]))
      if (!g.passed) { failures++; console.log(`✗ ${name}/${id} should pass:\n${all(g)}`) } else console.log(`✓ ${name}/${id} accepts a correct solution`)
    }
    for (const [id, cases] of Object.entries(v.fail)) for (const c of cases) {
      count++
      const g = await runStep(stepById[id], c.code(stepById[id])), text = all(g)
      const want = c.hint ?? c.error ?? c.text ?? c.message
      if (g.passed || !want.test(text)) { failures++; console.log(`✗ ${name}/${id} should fail with ${want}:\n${text}`) } else console.log(`✓ ${name}/${id} rejects a mistake: ${want}`)
    }
  }
}
console.log(`${count - failures}/${count} ladder checks behaved as expected`)
process.exit(failures ? 1 : 0)
