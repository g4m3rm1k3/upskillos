// A* on a grid (engine/pathfind.ts) and TileMapLayer.findPath in the running game.
import { describe, expect, it } from 'vitest';
import { Doc } from '../core/doc';
import { newProject } from '../core/project';
import { Game } from './game';
import type { TileMapLayer } from './nodes';
import { astar } from './pathfind';
import { rng } from './random';

/** A map from text: # is blocked. */
const grid = (rows: string[]) => ({ passable: (x: number, y: number) => rows[y]?.[x] !== '#', bounds: { x0: 0, y0: 0, x1: rows[0].length - 1, y1: rows.length - 1 } });

/** Breadth-first search's step count, to check A* finds a shortest path. */
function bfs(passable: (x: number, y: number) => boolean, s: { x: number; y: number }, t: { x: number; y: number }, b: { x0: number; y0: number; x1: number; y1: number }) {
  const seen = new Map([[`${s.x},${s.y}`, 0]]), q = [s];
  while (q.length) {
    const c = q.shift()!, d = seen.get(`${c.x},${c.y}`)!;
    if (c.x === t.x && c.y === t.y) return d;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = c.x + dx, y = c.y + dy; if (x < b.x0 || y < b.y0 || x > b.x1 || y > b.y1 || !passable(x, y) || seen.has(`${x},${y}`)) continue; seen.set(`${x},${y}`, d + 1); q.push({ x, y }); }
  }
  return null;
}

describe('A*', () => {
  it('goes round a wall the short way, and reports when there is no way', () => {
    const g = grid(['.....', '.###.', '.#...', '.#.#.', '...#.']);
    const { path } = astar(g.passable, { x: 0, y: 0 }, { x: 2, y: 3 }, { bounds: g.bounds });
    expect(path!.length - 1).toBe(7);   // down the left side, along the bottom, up: 7 (round the right would be 9)
    expect(path!.every((c) => g.passable(c.x, c.y))).toBe(true);
    const shut = grid(['.#.', '##.', '...']);
    expect(astar(shut.passable, { x: 0, y: 0 }, { x: 2, y: 2 }, { bounds: shut.bounds }).path).toBeNull();
  });

  it('finds a shortest path on 200 random mazes, as breadth-first search does, looking at fewer cells', () => {
    const r = rng(11);
    let fewer = 0;
    for (let k = 0; k < 200; k++) {
      const rows = [...Array(12)].map((_, y) => [...Array(16)].map((__, x) => ((x === 0 && y === 0) || (x === 15 && y === 11) || !r.chance(0.28) ? '.' : '#')).join(''));
      const g = grid(rows), a = astar(g.passable, { x: 0, y: 0 }, { x: 15, y: 11 }, { bounds: g.bounds });
      const b = bfs(g.passable, { x: 0, y: 0 }, { x: 15, y: 11 }, g.bounds);
      expect(a.path ? a.path.length - 1 : null).toBe(b);
      if (a.path && a.visited < 150) fewer++;
    }
    expect(fewer).toBeGreaterThan(50);
  });

  it('diagonally, it never cuts between two blocked corners', () => {
    const g = grid(['.#', '#.']);
    expect(astar(g.passable, { x: 0, y: 0 }, { x: 1, y: 1 }, { bounds: g.bounds, diagonal: true }).path).toBeNull();
    const open = grid(['...', '...', '...']);
    expect(astar(open.passable, { x: 0, y: 0 }, { x: 2, y: 2 }, { bounds: open.bounds, diagonal: true }).path!.length).toBe(3);
  });
});

describe('TileMapLayer.findPath', () => {
  it('gives world points through a walled room, cell centres, avoiding its solid tiles', () => {
    const d = new Doc(newProject());
    const s = d.createScene('scenes/main.scene');
    d.importAsset('assets/a.png', { mime: 'image/png', width: 32, height: 16 });
    d.createTileset('tilesets/t.tileset', { image: 'assets/a.png', tileWidth: 16, tileHeight: 16, solid: [1] });
    // A 6 × 5 room, walls all round, and a wall down the middle with a gap at the bottom.
    const cells: number[] = [];
    for (let y = 0; y < 5; y++) for (let x = 0; x < 6; x++) cells.push(x, y, x === 0 || y === 0 || x === 5 || y === 4 || (x === 3 && y < 3) ? 1 : 0);
    d.addNode(s.id, 'TileMapLayer', undefined, { name: 'Walls', props: { tileset: 'tilesets/t.tileset', cells, position: { x: 100, y: 0 } } });
    const g = new Game(d.project, d.scene(s.id), { frame: () => undefined });
    g.start();
    const walls = g.root.get<TileMapLayer>('Walls');
    const path = walls.findPath({ x: 100 + 24, y: 24 }, { x: 100 + 72, y: 24 })!;   // cell (1, 1) to cell (4, 1)
    expect(path.length).toBe(7);                                   // down, round the gap at row 3, and up
    expect(path.every((p) => !walls.isCellSolid((p.x - 100 - 8) / 16, (p.y - 8) / 16))).toBe(true);
    expect(path.at(-1)).toMatchObject({ x: 172, y: 24 });
    expect(walls.findPath({ x: 124, y: 24 }, { x: 124, y: 24 })).toEqual([]);
    expect(walls.findPath({ x: 124, y: 24 }, { x: 100 + 56, y: 24 })).toBeNull();   // into the wall itself
  });
});
