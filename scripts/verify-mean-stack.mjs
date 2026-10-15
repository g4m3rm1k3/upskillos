// Reconstruct the learner's guided files; never copy independent exercise answers.
// Requires a running local MongoDB. --angular also downloads CLI 21 and builds the client.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, execFileSync } from 'node:child_process';
import { parseLesson } from '../src/labs/project-studio/parseTrack.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mean-walkthrough-'));
const chapters = ['start', 'model', 'database', 'api', 'angular', 'quality'];
const angular = process.argv.includes('--angular');
const run = command => execSync(command, { cwd: root, stdio: 'inherit', env: { ...process.env, CI: 'true', NG_CLI_ANALYTICS: 'false' }, timeout: 300000 });
console.log('Reconstructing in ' + root);
try {
  if (angular) run('npx --yes @angular/cli@21 new client --standalone --routing=false --style=css --ssr=false --skip-git --defaults');
  for (const chapter of chapters) {
    const dir = path.join(repo, 'src/labs/project-studio/tracks/mean-' + chapter);
    for (const name of fs.readdirSync(dir).filter(name => name.endsWith('.md')).sort()) {
      const lesson = parseLesson(fs.readFileSync(path.join(dir, name), 'utf8'), 'mean-' + chapter + '/' + name.slice(0, -3));
      for (const step of lesson.steps) {
        if (step.target == null) continue;
        if (step.extraTargets?.length) throw new Error('Multiple targets: ' + step.id);
        const target = path.resolve(root, step.file);
        if (!target.startsWith(root + path.sep)) throw new Error('Target escapes project');
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, step.target + '\n');
      }
      // Validate both the introductory and final Angular stages, not just the final overwrite.
      if (angular && chapter === 'angular') run('npm --prefix client run build');
    }
  }
  run('npm install --no-audit --no-fund');
  for (const demo of ['array', 'module', 'async']) run('node server/' + demo + '-practice.mjs');
  for (const demo of ['identity', 'closure', 'order', 'outcomes']) run('node server/' + demo + '-demo.mjs');
  run('node server/model-demo.js');
  run('npm test');
  run('node server/migration-practice.js');
  const appFile = path.join(root, 'server/app.js');
  const original = fs.readFileSync(appFile, 'utf8');
  try {
    const broken = original.replace('{ _id, projectId, version },', '{ _id, projectId },');
    if (broken === original) throw new Error('Concurrency mutation did not apply');
    fs.writeFileSync(appFile, broken);
    let rejected = false;
    try { execSync('node --test test/integration.test.js', { cwd: root, env: process.env, stdio: 'pipe', timeout: 30000 }); }
    catch (error) { rejected = /(?:not ok \d+ - |✖ )concurrent stale writers cannot both succeed/.test(String(error.stdout)) && error.status === 1; }
    if (!rejected) throw new Error('Tests accepted the missing version guard');
    console.log('Mutation check passed: missing version guard is rejected.');
  } finally { fs.writeFileSync(appFile, original); }
  if (process.argv.includes('--browser')) {
    if (!angular) throw new Error('--browser requires --angular');
    execFileSync(process.execPath, [path.join(repo, 'scripts/verify-mean-browser.mjs'), root], { stdio: 'inherit', env: process.env, timeout: 180000 });
  }
  console.log('MEAN guided reconstruction passed' + (angular ? ', including both Angular builds.' : '.'));
  console.log('Coverage: authored first-app milestone only; required advanced stages remain in development.');
} finally {
  if (process.argv.includes('--keep')) console.log('Kept project: ' + root);
  else {
    if (path.dirname(root) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('mean-walkthrough-')) throw new Error('Unsafe cleanup path');
    fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
