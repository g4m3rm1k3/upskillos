// Real-browser check of the Lab 03 prediction ladder: Python checks run in Pyodide from the page,
// a wrong answer gets per-case feedback, a right one is recorded, step 2 insists on the prescribed
// edit, and the ladder fits a phone-width screen without sideways scrolling.
// Start the dev server first (npx vite), then:
//   node src/labs/ml-lab/tools/verify-ladder-browser.mjs [http://localhost:5173/scratch/ml-preview.html] [screenshot-prefix]
import { chromium } from 'playwright'
const URL = process.argv[2] || 'http://localhost:5173/scratch/ml-preview.html'
const OUT = process.argv[3] || 'ladder'
let failed = 0
const log = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`) }

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
page.setDefaultTimeout(240000)
page.on('pageerror', e => { failed++; console.log('pageerror:', e.message) })
console.log('browser', browser.version())
await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.selectOption('select[aria-label="Choose lab"]', '3')
await page.locator('nav[aria-label="Lessons"] button').nth(1).click()
const ladder = page.locator('section.ml-ladder')
await ladder.waitFor()
log('ladder renders at the end of Lesson 03.2', await ladder.getByText('Predictions from a design matrix').isVisible())

// Plain text box: the accessible fallback, and simpler to type into than Monaco.
await ladder.getByLabel('Use a plain text box instead of the code editor').check()
await ladder.getByRole('button', { name: /3\. Fill in the missing expression/ }).click()
const box = ladder.getByLabel('Fill in the missing expression: your code')
const starter = await box.inputValue()
await box.fill(starter.replace('___', 'X[i, 1:] @ w[1:]'))
let t0 = Date.now()
await ladder.getByRole('button', { name: 'Check', exact: true }).click()
await ladder.getByText(/cases disagree/).waitFor()
const wrongText = await ladder.locator('.ml-ladder-cases').innerText()
log('wrong answer: per-case feedback with a diagnosis, from real Pyodide', /expected \[5, 13, 11, 15\], got \[4, 12, 10, 14\]/.test(wrongText) && /intercept never got in/.test(wrongText), `${((Date.now() - t0) / 1000).toFixed(1)} s including Python download`)
await box.fill(starter.replace('___', 'X[i] @ w'))
t0 = Date.now()
await ladder.getByRole('button', { name: 'Check', exact: true }).click()
await ladder.getByText(/All 4 cases agree/).waitFor()
log('right answer accepted and recorded', await ladder.getByText('✓ Done without help').isVisible(), `${((Date.now() - t0) / 1000).toFixed(1)} s`)
await page.screenshot({ path: `${OUT}-fill.png` })

const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('upskillos.ml-lab.v1')).progress['l03-matmul']?.ladders?.prediction?.steps?.fill)
log('progress saved on this device', saved?.done === true && saved?.unassisted === true)

// Step 2: probe the learner's variables after the prescribed change.
await ladder.getByRole('button', { name: /2\. Loop and matrix product agree/ }).click()
const box2 = ladder.getByLabel('Loop and matrix product agree: your code')
await ladder.getByRole('button', { name: 'Run it' }).click()
await ladder.getByText(/They agree for the original weights/).waitFor()
await box2.fill((await box2.inputValue()).replace('w = np.array([1., 2., 2.])', 'w = np.array([0.5, -1., 3.])'))
await ladder.getByRole('button', { name: 'Run it' }).click()
await ladder.getByText(/D’s entry is 5.5/).waitFor()
log('step 2 requires the prescribed change and then passes', true)

// Phone width: no sideways scrolling.
await page.setViewportSize({ width: 390, height: 900 })
await ladder.scrollIntoViewIfNeeded()
const overflow = await page.evaluate(() => { const l = document.querySelector('section.ml-ladder'); return l.scrollWidth - l.clientWidth })
log('ladder fits 390 px without horizontal scroll', overflow <= 1, `overflow ${overflow}px`)
await ladder.screenshot({ path: `${OUT}-phone.png` })
await browser.close()
console.log(failed ? `${failed} problem(s)` : 'all ladder browser checks passed')
process.exit(failed ? 1 : 0)
