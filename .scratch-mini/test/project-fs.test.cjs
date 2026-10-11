const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const projectFs = require('../lib/project-fs.cjs')

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'minidesk-fs-'))

test('writes and reads a file inside the project', async () => {
  await projectFs.write(root, 'src/a.txt', 'hello')
  assert.equal(await projectFs.read(root, 'src/a.txt'), 'hello')
})

test('lists folders first and hides node_modules', async () => {
  fs.mkdirSync(path.join(root, 'node_modules'), { recursive: true })
  const names = (await projectFs.list(root)).map((e) => e.name)
  assert.deepEqual(names, ['src'])
})

test('refuses paths that leave the project folder', async () => {
  await assert.rejects(projectFs.read(root, '../secret.txt'), /escapes the project folder/)
  await assert.rejects(projectFs.write(root, '../../x', 'no'), /escapes the project folder/)
})
