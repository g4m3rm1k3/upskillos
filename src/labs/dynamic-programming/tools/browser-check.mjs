// The DP lab in a real browser: reuse this every session instead of writing a new one. It starts its
// own dev server (and always stops it), opens every lesson that has a live table or a call tree, goes
// to its walkthrough, plays the table and the tree, fills one cell by typing, tries the fill-order
// game, walks the answer back where it can, and saves a screenshot of each. Every lesson with "Design it yourself" is designed start to
// finish, with one wrong pick per decision. Every bug hunt is played in real Python: run the bug, click a
// right line, click the bug, type the fix, pass. `--only` takes lesson ids, plus `design`, `hunt` and `run`. Any page error, console error or missing piece is reported.
//
//   node src/labs/dynamic-programming/tools/browser-check.mjs [out-folder] [--only id1,id2]
import { chromium } from 'playwright'
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { CONCEPTS } from '../curriculum.js'
import { TRACES } from '../tables.js'
import { TREE_FOR } from '../trees.js'
import { DESIGNS, applyCell } from '../lessons/designs.js'
import { WALKS } from '../walks.js'
import { BUG_HUNTS, bugLines, buggyCode, show } from '../hunt.js'

const args = process.argv.slice(2)
const onlyArg = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
const out = args.find(a => !a.startsWith('--') && a !== onlyArg) ?? path.join(process.env.TEMP ?? '/tmp', 'dp-check')
mkdirSync(out, { recursive: true })
const PORT = 5198, URL = `http://127.0.0.1:${PORT}/#/lab/dynamic-programming`
const root = path.resolve(import.meta.dirname, '../../../..')

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: root, shell: true, stdio: 'ignore' })
const stopServer = () => { try { process.platform === 'win32' ? spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F']) : server.kill() } catch { /* already gone */ } }
process.on('exit', stopServer)

const wanted = id => !onlyArg || onlyArg.split(',').includes(id)
const ids = [...new Set([...Object.keys(TRACES), ...Object.keys(TREE_FOR)])].filter(wanted)
const problems = []
// Open a lesson by its title. The match is anchored, or "Bounded knapsack" would open "Unbounded knapsack".
const literal = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
let page
async function openConcept(title) {
  await page.getByRole('searchbox').fill(title)
  await page.locator('.dp-concept').filter({ hasText: new RegExp(`^${literal(title)}`) }).first().click()
  // Until the new lesson's heading shows, the previous lesson's panels may still be on the page.
  await page.getByRole('heading', { name: title, exact: true }).waitFor({ timeout: 10000 })
}
const browser = await chromium.launch()
try {
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.on('pageerror', e => problems.push(`page error: ${e}`))
  page.on('console', m => { if (m.type() === 'error' && !/WebSocket|chorus|favicon/.test(m.text())) problems.push(`console: ${m.text().slice(0, 200)}`) })
  await page.addInitScript(() => { try { localStorage.setItem('oc-tour-seen', '1') } catch {} })
  for (let i = 0; i < 90; i++) { try { await page.goto(URL, { timeout: 60000 }); break } catch { await new Promise(r => setTimeout(r, 2000)) } }
  await page.getByRole('heading', { name: 'Dynamic programming' }).first().waitFor({ timeout: 180000 })
  const skip = page.getByRole('button', { name: 'Skip' }); if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click()

  for (const id of ids) {
    const title = CONCEPTS.find(c => c.id === id).title
    await page.getByRole('searchbox').fill(title)
    await openConcept(title)
    await page.getByRole('button', { name: '02 · Walk through' }).click()
    const notes = []
    if (TREE_FOR[id]) {
      const tree = page.locator('.dp-ct')
      await tree.waitFor({ timeout: 10000 })
      await tree.getByRole('button', { name: 'Next event' }).click()
      await tree.getByRole('button', { name: 'Next event' }).click()
      await tree.screenshot({ path: path.join(out, `${id}-tree-start.png`) })
      await tree.getByRole('button', { name: 'Show the whole tree' }).click().catch(() => notes.push('tree too big to draw'))
      await tree.screenshot({ path: path.join(out, `${id}-tree.png`) })
    }
    if (TRACES[id]) {
      const tt = page.locator('.dp-tt')
      await tt.waitFor({ timeout: 10000 })
      for (let i = 0; i < 3; i++) await tt.getByRole('button', { name: 'Next cell' }).click()
      await tt.screenshot({ path: path.join(out, `${id}-watch.png`) })
      await tt.getByRole('tab', { name: '✎ You fill it' }).click()
      await tt.getByLabel(/^Value of /).fill('12345')
      await tt.getByRole('button', { name: 'Check' }).click()
      if (!(await tt.locator('.dp-tt-feedback.is-bad').isVisible())) problems.push(`${id}: a wrong value got no feedback`)
      await tt.getByRole('tab', { name: '⇄ Fill order' }).click()
      await tt.getByRole('button', { name: 'Which cell is ready?' }).click()
      await tt.locator('.dp-tt-cell.is-hint').click()
      await tt.screenshot({ path: path.join(out, `${id}-order.png`) })
      if (WALKS[id]) {
        // Walk back from the answer to a base case; the solution must appear, read forwards.
        await tt.getByRole('tab', { name: '↩ Walk back' }).click()
        const next = tt.getByRole('button', { name: 'Next step ↩' })
        for (let k = 0; k < 60 && await next.isVisible().catch(() => false); k++) await next.click()
        if (!(await tt.getByText(/read forwards|Every piece is explained/).first().isVisible().catch(() => false))) problems.push(`${id}: the walk back did not reach a solution`)
        await tt.screenshot({ path: path.join(out, `${id}-walk.png`) })
      }
      const overflow = await page.evaluate(() => { const m = document.querySelector('.dp-detail'); return m.scrollWidth > m.clientWidth + 2 })
      if (overflow) problems.push(`${id}: the lesson scrolls sideways`)
    }
    console.log(`${id}: ok${notes.length ? ` (${notes.join(', ')})` : ''}`)
  }
  // Design it yourself: the stage a designed lesson opens on, walked through with one wrong pick each time.
  for (const [id, d] of Object.entries(DESIGNS).filter(([id]) => wanted('design') || (onlyArg && wanted(id)))) {
    const title = CONCEPTS.find(c => c.id === id).title
    await page.getByRole('searchbox').fill(title)
    await openConcept(title)
    const di = page.getByRole('region', { name: 'Design it yourself' })
    if (!(await di.isVisible({ timeout: 10000 }).catch(() => false))) await page.getByRole('button', { name: '00 · Design it yourself' }).click()
    if (await di.getByRole('button', { name: 'Design it again' }).isVisible().catch(() => false)) await di.getByRole('button', { name: 'Design it again' }).click()
    const answerWith = async (value, kind) => {
      if (kind === 'yesno') await di.getByRole('button', { name: value ? 'Yes' : 'No', exact: true }).click()
      else { await di.getByRole('textbox').fill(String(value)); await di.getByRole('button', { name: 'Check', exact: true }).click() }
    }
    await answerWith(d.tryFirst.answer, d.tryFirst.kind)
    await di.getByRole('button', { name: 'Start designing →' }).click()
    for (const [k, step] of d.steps.entries()) {
      await di.getByRole('button', { name: step.options.find(o => !o.right).text, exact: true }).click()
      if (!(await di.locator('.dp-tt-feedback.is-bad').isVisible())) problems.push(`${id}: a wrong ${step.kind} pick got no reason`)
      await di.getByRole('button', { name: step.options.find(o => o.right).text, exact: true }).click()
      // Wait for the reason to show before moving on: clicking Next while it re-renders can miss.
      await di.locator('.dp-tt-feedback.is-good').waitFor({ timeout: 5000 })
      if (k === 2) await di.screenshot({ path: path.join(out, `${id}-design.png`) })
      await di.getByRole('button', { name: 'Next decision →' }).click()
    }
    const cell = d.apply.cell ? applyCell(id, d.apply).step.value : d.apply.answer
    // A live-table cell is always typed (T or F for yes-or-no tables); a hand-solved apply may be Yes/No buttons.
    await answerWith(cell, d.apply.cell ? 'text' : d.apply.kind)
    await di.getByRole('button', { name: 'Finish the design →' }).click()
    await di.getByText(/You designed it/).waitFor({ timeout: 5000 }).catch(() => problems.push(`${id}: the design did not finish`))
    await di.screenshot({ path: path.join(out, `${id}-design-done.png`) })
    const overflow = await page.evaluate(() => { const m = document.querySelector('.dp-detail'); return m.scrollWidth > m.clientWidth + 2 })
    if (overflow) problems.push(`${id}: the design stage scrolls sideways`)
    console.log(`${id} design: ok`)
  }
  // Bug hunts, in Python (each Run starts real Pyodide): the bug shows, a right line says why it is
  // right, the bug line is accepted, the fix passes, and the stage is marked.
  for (const [id, hunt] of Object.entries(BUG_HUNTS).filter(([id]) => wanted('hunt') || (onlyArg && wanted(id)))) {
    const title = CONCEPTS.find(c => c.id === id).title
    await openConcept(title)
    await page.getByRole('button', { name: /^04 · Bug hunt/ }).click()
    const region = page.getByRole('region', { name: 'Bug hunt' })
    await region.getByRole('button', { name: '▶ Run' }).first().click()
    const output = region.getByRole('region', { name: 'Run output' })
    await output.waitFor({ timeout: 180000 })
    const text = (await output.textContent()).replace(/\s+/g, ' ')
    const got = show(hunt.symptom.buggy, 'Python'), want = show(hunt.symptom.expected, 'Python')
    if (!text.includes(`returned ${got.replaceAll(',', ', ')}`) && !text.includes(`returned ${got}`)) problems.push(`${id} hunt: Run showed ${text.slice(0, 160)}, not ${got}`)
    if (!text.includes(`the right answer is ${want}`)) problems.push(`${id} hunt: Run did not give the right answer ${want}`)
    const lines = buggyCode(hunt, 'Python').split('\n')
    const decoy = 1 + lines.findIndex(l => l.includes(hunt.decoys[0][0][0]))
    await region.getByRole('button', { name: new RegExp(`^Line ${decoy}:`) }).click()
    if (!(await region.getByText(`Line ${decoy} is right.`).isVisible().catch(() => false))) problems.push(`${id} hunt: a right line got no reason`)
    await region.screenshot({ path: path.join(out, `${id}-hunt.png`) })
    await region.getByRole('button', { name: new RegExp(`^Line ${bugLines(hunt, 'Python')[0]}:`) }).click()
    await region.getByText(/✓ Found it/).waitFor({ timeout: 5000 }).catch(() => problems.push(`${id} hunt: the bug line was not accepted`))
    await region.getByLabel('The buggy Python solution, to fix').fill(hunt.code.Python)
    await region.getByRole('button', { name: '✓ Run & check' }).click()
    await region.getByText('🐞 Fixed: every check passes.').waitFor({ timeout: 120000 }).catch(() => problems.push(`${id} hunt: the fix did not pass`))
    if (!(await page.getByRole('button', { name: '04 · Bug hunt ✓' }).isVisible().catch(() => false))) problems.push(`${id} hunt: the stage has no ✓ after the fix`)
    await region.screenshot({ path: path.join(out, `${id}-hunt-fixed.png`) })
    const overflow = await page.evaluate(() => { const m = document.querySelector('.dp-detail'); return m.scrollWidth > m.clientWidth + 2 })
    if (overflow) problems.push(`${id}: the bug hunt scrolls sideways`)
    console.log(`${id} hunt: ok`)
  }
  // Run (not graded) in real Python, with a print, then Run & check, then CodeLens and back.
  if (wanted('run')) {
    await page.getByRole('searchbox').fill('Non-adjacent selection')
    await page.locator('.dp-concept').filter({ hasText: 'Non-adjacent selection' }).first().click()
    await page.getByRole('button', { name: '03 · Solve a problem' }).click()
    const editor = page.getByLabel('Your Python solution')
    await editor.fill('def solve(values):\n    best = [0] * (len(values) + 1)\n    for i in range(1, len(values) + 1):\n        take = values[i - 1] + (best[i - 2] if i >= 2 else 0)\n        best[i] = max(best[i - 1], take)\n        print(i, best)\n    return best[-1]\n')
    await page.getByRole('button', { name: '▶ Run' }).click()
    const panel = page.getByRole('region', { name: 'Run output' })
    await panel.waitFor({ timeout: 180000 })
    const text = await panel.textContent()
    if (!/4 \[0, 3, 3, 9, 9\]/.test(text) || !/returned 9/.test(text)) problems.push(`Run in Python showed: ${text.slice(0, 200)}`)
    await page.locator('.dp-live-practice').screenshot({ path: path.join(out, 'run-python.png') }).catch(() => {})
    await page.getByRole('button', { name: '✓ Run & check' }).click()
    await page.getByText('🎉 All checks passed!').waitFor({ timeout: 60000 }).catch(() => problems.push('Run & check did not pass a correct solution'))
    // A pass shows at once: a ✓ on the lesson in the sidebar, the lesson badge, and the progress bar.
    if (!(await page.locator('.dp-concept.is-solved').filter({ hasText: 'Non-adjacent selection' }).first().isVisible().catch(() => false))) problems.push('a solved lesson has no ✓ in the sidebar')
    if (!/[1-9]\d* of \d+ lessons solved/.test(await page.getByRole('group', { name: 'Your progress' }).textContent())) problems.push('the progress bar did not count the solve')
    await page.locator('.dp-workspace').screenshot({ path: path.join(out, 'solved.png') })
    await page.locator('.dp-header').screenshot({ path: path.join(out, 'progress-header.png') })
    // After the attempt, the reference solution explained line by line.
    await page.getByRole('button', { name: /Compare with the reference solution/ }).click()
    const explained = page.getByRole('region', { name: 'Reference solution, explained' })
    if (!(await explained.getByText(/The two choices for house i/).isVisible().catch(() => false))) problems.push('the explained solution shows no notes')
    await explained.screenshot({ path: path.join(out, 'explained.png') })
    await page.getByRole('button', { name: '🔍 Open in CodeLens' }).click()
    await page.waitForURL(/#\/codelens/, { timeout: 20000 })
    await page.waitForTimeout(4000)
    await page.screenshot({ path: path.join(out, 'codelens.png') })
    const back = page.getByRole('button', { name: /Back to the DP lab/ })
    if (await back.isVisible({ timeout: 10000 }).catch(() => false)) {
      await back.click()
      await page.getByRole('button', { name: '▶ Run' }).waitFor({ timeout: 30000 }).catch(() => problems.push('Back from CodeLens did not reopen the challenge'))
    } else problems.push('CodeLens shows no way back to the DP lab')
    console.log('run, check, CodeLens: done')
  }
  // A narrow window: the table scrolls inside its own box, the page doesn't. The desktop keeps a
  // window's old size until the page reloads.
  await page.setViewportSize({ width: 420, height: 900 })
  await page.goto(URL)
  await page.reload()
  const gotIt = page.getByRole('button', { name: 'Got it' }); if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) await gotIt.click()
  await page.getByRole('searchbox').waitFor({ timeout: 60000 }).catch(async e => { await page.screenshot({ path: path.join(out, 'narrow-failed.png') }); throw e })
  await page.getByRole('searchbox').fill('0/1 knapsack')
  await page.locator('.dp-concept').filter({ hasText: '0/1 knapsack' }).first().click()
  await page.getByRole('button', { name: '02 · Walk through' }).click()
  await page.locator('.dp-tt').screenshot({ path: path.join(out, 'narrow-knapsack.png') })
  await page.getByRole('searchbox').fill('Non-adjacent selection')
  await page.locator('.dp-concept').filter({ hasText: 'Non-adjacent selection' }).first().click()
  await page.getByRole('button', { name: '00 · Design it yourself' }).click()
  await page.getByRole('region', { name: 'Design it yourself' }).screenshot({ path: path.join(out, 'narrow-design.png') })
  // The line picker, unsolved: its code scrolls inside its own box.
  await page.evaluate(() => localStorage.removeItem('oc-dp-lab'))
  await page.getByRole('button', { name: /^03 · / }).click()
  await page.getByRole('button', { name: /^04 · Bug hunt/ }).click()
  await page.getByRole('region', { name: 'Bug hunt' }).screenshot({ path: path.join(out, 'narrow-hunt.png') })
  if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2)) problems.push('narrow: the bug hunt scrolls the page sideways')
  if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2)) problems.push('narrow: the page scrolls sideways')
} finally {
  await browser.close()
  stopServer()
}
console.log(problems.length ? `\n${problems.length} problem(s):\n${problems.join('\n')}` : '\nNo problems.')
console.log(`Screenshots: ${out}`)
process.exit(problems.length ? 1 : 0)
