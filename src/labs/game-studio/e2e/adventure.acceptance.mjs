// Quest Buddies: Adventure in the real editor and game frame, played with the keyboard: the class menu, the walk to
// the forest, a fight with a slime (J), and the HUD's level and experience; screenshots of each.
//
//   node src/labs/game-studio/e2e/adventure.acceptance.mjs   (starts and stops its own server)

import { withGameStudio } from './harness.mjs';

const OUT = process.env.SCREENSHOTS;
const failed = await withGameStudio(5200, async ({ page, t, check }) => {
  const store = (fn, arg) => page.evaluate(fn, arg);
  await t('example-quest-adventure').click();
  await t('guide').waitFor({ timeout: 30000 });
  await page.locator('[title="Close the guide"]').click();
  await t('file-scenes/forest.scene').click();
  await t('tree-Player').click();   // so the live position can be read while it runs
  await t('run-project').click();
  const frame = page.locator('iframe[title="Running game"]');
  await frame.waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
  await frame.click({ position: { x: 5, y: 5 } });
  const key = async (k, ms = 120) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); await page.waitForTimeout(80); };
  await key('Enter'); await page.waitForTimeout(400);
  if (OUT) await frame.screenshot({ path: `${OUT}/qa-classes.png` });
  await key('Enter'); await page.waitForTimeout(800);   // Warrior

  const where = async () => {
    await store(() => window.__gameStudio.store.running.game.send({ type: 'inspect', path: 'Player' }));
    await page.waitForTimeout(150);
    return store(() => window.__gameStudio.store.running.live?.position);
  };
  const walkTo = async (x, y, tries = 80, near = 5) => {
    for (let i = 0; i < tries; i++) {
      const p = await where();
      if (!p) continue;
      const dx = x - p.x, dy = y - p.y;
      if (Math.abs(dx) <= near && Math.abs(dy) <= near) return p;
      if (Math.abs(dy) > near) await key(dy > 0 ? 'ArrowDown' : 'ArrowUp', Math.abs(dy) > 10 ? 120 : 40);
      else await key(dx > 0 ? 'ArrowRight' : 'ArrowLeft', 120);
    }
    return where();
  };
  // Through the east door: to the doorway's row, along to it, and in.
  await walkTo(296, 88, 200, 2);   // within 2 pixels of the doorway's middle: it is one tile, and the hero 10 pixels tall
  await key('ArrowRight', 800);
  await page.waitForTimeout(800);
  // In the forest (the hero stands at 32, 88): up to the first slime (at 200, 60) and attack it as it comes.
  const before = await where();
  check('The door took the hero into the forest (it arrives at x 32, on the west side; in town it was at x 300)', !!before && before.x < 150, JSON.stringify(before));
  await walkTo(150, 64, 120);
  for (let i = 0; i < 12; i++) { await key('ArrowRight', 100); await key('KeyJ', 60); if (i === 3 && OUT) await frame.screenshot({ path: `${OUT}/qa-hit.png` }); }
  await page.waitForTimeout(300);
  if (OUT) await frame.screenshot({ path: `${OUT}/qa-fight.png` });
  const out = await store(() => window.__gameStudio.store.output.map((o) => `${o.level}: ${o.text}`));
  check('No errors or sound warnings while playing', !out.some((l) => l.startsWith('error') || l.includes('Could not')), out.join(' | '));
  await t('stop').click();
}, { ready: 'example-quest-adventure' });
process.exit(failed ? 1 : 0);
