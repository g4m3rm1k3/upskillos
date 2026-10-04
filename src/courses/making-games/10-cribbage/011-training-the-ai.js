export default {
  order: 11,

  id: 'mg10-011',

  slug: 'training-the-ai',

  title: 'Training the AI: Linear Q-Learning',

  subtitle: 'Fifteen weights, learned from playing hands against the rules player: the update by hand, real learning in the notebook, and the brain the game ships.',

  tags: [
    'game-studio',
    'cribbage',
    'machine-learning',
    'reinforcement-learning',
    'q-learning',
    'function-approximation',
    'semi-gradient',
  ],

  aliases: 'linear q learning semi gradient td update weights features alpha schedule epsilon greedy legal moves target max over next legal moves checkpoints held out evaluation train an agent features linear q save brain weights table',

  timeToComplete: 75,

  coreConcept: 'Linear Q-learning values each move as Q(s, a) = w · φ(s, a) and learns the weights from play. After each move the AI earns R before its next turn, where its best legal move is worth max Q′. The target is R + max Q′ (just R when the hand is over); the error δ = target − w · φ; and every weight moves by α δ φᵢ, in proportion to how much of its feature the move had. That is the Q-learning update with "the table cell" replaced by "the weights, as much as each feature was present". Exploration is ε-greedy among legal moves; α starts large and shrinks so the weights settle; greedy checks on held-out deals keep the best weights. 8,000 hands against the rules player make the game\'s brain: from −4.7 points a hand (random) to the rules player\'s level.',

  prerequisites: ['mg10-010', 'mg9-008'],

  nextLesson: 'mg10-012',

  hook: {
    question: 'The AI has fifteen numbers for every move it could make, and fifteen weights that turn them into a value. They start at zero, so it plays at random. How does playing hands, and seeing what they score, turn those weights into a cribbage player?',
    realWorldContext: "Linear function approximation is where TD-Gammon's ancestors began and how many game AIs still learn: a few well-chosen features and a weight each, learned from play. Its update is the same one deep reinforcement learning uses, with a network in place of the dot product.",
  },

  intuition: {
    prose: [
      "**A move's value is a weighted sum.** Q(s, a) = w₁φ₁ + w₂φ₂ + … + w₁₅φ₁₅: each feature times its weight, added up. With the finished brain, on a 5 holding K 2 9 4, the king is worth −8.93 and the others about −10.5 to −10.9 (cell 1). Q is the points the AI expects from here to the end of the hand, its points minus yours, so negative here means the hand is going your way; what matters is that the king is about 1.6 better, mostly its points now (+1.72).",
      "**The target, as in lesson 9.1.** After a move the AI earns R before its next turn, and there it will choose among its legal moves, the best worth max Q′. So the move was worth about R + max Q′ (γ = 1: a hand's points count the same whenever they come); at the end of the hand there is no next move, and the target is just R. The error is δ = target − Q.",
      '**The update.** A table would move one cell by α δ. A linear Q moves every weight by α δ φᵢ: each weight in proportion to how much of its feature the move had. If the move scored better than expected (δ > 0), the features it had become more valuable; if worse, less. Cell 2 does one update by hand: Q −3.96, target −5.10, δ −1.14, and with α = 0.1 the bias falls by 0.114 and "points now" by 0.057 (half as much, since its feature was 0.5); the new Q is −4.13, closer to the target. This is called semi-gradient: the target also depends on w but is treated as fixed.',
      '**Choosing while learning.** ε-greedy among the legal moves only: with probability ε a random legal move, otherwise the move with the highest Q. ε falls from 0.2 to 0.02 over training, so it explores early and plays its best late.',
      "**Learning, for real.** Cell 3 runs the whole method on the game's own rules: zero weights, the rules player opposite, 400 hands. Judged on the same 200 held-out deals, it starts at −5.22 points a hand (it plays at random: all moves look equal), is still −5.63 after 100 hands, and reaches +0.10 after 400, the rules player's level. Other training seeds land elsewhere at 400 hands (−0.80, −4.39): learning from noisy hands is itself noisy, which is why the real recipe trains far longer.",
      "**Why α shrinks.** A hand's points vary by about 8 either way, so every update chases a noisy sample. With a fixed α = 0.1, an estimate of an average of 5 still swings between 2.2 and 8.0 after 4,000 samples; with α falling from 0.1 to 0.005 it settles between 4.8 and 5.3 (cell 4). Large steps early learn fast; small steps late average out the noise.",
      '**Checkpoints.** Every so often during training the greedy policy plays a fixed set of held-out deals, and the best weights so far are kept. A caution measured while building this game: the best of many checks of 100 hands looked like +0.5 a hand, while the same weights on 1,000 fresh deals made +0.2. Picking the best of noisy scores flatters it; judge the final brain on new deals.',
      "**The game's brain.** 8,000 hands against the rules player, α 0.1 → 0.005, ε 0.2 → 0.02, γ 1, seed 1, a greedy check every 250 hands. On 1,000 fresh deals it makes +0.21 points a hand against the rules player, where the rules player itself makes +0.16 and random play −4.70: it learned, from nothing, to play as well as the rules a sensible player would write.",
      "**What it learned.** Cell 5 prints the weights. The throw values the kept hand at 10.2 per 10 expected points and the crib at 5.7. Pegging: points now +3.4, and all three chances against it negative (pair −2.1, run −2.3, 15 or 31 −0.2), its own show +10.1 and the crib +8.5. It discovered the rules player's habits (score now, do not leave the other player a pair or a run) and put numbers on them.",
      '**In Game Studio.** Run › Train an agent…, environment { "agent": "Opponent" }, method Features (linear Q). Train draws the return per hand and the greedy checks against random play\'s line, and WHAT IT LEARNED shows the weights with bars. Save as brain writes brains/cribbage.json; the Opponent\'s brain field names it, and the engine then drives it on its turns.',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: linear Q-learning',
        body: "Step 1. w = 0. Step 2. At each decision: the legal moves' features φ; ε-greedy by w · φ. Step 3. Make the move; play on to the next decision; R is what it earned. Step 4. target = R + max over the next legal moves of w · φ′ (or R at the end). Step 5. δ = target − w · φ; w ← w + α δ φ. Step 6. ε and α fall over training. Step 7. Every so often, judge the greedy policy on held-out deals; keep the best. Step 8. Judge the final brain on fresh deals.",
      },
      {
        type: 'warning',
        title: 'Large α with large features diverges',
        body: 'Each update changes Q by about α δ |φ|². With features near 1 and α = 0.1 that is fine; with a feature of 12 it would overshoot the target and grow without limit. Scale features (10.10) and start α no larger than about 0.1.',
      },
      {
        type: 'insight',
        title: 'The same rule as the table',
        body: 'A Q table is the special case where φ has a single 1, in the column for (s, a): then α δ φ moves exactly that cell. Everything from chapter 9, targets, exploration, checks, carries over; only "which numbers change" is new.',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Build it: linear Q-learning',
        caption: "Q by hand, one update by hand, real training on the game's rules (a few seconds), why α shrinks, and the brain's weights.",
        props: {
          lesson: {
            title: 'Linear Q-learning',
            subtitle: 'Fifteen weights, learned from play.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. Q = w · φ\nPredict first: which card the brain values most.',
                startCode: '// Cards and the deck. A card is a plain object, { rank, suit }: rank 1 (ace) to 13 (king), suit one of S H D C.\n// Nothing here draws anything, so the rules can be tested, and an agent can learn, without a screen.\n\nconst SUITS = [\'S\', \'H\', \'D\', \'C\'];\nconst SUIT_SYMBOL = { S: \'♠\', H: \'♥\', D: \'♦\', C: \'♣\' };\nconst RANK_NAME = [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'];\n\n/** What a card counts for, toward 15 and 31: an ace is 1, a face card 10. */\nfunction value(card) { return Math.min(card.rank, 10); }\n\n/** A card\'s name, such as 10♥. */\nfunction cardName(card) { return RANK_NAME[card.rank] + SUIT_SYMBOL[card.suit]; }\n\n/** Its picture: assets/cards/10H.svg (the build writes all 52, and the back). */\nfunction cardImage(card) { return `assets/cards/${RANK_NAME[card.rank]}${card.suit}.svg`; }\n\n/** A fresh deck: the 52 cards in order. */\nfunction newDeck() {\n  const deck = [];\n  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ rank, suit });\n  return deck;\n}\n\n/**\n * Shuffle in place (Fisher–Yates): for each position from the last down, swap in a card chosen at random from those\n * not yet placed. Every order is equally likely. It uses Math.random, which training seeds, so a hand can be replayed.\n */\nfunction shuffle(deck) {\n  for (let i = deck.length - 1; i > 0; i--) {\n    const j = Math.floor(Math.random() * (i + 1));\n    [deck[i], deck[j]] = [deck[j], deck[i]];\n  }\n  return deck;\n}\n\n/** The same card? (Two objects can describe one card.) */\nfunction sameCard(a, b) { return a.rank === b.rank && a.suit === b.suit; }\n// Scoring cribbage: the show (a hand of four with the starter) and pegging (each card as it is played).\n// Every function returns its points with the reasons, so the game can say "fifteen 2, fifteen 4, a pair is 6".\n\n\n/** Every subset of the cards (by bitmask), as lists: 2ⁿ of them, for n cards. */\nfunction subsets(cards) {\n  const out = [];\n  for (let mask = 1; mask < 1 << cards.length; mask++) out.push(cards.filter((_, i) => mask & (1 << i)));\n  return out;\n}\n\n/** Fifteens: 2 for each different set of cards adding up to 15. */\nfunction fifteens(cards) {\n  const sets = subsets(cards).filter((s) => s.reduce((t, c) => t + value(c), 0) === 15);\n  return sets.map((s) => ({ what: \'fifteen\', cards: s, points: 2 }));\n}\n\n/** Pairs: 2 for each pair of cards of the same rank (three of a kind is three pairs, 6; four is six pairs, 12). */\nfunction pairs(cards) {\n  const out = [];\n  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++)\n    if (cards[i].rank === cards[j].rank) out.push({ what: \'pair\', cards: [cards[i], cards[j]], points: 2 });\n  return out;\n}\n\n/** Is this set of cards a run: different ranks, one after another (in any order)? */\nfunction isRun(cards) {\n  const r = cards.map((c) => c.rank).sort((a, b) => a - b);\n  return r.every((x, i) => i === 0 || x === r[i - 1] + 1);\n}\n\n/**\n * Runs: three or more cards in sequence (aces are low: A 2 3 is a run, Q K A is not). Only the longest runs count,\n * once for each different set of cards that makes one: 3 4 4 5 is two runs of three, 6 points.\n */\nfunction runs(cards) {\n  for (let length = cards.length; length >= 3; length--) {\n    const found = subsets(cards).filter((s) => s.length === length && isRun(s));\n    if (found.length) return found.map((s) => ({ what: `run of ${length}`, cards: s, points: length }));\n  }\n  return [];\n}\n\n/**\n * Flush: the four cards in a hand of one suit, 4, and 5 if the starter is too. The crib only scores a flush of all\n * five.\n */\nfunction flush(hand, starter, isCrib) {\n  if (!hand.every((c) => c.suit === hand[0].suit)) return [];\n  if (starter.suit === hand[0].suit) return [{ what: \'flush\', cards: [...hand, starter], points: 5 }];\n  return isCrib ? [] : [{ what: \'flush\', cards: hand, points: 4 }];\n}\n\n/** Nobs: the jack of the starter\'s suit in the hand, 1. */\nfunction nobs(hand, starter) {\n  const jack = hand.find((c) => c.rank === 11 && c.suit === starter.suit);\n  return jack ? [{ what: \'nobs\', cards: [jack], points: 1 }] : [];\n}\n\n/** The show: a hand of four (or the crib) with the starter. { total, parts }. */\nfunction scoreHand(hand, starter, isCrib = false) {\n  const all = [...hand, starter];\n  const parts = [...fifteens(all), ...pairs(all), ...runs(all), ...flush(hand, starter, isCrib), ...nobs(hand, starter)];\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** The count: what the cards played since the last reset add up to. */\nfunction countOf(pile) { return pile.reduce((t, c) => t + value(c), 0); }\n\n/**\n * Pegging: the points for the card just played, the last of `pile` (the cards played since the count was last\n * reset to 0). 15 or 31 is 2; a pair with the card before is 2, three of a kind 6, four 12; a run is one point a card,\n * when the last three or more cards (in any order) make one.\n */\nfunction pegPoints(pile) {\n  const parts = [], count = countOf(pile), card = pile[pile.length - 1];\n  if (count === 15) parts.push({ what: \'fifteen\', points: 2 });\n  if (count === 31) parts.push({ what: \'thirty-one\', points: 2 });\n  let same = 1;\n  while (same < pile.length && pile[pile.length - 1 - same].rank === card.rank) same++;\n  if (same >= 2) parts.push({ what: [\'\', \'\', \'a pair\', \'three of a kind\', \'four of a kind\'][same], points: [0, 0, 2, 6, 12][same] });\n  for (let length = pile.length; length >= 3; length--) {\n    if (isRun(pile.slice(-length))) { parts.push({ what: `run of ${length}`, points: length }); break; }\n  }\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** "fifteen 2, a pair is 4, …": points as they are said aloud. */\nfunction sayParts(parts) {\n  let running = 0;\n  return parts.map((p) => `${p.what} ${(running += p.points)}`).join(\', \');\n}\n// What the AI sees of a move: features, numbers that describe it (lesson: the AI\'s discard; the AI\'s pegging).\n//\n// A linear Q brain values a move as Q = w · φ, one weight per feature, so a feature should be a number that makes\n// a move better or worse in proportion (more points now: better; a bigger chance the other player scores next: worse).\n// Each is scaled to about 0 to 1, so no one feature\'s size swamps the others while the weights are learned.\n//\n// The discard and pegging are different decisions, so each has its own block of features; a move fills its own\n// block and leaves the other at 0, and the two blocks learn separate weights in one list.\n//\n// A seat sees only what a player at the table could: its own cards, the starter, and the cards played. Never the\n// other hand (the developer view shows that to you, not to the AI).\n\n\n/** The 15 ways to throw two of six cards to the crib: [i, j] with i < j. */\nconst THROWS = [];\nfor (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) THROWS.push([i, j]);\n\nconst DISCARD_FEATURES = [\'discard: bias\', \'discard: hand kept (expected points)\', \'discard: crib (expected points, + mine − theirs)\', \'discard: my crib\'];\nconst PEG_FEATURES = [\'peg: bias\', \'peg: points now\', \'peg: count after\', \'peg: chance of 15 or 31 against\', \'peg: chance of a pair against\', \'peg: chance of a run against\', \'peg: leads low\', \'peg: card value\', \'peg: my hand (show)\', \'peg: crib (expected, + mine − theirs)\', \'peg: my crib\'];\nconst FEATURE_NAMES = [...DISCARD_FEATURES, ...PEG_FEATURES];\n\n/** The cards a seat has not seen: the deck less those it knows. */\nfunction unseen(known) {\n  return newDeck().filter((c) => !known.some((k) => sameCard(k, c)));\n}\n\n/** A hand\'s show score averaged over every starter it could get (the cards not in view). */\nfunction expectedHand(kept, known) {\n  const starters = unseen(known);\n  return starters.reduce((t, s) => t + scoreHand(kept, s).total, 0) / starters.length;\n}\n\n/**\n * The average a crib scores holding two cards of these ranks (CRIB_VALUE[a − 1][b − 1]): every other two crib cards\n * and starter, by rank, weighted by how many ways the other 50 cards make them. Suits are ignored (a crib flush needs\n * all five), except nobs: a jack thrown scores 1 when the starter is its suit, about a quarter of the time.\n * cribTable() computes it; the numbers below are its answer, kept here so the game does not spend half a second\n * recomputing them each time it starts (a test checks they agree).\n */\nconst CRIB_VALUE = [\n  [5.49,4.4,4.52,5.43,5.69,4.22,4.04,4.08,4,3.91,4.17,3.81,3.7],\n  [4.4,5.79,6.8,4.8,5.72,4.32,4.24,4.19,4.09,4.03,4.28,3.92,3.82],\n  [4.52,6.8,6.12,5.45,6.38,4.23,4.31,4.25,4.07,4.1,4.36,4,3.89],\n  [5.43,4.8,5.45,6.1,6.95,4.92,4.14,4.26,4.16,4.1,4.36,4,3.89],\n  [5.69,5.72,6.38,6.95,8.96,7.05,6.37,5.71,5.69,6.98,7.24,6.88,6.77],\n  [4.22,4.32,4.23,4.92,7.05,6.25,5.5,4.86,5.53,3.8,4.05,3.69,3.59],\n  [4.04,4.24,4.31,4.14,6.37,5.5,6.07,6.72,4.31,3.68,4,3.64,3.53],\n  [4.08,4.19,4.25,4.26,5.71,4.86,6.72,5.6,4.89,4.26,3.92,3.62,3.52],\n  [4,4.09,4.07,4.16,5.69,5.53,4.31,4.89,5.49,4.8,4.46,3.51,3.46],\n  [3.91,4.03,4.1,4.1,6.98,3.8,3.68,4.26,4.8,5.43,5.03,4.07,3.37],\n  [4.17,4.28,4.36,4.36,7.24,4.05,4,3.92,4.46,5.03,5.93,4.99,4.28],\n  [3.81,3.92,4,4,6.88,3.69,3.64,3.62,3.51,4.07,4.99,5.21,3.93],\n  [3.7,3.82,3.89,3.89,6.77,3.59,3.53,3.52,3.46,3.37,4.28,3.93,4.99],\n];\n\nfunction cribTable() {\n  const table = [];\n  for (let a = 1; a <= 13; a++) {\n    table.push([]);\n    for (let b = 1; b <= 13; b++) {\n      const left = new Array(14).fill(4);\n      left[a]--; left[b]--;\n      let sum = 0, ways = 0;\n      for (let c = 1; c <= 13; c++) for (let d = c; d <= 13; d++) {\n        const pairs = c === d ? left[c] * (left[c] - 1) / 2 : left[c] * left[d];\n        if (!pairs) continue;\n        for (let s = 1; s <= 13; s++) {\n          const w = pairs * (left[s] - (s === c ? 1 : 0) - (s === d ? 1 : 0));\n          if (w <= 0) continue;\n          const crib = [a, b, c, d].map((rank, i) => ({ rank, suit: SUITS[i] }));   // four different suits: no flush\n          sum += w * scoreHand(crib, { rank: s, suit: \'none\' }, true).total;\n          ways += w;\n        }\n      }\n      table[a - 1].push(+(sum / ways + (a === 11 ? 0.25 : 0) + (b === 11 ? 0.25 : 0)).toFixed(2));\n    }\n  }\n  return table;\n}\n\n/** The discard\'s features: throwing hand[i] and hand[j] (of six). myCrib: whether the crib is this seat\'s. */\nfunction discardFeatures(hand, [i, j], myCrib) {\n  const kept = hand.filter((_, k) => k !== i && k !== j), a = hand[i], b = hand[j];\n  const sign = myCrib ? 1 : -1;   // points in the crib are good when it is mine, bad when it is theirs\n  const block = [\n    1,\n    expectedHand(kept, hand) / 10,\n    sign * CRIB_VALUE[a.rank - 1][b.rank - 1] / 10,\n    sign,\n  ];\n  return [...block, ...new Array(PEG_FEATURES.length).fill(0)];\n}\n\n/**\n * Pegging features: playing `card` onto `pile` (the cards since the count was reset). `known`: every card this seat\n * has seen (its hand, the starter, the cards played). `handShow`: its own hand\'s show score, which it knows once the\n * starter is cut. `threw`: the two cards it threw to the crib.\n *\n * The last three are the same for every card it could play: they do not help choose a card, but they let Q predict\n * the points still to come at the show. That matters, because the discard learns its value from the value of the\n * first pegging move (the target R + max Q(S′, ·)): if no pegging feature said how good the crib is, what the discard\n * did for the crib would be lost one step later.\n */\nfunction pegFeatures(card, pile, known, handShow, myCrib, threw) {\n  const after = [...pile, card], count = countOf(after);\n  const others = unseen(known);\n  // The chance that the next card, one the other player could hold, scores against this play.\n  const fits = others.filter((c) => count + value(c) <= 31);\n  const share = (test) => (others.length ? fits.filter(test).length / others.length : 0);\n  const block = [\n    1,\n    pegPoints(after).total / 4,\n    count / 31,\n    share((c) => count + value(c) === 15 || count + value(c) === 31),\n    share((c) => c.rank === card.rank),\n    share((c) => pegPoints([...after, c]).parts.some((p) => p.what.startsWith(\'run\'))),\n    pile.length === 0 && value(card) < 5 ? 1 : 0,\n    value(card) / 10,\n    handShow / 10,\n    (myCrib ? 1 : -1) * CRIB_VALUE[threw[0].rank - 1][threw[1].rank - 1] / 10,\n    myCrib ? 1 : -1,\n  ];\n  return [...new Array(DISCARD_FEATURES.length).fill(0), ...block];\n}\n// Players without a brain: random, and rules (a sensible human\'s habits written as code). The table\'s other seat\n// plays one of these while the AI trains, and they are what the trained AI is measured against.\n\n\n/** A random legal choice. */\nconst pickRandom = (list) => list[Math.floor(Math.random() * list.length)];\n\n/**\n * Rules for the discard: keep the four with the most points on average, and give the crib a fifteen or a pair when\n * it is yours, never when it is theirs.\n */\nfunction rulesThrow(hand, myCrib) {\n  let best = 0, bestScore = -Infinity;\n  THROWS.forEach(([i, j], t) => {\n    const kept = hand.filter((_, k) => k !== i && k !== j), a = hand[i], b = hand[j];\n    const crib = (value(a) + value(b) === 15 ? 2 : 0) + (a.rank === b.rank ? 2 : 0) + (a.rank === 5 ? 1 : 0) + (b.rank === 5 ? 1 : 0);\n    const score = expectedHand(kept, hand) + (myCrib ? crib : -crib);\n    if (score > bestScore) { bestScore = score; best = t; }\n  });\n  return best;\n}\n\n/** Rules for pegging: the most points now; never leave the count on 5 or 21; else the highest card. `options`: indexes into hand of the cards that fit. */\nfunction rulesPlay(hand, options, pile) {\n  let best = options[0], bestScore = -Infinity;\n  for (const k of options) {\n    const after = [...pile, hand[k]], count = countOf(after);\n    const score = pegPoints(after).total * 10 - (count === 5 || count === 21 ? 15 : 0) + value(hand[k]) / 10;\n    if (score > bestScore) { bestScore = score; best = k; }\n  }\n  return best;\n}\nconst cards = (text) => text.split(\' \').map((t) => ({ rank: [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\nconst show = (cs) => cs.map(cardName).join(\' \')\nconst dot = (w, phi) => w.reduce((s, x, i) => s + x * phi[i], 0)\n// The finished game\'s brain: one weight per feature, learned by 8,000 hands of training (brains/cribbage.json).\nconst W = [-8.513,10.242,5.71,3.436,-9.135,3.444,0,-0.231,-2.087,-2.275,0.573,-0.189,10.138,8.473,1.64]\n// Q(s, a) = w · φ(s, a): each move\'s features times the weights, added up. Predict first: on a 5 (count 5),\n// holding K 2 9 4, which card does the brain value most, and why?\nconst pile = cards(\'5H\'), hand = cards(\'KS 2C 9D 4H\'), threw = cards(\'8S 3C\'), known = [...hand, ...threw, ...cards(\'6D\'), ...pile]\nfor (const c of hand) {\n  const phi = pegFeatures(c, pile, known, 4, false, threw)\n  const parts = phi.map((x, i) => ({ name: FEATURE_NAMES[i].replace(\'peg: \', \'\'), part: W[i] * x })).filter((p) => Math.abs(p.part) > 0.15)\n  console.log(cardName(c).padEnd(3) + \' Q = \' + dot(W, phi).toFixed(2).padStart(6) + \'   = \' + parts.map((p) => p.name + \' \' + (p.part >= 0 ? \'+\' : \'\') + p.part.toFixed(2)).join(\', \') + \', …\')\n}',
              },
              {
                type: 'js',
                instruction: '### 2. One update, by hand\nPredict first: which weights change, and which way.',
                startCode: "// One update, by hand. The AI played a card with features φ; Q was w · φ. Then it earned R before its next turn,\n// where the best legal move is worth max Q′. The target is R + γ max Q′ (γ = 1), the error δ = target − Q, and\n// every weight moves by α δ × its feature. Predict first: which weights change, and which way?\nconst names = ['bias', 'points now', 'count after', 'chance of 15/31 against']\nlet w = [-5, 2, 0.5, -1], phi = [1, 0.5, 0.48, 0.2]\nconst Q = w.reduce((s, x, i) => s + x * phi[i], 0), R = -2, maxNext = -3.1, alpha = 0.1\nconst target = R + 1 * maxNext, delta = target - Q\nconsole.log('Q = ' + Q.toFixed(3) + ', target = ' + R + ' + ' + maxNext + ' = ' + target.toFixed(3) + ', δ = ' + delta.toFixed(3))\nw = w.map((x, i) => x + alpha * delta * phi[i])\nnames.forEach((n, i) => console.log(n.padEnd(26) + ' φ ' + phi[i].toFixed(2) + '   w → ' + w[i].toFixed(3)))\nconsole.log('new Q = ' + w.reduce((s, x, i) => s + x * phi[i], 0).toFixed(3) + ' (closer to the target)')",
              },
              {
                type: 'js',
                instruction: '### 3. Learning, for real (about five seconds)\nPredict first: where it starts and how far it climbs.',
                startCode: '// A seeded random-number generator (mulberry32, Game Studio\'s), so this cell deals the same cards every run.\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\n// Cards and the deck. A card is a plain object, { rank, suit }: rank 1 (ace) to 13 (king), suit one of S H D C.\n// Nothing here draws anything, so the rules can be tested, and an agent can learn, without a screen.\n\nconst SUITS = [\'S\', \'H\', \'D\', \'C\'];\nconst SUIT_SYMBOL = { S: \'♠\', H: \'♥\', D: \'♦\', C: \'♣\' };\nconst RANK_NAME = [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'];\n\n/** What a card counts for, toward 15 and 31: an ace is 1, a face card 10. */\nfunction value(card) { return Math.min(card.rank, 10); }\n\n/** A card\'s name, such as 10♥. */\nfunction cardName(card) { return RANK_NAME[card.rank] + SUIT_SYMBOL[card.suit]; }\n\n/** Its picture: assets/cards/10H.svg (the build writes all 52, and the back). */\nfunction cardImage(card) { return `assets/cards/${RANK_NAME[card.rank]}${card.suit}.svg`; }\n\n/** A fresh deck: the 52 cards in order. */\nfunction newDeck() {\n  const deck = [];\n  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ rank, suit });\n  return deck;\n}\n\n/**\n * Shuffle in place (Fisher–Yates): for each position from the last down, swap in a card chosen at random from those\n * not yet placed. Every order is equally likely. It uses Math.random, which training seeds, so a hand can be replayed.\n */\nfunction shuffle(deck) {\n  for (let i = deck.length - 1; i > 0; i--) {\n    const j = Math.floor(Math.random() * (i + 1));\n    [deck[i], deck[j]] = [deck[j], deck[i]];\n  }\n  return deck;\n}\n\n/** The same card? (Two objects can describe one card.) */\nfunction sameCard(a, b) { return a.rank === b.rank && a.suit === b.suit; }\n// Scoring cribbage: the show (a hand of four with the starter) and pegging (each card as it is played).\n// Every function returns its points with the reasons, so the game can say "fifteen 2, fifteen 4, a pair is 6".\n\n\n/** Every subset of the cards (by bitmask), as lists: 2ⁿ of them, for n cards. */\nfunction subsets(cards) {\n  const out = [];\n  for (let mask = 1; mask < 1 << cards.length; mask++) out.push(cards.filter((_, i) => mask & (1 << i)));\n  return out;\n}\n\n/** Fifteens: 2 for each different set of cards adding up to 15. */\nfunction fifteens(cards) {\n  const sets = subsets(cards).filter((s) => s.reduce((t, c) => t + value(c), 0) === 15);\n  return sets.map((s) => ({ what: \'fifteen\', cards: s, points: 2 }));\n}\n\n/** Pairs: 2 for each pair of cards of the same rank (three of a kind is three pairs, 6; four is six pairs, 12). */\nfunction pairs(cards) {\n  const out = [];\n  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++)\n    if (cards[i].rank === cards[j].rank) out.push({ what: \'pair\', cards: [cards[i], cards[j]], points: 2 });\n  return out;\n}\n\n/** Is this set of cards a run: different ranks, one after another (in any order)? */\nfunction isRun(cards) {\n  const r = cards.map((c) => c.rank).sort((a, b) => a - b);\n  return r.every((x, i) => i === 0 || x === r[i - 1] + 1);\n}\n\n/**\n * Runs: three or more cards in sequence (aces are low: A 2 3 is a run, Q K A is not). Only the longest runs count,\n * once for each different set of cards that makes one: 3 4 4 5 is two runs of three, 6 points.\n */\nfunction runs(cards) {\n  for (let length = cards.length; length >= 3; length--) {\n    const found = subsets(cards).filter((s) => s.length === length && isRun(s));\n    if (found.length) return found.map((s) => ({ what: `run of ${length}`, cards: s, points: length }));\n  }\n  return [];\n}\n\n/**\n * Flush: the four cards in a hand of one suit, 4, and 5 if the starter is too. The crib only scores a flush of all\n * five.\n */\nfunction flush(hand, starter, isCrib) {\n  if (!hand.every((c) => c.suit === hand[0].suit)) return [];\n  if (starter.suit === hand[0].suit) return [{ what: \'flush\', cards: [...hand, starter], points: 5 }];\n  return isCrib ? [] : [{ what: \'flush\', cards: hand, points: 4 }];\n}\n\n/** Nobs: the jack of the starter\'s suit in the hand, 1. */\nfunction nobs(hand, starter) {\n  const jack = hand.find((c) => c.rank === 11 && c.suit === starter.suit);\n  return jack ? [{ what: \'nobs\', cards: [jack], points: 1 }] : [];\n}\n\n/** The show: a hand of four (or the crib) with the starter. { total, parts }. */\nfunction scoreHand(hand, starter, isCrib = false) {\n  const all = [...hand, starter];\n  const parts = [...fifteens(all), ...pairs(all), ...runs(all), ...flush(hand, starter, isCrib), ...nobs(hand, starter)];\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** The count: what the cards played since the last reset add up to. */\nfunction countOf(pile) { return pile.reduce((t, c) => t + value(c), 0); }\n\n/**\n * Pegging: the points for the card just played, the last of `pile` (the cards played since the count was last\n * reset to 0). 15 or 31 is 2; a pair with the card before is 2, three of a kind 6, four 12; a run is one point a card,\n * when the last three or more cards (in any order) make one.\n */\nfunction pegPoints(pile) {\n  const parts = [], count = countOf(pile), card = pile[pile.length - 1];\n  if (count === 15) parts.push({ what: \'fifteen\', points: 2 });\n  if (count === 31) parts.push({ what: \'thirty-one\', points: 2 });\n  let same = 1;\n  while (same < pile.length && pile[pile.length - 1 - same].rank === card.rank) same++;\n  if (same >= 2) parts.push({ what: [\'\', \'\', \'a pair\', \'three of a kind\', \'four of a kind\'][same], points: [0, 0, 2, 6, 12][same] });\n  for (let length = pile.length; length >= 3; length--) {\n    if (isRun(pile.slice(-length))) { parts.push({ what: `run of ${length}`, points: length }); break; }\n  }\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** "fifteen 2, a pair is 4, …": points as they are said aloud. */\nfunction sayParts(parts) {\n  let running = 0;\n  return parts.map((p) => `${p.what} ${(running += p.points)}`).join(\', \');\n}\n// What the AI sees of a move: features, numbers that describe it (lesson: the AI\'s discard; the AI\'s pegging).\n//\n// A linear Q brain values a move as Q = w · φ, one weight per feature, so a feature should be a number that makes\n// a move better or worse in proportion (more points now: better; a bigger chance the other player scores next: worse).\n// Each is scaled to about 0 to 1, so no one feature\'s size swamps the others while the weights are learned.\n//\n// The discard and pegging are different decisions, so each has its own block of features; a move fills its own\n// block and leaves the other at 0, and the two blocks learn separate weights in one list.\n//\n// A seat sees only what a player at the table could: its own cards, the starter, and the cards played. Never the\n// other hand (the developer view shows that to you, not to the AI).\n\n\n/** The 15 ways to throw two of six cards to the crib: [i, j] with i < j. */\nconst THROWS = [];\nfor (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) THROWS.push([i, j]);\n\nconst DISCARD_FEATURES = [\'discard: bias\', \'discard: hand kept (expected points)\', \'discard: crib (expected points, + mine − theirs)\', \'discard: my crib\'];\nconst PEG_FEATURES = [\'peg: bias\', \'peg: points now\', \'peg: count after\', \'peg: chance of 15 or 31 against\', \'peg: chance of a pair against\', \'peg: chance of a run against\', \'peg: leads low\', \'peg: card value\', \'peg: my hand (show)\', \'peg: crib (expected, + mine − theirs)\', \'peg: my crib\'];\nconst FEATURE_NAMES = [...DISCARD_FEATURES, ...PEG_FEATURES];\n\n/** The cards a seat has not seen: the deck less those it knows. */\nfunction unseen(known) {\n  return newDeck().filter((c) => !known.some((k) => sameCard(k, c)));\n}\n\n/** A hand\'s show score averaged over every starter it could get (the cards not in view). */\nfunction expectedHand(kept, known) {\n  const starters = unseen(known);\n  return starters.reduce((t, s) => t + scoreHand(kept, s).total, 0) / starters.length;\n}\n\n/**\n * The average a crib scores holding two cards of these ranks (CRIB_VALUE[a − 1][b − 1]): every other two crib cards\n * and starter, by rank, weighted by how many ways the other 50 cards make them. Suits are ignored (a crib flush needs\n * all five), except nobs: a jack thrown scores 1 when the starter is its suit, about a quarter of the time.\n * cribTable() computes it; the numbers below are its answer, kept here so the game does not spend half a second\n * recomputing them each time it starts (a test checks they agree).\n */\nconst CRIB_VALUE = [\n  [5.49,4.4,4.52,5.43,5.69,4.22,4.04,4.08,4,3.91,4.17,3.81,3.7],\n  [4.4,5.79,6.8,4.8,5.72,4.32,4.24,4.19,4.09,4.03,4.28,3.92,3.82],\n  [4.52,6.8,6.12,5.45,6.38,4.23,4.31,4.25,4.07,4.1,4.36,4,3.89],\n  [5.43,4.8,5.45,6.1,6.95,4.92,4.14,4.26,4.16,4.1,4.36,4,3.89],\n  [5.69,5.72,6.38,6.95,8.96,7.05,6.37,5.71,5.69,6.98,7.24,6.88,6.77],\n  [4.22,4.32,4.23,4.92,7.05,6.25,5.5,4.86,5.53,3.8,4.05,3.69,3.59],\n  [4.04,4.24,4.31,4.14,6.37,5.5,6.07,6.72,4.31,3.68,4,3.64,3.53],\n  [4.08,4.19,4.25,4.26,5.71,4.86,6.72,5.6,4.89,4.26,3.92,3.62,3.52],\n  [4,4.09,4.07,4.16,5.69,5.53,4.31,4.89,5.49,4.8,4.46,3.51,3.46],\n  [3.91,4.03,4.1,4.1,6.98,3.8,3.68,4.26,4.8,5.43,5.03,4.07,3.37],\n  [4.17,4.28,4.36,4.36,7.24,4.05,4,3.92,4.46,5.03,5.93,4.99,4.28],\n  [3.81,3.92,4,4,6.88,3.69,3.64,3.62,3.51,4.07,4.99,5.21,3.93],\n  [3.7,3.82,3.89,3.89,6.77,3.59,3.53,3.52,3.46,3.37,4.28,3.93,4.99],\n];\n\nfunction cribTable() {\n  const table = [];\n  for (let a = 1; a <= 13; a++) {\n    table.push([]);\n    for (let b = 1; b <= 13; b++) {\n      const left = new Array(14).fill(4);\n      left[a]--; left[b]--;\n      let sum = 0, ways = 0;\n      for (let c = 1; c <= 13; c++) for (let d = c; d <= 13; d++) {\n        const pairs = c === d ? left[c] * (left[c] - 1) / 2 : left[c] * left[d];\n        if (!pairs) continue;\n        for (let s = 1; s <= 13; s++) {\n          const w = pairs * (left[s] - (s === c ? 1 : 0) - (s === d ? 1 : 0));\n          if (w <= 0) continue;\n          const crib = [a, b, c, d].map((rank, i) => ({ rank, suit: SUITS[i] }));   // four different suits: no flush\n          sum += w * scoreHand(crib, { rank: s, suit: \'none\' }, true).total;\n          ways += w;\n        }\n      }\n      table[a - 1].push(+(sum / ways + (a === 11 ? 0.25 : 0) + (b === 11 ? 0.25 : 0)).toFixed(2));\n    }\n  }\n  return table;\n}\n\n/** The discard\'s features: throwing hand[i] and hand[j] (of six). myCrib: whether the crib is this seat\'s. */\nfunction discardFeatures(hand, [i, j], myCrib) {\n  const kept = hand.filter((_, k) => k !== i && k !== j), a = hand[i], b = hand[j];\n  const sign = myCrib ? 1 : -1;   // points in the crib are good when it is mine, bad when it is theirs\n  const block = [\n    1,\n    expectedHand(kept, hand) / 10,\n    sign * CRIB_VALUE[a.rank - 1][b.rank - 1] / 10,\n    sign,\n  ];\n  return [...block, ...new Array(PEG_FEATURES.length).fill(0)];\n}\n\n/**\n * Pegging features: playing `card` onto `pile` (the cards since the count was reset). `known`: every card this seat\n * has seen (its hand, the starter, the cards played). `handShow`: its own hand\'s show score, which it knows once the\n * starter is cut. `threw`: the two cards it threw to the crib.\n *\n * The last three are the same for every card it could play: they do not help choose a card, but they let Q predict\n * the points still to come at the show. That matters, because the discard learns its value from the value of the\n * first pegging move (the target R + max Q(S′, ·)): if no pegging feature said how good the crib is, what the discard\n * did for the crib would be lost one step later.\n */\nfunction pegFeatures(card, pile, known, handShow, myCrib, threw) {\n  const after = [...pile, card], count = countOf(after);\n  const others = unseen(known);\n  // The chance that the next card, one the other player could hold, scores against this play.\n  const fits = others.filter((c) => count + value(c) <= 31);\n  const share = (test) => (others.length ? fits.filter(test).length / others.length : 0);\n  const block = [\n    1,\n    pegPoints(after).total / 4,\n    count / 31,\n    share((c) => count + value(c) === 15 || count + value(c) === 31),\n    share((c) => c.rank === card.rank),\n    share((c) => pegPoints([...after, c]).parts.some((p) => p.what.startsWith(\'run\'))),\n    pile.length === 0 && value(card) < 5 ? 1 : 0,\n    value(card) / 10,\n    handShow / 10,\n    (myCrib ? 1 : -1) * CRIB_VALUE[threw[0].rank - 1][threw[1].rank - 1] / 10,\n    myCrib ? 1 : -1,\n  ];\n  return [...new Array(DISCARD_FEATURES.length).fill(0), ...block];\n}\n// Players without a brain: random, and rules (a sensible human\'s habits written as code). The table\'s other seat\n// plays one of these while the AI trains, and they are what the trained AI is measured against.\n\n\n/** A random legal choice. */\nconst pickRandom = (list) => list[Math.floor(Math.random() * list.length)];\n\n/**\n * Rules for the discard: keep the four with the most points on average, and give the crib a fifteen or a pair when\n * it is yours, never when it is theirs.\n */\nfunction rulesThrow(hand, myCrib) {\n  let best = 0, bestScore = -Infinity;\n  THROWS.forEach(([i, j], t) => {\n    const kept = hand.filter((_, k) => k !== i && k !== j), a = hand[i], b = hand[j];\n    const crib = (value(a) + value(b) === 15 ? 2 : 0) + (a.rank === b.rank ? 2 : 0) + (a.rank === 5 ? 1 : 0) + (b.rank === 5 ? 1 : 0);\n    const score = expectedHand(kept, hand) + (myCrib ? crib : -crib);\n    if (score > bestScore) { bestScore = score; best = t; }\n  });\n  return best;\n}\n\n/** Rules for pegging: the most points now; never leave the count on 5 or 21; else the highest card. `options`: indexes into hand of the cards that fit. */\nfunction rulesPlay(hand, options, pile) {\n  let best = options[0], bestScore = -Infinity;\n  for (const k of options) {\n    const after = [...pile, hand[k]], count = countOf(after);\n    const score = pegPoints(after).total * 10 - (count === 5 || count === 21 ? 15 : 0) + value(hand[k]) / 10;\n    if (score > bestScore) { bestScore = score; best = k; }\n  }\n  return best;\n}\nconst cards = (text) => text.split(\' \').map((t) => ({ rank: [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\nconst show = (cs) => cs.map(cardName).join(\' \')\nconst dot = (w, phi) => w.reduce((s, x, i) => s + x * phi[i], 0)\n\n// A hand against the rules player, the AI in seat 1 choosing by its weights (ε-greedy while learning); learn(…) is\n// called with each step\'s features, reward and next legal moves\' features, as Train an agent… does.\nfunction playHand(w, dealer, eps, rand, learn) {\n  const deck = shuffle(newDeck()), h = [[], []], crib = [], threw = [[], []], score = [0, 0], AI = 1\n  for (let k = 0; k < 6; k++) for (const s of [1 - dealer, dealer]) h[s].push(deck.pop())\n  const history = [], known = () => [...h[AI], ...threw[AI], ...(starter ? [starter] : []), ...history.filter((x) => x.s !== AI).map((x) => x.c)]\n  let starter = null, seen = [0, 0], prev = null\n  const reward = () => { const r = (score[AI] - seen[AI]) - (score[0] - seen[0]); seen = [...score]; return r }\n  const pick = (phis) => { if (rand() < eps) return Math.floor(rand() * phis.length); let b = 0; phis.forEach((p, i) => { if (dot(w, p) > dot(w, phis[b])) b = i }); return b }\n  const step = (phis) => { const r = reward(); if (prev && learn) learn(prev, r, phis); const i = pick(phis); prev = phis[i]; return i }\n  const t0 = rulesThrow(h[0], dealer === 0)\n  const t1 = step(THROWS.map((t) => discardFeatures(h[AI], t, dealer === AI)))\n  for (const [s, t] of [[0, t0], [AI, t1]]) { const [i, j] = THROWS[t]; threw[s] = [h[s][i], h[s][j]]; crib.push(...threw[s]); h[s] = h[s].filter((_, k) => k !== i && k !== j) }\n  starter = deck.pop(); if (starter.rank === 11) score[dealer] += 2\n  const show = scoreHand(h[AI], starter).total\n  const played = [[], []]; let pile = [], turn = 1 - dealer, last = null\n  const opts = (s) => h[s].map((_, k) => k).filter((k) => !played[s].includes(k) && countOf(pile) + value(h[s][k]) <= 31)\n  while (played[0].length + played[1].length < 8) {\n    if (countOf(pile) === 31) pile = []\n    const o = opts(turn)\n    if (!o.length) { if (opts(1 - turn).length) { turn = 1 - turn; continue } score[last]++; pile = []; turn = 1 - last; continue }\n    const k = turn === AI ? o[step(o.map((k) => pegFeatures(h[AI][k], pile, known(), show, dealer === AI, threw[AI])))] : rulesPlay(h[0], o, pile)\n    played[turn].push(k); pile.push(h[turn][k]); history.push({ s: turn, c: h[turn][k] }); last = turn\n    score[turn] += pegPoints(pile).total; turn = 1 - turn\n  }\n  if (countOf(pile) !== 31) score[last]++\n  score[0] += scoreHand(h[0], starter).total; score[AI] += show; score[dealer] += scoreHand(crib, starter, true).total\n  if (prev && learn) learn(prev, reward(), null)\n  return score[AI] - score[0]\n}\n// Learning, for real: linear Q-learning from zero weights, against the rules player, on the game\'s own rules.\n// After each step: target = R + max over its next legal moves of w · φ′ (or just R when the hand is over),\n// δ = target − w · φ, and w ← w + α δ φ. At 0, 100 and 400 hands, the greedy policy plays the same 200 held-out deals.\n// Predict first: where does it start, and how far does it climb in 400 hands? (This cell takes about five seconds.)\nconst real = Math.random, rand = seeded(1)\nlet w = new Array(FEATURE_NAMES.length).fill(0), alpha = 0.1\nconst learn = (phi, r, next) => {\n  const target = r + (next ? Math.max(...next.map((p) => dot(w, p))) : 0), delta = target - dot(w, phi)\n  w = w.map((x, i) => x + alpha * delta * phi[i])\n}\n// Judging uses its own random numbers (for the deals), so it does not change the training that follows.\nconst judge = () => { const r = seeded(777); Math.random = r; let s = 0; for (let k = 0; k < 200; k++) s += playHand(w, k % 2, 0, r, null); Math.random = rand; return (s / 200).toFixed(2) }\nMath.random = rand\nconsole.log(\'hands 0: \' + judge() + \' points a hand against the rules player\')\nfor (let n = 1; n <= 400; n++) {\n  alpha = 0.1 * Math.pow(0.005 / 0.1, n / 400)            // α falls from 0.1 to 0.005\n  playHand(w, n % 2, 0.2 - 0.18 * n / 400, rand, learn)   // ε falls from 0.2 to 0.02\n  if (n === 100 || n === 400) console.log(\'hands \' + n + \': \' + judge())\n}\nMath.random = real\nconsole.log(\'weights: \' + FEATURE_NAMES.map((n, i) => n.replace(/^(discard|peg): /, \'$1 \') + \' \' + w[i].toFixed(2)).join(\', \'))',
              },
              {
                type: 'js',
                instruction: '### 4. Why α shrinks\nPredict first: which is steadier.',
                startCode: "// A seeded random-number generator (mulberry32, Game Studio's), so this cell deals the same cards every run.\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\n// Why the step size falls. Learning a value from noisy rewards is like estimating an average from noisy samples:\n// each step moves the estimate α of the way to the newest sample. Predict first: which ends closer to the true 5,\n// and which is steadier: α = 0.1 throughout, or α falling from 0.1 to 0.005?\nconst rand = seeded(2), noisy = () => 5 + (rand() - 0.5) * 16    // a hand's points: about 5, give or take 8\nfunction estimate(alphaAt) { let v = 0; const last = []; for (let n = 1; n <= 4000; n++) { v += alphaAt(n) * (noisy() - v); if (n > 3800) last.push(v) } return last }\nfor (const [name, alphaAt] of [['α 0.1 throughout', () => 0.1], ['α 0.1 → 0.005', (n) => 0.1 * Math.pow(0.05, n / 4000)]]) {\n  const last = estimate(alphaAt), lo = Math.min(...last), hi = Math.max(...last)\n  console.log(name.padEnd(18) + ' its last 200 estimates range ' + lo.toFixed(2) + ' to ' + hi.toFixed(2))\n}",
              },
              {
                type: 'js',
                instruction: '### 5. Reading the brain\nPredict first: the negative weights.',
                startCode: '// The finished game\'s brain: one weight per feature, learned by 8,000 hands of training (brains/cribbage.json).\nconst W = [-8.513,10.242,5.71,3.436,-9.135,3.444,0,-0.231,-2.087,-2.275,0.573,-0.189,10.138,8.473,1.64]\n// Reading the brain. Each weight says how much a move\'s value goes up per unit of its feature. Predict first:\n// which pegging weights are negative, and is the crib worth as much as the hand to the throw?\nconst names = ["discard: bias","discard: hand kept (expected points)","discard: crib (expected points, + mine − theirs)","discard: my crib","peg: bias","peg: points now","peg: count after","peg: chance of 15 or 31 against","peg: chance of a pair against","peg: chance of a run against","peg: leads low","peg: card value","peg: my hand (show)","peg: crib (expected, + mine − theirs)","peg: my crib"]\nnames.forEach((n, i) => console.log(n.padEnd(46) + (W[i] >= 0 ? \' \' : \'\') + W[i].toFixed(2)))',
              },
              {
                type: 'challenge',
                instruction: '### 6. Challenge: the update\nThree updates check it.',
                startCode: "// Challenge: write update(w, phi, target, alpha): δ = target − w · φ, then every weight moves by α δ φᵢ.\n// Return the new weights (a new list). The checks run three updates.\nfunction update(w, phi, target, alpha) {\n  return w   // your code\n}\nconst cases = [[[0, 0], [1, 0.5], 2, 0.5, [1, 0.5]], [[1, 2], [1, 1], 0, 0.1, [0.7, 1.7]], [[-5, 2, 0.5], [1, 0.5, 0], -5, 0.1, [-5.1, 1.95, 0.5]]]\nlet ok = 0\nfor (const [w, phi, target, alpha, want] of cases) {\n  const got = update(w, phi, target, alpha)\n  if (got.length === want.length && got.every((x, i) => Math.abs(x - want[i]) < 1e-9)) ok++\n  else console.log('update(' + JSON.stringify(w) + ', ' + JSON.stringify(phi) + ', ' + target + ', ' + alpha + ') gave ' + JSON.stringify(got.map((x) => +x.toFixed(4))) + '; it should give ' + JSON.stringify(want) + '.')\n}\nconsole.log(ok === cases.length ? '✓ All 3 updates right: that is the whole learning rule.' : ok + ' of 3 right.')",
                solutionCode: "// Challenge: write update(w, phi, target, alpha): δ = target − w · φ, then every weight moves by α δ φᵢ.\n// Return the new weights (a new list). The checks run three updates.\nfunction update(w, phi, target, alpha) {\n  const delta = target - w.reduce((s, x, i) => s + x * phi[i], 0)\n  return w.map((x, i) => x + alpha * delta * phi[i])\n}\nconst cases = [[[0, 0], [1, 0.5], 2, 0.5, [1, 0.5]], [[1, 2], [1, 1], 0, 0.1, [0.7, 1.7]], [[-5, 2, 0.5], [1, 0.5, 0], -5, 0.1, [-5.1, 1.95, 0.5]]]\nlet ok = 0\nfor (const [w, phi, target, alpha, want] of cases) {\n  const got = update(w, phi, target, alpha)\n  if (got.length === want.length && got.every((x, i) => Math.abs(x - want[i]) < 1e-9)) ok++\n  else console.log('update(' + JSON.stringify(w) + ', ' + JSON.stringify(phi) + ', ' + target + ', ' + alpha + ') gave ' + JSON.stringify(got.map((x) => +x.toFixed(4))) + '; it should give ' + JSON.stringify(want) + '.')\n}\nconsole.log(ok === cases.length ? '✓ All 3 updates right: that is the whole learning rule.' : ok + ' of 3 right.')",
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Train the AI',
        props: {
          task: 'crib-train',
          lesson: 'mg10-011',
          checkpoint: 'cp-mg10-011-4',
        },
      },
    ],
  },

  math: {
    prose: [
      '**Under the hood (optional).** Semi-gradient Q-learning minimises $\\tfrac{1}{2}(\\text{target} - \\mathbf{w}\\cdot\\boldsymbol{\\phi})^2$ by one gradient step with the target held fixed: the gradient with respect to $\\mathbf{w}$ is $-(\\text{target} - \\mathbf{w}\\cdot\\boldsymbol{\\phi})\\,\\boldsymbol{\\phi} = -\\delta\\boldsymbol{\\phi}$, so a step of size $\\alpha$ is $\\mathbf{w} \\leftarrow \\mathbf{w} + \\alpha\\delta\\boldsymbol{\\phi}$.',
      'The step changes Q of the same move by $\\alpha\\delta|\\boldsymbol{\\phi}|^2$; for the step to close part of the gap without overshooting, $\\alpha|\\boldsymbol{\\phi}|^2 < 2$, and well below 1 is comfortable.',
      'An exponential schedule $\\alpha_n = \\alpha_0 (\\alpha_N/\\alpha_0)^{n/N}$ goes from 0.1 to 0.005 by a constant ratio each hand. Stochastic-approximation theory asks $\\sum \\alpha_n = \\infty$ and $\\sum \\alpha_n^2 < \\infty$ for convergence; a schedule that stops at a small α is the practical version.',
      'Off-policy learning with function approximation and bootstrapping (the "deadly triad", lesson 9.8) can diverge in general; here the features are small and bounded, the policy is close to greedy late in training, and the checks keep the best weights, which is enough in practice.',
    ],
    equations: [
      {
        label: 'Target and error',
        latex: "\\delta = R + \\gamma \\max_{a' \\in A(s')} \\mathbf{w}\\cdot\\boldsymbol{\\phi}(s', a') - \\mathbf{w}\\cdot\\boldsymbol{\\phi}(s, a)",
      },
      {
        label: 'Update',
        latex: '\\mathbf{w} \\leftarrow \\mathbf{w} + \\alpha\\,\\delta\\,\\boldsymbol{\\phi}(s, a)',
      },
      {
        label: 'Step-size schedule',
        latex: '\\alpha_n = 0.1 \\times (0.005/0.1)^{n/N}',
      },
    ],
    callouts: [],
    visualizations: [],
  },

  rigor: {
    prose: [
      "Invariant: features outside a decision's block are 0, so an update after a throw changes only the throw's weights, and one after a play only the play's.",
      'The learned weights are a best fit of a linear model to returns that are not linear in the features; the AI can be no better than the best linear combination of what it sees.',
      'Where it goes: 10.12 turns one brain into three difficulties, shows why it chooses each move, and measures it over whole games.',
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [
    {
      id: 'mg10-011-ex1',
      title: 'A Q value',
      difficulty: 'easy',
      problem: 'w = [−5, 2], φ = [1, 0.5]. Q?',
      steps: [
        {
          expression: '-5 \\times 1 + 2 \\times 0.5 = -4',
          annotation: 'Multiply and add.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: '−4.',
    },
    {
      id: 'mg10-011-ex2',
      title: 'A target',
      difficulty: 'medium',
      problem: 'After a play the AI earns −2 before its next turn, where its legal moves are worth −3.1, −4 and −6. Target?',
      steps: [
        {
          expression: '-2 + \\max(-3.1, -4, -6) = -5.1',
          annotation: 'The best next legal move, γ = 1.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: '−5.1 (cell 2).',
    },
    {
      id: 'mg10-011-ex3',
      title: 'An update',
      difficulty: 'hard',
      problem: 'w = [−5, 2, 0.5, −1], φ = [1, 0.5, 0.48, 0.2], target −5.1, α 0.1. The new weights?',
      steps: [
        {
          expression: 'Q = -5 + 1 + 0.24 - 0.2 = -3.96',
          annotation: 'The current value.',
          strategyTitle: 'Step 1: Q',
        },
        {
          expression: '\\delta = -5.1 + 3.96 = -1.14',
          annotation: 'Worse than expected.',
          strategyTitle: 'Step 2: δ',
        },
        {
          expression: 'w_i \\mathrel{+}= 0.1 \\times -1.14 \\times \\phi_i',
          annotation: 'Each in proportion to its feature.',
          strategyTitle: 'Step 3',
        },
      ],
      answer: '[−5.114, 1.943, 0.445, −1.023] (cell 2).',
    },
  ],

  challenges: [
    {
      id: 'mg10-011-ch1',
      title: 'Zero weights',
      difficulty: 'easy',
      problem: 'Why does the AI play at random before training?',
      hint: 'w · φ with w = 0.',
      answer: 'Every move has Q = 0, so ties are broken at random.',
      walkthrough: [],
    },
    {
      id: 'mg10-011-ch2',
      title: 'A feature it never has',
      difficulty: 'medium',
      problem: 'If a feature is always 0 in training, what happens to its weight?',
      hint: 'α δ φᵢ.',
      answer: 'It never changes: a weight learns only from moves that have its feature.',
      walkthrough: [],
    },
    {
      id: 'mg10-011-ch3',
      title: 'Self-play',
      difficulty: 'hard',
      problem: 'After training against the rules player, how could the AI keep improving?',
      hint: 'table.partner.',
      answer: "Save its brain and train again with partner = 'brain' (and weights starting from the saved ones): it then learns replies to its own play, not just to the rules player.",
      walkthrough: [],
    },
  ],

  semantics: {
    core: [
      {
        symbol: 'Q = w · φ',
        meaning: "A move's value: weights times features.",
      },
      {
        symbol: 'target',
        meaning: 'R + max over next legal moves of w · φ′ (R at the end).',
      },
      {
        symbol: 'δ',
        meaning: 'target − Q: how much better or worse than expected.',
      },
      {
        symbol: 'w ← w + α δ φ',
        meaning: 'Each weight in proportion to its feature.',
      },
      {
        symbol: 'α schedule',
        meaning: 'Large steps early, small late.',
      },
    ],
    rulesOfThumb: [
      'Start α near 0.1 with features near 1.',
      'Shrink α over training.',
      'Judge on fresh deals, not the best check.',
      'Read the weights: they should make sense.',
    ],
  },

  misconceptions: [
    {
      falseBelief: 'The best checkpoint score is how good the AI is.',
      whyStudentsThinkIt: 'It was measured.',
      correctionExample: 'The best of many noisy checks flatters: +0.5 at checks, +0.2 on fresh deals.',
      contrastCase: 'Measure the chosen brain on new deals.',
    },
    {
      falseBelief: 'A negative Q means a bad move.',
      whyStudentsThinkIt: 'Negative sounds bad.',
      correctionExample: 'Q is the expected rest-of-hand difference; when the hand is going your way every move is negative, and the best is the least negative (cell 1).',
      contrastCase: 'Only the differences between moves matter for choosing.',
    },
  ],

  transferPrompts: [
    {
      situation: 'An NPC that chooses among actions described by features (distance to cover, enemy health, ammo).',
      competingTechniques: ['A Q table over binned states', "Linear Q over the actions' features"],
      whyThisTechniqueWins: 'It generalises across situations a table could never cover.',
    },
    {
      situation: 'A learned AI that plays too predictably.',
      competingTechniques: ['Retrain it', 'Keep its brain and choose by softmax at a temperature'],
      whyThisTechniqueWins: 'Lesson 10.12: one number makes it easier and less predictable.',
    },
  ],

  debugging: [
    {
      commonError: 'max over all moves in the target, including illegal ones.',
      symptom: 'Values drift up; the AI values impossible moves.',
      whyItHappened: "An illegal move's Q is not a real option.",
      repairStrategy: 'max over the next legal moves only.',
    },
    {
      commonError: 'Bootstrapping at the end of the hand.',
      symptom: 'The last moves are valued as if the hand went on.',
      whyItHappened: 'There is no next move after the show.',
      repairStrategy: 'target = R when the hand is over.',
    },
    {
      commonError: 'α too large.',
      symptom: 'Weights grow to hundreds; play is erratic.',
      whyItHappened: 'Updates overshoot.',
      repairStrategy: 'Smaller α, scaled features, a schedule.',
    },
  ],

  mastery: {
    targetLevel: 3,
    solveIndependently: 'Train a linear Q AI for a turn-based game and judge it.',
    explainVerbally: 'Explain Q = w · φ, the target, the update and the schedules.',
    detectIncorrectApplication: 'Spot an unmasked max, a bootstrapped ending, a flattering check score.',
    transferToUnfamiliar: "Apply linear Q-learning to another game's decisions.",
  },

  assessment: {
    questions: [
      {
        id: 'mg10-011-assess-1',
        type: 'choice',
        text: 'In the update, each weight changes by',
        options: ['α δ φᵢ', 'α δ', 'α φᵢ', 'δ φᵢ²'],
        answer: 'α δ φᵢ',
        hint: 'Cell 2.',
      },
    ],
  },

  quiz: [
    {
      id: 'mg10-011-quiz-1',
      type: 'choice',
      text: 'On a 5 holding K 2 9 4, the brain values most',
      options: ['The king', 'The 2', 'The 9', 'The 4'],
      answer: 'The king',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg10-011-quiz-2',
      type: 'choice',
      text: 'In cell 2, δ is',
      options: ['−1.14', '−5.10', '−3.96', '1.14'],
      answer: '−1.14',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg10-011-quiz-3',
      type: 'choice',
      text: 'In cell 3, after 400 hands it plays at about',
      options: [
        "The rules player's level",
        '−5 points a hand',
        '+5 points a hand',
        "Random play's level",
      ],
      answer: "The rules player's level",
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg10-011-quiz-4',
      type: 'choice',
      text: 'With α fixed at 0.1, the estimate after 4,000 samples',
      options: [
        'Still swings from about 2 to 8',
        'Is exactly 5',
        'Settles between 4.8 and 5.3',
        'Diverges',
      ],
      answer: 'Still swings from about 2 to 8',
      hints: ['Cell 4.'],
      reviewSection: 'Cell 4',
    },
    {
      id: 'mg10-011-quiz-5',
      type: 'choice',
      text: 'Which pegging weights did it learn to be negative?',
      options: [
        'The three chances against it',
        'Points now',
        'My hand (show)',
        'The crib',
      ],
      answer: 'The three chances against it',
      hints: ['Cell 5.'],
      reviewSection: 'Cell 5',
    },
    {
      id: 'mg10-011-quiz-6',
      type: 'choice',
      text: 'On fresh deals the shipped brain makes against the rules player',
      options: ['+0.21 points a hand', '+0.5', '−4.7', '+4.8'],
      answer: '+0.21 points a hand',
      hints: ["The game's brain."],
      reviewSection: "Intuition — the game's brain",
    },
  ],

  checkpoints: [
    {
      id: 'cp-mg10-011-1',
      label: 'Read Q = w · φ, the target and the update',
      type: 'read',
    },
    {
      id: 'cp-mg10-011-2',
      label: 'Read exploration, α and checkpoints',
      type: 'read',
    },
    {
      id: 'cp-mg10-011-3',
      label: 'Run the notebook: learning, for real',
      type: 'read',
    },
    {
      id: 'cp-mg10-011-4',
      label: 'Complete "Training the AI" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg10-011-5',
      label: "Read the game's brain and what it learned",
      type: 'read',
    },
    {
      id: 'cp-mg10-011-6',
      label: 'Work through the target',
      type: 'example',
    },
    {
      id: 'cp-mg10-011-7',
      label: 'Work through the update',
      type: 'example',
    },
    {
      id: 'cp-mg10-011-8',
      label: 'Pass the update challenge',
      type: 'challenge',
    },
  ],

  chapter: 'making-games-10',
}
