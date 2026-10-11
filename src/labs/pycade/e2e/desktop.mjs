// Start Vite separately, then:
// PYCADE_PYTHON=/absolute/path/to/python VITE_PORT=5189 node src/labs/pycade/e2e/desktop.mjs
import { _electron as electron } from 'playwright'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const root = fileURLToPath(new URL('../../../../', import.meta.url))
const python = process.env.PYCADE_PYTHON
if (!python || !path.isAbsolute(python)) throw new Error('Set PYCADE_PYTHON to an absolute interpreter path with numpy, gymnasium and torch.')
const profile = await mkdtemp(path.join(tmpdir(), 'pycade-desktop-'))
const port = process.env.VITE_PORT || '5189'
await mkdir(path.join(profile, 'notebook-kernel'))
await writeFile(path.join(profile, 'notebook-kernel/settings.json'), JSON.stringify({ python, folder: profile }))
const entry = path.join(profile, 'entry.cjs')
await writeFile(entry, `const {app}=require('electron'); app.setPath('userData',${JSON.stringify(profile)}); require(${JSON.stringify(path.join(root, 'desktop/app/main.cjs'))});`)
let app
try {
  app = await electron.launch({ args: [entry], env: { ...process.env, ELECTRON_RUN_AS_NODE: '', VITE_PORT: port }, timeout: 60000 })
  const page = await app.firstWindow()
  await page.setViewportSize({ width: 1500, height: 1050 })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${port}/#/lab/pycade`)
  await page.getByRole('heading', { name: /PyCade/ }).waitFor({ timeout: 60000 })
  await page.getByRole('button', { name: '2. Unpack a real return value' }).click()
  // Check the active line is actually inside the scrolling code viewport.
  await page.waitForFunction(() => {
    const line = document.querySelector('.pc-code>button.active')?.getBoundingClientRect()
    const pane = document.querySelector('.pc-code')?.getBoundingClientRect()
    return line && pane && line.top >= pane.top && line.bottom <= pane.bottom
  })
  assert.equal(await page.getByText('[1] reward · immediate feedback', { exact: true }).count(), 1)
  if (process.env.PYCADE_SCREENSHOT) await page.screenshot({ path: process.env.PYCADE_SCREENSHOT })
  for (const mode of ['q', 'a2c']) {
    await page.getByLabel('Learning program').selectOption(mode)
    await page.getByRole('button', { name: 'Run Python & capture trace' }).click()
    await page.getByText(/Native Python run/).waitFor({ timeout: 60000 })
    assert.equal(await page.getByRole('alert').count(), 0)
    console.log(`Desktop ${mode}: native Python trace captured`)
  }
  await page.getByRole('button', { name: 'Edit Python', exact: true }).click()
  const editor = page.getByLabel('Python source editor')
  await editor.fill((await editor.inputValue()).replace('gamma = 0.99', 'gamma = 0.0'))
  await page.getByRole('button', { name: 'Run Python & capture trace' }).click()
  await page.getByRole('button', { name: 'Edit Python', exact: true }).waitFor({ timeout: 60000 })
  assert.equal(await page.getByRole('alert').count(), 0)
  await page.getByRole('button', { name: '3. Follow one learning update' }).click()
  // gamma=0 implies target=1 for each CartPole transition; the actual math rendering uses that target.
  assert.match(await page.locator('.pc-math').innerText(), /time 0, world 0: 1 −/)
  assert.deepEqual(errors, [])
  console.log('Desktop edited A2C: gamma=0 gives target=1; renderer errors: []')
} finally {
  await app?.close()
  await rm(profile, { recursive: true, force: true })
}
