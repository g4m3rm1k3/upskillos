// Real-browser checks of the lesson-notebook runtime: loading and imports (pandas), shared state
// within a notebook, isolation between notebooks, tracebacks with hints, matplotlib figures,
// stopping an infinite loop while the page stays responsive, and drafts surviving a reload.
// Start the dev server first (npx vite), then:
//   node src/labs/ml-lab/tools/verify-notebook-runtime-browser.mjs [http://localhost:5173/scratch/ml-preview.html] [screenshot-prefix]
// Needs network access for Pyodide 0.26.4 from jsDelivr, and a fresh browser profile (it edits drafts).
import { chromium } from 'playwright'
const URL = process.argv[2] || 'http://localhost:5173/scratch/ml-preview.html'
const OUT = process.argv[3] || 'notebook-runtime'
const results = []
const log = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`) }

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } })
page.setDefaultTimeout(240000)
page.on('pageerror', e => console.log('pageerror:', e.message))
console.log('browser', browser.version())
await page.goto(URL, { waitUntil: 'domcontentloaded' })

const lab = async (n, lesson) => {
  await page.selectOption('select[aria-label="Choose lab"]', String(n))
  await page.locator('nav[aria-label="Lessons"] button').nth(lesson).click()
  await page.getByText(/Open \d+ notebook cells here/).click()
  await page.locator('.ml-nb-cell').first().waitFor()
  await page.locator('.ml-nb-cell .monaco-editor').first().waitFor()
}
const cell = k => page.locator('.ml-nb-cell').nth(k)
const setCode = async (k, code) => {
  await cell(k).locator('.monaco-editor .view-lines').click()
  await page.keyboard.press('Control+A'); await page.keyboard.press('Delete')
  await page.keyboard.insertText(code)
}
const runCell = async k => { await cell(k).getByText('Run cell', { exact: true }).click(); await waitIdle() }
const waitIdle = async () => page.waitForFunction(() => ![...document.querySelectorAll('.ml-nb-count')].some(e => e.textContent.includes('*')) && ![...document.querySelectorAll('.ml-nb-cell')].some(e => e.textContent.includes('Waiting to run')), null, { timeout: 240000 })
const output = async k => (await cell(k).locator('.ml-nb-output').allInnerTexts()).join('\n')

// 1. Loading and imports: run every cell of the pandas lesson in order.
let t0 = Date.now()
await lab(2, 2)
await page.getByText('Run all', { exact: true }).click()
await page.waitForFunction(() => [...document.querySelectorAll('.ml-nb-count')].every(e => /\[\d+\]/.test(e.textContent)), null, { timeout: 240000 })
const outs = await Promise.all([0, 1, 2, 3].map(output))
log('cold start + pandas notebook, Run all', outs.every(o => o && !/Error/.test(o)) && /duration_s\s+object|duration_s\s+str/.test(outs[0]) && /dev\s+24/.test(outs[3]), `${((Date.now() - t0) / 1000).toFixed(1)} s; cell 1 dtypes shown: ${/duration_s\s+(object|str)/.exec(outs[0])?.[0]}`)
await page.screenshot({ path: `${OUT}-pandas.png`, fullPage: false })

// 2. Shared state inside a notebook, and an ordinary traceback with guidance.
await page.getByText('Hide the notebook cells').click()
await lab(3, 0)
await setCode(0, 'shared_value = 41')
await runCell(0)
await setCode(1, 'print(shared_value + 1)')
await runCell(1)
log('cells in one notebook share variables', /42/.test(await output(1)), (await output(1)).trim())
await setCode(2, 'print(not_defined_anywhere)')
await runCell(2)
const err = await output(2)
log('NameError shows the traceback and a plain-language hint', /NameError: name 'not_defined_anywhere' is not defined/.test(err) && /Python does not know not_defined_anywhere/.test(err), err.split('\n')[0])
log('traceback hides runtime internals', !/pyodide|_base\.py|_ml_run/.test(err))

// 3. A plot.
await setCode(3, "import matplotlib.pyplot as plt\nplt.plot([1, 2, 3], [1, 4, 9])\nplt.title('it works')")
await runCell(3)
const imgs = await cell(3).locator('.ml-nb-output img').count()
const natural = imgs ? await cell(3).locator('.ml-nb-output img').first().evaluate(i => i.naturalWidth) : 0
log('matplotlib figure is captured as an image', imgs === 1 && natural > 100, `${imgs} image(s), ${natural}px wide`)
await cell(3).screenshot({ path: `${OUT}-plot.png` })

// 4. Isolation: another lesson's notebook cannot see shared_value.
await page.getByText('Hide the notebook cells').click()
await page.locator('nav[aria-label="Lessons"] button').nth(1).click()
await page.getByText(/Open \d+ notebook cells here/).click()
await page.locator('.ml-nb-cell .monaco-editor').first().waitFor()
await setCode(0, 'print(shared_value)')
await runCell(0)
log('a different lesson notebook cannot see those variables', /NameError: name 'shared_value'/.test(await output(0)))

// 5. Cancellation: infinite loop, page stays responsive, Stop recovers, code kept.
await setCode(1, 'while True:\n    pass')
await cell(1).getByText('Run cell', { exact: true }).click()
await page.waitForTimeout(3000)
t0 = Date.now()
const responsive = await Promise.race([page.evaluate(() => { document.body.dataset.ping = 'pong'; return true }), new Promise(r => setTimeout(() => r(false), 2000))])
log('page stays responsive during an infinite loop', responsive === true, `main-thread round trip ${Date.now() - t0} ms`)
await page.getByText('Stop', { exact: true }).click()
await page.waitForTimeout(500)
const code1 = (await cell(1).locator('.monaco-editor .view-lines').innerText()).replace(/ /g, ' ')
const status = await page.locator('.ml-nb > p.ml-caption[role=status]').first().innerText()
log('Stop ends the loop and keeps the code', /while True/.test(code1) && /variables from earlier cells are gone|variables are gone|Python was stopped/.test(await output(1) + status), status.slice(0, 120))
await setCode(2, 'print("alive after stop")')
await runCell(2)
log('Python runs again after Stop', /alive after stop/.test(await output(2)))

// 6. A real reload keeps the edited code.
await page.reload({ waitUntil: 'domcontentloaded' })
await page.locator('select[aria-label="Choose lab"]').waitFor()
await lab(3, 1)
const shown = await page.waitForFunction(() => /while\s+True/.test((document.querySelectorAll('.ml-nb-cell')[1]?.querySelector('.view-lines')?.innerText ?? '').replace(/\u00a0/g, ' ')), null, { timeout: 20000 }).then(() => true, () => false)
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('upskillos.ml-lab.notebooks.v1') || '{}')['l03-matmul']?.cells?.[1])
log('edits survive a page reload', shown && /while True/.test(stored ?? ''), `editor shows it: ${shown}; saved draft: ${JSON.stringify(stored)}`)

console.log(`\n${results.filter(r => r.ok).length}/${results.length} browser checks passed`)
await browser.close()
process.exit(results.every(r => r.ok) ? 0 : 1)
