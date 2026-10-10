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
const fromIndex = process.argv.indexOf('--from-lesson');
const fromLesson = fromIndex < 0 ? null : process.argv[fromIndex + 1];
if (fromIndex >= 0 && (!fromLesson || !fs.existsSync(path.join(directory, fromLesson + '.md'))))
  throw new Error('--from-lesson needs an existing lesson filename without .md');
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
        if (finalOnly || (fromLesson && name < fromLesson + '.md')) continue;
        if (check.kind !== 'run') throw new Error(`Unsupported walkthrough check: ${check.kind}`);
        const words = check.args[0].split(' ');
        if (words.shift() !== 'dotnet') throw new Error('Only explicit dotnet commands are supported');
        if (coreOnly && (words.includes('Studio') || words.includes('Bot'))) continue;
        run(words, check.opts.stdout || '');
      }
    }
  }

  if (finalOnly) {
    run(['run', '--project', 'Checks'], 'BOX STORAGE CHECKS PASSED');
    if (!coreOnly) { run(['build', 'Studio']); run(['build', 'Bot']); }
  }

  const recipe = path.join(root, 'Core/BoxRecipe.cs');
  const recipeSource = replaceChecked(recipe, 'size.X <= 0', 'false');
  try { run(['run', '--project', 'Checks'], 'Invalid box dimensions accepted', true); }
  finally { fs.writeFileSync(recipe, recipeSource); }

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
    ['Core/EditorBoxes.cs', 'Remember(before);', '// Remember(before);', 'Box edit did not record history'],
    ['Core/SceneBoxes.cs', 'objects[i] = objects[i] with { Box = box };', 'objects[0] = objects[0] with { Box = box };', 'Resize targeted wrong ID'],
    ['Core/SceneCodec.cs', 'BoxRecipe box = new(Vector3.One);', 'BoxRecipe box = new(new Vector3(2));', 'Legacy cube migration lost identity or unit dimensions'],
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
      .replace('try\n{\n    while (!Raylib.WindowShouldClose())', 'int smokeFrames = 0;\neditor.TrySelect(scene.Objects[1].Id);\neditor.TryMoveSelected(new Vector3(0.25f, 0, 0));\neditor.TryAdd("Cube", new Vector3(4, 0.5f, 0));\neditor.TryDeleteSelected();\neditor.TryUndo();\neditor.TrySelect(scene.Objects[0].Id);\neditor.TrySetSelectedBox(new BoxRecipe(new System.Numerics.Vector3(2, 0.25f, 2)));\neditor.TryMoveSelected(new System.Numerics.Vector3(0, -0.375f, 0));\neditor.TrySelect(scene.Objects[1].Id);\neditor.TrySetSelectedBox(new BoxRecipe(new System.Numerics.Vector3(0.5f, 2, 0.5f)));\neditor.TryMoveSelected(new System.Numerics.Vector3(0, 0.5f, 0));\neditor.TrySelect(scene.Objects[^1].Id);\neditor.TrySetSelectedBox(new BoxRecipe(new System.Numerics.Vector3(2, 0.5f, 1)));\ntry\n{\n    while (!Raylib.WindowShouldClose() && smokeFrames++ < 120)')
      .replace('        Raylib.EndDrawing();', '        Raylib.EndDrawing();\n        if (smokeFrames == 25) Raylib.TakeScreenshot("studio-dark.png");\n        if (smokeFrames == 35) UiTheme.Toggle();\n        if (smokeFrames == 55) Raylib.TakeScreenshot("studio-smoke.png");\n        if (smokeFrames == 75) { UiTheme.Toggle(); editor.ReplaceScene(new Scene()); }\n        if (smokeFrames == 95) Raylib.TakeScreenshot("studio-empty.png");');
    if (bounded === source || !bounded.includes('smokeFrames++')) throw new Error('Graphics smoke anchor missing');
    const fileChecks = `
if (!files.TrySave()) throw new Exception("UI save failed");
string goodFile = File.ReadAllText(scenePath);
Guid keptId = editor.SelectedId;
var keptPosition = editor.Selected!.Position;
var keptBox = editor.Selected!.Box;
int keptUndo = editor.UndoCount;
File.WriteAllText(scenePath, goodFile.Replace("\\\"Version\\\": 2", "\\\"Version\\\": 3"));
if (files.TryOpen() || !files.Failed || !files.Status.StartsWith("File operation failed") || editor.SelectedId != keptId || editor.UndoCount != keptUndo)
    throw new Exception("UI invalid open changed editor");
File.WriteAllText(scenePath, goodFile);
editor.TryMoveSelected(Vector3.UnitY);
if (!files.TryOpen() || files.Failed || scene.Objects[^1].Position != keptPosition || scene.Objects[^1].Box != keptBox || editor.UndoCount != 0 || editor.RedoCount != 0)
    throw new Exception("UI open did not restore saved state");
Console.WriteLine("FILE CONTROLS CHECKS PASSED");
var beforeUi = scene.Objects.ToArray();
var savedSelection = editor.SelectedId;
int beforeUndo = editor.UndoCount;
editor.TrySelect(scene.Objects[0].Id);
var trunkButton = EditorPanels.TrunkButton;
var trunkPoint = new System.Numerics.Vector2(trunkButton.X + trunkButton.Width / 2, trunkButton.Y + trunkButton.Height / 2);
if (!shapes.TryClickPreset(trunkPoint) || editor.Selected!.Box.Size != new System.Numerics.Vector3(0.5f, 2, 0.5f))
    throw new Exception("Preset click did not use shared region");
int afterClick = editor.UndoCount;
if (!shapes.TryClickPreset(trunkPoint) || editor.UndoCount != afterClick)
    throw new Exception("Preset no-op changed history");
if (shapes.TryClickPreset(new System.Numerics.Vector2(-1, -1))) throw new Exception("Preset swallowed outside click");
if (!editor.TryUndo() || !scene.Objects.SequenceEqual(beforeUi) || editor.UndoCount != beforeUndo)
    throw new Exception("Preset undo changed other data");
if (!files.TryOpen()) throw new Exception("Preset test could not restore saved scene");
Scene emptyScene = new();
EditorSession emptyEditor = new(emptyScene);
ShapeControls emptyShapes = new(emptyEditor);
if (!emptyShapes.TryClickPreset(trunkPoint) || !emptyShapes.Rejected || emptyEditor.UndoCount != 0 || emptyScene.Objects.Count != 0)
    throw new Exception("Unavailable preset changed empty scene");
string fitted = UiTheme.FitText("A very long object label", 60, 16);
if (Raylib.MeasureText(fitted, 16) > 60 || !fitted.EndsWith("...") || UiTheme.FitText("Box", 200, 16) != "Box")
    throw new Exception("UI text fitting failed");
Console.WriteLine("UI DESIGN CHECKS PASSED");

var themeObjects = scene.Objects.ToArray();
var themeSelection = editor.SelectedId;
editor.TryMoveSelected(Vector3.UnitX);
editor.TryUndo();
int themeUndo = editor.UndoCount;
int themeRedo = editor.RedoCount;
string themeJson = SceneCodec.Encode(scene);
if (UiTheme.Mode != ThemeMode.Dark) throw new Exception("Studio should start dark");
var darkPalette = UiTheme.Current;
var themeButton = ThemeControls.Button;
var themePoint = new System.Numerics.Vector2(themeButton.X + themeButton.Width / 2, themeButton.Y + themeButton.Height / 2);
if (!ThemeControls.TryClick(themePoint) || UiTheme.Mode != ThemeMode.Light || ThemeControls.Label != "Dark [F6]")
    throw new Exception("Theme click did not switch mode");
if (UiTheme.Canvas.Equals(darkPalette.Canvas) || UiTheme.Grid.Equals(darkPalette.Grid) || UiTheme.ObjectWire.Equals(darkPalette.ObjectWire))
    throw new Exception("Viewport colors stayed on old palette");
if (!scene.Objects.SequenceEqual(themeObjects) || editor.SelectedId != themeSelection || editor.UndoCount != themeUndo || editor.RedoCount != themeRedo || SceneCodec.Encode(scene) != themeJson)
    throw new Exception("Theme switch changed scene or history");
if (ThemeControls.TryClick(new System.Numerics.Vector2(-1, -1)) || UiTheme.Mode != ThemeMode.Light)
    throw new Exception("Theme swallowed outside click");
if (!files.TrySave() || !files.TryOpen() || UiTheme.Mode != ThemeMode.Light)
    throw new Exception("Scene storage changed theme");
UiTheme.Toggle();
if (UiTheme.Mode != ThemeMode.Dark || ThemeControls.Label != "Light [F6]")
    throw new Exception("Shared theme operation did not restore dark");

double Linear(byte channel)
{
    double value = channel / 255.0;
    return value <= 0.04045 ? value / 12.92 : Math.Pow((value + 0.055) / 1.055, 2.4);
}
double Luminance(Color color) => 0.2126 * Linear(color.R) + 0.7152 * Linear(color.G) + 0.0722 * Linear(color.B);
double Contrast(Color a, Color b)
{
    double x = Luminance(a), y = Luminance(b);
    return (Math.Max(x, y) + 0.05) / (Math.Min(x, y) + 0.05);
}
for (int mode = 0; mode < 2; mode++)
{
    var p = UiTheme.Current;
    var pairs = new (Color foreground, Color background)[] {
        (p.TextColor, p.Panel), (p.TextColor, p.Raised), (p.TextColor, p.Border),
        (p.Muted, p.Panel), (p.Muted, p.Raised), (p.Muted, p.Selected),
        (p.Accent, p.Selected), (p.Accent, p.Panel), (p.Danger, p.Panel)
    };
    foreach (var pair in pairs)
        if (Contrast(pair.foreground, pair.background) < 4.5) throw new Exception("Theme text contrast below 4.5");
    Console.WriteLine($"THEME CONTRAST {UiTheme.Mode}: minimum {pairs.Min(pair => Contrast(pair.foreground, pair.background)):F2}:1");
    UiTheme.Toggle();
}
Console.WriteLine("THEME CHECKS PASSED");

`;
    fs.writeFileSync(program, bounded.replace('try\n{\n    while (!Raylib.WindowShouldClose() && smokeFrames++ < 120)', fileChecks + '\ntry\n{\n    while (!Raylib.WindowShouldClose() && smokeFrames++ < 120)'));
    try {
      const output = run(['run', '--project', 'Studio'], 'UI DESIGN CHECKS PASSED');
      if (!output.includes('THEME CHECKS PASSED')) throw new Error('Missing theme evidence');
      const darkScreenshot = path.join(root, 'studio-dark.png');
      if (!fs.existsSync(darkScreenshot) || fs.statSync(darkScreenshot).size < 1000) throw new Error('No dark-mode screenshot');
      console.log('DARK UI SCREENSHOT ' + darkScreenshot);
      if (!output.includes('FILE CONTROLS CHECKS PASSED')) throw new Error('Missing file controls evidence');
      if (!fs.existsSync(screenshot) || fs.statSync(screenshot).size < 1000) throw new Error('No useful graphics screenshot produced');
      if (fs.readFileSync(screenshot).equals(fs.readFileSync(darkScreenshot))) throw new Error('Mode screenshots are identical');
      console.log(`GRAPHICS SCREENSHOT ${screenshot}`);
      const emptyScreenshot = path.join(root, 'studio-empty.png');
      if (!fs.existsSync(emptyScreenshot) || fs.statSync(emptyScreenshot).size < 1000) throw new Error('No empty-state screenshot');
      console.log(`EMPTY UI SCREENSHOT ${emptyScreenshot}`);
    } finally { fs.writeFileSync(program, source); }
    run(['build', 'Studio']);
    const bot = path.join(root, 'Bot/Program.cs');
    const botSource = fs.readFileSync(bot, 'utf8');
    const botBounded = botSource
      .replace('try\n{\n    while (!Raylib.WindowShouldClose())', 'int smokeFrames = 0;\ntry\n{\n    while (!Raylib.WindowShouldClose() && smokeFrames++ < 120)')
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
  console.log(`PASS ${milestones} executed milestones; deliberate assertion failure and ${mutations.length + 2 + historyMutations.length} rule mutations detected; restored checks pass`);
  console.log(finalOnly ? 'PASS reconstructed final source (intermediate milestone checks skipped)' : fromLesson ? `PASS reconstructed source (milestone checks from ${fromLesson})` : coreOnly ? 'PASS reconstructed core course (graphics build skipped)' : 'PASS reconstructed 3D studio opening course');
} finally {
  if (keep) console.log(`AUTHOR WORKSPACE ${root}`);
  else {
    const resolved = path.resolve(root);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('games3d-course-'))
      throw new Error('Refusing to remove a path outside the generated author workspace');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
