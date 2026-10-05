// UI widgets in the real editor and game frame: a menu (Panel, VBoxContainer of Buttons, a wrapped Label, a
// ProgressBar) drawn in the editor's viewport and in the running game; clicking a button with the mouse; the arrow
// keys and Enter working the menu; a disabled button ignoring both.
//
//   node src/labs/game-studio/e2e/widgets.acceptance.mjs   (starts and stops its own server)

import { withGameStudio } from './harness.mjs';

const OUT = process.env.SCREENSHOTS;
const BUILD = `const s = project.createScene('scenes/menu.scene', 'Node2D', 'Menu');
s.add('CanvasLayer', { name: 'HUD' });
s.add('Panel', { name: 'Box', parent: 'HUD', position: { x: 300, y: 60 }, size: { x: 360, y: 420 } });
s.add('VBoxContainer', { name: 'Buttons', parent: 'HUD/Box', position: { x: 30, y: 30 }, separation: 12 });
s.add('Button', { name: 'New game', parent: 'HUD/Box/Buttons', text: 'New game', size: { x: 300, y: 48 } });
s.add('Button', { name: 'Continue', parent: 'HUD/Box/Buttons', text: 'Continue', size: { x: 300, y: 48 }, disabled: true });
s.add('Button', { name: 'Options', parent: 'HUD/Box/Buttons', text: 'Options', size: { x: 300, y: 48 } });
s.add('Label', { name: 'Story', parent: 'HUD/Box', position: { x: 30, y: 230 }, fontSize: 16, wrapWidth: 300, text: 'The old ranger looks up from the fire. "The forest has been quiet for too long. Will you find out why?"' });
s.add('ProgressBar', { name: 'Hp', parent: 'HUD/Box', position: { x: 30, y: 360 }, size: { x: 300, y: 20 }, value: 70, showText: true });
project.writeScript('scripts/menu.js', \`export default class Menu extends Node2D {
  ready() {
    const buttons = this.get('HUD/Box/Buttons');
    for (const b of buttons.children) b.connect('pressed', () => console.log('pressed ' + b.name));
    // Options shows the typewriter part-way: the first 40 letters, on the lines the whole text wraps to.
    buttons.get('Options').connect('pressed', () => { this.get('HUD/Box/Story').visibleCharacters = 40; });
    buttons.get('New game').grabFocus();
  }
}\`);
s.root.script = 'scripts/menu.js';
project.setMainScene('scenes/menu.scene');`;

const failed = await withGameStudio(5195, async ({ page, t, check }) => {
  const store = (fn, arg) => page.evaluate(fn, arg);
  await store((code) => { const s = window.__gameStudio.store; s.newProject('Widgets'); s.act((d) => d.runCode('Build the menu', code)); }, BUILD);
  await t('projects-dialog').getByRole('button', { name: 'Close' }).click();
  await t('file-scenes/menu.scene').click();
  await page.waitForTimeout(500);
  if (OUT) await page.screenshot({ path: `${OUT}/widgets-editor.png` });

  await t('run-project').click();
  const frame = page.locator('iframe[title="Running game"]');
  await frame.waitFor({ timeout: 20000 });
  await page.waitForFunction(() => window.__gameStudio.store.output.some((o) => o.text.startsWith('▶')), null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  if (OUT) await frame.screenshot({ path: `${OUT}/widgets-game.png` });

  // Game pixels to page pixels: the canvas is scaled to fit the frame and centred.
  const box = await frame.boundingBox();
  const k = Math.min(box.width / 960, box.height / 540), ox = box.x + (box.width - 960 * k) / 2, oy = box.y + (box.height - 540 * k) / 2;
  const at = (x, y) => ({ x: ox + x * k, y: oy + y * k });
  const lines = () => store(() => window.__gameStudio.store.output.map((o) => o.text));

  // Buttons: x 330–630; New game y 90–138, Continue 150–198, Options 210–258.
  const click = async (x, y) => { const p = at(x, y); await page.mouse.move(p.x, p.y); await page.waitForTimeout(100); await page.mouse.down(); await page.waitForTimeout(100); await page.mouse.up(); await page.waitForTimeout(300); };
  await click(480, 234);
  check('Clicking Options with the mouse presses it', (await lines()).includes('pressed Options'));
  await click(480, 174);
  check('Clicking the disabled Continue does nothing', !(await lines()).includes('pressed Continue'));

  await frame.click({ position: { x: 5, y: 5 } });   // keys go to the game frame (the corner is outside every button)
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(150);
  await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  const out = await lines();
  check('ArrowDown skips the disabled button; Enter presses the focused Options', out.filter((l) => l === 'pressed Options').length === 2 && !out.includes('pressed Continue'), out.join(' | '));
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(150);
  await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  check('ArrowUp, Enter presses New game', (await lines()).includes('pressed New game'));
  if (OUT) await frame.screenshot({ path: `${OUT}/widgets-game-focus.png` });
  const errors = await store(() => window.__gameStudio.store.output.filter((o) => o.level === 'error').map((o) => o.text));
  check('No errors in the game', errors.length === 0, errors.join(' | '));
  await t('stop').click();
});
process.exit(failed ? 1 : 0);
