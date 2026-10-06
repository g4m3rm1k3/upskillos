// A tool (▶ Run tool): draws all 52 cards and the back as SVG pictures, assets/cards/<rank><suit>.svg.
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

export default function (project) {
  for (const suit of ['S', 'H', 'D', 'C'])
    for (let rank = 1; rank <= 13; rank++) project.writeSvg(`assets/cards/${RANK_NAME[rank]}${suit}.svg`, cardSvg(rank, suit));
  project.writeSvg('assets/cards/back.svg', BACK);
}
