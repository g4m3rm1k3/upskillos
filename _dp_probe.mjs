import { chromium } from 'playwright'
import { spawn, spawnSync } from 'node:child_process'
const PORT = 5197
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { shell: true, stdio: 'ignore' })
const stop = () => { try { spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F']) } catch {} }
process.on('exit', stop)
const out = process.argv[2]
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 920 } })
  await page.addInitScript(() => { try { localStorage.setItem('oc-tour-seen', '1') } catch {} })
  for (let i = 0; i < 60; i++) { try { await page.goto(`http://127.0.0.1:${PORT}/#/lab/dynamic-programming`); break } catch { await new Promise(r => setTimeout(r, 1000)) } }
  await page.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => {})
  await page.getByRole('button', { name: /Base cases and boundary states/ }).first().click({ timeout: 60000 })
  await page.getByRole('button', { name: /03 · Solve a problem/ }).first().click()
  const ta = page.locator('.dp-editor-input').first()
  await ta.waitFor({ timeout: 30000 })
  const info = await page.evaluate(() => {
    const pre = document.querySelector('.dp-editor-highlight'), code = pre.querySelector('code'), ta = document.querySelector('.dp-editor-input'), gutter = document.querySelector('.dp-editor-gutter')
    const pick = el => { const c = getComputedStyle(el); return { pad: `${c.paddingTop} ${c.paddingLeft}`, margin: c.margin, lh: c.lineHeight, font: c.fontFamily.slice(0, 40), size: c.fontSize, weight: c.fontWeight, ls: c.letterSpacing, lig: c.fontVariantLigatures, overflow: c.overflow, top: el.getBoundingClientRect().top.toFixed(1), left: el.getBoundingClientRect().left.toFixed(1) } }
    // first character position in the highlight layer
    const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT); let node = walker.nextNode(); while (node && !node.textContent.trim()) node = walker.nextNode()
    const r = document.createRange(); r.setStart(node, node.textContent.search(/\S/)); r.setEnd(node, node.textContent.search(/\S/) + 1)
    const rect = r.getBoundingClientRect()
    // line 10 in the highlight layer
    const lines = ta.value.split('\n')
    return { pre: pick(pre), code: pick(code), ta: pick(ta), gutter: pick(gutter), firstChar: { top: rect.top.toFixed(1), left: rect.left.toFixed(1), h: rect.height.toFixed(1) }, lines: lines.length, preScroll: [pre.scrollHeight, pre.clientHeight], taScroll: [ta.scrollHeight, ta.clientHeight] }
  })
  console.log(JSON.stringify(info, null, 1))
  await ta.click(); await page.keyboard.press('Control+End')
  for (let i = 0; i < 25; i++) await page.keyboard.type(`\nx = ${i}  # line`)
  const drift = await page.evaluate(() => {
    const pre = document.querySelector('.dp-editor-highlight'), code = pre.querySelector('code'), gutter = document.querySelectorAll('.dp-gutter-line')
    // the top of line 20 in the text layer: the text node after the 19th newline
    const NL = String.fromCharCode(10); let seen = 0, pos = null
    const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n && !pos; n = walker.nextNode()) for (let i = 0; i < n.textContent.length; i++) { if (seen === 19 && n.textContent[i] !== NL) { pos = [n, i]; break } if (n.textContent[i] === NL) seen++ }
    const r = document.createRange(); r.setStart(pos[0], pos[1]); r.setEnd(pos[0], pos[1] + 1)
    const text = r.getBoundingClientRect(), num = gutter[19].getBoundingClientRect()
    return { line20Text: text.top.toFixed(1), line20Number: num.top.toFixed(1), textHeight: text.height.toFixed(1), numberHeight: num.height.toFixed(1) }
  })
  console.log('line 20:', JSON.stringify(drift))
  await page.locator('.dp-code-editor').first().screenshot({ path: `${out}/editor-after.png` })
} finally { await browser.close(); stop() }
