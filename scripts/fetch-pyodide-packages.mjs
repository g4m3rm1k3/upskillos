#!/usr/bin/env node
// Copies Pyodide's package wheels (numpy, pandas, pygame-ce, ...) into
// .cache/pyodide-packages/<version>/, from which the build ships them in
// dist/pyodide/. The site and the desktop app then load them from their own
// files instead of the jsDelivr CDN. Which packages: scripts/pyodide-bundle.mjs.
//
// The npm package `pyodide` ships only the core runtime. Every wheel it can
// load is listed in its pyodide-lock.json with a sha256; each download is
// checked against it, so a changed or corrupted file is rejected, never served.
// Files already in the cache with the right checksum are not downloaded again,
// so with a full cache this makes no network requests.
//
//   node scripts/fetch-pyodide-packages.mjs           the bundled packages
//   node scripts/fetch-pyodide-packages.mjs --all     every package in the lockfile (~440 MB)
//   node scripts/fetch-pyodide-packages.mjs --check   verify the cache, download nothing
//   node scripts/fetch-pyodide-packages.mjs --optional  warn instead of failing (npm run dev, offline)
//   PYODIDE_MIRROR=<url> ...                          try another mirror before the CDN
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { bundledEntries, pyodideInfo } from './pyodide-bundle.mjs'

const info = pyodideInfo()
const { version, lock, cacheDir } = info
const sources = [process.env.PYODIDE_MIRROR, info.cdnUrl]
  .filter(Boolean)
  .map(url => (url.endsWith('/') ? url : `${url}/`))

const checkOnly = process.argv.includes('--check')
const packages = process.argv.includes('--all') ? Object.values(lock.packages) : bundledEntries(lock)

const sha256 = buffer => createHash('sha256').update(buffer).digest('hex')

function cachedOk(pkg) {
  const file = path.join(cacheDir, pkg.file_name)
  return fs.existsSync(file) && sha256(fs.readFileSync(file)) === pkg.sha256
}

async function download(pkg) {
  const errors = []
  for (const base of sources) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(base + pkg.file_name)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const buffer = Buffer.from(await response.arrayBuffer())
        const actual = sha256(buffer)
        if (actual !== pkg.sha256) throw new Error(`sha256 ${actual}, lockfile says ${pkg.sha256}`)
        // Write to a temporary name first, so an interrupted run never leaves a partial wheel.
        const target = path.join(cacheDir, pkg.file_name)
        fs.writeFileSync(`${target}.part`, buffer)
        fs.renameSync(`${target}.part`, target)
        return buffer.length
      } catch (error) {
        errors.push(`${base}: ${error.message}`)
      }
    }
  }
  throw new Error(`${pkg.file_name}\n    ${errors.join('\n    ')}`)
}

fs.mkdirSync(cacheDir, { recursive: true })
const missing = packages.filter(pkg => !cachedOk(pkg))
const where = path.relative(process.cwd(), cacheDir)

if (checkOnly) {
  if (missing.length) {
    console.error(`${missing.length} of ${packages.length} Pyodide packages are missing from ${where} or don't match the lockfile, for example ${missing[0].file_name}.`)
    console.error('Run: node scripts/fetch-pyodide-packages.mjs')
    process.exit(1)
  }
  console.log(`All ${packages.length} Pyodide ${version} packages are in ${where} and match the lockfile.`)
  process.exit(0)
}

if (!missing.length) {
  console.log(`Pyodide ${version}: all ${packages.length} packages are cached in ${where}.`)
  process.exit(0)
}

let bytes = 0
let done = 0
const failures = []
const queue = [...missing]
async function worker() {
  for (let pkg = queue.shift(); pkg; pkg = queue.shift()) {
    try {
      // Not `bytes += await ...`: that reads `bytes` before the await, so
      // parallel downloads would overwrite each other's totals.
      const size = await download(pkg)
      bytes += size
    } catch (error) {
      failures.push(error.message)
    }
    done++
    if (done % 25 === 0 || done === missing.length) console.log(`  ${done}/${missing.length} downloaded`)
  }
}

console.log(`Pyodide ${version}: ${packages.length - missing.length} of ${packages.length} packages cached; fetching ${missing.length}.`)
await Promise.all(Array.from({ length: 8 }, worker))

if (failures.length) {
  console.error(`\n${failures.length} packages failed:\n  ${failures.join('\n  ')}`)
  if (process.argv.includes('--optional')) {
    console.warn('Continuing: those packages will load from the CDN until this succeeds.')
    process.exit(0)
  }
  process.exit(1)
}
console.log(`Done: ${(bytes / 1e6).toFixed(1)} MB downloaded into ${where}; all checksums match the lockfile.`)
