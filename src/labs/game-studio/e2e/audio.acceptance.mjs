// Sounds in the real editor and game frame: Files › New sound… opens a recipe beside its waveform; a bad recipe is
// not saved and says why; a good one is; an AudioStreamPlayer plays it in the running game (the browser loads the
// .wav made from the recipe, and finished() comes after its length).
//
//   node src/labs/game-studio/e2e/audio.acceptance.mjs   (starts and stops its own server)

import { withGameStudio } from './harness.mjs';

const OUT = process.env.SCREENSHOTS;
const SCENE = `const s = project.createScene('scenes/main.scene', 'Node2D', 'Main');
s.add('AudioStreamPlayer', { name: 'Ding', stream: 'assets/coin.wav' });
project.writeScript('scripts/main.js', \`export default class Main extends Node2D {
  ready() {
    const ding = this.get('Ding');
    ding.connect('finished', () => console.log('finished at ' + time.now.toFixed(2)));
    ding.play();
    console.log('playing ' + ding.playing);
  }
}\`);
s.root.script = 'scripts/main.js';
project.setMainScene('scenes/main.scene');`;

const failed = await withGameStudio(5196, async ({ page, t, check }) => {
  const store = (fn, arg) => page.evaluate(fn, arg);
  await store(() => window.__gameStudio.store.newProject('Sounds'));
  await t('projects-dialog').getByRole('button', { name: 'Close' }).click();

  // Files › New sound…, named coin.
  await t('new-sound').click();
  await page.keyboard.type('coin'); await page.keyboard.press('Enter');
  await t('sound-preview').waitFor({ timeout: 10000 });
  const made = await store(() => window.__gameStudio.store.project.assets.find((a) => a.path === 'assets/coin.wav'));
  check('New sound… makes assets/coin.wav from a starting recipe, and opens it beside its waveform', made?.kind === 'sound' && made.sound.wave === 'square' && (await t('hear-recipe').count()) === 1);
  const log = await store(() => window.__gameStudio.store.doc.log.at(-1).code);
  check('…logged as code', log.startsWith('project.writeSound("assets/coin.wav", { wave: "square"'), log);

  // A broken recipe: the problem shows, and saving leaves it unsaved.
  await store(() => { const s = window.__gameStudio.store; s.editScript('assets/coin.wav', '{ "wave": "square", "from": 5, "to": 1760, "length": 0.15 }'); });
  await page.waitForTimeout(200);
  const problem = await t('sound-problem').innerText().catch(() => '');
  await store(() => window.__gameStudio.store.saveScript('assets/coin.wav'));
  const still = await store(() => window.__gameStudio.store.isScriptDirty('assets/coin.wav'));
  check('A pitch of 5 Hz is shown as a problem, and the recipe is not saved', /from is a pitch in hertz/.test(problem) && still, problem);

  // A good one: saved, with a new id (so a new .wav).
  await store(() => { const s = window.__gameStudio.store; s.editScript('assets/coin.wav', '{ "wave": "triangle", "from": 660, "to": 1320, "length": 0.3 }'); s.saveScript('assets/coin.wav'); });
  const saved = await store(() => window.__gameStudio.store.project.assets.find((a) => a.path === 'assets/coin.wav'));
  check('A good recipe saves', saved.sound.wave === 'triangle' && saved.sound.length === 0.3 && saved.id !== made.id);
  if (OUT) await page.screenshot({ path: `${OUT}/audio-editor.png` });

  // In the game.
  await store((code) => window.__gameStudio.store.act((d) => d.runCode('Play the sound', code)), SCENE);
  await t('run-project').click();
  await page.waitForFunction(() => window.__gameStudio.store.output.some((o) => o.text.startsWith('finished at')), null, { timeout: 30000 }).catch(() => {});
  const out = await store(() => window.__gameStudio.store.output.map((o) => `${o.level}: ${o.text}`));
  const at = Number(out.find((l) => l.includes('finished at'))?.split('finished at ')[1]);
  check('The game plays it: playing is true at once, and finished comes after the 0.3 s', out.includes('log: playing true') && at >= 0.3 && at < 0.6, out.join(' | '));
  check('The browser loaded the .wav (no "Could not load" or "Could not play")', !out.some((l) => l.includes('Could not')));
  check('No errors', !out.some((l) => l.startsWith('error')));
  await t('stop').click();
});
process.exit(failed ? 1 : 0);
