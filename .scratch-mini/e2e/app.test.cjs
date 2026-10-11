const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { _electron: electron } = require('playwright-core')

test('opens a project, edits a file and runs a command in the terminal', async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'minidesk-data-'))
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'minidesk-proj-'))
  fs.writeFileSync(path.join(project, 'notes.txt'), 'first')
  const app = await electron.launch({
    args: ['.'],
    env: { ...process.env, MINIDESK_USER_DATA: userData, MINIDESK_PROJECT: project },
  })
  try {
    const page = await app.firstWindow()
    assert.equal(await page.textContent('#title'), 'MiniDesk')
    assert.equal(await page.evaluate(() => typeof require), 'undefined', 'the page must not have Node')

    await page.click('#tree li:has-text("notes.txt")')
    assert.equal(await page.inputValue('#editor'), 'first')
    await page.fill('#editor', 'second')
    await page.click('#save')
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('saved'))
    assert.equal(fs.readFileSync(path.join(project, 'notes.txt'), 'utf8'), 'second')

    await page.waitForFunction(() => window.termId)
    await page.evaluate(() => window.desk.terminal.write(window.termId, 'echo hello-from-pty\r'))
    await page.waitForFunction(
      () => document.querySelector('#terminal').textContent.includes('hello-from-pty'),
      null,
      { timeout: 15000 },
    )
  } finally {
    await app.close()
    fs.rmSync(userData, { recursive: true, force: true })
    fs.rmSync(project, { recursive: true, force: true })
  }
})
