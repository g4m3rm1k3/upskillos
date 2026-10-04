// ── The art: every picture is SVG, written by code ─────────────────────────
// SVG describes a picture as shapes in a coordinate system: x to the right, y down, in pixels from the top-left.
// <rect>, <circle>, <path> and <text> draw; <g transform="…"> moves, turns or scales whatever is inside it;
// <defs> holds shapes to reuse with <use href="#name">. The <svg> element needs xmlns and a width and height.

// The four suits, each drawn about the point (0, 0) and about 20 pixels across. A <path> is a pen's moves: M moves to
// a point, L draws a line, C draws a curve (two control points, then where it ends), Z closes the shape. A club is
// three circles and a stem.
const SUIT_SHAPES = {
  H: '<path d="M0,8 C-3,5 -10,1 -10,-4 C-10,-8 -7,-10 -4.5,-10 C-2.5,-10 -0.8,-8.8 0,-7 C0.8,-8.8 2.5,-10 4.5,-10 C7,-10 10,-8 10,-4 C10,1 3,5 0,8 Z"/>',
  D: '<path d="M0,-10 L8,0 L0,10 L-8,0 Z"/>',
  S: '<path d="M0,-9 C-3,-6 -10,-2 -10,3 C-10,7 -7,9 -4.5,9 C-2.5,9 -0.8,7.8 0,6 C0.8,7.8 2.5,9 4.5,9 C7,9 10,7 10,3 C10,-2 3,-6 0,-9 Z M0,4 L-3.5,11 L3.5,11 Z"/>',
  C: '<circle cx="0" cy="-5" r="4.6"/><circle cx="-5.2" cy="1.5" r="4.6"/><circle cx="5.2" cy="1.5" r="4.6"/><path d="M0,0 L-3.5,11 L3.5,11 Z"/>',
};
const SUIT_COLOUR = { H: '#c1121f', D: '#c1121f', S: '#111111', C: '#111111' };
const RANK_NAME = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Where the pips go on a number card (100 × 140): two columns at x 30 and 70, and the middle at 50.
const PIPS = {
  1: [[50, 70]],
  2: [[50, 30], [50, 110]],
  3: [[50, 30], [50, 70], [50, 110]],
  4: [[30, 30], [70, 30], [30, 110], [70, 110]],
  5: [[30, 30], [70, 30], [50, 70], [30, 110], [70, 110]],
  6: [[30, 30], [70, 30], [30, 70], [70, 70], [30, 110], [70, 110]],
  7: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70], [30, 110], [70, 110]],
  8: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70], [50, 90], [30, 110], [70, 110]],
  9: [[30, 28], [70, 28], [30, 56], [70, 56], [50, 70], [30, 84], [70, 84], [30, 112], [70, 112]],
  10: [[30, 28], [70, 28], [50, 42], [30, 56], [70, 56], [30, 84], [70, 84], [50, 98], [30, 112], [70, 112]],
};

/** One card's face, as SVG text. */
function cardSvg(rank, suit) {
  const ink = SUIT_COLOUR[suit], name = RANK_NAME[rank];
  // A pip: the suit's shape moved to (x, y), at a scale; pips below the middle are turned upside down, as on a real card.
  const pip = (x, y, s) => `<use href="#suit" transform="translate(${x} ${y}) rotate(${y > 75 ? 180 : 0}) scale(${s})"/>`;
  // The corner: the rank and a small suit, top-left, and the same turned half round about the card's centre, bottom-right.
  const corner = `<text x="11" y="23" font-family="Georgia, 'Times New Roman', serif" font-size="19" font-weight="bold" text-anchor="middle" fill="${ink}">${name}</text>${pip(11, 35, 0.55)}`;
  let middle;
  if (rank <= 10) middle = PIPS[rank].map(([x, y]) => pip(x, y, rank === 1 ? 2.4 : 0.95)).join('');
  else middle = `<rect x="22" y="22" width="56" height="96" rx="4" fill="${ink === '#111111' ? '#e8eefc' : '#fdeaea'}" stroke="${ink}" stroke-width="1.5"/>
    <text x="50" y="76" font-family="Georgia, 'Times New Roman', serif" font-size="40" font-weight="bold" text-anchor="middle" fill="${ink}">${name}</text>${pip(50, 98, 1)}${pip(50, 40, 1)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140">
  <defs><g id="suit" fill="${ink}">${SUIT_SHAPES[suit]}</g></defs>
  <rect x="1" y="1" width="98" height="138" rx="8" fill="#ffffff" stroke="#555555" stroke-width="2"/>
  ${corner}<g transform="rotate(180 50 70)">${corner}</g>
  ${middle}
</svg>`;
}

/** The back of every card: a border, and a repeating pattern of diagonal lines (an SVG <pattern>). */
const BACK = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140">
  <defs><pattern id="weave" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="8" height="8" fill="#1d4ed8"/><rect width="3" height="8" fill="#3b82f6"/></pattern></defs>
  <rect x="1" y="1" width="98" height="138" rx="8" fill="#ffffff" stroke="#555555" stroke-width="2"/>
  <rect x="7" y="7" width="86" height="126" rx="5" fill="url(#weave)"/>
</svg>`;

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

for (const suit of ['S', 'H', 'D', 'C'])
  for (let rank = 1; rank <= 13; rank++) project.writeSvg(`assets/cards/${RANK_NAME[rank]}${suit}.svg`, cardSvg(rank, suit));
project.writeSvg('assets/cards/back.svg', BACK);
project.writeSvg('assets/board.svg', boardSvg());
project.writeSvg('assets/peg-you.svg', peg('#e63946'));
project.writeSvg('assets/peg-ai.svg', peg('#3a86ff'));
project.writeSvg('assets/button.svg', button(160, 44));
project.writeSvg('assets/button-small.svg', button(140, 48));
project.writeSvg('assets/panel.svg', panel);

// ── The controls: a click, Enter, D for the developer view, and 1–6 to pick a card from the keyboard ──
project.setSettings({ background: '#0b6b3a', pixelArt: false });
project.addAction('select', ['MouseLeft']);
project.addAction('confirm', ['Enter', 'Space']);
project.addAction('developer', ['KeyD']);
for (let k = 1; k <= 6; k++) project.addAction(`pick_${k}`, [`Digit${k}`]);

// ── The table ────────────────────────────────────────────────────────────
scene = project.createScene('scenes/cribbage.scene', 'Node2D', 'Table');
scene.root.script = 'scripts/table.js';
scene.add('Sprite2D', { name: 'Board', position: { x: 480, y: 38 }, texture: 'assets/board.svg' });
scene.add('Node2D', { name: 'Pegs', zIndex: 2 });
for (const [name, texture, y, opacity] of [['YouBack', 'peg-you', 26, 0.45], ['YouFront', 'peg-you', 26, 1], ['AIBack', 'peg-ai', 50, 0.45], ['AIFront', 'peg-ai', 50, 1]])
  scene.add('Sprite2D', { name, parent: 'Pegs', position: { x: 72, y }, texture: `assets/${texture}.svg`, opacity });
scene.add('Sprite2D', { name: 'Deck', position: { x: 108, y: 308 }, texture: 'assets/cards/back.svg', scale: { x: 0.8, y: 0.8 } });
scene.add('Node2D', { name: 'Opponent', script: 'scripts/opponent.js' });

// Words and the button, on a CanvasLayer so they are drawn over the cards.
scene.add('CanvasLayer', { name: 'HUD' });
scene.add('Label', { name: 'Status', parent: 'HUD', position: { x: 30, y: 76 }, fontSize: 16, text: '' });
scene.add('Label', { name: 'DevHint', parent: 'HUD', position: { x: 760, y: 76 }, fontSize: 13, color: '#a7f3d0', text: 'D: developer view' });
scene.add('Label', { name: 'Count', parent: 'HUD', position: { x: 196, y: 262 }, fontSize: 22, color: '#ffffff', text: '' });
scene.add('Label', { name: 'Message', parent: 'HUD', position: { x: 290, y: 372 }, fontSize: 17, color: '#ffe8a3', text: '' });
scene.add('Label', { name: 'CribLabel', parent: 'HUD', position: { x: 66, y: 398 }, fontSize: 13, color: '#a7f3d0', text: '' });
scene.add('Label', { name: 'Log', parent: 'HUD', position: { x: 30, y: 110 }, fontSize: 12, color: '#d1fae5', text: '' });
scene.add('Label', { name: 'Developer', parent: 'HUD', position: { x: 700, y: 104 }, fontSize: 12, color: '#fde68a', text: '', visible: false });
scene.add('Sprite2D', { name: 'Button', parent: 'HUD', position: { x: 878, y: 470 }, texture: 'assets/button.svg', visible: false });
scene.add('Label', { name: 'ButtonText', parent: 'HUD', position: { x: 822, y: 460 }, fontSize: 16, color: '#3b2a00', text: '', visible: false });

// The title: choose how well the AI plays.
scene.add('CanvasLayer', { name: 'Overlay', layer: 2 });
scene.add('Node2D', { name: 'Title', parent: 'Overlay' });
scene.add('Sprite2D', { name: 'Panel', parent: 'Overlay/Title', position: { x: 480, y: 290 }, texture: 'assets/panel.svg' });
scene.add('Label', { name: 'Heading', parent: 'Overlay/Title', position: { x: 395, y: 160 }, fontSize: 40, color: '#f4c542', text: 'Cribbage' });
scene.add('Label', { name: 'Blurb', parent: 'Overlay/Title', position: { x: 215, y: 222 }, fontSize: 16, color: '#d1fae5', text: 'Play to 121 against an AI that learned the game by playing it.\nChoose how well it plays (or press 1, 2 or 3):' });
[['Easy', 330], ['Medium', 480], ['Hard', 630]].forEach(([name, x]) => {
  scene.add('Sprite2D', { name, parent: 'Overlay/Title', position: { x, y: 330 }, texture: 'assets/button-small.svg' });
  scene.add('Label', { name: `${name}Text`, parent: 'Overlay/Title', position: { x: x - 6 * name.length, y: 319 }, fontSize: 18, color: '#3b2a00', text: name });
});
scene.add('Label', { name: 'Hint', parent: 'Overlay/Title', position: { x: 215, y: 390 }, fontSize: 13, color: '#a7f3d0', text: 'Click cards to choose them. D shows the developer view: the AI\'s hand, and what its brain\nthinks of every move it could make.' });
project.setMainScene('scenes/cribbage.scene');
