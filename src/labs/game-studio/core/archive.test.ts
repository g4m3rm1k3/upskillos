// Project and game archives (core/archive.ts, Phase 8): a project survives the round trip through a .zip
// exactly; a bad .zip says what is wrong; a game carries only what it needs, by relative paths.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { Doc } from './doc';
import { newProject } from './project';
import { serialize } from './serialize';
import { gameHtmlFile, gameZip, projectZip, readProjectZip, usedAssets } from './archive';
import { EXAMPLES } from '../examples';
import { TETRIS } from '../tasks/tetris';

const starter = (path: string) => new Uint8Array(readFileSync(fileURLToPath(new URL(`../starter/${path.replace(/^assets\//, '')}`, import.meta.url))));
const pngSize = (b: Uint8Array) => ({ width: (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19], height: (b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23] });
function build(images: string[], code: string, name: string) {
  const d = new Doc(newProject(name));
  for (const path of images) d.importAsset(path, { mime: 'image/png', ...pngSize(starter(path)) });
  d.runCode('Build', code);
  return d.project;
}
const bytesOf = (path: string) => starter(path);

describe('project archives', () => {
  for (const ex of EXAMPLES) {
    it(`${ex.title} goes out and comes back exactly: scenes and scripts as their own files, and every image`, () => {
      const p = build(ex.images, ex.code, ex.title);
      const zip = projectZip(p, bytesOf);
      const files = unzipSync(zip);
      expect(Object.keys(files)).toEqual(expect.arrayContaining(['project.json', 'README.txt', ...p.scenes.map((s) => s.path), ...p.scripts.map((s) => s.path), ...p.assets.map((a) => a.path)]));
      expect(strFromU8(files[p.scripts[0].path])).toBe(p.scripts[0].source);   // a script is plain JavaScript
      const back = readProjectZip(zip);
      expect(serialize(back.project)).toBe(serialize(p));
      for (const a of p.assets) expect(back.bytes.get(a.id)).toEqual(a.svg !== undefined ? strToU8(a.svg) : starter(a.path));
    });
  }

  it('reads a .zip whose files are all inside one folder (as a file manager makes them)', () => {
    const p = build(EXAMPLES[0].images, EXAMPLES[0].code, 'Folder');
    const inner = unzipSync(projectZip(p, bytesOf));
    const nested = zipSync(Object.fromEntries(Object.entries(inner).map(([k, v]) => [`My Game/${k}`, v])));
    expect(serialize(readProjectZip(nested).project)).toBe(serialize(p));
  });

  it('says what is wrong with a .zip that is not a sound project', () => {
    const p = build(EXAMPLES[0].images, EXAMPLES[0].code, 'Broken');
    const files = unzipSync(projectZip(p, bytesOf));
    const without = (path: string) => zipSync(Object.fromEntries(Object.entries(files).filter(([k]) => k !== path)));
    expect(() => readProjectZip(strToU8('not a zip'))).toThrow(/not a \.zip/);
    expect(() => readProjectZip(without('project.json'))).toThrow(/no project\.json/);
    expect(() => readProjectZip(without(p.scripts[0].path))).toThrow(new RegExp(`lists ${p.scripts[0].path}`));
    expect(() => readProjectZip(without(p.assets[0].path))).toThrow(new RegExp(`uses ${p.assets[0].path}`));
    const badScene = { ...files, [p.scenes[0].path]: strToU8(JSON.stringify({ ...p.scenes[0], root: { ...p.scenes[0].root, type: 'Spaceship' } })) };
    expect(() => readProjectZip(zipSync(badScene))).toThrow(/problems/);
  });
});

describe('game archives', () => {
  const tetris = () => { const t = TETRIS.at(-1)!; return build(t.images, `${t.start}\n${t.solution}`, 'Tetris'); };

  it('a game needs the images its scenes use and those its scripts name, and not the rest', () => {
    const p = tetris();
    const d = new Doc(p); d.importAsset('assets/unused.png', { mime: 'image/png', width: 16, height: 16 });
    const used = usedAssets(d.project);
    // Tetris's pictures are all named in scripts/pieces.js, not set on any node.
    expect([...used].sort()).toEqual([...TETRIS[0].images].sort());
    expect(used.has('assets/unused.png')).toBe(false);
    const ex = EXAMPLES.find((e) => e.id === 'maze-chase')!, maze = build(ex.images, ex.code, ex.title);
    expect(usedAssets(maze).size).toBeGreaterThan(0);   // a tileset's image counts
  });

  it('the website .zip is index.html, game.js, project.json and the images, all by relative path', () => {
    const p = tetris();
    const files = unzipSync(gameZip(p, '/* runtime */', bytesOf));
    expect(Object.keys(files).sort()).toEqual(['game.js', 'index.html', 'project.json', ...TETRIS[0].images].sort());
    const html = strFromU8(files['index.html']);
    expect(html).toContain('<script src="game.js"></script>');
    expect(html).not.toMatch(/(src|href)="\//);   // nothing from the site's root: it must work under a subpath
    expect(html).toContain('<title>Tetris</title>');
    expect(JSON.parse(strFromU8(files['project.json'])).settings.mainScene).toBe('scenes/main.scene');
    expect(strFromU8(files['game.js'])).toBe('/* runtime */');
  });

  it('the one-file game holds the project, its images and the runtime, with "</script" made safe', () => {
    const p = tetris();
    const html = gameHtmlFile(p, 'var x = "</script>";', bytesOf);
    expect(html).toContain('window.GAME_DATA = ');
    expect(html.match(/<\/script>/g)).toHaveLength(2);   // only the two real script ends
    const data = JSON.parse(html.slice(html.indexOf('window.GAME_DATA = ') + 19, html.indexOf(';</script>')).replace(/<\\\/script/g, '</script'));
    expect(data.project.name).toBe('Tetris');
    expect(data.assets).toHaveLength(TETRIS[0].images.length);
    expect(Uint8Array.from(atob(data.assets[0].data), (c) => c.charCodeAt(0))).toEqual(starter(data.assets[0].path));
  });

  it('a game without a main scene is not exported', () => {
    const p = newProject('Empty');
    expect(() => gameZip(p, '', bytesOf)).toThrow(/main scene/);
  });
});
