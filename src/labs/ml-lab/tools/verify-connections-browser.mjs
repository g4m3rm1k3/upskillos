// Real-browser check of the ML Lab's three connections to the app's own math tools, task by task:
//   Lesson 03.2 → OpenMAT: contributions and predictions of the four builds
//   Lesson 03.5 → OpenMAT: the least-squares weights, predictions, residuals and Xᵀr
//   Lesson 05.2 → the Applied Statistics CLT Simulator: seed 1, Gamma(2, 0.25), n = 20, +1000
// For each: the lesson's button opens the tool in a new tab with the task ready, the learner's steps are
// followed there, the numbers must equal the lesson's comparison table, and the lesson tab must still be on
// the same lesson. Runs against the whole app (the links are app routes), not the ML Lab preview page.
// Start the dev server first (npx vite), then:
//   node src/labs/ml-lab/tools/verify-connections-browser.mjs [http://localhost:5173] [artifact-prefix]
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
const BASE = process.argv[2] || 'http://localhost:5173'
const OUT = process.argv[3] || 'connections'
let failed = 0
const log = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`) }

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1500, height: 1000 } })
context.setDefaultTimeout(120000)
const page = await context.newPage()
// The app's dock is fixed to the bottom of the window: bring a control to the middle before using it.
const centre = async loc => { await loc.evaluate(e => e.scrollIntoView({ block: 'center' })); return loc }
// A fresh profile sees the app's first-visit guide (and, later, a "What's new" notice): dismiss them as a learner would.
const skipGuide = async p => {
  await p.waitForTimeout(1500)
  for (const name of ['Skip', 'Got it']) { const b = p.getByRole('button', { name, exact: true }); if (await b.isVisible().catch(() => false)) await b.click() }
}

const openLesson = async (lab, index) => {
  await page.selectOption('select[aria-label="Choose lab"]', String(lab))
  await page.locator('nav[aria-label="Lessons"] button').nth(index).click()
  await page.waitForTimeout(400)
}
const lessonTitle = () => page.locator('nav[aria-label="Lessons"] button[aria-current="step"]').innerText()
const openTool = async title => {
  const task = page.locator('section.ml-tooltask').filter({ hasText: title })
  await task.scrollIntoViewIfNeeded()
  const [tab] = await Promise.all([context.waitForEvent('page'), task.getByRole('button', { name: /new tab/ }).click()])
  await tab.waitForLoadState('domcontentloaded')
  await skipGuide(tab)
  return { tab, notice: await task.locator('[role=status]').innerText().catch(() => '') }
}
const runOpenMat = async tab => {
  await tab.getByRole('button', { name: /^Run$/ }).first().click()
  await tab.getByRole('button', { name: 'Console', exact: true }).first().click()
  await tab.getByText('Status: ok').first().waitFor()
  const text = await tab.locator('body').innerText()
  return text.slice(text.indexOf('LAST RUN'), text.indexOf('LAST RUN') + 900).replace(/\s+/g, ' ')
}

try {
  await page.goto(`${BASE}/#/lab/ml-lab`, { waitUntil: 'domcontentloaded' })
  await skipGuide(page)
  await page.locator('select[aria-label="Choose lab"]').waitFor()

  // 1. Weighted sums and the matrix product.
  await openLesson(3, 1)
  const before1 = await lessonTitle()
  let { tab, notice } = await openTool('The weighted sums, in OpenMAT')
  log('03.2: the script is saved for OpenMAT without replacing other scripts', /Added ml-lab-03-2-matrix-product\.m|already in OpenMAT/.test(notice), notice)
  let out = await runOpenMat(tab)
  log('03.2: OpenMAT gives the table’s contributions and predictions',
    out.includes('C = [[1, 2, 2], [1, 4, 8], [1, 6, 4], [1, 8, 6]]') && out.includes('yhat = [5, 13, 11, 15] ans = [5, 13, 11, 15] ans = 11'), out.slice(0, 260))
  await tab.screenshot({ path: `${OUT}-03-2.png` })
  await tab.close()
  log('03.2: the lesson tab is still on the same lesson', (await lessonTitle()) === before1, before1.split('\n')[0])

  // 2. Least squares.
  await openLesson(3, 4)
  const before2 = await lessonTitle()
  ;({ tab, notice } = await openTool('The least-squares fit, in OpenMAT'))
  out = await runOpenMat(tab)
  const ans = /ans = \[([^\]]+)\]/.exec(out)?.[1].split(',').map(Number) ?? []
  log('03.5: OpenMAT gives the table’s weights, predictions and residuals',
    out.includes('w = [2.15714, 2.92857, 1.02857]') && out.includes('yhat = [6.11429, 12.1286, 13, 16.9571]') && out.includes('r = [0.0857143, -0.0285714, -0.2, 0.142857]'), out.slice(0, 300))
  log('03.5: Xᵀr is zero up to rounding', ans.length === 3 && ans.every(v => Math.abs(v) < 1e-10), ans.join(', '))
  await tab.screenshot({ path: `${OUT}-03-5.png` })
  const stored = await tab.evaluate(() => JSON.parse(localStorage.getItem('openmat-documents')).map(d => d.name))
  log('OpenMAT keeps both prepared scripts as separate tabs', stored.includes('ml-lab-03-2-matrix-product.m') && stored.includes('ml-lab-03-5-least-squares.m'), stored.join(', '))
  await tab.close()
  log('03.5: the lesson tab is still on the same lesson', (await lessonTitle()) === before2, before2.split('\n')[0])

  // 3. Samples against sample means.
  await openLesson(5, 1)
  const before3 = await lessonTitle()
  ;({ tab } = await openTool('Samples against sample means'))
  const sim = tab.locator('div').filter({ has: tab.getByRole('heading', { name: 'Central Limit Theorem Simulator' }) }).last()
  await (await centre(sim.getByRole('button', { name: /Right-skewed/ }))).click()
  const slider = await centre(sim.locator('input[type=range]').first())
  await slider.focus()
  await tab.keyboard.press('Home')
  for (let i = 1; i < 20; i++) await tab.keyboard.press('ArrowRight')
  await (await centre(sim.getByLabel('Random seed'))).fill('1')
  await (await centre(sim.getByRole('button', { name: 'Draw 1000 samples of n = 20' }))).click()
  const simText = (await sim.innerText()).replace(/\s+/g, ' ')
  const stat = label => new RegExp(`${label.replace(/[()]/g, '\\$&')} ([0-9.]+)`).exec(simText)?.[1]
  log('05.2: the simulator shows the table’s values for seed 1, n = 20, +1000',
    stat('Sample means') === '1000' && stat('Mean of the means') === '0.497' && stat('SD of the means (observed SE)') === '0.077' && stat('Theory σ/√n') === '0.079',
    `means ${stat('Sample means')}, mean ${stat('Mean of the means')}, SD ${stat('SD of the means (observed SE)')}, theory ${stat('Theory σ/√n')}`)
  log('05.2: it shows one sample’s 20 values separately from the histogram of means', /The last sample: its 20 individual values/.test(simText) && /20000 individual values drawn/.test(simText))
  await sim.screenshot({ path: `${OUT}-05-2.png` })
  await tab.close()
  log('05.2: the lesson tab is still on the same lesson', (await lessonTitle()) === before3, before3.split('\n')[0])
} catch (error) {
  failed++
  console.log(`FAIL  a step did not complete: ${error.message.split('\n')[0]}`)
  for (const [i, p] of context.pages().entries()) {
    await p.screenshot({ path: `${OUT}-failure-${i}.png` }).catch(() => {})
    writeFileSync(`${OUT}-failure-${i}.txt`, `${p.url()}\n${error.stack}\n\n${(await p.locator('body').innerText().catch(() => '')).slice(0, 4000)}`)
  }
}
await browser.close()
console.log(failed ? `${failed} problem(s)` : 'all connection checks passed')
process.exit(failed ? 1 : 0)
