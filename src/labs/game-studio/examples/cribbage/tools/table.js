// A tool (▶ Run tool): draws the table's pictures as SVG: the cribbage board, a peg for each player, the buttons,
// and the title screen's panel.

/**
 * The cribbage board: 900 × 60, two tracks of 121 holes in a row, yours above and the AI's below, a start hole for
 * each, and a mark every five holes. Hole s (1 to 121) is at x = 62 + 6.7 (s − 1) on the board.
 */
function boardSvg() {
  let holes = '';
  for (const y of [18, 42]) {
    holes += `<circle cx="42" cy="${y}" r="2.6" fill="#3b2412"/>`;
    for (let s = 1; s <= 121; s++) holes += `<circle cx="${(62 + 6.7 * (s - 1)).toFixed(1)}" cy="${y}" r="1.9" fill="#3b2412"/>`;
  }
  let marks = '';
  for (let s = 5; s < 121; s += 5) marks += `<line x1="${(62 + 6.7 * (s - 1) + 3.35).toFixed(1)}" y1="10" x2="${(62 + 6.7 * (s - 1) + 3.35).toFixed(1)}" y2="${s % 30 === 0 ? 52 : 14}" stroke="#7a4b22" stroke-width="${s % 30 === 0 ? 1.4 : 0.8}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="60" viewBox="0 0 900 60">
  <rect x="1" y="1" width="898" height="58" rx="12" fill="#c8903f" stroke="#6b3f17" stroke-width="2"/>
  <text x="10" y="22" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#3b2412">You</text>
  <text x="10" y="46" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#3b2412">AI</text>
  ${marks}${holes}
  <text x="878" y="34" font-family="Arial, sans-serif" font-size="10" fill="#3b2412" text-anchor="middle">121</text>
</svg>`;
}

/** A peg: a circle with a highlight, so it looks round. */
const peg = (colour) => `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">
  <circle cx="6" cy="6" r="5" fill="${colour}" stroke="#111111" stroke-width="1"/><circle cx="4.5" cy="4.5" r="1.6" fill="#ffffff" opacity="0.6"/></svg>`;

/** A button: a rounded rectangle; its words are a Label on top, so one picture serves every button. */
const button = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect x="1.5" y="1.5" width="${w - 3}" height="${h - 3}" rx="10" fill="#f4c542" stroke="#7a5a00" stroke-width="3"/></svg>`;

const panel = `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="320" viewBox="0 0 620 320">
  <rect x="2" y="2" width="616" height="316" rx="18" fill="#08351f" stroke="#f4c542" stroke-width="4" opacity="0.96"/></svg>`;

export default function (project) {
  project.writeSvg('assets/board.svg', boardSvg());
  project.writeSvg('assets/peg-you.svg', peg('#e63946'));
  project.writeSvg('assets/peg-ai.svg', peg('#3a86ff'));
  project.writeSvg('assets/button.svg', button(160, 44));
  project.writeSvg('assets/button-small.svg', button(140, 48));
  project.writeSvg('assets/panel.svg', panel);
}
