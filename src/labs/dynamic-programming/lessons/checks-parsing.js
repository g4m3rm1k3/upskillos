// "Check yourself" for the parsing and inference lessons (Specialist, parsing group). Format and checks:
// checks.js and checks.test.js; the numbers come from specialist-oracles.js.
const DYCK = [['S', 'SS'], ['S', 'AB'], ['S', 'AT'], ['T', 'SB'], ['A', 'a'], ['B', 'b']]
const EXPR = [['S', 'E'], ['E', 'E+T'], ['E', 'T'], ['T', 'T*F'], ['T', 'F'], ['F', '(E)'], ['F', 'a']]

export const PARSE_CHECKS = {
  'cyk': [
    {
      know: 'S → SS | AB | AT, T → SB, A → a, B → b derives the strings where a opens and b closes, balanced.',
      ask: 'Does this grammar derive "aabbab"?',
      kind: 'yesno', args: [DYCK, 'aabbab'], answer: true,
      misconceptions: [{ answer: false, feedback: 'aabb is S → AT with T → SB around the inner ab, and the last ab is S → AB; S → SS joins them.' }],
      explain: 'Split aabbab as aabb | ab: S → SS, with aabb from S → AT (T → SB over abb) and ab from S → AB.',
    },
    {
      know: 'The table has a cell for every piece s[i:j] and nonterminal, and each cell tries every split and rule.',
      ask: 'About how much work does CYK take for a string of n letters and r rules?',
      options: [
        { text: 'About n³ · r steps', right: true, why: 'About n² / 2 pieces, n splits each, and r rules at each split.' },
        { text: 'About n · r steps', why: 'Every piece of the string must be looked at, not just every letter.' },
        { text: 'Exponential in n', why: 'That is trying every derivation; the table shares the pieces.' },
      ],
    },
    {
      know: 'CYK needs every rule to be X → YZ or X → a.',
      ask: 'Why does Chomsky normal form matter?',
      options: [
        { text: 'Every piece longer than one letter then splits into exactly two parts at one point', right: true, why: 'So each cell needs only the rules and one split point; longer right sides would need more split points.' },
        { text: 'It makes the grammar unambiguous', why: 'A grammar in this form can still be ambiguous; S → SS | a is.' },
        { text: 'Only grammars in this form can be parsed', why: 'Earley parses any context-free grammar; CYK just needs this shape.' },
      ],
    },
  ],

  'weighted-parsing': [
    {
      know: 'N(X, i, j) adds N(Y, i, k) · N(Z, k, j) over rules X → YZ and splits k.',
      ask: 'Under the balanced-string grammar S → SS | AB | AT, T → SB, A → a, B → b, how many parse trees does "ababab" have?',
      args: [DYCK, 'ababab'], answer: 2,
      misconceptions: [{ answer: 1, feedback: 'Three ab blocks can be joined as (ab ab) ab or ab (ab ab): S → SS splits them in two ways.' }],
      explain: 'Each ab has one tree. Joining three with S → SS can split them as ab | abab or abab | ab, and each four-letter part has one tree: 2.',
    },
    {
      know: 'The same table can count trees, add chances, or keep the best score, by changing two operations.',
      ask: 'To find the most probable parse instead of the count, what changes?',
      options: [
        { text: 'Multiply chances instead of counts, and take the maximum instead of adding', right: true, why: 'Parts still combine by multiplying; alternatives compete instead of adding up.' },
        { text: 'Nothing: the largest count is the most probable parse', why: 'Counts ignore the rules’ chances; a rare rule used many ways can win the count.' },
        { text: 'Add chances instead of multiplying', why: 'A tree’s chance is the product of its rules’ chances.' },
      ],
    },
    {
      know: 'The grammar S → SS | a gives the string aⁿ many parse trees.',
      ask: 'How do the counts for aⁿ grow under S → SS | a?',
      options: [
        { text: 'Like the Catalan numbers: 1, 1, 2, 5, 14, …', right: true, why: 'A tree for n letters is a binary tree with n leaves, counted by the Catalan number Cₙ₋₁.' },
        { text: 'Like 2ⁿ', why: 'For four letters there are 5 trees, not 16 or 8.' },
        { text: 'Linearly, one more tree per letter', why: 'Each split multiplies the two parts’ counts, so the counts grow much faster.' },
      ],
    },
  ],

  'earley': [
    {
      know: 'E → E + T | T, T → T * F | F, F → (E) | a, with S → E: arithmetic expressions over a.',
      ask: 'Does the grammar derive "(a)*a"?',
      kind: 'yesno', args: [EXPR, '(a)*a'], answer: true,
      misconceptions: [{ answer: false, feedback: '(a) is an F through F → (E), and T → T * F joins it with the last a.' }],
      explain: 'F → (E) makes (a); T → T * F with T → F over (a) and F → a over the last a; then E → T and S → E.',
    },
    {
      know: 'E → E + T is left-recursive: E appears first on its own right side.',
      ask: 'Why does Earley handle left recursion, when a naive recursive-descent parser loops?',
      options: [
        { text: 'Predicting E at position i adds each rule for E only once, as a set item, so it doesn’t call itself forever', right: true, why: 'Items are deduplicated per position; the recursion becomes a finite set.' },
        { text: 'Earley rewrites the grammar to remove left recursion first', why: 'It uses the grammar as given; the chart makes that safe.' },
        { text: 'Because it reads the string from right to left', why: 'It reads left to right; the item sets are what stop the loop.' },
      ],
    },
    {
      know: 'Each position’s chart holds items (rule, dot, start), with no duplicates.',
      ask: 'About how many items can one position hold, for a string of n letters?',
      options: [
        { text: 'About (number of rule positions) · n, one per dotted rule and start', right: true, why: 'The start can be any earlier position; the rest is the grammar.' },
        { text: 'About 2ⁿ', why: 'Items record only a rule, a dot and a start: polynomially many.' },
        { text: 'One per rule', why: 'The same dotted rule can be in progress from many different starts.' },
      ],
    },
  ],

  'inside-outside': [
    {
      know: 'The share of trees with X over [i, j) is Inside · Outside / Inside(S, 0, n).',
      ask: 'S → SS (50%) | a (50%). Among the trees of "aaa", what share has an S over the middle letter alone, [1, 2)? Type a fraction.',
      args: [[['S', 'SS', 50], ['S', 'a', 50]], 'aaa', 'S', 1, 2], answer: 1,
      misconceptions: [{ answer: 0.5, feedback: 'Every tree has each letter as a leaf under S → a, so the middle letter is always an S.' }],
      explain: 'In a grammar in Chomsky normal form every letter is a leaf X → a; here only S makes a, so every tree has S over [1, 2): 1.',
    },
    {
      know: 'Inside sums over the subtrees of X over [i, j); outside sums over everything around it.',
      ask: 'Why do inside and outside multiply to give the trees through X over [i, j)?',
      options: [
        { text: 'Any subtree fits into any surrounding at that X, and a tree’s chance is the product of its rules', right: true, why: 'So the sum over all pairs is the product of the two sums.' },
        { text: 'Because the grammar is unambiguous', why: 'It holds for ambiguous grammars too; that is when it is most useful.' },
        { text: 'Because outside already includes inside', why: 'Outside leaves X’s subtree out; that is why it is multiplied by inside.' },
      ],
    },
    {
      know: 'The outside chance of a child needs its sibling’s inside chance.',
      ask: 'Why must the inside table be finished before outside starts?',
      options: [
        { text: 'Passing outside down to one child multiplies by the other child’s inside, of any length', right: true, why: 'Siblings can be any shorter piece, so all insides must be known.' },
        { text: 'It needn’t: both can be filled together, shortest first', why: 'Outside flows from long pieces to short ones, the opposite order to inside.' },
        { text: 'Because outside is inside run backwards over the string', why: 'Outside runs from long pieces to short ones, not right to left.' },
      ],
    },
  ],

  'viterbi': [
    {
      know: 'V(t, s) = min over r of V(t − 1, r) + trans[r][s], plus emit[s][obs[t]].',
      ask: 'Start costs 1 and 2; moving between the states costs 5, staying 0; state 0 sees 0 for 0 and 1 for 4, state 1 the other way. Observations 0, 1, 0: the least cost?',
      args: [[1, 2], [[0, 5], [5, 0]], [[0, 4], [4, 0]], [0, 1, 0]], answer: 5,
      misconceptions: [{ answer: 1, feedback: '1 picks the cheapest state at each time on its own and ignores the moves: going 0, 1, 0 costs 10 in moves.' }],
      explain: 'Staying in state 0: start 1, see 0, 0, see 1, 4, see 0, 0: 5. Switching to 1 and back costs 1 + 5 + 5 = 11.',
    },
    {
      know: 'Costs are −log probabilities, rounded to whole numbers.',
      ask: 'Why add costs instead of multiplying probabilities?',
      options: [
        { text: 'Logs turn products into sums, and avoid tiny numbers that underflow', right: true, why: 'A long path’s probability can be smaller than the smallest float; its cost is just a larger number.' },
        { text: 'Adding gives a different, better path', why: 'The cheapest path is exactly the most probable one; only the arithmetic changes.' },
        { text: 'Because the probabilities are whole numbers', why: 'Probabilities are at most 1; the costs are what is rounded to whole numbers here.' },
      ],
    },
    {
      know: 'Each time step takes the minimum over the previous states for each state.',
      ask: 'About how much work does Viterbi take for T observations and k states?',
      options: [
        { text: 'About T · k² steps', right: true, why: 'Each of T · k cells looks at k previous states.' },
        { text: 'About k^T steps', why: 'That is one per path; the table keeps only the best path into each state.' },
        { text: 'About T · k steps', why: 'Each cell compares k predecessors, not one.' },
      ],
    },
  ],

  'forward-backward': [
    {
      know: 'The share is α(t, s) · β(t, s) over the total weight of all paths.',
      ask: 'Weights: start 1 and 0; moving 0→0 and 0→1 weigh 1, 1→1 weighs 1, 1→0 weighs 0; state 0 sees 0 with 1 and 1 with 2, state 1 the other way. Observations 1, 1, 0: what share is in state 1 at time 2? Type a fraction.',
      args: [[1, 0], [[1, 1], [0, 1]], [[1, 2], [2, 1]], [1, 1, 0], 2, 1], answer: 3 / 4,
      misconceptions: [{ answer: 0.5, feedback: 'Paths ending in state 1 see the last 0 with weight 2, and there are more of them.' }],
      explain: 'Paths start in 0 and can only move 0 → 1. Ending in 0 (000): weight 2·2·1 = 4. Ending in 1 (001, 011): 2·2·2 + 2·1·2 = 12. Share 12 / 16 = 3/4.',
    },
    {
      know: 'Viterbi keeps the best path into each state; forward keeps the total.',
      ask: 'How do α and Viterbi’s V differ?',
      options: [
        { text: 'α adds over the paths into a state; V keeps the best one', right: true, why: 'Same table, same order: sum-product against max-product (or min-sum in costs).' },
        { text: 'α runs backwards in time', why: 'α runs forwards like V; β is the one that runs backwards.' },
        { text: 'They are the same', why: 'The total weight of many paths is not the weight of the best one.' },
      ],
    },
    {
      know: 'α covers the observations up to t, β those after t.',
      ask: 'Why is β needed, when α already ends at time t?',
      options: [
        { text: 'Later observations change which state was likely at t', right: true, why: 'A state that fits the past badly may fit what comes next well; β brings that in.' },
        { text: 'To check that α is right', why: 'β adds information α doesn’t have, the later observations.' },
        { text: 'Only for the last time step', why: 'At the last time β is 1; it matters at every earlier time.' },
      ],
    },
  ],

  'belief-propagation': [
    {
      know: 'Messages go from the leaves up; each is Σ over the node’s values of edge weight · node weight · children’s messages.',
      ask: 'Two values; node 0 weighs 1 and 2, node 1 weighs 3 and 1, node 2 weighs 1 and 1; edges 0–1 and 0–2 weigh 2 when both ends are 0, 3 when both are 1, 1 otherwise. What is the total weight?',
      args: [2, [[1, 2], [3, 1], [1, 1]], [[0, 1], [0, 2]], [[2, 1], [1, 3]]], answer: 69,
      misconceptions: [{ answer: 24, feedback: '24 multiplies the node weights’ sums and leaves out the edges.' }],
      explain: 'Node 1 sends (2·3 + 1·1, 1·3 + 3·1) = (7, 6); node 2 sends (2 + 1, 1 + 3) = (3, 4). Root: 1·7·3 + 2·6·4 = 21 + 48 = 69.',
    },
    {
      know: 'A tree has exactly one path between any two nodes.',
      ask: 'Why are the messages exact on a tree?',
      options: [
        { text: 'Removing an edge splits the tree in two, so a subtree reaches the rest only through its root', right: true, why: 'Its total weight given the parent’s value is all the rest needs, and nothing is counted twice.' },
        { text: 'Because every node has at most two neighbours', why: 'Nodes can have any number of neighbours; it is the lack of cycles that matters.' },
        { text: 'They are only approximate on trees', why: 'On trees they are exact; on graphs with cycles the same rule is an approximation.' },
      ],
    },
    {
      know: 'Each node sends one message of k entries, each summing over k values.',
      ask: 'About how much work does it take for n nodes and k values?',
      options: [
        { text: 'About n · k² steps', right: true, why: 'n − 1 messages, each with k entries of k terms.' },
        { text: 'About kⁿ steps', why: 'That is listing every assignment; the messages avoid it.' },
        { text: 'About n² · k steps', why: 'Each node sends one message, to its parent only.' },
      ],
    },
  ],

  'rna-folding': [
    {
      know: 'D(i, j) = max(D(i, j − 1), max over k of D(i, k) + 1 + D(k + 1, j − 1)), with three bases at least between a pair.',
      ask: 'What is the most pairs in AUAUAUAU?',
      args: ['AUAUAUAU'], answer: 2,
      misconceptions: [{ answer: 4, feedback: '4 pairs each A with the U next to it, with no bases between. A pair needs three bases between its ends.' }],
      explain: 'A0–U7 and U1–A6 nest, each with at least three bases between its ends. Inside them A2 … U5 holds no more pairs (A2–U5 has only two bases between): 2.',
    },
    {
      know: 'Pairs may not cross: no i < k < j < l with pairs i–j and k–l.',
      ask: 'Why does forbidding crossings make an interval table possible?',
      options: [
        { text: 'A pair splits the string into an inside and an outside that no other pair joins', right: true, why: 'So each piece can be solved on its own and the results added.' },
        { text: 'Because crossings are rare in real RNA', why: 'The table is exact for its model; rarity is why the model is useful, not why the table works.' },
        { text: 'It doesn’t: crossings are handled by the same table', why: 'Crossing pairs (pseudoknots) join pieces the table treats as independent.' },
      ],
    },
    {
      know: 'Each cell tries every partner k for the last base of its piece.',
      ask: 'About how much work does the table take for n bases?',
      options: [
        { text: 'About n³ steps', right: true, why: 'About n² / 2 pieces, each trying up to n partners.' },
        { text: 'About n² steps', why: 'Each piece tries many partners, not one.' },
        { text: 'About 2ⁿ steps', why: 'That is listing sets of pairs; the table shares the pieces.' },
      ],
    },
  ],
}
