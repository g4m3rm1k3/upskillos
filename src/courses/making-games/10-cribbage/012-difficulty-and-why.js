export default {
  order: 12,

  id: 'mg10-012',

  slug: 'difficulty-and-why',

  title: 'Difficulty, Why the AI Chose, and How Good It Is',

  subtitle: 'One brain, three opponents, by a single number; a developer view that explains every move; and measurements honest about their uncertainty.',

  tags: [
    'game-studio',
    'cribbage',
    'machine-learning',
    'difficulty',
    'softmax',
    'explainability',
    'evaluation',
  ],

  aliases: 'difficulty temperature softmax boltzmann exploration epsilon mistakes human-like explain why weight times difference runner-up developer view evaluation win rate confidence interval standard error self-play shipping a brain',

  timeToComplete: 60,

  coreConcept: 'A trained brain becomes an easy, medium or hard opponent by one number, its temperature τ: it chooses each move with probability ∝ e^(Q/τ). At τ = 0 it always plays its best; as τ grows it more often plays a move that is nearly as good, the kind of mistake a person makes, unlike ε-random blunders. Because Q = w · φ, why it chose one move over the runner-up is the sum of weight × (difference in each feature), so the developer view can list its reasons. And an AI is only as good as its measurement: per hand on the same deals, then whole games, each with its uncertainty.',

  prerequisites: ['mg10-011'],

  hook: {
    question: 'You have one trained brain. Players want Easy, Medium and Hard. Training three brains would work, badly; is there one number that makes a learned AI play worse in a way that still feels like a player, not a dice roll?',
    realWorldContext: 'Shipping game AI means difficulty settings, debugging tools and honest claims about strength. Softmax (Boltzmann) choice is a standard way to tune a learned agent\'s strength and variety; "why did it do that" views built from a model\'s own structure are the simplest kind of explainable AI.',
  },

  intuition: {
    prose: [
      '**The Try it task.** A title screen (two more pictures in the table tool, an Overlay of panel, words and buttons) and DIFFICULTY, a temperature for each level that start() gives the Opponent; then remember(), every move it could have made, valued and ranked; then why it chose; then a measurement of Easy against Hard.',
      '**One brain, many strengths.** The brain gives every legal move a value. Hard takes the best. For an easier opponent, do not retrain: choose by softmax at a temperature τ, each move with probability proportional to e^(Q / τ). Because Q is in points, τ is too: a move worth 1 point less is e^(−1/τ) as likely. On a 5 holding K 2 9 4, Hard plays the king every time, Medium (τ 0.6) 86% of the time, Easy (τ 2) 44% (cell 1).',
      '**Mistakes that look human.** An ε-random opponent (a random move 30% of the time) plays a terrible move as often as a nearly-best one. Softmax mostly picks among the good moves: with values −8.9, −9.0 and −14.0, τ 2 plays the first two 49% and 47% and the bad one 4%; ε 0.3 plays the bad one 10% (cell 1). Easy then feels like a weaker player, not a broken one.',
      "**In the game.** The Opponent's temperature field is set from DIFFICULTY (Easy 2, Medium 0.6, Hard 0) when you choose on the title screen. The engine uses it: an agent with a temperature above 0 has its brain's choice made by softmax. Measured on the same 300 deals against the rules player (cell 3): Hard +0.21 points a hand, Medium −0.23, Easy −1.95.",
      "**Why did it choose that?** Q = w · φ, so the difference between its move and the runner-up is Σ wᵢ × (φᵢ of its move − φᵢ of the other). The features the two moves share (the bias, its hand, the crib) cancel; what is left are its reasons. The king over the 2: +1.72 for points now, −0.15 for spending a high card, +0.02 because the 2 would leave 7, where an 8 makes 15; together +1.59, exactly the gap in Q (cell 2). remember() works this out after every move, and the developer view (D) lists every move's Q and the four biggest reasons.",
      "**How good is it, really?** Per hand, on the same 1,000 deals: +0.21 against the rules player, where the rules player itself makes +0.16. Over whole games to 121 (150 each, the real game playing itself in a test): Easy won 26, Medium 57, Hard 80 (cell 4). With 150 games a win rate is uncertain by about ±8 percentage points: Hard's 53% could be anywhere from 45% to 61%. So the honest claim is: Hard plays as well as a sensible rules player, Medium and Easy clearly worse, in that order. To show Hard is better, play thousands of games.",
      "**Self-play.** Trained against the rules player, the AI learned to beat the rules player's habits. Set the table's partner to 'brain' and train again, starting from the saved weights: your seat is then played by its own brain, and it learns replies to itself. Self-play is how AlphaZero and TD-Gammon got strong; here it is one setting.",
      '**Shipping.** The brain is part of the project, brains/cribbage.json: 15 weights and their feature names. It is exported with the game, so the opponent plays the same in a browser download as in the editor. The finished Cribbage example, the one you played in lesson 10.1, is everything in this chapter.',
      '**For any game.** The recipe, from start to end: the game as plain data and functions (cards, rules); a state machine for its flow; a view of the state and input into moves; a rules player as partner and yardstick; the AI as a turn-based agent (numbered moves, legal moves, rewards, episodes); features of each move from what it can see; linear Q-learning with schedules and checks; and difficulty by temperature, explained by its own weights. Swap the rules and the features, and the rest carries to rummy, hearts, dominoes, or a board game of your own.',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: from a brain to a shipped opponent',
        body: "Step 1. Difficulty: a temperature per level; softmax over the legal moves' Q. Step 2. Explain: Q gap = Σ weight × feature difference from the runner-up; show the biggest terms in a developer view. Step 3. Judge: per hand on the same deals against random and the rules player; then whole games, with ± uncertainty. Step 4. Improve: self-play, new features where the reasons look wrong. Step 5. Ship the brain with the game.",
      },
      {
        type: 'warning',
        title: 'Claim only what the numbers show',
        body: '53% of 150 games is 45% to 61%: "as good as the rules player", not "better". An uncertainty range belongs next to every win rate you report.',
      },
      {
        type: 'insight',
        title: 'Explainable because it is simple',
        body: "A linear model's reasons are its terms. A deep network's are not so easy to read, which is one reason to try features and a linear model first: when it is good enough, you also get to know why.",
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Build it: difficulty, why, and how good',
        caption: 'Softmax at three temperatures, the reasons for a move, each difficulty measured (a few seconds), and win rates with their uncertainty.',
        props: {
          lesson: {
            title: 'Difficulty, why, and how good',
            subtitle: 'One brain, three opponents, honest numbers.',
            cells: [
              {
                type: 'js',
                instruction: "### 1. Temperature\nPredict first: Easy's chance of the best move.",
                startCode: "// Choosing at a temperature τ: each move with probability ∝ e^(Q / τ). τ = 0 means always the best.\nfunction probabilities(qs, tau) {\n  if (tau <= 0) { const best = qs.indexOf(Math.max(...qs)); return qs.map((_, i) => (i === best ? 1 : 0)) }\n  const m = Math.max(...qs), e = qs.map((q) => Math.exp((q - m) / tau)), z = e.reduce((a, b) => a + b, 0)\n  return e.map((x) => x / z)\n}\n// The brain's values for the four cards on a 5 (lesson 10.11, cell 1): K −8.93, 2 −10.52, 9 −10.65, 4 −10.86.\n// Predict first: at Easy (τ 2), how often does it play the king? And how does that compare with a 30% random mistake?\nconst names = ['K', '2', '9', '4'], qs = [-8.93, -10.52, -10.65, -10.86]\nfor (const [level, tau] of [['Hard', 0], ['Medium', 0.6], ['Easy', 2]])\n  console.log((level + ' τ ' + tau).padEnd(14) + names.map((n, i) => n + ' ' + (100 * probabilities(qs, tau)[i]).toFixed(0).padStart(3) + '%').join('   '))\nconst eps = 0.3\nconsole.log('ε 0.3 random  '.padEnd(14) + names.map((n, i) => n + ' ' + (100 * ((i === 0 ? 1 - eps : 0) + eps / 4)).toFixed(0).padStart(3) + '%').join('   '))\n// A move nearly as good as the best is picked often; a much worse one rarely: mistakes a person would make.\nconst qs2 = [-8.9, -9.0, -14.0]\nconsole.log('Q −8.9, −9.0, −14.0 at τ 2: ' + probabilities(qs2, 2).map((p) => (100 * p).toFixed(0) + '%').join(', ') + '   at ε 0.3: ' + [0.8, 0.1, 0.1].map((p) => (100 * p).toFixed(0) + '%').join(', '))",
              },
              {
                type: 'js',
                instruction: '### 2. Why it chose\nPredict first: the biggest reason.',
                startCode: '// Cards and the deck. A card is a plain object, { rank, suit }: rank 1 (ace) to 13 (king), suit one of S H D C.\n// Nothing here draws anything, so the rules can be tested, and an agent can learn, without a screen.\n\nconst SUITS = [\'S\', \'H\', \'D\', \'C\'];\nconst SUIT_SYMBOL = { S: \'♠\', H: \'♥\', D: \'♦\', C: \'♣\' };\nconst RANK_NAME = [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'];\n\n/** What a card counts for, toward 15 and 31: an ace is 1, a face card 10. */\nfunction value(card) { return Math.min(card.rank, 10); }\n\n/** A card\'s name, such as 10♥. */\nfunction cardName(card) { return RANK_NAME[card.rank] + SUIT_SYMBOL[card.suit]; }\n\n/** Its picture: assets/cards/10H.svg (the card tool, scripts/tools/cards.js, draws all 52, and the back). */\nfunction cardImage(card) { return `assets/cards/${RANK_NAME[card.rank]}${card.suit}.svg`; }\n\n/** A fresh deck: the 52 cards in order. */\nfunction newDeck() {\n  const deck = [];\n  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ rank, suit });\n  return deck;\n}\n\n/**\n * Shuffle in place (Fisher–Yates): for each position from the last down, swap in a card chosen at random from those\n * not yet placed. Every order is equally likely. It uses Math.random, which training seeds, so a hand can be replayed.\n */\nfunction shuffle(deck) {\n  for (let i = deck.length - 1; i > 0; i--) {\n    const j = Math.floor(Math.random() * (i + 1));\n    [deck[i], deck[j]] = [deck[j], deck[i]];\n  }\n  return deck;\n}\n\n/** The same card? (Two objects can describe one card.) */\nfunction sameCard(a, b) { return a.rank === b.rank && a.suit === b.suit; }\n// Scoring cribbage: the show (a hand of four with the starter) and pegging (each card as it is played).\n// Every function returns its points with the reasons, so the game can say "fifteen 2, fifteen 4, a pair is 6".\n\n\n/** Every subset of the cards (by bitmask), as lists: 2ⁿ of them, for n cards. */\nfunction subsets(cards) {\n  const out = [];\n  for (let mask = 1; mask < 1 << cards.length; mask++) out.push(cards.filter((_, i) => mask & (1 << i)));\n  return out;\n}\n\n/** Fifteens: 2 for each different set of cards adding up to 15. */\nfunction fifteens(cards) {\n  const sets = subsets(cards).filter((s) => s.reduce((t, c) => t + value(c), 0) === 15);\n  return sets.map((s) => ({ what: \'fifteen\', cards: s, points: 2 }));\n}\n\n/** Pairs: 2 for each pair of cards of the same rank (three of a kind is three pairs, 6; four is six pairs, 12). */\nfunction pairs(cards) {\n  const out = [];\n  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++)\n    if (cards[i].rank === cards[j].rank) out.push({ what: \'pair\', cards: [cards[i], cards[j]], points: 2 });\n  return out;\n}\n\n/** Is this set of cards a run: different ranks, one after another (in any order)? */\nfunction isRun(cards) {\n  const r = cards.map((c) => c.rank).sort((a, b) => a - b);\n  return r.every((x, i) => i === 0 || x === r[i - 1] + 1);\n}\n\n/**\n * Runs: three or more cards in sequence (aces are low: A 2 3 is a run, Q K A is not). Only the longest runs count,\n * once for each different set of cards that makes one: 3 4 4 5 is two runs of three, 6 points.\n */\nfunction runs(cards) {\n  for (let length = cards.length; length >= 3; length--) {\n    const found = subsets(cards).filter((s) => s.length === length && isRun(s));\n    if (found.length) return found.map((s) => ({ what: `run of ${length}`, cards: s, points: length }));\n  }\n  return [];\n}\n\n/**\n * Flush: the four cards in a hand of one suit, 4, and 5 if the starter is too. The crib only scores a flush of all\n * five.\n */\nfunction flush(hand, starter, isCrib) {\n  if (!hand.every((c) => c.suit === hand[0].suit)) return [];\n  if (starter.suit === hand[0].suit) return [{ what: \'flush\', cards: [...hand, starter], points: 5 }];\n  return isCrib ? [] : [{ what: \'flush\', cards: hand, points: 4 }];\n}\n\n/** Nobs: the jack of the starter\'s suit in the hand, 1. */\nfunction nobs(hand, starter) {\n  const jack = hand.find((c) => c.rank === 11 && c.suit === starter.suit);\n  return jack ? [{ what: \'nobs\', cards: [jack], points: 1 }] : [];\n}\n\n/** The show: a hand of four (or the crib) with the starter. { total, parts }. */\nfunction scoreHand(hand, starter, isCrib = false) {\n  const all = [...hand, starter];\n  const parts = [...fifteens(all), ...pairs(all), ...runs(all), ...flush(hand, starter, isCrib), ...nobs(hand, starter)];\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** The count: what the cards played since the last reset add up to. */\nfunction countOf(pile) { return pile.reduce((t, c) => t + value(c), 0); }\n\n/**\n * Pegging: the points for the card just played, the last of `pile` (the cards played since the count was last\n * reset to 0). 15 or 31 is 2; a pair with the card before is 2, three of a kind 6, four 12; a run is one point a card,\n * when the last three or more cards (in any order) make one.\n */\nfunction pegPoints(pile) {\n  const parts = [], count = countOf(pile), card = pile[pile.length - 1];\n  if (count === 15) parts.push({ what: \'fifteen\', points: 2 });\n  if (count === 31) parts.push({ what: \'thirty-one\', points: 2 });\n  let same = 1;\n  while (same < pile.length && pile[pile.length - 1 - same].rank === card.rank) same++;\n  if (same >= 2) parts.push({ what: [\'\', \'\', \'a pair\', \'three of a kind\', \'four of a kind\'][same], points: [0, 0, 2, 6, 12][same] });\n  for (let length = pile.length; length >= 3; length--) {\n    if (isRun(pile.slice(-length))) { parts.push({ what: `run of ${length}`, points: length }); break; }\n  }\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** "fifteen 2, a pair is 4, …": points as they are said aloud. */\nfunction sayParts(parts) {\n  let running = 0;\n  return parts.map((p) => `${p.what} ${(running += p.points)}`).join(\', \');\n}\n// What the AI sees of a move: features, numbers that describe it (lesson: the AI\'s discard; the AI\'s pegging).\n//\n// A linear Q brain values a move as Q = w · φ, one weight per feature, so a feature should be a number that makes\n// a move better or worse in proportion (more points now: better; a bigger chance the other player scores next: worse).\n// Each is scaled to about 0 to 1, so no one feature\'s size swamps the others while the weights are learned.\n//\n// The discard and pegging are different decisions, so each has its own block of features; a move fills its own\n// block and leaves the other at 0, and the two blocks learn separate weights in one list.\n//\n// A seat sees only what a player at the table could: its own cards, the starter, and the cards played. Never the\n// other hand (the developer view shows that to you, not to the AI).\n\n\n/** The 15 ways to throw two of six cards to the crib: [i, j] with i < j. */\nconst THROWS = [];\nfor (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) THROWS.push([i, j]);\n\nconst DISCARD_FEATURES = [\'discard: bias\', \'discard: hand kept (expected points)\', \'discard: crib (expected points, + mine − theirs)\', \'discard: my crib\'];\nconst PEG_FEATURES = [\'peg: bias\', \'peg: points now\', \'peg: count after\', \'peg: chance of 15 or 31 against\', \'peg: chance of a pair against\', \'peg: chance of a run against\', \'peg: leads low\', \'peg: card value\', \'peg: my hand (show)\', \'peg: crib (expected, + mine − theirs)\', \'peg: my crib\'];\nconst FEATURE_NAMES = [...DISCARD_FEATURES, ...PEG_FEATURES];\n\n/** The cards a seat has not seen: the deck less those it knows. */\nfunction unseen(known) {\n  return newDeck().filter((c) => !known.some((k) => sameCard(k, c)));\n}\n\n/** A hand\'s show score averaged over every starter it could get (the cards not in view). */\nfunction expectedHand(kept, known) {\n  const starters = unseen(known);\n  return starters.reduce((t, s) => t + scoreHand(kept, s).total, 0) / starters.length;\n}\n\n/**\n * The average a crib scores holding two cards of these ranks (CRIB_VALUE[a − 1][b − 1]): every other two crib cards\n * and starter, by rank, weighted by how many ways the other 50 cards make them. Suits are ignored (a crib flush needs\n * all five), except nobs: a jack thrown scores 1 when the starter is its suit, about a quarter of the time.\n * cribTable() computes it; the numbers below are its answer, kept here so the game does not spend half a second\n * recomputing them each time it starts (a test checks they agree).\n */\nconst CRIB_VALUE = [\n  [5.49,4.4,4.52,5.43,5.69,4.22,4.04,4.08,4,3.91,4.17,3.81,3.7],\n  [4.4,5.79,6.8,4.8,5.72,4.32,4.24,4.19,4.09,4.03,4.28,3.92,3.82],\n  [4.52,6.8,6.12,5.45,6.38,4.23,4.31,4.25,4.07,4.1,4.36,4,3.89],\n  [5.43,4.8,5.45,6.1,6.95,4.92,4.14,4.26,4.16,4.1,4.36,4,3.89],\n  [5.69,5.72,6.38,6.95,8.96,7.05,6.37,5.71,5.69,6.98,7.24,6.88,6.77],\n  [4.22,4.32,4.23,4.92,7.05,6.25,5.5,4.86,5.53,3.8,4.05,3.69,3.59],\n  [4.04,4.24,4.31,4.14,6.37,5.5,6.07,6.72,4.31,3.68,4,3.64,3.53],\n  [4.08,4.19,4.25,4.26,5.71,4.86,6.72,5.6,4.89,4.26,3.92,3.62,3.52],\n  [4,4.09,4.07,4.16,5.69,5.53,4.31,4.89,5.49,4.8,4.46,3.51,3.46],\n  [3.91,4.03,4.1,4.1,6.98,3.8,3.68,4.26,4.8,5.43,5.03,4.07,3.37],\n  [4.17,4.28,4.36,4.36,7.24,4.05,4,3.92,4.46,5.03,5.93,4.99,4.28],\n  [3.81,3.92,4,4,6.88,3.69,3.64,3.62,3.51,4.07,4.99,5.21,3.93],\n  [3.7,3.82,3.89,3.89,6.77,3.59,3.53,3.52,3.46,3.37,4.28,3.93,4.99],\n];\n\nfunction cribTable() {\n  const table = [];\n  for (let a = 1; a <= 13; a++) {\n    table.push([]);\n    for (let b = 1; b <= 13; b++) {\n      const left = new Array(14).fill(4);\n      left[a]--; left[b]--;\n      let sum = 0, ways = 0;\n      for (let c = 1; c <= 13; c++) for (let d = c; d <= 13; d++) {\n        const pairs = c === d ? left[c] * (left[c] - 1) / 2 : left[c] * left[d];\n        if (!pairs) continue;\n        for (let s = 1; s <= 13; s++) {\n          const w = pairs * (left[s] - (s === c ? 1 : 0) - (s === d ? 1 : 0));\n          if (w <= 0) continue;\n          const crib = [a, b, c, d].map((rank, i) => ({ rank, suit: SUITS[i] }));   // four different suits: no flush\n          sum += w * scoreHand(crib, { rank: s, suit: \'none\' }, true).total;\n          ways += w;\n        }\n      }\n      table[a - 1].push(+(sum / ways + (a === 11 ? 0.25 : 0) + (b === 11 ? 0.25 : 0)).toFixed(2));\n    }\n  }\n  return table;\n}\n\n/** The discard\'s features: throwing hand[i] and hand[j] (of six). myCrib: whether the crib is this seat\'s. */\nfunction discardFeatures(hand, [i, j], myCrib) {\n  const kept = hand.filter((_, k) => k !== i && k !== j), a = hand[i], b = hand[j];\n  const sign = myCrib ? 1 : -1;   // points in the crib are good when it is mine, bad when it is theirs\n  const block = [\n    1,\n    expectedHand(kept, hand) / 10,\n    sign * CRIB_VALUE[a.rank - 1][b.rank - 1] / 10,\n    sign,\n  ];\n  return [...block, ...new Array(PEG_FEATURES.length).fill(0)];\n}\n\n/**\n * Pegging features: playing `card` onto `pile` (the cards since the count was reset). `known`: every card this seat\n * has seen (its hand, the starter, the cards played). `handShow`: its own hand\'s show score, which it knows once the\n * starter is cut. `threw`: the two cards it threw to the crib.\n *\n * The last three are the same for every card it could play: they do not help choose a card, but they let Q predict\n * the points still to come at the show. That matters, because the discard learns its value from the value of the\n * first pegging move (the target R + max Q(S′, ·)): if no pegging feature said how good the crib is, what the discard\n * did for the crib would be lost one step later.\n */\nfunction pegFeatures(card, pile, known, handShow, myCrib, threw) {\n  const after = [...pile, card], count = countOf(after);\n  const others = unseen(known);\n  // The chance that the next card, one the other player could hold, scores against this play.\n  const fits = others.filter((c) => count + value(c) <= 31);\n  const share = (test) => (others.length ? fits.filter(test).length / others.length : 0);\n  const block = [\n    1,\n    pegPoints(after).total / 4,\n    count / 31,\n    share((c) => count + value(c) === 15 || count + value(c) === 31),\n    share((c) => c.rank === card.rank),\n    share((c) => pegPoints([...after, c]).parts.some((p) => p.what.startsWith(\'run\'))),\n    pile.length === 0 && value(card) < 5 ? 1 : 0,\n    value(card) / 10,\n    handShow / 10,\n    (myCrib ? 1 : -1) * CRIB_VALUE[threw[0].rank - 1][threw[1].rank - 1] / 10,\n    myCrib ? 1 : -1,\n  ];\n  return [...new Array(DISCARD_FEATURES.length).fill(0), ...block];\n}\n// Players without a brain: random, and rules (a sensible human\'s habits written as code). The table\'s other seat\n// plays one of these while the AI trains, and they are what the trained AI is measured against.\n\n\n/** A random legal choice. */\nconst pickRandom = (list) => list[Math.floor(Math.random() * list.length)];\n\n/**\n * Rules for the discard: keep the four with the most points on average, and give the crib a fifteen or a pair when\n * it is yours, never when it is theirs.\n */\nfunction rulesThrow(hand, myCrib) {\n  let best = 0, bestScore = -Infinity;\n  THROWS.forEach(([i, j], t) => {\n    const kept = hand.filter((_, k) => k !== i && k !== j), a = hand[i], b = hand[j];\n    const crib = (value(a) + value(b) === 15 ? 2 : 0) + (a.rank === b.rank ? 2 : 0) + (a.rank === 5 ? 1 : 0) + (b.rank === 5 ? 1 : 0);\n    const score = expectedHand(kept, hand) + (myCrib ? crib : -crib);\n    if (score > bestScore) { bestScore = score; best = t; }\n  });\n  return best;\n}\n\n/** Rules for pegging: the most points now; never leave the count on 5 or 21; else the highest card. `options`: indexes into hand of the cards that fit. */\nfunction rulesPlay(hand, options, pile) {\n  let best = options[0], bestScore = -Infinity;\n  for (const k of options) {\n    const after = [...pile, hand[k]], count = countOf(after);\n    const score = pegPoints(after).total * 10 - (count === 5 || count === 21 ? 15 : 0) + value(hand[k]) / 10;\n    if (score > bestScore) { bestScore = score; best = k; }\n  }\n  return best;\n}\nconst cards = (text) => text.split(\' \').map((t) => ({ rank: [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\nconst dot = (w, phi) => w.reduce((s, x, i) => s + x * phi[i], 0)\nconst W = [-8.513,10.242,5.71,3.436,-9.135,3.444,0,-0.231,-2.087,-2.275,0.573,-0.189,10.138,8.473,1.64]   // the game\'s brain\n// Why did it choose? Q is a sum of weight × feature, so the gap between its move and the runner-up is a sum of\n// weight × (difference in that feature). Features the two share cancel. Predict first: why the K over the 2?\nconst pile = cards(\'5H\'), hand = cards(\'KS 2C 9D 4H\'), threw = cards(\'8S 3C\'), known = [...hand, ...threw, ...cards(\'6D\'), ...pile]\nconst phis = hand.map((c) => pegFeatures(c, pile, known, 4, false, threw)), qs = phis.map((p) => dot(W, p))\nconst order = qs.map((q, i) => i).sort((a, b) => qs[b] - qs[a]), [best, next] = order\nconsole.log(\'chose \' + cardName(hand[best]) + \' (Q \' + qs[best].toFixed(2) + \') over \' + cardName(hand[next]) + \' (Q \' + qs[next].toFixed(2) + \'): a gap of \' + (qs[best] - qs[next]).toFixed(2))\nconst why = W.map((w, i) => ({ name: FEATURE_NAMES[i].replace(\'peg: \', \'\'), part: w * (phis[best][i] - phis[next][i]) })).filter((p) => Math.abs(p.part) >= 0.01).sort((a, b) => Math.abs(b.part) - Math.abs(a.part))\nfor (const p of why) console.log(\'  \' + p.name.padEnd(30) + (p.part >= 0 ? \'+\' : \'\') + p.part.toFixed(2))\nconsole.log(\'  \' + \'adds up to\'.padEnd(30) + \'+\' + why.reduce((s, p) => s + p.part, 0).toFixed(2))',
              },
              {
                type: 'js',
                instruction: '### 3. Each difficulty, measured (a few seconds)\nPredict first: what τ costs.',
                startCode: '// A seeded random-number generator (mulberry32, Game Studio\'s), so this cell deals the same cards every run.\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\n// Cards and the deck. A card is a plain object, { rank, suit }: rank 1 (ace) to 13 (king), suit one of S H D C.\n// Nothing here draws anything, so the rules can be tested, and an agent can learn, without a screen.\n\nconst SUITS = [\'S\', \'H\', \'D\', \'C\'];\nconst SUIT_SYMBOL = { S: \'♠\', H: \'♥\', D: \'♦\', C: \'♣\' };\nconst RANK_NAME = [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'];\n\n/** What a card counts for, toward 15 and 31: an ace is 1, a face card 10. */\nfunction value(card) { return Math.min(card.rank, 10); }\n\n/** A card\'s name, such as 10♥. */\nfunction cardName(card) { return RANK_NAME[card.rank] + SUIT_SYMBOL[card.suit]; }\n\n/** Its picture: assets/cards/10H.svg (the card tool, scripts/tools/cards.js, draws all 52, and the back). */\nfunction cardImage(card) { return `assets/cards/${RANK_NAME[card.rank]}${card.suit}.svg`; }\n\n/** A fresh deck: the 52 cards in order. */\nfunction newDeck() {\n  const deck = [];\n  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ rank, suit });\n  return deck;\n}\n\n/**\n * Shuffle in place (Fisher–Yates): for each position from the last down, swap in a card chosen at random from those\n * not yet placed. Every order is equally likely. It uses Math.random, which training seeds, so a hand can be replayed.\n */\nfunction shuffle(deck) {\n  for (let i = deck.length - 1; i > 0; i--) {\n    const j = Math.floor(Math.random() * (i + 1));\n    [deck[i], deck[j]] = [deck[j], deck[i]];\n  }\n  return deck;\n}\n\n/** The same card? (Two objects can describe one card.) */\nfunction sameCard(a, b) { return a.rank === b.rank && a.suit === b.suit; }\n// Scoring cribbage: the show (a hand of four with the starter) and pegging (each card as it is played).\n// Every function returns its points with the reasons, so the game can say "fifteen 2, fifteen 4, a pair is 6".\n\n\n/** Every subset of the cards (by bitmask), as lists: 2ⁿ of them, for n cards. */\nfunction subsets(cards) {\n  const out = [];\n  for (let mask = 1; mask < 1 << cards.length; mask++) out.push(cards.filter((_, i) => mask & (1 << i)));\n  return out;\n}\n\n/** Fifteens: 2 for each different set of cards adding up to 15. */\nfunction fifteens(cards) {\n  const sets = subsets(cards).filter((s) => s.reduce((t, c) => t + value(c), 0) === 15);\n  return sets.map((s) => ({ what: \'fifteen\', cards: s, points: 2 }));\n}\n\n/** Pairs: 2 for each pair of cards of the same rank (three of a kind is three pairs, 6; four is six pairs, 12). */\nfunction pairs(cards) {\n  const out = [];\n  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++)\n    if (cards[i].rank === cards[j].rank) out.push({ what: \'pair\', cards: [cards[i], cards[j]], points: 2 });\n  return out;\n}\n\n/** Is this set of cards a run: different ranks, one after another (in any order)? */\nfunction isRun(cards) {\n  const r = cards.map((c) => c.rank).sort((a, b) => a - b);\n  return r.every((x, i) => i === 0 || x === r[i - 1] + 1);\n}\n\n/**\n * Runs: three or more cards in sequence (aces are low: A 2 3 is a run, Q K A is not). Only the longest runs count,\n * once for each different set of cards that makes one: 3 4 4 5 is two runs of three, 6 points.\n */\nfunction runs(cards) {\n  for (let length = cards.length; length >= 3; length--) {\n    const found = subsets(cards).filter((s) => s.length === length && isRun(s));\n    if (found.length) return found.map((s) => ({ what: `run of ${length}`, cards: s, points: length }));\n  }\n  return [];\n}\n\n/**\n * Flush: the four cards in a hand of one suit, 4, and 5 if the starter is too. The crib only scores a flush of all\n * five.\n */\nfunction flush(hand, starter, isCrib) {\n  if (!hand.every((c) => c.suit === hand[0].suit)) return [];\n  if (starter.suit === hand[0].suit) return [{ what: \'flush\', cards: [...hand, starter], points: 5 }];\n  return isCrib ? [] : [{ what: \'flush\', cards: hand, points: 4 }];\n}\n\n/** Nobs: the jack of the starter\'s suit in the hand, 1. */\nfunction nobs(hand, starter) {\n  const jack = hand.find((c) => c.rank === 11 && c.suit === starter.suit);\n  return jack ? [{ what: \'nobs\', cards: [jack], points: 1 }] : [];\n}\n\n/** The show: a hand of four (or the crib) with the starter. { total, parts }. */\nfunction scoreHand(hand, starter, isCrib = false) {\n  const all = [...hand, starter];\n  const parts = [...fifteens(all), ...pairs(all), ...runs(all), ...flush(hand, starter, isCrib), ...nobs(hand, starter)];\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** The count: what the cards played since the last reset add up to. */\nfunction countOf(pile) { return pile.reduce((t, c) => t + value(c), 0); }\n\n/**\n * Pegging: the points for the card just played, the last of `pile` (the cards played since the count was last\n * reset to 0). 15 or 31 is 2; a pair with the card before is 2, three of a kind 6, four 12; a run is one point a card,\n * when the last three or more cards (in any order) make one.\n */\nfunction pegPoints(pile) {\n  const parts = [], count = countOf(pile), card = pile[pile.length - 1];\n  if (count === 15) parts.push({ what: \'fifteen\', points: 2 });\n  if (count === 31) parts.push({ what: \'thirty-one\', points: 2 });\n  let same = 1;\n  while (same < pile.length && pile[pile.length - 1 - same].rank === card.rank) same++;\n  if (same >= 2) parts.push({ what: [\'\', \'\', \'a pair\', \'three of a kind\', \'four of a kind\'][same], points: [0, 0, 2, 6, 12][same] });\n  for (let length = pile.length; length >= 3; length--) {\n    if (isRun(pile.slice(-length))) { parts.push({ what: `run of ${length}`, points: length }); break; }\n  }\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** "fifteen 2, a pair is 4, …": points as they are said aloud. */\nfunction sayParts(parts) {\n  let running = 0;\n  return parts.map((p) => `${p.what} ${(running += p.points)}`).join(\', \');\n}\n// What the AI sees of a move: features, numbers that describe it (lesson: the AI\'s discard; the AI\'s pegging).\n//\n// A linear Q brain values a move as Q = w · φ, one weight per feature, so a feature should be a number that makes\n// a move better or worse in proportion (more points now: better; a bigger chance the other player scores next: worse).\n// Each is scaled to about 0 to 1, so no one feature\'s size swamps the others while the weights are learned.\n//\n// The discard and pegging are different decisions, so each has its own block of features; a move fills its own\n// block and leaves the other at 0, and the two blocks learn separate weights in one list.\n//\n// A seat sees only what a player at the table could: its own cards, the starter, and the cards played. Never the\n// other hand (the developer view shows that to you, not to the AI).\n\n\n/** The 15 ways to throw two of six cards to the crib: [i, j] with i < j. */\nconst THROWS = [];\nfor (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) THROWS.push([i, j]);\n\nconst DISCARD_FEATURES = [\'discard: bias\', \'discard: hand kept (expected points)\', \'discard: crib (expected points, + mine − theirs)\', \'discard: my crib\'];\nconst PEG_FEATURES = [\'peg: bias\', \'peg: points now\', \'peg: count after\', \'peg: chance of 15 or 31 against\', \'peg: chance of a pair against\', \'peg: chance of a run against\', \'peg: leads low\', \'peg: card value\', \'peg: my hand (show)\', \'peg: crib (expected, + mine − theirs)\', \'peg: my crib\'];\nconst FEATURE_NAMES = [...DISCARD_FEATURES, ...PEG_FEATURES];\n\n/** The cards a seat has not seen: the deck less those it knows. */\nfunction unseen(known) {\n  return newDeck().filter((c) => !known.some((k) => sameCard(k, c)));\n}\n\n/** A hand\'s show score averaged over every starter it could get (the cards not in view). */\nfunction expectedHand(kept, known) {\n  const starters = unseen(known);\n  return starters.reduce((t, s) => t + scoreHand(kept, s).total, 0) / starters.length;\n}\n\n/**\n * The average a crib scores holding two cards of these ranks (CRIB_VALUE[a − 1][b − 1]): every other two crib cards\n * and starter, by rank, weighted by how many ways the other 50 cards make them. Suits are ignored (a crib flush needs\n * all five), except nobs: a jack thrown scores 1 when the starter is its suit, about a quarter of the time.\n * cribTable() computes it; the numbers below are its answer, kept here so the game does not spend half a second\n * recomputing them each time it starts (a test checks they agree).\n */\nconst CRIB_VALUE = [\n  [5.49,4.4,4.52,5.43,5.69,4.22,4.04,4.08,4,3.91,4.17,3.81,3.7],\n  [4.4,5.79,6.8,4.8,5.72,4.32,4.24,4.19,4.09,4.03,4.28,3.92,3.82],\n  [4.52,6.8,6.12,5.45,6.38,4.23,4.31,4.25,4.07,4.1,4.36,4,3.89],\n  [5.43,4.8,5.45,6.1,6.95,4.92,4.14,4.26,4.16,4.1,4.36,4,3.89],\n  [5.69,5.72,6.38,6.95,8.96,7.05,6.37,5.71,5.69,6.98,7.24,6.88,6.77],\n  [4.22,4.32,4.23,4.92,7.05,6.25,5.5,4.86,5.53,3.8,4.05,3.69,3.59],\n  [4.04,4.24,4.31,4.14,6.37,5.5,6.07,6.72,4.31,3.68,4,3.64,3.53],\n  [4.08,4.19,4.25,4.26,5.71,4.86,6.72,5.6,4.89,4.26,3.92,3.62,3.52],\n  [4,4.09,4.07,4.16,5.69,5.53,4.31,4.89,5.49,4.8,4.46,3.51,3.46],\n  [3.91,4.03,4.1,4.1,6.98,3.8,3.68,4.26,4.8,5.43,5.03,4.07,3.37],\n  [4.17,4.28,4.36,4.36,7.24,4.05,4,3.92,4.46,5.03,5.93,4.99,4.28],\n  [3.81,3.92,4,4,6.88,3.69,3.64,3.62,3.51,4.07,4.99,5.21,3.93],\n  [3.7,3.82,3.89,3.89,6.77,3.59,3.53,3.52,3.46,3.37,4.28,3.93,4.99],\n];\n\nfunction cribTable() {\n  const table = [];\n  for (let a = 1; a <= 13; a++) {\n    table.push([]);\n    for (let b = 1; b <= 13; b++) {\n      const left = new Array(14).fill(4);\n      left[a]--; left[b]--;\n      let sum = 0, ways = 0;\n      for (let c = 1; c <= 13; c++) for (let d = c; d <= 13; d++) {\n        const pairs = c === d ? left[c] * (left[c] - 1) / 2 : left[c] * left[d];\n        if (!pairs) continue;\n        for (let s = 1; s <= 13; s++) {\n          const w = pairs * (left[s] - (s === c ? 1 : 0) - (s === d ? 1 : 0));\n          if (w <= 0) continue;\n          const crib = [a, b, c, d].map((rank, i) => ({ rank, suit: SUITS[i] }));   // four different suits: no flush\n          sum += w * scoreHand(crib, { rank: s, suit: \'none\' }, true).total;\n          ways += w;\n        }\n      }\n      table[a - 1].push(+(sum / ways + (a === 11 ? 0.25 : 0) + (b === 11 ? 0.25 : 0)).toFixed(2));\n    }\n  }\n  return table;\n}\n\n/** The discard\'s features: throwing hand[i] and hand[j] (of six). myCrib: whether the crib is this seat\'s. */\nfunction discardFeatures(hand, [i, j], myCrib) {\n  const kept = hand.filter((_, k) => k !== i && k !== j), a = hand[i], b = hand[j];\n  const sign = myCrib ? 1 : -1;   // points in the crib are good when it is mine, bad when it is theirs\n  const block = [\n    1,\n    expectedHand(kept, hand) / 10,\n    sign * CRIB_VALUE[a.rank - 1][b.rank - 1] / 10,\n    sign,\n  ];\n  return [...block, ...new Array(PEG_FEATURES.length).fill(0)];\n}\n\n/**\n * Pegging features: playing `card` onto `pile` (the cards since the count was reset). `known`: every card this seat\n * has seen (its hand, the starter, the cards played). `handShow`: its own hand\'s show score, which it knows once the\n * starter is cut. `threw`: the two cards it threw to the crib.\n *\n * The last three are the same for every card it could play: they do not help choose a card, but they let Q predict\n * the points still to come at the show. That matters, because the discard learns its value from the value of the\n * first pegging move (the target R + max Q(S′, ·)): if no pegging feature said how good the crib is, what the discard\n * did for the crib would be lost one step later.\n */\nfunction pegFeatures(card, pile, known, handShow, myCrib, threw) {\n  const after = [...pile, card], count = countOf(after);\n  const others = unseen(known);\n  // The chance that the next card, one the other player could hold, scores against this play.\n  const fits = others.filter((c) => count + value(c) <= 31);\n  const share = (test) => (others.length ? fits.filter(test).length / others.length : 0);\n  const block = [\n    1,\n    pegPoints(after).total / 4,\n    count / 31,\n    share((c) => count + value(c) === 15 || count + value(c) === 31),\n    share((c) => c.rank === card.rank),\n    share((c) => pegPoints([...after, c]).parts.some((p) => p.what.startsWith(\'run\'))),\n    pile.length === 0 && value(card) < 5 ? 1 : 0,\n    value(card) / 10,\n    handShow / 10,\n    (myCrib ? 1 : -1) * CRIB_VALUE[threw[0].rank - 1][threw[1].rank - 1] / 10,\n    myCrib ? 1 : -1,\n  ];\n  return [...new Array(DISCARD_FEATURES.length).fill(0), ...block];\n}\n// Players without a brain: random, and rules (a sensible human\'s habits written as code). The table\'s other seat\n// plays one of these while the AI trains, and they are what the trained AI is measured against.\n\n\n/** A random legal choice. */\nconst pickRandom = (list) => list[Math.floor(Math.random() * list.length)];\n\n/**\n * Rules for the discard: keep the four with the most points on average, and give the crib a fifteen or a pair when\n * it is yours, never when it is theirs.\n */\nfunction rulesThrow(hand, myCrib) {\n  let best = 0, bestScore = -Infinity;\n  THROWS.forEach(([i, j], t) => {\n    const kept = hand.filter((_, k) => k !== i && k !== j), a = hand[i], b = hand[j];\n    const crib = (value(a) + value(b) === 15 ? 2 : 0) + (a.rank === b.rank ? 2 : 0) + (a.rank === 5 ? 1 : 0) + (b.rank === 5 ? 1 : 0);\n    const score = expectedHand(kept, hand) + (myCrib ? crib : -crib);\n    if (score > bestScore) { bestScore = score; best = t; }\n  });\n  return best;\n}\n\n/** Rules for pegging: the most points now; never leave the count on 5 or 21; else the highest card. `options`: indexes into hand of the cards that fit. */\nfunction rulesPlay(hand, options, pile) {\n  let best = options[0], bestScore = -Infinity;\n  for (const k of options) {\n    const after = [...pile, hand[k]], count = countOf(after);\n    const score = pegPoints(after).total * 10 - (count === 5 || count === 21 ? 15 : 0) + value(hand[k]) / 10;\n    if (score > bestScore) { bestScore = score; best = k; }\n  }\n  return best;\n}\nconst cards = (text) => text.split(\' \').map((t) => ({ rank: [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\nconst dot = (w, phi) => w.reduce((s, x, i) => s + x * phi[i], 0)\nconst W = [-8.513,10.242,5.71,3.436,-9.135,3.444,0,-0.231,-2.087,-2.275,0.573,-0.189,10.138,8.473,1.64]   // the game\'s brain\n// Choosing at a temperature τ: each move with probability ∝ e^(Q / τ). τ = 0 means always the best.\nfunction probabilities(qs, tau) {\n  if (tau <= 0) { const best = qs.indexOf(Math.max(...qs)); return qs.map((_, i) => (i === best ? 1 : 0)) }\n  const m = Math.max(...qs), e = qs.map((q) => Math.exp((q - m) / tau)), z = e.reduce((a, b) => a + b, 0)\n  return e.map((x) => x / z)\n}\n\nfunction playHand(chooser, dealer) {\n  const deck = shuffle(newDeck()), h = [[], []], crib = [], threw = [[], []], score = [0, 0], AI = 1, history = []\n  for (let k = 0; k < 6; k++) for (const s of [1 - dealer, dealer]) h[s].push(deck.pop())\n  let starter = null\n  const known = () => [...h[AI], ...threw[AI], ...(starter ? [starter] : []), ...history.filter((x) => x.s !== AI).map((x) => x.c)]\n  const t0 = rulesThrow(h[0], dealer === 0), t1 = chooser(THROWS.map((t) => discardFeatures(h[AI], t, dealer === AI)))\n  for (const [s, t] of [[0, t0], [AI, t1]]) { const [i, j] = THROWS[t]; threw[s] = [h[s][i], h[s][j]]; crib.push(...threw[s]); h[s] = h[s].filter((_, k) => k !== i && k !== j) }\n  starter = deck.pop(); if (starter.rank === 11) score[dealer] += 2\n  const show = scoreHand(h[AI], starter).total, played = [[], []]; let pile = [], turn = 1 - dealer, last = null\n  const opts = (s) => h[s].map((_, k) => k).filter((k) => !played[s].includes(k) && countOf(pile) + value(h[s][k]) <= 31)\n  while (played[0].length + played[1].length < 8) {\n    if (countOf(pile) === 31) pile = []\n    const o = opts(turn)\n    if (!o.length) { if (opts(1 - turn).length) { turn = 1 - turn; continue } score[last]++; pile = []; turn = 1 - last; continue }\n    const k = turn === AI ? o[chooser(o.map((k) => pegFeatures(h[AI][k], pile, known(), show, dealer === AI, threw[AI])))] : rulesPlay(h[0], o, pile)\n    played[turn].push(k); pile.push(h[turn][k]); history.push({ s: turn, c: h[turn][k] }); last = turn\n    score[turn] += pegPoints(pile).total; turn = 1 - turn\n  }\n  if (countOf(pile) !== 31) score[last]++\n  score[0] += scoreHand(h[0], starter).total; score[AI] += show; score[dealer] += scoreHand(crib, starter, true).total\n  return score[AI] - score[0]\n}\n// Each difficulty against the rules player, the same 300 deals each. Predict first: how much does each level of\n// temperature cost per hand? (A few seconds.)\nconst real = Math.random\nfor (const [level, tau] of [[\'Hard\', 0], [\'Medium\', 0.6], [\'Easy\', 2]]) {\n  const pickRand = seeded(5)\n  const chooser = (phis) => { const p = probabilities(phis.map((x) => dot(W, x)), tau); let u = pickRand(), i = 0; while (i < p.length - 1 && u >= p[i]) { u -= p[i]; i++ } return i }\n  Math.random = seeded(2024); let sum = 0\n  for (let k = 0; k < 300; k++) sum += playHand(chooser, k % 2)\n  console.log(level.padEnd(7) + \' τ \' + String(tau).padEnd(4) + (sum / 300 >= 0 ? \'+\' : \'\') + (sum / 300).toFixed(2) + \' points a hand against the rules player\')\n}\nMath.random = real',
              },
              {
                type: 'js',
                instruction: '### 4. Games, and how sure\nPredict first: is Hard better than the rules?',
                startCode: "// Games, not hands: whole games to 121 against the rules player, 150 each (measured in Game Studio's tests, the\n// real game playing itself). How sure can we be? A win rate p from n games is uncertain by about √(p(1−p)/n).\n// Predict first: is Hard really better than the rules player?\nconst results = [['Easy', 26], ['Medium', 57], ['Hard', 80]], n = 150\nfor (const [level, wins] of results) {\n  const p = wins / n, se = Math.sqrt(p * (1 - p) / n)\n  console.log(level.padEnd(7) + ' won ' + wins + ' of ' + n + ' = ' + (100 * p).toFixed(0) + '%, give or take ' + (100 * 2 * se).toFixed(0) + ' points (95%): ' + (100 * (p - 2 * se)).toFixed(0) + '% to ' + (100 * (p + 2 * se)).toFixed(0) + '%')\n}\nconsole.log('Hard\\'s range includes 50%: it plays as well as the rules player, and these games cannot show it is better.')",
              },
              {
                type: 'challenge',
                instruction: '### 5. Challenge: softmax probabilities\nFour cases check it.',
                startCode: "// Challenge: write probabilities(qs, tau): at τ = 0 all on the best move; above 0, each ∝ e^(q / τ). Subtract the\n// largest q before exponentiating, so large values do not overflow. The checks compare with the answers.\nfunction probabilities(qs, tau) {\n  return qs.map(() => 1 / qs.length)   // your code\n}\nconst cases = [[[1, 0], 0, [1, 0]], [[1, 0], 1, [0.7311, 0.2689]], [[-8.93, -10.52], 0.6, [0.9341, 0.0659]], [[1000, 999, 0], 1, [0.7311, 0.2689, 0]]]\nlet ok = 0\nfor (const [qs, tau, want] of cases) {\n  const got = probabilities(qs, tau)\n  if (got.every((p, i) => Math.abs(p - want[i]) < 1e-4)) ok++\n  else console.log('probabilities(' + JSON.stringify(qs) + ', ' + tau + ') = ' + JSON.stringify(got.map((p) => +p.toFixed(4))) + '; it should be ' + JSON.stringify(want) + '.')\n}\nconsole.log(ok === cases.length ? '✓ All 4 right, even with Q in the thousands.' : ok + ' of 4 right.')",
                solutionCode: "// Challenge: write probabilities(qs, tau): at τ = 0 all on the best move; above 0, each ∝ e^(q / τ). Subtract the\n// largest q before exponentiating, so large values do not overflow. The checks compare with the answers.\nfunction probabilities(qs, tau) {\n  if (tau <= 0) { const best = qs.indexOf(Math.max(...qs)); return qs.map((_, i) => (i === best ? 1 : 0)) }\n  const m = Math.max(...qs), e = qs.map((q) => Math.exp((q - m) / tau)), z = e.reduce((a, b) => a + b, 0)\n  return e.map((x) => x / z)\n}\nconst cases = [[[1, 0], 0, [1, 0]], [[1, 0], 1, [0.7311, 0.2689]], [[-8.93, -10.52], 0.6, [0.9341, 0.0659]], [[1000, 999, 0], 1, [0.7311, 0.2689, 0]]]\nlet ok = 0\nfor (const [qs, tau, want] of cases) {\n  const got = probabilities(qs, tau)\n  if (got.every((p, i) => Math.abs(p - want[i]) < 1e-4)) ok++\n  else console.log('probabilities(' + JSON.stringify(qs) + ', ' + tau + ') = ' + JSON.stringify(got.map((p) => +p.toFixed(4))) + '; it should be ' + JSON.stringify(want) + '.')\n}\nconsole.log(ok === cases.length ? '✓ All 4 right, even with Q in the thousands.' : ok + ' of 4 right.')",
              },
              {
                type: 'markdown',
                instruction: '### 6. The code you wrote, line by line\n\nIn the order of the task\'s steps.\n\n**The title screen**\n\n```js\nconst panel = `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="320" viewBox="0 0 620 320">\n  <rect x="2" y="2" width="616" height="316" rx="18" fill="#08351f" stroke="#f4c542" stroke-width="4" opacity="0.96"/></svg>`;\n  project.writeSvg(\'assets/button-small.svg\', button(140, 48));\n  project.writeSvg(\'assets/panel.svg\', panel);\nproject.runTool(\'scripts/tools/table.js\')\n```\n\nTwo more pictures in the table tool, a dark green panel with a gold edge and a smaller button, and the tool run again (it writes all its pictures; the others come out the same).\n\n```js\nconst table = project.scene(\'scenes/cribbage.scene\')\ntable.add(\'CanvasLayer\', { name: \'Overlay\', layer: 2 })\ntable.add(\'Node2D\', { name: \'Title\', parent: \'Overlay\' })\ntable.add(\'Sprite2D\', { name: \'Panel\', parent: \'Overlay/Title\', position: { x: 480, y: 290 }, texture: \'assets/panel.svg\' })\ntable.add(\'Label\', { name: \'Heading\', parent: \'Overlay/Title\', position: { x: 395, y: 160 }, fontSize: 40, color: \'#f4c542\', text: \'Cribbage\' })\ntable.add(\'Label\', { name: \'Blurb\', parent: \'Overlay/Title\', position: { x: 215, y: 222 }, fontSize: 16, color: \'#d1fae5\', text: \'Play to 121 against an AI that learned the game by playing it.\\nChoose how well it plays (or press 1, 2 or 3):\' })\n```\n\nA second CanvasLayer, on layer 2 so it is drawn over the HUD (layer 1), with a Node2D Title holding everything on it: hiding Title hides it all. A panel, a heading and a line of text (`\\n` starts a new line).\n\n```js\nfor (const [name, x] of [[\'Easy\', 330], [\'Medium\', 480], [\'Hard\', 630]]) {\n  table.add(\'Sprite2D\', { name, parent: \'Overlay/Title\', position: { x, y: 330 }, texture: \'assets/button-small.svg\' })\n  table.add(\'Label\', { name: name + \'Text\', parent: \'Overlay/Title\', position: { x: x - 6 * name.length, y: 319 }, fontSize: 18, color: \'#3b2a00\', text: name })\ntable.add(\'Label\', { name: \'Hint\', parent: \'Overlay/Title\', position: { x: 215, y: 390 }, fontSize: 13, color: \'#a7f3d0\', text: \'Click cards to choose them. D shows the developer view: the AI\\\'s hand, and what its brain\\nthinks of every move it could make.\' })\n```\n\nThree buttons in a row, each a picture with its name over it, roughly centred (6 pixels back for each letter); and a hint.\n\n**scripts/table.js**\n\n```js\nexport const DIFFICULTY = { Easy: 2, Medium: 0.6, Hard: 0 };\n  difficulty = \'Medium\';\n```\n\nHow the AI chooses at each difficulty: its temperature. 0 always plays the move it values most; above 0 it chooses by softmax, a move worth 1 point less being e^(−1/τ) as likely (the math section). The table starts at Medium.\n\n```js\n      title: scene.get(\'Overlay/Title\'),\n    const title = this.phase === \'title\';\n    this.hud.title.visible = title;\n```\n\nThe title is shown exactly while the phase is \'title\'.\n\n```js\n    if (ai.training) { this.newHand(); return; }\n    this.phase = \'title\';\n```\n\nA new game now starts at the title screen (its cards cleared), except in training, which deals at once.\n\n```js\n    if (this.phase === \'title\') {\n      const names = Object.keys(DIFFICULTY);\n      names.forEach((name, i) => { if (picked === i || (click && this.hits(`Overlay/Title/${name}`, 140, 48))) this.start(name); });\n```\n\nAt the title, key 1, 2 or 3 (the first three picks), or a click on a button, starts that difficulty.\n\n```js\n  start(difficulty) {\n    this.difficulty = difficulty;\n    this.opponent.temperature = DIFFICULTY[difficulty];\n```\n\nstart() sets the difficulty and the Opponent\'s temperature, then deals (newHand).\n\n```js\n    } else if (ai.training || this.autoplay) {\n      if (this.phase === \'title\') this.start(this.difficulty);\n      else this.partnerMove();\n    } else this.takeInput();\n```\n\nWhen the game plays itself, the title is passed at the table\'s own difficulty.\n\n```js\n    const dealer = this.phase === \'title\' ? \'\' : `   Dealer: ${NAMES[this.dealer]}   AI: ${this.difficulty}${ai.has(this.opponent.brain) ? \'\' : \' (no brain yet: it plays by rules)\'}`;\n    this.hud.status.text = `You ${this.scores[YOU]}   AI ${this.scores[AI]}${dealer}`;\n    this.hud.cribLabel.text = this.phase === \'title\' ? \'\' : this.dealer === YOU ? \'Your crib\' : "AI\'s crib";\n```\n\nThe status line adds the difficulty, and says nothing of dealers or cribs at the title.\n\n**scripts/opponent.js**\n\n```js\n  temperature = 0;\n    if (!ai.has(this.brain)) lines.push(\'No brain yet: it plays by the rules.\');\n    else lines.push(`Difficulty: ${t.difficulty} (temperature ${this.temperature})`);\n```\n\nThe agent\'s temperature: Game Studio\'s agent runtime chooses by it. The developer view shows it.\n\n**Every move it could have made**\n\n```js\n  moveName(seat, action) {\n    if (action >= 15) return `play ${cardName(this.hands[seat][action - 15])}`;\n    const [i, j] = THROWS[action];\n    return `throw ${cardName(this.hands[seat][i])} ${cardName(this.hands[seat][j])}`;\n```\n\nIn table.js: a move in words, "play 7♣" or "throw 5♥ J♦".\n\n```js\n    this.last = null;\n    if (!ai.training) this.remember(action);\n  remember(action) {\n    const t = this.table, d = t.decision(AI, true);\n    this.last = { kind: d.kind, chosen: t.moveName(AI, action), ranked: [], why: [], over: \'\' };\n    if (!ai.has(this.brain)) return;\n```\n\nIn opponent.js: it starts with nothing to remember. act() remembers each move before making it (not in training: nobody is watching, and it would slow training). What it decided between, and what it chose; with no brain, that is all there is.\n\n```js\n    const phis = d.legal.map((a) => this.features(a)), values = ai.values(this.brain, phis);\n    this.last.ranked = d.legal.map((a, i) => ({ a, name: t.moveName(AI, a), q: values[i], phi: phis[i] })).sort((x, y) => y.q - x.q);\n```\n\nEvery legal move\'s features (φ, phi) and the brain\'s value of each, Q = w · φ (`ai.values`); then every move with its name, value and features, best first.\n\n```js\n    const last = this.last;\n    if (!last) return lines.join(\'\\n\');\n    lines.push(\'\', `It chose: ${last.chosen}`);\n    if (last.ranked.length) {\n      lines.push(last.kind === \'throw\' ? \'Its best throws, by Q:\' : \'Every card it could play, by Q:\');\n      for (const m of last.ranked.slice(0, 5)) lines.push(`  ${m.name.padEnd(15)} ${m.q.toFixed(2)}`);\n```\n\nexplain() adds the last decision: what it chose, and the five best moves with their values (`padEnd` lines the numbers up).\n\n**Why**\n\n```js\n    const chosen = this.last.ranked.find((m) => m.a === action), other = this.last.ranked.find((m) => m.a !== action);\n    if (!other) return;\n    this.last.over = other.name;\n    const w = ai.weights(this.brain);\n```\n\nIts move, and the best move it did not choose (none if there was only one).\n\n```js\n    this.last.why = chosen.phi.map((x, i) => ({ name: this.featureNames[i].replace(/^\\w+: /, \'\'), part: w[i] * (x - other.phi[i]) }))\n      .filter((p) => Math.abs(p.part) >= 0.01).sort((a, b) => Math.abs(b.part) - Math.abs(a.part)).slice(0, 4);\n```\n\nQ is a sum of weight × feature, so the difference between two moves\' Q is the sum, over the features, of weight × (the difference in that feature). Each of those terms is a reason, named by its feature (without \'peg: \' or \'discard: \'); the tiny ones are dropped, and the four biggest kept, biggest first.\n\n```js\n      if (last.over) lines.push(`Why, over ${last.over} (weight × difference):`);\n      for (const p of last.why) lines.push(`  ${p.name.slice(0, 30).padEnd(31)} ${p.part >= 0 ? \'+\' : \'\'}${p.part.toFixed(2)}`);\n```\n\nThe developer view lists them, with their signs.',
              },
              {
                type: 'markdown',
                instruction: "### 7. Questions you might have\n\n**Why one number for the difficulty, instead of three brains?** One brain trained once, played at three temperatures, costs nothing and keeps the three levels in order: Easy is the same player, making more of its nearly-as-good moves.\n\n**Does Hard always win?** No: cards decide a lot in cribbage. The last step measures it over 24 games each: Hard wins more often than Easy, which is what a difficulty should do.\n\n**Are the reasons in the developer view the real reasons?** For a linear brain, exactly: the difference in Q between two moves is the sum of the listed terms (and the small ones left out). That is a reason linear Q is good to learn from.\n\n**Why remember only when not training?** Nobody looks at the developer view while it trains, and ranking every move every turn would slow thousands of hands.\n\n**Why is the title a CanvasLayer on layer 2?** CanvasLayers draw in order of their layer: the HUD's words and the title over the cards, the title over the HUD.",
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Difficulty, and why the AI chose',
        props: {
          task: 'crib-difficulty',
          lesson: 'mg10-012',
          checkpoint: 'cp-mg10-012-4',
        },
      },
    ],
  },

  math: {
    prose: [
      "**Under the hood (optional).** Softmax: $\\pi(a \\mid s) = e^{Q(s,a)/\\tau} / \\sum_{b \\in A(s)} e^{Q(s,b)/\\tau}$. The ratio of two moves' chances is $e^{(Q_a - Q_b)/\\tau}$, so only differences in Q matter; subtracting the largest Q before exponentiating changes nothing but keeps the numbers from overflowing.",
      'The explanation is exact: $Q(s, a) - Q(s, b) = \\mathbf{w} \\cdot (\\boldsymbol{\\phi}(s, a) - \\boldsymbol{\\phi}(s, b)) = \\sum_i w_i (\\phi_i(s,a) - \\phi_i(s,b))$.',
      'A win rate $\\hat{p}$ from $n$ independent games has standard error $\\sqrt{\\hat{p}(1-\\hat{p})/n}$; about 95% of the time the true rate is within two of them: for 80 of 150, $0.533 \\pm 0.081$.',
    ],
    equations: [
      {
        label: 'Softmax choice',
        latex: '\\pi(a \\mid s) = \\frac{e^{Q(s,a)/\\tau}}{\\sum_{b} e^{Q(s,b)/\\tau}}',
      },
      {
        label: 'Why: the gap',
        latex: 'Q_a - Q_b = \\sum_i w_i\\,(\\phi_{a,i} - \\phi_{b,i})',
      },
      {
        label: 'Win rate uncertainty',
        latex: '\\hat{p} \\pm 2\\sqrt{\\hat{p}(1-\\hat{p})/n}',
      },
    ],
    callouts: [],
    visualizations: [],
  },

  rigor: {
    prose: [
      'Softmax at temperature τ is the policy that maximises expected Q plus τ times its entropy: τ trades value for unpredictability, which is why it suits difficulty.',
      'The per-hand measurement and the game measurement answer different questions: points a hand is more sensitive (it averages many hands with less noise per unit), but players care about games; report both.',
      'This chapter is the whole path: game, art, rules, flow, view, baseline, agent, features, learning, difficulty, explanation, evaluation.',
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [
    {
      id: 'mg10-012-ex1',
      title: 'Chances at a temperature',
      difficulty: 'easy',
      problem: 'Two moves, Q −9 and −10, at τ 1. The chances?',
      steps: [
        {
          expression: 'e^{1} : 1 \\approx 2.72 : 1',
          annotation: 'One point better.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: '73% and 27%.',
    },
    {
      id: 'mg10-012-ex2',
      title: 'A reason',
      difficulty: 'medium',
      problem: 'The weight of "points now" is 3.44; its move pegs 2 (feature 0.5) and the runner-up 0. That term of the reason?',
      steps: [
        {
          expression: '3.44 \\times (0.5 - 0) = 1.72',
          annotation: 'Weight × difference.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: '+1.72 (cell 2).',
    },
    {
      id: 'mg10-012-ex3',
      title: 'How sure',
      difficulty: 'hard',
      problem: 'Medium won 57 of 150 games. A 95% range?',
      steps: [
        {
          expression: '\\hat{p} = 0.38',
          annotation: 'The win rate.',
          strategyTitle: 'Step 1',
        },
        {
          expression: '2\\sqrt{0.38 \\times 0.62/150} \\approx 0.079',
          annotation: 'Two standard errors.',
          strategyTitle: 'Step 2',
        },
      ],
      answer: 'About 30% to 46% (cell 4).',
    },
  ],

  challenges: [
    {
      id: 'mg10-012-ch1',
      title: 'A fourth level',
      difficulty: 'easy',
      problem: 'Add "Beginner". What temperature?',
      hint: 'Higher than Easy.',
      answer: 'For example τ 4, added to DIFFICULTY and the title screen.',
      walkthrough: [],
    },
    {
      id: 'mg10-012-ch2',
      title: 'Surprising reasons',
      difficulty: 'medium',
      problem: 'The developer view says it threw a 5 to your crib "because of its hand kept". Is that a bug?',
      hint: 'The crib term.',
      answer: 'Not necessarily: the kept-hand gain outweighed giving your crib a five; if it happens often, the crib weight may be too small, a feature or training problem.',
      walkthrough: [],
    },
    {
      id: 'mg10-012-ch3',
      title: 'Prove Hard is better',
      difficulty: 'hard',
      problem: 'How many games would show that a true 53% win rate is above 50%?',
      hint: 'Two standard errors below 0.53 must clear 0.50.',
      answer: '2√(0.25/n) < 0.03 needs n > about 1,100 games.',
      walkthrough: [],
    },
  ],

  semantics: {
    core: [
      {
        symbol: 'temperature τ',
        meaning: 'How far from always-best its choices are; Hard 0.',
      },
      {
        symbol: 'softmax',
        meaning: 'Each move ∝ e^(Q/τ).',
      },
      {
        symbol: 'DIFFICULTY',
        meaning: 'Easy 2, Medium 0.6, Hard 0.',
      },
      {
        symbol: 'why',
        meaning: 'Weight × feature difference from the runner-up.',
      },
      {
        symbol: '± 2 SE',
        meaning: 'The range a win rate could really be in.',
      },
    ],
    rulesOfThumb: [
      'Tune difficulty by temperature, not retraining.',
      "Explain with the model's own terms.",
      'Report uncertainty with every win rate.',
    ],
  },

  misconceptions: [
    {
      falseBelief: 'An easy AI should make random mistakes.',
      whyStudentsThinkIt: 'Mistakes are random.',
      correctionExample: 'ε-random plays a terrible move 10% of the time; softmax 4% (cell 1).',
      contrastCase: 'People mostly pick nearly-as-good moves.',
    },
    {
      falseBelief: '53% of 150 games shows it is better than 50%.',
      whyStudentsThinkIt: '53 > 50.',
      correctionExample: 'The range is 45% to 61% (cell 4).',
      contrastCase: 'About 1,100 games could show it.',
    },
  ],

  transferPrompts: [
    {
      situation: "Difficulty for a racing game's learned drivers.",
      competingTechniques: [
        'Train a brain per level',
        'One brain, softmax over its actions at a temperature per level',
      ],
      whyThisTechniqueWins: 'One training run, smooth control, human-like mistakes.',
    },
    {
      situation: 'A designer asks why the AI did something.',
      competingTechniques: ['Guess', 'Show the terms of the Q difference'],
      whyThisTechniqueWins: 'An exact answer from the model itself.',
    },
  ],

  debugging: [
    {
      commonError: 'exp(Q / τ) without subtracting the largest Q.',
      symptom: 'Infinity and NaN chances when Q is large.',
      whyItHappened: 'e^1000 overflows.',
      repairStrategy: "Subtract the largest Q first (the challenge's last case).",
    },
    {
      commonError: 'Explaining against the worst move.',
      symptom: 'Every reason looks huge.',
      whyItHappened: 'The comparison that matters is with the runner-up.',
      repairStrategy: 'Compare with the best move it did not choose.',
    },
    {
      commonError: 'Judging on the training deals.',
      symptom: 'The AI looks better than it plays.',
      whyItHappened: 'It was tuned on those deals.',
      repairStrategy: 'Fresh deals, the same for each player.',
    },
  ],

  mastery: {
    targetLevel: 3,
    solveIndependently: 'Give a learned AI difficulty levels, a why view and an honest measurement.',
    explainVerbally: 'Explain temperature, the reason sum and uncertainty.',
    detectIncorrectApplication: 'Spot random-mistake difficulty, overflowing softmax and overclaimed win rates.',
    transferToUnfamiliar: 'Ship a learned opponent for another game.',
  },

  assessment: {
    questions: [
      {
        id: 'mg10-012-assess-1',
        type: 'choice',
        text: 'At τ 2, a move 1 point worse is',
        options: [
          'e^(−0.5) ≈ 0.61 as likely',
          'Half as likely',
          'Never chosen',
          'Equally likely',
        ],
        answer: 'e^(−0.5) ≈ 0.61 as likely',
        hint: 'e^(−ΔQ/τ).',
      },
    ],
  },

  quiz: [
    {
      id: 'mg10-012-quiz-1',
      type: 'choice',
      text: 'At Easy (τ 2), on a 5 holding K 2 9 4, it plays the king',
      options: ['44% of the time', '100%', '86%', '25%'],
      answer: '44% of the time',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg10-012-quiz-2',
      type: 'choice',
      text: 'The biggest reason for the king over the 2 is',
      options: ['Points now, +1.72', 'Card value', 'Its hand', 'The crib'],
      answer: 'Points now, +1.72',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg10-012-quiz-3',
      type: 'choice',
      text: 'Easy against the rules player makes about',
      options: ['−1.95 points a hand', '+0.21', '−4.8', '0'],
      answer: '−1.95 points a hand',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg10-012-quiz-4',
      type: 'choice',
      text: 'Hard won 80 of 150 games. That shows',
      options: [
        'It plays as well as the rules player',
        'It is clearly better',
        'It is worse',
        'Nothing at all',
      ],
      answer: 'It plays as well as the rules player',
      hints: ['Cell 4.'],
      reviewSection: 'Cell 4',
    },
    {
      id: 'mg10-012-quiz-5',
      type: 'choice',
      text: 'Softmax mistakes look human because',
      options: [
        'Nearly-as-good moves are picked far more than bad ones',
        'They are random',
        'They are rare',
        'They copy the player',
      ],
      answer: 'Nearly-as-good moves are picked far more than bad ones',
      hints: ['Mistakes that look human.'],
      reviewSection: 'Intuition — mistakes',
    },
    {
      id: 'mg10-012-quiz-6',
      type: 'choice',
      text: 'Self-play means training with your seat played by',
      options: ['Its own saved brain', 'The rules player', 'Random play', 'You'],
      answer: 'Its own saved brain',
      hints: ['Self-play.'],
      reviewSection: 'Intuition — self-play',
    },
  ],

  checkpoints: [
    {
      id: 'cp-mg10-012-1',
      label: 'Read temperature and human-like mistakes',
      type: 'read',
    },
    {
      id: 'cp-mg10-012-2',
      label: 'Read why it chose',
      type: 'read',
    },
    {
      id: 'cp-mg10-012-3',
      label: 'Run the notebook',
      type: 'read',
    },
    {
      id: 'cp-mg10-012-4',
      label: 'Complete "Difficulty, and why the AI chose" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg10-012-5',
      label: 'Read how good it is, self-play and shipping',
      type: 'read',
    },
    {
      id: 'cp-mg10-012-6',
      label: 'Work through a reason',
      type: 'example',
    },
    {
      id: 'cp-mg10-012-7',
      label: 'Work through how sure',
      type: 'example',
    },
    {
      id: 'cp-mg10-012-8',
      label: 'Pass the softmax challenge',
      type: 'challenge',
    },
  ],

  chapter: 'making-games-10',
}
