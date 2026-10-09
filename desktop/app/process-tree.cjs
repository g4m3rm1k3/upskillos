// process-tree.cjs
// Ending a program properly means ending everything it started too. On Windows, killing a
// process leaves its children running (a shell's `node`, a Python script's subprocess), and
// they keep the project folder locked. taskkill /T ends the whole tree. On macOS and Linux,
// child.kill() ends only the child too, so the tree is collected from `ps` first: once the parent
// is gone, its children belong to process 1 and can't be traced back to it.
const { execFileSync, spawn } = require('node:child_process')

function descendants(pid) {
  let out = ''
  try { out = execFileSync('ps', ['-A', '-o', 'pid=,ppid='], { encoding: 'utf8' }) } catch { return [] }
  const children = new Map()
  for (const line of out.split('\n')) {
    const [p, parent] = line.trim().split(/\s+/).map(Number)
    if (!p) continue
    if (!children.has(parent)) children.set(parent, [])
    children.get(parent).push(p)
  }
  const found = []
  const stack = [pid]
  while (stack.length) {
    for (const c of children.get(stack.pop()) ?? []) { found.push(c); stack.push(c) }
  }
  return found
}

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
      const tree = child.pid ? descendants(child.pid) : []
      try { child.kill('SIGKILL') } catch {}
      for (const pid of tree) { try { process.kill(pid, 'SIGKILL') } catch {} }
      resolve()
    }
  })
}

module.exports = { killTree }
