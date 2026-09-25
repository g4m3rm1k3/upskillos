// Reports display formulas wider than their box, and lesson pages wider than the screen, for the
// given labs (default: all) at the given width. Start the dev server first (npx vite), then:
//   node src/labs/ml-lab/tools/check-formula-widths.mjs [width=1400] [lab numbers, comma-separated] [preview URL]
import { chromium } from 'playwright'
const [width = '1400', only, URL = 'http://localhost:5173/scratch/ml-preview.html'] = process.argv.slice(2)
const b = await chromium.launch(), page = await b.newPage({ viewport: { width: Number(width), height: 1000 } })
await page.goto(URL)
const all = await page.locator('select[aria-label="Choose lab"] option').evaluateAll(o => o.map(x => x.value))
const labs = only ? only.split(',') : all
let wide = 0, pages = 0
for (const lab of labs) {
  await page.selectOption('select[aria-label="Choose lab"]', lab)
  const n = await page.locator('nav[aria-label="Lessons"] button').count()
  for (let i = 0; i < n; i++) {
    await page.locator('nav[aria-label="Lessons"] button').nth(i).click()
    await page.waitForTimeout(250)
    const res = await page.evaluate(() => [...document.querySelectorAll('.ml-lesson .katex-display')].map(d => ({ over: d.scrollWidth - d.clientWidth, tex: d.querySelector('annotation')?.textContent?.slice(0, 60) })).filter(x => x.over > 1))
    for (const r of res) { wide++; console.log(`lab ${lab} lesson ${i + 1}: formula +${r.over}px  ${r.tex}`) }
    const po = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    if (po > 1) { pages++; console.log(`lab ${lab} lesson ${i + 1}: PAGE +${po}px`) }
  }
}
console.log(`width ${width}: ${wide} formula(s) scroll inside their box; ${pages} page(s) wider than the screen`)
await b.close()
process.exit(pages || (Number(width) >= 1000 && wide) ? 1 : 0)
