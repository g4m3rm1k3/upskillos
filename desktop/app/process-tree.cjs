// process-tree.cjs
// Ending a program properly means ending everything it started too. On Windows, killing a
// process leaves its children running (a shell's `node`, a Python script's subprocess), and
// they keep the project folder locked. taskkill /T ends the whole tree.
const { spawn } = require('node:child_process')

// Resolves once the processes are gone, so the caller can safely delete or reuse the folder.
function killTree(child) {
  return new Promise((resolve) => {
    if (child.exitCode != null) return resolve()
    if (process.platform === 'win32' && child.pid) {
      try {
        const k = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
        k.on('close', () => resolve())
        k.on('error', () => resolve())
      } catch { resolve() }
    } else {
      try { child.kill('SIGKILL') } catch {}
      resolve()
    }
  })
}

module.exports = { killTree }
