// The lab in a real browser, start to finish: reuse this every session instead of writing a new one.
// It starts its own dev server (and always stops it), opens every lesson, checks each draws with no
// missing figure or code and no page errors, solves chosen "write it yourself" blocks in the page's
// real Python (Pyodide, pandas included) by pasting the lab's own answer, solves a spreadsheet block,
// follows a lesson's "Open in the Spreadsheet Lab" button, and saves a screenshot of every lesson.
//
//   node src/labs/data-science-studio/tools/browser-check.mjs [out-folder] [--write fn1,fn2,…]
//
// --write: the functions whose write blocks to run in Pyodide (default: one per part, pandas included).
import { chromium } from 'playwright'
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { functionSource } from '../source.js'
import { LESSONS } from '../lessons/index.js'

const args = process.argv.slice(2)
const out = args.find(a => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--write')) ?? path.join(process.env.TEMP ?? '/tmp', 'dss-check')
const writeArg = args.includes('--write') ? args[args.indexOf('--write') + 1] : 'split_csv_line,big_orders,welford'
const toWrite = new Set(writeArg.split(','))
mkdirSync(out, { recursive: true })
const PORT = 5199, URL = `http://127.0.0.1:${PORT}/#/lab/data-science-studio`
const root = path.resolve(import.meta.dirname, '../../../..')

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: root, shell: true, stdio: 'ignore' })
// Waits for the kill (spawnSync): the script exits right after, and a kill that hasn't run yet never would.
// On Windows the server runs under a shell, so its whole process tree is ended (/T).
const stopServer = () => { try { process.platform === 'win32' ? spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F']) : server.kill() } catch { /* already gone */ } }
process.on('exit', stopServer)

const problems = []
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 920 } })
  page.on('pageerror', e => problems.push(`page error: ${e}`))
  page.on('console', m => { if (m.type() === 'error' && !/WebSocket|chorus|favicon/.test(m.text())) problems.push(`console: ${m.text().slice(0, 200)}`) })
  await page.addInitScript(() => { try { localStorage.setItem('oc-tour-seen', '1') } catch {} })
  for (let i = 0; i < 90; i++) { try { await page.goto(URL, { timeout: 60000 }); break } catch { await new Promise(r => setTimeout(r, 2000)) } }
  await page.getByRole('heading', { name: LESSONS[0].title }).first().waitFor({ timeout: 180000 })
  const skip = page.getByRole('button', { name: 'Skip' }); if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click()

  for (const lesson of LESSONS) {
    await page.locator('.qm-sidebar button').filter({ hasText: lesson.title }).first().click()
    await page.locator('.qm-lesson h1').filter({ hasText: lesson.title }).waitFor({ timeout: 30000 })
    const text = await page.locator('.qm-lesson').textContent()
    if (/Missing figure|# no function|# missing file/.test(text)) problems.push(`${lesson.number}: missing figure or code`)
    const figures = await page.locator('.qm-lesson .qm-figure').count()
    let wrote = ''
    for (const [k, b] of lesson.blocks.entries()) {
      if (!b.write || !toWrite.has(b.write.fn)) continue
      const block = page.locator('.ds-write').nth(lesson.blocks.slice(0, k).filter(x => x.write).length)
      await block.locator('textarea').fill(functionSource(b.write.file, b.write.fn))
      const t0 = Date.now()
      await block.getByRole('button', { name: /Run the checks/ }).click()
      await block.locator('.qm-answer, .qm-feedback').first().waitFor({ timeout: 180000 })
      const passed = await block.getByText('All checks pass').isVisible().catch(() => false)
      wrote += ` · write ${b.write.fn}: ${passed ? 'passed' : 'FAILED'} in ${((Date.now() - t0) / 1000).toFixed(1)} s`
      if (!passed) problems.push(`${lesson.number}: write ${b.write.fn} failed in the page: ${(await block.textContent()).slice(-300)}`)
    }
    console.log(`${lesson.number} ${lesson.title}: ${figures} figures${wrote}`)
    await page.locator('.qm-main').screenshot({ path: path.join(out, `${lesson.number}.png`) })
  }

  // A spreadsheet block solved, then its Spreadsheet Lab button followed.
  await page.locator('.qm-sidebar button').filter({ hasText: LESSONS[0].title }).first().click()
  const formula = page.locator('.ds-formula').first()
  await formula.getByLabel('Your formula').fill('=COUNTIF(D2:D403,"Bike")')
  await formula.getByRole('button', { name: 'Work it out' }).click()
  console.log('spreadsheet block:', (await formula.locator('.qm-answer strong').textContent()).trim())
  await formula.getByRole('button', { name: /Open in the Spreadsheet Lab/ }).click()
  const sheetTitle = page.getByText(/Added the sheet "Bike shop orders"|Done: Count the orders of each item/).first()
  const opened = await sheetTitle.waitFor({ timeout: 60000 }).then(() => true, () => false)
  console.log('Spreadsheet Lab opened on the shop’s orders:', opened)
  if (!opened) problems.push('the Spreadsheet Lab button did not open the dataset')
  await page.screenshot({ path: path.join(out, 'spreadsheet-lab.png') })
} finally {
  await browser.close()
  stopServer()
}
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no problems')
console.log(`screenshots in ${out}`)
process.exit(problems.length ? 1 : 0)
