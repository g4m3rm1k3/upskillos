// Project and game archives (ADR 10, Phase 8). A project is never trapped in one browser, and a game
// runs without the editor.
//
//   Project (.zip)                         Game, for a website (.zip)        Game, one file (.html)
//   ├── project.json  settings, input,     ├── index.html                    index.html with the runtime,
//   │                 assets, tilesets,    ├── game.js     the runtime       the project and its pictures
//   │                 and the file lists   ├── project.json                  inside: it opens by
//   ├── scenes/       one JSON per scene   └── assets/     only the images   double-click, even from disk
//   ├── scripts/      plain .js            the game uses
//   ├── tilesets/     (in project.json)
//   └── assets/       the images
//
// A game zip uses relative paths only, so it runs from any static host, a GitHub Pages subpath
// included. Both game forms run the same runtime file the editor runs, so the game you test is the game
// you export (runtime/main.ts loads itself when no editor is around it).

import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { Project, SceneData } from './types';
import { deserialize, serialize } from './serialize';
import { walk } from './project';

/** Bytes for an asset, by its project path. */
export type AssetBytes = (path: string) => Uint8Array | undefined;

const README = (name: string) => `${name}: a Game Studio project.

project.json   settings, input map, tilesets, and the list of scenes, scripts and images
scenes/        one file per scene (JSON)
scripts/       the scripts, as plain JavaScript
assets/        the images

Open it in Game Studio with Project › Import project (.zip)…
`;

/** The project as a .zip: scenes and scripts as their own files, so they can be read and edited anywhere. */
export function projectZip(p: Project, bytes: AssetBytes): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  const index = { ...p, scenes: p.scenes.map((s) => s.path), scripts: p.scripts.map((s) => s.path) };
  files['project.json'] = strToU8(JSON.stringify(index, null, 1));
  for (const s of p.scenes) files[s.path] = strToU8(JSON.stringify(s, null, 1));
  for (const s of p.scripts) files[s.path] = strToU8(s.source);
  for (const a of p.assets) { const b = bytes(a.path); if (b) files[a.path] = b; }
  files['README.txt'] = strToU8(README(p.name));
  return zipSync(files, { level: 6 });
}

/**
 * A project .zip read back: put together, migrated and checked as a saved project is (a bad archive says
 * what is wrong), with each image's bytes by asset id.
 */
export function readProjectZip(zip: Uint8Array): { project: Project; bytes: Map<string, Uint8Array> } {
  let files: Record<string, Uint8Array>;
  try { files = unzipSync(zip); } catch { throw new Error('This is not a .zip file'); }
  // A zip made by hand (or by a file manager) may put everything inside one folder.
  const root = files['project.json'] ? '' : Object.keys(files).find((k) => k.endsWith('/project.json'))?.replace(/project\.json$/, '') ?? null;
  if (root === null) throw new Error('This .zip has no project.json: it is not a Game Studio project');
  const text = (path: string) => { const f = files[root + path]; if (!f) throw new Error(`The project lists ${path}, but the .zip does not have it`); return strFromU8(f); };
  const index = JSON.parse(text('project.json')) as Record<string, unknown> & { scenes: unknown[]; scripts: unknown[]; assets: { id: string; path: string }[] };
  // Older archives might hold whole scenes and scripts in project.json; files win when both are there.
  const scenes = index.scenes.map((s) => (typeof s === 'string' ? JSON.parse(text(s)) as SceneData : s));
  const scripts = index.scripts.map((s) => (typeof s === 'string' ? { path: s, source: text(s) } : s));
  const project = deserialize(JSON.stringify({ ...index, scenes, scripts }));
  const bytes = new Map<string, Uint8Array>();
  for (const a of project.assets) {
    if (a.svg !== undefined) { bytes.set(a.id, strToU8(a.svg)); continue; }   // an SVG image is its source, in project.json
    const b = files[root + a.path];
    if (!b) throw new Error(`The project uses ${a.path}, but the .zip does not have it`);
    bytes.set(a.id, b);
  }
  return { project, bytes };
}

/**
 * The images a game needs: those its scenes use (pictures, animation frames, tilesets) and those a
 * script names, such as 'assets/puzzle-pack/tiles-blue/tileblue_01.png' in Tetris's pieces.js.
 */
export function usedAssets(p: Project): Set<string> {
  const all = new Set(p.assets.map((a) => a.path)), used = new Set<string>();
  const visit = (v: unknown) => {
    if (typeof v === 'string') { if (all.has(v)) used.add(v); }
    else if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === 'object') Object.values(v).forEach(visit);
  };
  for (const s of p.scenes) for (const n of walk(s.root)) { visit(n.props); visit(n.overrides); }
  for (const t of p.tilesets ?? []) if (all.has(t.image)) used.add(t.image);
  for (const s of p.scripts) for (const path of all) if (s.source.includes(path)) used.add(path);
  return used;
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const page = (p: Project, body: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(p.name)}</title>
<style>html,body{margin:0;height:100%;background:${escapeHtml(p.settings.background)};overflow:hidden}#game{width:100%;height:100%}</style>
</head><body><div id="game"></div>
${body}
</body></html>
`;

/** What a game carries: the project, without the editor's recovery data, and only the images it uses. */
function gameProject(p: Project): Project {
  const used = usedAssets(p);
  if (!p.settings.mainScene) throw new Error('Set a main scene first (Project settings): it is where the game starts');
  return JSON.parse(serialize({ ...p, assets: p.assets.filter((a) => used.has(a.path)) })) as Project;
}

/** The game for a website: index.html, the runtime, project.json and the images, all by relative path. */
export function gameZip(p: Project, runtime: string, bytes: AssetBytes): Uint8Array {
  const game = gameProject(p);
  const files: Record<string, Uint8Array> = {
    'index.html': strToU8(page(game, '<script src="game.js"></script>')),
    'game.js': strToU8(runtime),
    'project.json': strToU8(serialize(game)),
  };
  for (const a of game.assets) { const b = bytes(a.path); if (!b) throw new Error(`The image ${a.path} is missing`); files[a.path] = b; }
  return zipSync(files, { level: 6 });
}

const base64 = (b: Uint8Array) => { let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };

/** The game as one HTML file: the runtime, the project and its images inside, so it runs from anywhere, even a double-click. */
export function gameHtmlFile(p: Project, runtime: string, bytes: AssetBytes): string {
  const game = gameProject(p);
  const assets = game.assets.map((a) => { const b = bytes(a.path); if (!b) throw new Error(`The image ${a.path} is missing`); return { path: a.path, mime: a.mime, data: base64(b) }; });
  // "</script" would end the script element early, so it is escaped wherever it appears.
  const data = JSON.stringify({ project: game, assets }).replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
  return page(game, `<script>window.GAME_DATA = ${data};</script>\n<script>${runtime.replace(/<\/script/gi, '<\\/script')}</script>`);
}
