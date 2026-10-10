import { describe, expect, it } from 'vitest';
import { buildScrap, SCRAP } from './scrapLoader.js';
import { TRACKS } from './trackLoader.js';

const lesson = (title, extra = '') => `---\ntitle: ${title}\n${extra}---\n\nIntro.\n\n## Step one\n\nText.\n`;

describe('buildScrap', () => {
  const scrap = buildScrap({
    './scrap/loose.md': lesson('Loose'),
    './scrap/README.md': lesson('Not a lesson'),
    './scrap/_AGENT-PROMPT.md': lesson('Not a lesson either'),
    './scrap/Chess Engine/intro.md': lesson('Intro'),
    './scrap/Chess Engine/02 Moves/01-pawns.md': lesson('2.1 Pawns', 'track: Moving pieces\n'),
    './scrap/Chess Engine/01 The Board/02-ranks.md': lesson('1.2 Ranks'),
    './scrap/Chess Engine/01 The Board/01-squares.md': lesson('1.1 Squares'),
    './scrap/Chess Engine/03 Search/Deep/01-x.md': lesson('3.1 Search'),
    './scrap/Chess Engine/_notes/ignored.md': lesson('Ignored'),
    './scrap/Broken/01-bad.md': lesson('Bad', '').replace('## Step one', '## Step one\n\n```check\nnot-a-check x\n```'),
  }, {
    './scrap/Chess Engine/01 The Board/support/tests/test_board.py': 'def test_x(): pass\n',
  });

  it('makes the top folder the series and the folder inside it the chapter', () => {
    const chess = scrap.series.find((s) => s.label === 'Scrap · Chess Engine');
    expect(chess.sharedProject).toBe(true);
    expect(chess.chapters.map((c) => c.label)).toEqual(['Chess Engine', '01 The Board', 'Moving pieces', '03 Search / Deep']);
  });

  it('orders lessons by file name and gives them ids under the folder path', () => {
    expect(scrap.tracks['scrap--chess-engine-01-the-board'].map((l) => l.id)).toEqual([
      'scrap--chess-engine-01-the-board/01-squares',
      'scrap--chess-engine-01-the-board/02-ranks',
    ]);
  });

  it('puts loose files in a Scrap series last, and ignores README and _ files', () => {
    expect(scrap.series.at(-1).label).toBe('Scrap');
    expect(scrap.tracks['scrap--loose'].map((l) => l.title)).toEqual(['Loose']);
    const titles = Object.values(scrap.tracks).flat().map((l) => l.title);
    expect(titles).not.toContain('Not a lesson');
    expect(titles).not.toContain('Ignored');
  });

  it("shows a file it can't parse as a lesson saying what's wrong", () => {
    const [bad] = scrap.tracks['scrap--broken'];
    expect(bad.title).toBe("01-bad (can't be read)");
    expect(bad.steps[0].prose).toMatch(/not-a-check/);
  });

  it("keys each chapter's support files by their path inside support/", () => {
    expect(scrap.support['scrap--chess-engine-01-the-board']).toEqual({ 'tests/test_board.py': 'def test_x(): pass\n' });
    expect(scrap.support['scrap--chess-engine']).toEqual({});
  });
});

it('never shares a key with a built-in track', () => {
  for (const key of Object.keys(SCRAP.tracks)) expect(TRACKS[key]).toBeUndefined();
});
