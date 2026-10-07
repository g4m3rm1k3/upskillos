// Walks "Build Your Own Game Studio" the way a learner would, in a fresh temporary project folder (walkCppTrack.js):
// every step's file typed in, the terminal commands run, every check passing, and wrong answers failing the checks
// they should. Needs Node 22 or newer, npm and Git; from lesson 0.6, Electron (npm downloads it).
import { afterAll } from 'vitest';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { walkCppTrack } from './walkCppTrack.js';
import { WALKTHROUGH } from './tracks/studio-build.walkthrough.js';

const require = createRequire(import.meta.url);

// `page` checks: in the app a hidden Electron window loads the learner's page; here Playwright's Chromium does.
let browser;
async function evalInPage(target, expr, { timeoutMs = 15000 } = {}) {
  browser ??= await require('playwright').chromium.launch();
  const page = await browser.newPage();
  const errors = [], logs = [];
  page.on('console', (m) => { logs.push(m.text()); if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => { logs.push(String(e.message)); errors.push(String(e.message)); });
  try {
    try { await page.goto(/^https?:\/\//.test(target) ? target : pathToFileURL(target).href, { timeout: timeoutMs }); }
    catch (e) { return { ok: false, reason: `The page didn't load: ${e.message}`, errors, logs }; }
    await page.waitForTimeout(200);
    try { const value = await page.evaluate(`(async () => (${expr}))()`); return { ok: true, value: value === undefined ? null : value, errors, logs }; }
    catch (e) { return { ok: false, reason: `Checking \`${expr}\` on the page failed: ${String(e.message).split('\n')[0]}`, errors, logs }; }
  } finally { await page.close(); }
}
afterAll(async () => { await browser?.close(); });

await walkCppTrack({
  evalInPage,
  trackKey: 'studio-build',
  title: 'Build Your Own Game Studio',
  walkthrough: WALKTHROUGH,
  lessonIds: ['00-01-the-plan-and-a-repository', '00-02-node-and-package-json', '00-03-typescript', '00-04-tests-first', '00-05-a-page-with-vite', '00-06-an-electron-window', '00-07-testing-the-window', '00-08-sprint-review', '01-01-vectors', '01-02-the-scene-tree', '01-03-positions-in-the-tree', '01-04-update-and-delta-time', '01-05-the-game-loop', '01-06-input', '01-07-the-game', '01-08-drawing-the-tree', '01-09-phaser-draws-it', '01-10-sprint-1-review', '02-01-scenes-as-data', '02-02-building-nodes-from-data', '02-03-properties', '02-04-checking-a-scene-file', '02-05-the-game-starts-from-a-file', '02-06-sprint-2-review', '03-01-the-scene-api', '03-02-add-delete-rename', '03-03-undo-with-commands', '03-04-undo-with-snapshots', '03-05-each-change-as-code', '03-06-running-the-code', '03-07-a-console-in-the-app', '03-08-sprint-3-review', '04-01-react-and-a-first-component', '04-02-the-editor-store', '04-03-the-console-as-a-component', '04-04-panels-around-the-game', '04-05-the-scene-tree-panel', '04-06-a-registry-of-node-types', '04-07-the-inspector', '04-08-sprint-4-review'],
  toolCheck: 'node --version',
  linkDirs: ['node_modules'],
  extraEnv: { GIT_AUTHOR_NAME: 'Learner', GIT_AUTHOR_EMAIL: 'learner@example.com', GIT_COMMITTER_NAME: 'Learner', GIT_COMMITTER_EMAIL: 'learner@example.com', ELECTRON_RUN_AS_NODE: '' },
});
