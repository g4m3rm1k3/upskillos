// Game state and saved games (engine/saves.ts), in the real editor and its sandboxed game frame:
// - state survives scene.change(): the forest sees the gold the title screen gave;
// - a save outlasts the run: the second run loads what the first one saved;
// - Run › Clear saved games empties the slots, so the third run starts fresh;
// - exported for a website, the game keeps its own saves: the second visit loads what the first saved.
//
//   node src/labs/game-studio/e2e/saves.acceptance.mjs   (starts and stops its own server)

import { createServer } from 'node:http';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname, dirname } from 'node:path';
import { unzipSync } from 'fflate';
import { withGameStudio } from './harness.mjs';

const TMP = mkdtempSync(join(tmpdir(), 'game-studio-saves-'));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
/** A plain static file server, as any web host is. */
function serve(root, port) {
  const server = createServer((req, res) => {
    let path = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html');
    if (!existsSync(path)) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(readFileSync(path));
  });
  return new Promise((ok) => server.listen(port, () => ok(server)));
}

const BUILD = `const title = project.createScene('scenes/title.scene', 'Node2D', 'Title');
project.writeScript('scripts/title.js', \`export default class Title extends Node2D {
  ready() {
    const had = save.load('slot1');
    console.log('loaded ' + had + ', gold ' + state.gold);
    state.gold = (state.gold ?? 0) + 5;
    save.write('slot1');
    scene.change('scenes/forest.scene');
  }
}\`);
title.root.script = 'scripts/title.js';
const forest = project.createScene('scenes/forest.scene', 'Node2D', 'Forest');
project.writeScript('scripts/forest.js', \`export default class Forest extends Node2D {
  ready() { console.log('the forest sees gold ' + state.gold); }
}\`);
forest.root.script = 'scripts/forest.js';
project.setMainScene('scenes/title.scene');`;

const failed = await withGameStudio(5193, async ({ page, t, check }) => {
  const store = (fn, arg) => page.evaluate(fn, arg);
  await store((code) => { const s = window.__gameStudio.store; s.newProject('Saves'); s.act((d) => d.runCode('Build the save test', code)); }, BUILD);
  await t('projects-dialog').getByRole('button', { name: 'Close' }).click();

  /** Run the project, wait for the forest, stop, and return the Output's lines. */
  const runOnce = async () => {
    await t('run-project').click();
    await page.waitForFunction(() => window.__gameStudio.store.output.some((o) => o.text.startsWith('the forest sees')), null, { timeout: 30000 });
    const lines = await store(() => window.__gameStudio.store.output.map((o) => o.text));
    await store(() => window.__gameStudio.store.stop());
    return lines;
  };

  const first = await runOnce();
  check('First run: nothing to load', first.includes('loaded false, gold undefined'), first.join(' | '));
  check('First run: the game saved, and Output says so', first.includes('Saved to slot "slot1"'));
  check('state survives scene.change(): the forest sees gold 5', first.includes('the forest sees gold 5'));

  const kept = await store(() => window.__gameStudio.store.savedGames());
  check('The editor keeps the slot after the game stops', kept.slot1 === '{"gold":5}', JSON.stringify(kept));

  const second = await runOnce();
  check('Second run: it loads what the first run saved', second.includes('loaded true, gold 5'), second.join(' | '));
  check('…and carries on from there: the forest sees gold 10', second.includes('the forest sees gold 10'));

  await store(() => window.__gameStudio.store.clearSavedGames());
  const third = await runOnce();
  check('After Run › Clear saved games, the game starts fresh', third.includes('loaded false, gold undefined') && third.includes('the forest sees gold 5'), third.join(' | '));

  // Exported for a website: no editor, so the page keeps the slots itself.
  await t('menu-Project').click();
  const [d] = await Promise.all([page.waitForEvent('download'), t('item-Export game for a website (.zip)…').click()]);
  const zipPath = join(TMP, d.suggestedFilename());
  await d.saveAs(zipPath);
  for (const [name, bytes] of Object.entries(unzipSync(new Uint8Array(readFileSync(zipPath))))) { mkdirSync(dirname(join(TMP, 'site', name)), { recursive: true }); writeFileSync(join(TMP, 'site', name), bytes); }
  const server = await serve(join(TMP, 'site'), 5194);
  const visit = async () => {
    const p = await page.context().newPage();
    const lines = [];
    p.on('console', (m) => lines.push(m.text()));
    await p.goto('http://localhost:5194/');
    for (let i = 0; i < 100 && !lines.some((l) => l.startsWith('the forest sees')); i++) await p.waitForTimeout(100);
    await p.close();
    return lines;
  };
  const firstVisit = await visit(), secondVisit = await visit();
  server.close();
  check('Exported: the first visit has nothing to load, and saves', firstVisit.includes('loaded false, gold undefined') && firstVisit.includes('the forest sees gold 5'), firstVisit.join(' | '));
  check('Exported: the second visit loads the first visit’s save', secondVisit.includes('loaded true, gold 5') && secondVisit.includes('the forest sees gold 10'), secondVisit.join(' | '));
});
process.exit(failed ? 1 : 0);
