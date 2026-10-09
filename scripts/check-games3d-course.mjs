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
const finalOnly = process.argv.includes('--final-only');
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
        if (finalOnly) continue;
        if (check.kind !== 'run') throw new Error(`Unsupported walkthrough check: ${check.kind}`);
        const words = check.args[0].split(' ');
        if (words.shift() !== 'dotnet') throw new Error('Only explicit dotnet commands are supported');
        if (coreOnly && (words.includes('Studio') || words.includes('Bot'))) continue;
        run(words, check.opts.stdout || '');
      }
    }
  }

  if (finalOnly) {
    run(['run', '--project', 'Checks'], 'STORE CHECKS PASSED');
    if (!coreOnly) { run(['build', 'Studio']); run(['build', 'Bot']); }
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
  const historyMutations = [
    ['Core/SceneEditing.cs', 'objects.RemoveAt(i);', 'objects.RemoveAt(0);', 'Delete transition is wrong'],
    ['Core/EditorHistory.cs', 'redo.Clear();', '// redo.Clear();', 'New edit kept obsolete redo'],
    ['Core/EditorHistory.cs', 'Restore(undo.Pop());', 'undo.Pop();', 'Basic undo lost original position'],
    ['Core/EditorHistory.cs', 'SelectedId = snapshot.SelectedId;', '// SelectedId = snapshot.SelectedId;', 'Undo did not restore deleted selection'],
    ['Core/QAgent.cs', 'result.Terminal ? 0 : Value(result.State, Greedy(result.State))', 'Value(result.State, Greedy(result.State))', 'Terminal update bootstrapped'],
    ['Core/SceneCodec.cs', 'data.Version != 1', 'false', 'Future version accepted'],
    ['Core/SceneCodec.cs', '!ids.Add(item.Id)', 'false', 'Duplicate IDs accepted'],
    ['Core/EditorLoading.cs', 'redo.Clear();', '// redo.Clear();', 'Open kept stale history'],
  ];
  for (const [relative, before, after, expected] of historyMutations) {
    const file = path.join(root, relative);
    original = replaceChecked(file, before, after);
    try { run(['run', '--project', 'Checks'], expected, true); }
    finally { fs.writeFileSync(file, original); }
  }
  run(['run', '--project', 'Checks'], 'EDITOR CHECKS PASSED');

  if (process.argv.includes('--graphics-smoke') && !coreOnly) {
    // Test-only bounded launch of the authored app: preserve its rendering/input
    // code, select/move through the same session operations, capture and close.
    // This verifies rendering, not native human keyboard or mouse delivery.
    const program = path.join(root, 'Studio/Program.cs');
    const source = fs.readFileSync(program, 'utf8');
    const screenshot = path.join(root, 'studio-smoke.png');
    const bounded = source
      .replace('try\n{\n    while (!Raylib.WindowShouldClose())', 'int smokeFrames = 0;\neditor.TrySelect(scene.Objects[1].Id);\neditor.TryMoveSelected(new Vector3(0.25f, 0, 0));\neditor.TryAdd("Cube", new Vector3(4, 0.5f, 0));\neditor.TryDeleteSelected();\neditor.TryUndo();\ntry\n{\n    while (!Raylib.WindowShouldClose() && smokeFrames++ < 10)')
      .replace('        Raylib.EndDrawing();', '        Raylib.EndDrawing();\n        if (smokeFrames == 5) Raylib.TakeScreenshot("studio-smoke.png");');
    if (bounded === source || !bounded.includes('smokeFrames++')) throw new Error('Graphics smoke anchor missing');
    const fileChecks = `
if (!files.TrySave()) throw new Exception("UI save failed");
string goodFile = File.ReadAllText(scenePath);
Guid keptId = editor.SelectedId;
var keptPosition = editor.Selected!.Position;
int keptUndo = editor.UndoCount;
File.WriteAllText(scenePath, goodFile.Replace("\\\"Version\\\": 1", "\\\"Version\\\": 2"));
if (files.TryOpen() || !files.Status.StartsWith("File operation failed") || editor.SelectedId != keptId || editor.UndoCount != keptUndo)
    throw new Exception("UI invalid open changed editor");
File.WriteAllText(scenePath, goodFile);
editor.TryMoveSelected(Vector3.UnitY);
if (!files.TryOpen() || scene.Objects[^1].Position != keptPosition || editor.UndoCount != 0 || editor.RedoCount != 0)
    throw new Exception("UI open did not restore saved state");
Console.WriteLine("FILE CONTROLS CHECKS PASSED");
`;
    fs.writeFileSync(program, bounded.replace('try\n{\n    while (!Raylib.WindowShouldClose() && smokeFrames++ < 10)', fileChecks + '\ntry\n{\n    while (!Raylib.WindowShouldClose() && smokeFrames++ < 10)'));
    try {
      run(['run', '--project', 'Studio'], 'FILE CONTROLS CHECKS PASSED');
      if (!fs.existsSync(screenshot) || fs.statSync(screenshot).size < 1000) throw new Error('No useful graphics screenshot produced');
      console.log(`GRAPHICS SCREENSHOT ${screenshot}`);
    } finally { fs.writeFileSync(program, source); }
    run(['build', 'Studio']);
    const bot = path.join(root, 'Bot/Program.cs');
    const botSource = fs.readFileSync(bot, 'utf8');
    const botBounded = botSource
      .replace('try\n{\n    while (!Raylib.WindowShouldClose())', 'int smokeFrames = 0;\ntry\n{\n    while (!Raylib.WindowShouldClose() && smokeFrames++ < 10)')
      .replace('!ended && Raylib.IsKeyPressed(KeyboardKey.Space)', '!ended && smokeFrames <= 4')
      .replace('        Raylib.EndDrawing();', '        Raylib.EndDrawing();\n        if (smokeFrames == 5) Raylib.TakeScreenshot("bot-smoke.png");');
    if (!botBounded.includes('smokeFrames++')) throw new Error('Bot smoke anchor missing');
    fs.writeFileSync(bot, botBounded);
    try {
      const output = run(['run', '--project', 'Bot'], 'Won = True, Steps = 4, Reward = 7');
      if (!output.includes('Won = False, Steps = 20, Reward = -20')) throw new Error('Missing untrained bot baseline');
      const botScreenshot = path.join(root, 'bot-smoke.png');
      if (!fs.existsSync(botScreenshot) || fs.statSync(botScreenshot).size < 1000) throw new Error('No bot screenshot');
      console.log(`BOT SCREENSHOT ${botScreenshot}`);
    } finally { fs.writeFileSync(bot, botSource); }
    run(['build', 'Bot']);
  }
  console.log(`PASS ${milestones} executed milestones; deliberate assertion failure and ${mutations.length + 1 + historyMutations.length} rule mutations detected; restored checks pass`);
  console.log(finalOnly ? 'PASS reconstructed final source (intermediate milestone checks skipped)' : coreOnly ? 'PASS reconstructed core course (graphics build skipped)' : 'PASS reconstructed 3D studio opening course');
} finally {
  if (keep) console.log(`AUTHOR WORKSPACE ${root}`);
  else {
    const resolved = path.resolve(root);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('games3d-course-'))
      throw new Error('Refusing to remove a path outside the generated author workspace');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
