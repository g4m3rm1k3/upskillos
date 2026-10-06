export default {
  order: 4,

  id: 'mg10-004',

  slug: 'scoring-the-show',

  title: 'Scoring the Show',

  subtitle: 'Five rules, one idea: look at every combination of the cards. Fifteens, pairs, runs, flush and nobs, as code.',

  tags: [
    'game-studio',
    'cribbage',
    'combinatorics',
    'subsets',
    'bitmasks',
    'rules-engine',
  ],

  aliases: 'score hand show fifteens pairs runs double run flush nobs subsets power set bitmask combinations scoring function parts sayParts 29 hand',

  timeToComplete: 60,

  coreConcept: 'Every scoring rule asks a question about combinations of the five cards, so the tool is subsets: every combination, 2⁵ − 1 = 31 of them, made by counting from 1 to 31 and reading each number\'s bits as "this card is in". Fifteens: the subsets adding to 15. Pairs: every two cards of a rank, so three of a kind is three pairs. Runs: the longest length that has any run, every subset of that length that is one. Flush and nobs look at suits. Each rule returns its parts, { what, cards, points }, so the game can say "fifteen 2, fifteen 4, a pair is 6".',

  prerequisites: ['mg10-003'],

  nextLesson: 'mg10-005',

  hook: {
    question: 'A player counts 4 5 6 6 with a 4 cut as "fifteen 2, 4, 6, 8, and 16 is 24". How would a program find all of those, and be sure it missed none and counted none twice?',
    realWorldContext: 'Scoring rules that look at combinations appear in every card and dice game (poker hands, Yahtzee, rummy melds), and "look at every subset" is the honest first algorithm for each. With five cards it is 31 subsets, instantly; knowing when that stops being cheap (2ⁿ grows fast) is part of the skill.',
  },

  intuition: {
    prose: [
      '**Every combination.** Five cards (four and the starter) have 31 non-empty subsets. A neat way to list them: count from 1 to 2⁵ − 1 = 31 and read each number in binary, bit i saying whether card i is in. 5 is 00101: the first and third cards. subsets(cards) does exactly that with mask & (1 << i) (cell 1). Every rule below is a filter over those subsets.',
      "**Fifteens.** 2 points for every different set of cards whose values add up to 15. So filter the subsets by their sum. 4 5 6 6 with a 4 has four: each 4 with the 5 and each 6 (cell 2). Five fives and a jack-or-ten pattern like 5 5 5 J 5 has eight: four 5+J and four 5+5+5. Each fifteen is a part { what: 'fifteen', cards, points: 2 }.",
      '**Pairs.** 2 for every two cards of the same rank, checked for every i < j. Three 7s make three different pairs (6, "pair royal"); four 2s make six pairs (12, "double pair royal"). Counting pairs this way gives the traditional scores without any special cases (cell 3).',
      '**Runs, the tricky one.** A run is three or more cards of consecutive ranks, in any order; aces are low, so A 2 3 is a run and Q K A is not. Two rules make it tricky. Only the longest runs count: 3 4 5 6 is one run of four (4), not two runs of three inside it. And each different set of cards counts: 3 4 4 5 has two runs of three, one with each 4 (6, a "double run"). So: try lengths from the longest down; at the first length where any subset is a run, return every such subset, and stop (cell 4).',
      '**Flush.** Four cards of one suit in the hand: 4, or 5 if the starter matches. In the crib, only all five count. This rule is about the hand, not the subsets.',
      "**Nobs.** The jack of the starter's suit in the hand: 1.",
      '**The total.** scoreHand(hand, starter, isCrib) joins all five lists of parts and adds the points. Returning the parts, not just the total, lets the show say how it counted (sayParts adds them up as a player says them: "fifteen 2, fifteen 4, pair 6"), and lets a test see exactly which part is wrong.',
      '**What a hand is worth.** Cell 5 deals 20,000 random hands with random starters: the average is 4.79 points, and the most common scores are 4, 2, 6, 8 and 0. 19, 25, 26 and 27 never come up because no hand can score them; 28 and 29 are possible but rare (29 is about one hand in 216,000). The average matters later: the AI will need to know what a hand is worth on average, before the starter is cut.',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: scoring a hand',
        body: "Step 1. Put the four cards and the starter together. Step 2. Fifteens: every subset whose values add to 15, 2 each. Step 3. Pairs: every two cards of one rank, 2 each. Step 4. Runs: the longest length with any run; every subset of that length that is a run, one point a card. Step 5. Flush: the hand's four of one suit, 4 (5 with the starter); a crib needs five. Step 6. Nobs: the jack of the starter's suit, 1. Step 7. Add the parts.",
      },
      {
        type: 'warning',
        title: 'Runs inside runs',
        body: 'A run of four contains two runs of three; counting them too would give 3 4 5 6 ten points instead of four. Stop at the first (longest) length that has a run.',
      },
      {
        type: 'insight',
        title: 'One idea, five rules',
        body: 'Fifteens and runs are both "which subsets have this property"; pairs are subsets of size two. When a rule is about combinations, list the combinations and filter: it is short, it is obviously complete, and with 31 subsets it is fast.',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Build it: the five rules',
        caption: 'Subsets by bitmask, then fifteens, pairs and runs, then 20,000 hands scored.',
        props: {
          lesson: {
            title: 'Scoring the show',
            subtitle: 'Every combination, filtered.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. Every combination\nPredict first: 3 cards, 5 cards.',
                startCode: "const value = (card) => Math.min(card.rank, 10)\nconst cards = (text) => text.split(' ').map((t) => ({ rank: ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\nconst show = (cs) => cs.map((c) => ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][c.rank] + c.suit).join(' ')\n// Every subset of the cards: a number from 1 to 2ⁿ − 1, read as bits; bit i set means card i is in.\nfunction subsets(cards) {\n  const out = []\n  for (let mask = 1; mask < 1 << cards.length; mask++) out.push(cards.filter((_, i) => mask & (1 << i)))\n  return out\n}\n// Predict first: how many subsets do 3 cards have, and 5?\nconst three = cards('5H 10S KD')\nfor (const s of subsets(three)) console.log(show(s))\nconsole.log('3 cards: ' + subsets(three).length + ' subsets; 5 cards (a hand and the starter): ' + subsets(cards('5H 10S KD 2C 3C')).length)",
              },
              {
                type: 'js',
                instruction: '### 2. Fifteens\nPredict first: 4 5 6 6 with a 4.',
                startCode: "const value = (card) => Math.min(card.rank, 10)\nconst cards = (text) => text.split(' ').map((t) => ({ rank: ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\nconst show = (cs) => cs.map((c) => ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][c.rank] + c.suit).join(' ')\n// Every subset of the cards: a number from 1 to 2ⁿ − 1, read as bits; bit i set means card i is in.\nfunction subsets(cards) {\n  const out = []\n  for (let mask = 1; mask < 1 << cards.length; mask++) out.push(cards.filter((_, i) => mask & (1 << i)))\n  return out\n}\n// Fifteens: 2 points for every DIFFERENT set of cards adding up to 15. Predict first: 4 5 6 6 with a 4 cut.\nfunction fifteens(cards) {\n  return subsets(cards).filter((s) => s.reduce((t, c) => t + value(c), 0) === 15).map((s) => ({ what: 'fifteen', cards: s, points: 2 }))\n}\nfor (const hand of ['4S 5H 6D 6C 4H', '5H 5C 5S JD 5D', '7H 8C 2S 3D KS']) {\n  const f = fifteens(cards(hand))\n  console.log(hand + ': ' + f.length + ' fifteens, ' + 2 * f.length + ' points' + (f.length ? '  [' + f.map((p) => show(p.cards)).join(' | ') + ']' : ''))\n}",
              },
              {
                type: 'js',
                instruction: '### 3. Pairs\nPredict first: three 7s.',
                startCode: "const value = (card) => Math.min(card.rank, 10)\nconst cards = (text) => text.split(' ').map((t) => ({ rank: ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\nconst show = (cs) => cs.map((c) => ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][c.rank] + c.suit).join(' ')\n// Pairs: 2 for every two cards of the same rank. Three of a kind is three different pairs; four of a kind, six.\n// Predict first: what do three 7s score? And four 2s?\nfunction pairs(cards) {\n  const out = []\n  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++)\n    if (cards[i].rank === cards[j].rank) out.push({ what: 'pair', cards: [cards[i], cards[j]], points: 2 })\n  return out\n}\nfor (const hand of ['7H 7S 4D KC 9S', '7H 7S 7D KC 9S', '2H 2S 2D 2C 9S', '4S 4H 6D 6C 5H'])\n  console.log(hand + ': ' + pairs(cards(hand)).length + ' pairs, ' + 2 * pairs(cards(hand)).length + ' points')",
              },
              {
                type: 'js',
                instruction: '### 4. Runs\nPredict first: 3 3 4 4 5.',
                startCode: "const value = (card) => Math.min(card.rank, 10)\nconst cards = (text) => text.split(' ').map((t) => ({ rank: ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\nconst show = (cs) => cs.map((c) => ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][c.rank] + c.suit).join(' ')\n// Every subset of the cards: a number from 1 to 2ⁿ − 1, read as bits; bit i set means card i is in.\nfunction subsets(cards) {\n  const out = []\n  for (let mask = 1; mask < 1 << cards.length; mask++) out.push(cards.filter((_, i) => mask & (1 << i)))\n  return out\n}\n// Runs: three or more ranks in a row, in any order (aces low). Only the LONGEST runs count, once for each different\n// set of cards that makes one. Predict first: 3 4 4 5 K, then 3 3 4 4 5, then 3 4 5 6 6.\nfunction isRun(cards) {\n  const r = cards.map((c) => c.rank).sort((a, b) => a - b)\n  return r.every((x, i) => i === 0 || x === r[i - 1] + 1)\n}\nfunction runs(cards) {\n  for (let length = cards.length; length >= 3; length--) {\n    const found = subsets(cards).filter((s) => s.length === length && isRun(s))\n    if (found.length) return found.map((s) => ({ what: 'run of ' + length, cards: s, points: length }))\n  }\n  return []\n}\nfor (const hand of ['3H 4S 5D KC 9S', '3H 4S 4D 5C KS', '3H 3S 4D 4C 5S', '3H 4S 5D 6C 6S', 'QH KS AD 2C 3S']) {\n  const r = runs(cards(hand))\n  console.log(hand + ': ' + (r.length ? r.length + ' × ' + r[0].what + ' = ' + r.reduce((t, p) => t + p.points, 0) : 'no run'))\n}",
              },
              {
                type: 'js',
                instruction: '### 5. 20,000 hands\nPredict first: the average.',
                startCode: '// A seeded random-number generator (mulberry32, Game Studio\'s), so this cell deals the same cards every run.\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\n// Cards and the deck. A card is a plain object, { rank, suit }: rank 1 (ace) to 13 (king), suit one of S H D C.\n// Nothing here draws anything, so the rules can be tested, and an agent can learn, without a screen.\n\nconst SUITS = [\'S\', \'H\', \'D\', \'C\'];\nconst SUIT_SYMBOL = { S: \'♠\', H: \'♥\', D: \'♦\', C: \'♣\' };\nconst RANK_NAME = [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'];\n\n/** What a card counts for, toward 15 and 31: an ace is 1, a face card 10. */\nfunction value(card) { return Math.min(card.rank, 10); }\n\n/** A card\'s name, such as 10♥. */\nfunction cardName(card) { return RANK_NAME[card.rank] + SUIT_SYMBOL[card.suit]; }\n\n/** Its picture: assets/cards/10H.svg (the card tool, scripts/tools/cards.js, draws all 52, and the back). */\nfunction cardImage(card) { return `assets/cards/${RANK_NAME[card.rank]}${card.suit}.svg`; }\n\n/** A fresh deck: the 52 cards in order. */\nfunction newDeck() {\n  const deck = [];\n  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ rank, suit });\n  return deck;\n}\n\n/**\n * Shuffle in place (Fisher–Yates): for each position from the last down, swap in a card chosen at random from those\n * not yet placed. Every order is equally likely. It uses Math.random, which training seeds, so a hand can be replayed.\n */\nfunction shuffle(deck) {\n  for (let i = deck.length - 1; i > 0; i--) {\n    const j = Math.floor(Math.random() * (i + 1));\n    [deck[i], deck[j]] = [deck[j], deck[i]];\n  }\n  return deck;\n}\n\n/** The same card? (Two objects can describe one card.) */\nfunction sameCard(a, b) { return a.rank === b.rank && a.suit === b.suit; }\n// Scoring cribbage: the show (a hand of four with the starter) and pegging (each card as it is played).\n// Every function returns its points with the reasons, so the game can say "fifteen 2, fifteen 4, a pair is 6".\n\n\n/** Every subset of the cards (by bitmask), as lists: 2ⁿ of them, for n cards. */\nfunction subsets(cards) {\n  const out = [];\n  for (let mask = 1; mask < 1 << cards.length; mask++) out.push(cards.filter((_, i) => mask & (1 << i)));\n  return out;\n}\n\n/** Fifteens: 2 for each different set of cards adding up to 15. */\nfunction fifteens(cards) {\n  const sets = subsets(cards).filter((s) => s.reduce((t, c) => t + value(c), 0) === 15);\n  return sets.map((s) => ({ what: \'fifteen\', cards: s, points: 2 }));\n}\n\n/** Pairs: 2 for each pair of cards of the same rank (three of a kind is three pairs, 6; four is six pairs, 12). */\nfunction pairs(cards) {\n  const out = [];\n  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++)\n    if (cards[i].rank === cards[j].rank) out.push({ what: \'pair\', cards: [cards[i], cards[j]], points: 2 });\n  return out;\n}\n\n/** Is this set of cards a run: different ranks, one after another (in any order)? */\nfunction isRun(cards) {\n  const r = cards.map((c) => c.rank).sort((a, b) => a - b);\n  return r.every((x, i) => i === 0 || x === r[i - 1] + 1);\n}\n\n/**\n * Runs: three or more cards in sequence (aces are low: A 2 3 is a run, Q K A is not). Only the longest runs count,\n * once for each different set of cards that makes one: 3 4 4 5 is two runs of three, 6 points.\n */\nfunction runs(cards) {\n  for (let length = cards.length; length >= 3; length--) {\n    const found = subsets(cards).filter((s) => s.length === length && isRun(s));\n    if (found.length) return found.map((s) => ({ what: `run of ${length}`, cards: s, points: length }));\n  }\n  return [];\n}\n\n/**\n * Flush: the four cards in a hand of one suit, 4, and 5 if the starter is too. The crib only scores a flush of all\n * five.\n */\nfunction flush(hand, starter, isCrib) {\n  if (!hand.every((c) => c.suit === hand[0].suit)) return [];\n  if (starter.suit === hand[0].suit) return [{ what: \'flush\', cards: [...hand, starter], points: 5 }];\n  return isCrib ? [] : [{ what: \'flush\', cards: hand, points: 4 }];\n}\n\n/** Nobs: the jack of the starter\'s suit in the hand, 1. */\nfunction nobs(hand, starter) {\n  const jack = hand.find((c) => c.rank === 11 && c.suit === starter.suit);\n  return jack ? [{ what: \'nobs\', cards: [jack], points: 1 }] : [];\n}\n\n/** The show: a hand of four (or the crib) with the starter. { total, parts }. */\nfunction scoreHand(hand, starter, isCrib = false) {\n  const all = [...hand, starter];\n  const parts = [...fifteens(all), ...pairs(all), ...runs(all), ...flush(hand, starter, isCrib), ...nobs(hand, starter)];\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** The count: what the cards played since the last reset add up to. */\nfunction countOf(pile) { return pile.reduce((t, c) => t + value(c), 0); }\n\n/**\n * Pegging: the points for the card just played, the last of `pile` (the cards played since the count was last\n * reset to 0). 15 or 31 is 2; a pair with the card before is 2, three of a kind 6, four 12; a run is one point a card,\n * when the last three or more cards (in any order) make one.\n */\nfunction pegPoints(pile) {\n  const parts = [], count = countOf(pile), card = pile[pile.length - 1];\n  if (count === 15) parts.push({ what: \'fifteen\', points: 2 });\n  if (count === 31) parts.push({ what: \'thirty-one\', points: 2 });\n  let same = 1;\n  while (same < pile.length && pile[pile.length - 1 - same].rank === card.rank) same++;\n  if (same >= 2) parts.push({ what: [\'\', \'\', \'a pair\', \'three of a kind\', \'four of a kind\'][same], points: [0, 0, 2, 6, 12][same] });\n  for (let length = pile.length; length >= 3; length--) {\n    if (isRun(pile.slice(-length))) { parts.push({ what: `run of ${length}`, points: length }); break; }\n  }\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** "fifteen 2, a pair is 4, …": points as they are said aloud. */\nfunction sayParts(parts) {\n  let running = 0;\n  return parts.map((p) => `${p.what} ${(running += p.points)}`).join(\', \');\n}\nconst cards = (text) => text.split(\' \').map((t) => ({ rank: [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\n// The whole show, with the flush and nobs: the game\'s scoreHand. Then 20,000 random hands with a random starter:\n// predict first: the average a hand scores, and the most common score.\nconst rand = seeded(3), real = Math.random\nMath.random = rand\nconst counts = {}\nlet sum = 0\nfor (let k = 0; k < 20000; k++) {\n  const deck = shuffle(newDeck()), t = scoreHand(deck.slice(0, 4), deck[4]).total\n  counts[t] = (counts[t] || 0) + 1; sum += t\n}\nMath.random = real\nconsole.log(\'average \' + (sum / 20000).toFixed(2) + \' points a hand\')\nconst common = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 5)\nconsole.log(\'most common: \' + common.map((t) => t + \' points (\' + (100 * counts[t] / 20000).toFixed(1) + \'%)\').join(\', \'))\nconsole.log(\'never seen in 20,000: \' + [...Array(30).keys()].filter((t) => !counts[t]).join(\', \'))',
              },
              {
                type: 'challenge',
                instruction: '### 6. Challenge: runs\nSix hands check it.',
                startCode: "const value = (card) => Math.min(card.rank, 10)\nconst cards = (text) => text.split(' ').map((t) => ({ rank: ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\nconst show = (cs) => cs.map((c) => ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][c.rank] + c.suit).join(' ')\n// Every subset of the cards: a number from 1 to 2ⁿ − 1, read as bits; bit i set means card i is in.\nfunction subsets(cards) {\n  const out = []\n  for (let mask = 1; mask < 1 << cards.length; mask++) out.push(cards.filter((_, i) => mask & (1 << i)))\n  return out\n}\nfunction isRun(cards) { const r = cards.map((c) => c.rank).sort((a, b) => a - b); return r.every((x, i) => i === 0 || x === r[i - 1] + 1) }\n// Challenge: write runs(cards). The longest runs only, one part per different set of cards: { what, cards, points }.\nfunction runs(cards) {\n  return []   // your code\n}\nconst cases = [['3H 4S 5D KC 9S', 3], ['3H 4S 4D 5C KS', 6], ['3H 3S 4D 4C 5S', 12], ['3H 4S 5D 6C 6S', 8], ['QH KS AD 2C 3S', 3], ['2H 4S 6D 8C 10S', 0]]\nlet ok = 0\nfor (const [hand, want] of cases) {\n  const got = runs(cards(hand)).reduce((t, p) => t + p.points, 0)\n  if (got === want) ok++; else console.log(hand + ': your runs score ' + got + '; they should score ' + want + '.')\n}\nconsole.log(ok === cases.length ? '✓ All 6 hands\\' runs scored.' : ok + ' of 6 hands scored.')",
                solutionCode: "const value = (card) => Math.min(card.rank, 10)\nconst cards = (text) => text.split(' ').map((t) => ({ rank: ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\nconst show = (cs) => cs.map((c) => ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][c.rank] + c.suit).join(' ')\n// Every subset of the cards: a number from 1 to 2ⁿ − 1, read as bits; bit i set means card i is in.\nfunction subsets(cards) {\n  const out = []\n  for (let mask = 1; mask < 1 << cards.length; mask++) out.push(cards.filter((_, i) => mask & (1 << i)))\n  return out\n}\nfunction isRun(cards) { const r = cards.map((c) => c.rank).sort((a, b) => a - b); return r.every((x, i) => i === 0 || x === r[i - 1] + 1) }\n// Challenge: write runs(cards). The longest runs only, one part per different set of cards: { what, cards, points }.\nfunction runs(cards) {\n  for (let length = cards.length; length >= 3; length--) {\n    const found = subsets(cards).filter((s) => s.length === length && isRun(s))\n    if (found.length) return found.map((s) => ({ what: 'run of ' + length, cards: s, points: length }))\n  }\n  return []\n}\nconst cases = [['3H 4S 5D KC 9S', 3], ['3H 4S 4D 5C KS', 6], ['3H 3S 4D 4C 5S', 12], ['3H 4S 5D 6C 6S', 8], ['QH KS AD 2C 3S', 3], ['2H 4S 6D 8C 10S', 0]]\nlet ok = 0\nfor (const [hand, want] of cases) {\n  const got = runs(cards(hand)).reduce((t, p) => t + p.points, 0)\n  if (got === want) ok++; else console.log(hand + ': your runs score ' + got + '; they should score ' + want + '.')\n}\nconsole.log(ok === cases.length ? '✓ All 6 hands\\' runs scored.' : ok + ' of 6 hands scored.')",
              },
              {
                type: 'markdown',
                instruction: "### 7. The code you wrote, line by line\n\nAll of it is scripts/score.js, a rule at a time.\n\n```js\nimport { value } from './cards.js';\nfunction subsets(cards) {\n  const out = [];\n  for (let mask = 1; mask < 1 << cards.length; mask++) out.push(cards.filter((_, i) => mask & (1 << i)));\n  return out;\n```\n\nEvery combination of the cards. `1 << n` is 2 to the power n (a 1 moved n places left in binary); for five cards, 32. Each `mask` from 1 to 31 is a different pattern of five bits, one bit per card: `mask & (1 << i)` is non-zero when card i's bit is set, so `filter` keeps exactly the cards that pattern picks (cell 1). 31 masks, 31 combinations. `subsets` is not exported: only this file uses it.\n\n```js\nexport function fifteens(cards) {\n  const sets = subsets(cards).filter((s) => s.reduce((t, c) => t + value(c), 0) === 15);\n  return sets.map((s) => ({ what: 'fifteen', cards: s, points: 2 }));\n```\n\nThe combinations whose values add to 15 (`reduce` adds them, starting from 0), each turned into a part: what it is, the cards, and 2 points. Every rule returns parts like this, so the game can say why.\n\n```js\nexport function pairs(cards) {\n  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++)\n    if (cards[i].rank === cards[j].rank) out.push({ what: 'pair', cards: [cards[i], cards[j]], points: 2 });\n```\n\nEvery two cards once (j starts after i, so no pair is counted twice and no card is paired with itself), with the same rank: 2 each. Three sevens are three pairs, 6; four are six, 12. (It starts and ends like subsets: `const out = []` and `return out`.)\n\n```js\nfunction isRun(cards) {\n  const r = cards.map((c) => c.rank).sort((a, b) => a - b);\n  return r.every((x, i) => i === 0 || x === r[i - 1] + 1);\n```\n\nThe ranks, sorted from low to high (`(a, b) => a - b` sorts numbers; without it, sort would sort them as text). A run if every rank after the first is one more than the one before.\n\n```js\nexport function runs(cards) {\n  for (let length = cards.length; length >= 3; length--) {\n    const found = subsets(cards).filter((s) => s.length === length && isRun(s));\n    if (found.length) return found.map((s) => ({ what: `run of ${length}`, cards: s, points: length }));\n  return [];\n```\n\nFrom the longest possible down to 3: the combinations of that length that are runs. The first length that has any is the answer, one part per run, so 3 4 5 6 is one run of four, not two of three, and 3 4 4 5 is two runs of three. No run of three or more: nothing.\n\n```js\nexport function flush(hand, starter, isCrib) {\n  if (!hand.every((c) => c.suit === hand[0].suit)) return [];\n  if (starter.suit === hand[0].suit) return [{ what: 'flush', cards: [...hand, starter], points: 5 }];\n  return isCrib ? [] : [{ what: 'flush', cards: hand, points: 4 }];\n```\n\nAll four in the hand the same suit as the first, or nothing. The starter matching too: 5. Otherwise 4, unless this is the crib, which only scores a flush of all five.\n\n```js\nexport function nobs(hand, starter) {\n  const jack = hand.find((c) => c.rank === 11 && c.suit === starter.suit);\n  return jack ? [{ what: 'nobs', cards: [jack], points: 1 }] : [];\n```\n\nThe jack (rank 11) of the starter's suit, if the hand has it (`find` gives the first match, or undefined): 1.\n\n```js\nexport function scoreHand(hand, starter, isCrib = false) {\n  const all = [...hand, starter];\n  const parts = [...fifteens(all), ...pairs(all), ...runs(all), ...flush(hand, starter, isCrib), ...nobs(hand, starter)];\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n```\n\nThe show: the hand with the starter, every rule's parts in one list (`...` spreads each list into the new one), and the total of their points. Fifteens, pairs and runs use all five cards; flush and nobs need to know which is the starter.",
              },
              {
                type: 'markdown',
                instruction: "### 8. Questions you might have\n\n**Why go through every combination instead of something cleverer?** Five cards have only 31 combinations, so trying them all is instant and obviously right. Clever shortcuts are where scoring bugs hide.\n\n**Why does runs() return at the first length with any?** Only the longest runs count: a run of four contains two runs of three, and counting those too would score it twice.\n\n**Why is isRun not exported?** It is a helper for runs() here (and pegging, in lesson 10.5). What a module exports is what other scripts may use; the rest is its own business.\n\n**What is `isCrib = false`?** A default: scoreHand(hand, starter) scores a hand, and only the crib passes true.\n\n**How does the 29 hand score 29?** 5 5 5 J with the 5 of the jack's suit cut: eight fifteens (16), six pairs of fives (12) and nobs (1). The lesson's notebook counts it.",
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Write score.js: the show',
        props: {
          task: 'crib-score',
          lesson: 'mg10-004',
          checkpoint: 'cp-mg10-004-4',
        },
      },
    ],
  },

  math: {
    prose: [
      '**Under the hood (optional).** A set of $n$ cards has $2^n$ subsets, the empty one included, because each card is in or out: $2^5 - 1 = 31$ non-empty ones. The bitmask is that "in or out" written as a binary number.',
      'Pairs among $k$ cards of one rank: $\\binom{k}{2}$, so 1, 3 and 6 pairs for two, three and four of a kind: 2, 6 and 12 points.',
      "There are $\\binom{52}{4} \\times 48 = 12{,}994{,}800$ hand-and-starter combinations; 1,009,008 of them (7.8%) score nothing, and the average over all of them is 4.77. Cell 5's 4.79 and 7.4% from 20,000 random hands are those numbers, measured.",
    ],
    equations: [
      {
        label: 'Subsets of n cards',
        latex: '2^n - 1 = 31 \\text{ for } n = 5',
      },
      {
        label: 'Pairs among k of a rank',
        latex: '\\binom{k}{2}:\\ 1,\\ 3,\\ 6',
      },
    ],
    callouts: [],
    visualizations: [],
  },

  rigor: {
    prose: [
      'Each rule is a function of the five cards only (and the crib flag), so it can be tested on fixed hands: the Try it checks run 29, 24, 12 and 0 hands through yours.',
      'The run rule is exactly: let L be the largest length for which some subset is a run; score L for each such subset. With five cards L is at most 5, and multiplicity comes only from repeated ranks.',
      'Where it goes: 10.5 scores cards as they are played (pegging), which looks at the end of a sequence rather than at subsets.',
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [
    {
      id: 'mg10-004-ex1',
      title: 'A bitmask',
      difficulty: 'easy',
      problem: 'Which cards does mask 6 (binary 110) choose from [A, B, C]?',
      steps: [
        {
          expression: '6 = 110_2',
          annotation: 'Bits 1 and 2 are set.',
          strategyTitle: 'Step 1: read the bits',
        },
      ],
      answer: 'B and C.',
    },
    {
      id: 'mg10-004-ex2',
      title: 'A double run',
      difficulty: 'medium',
      problem: 'Score the runs of 6 7 7 8 J.',
      steps: [
        {
          expression: '\\{6, 7_a, 8\\},\\ \\{6, 7_b, 8\\}',
          annotation: 'Two runs of three, one with each 7.',
          strategyTitle: 'Step 1: longest runs',
        },
      ],
      answer: '6.',
    },
    {
      id: 'mg10-004-ex3',
      title: 'A full count',
      difficulty: 'hard',
      problem: 'Score 7 7 8 8 with a 9 cut (all different suits).',
      steps: [
        {
          expression: '7+8 \\times 4',
          annotation: 'Four fifteens: 8.',
          strategyTitle: 'Step 1: fifteens',
        },
        {
          expression: '7\\,7,\\ 8\\,8',
          annotation: 'Two pairs: 4.',
          strategyTitle: 'Step 2: pairs',
        },
        {
          expression: '7\\,8\\,9 \\times 4',
          annotation: 'Four runs of three: 12.',
          strategyTitle: 'Step 3: runs',
        },
      ],
      answer: "24 (lesson 10.1's challenge, crib 4).",
    },
  ],

  challenges: [
    {
      id: 'mg10-004-ch1',
      title: 'Three of a kind',
      difficulty: 'easy',
      problem: 'Why does pairs() give three of a kind 6 without a special case?',
      hint: 'Count i < j.',
      answer: 'Three cards have three pairs (i < j), 2 each.',
      walkthrough: [],
    },
    {
      id: 'mg10-004-ch2',
      title: 'Aces high',
      difficulty: 'medium',
      problem: 'Some games let Q K A be a run. What would you change?',
      hint: 'isRun.',
      answer: 'In isRun, also accept the ranks sorted with the ace as 14: try both orders.',
      walkthrough: [],
    },
    {
      id: 'mg10-004-ch3',
      title: 'Seven cards',
      difficulty: 'hard',
      problem: 'A variant shows seven cards. How many subsets, and is "list them all" still fine?',
      hint: '2⁷.',
      answer: '127 subsets: still instant. At 20 cards it would be a million, and smarter counting would be worth it.',
      walkthrough: [],
    },
  ],

  semantics: {
    core: [
      {
        symbol: 'subsets(cards)',
        meaning: 'Every combination, by bitmask.',
      },
      {
        symbol: 'fifteens',
        meaning: 'Subsets adding to 15, 2 each.',
      },
      {
        symbol: 'pairs',
        meaning: 'Every two of a rank, 2 each.',
      },
      {
        symbol: 'runs',
        meaning: 'The longest runs, each different set once.',
      },
      {
        symbol: '{ what, cards, points }',
        meaning: 'A part of the score, so it can be said and tested.',
      },
    ],
    rulesOfThumb: [
      'Combinations: list them, then filter.',
      'Longest runs only.',
      'Return the parts, not just the total.',
    ],
  },

  misconceptions: [
    {
      falseBelief: 'A run of four also scores the runs of three inside it.',
      whyStudentsThinkIt: 'They are runs too.',
      correctionExample: '3 4 5 6 scores 4, not 10 (cell 4).',
      contrastCase: 'A double run counts each different set: 3 4 4 5 is 6.',
    },
    {
      falseBelief: 'Three of a kind needs its own rule.',
      whyStudentsThinkIt: 'It has its own name.',
      correctionExample: 'It is three pairs: 6 (cell 3).',
      contrastCase: 'Four of a kind is six pairs: 12.',
    },
  ],

  transferPrompts: [
    {
      situation: 'Scoring a Yahtzee roll.',
      competingTechniques: [
        'A chain of special cases',
        'Count each face, then test each category',
      ],
      whyThisTechniqueWins: 'Counting first makes each category a short test.',
    },
    {
      situation: 'Finding melds in rummy.',
      competingTechniques: [
        'Hand-written patterns',
        'Subsets filtered by "is a set" and "is a run"',
      ],
      whyThisTechniqueWins: 'Complete and obviously correct for small hands.',
    },
  ],

  debugging: [
    {
      commonError: 'Counting runs at every length.',
      symptom: 'A run of four scores 10.',
      whyItHappened: 'The shorter runs inside were counted too.',
      repairStrategy: 'Return at the first length that has a run.',
    },
    {
      commonError: 'Counting a fifteen per card instead of per set.',
      symptom: 'Fifteens too high.',
      whyItHappened: 'The same set was found more than once.',
      repairStrategy: 'Each subset once: the bitmask lists each exactly once.',
    },
    {
      commonError: "Including the starter in the flush's four.",
      symptom: 'Hands with three of a suit plus the starter score a flush.',
      whyItHappened: "The flush is the hand's four first.",
      repairStrategy: 'Check the four hand cards; then the starter for 5.',
    },
  ],

  mastery: {
    targetLevel: 3,
    solveIndependently: 'Write all five scoring rules.',
    explainVerbally: 'Explain subsets by bitmask and the run rule.',
    detectIncorrectApplication: 'Spot runs counted inside runs and a crib flush of four.',
    transferToUnfamiliar: "Score another game's combinations by listing and filtering.",
  },

  assessment: {
    questions: [
      {
        id: 'mg10-004-assess-1',
        type: 'choice',
        text: '3 4 4 5 scores in runs',
        options: ['6', '3', '4', '8'],
        answer: '6',
        hint: 'Cell 4.',
      },
    ],
  },

  quiz: [
    {
      id: 'mg10-004-quiz-1',
      type: 'choice',
      text: 'Five cards have how many non-empty subsets?',
      options: ['31', '32', '25', '120'],
      answer: '31',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg10-004-quiz-2',
      type: 'choice',
      text: '5 5 5 J 5 has how many fifteens?',
      options: ['8', '4', '6', '7'],
      answer: '8',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg10-004-quiz-3',
      type: 'choice',
      text: 'Four of a kind scores',
      options: ['12', '8', '6', '4'],
      answer: '12',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg10-004-quiz-4',
      type: 'choice',
      text: '3 4 5 6 6 scores in runs',
      options: ['8', '4', '10', '6'],
      answer: '8',
      hints: ['Cell 4.'],
      reviewSection: 'Cell 4',
    },
    {
      id: 'mg10-004-quiz-5',
      type: 'choice',
      text: 'A random hand with the starter averages about',
      options: ['4.8 points', '10 points', '2 points', '15 points'],
      answer: '4.8 points',
      hints: ['Cell 5.'],
      reviewSection: 'Cell 5',
    },
    {
      id: 'mg10-004-quiz-6',
      type: 'choice',
      text: 'Which score can no hand make?',
      options: ['19', '20', '24', '29'],
      answer: '19',
      hints: ['Cell 5.'],
      reviewSection: 'Cell 5',
    },
  ],

  checkpoints: [
    {
      id: 'cp-mg10-004-1',
      label: 'Read subsets, fifteens and pairs',
      type: 'read',
    },
    {
      id: 'cp-mg10-004-2',
      label: 'Read runs, flush and nobs',
      type: 'read',
    },
    {
      id: 'cp-mg10-004-3',
      label: 'Run the notebook',
      type: 'read',
    },
    {
      id: 'cp-mg10-004-4',
      label: 'Complete "Scoring the show" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg10-004-5',
      label: 'Read what a hand is worth',
      type: 'read',
    },
    {
      id: 'cp-mg10-004-6',
      label: 'Work through the double run',
      type: 'example',
    },
    {
      id: 'cp-mg10-004-7',
      label: 'Work through the full count',
      type: 'example',
    },
    {
      id: 'cp-mg10-004-8',
      label: 'Pass the runs challenge',
      type: 'challenge',
    },
  ],

  chapter: 'making-games-10',
}
