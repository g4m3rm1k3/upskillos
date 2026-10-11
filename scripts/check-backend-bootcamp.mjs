#!/usr/bin/env node
// Reconstruct the learner-visible reference, never a parallel hand-maintained app.
// Default: content validation. --run: fresh temporary projects and real toolchains.
import { readdir, readFile, mkdir, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const { runChecks } = createRequire(import.meta.url)('../desktop/app/project-checks.cjs');
import { parseLesson } from '../src/labs/project-studio/parseTrack.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const names = ['fastapi', 'django', 'aspnet', 'nestjs'];
const args = process.argv.slice(2);
const filter = args.find(arg => arg.startsWith('--framework='))?.split('=')[1];
if (filter && !names.includes(filter)) throw new Error(`Unknown framework: ${filter}`);
if (args.some(arg => arg !== '--run' && !arg.startsWith('--framework='))) throw new Error('Usage: node scripts/check-backend-bootcamp.mjs [--run] [--framework=fastapi|django|aspnet|nestjs]');
const execute = args.includes('--run');
const output = execute ? await mkdtemp(path.join(tmpdir(), 'backend-bootcamp-')) : null;
const run = (command, argv, cwd, env = {}) => {
  console.log(`\n[${path.basename(cwd)}] ${command} ${argv.join(' ')}`);
  const result = spawnSync(command, argv, { cwd, env: { ...process.env, ...env }, stdio: 'inherit', timeout: 240_000 });
  if (result.error || result.status !== 0) throw new Error(`Command failed (${result.status}): ${result.error?.message ?? command}`);
};
let lessonsChecked = 0;
for (const name of names.filter(name => !filter || name === filter)) {
  const track = `backend-${name}`;
  const directory = path.join(root, 'src/labs/project-studio/tracks', track);
  const lessons = [];
  for (const filename of (await readdir(directory)).filter(file => file.endsWith('.md')).sort()) {
    const lesson = parseLesson(await readFile(path.join(directory, filename), 'utf8'), `${track}/${filename.slice(0, -3)}`);
    if (lesson.runtime !== 'none') throw new Error(`${lesson.id}: backend processes must be terminal-driven`);
    if (!lesson.steps.some(step => step.predictions.length)) throw new Error(`${lesson.id}: missing prediction`);
    if (!lesson.steps.some(step => step.hints.length && step.target === null)) throw new Error(`${lesson.id}: missing independent exercise`);
    for (const step of lesson.steps) {
      if (step.extraTargets?.length) throw new Error(`${step.id}: multiple target files`);
      if (step.file && (path.isAbsolute(step.file) || step.file.split(/[\\/]/).includes('..'))) throw new Error(`${step.id}: unsafe target`);
      if (step.edit) throw new Error(`${step.id}: reconstruction needs an explicit edit implementation`);
    }
    lessons.push(lesson);
    lessonsChecked++;
  }
  if (!execute) continue;
  const project = path.join(output, name);
  await mkdir(project, { recursive: true });
  const python = process.env.BACKEND_PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
  const dotnet = process.env.BACKEND_DOTNET ?? 'dotnet';
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const env = { DJANGO_SECRET_KEY: 'reference-runner-test-only-not-a-deployment-secret', DESK_DEBUG: '1', DOTNET_CLI_HOME: path.join(output, 'dotnet-home'), DOTNET_GENERATE_ASPNET_CERTIFICATE: 'false' };
  let interpreter;
  if (['fastapi', 'django'].includes(name)) {
    run(python, ['-m', 'venv', '.venv'], project);
    interpreter = path.join(project, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  }
  // The Django lesson explicitly starts with generated project/app scaffold.
  if (name === 'django') {
    run(interpreter, ['-m', 'pip', 'install', 'Django>=5.2,<5.3'], project);
    run(interpreter, ['-m', 'django', 'startproject', 'desk', '.'], project);
    run(interpreter, ['manage.py', 'startapp', 'tickets'], project);
  }
  if (name === 'aspnet') run(dotnet, ['new', 'web', '-n', 'Stock.Api', '--framework', 'net10.0', '--no-restore'], project, env);
  for (const lesson of lessons) {
    for (const step of lesson.steps.filter(step => step.file && step.target !== null)) {
      const target = path.join(project, step.file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, `${step.target}\n`);
    }
    // Verify the setup checkpoints before later files can hide a broken scaffold.
    if (interpreter && lesson === lessons[0]) run(interpreter, ['-m', 'pip', 'install', '-r', 'requirements.txt'], project);
    if (name === 'django' && lesson.id.endsWith('/02-configuration')) run(interpreter, ['manage.py', 'check'], project, env);
    if (name === 'django' && lesson.id.endsWith('/03-models')) {
      run(interpreter, ['manage.py', 'makemigrations', 'tickets'], project, env);
      run(interpreter, ['manage.py', 'migrate', '--noinput'], project, env);
    }
  }
  if (name === 'fastapi') run(interpreter, ['-m', 'pytest', '-q'], project);
  if (name === 'django') {
    run(interpreter, ['manage.py', 'check'], project, env);
    run(interpreter, ['manage.py', 'test', '--settings=desk.test_settings'], project);
  }
  if (name === 'aspnet') {
    run(dotnet, ['restore', 'Stock.Tests', '--use-lock-file'], project, env);
    run(dotnet, ['test', 'Stock.Tests', '--no-restore'], project, env);
  }
  if (name === 'nestjs') {
    run(npm, ['install', '--no-audit', '--no-fund'], project);
    run(npm, ['test'], project);
  }
  const commands = new Map(lessons.flatMap(lesson => lesson.steps.flatMap(step => step.checks))
    .filter(check => check.kind === 'run').map(check => [check.args[0], check]));
  const checkEnv = { ...process.env, DOTNET_CLI_HOME: env.DOTNET_CLI_HOME, DOTNET_GENERATE_ASPNET_CERTIFICATE: 'false' };
  if (path.isAbsolute(dotnet)) checkEnv.PATH = `${path.dirname(dotnet)}${path.delimiter}${process.env.PATH ?? ''}`;
  for (const check of commands.values()) {
    // A login shell can reset PATH. Honor the explicit author SDK override in the
    // command as well; learners with a normally installed SDK use the literal check.
    let selected = check;
    if (path.isAbsolute(dotnet) && check.args[0].startsWith('dotnet ')) {
      const quoted = process.platform === 'win32'
        ? `& '${dotnet.replaceAll("'", "''")}'`
        : "'" + dotnet.replaceAll("'", "'\\''") + "'";
      selected = { ...check, args: [quoted + check.args[0].slice('dotnet'.length)] };
    }
    const result = await runChecks(project, [selected], { env: checkEnv });
    if (!result.ok || result.results.some(item => !item.pass || item.skipped)) throw new Error(`Desktop check failed: ${JSON.stringify(result)}`);
    console.log(`PASS Desktop check: ${check.args[0]}`);
  }
  console.log(`PASS ${track}: reconstructed reference executed at ${project}`);
}
console.log(`PASS: ${lessonsChecked} backend lessons parsed and validated.${output ? ` Reference projects retained at ${output}; no servers left running.` : ' Runtime execution not requested.'}`);
