// Which Pyodide packages the app serves from its own files, and the lockfile
// that tells Pyodide where to find every package. Used by vite.config.js
// (dev server and build) and scripts/fetch-pyodide-packages.mjs.
import fs from 'node:fs'
import path from 'node:path'

// Packages the app's own lessons, labs and notebooks import, found by scanning
// src/ for Python imports. Their dependencies are added automatically. Any
// other package a learner imports still loads, from the CDN.
// PYODIDE_BUNDLE=all bundles every package except Pyodide's own test suites.
export const BUNDLED_PACKAGES = [
  'aiohttp', 'argon2-cffi', 'bcrypt', 'beautifulsoup4', 'click', 'coverage',
  'cryptography', 'decorator', 'fastapi', 'httpx', 'ipython', 'jinja2', 'joblib',
  'matplotlib', 'micropip', 'msgpack', 'networkx', 'numpy', 'packaging',
  'pandas', 'pillow', 'pyclipper', 'pycryptodome', 'pydantic', 'pygame-ce',
  'pytest', 'pytest-asyncio', 'pyyaml', 'regex', 'requests', 'rich',
  'scikit-learn', 'scipy', 'six', 'sqlalchemy', 'sqlite3', 'ssl',
  'statsmodels', 'sympy', 'tiktoken', 'xlrd',
]

const normalise = name => name.toLowerCase().replace(/[-_.]+/g, '-')

export function pyodideInfo(root = process.cwd()) {
  const coreDir = path.join(root, 'node_modules', 'pyodide')
  const { version } = JSON.parse(fs.readFileSync(path.join(coreDir, 'package.json'), 'utf8'))
  const lock = JSON.parse(fs.readFileSync(path.join(coreDir, 'pyodide-lock.json'), 'utf8'))
  return {
    version,
    lock,
    coreDir,
    cacheDir: path.join(root, '.cache', 'pyodide-packages', version),
    cdnUrl: `https://cdn.jsdelivr.net/pyodide/v${version}/full/`,
  }
}

const isTestSuite = pkg => pkg.name.endsWith('-tests') || pkg.name === 'test'

// Lockfile entries to bundle: the chosen packages plus everything they depend on.
export function bundledEntries(lock, mode = process.env.PYODIDE_BUNDLE) {
  const byName = new Map(Object.entries(lock.packages).map(([key, pkg]) => [normalise(key), pkg]))
  if (mode === 'all') return [...byName.values()].filter(pkg => !isTestSuite(pkg))
  const chosen = new Map()
  const add = name => {
    const pkg = byName.get(normalise(name))
    if (!pkg) throw new Error(`"${name}" is not a package in Pyodide's lockfile`)
    if (chosen.has(pkg.name)) return
    chosen.set(pkg.name, pkg)
    for (const dependency of pkg.depends || []) add(dependency)
  }
  BUNDLED_PACKAGES.forEach(add)
  return [...chosen.values()]
}

// The lockfile the app serves. Bundled packages keep their plain file name, so
// Pyodide fetches them next to the lockfile; every other package gets the CDN's
// full URL. Pyodide checks each download against the sha256 in either case.
export function servedLock({ lock, cdnUrl }, localFiles) {
  const packages = {}
  for (const [key, pkg] of Object.entries(lock.packages)) {
    packages[key] = localFiles.has(pkg.file_name) ? pkg : { ...pkg, file_name: cdnUrl + pkg.file_name }
  }
  return { ...lock, packages }
}
