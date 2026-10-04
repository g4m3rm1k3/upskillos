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
                startCode: '// A seeded random-number generator (mulberry32, Game Studio\'s), so this cell deals the same cards every run.\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\n// Cards and the deck. A card is a plain object, { rank, suit }: rank 1 (ace) to 13 (king), suit one of S H D C.\n// Nothing here draws anything, so the rules can be tested, and an agent can learn, without a screen.\n\nconst SUITS = [\'S\', \'H\', \'D\', \'C\'];\nconst SUIT_SYMBOL = { S: \'♠\', H: \'♥\', D: \'♦\', C: \'♣\' };\nconst RANK_NAME = [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'];\n\n/** What a card counts for, toward 15 and 31: an ace is 1, a face card 10. */\nfunction value(card) { return Math.min(card.rank, 10); }\n\n/** A card\'s name, such as 10♥. */\nfunction cardName(card) { return RANK_NAME[card.rank] + SUIT_SYMBOL[card.suit]; }\n\n/** Its picture: assets/cards/10H.svg (the build writes all 52, and the back). */\nfunction cardImage(card) { return `assets/cards/${RANK_NAME[card.rank]}${card.suit}.svg`; }\n\n/** A fresh deck: the 52 cards in order. */\nfunction newDeck() {\n  const deck = [];\n  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ rank, suit });\n  return deck;\n}\n\n/**\n * Shuffle in place (Fisher–Yates): for each position from the last down, swap in a card chosen at random from those\n * not yet placed. Every order is equally likely. It uses Math.random, which training seeds, so a hand can be replayed.\n */\nfunction shuffle(deck) {\n  for (let i = deck.length - 1; i > 0; i--) {\n    const j = Math.floor(Math.random() * (i + 1));\n    [deck[i], deck[j]] = [deck[j], deck[i]];\n  }\n  return deck;\n}\n\n/** The same card? (Two objects can describe one card.) */\nfunction sameCard(a, b) { return a.rank === b.rank && a.suit === b.suit; }\n// Scoring cribbage: the show (a hand of four with the starter) and pegging (each card as it is played).\n// Every function returns its points with the reasons, so the game can say "fifteen 2, fifteen 4, a pair is 6".\n\n\n/** Every subset of the cards (by bitmask), as lists: 2ⁿ of them, for n cards. */\nfunction subsets(cards) {\n  const out = [];\n  for (let mask = 1; mask < 1 << cards.length; mask++) out.push(cards.filter((_, i) => mask & (1 << i)));\n  return out;\n}\n\n/** Fifteens: 2 for each different set of cards adding up to 15. */\nfunction fifteens(cards) {\n  const sets = subsets(cards).filter((s) => s.reduce((t, c) => t + value(c), 0) === 15);\n  return sets.map((s) => ({ what: \'fifteen\', cards: s, points: 2 }));\n}\n\n/** Pairs: 2 for each pair of cards of the same rank (three of a kind is three pairs, 6; four is six pairs, 12). */\nfunction pairs(cards) {\n  const out = [];\n  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++)\n    if (cards[i].rank === cards[j].rank) out.push({ what: \'pair\', cards: [cards[i], cards[j]], points: 2 });\n  return out;\n}\n\n/** Is this set of cards a run: different ranks, one after another (in any order)? */\nfunction isRun(cards) {\n  const r = cards.map((c) => c.rank).sort((a, b) => a - b);\n  return r.every((x, i) => i === 0 || x === r[i - 1] + 1);\n}\n\n/**\n * Runs: three or more cards in sequence (aces are low: A 2 3 is a run, Q K A is not). Only the longest runs count,\n * once for each different set of cards that makes one: 3 4 4 5 is two runs of three, 6 points.\n */\nfunction runs(cards) {\n  for (let length = cards.length; length >= 3; length--) {\n    const found = subsets(cards).filter((s) => s.length === length && isRun(s));\n    if (found.length) return found.map((s) => ({ what: `run of ${length}`, cards: s, points: length }));\n  }\n  return [];\n}\n\n/**\n * Flush: the four cards in a hand of one suit, 4, and 5 if the starter is too. The crib only scores a flush of all\n * five.\n */\nfunction flush(hand, starter, isCrib) {\n  if (!hand.every((c) => c.suit === hand[0].suit)) return [];\n  if (starter.suit === hand[0].suit) return [{ what: \'flush\', cards: [...hand, starter], points: 5 }];\n  return isCrib ? [] : [{ what: \'flush\', cards: hand, points: 4 }];\n}\n\n/** Nobs: the jack of the starter\'s suit in the hand, 1. */\nfunction nobs(hand, starter) {\n  const jack = hand.find((c) => c.rank === 11 && c.suit === starter.suit);\n  return jack ? [{ what: \'nobs\', cards: [jack], points: 1 }] : [];\n}\n\n/** The show: a hand of four (or the crib) with the starter. { total, parts }. */\nfunction scoreHand(hand, starter, isCrib = false) {\n  const all = [...hand, starter];\n  const parts = [...fifteens(all), ...pairs(all), ...runs(all), ...flush(hand, starter, isCrib), ...nobs(hand, starter)];\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** The count: what the cards played since the last reset add up to. */\nfunction countOf(pile) { return pile.reduce((t, c) => t + value(c), 0); }\n\n/**\n * Pegging: the points for the card just played, the last of `pile` (the cards played since the count was last\n * reset to 0). 15 or 31 is 2; a pair with the card before is 2, three of a kind 6, four 12; a run is one point a card,\n * when the last three or more cards (in any order) make one.\n */\nfunction pegPoints(pile) {\n  const parts = [], count = countOf(pile), card = pile[pile.length - 1];\n  if (count === 15) parts.push({ what: \'fifteen\', points: 2 });\n  if (count === 31) parts.push({ what: \'thirty-one\', points: 2 });\n  let same = 1;\n  while (same < pile.length && pile[pile.length - 1 - same].rank === card.rank) same++;\n  if (same >= 2) parts.push({ what: [\'\', \'\', \'a pair\', \'three of a kind\', \'four of a kind\'][same], points: [0, 0, 2, 6, 12][same] });\n  for (let length = pile.length; length >= 3; length--) {\n    if (isRun(pile.slice(-length))) { parts.push({ what: `run of ${length}`, points: length }); break; }\n  }\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** "fifteen 2, a pair is 4, …": points as they are said aloud. */\nfunction sayParts(parts) {\n  let running = 0;\n  return parts.map((p) => `${p.what} ${(running += p.points)}`).join(\', \');\n}\n// A table without a screen: the same phases as table.js, with two simple players (throw two at random, peg the\n// first card that fits). log(…) says what happens.\nfunction newTable(log = () => {}) {\n  const t = { scores: [0, 0], dealer: 0, phase: \'deal\', hands: 0, endedIn: null }\n  const NAMES = [\'P0\', \'P1\']\n  const award = (seat, points, why) => {\n    if (!points || t.phase === \'over\') return\n    t.scores[seat] = Math.min(121, t.scores[seat] + points); log(\'  \' + NAMES[seat] + \' pegs \' + points + \' (\' + why + \') → \' + t.scores[seat])\n    if (t.scores[seat] >= 121) { t.endedIn = t.phase; t.phase = \'over\'; log(\'  \' + NAMES[seat] + \' reaches 121 during \' + t.endedIn + \': game over\') }\n  }\n  t.step = () => {\n    if (t.phase === \'deal\') {\n      t.deck = shuffle(newDeck()); t.h = [[], []]\n      for (let k = 0; k < 6; k++) for (const s of [1 - t.dealer, t.dealer]) t.h[s].push(t.deck.pop())\n      log(\'deal: \' + NAMES[t.dealer] + \' deals\'); t.phase = \'discard\'\n    } else if (t.phase === \'discard\') {\n      t.crib = []\n      for (const s of [0, 1]) { shuffle(t.h[s]); t.crib.push(t.h[s].pop(), t.h[s].pop()) }\n      log(\'discard: both throw two to \' + NAMES[t.dealer] + \'\\\'s crib\'); t.phase = \'cut\'\n    } else if (t.phase === \'cut\') {\n      t.starter = t.deck.pop(); log(\'cut: the starter is \' + cardName(t.starter)); t.phase = \'peg\'\n      if (t.starter.rank === 11) award(t.dealer, 2, \'his heels\')\n    } else if (t.phase === \'peg\') {\n      const played = [[], []], left = (s) => 4 - played[s].length\n      let pile = [], turn = 1 - t.dealer, last = null\n      const opts = (s) => t.h[s].filter((c) => !played[s].includes(c) && countOf(pile) + value(c) <= 31)\n      while (t.phase === \'peg\' && left(0) + left(1) > 0) {\n        if (countOf(pile) === 31) pile = []\n        const o = opts(turn)\n        if (!o.length) { if (opts(1 - turn).length) { turn = 1 - turn; continue } award(last, 1, \'go\'); pile = []; turn = 1 - last; continue }\n        played[turn].push(o[0]); pile.push(o[0]); last = turn\n        award(turn, pegPoints(pile).total, \'pegging\'); turn = 1 - turn\n      }\n      if (t.phase === \'peg\') { if (countOf(pile) !== 31) award(last, 1, \'last card\') }\n      if (t.phase === \'peg\') t.phase = \'show\'\n    } else if (t.phase === \'show\') {\n      for (const [s, what] of [[1 - t.dealer, \'hand\'], [t.dealer, \'hand\'], [t.dealer, \'crib\']]) {\n        award(s, scoreHand(what === \'crib\' ? t.crib : t.h[s], t.starter, what === \'crib\').total, \'show: \' + what)\n        if (t.phase === \'over\') return\n      }\n      t.hands++; t.dealer = 1 - t.dealer; t.phase = \'deal\'\n    }\n  }\n  return t\n}\n// One hand, phase by phase. Predict first: in what order do the phases come, and who counts first at the show?\nconst real = Math.random\nMath.random = seeded(8)                    // the game\'s shuffle uses Math.random: seeded, the same deal every run\nconst t = newTable(console.log)\nt.dealer = 1\ndo { t.step() } while (t.phase !== \'deal\' && t.phase !== \'over\')\nMath.random = real\nconsole.log(\'after one hand: \' + t.scores.join(\' to \'))',
              },
              {
                type: 'js',
                instruction: '### 2. Waiting without stopping\nPredict first: the frame of the cut.',
                startCode: "// Waiting without stopping the game. The table never pauses the frame loop: it stores what to do next and a timer,\n// and update(dt) counts the timer down each frame. Training sets every wait to 0. Predict first: on which frame does\n// the cut happen at 60 frames a second, when the discard waits 0.6 seconds, and in training?\nfunction run(training) {\n  const t = { pending: null, timer: 0, log: [] }\n  const wait = (seconds, then) => { t.pending = then; t.timer = training ? 0 : seconds }\n  wait(0.6, () => { t.log.push('cut'); wait(1, () => t.log.push('pegging starts')) })\n  for (let frame = 1; frame <= 200 && t.log.length < 2; frame++) {\n    t.timer -= 1 / 60                                // update(dt), dt = 1/60\n    if (t.pending && t.timer <= 0) { const then = t.pending; t.pending = null; then(); t.log[t.log.length - 1] += ' at frame ' + frame }\n  }\n  return t.log.join(', ')\n}\nconsole.log('playing:  ' + run(false))\nconsole.log('training: ' + run(true))",
              },
              {
                type: 'js',
                instruction: "### 3. Whole games\nPredict first: hands per game, the first dealer's edge.",
                startCode: '// A seeded random-number generator (mulberry32, Game Studio\'s), so this cell deals the same cards every run.\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\n// Cards and the deck. A card is a plain object, { rank, suit }: rank 1 (ace) to 13 (king), suit one of S H D C.\n// Nothing here draws anything, so the rules can be tested, and an agent can learn, without a screen.\n\nconst SUITS = [\'S\', \'H\', \'D\', \'C\'];\nconst SUIT_SYMBOL = { S: \'♠\', H: \'♥\', D: \'♦\', C: \'♣\' };\nconst RANK_NAME = [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'];\n\n/** What a card counts for, toward 15 and 31: an ace is 1, a face card 10. */\nfunction value(card) { return Math.min(card.rank, 10); }\n\n/** A card\'s name, such as 10♥. */\nfunction cardName(card) { return RANK_NAME[card.rank] + SUIT_SYMBOL[card.suit]; }\n\n/** Its picture: assets/cards/10H.svg (the build writes all 52, and the back). */\nfunction cardImage(card) { return `assets/cards/${RANK_NAME[card.rank]}${card.suit}.svg`; }\n\n/** A fresh deck: the 52 cards in order. */\nfunction newDeck() {\n  const deck = [];\n  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ rank, suit });\n  return deck;\n}\n\n/**\n * Shuffle in place (Fisher–Yates): for each position from the last down, swap in a card chosen at random from those\n * not yet placed. Every order is equally likely. It uses Math.random, which training seeds, so a hand can be replayed.\n */\nfunction shuffle(deck) {\n  for (let i = deck.length - 1; i > 0; i--) {\n    const j = Math.floor(Math.random() * (i + 1));\n    [deck[i], deck[j]] = [deck[j], deck[i]];\n  }\n  return deck;\n}\n\n/** The same card? (Two objects can describe one card.) */\nfunction sameCard(a, b) { return a.rank === b.rank && a.suit === b.suit; }\n// Scoring cribbage: the show (a hand of four with the starter) and pegging (each card as it is played).\n// Every function returns its points with the reasons, so the game can say "fifteen 2, fifteen 4, a pair is 6".\n\n\n/** Every subset of the cards (by bitmask), as lists: 2ⁿ of them, for n cards. */\nfunction subsets(cards) {\n  const out = [];\n  for (let mask = 1; mask < 1 << cards.length; mask++) out.push(cards.filter((_, i) => mask & (1 << i)));\n  return out;\n}\n\n/** Fifteens: 2 for each different set of cards adding up to 15. */\nfunction fifteens(cards) {\n  const sets = subsets(cards).filter((s) => s.reduce((t, c) => t + value(c), 0) === 15);\n  return sets.map((s) => ({ what: \'fifteen\', cards: s, points: 2 }));\n}\n\n/** Pairs: 2 for each pair of cards of the same rank (three of a kind is three pairs, 6; four is six pairs, 12). */\nfunction pairs(cards) {\n  const out = [];\n  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++)\n    if (cards[i].rank === cards[j].rank) out.push({ what: \'pair\', cards: [cards[i], cards[j]], points: 2 });\n  return out;\n}\n\n/** Is this set of cards a run: different ranks, one after another (in any order)? */\nfunction isRun(cards) {\n  const r = cards.map((c) => c.rank).sort((a, b) => a - b);\n  return r.every((x, i) => i === 0 || x === r[i - 1] + 1);\n}\n\n/**\n * Runs: three or more cards in sequence (aces are low: A 2 3 is a run, Q K A is not). Only the longest runs count,\n * once for each different set of cards that makes one: 3 4 4 5 is two runs of three, 6 points.\n */\nfunction runs(cards) {\n  for (let length = cards.length; length >= 3; length--) {\n    const found = subsets(cards).filter((s) => s.length === length && isRun(s));\n    if (found.length) return found.map((s) => ({ what: `run of ${length}`, cards: s, points: length }));\n  }\n  return [];\n}\n\n/**\n * Flush: the four cards in a hand of one suit, 4, and 5 if the starter is too. The crib only scores a flush of all\n * five.\n */\nfunction flush(hand, starter, isCrib) {\n  if (!hand.every((c) => c.suit === hand[0].suit)) return [];\n  if (starter.suit === hand[0].suit) return [{ what: \'flush\', cards: [...hand, starter], points: 5 }];\n  return isCrib ? [] : [{ what: \'flush\', cards: hand, points: 4 }];\n}\n\n/** Nobs: the jack of the starter\'s suit in the hand, 1. */\nfunction nobs(hand, starter) {\n  const jack = hand.find((c) => c.rank === 11 && c.suit === starter.suit);\n  return jack ? [{ what: \'nobs\', cards: [jack], points: 1 }] : [];\n}\n\n/** The show: a hand of four (or the crib) with the starter. { total, parts }. */\nfunction scoreHand(hand, starter, isCrib = false) {\n  const all = [...hand, starter];\n  const parts = [...fifteens(all), ...pairs(all), ...runs(all), ...flush(hand, starter, isCrib), ...nobs(hand, starter)];\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** The count: what the cards played since the last reset add up to. */\nfunction countOf(pile) { return pile.reduce((t, c) => t + value(c), 0); }\n\n/**\n * Pegging: the points for the card just played, the last of `pile` (the cards played since the count was last\n * reset to 0). 15 or 31 is 2; a pair with the card before is 2, three of a kind 6, four 12; a run is one point a card,\n * when the last three or more cards (in any order) make one.\n */\nfunction pegPoints(pile) {\n  const parts = [], count = countOf(pile), card = pile[pile.length - 1];\n  if (count === 15) parts.push({ what: \'fifteen\', points: 2 });\n  if (count === 31) parts.push({ what: \'thirty-one\', points: 2 });\n  let same = 1;\n  while (same < pile.length && pile[pile.length - 1 - same].rank === card.rank) same++;\n  if (same >= 2) parts.push({ what: [\'\', \'\', \'a pair\', \'three of a kind\', \'four of a kind\'][same], points: [0, 0, 2, 6, 12][same] });\n  for (let length = pile.length; length >= 3; length--) {\n    if (isRun(pile.slice(-length))) { parts.push({ what: `run of ${length}`, points: length }); break; }\n  }\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** "fifteen 2, a pair is 4, …": points as they are said aloud. */\nfunction sayParts(parts) {\n  let running = 0;\n  return parts.map((p) => `${p.what} ${(running += p.points)}`).join(\', \');\n}\n// A table without a screen: the same phases as table.js, with two simple players (throw two at random, peg the\n// first card that fits). log(…) says what happens.\nfunction newTable(log = () => {}) {\n  const t = { scores: [0, 0], dealer: 0, phase: \'deal\', hands: 0, endedIn: null }\n  const NAMES = [\'P0\', \'P1\']\n  const award = (seat, points, why) => {\n    if (!points || t.phase === \'over\') return\n    t.scores[seat] = Math.min(121, t.scores[seat] + points); log(\'  \' + NAMES[seat] + \' pegs \' + points + \' (\' + why + \') → \' + t.scores[seat])\n    if (t.scores[seat] >= 121) { t.endedIn = t.phase; t.phase = \'over\'; log(\'  \' + NAMES[seat] + \' reaches 121 during \' + t.endedIn + \': game over\') }\n  }\n  t.step = () => {\n    if (t.phase === \'deal\') {\n      t.deck = shuffle(newDeck()); t.h = [[], []]\n      for (let k = 0; k < 6; k++) for (const s of [1 - t.dealer, t.dealer]) t.h[s].push(t.deck.pop())\n      log(\'deal: \' + NAMES[t.dealer] + \' deals\'); t.phase = \'discard\'\n    } else if (t.phase === \'discard\') {\n      t.crib = []\n      for (const s of [0, 1]) { shuffle(t.h[s]); t.crib.push(t.h[s].pop(), t.h[s].pop()) }\n      log(\'discard: both throw two to \' + NAMES[t.dealer] + \'\\\'s crib\'); t.phase = \'cut\'\n    } else if (t.phase === \'cut\') {\n      t.starter = t.deck.pop(); log(\'cut: the starter is \' + cardName(t.starter)); t.phase = \'peg\'\n      if (t.starter.rank === 11) award(t.dealer, 2, \'his heels\')\n    } else if (t.phase === \'peg\') {\n      const played = [[], []], left = (s) => 4 - played[s].length\n      let pile = [], turn = 1 - t.dealer, last = null\n      const opts = (s) => t.h[s].filter((c) => !played[s].includes(c) && countOf(pile) + value(c) <= 31)\n      while (t.phase === \'peg\' && left(0) + left(1) > 0) {\n        if (countOf(pile) === 31) pile = []\n        const o = opts(turn)\n        if (!o.length) { if (opts(1 - turn).length) { turn = 1 - turn; continue } award(last, 1, \'go\'); pile = []; turn = 1 - last; continue }\n        played[turn].push(o[0]); pile.push(o[0]); last = turn\n        award(turn, pegPoints(pile).total, \'pegging\'); turn = 1 - turn\n      }\n      if (t.phase === \'peg\') { if (countOf(pile) !== 31) award(last, 1, \'last card\') }\n      if (t.phase === \'peg\') t.phase = \'show\'\n    } else if (t.phase === \'show\') {\n      for (const [s, what] of [[1 - t.dealer, \'hand\'], [t.dealer, \'hand\'], [t.dealer, \'crib\']]) {\n        award(s, scoreHand(what === \'crib\' ? t.crib : t.h[s], t.starter, what === \'crib\').total, \'show: \' + what)\n        if (t.phase === \'over\') return\n      }\n      t.hands++; t.dealer = 1 - t.dealer; t.phase = \'deal\'\n    }\n  }\n  return t\n}\n// Whole games to 121, 2,000 of them, the same two simple players. Predict first: how many hands does a game take,\n// and does dealing first help?\nconst real = Math.random\nMath.random = seeded(21)\nlet hands = 0, firstDealerWins = 0, endedIn = { peg: 0, show: 0, cut: 0 }\nfor (let g = 0; g < 2000; g++) {\n  const t = newTable()\n  while (t.phase !== \'over\') t.step()\n  hands += t.hands + 1\n  if (t.scores[0] >= 121) firstDealerWins++                  // player 0 always deals first here\n  endedIn[t.endedIn]++\n}\nMath.random = real\nconsole.log(\'hands per game: \' + (hands / 2000).toFixed(1))\nconsole.log(\'the first dealer wins \' + (100 * firstDealerWins / 2000).toFixed(1) + \'% of games\')\nconsole.log(\'games won during pegging \' + endedIn.peg + \', during the show \' + endedIn.show + \', at the cut \' + endedIn.cut)',
              },
              {
                type: 'challenge',
                instruction: '### 4. Challenge: award\nTwo awards check it.',
                startCode: "// Challenge: write award(state, seat, points): the back peg moves to the front peg, the front peg moves on (never past\n// 121), and reaching 121 sets state.over = true at once. The checks run a few awards.\nfunction award(state, seat, points) {\n  // your code\n}\nconst s = { scores: [40, 118], back: [0, 0], over: false }\naward(s, 0, 5)\nconst a = s.scores[0] === 45 && s.back[0] === 40 && !s.over\naward(s, 1, 6)\nconst b = s.scores[1] === 121 && s.back[1] === 118 && s.over\nconsole.log(a && b ? '✓ The pegs move and 121 ends the game.' : !a ? 'After 5 points from 40: front peg 45, back peg 40; you have ' + s.scores[0] + ' and ' + s.back[0] + '.' : '118 + 6 should stop at 121 and end the game; you have ' + s.scores[1] + (s.over ? '' : ', and the game is not over') + '.')",
                solutionCode: "// Challenge: write award(state, seat, points): the back peg moves to the front peg, the front peg moves on (never past\n// 121), and reaching 121 sets state.over = true at once. The checks run a few awards.\nfunction award(state, seat, points) {\n  state.back[seat] = state.scores[seat]\n  state.scores[seat] = Math.min(121, state.scores[seat] + points)\n  if (state.scores[seat] >= 121) state.over = true\n}\nconst s = { scores: [40, 118], back: [0, 0], over: false }\naward(s, 0, 5)\nconst a = s.scores[0] === 45 && s.back[0] === 40 && !s.over\naward(s, 1, 6)\nconst b = s.scores[1] === 121 && s.back[1] === 118 && s.over\nconsole.log(a && b ? '✓ The pegs move and 121 ends the game.' : !a ? 'After 5 points from 40: front peg 45, back peg 40; you have ' + s.scores[0] + ' and ' + s.back[0] + '.' : '118 + 6 should stop at 121 and end the game; you have ' + s.scores[1] + (s.over ? '' : ', and the game is not over') + '.')",
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
