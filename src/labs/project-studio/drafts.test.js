// Draft lessons: a real folder on disk, read as the desktop app reads it (desktop/app/drafts.cjs),
// then turned into lessons and the Drafts series (drafts.js).
import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildDrafts, draftSupportFiles } from './drafts.js';

const require = createRequire(import.meta.url);
const { listFolder, chapterKey } = require('../../../desktop/app/drafts.cjs');

const LESSON = `---
title: 1.1 — The Board
track: Chess — The Board
runtime: python
support: tests/test_board.py
---

Intro.

## A board

\`\`\`python file=board.py
BOARD = 8
\`\`\`

\`\`\`check
file board.py
\`\`\`
`;

let root;
afterEach(() => { if (root) fs.rmSync(root, { recursive: true, force: true }); root = null; });

function folder(files) {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'drafts-test-'));
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  }
  return root;
}

describe('draft lessons', () => {
  it('creates the folder with a README the first time', () => {
    root = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'drafts-test-')), 'UpSkillOS Drafts');
    const listing = listFolder(root);
    expect(listing.chapters).toEqual([]);
    expect(fs.readFileSync(path.join(root, 'README.txt'), 'utf8')).toContain('Drafts');
    expect(buildDrafts(listing).series).toBeNull();
  });

  it('reads loose lessons and chapter folders, with their supplied files', () => {
    const listing = listFolder(folder({
      'an-idea.md': '---\ntitle: An idea\n---\n\n## One\n\nText.\n',
      'Chess Engine/01-01-the-board.md': LESSON,
      'Chess Engine/support/tests/test_board.py': 'def test_board_has_eight(): pass\n',
      'Chess Engine/notes.txt': 'not a lesson',
      'empty/readme.md': 'a README is not a lesson',
    }));
    const drafts = buildDrafts(listing);
    expect(Object.keys(drafts.tracks).sort()).toEqual(['draft', 'draft-chess-engine']);
    expect(drafts.series.chapters.map((c) => c.label)).toEqual(['Drafts', 'Chess — The Board']);
    const board = drafts.tracks['draft-chess-engine'][0];
    expect(board.id).toBe('draft-chess-engine/01-01-the-board');
    expect(board.steps[0].file).toBe('board.py');
    expect(board.steps[0].checks).toHaveLength(1);
    expect(draftSupportFiles(drafts, 'draft-chess-engine', board.meta.support)).toEqual([
      { file: 'tests/test_board.py', content: 'def test_board_has_eight(): pass\n' },
    ]);
  });

  it('shows a draft it cannot parse as a lesson that says why', () => {
    const drafts = buildDrafts(listFolder(folder({
      'broken.md': '---\ntitle: Broken\n---\n\n## Step\n\n```check\nnot-a-check whatever\n```\n',
      'fine.md': '---\ntitle: Fine\n---\n\n## Step\n\nText.\n',
    })));
    const [broken, fine] = drafts.tracks.draft;
    expect(broken.title).toBe("broken (can't be read)");
    expect(broken.steps[0].prose).toContain('not-a-check');
    expect(fine.title).toBe('Fine');
  });

  it('says which support file is missing, and where to put it', () => {
    const drafts = buildDrafts(listFolder(folder({ 'chess/01-01-the-board.md': LESSON })));
    expect(() => draftSupportFiles(drafts, 'draft-chess', 'tests/test_board.py')).toThrow(/support folder/);
  });

  it('makes chapter keys that never collide with built-in tracks', () => {
    expect(chapterKey('Chess Engine!')).toBe('draft-chess-engine');
    expect(chapterKey('***')).toBe('draft-chapter');
  });
});
