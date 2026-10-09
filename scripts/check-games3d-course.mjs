#!/usr/bin/env node
// Author verification only: reconstruct the exact required lesson edits in a
// fresh temporary folder. Never populates a learner's editor.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseLesson } from '../src/labs/project-studio/parseTrack.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(repo, 'src/labs/project-studio/tracks/games3d-foundations');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'games3d-course-'));
const keep = process.argv.includes('--keep');
const coreOnly = process.argv.includes('--core-only');
const index = process.argv.indexOf('--dotnet');
const dotnet = index < 0 ? 'dotnet' : process.argv[index + 1];
if (!dotnet || dotnet.startsWith('--')) throw new Error('--dotnet needs an executable path');
// Isolate author caches/configuration from the user's account. No global SDK,
// credential or NuGet settings are read or rewritten by this walkthrough.
fs.mkdirSync(path.join(root, '.config'), { recursive: true });
const env = { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: '1', DOTNET_SKIP_FIRST_TIME_EXPERIENCE: '1',
  DOTNET_GENERATE_ASPNET_CERTIFICATE: 'false', DOTNET_ADD_GLOBAL_TOOLS_TO_PATH: 'false',
  DOTNET_CLI_HOME: path.join(root, '.cli'), APPDATA: path.join(root, '.config'), NUGET_PACKAGES: path.join(root, '.packages') };
let milestones = 0;
function run(args, expected = '', failure = false) {
  const result = spawnSync(dotnet, [...args, '-p:UseSharedCompilation=false'], { cwd: root, env, encoding: 'utf8', timeout: 180000 });
  const output = (result.stdout || '') + (result.stderr || '');
  if (result.error || (failure ? result.status === 0 : result.status !== 0) || !output.includes(expected) || (failure && /error (?:CS|MSB|NU)\d/.test(output))) {
    throw new Error(`${dotnet} ${args.join(' ')}\n${result.error || ''}\n${output}`);
  }
  milestones++;
  console.log(`PASS ${failure ? 'expected assertion failure: ' : ''}${expected || args.join(' ')}`);
  return output;
}
function replaceChecked(file, before, after) {
  const source = fs.readFileSync(file, 'utf8');
  if (!source.includes(before)) throw new Error(`Mutation anchor missing: ${before}`);
  fs.writeFileSync(file, source.replace(before, after));
  return source;
}

try {
  for (const name of fs.readdirSync(directory).filter(name => name.endsWith('.md')).sort()) {
    const lesson = parseLesson(fs.readFileSync(path.join(directory, name), 'utf8'), `games3d-foundations/${name.slice(0, -3)}`);
    for (const step of lesson.steps) {
      if (step.optional) continue;
      if (step.edit) {
        const destination = path.resolve(root, step.file);
        if (!destination.startsWith(root + path.sep)) throw new Error('Edit escapes author workspace');
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        if (step.edit.mode === 'append') {
          if (!fs.existsSync(destination)) throw new Error(`Append before creation: ${step.file}`);
          fs.appendFileSync(destination, step.edit.code);
        } else fs.writeFileSync(destination, step.edit.code);
      }
      for (const check of step.checks) {
        if (check.kind !== 'run') throw new Error(`Unsupported walkthrough check: ${check.kind}`);
        const words = check.args[0].split(' ');
        if (words.shift() !== 'dotnet') throw new Error('Only explicit dotnet commands are supported');
        if (coreOnly && words.includes('Studio')) continue;
        run(words, check.opts.stdout || '');
      }
    }
  }

  const checks = path.join(root, 'Checks/Program.cs');
  let original = replaceChecked(checks, 'new Vector3(2.25f, 0.5f, 0)', 'new Vector3(2.5f, 0.5f, 0)');
  try { run(['run', '--project', 'Checks'], 'Selected object did not move', true); }
  finally { fs.writeFileSync(checks, original); }

  const scene = path.join(root, 'Core/Scene.cs');
  const mutations = [
    ['if (objects[i].Id != id) continue;', 'if (false) continue;', 'Unselected object moved'],
    ['objects[i] = objects[i] with { Position = position };', 'objects[i] = objects[i] with { Id = Guid.NewGuid(), Position = position };', 'Moving changed identity'],
    ['if (!IsFinite(position)) return false;', 'if (false) return false;', 'Overflow move accepted'],
  ];
  for (const [before, after, expected] of mutations) {
    original = replaceChecked(scene, before, after);
    try { run(['run', '--project', 'Checks'], expected, true); }
    finally { fs.writeFileSync(scene, original); }
  }
  const session = path.join(root, 'Core/EditorSession.cs');
  original = replaceChecked(session, '        return false;\n    }', '        SelectedId = Guid.Empty;\n        return false;\n    }');
  try { run(['run', '--project', 'Checks'], 'Failed selection lost previous selection', true); }
  finally { fs.writeFileSync(session, original); }
  run(['run', '--project', 'Checks'], 'EDITOR CHECKS PASSED');

  if (process.argv.includes('--graphics-smoke') && !coreOnly) {
    // Test-only bounded launch of the authored app: preserve its rendering/input
    // code, select/move through the same session operations, capture and close.
    // This verifies rendering, not native human keyboard or mouse delivery.
    const program = path.join(root, 'Studio/Program.cs');
    const source = fs.readFileSync(program, 'utf8');
    const screenshot = path.join(root, 'studio-smoke.png');
    const bounded = source
      .replace('try\n{\n    while (!Raylib.WindowShouldClose())', 'int smokeFrames = 0;\neditor.TrySelect(scene.Objects[1].Id);\neditor.TryMoveSelected(new Vector3(0.25f, 0, 0));\ntry\n{\n    while (!Raylib.WindowShouldClose() && smokeFrames++ < 10)')
      .replace('        Raylib.EndDrawing();', '        Raylib.EndDrawing();\n        if (smokeFrames == 5) Raylib.TakeScreenshot("studio-smoke.png");');
    if (bounded === source || !bounded.includes('smokeFrames++')) throw new Error('Graphics smoke anchor missing');
    fs.writeFileSync(program, bounded);
    try {
      run(['run', '--project', 'Studio']);
      if (!fs.existsSync(screenshot) || fs.statSync(screenshot).size < 1000) throw new Error('No useful graphics screenshot produced');
      console.log(`GRAPHICS SCREENSHOT ${screenshot}`);
    } finally { fs.writeFileSync(program, source); }
    run(['build', 'Studio']);
  }
  console.log(`PASS ${milestones} executed milestones; deliberate assertion failure and 4 rule mutations detected; restored checks pass`);
  console.log(coreOnly ? 'PASS reconstructed core course (graphics build skipped)' : 'PASS reconstructed 3D studio opening course');
} finally {
  if (keep) console.log(`AUTHOR WORKSPACE ${root}`);
  else {
    const resolved = path.resolve(root);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('games3d-course-'))
      throw new Error('Refusing to remove a path outside the generated author workspace');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
