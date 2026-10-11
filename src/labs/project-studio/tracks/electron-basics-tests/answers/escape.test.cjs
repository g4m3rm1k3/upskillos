const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { _electron: electron } = require('playwright-core')

test('the page cannot read outside the project folder', async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'minidesk-data-'))
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'minidesk-proj-'))
  const app = await electron.launch({
    args: ['.'],
    env: { ...process.env, MINIDESK_USER_DATA: userData, MINIDESK_PROJECT: project },
  })
  try {
    const page = await app.firstWindow()
    const message = await page.evaluate(
      () => window.desk.project.read('../../etc/passwd').then(() => 'read it', (e) => e.message),
    )
    assert.match(message, /escapes the project folder/)
  } finally {
    await app.close()
    fs.rmSync(userData, { recursive: true, force: true })
    fs.rmSync(project, { recursive: true, force: true })
  }
})
