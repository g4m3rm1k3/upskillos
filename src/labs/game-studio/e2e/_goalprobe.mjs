import { withGameStudio } from './harness.mjs';
const OUT = '/private/tmp/claude-501/-Users-michaelmclean-Testing-open-calc/173118ca-bc66-4079-acba-f924662f7d92/scratchpad/crib';
const failed = await withGameStudio(5189, async ({ page, t, check, answer }) => {
  await t('create-project').click();
  for (const id of ['td-step', 'q-agent', 'state-design']) {
    await t('menu-Help').click(); await t('item-Tutorials…').click();
    await t('tutorial-' + id).scrollIntoViewIfNeeded(); await t('tutorial-' + id).click();
    await answer('discard');
    await t('task-panel').waitFor({ timeout: 15000 });
    const before = await page.evaluate(() => JSON.stringify(window.__gameStudio.store.doc.project.brains ?? []));
    await t('task-watch-finished').click();
    await page.locator('iframe[title="Running game"]').waitFor({ timeout: 20000 });
    await page.waitForTimeout(6000);
    await page.screenshot({ path: OUT + '/goal-' + id + '.png' });
    const after = await page.evaluate(() => JSON.stringify(window.__gameStudio.store.doc.project.brains ?? []));
    const out = await page.evaluate(() => window.__gameStudio.store.output.map((o) => o.text).join(' | '));
    check(id + ': the finished agent runs, the project is unchanged, no errors', before === after && !/rror|Cannot/.test(out), out.slice(0, 200));
    await t('task-watch-finished').click();   // stop
  }
});
process.exit(failed ? 1 : 0);
