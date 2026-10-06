// Tool scripts (project.runTool): a script in scripts/tools/ whose default export is a function of the project, run in
// the editor as one undoable step, like a Godot EditorScript. The game imports it like any script and nothing happens.
import { describe, expect, it } from 'vitest';
import { Doc } from './doc';
import { newProject } from './project';
import { problems } from './serialize';

const TOOL = `// Draws three coloured squares.
const COLOURS = ['#e63946', '#2a9d8f', '#e9c46a'];

export default function (project) {
  COLOURS.forEach((fill, i) => {
    project.writeSvg(\`assets/square_\${i}.svg\`, \`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="\${fill}"/></svg>\`);
  });
  project.addAction('jump_twice', ['KeyJ']);
}
`;

describe('tool scripts', () => {
  it('run as one step: the log says project.runTool, undo takes it all back, and redo by replaying the log', () => {
    const doc = new Doc(newProject('Tools'));
    doc.writeScript('scripts/tools/squares.js', TOOL);
    doc.runTool('scripts/tools/squares.js');
    expect(doc.project.assets.map((a) => a.path)).toEqual(['assets/square_0.svg', 'assets/square_1.svg', 'assets/square_2.svg']);
    expect(doc.project.input.some((a) => a.name === 'jump_twice')).toBe(true);
    expect(doc.log.at(-1)?.code).toBe('project.runTool("scripts/tools/squares.js")');
    expect(problems(doc.project)).toEqual([]);
    doc.undo();
    expect(doc.project.assets).toEqual([]);
    // The log, replayed on a new project, builds the same thing: a tool is code like any other step.
    doc.redo();
    const again = new Doc(newProject('Tools'));
    again.runCode('Replay', doc.log.map((l) => l.code).join('\n'));
    expect(again.project.assets.map((a) => a.path)).toEqual(doc.project.assets.map((a) => a.path));
  });

  it('say clearly what is wrong, and change nothing', () => {
    const doc = new Doc(newProject('Tools'));
    doc.writeScript('scripts/tools/imports.js', `import { x } from '../util.js';\nexport default function (project) {}\n`);
    expect(() => doc.runTool('scripts/tools/imports.js')).toThrow(/cannot import/);
    doc.writeScript('scripts/tools/nodefault.js', `function build(project) {}\n`);
    expect(() => doc.runTool('scripts/tools/nodefault.js')).toThrow(/export default function/);
    doc.writeScript('scripts/tools/half.js', `export default function (project) { project.addAction('one', ['KeyO']); project.scene('scenes/none.scene'); }\n`);
    expect(() => doc.runTool('scripts/tools/half.js')).toThrow(/No scene/);
    expect(doc.project.input.some((a) => a.name === 'one')).toBe(false);   // put back: nothing half-done
    doc.writeScript('scripts/player.js', `export default function (project) {}\n`);
    expect(() => doc.runTool('scripts/player.js')).toThrow(/scripts\/tools\//);
  });
});
