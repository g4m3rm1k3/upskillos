export default {
  order: 3,

  id: 'mg10-003',

  slug: 'drawing-cards-with-svg',

  title: 'Drawing Cards with SVG',

  subtitle: 'Write pictures as text, from a rectangle to all 52 cards, and use them in the game without a single image file.',

  tags: [
    'game-studio',
    'cribbage',
    'svg',
    'vector-graphics',
    'procedural-art',
    'transforms',
  ],

  aliases: 'svg scalable vector graphics rect circle text path M L C Z defs use href transform translate rotate scale g group pattern viewBox xmlns width height writeSvg new svg texture sprite procedural art',

  timeToComplete: 60,

  coreConcept: "An SVG image is text: an <svg> element with xmlns, a width and a height, holding shapes in a coordinate system whose y grows downwards. <rect>, <circle>, <text> and <path> (a pen's moves: M, L, C, Z) draw; <defs> holds a shape to reuse and <use href> draws copies; transform moves, turns and scales them. Because it is text, code can write it: one function draws any card from its rank and suit, and two loops draw all 52. In Game Studio an SVG image is an asset like a PNG: a tool script writes it with project.writeSvg(path, text), or you write one in Files › New SVG…, and a sprite shows it by its path.",

  prerequisites: ['mg10-002'],

  nextLesson: 'mg10-004',

  hook: {
    question: 'A deck needs 53 pictures: 52 faces and a back. You could draw each one in a paint program. Or you could write one function that draws any card, and let a loop draw them all. What would that function look like?',
    realWorldContext: "SVG (Scalable Vector Graphics) is the web's picture language: icons, charts, maps and logos are SVG because they are small, sharp at any size, and can be written or changed by code. Games use the same idea, procedural art, for cards, UI, maps and anything made of rules rather than brush strokes.",
  },

  intuition: {
    prose: [
      '**A picture as text.** An SVG image is a piece of text that describes shapes. It starts with <svg xmlns="http://www.w3.org/2000/svg" width="200" height="120">. The xmlns says "this is SVG", and a browser will not draw it as a picture without it; width and height are its size in pixels. Inside, each element draws: <rect x="120" y="20" width="40" height="40" fill="red"/> is a red square whose top-left corner is 120 across and 20 down (cell 1). x grows to the right and y grows *downwards*, from the top-left, as on every screen.',
      '**Shapes and words.** A card is a rounded rectangle: rx="8" rounds the corners, fill colours the inside, stroke and stroke-width draw the border. <circle cx cy r> is a circle by its centre and radius. <text x y> writes words: its y is the baseline the letters sit on, and text-anchor="middle" centres the text on x (cell 2). Colours are names (red) or #rrggbb.',
      "**Paths.** Anything else is a <path>, whose d attribute is a pen's moves: M 0,-10 moves the pen without drawing, L 8,0 draws a line to (8, 0), C draws a curve to its last point, pulled towards two control points before it, and Z closes the shape back to the start. The diamond is four points; the heart is two curves on each side (cell 3). Each suit is drawn about the point (0, 0) and about 20 pixels across, so it can be placed and sized anywhere.",
      '**viewBox: zoom without redrawing.** viewBox="-12 -12 24 24" says which part of the drawing\'s coordinates to show, here the square from (−12, −12) to (12, 12), stretched to fill the width and height. Cell 3 uses it to show a 20-pixel suit at 120 pixels. The cards use viewBox="0 0 100 140", the same as their size, so one unit is one pixel.',
      '**Draw once, use many times.** A five has five hearts. Write the heart once inside <defs> with an id (things in <defs> are not drawn), then draw copies: <use href="#heart" transform="translate(30 30)"/> draws it with its (0, 0) at (30, 30). transform can translate (move), rotate (turn, in degrees) and scale (size); written together they apply right to left, so translate(30 110) rotate(180) turns the heart about its own centre and then moves it (cell 4). The lower pips of a real card are upside down, so the deck reads the same either way up.',
      '**Groups.** <g> groups elements so one transform moves them all. A card\'s bottom-right corner is its top-left corner turned half round: put a copy of the corner (the rank and a small suit) inside <g transform="rotate(180 50 70)">, which turns everything about the card\'s centre, (50, 70).',
      '**A card is a function.** Everything that differs between cards is the rank (the corner text, how many pips and where) and the suit (the shape and the colour). So cardSvg(rank, suit) builds the text with template strings: the pip positions come from a table, PIPS[rank], and face cards get a frame and a big letter. Two loops call it 52 times (cell 5): about 60,000 characters of SVG and not one image file. The back is one more picture, using a <pattern>, a small tile repeated to fill a shape and turned by patternTransform (cell 6).',
      "**Into the game: as an asset.** Game Studio keeps an SVG image in the project as its text, under assets/ like any picture. There are two ways to make one. Code: a tool, scripts/tools/cards.js, calls project.writeSvg('assets/cards/5H.svg', cardSvg(5, 'H')) for every card, in a loop, when you press ▶ Run tool; that is Scene API code, the same language as GUI → code. A tool is a script whose default export is a function of the project (Files › New tool… makes one); it runs in the editor, like a Godot EditorScript, not in the game. By hand: Files › New SVG… makes assets/name.svg and opens it as text beside a live preview; save (Ctrl/Cmd+S) and every sprite that uses it changes. Click any .svg asset to edit it the same way.",
      "**Into the game: on a sprite.** A Sprite2D shows a picture by its path: its texture is 'assets/cards/5H.svg'. A script changes the picture by setting texture, so a card sprite shows its back or its face with this.texture = this.faceUp ? cardImage(this.card) : 'assets/cards/back.svg', where cardImage builds the path from the card's data (lesson 10.2). The card *data* never knows about pictures; the sprite looks up the picture for the data.",
      '**Size and sharpness.** The game turns each SVG into pixels once, at its width and height, then draws those pixels like any picture. So draw it at the largest size it will appear and scale the sprite down: the cards are drawn at 100 × 140 and shown at 0.8 (80 × 112). Scaling a small SVG up blurs it, as it would a PNG.',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: a picture for your game, in SVG',
        body: 'Step 1. Start with <svg xmlns="http://www.w3.org/2000/svg" width="…" height="…">, at the largest size it will be shown. Step 2. Draw with rect, circle, text and path; y grows down. Step 3. Anything repeated: define it in <defs> with an id, draw it with <use href="#id" transform="…">. Step 4. For many variations, write a function that returns the text, and loop. Step 5. Put it in the project: project.writeSvg(path, text) from code, or Files › New SVG… by hand. Step 6. Show it: a Sprite2D\'s texture is its path; a script can change the texture.',
      },
      {
        type: 'warning',
        title: 'No xmlns, no picture',
        body: 'Inline in a web page an <svg> without xmlns still draws, but as an image file, which is how a game uses it, it does not. Game Studio refuses an SVG without xmlns, or without a width and height in pixels, and says which is missing.',
      },
      {
        type: 'warning',
        title: 'One id per picture',
        body: 'An id is unique within one image. Cell 5 shows each card as its own image, so each card\'s #suit is its own. Put 52 cards inline in one web page and every <use href="#suit"> finds the first card\'s spade.',
      },
      {
        type: 'insight',
        title: 'Art as code',
        body: 'A card drawn by a function can change with one edit: a new colour, a new corner, a new back, all 53 at once. Procedural art suits anything built from rules: cards, dice, board squares, health bars, buttons. The Cribbage board, its pegs and its buttons are SVG from code too (another tool, scripts/tools/table.js, in lesson 10.7).',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Build it: from a rectangle to a deck',
        caption: 'Each cell draws what it builds, as an image, the way the game uses it.',
        props: {
          lesson: {
            title: 'Drawing cards with SVG',
            subtitle: 'Shapes, paths, reuse, transforms, then a function and a loop.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. The smallest picture\nPredict first: where the red square is.',
                startCode: '// The smallest picture. An SVG image is text: an <svg> element with the namespace that makes it a picture\n// (xmlns), its size in pixels (width, height), and shapes inside it. x grows to the right, y DOWNWARDS, from the\n// top-left corner. Predict first: where is the red square?\nconst svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120">\n  <rect x="0" y="0" width="200" height="120" fill="#e8f5e9"/>\n  <rect x="120" y="20" width="40" height="40" fill="red"/>\n</svg>`\n// Show it as the game does: as an image, made from the SVG text (a data: URL), at its own size.\nconst img = (svg, scale = 1) => \'<img style="margin:2px" width="\' + scale * Number(/width="(\\d+)"/.exec(svg)[1]) + \'" src="data:image/svg+xml;charset=utf-8,\' + encodeURIComponent(svg) + \'">\'\ndocument.body.innerHTML = img(svg)\nconsole.log(svg)',
                showPreviewByDefault: true,
              },
              {
                type: 'js',
                instruction: '### 2. Shapes and words\nPredict first: rx = 30.',
                startCode: '// Shapes and words: a card is a rounded rectangle (rx rounds its corners) with a border (stroke), and text.\n// text-anchor="middle" centres text on its x; its y is the baseline, where the letters sit.\n// Predict first: what changes if you set rx to 30?\nconst svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140">\n  <rect x="1" y="1" width="98" height="138" rx="8" fill="white" stroke="#555555" stroke-width="2"/>\n  <text x="11" y="23" font-family="Georgia, serif" font-size="19" font-weight="bold" text-anchor="middle" fill="#c1121f">5</text>\n  <circle cx="50" cy="70" r="12" fill="#c1121f"/>\n</svg>`\n// Show it as the game does: as an image, made from the SVG text (a data: URL), at its own size.\nconst img = (svg, scale = 1) => \'<img style="margin:2px" width="\' + scale * Number(/width="(\\d+)"/.exec(svg)[1]) + \'" src="data:image/svg+xml;charset=utf-8,\' + encodeURIComponent(svg) + \'">\'\ndocument.body.innerHTML = img(svg)\nconsole.log(svg)',
                showPreviewByDefault: true,
              },
              {
                type: 'js',
                instruction: "### 3. Paths\nPredict first: the diamond's shape.",
                startCode: '// Paths: a pen\'s moves. M x,y moves it without drawing; L x,y draws a straight line; C draws a curve to its last\n// point, pulled towards two control points; Z closes the shape. Each suit is drawn about (0, 0), about 20 across,\n// so it can be placed anywhere. Predict first: what shape do the diamond\'s four points make?\nconst diamond = \'M0,-10 L8,0 L0,10 L-8,0 Z\'\nconst heart = \'M0,8 C-3,5 -10,1 -10,-4 C-10,-8 -7,-10 -4.5,-10 C-2.5,-10 -0.8,-8.8 0,-7 C0.8,-8.8 2.5,-10 4.5,-10 C7,-10 10,-8 10,-4 C10,1 3,5 0,8 Z\'\n// viewBox="-12 -12 24 24" shows the square from (−12, −12) to (12, 12), scaled up to 120 pixels: a zoomed-in look.\nconst svg = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="120">\n  <svg x="0" y="0" width="120" height="120" viewBox="-12 -12 24 24"><path d="${diamond}" fill="#c1121f"/></svg>\n  <svg x="130" y="0" width="120" height="120" viewBox="-12 -12 24 24"><path d="${heart}" fill="#c1121f"/></svg>\n</svg>`\n// Show it as the game does: as an image, made from the SVG text (a data: URL), at its own size.\nconst img = (svg, scale = 1) => \'<img style="margin:2px" width="\' + scale * Number(/width="(\\d+)"/.exec(svg)[1]) + \'" src="data:image/svg+xml;charset=utf-8,\' + encodeURIComponent(svg) + \'">\'\ndocument.body.innerHTML = img(svg)\nconsole.log(svg)',
                showPreviewByDefault: true,
              },
              {
                type: 'js',
                instruction: '### 4. Draw once, use many times\nPredict first: which pips turn.',
                startCode: '// Draw once, use many times. A shape in <defs> is not drawn; <use href="#id"> draws it, and transform moves\n// (translate), turns (rotate) and sizes (scale) each copy. Transforms apply right to left: translate(30 110) rotate(180)\n// turns the heart about its own centre, THEN moves it. Predict first: which pips end up upside down?\nconst heart = \'M0,8 C-3,5 -10,1 -10,-4 C-10,-8 -7,-10 -4.5,-10 C-2.5,-10 -0.8,-8.8 0,-7 C0.8,-8.8 2.5,-10 4.5,-10 C7,-10 10,-8 10,-4 C10,1 3,5 0,8 Z\'\nconst pips = [[30, 30], [70, 30], [50, 70], [30, 110], [70, 110]]\nconst use = ([x, y]) => `<use href="#heart" transform="translate(${x} ${y}) rotate(${y > 75 ? 180 : 0})"/>`\nconst svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140">\n  <defs><path id="heart" d="${heart}" fill="#c1121f"/></defs>\n  <rect x="1" y="1" width="98" height="138" rx="8" fill="white" stroke="#555555" stroke-width="2"/>\n  ${pips.map(use).join(\'\\n  \')}\n</svg>`\n// Show it as the game does: as an image, made from the SVG text (a data: URL), at its own size.\nconst img = (svg, scale = 1) => \'<img style="margin:2px" width="\' + scale * Number(/width="(\\d+)"/.exec(svg)[1]) + \'" src="data:image/svg+xml;charset=utf-8,\' + encodeURIComponent(svg) + \'">\'\ndocument.body.innerHTML = img(svg)\nconsole.log(svg)',
                showPreviewByDefault: true,
              },
              {
                type: 'js',
                instruction: "### 5. A card is a function, a deck is a loop\nPredict first: the 9 of clubs' <use> count.",
                startCode: '// A card is a function of its rank and suit: the same corner, pips and shapes, filled in. Template strings\n// (\\`…\\${…}…\\`) build the text. A corner drawn once and copied inside <g transform="rotate(180 50 70)"> lands\n// bottom-right, upside down: rotate(180 50 70) turns everything about the card\'s centre (50, 70).\n// Predict first: how many <use> elements does the 9 of clubs need?\nconst SUITS = {\n  H: \'<path d="M0,8 C-3,5 -10,1 -10,-4 C-10,-8 -7,-10 -4.5,-10 C-2.5,-10 -0.8,-8.8 0,-7 C0.8,-8.8 2.5,-10 4.5,-10 C7,-10 10,-8 10,-4 C10,1 3,5 0,8 Z"/>\',\n  D: \'<path d="M0,-10 L8,0 L0,10 L-8,0 Z"/>\',\n  S: \'<path d="M0,-9 C-3,-6 -10,-2 -10,3 C-10,7 -7,9 -4.5,9 C-2.5,9 -0.8,7.8 0,6 C0.8,7.8 2.5,9 4.5,9 C7,9 10,7 10,3 C10,-2 3,-6 0,-9 Z M0,4 L-3.5,11 L3.5,11 Z"/>\',\n  C: \'<circle cx="0" cy="-5" r="4.6"/><circle cx="-5.2" cy="1.5" r="4.6"/><circle cx="5.2" cy="1.5" r="4.6"/><path d="M0,0 L-3.5,11 L3.5,11 Z"/>\',\n}\nconst INK = { H: \'#c1121f\', D: \'#c1121f\', S: \'#111111\', C: \'#111111\' }\nconst NAME = [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\']\nconst PIPS = {\n  1: [[50, 70]], 2: [[50, 30], [50, 110]], 3: [[50, 30], [50, 70], [50, 110]],\n  4: [[30, 30], [70, 30], [30, 110], [70, 110]], 5: [[30, 30], [70, 30], [50, 70], [30, 110], [70, 110]],\n  6: [[30, 30], [70, 30], [30, 70], [70, 70], [30, 110], [70, 110]],\n  7: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70], [30, 110], [70, 110]],\n  8: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70], [50, 90], [30, 110], [70, 110]],\n  9: [[30, 28], [70, 28], [30, 56], [70, 56], [50, 70], [30, 84], [70, 84], [30, 112], [70, 112]],\n  10: [[30, 28], [70, 28], [50, 42], [30, 56], [70, 56], [30, 84], [70, 84], [50, 98], [30, 112], [70, 112]],\n}\nfunction cardSvg(rank, suit) {\n  const ink = INK[suit], name = NAME[rank]\n  const pip = (x, y, s) => `<use href="#suit" transform="translate(${x} ${y}) rotate(${y > 75 ? 180 : 0}) scale(${s})"/>`\n  const corner = `<text x="11" y="23" font-family="Georgia, serif" font-size="19" font-weight="bold" text-anchor="middle" fill="${ink}">${name}</text>${pip(11, 35, 0.55)}`\n  const middle = rank <= 10 ? PIPS[rank].map(([x, y]) => pip(x, y, rank === 1 ? 2.4 : 0.95)).join(\'\')\n    : `<rect x="22" y="22" width="56" height="96" rx="4" fill="none" stroke="${ink}"/><text x="50" y="76" font-family="Georgia, serif" font-size="40" font-weight="bold" text-anchor="middle" fill="${ink}">${name}</text>${pip(50, 98, 1)}${pip(50, 40, 1)}`\n  return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140"><defs><g id="suit" fill="${ink}">${SUITS[suit]}</g></defs><rect x="1" y="1" width="98" height="138" rx="8" fill="white" stroke="#555555" stroke-width="2"/>${corner}<g transform="rotate(180 50 70)">${corner}</g>${middle}</svg>`\n}\n// All 52, from one function and two loops: each its own image, as in the game (each has its own #suit inside it).\nconst img = (svg) => \'<img style="margin:2px" width="60" src="data:image/svg+xml;charset=utf-8,\' + encodeURIComponent(svg) + \'">\'\nlet all = \'\', chars = 0\nfor (const suit of [\'S\', \'H\', \'D\', \'C\']) for (let rank = 1; rank <= 13; rank++) { const svg = cardSvg(rank, suit); chars += svg.length; all += img(svg) }\ndocument.body.innerHTML = all\nconsole.log(\'52 cards, \' + chars + \' characters of SVG in all; the 9 of clubs uses \' + (cardSvg(9, \'C\').match(/<use/g).length) + \' <use> elements\')',
                showPreviewByDefault: true,
              },
              {
                type: 'js',
                instruction: '### 6. The back: a pattern\nPredict first: what width="8" sets.',
                startCode: '// The back: a <pattern> is a tile that fills a shape, repeated. patternTransform="rotate(45)" turns the stripes.\n// Predict first: what does width="8" on the pattern set?\nconst svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140">\n  <defs><pattern id="weave" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">\n    <rect width="8" height="8" fill="#1d4ed8"/><rect width="3" height="8" fill="#3b82f6"/></pattern></defs>\n  <rect x="1" y="1" width="98" height="138" rx="8" fill="#ffffff" stroke="#555555" stroke-width="2"/>\n  <rect x="7" y="7" width="86" height="126" rx="5" fill="url(#weave)"/>\n</svg>`\n// Show it as the game does: as an image, made from the SVG text (a data: URL), at its own size.\nconst img = (svg, scale = 1) => \'<img style="margin:2px" width="\' + scale * Number(/width="(\\d+)"/.exec(svg)[1]) + \'" src="data:image/svg+xml;charset=utf-8,\' + encodeURIComponent(svg) + \'">\'\ndocument.body.innerHTML = img(svg)\nconsole.log(svg)',
                showPreviewByDefault: true,
              },
              {
                type: 'challenge',
                instruction: '### 7. Challenge: place the pips\nThe check reads your transforms.',
                startCode: '// Challenge: write pip(x, y, upsideDown), the <use> for one pip: translate to (x, y), and turned 180 when upsideDown.\n// Then the five of diamonds\' pips are drawn from it. The check reads what you return.\nfunction pip(x, y, upsideDown) {\n  return \'\'   // your code: a <use href="#suit" transform="..."/> string\n}\nconst five = [[30, 30], [70, 30], [50, 70], [30, 110], [70, 110]].map(([x, y]) => pip(x, y, y > 75))\nconst svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140"><defs><path id="suit" d="M0,-10 L8,0 L0,10 L-8,0 Z" fill="#c1121f"/></defs><rect x="1" y="1" width="98" height="138" rx="8" fill="white" stroke="#555555" stroke-width="2"/>${five.join(\'\')}</svg>`\ndocument.body.innerHTML = \'<img width="100" src="data:image/svg+xml;charset=utf-8,\' + encodeURIComponent(svg) + \'">\'\nconst read = (s) => { const m = /<use[^>]*href="#suit"[^>]*transform="translate\\(\\s*([\\d.]+)[ ,]+([\\d.]+)\\s*\\)(\\s*rotate\\(\\s*180\\s*\\))?/.exec(s); return m ? [Number(m[1]), Number(m[2]), !!m[3]] : null }\nconst got = five.map(read)\nconst bad = got.findIndex((g, i) => !g || g[0] !== [30, 70, 50, 30, 70][i] || g[1] !== [30, 30, 70, 110, 110][i] || g[2] !== (i >= 3))\nconsole.log(bad < 0 ? \'✓ All 5 pips in place, the bottom two turned.\' : \'Pip \' + (bad + 1) + \' is \' + JSON.stringify(five[bad]) + \': it should translate to (\' + [30, 70, 50, 30, 70][bad] + \' \' + [30, 30, 70, 110, 110][bad] + \')\' + (bad >= 3 ? \' and then rotate(180).\' : \'.\'))',
                showPreviewByDefault: true,
                solutionCode: '// Challenge: write pip(x, y, upsideDown), the <use> for one pip: translate to (x, y), and turned 180 when upsideDown.\n// Then the five of diamonds\' pips are drawn from it. The check reads what you return.\nfunction pip(x, y, upsideDown) {\n  return `<use href="#suit" transform="translate(${x} ${y})${upsideDown ? \' rotate(180)\' : \'\'}"/>`\n}\nconst five = [[30, 30], [70, 30], [50, 70], [30, 110], [70, 110]].map(([x, y]) => pip(x, y, y > 75))\nconst svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140"><defs><path id="suit" d="M0,-10 L8,0 L0,10 L-8,0 Z" fill="#c1121f"/></defs><rect x="1" y="1" width="98" height="138" rx="8" fill="white" stroke="#555555" stroke-width="2"/>${five.join(\'\')}</svg>`\ndocument.body.innerHTML = \'<img width="100" src="data:image/svg+xml;charset=utf-8,\' + encodeURIComponent(svg) + \'">\'\nconst read = (s) => { const m = /<use[^>]*href="#suit"[^>]*transform="translate\\(\\s*([\\d.]+)[ ,]+([\\d.]+)\\s*\\)(\\s*rotate\\(\\s*180\\s*\\))?/.exec(s); return m ? [Number(m[1]), Number(m[2]), !!m[3]] : null }\nconst got = five.map(read)\nconst bad = got.findIndex((g, i) => !g || g[0] !== [30, 70, 50, 30, 70][i] || g[1] !== [30, 30, 70, 110, 110][i] || g[2] !== (i >= 3))\nconsole.log(bad < 0 ? \'✓ All 5 pips in place, the bottom two turned.\' : \'Pip \' + (bad + 1) + \' is \' + JSON.stringify(five[bad]) + \': it should translate to (\' + [30, 70, 50, 30, 70][bad] + \' \' + [30, 30, 70, 110, 110][bad] + \')\' + (bad >= 3 ? \' and then rotate(180).\' : \'.\'))',
              },
              {
                type: 'markdown',
                instruction: '### 8. The code you wrote, line by line\n\nFirst the five of hearts, by hand, in assets/cards/5H.svg; then the tool that draws every card.\n\n**assets/cards/5H.svg**\n\n```svg\n<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140">\n  <rect x="1" y="1" width="98" height="138" rx="8" fill="#ffffff" stroke="#555555" stroke-width="2"/>\n  <text x="11" y="23" font-family="Georgia, serif" font-size="19" font-weight="bold" text-anchor="middle" fill="#c1121f">5</text>\n</svg>\n```\n\nThe picture is 100 × 140 pixels; `xmlns` tells the browser it is SVG, and `viewBox` says the drawing\'s coordinates run from 0, 0 to 100, 140. The `<rect>` is the card: white, a grey edge 2 wide, corners rounded by 8 (`rx`). The `<text>` is the 5 in the corner, red, centred (`text-anchor="middle"`) on x 11, with its baseline at y 23.\n\n```svg\n  <defs><path id="heart" d="M0,8 C-3,5 -10,1 -10,-4 C-10,-8 -7,-10 -4.5,-10 C-2.5,-10 -0.8,-8.8 0,-7 C0.8,-8.8 2.5,-10 4.5,-10 C7,-10 10,-8 10,-4 C10,1 3,5 0,8 Z" fill="#c1121f"/></defs>\n  <g>\n    <use href="#heart" transform="translate(11 35) scale(0.55)"/>\n  </g>\n```\n\n`<defs>` holds shapes that are not drawn until used. The heart is a `<path>`: its `d` is a pen\'s moves, M to move to a point, C to draw a curve (two control points, then the end), Z to close; it is drawn about (0, 0), 20 across. `<g>` groups the corner (the 5 and its heart) so it can be copied as one. `<use href="#heart">` draws the heart again; `transform="translate(11 35) scale(0.55)"` moves it under the 5 and makes it about half size.\n\n```svg\n  <use href="#heart" transform="translate(30 30)"/>\n  <use href="#heart" transform="translate(70 30)"/>\n  <use href="#heart" transform="translate(50 70)"/>\n  <use href="#heart" transform="translate(30 110)"/>\n  <use href="#heart" transform="translate(70 110)"/>\n```\n\nThe five pips, each the same heart moved to its place: two columns at x 30 and 70 and one in the middle.\n\n```svg\n  <g transform="rotate(180 50 70)">\n    <use href="#heart" transform="translate(11 35) scale(0.55)"/>\n  </g>\n  <use href="#heart" transform="translate(30 110) rotate(180)"/>\n  <use href="#heart" transform="translate(70 110) rotate(180)"/>\n```\n\nThe corner again, inside a group turned half round about the card\'s centre (50, 70), lands bottom-right, upside down. The two lower pips get `rotate(180)` after their move, so they point down, as on a real card.\n\n**scripts/tools/cards.js**, the tool\n\n```js\nconst SUIT_SHAPES = {\n  H: \'<path d="M0,8 C-3,5 -10,1 -10,-4 C-10,-8 -7,-10 -4.5,-10 C-2.5,-10 -0.8,-8.8 0,-7 C0.8,-8.8 2.5,-10 4.5,-10 C7,-10 10,-8 10,-4 C10,1 3,5 0,8 Z"/>\',\n  D: \'<path d="M0,-10 L8,0 L0,10 L-8,0 Z"/>\',\n  S: \'<path d="M0,-9 C-3,-6 -10,-2 -10,3 C-10,7 -7,9 -4.5,9 C-2.5,9 -0.8,7.8 0,6 C0.8,7.8 2.5,9 4.5,9 C7,9 10,7 10,3 C10,-2 3,-6 0,-9 Z M0,4 L-3.5,11 L3.5,11 Z"/>\',\n  C: \'<circle cx="0" cy="-5" r="4.6"/><circle cx="-5.2" cy="1.5" r="4.6"/><circle cx="5.2" cy="1.5" r="4.6"/><path d="M0,0 L-3.5,11 L3.5,11 Z"/>\',\n```\n\nEach suit\'s shape as SVG text, about (0, 0): your heart; a diamond of four straight lines (L); a spade, an upside-down heart with a stem (a second M starts another shape in the same path); a club, three circles and a stem.\n\n```js\nconst SUIT_COLOUR = { H: \'#c1121f\', D: \'#c1121f\', S: \'#111111\', C: \'#111111\' };\nconst RANK_NAME = [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'];\n```\n\nRed and black, and the ranks\' names again: a tool cannot import from cards.js (it runs in the editor, not as a module), so it has its own copy.\n\n```js\nconst PIPS = {\n  1: [[50, 70]],\n  2: [[50, 30], [50, 110]],\n  3: [[50, 30], [50, 70], [50, 110]],\n  4: [[30, 30], [70, 30], [30, 110], [70, 110]],\n  5: [[30, 30], [70, 30], [50, 70], [30, 110], [70, 110]],\n  6: [[30, 30], [70, 30], [30, 70], [70, 70], [30, 110], [70, 110]],\n  7: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70], [30, 110], [70, 110]],\n  8: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70], [50, 90], [30, 110], [70, 110]],\n  9: [[30, 28], [70, 28], [30, 56], [70, 56], [50, 70], [30, 84], [70, 84], [30, 112], [70, 112]],\n  10: [[30, 28], [70, 28], [50, 42], [30, 56], [70, 56], [30, 84], [70, 84], [50, 98], [30, 112], [70, 112]],\n```\n\nWhere the pips go on each number card, as [x, y] pairs: the five\'s are the ones you placed by hand. A table of data instead of ten drawings.\n\n```js\nfunction cardSvg(rank, suit) {\n  const ink = SUIT_COLOUR[suit], name = RANK_NAME[rank];\n  const pip = (x, y, s) => `<use href="#suit" transform="translate(${x} ${y}) rotate(${y > 75 ? 180 : 0}) scale(${s})"/>`;\n```\n\nOne card as SVG text. `ink` is its colour and `name` its rank\'s name. `pip` is a small function that writes one `<use>` of the suit at (x, y), at size s, turned upside down if it is below the middle (y > 75): what you did by hand, as a rule. The backticks make a template string: `${…}` puts a value into the text.\n\n```js\n  const corner = `<text x="11" y="23" font-family="Georgia, \'Times New Roman\', serif" font-size="19" font-weight="bold" text-anchor="middle" fill="${ink}">${name}</text>${pip(11, 35, 0.55)}`;\n  const middle = PIPS[rank].map(([x, y]) => pip(x, y, rank === 1 ? 2.4 : 0.95)).join(\'\');\n```\n\nThe corner, as in your five, with the card\'s own name and colour. The middle: a pip at every place in PIPS for this rank (`map` makes a list of texts, `join(\'\')` runs them together), large (2.4) for an ace\'s single pip.\n\n```js\n  return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140">\n  <defs><g id="suit" fill="${ink}">${SUIT_SHAPES[suit]}</g></defs>\n  <rect x="1" y="1" width="98" height="138" rx="8" fill="#ffffff" stroke="#555555" stroke-width="2"/>\n  ${corner}<g transform="rotate(180 50 70)">${corner}</g>\n  ${middle}\n</svg>`;\n```\n\nThe whole card: your five\'s structure, with the suit\'s shape defined once as `#suit` and filled in its colour.\n\n```js\nconst BACK = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140">\n  <defs><pattern id="weave" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">\n    <rect width="8" height="8" fill="#1d4ed8"/><rect width="3" height="8" fill="#3b82f6"/></pattern></defs>\n  <rect x="1" y="1" width="98" height="138" rx="8" fill="#ffffff" stroke="#555555" stroke-width="2"/>\n  <rect x="7" y="7" width="86" height="126" rx="5" fill="url(#weave)"/>\n</svg>`;\n```\n\nThe back of every card. A `<pattern>` is a tile, here 8 × 8 with a dark and a light stripe, repeated to fill a shape and turned 45° (`patternTransform`); the inner rectangle is filled with it (`fill="url(#weave)"`).\n\n```js\nexport default function (project) {\n  for (const suit of [\'S\', \'H\', \'D\', \'C\'])\n    for (let rank = 1; rank <= 10; rank++) project.writeSvg(`assets/cards/${RANK_NAME[rank]}${suit}.svg`, cardSvg(rank, suit));\n  project.writeSvg(\'assets/cards/back.svg\', BACK);\n```\n\nThe tool itself: a function of the project. For every suit and every rank from the ace to the ten, write the picture at assets/cards/<name><suit>.svg; then the back.\n\n```js\nproject.runTool(\'scripts/tools/cards.js\')\n```\n\nWhat ▶ Run tool does, as a line of GUI → code: it runs the function above on the project, as one step you can undo.\n\n**The face cards**\n\n```js\n  let middle;\n  if (rank <= 10) middle = PIPS[rank].map(([x, y]) => pip(x, y, rank === 1 ? 2.4 : 0.95)).join(\'\');\n  else middle = `<rect x="22" y="22" width="56" height="96" rx="4" fill="${ink === \'#111111\' ? \'#e8eefc\' : \'#fdeaea\'}" stroke="${ink}" stroke-width="1.5"/>\n    <text x="50" y="76" font-family="Georgia, \'Times New Roman\', serif" font-size="40" font-weight="bold" text-anchor="middle" fill="${ink}">${name}</text>${pip(50, 98, 1)}${pip(50, 40, 1)}`;\n```\n\n`let` because the middle is now chosen: pips up to the ten; above that, a framed panel (pale blue for black suits, pale pink for red), the letter large in its middle, and a suit above and below.\n\n```js\n    for (let rank = 1; rank <= 13; rank++) project.writeSvg(`assets/cards/${RANK_NAME[rank]}${suit}.svg`, cardSvg(rank, suit));\n```\n\nThe loop now goes to 13: run the tool again and all 52 are drawn (your hand-drawn five is replaced by the tool\'s, which is the same card).\n\n```js\nexport function cardImage(card) { return `assets/cards/${RANK_NAME[card.rank]}${card.suit}.svg`; }\n```\n\nIn scripts/cards.js: a card\'s picture, by the same naming rule the tool used, so the game can show any card.',
                showPreviewByDefault: true,
              },
              {
                type: 'markdown',
                instruction: "### 9. Questions you might have\n\n**Why write pictures as text at all?** Text can be made by code: one function and two loops draw 53 pictures exactly alike, and a change to the corner changes every card. A PNG would have to be drawn 53 times.\n\n**Why `viewBox`?** It sets the drawing's own coordinates. The card could be shown at any size and every shape would scale with it; the game shows it at 0.8.\n\n**Why does the tool have its own RANK_NAME instead of importing cards.js?** A tool runs in the editor as a function, not as a module, so it cannot import. It is a little repetition for a tool that can always run.\n\n**Does the game run the tool?** No. The game imports it like any script, which only defines the function; the pictures it made are in assets/, and the game just shows them.\n\n**Can a tool do more than pictures?** Anything the Scene API can: make scenes and nodes, write scripts, add input actions. Lesson 10.7 writes a second one for the board and the pegs.",
                showPreviewByDefault: true,
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Draw the five of hearts',
        props: {
          task: 'crib-svg',
          lesson: 'mg10-003',
          checkpoint: 'cp-mg10-003-4',
        },
      },
    ],
  },

  math: {
    prose: [
      '**Under the hood (optional).** Each transform is a matrix acting on points written as $(x, y, 1)$: translate adds, scale multiplies, rotate by θ uses cos θ and sin θ. A list of transforms multiplies their matrices, which is why order matters: translate then rotate is not rotate then translate.',
      'rotate(180 50 70) is translate(50 70) rotate(180) translate(−50 −70): move the centre to the origin, turn, move back. A point $(x, y)$ goes to $(100 - x, 140 - y)$, so the corner at (11, 23) lands at (89, 117).',
    ],
    equations: [
      {
        label: 'Rotation about the origin',
        latex: "\\begin{pmatrix} x' \\\\ y' \\end{pmatrix} = \\begin{pmatrix} \\cos\\theta & -\\sin\\theta \\\\ \\sin\\theta & \\cos\\theta \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix}",
      },
      {
        label: 'Half a turn about the centre',
        latex: '(x, y) \\mapsto (100 - x,\\ 140 - y)',
      },
    ],
    callouts: [],
    visualizations: [],
  },

  rigor: {
    prose: [
      "SVG describes geometry, not pixels; turning it into pixels (rasterizing) happens at a chosen size. A game rasterizes once, at the image's width and height, for speed, so the picture is then as sharp as a bitmap of that size.",
      'A cubic Bézier curve C with control points $P_1, P_2$ from $P_0$ to $P_3$ is $B(t) = (1-t)^3P_0 + 3(1-t)^2tP_1 + 3(1-t)t^2P_2 + t^3P_3$; it starts heading towards $P_1$ and arrives from the direction of $P_2$.',
      'Where it goes: 10.4 scores the cards these pictures show; 10.7 puts them on the table as sprites that slide and can be clicked.',
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [
    {
      id: 'mg10-003-ex1',
      title: 'Where is it?',
      difficulty: 'easy',
      problem: 'In a 100 × 140 card, where is <circle cx="50" cy="20" r="5"/>?',
      steps: [
        {
          expression: '(50, 20)',
          annotation: 'Centred across, 20 down from the top.',
          strategyTitle: 'Step 1: y grows down',
        },
      ],
      answer: 'Near the top, in the middle.',
    },
    {
      id: 'mg10-003-ex2',
      title: 'A transform',
      difficulty: 'medium',
      problem: 'Where does a heart drawn about (0, 0) end up with transform="translate(70 110) rotate(180)"?',
      steps: [
        {
          expression: '\\text{rotate}(180)',
          annotation: 'Turned upside down about its own centre.',
          strategyTitle: 'Step 1: right to left',
        },
        {
          expression: '\\text{translate}(70, 110)',
          annotation: 'Then moved to (70, 110).',
          strategyTitle: 'Step 2: move',
        },
      ],
      answer: 'Upside down, centred at (70, 110): the bottom-right pip.',
    },
    {
      id: 'mg10-003-ex3',
      title: 'The corner turned',
      difficulty: 'hard',
      problem: 'The corner text is at (11, 23). Inside <g transform="rotate(180 50 70)">, where is it?',
      steps: [
        {
          expression: '(100 - 11,\\ 140 - 23)',
          annotation: 'Half a turn about (50, 70).',
          strategyTitle: 'Step 1: the map',
        },
      ],
      answer: '(89, 117), upside down: the bottom-right corner.',
    },
  ],

  challenges: [
    {
      id: 'mg10-003-ch1',
      title: 'A red back',
      difficulty: 'easy',
      problem: 'Make the card back red instead of blue.',
      hint: "The pattern's two rects.",
      answer: "Change the pattern's fills, for example to #b91c1c and #ef4444; every card back changes at once.",
      walkthrough: [],
    },
    {
      id: 'mg10-003-ch2',
      title: 'A chip',
      difficulty: 'medium',
      problem: 'Write a 40 × 40 SVG poker chip: a circle with a dashed white ring and a number in the middle.',
      hint: 'stroke-dasharray.',
      answer: '<svg xmlns=… width="40" height="40"><circle cx="20" cy="20" r="18" fill="#b91c1c"/><circle cx="20" cy="20" r="13" fill="none" stroke="white" stroke-width="3" stroke-dasharray="4 3"/><text x="20" y="25" text-anchor="middle" font-size="12" fill="white">5</text></svg>',
      walkthrough: [],
    },
    {
      id: 'mg10-003-ch3',
      title: 'Pictures for a new game',
      difficulty: 'hard',
      problem: 'Write dieSvg(n) for the six faces of a die, and the tool that saves them all.',
      hint: 'Pip positions per face, like PIPS.',
      answer: 'A table of pip positions for 1 to 6, circles at them on a rounded square; for (let n = 1; n <= 6; n++) project.writeSvg(`assets/die${n}.svg`, dieSvg(n)).',
      walkthrough: [],
    },
  ],

  semantics: {
    core: [
      {
        symbol: 'xmlns',
        meaning: '"This is SVG": needed for it to be a picture.',
      },
      {
        symbol: 'width, height',
        meaning: 'Its size in pixels; draw at the largest size shown.',
      },
      {
        symbol: 'path d',
        meaning: "A pen's moves: M move, L line, C curve, Z close.",
      },
      {
        symbol: '<defs>, <use href>',
        meaning: 'Define once, draw copies.',
      },
      {
        symbol: 'transform',
        meaning: 'translate, rotate, scale; applied right to left.',
      },
      {
        symbol: 'project.writeSvg(path, text)',
        meaning: 'Put an SVG image in the project from code.',
      },
    ],
    rulesOfThumb: [
      'y grows downwards.',
      'Draw shapes about (0, 0) so they can go anywhere.',
      'One function, many pictures.',
      'Draw big, scale the sprite down.',
    ],
  },

  misconceptions: [
    {
      falseBelief: 'An SVG is sharp at any size in the game.',
      whyStudentsThinkIt: 'Vectors scale.',
      correctionExample: 'The game rasterizes it once at its width and height; scaled up, it blurs.',
      contrastCase: 'In a browser page an SVG is redrawn at every size.',
    },
    {
      falseBelief: 'translate then rotate is the same as rotate then translate.',
      whyStudentsThinkIt: 'Both move and turn it.',
      correctionExample: 'Rotating after moving swings the shape around the origin.',
      contrastCase: 'Rotate about its own centre first (right-to-left), then move.',
    },
  ],

  transferPrompts: [
    {
      situation: 'A health bar that shows any value.',
      competingTechniques: [
        'A picture for every value',
        'An SVG function of the value, or a rect whose width is set',
      ],
      whyThisTechniqueWins: 'One function covers every value.',
    },
    {
      situation: 'Icons for a menu.',
      competingTechniques: ['PNG icons at one size', 'SVG icons'],
      whyThisTechniqueWins: 'Small, editable as text, sharp at the size they are drawn.',
    },
  ],

  debugging: [
    {
      commonError: 'Leaving out xmlns.',
      symptom: 'Game Studio says the <svg> needs xmlns; as an image it would not draw.',
      whyItHappened: 'Without it the text is not known to be SVG.',
      repairStrategy: 'xmlns="http://www.w3.org/2000/svg".',
    },
    {
      commonError: 'Putting a shape at its final position inside <defs>.',
      symptom: 'Every copy is off by that amount.',
      whyItHappened: '<use> adds its transform to where the shape already is.',
      repairStrategy: 'Draw defined shapes about (0, 0).',
    },
    {
      commonError: 'Upside-down text in the wrong corner.',
      symptom: 'The turned corner lands off the card.',
      whyItHappened: 'rotate(180) without a centre turns about (0, 0).',
      repairStrategy: "rotate(180 50 70): about the card's centre.",
    },
  ],

  mastery: {
    targetLevel: 3,
    solveIndependently: 'Write an SVG card and a function that makes many.',
    explainVerbally: 'Explain paths, defs/use and transforms.',
    detectIncorrectApplication: 'Spot a missing xmlns, a transform in the wrong order, a duplicate id.',
    transferToUnfamiliar: 'Make the pictures for another game in SVG.',
  },

  assessment: {
    questions: [
      {
        id: 'mg10-003-assess-1',
        type: 'choice',
        text: 'Which draws a copy of a shape defined in <defs>?',
        options: ['<use href="#id">', '<copy id>', '<g id>', '<path href>'],
        answer: '<use href="#id">',
        hint: 'Cell 4.',
      },
    ],
  },

  quiz: [
    {
      id: 'mg10-003-quiz-1',
      type: 'choice',
      text: 'In SVG, y grows',
      options: ['Downwards', 'Upwards', 'Towards you', 'Left'],
      answer: 'Downwards',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg10-003-quiz-2',
      type: 'choice',
      text: 'In a path, C draws',
      options: ['A curve', 'A circle', 'A closed shape', 'A colour change'],
      answer: 'A curve',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg10-003-quiz-3',
      type: 'choice',
      text: 'translate(30 110) rotate(180) first',
      options: [
        'Turns the shape about its own centre, then moves it',
        "Moves it, then turns it about the card's corner",
        'Only moves it',
        'Only turns it',
      ],
      answer: 'Turns the shape about its own centre, then moves it',
      hints: ['Cell 4.'],
      reviewSection: 'Cell 4',
    },
    {
      id: 'mg10-003-quiz-4',
      type: 'choice',
      text: 'The 9 of clubs uses how many <use> elements?',
      options: ['11', '9', '10', '13'],
      answer: '11',
      hints: ['Cell 5: 9 pips and 2 corners.'],
      reviewSection: 'Cell 5',
    },
    {
      id: 'mg10-003-quiz-5',
      type: 'choice',
      text: 'From code, an SVG goes into the project with',
      options: [
        'project.writeSvg(path, text)',
        'project.importAsset(path)',
        "scene.add('Svg')",
        'writeScript',
      ],
      answer: 'project.writeSvg(path, text)',
      hints: ['Into the game: as an asset.'],
      reviewSection: 'Intuition — into the game',
    },
    {
      id: 'mg10-003-quiz-6',
      type: 'choice',
      text: 'The cards are drawn at 100 × 140 and shown at 0.8 because',
      options: [
        'The game turns an SVG into pixels once, at its size',
        'SVG must be scaled',
        'Phaser needs even sizes',
        'It saves memory only',
      ],
      answer: 'The game turns an SVG into pixels once, at its size',
      hints: ['Size and sharpness.'],
      reviewSection: 'Intuition — size',
    },
  ],

  checkpoints: [
    {
      id: 'cp-mg10-003-1',
      label: 'Read shapes, paths and viewBox',
      type: 'read',
    },
    {
      id: 'cp-mg10-003-2',
      label: 'Read defs, use, transforms and groups',
      type: 'read',
    },
    {
      id: 'cp-mg10-003-3',
      label: 'Run the notebook: a rectangle to a deck',
      type: 'read',
    },
    {
      id: 'cp-mg10-003-4',
      label: 'Complete "Drawing a card with SVG" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg10-003-5',
      label: 'Read how SVG gets into the game and onto a sprite',
      type: 'read',
    },
    {
      id: 'cp-mg10-003-6',
      label: 'Work through the transform example',
      type: 'example',
    },
    {
      id: 'cp-mg10-003-7',
      label: 'Work through the turned corner',
      type: 'example',
    },
    {
      id: 'cp-mg10-003-8',
      label: 'Pass the pips challenge',
      type: 'challenge',
    },
  ],

  chapter: 'making-games-10',
}
