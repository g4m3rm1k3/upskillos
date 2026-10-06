// Tool scripts in the real editor: Files › New tool… makes scripts/tools/<name>.js, you write the function, ▶ Run tool
// builds what it says as one step (GUI → code shows project.runTool), Ctrl+Z takes it back, and the game still runs
// with the tool in the project (the game imports it, which only defines the function).
//
//   node src/labs/game-studio/e2e/tools.acceptance.mjs   (starts and stops its own server)

import { withGameStudio } from './harness.mjs';

const OUT = process.env.SCREENSHOTS;
const TOOL = `// Draws a row of five coloured squares, each its own picture, and a scene that shows them.
export default function (project) {
  const colours = ['#e63946', '#f4a261', '#e9c46a', '#2a9d8f', '#264653'];
  const s = project.createScene('scenes/row.scene', 'Node2D', 'Row');
  colours.forEach((fill, i) => {
    project.writeSvg(\`assets/square_\${i}.svg\`, \`<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><rect x="2" y="2" width="56" height="56" rx="8" fill="\${fill}"/></svg>\`);
    s.add('Sprite2D', { name: 'Square' + i, position: { x: 200 + i * 80, y: 270 }, texture: \`assets/square_\${i}.svg\` });
  });
  project.setMainScene('scenes/row.scene');
}
`;

const failed = await withGameStudio(5201, async ({ page, t, check }) => {
  const store = (fn, arg) => page.evaluate(fn, arg);
  await store(() => window.__gameStudio.store.newProject('Tools'));
  await t('projects-dialog').getByRole('button', { name: 'Close' }).click();
  await t('new-tool').click();
  await t('new-tool-name').fill('squares');
  await t('new-tool-name').press('Enter');
  await t('run-tool').waitFor({ timeout: 10000 });
  const path = await store(() => window.__gameStudio.store.tab.path);
  check('New tool… makes scripts/tools/squares.js and opens it, with a ▶ Run tool button', path === 'scripts/tools/squares.js', path);
  await store((src) => window.__gameStudio.store.editScript('scripts/tools/squares.js', src), TOOL);
  await t('run-tool').click();
  await page.waitForTimeout(300);
  const assets = await store(() => window.__gameStudio.store.project.assets.map((a) => a.path));
  check('▶ Run tool saves the tool and runs it: five pictures and a scene', assets.length === 5 && !!(await store(() => window.__gameStudio.store.project.scenes.find((s) => s.path === 'scenes/row.scene'))), JSON.stringify(assets));
  await t('tab-code').click();
  const log = await page.locator('body').innerText();
  check('GUI → code shows the run as one line, project.runTool(…)', log.includes('project.runTool("scripts/tools/squares.js")'), '');
  if (OUT) { await t('file-scenes/row.scene').click(); await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/tools-editor.png` }); }

  await t('run-project').click();
  const frame = page.locator('iframe[title="Running game"]');
  await frame.waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
  if (OUT) await frame.screenshot({ path: `${OUT}/tools-game.png` });
  const out = await store(() => window.__gameStudio.store.output.map((o) => `${o.level}: ${o.text}`));
  check('The game runs with the tool in the project, and no errors', !out.some((l) => l.startsWith('error')), out.join(' | '));
  await t('stop').click();

  await store(() => { const s = window.__gameStudio.store; s.doc.undo(); s.changed(); });
  const after = await store(() => window.__gameStudio.store.project.assets.length);
  check('Ctrl+Z takes the whole run back at once', after === 0, String(after));
});
process.exit(failed ? 1 : 0);
