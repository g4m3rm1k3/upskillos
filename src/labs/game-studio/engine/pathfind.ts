// A* on a grid: the fewest-steps path between two cells that avoids blocked ones (TileMapLayer.findPath).
//
// A* keeps a frontier of cells to look at, always taking next the one with the smallest f = g + h: g is the length of
// the best path found to it so far, h a guess of the length still to go that never overestimates (here the Manhattan
// distance |dx| + |dy| for 4 directions, or the octile distance for 8). With such a guess, the first time the goal is
// taken from the frontier, the path to it is a shortest one. Breadth-first search is A* with h = 0: it looks in every
// direction; h makes A* look towards the goal first.

export interface Cell { x: number; y: number }

export interface GridOptions {
  /** Also step diagonally (never squeezing between two blocked cells at a corner). */
  diagonal?: boolean;
  /** The cells that may be used: x from x0 to x1 and y from y0 to y1, inclusive. */
  bounds: { x0: number; y0: number; x1: number; y1: number };
}

/** The cells from start to goal (both included), or null when the goal cannot be reached. visited counts cells looked at. */
export function astar(passable: (x: number, y: number) => boolean, start: Cell, goal: Cell, opts: GridOptions): { path: Cell[] | null; visited: number } {
  const { bounds, diagonal = false } = opts;
  const inside = (x: number, y: number) => x >= bounds.x0 && x <= bounds.x1 && y >= bounds.y0 && y <= bounds.y1;
  const open = (x: number, y: number) => inside(x, y) && passable(x, y);
  if (!open(goal.x, goal.y) || !inside(start.x, start.y)) return { path: null, visited: 0 };
  const key = (x: number, y: number) => `${x},${y}`;
  const h = (x: number, y: number) => {
    const dx = Math.abs(x - goal.x), dy = Math.abs(y - goal.y);
    return diagonal ? Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy) : dx + dy;
  };
  const steps: [number, number, number][] = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1]];
  if (diagonal) steps.push([1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]);
  const g = new Map<string, number>([[key(start.x, start.y), 0]]);
  const came = new Map<string, Cell>();
  // The frontier: a binary heap on f, ties broken towards the larger g (deeper first), so straight runs are preferred.
  const heap: { x: number; y: number; f: number; g: number }[] = [];
  const less = (a: typeof heap[0], b: typeof heap[0]) => a.f < b.f - 1e-9 || (Math.abs(a.f - b.f) <= 1e-9 && a.g > b.g);
  const push = (n: typeof heap[0]) => { heap.push(n); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (!less(heap[i], heap[p])) break; [heap[i], heap[p]] = [heap[p], heap[i]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && less(heap[l], heap[m])) m = l; if (r < heap.length && less(heap[r], heap[m])) m = r; if (m === i) break; [heap[i], heap[m]] = [heap[m], heap[i]]; i = m; } } return top; };
  push({ x: start.x, y: start.y, f: h(start.x, start.y), g: 0 });
  const done = new Set<string>();
  let visited = 0;
  while (heap.length) {
    const c = pop(), k = key(c.x, c.y);
    if (done.has(k)) continue;
    done.add(k); visited++;
    if (c.x === goal.x && c.y === goal.y) {
      const path: Cell[] = [{ x: c.x, y: c.y }];
      for (let at = came.get(k); at; at = came.get(key(at.x, at.y))) path.unshift(at);
      return { path, visited };
    }
    for (const [dx, dy, cost] of steps) {
      const nx = c.x + dx, ny = c.y + dy;
      if (!open(nx, ny)) continue;
      if (dx && dy && (!open(c.x + dx, c.y) || !open(c.x, c.y + dy))) continue;   // no cutting corners
      const ng = c.g + cost, nk = key(nx, ny);
      if (ng < (g.get(nk) ?? Infinity) - 1e-9) { g.set(nk, ng); came.set(nk, { x: c.x, y: c.y }); push({ x: nx, y: ny, f: ng + h(nx, ny), g: ng }); }
    }
  }
  return { path: null, visited };
}
