export default {
  order: 2,

  id: 'mg10-002',

  slug: 'cards-as-data',

  title: 'Cards as Data: the Deck and the Shuffle',

  subtitle: 'A card is an object, a deck is a list, and a fair shuffle is three lines that are easy to get subtly wrong.',

  tags: [
    'game-studio',
    'cribbage',
    'data-modelling',
    'arrays',
    'randomness',
    'fisher-yates',
  ],

  aliases: 'card object rank suit deck array shuffle fisher yates knuth shuffle random permutation uniform bias deal modules export import',

  timeToComplete: 45,

  coreConcept: 'Model the game\'s things as plain data before drawing anything: a card is { rank, suit }, a deck is a list of 52 of them, a hand a list of six. Small functions answer questions about them (value, cardName). A shuffle must make every order equally likely; Fisher–Yates does, by filling the deck from the end, each place with a card chosen at random from those not yet placed. The tempting "swap each card with any card" does not: it has 27 equally likely paths for 6 orders, so some orders come up more.',

  prerequisites: ['mg10-001'],

  nextLesson: 'mg10-003',

  hook: {
    question: 'Before a card game can show a single card, it needs to know what a card is. What is the least you need to write down about a card, and how do you shuffle 52 of them so no order is more likely than another?',
    realWorldContext: "Online card games are audited for fair shuffles; a 1999 online poker site's shuffle was cracked because it seeded its random numbers from the clock: so few decks were possible that a program could work out the whole deck from the cards it could see. Fisher–Yates (1938, made a computer algorithm by Durstenfeld in 1964) is the standard everywhere, from games to statistics.",
  },

  intuition: {
    prose: [
      "**Data first.** A card has two facts: its rank (1 for an ace up to 13 for a king) and its suit (S, H, D or C). So a card is the object { rank: 7, suit: 'H' }. Everything else is worked out from those two: what it counts in cribbage, value(card) = the rank but at most 10; its name, cardName(card) = '7♥'; its picture, cardImage(card) = 'assets/cards/7H.svg' (cell 1). The rules never need the picture, and the picture never needs the rules.",
      '**Why plain data.** The same card objects are used by the rules (score.js), the screen (a sprite shows cardImage), and later the AI (features.js), and a test can make any hand from text. If a card were a sprite, every rule would need a running game to test.',
      '**The deck.** Two loops: for each suit, for each rank from 1 to 13, push { rank, suit }. 52 cards, all different (cell 2). The deck is a list, so dealing is taking from it: deck.pop() takes the last card, the top of the deck.',
      '**A fair shuffle.** Every one of the 52! orders should be equally likely. Fisher–Yates does it in one pass: for i from the last place down to 1, choose j at random from 0 to i, and swap deck[i] with deck[j]. Place i gets a random card from those not yet placed, then is never touched again, so after the pass each order has exactly one way to happen: 52 × 51 × … × 2 choices, one per order.',
      '**The mistake.** "For each place, swap it with any place" looks just as random. It is not: three cards make 3 × 3 × 3 = 27 equally likely sequences of swaps, but there are 6 orders, and 27 is not a multiple of 6, so some orders get 5 of the paths and some 4. Cell 3 runs both 60,000 times: Fisher–Yates gives each order about 10,000 (9,868 to 10,122); the naive one gives 8,894 to 11,169, the 4/27 and 5/27 split.',
      '**Randomness you can replay.** The shuffle calls Math.random. When an agent trains, Game Studio replaces Math.random with a seeded generator, so a seed always deals the same cards: a training run can be repeated exactly, and two players can be compared on the same deals. The notebook does the same with seeded(…).',
      "**The deal.** Six each, one at a time from the top, the non-dealer first (cell 4). Dealing in turns does not change the odds (the deck is already random), but it is the rule, and it keeps the game the same as at a real table. Your hand is sorted by rank, as a player would hold it; the AI's is not, so its position says nothing.",
      "**Modules.** In the game this is scripts/cards.js: functions marked export, which other scripts import, as import { newDeck, shuffle } from './cards.js'. A module that draws nothing and touches no node is the easiest code in a game to test, and the Try it task checks each function as you write it.",
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: Fisher–Yates',
        body: 'Step 1. For i from deck.length − 1 down to 1: Step 2. j = Math.floor(Math.random() × (i + 1)), a place from 0 to i. Step 3. Swap deck[i] and deck[j]. Step 4. Return the deck (it was shuffled in place).',
      },
      {
        type: 'warning',
        title: 'Not sort with a random comparison',
        body: "deck.sort(() => Math.random() − 0.5) is a common shortcut and it is biased too: sort assumes a consistent comparison, and depending on the browser's sort some orders come up far more often. Use Fisher–Yates.",
      },
      {
        type: 'insight',
        title: 'Data first, pictures later',
        body: "Every game in this course that grew complicated did so in the data: Tetris's grid of numbers, Breakout's score and lives. Cards are the same. Get the data and its functions right and tested; the screen is then a view of it.",
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Build it: cards, a deck, a fair shuffle',
        caption: 'Cards as objects, the deck, two shuffles measured, and a deal.',
        props: {
          lesson: {
            title: 'Cards as data',
            subtitle: 'The deck, measured.',
            cells: [
              {
                type: 'js',
                instruction: "### 1. A card is data\nPredict first: a king's value and name.",
                startCode: "// A card is data: an object with a rank (1 ace … 13 king) and a suit (S H D C). Nothing about pictures.\n// Predict first: what does a king count for, and what is its name?\nconst RANK_NAME = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']\nconst SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' }\nconst value = (card) => Math.min(card.rank, 10)              // toward 15 and 31: a face card is 10\nconst cardName = (card) => RANK_NAME[card.rank] + SUIT_SYMBOL[card.suit]\nfor (const card of [{ rank: 1, suit: 'S' }, { rank: 7, suit: 'H' }, { rank: 10, suit: 'D' }, { rank: 13, suit: 'C' }])\n  console.log(JSON.stringify(card) + '  is ' + cardName(card) + ', worth ' + value(card))",
              },
              {
                type: 'js',
                instruction: '### 2. The deck\nPredict first: the first and last card.',
                startCode: "// The deck: every suit with every rank. Predict first: how many cards, and which comes first and last?\nconst SUITS = ['S', 'H', 'D', 'C']\nfunction newDeck() {\n  const deck = []\n  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ rank, suit })\n  return deck\n}\nconst deck = newDeck()\nconsole.log(deck.length + ' cards; first ' + JSON.stringify(deck[0]) + ', last ' + JSON.stringify(deck[51]))\nconsole.log('different cards: ' + new Set(deck.map((c) => c.rank + c.suit)).size)",
              },
              {
                type: 'js',
                instruction: '### 3. Two shuffles, measured\nPredict first: which is fair.',
                startCode: "// A seeded random-number generator (mulberry32, Game Studio's), so this cell deals the same cards every run.\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\n// Two shuffles of three cards, each run 60,000 times: how often does each of the 6 orders come up?\n// Predict first: which one is fair (10,000 each)?\n// Fisher–Yates: from the last place down, swap in a card chosen from the places not yet fixed (0 to i).\nfunction fisherYates(a, rand) {\n  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }\n  return a\n}\n// The tempting mistake: swap every place with any place (0 to n − 1).\nfunction naive(a, rand) {\n  for (let i = 0; i < a.length; i++) { const j = Math.floor(rand() * a.length); [a[i], a[j]] = [a[j], a[i]] }\n  return a\n}\nfor (const [name, shuffle] of [['Fisher–Yates', fisherYates], ['naive', naive]]) {\n  const rand = seeded(7), counts = {}\n  for (let k = 0; k < 60000; k++) { const o = shuffle(['A', 'B', 'C'], rand).join(''); counts[o] = (counts[o] || 0) + 1 }\n  console.log(name.padEnd(13) + Object.keys(counts).sort().map((o) => o + ' ' + counts[o]).join('  '))\n}",
              },
              {
                type: 'js',
                instruction: '### 4. The deal\nPredict first: what is left.',
                startCode: "// A seeded random-number generator (mulberry32, Game Studio's), so this cell deals the same cards every run.\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\n// The deal: shuffle, then six cards each from the end of the deck, one at a time, the non-dealer first.\n// Predict first: does dealing one at a time (rather than six to one player, then six to the other) change the odds?\nconst SUITS = ['S', 'H', 'D', 'C'], RANK_NAME = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']\nconst rand = seeded(42)\nconst deck = []\nfor (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ rank, suit })\nfor (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]] }\nconst dealer = 0, hands = [[], []]\nfor (let k = 0; k < 6; k++) for (const seat of [1 - dealer, dealer]) hands[seat].push(deck.pop())\nconst show = (h) => h.map((c) => RANK_NAME[c.rank] + c.suit).join(' ')\nconsole.log('you (the dealer):    ' + show(hands[0].slice().sort((a, b) => a.rank - b.rank)))\nconsole.log('the AI (non-dealer): ' + show(hands[1]))\nconsole.log('left in the deck: ' + deck.length + '; the starter will be ' + show([deck[deck.length - 1]]))",
              },
              {
                type: 'challenge',
                instruction: '### 5. Challenge: Fisher–Yates\nThe check counts 27,000 shuffles.',
                startCode: "// A seeded random-number generator (mulberry32, Game Studio's), so this cell deals the same cards every run.\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\n// Challenge: write shuffle(deck), Fisher–Yates, in place, using rand() (like Math.random). The check shuffles three\n// cards 27,000 times: each of the 6 orders should come up close to 4,500 times.\nfunction shuffle(deck, rand) {\n  // your code here\n  return deck\n}\nconst counts = {}, rand = seeded(11)\nlet same = true\nfor (let k = 0; k < 27000; k++) { const a = [0, 1, 2]; if (shuffle(a, rand) !== a) same = false; const o = a.join(''); counts[o] = (counts[o] || 0) + 1 }\nconst values = Object.values(counts), worst = Math.max(...values.map((n) => Math.abs(n - 4500)))\nif (!same) console.log('Shuffle the array you are given (in place), and return it.')\nelse if (Object.keys(counts).length < 6) console.log('Only ' + Object.keys(counts).length + ' of the 6 orders came up: the cards are not being moved enough.')\nelse if (worst > 250) console.log('The orders came up ' + values.join(', ') + ' times: not equally likely. Choose j from 0 to i.')\nelse console.log('✓ All 6 orders equally likely: ' + values.join(', ') + '.')",
                solutionCode: "// A seeded random-number generator (mulberry32, Game Studio's), so this cell deals the same cards every run.\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\n// Challenge: write shuffle(deck), Fisher–Yates, in place, using rand() (like Math.random). The check shuffles three\n// cards 27,000 times: each of the 6 orders should come up close to 4,500 times.\nfunction shuffle(deck, rand) {\n  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]] }\n  return deck\n}\nconst counts = {}, rand = seeded(11)\nlet same = true\nfor (let k = 0; k < 27000; k++) { const a = [0, 1, 2]; if (shuffle(a, rand) !== a) same = false; const o = a.join(''); counts[o] = (counts[o] || 0) + 1 }\nconst values = Object.values(counts), worst = Math.max(...values.map((n) => Math.abs(n - 4500)))\nif (!same) console.log('Shuffle the array you are given (in place), and return it.')\nelse if (Object.keys(counts).length < 6) console.log('Only ' + Object.keys(counts).length + ' of the 6 orders came up: the cards are not being moved enough.')\nelse if (worst > 250) console.log('The orders came up ' + values.join(', ') + ' times: not equally likely. Choose j from 0 to i.')\nelse console.log('✓ All 6 orders equally likely: ' + values.join(', ') + '.')",
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Write cards.js',
        props: {
          task: 'crib-cards',
          lesson: 'mg10-002',
          checkpoint: 'cp-mg10-002-4',
        },
      },
    ],
  },

  math: {
    prose: [
      '**Under the hood (optional).** Fisher–Yates is uniform: the probability of any particular order is $\\frac{1}{n} \\cdot \\frac{1}{n-1} \\cdots \\frac{1}{2} = \\frac{1}{n!}$, because place $n-1$ gets each of $n$ cards with probability $1/n$, place $n-2$ each of the remaining $n-1$, and so on.',
      'The naive shuffle makes $n^n$ equally likely swap sequences. For it to be uniform, $n!$ would have to divide $n^n$; for $n = 3$, 6 does not divide 27, so it cannot be. For a deck of 52 it is biased the same way, by far smaller but real amounts.',
      'A deck has $52! \\approx 8 \\times 10^{67}$ orders. A random-number generator with a 32-bit state can reach at most $2^{32} \\approx 4.3 \\times 10^9$ of them; that is fine for a game, and not for gambling, which uses generators with far larger states.',
    ],
    equations: [
      {
        label: 'Fisher–Yates is uniform',
        latex: 'P(\\text{order}) = \\prod_{k=2}^{n} \\frac{1}{k} = \\frac{1}{n!}',
      },
      {
        label: 'Three cards, naively',
        latex: '3^3 = 27,\\quad 27 / 6 = 4.5',
      },
      {
        label: 'Orders of a deck',
        latex: '52! \\approx 8.07 \\times 10^{67}',
      },
    ],
    callouts: [],
    visualizations: [],
  },

  rigor: {
    prose: [
      'Invariant of Fisher–Yates: after the step for place i, places i to n − 1 hold a uniformly random arrangement of a uniformly random subset of the cards, and places 0 to i − 1 the rest, in any order. At i = 0 the whole deck is uniform.',
      'A test of uniformity counts each order over many shuffles; with N trials and m orders each count has standard deviation about √(N/m · (1 − 1/m)), 61 for 27,000 shuffles of three, so a count 250 away from 4,500 is four standard deviations off: a real bias, not luck.',
      'Where it goes: 10.3 draws the cards as SVG; 10.4 scores them.',
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [
    {
      id: 'mg10-002-ex1',
      title: "A card's value",
      difficulty: 'easy',
      problem: "What is value({ rank: 12, suit: 'S' })?",
      steps: [
        {
          expression: '\\min(12, 10) = 10',
          annotation: 'A queen counts 10.',
          strategyTitle: 'Step 1: cap at 10',
        },
      ],
      answer: '10.',
    },
    {
      id: 'mg10-002-ex2',
      title: 'One Fisher–Yates step',
      difficulty: 'medium',
      problem: 'Deck [A, B, C, D]. At i = 3 the random draw gives j = 1. What is the deck after the swap?',
      steps: [
        {
          expression: '\\text{swap}(3, 1)',
          annotation: 'deck[3] and deck[1] change places.',
          strategyTitle: 'Step 1: swap',
        },
      ],
      answer: '[A, D, C, B]; place 3 now holds B and is never touched again.',
    },
    {
      id: 'mg10-002-ex3',
      title: 'The naive bias',
      difficulty: 'hard',
      problem: 'With the naive shuffle of three cards, what fraction of runs give the most likely orders?',
      steps: [
        {
          expression: '27 = 3 \\times 5 + 3 \\times 4',
          annotation: 'Three orders get 5 paths, three get 4.',
          strategyTitle: 'Step 1: count paths',
        },
      ],
      answer: '5/27 ≈ 0.185 each, against 4/27 ≈ 0.148: about 11,100 against 8,900 in 60,000 (cell 3).',
    },
  ],

  challenges: [
    {
      id: 'mg10-002-ch1',
      title: 'The top of the deck',
      difficulty: 'easy',
      problem: 'Why does dealing use deck.pop()?',
      hint: 'What does pop take?',
      answer: 'It takes the last element, which plays the part of the top card; it is also fast, as nothing else moves.',
      walkthrough: [],
    },
    {
      id: 'mg10-002-ch2',
      title: 'A seeded deal',
      difficulty: 'medium',
      problem: 'Why seed the shuffle during training?',
      hint: 'Repeat and compare.',
      answer: 'So a run can be repeated exactly, and two players can be compared on the same deals, removing the luck of the cards from the comparison.',
      walkthrough: [],
    },
    {
      id: 'mg10-002-ch3',
      title: 'Sorting by suit',
      difficulty: 'hard',
      problem: 'Sort a hand by suit, then by rank within a suit.',
      hint: 'A comparison that looks at suit first.',
      answer: 'hand.sort((a, b) => SUITS.indexOf(a.suit) − SUITS.indexOf(b.suit) || a.rank − b.rank).',
      walkthrough: [],
    },
  ],

  semantics: {
    core: [
      {
        symbol: '{ rank, suit }',
        meaning: 'A card: rank 1 to 13, suit S H D C.',
      },
      {
        symbol: 'value(card)',
        meaning: 'What it counts: min(rank, 10).',
      },
      {
        symbol: 'newDeck()',
        meaning: 'The 52 cards, in order.',
      },
      {
        symbol: 'shuffle(deck)',
        meaning: 'Fisher–Yates, in place.',
      },
      {
        symbol: 'deck.pop()',
        meaning: 'Deal the top card.',
      },
    ],
    rulesOfThumb: [
      'Model things as data before drawing them.',
      'Shuffle with Fisher–Yates, never a random sort.',
      'Seed randomness when you need to repeat it.',
    ],
  },

  misconceptions: [
    {
      falseBelief: 'Any shuffle that swaps randomly is fair.',
      whyStudentsThinkIt: 'Each swap is random.',
      correctionExample: 'The naive shuffle favours some orders: 11,169 against 8,826 (cell 3).',
      contrastCase: 'Fisher–Yates gives each order 1/n!.',
    },
    {
      falseBelief: 'Dealing one at a time is fairer than dealing six at once.',
      whyStudentsThinkIt: 'It is the rule.',
      correctionExample: 'After a fair shuffle any fixed way of dealing gives random hands.',
      contrastCase: 'It matters with a badly shuffled deck, which is why the rule exists.',
    },
  ],

  transferPrompts: [
    {
      situation: "Spawning enemies from a bag so each type comes up once per round (Tetris's 7-bag).",
      competingTechniques: [
        'Pick a random type each time',
        'Shuffle the bag with Fisher–Yates and take in order',
      ],
      whyThisTechniqueWins: 'Each round has each type exactly once, in a fair order.',
    },
    {
      situation: 'Testing card rules.',
      competingTechniques: [
        'Test through the running game',
        'Make hands from text and call the functions',
      ],
      whyThisTechniqueWins: 'Plain data and functions can be tested directly.',
    },
  ],

  debugging: [
    {
      commonError: 'j chosen from 0 to n − 1 in every step.',
      symptom: 'Some orders more common (the uniformity check fails).',
      whyItHappened: 'That is the naive shuffle.',
      repairStrategy: 'Choose j from 0 to i.',
    },
    {
      commonError: 'Comparing cards with ===.',
      symptom: 'A card "is not in" a hand that holds it.',
      whyItHappened: 'Two objects with the same rank and suit are different objects.',
      repairStrategy: 'Compare rank and suit (sameCard).',
    },
  ],

  mastery: {
    targetLevel: 3,
    solveIndependently: 'Write the deck and a fair shuffle.',
    explainVerbally: 'Explain why Fisher–Yates is uniform and the naive shuffle is not.',
    detectIncorrectApplication: 'Spot a biased shuffle from its counts.',
    transferToUnfamiliar: 'Use a shuffled bag for any random sequence.',
  },

  assessment: {
    questions: [
      {
        id: 'mg10-002-assess-1',
        type: 'choice',
        text: 'In Fisher–Yates, at step i, j is chosen from',
        options: ['0 to i', '0 to n − 1', 'i to n − 1', '1 to i'],
        answer: '0 to i',
        hint: 'The places not yet fixed.',
      },
    ],
  },

  quiz: [
    {
      id: 'mg10-002-quiz-1',
      type: 'choice',
      text: "A king's value in cribbage is",
      options: ['10', '13', '12', '1'],
      answer: '10',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg10-002-quiz-2',
      type: 'choice',
      text: 'Three cards shuffled naively make how many equally likely swap paths?',
      options: ['27', '6', '9', '3'],
      answer: '27',
      hints: ['The mistake paragraph.'],
      reviewSection: 'Intuition — the mistake',
    },
    {
      id: 'mg10-002-quiz-3',
      type: 'choice',
      text: "In cell 3 the fair shuffle's counts are",
      options: [
        'All close to 10,000',
        'Two groups, near 8,900 and 11,100',
        'All exactly 10,000',
        'One order every time',
      ],
      answer: 'All close to 10,000',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg10-002-quiz-4',
      type: 'choice',
      text: 'Training seeds Math.random so that',
      options: [
        'A run can be repeated exactly',
        'Shuffles are fairer',
        'The AI cheats',
        'The game runs faster',
      ],
      answer: 'A run can be repeated exactly',
      hints: ['Randomness you can replay.'],
      reviewSection: 'Intuition — randomness',
    },
    {
      id: 'mg10-002-quiz-5',
      type: 'choice',
      text: 'After the deal the deck holds',
      options: ['40', '46', '42', '36'],
      answer: '40',
      hints: ['Cell 4.'],
      reviewSection: 'Cell 4',
    },
    {
      id: 'mg10-002-quiz-6',
      type: 'choice',
      text: 'A card in the game is',
      options: [
        'A plain object { rank, suit }',
        'A sprite',
        'A picture file',
        'A number from 0 to 51 only',
      ],
      answer: 'A plain object { rank, suit }',
      hints: ['Data first.'],
      reviewSection: 'Intuition — data first',
    },
  ],

  checkpoints: [
    {
      id: 'cp-mg10-002-1',
      label: 'Read cards as data and the deck',
      type: 'read',
    },
    {
      id: 'cp-mg10-002-2',
      label: 'Read the fair shuffle and the mistake',
      type: 'read',
    },
    {
      id: 'cp-mg10-002-3',
      label: 'Run the notebook: two shuffles measured',
      type: 'read',
    },
    {
      id: 'cp-mg10-002-4',
      label: 'Complete "Cards as data" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg10-002-5',
      label: 'Read seeded randomness and the deal',
      type: 'read',
    },
    {
      id: 'cp-mg10-002-6',
      label: 'Work through the Fisher–Yates step',
      type: 'example',
    },
    {
      id: 'cp-mg10-002-7',
      label: 'Work through the naive bias',
      type: 'example',
    },
    {
      id: 'cp-mg10-002-8',
      label: 'Pass the shuffle challenge',
      type: 'challenge',
    },
  ],

  chapter: 'making-games-10',
}
