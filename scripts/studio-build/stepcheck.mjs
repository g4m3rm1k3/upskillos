// Checks one lesson of "Build Your Own Game Studio" step by step, fast: the project as it stands before the lesson is
// assembled from the earlier lessons' file blocks, then each step's files are written and its `run` and `contains`
// checks are run, as the learner would, with the walkthrough's hand edits; each wrong answer is tried on a copy and
// must fail the checks it names. Git and page checks are left to the full replay
// (studioBuild.desktop.test.js), which is still the final word.
//   node scripts/studio-build/stepcheck.mjs <lesson id or NN-NN> <node_modules folder> [--e2e] [--upto N] [--keep DIR]
//     --e2e      also run checks whose command runs the end-to-end tests (slow)
//     --upto N   stop after step N (1 = the first step), and print the folder, to run commands there by hand
//     --show     print the key lines of every command's output (test counts, errors), to quote in a lesson
//     --keep DIR assemble the project in DIR (emptied first) instead of a temporary folder
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseChecks } from '../../src/labs/project-studio/checks.js';
import { WALKTHROUGH } from '../../src/labs/project-studio/tracks/studio-build.walkthrough.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const track = path.join(root, 'src/labs/project-studio/tracks/studio-build');
const args = process.argv.slice(2);
const [want, modules] = args;
const e2e = args.includes('--e2e');
const upto = args.includes('--upto') ? Number(args[args.indexOf('--upto') + 1]) : Infinity;
const show = args.includes('--show');
const keep = args.includes('--keep') ? args[args.indexOf('--keep') + 1] : null;
if (!want || !modules) throw new Error('usage: stepcheck.mjs <lesson> <node_modules> [--e2e] [--upto N] [--keep DIR]');

const FENCE = /^```(\S*)([^\n]*)\n([\s\S]*?)\n```$/gm;
// Files a lesson removes with a command rather than a file block: [lesson step key, file].
const REMOVED = [
  ['00-03-typescript#Rename greet.js', 'src/greet.js'],
  ['00-03-typescript#Delete the mistake', 'src/oops.ts'],
  ['00-03-typescript#A script for the checker, and goodbye to hello.js', 'hello.js'],
  ['04-01-react-and-a-first-component#main.ts becomes main.tsx', 'src/main.ts'],
];

function steps(file) {
  const body = fs.readFileSync(path.join(track, file), 'utf8').split('---').slice(2).join('---');
  return body.split(/^## /m).slice(1).map((text) => {
    const title = text.split('\n', 1)[0];
    const files = [], checks = [];
    for (const m of text.matchAll(FENCE)) {
      const info = m[2].trim();
      if (info.startsWith('file=')) files.push([info.slice(5), m[3] + '\n']);
      else if (m[1] === 'check') checks.push(...parseChecks(m[3]));
    }
    return { key: `${file.slice(0, -3)}#${title}`, title, files, checks };
  });
}

function edit(dir, step) {
  for (const [p, pairs] of Object.entries(WALKTHROUGH[step.key]?.editFiles ?? {})) {
    let text = fs.readFileSync(path.join(dir, p), 'utf8');
    for (const [from, to] of pairs) text = text.replace(from, to);
    fs.writeFileSync(path.join(dir, p), text);
  }
}

function apply(dir, step) {
  edit(dir, step);
  for (const [p, body] of step.files) {
    fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
    fs.writeFileSync(path.join(dir, p), body);
  }
  for (const [key, p] of REMOVED) if (key === step.key) fs.rmSync(path.join(dir, p), { force: true });
}

const lessons = fs.readdirSync(track).filter((f) => f.endsWith('.md')).sort();
const target = lessons.find((f) => f.startsWith(want));
if (!target) throw new Error(`No lesson ${want}`);
const dir = keep ?? fs.mkdtempSync(path.join(os.tmpdir(), 'stepcheck-'));
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
for (const f of lessons.slice(0, lessons.indexOf(target))) for (const s of steps(f)) apply(dir, s);
fs.symlinkSync(path.resolve(modules), path.join(dir, 'node_modules'));
execSync('git init -q && git add -A && git -c user.name=L -c user.email=l@x commit -qm base', { cwd: dir });

let failed = 0;
const env = { ...process.env, ELECTRON_RUN_AS_NODE: '', NO_COLOR: '1' };
delete env.FORCE_COLOR;

// Runs one check in dir; returns the problems ([] if it passed), or null if it was skipped.
function check(dir, c) {
  if (c.kind === 'contains' || c.kind === 'lacks') {
    const text = fs.existsSync(path.join(dir, c.args[0])) ? fs.readFileSync(path.join(dir, c.args[0]), 'utf8') : '';
    return text.includes(c.args[1]) === (c.kind === 'contains') ? [] : ['not as expected'];
  }
  if (c.kind !== 'run') return null;
  const cmd = c.args[0];
  if (!e2e && /e2e|npm run check/.test(cmd)) return null;
  const r = spawnSync(cmd, { cwd: dir, shell: true, encoding: 'utf8', env, timeout: 300000 });
  const exit = Number(c.opts.exit ?? 0);
  const problems = [];
  if (r.status !== exit) problems.push(`exit ${r.status}, wanted ${exit}`);
  if (c.opts.stdout != null && !r.stdout.includes(c.opts.stdout)) problems.push(`stdout lacks "${c.opts.stdout}"`);
  if (c.opts.stderr != null && !r.stderr.includes(c.opts.stderr)) problems.push(`stderr lacks "${c.opts.stderr}"`);
  if (problems.length || show) {
    const lines = (r.stdout + '\n' + r.stderr).split('\n').filter((l) => /Tests |Error|expected|error TS|✗|×|FAIL/.test(l));
    const text = '\n' + lines.slice(0, 12).map((l) => '       ' + l.trim()).join('\n');
    if (problems.length) problems.push(text);
    else if (lines.length) console.log(text.slice(1));
  }
  return problems;
}

function copy(from) {
  const to = fs.mkdtempSync(path.join(os.tmpdir(), 'stepcheck-wrong-'));
  for (const name of fs.readdirSync(from)) {
    if (name === 'node_modules') fs.symlinkSync(fs.realpathSync(path.join(from, name)), path.join(to, name));
    else fs.cpSync(path.join(from, name), path.join(to, name), { recursive: true });
  }
  return to;
}

for (const [i, step] of steps(target).entries()) {
  if (i + 1 > upto) break;
  for (const w of WALKTHROUGH[step.key]?.wrong ?? []) {
    const wdir = copy(dir);
    edit(wdir, step);
    for (const [p, body] of Object.entries(w.files ?? {})) {
      fs.mkdirSync(path.dirname(path.join(wdir, p)), { recursive: true });
      fs.writeFileSync(path.join(wdir, p), body);
    }
    for (const cmd of w.run ?? []) spawnSync(cmd, { cwd: wdir, shell: true, env });
    const bad = [];
    let ran = 0;
    step.checks.forEach((c, n) => {
      if (!w.fails.includes(n)) return;
      const r = check(wdir, c);
      if (r !== null) ran++;
      if (r !== null && r.length === 0) bad.push(n);
    });
    if (bad.length) failed++;
    const verdict = bad.length ? `passed check(s) ${bad}` : ran ? 'fails as it should' : 'not tried (its checks need --e2e)';
    console.log(`${bad.length ? 'FAIL' : ran ? 'ok  ' : 'skip'} ${i + 1}. ${step.title}: wrong answer "${w.name}" ${verdict}`);
    fs.rmSync(wdir, { recursive: true, force: true });
  }
  apply(dir, step);
  for (const c of step.checks) {
    const problems = check(dir, c);
    const what = c.kind === 'run' ? c.args[0] : c.label;
    if (problems === null) { console.log(`skip ${i + 1}. ${step.title}: ${what}`); continue; }
    if (problems.length) failed++;
    console.log(`${problems.length ? 'FAIL' : 'ok  '} ${i + 1}. ${step.title}: ${what} ${problems.join('; ')}`);
  }
}
console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
if (upto !== Infinity || keep) console.log(`project: ${dir}`);
else fs.rmSync(dir, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
