// Self-contained browser smoke test. The temporary server is always closed.
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { chromium } from 'playwright'
import assert from 'node:assert/strict'

let server, browser
const deadline = setTimeout(() => { console.error('Cube check timed out'); process.exit(1) }, 55000)
try {
  server = await createServer({ configFile: false, plugins: [react(), {
    name: 'cube-test-page', configureServer(s) {
      s.middlewares.use('/cube-check', async (_req, res) => {
        const html = await s.transformIndexHtml('/cube-check', `<html><body style="margin:0;background:#080e1b"><div id="root"></div><script type="module">
          import React from '/node_modules/.vite/deps/react.js';
          import {createRoot} from '/node_modules/.vite/deps/react-dom_client.js';
          import Cube from '/src/games/rubiks-cube/RubiksCube.jsx';
          createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(Cube)));
        </script></body></html>`)
        res.setHeader('Content-Type', 'text/html'); res.end(html)
      })
    },
  }], optimizeDeps: { include: ['react', 'react-dom/client'] }, server: { host: '127.0.0.1', port: 0 } })
  await server.listen()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/cube-check`)
  await page.getByText('Play Now →').click()
  const move = name => page.getByRole('button', { name, exact: true })
  await move('R').click()
  await page.waitForFunction(() => ![...document.querySelectorAll('button')].find(b => b.textContent === 'R').disabled)
  assert.equal(await page.getByText('SOLVED ✓').count(), 0)
  await move("R'").click()
  await page.getByText('SOLVED ✓').waitFor()
  await page.getByText('Reset / Solved').click()
  await page.getByRole('button', { name: /Execute/ }).click()
  await page.getByText('Reset / Solved').click()
  await page.waitForTimeout(1800)
  assert.equal(await page.getByText('No moves yet').count(), 1)
  await page.screenshot({ path: 'rubiks-desktop-check.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'mobile must not overflow horizontally')
  await page.screenshot({ path: 'rubiks-mobile-check.png', fullPage: true })
  assert.deepEqual(errors, [])
  console.log('PASS: real Chromium mount, turns, inverse, sequence cancellation, mobile width, no runtime errors')
} finally {
  await browser?.close()
  await server?.close()
  clearTimeout(deadline)
}
