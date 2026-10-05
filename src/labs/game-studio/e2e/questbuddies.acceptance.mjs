// Quest Buddies in the real editor and game frame, played with the keyboard: the title menu, walking up to the
// ranger, her typewriter dialogue, the quest starting, the pause menu, and the bag.
//
//   node src/labs/game-studio/e2e/questbuddies.acceptance.mjs   (starts and stops its own server)

import { withGameStudio } from './harness.mjs';

const OUT = process.env.SCREENSHOTS;
const failed = await withGameStudio(5198, async ({ page, t, check }) => {
  const store = (fn, arg) => page.evaluate(fn, arg);
  await t('example-quest-buddies').click();
  await t('guide').waitFor({ timeout: 30000 });
  await page.locator('[title="Close the guide"]').click();
  await t('file-scenes/town.scene').click();
  await page.waitForTimeout(600);
  if (OUT) await page.screenshot({ path: `${OUT}/qb-editor-town.png` });

  await t('run-project').click();
  const frame = page.locator('iframe[title="Running game"]');
  await frame.waitFor({ timeout: 20000 });
  await page.waitForFunction(() => window.__gameStudio.store.output.some((o) => o.text.startsWith('▶')), null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  if (OUT) await frame.screenshot({ path: `${OUT}/qb-title.png` });
  await frame.click({ position: { x: 5, y: 5 } });
  const key = async (k, ms = 120) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); await page.waitForTimeout(80); };

  // New game has the focus: Enter starts it.
  await key('Enter');
  await page.waitForTimeout(800);
  if (OUT) await frame.screenshot({ path: `${OUT}/qb-town.png` });

  // Walk to the ranger with the arrow keys, steering by the hero's live position (as the Inspector reads it): how fast
  // a held key moves the hero depends on how many frames a headless browser draws, so the test does not count time.
  const where = async () => {
    await store(() => window.__gameStudio.store.running.game.send({ type: 'inspect', path: 'Player' }));
    await page.waitForTimeout(150);
    return store(() => window.__gameStudio.store.running.live?.position);
  };
  const walkTo = async (x, y) => {
    for (let i = 0; i < 80; i++) {
      const p = await where();
      if (!p) continue;
      const dx = x - p.x, dy = y - p.y;
      if (Math.abs(dx) <= 4 && Math.abs(dy) <= 4) return p;
      if (Math.abs(dx) > 4) await key(dx > 0 ? 'ArrowRight' : 'ArrowLeft', 150);
      else await key(dy > 0 ? 'ArrowDown' : 'ArrowUp', 150);
    }
    return where();
  };
  const at = await walkTo(168, 92);
  check('The arrow keys walk the hero to the ranger', Math.abs(at.x - 168) <= 6 && Math.abs(at.y - 92) <= 6, JSON.stringify(at));
  await key('KeyE');
  await page.waitForTimeout(700);
  if (OUT) await frame.screenshot({ path: `${OUT}/qb-dialogue.png` });
  // E finishes line 1, E shows line 2, (it types out), E ends the conversation and the quest starts.
  for (let i = 0; i < 3; i++) { await key('KeyE'); await page.waitForTimeout(2300); }
  await page.waitForTimeout(300);
  if (OUT) await frame.screenshot({ path: `${OUT}/qb-quest.png` });

  await key('Escape'); await page.waitForTimeout(300);
  if (OUT) await frame.screenshot({ path: `${OUT}/qb-pause.png` });
  await key('Escape');
  await key('KeyI'); await page.waitForTimeout(300);
  if (OUT) await frame.screenshot({ path: `${OUT}/qb-bag.png` });
  await key('KeyI');

  const out = await store(() => window.__gameStudio.store.output.map((o) => `${o.level}: ${o.text}`));
  check('No errors or sound warnings while playing', !out.some((l) => l.startsWith('error') || l.includes('Could not')), out.join(' | '));
  await t('stop').click();
}, { ready: 'example-quest-buddies' });
process.exit(failed ? 1 : 0);
