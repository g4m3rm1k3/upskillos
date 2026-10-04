export default {
  order: 9,

  id: 'mg10-009',

  slug: 'the-ai-as-an-agent',

  title: 'The AI as a Turn-Based Agent',

  subtitle: 'Its moves, which are legal when, what it earns, and when an episode ends: the Opponent becomes something a learner can train.',

  tags: [
    'game-studio',
    'cribbage',
    'machine-learning',
    'reinforcement-learning',
    'agents',
    'action-masking',
    'turn-based',
  ],

  aliases: 'agent turn based legal actions action masking legalActions act reward done episode one hand reward my points minus yours practice partner ai.training step to the next turn decideEvery brain field',

  timeToComplete: 50,

  coreConcept: "To be trained, the Opponent answers the same questions as any Game Studio agent (lesson 9.3), with one more: what it can do (19 numbered moves: 15 throws and 4 plays), which of them are legal now (legalActions(): the 15 throws while throwing, the cards that fit when it is its turn to peg, otherwise none), what doing one means (act(action): the table's move), what it earned since its last move (reward(): its points minus yours, so it learns to score and to stop you scoring), and when an episode is over (done(): one hand, in training). A turn-based step is one move: training gives it its legal moves, takes its choice, and plays the game on, your seat played by the rules player, until its next turn.",

  prerequisites: ['mg10-008', 'mg9-003'],

  nextLesson: 'mg10-010',

  hook: {
    question: 'In Breakout the paddle decided 15 times a second, from three moves that were always possible. A card player decides only on its turn, from moves that change every time. How does an agent work when it is not always its turn?',
    realWorldContext: 'Board and card game AIs, from AlphaZero to poker bots, are turn-based agents with legal-move masks: the policy only ever chooses among legal moves. Rewards as score differences, and episodes as natural units of play (a hand, a game), are the standard choices.',
  },

  intuition: {
    prose: [
      '**Numbered moves.** A brain chooses a number, so every move gets one: 0 to 14 are the 15 ways to throw two of six cards (THROWS[t] is the pair of places, from [0, 1] to [4, 5]), and 15 to 18 play the first to fourth card of its hand (cell 1). actions lists their names, for reading a brain.',
      '**Legal moves.** At any moment most of the 19 are impossible: while throwing, only the throws; while pegging, only cards it still holds that keep the count at 31 or under; when it is not its turn, none. Picking at random from all 19 at a pegging turn, 88% of picks would be illegal (cell 2). So legalActions() returns the moves possible now, from the table\'s decision(AI), and the brain chooses only among them. An empty list means "not my turn": the engine drives an agent with a brain only when its list is not empty.',
      '**act(action).** Make the move: this.table.move(AI, action). The table checks it is legal and does it. (When not training, it first remembers what its brain thought of each move, for the developer view in 10.12.)',
      "**reward(): its points minus yours.** Since its last move, how much did it score, minus how much you scored. Rewarding only its own points would teach it to ignore you: leaving you a 15 would cost it nothing. The difference teaches both. It keeps the scores at its last move in this.seen, and returns the change. Over a hand the rewards add up to the hand's difference (cell 3: 2, −3, 2, 0, then 6 at the show, which is +7).",
      '**done(): an episode is one hand.** In training the table plays one hand and stops (phase done). The AI learns to win hands, points for and against; the score of the game (who is near 121) is not part of what it sees. A full game would be a far longer episode with the same lessons in it.',
      '**A turn-based step.** In Breakout a step was 4 frames. Here a step is one move: training asks for the legal moves, the brain picks one, act() makes it, and then the game runs on, frame by frame, your seat played by the rules player, until the AI has legal moves again or the hand is over. The reward is everything between. Cell 3 prints one hand like that: five decisions, the throw and four plays.',
      "**Training mode.** When ai.training is true, the table starts a hand at once (no title), every wait is 0, and partnerMove() plays your seat (the rules player, or random, or the AI's own saved brain for self-play). The engine leaves the Opponent to the trainer.",
      '**Where it starts.** A random AI loses 4.83 points a hand to the rules player (cell 4). That is the line on the training chart that learning must climb above.',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: a turn-based agent',
        body: "Step 1. Number every move: actions (names). Step 2. legalActions(): the moves possible now, [] when it is not your turn. Step 3. act(action): make the move through the game's own method. Step 4. reward(): what you earned since your last move; for a two-player game, your points minus theirs. Step 5. done(): the end of an episode (a hand). Step 6. In training: no waits, a partner in the other seat.",
      },
      {
        type: 'warning',
        title: 'Reward the difference, not your own points',
        body: 'With reward = my points only, leaving the other player a 15 or a 31 costs nothing, and the AI learns to hand out points. Points minus theirs makes defence part of the goal.',
      },
      {
        type: 'insight',
        title: 'The agent asks; it does not reach in',
        body: "legalActions(), act() and reward() all go through the table's decision(), move() and scores. The agent knows nothing of how pegging or the show work inside, which is why the same agent code would fit another card game.",
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Build it: the agent',
        caption: "Numbered moves, legal moves, a hand as training sees it, and random play's line.",
        props: {
          lesson: {
            title: 'The AI as an agent',
            subtitle: 'Moves, legality, rewards, episodes.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. Numbered moves\nPredict first: moves 9 and 17.',
                startCode: '// Cards and the deck. A card is a plain object, { rank, suit }: rank 1 (ace) to 13 (king), suit one of S H D C.\n// Nothing here draws anything, so the rules can be tested, and an agent can learn, without a screen.\n\nconst SUITS = [\'S\', \'H\', \'D\', \'C\'];\nconst SUIT_SYMBOL = { S: \'♠\', H: \'♥\', D: \'♦\', C: \'♣\' };\nconst RANK_NAME = [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'];\n\n/** What a card counts for, toward 15 and 31: an ace is 1, a face card 10. */\nfunction value(card) { return Math.min(card.rank, 10); }\n\n/** A card\'s name, such as 10♥. */\nfunction cardName(card) { return RANK_NAME[card.rank] + SUIT_SYMBOL[card.suit]; }\n\n/** Its picture: assets/cards/10H.svg (the build writes all 52, and the back). */\nfunction cardImage(card) { return `assets/cards/${RANK_NAME[card.rank]}${card.suit}.svg`; }\n\n/** A fresh deck: the 52 cards in order. */\nfunction newDeck() {\n  const deck = [];\n  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ rank, suit });\n  return deck;\n}\n\n/**\n * Shuffle in place (Fisher–Yates): for each position from the last down, swap in a card chosen at random from those\n * not yet placed. Every order is equally likely. It uses Math.random, which training seeds, so a hand can be replayed.\n */\nfunction shuffle(deck) {\n  for (let i = deck.length - 1; i > 0; i--) {\n    const j = Math.floor(Math.random() * (i + 1));\n    [deck[i], deck[j]] = [deck[j], deck[i]];\n  }\n  return deck;\n}\n\n/** The same card? (Two objects can describe one card.) */\nfunction sameCard(a, b) { return a.rank === b.rank && a.suit === b.suit; }\n// Scoring cribbage: the show (a hand of four with the starter) and pegging (each card as it is played).\n// Every function returns its points with the reasons, so the game can say "fifteen 2, fifteen 4, a pair is 6".\n\n\n/** Every subset of the cards (by bitmask), as lists: 2ⁿ of them, for n cards. */\nfunction subsets(cards) {\n  const out = [];\n  for (let mask = 1; mask < 1 << cards.length; mask++) out.push(cards.filter((_, i) => mask & (1 << i)));\n  return out;\n}\n\n/** Fifteens: 2 for each different set of cards adding up to 15. */\nfunction fifteens(cards) {\n  const sets = subsets(cards).filter((s) => s.reduce((t, c) => t + value(c), 0) === 15);\n  return sets.map((s) => ({ what: \'fifteen\', cards: s, points: 2 }));\n}\n\n/** Pairs: 2 for each pair of cards of the same rank (three of a kind is three pairs, 6; four is six pairs, 12). */\nfunction pairs(cards) {\n  const out = [];\n  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++)\n    if (cards[i].rank === cards[j].rank) out.push({ what: \'pair\', cards: [cards[i], cards[j]], points: 2 });\n  return out;\n}\n\n/** Is this set of cards a run: different ranks, one after another (in any order)? */\nfunction isRun(cards) {\n  const r = cards.map((c) => c.rank).sort((a, b) => a - b);\n  return r.every((x, i) => i === 0 || x === r[i - 1] + 1);\n}\n\n/**\n * Runs: three or more cards in sequence (aces are low: A 2 3 is a run, Q K A is not). Only the longest runs count,\n * once for each different set of cards that makes one: 3 4 4 5 is two runs of three, 6 points.\n */\nfunction runs(cards) {\n  for (let length = cards.length; length >= 3; length--) {\n    const found = subsets(cards).filter((s) => s.length === length && isRun(s));\n    if (found.length) return found.map((s) => ({ what: `run of ${length}`, cards: s, points: length }));\n  }\n  return [];\n}\n\n/**\n * Flush: the four cards in a hand of one suit, 4, and 5 if the starter is too. The crib only scores a flush of all\n * five.\n */\nfunction flush(hand, starter, isCrib) {\n  if (!hand.every((c) => c.suit === hand[0].suit)) return [];\n  if (starter.suit === hand[0].suit) return [{ what: \'flush\', cards: [...hand, starter], points: 5 }];\n  return isCrib ? [] : [{ what: \'flush\', cards: hand, points: 4 }];\n}\n\n/** Nobs: the jack of the starter\'s suit in the hand, 1. */\nfunction nobs(hand, starter) {\n  const jack = hand.find((c) => c.rank === 11 && c.suit === starter.suit);\n  return jack ? [{ what: \'nobs\', cards: [jack], points: 1 }] : [];\n}\n\n/** The show: a hand of four (or the crib) with the starter. { total, parts }. */\nfunction scoreHand(hand, starter, isCrib = false) {\n  const all = [...hand, starter];\n  const parts = [...fifteens(all), ...pairs(all), ...runs(all), ...flush(hand, starter, isCrib), ...nobs(hand, starter)];\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** The count: what the cards played since the last reset add up to. */\nfunction countOf(pile) { return pile.reduce((t, c) => t + value(c), 0); }\n\n/**\n * Pegging: the points for the card just played, the last of `pile` (the cards played since the count was last\n * reset to 0). 15 or 31 is 2; a pair with the card before is 2, three of a kind 6, four 12; a run is one point a card,\n * when the last three or more cards (in any order) make one.\n */\nfunction pegPoints(pile) {\n  const parts = [], count = countOf(pile), card = pile[pile.length - 1];\n  if (count === 15) parts.push({ what: \'fifteen\', points: 2 });\n  if (count === 31) parts.push({ what: \'thirty-one\', points: 2 });\n  let same = 1;\n  while (same < pile.length && pile[pile.length - 1 - same].rank === card.rank) same++;\n  if (same >= 2) parts.push({ what: [\'\', \'\', \'a pair\', \'three of a kind\', \'four of a kind\'][same], points: [0, 0, 2, 6, 12][same] });\n  for (let length = pile.length; length >= 3; length--) {\n    if (isRun(pile.slice(-length))) { parts.push({ what: `run of ${length}`, points: length }); break; }\n  }\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** "fifteen 2, a pair is 4, …": points as they are said aloud. */\nfunction sayParts(parts) {\n  let running = 0;\n  return parts.map((p) => `${p.what} ${(running += p.points)}`).join(\', \');\n}\n// What the AI sees of a move: features, numbers that describe it (lesson: the AI\'s discard; the AI\'s pegging).\n//\n// A linear Q brain values a move as Q = w · φ, one weight per feature, so a feature should be a number that makes\n// a move better or worse in proportion (more points now: better; a bigger chance the other player scores next: worse).\n// Each is scaled to about 0 to 1, so no one feature\'s size swamps the others while the weights are learned.\n//\n// The discard and pegging are different decisions, so each has its own block of features; a move fills its own\n// block and leaves the other at 0, and the two blocks learn separate weights in one list.\n//\n// A seat sees only what a player at the table could: its own cards, the starter, and the cards played. Never the\n// other hand (the developer view shows that to you, not to the AI).\n\n\n/** The 15 ways to throw two of six cards to the crib: [i, j] with i < j. */\nconst THROWS = [];\nfor (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) THROWS.push([i, j]);\n\nconst DISCARD_FEATURES = [\'discard: bias\', \'discard: hand kept (expected points)\', \'discard: crib (expected points, + mine − theirs)\', \'discard: my crib\'];\nconst PEG_FEATURES = [\'peg: bias\', \'peg: points now\', \'peg: count after\', \'peg: chance of 15 or 31 against\', \'peg: chance of a pair against\', \'peg: chance of a run against\', \'peg: leads low\', \'peg: card value\', \'peg: my hand (show)\', \'peg: crib (expected, + mine − theirs)\', \'peg: my crib\'];\nconst FEATURE_NAMES = [...DISCARD_FEATURES, ...PEG_FEATURES];\n\n/** The cards a seat has not seen: the deck less those it knows. */\nfunction unseen(known) {\n  return newDeck().filter((c) => !known.some((k) => sameCard(k, c)));\n}\n\n/** A hand\'s show score averaged over every starter it could get (the cards not in view). */\nfunction expectedHand(kept, known) {\n  const starters = unseen(known);\n  return starters.reduce((t, s) => t + scoreHand(kept, s).total, 0) / starters.length;\n}\n\n/**\n * The average a crib scores holding two cards of these ranks (CRIB_VALUE[a − 1][b − 1]): every other two crib cards\n * and starter, by rank, weighted by how many ways the other 50 cards make them. Suits are ignored (a crib flush needs\n * all five), except nobs: a jack thrown scores 1 when the starter is its suit, about a quarter of the time.\n * cribTable() computes it; the numbers below are its answer, kept here so the game does not spend half a second\n * recomputing them each time it starts (a test checks they agree).\n */\nconst CRIB_VALUE = [\n  [5.49,4.4,4.52,5.43,5.69,4.22,4.04,4.08,4,3.91,4.17,3.81,3.7],\n  [4.4,5.79,6.8,4.8,5.72,4.32,4.24,4.19,4.09,4.03,4.28,3.92,3.82],\n  [4.52,6.8,6.12,5.45,6.38,4.23,4.31,4.25,4.07,4.1,4.36,4,3.89],\n  [5.43,4.8,5.45,6.1,6.95,4.92,4.14,4.26,4.16,4.1,4.36,4,3.89],\n  [5.69,5.72,6.38,6.95,8.96,7.05,6.37,5.71,5.69,6.98,7.24,6.88,6.77],\n  [4.22,4.32,4.23,4.92,7.05,6.25,5.5,4.86,5.53,3.8,4.05,3.69,3.59],\n  [4.04,4.24,4.31,4.14,6.37,5.5,6.07,6.72,4.31,3.68,4,3.64,3.53],\n  [4.08,4.19,4.25,4.26,5.71,4.86,6.72,5.6,4.89,4.26,3.92,3.62,3.52],\n  [4,4.09,4.07,4.16,5.69,5.53,4.31,4.89,5.49,4.8,4.46,3.51,3.46],\n  [3.91,4.03,4.1,4.1,6.98,3.8,3.68,4.26,4.8,5.43,5.03,4.07,3.37],\n  [4.17,4.28,4.36,4.36,7.24,4.05,4,3.92,4.46,5.03,5.93,4.99,4.28],\n  [3.81,3.92,4,4,6.88,3.69,3.64,3.62,3.51,4.07,4.99,5.21,3.93],\n  [3.7,3.82,3.89,3.89,6.77,3.59,3.53,3.52,3.46,3.37,4.28,3.93,4.99],\n];\n\nfunction cribTable() {\n  const table = [];\n  for (let a = 1; a <= 13; a++) {\n    table.push([]);\n    for (let b = 1; b <= 13; b++) {\n      const left = new Array(14).fill(4);\n      left[a]--; left[b]--;\n      let sum = 0, ways = 0;\n      for (let c = 1; c <= 13; c++) for (let d = c; d <= 13; d++) {\n        const pairs = c === d ? left[c] * (left[c] - 1) / 2 : left[c] * left[d];\n        if (!pairs) continue;\n        for (let s = 1; s <= 13; s++) {\n          const w = pairs * (left[s] - (s === c ? 1 : 0) - (s === d ? 1 : 0));\n          if (w <= 0) continue;\n          const crib = [a, b, c, d].map((rank, i) => ({ rank, suit: SUITS[i] }));   // four different suits: no flush\n          sum += w * scoreHand(crib, { rank: s, suit: \'none\' }, true).total;\n          ways += w;\n        }\n      }\n      table[a - 1].push(+(sum / ways + (a === 11 ? 0.25 : 0) + (b === 11 ? 0.25 : 0)).toFixed(2));\n    }\n  }\n  return table;\n}\n\n/** The discard\'s features: throwing hand[i] and hand[j] (of six). myCrib: whether the crib is this seat\'s. */\nfunction discardFeatures(hand, [i, j], myCrib) {\n  const kept = hand.filter((_, k) => k !== i && k !== j), a = hand[i], b = hand[j];\n  const sign = myCrib ? 1 : -1;   // points in the crib are good when it is mine, bad when it is theirs\n  const block = [\n    1,\n    expectedHand(kept, hand) / 10,\n    sign * CRIB_VALUE[a.rank - 1][b.rank - 1] / 10,\n    sign,\n  ];\n  return [...block, ...new Array(PEG_FEATURES.length).fill(0)];\n}\n\n/**\n * Pegging features: playing `card` onto `pile` (the cards since the count was reset). `known`: every card this seat\n * has seen (its hand, the starter, the cards played). `handShow`: its own hand\'s show score, which it knows once the\n * starter is cut. `threw`: the two cards it threw to the crib.\n *\n * The last three are the same for every card it could play: they do not help choose a card, but they let Q predict\n * the points still to come at the show. That matters, because the discard learns its value from the value of the\n * first pegging move (the target R + max Q(S′, ·)): if no pegging feature said how good the crib is, what the discard\n * did for the crib would be lost one step later.\n */\nfunction pegFeatures(card, pile, known, handShow, myCrib, threw) {\n  const after = [...pile, card], count = countOf(after);\n  const others = unseen(known);\n  // The chance that the next card, one the other player could hold, scores against this play.\n  const fits = others.filter((c) => count + value(c) <= 31);\n  const share = (test) => (others.length ? fits.filter(test).length / others.length : 0);\n  const block = [\n    1,\n    pegPoints(after).total / 4,\n    count / 31,\n    share((c) => count + value(c) === 15 || count + value(c) === 31),\n    share((c) => c.rank === card.rank),\n    share((c) => pegPoints([...after, c]).parts.some((p) => p.what.startsWith(\'run\'))),\n    pile.length === 0 && value(card) < 5 ? 1 : 0,\n    value(card) / 10,\n    handShow / 10,\n    (myCrib ? 1 : -1) * CRIB_VALUE[threw[0].rank - 1][threw[1].rank - 1] / 10,\n    myCrib ? 1 : -1,\n  ];\n  return [...new Array(DISCARD_FEATURES.length).fill(0), ...block];\n}\n// Players without a brain: random, and rules (a sensible human\'s habits written as code). The table\'s other seat\n// plays one of these while the AI trains, and they are what the trained AI is measured against.\n\n\n/** A random legal choice. */\nconst pickRandom = (list) => list[Math.floor(Math.random() * list.length)];\n\n/**\n * Rules for the discard: keep the four with the most points on average, and give the crib a fifteen or a pair when\n * it is yours, never when it is theirs.\n */\nfunction rulesThrow(hand, myCrib) {\n  let best = 0, bestScore = -Infinity;\n  THROWS.forEach(([i, j], t) => {\n    const kept = hand.filter((_, k) => k !== i && k !== j), a = hand[i], b = hand[j];\n    const crib = (value(a) + value(b) === 15 ? 2 : 0) + (a.rank === b.rank ? 2 : 0) + (a.rank === 5 ? 1 : 0) + (b.rank === 5 ? 1 : 0);\n    const score = expectedHand(kept, hand) + (myCrib ? crib : -crib);\n    if (score > bestScore) { bestScore = score; best = t; }\n  });\n  return best;\n}\n\n/** Rules for pegging: the most points now; never leave the count on 5 or 21; else the highest card. `options`: indexes into hand of the cards that fit. */\nfunction rulesPlay(hand, options, pile) {\n  let best = options[0], bestScore = -Infinity;\n  for (const k of options) {\n    const after = [...pile, hand[k]], count = countOf(after);\n    const score = pegPoints(after).total * 10 - (count === 5 || count === 21 ? 15 : 0) + value(hand[k]) / 10;\n    if (score > bestScore) { bestScore = score; best = k; }\n  }\n  return best;\n}\nconst cards = (text) => text.split(\' \').map((t) => ({ rank: [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\nconst show = (cs) => cs.map(cardName).join(\' \')\n// The AI\'s 19 moves, numbered: 0–14 throw two of its six cards (THROWS[t] is the pair of places), 15–18 play the\n// first to fourth card of its hand. Predict first: what is move 9, and move 17?\nconst actions = [...THROWS.map(([i, j]) => \'throw \' + (i + 1) + \'+\' + (j + 1)), \'play 1\', \'play 2\', \'play 3\', \'play 4\']\nconsole.log(actions.length + \' moves:\')\nconsole.log(actions.map((a, n) => n + \' \' + a).join(\', \'))',
              },
              {
                type: 'js',
                instruction: '### 2. Legal moves\nPredict first: how often a random pick is illegal.',
                startCode: '// A seeded random-number generator (mulberry32, Game Studio\'s), so this cell deals the same cards every run.\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\n// Cards and the deck. A card is a plain object, { rank, suit }: rank 1 (ace) to 13 (king), suit one of S H D C.\n// Nothing here draws anything, so the rules can be tested, and an agent can learn, without a screen.\n\nconst SUITS = [\'S\', \'H\', \'D\', \'C\'];\nconst SUIT_SYMBOL = { S: \'♠\', H: \'♥\', D: \'♦\', C: \'♣\' };\nconst RANK_NAME = [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'];\n\n/** What a card counts for, toward 15 and 31: an ace is 1, a face card 10. */\nfunction value(card) { return Math.min(card.rank, 10); }\n\n/** A card\'s name, such as 10♥. */\nfunction cardName(card) { return RANK_NAME[card.rank] + SUIT_SYMBOL[card.suit]; }\n\n/** Its picture: assets/cards/10H.svg (the build writes all 52, and the back). */\nfunction cardImage(card) { return `assets/cards/${RANK_NAME[card.rank]}${card.suit}.svg`; }\n\n/** A fresh deck: the 52 cards in order. */\nfunction newDeck() {\n  const deck = [];\n  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ rank, suit });\n  return deck;\n}\n\n/**\n * Shuffle in place (Fisher–Yates): for each position from the last down, swap in a card chosen at random from those\n * not yet placed. Every order is equally likely. It uses Math.random, which training seeds, so a hand can be replayed.\n */\nfunction shuffle(deck) {\n  for (let i = deck.length - 1; i > 0; i--) {\n    const j = Math.floor(Math.random() * (i + 1));\n    [deck[i], deck[j]] = [deck[j], deck[i]];\n  }\n  return deck;\n}\n\n/** The same card? (Two objects can describe one card.) */\nfunction sameCard(a, b) { return a.rank === b.rank && a.suit === b.suit; }\n// Scoring cribbage: the show (a hand of four with the starter) and pegging (each card as it is played).\n// Every function returns its points with the reasons, so the game can say "fifteen 2, fifteen 4, a pair is 6".\n\n\n/** Every subset of the cards (by bitmask), as lists: 2ⁿ of them, for n cards. */\nfunction subsets(cards) {\n  const out = [];\n  for (let mask = 1; mask < 1 << cards.length; mask++) out.push(cards.filter((_, i) => mask & (1 << i)));\n  return out;\n}\n\n/** Fifteens: 2 for each different set of cards adding up to 15. */\nfunction fifteens(cards) {\n  const sets = subsets(cards).filter((s) => s.reduce((t, c) => t + value(c), 0) === 15);\n  return sets.map((s) => ({ what: \'fifteen\', cards: s, points: 2 }));\n}\n\n/** Pairs: 2 for each pair of cards of the same rank (three of a kind is three pairs, 6; four is six pairs, 12). */\nfunction pairs(cards) {\n  const out = [];\n  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++)\n    if (cards[i].rank === cards[j].rank) out.push({ what: \'pair\', cards: [cards[i], cards[j]], points: 2 });\n  return out;\n}\n\n/** Is this set of cards a run: different ranks, one after another (in any order)? */\nfunction isRun(cards) {\n  const r = cards.map((c) => c.rank).sort((a, b) => a - b);\n  return r.every((x, i) => i === 0 || x === r[i - 1] + 1);\n}\n\n/**\n * Runs: three or more cards in sequence (aces are low: A 2 3 is a run, Q K A is not). Only the longest runs count,\n * once for each different set of cards that makes one: 3 4 4 5 is two runs of three, 6 points.\n */\nfunction runs(cards) {\n  for (let length = cards.length; length >= 3; length--) {\n    const found = subsets(cards).filter((s) => s.length === length && isRun(s));\n    if (found.length) return found.map((s) => ({ what: `run of ${length}`, cards: s, points: length }));\n  }\n  return [];\n}\n\n/**\n * Flush: the four cards in a hand of one suit, 4, and 5 if the starter is too. The crib only scores a flush of all\n * five.\n */\nfunction flush(hand, starter, isCrib) {\n  if (!hand.every((c) => c.suit === hand[0].suit)) return [];\n  if (starter.suit === hand[0].suit) return [{ what: \'flush\', cards: [...hand, starter], points: 5 }];\n  return isCrib ? [] : [{ what: \'flush\', cards: hand, points: 4 }];\n}\n\n/** Nobs: the jack of the starter\'s suit in the hand, 1. */\nfunction nobs(hand, starter) {\n  const jack = hand.find((c) => c.rank === 11 && c.suit === starter.suit);\n  return jack ? [{ what: \'nobs\', cards: [jack], points: 1 }] : [];\n}\n\n/** The show: a hand of four (or the crib) with the starter. { total, parts }. */\nfunction scoreHand(hand, starter, isCrib = false) {\n  const all = [...hand, starter];\n  const parts = [...fifteens(all), ...pairs(all), ...runs(all), ...flush(hand, starter, isCrib), ...nobs(hand, starter)];\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** The count: what the cards played since the last reset add up to. */\nfunction countOf(pile) { return pile.reduce((t, c) => t + value(c), 0); }\n\n/**\n * Pegging: the points for the card just played, the last of `pile` (the cards played since the count was last\n * reset to 0). 15 or 31 is 2; a pair with the card before is 2, three of a kind 6, four 12; a run is one point a card,\n * when the last three or more cards (in any order) make one.\n */\nfunction pegPoints(pile) {\n  const parts = [], count = countOf(pile), card = pile[pile.length - 1];\n  if (count === 15) parts.push({ what: \'fifteen\', points: 2 });\n  if (count === 31) parts.push({ what: \'thirty-one\', points: 2 });\n  let same = 1;\n  while (same < pile.length && pile[pile.length - 1 - same].rank === card.rank) same++;\n  if (same >= 2) parts.push({ what: [\'\', \'\', \'a pair\', \'three of a kind\', \'four of a kind\'][same], points: [0, 0, 2, 6, 12][same] });\n  for (let length = pile.length; length >= 3; length--) {\n    if (isRun(pile.slice(-length))) { parts.push({ what: `run of ${length}`, points: length }); break; }\n  }\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** "fifteen 2, a pair is 4, …": points as they are said aloud. */\nfunction sayParts(parts) {\n  let running = 0;\n  return parts.map((p) => `${p.what} ${(running += p.points)}`).join(\', \');\n}\n// What the AI sees of a move: features, numbers that describe it (lesson: the AI\'s discard; the AI\'s pegging).\n//\n// A linear Q brain values a move as Q = w · φ, one weight per feature, so a feature should be a number that makes\n// a move better or worse in proportion (more points now: better; a bigger chance the other player scores next: worse).\n// Each is scaled to about 0 to 1, so no one feature\'s size swamps the others while the weights are learned.\n//\n// The discard and pegging are different decisions, so each has its own block of features; a move fills its own\n// block and leaves the other at 0, and the two blocks learn separate weights in one list.\n//\n// A seat sees only what a player at the table could: its own cards, the starter, and the cards played. Never the\n// other hand (the developer view shows that to you, not to the AI).\n\n\n/** The 15 ways to throw two of six cards to the crib: [i, j] with i < j. */\nconst THROWS = [];\nfor (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) THROWS.push([i, j]);\n\nconst DISCARD_FEATURES = [\'discard: bias\', \'discard: hand kept (expected points)\', \'discard: crib (expected points, + mine − theirs)\', \'discard: my crib\'];\nconst PEG_FEATURES = [\'peg: bias\', \'peg: points now\', \'peg: count after\', \'peg: chance of 15 or 31 against\', \'peg: chance of a pair against\', \'peg: chance of a run against\', \'peg: leads low\', \'peg: card value\', \'peg: my hand (show)\', \'peg: crib (expected, + mine − theirs)\', \'peg: my crib\'];\nconst FEATURE_NAMES = [...DISCARD_FEATURES, ...PEG_FEATURES];\n\n/** The cards a seat has not seen: the deck less those it knows. */\nfunction unseen(known) {\n  return newDeck().filter((c) => !known.some((k) => sameCard(k, c)));\n}\n\n/** A hand\'s show score averaged over every starter it could get (the cards not in view). */\nfunction expectedHand(kept, known) {\n  const starters = unseen(known);\n  return starters.reduce((t, s) => t + scoreHand(kept, s).total, 0) / starters.length;\n}\n\n/**\n * The average a crib scores holding two cards of these ranks (CRIB_VALUE[a − 1][b − 1]): every other two crib cards\n * and starter, by rank, weighted by how many ways the other 50 cards make them. Suits are ignored (a crib flush needs\n * all five), except nobs: a jack thrown scores 1 when the starter is its suit, about a quarter of the time.\n * cribTable() computes it; the numbers below are its answer, kept here so the game does not spend half a second\n * recomputing them each time it starts (a test checks they agree).\n */\nconst CRIB_VALUE = [\n  [5.49,4.4,4.52,5.43,5.69,4.22,4.04,4.08,4,3.91,4.17,3.81,3.7],\n  [4.4,5.79,6.8,4.8,5.72,4.32,4.24,4.19,4.09,4.03,4.28,3.92,3.82],\n  [4.52,6.8,6.12,5.45,6.38,4.23,4.31,4.25,4.07,4.1,4.36,4,3.89],\n  [5.43,4.8,5.45,6.1,6.95,4.92,4.14,4.26,4.16,4.1,4.36,4,3.89],\n  [5.69,5.72,6.38,6.95,8.96,7.05,6.37,5.71,5.69,6.98,7.24,6.88,6.77],\n  [4.22,4.32,4.23,4.92,7.05,6.25,5.5,4.86,5.53,3.8,4.05,3.69,3.59],\n  [4.04,4.24,4.31,4.14,6.37,5.5,6.07,6.72,4.31,3.68,4,3.64,3.53],\n  [4.08,4.19,4.25,4.26,5.71,4.86,6.72,5.6,4.89,4.26,3.92,3.62,3.52],\n  [4,4.09,4.07,4.16,5.69,5.53,4.31,4.89,5.49,4.8,4.46,3.51,3.46],\n  [3.91,4.03,4.1,4.1,6.98,3.8,3.68,4.26,4.8,5.43,5.03,4.07,3.37],\n  [4.17,4.28,4.36,4.36,7.24,4.05,4,3.92,4.46,5.03,5.93,4.99,4.28],\n  [3.81,3.92,4,4,6.88,3.69,3.64,3.62,3.51,4.07,4.99,5.21,3.93],\n  [3.7,3.82,3.89,3.89,6.77,3.59,3.53,3.52,3.46,3.37,4.28,3.93,4.99],\n];\n\nfunction cribTable() {\n  const table = [];\n  for (let a = 1; a <= 13; a++) {\n    table.push([]);\n    for (let b = 1; b <= 13; b++) {\n      const left = new Array(14).fill(4);\n      left[a]--; left[b]--;\n      let sum = 0, ways = 0;\n      for (let c = 1; c <= 13; c++) for (let d = c; d <= 13; d++) {\n        const pairs = c === d ? left[c] * (left[c] - 1) / 2 : left[c] * left[d];\n        if (!pairs) continue;\n        for (let s = 1; s <= 13; s++) {\n          const w = pairs * (left[s] - (s === c ? 1 : 0) - (s === d ? 1 : 0));\n          if (w <= 0) continue;\n          const crib = [a, b, c, d].map((rank, i) => ({ rank, suit: SUITS[i] }));   // four different suits: no flush\n          sum += w * scoreHand(crib, { rank: s, suit: \'none\' }, true).total;\n          ways += w;\n        }\n      }\n      table[a - 1].push(+(sum / ways + (a === 11 ? 0.25 : 0) + (b === 11 ? 0.25 : 0)).toFixed(2));\n    }\n  }\n  return table;\n}\n\n/** The discard\'s features: throwing hand[i] and hand[j] (of six). myCrib: whether the crib is this seat\'s. */\nfunction discardFeatures(hand, [i, j], myCrib) {\n  const kept = hand.filter((_, k) => k !== i && k !== j), a = hand[i], b = hand[j];\n  const sign = myCrib ? 1 : -1;   // points in the crib are good when it is mine, bad when it is theirs\n  const block = [\n    1,\n    expectedHand(kept, hand) / 10,\n    sign * CRIB_VALUE[a.rank - 1][b.rank - 1] / 10,\n    sign,\n  ];\n  return [...block, ...new Array(PEG_FEATURES.length).fill(0)];\n}\n\n/**\n * Pegging features: playing `card` onto `pile` (the cards since the count was reset). `known`: every card this seat\n * has seen (its hand, the starter, the cards played). `handShow`: its own hand\'s show score, which it knows once the\n * starter is cut. `threw`: the two cards it threw to the crib.\n *\n * The last three are the same for every card it could play: they do not help choose a card, but they let Q predict\n * the points still to come at the show. That matters, because the discard learns its value from the value of the\n * first pegging move (the target R + max Q(S′, ·)): if no pegging feature said how good the crib is, what the discard\n * did for the crib would be lost one step later.\n */\nfunction pegFeatures(card, pile, known, handShow, myCrib, threw) {\n  const after = [...pile, card], count = countOf(after);\n  const others = unseen(known);\n  // The chance that the next card, one the other player could hold, scores against this play.\n  const fits = others.filter((c) => count + value(c) <= 31);\n  const share = (test) => (others.length ? fits.filter(test).length / others.length : 0);\n  const block = [\n    1,\n    pegPoints(after).total / 4,\n    count / 31,\n    share((c) => count + value(c) === 15 || count + value(c) === 31),\n    share((c) => c.rank === card.rank),\n    share((c) => pegPoints([...after, c]).parts.some((p) => p.what.startsWith(\'run\'))),\n    pile.length === 0 && value(card) < 5 ? 1 : 0,\n    value(card) / 10,\n    handShow / 10,\n    (myCrib ? 1 : -1) * CRIB_VALUE[threw[0].rank - 1][threw[1].rank - 1] / 10,\n    myCrib ? 1 : -1,\n  ];\n  return [...new Array(DISCARD_FEATURES.length).fill(0), ...block];\n}\n// Players without a brain: random, and rules (a sensible human\'s habits written as code). The table\'s other seat\n// plays one of these while the AI trains, and they are what the trained AI is measured against.\n\n\n/** A random legal choice. */\nconst pickRandom = (list) => list[Math.floor(Math.random() * list.length)];\n\n/**\n * Rules for the discard: keep the four with the most points on average, and give the crib a fifteen or a pair when\n * it is yours, never when it is theirs.\n */\nfunction rulesThrow(hand, myCrib) {\n  let best = 0, bestScore = -Infinity;\n  THROWS.forEach(([i, j], t) => {\n    const kept = hand.filter((_, k) => k !== i && k !== j), a = hand[i], b = hand[j];\n    const crib = (value(a) + value(b) === 15 ? 2 : 0) + (a.rank === b.rank ? 2 : 0) + (a.rank === 5 ? 1 : 0) + (b.rank === 5 ? 1 : 0);\n    const score = expectedHand(kept, hand) + (myCrib ? crib : -crib);\n    if (score > bestScore) { bestScore = score; best = t; }\n  });\n  return best;\n}\n\n/** Rules for pegging: the most points now; never leave the count on 5 or 21; else the highest card. `options`: indexes into hand of the cards that fit. */\nfunction rulesPlay(hand, options, pile) {\n  let best = options[0], bestScore = -Infinity;\n  for (const k of options) {\n    const after = [...pile, hand[k]], count = countOf(after);\n    const score = pegPoints(after).total * 10 - (count === 5 || count === 21 ? 15 : 0) + value(hand[k]) / 10;\n    if (score > bestScore) { bestScore = score; best = k; }\n  }\n  return best;\n}\nconst cards = (text) => text.split(\' \').map((t) => ({ rank: [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\nconst show = (cs) => cs.map(cardName).join(\' \')\n// Legal moves. At any moment only some of the 19 are possible: while throwing, the 15 throws; when pegging, only the\n// cards it holds that fit. Predict first: picking from all 19 at random, how often would a pegging move be illegal?\nconst real = Math.random; Math.random = seeded(4)\nlet pegChoices = 0, illegal = 0\nfor (let k = 0; k < 2000; k++) {\n  const hand = shuffle(newDeck()).slice(0, 4), played = Math.floor(Math.random() * 4), count = Math.floor(Math.random() * 31)\n  const legal = hand.map((_, i) => i).filter((i) => i >= played && count + value(hand[i]) <= 31).map((i) => 15 + i)\n  if (!legal.length) continue\n  pegChoices++\n  if (!legal.includes(Math.floor(Math.random() * 19))) illegal++\n}\nMath.random = real\nconsole.log(\'picking from all 19 at a pegging turn: \' + (100 * illegal / pegChoices).toFixed(0) + \'% of picks are illegal\')\nconsole.log(\'so legalActions() says which moves are possible, and a brain chooses only among them\')',
              },
              {
                type: 'js',
                instruction: '### 3. A hand, as training sees it\nPredict first: what the rewards add up to.',
                startCode: '// A seeded random-number generator (mulberry32, Game Studio\'s), so this cell deals the same cards every run.\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\n// Cards and the deck. A card is a plain object, { rank, suit }: rank 1 (ace) to 13 (king), suit one of S H D C.\n// Nothing here draws anything, so the rules can be tested, and an agent can learn, without a screen.\n\nconst SUITS = [\'S\', \'H\', \'D\', \'C\'];\nconst SUIT_SYMBOL = { S: \'♠\', H: \'♥\', D: \'♦\', C: \'♣\' };\nconst RANK_NAME = [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'];\n\n/** What a card counts for, toward 15 and 31: an ace is 1, a face card 10. */\nfunction value(card) { return Math.min(card.rank, 10); }\n\n/** A card\'s name, such as 10♥. */\nfunction cardName(card) { return RANK_NAME[card.rank] + SUIT_SYMBOL[card.suit]; }\n\n/** Its picture: assets/cards/10H.svg (the build writes all 52, and the back). */\nfunction cardImage(card) { return `assets/cards/${RANK_NAME[card.rank]}${card.suit}.svg`; }\n\n/** A fresh deck: the 52 cards in order. */\nfunction newDeck() {\n  const deck = [];\n  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ rank, suit });\n  return deck;\n}\n\n/**\n * Shuffle in place (Fisher–Yates): for each position from the last down, swap in a card chosen at random from those\n * not yet placed. Every order is equally likely. It uses Math.random, which training seeds, so a hand can be replayed.\n */\nfunction shuffle(deck) {\n  for (let i = deck.length - 1; i > 0; i--) {\n    const j = Math.floor(Math.random() * (i + 1));\n    [deck[i], deck[j]] = [deck[j], deck[i]];\n  }\n  return deck;\n}\n\n/** The same card? (Two objects can describe one card.) */\nfunction sameCard(a, b) { return a.rank === b.rank && a.suit === b.suit; }\n// Scoring cribbage: the show (a hand of four with the starter) and pegging (each card as it is played).\n// Every function returns its points with the reasons, so the game can say "fifteen 2, fifteen 4, a pair is 6".\n\n\n/** Every subset of the cards (by bitmask), as lists: 2ⁿ of them, for n cards. */\nfunction subsets(cards) {\n  const out = [];\n  for (let mask = 1; mask < 1 << cards.length; mask++) out.push(cards.filter((_, i) => mask & (1 << i)));\n  return out;\n}\n\n/** Fifteens: 2 for each different set of cards adding up to 15. */\nfunction fifteens(cards) {\n  const sets = subsets(cards).filter((s) => s.reduce((t, c) => t + value(c), 0) === 15);\n  return sets.map((s) => ({ what: \'fifteen\', cards: s, points: 2 }));\n}\n\n/** Pairs: 2 for each pair of cards of the same rank (three of a kind is three pairs, 6; four is six pairs, 12). */\nfunction pairs(cards) {\n  const out = [];\n  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++)\n    if (cards[i].rank === cards[j].rank) out.push({ what: \'pair\', cards: [cards[i], cards[j]], points: 2 });\n  return out;\n}\n\n/** Is this set of cards a run: different ranks, one after another (in any order)? */\nfunction isRun(cards) {\n  const r = cards.map((c) => c.rank).sort((a, b) => a - b);\n  return r.every((x, i) => i === 0 || x === r[i - 1] + 1);\n}\n\n/**\n * Runs: three or more cards in sequence (aces are low: A 2 3 is a run, Q K A is not). Only the longest runs count,\n * once for each different set of cards that makes one: 3 4 4 5 is two runs of three, 6 points.\n */\nfunction runs(cards) {\n  for (let length = cards.length; length >= 3; length--) {\n    const found = subsets(cards).filter((s) => s.length === length && isRun(s));\n    if (found.length) return found.map((s) => ({ what: `run of ${length}`, cards: s, points: length }));\n  }\n  return [];\n}\n\n/**\n * Flush: the four cards in a hand of one suit, 4, and 5 if the starter is too. The crib only scores a flush of all\n * five.\n */\nfunction flush(hand, starter, isCrib) {\n  if (!hand.every((c) => c.suit === hand[0].suit)) return [];\n  if (starter.suit === hand[0].suit) return [{ what: \'flush\', cards: [...hand, starter], points: 5 }];\n  return isCrib ? [] : [{ what: \'flush\', cards: hand, points: 4 }];\n}\n\n/** Nobs: the jack of the starter\'s suit in the hand, 1. */\nfunction nobs(hand, starter) {\n  const jack = hand.find((c) => c.rank === 11 && c.suit === starter.suit);\n  return jack ? [{ what: \'nobs\', cards: [jack], points: 1 }] : [];\n}\n\n/** The show: a hand of four (or the crib) with the starter. { total, parts }. */\nfunction scoreHand(hand, starter, isCrib = false) {\n  const all = [...hand, starter];\n  const parts = [...fifteens(all), ...pairs(all), ...runs(all), ...flush(hand, starter, isCrib), ...nobs(hand, starter)];\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** The count: what the cards played since the last reset add up to. */\nfunction countOf(pile) { return pile.reduce((t, c) => t + value(c), 0); }\n\n/**\n * Pegging: the points for the card just played, the last of `pile` (the cards played since the count was last\n * reset to 0). 15 or 31 is 2; a pair with the card before is 2, three of a kind 6, four 12; a run is one point a card,\n * when the last three or more cards (in any order) make one.\n */\nfunction pegPoints(pile) {\n  const parts = [], count = countOf(pile), card = pile[pile.length - 1];\n  if (count === 15) parts.push({ what: \'fifteen\', points: 2 });\n  if (count === 31) parts.push({ what: \'thirty-one\', points: 2 });\n  let same = 1;\n  while (same < pile.length && pile[pile.length - 1 - same].rank === card.rank) same++;\n  if (same >= 2) parts.push({ what: [\'\', \'\', \'a pair\', \'three of a kind\', \'four of a kind\'][same], points: [0, 0, 2, 6, 12][same] });\n  for (let length = pile.length; length >= 3; length--) {\n    if (isRun(pile.slice(-length))) { parts.push({ what: `run of ${length}`, points: length }); break; }\n  }\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** "fifteen 2, a pair is 4, …": points as they are said aloud. */\nfunction sayParts(parts) {\n  let running = 0;\n  return parts.map((p) => `${p.what} ${(running += p.points)}`).join(\', \');\n}\n// What the AI sees of a move: features, numbers that describe it (lesson: the AI\'s discard; the AI\'s pegging).\n//\n// A linear Q brain values a move as Q = w · φ, one weight per feature, so a feature should be a number that makes\n// a move better or worse in proportion (more points now: better; a bigger chance the other player scores next: worse).\n// Each is scaled to about 0 to 1, so no one feature\'s size swamps the others while the weights are learned.\n//\n// The discard and pegging are different decisions, so each has its own block of features; a move fills its own\n// block and leaves the other at 0, and the two blocks learn separate weights in one list.\n//\n// A seat sees only what a player at the table could: its own cards, the starter, and the cards played. Never the\n// other hand (the developer view shows that to you, not to the AI).\n\n\n/** The 15 ways to throw two of six cards to the crib: [i, j] with i < j. */\nconst THROWS = [];\nfor (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) THROWS.push([i, j]);\n\nconst DISCARD_FEATURES = [\'discard: bias\', \'discard: hand kept (expected points)\', \'discard: crib (expected points, + mine − theirs)\', \'discard: my crib\'];\nconst PEG_FEATURES = [\'peg: bias\', \'peg: points now\', \'peg: count after\', \'peg: chance of 15 or 31 against\', \'peg: chance of a pair against\', \'peg: chance of a run against\', \'peg: leads low\', \'peg: card value\', \'peg: my hand (show)\', \'peg: crib (expected, + mine − theirs)\', \'peg: my crib\'];\nconst FEATURE_NAMES = [...DISCARD_FEATURES, ...PEG_FEATURES];\n\n/** The cards a seat has not seen: the deck less those it knows. */\nfunction unseen(known) {\n  return newDeck().filter((c) => !known.some((k) => sameCard(k, c)));\n}\n\n/** A hand\'s show score averaged over every starter it could get (the cards not in view). */\nfunction expectedHand(kept, known) {\n  const starters = unseen(known);\n  return starters.reduce((t, s) => t + scoreHand(kept, s).total, 0) / starters.length;\n}\n\n/**\n * The average a crib scores holding two cards of these ranks (CRIB_VALUE[a − 1][b − 1]): every other two crib cards\n * and starter, by rank, weighted by how many ways the other 50 cards make them. Suits are ignored (a crib flush needs\n * all five), except nobs: a jack thrown scores 1 when the starter is its suit, about a quarter of the time.\n * cribTable() computes it; the numbers below are its answer, kept here so the game does not spend half a second\n * recomputing them each time it starts (a test checks they agree).\n */\nconst CRIB_VALUE = [\n  [5.49,4.4,4.52,5.43,5.69,4.22,4.04,4.08,4,3.91,4.17,3.81,3.7],\n  [4.4,5.79,6.8,4.8,5.72,4.32,4.24,4.19,4.09,4.03,4.28,3.92,3.82],\n  [4.52,6.8,6.12,5.45,6.38,4.23,4.31,4.25,4.07,4.1,4.36,4,3.89],\n  [5.43,4.8,5.45,6.1,6.95,4.92,4.14,4.26,4.16,4.1,4.36,4,3.89],\n  [5.69,5.72,6.38,6.95,8.96,7.05,6.37,5.71,5.69,6.98,7.24,6.88,6.77],\n  [4.22,4.32,4.23,4.92,7.05,6.25,5.5,4.86,5.53,3.8,4.05,3.69,3.59],\n  [4.04,4.24,4.31,4.14,6.37,5.5,6.07,6.72,4.31,3.68,4,3.64,3.53],\n  [4.08,4.19,4.25,4.26,5.71,4.86,6.72,5.6,4.89,4.26,3.92,3.62,3.52],\n  [4,4.09,4.07,4.16,5.69,5.53,4.31,4.89,5.49,4.8,4.46,3.51,3.46],\n  [3.91,4.03,4.1,4.1,6.98,3.8,3.68,4.26,4.8,5.43,5.03,4.07,3.37],\n  [4.17,4.28,4.36,4.36,7.24,4.05,4,3.92,4.46,5.03,5.93,4.99,4.28],\n  [3.81,3.92,4,4,6.88,3.69,3.64,3.62,3.51,4.07,4.99,5.21,3.93],\n  [3.7,3.82,3.89,3.89,6.77,3.59,3.53,3.52,3.46,3.37,4.28,3.93,4.99],\n];\n\nfunction cribTable() {\n  const table = [];\n  for (let a = 1; a <= 13; a++) {\n    table.push([]);\n    for (let b = 1; b <= 13; b++) {\n      const left = new Array(14).fill(4);\n      left[a]--; left[b]--;\n      let sum = 0, ways = 0;\n      for (let c = 1; c <= 13; c++) for (let d = c; d <= 13; d++) {\n        const pairs = c === d ? left[c] * (left[c] - 1) / 2 : left[c] * left[d];\n        if (!pairs) continue;\n        for (let s = 1; s <= 13; s++) {\n          const w = pairs * (left[s] - (s === c ? 1 : 0) - (s === d ? 1 : 0));\n          if (w <= 0) continue;\n          const crib = [a, b, c, d].map((rank, i) => ({ rank, suit: SUITS[i] }));   // four different suits: no flush\n          sum += w * scoreHand(crib, { rank: s, suit: \'none\' }, true).total;\n          ways += w;\n        }\n      }\n      table[a - 1].push(+(sum / ways + (a === 11 ? 0.25 : 0) + (b === 11 ? 0.25 : 0)).toFixed(2));\n    }\n  }\n  return table;\n}\n\n/** The discard\'s features: throwing hand[i] and hand[j] (of six). myCrib: whether the crib is this seat\'s. */\nfunction discardFeatures(hand, [i, j], myCrib) {\n  const kept = hand.filter((_, k) => k !== i && k !== j), a = hand[i], b = hand[j];\n  const sign = myCrib ? 1 : -1;   // points in the crib are good when it is mine, bad when it is theirs\n  const block = [\n    1,\n    expectedHand(kept, hand) / 10,\n    sign * CRIB_VALUE[a.rank - 1][b.rank - 1] / 10,\n    sign,\n  ];\n  return [...block, ...new Array(PEG_FEATURES.length).fill(0)];\n}\n\n/**\n * Pegging features: playing `card` onto `pile` (the cards since the count was reset). `known`: every card this seat\n * has seen (its hand, the starter, the cards played). `handShow`: its own hand\'s show score, which it knows once the\n * starter is cut. `threw`: the two cards it threw to the crib.\n *\n * The last three are the same for every card it could play: they do not help choose a card, but they let Q predict\n * the points still to come at the show. That matters, because the discard learns its value from the value of the\n * first pegging move (the target R + max Q(S′, ·)): if no pegging feature said how good the crib is, what the discard\n * did for the crib would be lost one step later.\n */\nfunction pegFeatures(card, pile, known, handShow, myCrib, threw) {\n  const after = [...pile, card], count = countOf(after);\n  const others = unseen(known);\n  // The chance that the next card, one the other player could hold, scores against this play.\n  const fits = others.filter((c) => count + value(c) <= 31);\n  const share = (test) => (others.length ? fits.filter(test).length / others.length : 0);\n  const block = [\n    1,\n    pegPoints(after).total / 4,\n    count / 31,\n    share((c) => count + value(c) === 15 || count + value(c) === 31),\n    share((c) => c.rank === card.rank),\n    share((c) => pegPoints([...after, c]).parts.some((p) => p.what.startsWith(\'run\'))),\n    pile.length === 0 && value(card) < 5 ? 1 : 0,\n    value(card) / 10,\n    handShow / 10,\n    (myCrib ? 1 : -1) * CRIB_VALUE[threw[0].rank - 1][threw[1].rank - 1] / 10,\n    myCrib ? 1 : -1,\n  ];\n  return [...new Array(DISCARD_FEATURES.length).fill(0), ...block];\n}\n// Players without a brain: random, and rules (a sensible human\'s habits written as code). The table\'s other seat\n// plays one of these while the AI trains, and they are what the trained AI is measured against.\n\n\n/** A random legal choice. */\nconst pickRandom = (list) => list[Math.floor(Math.random() * list.length)];\n\n/**\n * Rules for the discard: keep the four with the most points on average, and give the crib a fifteen or a pair when\n * it is yours, never when it is theirs.\n */\nfunction rulesThrow(hand, myCrib) {\n  let best = 0, bestScore = -Infinity;\n  THROWS.forEach(([i, j], t) => {\n    const kept = hand.filter((_, k) => k !== i && k !== j), a = hand[i], b = hand[j];\n    const crib = (value(a) + value(b) === 15 ? 2 : 0) + (a.rank === b.rank ? 2 : 0) + (a.rank === 5 ? 1 : 0) + (b.rank === 5 ? 1 : 0);\n    const score = expectedHand(kept, hand) + (myCrib ? crib : -crib);\n    if (score > bestScore) { bestScore = score; best = t; }\n  });\n  return best;\n}\n\n/** Rules for pegging: the most points now; never leave the count on 5 or 21; else the highest card. `options`: indexes into hand of the cards that fit. */\nfunction rulesPlay(hand, options, pile) {\n  let best = options[0], bestScore = -Infinity;\n  for (const k of options) {\n    const after = [...pile, hand[k]], count = countOf(after);\n    const score = pegPoints(after).total * 10 - (count === 5 || count === 21 ? 15 : 0) + value(hand[k]) / 10;\n    if (score > bestScore) { bestScore = score; best = k; }\n  }\n  return best;\n}\nconst cards = (text) => text.split(\' \').map((t) => ({ rank: [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\nconst show = (cs) => cs.map(cardName).join(\' \')\n\n// One hand, as Train an agent… plays it: the AI\'s turn comes, it is given its legal moves, it picks one, and the\n// game plays on (the rules player too) until its next turn. Its reward is its points minus yours since its last move.\nfunction playHand(choose, dealer, log = () => {}) {\n  const deck = shuffle(newDeck()), h = [[], []], crib = [], score = [0, 0], AI = 1\n  for (let k = 0; k < 6; k++) for (const s of [1 - dealer, dealer]) h[s].push(deck.pop())\n  let seen = [0, 0], total = 0\n  const reward = () => { const r = (score[AI] - seen[AI]) - (score[0] - seen[0]); seen = [...score]; return r }\n  const decide = (legal, what) => { const r = reward(); if (log.started) log(\'   reward \' + r); log.started = true; total += r; const a = choose(legal); log(\'AI: legal \' + JSON.stringify(legal) + \' → \' + a + \' (\' + what(a) + \')\'); return a }\n  // the throw\n  const t0 = rulesThrow(h[0], dealer === 0)\n  const t1 = decide(THROWS.map((_, t) => t), (t) => \'throw \' + show(THROWS[t].map((k) => h[1][k])))\n  for (const [s, t] of [[0, t0], [1, t1]]) { const [i, j] = THROWS[t]; crib.push(h[s][i], h[s][j]); h[s] = h[s].filter((_, k) => k !== i && k !== j) }\n  const starter = deck.pop(); if (starter.rank === 11) score[dealer] += 2\n  // pegging\n  const played = [[], []]; let pile = [], turn = 1 - dealer, last = null\n  const opts = (s) => h[s].map((_, k) => k).filter((k) => !played[s].includes(k) && countOf(pile) + value(h[s][k]) <= 31)\n  while (played[0].length + played[1].length < 8) {\n    if (countOf(pile) === 31) pile = []\n    const o = opts(turn)\n    if (!o.length) { if (opts(1 - turn).length) { turn = 1 - turn; continue } score[last]++; pile = []; turn = 1 - last; continue }\n    const k = turn === AI ? decide(o.map((k) => 15 + k), (a) => \'play \' + cardName(h[1][a - 15])) - 15 : rulesPlay(h[0], o, pile)\n    played[turn].push(k); pile.push(h[turn][k]); last = turn; score[turn] += pegPoints(pile).total; turn = 1 - turn\n  }\n  if (countOf(pile) !== 31) score[last]++\n  score[0] += scoreHand(h[0], starter).total; score[1] += scoreHand(h[1], starter).total; score[dealer] += scoreHand(crib, starter, true).total\n  const r = reward(); total += r; log(\'   reward \' + r + \' (the rest of pegging, and the show): the hand is over\')\n  return { total, diff: score[1] - score[0] }\n}\n// A random AI for one hand, every decision and every reward printed. Predict first: what do the rewards add up to?\nconst real = Math.random; Math.random = seeded(16)\nconst r = playHand((legal) => legal[Math.floor(Math.random() * legal.length)], 1, console.log)\nMath.random = real\nconsole.log(\'rewards add up to \' + r.total + \'; the AI\\\'s points minus yours this hand: \' + r.diff)',
              },
              {
                type: 'js',
                instruction: "### 4. Random play's line\nPredict first: points a hand.",
                startCode: '// A seeded random-number generator (mulberry32, Game Studio\'s), so this cell deals the same cards every run.\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\n// Cards and the deck. A card is a plain object, { rank, suit }: rank 1 (ace) to 13 (king), suit one of S H D C.\n// Nothing here draws anything, so the rules can be tested, and an agent can learn, without a screen.\n\nconst SUITS = [\'S\', \'H\', \'D\', \'C\'];\nconst SUIT_SYMBOL = { S: \'♠\', H: \'♥\', D: \'♦\', C: \'♣\' };\nconst RANK_NAME = [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'];\n\n/** What a card counts for, toward 15 and 31: an ace is 1, a face card 10. */\nfunction value(card) { return Math.min(card.rank, 10); }\n\n/** A card\'s name, such as 10♥. */\nfunction cardName(card) { return RANK_NAME[card.rank] + SUIT_SYMBOL[card.suit]; }\n\n/** Its picture: assets/cards/10H.svg (the build writes all 52, and the back). */\nfunction cardImage(card) { return `assets/cards/${RANK_NAME[card.rank]}${card.suit}.svg`; }\n\n/** A fresh deck: the 52 cards in order. */\nfunction newDeck() {\n  const deck = [];\n  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ rank, suit });\n  return deck;\n}\n\n/**\n * Shuffle in place (Fisher–Yates): for each position from the last down, swap in a card chosen at random from those\n * not yet placed. Every order is equally likely. It uses Math.random, which training seeds, so a hand can be replayed.\n */\nfunction shuffle(deck) {\n  for (let i = deck.length - 1; i > 0; i--) {\n    const j = Math.floor(Math.random() * (i + 1));\n    [deck[i], deck[j]] = [deck[j], deck[i]];\n  }\n  return deck;\n}\n\n/** The same card? (Two objects can describe one card.) */\nfunction sameCard(a, b) { return a.rank === b.rank && a.suit === b.suit; }\n// Scoring cribbage: the show (a hand of four with the starter) and pegging (each card as it is played).\n// Every function returns its points with the reasons, so the game can say "fifteen 2, fifteen 4, a pair is 6".\n\n\n/** Every subset of the cards (by bitmask), as lists: 2ⁿ of them, for n cards. */\nfunction subsets(cards) {\n  const out = [];\n  for (let mask = 1; mask < 1 << cards.length; mask++) out.push(cards.filter((_, i) => mask & (1 << i)));\n  return out;\n}\n\n/** Fifteens: 2 for each different set of cards adding up to 15. */\nfunction fifteens(cards) {\n  const sets = subsets(cards).filter((s) => s.reduce((t, c) => t + value(c), 0) === 15);\n  return sets.map((s) => ({ what: \'fifteen\', cards: s, points: 2 }));\n}\n\n/** Pairs: 2 for each pair of cards of the same rank (three of a kind is three pairs, 6; four is six pairs, 12). */\nfunction pairs(cards) {\n  const out = [];\n  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++)\n    if (cards[i].rank === cards[j].rank) out.push({ what: \'pair\', cards: [cards[i], cards[j]], points: 2 });\n  return out;\n}\n\n/** Is this set of cards a run: different ranks, one after another (in any order)? */\nfunction isRun(cards) {\n  const r = cards.map((c) => c.rank).sort((a, b) => a - b);\n  return r.every((x, i) => i === 0 || x === r[i - 1] + 1);\n}\n\n/**\n * Runs: three or more cards in sequence (aces are low: A 2 3 is a run, Q K A is not). Only the longest runs count,\n * once for each different set of cards that makes one: 3 4 4 5 is two runs of three, 6 points.\n */\nfunction runs(cards) {\n  for (let length = cards.length; length >= 3; length--) {\n    const found = subsets(cards).filter((s) => s.length === length && isRun(s));\n    if (found.length) return found.map((s) => ({ what: `run of ${length}`, cards: s, points: length }));\n  }\n  return [];\n}\n\n/**\n * Flush: the four cards in a hand of one suit, 4, and 5 if the starter is too. The crib only scores a flush of all\n * five.\n */\nfunction flush(hand, starter, isCrib) {\n  if (!hand.every((c) => c.suit === hand[0].suit)) return [];\n  if (starter.suit === hand[0].suit) return [{ what: \'flush\', cards: [...hand, starter], points: 5 }];\n  return isCrib ? [] : [{ what: \'flush\', cards: hand, points: 4 }];\n}\n\n/** Nobs: the jack of the starter\'s suit in the hand, 1. */\nfunction nobs(hand, starter) {\n  const jack = hand.find((c) => c.rank === 11 && c.suit === starter.suit);\n  return jack ? [{ what: \'nobs\', cards: [jack], points: 1 }] : [];\n}\n\n/** The show: a hand of four (or the crib) with the starter. { total, parts }. */\nfunction scoreHand(hand, starter, isCrib = false) {\n  const all = [...hand, starter];\n  const parts = [...fifteens(all), ...pairs(all), ...runs(all), ...flush(hand, starter, isCrib), ...nobs(hand, starter)];\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** The count: what the cards played since the last reset add up to. */\nfunction countOf(pile) { return pile.reduce((t, c) => t + value(c), 0); }\n\n/**\n * Pegging: the points for the card just played, the last of `pile` (the cards played since the count was last\n * reset to 0). 15 or 31 is 2; a pair with the card before is 2, three of a kind 6, four 12; a run is one point a card,\n * when the last three or more cards (in any order) make one.\n */\nfunction pegPoints(pile) {\n  const parts = [], count = countOf(pile), card = pile[pile.length - 1];\n  if (count === 15) parts.push({ what: \'fifteen\', points: 2 });\n  if (count === 31) parts.push({ what: \'thirty-one\', points: 2 });\n  let same = 1;\n  while (same < pile.length && pile[pile.length - 1 - same].rank === card.rank) same++;\n  if (same >= 2) parts.push({ what: [\'\', \'\', \'a pair\', \'three of a kind\', \'four of a kind\'][same], points: [0, 0, 2, 6, 12][same] });\n  for (let length = pile.length; length >= 3; length--) {\n    if (isRun(pile.slice(-length))) { parts.push({ what: `run of ${length}`, points: length }); break; }\n  }\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** "fifteen 2, a pair is 4, …": points as they are said aloud. */\nfunction sayParts(parts) {\n  let running = 0;\n  return parts.map((p) => `${p.what} ${(running += p.points)}`).join(\', \');\n}\n// What the AI sees of a move: features, numbers that describe it (lesson: the AI\'s discard; the AI\'s pegging).\n//\n// A linear Q brain values a move as Q = w · φ, one weight per feature, so a feature should be a number that makes\n// a move better or worse in proportion (more points now: better; a bigger chance the other player scores next: worse).\n// Each is scaled to about 0 to 1, so no one feature\'s size swamps the others while the weights are learned.\n//\n// The discard and pegging are different decisions, so each has its own block of features; a move fills its own\n// block and leaves the other at 0, and the two blocks learn separate weights in one list.\n//\n// A seat sees only what a player at the table could: its own cards, the starter, and the cards played. Never the\n// other hand (the developer view shows that to you, not to the AI).\n\n\n/** The 15 ways to throw two of six cards to the crib: [i, j] with i < j. */\nconst THROWS = [];\nfor (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) THROWS.push([i, j]);\n\nconst DISCARD_FEATURES = [\'discard: bias\', \'discard: hand kept (expected points)\', \'discard: crib (expected points, + mine − theirs)\', \'discard: my crib\'];\nconst PEG_FEATURES = [\'peg: bias\', \'peg: points now\', \'peg: count after\', \'peg: chance of 15 or 31 against\', \'peg: chance of a pair against\', \'peg: chance of a run against\', \'peg: leads low\', \'peg: card value\', \'peg: my hand (show)\', \'peg: crib (expected, + mine − theirs)\', \'peg: my crib\'];\nconst FEATURE_NAMES = [...DISCARD_FEATURES, ...PEG_FEATURES];\n\n/** The cards a seat has not seen: the deck less those it knows. */\nfunction unseen(known) {\n  return newDeck().filter((c) => !known.some((k) => sameCard(k, c)));\n}\n\n/** A hand\'s show score averaged over every starter it could get (the cards not in view). */\nfunction expectedHand(kept, known) {\n  const starters = unseen(known);\n  return starters.reduce((t, s) => t + scoreHand(kept, s).total, 0) / starters.length;\n}\n\n/**\n * The average a crib scores holding two cards of these ranks (CRIB_VALUE[a − 1][b − 1]): every other two crib cards\n * and starter, by rank, weighted by how many ways the other 50 cards make them. Suits are ignored (a crib flush needs\n * all five), except nobs: a jack thrown scores 1 when the starter is its suit, about a quarter of the time.\n * cribTable() computes it; the numbers below are its answer, kept here so the game does not spend half a second\n * recomputing them each time it starts (a test checks they agree).\n */\nconst CRIB_VALUE = [\n  [5.49,4.4,4.52,5.43,5.69,4.22,4.04,4.08,4,3.91,4.17,3.81,3.7],\n  [4.4,5.79,6.8,4.8,5.72,4.32,4.24,4.19,4.09,4.03,4.28,3.92,3.82],\n  [4.52,6.8,6.12,5.45,6.38,4.23,4.31,4.25,4.07,4.1,4.36,4,3.89],\n  [5.43,4.8,5.45,6.1,6.95,4.92,4.14,4.26,4.16,4.1,4.36,4,3.89],\n  [5.69,5.72,6.38,6.95,8.96,7.05,6.37,5.71,5.69,6.98,7.24,6.88,6.77],\n  [4.22,4.32,4.23,4.92,7.05,6.25,5.5,4.86,5.53,3.8,4.05,3.69,3.59],\n  [4.04,4.24,4.31,4.14,6.37,5.5,6.07,6.72,4.31,3.68,4,3.64,3.53],\n  [4.08,4.19,4.25,4.26,5.71,4.86,6.72,5.6,4.89,4.26,3.92,3.62,3.52],\n  [4,4.09,4.07,4.16,5.69,5.53,4.31,4.89,5.49,4.8,4.46,3.51,3.46],\n  [3.91,4.03,4.1,4.1,6.98,3.8,3.68,4.26,4.8,5.43,5.03,4.07,3.37],\n  [4.17,4.28,4.36,4.36,7.24,4.05,4,3.92,4.46,5.03,5.93,4.99,4.28],\n  [3.81,3.92,4,4,6.88,3.69,3.64,3.62,3.51,4.07,4.99,5.21,3.93],\n  [3.7,3.82,3.89,3.89,6.77,3.59,3.53,3.52,3.46,3.37,4.28,3.93,4.99],\n];\n\nfunction cribTable() {\n  const table = [];\n  for (let a = 1; a <= 13; a++) {\n    table.push([]);\n    for (let b = 1; b <= 13; b++) {\n      const left = new Array(14).fill(4);\n      left[a]--; left[b]--;\n      let sum = 0, ways = 0;\n      for (let c = 1; c <= 13; c++) for (let d = c; d <= 13; d++) {\n        const pairs = c === d ? left[c] * (left[c] - 1) / 2 : left[c] * left[d];\n        if (!pairs) continue;\n        for (let s = 1; s <= 13; s++) {\n          const w = pairs * (left[s] - (s === c ? 1 : 0) - (s === d ? 1 : 0));\n          if (w <= 0) continue;\n          const crib = [a, b, c, d].map((rank, i) => ({ rank, suit: SUITS[i] }));   // four different suits: no flush\n          sum += w * scoreHand(crib, { rank: s, suit: \'none\' }, true).total;\n          ways += w;\n        }\n      }\n      table[a - 1].push(+(sum / ways + (a === 11 ? 0.25 : 0) + (b === 11 ? 0.25 : 0)).toFixed(2));\n    }\n  }\n  return table;\n}\n\n/** The discard\'s features: throwing hand[i] and hand[j] (of six). myCrib: whether the crib is this seat\'s. */\nfunction discardFeatures(hand, [i, j], myCrib) {\n  const kept = hand.filter((_, k) => k !== i && k !== j), a = hand[i], b = hand[j];\n  const sign = myCrib ? 1 : -1;   // points in the crib are good when it is mine, bad when it is theirs\n  const block = [\n    1,\n    expectedHand(kept, hand) / 10,\n    sign * CRIB_VALUE[a.rank - 1][b.rank - 1] / 10,\n    sign,\n  ];\n  return [...block, ...new Array(PEG_FEATURES.length).fill(0)];\n}\n\n/**\n * Pegging features: playing `card` onto `pile` (the cards since the count was reset). `known`: every card this seat\n * has seen (its hand, the starter, the cards played). `handShow`: its own hand\'s show score, which it knows once the\n * starter is cut. `threw`: the two cards it threw to the crib.\n *\n * The last three are the same for every card it could play: they do not help choose a card, but they let Q predict\n * the points still to come at the show. That matters, because the discard learns its value from the value of the\n * first pegging move (the target R + max Q(S′, ·)): if no pegging feature said how good the crib is, what the discard\n * did for the crib would be lost one step later.\n */\nfunction pegFeatures(card, pile, known, handShow, myCrib, threw) {\n  const after = [...pile, card], count = countOf(after);\n  const others = unseen(known);\n  // The chance that the next card, one the other player could hold, scores against this play.\n  const fits = others.filter((c) => count + value(c) <= 31);\n  const share = (test) => (others.length ? fits.filter(test).length / others.length : 0);\n  const block = [\n    1,\n    pegPoints(after).total / 4,\n    count / 31,\n    share((c) => count + value(c) === 15 || count + value(c) === 31),\n    share((c) => c.rank === card.rank),\n    share((c) => pegPoints([...after, c]).parts.some((p) => p.what.startsWith(\'run\'))),\n    pile.length === 0 && value(card) < 5 ? 1 : 0,\n    value(card) / 10,\n    handShow / 10,\n    (myCrib ? 1 : -1) * CRIB_VALUE[threw[0].rank - 1][threw[1].rank - 1] / 10,\n    myCrib ? 1 : -1,\n  ];\n  return [...new Array(DISCARD_FEATURES.length).fill(0), ...block];\n}\n// Players without a brain: random, and rules (a sensible human\'s habits written as code). The table\'s other seat\n// plays one of these while the AI trains, and they are what the trained AI is measured against.\n\n\n/** A random legal choice. */\nconst pickRandom = (list) => list[Math.floor(Math.random() * list.length)];\n\n/**\n * Rules for the discard: keep the four with the most points on average, and give the crib a fifteen or a pair when\n * it is yours, never when it is theirs.\n */\nfunction rulesThrow(hand, myCrib) {\n  let best = 0, bestScore = -Infinity;\n  THROWS.forEach(([i, j], t) => {\n    const kept = hand.filter((_, k) => k !== i && k !== j), a = hand[i], b = hand[j];\n    const crib = (value(a) + value(b) === 15 ? 2 : 0) + (a.rank === b.rank ? 2 : 0) + (a.rank === 5 ? 1 : 0) + (b.rank === 5 ? 1 : 0);\n    const score = expectedHand(kept, hand) + (myCrib ? crib : -crib);\n    if (score > bestScore) { bestScore = score; best = t; }\n  });\n  return best;\n}\n\n/** Rules for pegging: the most points now; never leave the count on 5 or 21; else the highest card. `options`: indexes into hand of the cards that fit. */\nfunction rulesPlay(hand, options, pile) {\n  let best = options[0], bestScore = -Infinity;\n  for (const k of options) {\n    const after = [...pile, hand[k]], count = countOf(after);\n    const score = pegPoints(after).total * 10 - (count === 5 || count === 21 ? 15 : 0) + value(hand[k]) / 10;\n    if (score > bestScore) { bestScore = score; best = k; }\n  }\n  return best;\n}\nconst cards = (text) => text.split(\' \').map((t) => ({ rank: [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\nconst show = (cs) => cs.map(cardName).join(\' \')\n\n// One hand, as Train an agent… plays it: the AI\'s turn comes, it is given its legal moves, it picks one, and the\n// game plays on (the rules player too) until its next turn. Its reward is its points minus yours since its last move.\nfunction playHand(choose, dealer, log = () => {}) {\n  const deck = shuffle(newDeck()), h = [[], []], crib = [], score = [0, 0], AI = 1\n  for (let k = 0; k < 6; k++) for (const s of [1 - dealer, dealer]) h[s].push(deck.pop())\n  let seen = [0, 0], total = 0\n  const reward = () => { const r = (score[AI] - seen[AI]) - (score[0] - seen[0]); seen = [...score]; return r }\n  const decide = (legal, what) => { const r = reward(); if (log.started) log(\'   reward \' + r); log.started = true; total += r; const a = choose(legal); log(\'AI: legal \' + JSON.stringify(legal) + \' → \' + a + \' (\' + what(a) + \')\'); return a }\n  // the throw\n  const t0 = rulesThrow(h[0], dealer === 0)\n  const t1 = decide(THROWS.map((_, t) => t), (t) => \'throw \' + show(THROWS[t].map((k) => h[1][k])))\n  for (const [s, t] of [[0, t0], [1, t1]]) { const [i, j] = THROWS[t]; crib.push(h[s][i], h[s][j]); h[s] = h[s].filter((_, k) => k !== i && k !== j) }\n  const starter = deck.pop(); if (starter.rank === 11) score[dealer] += 2\n  // pegging\n  const played = [[], []]; let pile = [], turn = 1 - dealer, last = null\n  const opts = (s) => h[s].map((_, k) => k).filter((k) => !played[s].includes(k) && countOf(pile) + value(h[s][k]) <= 31)\n  while (played[0].length + played[1].length < 8) {\n    if (countOf(pile) === 31) pile = []\n    const o = opts(turn)\n    if (!o.length) { if (opts(1 - turn).length) { turn = 1 - turn; continue } score[last]++; pile = []; turn = 1 - last; continue }\n    const k = turn === AI ? decide(o.map((k) => 15 + k), (a) => \'play \' + cardName(h[1][a - 15])) - 15 : rulesPlay(h[0], o, pile)\n    played[turn].push(k); pile.push(h[turn][k]); last = turn; score[turn] += pegPoints(pile).total; turn = 1 - turn\n  }\n  if (countOf(pile) !== 31) score[last]++\n  score[0] += scoreHand(h[0], starter).total; score[1] += scoreHand(h[1], starter).total; score[dealer] += scoreHand(crib, starter, true).total\n  const r = reward(); total += r; log(\'   reward \' + r + \' (the rest of pegging, and the show): the hand is over\')\n  return { total, diff: score[1] - score[0] }\n}\n// Random play, the line every learner starts from: 600 hands against the rules player, dealing in turn. Predict\n// first: about how many points a hand does a random AI lose?\nconst real = Math.random; Math.random = seeded(31)\nlet sum = 0\nfor (let k = 0; k < 600; k++) sum += playHand((legal) => legal[Math.floor(Math.random() * legal.length)], k % 2).total\nMath.random = real\nconsole.log(\'random AI against the rules player: \' + (sum / 600).toFixed(2) + \' points a hand\')',
              },
              {
                type: 'challenge',
                instruction: '### 5. Challenge: reward\nFive moments check it.',
                startCode: "// Challenge: write reward(scores, seen): what the AI (seat 1) earned since its last move, its points minus yours,\n// and remember the scores for next time (seen is changed in place). The checks call it at four moments.\nfunction reward(scores, seen) {\n  return 0   // your code\n}\nconst seen = [0, 0], moments = [[[0, 0], 0], [[2, 0], -2], [[2, 5], 5], [[9, 9], -3], [[9, 9], 0]]\nlet ok = 0\nfor (const [scores, want] of moments) { const got = reward(scores, seen); if (got === want) ok++; else console.log('At scores you ' + scores[0] + ', AI ' + scores[1] + ': reward ' + got + ', should be ' + want + '.') }\nconsole.log(ok === moments.length ? '✓ All 5 rewards right: they add up to the hand\\'s difference.' : ok + ' of 5 right.')",
                solutionCode: "// Challenge: write reward(scores, seen): what the AI (seat 1) earned since its last move, its points minus yours,\n// and remember the scores for next time (seen is changed in place). The checks call it at four moments.\nfunction reward(scores, seen) {\n  const r = (scores[1] - seen[1]) - (scores[0] - seen[0])\n  seen[0] = scores[0]; seen[1] = scores[1]\n  return r\n}\nconst seen = [0, 0], moments = [[[0, 0], 0], [[2, 0], -2], [[2, 5], 5], [[9, 9], -3], [[9, 9], 0]]\nlet ok = 0\nfor (const [scores, want] of moments) { const got = reward(scores, seen); if (got === want) ok++; else console.log('At scores you ' + scores[0] + ', AI ' + scores[1] + ': reward ' + got + ', should be ' + want + '.') }\nconsole.log(ok === moments.length ? '✓ All 5 rewards right: they add up to the hand\\'s difference.' : ok + ' of 5 right.')",
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'The AI as a turn-based agent',
        props: {
          task: 'crib-agent',
          lesson: 'mg10-009',
          checkpoint: 'cp-mg10-009-4',
        },
      },
    ],
  },

  math: {
    prose: [
      "**Under the hood (optional).** Choosing only among legal moves is action masking: the policy is a distribution over $A(s)$, the legal set at state $s$, and the Q-learning target uses $\\max_{a' \\in A(s')} Q(s', a')$, the best legal move next, not the best of all 19.",
      'With reward $r_t$ = (my points − yours) since the last move, and $\\gamma = 1$, the return of a hand is $\\sum_t r_t$ = my points − yours over the hand: the rewards telescope.',
      'The episode is a hand of at most 5 decisions for the AI (one throw, up to four plays), so credit for the throw is never more than four steps from the show that rewards it.',
    ],
    equations: [
      {
        label: 'Return of a hand',
        latex: 'G = \\sum_{t} r_t = \\Delta\\text{mine} - \\Delta\\text{yours}',
      },
      {
        label: 'Masked target',
        latex: "r + \\gamma \\max_{a' \\in A(s')} Q(s', a')",
      },
    ],
    callouts: [],
    visualizations: [],
  },

  rigor: {
    prose: [
      "From the AI's point of view the rules player is part of the environment: a fixed policy that makes your seat's moves. Training against it finds a good reply to the rules player, which may not be a good reply to every player; lesson 10.12 discusses self-play.",
      "Cribbage hides the other hand, so the AI's situation is only partly observed; its features (10.10) must be built from what it has seen.",
      'Where it goes: 10.10 says what the AI sees of each legal move, its features; 10.11 learns from them.',
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [
    {
      id: 'mg10-009-ex1',
      title: "A move's number",
      difficulty: 'easy',
      problem: 'Which move is "throw the second and fifth cards"?',
      steps: [
        {
          expression: '[1, 4] = \\text{THROWS}[7]',
          annotation: 'Places from 0: second is 1, fifth is 4.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: 'Move 7 (cell 1).',
    },
    {
      id: 'mg10-009-ex2',
      title: 'Legal pegging moves',
      difficulty: 'medium',
      problem: 'The count is 25; the AI holds 2 K 9 6, none played. legalActions()?',
      steps: [
        {
          expression: '25 + 2,\\ 25 + 6 \\le 31',
          annotation: 'The 2 and the 6 fit.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: '[15, 18].',
    },
    {
      id: 'mg10-009-ex3',
      title: 'Rewards add up',
      difficulty: 'hard',
      problem: 'Between its moves the AI pegs 2, you peg 3, the AI pegs 2, nothing, then at the show the AI scores 12 and you 6. Its rewards?',
      steps: [
        {
          expression: '2,\\ -3,\\ 2,\\ 0,\\ 6',
          annotation: 'Each the difference since its last move.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: "2, −3, 2, 0, 6: they add up to 7, the hand's difference (cell 3).",
    },
  ],

  challenges: [
    {
      id: 'mg10-009-ch1',
      title: 'Not my turn',
      difficulty: 'easy',
      problem: 'What does legalActions() return while you are choosing your throw, after the AI has thrown?',
      hint: 'Has it anything to decide?',
      answer: '[]: it has thrown, so it waits.',
      walkthrough: [],
    },
    {
      id: 'mg10-009-ch2',
      title: 'Only my points',
      difficulty: 'medium',
      problem: 'What would an AI rewarded only with its own points do differently?',
      hint: 'Defence.',
      answer: 'It would happily leave you 15s and 31s, since your points cost it nothing.',
      walkthrough: [],
    },
    {
      id: 'mg10-009-ch3',
      title: 'Episodes of a game',
      difficulty: 'hard',
      problem: 'Why not make an episode a whole game to 121?',
      hint: 'Length and what it sees.',
      answer: "Episodes would be about 60 decisions long, so credit would travel far; and the AI does not see the score, so the game's state would be hidden from it. A hand is a natural, short unit.",
      walkthrough: [],
    },
  ],

  semantics: {
    core: [
      {
        symbol: 'actions',
        meaning: "The 19 moves' names: 15 throws, 4 plays.",
      },
      {
        symbol: 'legalActions()',
        meaning: 'The moves possible now; [] when it is not its turn.',
      },
      {
        symbol: 'act(action)',
        meaning: 'Make the move through the table.',
      },
      {
        symbol: 'reward()',
        meaning: 'Its points minus yours since its last move.',
      },
      {
        symbol: 'done()',
        meaning: 'The hand (in training) or the game is over.',
      },
    ],
    rulesOfThumb: [
      'Number every move; mask the illegal ones.',
      'Reward the difference in a two-player game.',
      'An episode is a natural unit of play.',
    ],
  },

  misconceptions: [
    {
      falseBelief: 'The AI can learn to avoid illegal moves on its own.',
      whyStudentsThinkIt: 'It learns everything else.',
      correctionExample: '88% of random picks would be illegal (cell 2); every one would waste a step.',
      contrastCase: 'Masking means it never tries one.',
    },
    {
      falseBelief: 'A step is a frame.',
      whyStudentsThinkIt: 'In Breakout it was a few.',
      correctionExample: 'Here a step is a move, and between moves the game runs as many frames as it needs.',
      contrastCase: "Breakout's paddle decided every 4 frames.",
    },
  ],

  transferPrompts: [
    {
      situation: 'A chess or checkers AI.',
      competingTechniques: [
        'A fixed list of all moves, illegal ones punished',
        'Legal moves listed each turn, the brain choosing among them',
      ],
      whyThisTechniqueWins: 'Learning is spent on good moves, not on rules.',
    },
    {
      situation: "A strategy game's AI that acts once per turn.",
      competingTechniques: [
        'Decide every frame',
        'A turn-based agent: decide when its legal list is not empty',
      ],
      whyThisTechniqueWins: "Decisions match the game's turns.",
    },
  ],

  debugging: [
    {
      commonError: 'legalActions() returns moves while it is thinking.',
      symptom: 'The AI moves instantly, with no pause to follow.',
      whyItHappened: 'The think timer was not checked.',
      repairStrategy: "The table's decision(AI) returns nothing while think > 0.",
    },
    {
      commonError: 'reward() returns the total score.',
      symptom: 'Rewards grow all hand; values explode.',
      whyItHappened: 'It must be the change since the last move.',
      repairStrategy: 'Keep this.seen and return the difference.',
    },
    {
      commonError: 'done() checks only for 121.',
      symptom: 'Training never ends an episode.',
      whyItHappened: 'In training an episode is one hand.',
      repairStrategy: 'Also true when the phase is done.',
    },
  ],

  mastery: {
    targetLevel: 3,
    solveIndependently: "Make a turn-based game's player into an agent.",
    explainVerbally: 'Explain masking, difference rewards and turn-based steps.',
    detectIncorrectApplication: 'Spot unmasked moves and own-points rewards.',
    transferToUnfamiliar: 'Design the agent interface of another card or board game.',
  },

  assessment: {
    questions: [
      {
        id: 'mg10-009-assess-1',
        type: 'choice',
        text: "During your turn, the AI's legalActions() is",
        options: ['[]', 'All 19', '[15, 16, 17, 18]', 'The throws'],
        answer: '[]',
        hint: 'Not its turn.',
      },
    ],
  },

  quiz: [
    {
      id: 'mg10-009-quiz-1',
      type: 'choice',
      text: 'Move 17 is',
      options: ['play 3', 'throw 3+4', 'play 2', 'throw 5+6'],
      answer: 'play 3',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg10-009-quiz-2',
      type: 'choice',
      text: 'Picking from all 19 at a pegging turn is illegal about',
      options: ['88% of the time', '10%', '50%', 'Never'],
      answer: '88% of the time',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg10-009-quiz-3',
      type: 'choice',
      text: 'In cell 3 the rewards add up to',
      options: ["The hand's difference, 7", '0', "The AI's points", '121'],
      answer: "The hand's difference, 7",
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg10-009-quiz-4',
      type: 'choice',
      text: 'A random AI against the rules player scores about',
      options: ['−4.8 points a hand', '0', '+4.8', '−12'],
      answer: '−4.8 points a hand',
      hints: ['Cell 4.'],
      reviewSection: 'Cell 4',
    },
    {
      id: 'mg10-009-quiz-5',
      type: 'choice',
      text: 'In training, an episode is',
      options: ['One hand', 'One move', 'A game to 121', 'One frame'],
      answer: 'One hand',
      hints: ['done().'],
      reviewSection: 'Intuition — done',
    },
    {
      id: 'mg10-009-quiz-6',
      type: 'choice',
      text: 'A turn-based step ends when',
      options: [
        'The AI has legal moves again, or the hand is over',
        'After 4 frames',
        'After the other player moves once',
        'At the show',
      ],
      answer: 'The AI has legal moves again, or the hand is over',
      hints: ['A turn-based step.'],
      reviewSection: 'Intuition — step',
    },
  ],

  checkpoints: [
    {
      id: 'cp-mg10-009-1',
      label: 'Read numbered and legal moves',
      type: 'read',
    },
    {
      id: 'cp-mg10-009-2',
      label: 'Read act, reward and done',
      type: 'read',
    },
    {
      id: 'cp-mg10-009-3',
      label: 'Run the notebook',
      type: 'read',
    },
    {
      id: 'cp-mg10-009-4',
      label: 'Complete "The AI as a turn-based agent" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg10-009-5',
      label: 'Read turn-based steps and training mode',
      type: 'read',
    },
    {
      id: 'cp-mg10-009-6',
      label: 'Work through legal pegging moves',
      type: 'example',
    },
    {
      id: 'cp-mg10-009-7',
      label: 'Work through rewards that add up',
      type: 'example',
    },
    {
      id: 'cp-mg10-009-8',
      label: 'Pass the reward challenge',
      type: 'challenge',
    },
  ],

  chapter: 'making-games-10',
}
