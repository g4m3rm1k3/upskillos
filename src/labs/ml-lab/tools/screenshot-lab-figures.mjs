// Screenshots every inline figure and prediction of one lab, lesson by lesson, at desktop and phone
// width, and reports any horizontal overflow or page error. Start the dev server first (npx vite), then:
//   node src/labs/ml-lab/tools/screenshot-lab-figures.mjs <lab number> [output dir] [preview URL]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
const [lab, out = '.', URL = 'http://localhost:5173/scratch/ml-preview.html'] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
let problems = 0
for (const [name, width] of [['desktop', 1400], ['phone', 390]]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } })
  page.on('pageerror', e => { problems++; console.log(`pageerror (${name}):`, e.message) })
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.selectOption('select[aria-label="Choose lab"]', String(lab))
  const lessons = await page.locator('nav[aria-label="Lessons"] button').count()
  for (let i = 0; i < lessons; i++) {
    await page.locator('nav[aria-label="Lessons"] button').nth(i).click()
    await page.locator('.ml-flow').waitFor()
    await page.waitForTimeout(400)
    const figs = page.locator('.ml-flow > .ml-inline-figure')
    const n = await figs.count()
    for (let k = 0; k < n; k++) {
      const f = figs.nth(k)
      await f.scrollIntoViewIfNeeded()
      const over = await f.evaluate(e => e.scrollWidth - e.clientWidth)
      if (over > 1) { problems++; console.log(`overflow ${over}px: lesson ${i + 1} figure ${k + 1} (${name})`) }
      if (name === 'desktop' || over > 1) await f.screenshot({ path: `${out}/lab${lab}-L${i + 1}-F${k + 1}-${name}.png` })
    }
    const pageOver = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    if (pageOver > 1) { problems++; console.log(`page overflow ${pageOver}px: lesson ${i + 1} (${name})`) }
    console.log(`lesson ${i + 1} (${name}): ${n} figures`)
  }
  await page.close()
}
await browser.close()
console.log(problems ? `${problems} problem(s)` : 'no overflow or page errors')
process.exit(problems ? 1 : 0)
