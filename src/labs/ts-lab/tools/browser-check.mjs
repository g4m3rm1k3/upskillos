// TypeScript Lab type-checking in a real browser. It starts its own dev server (and always stops it),
// opens the lab, types a line with a type error into the Monaco editor, and checks that Monaco's
// TypeScript worker draws a red underline under it and lists the error in its markers.
//
//   node src/labs/ts-lab/tools/browser-check.mjs [out-folder]
import { chromium } from 'playwright'
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const out = process.argv[2] ?? path.join(process.env.TEMP ?? '/tmp', 'ts-lab-check')
mkdirSync(out, { recursive: true })
const PORT = 5198, URL = `http://127.0.0.1:${PORT}/#/lab/ts-lab`
const root = path.resolve(import.meta.dirname, '../../../..')

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: root, shell: true, stdio: 'ignore' })
// On Windows the server runs under a shell, so its whole process tree is ended (/T).
const stopServer = () => { try { process.platform === 'win32' ? spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F']) : server.kill() } catch { /* already gone */ } }
process.on('exit', stopServer)

const problems = []
const logs = []
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 920 } })
  page.on('pageerror', e => problems.push(`page error: ${e}`))
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${m.text().slice(0, 300)}`) })
  page.on('worker', w => logs.push(`worker started: ${w.url().slice(0, 160)}`))
  await page.addInitScript(() => { try { localStorage.setItem('oc-tour-seen', '1') } catch {} })
  for (let i = 0; i < 90; i++) { try { await page.goto(URL, { timeout: 60000 }); break } catch { await new Promise(r => setTimeout(r, 2000)) } }
  const skip = page.getByRole('button', { name: 'Skip' }); if (await skip.isVisible({ timeout: 5000 }).catch(() => false)) await skip.click()

  const editor = page.locator('.monaco-editor').first()
  await editor.waitFor({ timeout: 180000 })
  await editor.click()
  await page.keyboard.press('Control+End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('const notANumber: number = "seven"')

  // The worker checks after a short pause; give it up to 30 s.
  const squiggle = page.locator('.monaco-editor .squiggly-error')
  const t0 = Date.now()
  const seen = await squiggle.first().waitFor({ timeout: 30000 }).then(() => true, () => false)
  const count = await squiggle.count()
  console.log(seen ? `red underlines: ${count} (after ${((Date.now() - t0) / 1000).toFixed(1)} s)` : 'red underlines: none after 30 s')
  if (!seen) problems.push('no red underline under a type error')
  else {
    // The underline must be the typed error, not some other line: hover it and read TypeScript's message.
    await squiggle.last().hover({ force: true }) // the code text lies over the underline
    const hover = page.locator('.monaco-hover').filter({ hasText: /not assignable to type 'number'/ })
    const said = await hover.first().waitFor({ timeout: 10000 }).then(() => true, () => false)
    console.log(said ? `hover: ${(await hover.first().textContent()).replace(/\s+/g, ' ').slice(0, 120)}` : 'hover: no TypeScript message')
    if (!said) problems.push("the underline's hover does not show \"Type 'string' is not assignable to type 'number'\"")
  }
  await page.screenshot({ path: path.join(out, 'ts-lab.png') })
} finally {
  await browser.close()
}

for (const l of logs) console.log(l)
console.log(problems.length ? `\nPROBLEMS:\n${problems.join('\n')}` : '\nts-lab type-checking works')
process.exit(problems.length ? 1 : 0)
