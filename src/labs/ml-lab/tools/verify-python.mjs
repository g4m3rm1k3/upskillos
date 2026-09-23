// Runs every lab's reference solution against its own checks with a local
// Python, and confirms the untouched starter does NOT pass. Usage:
//   node src/labs/ml-lab/tools/verify-python.mjs [python-executable] [lab numbers...]
// The Python must have the packages each lab declares (numpy, pandas, ...).
import { readdirSync, writeFileSync, mkdtempSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url)), labsDir = join(here, '..', 'labs')
const [python = 'python3', ...only] = process.argv.slice(2)
const dir = mkdtempSync(join(tmpdir(), 'ml-lab-verify-'))
let failures = 0
for (const folder of readdirSync(labsDir).filter(f => /^l\d\d-/.test(f)).sort()) {
  const number = Number(folder.slice(1, 3))
  if (only.length && !only.includes(String(number))) continue
  let py
  try { py = (await import(pathToFileURL(join(labsDir, folder, 'python.js')))).default } catch { continue }
  const run = (label, code) => {
    const file = join(dir, `${folder}-${label}.py`)
    writeFileSync(file, `${code}\n${py.checks}`)
    return spawnSync(python, [file], { encoding: 'utf8', timeout: 120000 })
  }
  const good = run('solution', py.solution), bad = run('starter', py.starter)
  const ok = good.status === 0, starterFails = bad.status !== 0
  if (!ok || !starterFails) failures++
  console.log(`${ok && starterFails ? 'OK  ' : 'FAIL'} lab ${number}: solution ${ok ? 'passes' : 'FAILS'}; starter ${starterFails ? 'fails as expected' : 'PASSES (checks too weak)'}`)
  if (!ok) console.log(good.error ? `     could not run ${python}: ${good.error.message}` : `${good.stdout ?? ''}${good.stderr ?? ''}`.split('\n').slice(-15).join('\n'))
  else console.log('     ' + good.stdout.trim().split('\n').join('\n     '))
  if (py.local) {
    const file = join(dir, `${folder}-${py.local.filename}`)
    writeFileSync(file, py.local.code)
    const r = spawnSync(python, [file], { encoding: 'utf8', timeout: 300000, cwd: dir })
    const missing = /ModuleNotFoundError/.test(r.stderr)
    if (r.status !== 0 && !missing) failures++
    console.log(`     local script ${py.local.filename}: ${r.status === 0 ? 'OK' : missing ? 'SKIPPED (package not installed)' : 'FAIL\n' + r.stderr.split('\n').slice(-8).join('\n')}`)
  }
}
process.exit(failures ? 1 : 0)
