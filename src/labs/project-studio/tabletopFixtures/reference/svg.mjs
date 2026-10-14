export const pips = [[], [[0, 0]], [[-1, -1], [1, 1]],
  [[-1, -1], [0, 0], [1, 1]], [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]];

export function dieSVG(face) {
  let circles = '';
  for (const [x, y] of pips[face]) {
    circles += `<circle cx="${50 + x * 25}" cy="${50 + y * 25}" r="7"/>`;
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="3" y="3" width="94" height="94" rx="20"/>${circles}</svg>`;
}
