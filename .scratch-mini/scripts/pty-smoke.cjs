// Starts the terminal module with no window at all, types a command, and waits for its output.
// The command prints 42 without ever containing the text "42", so the shell echoing our typing
// back can't fool the check.
const terminal = require('../lib/terminal.cjs')

// A terminal sends colour and cursor codes along with the text. xterm.js draws them; here we drop them.
const plain = (s) => s.replace(/\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*\x07/g, '')

let seen = ''
const started = terminal.start({ cwd: process.cwd() }, (_channel, { data }) => {
  seen += data
  if (/(^|\n)42\r?\n/.test(plain(seen))) {
    console.log('terminal works')
    terminal.killAll()
    process.exit(0)
  }
})
if (!started.ok) {
  console.error(started.reason)
  process.exit(1)
}
terminal.write(started.id, 'node -p 6*7\r')
setTimeout(() => {
  console.error('no answer after 10 seconds. Output so far:', JSON.stringify(seen.slice(-300)))
  terminal.killAll()
  process.exit(1)
}, 10000)
