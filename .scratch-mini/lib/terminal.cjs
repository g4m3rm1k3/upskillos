let pty = null
let loadError = null
// node-pty is a native module. Load it on first use so a broken install shows up as a message in the
// terminal pane, not as a crash at startup.
function loadPty() {
  if (pty || loadError) return pty
  try { pty = require('node-pty') } catch (e) { loadError = e }
  return pty
}

const terminals = new Map()

function start({ cwd }, send) {
  const lib = loadPty()
  if (!lib) return { ok: false, reason: `The terminal couldn't start: ${loadError.message}` }
  const file = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/zsh')
  const proc = lib.spawn(file, process.platform === 'win32' ? ['-NoLogo'] : ['-l'], {
    name: 'xterm-256color', cols: 80, rows: 24, cwd, env: process.env,
  })
  const id = `term-${terminals.size + 1}-${Date.now()}`
  terminals.set(id, proc)
  proc.onData((data) => send('terminal:data', { id, data }))
  proc.onExit(({ exitCode }) => { terminals.delete(id); send('terminal:data', { id, data: `\r\n[shell exited ${exitCode}]\r\n` }) })
  return { ok: true, id }
}

const write = (id, data) => terminals.get(id)?.write(data)
const resize = (id, cols, rows) => { try { terminals.get(id)?.resize(cols, rows) } catch {} }
function killAll() { for (const [id, t] of terminals) { terminals.delete(id); try { t.kill() } catch {} } }

module.exports = { start, write, resize, killAll }
