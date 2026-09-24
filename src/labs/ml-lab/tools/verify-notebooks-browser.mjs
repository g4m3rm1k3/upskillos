// Runs "Run all" on every lesson notebook in a real browser and reports any cell error.
// Start the dev server first (npx vite), then:
//   node src/labs/ml-lab/tools/verify-notebooks-browser.mjs [lab numbers, e.g. 1,2,37] [preview URL]
import { chromium } from 'playwright'
const URL = process.argv[3] || 'http://localhost:5173/scratch/ml-preview.html'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
page.setDefaultTimeout(300000)
await page.goto(URL, { waitUntil: 'domcontentloaded' })
const failures = []
let count = 0
for (const lab of (process.argv[2] ? process.argv[2].split(',').map(Number) : [1, 2, 3, 4, 5, 6, 7, 8, 37])) {
  await page.selectOption('select[aria-label="Choose lab"]', String(lab))
  const n = await page.locator('nav[aria-label="Lessons"] button').count()
  for (let i = 0; i < n; i++) {
    await page.locator('nav[aria-label="Lessons"] button').nth(i).click()
    const open = page.getByText(/Open \d+ notebook cells here/)
    if (!(await open.count())) continue
    const title = (await page.locator('nav[aria-label="Lessons"] button').nth(i).innerText()).split('\n')[0]
    await open.click()
    await page.locator('.ml-nb-cell').first().waitFor()
    const t0 = Date.now()
    await page.getByText('Run all', { exact: true }).click()
    // Done when a cell errors or every cell has a run number.
    await page.waitForFunction(() => document.querySelector('.ml-nb-error') || [...document.querySelectorAll('.ml-nb-count')].every(e => /\[\d+\]/.test(e.textContent)), null, { timeout: 300000 })
    const errors = await page.locator('.ml-nb-error').allInnerTexts()
    count++
    if (errors.length) { failures.push({ lab, title, error: errors.join('\n').slice(-400) }); console.log(`✗ Lab ${lab} · ${title}\n${errors.join('\n').slice(-400)}`) }
    else console.log(`✓ Lab ${lab} · ${title} (${((Date.now() - t0) / 1000).toFixed(1)} s)`)
    await page.getByText('Hide the notebook cells').click()
  }
}
console.log(`\n${count - failures.length}/${count} lesson notebooks ran cleanly in ${browser.version()} with Pyodide 0.26.4`)
await browser.close()
process.exit(failures.length ? 1 : 0)
