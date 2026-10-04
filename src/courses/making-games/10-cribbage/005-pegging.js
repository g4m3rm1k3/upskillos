export default {
  order: 5,

  id: 'mg10-005',

  slug: 'pegging',

  title: 'Pegging: the Count, the Go and 31',

  subtitle: 'Score each card as it is played, and run the turns so every go, every 31 and the last card come out right.',

  tags: [
    'game-studio',
    'cribbage',
    'turn-based',
    'state',
    'sequences',
    'rules-engine',
  ],

  aliases: 'pegging count go thirty-one 31 fifteen last card pair royal run in any order options legal cards turn order next turn state machine',

  timeToComplete: 60,

  coreConcept: 'Pegging scores the card just played by looking at the end of the pile, the cards since the count was last 0: 15 or 31 is 2, cards of the same rank in a row at the end are a pair (2), three (6) or four (12) of a kind, and the longest run the last three or more cards make, in any order, is one point a card. The turns are a small loop: the player to move plays a card that keeps the count at 31 or under; if they cannot, they say go and the other plays on; when neither can, the last to play pegs 1 and the count restarts with the other player leading; at 31 it restarts at once; the last card of all pegs 1.',

  prerequisites: ['mg10-004'],

  nextLesson: 'mg10-006',

  hook: {
    question: 'The count is 27. You hold a king and a nine; the AI holds a three and a two. Who plays, who scores what, and who leads next? Getting that right every time is what makes pegging work.',
    realWorldContext: 'Most turn-based games have the same shape: whose turn, what are the legal moves, what happens when someone cannot move. Pegging packs all of them into eight cards: legal moves that depend on a running total, passing (go), resets (31), and scoring that depends on the sequence of play, not on a set of cards.',
  },

  intuition: {
    prose: [
      '**The pile.** Pegging scores the card just played, looking back at the cards played since the count was last 0: the *pile*. The count is their values added up, countOf(pile) (cell 1). 15 and 31 are 2 points each.',
      "**Pairs at the end.** Count how many cards in a row at the end of the pile have the played card's rank: two is a pair (2), three is three of a kind (6), four is four of a kind (12). A different card between breaks it: 7 2 7 is nothing (cell 2). This is the same 1, 3, 6 pairs as the show, scored as they happen.",
      '**Runs at the end.** If the last three or more cards, in any order, are consecutive ranks, the player pegs one point a card, for the longest such run. 4 then 3 then 5 is a run of three; 3 5 4 6 a run of four; 3 4 4 is a pair, not a run; 2 3 K 4 is nothing, because the king is in the last three, four and so on (cell 3). Unlike the show, only the end of the pile counts, and each play scores its own run, so a long run can score several times as it grows.',
      '**Which cards can be played.** options(seat): the cards in hand not yet played whose value keeps the count at 31 or under. If there are none, that player cannot play now, though they may still hold cards.',
      '**The turns, step by step** (cell 4 runs them on two hands, each playing its first legal card). (1) If every card has been played, the last to play pegs 1 for the last card, unless the count is exactly 31 (that already scored 2); then the show. (2) If the count is 31, it starts again from 0. (3) If the player to move can play, they play. (4) If not but the other can, the first says go and the other plays on, as many cards as they can. (5) If neither can, the last to play pegs 1 for the go, the count starts again, and the *other* player leads.',
      '**Who leads after a reset.** After a go or a 31, the player who did not play last leads. In cell 4 the non-dealer makes 31 with a 2, so the dealer leads the new count; later the non-dealer has no cards left, so the dealer plays its last two and pegs the last card.',
      '**What pegging is worth.** Cell 5 deals 20,000 hands and has both players play the card that pegs most now, never leaving the count on 5 or 21 (which hands the other a 15 or 31 with any ten). The dealer pegs 3.75 a hand and the non-dealer 2.17: the non-dealer leads, so the dealer is the one answering, and the dealer often gets the last card. Being dealer is worth about a point and a half in pegging, and the crib on top.',
      '**In the game.** score.js has countOf and pegPoints; table.js has options(seat) and nextTurn(), which runs the five steps. The table waits (a fraction of a second, so you can follow) between plays, and the AI asks the table for its legal moves, the same options().',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: whose turn (nextTurn)',
        body: 'Step 1. All cards played: the last to play pegs 1 (not at 31); the show. Step 2. Count 31: restart the count. Step 3. The player to move can play: wait for their card. Step 4. Else the other can: "go", the other plays on. Step 5. Else: the last to play pegs 1, the count restarts, the other player leads.',
      },
      {
        type: 'warning',
        title: '31 is not also a go',
        body: 'Making 31 pegs 2 and ends the count at once; there is no extra point for a go. The same for the last card: if it makes 31, it scores 2, not 3.',
      },
      {
        type: 'insight',
        title: 'A sequence, not a set',
        body: 'The show asks "which combinations of these cards"; pegging asks "what did the last few plays make". The same cards score differently in a different order, which is why pegging is where play is skilful, and where the AI will have to learn the most.',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Build it: pegging',
        caption: 'The count, pairs and runs at the end of the pile, the turns, and what pegging is worth.',
        props: {
          lesson: {
            title: 'Pegging',
            subtitle: 'The end of the pile, and the turns.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. The count\nPredict first: which peg 2.',
                startCode: "const value = (card) => Math.min(card.rank, 10)\nconst cards = (text) => text.split(' ').map((t) => ({ rank: ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\nconst name = (c) => ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][c.rank] + c.suit\nconst countOf = (pile) => pile.reduce((t, c) => t + value(c), 0)\n// The count, and 15 and 31. Predict first: which of these plays peg 2?\nfor (const pile of ['5H KS', '7H 8C', 'KS QS JS AH', 'KS QS 9H', '4D 6C 5S'])\n  console.log(pile.padEnd(12) + ' count ' + countOf(cards(pile)) + (countOf(cards(pile)) === 15 || countOf(cards(pile)) === 31 ? '  → 2' : ''))",
              },
              {
                type: 'js',
                instruction: '### 2. Pairs at the end\nPredict first: 7 2 7.',
                startCode: "const value = (card) => Math.min(card.rank, 10)\nconst cards = (text) => text.split(' ').map((t) => ({ rank: ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\nconst name = (c) => ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][c.rank] + c.suit\nconst countOf = (pile) => pile.reduce((t, c) => t + value(c), 0)\n// Pairs in pegging: only the cards at the END of the pile, in a row. Predict first: 7 2 7, then 7 7 7.\nfunction samesAtEnd(pile) {\n  const card = pile[pile.length - 1]\n  let same = 1\n  while (same < pile.length && pile[pile.length - 1 - same].rank === card.rank) same++\n  return same\n}\nfor (const pile of ['7H 7S', '7H 2S 7D', '7H 7S 7D', '2H 2S 2D 2C', '9H 2S 2D'])\n  console.log(pile.padEnd(12) + ' ' + samesAtEnd(cards(pile)) + ' alike at the end → ' + [0, 0, 2, 6, 12][samesAtEnd(cards(pile))] + ' points')",
              },
              {
                type: 'js',
                instruction: '### 3. Runs at the end\nPredict first: 2 3 K 4.',
                startCode: "const value = (card) => Math.min(card.rank, 10)\nconst cards = (text) => text.split(' ').map((t) => ({ rank: ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\nconst name = (c) => ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][c.rank] + c.suit\nconst countOf = (pile) => pile.reduce((t, c) => t + value(c), 0)\nfunction isRun(cards) { const r = cards.map((c) => c.rank).sort((a, b) => a - b); return r.every((x, i) => i === 0 || x === r[i - 1] + 1) }\n// Runs in pegging: the last three or more cards played, in ANY order, make a run; the longest such run counts.\n// Predict first: 4 3 5, then 3 5 4 6, then 3 4 4, then 2 3 K 4.\nfunction runAtEnd(pile) {\n  for (let length = pile.length; length >= 3; length--) if (isRun(pile.slice(-length))) return length\n  return 0\n}\nfor (const pile of ['4S 3H 5D', '3H 5D 4S 6C', '3H 4S 4D', '2C 3H KS 4D', '6H 7S 8D 6C', 'AS 2H 3D 4C 5S'])\n  console.log(pile.padEnd(16) + ' ' + (runAtEnd(cards(pile)) ? 'run of ' + runAtEnd(cards(pile)) : 'no run'))",
              },
              {
                type: 'js',
                instruction: '### 4. The turns\nPredict first: the go and the last card.',
                startCode: "const value = (card) => Math.min(card.rank, 10)\nconst cards = (text) => text.split(' ').map((t) => ({ rank: ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\nconst name = (c) => ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][c.rank] + c.suit\nconst countOf = (pile) => pile.reduce((t, c) => t + value(c), 0)\nfunction isRun(cards) { const r = cards.map((c) => c.rank).sort((a, b) => a - b); return r.every((x, i) => i === 0 || x === r[i - 1] + 1) }\n// The points for the card just played: the last of pile (the cards since the count was last 0).\nfunction pegPoints(pile) {\n  const parts = [], count = countOf(pile), card = pile[pile.length - 1]\n  if (count === 15) parts.push({ what: 'fifteen', points: 2 })\n  if (count === 31) parts.push({ what: 'thirty-one', points: 2 })\n  let same = 1\n  while (same < pile.length && pile[pile.length - 1 - same].rank === card.rank) same++\n  if (same >= 2) parts.push({ what: ['', '', 'a pair', 'three of a kind', 'four of a kind'][same], points: [0, 0, 2, 6, 12][same] })\n  for (let length = pile.length; length >= 3; length--) if (isRun(pile.slice(-length))) { parts.push({ what: 'run of ' + length, points: length }); break }\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts }\n}\n// The turns: a whole pegging, with go, 31 and the last card. Each player plays its FIRST card that fits (no\n// cleverness yet). Predict first: who pegs the go, and who gets the last card?\nconst hands = [cards('10H 9C 8S 2D'), cards('KS QD 7C 3H')]   // 0: the non-dealer (leads), 1: the dealer\nconst played = [[false, false, false, false], [false, false, false, false]], score = [0, 0]\nlet pile = [], turn = 0, last = null\nconst options = (s) => hands[s].map((c, k) => k).filter((k) => !played[s][k] && countOf(pile) + value(hands[s][k]) <= 31)\nconst left = (s) => played[s].filter((p) => !p).length\nwhile (left(0) + left(1) > 0) {\n  if (countOf(pile) === 31) { console.log('   (31: the count starts again)'); pile = [] }\n  let o = options(turn)\n  if (!o.length) {\n    if (options(1 - turn).length) { if (left(turn)) console.log((turn ? 'dealer' : 'pone  ') + ' says go'); turn = 1 - turn; continue }\n    score[last]++; console.log((last ? 'dealer' : 'pone  ') + ' pegs 1 for the go; the count starts again'); pile = []; turn = 1 - last; continue\n  }\n  const k = o[0], card = hands[turn][k]\n  played[turn][k] = true; pile.push(card); last = turn\n  const p = pegPoints(pile); score[turn] += p.total\n  console.log((turn ? 'dealer' : 'pone  ') + ' plays ' + name(card).padEnd(3) + ' count ' + String(countOf(pile)).padStart(2) + (p.total ? '  pegs ' + p.total + ' (' + p.parts.map((x) => x.what).join(', ') + ')' : ''))\n  turn = 1 - turn\n}\nif (countOf(pile) !== 31) { score[last]++; console.log((last ? 'dealer' : 'pone  ') + ' pegs 1 for the last card') }\nconsole.log('pegged: pone ' + score[0] + ', dealer ' + score[1])",
              },
              {
                type: 'js',
                instruction: '### 5. What pegging is worth\nPredict first: dealer or non-dealer.',
                startCode: "// A seeded random-number generator (mulberry32, Game Studio's), so this cell deals the same cards every run.\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\n// Cards and the deck. A card is a plain object, { rank, suit }: rank 1 (ace) to 13 (king), suit one of S H D C.\n// Nothing here draws anything, so the rules can be tested, and an agent can learn, without a screen.\n\nconst SUITS = ['S', 'H', 'D', 'C'];\nconst SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' };\nconst RANK_NAME = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];\n\n/** What a card counts for, toward 15 and 31: an ace is 1, a face card 10. */\nfunction value(card) { return Math.min(card.rank, 10); }\n\n/** A card's name, such as 10♥. */\nfunction cardName(card) { return RANK_NAME[card.rank] + SUIT_SYMBOL[card.suit]; }\n\n/** Its picture: assets/cards/10H.svg (the build writes all 52, and the back). */\nfunction cardImage(card) { return `assets/cards/${RANK_NAME[card.rank]}${card.suit}.svg`; }\n\n/** A fresh deck: the 52 cards in order. */\nfunction newDeck() {\n  const deck = [];\n  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ rank, suit });\n  return deck;\n}\n\n/**\n * Shuffle in place (Fisher–Yates): for each position from the last down, swap in a card chosen at random from those\n * not yet placed. Every order is equally likely. It uses Math.random, which training seeds, so a hand can be replayed.\n */\nfunction shuffle(deck) {\n  for (let i = deck.length - 1; i > 0; i--) {\n    const j = Math.floor(Math.random() * (i + 1));\n    [deck[i], deck[j]] = [deck[j], deck[i]];\n  }\n  return deck;\n}\n\n/** The same card? (Two objects can describe one card.) */\nfunction sameCard(a, b) { return a.rank === b.rank && a.suit === b.suit; }\nconst cards = (text) => text.split(' ').map((t) => ({ rank: ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\nconst name = (c) => ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][c.rank] + c.suit\nconst countOf = (pile) => pile.reduce((t, c) => t + value(c), 0)\nfunction isRun(cards) { const r = cards.map((c) => c.rank).sort((a, b) => a - b); return r.every((x, i) => i === 0 || x === r[i - 1] + 1) }\n// The points for the card just played: the last of pile (the cards since the count was last 0).\nfunction pegPoints(pile) {\n  const parts = [], count = countOf(pile), card = pile[pile.length - 1]\n  if (count === 15) parts.push({ what: 'fifteen', points: 2 })\n  if (count === 31) parts.push({ what: 'thirty-one', points: 2 })\n  let same = 1\n  while (same < pile.length && pile[pile.length - 1 - same].rank === card.rank) same++\n  if (same >= 2) parts.push({ what: ['', '', 'a pair', 'three of a kind', 'four of a kind'][same], points: [0, 0, 2, 6, 12][same] })\n  for (let length = pile.length; length >= 3; length--) if (isRun(pile.slice(-length))) { parts.push({ what: 'run of ' + length, points: length }); break }\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts }\n}\n// What pegging is worth. 20,000 random deals, both players playing the card that pegs the most now (and never\n// leaving 5 or 21). Predict first: does the dealer or the non-dealer peg more, and by how much?\nfunction pegHand(hands, rand) {\n  const played = hands.map((h) => h.map(() => false)), score = [0, 0]\n  let pile = [], turn = 0, last = null\n  const options = (s) => hands[s].map((c, k) => k).filter((k) => !played[s][k] && countOf(pile) + value(hands[s][k]) <= 31)\n  const left = (s) => played[s].filter((p) => !p).length\n  while (left(0) + left(1) > 0) {\n    if (countOf(pile) === 31) pile = []\n    const o = options(turn)\n    if (!o.length) { if (options(1 - turn).length) { turn = 1 - turn; continue } score[last]++; pile = []; turn = 1 - last; continue }\n    let best = o[0], bestScore = -Infinity\n    for (const k of o) { const after = [...pile, hands[turn][k]], c = countOf(after); const s = pegPoints(after).total * 10 - (c === 5 || c === 21 ? 15 : 0) + value(hands[turn][k]) / 10; if (s > bestScore) { bestScore = s; best = k } }\n    played[turn][best] = true; pile.push(hands[turn][best]); last = turn\n    score[turn] += pegPoints(pile).total; turn = 1 - turn\n  }\n  if (countOf(pile) !== 31) score[last]++\n  return score\n}\nconst real = Math.random; Math.random = seeded(5)\nconst total = [0, 0]\nfor (let k = 0; k < 20000; k++) { const d = shuffle(newDeck()); const s = pegHand([d.slice(0, 4), d.slice(4, 8)]); total[0] += s[0]; total[1] += s[1] }\nMath.random = real\nconsole.log('pegged per hand: non-dealer ' + (total[0] / 20000).toFixed(2) + ', dealer ' + (total[1] / 20000).toFixed(2))",
              },
              {
                type: 'challenge',
                instruction: '### 6. Challenge: pegPoints\nTen piles check it.',
                startCode: "const value = (card) => Math.min(card.rank, 10)\nconst cards = (text) => text.split(' ').map((t) => ({ rank: ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\nconst name = (c) => ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][c.rank] + c.suit\nconst countOf = (pile) => pile.reduce((t, c) => t + value(c), 0)\nfunction isRun(cards) { const r = cards.map((c) => c.rank).sort((a, b) => a - b); return r.every((x, i) => i === 0 || x === r[i - 1] + 1) }\n// Challenge: write pegPoints(pile): 15 or 31 (2), pairs at the end (2, 6, 12), and the longest run the last cards\n// make (one a card). Return { total, parts }.\nfunction pegPoints(pile) {\n  return { total: 0, parts: [] }   // your code\n}\nconst cases = [['5H KS', 2], ['KS QS JS AH', 2], ['7H 7S 7D', 6], ['7H 2S 7D', 0], ['4S 3H 5D', 3], ['3H 5D 4S 6C', 4], ['3H 3S 4D 5C', 5], ['3H 4S 4D', 2], ['2H 2S 2D 2C', 12], ['5H 5S 5C', 6 + 2]]\nlet ok = 0\nfor (const [pile, want] of cases) { const got = pegPoints(cards(pile)).total; if (got === want) ok++; else console.log(pile + ': ' + got + ', should be ' + want) }\nconsole.log(ok === cases.length ? '✓ All 10 piles pegged right.' : ok + ' of 10 piles right.')",
                solutionCode: "const value = (card) => Math.min(card.rank, 10)\nconst cards = (text) => text.split(' ').map((t) => ({ rank: ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].indexOf(t.slice(0, -1)), suit: t.slice(-1) }))\nconst name = (c) => ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][c.rank] + c.suit\nconst countOf = (pile) => pile.reduce((t, c) => t + value(c), 0)\nfunction isRun(cards) { const r = cards.map((c) => c.rank).sort((a, b) => a - b); return r.every((x, i) => i === 0 || x === r[i - 1] + 1) }\n// Challenge: write pegPoints(pile): 15 or 31 (2), pairs at the end (2, 6, 12), and the longest run the last cards\n// make (one a card). Return { total, parts }.\nfunction pegPoints(pile) {\n  const parts = [], count = countOf(pile), card = pile[pile.length - 1]\n  if (count === 15) parts.push({ what: 'fifteen', points: 2 })\n  if (count === 31) parts.push({ what: 'thirty-one', points: 2 })\n  let same = 1\n  while (same < pile.length && pile[pile.length - 1 - same].rank === card.rank) same++\n  if (same >= 2) parts.push({ what: ['', '', 'a pair', 'three of a kind', 'four of a kind'][same], points: [0, 0, 2, 6, 12][same] })\n  for (let length = pile.length; length >= 3; length--) if (isRun(pile.slice(-length))) { parts.push({ what: 'run of ' + length, points: length }); break }\n  return { total: parts.reduce((t, p) => t + p.points, 0), parts }\n}\nconst cases = [['5H KS', 2], ['KS QS JS AH', 2], ['7H 7S 7D', 6], ['7H 2S 7D', 0], ['4S 3H 5D', 3], ['3H 5D 4S 6C', 4], ['3H 3S 4D 5C', 5], ['3H 4S 4D', 2], ['2H 2S 2D 2C', 12], ['5H 5S 5C', 6 + 2]]\nlet ok = 0\nfor (const [pile, want] of cases) { const got = pegPoints(cards(pile)).total; if (got === want) ok++; else console.log(pile + ': ' + got + ', should be ' + want) }\nconsole.log(ok === cases.length ? '✓ All 10 piles pegged right.' : ok + ' of 10 piles right.')",
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Pegging: the count and the go',
        props: {
          task: 'crib-peg',
          lesson: 'mg10-005',
          checkpoint: 'cp-mg10-005-4',
        },
      },
    ],
  },

  math: {
    prose: [
      '**Under the hood (optional).** The count has a ceiling of 31 and each card adds 1 to 10, so a count of $c$ leaves room for any card of value at most $31 - c$; at 21 or more, tens no longer fit, which is why the go usually comes in the twenties.',
      'Leaving the count at 5 is risky because 16 of the 52 cards are worth 10: an opponent holding four random unseen cards has at least one ten with probability about $1 - \\binom{30}{4}/\\binom{46}{4} \\approx 0.83$ (46 cards unseen, and all 16 tens among them if you hold none).',
    ],
    equations: [
      {
        label: 'A card fits',
        latex: 'c + v \\le 31',
      },
      {
        label: 'Chance of at least one ten',
        latex: '1 - \\binom{30}{4} \\Big/ \\binom{46}{4} \\approx 0.83',
      },
    ],
    callouts: [],
    visualizations: [],
  },

  rigor: {
    prose: [
      'nextTurn is a state machine over (whose turn, the count, the cards left, the last player): each call either waits for a play or moves to a new state, and every path ends when all cards are played, because each step either plays a card or resets the count (which makes someone able to play).',
      'Termination: after a reset the count is 0 and any card fits, so a player with cards can always play; the loop cannot pass go forever.',
      "Where it goes: 10.6 puts pegging between the cut and the show, in the table's full flow.",
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [
    {
      id: 'mg10-005-ex1',
      title: 'A pair royal in pegging',
      difficulty: 'easy',
      problem: 'The pile is 7 7 and you play a third 7. What do you peg?',
      steps: [
        {
          expression: '3 \\text{ alike} \\to 6',
          annotation: 'Three of a kind at the end.',
          strategyTitle: 'Step 1: the end',
        },
      ],
      answer: '6 (and 21 is not 15 or 31).',
    },
    {
      id: 'mg10-005-ex2',
      title: 'A run out of order',
      difficulty: 'medium',
      problem: 'The pile is 5, 7 and you play a 6. What do you peg?',
      steps: [
        {
          expression: '5 + 7 + 6 = 18',
          annotation: 'Not 15 or 31.',
          strategyTitle: 'Step 1: count',
        },
        {
          expression: '\\{5, 6, 7\\}',
          annotation: 'The last three make a run.',
          strategyTitle: 'Step 2: run',
        },
      ],
      answer: '3.',
    },
    {
      id: 'mg10-005-ex3',
      title: 'A go',
      difficulty: 'hard',
      problem: 'Count 27. You hold K 9, the AI holds 3 2; you are to play. Play it out.',
      steps: [
        {
          expression: '27 + 9 > 31',
          annotation: 'You cannot play: go.',
          strategyTitle: 'Step 1: you',
        },
        {
          expression: '27 + 3 = 30',
          annotation: 'The AI plays 3.',
          strategyTitle: 'Step 2: AI plays on',
        },
        {
          expression: '30 + 2 > 31',
          annotation: 'Neither can play.',
          strategyTitle: 'Step 3: the go',
        },
      ],
      answer: 'The AI pegs 1 for the go; the count restarts and you lead (K or 9), then the AI plays its 2.',
    },
  ],

  challenges: [
    {
      id: 'mg10-005-ch1',
      title: 'Leading',
      difficulty: 'easy',
      problem: 'Why do good players avoid leading a 5?',
      hint: 'Sixteen tens.',
      answer: 'Any ten-card answer makes 15 for 2.',
      walkthrough: [],
    },
    {
      id: 'mg10-005-ch2',
      title: 'Runs that grow',
      difficulty: 'medium',
      problem: 'The pile goes 3, 4, 5, 6. What does each of the last two cards peg?',
      hint: 'The longest run at the end, each time.',
      answer: 'The 5 pegs 3 (3 4 5); the 6 pegs 4 (3 4 5 6).',
      walkthrough: [],
    },
    {
      id: 'mg10-005-ch3',
      title: 'Who leads',
      difficulty: 'hard',
      problem: 'After a 31 made by the dealer, who leads the next count, and why that rule?',
      hint: 'Alternation.',
      answer: 'The non-dealer: the player who did not play last leads, so play alternates fairly.',
      walkthrough: [],
    },
  ],

  semantics: {
    core: [
      {
        symbol: 'pile',
        meaning: 'The cards since the count was last 0.',
      },
      {
        symbol: 'countOf(pile)',
        meaning: 'The count: their values added up.',
      },
      {
        symbol: 'pegPoints(pile)',
        meaning: "The last card's points: 15/31, pairs and runs at the end.",
      },
      {
        symbol: 'options(seat)',
        meaning: 'The cards that player can play now.',
      },
      {
        symbol: 'nextTurn()',
        meaning: 'Who moves, go, 31, the last card.',
      },
    ],
    rulesOfThumb: [
      'Only the end of the pile counts.',
      'Neither can play: the last to play pegs 1.',
      'After a reset, the other player leads.',
    ],
  },

  misconceptions: [
    {
      falseBelief: 'A go ends the round of play for both players.',
      whyStudentsThinkIt: '"Go" sounds final.',
      correctionExample: "The other player plays on as long as they can (cell 4, the non-dealer's 2 after the dealer's go).",
      contrastCase: 'Only when neither can play does the count restart.',
    },
    {
      falseBelief: 'Pegging runs must be in order.',
      whyStudentsThinkIt: 'The cards were played in order.',
      correctionExample: '4 3 5 is a run (cell 3).',
      contrastCase: 'A card in between that does not fit breaks it: 2 3 K 4.',
    },
  ],

  transferPrompts: [
    {
      situation: 'A card game where a player who cannot move passes.',
      competingTechniques: [
        'Special-case each situation in the input code',
        'A nextTurn function that decides who moves from the state',
      ],
      whyThisTechniqueWins: 'One place decides turns, for players, AIs and tests alike.',
    },
    {
      situation: 'Scoring combos in a fighting game.',
      competingTechniques: ['Score sets of moves', 'Score the end of the move sequence'],
      whyThisTechniqueWins: 'Combos, like pegging, depend on order.',
    },
  ],

  debugging: [
    {
      commonError: 'Pairs counted anywhere in the pile.',
      symptom: '7 2 7 pegs 2.',
      whyItHappened: 'Only cards in a row at the end make a pair.',
      repairStrategy: 'Count back from the end while the rank matches.',
    },
    {
      commonError: 'A go point at 31.',
      symptom: '31 scores 3.',
      whyItHappened: 'The go was awarded after the reset.',
      repairStrategy: 'At 31, reset without a go point.',
    },
    {
      commonError: 'The same player leads after a go.',
      symptom: 'One player leads every count.',
      whyItHappened: 'The turn was not handed over.',
      repairStrategy: 'After a reset, the player who did not play last leads.',
    },
  ],

  mastery: {
    targetLevel: 3,
    solveIndependently: 'Write pegPoints, options and nextTurn.',
    explainVerbally: 'Explain go, 31 and the last card.',
    detectIncorrectApplication: 'Spot pairs not at the end, a go at 31, the wrong leader.',
    transferToUnfamiliar: 'Write turn logic with passing for another game.',
  },

  assessment: {
    questions: [
      {
        id: 'mg10-005-assess-1',
        type: 'choice',
        text: 'The pile 3 5 4 6 pegs',
        options: ['4', '3', '7', '0'],
        answer: '4',
        hint: 'Cell 3.',
      },
    ],
  },

  quiz: [
    {
      id: 'mg10-005-quiz-1',
      type: 'choice',
      text: 'K Q 9 makes the count',
      options: ['29', '31', '28', '30'],
      answer: '29',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg10-005-quiz-2',
      type: 'choice',
      text: '7 2 7 pegs',
      options: ['0', '2', '6', '1'],
      answer: '0',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg10-005-quiz-3',
      type: 'choice',
      text: '2 3 K 4 pegs for a run',
      options: ['Nothing', '3', '4', '2'],
      answer: 'Nothing',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg10-005-quiz-4',
      type: 'choice',
      text: 'In cell 4, who pegs the last card?',
      options: ['The dealer', 'The non-dealer', 'Neither', 'Both'],
      answer: 'The dealer',
      hints: ['Cell 4.'],
      reviewSection: 'Cell 4',
    },
    {
      id: 'mg10-005-quiz-5',
      type: 'choice',
      text: 'In cell 5 the dealer pegs per hand about',
      options: ['3.75', '2.17', '1', '6'],
      answer: '3.75',
      hints: ['Cell 5.'],
      reviewSection: 'Cell 5',
    },
    {
      id: 'mg10-005-quiz-6',
      type: 'choice',
      text: 'When neither can play, who leads next?',
      options: [
        'The player who did not play last',
        'The dealer',
        'The last to play',
        'Whoever has more cards',
      ],
      answer: 'The player who did not play last',
      hints: ['The turns.'],
      reviewSection: 'Intuition — the turns',
    },
  ],

  checkpoints: [
    {
      id: 'cp-mg10-005-1',
      label: 'Read the pile, pairs and runs at the end',
      type: 'read',
    },
    {
      id: 'cp-mg10-005-2',
      label: 'Read the turns: go, 31, the last card',
      type: 'read',
    },
    {
      id: 'cp-mg10-005-3',
      label: 'Run the notebook',
      type: 'read',
    },
    {
      id: 'cp-mg10-005-4',
      label: 'Complete "Pegging: the count, and the go" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg10-005-5',
      label: 'Read what pegging is worth',
      type: 'read',
    },
    {
      id: 'cp-mg10-005-6',
      label: 'Work through the run out of order',
      type: 'example',
    },
    {
      id: 'cp-mg10-005-7',
      label: 'Work through the go',
      type: 'example',
    },
    {
      id: 'cp-mg10-005-8',
      label: 'Pass the pegPoints challenge',
      type: 'challenge',
    },
  ],

  chapter: 'making-games-10',
}
