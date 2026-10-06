export default {
  order: 7,

  id: 'mg10-007',

  slug: 'cards-on-the-screen',

  title: 'Cards on the Screen, and Your Clicks',

  subtitle: 'A sprite for each card that slides to where the state says it belongs, and the mouse turned into game moves.',

  tags: [
    'game-studio',
    'cribbage',
    'sprites',
    'mouse-input',
    'hit-testing',
    'easing',
    'layout',
  ],

  aliases: 'card sprite slide easing frame rate independent exponential smoothing layout target faceUp texture zIndex mouse click input.mouse MouseLeft hit test contains select throw button keys 1-6 screen world coordinates',

  timeToComplete: 50,

  coreConcept: "The screen is a view of the table's state, worked out every frame: layout() gives each card's sprite a target position, face up or down, and a drawing order, from where the card is in the state (your hand, the AI's, the pile, the crib, the starter, the show). Each CardSprite closes a fraction k = 1 − e^(−14 dt) of the gap to its target each frame, which looks the same at any frame rate. A click is a point: input.mouse gives it in the world, an input action bound to MouseLeft says when, and a hit test (is the point within the card's rectangle, the top card first) decides which card it means; takeInput() turns that into the table's moves.",

  prerequisites: ['mg10-006'],

  nextLesson: 'mg10-008',

  hook: {
    question: 'The table knows you hold 3 5 6 9 J K and that the third and sixth are selected. How does that become six cards on the screen, two of them raised, that slide smoothly when dealt, and how does a click on one of them become "select the 6"?',
    realWorldContext: 'Separating what the game is (state) from how it looks (a view computed from the state) is how UI frameworks such as React work, and how card games keep animation, input and rules from tangling. Hit testing and screen-to-world conversion are in every game with a mouse or touch.',
  },

  intuition: {
    prose: [
      "**The Try it task.** A tool draws the board, the pegs and a button (Files › New tool…, as in lesson 10.3), and you put them in the scene; then a CardSprite for every card, which replaces the words that stood in for the hands; then your clicks, a step at a time: choosing cards, throwing them, playing them. From the fourth step your seat is yours, and the stand-in plays only the AI's.",
      '**A sprite per card.** When the table deals, it makes a CardSprite for each card: a Sprite2D that remembers its card (the data), whether it is faceUp, and its target, where it should be. newHand() creates them at the deck, so they slide out to the hands.',
      '**Sliding at any frame rate.** Each frame, update(dt) moves the sprite part of the way to its target. A fixed fraction per frame, say 0.2, slides fast on a 144 Hz screen and slowly on a 30 Hz one: after 0.2 seconds a card 300 pixels away is 0.5 px from its target at 144 fps and 78.6 px at 30 fps (cell 1). Using k = 1 − e^(−14 dt) makes the distance left after a given time the same at any frame rate, about 18 px after 0.2 s, because e^(−14 dt) multiplied over a second of frames is always e^(−14).',
      "**Face up or down.** update() also sets the picture: this.texture = this.faceUp ? cardImage(this.card) : 'assets/cards/back.svg'. The table decides faceUp; the sprite only shows it.",
      "**Layout: the view of the state.** layout() runs every frame (not in training). For each card it asks where the card is in the state and sets the sprite's target, faceUp and zIndex: your hand along the bottom (x = 330 + 86k, raised 24 px when selected, cell 3), the AI's along the top (face up only in the developer view or at the show), the pile in the middle, older piles faded to the side, the crib by the deck, the starter on the deck, and at the show the hand being counted in the middle with the starter. Cards you have played are hidden in your hand row. Because everything comes from the state, the screen can never disagree with the game.",
      "**The rest of the screen.** layout() also moves the pegs on the board (each score's hole is at x = 92 + 6.7 × (score − 1)), and writes the status line, the count, the log, the developer view and the button's label. They are Labels and Sprites on a CanvasLayer, drawn over the cards.",
      "**The mouse.** Game Studio's input has the pointer: input.mouse is where it is in the world, input.mouseScreen where it is on the screen. Mouse buttons are keys, MouseLeft and MouseRight, so the Cribbage project binds an action to a click, select = ['MouseLeft'], and asks input.isJustPressed('select'). Behind it, the runtime turns the browser's page pixels into game pixels, and the camera turns game pixels into the world (cell 4); with no camera, they are the same.",
      "**Hit testing.** A card is drawn centred on its position, 80 × 112. A point is on it when it is within 40 across and 56 down of the centre: contains(point). Cards overlap, so when several contain the point, the one drawn on top (the highest zIndex) wins (cell 2). The game tests against the card's target, where it is going, so a card still sliding into place can be clicked where you see it heading.",
      "**From a click to a move.** takeInput() runs when no wait is pending. A click on one of your cards, or keys 1 to 6, picks its place in your hand. While throwing, picking selects it or unselects it, at most two; with two selected, Enter or the Throw to crib button throws them, table.throwCards(YOU, …). While pegging on your turn, picking plays the card if it fits, and otherwise says why not. On the title screen a click on a button, or 1, 2 or 3, chooses the difficulty. Every one of these goes through the table's own methods, so a click can never break a rule.",
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: a view of the state, and input into moves',
        body: "Step 1. One sprite per thing, remembering its data. Step 2. Every frame, work out each sprite's target and look from the state (layout). Step 3. Slide with k = 1 − e^(−rate × dt). Step 4. Bind a click to an action: ['MouseLeft']. Step 5. On a click, hit-test input.mouse against the sprites, top first. Step 6. Turn what was hit into the game's own move.",
      },
      {
        type: 'warning',
        title: 'A fixed fraction per frame depends on the frame rate',
        body: 'position += (target − position) × 0.2 is fast at 144 Hz and slow at 30 Hz (cell 1). Scale by time: 1 − e^(−rate × dt).',
      },
      {
        type: 'insight',
        title: 'Pictures are not buttons',
        body: 'A sprite does not know it was clicked. A click is a point; the game decides what is under it, and what that means in the current phase. The same card is "select" while throwing, "play" while pegging, and nothing at the show.',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Build it: the screen and the mouse',
        caption: 'Frame-rate-independent sliding, hit testing, layout from state, and the mouse into the world.',
        props: {
          lesson: {
            title: 'The screen and the mouse',
            subtitle: 'A view of the state; clicks into moves.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. Sliding at any frame rate\nPredict first: 30 against 144 fps.',
                startCode: "// Sliding a card to its place: each frame, close a fraction k of the gap. Predict first: after 0.2 seconds, is a\n// card 300 pixels away as close at 30 frames a second as at 144, (a) with k = 0.2 every frame, (b) with\n// k = 1 − e^(−14 dt)?\nfunction slide(fps, kOf) {\n  let x = 0; const target = 300, dt = 1 / fps\n  for (let f = 0; f < Math.round(0.2 * fps); f++) x += (target - x) * kOf(dt)\n  return (target - x).toFixed(1)\n}\nfor (const fps of [30, 60, 144])\n  console.log(fps + ' fps: gap after 0.2 s  fixed k = 0.2: ' + slide(fps, () => 0.2).padStart(5) + ' px    k = 1 − e^(−14 dt): ' + slide(fps, (dt) => 1 - Math.exp(-14 * dt)).padStart(5) + ' px')",
              },
              {
                type: 'js',
                instruction: '### 2. Which card is under the pointer?\nPredict first: the overlap.',
                startCode: "// Which card is under the pointer? A card is drawn centred on its position, 80 × 112 pixels. Cards can overlap\n// (the AI's hand, the pile): the one drawn last, on top, is the one you meant. Predict first: what does a click at\n// (335, 160) hit, where the 4♣ and the 9♥ overlap?\nconst cards = [{ name: '4♣', x: 300, y: 165, z: 30 }, { name: '9♥', x: 370, y: 165, z: 31 }, { name: 'K♠', x: 440, y: 165, z: 32 }]\nconst contains = (c, p) => Math.abs(p.x - c.x) <= 40 && Math.abs(p.y - c.y) <= 56\nconst hit = (p) => cards.filter((c) => contains(c, p)).sort((a, b) => b.z - a.z)[0]?.name ?? 'nothing'\nfor (const p of [{ x: 300, y: 165 }, { x: 335, y: 160 }, { x: 420, y: 110 }, { x: 500, y: 165 }, { x: 300, y: 225 }])\n  console.log('click at (' + p.x + ', ' + p.y + ') hits ' + hit(p))",
              },
              {
                type: 'js',
                instruction: '### 3. Layout from the state\nPredict first: a selected card.',
                startCode: "// The layout is a function of the state: where each card goes, worked out every frame. The sprites slide there.\n// Predict first: where does your third card go when it is selected for the crib?\nconst HAND_X = 330, HAND_GAP = 86, HAND_Y = 470, LIFT = 24\nfunction yourCard(k, selected) { return { x: HAND_X + k * HAND_GAP, y: HAND_Y - (selected.includes(k) ? LIFT : 0) } }\nfunction pileCard(i) { return { x: 330 + i * 42, y: 310 } }\nconst selected = [2, 5]\nfor (let k = 0; k < 6; k++) console.log('your card ' + (k + 1) + ': ' + JSON.stringify(yourCard(k, selected)))\nconsole.log('the pile\\'s 1st, 2nd, 8th cards: ' + [0, 1, 7].map((i) => JSON.stringify(pileCard(i))).join(' '))",
              },
              {
                type: 'js',
                instruction: '### 4. From the mouse to the game\nPredict first: the world point.',
                startCode: "// From the mouse to the game. The browser reports the pointer in page pixels; the game canvas (960 × 540) is\n// scaled to fit its box, so the runtime converts: (clientX − left) × 960 / box width. With a camera, the world point\n// is view + (screen − half the screen) / zoom. Predict first: the canvas is shown 1440 × 810 at (100, 50). Where in\n// the game is a click at page (400, 200)?\nconst box = { left: 100, top: 50, width: 1440, height: 810 }, W = 960, H = 540\nconst toGame = (p) => ({ x: (p.x - box.left) * W / box.width, y: (p.y - box.top) * H / box.height })\nconst toWorld = (s, view) => ({ x: view.x + (s.x - W / 2) / view.zoom, y: view.y + (s.y - H / 2) / view.zoom })\nconst s = toGame({ x: 400, y: 200 })\nconsole.log('game pixels: (' + s.x + ', ' + s.y + ')')\nconsole.log('no camera (view at the screen centre, zoom 1): world (' + toWorld(s, { x: 480, y: 270, zoom: 1 }).x + ', ' + toWorld(s, { x: 480, y: 270, zoom: 1 }).y + ')')\nconsole.log('a camera at (1000, 400), zoom 2: world (' + toWorld(s, { x: 1000, y: 400, zoom: 2 }).x + ', ' + toWorld(s, { x: 1000, y: 400, zoom: 2 }).y + ')')",
              },
              {
                type: 'challenge',
                instruction: '### 5. Challenge: pick\nSix clicks check it.',
                startCode: "// Challenge: write pick(cards, point): the card under the point, the top one (highest z) if several, or null. Each\n// card is { name, x, y, z }, centred on (x, y), 80 × 112.\nfunction pick(cards, point) {\n  return null   // your code\n}\nconst hand = [{ name: 'A', x: 300, y: 165, z: 30 }, { name: 'B', x: 370, y: 165, z: 31 }, { name: 'C', x: 440, y: 165, z: 32 }]\nconst cases = [[{ x: 300, y: 165 }, 'A'], [{ x: 335, y: 160 }, 'B'], [{ x: 420, y: 110 }, 'C'], [{ x: 500, y: 165 }, null], [{ x: 300, y: 225 }, null], [{ x: 261, y: 110 }, 'A']]\nlet ok = 0\nfor (const [p, want] of cases) { const got = pick(hand, p); const name = got ? got.name : null; if (name === want) ok++; else console.log('At (' + p.x + ', ' + p.y + ') you picked ' + name + '; it should be ' + want + '.') }\nconsole.log(ok === cases.length ? '✓ All 6 clicks picked right.' : ok + ' of 6 clicks right.')",
                solutionCode: "// Challenge: write pick(cards, point): the card under the point, the top one (highest z) if several, or null. Each\n// card is { name, x, y, z }, centred on (x, y), 80 × 112.\nfunction pick(cards, point) {\n  const under = cards.filter((c) => Math.abs(point.x - c.x) <= 40 && Math.abs(point.y - c.y) <= 56)\n  return under.sort((a, b) => b.z - a.z)[0] ?? null\n}\nconst hand = [{ name: 'A', x: 300, y: 165, z: 30 }, { name: 'B', x: 370, y: 165, z: 31 }, { name: 'C', x: 440, y: 165, z: 32 }]\nconst cases = [[{ x: 300, y: 165 }, 'A'], [{ x: 335, y: 160 }, 'B'], [{ x: 420, y: 110 }, 'C'], [{ x: 500, y: 165 }, null], [{ x: 300, y: 225 }, null], [{ x: 261, y: 110 }, 'A']]\nlet ok = 0\nfor (const [p, want] of cases) { const got = pick(hand, p); const name = got ? got.name : null; if (name === want) ok++; else console.log('At (' + p.x + ', ' + p.y + ') you picked ' + name + '; it should be ' + want + '.') }\nconsole.log(ok === cases.length ? '✓ All 6 clicks picked right.' : ok + ' of 6 clicks right.')",
              },
              {
                type: 'markdown',
                instruction: '### 6. The code you wrote, line by line\n\nIn the order of the task\'s six steps.\n\n**The board and the pegs: scripts/tools/table.js**\n\n```js\nfunction boardSvg() {\n  let holes = \'\';\n  for (const y of [18, 42]) {\n    holes += `<circle cx="42" cy="${y}" r="2.6" fill="#3b2412"/>`;\n    for (let s = 1; s <= 121; s++) holes += `<circle cx="${(62 + 6.7 * (s - 1)).toFixed(1)}" cy="${y}" r="1.9" fill="#3b2412"/>`;\n```\n\nThe board is 900 × 60. Two tracks, yours at y 18 and the AI\'s at y 42; each has a start hole at x 42, then 121 holes, hole s at x = 62 + 6.7 (s − 1). `+=` adds text to the end of `holes`; `toFixed(1)` writes the x with one decimal.\n\n```js\n  let marks = \'\';\n  for (let s = 5; s < 121; s += 5) marks += `<line x1="${(62 + 6.7 * (s - 1) + 3.35).toFixed(1)}" y1="10" x2="${(62 + 6.7 * (s - 1) + 3.35).toFixed(1)}" y2="${s % 30 === 0 ? 52 : 14}" stroke="#7a4b22" stroke-width="${s % 30 === 0 ? 1.4 : 0.8}"/>`;\n```\n\nA short mark after every fifth hole, halfway to the next (+ 3.35), and a long, thicker one every thirty (`s % 30 === 0`: 30 divides s exactly), as on a real board.\n\n```js\n  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="60" viewBox="0 0 900 60">\n  <rect x="1" y="1" width="898" height="58" rx="12" fill="#c8903f" stroke="#6b3f17" stroke-width="2"/>\n  <text x="10" y="22" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#3b2412">You</text>\n  <text x="10" y="46" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#3b2412">AI</text>\n  ${marks}${holes}\n  <text x="878" y="34" font-family="Arial, sans-serif" font-size="10" fill="#3b2412" text-anchor="middle">121</text>\n</svg>`;\n```\n\nA wooden rectangle, the two tracks\' names, the marks and holes, and 121 at the end.\n\n```js\nconst peg = (colour) => `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">\n  <circle cx="6" cy="6" r="5" fill="${colour}" stroke="#111111" stroke-width="1"/><circle cx="4.5" cy="4.5" r="1.6" fill="#ffffff" opacity="0.6"/></svg>`;\nconst button = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n  <rect x="1.5" y="1.5" width="${w - 3}" height="${h - 3}" rx="10" fill="#f4c542" stroke="#7a5a00" stroke-width="3"/></svg>`;\n```\n\nA peg in any colour, with a small pale circle up and left so it looks round; a gold button of any size. Its words are a Label on top, so one picture serves any button.\n\n```js\nexport default function (project) {\n  project.writeSvg(\'assets/board.svg\', boardSvg());\n  project.writeSvg(\'assets/peg-you.svg\', peg(\'#e63946\'));\n  project.writeSvg(\'assets/peg-ai.svg\', peg(\'#3a86ff\'));\n  project.writeSvg(\'assets/button.svg\', button(160, 44));\nproject.runTool(\'scripts/tools/table.js\')\n```\n\nThe tool writes the board, a red peg and a blue one, and a 160 × 44 button; ▶ Run tool runs it.\n\n```js\nconst table = project.scene(\'scenes/cribbage.scene\')\ntable.add(\'Sprite2D\', { name: \'Board\', position: { x: 480, y: 38 }, texture: \'assets/board.svg\' })\ntable.add(\'Node2D\', { name: \'Pegs\', zIndex: 2 })\nfor (const [name, texture, y, opacity] of [[\'YouBack\', \'peg-you\', 26, 0.45], [\'YouFront\', \'peg-you\', 26, 1], [\'AIBack\', \'peg-ai\', 50, 0.45], [\'AIFront\', \'peg-ai\', 50, 1]])\n  table.add(\'Sprite2D\', { name, parent: \'Pegs\', position: { x: 72, y }, texture: `assets/${texture}.svg`, opacity })\ntable.add(\'Sprite2D\', { name: \'Deck\', position: { x: 108, y: 308 }, texture: \'assets/cards/back.svg\', scale: { x: 0.8, y: 0.8 } })\n```\n\nThe board across the top. Four pegs under a Node2D drawn above the board (zIndex 2): for each player a back peg (faded, opacity 0.45) and a front one, all at the start hole. The deck, a card back.\n\n```js\n    this.pegs = [[scene.get(\'Pegs/YouBack\'), scene.get(\'Pegs/YouFront\')], [scene.get(\'Pegs/AIBack\'), scene.get(\'Pegs/AIFront\')]];\n      const [back, front] = this.pegs[seat], y = seat === YOU ? 26 : 50;\n      back.position = { x: holeX(this.backPeg[seat]), y };\n      front.position = { x: holeX(this.scores[seat]), y };\nexport function holeX(score) { return score <= 0 ? 72 : 92 + (score - 1) * 6.7; }\n```\n\nIn table.js: the pegs, a pair per seat, found in ready(); in layout(), for each seat (`for (const seat of [YOU, AI])`), the front peg at its score and the back peg where it was; holeX(score) is a hole\'s x on the screen (the board\'s holes, moved by where the board is drawn), 72 for the start.\n\n**Cards on the table: scripts/cardsprite.js**\n\n```js\nimport { cardImage } from \'./cards.js\';\nexport const CARD_BACK = \'assets/cards/back.svg\';\nexport const CARD_SCALE = 0.8;\nexport default class CardSprite extends Sprite2D {\n  constructor(card, from) {\n    super();\n```\n\nA card on screen is a Sprite2D made in code. A constructor runs when one is made with `new CardSprite(card, from)`; `super()` makes the Sprite2D it extends first.\n\n```js\n    this.card = card;\n    this.name = \'Card\';\n    this.faceUp = false;\n    this.position = new Vec2(from.x, from.y);\n    this.target = { x: from.x, y: from.y };\n    this.scale = new Vec2(CARD_SCALE, CARD_SCALE);\n    this.texture = CARD_BACK;\n```\n\nIt knows its card, starts face down where it is dealt from, with a target (where it should be) the same as where it is, at 0.8 size: 80 × 112.\n\n```js\n  update(dt) {\n    const k = 1 - Math.exp(-14 * dt), p = this.position, t = this.target;\n    this.position = new Vec2(p.x + (t.x - p.x) * k, p.y + (t.y - p.y) * k);\n    this.texture = this.faceUp ? cardImage(this.card) : CARD_BACK;\n```\n\nEach frame it moves the fraction k of the way to its target: fast when far, slowing as it arrives, and the same speed at any frame rate (cell 1). And it shows its face or its back.\n\n```js\n  contains(point) {\n    return this.visible && Math.abs(point.x - this.target.x) <= 50 * CARD_SCALE && Math.abs(point.y - this.target.y) <= 70 * CARD_SCALE;\n```\n\nWhether a point is on it: within half its width and half its height of where it is going (so a card still sliding can be clicked where it will land).\n\n**scripts/table.js**: dealing sprites\n\n```js\nimport CardSprite from \'./cardsprite.js\';\n    this.cards = [];          // the CardSprite nodes on the table this hand\n    this.clearCards();\n    for (const card of [...this.hands[YOU], ...this.hands[AI]]) this.cards.push(this.addChild(new CardSprite(card, { x: 110, y: 310 })));\n    this.cards.push(this.addChild(new CardSprite(this.starter, { x: 110, y: 310 })));\n  clearCards() { for (const n of this.cards) n.queueFree(); this.cards = []; }\n```\n\nready() starts an empty list of sprites. newHand() first clears last hand\'s (clearCards frees each), then makes a sprite for each of the twelve cards, at the deck: `addChild` puts it in the scene and returns it. cut() makes one for the starter.\n\n```js\n      log: scene.get(\'HUD/Log\'), cribLabel: scene.get(\'HUD/CribLabel\'),\nproject.scene(\'scenes/cribbage.scene\').get(\'HUD/Hands\').delete()\n    } else {\n      this.standIn();\n```\n\nThe Hands label goes, from the scene and from the labels the table finds: the cards say it now. (update() keeps calling the stand-in; its else gets braces, ready for your input next.)\n\n```js\n    const at = (n, x, y, faceUp, z) => { n.target = { x, y }; n.faceUp = faceUp; n.zIndex = z; n.opacity = 1; n.visible = true; };\n    const showing = this.showing, counted = showing ? [...showing.cards, this.starter] : [];\n    for (const n of this.cards) {\n      const c = n.card;\n```\n\nlayout() now places every sprite. `at` sets where a card goes, face up or not, and which is drawn on top (zIndex). During the show, the cards being counted are the hand or crib and the starter.\n\n```js\n      const ci = counted.indexOf(c);\n      if (ci >= 0) { at(n, 330 + ci * 90, 310, true, 20 + ci); continue; }\n      if (c === this.starter) { at(n, 110, 310, true, 5); continue; }\n      const pi = this.pile.indexOf(c);\n      if (pi >= 0) { at(n, 330 + pi * 42, 310, true, 10 + pi); continue; }\n      const oi = this.older.indexOf(c);\n      if (oi >= 0) { at(n, 230 + oi * 3, 310, true, 2 + oi); n.opacity = 0.45; continue; }\n      const cr = this.crib.indexOf(c);\n      if (cr >= 0) { at(n, 110 + cr * 3, 470, false, 3 + cr); continue; }\n```\n\nEach card is asked where it is, in order, and placed by the first answer (`continue` goes on to the next card): being counted, in a row in the middle; the starter, face up on the deck; the pile, overlapping in the middle; older piles, stacked and faded to the left; the crib, face down in a stack. `indexOf` is −1 when a card is not in a list.\n\n```js\n        const k = this.hands[seat].indexOf(c);\n        if (k < 0) continue;\n        if (this.played[seat]?.[k] && this.phase === \'peg\') { n.visible = false; break; }\n        const shown = seat === YOU || this.phase === \'show\';\n        if (seat === YOU) at(n, 330 + k * 86, 470, true, 30 + k);\n        else at(n, 300 + k * 70, 165, shown, 30 + k);\n```\n\nOtherwise it is in a hand (looking through both seats). A card played this hand is hidden (it is drawn in the pile). Yours are face up along the bottom; the AI\'s along the top, face down unless it is the show.\n\n**Your clicks**\n\n```js\nproject.addAction(\'select\', [\'MouseLeft\'])\nfor (let k = 1; k <= 6; k++) project.addAction(`pick_${k}`, [`Digit${k}`])\n```\n\nA click is an input action like a key; and keys 1 to 6 pick a card by its place, for the keyboard.\n\n```js\n    this.selected = [];\n    this.selected = seat === YOU ? [] : this.selected;\n        if (seat === YOU) at(n, 330 + k * 86, 470 - (this.selected.includes(k) ? 24 : 0), true, 30 + k);\n```\n\nThe places of the cards you have chosen to throw: empty at the deal, and again once you have thrown. A selected card sits 24 pixels higher.\n\n```js\n      this.takeInput();\n  takeInput() {\n    const click = input.isJustPressed(\'select\');\n    let picked = -1;\n    for (let k = 0; k < 6; k++) if (input.isJustPressed(`pick_${k + 1}`)) picked = k;\n```\n\nWhen nothing is waiting, update() takes your input, then lets the stand-in play the AI\'s seat. `picked` is the place of the card you chose this frame, or −1 for none: first from the keys.\n\n```js\n    const mine = this.cards.filter((n) => this.hands[YOU].includes(n.card));\n    if (click) { const n = mine.find((c) => c.contains(input.mouse)); if (n) picked = this.hands[YOU].indexOf(n.card); }\n```\n\nThen from a click: your cards\' sprites, the first that contains the pointer, and its place in your hand.\n\n```js\n    if (this.phase === \'discard\' && !this.thrown[YOU]) {\n      if (picked >= 0 && picked < this.hands[YOU].length) {\n        const s = this.selected;\n        this.selected = s.includes(picked) ? s.filter((x) => x !== picked) : s.length < 2 ? [...s, picked] : [s[1], picked];\n```\n\nWhile you are throwing: a picked card is unselected if it was selected; otherwise added, unless two are already selected, when the older one gives way (`[s[1], picked]`).\n\n```js\n      const d = this.decision(AI);\n      if (d) this.move(AI, d.legal[0]);\n```\n\nThe stand-in, now for the AI\'s seat only: your seat is yours.\n\n**Throwing**\n\n```js\nproject.addAction(\'confirm\', [\'Enter\', \'Space\'])\ntable.add(\'Sprite2D\', { name: \'Button\', parent: \'HUD\', position: { x: 878, y: 470 }, texture: \'assets/button.svg\', visible: false })\ntable.add(\'Label\', { name: \'ButtonText\', parent: \'HUD\', position: { x: 822, y: 460 }, fontSize: 16, color: \'#3b2a00\', text: \'\', visible: false })\n```\n\nEnter or Space confirms; a button, hidden until it is useful, with its words on it.\n\n```js\n      log: scene.get(\'HUD/Log\'), button: scene.get(\'HUD/Button\'), buttonText: scene.get(\'HUD/ButtonText\'),\n      cribLabel: scene.get(\'HUD/CribLabel\'),\n    const throwing = this.phase === \'discard\' && !this.thrown[YOU];\n    this.hud.button.visible = this.hud.buttonText.visible = throwing && this.selected.length === 2;\n    this.hud.buttonText.text = \'Throw to crib\';\n```\n\nThe table finds the button and its text; layout() shows both when you are throwing and have two selected (`a = b = value` sets both).\n\n```js\n    const click = input.isJustPressed(\'select\'), confirm = input.isJustPressed(\'confirm\');\n      if (this.selected.length === 2 && (confirm || (click && this.hits(\'HUD/Button\', 160, 44)))) {\n        const [i, j] = [...this.selected].sort((a, b) => a - b);\n        this.throwCards(YOU, THROWS.findIndex(([a, b]) => a === i && b === j));\n```\n\nWith two selected, Enter or a click on the button throws them: the two places, low first, and the number of that pair in THROWS (`findIndex` gives the place of the first match).\n\n```js\n  hits(path, width, height) {\n    const n = scene.get(path), m = input.mouse;\n    return n.visible && Math.abs(m.x - n.position.x) <= width / 2 && Math.abs(m.y - n.position.y) <= height / 2;\n```\n\nIs the pointer on a sprite of this size? A picture is not a button by itself: the game asks where the click was.\n\n**Playing a card, and the words that say so**\n\n```js\n    if (this.phase === \'over\') { if (click || confirm) this.newGame(); return; }\n    } else if (this.phase === \'peg\' && this.waiting === YOU && picked >= 0) {\n      if (this.options(YOU).includes(picked)) this.play(YOU, picked);\n      else if (!this.played[YOU][picked]) this.say(`That would take the count past 31: play another card.`);\n```\n\nAfter a game, a click starts the next. While pegging, on your turn: a picked card is played if it is one of your options; if it is in your hand but would take the count past 31, the table says so.\n\n```js\n      if (input.isJustPressed(\'select\') || input.isJustPressed(\'confirm\')) this.timer = 0;\n    this.say(seat === YOU ? \'Your turn: click a card to play it.\' : "The AI\'s turn.");\n    this.say(`${whose} ${what}: ${s.total ? sayParts(s.parts) : \'no points\'}. Click to go on.`);\n    this.say(seat === YOU ? `You win, ${this.scores[YOU]} to ${this.scores[AI]}! Click to play again.` : `The AI wins, ${this.scores[AI]} to ${this.scores[YOU]}. Click to play again.`);\n```\n\nWhile the table waits, a click ends the wait at once: the show need not take four seconds a count. And the messages now say what a click does.',
              },
              {
                type: 'markdown',
                instruction: "### 7. Questions you might have\n\n**Why does layout() place every card every frame, instead of moving a card when it is played?** The screen is drawn from the state: wherever a card is in the hands, pile or crib, layout() puts it there. Nothing can get out of step, and the cards slide because each sprite eases towards its target.\n\n**Why is the stand-in still there for the AI?** Your seat is yours now, but the AI's needs someone to play it until lesson 10.8 gives it rules.\n\n**Why does contains() check the target, not the position?** A card slides for a fifth of a second; you click where you see it going, and the hand does not jump about under the pointer.\n\n**Why `picked` from both a click and the keys?** So the game can be played with either, and so the rest of takeInput() does not care which: a place in your hand is a place in your hand.\n\n**Could the cards be one big picture of the table?** Then nothing could move. Separate sprites each with a target is what lets the deal, the pile and the show animate on their own.",
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Cards on the screen, and your clicks',
        props: {
          task: 'crib-screen',
          lesson: 'mg10-007',
          checkpoint: 'cp-mg10-007-4',
        },
      },
    ],
  },

  math: {
    prose: [
      '**Under the hood (optional).** Closing a fraction $k$ of the gap each frame leaves $(1-k)$ of it; after $n$ frames, $(1-k)^n$. With $k = 1 - e^{-r\\,\\Delta t}$ the gap after $n$ frames is $e^{-r\\,n\\Delta t} = e^{-r t}$: it depends only on the time $t$, not on how it was cut into frames. With $r = 14$ the gap halves every $\\ln 2/14 \\approx 0.05$ s.',
      'Screen to world with a camera at $(v_x, v_y)$ and zoom $z$ on a $W \\times H$ screen: $x_w = v_x + (x_s - W/2)/z$, and the same for $y$.',
    ],
    equations: [
      {
        label: 'Frame-rate independent smoothing',
        latex: 'k = 1 - e^{-r\\,\\Delta t},\\quad \\text{gap}(t) = \\text{gap}_0\\, e^{-r t}',
      },
      {
        label: 'Screen to world',
        latex: 'x_w = v_x + \\frac{x_s - W/2}{z}',
      },
    ],
    callouts: [],
    visualizations: [],
  },

  rigor: {
    prose: [
      "The view is a pure function of the state (plus the sprites' current positions, which only smooth the motion): given the same state, layout() always gives the same targets. That is what makes the screen trustworthy.",
      "A hit test against axis-aligned rectangles is exact for unrotated sprites; rotated ones would need the point turned into the sprite's own coordinates first.",
      "Where it goes: 10.8 adds a player that needs no screen at all, and the developer view, which shows the AI's hand through the same layout.",
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [
    {
      id: 'mg10-007-ex1',
      title: 'Where your card goes',
      difficulty: 'easy',
      problem: 'Where is your fourth card (k = 3), not selected?',
      steps: [
        {
          expression: '330 + 86 \\times 3 = 588',
          annotation: 'Along the bottom row.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: '(588, 470).',
    },
    {
      id: 'mg10-007-ex2',
      title: 'A hit test',
      difficulty: 'medium',
      problem: 'A card is centred at (502, 446). Is a click at (540, 400) on it?',
      steps: [
        {
          expression: '|540 - 502| = 38 \\le 40',
          annotation: 'Across: yes.',
          strategyTitle: 'Step 1: across',
        },
        {
          expression: '|400 - 446| = 46 \\le 56',
          annotation: 'Down: yes.',
          strategyTitle: 'Step 2: down',
        },
      ],
      answer: 'Yes.',
    },
    {
      id: 'mg10-007-ex3',
      title: 'The mouse in the world',
      difficulty: 'hard',
      problem: 'The canvas is shown 1440 × 810 at (100, 50) and a camera looks at (1000, 400) with zoom 2. Where is a click at page (400, 200)?',
      steps: [
        {
          expression: '(300 \\times \\tfrac{960}{1440},\\ 150 \\times \\tfrac{540}{810}) = (200, 100)',
          annotation: 'Game pixels.',
          strategyTitle: 'Step 1',
        },
        {
          expression: '(1000 + \\tfrac{200-480}{2},\\ 400 + \\tfrac{100-270}{2})',
          annotation: 'Through the camera.',
          strategyTitle: 'Step 2',
        },
      ],
      answer: '(860, 315) in the world (cell 4).',
    },
  ],

  challenges: [
    {
      id: 'mg10-007-ch1',
      title: 'A slower slide',
      difficulty: 'easy',
      problem: 'Make the cards slide half as fast.',
      hint: 'The rate.',
      answer: 'k = 1 − e^(−7 dt).',
      walkthrough: [],
    },
    {
      id: 'mg10-007-ch2',
      title: 'Right-click to unselect all',
      difficulty: 'medium',
      problem: 'Add a right-click that clears your selection.',
      hint: 'An action for MouseRight.',
      answer: "project.addAction('clear', ['MouseRight']); in takeInput, if (input.isJustPressed('clear')) this.selected = [].",
      walkthrough: [],
    },
    {
      id: 'mg10-007-ch3',
      title: 'Hover',
      difficulty: 'hard',
      problem: 'Raise a card a little while the pointer is over it.',
      hint: 'layout runs every frame; input.mouse is always there.',
      answer: 'In layout, if a card of yours contains(input.mouse), subtract 8 from its target y.',
      walkthrough: [],
    },
  ],

  semantics: {
    core: [
      {
        symbol: 'CardSprite',
        meaning: "A card's picture: its card, faceUp, target.",
      },
      {
        symbol: 'layout()',
        meaning: 'Every frame, where each card goes, from the state.',
      },
      {
        symbol: 'k = 1 − e^(−14 dt)',
        meaning: 'The fraction of the gap closed this frame.',
      },
      {
        symbol: 'input.mouse',
        meaning: 'The pointer in the world.',
      },
      {
        symbol: "['MouseLeft']",
        meaning: 'A click, bound to an action.',
      },
      {
        symbol: 'contains(point)',
        meaning: "The hit test: within half the card's width and height.",
      },
    ],
    rulesOfThumb: [
      'The screen is a view of the state.',
      'Scale smoothing by time.',
      'Top card first.',
      "Clicks become the game's own moves.",
    ],
  },

  misconceptions: [
    {
      falseBelief: 'Moving a fixed fraction each frame looks the same everywhere.',
      whyStudentsThinkIt: 'It looks fine on my screen.',
      correctionExample: '0.5 px left at 144 fps, 78.6 px at 30 fps (cell 1).',
      contrastCase: '1 − e^(−14 dt) gives 18 px at every rate.',
    },
    {
      falseBelief: 'A sprite can be clicked.',
      whyStudentsThinkIt: 'Buttons can.',
      correctionExample: 'The game hit-tests the pointer against sprites it chooses.',
      contrastCase: 'What a click means depends on the phase.',
    },
  ],

  transferPrompts: [
    {
      situation: 'An inventory of items to drag and drop.',
      competingTechniques: [
        'Move sprites around and read the game from them',
        'Keep the inventory as data; lay out sprites from it',
      ],
      whyThisTechniqueWins: 'The data stays the truth; the screen follows.',
    },
    {
      situation: 'A camera that follows smoothly.',
      competingTechniques: ['A fixed fraction per frame', 'k = 1 − e^(−rate × dt)'],
      whyThisTechniqueWins: 'The same feel at any frame rate.',
    },
  ],

  debugging: [
    {
      commonError: "Hit-testing the sprite's current position while it slides.",
      symptom: 'Clicks miss cards that are still moving.',
      whyItHappened: 'The card is not yet where you see it heading.',
      repairStrategy: 'Test against the target.',
    },
    {
      commonError: 'Picking the first card that contains the point.',
      symptom: 'Clicking an overlapping card picks the one underneath.',
      whyItHappened: 'The list order is not the drawing order.',
      repairStrategy: 'Take the one with the highest zIndex.',
    },
    {
      commonError: 'Reading the mouse while training.',
      symptom: 'Nothing happens, or errors, in training.',
      whyItHappened: 'There is no screen or pointer in training.',
      repairStrategy: 'Take input only when not training; the practice partner plays your seat then.',
    },
  ],

  mastery: {
    targetLevel: 3,
    solveIndependently: 'Write the slide, the hit test and the click handling.',
    explainVerbally: 'Explain the view of the state and frame-rate-independent smoothing.',
    detectIncorrectApplication: 'Spot fixed-fraction smoothing and bottom-card picking.',
    transferToUnfamiliar: "Lay out and click any game's pieces.",
  },

  assessment: {
    questions: [
      {
        id: 'mg10-007-assess-1',
        type: 'choice',
        text: 'Where two cards overlap, a click picks',
        options: ['The one drawn on top', 'The first in the list', 'Both', 'Neither'],
        answer: 'The one drawn on top',
        hint: 'Cell 2.',
      },
    ],
  },

  quiz: [
    {
      id: 'mg10-007-quiz-1',
      type: 'choice',
      text: 'With k = 0.2 per frame, after 0.2 s at 30 fps the gap is',
      options: ['78.6 px', '18.2 px', '0.5 px', '300 px'],
      answer: '78.6 px',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg10-007-quiz-2',
      type: 'choice',
      text: 'A click at (335, 160) hits',
      options: ['9♥', '4♣', 'Both', 'Nothing'],
      answer: '9♥',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg10-007-quiz-3',
      type: 'choice',
      text: 'Your third card, selected, goes to',
      options: ['(502, 446)', '(502, 470)', '(416, 446)', '(330, 470)'],
      answer: '(502, 446)',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg10-007-quiz-4',
      type: 'choice',
      text: 'A click at page (400, 200) is, in game pixels',
      options: ['(200, 100)', '(400, 200)', '(860, 315)', '(300, 150)'],
      answer: '(200, 100)',
      hints: ['Cell 4.'],
      reviewSection: 'Cell 4',
    },
    {
      id: 'mg10-007-quiz-5',
      type: 'choice',
      text: 'A click is read as',
      options: [
        "input.isJustPressed('select'), select bound to MouseLeft",
        "A sprite's onClick",
        'A browser event in the script',
        'input.mouse alone',
      ],
      answer: "input.isJustPressed('select'), select bound to MouseLeft",
      hints: ['The mouse.'],
      reviewSection: 'Intuition — the mouse',
    },
    {
      id: 'mg10-007-quiz-6',
      type: 'choice',
      text: "layout() works out the cards' places from",
      options: [
        "The table's state",
        "The sprites' positions",
        'The last click',
        'The log',
      ],
      answer: "The table's state",
      hints: ['Layout.'],
      reviewSection: 'Intuition — layout',
    },
  ],

  checkpoints: [
    {
      id: 'cp-mg10-007-1',
      label: 'Read sprites, sliding and layout',
      type: 'read',
    },
    {
      id: 'cp-mg10-007-2',
      label: 'Read the mouse, hit testing and moves',
      type: 'read',
    },
    {
      id: 'cp-mg10-007-3',
      label: 'Run the notebook',
      type: 'read',
    },
    {
      id: 'cp-mg10-007-4',
      label: 'Complete "Cards on the screen" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg10-007-5',
      label: 'Read the rest of the screen',
      type: 'read',
    },
    {
      id: 'cp-mg10-007-6',
      label: 'Work through the hit test',
      type: 'example',
    },
    {
      id: 'cp-mg10-007-7',
      label: 'Work through the mouse in the world',
      type: 'example',
    },
    {
      id: 'cp-mg10-007-8',
      label: 'Pass the pick challenge',
      type: 'challenge',
    },
  ],

  chapter: 'making-games-10',
}
