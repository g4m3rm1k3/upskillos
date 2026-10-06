export default {
  order: 1,

  id: 'mg10-001',

  slug: 'cribbage-the-game-you-will-build',

  title: 'Cribbage: the Game You Will Build',

  subtitle: 'Every rule of cribbage, the finished game with its learning AI, and the plan for building both.',

  tags: [
    'game-studio',
    'cribbage',
    'card-games',
    'game-design',
    'machine-learning',
  ],

  aliases: 'cribbage rules crib starter cut pegging go thirty-one show fifteens pairs runs flush nobs his heels 121 card game ai opponent',

  timeToComplete: 45,

  coreConcept: "Cribbage is played to 121 points, in hands. Each hand: six cards each, two thrown to the dealer's crib, a starter cut, then pegging (cards played in turn, the count up to 31, points for 15, 31, pairs, runs and the last card), then the show (each hand of four with the starter scores fifteens, pairs, runs, flush and nobs; the crib counts for the dealer). The game you will build has these rules in plain modules, cards drawn as SVG, and an AI that learned to play by playing.",

  prerequisites: ['mg9-003'],

  nextLesson: 'mg10-002',

  hook: {
    question: 'You have built games that move: a platformer, Breakout, Tetris. What does it take to build a game that thinks, with an opponent that holds cards you cannot see and has to decide what to keep and what to play?',
    realWorldContext: 'Card games are where game AI meets hidden information: the AI cannot see your hand, so it must play the odds. Cribbage, a 400-year-old English pub game, is small enough to build completely and deep enough that its scoring and its decisions are interesting. Everything this chapter does, a rules engine, generated art, a turn-based learning agent and difficulty settings, is how card and board game AI is built for real.',
  },

  intuition: {
    prose: [
      "**Play it first.** The Try it card opens the finished game. Press ▶ Run, choose Easy, Medium or Hard, and play a hand. Press D for the developer view: the AI's cards turn face up, and beside them is what its brain thought of every move it could have made. That is what this chapter builds, every line of it.",
      '**The deal.** Two players. The dealer shuffles and deals six cards each, one at a time, the other player (the non-dealer, or *pone*) first. The deal alternates every hand. Cell 1 counts the cards: 12 dealt, 40 left.',
      '**The crib.** Each player throws two of their six cards face down into the *crib*, a third hand that belongs to the dealer. So you keep four. Throwing is the first decision of every hand: keep the four that score best, and give the crib good cards when it is yours and bad ones when it is not.',
      '**The cut.** The top card of the deck is turned up: the *starter*. It counts as a fifth card in every hand at the show. If it is a jack, the dealer pegs 2, "his heels".',
      '**Pegging.** The non-dealer leads. Players take turns playing one card face up, saying the running total, the *count* (an ace is 1, a face card 10). The count may not pass 31. You score as you play: 2 for making the count 15 or 31; 2 for a pair with the card before, 6 for three of a kind, 12 for four; and for a run, the last three or more cards in sequence in any order, one point a card. Cell 3 plays six cards and pegs them.',
      '**The go.** If you cannot play without passing 31, you say "go" and the other player plays on as long as they can. When neither can play, the last to play pegs 1 for the go (nothing extra if they made exactly 31), the count goes back to 0, and the other player leads. The very last card of all pegs 1.',
      "**The show.** Players pick up their own four cards and count them with the starter: the non-dealer's hand first, then the dealer's, then the crib (the dealer's too). Fifteens: 2 for each different set of cards adding to 15. Pairs: 2 each. Runs: one point a card, for each different run of three or more. Flush: four cards of one suit in the hand, 4 (5 with the starter); the crib only counts a flush of all five. Nobs: the jack of the starter's suit, 1. Cell 2 counts four famous hands; the best possible is 29.",
      '**Winning.** Points are pegged on a board as they are scored, with two pegs each (the back one marks where you were). The first to 121 wins, at once, even in the middle of pegging; so the order of counting at the show matters near the end.',
      "**The plan.** The game is seven scripts, each a lesson: cards.js (the deck, 10.2), pictures drawn as SVG by code (10.3), score.js (the show, 10.4, and pegging, 10.5), table.js (the game's flow, 10.6, and the screen and clicks, 10.7), partner.js (a rules player, 10.8), then the AI: opponent.js as a turn-based agent (10.9), features.js (what it sees of a move, 10.10), training it (10.11), and difficulty with the developer view (10.12). The rules know nothing of the screen and the AI knows nothing of the rules' insides: each asks the next for what it needs. The Try it tasks build it all from an empty project, each starting exactly where the last one ended: by 10.6 the game plays itself, by 10.7 you can play it, and from 10.8 the AI is in its seat. The finished game you just played is exactly those steps, in order.",
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: one hand of cribbage',
        body: "Step 1. Deal six each, the non-dealer first. Step 2. Both throw two to the dealer's crib. Step 3. Cut the starter (a jack: 2 to the dealer). Step 4. Peg: the non-dealer leads; play in turn, the count to 31; 15 and 31 are 2, pairs and runs score, go when you cannot play, last card 1. Step 5. Show: the non-dealer's hand, the dealer's, then the crib, each with the starter. Step 6. The deal passes; first to 121 wins.",
      },
      {
        type: 'warning',
        title: 'The crib is a flush only with all five',
        body: "A hand of four hearts scores 4 even if the starter is a spade; a crib of four hearts with a spade starter scores no flush. Cell 2's last hand and the challenge's second and third cribs show the difference: 12 against 7.",
      },
      {
        type: 'insight',
        title: 'Why cribbage for an AI',
        body: 'Two decisions with very different shapes: the throw, one choice among 15 that shapes the whole hand, and pegging, a short sequence of plays against an opponent whose cards are hidden. Neither fits a small table of states; both fit features, numbers that describe a move. That is where the chapter ends up.',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Cribbage in numbers',
        caption: 'A deal counted, four hands shown, six cards pegged, and four cribs for you to count.',
        props: {
          lesson: {
            title: 'Cribbage in numbers',
            subtitle: 'The rules, run on real cards.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. A deal, counted\nPredict first: how many cards stay in the deck.',
                startCode: "// One deal, counted. Predict first: how many cards are left in the deck after the deal, and how many does each\n// player end up holding for the show?\nconst deck = 52, dealt = 2 * 6, crib = 2 + 2, starter = 1\nconsole.log('dealt ' + dealt + ', left in the deck ' + (deck - dealt))\nconsole.log('each player keeps ' + (6 - 2) + ' cards; the crib holds ' + crib + '; the starter is 1 more card, shared by every hand')\nconsole.log('cards in the show: ' + (4 + 1) + ' per hand (four and the starter)')",
              },
              {
                type: 'js',
                instruction: '### 2. The show\nPredict first: 4 5 6 6 with a 4.',
                startCode: '// The game\'s rules, as in its scripts (cards.js and score.js): later lessons build every line of them.\n// Cards and the deck. A card is a plain object, { rank, suit }: rank 1 (ace) to 13 (king), suit one of S H D C.\n// Nothing here draws anything, so the rules can be tested, and an agent can learn, without a screen.\n\nconst SUITS = [\'S\', \'H\', \'D\', \'C\'];\nconst SUIT_SYMBOL = { S: \'♠\', H: \'♥\', D: \'♦\', C: \'♣\' };\nconst RANK_NAME = [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'];\n\n/** What a card counts for, toward 15 and 31: an ace is 1, a face card 10. */\nfunction value(card) { return Math.min(card.rank, 10); }\n\n/** A card\'s name, such as 10♥. */\nfunction cardName(card) { return RANK_NAME[card.rank] + SUIT_SYMBOL[card.suit]; }\n\n/** Its picture: assets/cards/10H.svg (the card tool, scripts/tools/cards.js, draws all 52, and the back). */\nfunction cardImage(card) { return `assets/cards/${RANK_NAME[card.rank]}${card.suit}.svg`; }\n\n/** A fresh deck: the 52 cards in order. */\nfunction newDeck() {\n  const deck = [];\n  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ rank, suit });\n  return deck;\n}\n\n/**\n * Shuffle in place (Fisher–Yates): for each position from the last down, swap in a card chosen at random from those\n * not yet placed. Every order is equally likely. It uses Math.random, which training seeds, so a hand can be replayed.\n */\nfunction shuffle(deck) {\n  for (let i = deck.length - 1; i > 0; i--) {\n    const j = Math.floor(Math.random() * (i + 1));\n    [deck[i], deck[j]] = [deck[j], deck[i]];\n  }\n  return deck;\n}\n\n/** The same card? (Two objects can describe one card.) */\nfunction sameCard(a, b) { return a.rank === b.rank && a.suit === b.suit; }\n\n// Scoring cribbage: the show (a hand of four with the starter) and pegging (each card as it is played).\n// Every function returns its points with the reasons, so the game can say "fifteen 2, fifteen 4, a pair is 6".\n\n\n/** Every subset of the cards (by bitmask), as lists: 2ⁿ of them, for n cards. */\nfunction subsets(cards) {\n  const out = [];\n  for (let mask = 1; mask < 1 << cards.length; mask++) out.push(cards.filter((_, i) => mask & (1 << i)));\n  return out;\n}\n\n/** Fifteens: 2 for each different set of cards adding up to 15. */\nfunction fifteens(cards) {\n  const sets = subsets(cards).filter((s) => s.reduce((t, c) => t + value(c), 0) === 15);\n  return sets.map((s) => ({ what: \'fifteen\', cards: s, points: 2 }));\n}\n\n/** Pairs: 2 for each pair of cards of the same rank (three of a kind is three pairs, 6; four is six pairs, 12). */\nfunction pairs(cards) {\n  const out = [];\n  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++)\n    if (cards[i].rank === cards[j].rank) out.push({ what: \'pair\', cards: [cards[i], cards[j]], points: 2 });\n  return out;\n}\n\n/** Is this set of cards a run: different ranks, one after another (in any order)? */\nfunction isRun(cards) {\n  const r = cards.map((c) => c.rank).sort((a, b) => a - b);\n  return r.every((x, i) => i === 0 || x === r[i - 1] + 1);\n}\n\n/**\n * Runs: three or more cards in sequence (aces are low: A 2 3 is a run, Q K A is not). Only the longest runs count,\n * once for each different set of cards that makes one: 3 4 4 5 is two runs of three, 6 points.\n */\nfunction runs(cards) {\n  for (let length = cards.length; length >= 3; length--) {\n    const found = subsets(cards).filter((s) => s.length === length && isRun(s));\n    if (found.length) return found.map((s) => ({ what: `run of ${length}`, cards: s, points: length }));\n  }\n  return [];\n}\n\n/**\n * Flush: the four cards in a hand of one suit, 4, and 5 if the starter is too. The crib only scores a flush of all\n * five.\n */\nfunction flush(hand, starter, isCrib) {\n  if (!hand.every((c) => c.suit === hand[0].suit)) return [];\n  if (starter.suit === hand[0].suit) return [{ what: \'flush\', cards: [...hand, starter], points: 5 }];\n  return isCrib ? [] : [{ what: \'flush\', cards: hand, points: 4 }];\n}\n\n/** Nobs: the jack of the starter\'s suit in the hand, 1. */\nfunction nobs(hand, starter) {\n  const jack = hand.find((c) => c.rank === 11 && c.suit === starter.suit);\n  return jack ? [{ what: \'nobs\', cards: [jack], points: 1 }] : [];\n}\n\n/** The show: a hand of four (or the crib) with the starter. { total, parts }. */\nfunction scoreHand(hand, starter, isCrib = false) {\n  const all = [...hand, starter];\n  const parts = [...fifteens(all), ...pairs(all), ...runs(all), ...flush(hand, starter, isCrib), ...nobs(hand, starter)];\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** The count: what the cards played since the last reset add up to. */\nfunction countOf(pile) { return pile.reduce((t, c) => t + value(c), 0); }\n\n/**\n * Pegging: the points for the card just played, the last of `pile` (the cards played since the count was last\n * reset to 0). 15 or 31 is 2; a pair with the card before is 2, three of a kind 6, four 12; a run is one point a card,\n * when the last three or more cards (in any order) make one.\n */\nfunction pegPoints(pile) {\n  const parts = [], count = countOf(pile), card = pile[pile.length - 1];\n  if (count === 15) parts.push({ what: \'fifteen\', points: 2 });\n  if (count === 31) parts.push({ what: \'thirty-one\', points: 2 });\n  let same = 1;\n  while (same < pile.length && pile[pile.length - 1 - same].rank === card.rank) same++;\n  if (same >= 2) parts.push({ what: [\'\', \'\', \'a pair\', \'three of a kind\', \'four of a kind\'][same], points: [0, 0, 2, 6, 12][same] });\n  for (let length = pile.length; length >= 3; length--) {\n    if (isRun(pile.slice(-length))) { parts.push({ what: `run of ${length}`, points: length }); break; }\n  }\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** "fifteen 2, a pair is 4, …": points as they are said aloud. */\nfunction sayParts(parts) {\n  let running = 0;\n  return parts.map((p) => `${p.what} ${(running += p.points)}`).join(\', \');\n}\nconst cards = (text) => text.split(\' \').map((t) => ({ rank: [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\n\n// The show: a hand of four with the starter. Predict first: what is 4 5 6 6 with a 4 cut worth?\nconst hands = [[\'4S 5H 6D 6C\', \'4H\'], [\'5H 5C 5S JD\', \'5D\'], [\'2S 4H 6D 8C\', \'KS\'], [\'3H 4H 5H 9H\', \'10H\']]\nfor (const [hand, cut] of hands) {\n  const s = scoreHand(cards(hand), cards(cut)[0])\n  console.log(hand + \' + \' + cut + \': \' + s.total + (s.total ? \'  (\' + sayParts(s.parts) + \')\' : \'  (nothing)\'))\n}',
              },
              {
                type: 'js',
                instruction: '### 3. Pegging\nPredict first: who pegs on which card.',
                startCode: '// The game\'s rules, as in its scripts (cards.js and score.js): later lessons build every line of them.\n// Cards and the deck. A card is a plain object, { rank, suit }: rank 1 (ace) to 13 (king), suit one of S H D C.\n// Nothing here draws anything, so the rules can be tested, and an agent can learn, without a screen.\n\nconst SUITS = [\'S\', \'H\', \'D\', \'C\'];\nconst SUIT_SYMBOL = { S: \'♠\', H: \'♥\', D: \'♦\', C: \'♣\' };\nconst RANK_NAME = [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'];\n\n/** What a card counts for, toward 15 and 31: an ace is 1, a face card 10. */\nfunction value(card) { return Math.min(card.rank, 10); }\n\n/** A card\'s name, such as 10♥. */\nfunction cardName(card) { return RANK_NAME[card.rank] + SUIT_SYMBOL[card.suit]; }\n\n/** Its picture: assets/cards/10H.svg (the card tool, scripts/tools/cards.js, draws all 52, and the back). */\nfunction cardImage(card) { return `assets/cards/${RANK_NAME[card.rank]}${card.suit}.svg`; }\n\n/** A fresh deck: the 52 cards in order. */\nfunction newDeck() {\n  const deck = [];\n  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ rank, suit });\n  return deck;\n}\n\n/**\n * Shuffle in place (Fisher–Yates): for each position from the last down, swap in a card chosen at random from those\n * not yet placed. Every order is equally likely. It uses Math.random, which training seeds, so a hand can be replayed.\n */\nfunction shuffle(deck) {\n  for (let i = deck.length - 1; i > 0; i--) {\n    const j = Math.floor(Math.random() * (i + 1));\n    [deck[i], deck[j]] = [deck[j], deck[i]];\n  }\n  return deck;\n}\n\n/** The same card? (Two objects can describe one card.) */\nfunction sameCard(a, b) { return a.rank === b.rank && a.suit === b.suit; }\n\n// Scoring cribbage: the show (a hand of four with the starter) and pegging (each card as it is played).\n// Every function returns its points with the reasons, so the game can say "fifteen 2, fifteen 4, a pair is 6".\n\n\n/** Every subset of the cards (by bitmask), as lists: 2ⁿ of them, for n cards. */\nfunction subsets(cards) {\n  const out = [];\n  for (let mask = 1; mask < 1 << cards.length; mask++) out.push(cards.filter((_, i) => mask & (1 << i)));\n  return out;\n}\n\n/** Fifteens: 2 for each different set of cards adding up to 15. */\nfunction fifteens(cards) {\n  const sets = subsets(cards).filter((s) => s.reduce((t, c) => t + value(c), 0) === 15);\n  return sets.map((s) => ({ what: \'fifteen\', cards: s, points: 2 }));\n}\n\n/** Pairs: 2 for each pair of cards of the same rank (three of a kind is three pairs, 6; four is six pairs, 12). */\nfunction pairs(cards) {\n  const out = [];\n  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++)\n    if (cards[i].rank === cards[j].rank) out.push({ what: \'pair\', cards: [cards[i], cards[j]], points: 2 });\n  return out;\n}\n\n/** Is this set of cards a run: different ranks, one after another (in any order)? */\nfunction isRun(cards) {\n  const r = cards.map((c) => c.rank).sort((a, b) => a - b);\n  return r.every((x, i) => i === 0 || x === r[i - 1] + 1);\n}\n\n/**\n * Runs: three or more cards in sequence (aces are low: A 2 3 is a run, Q K A is not). Only the longest runs count,\n * once for each different set of cards that makes one: 3 4 4 5 is two runs of three, 6 points.\n */\nfunction runs(cards) {\n  for (let length = cards.length; length >= 3; length--) {\n    const found = subsets(cards).filter((s) => s.length === length && isRun(s));\n    if (found.length) return found.map((s) => ({ what: `run of ${length}`, cards: s, points: length }));\n  }\n  return [];\n}\n\n/**\n * Flush: the four cards in a hand of one suit, 4, and 5 if the starter is too. The crib only scores a flush of all\n * five.\n */\nfunction flush(hand, starter, isCrib) {\n  if (!hand.every((c) => c.suit === hand[0].suit)) return [];\n  if (starter.suit === hand[0].suit) return [{ what: \'flush\', cards: [...hand, starter], points: 5 }];\n  return isCrib ? [] : [{ what: \'flush\', cards: hand, points: 4 }];\n}\n\n/** Nobs: the jack of the starter\'s suit in the hand, 1. */\nfunction nobs(hand, starter) {\n  const jack = hand.find((c) => c.rank === 11 && c.suit === starter.suit);\n  return jack ? [{ what: \'nobs\', cards: [jack], points: 1 }] : [];\n}\n\n/** The show: a hand of four (or the crib) with the starter. { total, parts }. */\nfunction scoreHand(hand, starter, isCrib = false) {\n  const all = [...hand, starter];\n  const parts = [...fifteens(all), ...pairs(all), ...runs(all), ...flush(hand, starter, isCrib), ...nobs(hand, starter)];\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** The count: what the cards played since the last reset add up to. */\nfunction countOf(pile) { return pile.reduce((t, c) => t + value(c), 0); }\n\n/**\n * Pegging: the points for the card just played, the last of `pile` (the cards played since the count was last\n * reset to 0). 15 or 31 is 2; a pair with the card before is 2, three of a kind 6, four 12; a run is one point a card,\n * when the last three or more cards (in any order) make one.\n */\nfunction pegPoints(pile) {\n  const parts = [], count = countOf(pile), card = pile[pile.length - 1];\n  if (count === 15) parts.push({ what: \'fifteen\', points: 2 });\n  if (count === 31) parts.push({ what: \'thirty-one\', points: 2 });\n  let same = 1;\n  while (same < pile.length && pile[pile.length - 1 - same].rank === card.rank) same++;\n  if (same >= 2) parts.push({ what: [\'\', \'\', \'a pair\', \'three of a kind\', \'four of a kind\'][same], points: [0, 0, 2, 6, 12][same] });\n  for (let length = pile.length; length >= 3; length--) {\n    if (isRun(pile.slice(-length))) { parts.push({ what: `run of ${length}`, points: length }); break; }\n  }\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** "fifteen 2, a pair is 4, …": points as they are said aloud. */\nfunction sayParts(parts) {\n  let running = 0;\n  return parts.map((p) => `${p.what} ${(running += p.points)}`).join(\', \');\n}\nconst cards = (text) => text.split(\' \').map((t) => ({ rank: [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\n\n// Pegging: the count goes up as each card is played, and each card can score. Predict first: who pegs what?\n// The non-dealer leads. Here, you are the non-dealer.\nconst plays = [[\'you\', \'4H\'], [\'AI\', \'JS\'], [\'you\', \'AD\'], [\'AI\', \'AC\'], [\'you\', \'5S\'], [\'AI\', \'5C\']]\nlet pile = []\nfor (const [who, card] of plays) {\n  pile = [...pile, ...cards(card)]\n  const p = pegPoints(pile)\n  console.log(who.padEnd(4) + \'plays \' + card.padEnd(3) + \' count \' + String(countOf(pile)).padStart(2) + (p.total ? \'  pegs \' + p.total + \' (\' + sayParts(p.parts) + \')\' : \'\'))\n}',
              },
              {
                type: 'challenge',
                instruction: '### 4. Challenge: count the crib\nFour cribs; the check counts them too.',
                startCode: '// The game\'s rules, as in its scripts (cards.js and score.js): later lessons build every line of them.\n// Cards and the deck. A card is a plain object, { rank, suit }: rank 1 (ace) to 13 (king), suit one of S H D C.\n// Nothing here draws anything, so the rules can be tested, and an agent can learn, without a screen.\n\nconst SUITS = [\'S\', \'H\', \'D\', \'C\'];\nconst SUIT_SYMBOL = { S: \'♠\', H: \'♥\', D: \'♦\', C: \'♣\' };\nconst RANK_NAME = [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'];\n\n/** What a card counts for, toward 15 and 31: an ace is 1, a face card 10. */\nfunction value(card) { return Math.min(card.rank, 10); }\n\n/** A card\'s name, such as 10♥. */\nfunction cardName(card) { return RANK_NAME[card.rank] + SUIT_SYMBOL[card.suit]; }\n\n/** Its picture: assets/cards/10H.svg (the card tool, scripts/tools/cards.js, draws all 52, and the back). */\nfunction cardImage(card) { return `assets/cards/${RANK_NAME[card.rank]}${card.suit}.svg`; }\n\n/** A fresh deck: the 52 cards in order. */\nfunction newDeck() {\n  const deck = [];\n  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ rank, suit });\n  return deck;\n}\n\n/**\n * Shuffle in place (Fisher–Yates): for each position from the last down, swap in a card chosen at random from those\n * not yet placed. Every order is equally likely. It uses Math.random, which training seeds, so a hand can be replayed.\n */\nfunction shuffle(deck) {\n  for (let i = deck.length - 1; i > 0; i--) {\n    const j = Math.floor(Math.random() * (i + 1));\n    [deck[i], deck[j]] = [deck[j], deck[i]];\n  }\n  return deck;\n}\n\n/** The same card? (Two objects can describe one card.) */\nfunction sameCard(a, b) { return a.rank === b.rank && a.suit === b.suit; }\n\n// Scoring cribbage: the show (a hand of four with the starter) and pegging (each card as it is played).\n// Every function returns its points with the reasons, so the game can say "fifteen 2, fifteen 4, a pair is 6".\n\n\n/** Every subset of the cards (by bitmask), as lists: 2ⁿ of them, for n cards. */\nfunction subsets(cards) {\n  const out = [];\n  for (let mask = 1; mask < 1 << cards.length; mask++) out.push(cards.filter((_, i) => mask & (1 << i)));\n  return out;\n}\n\n/** Fifteens: 2 for each different set of cards adding up to 15. */\nfunction fifteens(cards) {\n  const sets = subsets(cards).filter((s) => s.reduce((t, c) => t + value(c), 0) === 15);\n  return sets.map((s) => ({ what: \'fifteen\', cards: s, points: 2 }));\n}\n\n/** Pairs: 2 for each pair of cards of the same rank (three of a kind is three pairs, 6; four is six pairs, 12). */\nfunction pairs(cards) {\n  const out = [];\n  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++)\n    if (cards[i].rank === cards[j].rank) out.push({ what: \'pair\', cards: [cards[i], cards[j]], points: 2 });\n  return out;\n}\n\n/** Is this set of cards a run: different ranks, one after another (in any order)? */\nfunction isRun(cards) {\n  const r = cards.map((c) => c.rank).sort((a, b) => a - b);\n  return r.every((x, i) => i === 0 || x === r[i - 1] + 1);\n}\n\n/**\n * Runs: three or more cards in sequence (aces are low: A 2 3 is a run, Q K A is not). Only the longest runs count,\n * once for each different set of cards that makes one: 3 4 4 5 is two runs of three, 6 points.\n */\nfunction runs(cards) {\n  for (let length = cards.length; length >= 3; length--) {\n    const found = subsets(cards).filter((s) => s.length === length && isRun(s));\n    if (found.length) return found.map((s) => ({ what: `run of ${length}`, cards: s, points: length }));\n  }\n  return [];\n}\n\n/**\n * Flush: the four cards in a hand of one suit, 4, and 5 if the starter is too. The crib only scores a flush of all\n * five.\n */\nfunction flush(hand, starter, isCrib) {\n  if (!hand.every((c) => c.suit === hand[0].suit)) return [];\n  if (starter.suit === hand[0].suit) return [{ what: \'flush\', cards: [...hand, starter], points: 5 }];\n  return isCrib ? [] : [{ what: \'flush\', cards: hand, points: 4 }];\n}\n\n/** Nobs: the jack of the starter\'s suit in the hand, 1. */\nfunction nobs(hand, starter) {\n  const jack = hand.find((c) => c.rank === 11 && c.suit === starter.suit);\n  return jack ? [{ what: \'nobs\', cards: [jack], points: 1 }] : [];\n}\n\n/** The show: a hand of four (or the crib) with the starter. { total, parts }. */\nfunction scoreHand(hand, starter, isCrib = false) {\n  const all = [...hand, starter];\n  const parts = [...fifteens(all), ...pairs(all), ...runs(all), ...flush(hand, starter, isCrib), ...nobs(hand, starter)];\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** The count: what the cards played since the last reset add up to. */\nfunction countOf(pile) { return pile.reduce((t, c) => t + value(c), 0); }\n\n/**\n * Pegging: the points for the card just played, the last of `pile` (the cards played since the count was last\n * reset to 0). 15 or 31 is 2; a pair with the card before is 2, three of a kind 6, four 12; a run is one point a card,\n * when the last three or more cards (in any order) make one.\n */\nfunction pegPoints(pile) {\n  const parts = [], count = countOf(pile), card = pile[pile.length - 1];\n  if (count === 15) parts.push({ what: \'fifteen\', points: 2 });\n  if (count === 31) parts.push({ what: \'thirty-one\', points: 2 });\n  let same = 1;\n  while (same < pile.length && pile[pile.length - 1 - same].rank === card.rank) same++;\n  if (same >= 2) parts.push({ what: [\'\', \'\', \'a pair\', \'three of a kind\', \'four of a kind\'][same], points: [0, 0, 2, 6, 12][same] });\n  for (let length = pile.length; length >= 3; length--) {\n    if (isRun(pile.slice(-length))) { parts.push({ what: `run of ${length}`, points: length }); break; }\n  }\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** "fifteen 2, a pair is 4, …": points as they are said aloud. */\nfunction sayParts(parts) {\n  let running = 0;\n  return parts.map((p) => `${p.what} ${(running += p.points)}`).join(\', \');\n}\nconst cards = (text) => text.split(\' \').map((t) => ({ rank: [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\n\n// Challenge: count the crib. Each case is a crib (four cards) and the starter; write what it scores (remember a crib\n// only scores a flush when all five are one suit). Fill in the four numbers, then run.\nconst answers = [0, 0, 0, 0]\nconst cases = [[\'5H 10S JD QC\', \'5C\'], [\'2H 3H 4H 9H\', \'KH\'], [\'2H 3H 4H 9H\', \'KS\'], [\'7D 7S 8H 8C\', \'9D\']]\nlet ok = 0\ncases.forEach(([crib, cut], i) => {\n  const want = scoreHand(cards(crib), cards(cut)[0], true).total\n  if (answers[i] === want) ok++\n  else console.log(\'Case \' + (i + 1) + \', \' + crib + \' + \' + cut + \': you wrote \' + answers[i] + \'. Count again: fifteens, pairs, runs, flush (all five in a crib), nobs.\')\n})\nconsole.log(ok === cases.length ? \'✓ All 4 cribs counted.\' : ok + \' of 4 cribs counted.\')',
                solutionCode: '// The game\'s rules, as in its scripts (cards.js and score.js): later lessons build every line of them.\n// Cards and the deck. A card is a plain object, { rank, suit }: rank 1 (ace) to 13 (king), suit one of S H D C.\n// Nothing here draws anything, so the rules can be tested, and an agent can learn, without a screen.\n\nconst SUITS = [\'S\', \'H\', \'D\', \'C\'];\nconst SUIT_SYMBOL = { S: \'♠\', H: \'♥\', D: \'♦\', C: \'♣\' };\nconst RANK_NAME = [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'];\n\n/** What a card counts for, toward 15 and 31: an ace is 1, a face card 10. */\nfunction value(card) { return Math.min(card.rank, 10); }\n\n/** A card\'s name, such as 10♥. */\nfunction cardName(card) { return RANK_NAME[card.rank] + SUIT_SYMBOL[card.suit]; }\n\n/** Its picture: assets/cards/10H.svg (the card tool, scripts/tools/cards.js, draws all 52, and the back). */\nfunction cardImage(card) { return `assets/cards/${RANK_NAME[card.rank]}${card.suit}.svg`; }\n\n/** A fresh deck: the 52 cards in order. */\nfunction newDeck() {\n  const deck = [];\n  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ rank, suit });\n  return deck;\n}\n\n/**\n * Shuffle in place (Fisher–Yates): for each position from the last down, swap in a card chosen at random from those\n * not yet placed. Every order is equally likely. It uses Math.random, which training seeds, so a hand can be replayed.\n */\nfunction shuffle(deck) {\n  for (let i = deck.length - 1; i > 0; i--) {\n    const j = Math.floor(Math.random() * (i + 1));\n    [deck[i], deck[j]] = [deck[j], deck[i]];\n  }\n  return deck;\n}\n\n/** The same card? (Two objects can describe one card.) */\nfunction sameCard(a, b) { return a.rank === b.rank && a.suit === b.suit; }\n\n// Scoring cribbage: the show (a hand of four with the starter) and pegging (each card as it is played).\n// Every function returns its points with the reasons, so the game can say "fifteen 2, fifteen 4, a pair is 6".\n\n\n/** Every subset of the cards (by bitmask), as lists: 2ⁿ of them, for n cards. */\nfunction subsets(cards) {\n  const out = [];\n  for (let mask = 1; mask < 1 << cards.length; mask++) out.push(cards.filter((_, i) => mask & (1 << i)));\n  return out;\n}\n\n/** Fifteens: 2 for each different set of cards adding up to 15. */\nfunction fifteens(cards) {\n  const sets = subsets(cards).filter((s) => s.reduce((t, c) => t + value(c), 0) === 15);\n  return sets.map((s) => ({ what: \'fifteen\', cards: s, points: 2 }));\n}\n\n/** Pairs: 2 for each pair of cards of the same rank (three of a kind is three pairs, 6; four is six pairs, 12). */\nfunction pairs(cards) {\n  const out = [];\n  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++)\n    if (cards[i].rank === cards[j].rank) out.push({ what: \'pair\', cards: [cards[i], cards[j]], points: 2 });\n  return out;\n}\n\n/** Is this set of cards a run: different ranks, one after another (in any order)? */\nfunction isRun(cards) {\n  const r = cards.map((c) => c.rank).sort((a, b) => a - b);\n  return r.every((x, i) => i === 0 || x === r[i - 1] + 1);\n}\n\n/**\n * Runs: three or more cards in sequence (aces are low: A 2 3 is a run, Q K A is not). Only the longest runs count,\n * once for each different set of cards that makes one: 3 4 4 5 is two runs of three, 6 points.\n */\nfunction runs(cards) {\n  for (let length = cards.length; length >= 3; length--) {\n    const found = subsets(cards).filter((s) => s.length === length && isRun(s));\n    if (found.length) return found.map((s) => ({ what: `run of ${length}`, cards: s, points: length }));\n  }\n  return [];\n}\n\n/**\n * Flush: the four cards in a hand of one suit, 4, and 5 if the starter is too. The crib only scores a flush of all\n * five.\n */\nfunction flush(hand, starter, isCrib) {\n  if (!hand.every((c) => c.suit === hand[0].suit)) return [];\n  if (starter.suit === hand[0].suit) return [{ what: \'flush\', cards: [...hand, starter], points: 5 }];\n  return isCrib ? [] : [{ what: \'flush\', cards: hand, points: 4 }];\n}\n\n/** Nobs: the jack of the starter\'s suit in the hand, 1. */\nfunction nobs(hand, starter) {\n  const jack = hand.find((c) => c.rank === 11 && c.suit === starter.suit);\n  return jack ? [{ what: \'nobs\', cards: [jack], points: 1 }] : [];\n}\n\n/** The show: a hand of four (or the crib) with the starter. { total, parts }. */\nfunction scoreHand(hand, starter, isCrib = false) {\n  const all = [...hand, starter];\n  const parts = [...fifteens(all), ...pairs(all), ...runs(all), ...flush(hand, starter, isCrib), ...nobs(hand, starter)];\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** The count: what the cards played since the last reset add up to. */\nfunction countOf(pile) { return pile.reduce((t, c) => t + value(c), 0); }\n\n/**\n * Pegging: the points for the card just played, the last of `pile` (the cards played since the count was last\n * reset to 0). 15 or 31 is 2; a pair with the card before is 2, three of a kind 6, four 12; a run is one point a card,\n * when the last three or more cards (in any order) make one.\n */\nfunction pegPoints(pile) {\n  const parts = [], count = countOf(pile), card = pile[pile.length - 1];\n  if (count === 15) parts.push({ what: \'fifteen\', points: 2 });\n  if (count === 31) parts.push({ what: \'thirty-one\', points: 2 });\n  let same = 1;\n  while (same < pile.length && pile[pile.length - 1 - same].rank === card.rank) same++;\n  if (same >= 2) parts.push({ what: [\'\', \'\', \'a pair\', \'three of a kind\', \'four of a kind\'][same], points: [0, 0, 2, 6, 12][same] });\n  for (let length = pile.length; length >= 3; length--) {\n    if (isRun(pile.slice(-length))) { parts.push({ what: `run of ${length}`, points: length }); break; }\n  }\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts };\n}\n\n/** "fifteen 2, a pair is 4, …": points as they are said aloud. */\nfunction sayParts(parts) {\n  let running = 0;\n  return parts.map((p) => `${p.what} ${(running += p.points)}`).join(\', \');\n}\nconst cards = (text) => text.split(\' \').map((t) => ({ rank: [\'\', \'A\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\', \'J\', \'Q\', \'K\'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\n\n// Challenge: count the crib. Each case is a crib (four cards) and the starter; write what it scores (remember a crib\n// only scores a flush when all five are one suit). Fill in the four numbers, then run.\nconst answers = [17, 12, 7, 24]\nconst cases = [[\'5H 10S JD QC\', \'5C\'], [\'2H 3H 4H 9H\', \'KH\'], [\'2H 3H 4H 9H\', \'KS\'], [\'7D 7S 8H 8C\', \'9D\']]\nlet ok = 0\ncases.forEach(([crib, cut], i) => {\n  const want = scoreHand(cards(crib), cards(cut)[0], true).total\n  if (answers[i] === want) ok++\n  else console.log(\'Case \' + (i + 1) + \', \' + crib + \' + \' + cut + \': you wrote \' + answers[i] + \'. Count again: fifteens, pairs, runs, flush (all five in a crib), nobs.\')\n})\nconsole.log(ok === cases.length ? \'✓ All 4 cribs counted.\' : ok + \' of 4 cribs counted.\')',
              },
              {
                type: 'markdown',
                instruction: '### 5. The code you wrote, line by line\n\nThe tour changed two lines at the top of the Table class in scripts/table.js. Both are fields: values each table keeps, read by its methods.\n\n```js\n  goal = 61;\n```\n\nThe score that ends the game. award() compares every new score with this.goal, so a "short game" to 61 needed no other change.\n\n```js\n  difficulty = \'Hard\';\n```\n\nThe difficulty the table has before you choose one on the title screen. start(difficulty) replaces it when you click Easy, Medium or Hard; the status line and the developer view read it. Lesson 10.12 builds the title screen and what each difficulty means.',
              },
              {
                type: 'markdown',
                instruction: "### 6. Questions you might have\n\n**Why do the fields sit at the top of the class?** They are the table's settings: what a new table starts with. Reading them first tells you what the rest can be told to do.\n\n**Does changing goal to 61 change the AI?** No: the AI learned from hands, one at a time, not from games. It plays each hand the same way to 61 or to 121.\n\n**Where is the rest of the game?** In scripts/: cards.js (the cards), score.js (the rules for points), table.js (the game), cardsprite.js (a card on screen), partner.js (players with rules), features.js and opponent.js (the AI). Lessons 10.2 to 10.12 write each one from nothing.\n\n**What are scripts/tools/cards.js and table.js?** Tools: code that drew every picture in the game. They run in the editor, not in the game (lesson 10.3).",
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Play the finished game',
        props: {
          task: 'crib-tour',
          lesson: 'mg10-001',
          checkpoint: 'cp-mg10-001-4',
        },
      },
    ],
  },

  math: {
    prose: [
      '**Under the hood (optional).** How many different hands of six are there? Choosing 6 of 52 cards: $\\binom{52}{6} = 20{,}358{,}520$. For each, 15 ways to throw two, and 46 possible starters. No program can learn a table entry for each, which is why the AI will describe moves by features instead.',
      'The best hand, 29, needs three fives, the jack of the starter\'s suit, and the fourth five cut: one hand in about 216,000 deals. Scores of 19, 25, 26 and 27 are impossible, which is why "nineteen" is the cribbage joke for a hand worth nothing.',
    ],
    equations: [
      {
        label: 'Six-card hands',
        latex: '\\binom{52}{6} = 20\\,358\\,520',
      },
      {
        label: 'Ways to throw two of six',
        latex: '\\binom{6}{2} = 15',
      },
    ],
    callouts: [],
    visualizations: [],
  },

  rigor: {
    prose: [
      'Cribbage is a game of imperfect information: the right throw depends on cards you cannot see (the other hand, the starter). A player, human or program, chooses the move with the best expected result over what might be hidden; lesson 10.8 computes those expectations exactly.',
      'Where it goes: 10.2 to 10.7 build the game; 10.8 a rules player; 10.9 to 10.12 the learning AI.',
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [
    {
      id: 'mg10-001-ex1',
      title: 'A pegging sequence',
      difficulty: 'easy',
      problem: 'The count is 10. You play a 5. What do you peg?',
      steps: [
        {
          expression: '10 + 5 = 15',
          annotation: 'Fifteen.',
          strategyTitle: 'Step 1: the count',
        },
      ],
      answer: '2, for fifteen.',
    },
    {
      id: 'mg10-001-ex2',
      title: 'A go',
      difficulty: 'medium',
      problem: 'The count is 27. You hold K and 9; the AI holds 3 and 2. Who plays, and who pegs for the go?',
      steps: [
        {
          expression: '27 + 10 > 31,\\ 27 + 9 > 31',
          annotation: 'You cannot play: go.',
          strategyTitle: 'Step 1: you',
        },
        {
          expression: '27 + 3 = 30,\\ 30 + 2 > 31',
          annotation: 'The AI plays the 3; then it cannot play the 2 either.',
          strategyTitle: 'Step 2: the AI',
        },
      ],
      answer: 'The AI plays its 3 (30) and pegs 1 for the go; the count restarts and you lead.',
    },
    {
      id: 'mg10-001-ex3',
      title: 'A hand at the show',
      difficulty: 'hard',
      problem: 'Count 4 5 6 6 with a 4 cut.',
      steps: [
        {
          expression: '4+5+6\\ (\\times 4)',
          annotation: 'Two 4s × two 6s with the 5: four fifteens, 8.',
          strategyTitle: 'Step 1: fifteens',
        },
        {
          expression: '4\\,4,\\ 6\\,6',
          annotation: 'Two pairs, 4.',
          strategyTitle: 'Step 2: pairs',
        },
        {
          expression: '4\\,5\\,6\\ (\\times 4)',
          annotation: 'Four runs of three, 12.',
          strategyTitle: 'Step 3: runs',
        },
      ],
      answer: '24 (cell 2).',
    },
  ],

  challenges: [
    {
      id: 'mg10-001-ch1',
      title: 'His heels',
      difficulty: 'easy',
      problem: 'The starter is the jack of clubs. Who pegs, and how much?',
      hint: 'The cut.',
      answer: 'The dealer, 2.',
      walkthrough: [],
    },
    {
      id: 'mg10-001-ch2',
      title: 'Last card',
      difficulty: 'medium',
      problem: 'The last card of a hand makes the count exactly 31. How much does the player peg for it?',
      hint: 'Does the last card add 1 to 31?',
      answer: '2 for thirty-one, and no extra point for the last card.',
      walkthrough: [],
    },
    {
      id: 'mg10-001-ch3',
      title: 'Winning in the middle',
      difficulty: 'hard',
      problem: "You have 118 and the AI 120, the AI dealt. You peg 2 for a fifteen during pegging, then the AI's hand would be counted. Who wins?",
      hint: 'The game ends at once.',
      answer: 'Neither yet: you reach 120. If you peg 1 more before the AI scores, you win; the first to 121 wins the moment they reach it, so the non-dealer counting first at the show can win before the dealer counts.',
      walkthrough: [],
    },
  ],

  semantics: {
    core: [
      {
        symbol: 'crib',
        meaning: "The dealer's extra hand of four, two cards from each player.",
      },
      {
        symbol: 'starter',
        meaning: 'The cut card, a fifth card in every hand at the show.',
      },
      {
        symbol: 'count',
        meaning: 'The total of the cards played since the last reset, up to 31.',
      },
      {
        symbol: 'go',
        meaning: '"I cannot play": the other plays on; the last to play pegs 1.',
      },
      {
        symbol: 'show',
        meaning: 'Counting each hand of four with the starter, non-dealer first.',
      },
      {
        symbol: 'nobs',
        meaning: "The jack of the starter's suit in a hand, 1 point.",
      },
    ],
    rulesOfThumb: [
      'Fifteens and pairs score most; look for fives and tens.',
      'Give your own crib good cards, theirs bad ones.',
      'The non-dealer counts first at the show.',
    ],
  },

  misconceptions: [
    {
      falseBelief: 'A crib of four hearts scores a flush.',
      whyStudentsThinkIt: 'A hand of four hearts does.',
      correctionExample: 'The crib needs all five, the starter too (challenge, cribs 2 and 3).',
      contrastCase: 'A hand of four of one suit scores 4.',
    },
    {
      falseBelief: 'Runs in pegging must be played in order.',
      whyStudentsThinkIt: 'Runs look like sequences.',
      correctionExample: '4 then 3 then 5 is a run of three: the last three cards, in any order.',
      contrastCase: 'A pair between breaks it: 3 4 4 is a pair, not a run.',
    },
  ],

  transferPrompts: [
    {
      situation: 'Another card game you want to build, such as rummy.',
      competingTechniques: [
        'Write the game and the screen together',
        'Rules as plain modules first, the screen after',
      ],
      whyThisTechniqueWins: 'Plain rules can be tested, played headless and used by an AI.',
    },
    {
      situation: 'A board game with an AI opponent.',
      competingTechniques: ['A scripted opponent', 'A learning opponent'],
      whyThisTechniqueWins: 'Both: a scripted one first, as the yardstick and the practice partner (10.8).',
    },
  ],

  debugging: [
    {
      commonError: "Counting the crib's flush with four cards.",
      symptom: 'Cribs score 4 or 5 too much now and then.',
      whyItHappened: 'The crib flush rule is different.',
      repairStrategy: 'A crib flush needs the starter too.',
    },
    {
      commonError: 'Letting the count pass 31.',
      symptom: 'Counts of 33, 38 appear.',
      whyItHappened: 'A card was played that does not fit.',
      repairStrategy: 'Only cards with count + value ≤ 31 can be played; otherwise, go.',
    },
  ],

  mastery: {
    targetLevel: 2,
    solveIndependently: 'Score a hand and a pegging sequence.',
    explainVerbally: 'Explain a hand of cribbage from deal to show.',
    detectIncorrectApplication: 'Spot a wrong crib flush and a count past 31.',
    transferToUnfamiliar: 'Plan the modules of another card game.',
  },

  assessment: {
    questions: [
      {
        id: 'mg10-001-assess-1',
        type: 'choice',
        text: 'The best possible cribbage hand scores',
        options: ['29', '24', '31', '21'],
        answer: '29',
        hint: 'Cell 2.',
      },
    ],
  },

  quiz: [
    {
      id: 'mg10-001-quiz-1',
      type: 'choice',
      text: 'After the deal, the deck has',
      options: ['40 cards', '42 cards', '36 cards', '52 cards'],
      answer: '40 cards',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg10-001-quiz-2',
      type: 'choice',
      text: 'The crib belongs to',
      options: ['The dealer', 'The non-dealer', 'Whoever scores more', 'Nobody'],
      answer: 'The dealer',
      hints: ['The crib paragraph.'],
      reviewSection: 'Intuition — the crib',
    },
    {
      id: 'mg10-001-quiz-3',
      type: 'choice',
      text: 'In pegging, making the count 15 scores',
      options: ['2', '1', '15', '0'],
      answer: '2',
      hints: ['Pegging paragraph.'],
      reviewSection: 'Intuition — pegging',
    },
    {
      id: 'mg10-001-quiz-4',
      type: 'choice',
      text: '2 3 4 9 of hearts in the crib, with the king of spades cut, scores',
      options: ['7', '12', '11', '3'],
      answer: '7',
      hints: ['Challenge, crib 3.'],
      reviewSection: 'Cell 4',
    },
    {
      id: 'mg10-001-quiz-5',
      type: 'choice',
      text: 'At the show, who counts first?',
      options: ['The non-dealer', 'The dealer', 'Whoever is behind', 'The crib'],
      answer: 'The non-dealer',
      hints: ['The show paragraph.'],
      reviewSection: 'Intuition — the show',
    },
    {
      id: 'mg10-001-quiz-6',
      type: 'choice',
      text: 'When neither player can play, the last to play pegs',
      options: ['1, and the count restarts', '2', 'Nothing', '1, and the hand ends'],
      answer: '1, and the count restarts',
      hints: ['The go paragraph.'],
      reviewSection: 'Intuition — the go',
    },
  ],

  checkpoints: [
    {
      id: 'cp-mg10-001-1',
      label: 'Read the deal, the crib and the cut',
      type: 'read',
    },
    {
      id: 'cp-mg10-001-2',
      label: 'Read pegging, the go and the show',
      type: 'read',
    },
    {
      id: 'cp-mg10-001-3',
      label: 'Run the notebook',
      type: 'read',
    },
    {
      id: 'cp-mg10-001-4',
      label: 'Complete "Cribbage: the finished game" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg10-001-5',
      label: 'Read the plan: seven scripts',
      type: 'read',
    },
    {
      id: 'cp-mg10-001-6',
      label: 'Work through the go example',
      type: 'example',
    },
    {
      id: 'cp-mg10-001-7',
      label: 'Work through the show example',
      type: 'example',
    },
    {
      id: 'cp-mg10-001-8',
      label: 'Pass the crib challenge',
      type: 'challenge',
    },
  ],

  chapter: 'making-games-10',
}
