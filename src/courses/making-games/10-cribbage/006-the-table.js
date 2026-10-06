export default {
  order: 6,

  id: 'mg10-006',

  slug: 'the-table',

  title: 'The Table: a Game as a State Machine',

  subtitle: 'Deal, crib, cut, pegging and the show as phases that hand on to each other, with pauses that never stop the game, to 121.',

  tags: [
    'game-studio',
    'cribbage',
    'state-machine',
    'game-loop',
    'timers',
    'game-flow',
  ],

  aliases: 'state machine phase game flow deal throw crib cut starter show award score board pegs back peg 121 wait timer pending update dt training no pauses dealer alternates',

  timeToComplete: 60,

  coreConcept: "A turn-based game is a state machine: the table is always in one phase (title, discard, cut, peg, show, over), holds the state that phase needs (hands, crib, starter, deck, count, scores, dealer), and each phase's function does its part and moves to the next. Pauses are not loops: wait(seconds, then) stores what to do next and a timer, and update(dt) counts down each frame, so the game keeps drawing and taking input while it waits; in training every wait is 0. award() is the one place points are scored: it moves the pegs and ends the game at 121, even mid-hand.",

  prerequisites: ['mg10-005'],

  nextLesson: 'mg10-007',

  hook: {
    question: 'The deal, the throw, the cut, pegging, the show, then deal again: how does one script keep track of where a game of cards is, wait a moment between plays so you can follow, and still let an AI train through thousands of hands a minute?',
    realWorldContext: 'Every turn-based game, from chess apps to Hearthstone, is a state machine over phases and whose turn it is. Separating the flow (what comes next) from the timing (how long to show it) is also what lets those games run headless for testing, replays and AI training.',
  },

  intuition: {
    prose: [
      '**The Try it task builds it from nothing.** It starts where lesson 10.5 ended: cards, pictures and scoring, but no game. You make the scene (a Table node and a HUD of labels), then write table.js a phase at a time: the deal, the throw, points, the cut, pegging, the go and 31, the show. Until there are players, a stand-in plays both seats (the first move each may make), so the game can play itself from the second step, and the hands are shown as words. Lesson 10.7 puts cards on the table and gives you your seat.',
      "**The state.** Everything the game is, at any moment, lives in the Table script's fields: phase, dealer, hands (two lists of cards), crib, threw (the two each player threw, which they remember seeing), starter, deck, pile and count, played (which cards each has played), turn and waiting (whose move), scores and backPeg. Nothing about the game is kept anywhere else; the screen is drawn from these each frame.",
      '**The phases.** phase is one of: title (choose a difficulty), discard, cut, peg, show, over, and in training done. Each has a function that does its work and sets the next phase: newHand() deals and goes to discard; throwCards() moves two cards to the crib and, when both players have thrown, cuts; cut() turns the starter and starts pegging; nextTurn() (lesson 10.5) runs pegging to its end and starts the show; startShow() counts the hands and the crib and calls endHand(), which passes the deal and calls newHand() again. Cell 1 runs one hand through the same phases.',
      '**The deal.** newHand(): a new shuffled deck; six cards each from its top, one at a time, the non-dealer first; your hand sorted by rank; an empty crib; phase discard. It also puts a CardSprite on the table for each card (10.7) and says who dealt.',
      '**Scoring in one place.** Every point (his heels, pegging, go, last card, the show) goes through award(seat, points, why): the back peg moves to where the front peg was, the front peg moves on, the reason is noted in the log, and if that reaches 121 the game is over at once, phase over, nothing pending. Because the non-dealer counts first at the show, a close game can end before the dealer counts; cell 3 finds about a quarter of games won during pegging.',
      '**Waiting without stopping.** A human needs a moment to see each card. A loop that waits would freeze the game: nothing drawn, no input. Instead wait(seconds, then) stores then and a timer; update(dt) subtracts dt each frame and calls then when it reaches 0 (cell 2: a 0.6 s wait at 60 frames a second ends on frame 36). The game keeps drawing and you can click to hurry it along. The AI\'s "thinking" pause is the same: its move is not legal until think has counted down.',
      '**Training does not wait.** When ai.training is true, every wait is 0 and there is no title screen: a hand starts at once, each phase takes a frame, and a practice partner (lesson 10.8) plays your seat. In cell 2, the cut comes at frame 1 instead of 36. That is how 8,000 hands of training take about a minute.',
      "**Players ask, the table answers.** Neither player changes the table's state directly. decision(seat) says what a seat must decide now (throw, play, or nothing yet) and its legal moves; move(seat, action) makes one, after checking it is legal. Your clicks, the practice partner and the AI all go through the same two methods, so they cannot break the rules, and the AI can be trained without knowing how the table works inside.",
      '**A whole game.** Cell 3 plays 2,000 games with two simple players: 12.6 hands a game, and the first dealer wins 53.8% (dealing first means one more crib early on). With autoplay and fast set, the real game in Game Studio plays itself like this too, which is how lesson 10.12 measures the AI.',
    ],
    callouts: [
      {
        type: 'procedure',
        title: "Procedure: a turn-based game's flow",
        body: 'Step 1. List the phases and what each needs to know. Step 2. Keep all state in one place (the table\'s fields). Step 3. One function per phase that does its work and sets the next phase. Step 4. Score through one function that also checks for the end. Step 5. Pause with a stored then-function and a timer counted down in update(dt), never a loop. Step 6. Let players act only through "what may I do" and "do this".',
      },
      {
        type: 'warning',
        title: 'Never wait in a loop',
        body: 'while (time < end) {} inside update() stops the frame from finishing: the screen freezes and input stops. Store what comes next and count down in update(dt).',
      },
      {
        type: 'insight',
        title: 'Headless is free',
        body: 'Because the state and the flow live in the table and the screen only reads them, the same game runs with no screen and no waits: for tests, for measuring players against each other, and for training an AI.',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Build it: the table',
        caption: 'One hand through the phases, waiting without stopping, and 2,000 whole games.',
        props: {
          lesson: {
            title: 'The table',
            subtitle: 'Phases, timers, a game to 121.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. One hand, phase by phase\nPredict first: the order of the phases.',
                startCode: '// A seeded random-number generator (mulberry32, Game Studio\'s), so this cell deals the same cards every run.\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\n// Cards and the deck. A card is a plain object, { rank, suit }: rank 1 (ace) to 13 (king), suit one of S H D C.\n// Nothing here draws anything, so the rules can be tested, and an agent can learn, without a screen.\n\nconst SUITS = [\'S\', \'H\', \'D\', \'C\'];\nconst SUIT_SYMBOL = { S: \'♠\', H: \'♥\', D: \'♦\', C: \'♣\' };\nconst RANK_NAME = [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'];\n\n/** What a card counts for, toward 15 and 31: an ace is 1, a face card 10. */\nfunction value(card) { return Math.min(card.rank, 10); }\n\n/** A card\'s name, such as 10♥. */\nfunction cardName(card) { return RANK_NAME[card.rank] + SUIT_SYMBOL[card.suit]; }\n\n/** Its picture: assets/cards/10H.svg (the card tool, scripts/tools/cards.js, draws all 52, and the back). */\nfunction cardImage(card) { return `assets/cards/${RANK_NAME[card.rank]}${card.suit}.svg`; }\n\n/** A fresh deck: the 52 cards in order. */\nfunction newDeck() {\n  const deck = [];\n  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ rank, suit });\n  return deck;\n}\n\n/**\n * Shuffle in place (Fisher–Yates): for each position from the last down, swap in a card chosen at random from those\n * not yet placed. Every order is equally likely. It uses Math.random, which training seeds, so a hand can be replayed.\n */\nfunction shuffle(deck) {\n  for (let i = deck.length - 1; i > 0; i--) {\n    const j = Math.floor(Math.random() * (i + 1));\n    [deck[i], deck[j]] = [deck[j], deck[i]];\n  }\n  return deck;\n}\n\n/** The same card? (Two objects can describe one card.) */\nfunction sameCard(a, b) { return a.rank === b.rank && a.suit === b.suit; }\n// Scoring cribbage: the show (a hand of four with the starter) and pegging (each card as it is played).\n// Every function returns its points with the reasons, so the game can say "fifteen 2, fifteen 4, a pair is 6".\n\n\n/** Every subset of the cards (by bitmask), as lists: 2ⁿ of them, for n cards. */\nfunction subsets(cards) {\n  const out = [];\n  for (let mask = 1; mask < 1 << cards.length; mask++) out.push(cards.filter((_, i) => mask & (1 << i)));\n  return out;\n}\n\n/** Fifteens: 2 for each different set of cards adding up to 15. */\nfunction fifteens(cards) {\n  const sets = subsets(cards).filter((s) => s.reduce((t, c) => t + value(c), 0) === 15);\n  return sets.map((s) => ({ what: \'fifteen\', cards: s, points: 2 }));\n}\n\n/** Pairs: 2 for each pair of cards of the same rank (three of a kind is three pairs, 6; four is six pairs, 12). */\nfunction pairs(cards) {\n  const out = [];\n  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++)\n    if (cards[i].rank === cards[j].rank) out.push({ what: \'pair\', cards: [cards[i], cards[j]], points: 2 });\n  return out;\n}\n\n/** Is this set of cards a run: different ranks, one after another (in any order)? */\nfunction isRun(cards) {\n  const r = cards.map((c) => c.rank).sort((a, b) => a - b);\n  return r.every((x, i) => i === 0 || x === r[i - 1] + 1);\n}\n\n/**\n * Runs: three or more cards in sequence (aces are low: A 2 3 is a run, Q K A is not). Only the longest runs count,\n * once for each different set of cards that makes one: 3 4 4 5 is two runs of three, 6 points.\n */\nfunction runs(cards) {\n  for (let length = cards.length; length >= 3; length--) {\n    const found = subsets(cards).filter((s) => s.length === length && isRun(s));\n    if (found.length) return found.map((s) => ({ what: `run of ${length}`, cards: s, points: length }));\n  }\n  return [];\n}\n\n/**\n * Flush: the four cards in a hand of one suit, 4, and 5 if the starter is too. The crib only scores a flush of all\n * five.\n */\nfunction flush(hand, starter, isCrib) {\n  if (!hand.every((c) => c.suit === hand[0].suit)) return [];\n  if (starter.suit === hand[0].suit) return [{ what: \'flush\', cards: [...hand, starter], points: 5 }];\n  return isCrib ? [] : [{ what: \'flush\', cards: hand, points: 4 }];\n}\n\n/** Nobs: the jack of the starter\'s suit in the hand, 1. */\nfunction nobs(hand, starter) {\n  const jack = hand.find((c) => c.rank === 11 && c.suit === starter.suit);\n  return jack ? [{ what: \'nobs\', cards: [jack], points: 1 }] : [];\n}\n\n/** The show: a hand of four (or the crib) with the starter. { total, parts }. */\nfunction scoreHand(hand, starter, isCrib = false) {\n  const all = [...hand, starter];\n  const parts = [...fifteens(all), ...pairs(all), ...runs(all), ...flush(hand, starter, isCrib), ...nobs(hand, starter)];\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** The count: what the cards played since the last reset add up to. */\nfunction countOf(pile) { return pile.reduce((t, c) => t + value(c), 0); }\n\n/**\n * Pegging: the points for the card just played, the last of `pile` (the cards played since the count was last\n * reset to 0). 15 or 31 is 2; a pair with the card before is 2, three of a kind 6, four 12; a run is one point a card,\n * when the last three or more cards (in any order) make one.\n */\nfunction pegPoints(pile) {\n  const parts = [], count = countOf(pile), card = pile[pile.length - 1];\n  if (count === 15) parts.push({ what: \'fifteen\', points: 2 });\n  if (count === 31) parts.push({ what: \'thirty-one\', points: 2 });\n  let same = 1;\n  while (same < pile.length && pile[pile.length - 1 - same].rank === card.rank) same++;\n  if (same >= 2) parts.push({ what: [\'\', \'\', \'a pair\', \'three of a kind\', \'four of a kind\'][same], points: [0, 0, 2, 6, 12][same] });\n  for (let length = pile.length; length >= 3; length--) {\n    if (isRun(pile.slice(-length))) { parts.push({ what: `run of ${length}`, points: length }); break; }\n  }\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** "fifteen 2, a pair is 4, …": points as they are said aloud. */\nfunction sayParts(parts) {\n  let running = 0;\n  return parts.map((p) => `${p.what} ${(running += p.points)}`).join(\', \');\n}\n// A table without a screen: the same phases as table.js, with two simple players (throw two at random, peg the\n// first card that fits). log(…) says what happens.\nfunction newTable(log = () => {}) {\n  const t = { scores: [0, 0], dealer: 0, phase: \'deal\', hands: 0, endedIn: null }\n  const NAMES = [\'P0\', \'P1\']\n  const award = (seat, points, why) => {\n    if (!points || t.phase === \'over\') return\n    t.scores[seat] = Math.min(121, t.scores[seat] + points); log(\'  \' + NAMES[seat] + \' pegs \' + points + \' (\' + why + \') → \' + t.scores[seat])\n    if (t.scores[seat] >= 121) { t.endedIn = t.phase; t.phase = \'over\'; log(\'  \' + NAMES[seat] + \' reaches 121 during \' + t.endedIn + \': game over\') }\n  }\n  t.step = () => {\n    if (t.phase === \'deal\') {\n      t.deck = shuffle(newDeck()); t.h = [[], []]\n      for (let k = 0; k < 6; k++) for (const s of [1 - t.dealer, t.dealer]) t.h[s].push(t.deck.pop())\n      log(\'deal: \' + NAMES[t.dealer] + \' deals\'); t.phase = \'discard\'\n    } else if (t.phase === \'discard\') {\n      t.crib = []\n      for (const s of [0, 1]) { shuffle(t.h[s]); t.crib.push(t.h[s].pop(), t.h[s].pop()) }\n      log(\'discard: both throw two to \' + NAMES[t.dealer] + \'\\\'s crib\'); t.phase = \'cut\'\n    } else if (t.phase === \'cut\') {\n      t.starter = t.deck.pop(); log(\'cut: the starter is \' + cardName(t.starter)); t.phase = \'peg\'\n      if (t.starter.rank === 11) award(t.dealer, 2, \'his heels\')\n    } else if (t.phase === \'peg\') {\n      const played = [[], []], left = (s) => 4 - played[s].length\n      let pile = [], turn = 1 - t.dealer, last = null\n      const opts = (s) => t.h[s].filter((c) => !played[s].includes(c) && countOf(pile) + value(c) <= 31)\n      while (t.phase === \'peg\' && left(0) + left(1) > 0) {\n        if (countOf(pile) === 31) pile = []\n        const o = opts(turn)\n        if (!o.length) { if (opts(1 - turn).length) { turn = 1 - turn; continue } award(last, 1, \'go\'); pile = []; turn = 1 - last; continue }\n        played[turn].push(o[0]); pile.push(o[0]); last = turn\n        award(turn, pegPoints(pile).total, \'pegging\'); turn = 1 - turn\n      }\n      if (t.phase === \'peg\') { if (countOf(pile) !== 31) award(last, 1, \'last card\') }\n      if (t.phase === \'peg\') t.phase = \'show\'\n    } else if (t.phase === \'show\') {\n      for (const [s, what] of [[1 - t.dealer, \'hand\'], [t.dealer, \'hand\'], [t.dealer, \'crib\']]) {\n        award(s, scoreHand(what === \'crib\' ? t.crib : t.h[s], t.starter, what === \'crib\').total, \'show: \' + what)\n        if (t.phase === \'over\') return\n      }\n      t.hands++; t.dealer = 1 - t.dealer; t.phase = \'deal\'\n    }\n  }\n  return t\n}\n// One hand, phase by phase. Predict first: in what order do the phases come, and who counts first at the show?\nconst real = Math.random\nMath.random = seeded(8)                    // the game\'s shuffle uses Math.random: seeded, the same deal every run\nconst t = newTable(console.log)\nt.dealer = 1\ndo { t.step() } while (t.phase !== \'deal\' && t.phase !== \'over\')\nMath.random = real\nconsole.log(\'after one hand: \' + t.scores.join(\' to \'))',
              },
              {
                type: 'js',
                instruction: '### 2. Waiting without stopping\nPredict first: the frame of the cut.',
                startCode: "// Waiting without stopping the game. The table never pauses the frame loop: it stores what to do next and a timer,\n// and update(dt) counts the timer down each frame. Training sets every wait to 0. Predict first: on which frame does\n// the cut happen at 60 frames a second, when the discard waits 0.6 seconds, and in training?\nfunction run(training) {\n  const t = { pending: null, timer: 0, log: [] }\n  const wait = (seconds, then) => { t.pending = then; t.timer = training ? 0 : seconds }\n  wait(0.6, () => { t.log.push('cut'); wait(1, () => t.log.push('pegging starts')) })\n  for (let frame = 1; frame <= 200 && t.log.length < 2; frame++) {\n    t.timer -= 1 / 60                                // update(dt), dt = 1/60\n    if (t.pending && t.timer <= 0) { const then = t.pending; t.pending = null; then(); t.log[t.log.length - 1] += ' at frame ' + frame }\n  }\n  return t.log.join(', ')\n}\nconsole.log('playing:  ' + run(false))\nconsole.log('training: ' + run(true))",
              },
              {
                type: 'js',
                instruction: "### 3. Whole games\nPredict first: hands per game, the first dealer's edge.",
                startCode: '// A seeded random-number generator (mulberry32, Game Studio\'s), so this cell deals the same cards every run.\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\n// Cards and the deck. A card is a plain object, { rank, suit }: rank 1 (ace) to 13 (king), suit one of S H D C.\n// Nothing here draws anything, so the rules can be tested, and an agent can learn, without a screen.\n\nconst SUITS = [\'S\', \'H\', \'D\', \'C\'];\nconst SUIT_SYMBOL = { S: \'♠\', H: \'♥\', D: \'♦\', C: \'♣\' };\nconst RANK_NAME = [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'];\n\n/** What a card counts for, toward 15 and 31: an ace is 1, a face card 10. */\nfunction value(card) { return Math.min(card.rank, 10); }\n\n/** A card\'s name, such as 10♥. */\nfunction cardName(card) { return RANK_NAME[card.rank] + SUIT_SYMBOL[card.suit]; }\n\n/** Its picture: assets/cards/10H.svg (the card tool, scripts/tools/cards.js, draws all 52, and the back). */\nfunction cardImage(card) { return `assets/cards/${RANK_NAME[card.rank]}${card.suit}.svg`; }\n\n/** A fresh deck: the 52 cards in order. */\nfunction newDeck() {\n  const deck = [];\n  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ rank, suit });\n  return deck;\n}\n\n/**\n * Shuffle in place (Fisher–Yates): for each position from the last down, swap in a card chosen at random from those\n * not yet placed. Every order is equally likely. It uses Math.random, which training seeds, so a hand can be replayed.\n */\nfunction shuffle(deck) {\n  for (let i = deck.length - 1; i > 0; i--) {\n    const j = Math.floor(Math.random() * (i + 1));\n    [deck[i], deck[j]] = [deck[j], deck[i]];\n  }\n  return deck;\n}\n\n/** The same card? (Two objects can describe one card.) */\nfunction sameCard(a, b) { return a.rank === b.rank && a.suit === b.suit; }\n// Scoring cribbage: the show (a hand of four with the starter) and pegging (each card as it is played).\n// Every function returns its points with the reasons, so the game can say "fifteen 2, fifteen 4, a pair is 6".\n\n\n/** Every subset of the cards (by bitmask), as lists: 2ⁿ of them, for n cards. */\nfunction subsets(cards) {\n  const out = [];\n  for (let mask = 1; mask < 1 << cards.length; mask++) out.push(cards.filter((_, i) => mask & (1 << i)));\n  return out;\n}\n\n/** Fifteens: 2 for each different set of cards adding up to 15. */\nfunction fifteens(cards) {\n  const sets = subsets(cards).filter((s) => s.reduce((t, c) => t + value(c), 0) === 15);\n  return sets.map((s) => ({ what: \'fifteen\', cards: s, points: 2 }));\n}\n\n/** Pairs: 2 for each pair of cards of the same rank (three of a kind is three pairs, 6; four is six pairs, 12). */\nfunction pairs(cards) {\n  const out = [];\n  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++)\n    if (cards[i].rank === cards[j].rank) out.push({ what: \'pair\', cards: [cards[i], cards[j]], points: 2 });\n  return out;\n}\n\n/** Is this set of cards a run: different ranks, one after another (in any order)? */\nfunction isRun(cards) {\n  const r = cards.map((c) => c.rank).sort((a, b) => a - b);\n  return r.every((x, i) => i === 0 || x === r[i - 1] + 1);\n}\n\n/**\n * Runs: three or more cards in sequence (aces are low: A 2 3 is a run, Q K A is not). Only the longest runs count,\n * once for each different set of cards that makes one: 3 4 4 5 is two runs of three, 6 points.\n */\nfunction runs(cards) {\n  for (let length = cards.length; length >= 3; length--) {\n    const found = subsets(cards).filter((s) => s.length === length && isRun(s));\n    if (found.length) return found.map((s) => ({ what: `run of ${length}`, cards: s, points: length }));\n  }\n  return [];\n}\n\n/**\n * Flush: the four cards in a hand of one suit, 4, and 5 if the starter is too. The crib only scores a flush of all\n * five.\n */\nfunction flush(hand, starter, isCrib) {\n  if (!hand.every((c) => c.suit === hand[0].suit)) return [];\n  if (starter.suit === hand[0].suit) return [{ what: \'flush\', cards: [...hand, starter], points: 5 }];\n  return isCrib ? [] : [{ what: \'flush\', cards: hand, points: 4 }];\n}\n\n/** Nobs: the jack of the starter\'s suit in the hand, 1. */\nfunction nobs(hand, starter) {\n  const jack = hand.find((c) => c.rank === 11 && c.suit === starter.suit);\n  return jack ? [{ what: \'nobs\', cards: [jack], points: 1 }] : [];\n}\n\n/** The show: a hand of four (or the crib) with the starter. { total, parts }. */\nfunction scoreHand(hand, starter, isCrib = false) {\n  const all = [...hand, starter];\n  const parts = [...fifteens(all), ...pairs(all), ...runs(all), ...flush(hand, starter, isCrib), ...nobs(hand, starter)];\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** The count: what the cards played since the last reset add up to. */\nfunction countOf(pile) { return pile.reduce((t, c) => t + value(c), 0); }\n\n/**\n * Pegging: the points for the card just played, the last of `pile` (the cards played since the count was last\n * reset to 0). 15 or 31 is 2; a pair with the card before is 2, three of a kind 6, four 12; a run is one point a card,\n * when the last three or more cards (in any order) make one.\n */\nfunction pegPoints(pile) {\n  const parts = [], count = countOf(pile), card = pile[pile.length - 1];\n  if (count === 15) parts.push({ what: \'fifteen\', points: 2 });\n  if (count === 31) parts.push({ what: \'thirty-one\', points: 2 });\n  let same = 1;\n  while (same < pile.length && pile[pile.length - 1 - same].rank === card.rank) same++;\n  if (same >= 2) parts.push({ what: [\'\', \'\', \'a pair\', \'three of a kind\', \'four of a kind\'][same], points: [0, 0, 2, 6, 12][same] });\n  for (let length = pile.length; length >= 3; length--) {\n    if (isRun(pile.slice(-length))) { parts.push({ what: `run of ${length}`, points: length }); break; }\n  }\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** "fifteen 2, a pair is 4, …": points as they are said aloud. */\nfunction sayParts(parts) {\n  let running = 0;\n  return parts.map((p) => `${p.what} ${(running += p.points)}`).join(\', \');\n}\n// A table without a screen: the same phases as table.js, with two simple players (throw two at random, peg the\n// first card that fits). log(…) says what happens.\nfunction newTable(log = () => {}) {\n  const t = { scores: [0, 0], dealer: 0, phase: \'deal\', hands: 0, endedIn: null }\n  const NAMES = [\'P0\', \'P1\']\n  const award = (seat, points, why) => {\n    if (!points || t.phase === \'over\') return\n    t.scores[seat] = Math.min(121, t.scores[seat] + points); log(\'  \' + NAMES[seat] + \' pegs \' + points + \' (\' + why + \') → \' + t.scores[seat])\n    if (t.scores[seat] >= 121) { t.endedIn = t.phase; t.phase = \'over\'; log(\'  \' + NAMES[seat] + \' reaches 121 during \' + t.endedIn + \': game over\') }\n  }\n  t.step = () => {\n    if (t.phase === \'deal\') {\n      t.deck = shuffle(newDeck()); t.h = [[], []]\n      for (let k = 0; k < 6; k++) for (const s of [1 - t.dealer, t.dealer]) t.h[s].push(t.deck.pop())\n      log(\'deal: \' + NAMES[t.dealer] + \' deals\'); t.phase = \'discard\'\n    } else if (t.phase === \'discard\') {\n      t.crib = []\n      for (const s of [0, 1]) { shuffle(t.h[s]); t.crib.push(t.h[s].pop(), t.h[s].pop()) }\n      log(\'discard: both throw two to \' + NAMES[t.dealer] + \'\\\'s crib\'); t.phase = \'cut\'\n    } else if (t.phase === \'cut\') {\n      t.starter = t.deck.pop(); log(\'cut: the starter is \' + cardName(t.starter)); t.phase = \'peg\'\n      if (t.starter.rank === 11) award(t.dealer, 2, \'his heels\')\n    } else if (t.phase === \'peg\') {\n      const played = [[], []], left = (s) => 4 - played[s].length\n      let pile = [], turn = 1 - t.dealer, last = null\n      const opts = (s) => t.h[s].filter((c) => !played[s].includes(c) && countOf(pile) + value(c) <= 31)\n      while (t.phase === \'peg\' && left(0) + left(1) > 0) {\n        if (countOf(pile) === 31) pile = []\n        const o = opts(turn)\n        if (!o.length) { if (opts(1 - turn).length) { turn = 1 - turn; continue } award(last, 1, \'go\'); pile = []; turn = 1 - last; continue }\n        played[turn].push(o[0]); pile.push(o[0]); last = turn\n        award(turn, pegPoints(pile).total, \'pegging\'); turn = 1 - turn\n      }\n      if (t.phase === \'peg\') { if (countOf(pile) !== 31) award(last, 1, \'last card\') }\n      if (t.phase === \'peg\') t.phase = \'show\'\n    } else if (t.phase === \'show\') {\n      for (const [s, what] of [[1 - t.dealer, \'hand\'], [t.dealer, \'hand\'], [t.dealer, \'crib\']]) {\n        award(s, scoreHand(what === \'crib\' ? t.crib : t.h[s], t.starter, what === \'crib\').total, \'show: \' + what)\n        if (t.phase === \'over\') return\n      }\n      t.hands++; t.dealer = 1 - t.dealer; t.phase = \'deal\'\n    }\n  }\n  return t\n}\n// Whole games to 121, 2,000 of them, the same two simple players. Predict first: how many hands does a game take,\n// and does dealing first help?\nconst real = Math.random\nMath.random = seeded(21)\nlet hands = 0, firstDealerWins = 0, endedIn = { peg: 0, show: 0, cut: 0 }\nfor (let g = 0; g < 2000; g++) {\n  const t = newTable()\n  while (t.phase !== \'over\') t.step()\n  hands += t.hands + 1\n  if (t.scores[0] >= 121) firstDealerWins++                  // player 0 always deals first here\n  endedIn[t.endedIn]++\n}\nMath.random = real\nconsole.log(\'hands per game: \' + (hands / 2000).toFixed(1))\nconsole.log(\'the first dealer wins \' + (100 * firstDealerWins / 2000).toFixed(1) + \'% of games\')\nconsole.log(\'games won during pegging \' + endedIn.peg + \', during the show \' + endedIn.show + \', at the cut \' + endedIn.cut)',
              },
              {
                type: 'challenge',
                instruction: '### 4. Challenge: award\nTwo awards check it.',
                startCode: "// Challenge: write award(state, seat, points): the back peg moves to the front peg, the front peg moves on (never past\n// 121), and reaching 121 sets state.over = true at once. The checks run a few awards.\nfunction award(state, seat, points) {\n  // your code\n}\nconst s = { scores: [40, 118], back: [0, 0], over: false }\naward(s, 0, 5)\nconst a = s.scores[0] === 45 && s.back[0] === 40 && !s.over\naward(s, 1, 6)\nconst b = s.scores[1] === 121 && s.back[1] === 118 && s.over\nconsole.log(a && b ? '✓ The pegs move and 121 ends the game.' : !a ? 'After 5 points from 40: front peg 45, back peg 40; you have ' + s.scores[0] + ' and ' + s.back[0] + '.' : '118 + 6 should stop at 121 and end the game; you have ' + s.scores[1] + (s.over ? '' : ', and the game is not over') + '.')",
                solutionCode: "// Challenge: write award(state, seat, points): the back peg moves to the front peg, the front peg moves on (never past\n// 121), and reaching 121 sets state.over = true at once. The checks run a few awards.\nfunction award(state, seat, points) {\n  state.back[seat] = state.scores[seat]\n  state.scores[seat] = Math.min(121, state.scores[seat] + points)\n  if (state.scores[seat] >= 121) state.over = true\n}\nconst s = { scores: [40, 118], back: [0, 0], over: false }\naward(s, 0, 5)\nconst a = s.scores[0] === 45 && s.back[0] === 40 && !s.over\naward(s, 1, 6)\nconst b = s.scores[1] === 121 && s.back[1] === 118 && s.over\nconsole.log(a && b ? '✓ The pegs move and 121 ends the game.' : !a ? 'After 5 points from 40: front peg 45, back peg 40; you have ' + s.scores[0] + ' and ' + s.back[0] + '.' : '118 + 6 should stop at 121 and end the game; you have ' + s.scores[1] + (s.over ? '' : ', and the game is not over') + '.')",
              },
              {
                type: 'markdown',
                instruction: '### 5. The code you wrote, line by line\n\nIn the order of the task\'s steps. Most of it is scripts/table.js.\n\n**The scene**\n\n```js\nproject.setSettings({ background: \'#0b6b3a\', pixelArt: false })\nconst table = project.createScene(\'scenes/cribbage.scene\', \'Node2D\', \'Table\')\ntable.root.script = \'scripts/table.js\'\n```\n\nA green felt background, and smooth scaling (`pixelArt: false`): the cards are drawings, not pixel art. The scene\'s root, Table, runs the game.\n\n```js\ntable.add(\'CanvasLayer\', { name: \'HUD\' })\ntable.add(\'Label\', { name: \'Status\', parent: \'HUD\', position: { x: 30, y: 76 }, fontSize: 16, text: \'\' })\ntable.add(\'Label\', { name: \'Count\', parent: \'HUD\', position: { x: 196, y: 262 }, fontSize: 22, color: \'#ffffff\', text: \'\' })\ntable.add(\'Label\', { name: \'Message\', parent: \'HUD\', position: { x: 290, y: 372 }, fontSize: 17, color: \'#ffe8a3\', text: \'\' })\ntable.add(\'Label\', { name: \'CribLabel\', parent: \'HUD\', position: { x: 66, y: 398 }, fontSize: 13, color: \'#a7f3d0\', text: \'\' })\ntable.add(\'Label\', { name: \'Log\', parent: \'HUD\', position: { x: 30, y: 110 }, fontSize: 12, color: \'#d1fae5\', text: \'\' })\ntable.add(\'Label\', { name: \'Hands\', parent: \'HUD\', position: { x: 290, y: 200 }, fontSize: 18, color: \'#ffffff\', text: \'\' })\nproject.setMainScene(\'scenes/cribbage.scene\')\n```\n\nWords on a CanvasLayer, drawn over everything: the scores, the count, a message, whose crib, a log of the last few things that happened, and, until lesson 10.7 puts the cards on the table, the hands as words.\n\n**scripts/table.js**: the deal\n\n```js\nimport { newDeck, shuffle, cardName } from \'./cards.js\';\nexport const YOU = 0, AI = 1;\nconst NAMES = [\'You\', \'AI\'];\n```\n\nThe seats are numbers, 0 and 1, so the table can keep two of everything in lists: this.hands[YOU], this.scores[AI]. `1 - seat` is the other seat. NAMES says them in words.\n\n```js\nexport default class Table extends Node2D {\n  goal = 121;\n  fast = false;\n```\n\nThe score that ends the game, and a switch the checks use: no pauses, so a whole game plays in a moment.\n\n```js\n  ready() {\n    this.hud = {\n      status: scene.get(\'HUD/Status\'), message: scene.get(\'HUD/Message\'), count: scene.get(\'HUD/Count\'),\n      log: scene.get(\'HUD/Log\'), cribLabel: scene.get(\'HUD/CribLabel\'), hands: scene.get(\'HUD/Hands\'),\n    };\n    this.lines = [];          // the log, newest last\n    this.pending = null;      // what happens when the timer runs out\n    this.timer = 0;\n    this.newGame();\n```\n\nThe labels, found once and kept in one object. The log\'s lines; `pending`, something to do later, and `timer`, how long until then. Then a new game.\n\n```js\n  newGame() {\n    this.scores = [0, 0];\n    this.backPeg = [0, 0];\n    this.handsPlayed = 0;\n    this.dealer = Math.random() < 0.5 ? YOU : AI;\n    this.lines = [];\n    this.newHand();\n```\n\nBoth scores 0; the back pegs (where each score was before its last points) too; a coin toss for the first dealer.\n\n```js\n  newHand() {\n    this.deck = shuffle(newDeck());\n    this.hands = [[], []];\n    for (let k = 0; k < 6; k++) for (const seat of [1 - this.dealer, this.dealer]) this.hands[seat].push(this.deck.pop());\n    this.hands[YOU].sort((a, b) => a.rank - b.rank);   // your hand in order, as a player would hold it\n```\n\nA shuffled deck; two empty hands; six rounds, each a card from the top of the deck to the non-dealer then the dealer. Your hand sorted by rank.\n\n```js\n    this.crib = [];\n    this.threw = [[], []];\n    this.starter = null;\n    this.thrown = [false, false];\n    this.pile = []; this.older = []; this.history = []; this.count = 0;\n    this.played = [[], []];\n    this.showing = null;\n    this.phase = \'discard\';\n    this.say(`${NAMES[this.dealer]} dealt. Throw two cards to ${this.dealer === YOU ? \'your\' : "the AI\'s"} crib.`);\n```\n\nEverything a hand keeps, set fresh: the crib, the two cards each seat threw, no starter, nobody has thrown; for pegging, the pile, the older piles, every card played, the count and which cards each has played; nothing being shown. The phase is discard.\n\n```js\n  update(dt) {\n    if (this.pending) {\n      this.timer -= dt;\n      if (this.timer <= 0) { const then = this.pending; this.pending = null; then(); }\n    }\n    this.layout();\n```\n\nEach frame: if something is waiting, count its time down, and when it runs out, do it (cleared first, so `then` can start another wait). Then draw.\n\n```js\n  wait(seconds, then) { this.pending = then; this.timer = this.fast ? 0 : seconds; }\n  say(text) { this.hud.message.text = text; }\n  note(text) { this.lines = [...this.lines, text].slice(-6); }\n```\n\nwait(seconds, then): do `then` after a pause (none when fast). say() sets the message. note() adds a line to the log and keeps the last six (`slice(-6)`).\n\n```js\n  layout() {\n    const hand = (seat) => this.hands[seat].map((c, k) => (this.played[seat]?.[k] ? \'··\' : cardName(c))).join(\' \');\n    this.hud.hands.text = `Your hand: ${hand(YOU)}\\nAI\'s hand: ${hand(AI)}\\nCrib: ${this.crib.length} cards   Starter: ${this.starter ? cardName(this.starter) : \'–\'}`;\n    this.hud.status.text = `You ${this.scores[YOU]}   AI ${this.scores[AI]}   Dealer: ${NAMES[this.dealer]}`;\n    this.hud.count.text = this.phase === \'peg\' ? `Count\\n${this.count}` : \'\';\n    this.hud.cribLabel.text = this.dealer === YOU ? \'Your crib\' : "AI\'s crib";\n    this.hud.log.text = this.lines.join(\'\\n\');\n```\n\nThe state, as words: each hand (a played card as ··; `?.` because there is no played list before pegging), the crib and starter; the scores and dealer; the count while pegging; whose crib; the log. Words drawn from the state, every frame: when lesson 10.7 draws cards instead, nothing else changes.\n\n**The throw**\n\n```js\n/** The 15 ways to throw two of six cards to the crib: [i, j] with i < j. */\nexport const THROWS = [];\nfor (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) THROWS.push([i, j]);\n```\n\nIn scripts/features.js: every pair of places in a hand of six, once: [0, 1], [0, 2] … [4, 5], 15 of them. A throw is now a number from 0 to 14. Lesson 10.10 adds the AI\'s features to this file.\n\n```js\nimport { THROWS } from \'./features.js\';\n  throwCards(seat, t) {\n    const [i, j] = THROWS[t], hand = this.hands[seat];\n    this.crib.push(hand[i], hand[j]);\n    this.threw[seat] = [hand[i], hand[j]];\n    this.hands[seat] = hand.filter((_, k) => k !== i && k !== j);\n    this.thrown[seat] = true;\n    if (seat === AI) this.note(`AI threw two cards to the crib.`);\n```\n\nThrow number t: its two places, i and j. Those two cards go to the crib and are remembered as this seat\'s throw; the hand keeps the rest (`filter` by place, `_` for the card it does not need).\n\n```js\n  decision(seat) {\n    if (this.pending) return null;\n    if (this.phase === \'discard\' && !this.thrown[seat]) return { kind: \'throw\', legal: THROWS.map((_, t) => t) };\n    return null;\n```\n\nWhat a seat must decide now, or nothing (`null`): nothing while the table is waiting; while throwing, if it has not thrown, any of the 15 throws (`THROWS.map((_, t) => t)` is 0 to 14); otherwise nothing. Every player, you, the stand-in, later the AI, asks this one method.\n\n```js\n  move(seat, action) {\n    const d = this.decision(seat);\n    if (!d || !d.legal.includes(action)) throw new Error(`${NAMES[seat]} cannot make move ${action} now`);\n    this.throwCards(seat, action);\n```\n\nMake a move, but only a legal one: anything else is a bug, so it throws an error with its reason.\n\n```js\n  standIn() {\n    for (const seat of [YOU, AI]) {\n      const d = this.decision(seat);\n      if (d) { this.move(seat, d.legal[0]); return; }\n  update(dt) {\n    } else this.standIn();\n```\n\nUntil there are players, a stand-in plays both seats: the first legal move of the first seat that has one, one move a frame. In update(), it plays when nothing is waiting.\n\n**Points**\n\n```js\n  award(seat, points, why) {\n    this.backPeg[seat] = this.scores[seat];\n    this.scores[seat] = Math.min(this.goal, this.scores[seat] + points);\n    this.note(`${NAMES[seat]} ${seat === YOU ? \'peg\' : \'pegs\'} ${points}: ${why}.`);\n    if (this.scores[seat] >= this.goal) {\n      this.phase = \'over\';\n      this.pending = null; this.waiting = null;\n      this.say(seat === YOU ? `You win, ${this.scores[YOU]} to ${this.scores[AI]}!` : `The AI wins, ${this.scores[AI]} to ${this.scores[YOU]}.`);\n```\n\nThe back peg goes where the front peg was; the score goes up, never past the goal; the log says why. Reaching the goal ends the game at once, even mid-hand: phase over, nothing waiting.\n\n**The cut**\n\n```js\n    if (this.thrown[YOU] && this.thrown[AI]) this.wait(0.6, () => this.cut());\n  cut() {\n    this.phase = \'cut\';\n    this.starter = this.deck.pop();\n    this.say(`The starter is ${cardName(this.starter)}.`);\n    if (this.starter.rank === 11) this.award(this.dealer, 2, \'his heels (the starter is a jack)\');\n```\n\nWhen both have thrown (the last line of throwCards), wait a moment and cut: the starter is the top card. A jack is 2 for the dealer.\n\n**Pegging**\n\n```js\nimport { pegPoints, countOf, sayParts } from \'./score.js\';\n    if (this.phase === \'over\') return;\n    this.wait(1, () => this.startPegging());\n```\n\nThe end of cut(): unless his heels won the game, pegging starts after a second. (The import line names what the table now uses from score.js; at the show, scoreHand joins it.)\n\n```js\n  startPegging() {\n    this.phase = \'peg\';\n    this.pile = []; this.count = 0; this.lastPlayer = null;\n    this.played = [this.hands[YOU].map(() => false), this.hands[AI].map(() => false)];\n    this.turn = 1 - this.dealer;   // the non-dealer plays first\n    this.nextTurn();\n```\n\nAn empty pile at 0, nobody has played yet; for each hand a list of false, one per card; the non-dealer first.\n\n```js\n  options(seat) {\n    const out = [];\n    this.hands[seat].forEach((c, k) => { if (!this.played[seat][k] && this.count + Math.min(c.rank, 10) <= 31) out.push(k); });\n    return out;\n```\n\nThe places of the cards a seat can play: not played yet, and keeping the count at 31 or under.\n\n```js\n  nextTurn() {\n    this.waiting = null;\n    if (this.options(this.turn).length) return this.waitFor(this.turn);\n  waitFor(seat) {\n    this.waiting = seat;\n    this.say(seat === YOU ? \'Your turn.\' : "The AI\'s turn.");\n```\n\nFor now, whose turn is simple: if the player whose turn it is can play, wait for them (this.waiting says who). The next step adds the rest.\n\n```js\n  play(seat, k) {\n    const card = this.hands[seat][k];\n    this.played[seat][k] = true;\n    this.pile.push(card);\n    this.history.push({ seat, card });\n    this.count = countOf(this.pile);\n    this.lastPlayer = seat;\n    this.waiting = null;\n    this.note(`${NAMES[seat]} played ${cardName(card)}: ${this.count}.`);\n    const points = pegPoints(this.pile);\n    if (points.total) this.award(seat, points.total, sayParts(points.parts));\n    if (this.phase !== \'peg\') return;\n    this.turn = 1 - seat;\n    this.wait(0.5, () => this.nextTurn());\n```\n\nPlay the k-th card: mark it played, put it on the pile, remember who played what (history, which lesson 10.10 uses), the new count, and who played last. Peg what lesson 10.5\'s pegPoints says, said aloud. If that did not end the game, it is the other\'s turn, after a moment.\n\n```js\n    if (this.phase === \'peg\' && this.waiting === seat) return { kind: \'play\', legal: this.options(seat).map((k) => 15 + k) };\n    if (action < 15) this.throwCards(seat, action); else this.play(seat, action - 15);\n```\n\ndecision() and move() now cover playing too: a card is move 15 + its place, so all of a player\'s moves are one list of numbers, 0 to 18.\n\n**Go, 31, and the last card**\n\n```js\n  cardsLeft(seat) { return this.played[seat].filter((p) => !p).length; }\n  resetCount() { this.older.push(...this.pile); this.pile = []; this.count = 0; }\n```\n\nHow many cards a seat has not played; and starting the count again, the pile moved to the older piles.\n\n```js\n    if (this.cardsLeft(YOU) + this.cardsLeft(AI) === 0) {\n      if (this.count !== 31) this.award(this.lastPlayer, 1, \'last card\');\n      return;\n    }\n    if (this.count === 31) { this.wait(0.8, () => { this.resetCount(); this.nextTurn(); }); return; }\n```\n\nThe whole of nextTurn(), in order. Every card played: the last to play pegs 1, unless the count is 31 (that was already 2). At 31: the count starts again, and the same player carries on.\n\n```js\n    const other = 1 - this.turn;\n    if (this.options(other).length) {\n      if (this.cardsLeft(this.turn)) this.note(`${NAMES[this.turn]}: go.`);\n      this.turn = other;\n      return this.waitFor(other);\n    }\n    this.award(this.lastPlayer, 1, \'go\');\n    if (this.phase !== \'peg\') return;\n    this.wait(0.8, () => { this.resetCount(); this.turn = 1 - this.lastPlayer; this.nextTurn(); });\n```\n\nThe player whose turn it is cannot play, but the other can: "go" (said only if they still hold cards), and the other plays on. Neither can: the last to play pegs 1 for the go, and after a moment the count starts again, led by the player after the last to play.\n\n**The show**\n\n```js\nimport { scoreHand, pegPoints, countOf, sayParts } from \'./score.js\';\n      if (this.phase === \'peg\') this.wait(1.2, () => this.startShow());\n  startShow() {\n    this.phase = \'show\';\n    this.resetCount(); this.older = [];\n    const pone = 1 - this.dealer;\n    const steps = [[pone, \'hand\'], [this.dealer, \'hand\'], [this.dealer, \'crib\']];\n```\n\nAfter the last card, the show. The pile is cleared away. The order of counting: the non-dealer\'s hand ("pone"), the dealer\'s, then the crib, which is the dealer\'s.\n\n```js\n    const next = (i) => {\n      if (this.phase !== \'show\') return;\n      if (i === steps.length) return this.endHand();\n      const [seat, what] = steps[i];\n      const cards = what === \'crib\' ? this.crib : this.hands[seat];\n      const s = scoreHand(cards, this.starter, what === \'crib\');\n      this.showing = { seat, what, cards };\n      const whose = seat === YOU ? \'Your\' : "The AI\'s";\n      this.say(`${whose} ${what}: ${s.total ? sayParts(s.parts) : \'no points\'}.`);\n      if (s.total) this.award(seat, s.total, `${what}`);\n      if (this.phase === \'show\') this.wait(4, () => next(i + 1));\n    };\n    next(0);\n```\n\nA function that counts step i and waits four seconds before counting the next: so a count ending the game stops the show at once, and the others never happen. Each: score it with the starter (as a crib or not), show it, say it, peg it.\n\n```js\n  endHand() {\n    this.handsPlayed++;\n    this.showing = null;\n    this.dealer = 1 - this.dealer;\n    this.newHand();\n```\n\nThe deal passes to the other player, and the next hand is dealt.',
              },
              {
                type: 'markdown',
                instruction: '### 6. Questions you might have\n\n**Why seats as numbers instead of two player objects?** Most of the table is "this seat, then the other": with numbers, that is a list read at seat and at 1 − seat, and one function serves both.\n\n**Why does every move go through decision() and move()?** One place decides what is legal. You, the stand-in, the rules player and the AI all ask the same question, so none of them can cheat or play out of turn.\n\n**Why wait() instead of just calling the next phase?** So you can follow the game, and so a click can hurry it (lesson 10.7). With fast on, every wait is 0 and a whole game plays in a moment, which is how the checks and training run it.\n\n**Why does nextTurn() call itself?** After a 31 or a go, the situation is new and the same questions apply again. It always ends: each call either waits for a play or empties the pile, and the cards run out.\n\n**What is the stand-in for, really?** A table that can play itself before anyone can play it. You can watch and test the rules now; the next lessons replace it seat by seat.',
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: "Write the table's flow",
        props: {
          task: 'crib-table',
          lesson: 'mg10-006',
          checkpoint: 'cp-mg10-006-4',
        },
      },
    ],
  },

  math: {
    prose: [
      "**Under the hood (optional).** A hand gives a player its show (about 4.8), its pegging (2 to 4) and every other hand a crib, about 9 to 10 points a hand on average, so reaching 121 takes about $121/9.6 \\approx 12.6$ hands: cell 3's count.",
      "The first dealer's edge comes from the extra crib: in an odd number of hands, the first dealer has one more crib. Cell 3 measures it as 53.8% of 2,000 games; its uncertainty is about $\\sqrt{0.25/2000} \\approx 1.1$ percentage points.",
    ],
    equations: [
      {
        label: 'Frames for a wait',
        latex: '\\lceil 0.6 \\times 60 \\rceil = 36',
      },
      {
        label: 'Uncertainty of a win rate',
        latex: '\\sqrt{p(1-p)/n} \\approx \\sqrt{0.25/2000} \\approx 0.011',
      },
    ],
    callouts: [],
    visualizations: [],
  },

  rigor: {
    prose: [
      'Invariant: every point in the game goes through award(), so the board, the log and the 121 check can never disagree with the score.',
      'Invariant: a move is only made through move(), which checks it against decision(); no player can play a card that does not fit or throw twice.',
      'Where it goes: 10.7 draws this state each frame and turns clicks into move() calls; 10.9 makes the AI a player that uses decision() and move().',
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [
    {
      id: 'mg10-006-ex1',
      title: 'Next phase',
      difficulty: 'easy',
      problem: 'Both players have thrown. What does the table do next?',
      steps: [
        {
          expression: '\\text{wait}(0.6) \\to \\text{cut}()',
          annotation: 'A moment, then the cut.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: 'Waits 0.6 seconds, then cuts the starter.',
    },
    {
      id: 'mg10-006-ex2',
      title: 'The pegs',
      difficulty: 'medium',
      problem: 'You have 40 and peg 5. Where are your pegs?',
      steps: [
        {
          expression: '\\text{back} = 40,\\ \\text{front} = 45',
          annotation: 'The back peg marks where you were.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: 'Back peg 40, front peg 45.',
    },
    {
      id: 'mg10-006-ex3',
      title: 'A win before the count',
      difficulty: 'hard',
      problem: 'You are the non-dealer with 116; the AI dealt with 119. Your hand scores 6. Who wins?',
      steps: [
        {
          expression: '116 + 6 \\ge 121',
          annotation: 'You count first at the show.',
          strategyTitle: 'Step 1: order',
        },
      ],
      answer: 'You, before the AI counts its hand or crib.',
    },
  ],

  challenges: [
    {
      id: 'mg10-006-ch1',
      title: 'A short game',
      difficulty: 'easy',
      problem: 'Make the game to 61.',
      hint: 'One field.',
      answer: "goal = 61 in the Table (lesson 10.1's task).",
      walkthrough: [],
    },
    {
      id: 'mg10-006-ch2',
      title: 'A faster table',
      difficulty: 'medium',
      problem: 'Make the show wait half as long between counts.',
      hint: 'Its wait.',
      answer: 'wait(2, …) instead of wait(4, …) in startShow; or click to hurry it.',
      walkthrough: [],
    },
    {
      id: 'mg10-006-ch3',
      title: 'Three players',
      difficulty: 'hard',
      problem: 'Three-player cribbage deals five each and one to the crib. What changes in the table?',
      hint: 'Seats, the deal, the crib, turns.',
      answer: 'hands for three seats; deal five each and one card to the crib; each throws one; turns go round three seats, and a go passes to the next who can play.',
      walkthrough: [],
    },
  ],

  semantics: {
    core: [
      {
        symbol: 'phase',
        meaning: 'Where the game is: title, discard, cut, peg, show, over.',
      },
      {
        symbol: 'wait(seconds, then)',
        meaning: 'Do then later, without stopping the game.',
      },
      {
        symbol: 'award(seat, points, why)',
        meaning: 'The one place points are scored; 121 ends it.',
      },
      {
        symbol: 'decision(seat)',
        meaning: 'What a seat must decide now, and its legal moves.',
      },
      {
        symbol: 'move(seat, action)',
        meaning: 'Make a legal move.',
      },
    ],
    rulesOfThumb: [
      'All state in one place.',
      'One function per phase.',
      'Pause with timers, never loops.',
      'Players ask; the table decides.',
    ],
  },

  misconceptions: [
    {
      falseBelief: 'A pause needs a loop that waits.',
      whyStudentsThinkIt: 'That is how a script would wait.',
      correctionExample: 'A loop freezes the game; a stored then and a timer do not (cell 2).',
      contrastCase: 'In training the timer is 0: the same code, no pauses.',
    },
    {
      falseBelief: 'The game ends after the show.',
      whyStudentsThinkIt: 'That is when hands are counted.',
      correctionExample: 'It ends the moment someone reaches 121, often in pegging (cell 3).',
      contrastCase: 'The show order then decides close games.',
    },
  ],

  transferPrompts: [
    {
      situation: 'A board game with setup, turns and scoring rounds.',
      competingTechniques: [
        'Flags scattered through input handlers',
        'A phase field and a function per phase',
      ],
      whyThisTechniqueWins: 'Where the game is, and what comes next, is in one place.',
    },
    {
      situation: "Showing an enemy's turn slowly so the player can follow.",
      competingTechniques: ['A loop that waits', 'A timer counted down in update'],
      whyThisTechniqueWins: 'The game keeps drawing; the same code can run instantly in tests.',
    },
  ],

  debugging: [
    {
      commonError: 'Scoring by changing scores directly.',
      symptom: 'Someone passes 121 and the game goes on.',
      whyItHappened: 'The 121 check is in award().',
      repairStrategy: 'Score only through award().',
    },
    {
      commonError: 'Forgetting to set the next phase.',
      symptom: 'The game stops after a step.',
      whyItHappened: 'Nothing moved it on.',
      repairStrategy: 'Each phase function sets the next phase, or waits and then does.',
    },
    {
      commonError: 'Waiting in training.',
      symptom: 'Training takes hours.',
      whyItHappened: 'The pauses are for people.',
      repairStrategy: 'Make every wait 0 when ai.training.',
    },
  ],

  mastery: {
    targetLevel: 3,
    solveIndependently: 'Write the deal, the throw, the cut, award and the show.',
    explainVerbally: 'Explain phases, waiting with timers, and why players act through decision and move.',
    detectIncorrectApplication: 'Spot a waiting loop and scoring outside award.',
    transferToUnfamiliar: 'Lay out another turn-based game as phases.',
  },

  assessment: {
    questions: [
      {
        id: 'mg10-006-assess-1',
        type: 'choice',
        text: 'At 60 frames a second, a 0.6 s wait ends on frame',
        options: ['36', '6', '60', '1'],
        answer: '36',
        hint: 'Cell 2.',
      },
    ],
  },

  quiz: [
    {
      id: 'mg10-006-quiz-1',
      type: 'choice',
      text: 'In cell 1, who counts first at the show?',
      options: [
        'The non-dealer (P0)',
        'The dealer (P1)',
        'The crib',
        'Whoever is ahead',
      ],
      answer: 'The non-dealer (P0)',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg10-006-quiz-2',
      type: 'choice',
      text: 'In training, the cut comes on frame',
      options: ['1', '36', '60', '96'],
      answer: '1',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg10-006-quiz-3',
      type: 'choice',
      text: 'A game of simple players takes about',
      options: ['12.6 hands', '5 hands', '30 hands', '121 hands'],
      answer: '12.6 hands',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg10-006-quiz-4',
      type: 'choice',
      text: 'Every point is scored through',
      options: ['award()', 'nextTurn()', 'update()', 'layout()'],
      answer: 'award()',
      hints: ['Scoring in one place.'],
      reviewSection: 'Intuition — scoring',
    },
    {
      id: 'mg10-006-quiz-5',
      type: 'choice',
      text: 'Your clicks, the partner and the AI all act through',
      options: [
        'decision() and move()',
        'Their own copies of the rules',
        'The scores directly',
        'The screen',
      ],
      answer: 'decision() and move()',
      hints: ['Players ask.'],
      reviewSection: 'Intuition — players ask',
    },
    {
      id: 'mg10-006-quiz-6',
      type: 'choice',
      text: 'The first dealer wins about',
      options: ['54% of games', '50%', '75%', '40%'],
      answer: '54% of games',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
  ],

  checkpoints: [
    {
      id: 'cp-mg10-006-1',
      label: 'Read the state and the phases',
      type: 'read',
    },
    {
      id: 'cp-mg10-006-2',
      label: 'Read award, waiting and training',
      type: 'read',
    },
    {
      id: 'cp-mg10-006-3',
      label: 'Run the notebook',
      type: 'read',
    },
    {
      id: 'cp-mg10-006-4',
      label: 'Complete "The table" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg10-006-5',
      label: 'Read decision and move',
      type: 'read',
    },
    {
      id: 'cp-mg10-006-6',
      label: 'Work through the pegs example',
      type: 'example',
    },
    {
      id: 'cp-mg10-006-7',
      label: 'Work through the win before the count',
      type: 'example',
    },
    {
      id: 'cp-mg10-006-8',
      label: 'Pass the award challenge',
      type: 'challenge',
    },
  ],

  chapter: 'making-games-10',
}
