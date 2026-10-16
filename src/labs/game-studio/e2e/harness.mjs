// Shared by Game Studio's browser tests: start a dev server on its own port, open a
// fresh browser profile at Game Studio, record checks, and always clean up.
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { getLatestWhatsNewId } from '../../../data/whatsNew.js';

/** opts.hash: where to open (a task link, say); opts.ready: the test id to wait for first; opts.scale: the device pixel ratio (pictures). */
export async function withGameStudio(port, body, opts = {}) {
  const hash = opts.hash ?? '#/lab/game-studio', ready = opts.ready ?? 'projects-dialog';
  const results = [];
  const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? '✓' : '✗'} ${name}${detail ? `  (${detail})` : ''}`); };
  // Windows has only npx.cmd, so the server runs under a shell there, and its whole process tree is
  // ended (/T); elsewhere it gets its own process group, which is ended as one.
  const win = process.platform === 'win32';
  const server = spawn('npx', ['vite', '--port', String(port), '--strictPort'], { stdio: 'ignore', ...(win ? { shell: true } : { detached: true }) });
  const stopServer = () => { try { win ? spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F']) : process.kill(-server.pid); } catch { /* already gone */ } };
  process.on('exit', stopServer);
  let browser, page;
  try {
    for (let i = 0; ; i++) {
      try { if ((await fetch(`http://localhost:${port}/`)).ok) break; } catch { /* not yet */ }
      if (i > 90) throw new Error('The dev server did not start');
      await new Promise((r) => setTimeout(r, 1000));
    }
    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1500, height: 950 }, deviceScaleFactor: opts.scale ?? 1, permissions: ['clipboard-read', 'clipboard-write'] });
    // Mark the site's welcome tour as seen (src/context/TourContext.jsx), so its popup
    // never appears part-way through and covers what a test clicks.
    // …and the latest "What's new" as read: a visitor who has seen the tour is a returning one, who gets it otherwise.
    await context.addInitScript((whatsNew) => { try { localStorage.setItem('oc-tour-seen', '1'); if (whatsNew) localStorage.setItem('oc-whatsnew-last-seen', whatsNew); } catch { /* the sandboxed game frame has no storage */ } }, getLatestWhatsNewId());
    page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    // Game Studio asks its own questions (store.ask); a browser confirm() box would be a mistake, so any
    // is answered "no", as a browser that blocks dialogs would, rather than accepted.
    page.on('dialog', (d) => d.dismiss());
    await page.goto(`http://localhost:${port}/${hash}`, { timeout: 120000 }); // the first visit compiles the app
    await page.getByTestId(ready).waitFor({ timeout: 60000 });
    const max = page.locator('button[title="Maximize"]');
    if (await max.count()) await max.first().click();
    const skip = page.getByRole('button', { name: 'Skip' });
    if (await skip.count()) await skip.first().click().catch(() => {});
    /** Answer the editor's own question (store.ask), if one is showing. */
    const answer = async (value) => { const b = page.getByTestId(`answer-${value}`); if (await b.count()) await b.click(); };
    await body({ page, t: (id) => page.getByTestId(id), check, answer });
    check('No page errors', pageErrors.length === 0, pageErrors.join(' | '));
  } catch (e) {
    // A picture of the page as it stood, in the temp folder (never the repository).
    const shot = join(tmpdir(), `game-studio-failure-${port}.png`);
    const saved = await page?.screenshot({ path: shot }).then(() => true, () => false);
    check('The test ran to the end', false, `${e instanceof Error ? e.message.split('\n')[0] : String(e)}${saved ? `; screenshot: ${shot}` : ''}`);
  } finally {
    await browser?.close();
    stopServer();
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  return failed;
}
