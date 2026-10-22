// "Design it yourself" for the parsing and inference lessons (Specialist, parsing group). Format:
// designs.js. Lessons with a live table ask for one of its cells (a T/F cell is typed as T or F); earley
// and inside-outside (no table) ask a second hand-solved case. Every number was printed by
// specialist-oracles.js or the trace before it was typed.

export const PARSE_DESIGNS = {
  'cyk': {
    problem: 'Decide whether a grammar in Chomsky normal form derives a string of up to 80 letters, where trying every derivation is hopeless.',
    tryFirst: {
      prompt: 'Grammar S → AB, A → a, B → b. Does S derive "ab"?',
      kind: 'yesno', args: [[['S', 'AB'], ['A', 'a'], ['B', 'b']], 'ab'], answer: true,
      misconceptions: [{ answer: false, feedback: 'S → AB with A → a on the left letter and B → b on the right one derives exactly "ab".' }],
      explain: 'Split "ab" into a | b: A derives a and B derives b, so S → AB derives ab.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'For a piece s[i:j] and a nonterminal X: whether X derives that piece', right: true, why: 'A rule X → YZ only needs to know which nonterminals derive its two parts.' },
        { text: 'For a piece s[i:j]: whether S derives it', why: 'S’s rules are built from other nonterminals, so their pieces are needed too.' },
        { text: 'For a prefix s[0:j]: which nonterminals derive it', why: 'A rule’s right part can start anywhere, not only at 0; pieces need both ends.' },
      ] },
      { kind: 'split', ask: 'What is the last choice for X over s[i:j]?', options: [
        { text: 'The rule X → YZ at the top and the split point k', right: true, why: 'In Chomsky normal form a piece longer than one letter splits into exactly two parts.' },
        { text: 'Which letter of the piece X derives first', why: 'In a derivation the letters come from a tree; the choice that splits the problem is the top rule and its split.' },
      ] },
      { kind: 'recurrence', ask: 'When does X derive s[i:j], for j − i ≥ 2?', options: [
        { text: 'When some rule X → YZ and some k have Y deriving s[i:k] and Z deriving s[k:j]', right: true, why: 'Those are exactly the trees with X → YZ at the top.' },
        { text: 'When some rule X → YZ has Y deriving s[i:j − 1] and Z the last letter', why: 'Only one split is tried; Y and Z may meet anywhere inside the piece.' },
        { text: 'When some k has some nonterminals deriving s[i:k] and s[k:j]', why: 'They must be the Y and Z of a rule for X, in that order.' },
      ] },
      { kind: 'base', ask: 'What holds for one letter?', options: [
        { text: 'X derives s[i:i + 1] when there is a rule X → that letter', right: true, why: 'In Chomsky normal form that is the only way to make one letter.' },
        { text: 'Every nonterminal derives every letter', why: 'Only rules X → a make letters; the rest of the table would be wrong from the start.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells filled?', options: [
        { text: 'By piece length, shortest first', right: true, why: 'A piece reads its two parts, both shorter.' },
        { text: 'By start i, left to right', why: 'X(0, j) reads X(k, j) for k > 0, which would not be filled yet.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'Whether S derives the whole string, s[0:n]', right: true, why: 'The question is whether the start symbol makes all of s.' },
        { text: 'Whether any nonterminal derives the whole string', why: 'Only S is the start symbol; another nonterminal deriving s doesn’t put s in the language.' },
      ] },
    ],
    apply: { cell: [11, 2], misconceptions: [
      { answer: false, feedback: 'B → CC with C deriving the a at 1 and the a at 2: B(1,3) is T.' },
    ] },
  },

  'weighted-parsing': {
    problem: 'Count the parse trees of a string of up to 100 letters under an ambiguous grammar, modulo 1 000 000 007; the trees can be astronomically many.',
    tryFirst: {
      prompt: 'Grammar S → SS | a. How many parse trees does "aaa" have?',
      args: [[['S', 'SS'], ['S', 'a']], 'aaa'], answer: 2,
      misconceptions: [
        { answer: 1, feedback: 'The top S → SS can split aaa as a | aa or as aa | a: two different trees.' },
        { answer: 3, feedback: 'Each split gives one tree here: a | aa and aa | a. 3 would be a third split, which three letters don’t have.' },
      ],
      explain: 'Split as a | aa (and aa has one tree) or as aa | a: 1 + 1 = 2 trees.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'N(X, i, j): how many parse trees of s[i:j] have X at the root', right: true, why: 'The CYK table with counts instead of yes or no.' },
        { text: 'Whether X derives s[i:j], plus a running count of trees found so far', why: 'One global count can’t tell how many trees each part has, which is what the products need.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'The top rule X → YZ and the split k', right: true, why: 'Different top rules or splits give different trees.' },
        { text: 'The order in which the rules are applied', why: 'Many orders build the same tree; counting orders counts derivations, not trees.' },
      ] },
      { kind: 'recurrence', ask: 'How is N(X, i, j) found?', options: [
        { text: 'Σ over rules X → YZ and splits k of N(Y, i, k) · N(Z, k, j)', right: true, why: 'Every left tree pairs with every right tree; different rules and splits add.' },
        { text: 'Σ over rules X → YZ and splits k of N(Y, i, k) + N(Z, k, j)', why: 'Adding counts the parts separately; a tree needs one of each.' },
        { text: 'The largest N(Y, i, k) · N(Z, k, j) over the rules and splits', why: 'That keeps one split’s trees; the count needs all of them.' },
      ] },
      { kind: 'base', ask: 'What holds for one letter?', options: [
        { text: 'N(X, i, i + 1) is the number of rules X → that letter', right: true, why: 'Each such rule is one tree.' },
        { text: 'N(X, i, i + 1) = 1 for every X', why: 'X needs a rule making that letter; otherwise it has no tree.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells filled?', options: [
        { text: 'By piece length, shortest first', right: true, why: 'Each count reads its two shorter parts.' },
        { text: 'Longest first', why: 'The whole string would need its parts before they are counted.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'N(S, 0, n)', right: true, why: 'The trees of the whole string with S at the root.' },
        { text: 'The sum of N(X, 0, n) over every nonterminal X', why: 'Only trees rooted at S are parse trees of the language.' },
      ] },
    ],
    apply: { cell: [0, 3], misconceptions: [
      { answer: 8, feedback: '8 adds the parts’ counts at each split: (1 + 2) + (1 + 1) + (2 + 1). Multiply them instead: 1·2 + 1·1 + 2·1 = 5.' },
      { answer: 3, feedback: '3 is the number of splits. Each split has as many trees as its two parts’ counts multiplied.' },
    ] },
  },

  'earley': {
    problem: 'Decide whether any context-free grammar, with empty and left-recursive rules, derives a string of up to 200 letters.',
    tryFirst: {
      prompt: 'Grammar S → aSb | ε (the empty string). Does S derive "aabb"?',
      kind: 'yesno', args: [[['S', 'aSb'], ['S', '']], 'aabb'], answer: true,
      misconceptions: [{ answer: false, feedback: 'S → aSb → aaSbb → aabb, using S → ε at the centre.' }],
      explain: 'S → aSb twice and then S → ε: S ⇒ aSb ⇒ aaSbb ⇒ aabb.',
    },
    steps: [
      { kind: 'state', ask: 'What does an item hold?', options: [
        { text: 'A rule, how much of its right side is matched (the dot), and the position where the match started', right: true, why: 'That is everything needed to continue the rule or to finish it and return to whoever was waiting.' },
        { text: 'A rule and the dot, without the start position', why: 'When the rule finishes, its start says which items were waiting for it; without it the wrong items move on.' },
        { text: 'A nonterminal and the position it would start at', why: 'Without the rule and the dot, a half-matched rule can’t be continued.' },
      ] },
      { kind: 'split', ask: 'What can happen to an item at position i?', options: [
        { text: 'Predict a nonterminal it expects, scan a letter it expects, or complete if it is finished', right: true, why: 'Those three steps cover every way a rule makes progress.' },
        { text: 'Only scan letters, as in reading the string', why: 'Without predict and complete, rules for nonterminals are never started or finished.' },
      ] },
      { kind: 'recurrence', ask: 'What does completing X, started at j and finished at i, do?', options: [
        { text: 'Moves every item at position j that expected X past it, into position i', right: true, why: 'Those items were waiting for an X starting at j, which now runs to i.' },
        { text: 'Moves every item at position i that expects X past it', why: 'An item at i would need an X starting at i, not one that started at j.' },
      ] },
      { kind: 'base', ask: 'What starts the chart?', options: [
        { text: 'At position 0, every rule for S with nothing matched', right: true, why: 'Any derivation of s starts with a rule for S at 0.' },
        { text: 'Nothing: items appear as letters are scanned', why: 'Scanning only moves existing items; with none to start, the chart stays empty and nothing is accepted.' },
      ] },
      { kind: 'order', ask: 'How are empty rules handled?', options: [
        { text: 'An item expecting a nonterminal that can derive "" also moves its dot past it at once', right: true, why: 'Completing an empty rule finds only the items already there; later ones would miss it.' },
        { text: 'Nothing special: complete handles them like other rules', why: 'An empty rule completes at once, before items added later at the same position that expect it.' },
      ] },
      { kind: 'answer', ask: 'When is s accepted?', options: [
        { text: 'When a rule for S, started at 0, is finished at position n', right: true, why: 'Then S derives all of s, from 0 to n.' },
        { text: 'When any finished item is at position n', why: 'It may be another nonterminal, or start later than 0.' },
      ] },
    ],
    apply: {
      prompt: 'Grammar S → AB, A → a | ε, B → b | ε. Does S derive the empty string?',
      kind: 'yesno', args: [[['S', 'AB'], ['A', ''], ['A', 'a'], ['B', 'b'], ['B', '']], ''], answer: true,
      misconceptions: [{ answer: false, feedback: 'A and B can both be empty, so S → AB derives "".' }],
      explain: 'A → ε and B → ε, so S → AB derives the empty string. Earley finds it through the nullable step: the dot moves past A and B at once.',
    },
  },

  'inside-outside': {
    problem: 'For a grammar with rule chances, find the exact share of the parse trees’ chance in which a given nonterminal spans a given piece of the string.',
    tryFirst: {
      prompt: 'S → SS (50%) | a (50%). Among the parse trees of "aaa", what share of the chance has an S over the first two letters? Type a fraction.',
      args: [[['S', 'SS', 50], ['S', 'a', 50]], 'aaa', 'S', 0, 2], answer: 1 / 2,
      misconceptions: [{ answer: 1, feedback: 'Only the tree (aa)a has an S over the first two letters; a(aa) does not.' }],
      explain: 'There are two trees, (aa)a and a(aa), each using 2 SS rules and 3 a rules: equal chance. One of them has the S over [0, 2): 1/2.',
    },
    steps: [
      { kind: 'state', ask: 'What is computed for each X and piece [i, j)?', options: [
        { text: 'Inside: the chance of X deriving s[i:j]; outside: the chance of everything else around an X there', right: true, why: 'Every tree using X over [i, j) is one outside part and one inside part.' },
        { text: 'Only the inside chance', why: 'Inside says how X can derive the piece, not how likely the rest of the tree is to need it.' },
      ] },
      { kind: 'split', ask: 'How is a tree with X over [i, j) split?', options: [
        { text: 'Into X’s subtree and the rest of the tree with that subtree cut out', right: true, why: 'The two parts meet only at X over [i, j), so their chances multiply.' },
        { text: 'Into the trees for s[0:i], s[i:j] and s[j:n]', why: 'The rest of the tree need not split at i and j; its nodes can cover both sides.' },
      ] },
      { kind: 'recurrence', ask: 'What is passed to the left child B of X → BC over [a, k)?', options: [
        { text: 'X’s outside, times the rule’s chance, times the sibling C’s inside over [k, b)', right: true, why: 'B’s surroundings are X’s surroundings, the rule, and the sibling subtree.' },
        { text: 'X’s outside, times the rule’s chance, times B’s own inside', why: 'That counts B’s subtree in its own surroundings and leaves the sibling out.' },
        { text: 'X’s outside alone', why: 'The rule and the sibling are part of B’s surroundings too.' },
      ] },
      { kind: 'base', ask: 'Where does outside start?', options: [
        { text: 'Outside(S, 0, n) = 1', right: true, why: 'Nothing surrounds the whole tree.' },
        { text: 'Outside(X, i, i + 1) = 1 for every letter', why: 'The letters are the bottom of the tree; outside comes from the top.' },
      ] },
      { kind: 'order', ask: 'In what order is outside filled?', options: [
        { text: 'Longest pieces first, after the whole inside table', right: true, why: 'A piece’s outside comes from longer pieces and needs the siblings’ insides.' },
        { text: 'Shortest pieces first, like inside', why: 'A short piece’s surroundings are built from the longer pieces around it.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'Inside(X, i, j) · Outside(X, i, j) / Inside(S, 0, n)', right: true, why: 'The chance of the trees with X there, over the chance of all trees.' },
        { text: 'Inside(X, i, j) / Inside(S, 0, n)', why: 'That leaves out how likely the rest of the tree is to have an X there.' },
      ] },
    ],
    apply: {
      prompt: 'S → SS (30%) | a (70%). Among the trees of "aaaa", what share of the chance has an S over the middle two letters, [1, 3)?',
      args: [[['S', 'SS', 30], ['S', 'a', 70]], 'aaaa', 'S', 1, 3], answer: 2 / 5,
      misconceptions: [{ answer: 0.2, feedback: 'Two of the five trees, not one, have the middle pair as a node: a((aa)a) and (a(aa))a.' }],
      explain: 'All five trees of aaaa use 3 SS rules and 4 a rules, so they are equally likely. Two of them, a((aa)a) and (a(aa))a, have S over [1, 3): 2/5.',
    },
  },

  'viterbi': {
    problem: 'Find the cheapest hidden path through a model with costs for starting, moving and seeing, over up to 1000 observations: 3¹⁰⁰⁰ paths.',
    tryFirst: {
      prompt: 'Two states. Start costs 1 and 2; moving 0→1 or 1→0 costs 1, staying costs 0; state 0 sees 0 for 0 and 1 for 4, state 1 the other way round. Observations 0, 1, 0: the least cost?',
      args: [[1, 2], [[0, 1], [1, 0]], [[0, 4], [4, 0]], [0, 1, 0]], answer: 3,
      misconceptions: [{ answer: 5, feedback: '5 stays in state 0 and pays 4 to see the 1. Moving to state 1 and back costs only 2 in moves.' }],
      explain: 'Path 0, 1, 0: start 1, see 0 for 0, move 1, see 1 for 0, move 1, see 0 for 0: 3.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'V(t, s): the least cost of a path through time t that ends in state s', right: true, why: 'The future only depends on the current state, so the best way to reach it is all that matters.' },
        { text: 'V(t): the least cost of any path through time t', why: 'The next step’s cost depends on which state the path ends in.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'The state r the path was in at time t − 1', right: true, why: 'Each r gives a cheapest path to r, then the move r → s.' },
        { text: 'The state with the cheapest cost to see obs[t]', why: 'Seeing is only part of the cost; moving there may cost more.' },
      ] },
      { kind: 'recurrence', ask: 'How is V(t, s) found?', options: [
        { text: 'min over r of V(t − 1, r) + trans[r][s], plus emit[s][obs[t]]', right: true, why: 'The cheapest way into s, then the cost of what s sees.' },
        { text: 'min over r of V(t − 1, r) + trans[s][r], plus emit[s][obs[t]]', why: 'trans[s][r] is moving from s to r, the wrong direction.' },
        { text: 'The sum over r of V(t − 1, r) + trans[r][s], plus emit[s][obs[t]]', why: 'Adding over paths gives a total, not the cheapest one.' },
      ] },
      { kind: 'base', ask: 'What holds at time 0?', options: [
        { text: 'V(0, s) = start[s] + emit[s][obs[0]]', right: true, why: 'Start in s and see the first observation.' },
        { text: 'V(0, s) = start[s]', why: 'The first observation is seen at time 0 too, and costs something.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells filled?', options: [
        { text: 'Time by time, t = 0, 1, …', right: true, why: 'Each column reads only the column before it.' },
        { text: 'State by state, all times for state 0 first', why: 'V(t, 0) reads V(t − 1, 1), which would not be filled yet.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The least V(T − 1, s) over the states s', right: true, why: 'The path may end in any state.' },
        { text: 'V(T − 1, 0)', why: 'The cheapest path need not end in state 0.' },
      ] },
    ],
    apply: { cell: [1, 3], misconceptions: [
      { answer: 3, feedback: '3 is the cheapest way into state 1. State 1 then sees a 0, which costs 3 more.' },
    ] },
  },

  'forward-backward': {
    problem: 'For a hidden Markov model with whole-number weights, find the exact share of all paths’ weight held by paths in a given state at a given time.',
    tryFirst: {
      prompt: 'Weights: start 1 and 1; staying 2, moving 1; state 0 sees 0 with weight 3 and 1 with weight 1, state 1 the other way. Observations 0, 1: what share is in state 0 at time 0? Type a fraction.',
      args: [[1, 1], [[2, 1], [1, 2]], [[3, 1], [1, 3]], [0, 1], 0, 0], answer: 15 / 22,
      misconceptions: [{ answer: 0.5, feedback: 'The states start equally weighted, but state 0 sees the 0 with weight 3 against 1.' }],
      explain: 'Paths 00: 1·3·2·1 = 6, 01: 1·3·1·3 = 9, 10: 1·1·1·1 = 1, 11: 1·1·2·3 = 6. Those in state 0 at time 0 weigh 15 of 22.',
    },
    steps: [
      { kind: 'state', ask: 'What is computed?', options: [
        { text: 'α(t, x): the weight of the paths up to t ending in x; β(t, x): the weight of what follows x at t', right: true, why: 'A path through x at t is a front part and a back part; their weights multiply.' },
        { text: 'Only α(t, x)', why: 'α covers the observations up to t; the later ones also change which states are likely.' },
        { text: 'The single best path, as in Viterbi', why: 'The share needs the weight of all paths through x, not the best one.' },
      ] },
      { kind: 'split', ask: 'How is a path through x at time t split?', options: [
        { text: 'Into its part up to t and its part after t', right: true, why: 'They meet only at x at time t.' },
        { text: 'Into its first state and the rest', why: 'That splits at time 0, not at t.' },
      ] },
      { kind: 'recurrence', ask: 'How is β(u, x) found?', options: [
        { text: 'Σ over y of trans[x][y] · emit[y][obs[u + 1]] · β(u + 1, y)', right: true, why: 'Move to y, y sees the next observation, then everything after.' },
        { text: 'Σ over y of trans[x][y] · emit[y][obs[u]] · β(u + 1, y)', why: 'obs[u] is already seen by x at time u, inside α.' },
        { text: 'Σ over y of α(u + 1, y)', why: 'α counts what came before, not what follows x.' },
      ] },
      { kind: 'base', ask: 'What are the base cases?', options: [
        { text: 'α(0, x) = start[x] · emit[x][obs[0]] and β(T − 1, x) = 1', right: true, why: 'Start in x and see the first observation; nothing follows the last time.' },
        { text: 'α(0, x) = start[x] and β(T − 1, x) = 1', why: 'The first observation must be seen too, with its weight.' },
      ] },
      { kind: 'order', ask: 'In what order are the tables filled?', options: [
        { text: 'α forwards in time, β backwards', right: true, why: 'α reads the time before, β the time after.' },
        { text: 'Both forwards in time', why: 'β(u, x) needs β(u + 1, …), which would not be filled yet.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'α(t, s) · β(t, s) / Σ over x of α(T − 1, x)', right: true, why: 'The weight of the paths through s at t, over the weight of all paths.' },
        { text: 'α(t, s) / Σ over x of α(t, x)', why: 'That ignores the observations after t.' },
      ] },
    ],
    apply: { cell: [3, 1], misconceptions: [
      { answer: 4, feedback: '4 leaves out the move weights: 1·1·β(2,0) + 3·β(2,1). Moving 1 → 1 weighs 2: 1·1·1 + 2·3·1 = 7.' },
    ] },
  },

  'belief-propagation': {
    problem: 'Sum the weights of all assignments of values to the nodes of a tree with node and edge weights, modulo 1 000 000 007, for trees of up to 10 000 nodes.',
    tryFirst: {
      prompt: 'The path 0 – 1 – 2, three values each, all node weights 1, and an edge weighing 1 when its ends differ and 0 when they are equal. What is the total weight?',
      args: [3, [[1, 1, 1], [1, 1, 1], [1, 1, 1]], [[0, 1], [1, 2]], [[0, 1, 1], [1, 0, 1], [1, 1, 0]]], answer: 12,
      misconceptions: [{ answer: 27, feedback: '27 counts every assignment. Those with equal neighbours weigh 0: only proper colourings count.' }],
      explain: 'Node 0 has 3 values, node 1 then 2, node 2 then 2: 3 · 2 · 2 = 12 assignments of weight 1.',
    },
    steps: [
      { kind: 'state', ask: 'What does a message hold?', options: [
        { text: 'For each value x of the parent, the total weight of the child’s subtree', right: true, why: 'The subtree meets the rest of the tree only through that edge, so this is all the parent needs.' },
        { text: 'The child’s best value', why: 'A sum needs every value, weighted; one value loses the others.' },
        { text: 'The total weight of the child’s subtree, one number', why: 'The edge weight depends on the parent’s value, so one number per parent value is needed.' },
      ] },
      { kind: 'split', ask: 'What is summed out when a node v sends its message?', options: [
        { text: 'v’s own value y', right: true, why: 'Once the parent’s value is fixed, v’s value is the last free choice in its subtree.' },
        { text: 'The parent’s value x', why: 'x stays free: the message has one entry per x.' },
      ] },
      { kind: 'recurrence', ask: 'What is the message from v for parent value x?', options: [
        { text: 'Σ over y of pair[x][y] · unary[v][y] · the product of v’s children’s messages at y', right: true, why: 'The edge, v’s own weight, and its independent subtrees, for each value of v.' },
        { text: 'Σ over y of unary[v][y] · the product of v’s children’s messages at y', why: 'The edge weight to the parent is left out.' },
        { text: 'Σ over y of pair[x][y] · unary[v][y] · the sum of v’s children’s messages at y', why: 'Separate subtrees combine by multiplying: every choice in one goes with every choice in another.' },
      ] },
      { kind: 'base', ask: 'What does a leaf send?', options: [
        { text: 'Σ over y of pair[x][y] · unary[leaf][y]', right: true, why: 'A leaf has no children: the product of their messages is 1.' },
        { text: '1 for every x', why: 'The leaf’s own weights and the edge are still there.' },
      ] },
      { kind: 'order', ask: 'In what order are messages sent?', options: [
        { text: 'Leaves first: a node after all of its children', right: true, why: 'A message needs the messages of the node’s children.' },
        { text: 'From the root down', why: 'A node would send before hearing from its children, leaving their subtrees out.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'Σ over the root’s values of its weight times its children’s messages', right: true, why: 'At the root every subtree is included.' },
        { text: 'The largest entry of the root’s messages', why: 'The total weight sums over every value; a maximum is the max-product version.' },
      ] },
    ],
    apply: { cell: [2, 0], misconceptions: [
      { answer: 95, feedback: '95 leaves out the edge weights. For parent value 0: 2·1·m2(0)·m3(0) + 1·2·m2(1)·m3(1) = 30 + 80 = 110.' },
    ] },
  },

  'rna-folding': {
    problem: 'Find the most non-crossing base pairs in an RNA string of up to 120 letters, with at least three bases between the two ends of a pair.',
    tryFirst: {
      prompt: 'GGGAAAUCC. Pairs A–U, G–C and G–U, three bases at least between the ends of a pair, no crossing. How many pairs at most?',
      args: ['GGGAAAUCC'], answer: 3,
      misconceptions: [{ answer: 2, feedback: '2 leaves out the G–U pair. G at 2 and U at 6 have three bases between them, inside the two G–C pairs.' }],
      explain: 'G0–C8, G1–C7 and G2–U6, nested one inside the other: 3 pairs.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'D(i, j): the most pairs in the piece s[i:j]', right: true, why: 'A pair splits the string into pieces that don’t interact, because pairs can’t cross.' },
        { text: 'D(j): the most pairs in the prefix s[0:j]', why: 'Pairing the last base with k leaves an inside piece s[k + 1:j − 1] that is not a prefix.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'Whether the last base is unpaired, or which k it pairs with', right: true, why: 'Each choice leaves independent smaller pieces.' },
        { text: 'Which pair is the outermost', why: 'Several outermost pairs can sit side by side; the last base is a single, clear choice.' },
      ] },
      { kind: 'recurrence', ask: 'How is D(i, j) found?', options: [
        { text: 'max(D(i, j − 1), max over allowed k of D(i, k) + 1 + D(k + 1, j − 1))', right: true, why: 'The pair k–(j − 1) splits off the inside and the part before k.' },
        { text: 'max(D(i, j − 1), max over allowed k of 1 + D(k + 1, j − 1))', why: 'The bases before k can still pair among themselves.' },
        { text: 'max(D(i, j − 1), max over allowed k of D(i, k) + 1 + D(k, j))', why: 'D(k, j) contains k and j − 1 again, so a base would pair twice.' },
      ] },
      { kind: 'base', ask: 'What are the base cases?', options: [
        { text: 'Pieces shorter than 5 have no pair: D = 0', right: true, why: 'A pair needs its two ends plus three bases between.' },
        { text: 'Pieces of length 2 with a matching pair have D = 1', why: 'Two bases next to each other have no bases between; the minimum loop forbids that pair.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells filled?', options: [
        { text: 'By piece length, shortest first', right: true, why: 'Every cell read is a shorter piece.' },
        { text: 'By start i, left to right', why: 'D(i, j) reads D(k + 1, j − 1) with k ≥ i, which would not be filled yet.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(0, n)', right: true, why: 'The whole string, from its first base to its last.' },
        { text: 'D(0, n − 1)', why: 'That leaves out the last base, which may pair: GGAAACC needs its last C.' },
      ] },
    ],
    apply: { cell: [0, 7], misconceptions: [
      { answer: 1, feedback: '1 leaves the last C unpaired. Pairing it with G0 adds 1 to D(1, 6) = 1: 2.' },
    ] },
  },
}
