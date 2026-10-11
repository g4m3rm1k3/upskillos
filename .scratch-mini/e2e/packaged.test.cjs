// Runs the PACKAGED app (dist/win-unpacked) through the same checks as the dev e2e test.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { _electron: electron } = require('playwright-core')

const exe = process.env.MINIDESK_EXE
test('the packaged app starts and its terminal works', { skip: !exe }, async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'minidesk-data-'))
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'minidesk-proj-'))
  const app = await electron.launch({
    executablePath: exe,
    env: { ...process.env, MINIDESK_USER_DATA: userData, MINIDESK_PROJECT: project },
  })
  try {
    const page = await app.firstWindow()
    assert.equal(await page.evaluate(() => window.desk.info().then((i) => i.packaged)), true)
    await page.waitForFunction(() => window.termId || document.querySelector('#terminal').textContent.includes("couldn't"), null, { timeout: 15000 })
    await page.evaluate(() => window.desk.terminal.write(window.termId, 'echo hello-from-pty\r'))
    await page.waitForFunction(() => document.querySelector('#terminal').textContent.includes('hello-from-pty'), null, { timeout: 15000 })
  } finally {
    await app.close()
    fs.rmSync(userData, { recursive: true, force: true })
    fs.rmSync(project, { recursive: true, force: true })
  }
})
