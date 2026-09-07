// Starts the Vite dev server and Electron concurrently for desktop development.
// Waits for Vite to be reachable before launching Electron so the renderer
// doesn't load before the dev server is ready.
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const require = createRequire(import.meta.url)

const VITE_PORT = process.env.VITE_PORT ?? 5173

// ── 1. Start Vite ────────────────────────────────────────────────────────────

// Invoke Vite's own JS entry point directly via `node`, not `npx`/`npx.cmd` —
// spawning a bare '.cmd' file on Windows without `shell: true` throws
// `spawn EINVAL` on current Node versions (a real, confirmed-live failure;
// unrelated to `shell: true`'s own quoting concerns, this just sidesteps
// the whole npx-resolution step). Same direct-vite-entry-point pattern
// already used by desktop-release.yml's CI build, so this is one fewer
// invocation style to keep in sync, not a new one.
const vite = spawn(
  process.execPath,
  [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(VITE_PORT)],
  { cwd: root, stdio: 'inherit', env: { ...process.env } }
)

vite.on('error', (e) => { console.error('Vite failed to start:', e.message); process.exit(1) })

// ── 2. Wait for Vite to be ready ─────────────────────────────────────────────

async function waitForVite(port, timeout = 30_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://localhost:${port}/`, { signal: AbortSignal.timeout(1000) })
      if (r.ok || r.status === 404) return // server is up
    } catch {}
    await new Promise(r => setTimeout(r, 400))
  }
  throw new Error(`Vite did not become ready within ${timeout}ms`)
}

console.log(`Waiting for Vite on port ${VITE_PORT}…`)
await waitForVite(VITE_PORT)
console.log('Vite ready — launching Electron')

// ── 3. Launch Electron ───────────────────────────────────────────────────────

const electronBin = require('electron')
const electron = spawn(
  electronBin,
  [path.join(root, 'desktop/app/main.cjs')],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, VITE_PORT: String(VITE_PORT) },
  }
)

electron.on('close', (code) => {
  vite.kill()
  process.exit(code ?? 0)
})

process.on('SIGINT', () => { electron.kill(); vite.kill() })
process.on('SIGTERM', () => { electron.kill(); vite.kill() })
