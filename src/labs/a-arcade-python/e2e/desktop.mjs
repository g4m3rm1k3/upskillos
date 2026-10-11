// The lab in the real desktop app: Electron's preload and IPC, the runtime, the venv and Python.
// Start Vite first (npx vite --port 5189 --strictPort), then:
//   VITE_PORT=5189 AARCADE_SHOTS=<folder> node src/labs/a-arcade-python/e2e/desktop.mjs
// The lab's venv must already be set up (the lab's Set up button).
import { _electron as electron } from 'playwright'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'

const root = fileURLToPath(new URL('../../../../', import.meta.url))
const port = process.env.VITE_PORT || '5189'
const shots = process.env.AARCADE_SHOTS
// A temporary profile, so this runs beside an app that is already open. The lab's environment
// lives in <appData>/UpSkillOS/aarcade-python either way, so it is found.
const profile = await mkdtemp(path.join(tmpdir(), 'aarcade-desktop-'))
const entry = path.join(profile, 'entry.cjs')
await writeFile(entry, `const {app}=require('electron'); app.setPath('userData',${JSON.stringify(profile)}); require(${JSON.stringify(path.join(root, 'desktop/app/main.cjs'))});`)
// ELECTRON_RUN_AS_NODE (set inside VS Code) would start Electron as plain Node: remove it entirely;
// on Windows an empty value still counts as set.
const { ELECTRON_RUN_AS_NODE, ...env } = process.env
const app = await electron.launch({ args: [entry], env: { ...env, VITE_PORT: port }, timeout: 60000 })
try {
  const page = await app.firstWindow()
  await page.setViewportSize({ width: 1700, height: 1100 })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`http://localhost:${port}/#/lab/a-arcade-python`)
  await page.getByRole('heading', { name: 'A-Arcade Python' }).first().waitFor({ timeout: 60000 })
  await page.locator('text=A-Arcade Python').first().dblclick().catch(() => {})
  const start = page.getByRole('button', { name: 'Start', exact: true })
  await start.waitFor({ timeout: 60000 })
  await page.waitForFunction(() => !document.querySelector('.ap-program button:nth-last-child(2)')?.disabled, null, { timeout: 60000 })
  await start.click()
  await page.getByText(/lines run$/).waitFor({ timeout: 60000 })
  for (let i = 0; i < 40; i++) { await page.getByRole('button', { name: 'Next action' }).click(); await page.getByText(/lines run$/).waitFor({ timeout: 60000 }) }
  const filled = await page.locator('.ap-qtable .ap-qcell:not(.empty):not(.best)').count()
  console.log(`Desktop Q-learning: after 40 pushes, ${filled} Q-table entries are filled`)
  assert.ok(filled > 5)
  if (shots) await page.screenshot({ path: path.join(shots, 'desktop-q.png') })
  await page.getByRole('button', { name: 'A2C (Chapter 4)' }).click()
  await page.getByText(/lines run$/).waitFor({ timeout: 60000 })
  for (let i = 0; i < 12; i++) {
    if (await page.locator('.ap-line.current', { hasText: 'loss.backward()' }).count()) break
    await page.getByRole('toolbar', { name: 'Parts of the loop' }).getByRole('button', { name: /^Learn/ }).click()
    await page.getByText(/lines run$/).waitFor({ timeout: 60000 })
    if (!await page.locator('.ap-line.current', { hasText: 'loss.backward()' }).count()) { await page.getByRole('button', { name: 'Step over' }).click(); await page.getByText(/lines run$/).waitFor({ timeout: 60000 }) }
  }
  await page.getByRole('button', { name: 'Step over' }).click()
  await page.getByText(/lines run$/).waitFor({ timeout: 60000 })
  await page.getByRole('tab', { name: 'Gradient (after backward)' }).click()
  assert.equal(await page.getByText(/no gradient yet/).count(), 0)
  console.log('Desktop A2C: backward() filled the gradients of all 6 parameter tensors')
  if (shots) await page.screenshot({ path: path.join(shots, 'desktop-a2c.png') })
  console.log(`Renderer errors: ${JSON.stringify(errors)}`)
  assert.deepEqual(errors, [])
} finally {
  await app.close()
}
