// Called by verify-mean-stack.mjs --angular --browser against its generated project.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(process.argv[2]);
const database = 'mean_test_' + randomUUID().replaceAll('-', '');
process.env.MONGO_DB = database;
const { connect, prepare } = await import(pathToFileURL(path.join(root, 'server/db.js')));
const { client, db } = await connect(database);
const children = [];
let browser;
const launch = args => {
  const child = spawn(process.execPath, args, { cwd: root, env: process.env, windowsHide: true, stdio: 'pipe' });
  child.stderr.on('data', data => process.stderr.write(data));
  child.stdout.resume();
  children.push(child);
  return child;
};
async function ready(url) {
  for (let i = 0; i < 120; i++) {
    if (children.some(c => c.exitCode !== null)) throw new Error('A preview process exited');
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Preview did not start: ' + url);
}
try {
  await prepare(db);
  const api = launch([path.join(root, 'server/main.js')]);
  const cli = path.join(root, 'client/node_modules/@angular/cli/bin/ng.js');
  const ui = spawn(process.execPath, [cli, 'serve', '--host', '127.0.0.1', '--port', '4209', '--proxy-config', 'proxy.conf.json'], {
    cwd: path.join(root, 'client'), env: { ...process.env, NG_CLI_ANALYTICS: 'false' }, windowsHide: true, stdio: 'pipe'
  });
  ui.stdout.resume(); ui.stderr.on('data', data => process.stderr.write(data)); children.push(ui);
  await ready('http://127.0.0.1:4209');
  await ready('http://127.0.0.1:3000/api/projects/000000000000000000000001/tasks');
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:4209');
  await page.getByText('No tasks on this page.').waitFor();
  await page.getByLabel('Task title').fill('Browser task');
  await page.getByLabel('Task title').press('Enter');
  const done = page.getByRole('button', { name: 'Mark Browser task done', exact: true });
  await done.waitFor();
  const stale = await browser.newPage();
  await stale.goto('http://127.0.0.1:4209');
  await stale.getByRole('button', { name: 'Mark Browser task done', exact: true }).waitFor();
  await done.click();
  await page.getByRole('button', { name: 'Mark Browser task open', exact: true }).waitFor();
  await stale.getByRole('button', { name: 'Mark Browser task done', exact: true }).click();
  await stale.getByRole('alert').filter({ hasText: 'Another edit won' }).waitFor();
  await stale.getByRole('button', { name: 'Reload first page' }).click();
  await stale.getByRole('button', { name: 'Mark Browser task open', exact: true }).waitFor();
  assert.equal((await db.collection('tasks').findOne({ title: 'Browser task' })).status, 'done');
  const stopped = once(api, 'close'); api.kill(); await stopped;
  await page.getByRole('button', { name: 'Reload first page' }).click();
  await page.getByRole('alert').filter({ hasText: 'Request failed' }).waitFor();
  children.splice(children.indexOf(api), 1);
  launch([path.join(root, 'server/main.js')]);
  await ready('http://127.0.0.1:3000/api/projects/000000000000000000000001/tasks');
  await page.getByRole('button', { name: 'Reload first page' }).click();
  await page.getByRole('button', { name: 'Mark Browser task open', exact: true }).waitFor();
  await page.getByRole('alert').waitFor({ state: 'hidden' });
  await page.screenshot({ path: path.join(root, 'board-preview.png'), fullPage: true });
  assert.deepEqual(errors, []);
  console.log('Browser passed: empty state, keyboard creation, completion, two-tab conflict, API outage and persistence after restart.');
} finally {
  if (browser) await browser.close();
  await Promise.all(children.map(async child => {
    if (child.exitCode !== null) return;
    const closed = once(child, 'close'); child.kill(); await closed;
  }));
  try { await db.dropDatabase(); } finally { await client.close(); }
}
