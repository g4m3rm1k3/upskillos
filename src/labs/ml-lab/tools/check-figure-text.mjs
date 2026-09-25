// Finds text in the lessons' SVG figures that runs outside the figure's drawing area (and is
// therefore clipped), for every lab and lesson. Start the dev server first (npx vite), then:
//   node src/labs/ml-lab/tools/check-figure-text.mjs [lab numbers, comma-separated] [preview URL]
import { chromium } from 'playwright'
const [only, URL = 'http://localhost:5173/scratch/ml-preview.html'] = process.argv.slice(2)
const b = await chromium.launch(), page = await b.newPage({ viewport: { width: 1400, height: 1000 } })
await page.goto(URL)
const all = await page.locator('select[aria-label="Choose lab"] option').evaluateAll(o => o.map(x => x.value))
let found = 0
for (const lab of only ? only.split(',') : all) {
  await page.selectOption('select[aria-label="Choose lab"]', lab)
  const n = await page.locator('nav[aria-label="Lessons"] button').count()
  for (let i = 0; i < n; i++) {
    await page.locator('nav[aria-label="Lessons"] button').nth(i).click()
    await page.waitForTimeout(400)
    const clipped = await page.evaluate(() => {
      const out = []
      for (const svg of document.querySelectorAll('.ml-flow .ml-inline-figure svg[viewBox]')) {
        const [vx, vy, vw, vh] = svg.getAttribute('viewBox').split(/[ ,]+/).map(Number)
        for (const t of svg.querySelectorAll('text')) {
          if (t.closest('clipPath') || !t.textContent.trim()) continue
          let bb; try { bb = t.getBBox() } catch { continue }
          // Map through any transforms on the way up to the svg.
          const m = t.getCTM(), root = svg.getCTM()
          if (!m || !root) continue
          const inv = root.inverse().multiply(m)
          const pts = [[bb.x, bb.y], [bb.x + bb.width, bb.y + bb.height]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(inv))
          const left = Math.min(pts[0].x, pts[1].x), right = Math.max(pts[0].x, pts[1].x), top = Math.min(pts[0].y, pts[1].y), bottom = Math.max(pts[0].y, pts[1].y)
          const over = Math.max(vx - left, right - (vx + vw), vy - top, bottom - (vy + vh))
          if (over > 1.5) out.push(`${over.toFixed(0)} units: "${t.textContent.slice(0, 60)}" in "${(svg.getAttribute('aria-label') || '').slice(0, 50)}"`)
        }
      }
      return out
    })
    for (const c of clipped) { found++; console.log(`lab ${lab} lesson ${i + 1}: ${c}`) }
  }
}
console.log(found ? `${found} clipped text element(s)` : 'no clipped figure text')
await b.close()
process.exit(found ? 1 : 0)
