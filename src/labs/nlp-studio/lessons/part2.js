// Part 2: a sentence's structure. A grammar, a recursive-descent parser, ambiguity and the
// Catalan numbers, the CKY chart parser, dependency trees, and Bot 1 (ELIZA-style rules).
// Numbers come from the engine (engine/parsing.js, engine/eliza.js), which parity2.test.js holds
// to the real Python; lessons.test.js checks them all.
import * as P from '../engine/parsing.js'
import { respondTrace, reflect } from '../engine/eliza.js'

const cases = (fn, inputs) => inputs.map(args => ({ args, expected: fn(...args) }))
const size = pos => P.LEXICON[pos].length
const T1 = P.parse('i saw the man with the telescope')
const PARK = 'i saw the man in the park with the telescope'
const THREE = 'alice saw bob with a dog in the park on the hill'

export const PART2 = {
  id: 'part2', title: 'Part 2 · A sentence’s structure', lessons: [
    {
      id: 'grammar', number: '2.1', title: 'A grammar: rules that make sentences',
      goal: 'Read a grammar’s rules, use them to build a sentence and its tree, and count how many sentences a pattern of rules can make.',
      builds: ['split-by-hand'],
      blocks: [
        { h: 'Why structure matters' },
        { md: `"The dog chased the cat" and "the cat chased the dog" have exactly the same words, so their word counts from lesson 1.5 are identical. The meaning is opposite. What changed is the **structure**: which words group together, and which group does what to which.

Finding that structure is called **parsing**. It answers "who did what to whom". A search engine uses it to tell "flights from Paris" from "flights to Paris"; a voice assistant to know what "it" refers to; and, as you will see at the end of this part, a chatbot that skips it says things that are grammatically wrong.

The first tool is a **grammar**: a short list of rules that says how sentences are put together.` },

        { h: 'Rules that rewrite' },
        { md: `A grammar's rules look like this:

$$\\text{S} \\rightarrow \\text{NP}\\ \\text{VP}$$

Read the arrow as "can be made of". A sentence (S) can be made of a **noun phrase** (NP, a group that names something: "the dog", "she") followed by a **verb phrase** (VP, what it does: "chased a cat", "slept").

- The capitalised names are **symbols** (also called *non-terminals*): categories that still have to be filled in.
- The words are **terminals**: once a word is there, it stays.
- The categories of single words (Det for a determiner like "the", N for a noun, V for a verb, P for a preposition like "with") are **parts of speech**. The **lexicon** lists the words each one can be.

Here is this lab's whole grammar, as Python data. A dictionary maps each symbol to its list of rules; each rule is a list of the symbols it is made of.` },
        {
          code: {
            file: 'parsing.py', assign: 'GRAMMAR', notes: [
              ['"S": [["NP", "VP"]]', ['One rule for a sentence: a noun phrase, then a verb phrase.']],
              ['"NP": [["Det", "N"]', ['Four ways to make a noun phrase: "the dog"; "the dog with a cat" (a noun with a **prepositional phrase**, PP, after it); a pronoun, "she"; a name, "alice".']],
              ['"VP": [["V", "NP"]', ['Three ways to make a verb phrase: "chased a cat"; "saw the man with the telescope" (a PP describing the seeing); or a verb alone, "slept".']],
              ['"PP": [["P", "NP"]]', ['A prepositional phrase: a preposition and a noun phrase, "with the telescope".']],
            ],
          },
        },
        {
          code: {
            file: 'parsing.py', assign: 'LEXICON', notes: [
              ['"Det": {"the", "a"}', ['Each part of speech maps to a **set** of words. Lower case only: the parser lower-cases the sentence first.']],
            ],
          },
        },
        { md: `To make a sentence, start from S and keep replacing the **leftmost** symbol with one of its rules, until only words are left. Each replacement is one step of a **derivation**, and the record of which rule replaced which symbol is a **tree**: the rule's symbols hang under the symbol they replaced.

Try it. Choose a rule for each symbol as it comes up.` },
        { figure: 'DeriveSentence', caption: 'A derivation, one rewrite at a time (left), and the tree it builds (right). Choosing NP → Det N PP makes the sentence longer, and the PP needs another NP: the grammar refers to itself, so it can make sentences of any length.' },
        { md: `The rule PP → P NP contains an NP, and one of the NP rules contains a PP. A grammar whose rules can lead back to themselves is **recursive**, and that is how a handful of rules describes infinitely many sentences: "the dog with a cat in the park on the hill…".

The same idea, as code: to generate a random sentence, a function that generates a symbol calls itself on the parts of a rule.` },
        {
          code: {
            file: 'parsing.py', fn: 'generate', notes: [
              ['if symbol in LEXICON:', ['A part of speech: pick one of its words, and stop. This is the **base case**, the case that doesn\'t call the function again. Every recursive function needs one, or it never ends.']],
              ['rng.choice(sorted(LEXICON[symbol]))', ['`rng` is a random-number generator (`random.Random(seed)`); `choice` picks one item from a list. A set has no fixed order, so it is sorted first; with the same seed you then always get the same sentence.']],
              ['rule = rng.choice(GRAMMAR[symbol])', ['Otherwise pick one of the symbol\'s rules at random.']],
              ['words.extend(generate(part, rng))', ['**The recursive call**: generate each part of the rule, left to right, and add its words to the list. `extend` adds every item of a list, where `append` would add the list as one item.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'What is the **fewest** words a sentence from this grammar can have?',
            compute: () => P.minWords('S'), answer: 2,
            explain: 'S → NP VP, with NP → Pronoun (one word) and VP → V (one word): "she slept". **2** words. Every other choice adds words.',
            misconceptions: [{ answer: 4, feedback: 'That is "the dog chased …"? Look for the shortest rule of each symbol: an NP can be a single pronoun, and a VP a single verb.' }],
          },
        },

        { h: 'Counting the sentences of one shape' },
        { md: `How many different sentences have the shape "Det N V Det N", like "the dog chased a cat"? This is the **multiplication principle** of counting: when you make a series of independent choices, the number of outcomes is the product of the number of options at each choice. The grammar is the plan, the lexicon gives the options.` },
        {
          derive: {
            title: 'How many sentences have the shape Det N V Det N?',
            intro: `The lexicon has ${size('Det')} determiners, ${size('N')} nouns and ${size('V')} verbs.`,
            steps: [
              { prompt: 'How many different noun phrases of the form Det N are there?', number: size('Det') * size('N'), compute: () => size('Det') * size('N'), why: `${size('Det')} choices for the determiner, and for each of them ${size('N')} for the noun: ${size('Det')} × ${size('N')}.` },
              { prompt: 'How many verb phrases of the form V NP, with that kind of NP?', number: size('V') * size('Det') * size('N'), compute: () => size('V') * size('Det') * size('N'), why: `${size('V')} verbs × ${size('Det') * size('N')} noun phrases.` },
              { prompt: 'How many sentences S → NP VP of this shape?', number: (size('Det') * size('N')) ** 2 * size('V'), compute: () => (size('Det') * size('N')) ** 2 * size('V'), why: 'Subject noun phrases × verb phrases.' },
              { prompt: 'In general, with $d$ determiners, $m$ nouns and $v$ verbs, how many? Write a formula in $d$, $m$ and $v$.', answer: 'v*d^2*m^2', vars: { d: [1, 6], m: [1, 12], v: [1, 9] }, why: '$(d \\cdot m) \\cdot (v \\cdot d \\cdot m) = v\\,d^2 m^2$. Add one noun and the count grows with the *square* of the nouns: combinations grow much faster than vocabularies.' },
            ],
            result: 'Five slots give hundreds of sentences from a lexicon of a dozen words. Real grammars, with tens of thousands of words and recursive rules, describe more sentences than anyone could ever write: no list of sentences could replace the rules.',
          },
        },

        { h: 'A tree as data' },
        { md: `In code, a tree is a pair: \`(label, children)\` for a phrase, where \`children\` is a list of trees, and \`(part of speech, word)\` for a word. So "she slept" is

\`\`\`python
("S", [("NP", [("Pronoun", "she")]), ("VP", [("V", "slept")])])
\`\`\`

A function on a tree is almost always recursive, shaped like the tree itself: a word is the base case, and a phrase does the same thing to each child and combines the results.` },
        {
          code: {
            file: 'parsing.py', fn: 'leaves', notes: [
              ['label, rest = tree', ['**Unpacking**: a pair is split into its two parts in one line.']],
              ['if isinstance(rest, str):', ['A word: its second part is a string. `isinstance(x, str)` asks "is x a string?". The base case.']],
              ['words.extend(leaves(child))', ['A phrase: collect the words of each child, in order. The recursion follows the tree down to every word.']],
            ],
          },
        },
        {
          write: {
            file: 'parsing.py', fn: 'leaves',
            prompt: 'Write `leaves(tree)`: the words of a tree, left to right. (The checks pass trees as lists, `[label, children]`; your code works the same on lists and tuples.)',
            starter: 'def leaves(tree):\n    label, rest = tree\n    # a word: its second part is a string\n    # a phrase: the leaves of each child, in order\n    pass\n',
            cases: cases(P.leaves, [[['Pronoun', 'she']], [P.parse('she slept')[0]], [P.parse('the dog chased a cat')[0]], [T1[0]]]),
            hint: 'Two cases. `if isinstance(rest, str): return [rest]`. Otherwise loop over `rest` and `extend` a list with `leaves(child)`.',
          },
        },
      ],
    },

    {
      id: 'recursive-descent', number: '2.2', title: 'A parser by hand: recursive descent',
      goal: 'Follow a recursive-descent parser as it tries every rule, and write the half of it that matches a sequence of symbols.',
      builds: ['grammar'],
      blocks: [
        { h: 'Parsing is generating, backwards' },
        { md: `Generating goes from S to words. **Parsing** goes the other way: given the words, find the rule choices that would have generated them. The simplest way is to try them, the way you would by hand:

> To find an S at the start of the words, try S's rule, NP VP: find an NP at the start, and for each way of finding one, find a VP right after it.

That sentence is the whole algorithm, called **recursive descent**: one function asks "where can this symbol match, starting at position i?", and answers it by asking the same question about the parts of each rule. It returns **every** answer, as a list of pairs \`(tree, j)\`: a tree for the symbol, and the position j just after the words it covered.` },
        {
          code: {
            file: 'parsing.py', fn: 'parse_symbol', notes: [
              ['if symbol in LEXICON:', ['A part of speech can only match one word: the word at position `i`, if it is in the lexicon for that symbol.']],
              ['return [((symbol, words[i]), i + 1)]', ['One answer: the tree `(symbol, word)`, and the next position, `i + 1`.']],
              ['return []', ['No match: an empty list of answers. "No answers" is a normal result, not an error; the caller just moves on.']],
              ['for rule in GRAMMAR[symbol]:', ['A phrase: try **every** rule. A parser that stopped at the first rule that worked would miss other readings.']],
              ['for children, j in parse_sequence(rule, words, i):', ['Every way the rule\'s symbols, one after another, can match from `i`.']],
              ['results.append(((symbol, children), j))', ['Each one is an answer for `symbol`: the children hang under it.']],
            ],
          },
        },
        {
          code: {
            file: 'parsing.py', fn: 'parse_sequence', notes: [
              ['if not symbols:', ['No symbols left to match: one answer, with no trees, ending where it started. This base case is what lets the recursion stop.']],
              ['for first, j in parse_symbol(symbols[0], words, i):', ['Every way the **first** symbol matches from `i`, each ending at some `j`…']],
              ['for rest, k in parse_sequence(symbols[1:], words, j):', ['…and for each of those, every way **the rest** of the symbols match from `j`. `symbols[1:]` is the list without its first item: the recursion makes the list shorter each time.']],
              ['results.append(([first] + rest, k))', ['Join them: the first tree, then the rest\'s trees.']],
            ],
          },
        },
        {
          code: {
            file: 'parsing.py', fn: 'parse', notes: [
              ['if j == len(words)', ['Keep only the S answers that use **all** the words. "i saw the man" is an S inside "i saw the man with the telescope", but not a parse of it.']],
            ],
          },
        },
        { python: { program: 'parse', label: 'Watch the calls stack up in real Python' } },
        { md: `The two functions call each other: \`parse_symbol\` asks \`parse_sequence\` about a rule's symbols, which asks \`parse_symbol\` about each one. That is called **mutual recursion**. It ends because every call either moves forward in the words or has fewer symbols left.` },
        {
          predict: {
            prompt: 'How many answers does `parse_symbol("NP", ["the", "dog", "with", "a", "cat"], 0)` return?',
            compute: () => P.parseSymbol('NP', ['the', 'dog', 'with', 'a', 'cat'], 0).length, answer: 2,
            explain: 'NP → Det N matches "the dog" (ending at 2). NP → Det N PP matches "the dog with a cat" (ending at 5). The pronoun and name rules match nothing. **2** answers, of different lengths: the caller decides which one fits what comes next.',
            misconceptions: [{ answer: 1, feedback: 'The NP rules are all tried. Which of them can match from position 0, and where does each one end?' }],
          },
        },
        { figure: 'ParseExplorer', props: { sentence: 'the dog chased a cat' }, caption: 'Type a sentence from the lexicon’s words. The parser shows every tree it finds, and how many times parse_symbol was called to find them.' },
        { md: `Under each drawn tree is the same tree on one line, in **bracket notation**: each phrase is \`(label children…)\`. It is how parsed sentences are stored in text files, and another small recursive function.` },
        {
          code: {
            file: 'parsing.py', fn: 'bracket', notes: [
              ['return "(" + label + " " + rest + ")"', ['A word: `(Det the)`.']],
              ['" ".join(bracket(child) for child in rest)', ['A phrase: bracket every child (the recursion), join them with spaces, and wrap them with the label.']],
            ],
          },
        },
        {
          write: {
            file: 'parsing.py', fn: 'parse_sequence', given: ['parse_symbol'], constants: ['GRAMMAR', 'LEXICON'],
            prompt: 'Write `parse_sequence(symbols, words, i)`. `parse_symbol` is already written, and it calls your function for each rule, so if yours is right, whole sentences parse.',
            starter: 'def parse_sequence(symbols, words, i):\n    if not symbols:\n        return [([], i)]\n    results = []\n    # every way the first symbol matches, then every way the rest match after it\n    return results\n',
            cases: cases(P.parseSequence, [[['Det', 'N'], ['the', 'dog'], 0], [['NP', 'VP'], ['i', 'slept'], 0], [['P', 'NP'], ['with', 'the', 'dog'], 0], [['Det', 'N'], ['dog'], 0], [['NP'], ['the', 'dog', 'with', 'a', 'cat'], 0]]),
            hint: 'Two nested loops: `for first, j in parse_symbol(symbols[0], words, i):` and inside it `for rest, k in parse_sequence(symbols[1:], words, j):`, appending `([first] + rest, k)`.',
          },
        },
      ],
    },

    {
      id: 'ambiguity', number: '2.3', title: 'Ambiguity: one sentence, many trees',
      goal: 'Find the two readings of "I saw the man with the telescope", see how readings multiply, and derive the Catalan numbers that count them.',
      builds: ['recursive-descent'],
      blocks: [
        { h: 'Who has the telescope?' },
        { md: `"I saw the man with the telescope." Did you use a telescope to see him, or did you see a man who was holding one? The words don't say. Both readings are grammatical, and they have **different trees**: the phrase "with the telescope" attaches to a different part of the sentence.` },
        { figure: 'ParseExplorer', props: { sentence: 'i saw the man with the telescope' }, caption: 'The parser finds both readings, because it tries every rule. Tree 1 groups “the man with the telescope” as one noun phrase (he has it). Tree 2 attaches the PP to the verb phrase (the seeing was done with it).' },
        { md: `This is **PP attachment**, the most common kind of ambiguity in English, and it gets worse fast. Each extra prepositional phrase can attach to any noun or verb before it that is still "open". Change the sentence above to "i saw the man in the park with the telescope" and count the trees.` },
        {
          predict: {
            prompt: `How many trees does this lab's recursive-descent parser find for **"${PARK}"**?`,
            compute: () => P.parse(PARK).length, answer: 3,
            explain: `**3**: the man is in a park that has a telescope; or the seeing happened in a park that has a telescope; or "the man in the park" is seen through the telescope. Other readings exist ("the man in the park", and he holds the telescope), but this grammar can't make them: it has no rule NP → NP PP. Lesson 2.4 explains why this parser can't have that rule, and finds the missing readings.`,
            misconceptions: [{ answer: 2, feedback: 'With two prepositional phrases there are more places to attach them. Type the sentence into the figure above.' }],
          },
        },

        { h: 'How fast readings multiply: the Catalan numbers' },
        { md: `Take the simplest version of the problem: $n$ things in a row, and every way of grouping them two at a time into a binary tree. For three things \`a b c\` there are two: \`((a b) c)\` and \`(a (b c))\`. For four there are five. These counts are the **Catalan numbers**, $C_0, C_1, C_2, \\dots$, where $C_m$ counts the binary trees over $m + 1$ things.

They obey a rule you can work out yourself. A binary tree over $m+1$ things has a top split: some things go left and the rest go right. If the left part has $i + 1$ things, it can be any of $C_i$ trees, and the right part, with $m - i$ things, any of $C_{m-1-i}$. By the multiplication principle that is $C_i \\cdot C_{m-1-i}$ trees for that split; add up all the splits:

$$C_0 = 1, \\qquad C_m = \\sum_{i=0}^{m-1} C_i \\, C_{m-1-i}$$` },
        { figure: 'Bracketings', caption: 'Every way to group the items two at a time. Count them, and check the recurrence.' },
        {
          derive: {
            title: 'The Catalan numbers from the recurrence',
            intro: 'Use $C_0 = 1$ and $C_m = \\sum_{i=0}^{m-1} C_i C_{m-1-i}$.',
            steps: [
              { prompt: '$C_1 = C_0 C_0$. What is it?', number: P.catalan(1), compute: () => P.catalan(1), why: '$1 \\cdot 1 = 1$: two things can only be grouped one way.' },
              { prompt: '$C_2 = C_0 C_1 + C_1 C_0$. What is it?', number: P.catalan(2), compute: () => P.catalan(2), why: '$1 + 1 = 2$: `((a b) c)` and `(a (b c))`.' },
              { prompt: '$C_3 = C_0 C_2 + C_1 C_1 + C_2 C_0$. What is it?', number: P.catalan(3), compute: () => P.catalan(3), why: '$2 + 1 + 2 = 5$. The figure lists all five for 4 items.' },
              { prompt: 'And $C_4$?', number: P.catalan(4), compute: () => P.catalan(4), why: '$C_0C_3 + C_1C_2 + C_2C_1 + C_3C_0 = 5 + 2 + 2 + 5 = 14$.', hint: 'Four products: $C_0C_3$, $C_1C_2$, $C_2C_1$, $C_3C_0$.' },
              { prompt: 'Roughly how much bigger does each Catalan number get? Compute $C_9 / C_8$ (use the code below, or the recurrence).', number: P.catalan(9) / P.catalan(8), compute: () => P.catalan(9) / P.catalan(8), tolerance: 0.01, why: `$C_9 = ${P.catalan(9)}$ and $C_8 = ${P.catalan(8)}$: the ratio is about 3.4, and it keeps climbing towards 4. The number of groupings roughly **quadruples** with every extra item.` },
            ],
            result: 'The Catalan numbers grow like $4^m$: exponentially. A sentence with ten prepositional phrases can have thousands of readings. A parser that tries them one by one, like recursive descent, does exponential work; the next lesson shows how to avoid it.',
          },
        },
        {
          code: {
            file: 'parsing.py', fn: 'catalan', notes: [
              ['c = [1]', ['$C_0 = 1$. The list `c` holds every Catalan number computed so far.']],
              ['for m in range(1, n + 1):', ['Compute $C_1, C_2, \\dots, C_n$ in order: each one needs only the earlier ones. Computing small answers first and reusing them is **dynamic programming**, and it is the idea behind lesson 2.4.']],
              ['c.append(sum(c[i] * c[m - 1 - i] for i in range(m)))', ['The recurrence, as written: the sum over $i$ from 0 to $m - 1$ of $C_i \\cdot C_{m-1-i}$.']],
            ],
          },
        },
        {
          write: {
            file: 'parsing.py', fn: 'catalan',
            prompt: 'Write `catalan(n)` from the recurrence, without recursion: build the list from $C_0$ up.',
            starter: 'def catalan(n):\n    c = [1]\n    # compute C_1 ... C_n from the earlier values\n    return c[n]\n',
            cases: cases(P.catalan, [[0], [1], [2], [3], [4], [7], [10]]),
            hint: '`for m in range(1, n + 1): c.append(sum(c[i] * c[m - 1 - i] for i in range(m)))`',
          },
        },
        { note: 'People rarely notice ambiguity, because they pick the reading that makes sense. A parser has no sense of meaning, so it can only list the readings. Choosing between them needs knowledge of how words are used, and that is what the learning methods from Part 3 on provide: a statistical parser scores each tree by how likely it is.', kind: 'key' },
      ],
    },

    {
      id: 'chart-parser', number: '2.4', title: 'The chart parser: watch the table fill',
      goal: 'Fill a CKY chart by hand, count trees by multiplying, and work out why the chart parser takes polynomial time where recursive descent can take exponential time.',
      builds: ['ambiguity'],
      blocks: [
        { h: 'The same question, asked again and again' },
        { md: `Recursive descent repeats itself. Parsing "${PARK}", the question "is there an NP starting at word 2?" is asked by several different rules, and each time the work is done from scratch. Type it into the parser figure in lesson 2.2 and look at how often \`parse_symbol\` is called: ${P.parseCalls(PARK)} times, for ${P.wordsOf(PARK).length} words.

It also has a blind spot. The rule NP → NP PP ("[the man in the park] [with the telescope]") would make \`parse_symbol("NP", …)\` call \`parse_symbol("NP", …)\` at the **same position** before reading a single word, and that call would do the same, forever. This is called **left recursion**, and recursive descent can't have it. That is why lesson 2.3's parser missed readings.

The **chart parser** (the CKY algorithm, after Cocke, Kasami and Younger) fixes both problems with one idea: answer every question exactly once, and keep the answers in a table.` },

        { h: 'A grammar in a fixed shape' },
        { md: `CKY needs the grammar in **Chomsky normal form**: every rule makes exactly two symbols, and every word is listed with the symbols it can be. Our grammar, converted:

- NP → Det N PP has three parts. It becomes NP → NP PP: first "the man" is an NP, then an NP followed by a PP is a bigger NP. This is the left-recursive rule recursive descent couldn't use, and CKY handles it with no trouble.
- VP → V NP PP becomes VP → VP PP in the same way.
- VP → V (one part) and NP → Pronoun can't stay either: instead the lexicon says directly that "slept" can be a VP and "she" an NP.

The converted grammar is not exactly the same as the original: with NP → NP PP and VP → VP PP, any number of PPs can attach anywhere they make a phrase. It allows **more** readings, which is what we wanted.` },
        {
          code: {
            file: 'parsing.py', assign: 'CNF_RULES', notes: [
              ['("S", "NP", "VP")', ['Each rule is a triple: (parent, left child, right child).']],
              ['("NP", "NP", "PP")', ['Left-recursive: an NP can begin with an NP. Fine for a chart, impossible for recursive descent.']],
            ],
          },
        },

        { h: 'The chart' },
        { md: `Number the gaps between words 0 to $n$: the span $(i, j)$ is the words from position $i$ up to $j$ (not including $j$, like a Python slice \`words[i:j]\`). The chart has one **cell** for every span, holding every symbol that can cover exactly those words, with **how many trees** it has for them.

- A one-word span $(i, i+1)$: look the word up in the lexicon.
- A longer span $(i, j)$: split it at every $k$ between $i$ and $j$. For each split, a left symbol in cell $(i, k)$ and a right symbol in cell $(k, j)$ can combine if some rule makes a parent from them.

Fill the cells from short spans to long ones, so the two halves of any split are always ready. The sentence parses if the top cell, $(0, n)$, contains S.` },
        {
          code: {
            file: 'parsing.py', fn: 'combine', notes: [
              ['for parent, l, r in CNF_RULES:', ['Try every rule against this one split.']],
              ['if l in left and r in right:', ['The rule fits if its left symbol is in the left cell and its right symbol in the right cell.']],
              ['left[l] * right[r]', [
                '**Trees multiply.** If the left half can be an NP in 2 ways and the right half a PP in 1 way, the parent NP has 2 × 1 = 2 trees over this split: each left tree can go with each right tree. The multiplication principle again.',
                '`out.get(parent, 0) + …`: two rules can make the same parent from one split; their trees add up.',
              ]],
            ],
          },
        },
        {
          code: {
            file: 'parsing.py', fn: 'cky', notes: [
              ['table = {}', ['The chart: a dictionary from a span `(i, j)` to its cell, `{symbol: number of trees}`.']],
              ['table[(i, i + 1)] = ', ['Each word\'s own cell: every symbol the lexicon gives it, with 1 tree. `CNF_LEXICON.get(word, set())` gives an empty set for an unknown word, so its cell is empty and nothing can be built over it.']],
              ['for length in range(2, n + 1):', ['Spans of 2 words, then 3, … up to the whole sentence. Short before long: that ordering is what makes every split\'s halves already filled.']],
              ['for i in range(n - length + 1):', ['Every starting position for a span of this length.']],
              ['for k in range(i + 1, j):', ['Every split point inside the span.']],
              ['for parent, trees in combine(', ['Combine the two halves, and add the trees into this cell.']],
              ['table[(i, j)] = cell', ['The cell is finished, and never computed again. Any later span that needs "an NP over words i to j" just looks it up.']],
            ],
          },
        },
        { python: { program: 'cky', label: 'Fill the chart in real Python' } },
        { figure: 'ChartPlayer', caption: 'Step through the chart. The blue cell is being filled; the two dashed cells are the halves of the current split. Each cell shows the symbols that cover its words; ×2 means two different trees.' },
        {
          predict: {
            prompt: `The chart parser on "${PARK}": how many sentence trees are in the top cell?`,
            compute: () => P.countTrees(P.wordsOf(PARK)), answer: 5,
            explain: `**5**, where recursive descent found 3. The two new ones need NP → NP PP or VP → VP PP: "[the man in the park] with the telescope" (he holds it), and "saw [the man] [in the park] [with the telescope]" with both PPs on the seeing. And 5 is $C_3$: with every attachment allowed, two PPs give the Catalan number for grouping 4 things.`,
            misconceptions: [{ answer: 3, feedback: 'That is what recursive descent found, without the rules NP → NP PP and VP → VP PP. Fill the chart in the figure and read the top cell.' }],
          },
        },
        {
          predict: {
            prompt: `And for "${THREE}", with **three** prepositional phrases?`,
            compute: () => P.countTrees(P.wordsOf(THREE)), answer: 14,
            explain: `**14** = $C_4$, the next Catalan number. The chart parser counts all of them without ever building one: the counts multiply and add inside the cells. Recursive descent would have to build each tree to count it.`,
          },
        },

        { h: 'How much work is it?' },
        {
          derive: {
            title: 'Counting the chart parser’s work',
            intro: 'The work is the number of (span, split) pairs: for each one, `combine` tries a fixed list of rules.',
            steps: [
              { prompt: 'How many cells does the chart have for $n$ words (one for every span $(i, j)$ with $0 \\le i < j \\le n$)? A formula in $n$.', answer: 'n*(n+1)/2', vars: { n: [1, 40] }, why: '$n$ spans of length 1, $n-1$ of length 2, …, 1 of length $n$: $n + (n-1) + \\dots + 1 = \\frac{n(n+1)}{2}$.', hint: 'Add up the number of spans of each length.' },
              { prompt: `For the ${P.wordsOf('i saw the man with the telescope').length}-word telescope sentence, how many cells is that?`, number: 28, compute: () => { const n = 7; return n * (n + 1) / 2 }, why: '$7 \\cdot 8 / 2 = 28$.' },
              { prompt: 'A span of length $L$ has $L - 1$ split points. Adding $(n - L + 1)(L - 1)$ over every length $L$ gives the total number of splits. It equals $\\binom{n+1}{3}$: write it as a formula in $n$.', answer: '(n+1)*n*(n-1)/6', vars: { n: [2, 40] }, why: 'Every split is a choice of three positions $i < k < j$ from the $n + 1$ gaps, and there are $\\binom{n+1}{3} = \\frac{(n+1)n(n-1)}{6}$ ways to choose 3 things from $n+1$.', hint: 'A split is three gap positions $i < k < j$. How many ways to choose 3 of the $n + 1$ gaps?' },
              { prompt: 'For the 7-word sentence, how many splits?', number: 56, compute: () => P.ckyTrace(P.wordsOf('i saw the man with the telescope')).steps.filter(s => s.phase === 'split').length, why: '$8 \\cdot 7 \\cdot 6 / 6 = 56$. This is the count of "split" steps in the chart player: check it.' },
            ],
            result: 'The chart parser’s work grows like $n^3$ (times the number of rules): **polynomial**. Double the sentence and the work goes up about 8 times, never exponentially, however ambiguous the sentence is. Storing answers instead of recomputing them is **dynamic programming**, the same trick as the Catalan list in lesson 2.3.',
          },
        },
        {
          write: {
            file: 'parsing.py', fn: 'combine', constants: ['CNF_RULES'],
            prompt: 'Write `combine(left, right)`: given two cells (dictionaries from symbol to number of trees), return the cell of everything the rules in `CNF_RULES` build from them, with the trees multiplied.',
            starter: 'def combine(left, right):\n    out = {}\n    # for each rule (parent, l, r): if l is in left and r is in right, add left[l] * right[r] trees to parent\n    return out\n',
            cases: cases(P.combine, [[{ Det: 1 }, { N: 1 }], [{ NP: 2 }, { PP: 1 }], [{ V: 1 }, { NP: 3 }], [{ NP: 1 }, { VP: 2 }], [{ N: 1 }, { Det: 1 }], [{ NP: 1, VP: 1 }, { PP: 2 }]]),
            hint: '`out[parent] = out.get(parent, 0) + left[l] * right[r]` inside `for parent, l, r in CNF_RULES:` and the `if`.',
          },
        },
      ],
    },

    {
      id: 'dependencies', number: '2.5', title: 'Dependency trees: who depends on whom',
      goal: 'Turn a phrase tree into a dependency tree, check whether a list of heads is a valid tree, and count how many head choices are.',
      builds: ['chart-parser'],
      blocks: [
        { h: 'Arrows between words' },
        { md: `The trees so far are **phrase-structure** trees: words grouped into phrases, phrases into bigger phrases. Most parsers in use today (spaCy's, for one) produce a different kind: a **dependency tree**. There are no phrases. Each word points to the one word it depends on, its **head**: "the" depends on "man", "man" depends on "saw", and the main verb depends on nothing: it hangs from the **root**.

As data, that is one number per word: \`heads[k]\` is the position (counting from 1) of word $k+1$'s head, and 0 means the root. "i saw the man" is \`[2, 0, 4, 2]\`: "i" → "saw", "saw" → root, "the" → "man", "man" → "saw".

The two kinds of tree carry much the same information. Every phrase has one child that carries its meaning, its **head child**: the noun of a noun phrase, the verb of a verb phrase. Make each phrase's other children point to its head, and the phrase tree becomes a dependency tree.` },
        {
          code: {
            file: 'parsing.py', assign: 'HEADS', notes: [
              ['"S": ["VP"]', ['Which child is the head, for each kind of phrase: a sentence is about its verb phrase, a noun phrase about its noun (or pronoun, or name), a verb phrase about its verb. (Universal Dependencies, the standard real parsers follow, makes the noun the head of a PP too; this lab keeps the preposition, which is simpler to follow.)']],
            ],
          },
        },
        {
          code: {
            file: 'parsing.py', fn: 'dependencies', notes: [
              ['heads = []', ['One entry per word, filled in as the walk reaches each word, left to right.']],
              ['def walk(node):', ['A function defined inside another: it can use `heads`. It returns the position of the node\'s **head word**.']],
              ['heads.append(0)', ['A word: add it, for now pointing at the root (0). Its own position is the list\'s new length.']],
              ['positions = [walk(child) for child in rest]', ['A phrase: walk each child first, getting each child\'s head word.']],
              ['main = next(p for p, l in zip(positions, labels) if l in HEADS[label])', ['Find the head child: the first child whose label is in `HEADS` for this phrase. `zip` pairs up two lists; `next(...)` takes the first item that passes the `if`.']],
              ['heads[p - 1] = main', ['Every other child\'s head word now depends on the phrase\'s head word.']],
              ['return main', ['The phrase\'s head word is its head child\'s. Only the very top word is never given a head: it stays 0, the root.']],
            ],
          },
        },
        { python: { program: 'dependencies', label: 'Step through dependencies() in real Python' } },
        { figure: 'DependencyArcs', caption: 'The two readings of the telescope sentence as dependency trees: in tree 1 “with” depends on “man”, in tree 2 on “saw”. Change heads with the menus to break the tree, and read why.' },

        { h: 'What makes a list of heads a tree' },
        { md: `Not every list of numbers is a tree. Two words can't both hang from the root; two words can't point at each other (a **cycle**: neither ever reaches the root). The rule: **exactly one word has head 0, and following the heads from any word reaches 0 without visiting a word twice.**` },
        {
          code: {
            file: 'parsing.py', fn: 'is_tree', notes: [
              ['if sum(1 for h in heads if h == 0) != 1:', ['Count the words that hang from the root: it must be exactly one.']],
              ['for start in range(1, n + 1):', ['Check every word in turn.']],
              ['while node != 0:', ['Climb from word to head until the root…']],
              ['if node in seen or not 1 <= node <= n:', ['…unless a word comes round a second time (a cycle: the climb would never end) or a head points outside the sentence. `1 <= node <= n` is Python\'s chained comparison: both at once.']],
            ],
          },
        },
        {
          write: {
            file: 'parsing.py', fn: 'is_tree',
            prompt: 'Write `is_tree(heads)`: `True` when exactly one word has head 0 and every word reaches 0 by following heads, without a loop.',
            starter: 'def is_tree(heads):\n    n = len(heads)\n    # exactly one root\n    # from every word, follow the heads to 0; a word seen twice means a loop\n    pass\n',
            cases: cases(P.isTree, [[[2, 0, 4, 2]], [[0, 1, 2]], [[0, 0]], [[2, 1]], [[2, 0, 5, 2, 3]], [[3, 0, 2, 2]], [[]], [[0, 9]]]),
            hint: 'For the climb: `seen = set()`, `node = start`, then `while node != 0:` check `node in seen or not 1 <= node <= n` (return False), `seen.add(node)`, `node = heads[node - 1]`.',
          },
        },
        {
          predict: {
            prompt: 'Draw `heads = [3, 0, 2, 2]` as arcs above four words. How many pairs of arcs **cross**? (`crossing_arcs` counts them.)',
            compute: () => P.crossingArcs([3, 0, 2, 2]), answer: 1,
            explain: 'The arcs join words (1, 3), (2, 3) and (2, 4). The arc from 1 to 3 and the arc from 2 to 4 cross: 1 < 2 < 3 < 4. **1** crossing. It is still a valid tree. A tree with crossing arcs is **non-projective**: it can\'t come from any phrase tree, because phrases never interleave. Some languages need them (for words far from their heads), and dependency parsers can produce them where phrase-structure parsers can\'t.',
            misconceptions: [{ answer: 0, feedback: 'Draw each arc as a curve over the words between its two ends. Which two have their ends interleaved?' }],
          },
        },
        {
          derive: {
            title: 'How many head lists are trees?',
            intro: 'Each of $n$ words picks a head: the root (0) or any of the other $n - 1$ words.',
            steps: [
              { prompt: 'How many lists of heads are there in all? A formula in $n$.', answer: 'n^n', vars: { n: [1, 8] }, why: 'Each word has $n$ choices (the root or one of the $n - 1$ others), and the choices are independent: $n \\cdot n \\cdots n = n^n$.' },
              { prompt: 'For 3 words, how many lists?', number: 27, compute: () => P.countHeadChoices(3).total, why: '$3^3 = 27$.' },
              { prompt: 'Of those, how many are valid trees? (The lab tried all 27 with `is_tree`.)', number: 9, compute: () => P.countHeadChoices(3).valid, why: 'Cayley’s formula says there are $n^{n-2}$ trees joining $n$ labelled points; any one of the $n$ words can be the one under the root, so $n \\cdot n^{n-2} = n^{n-1}$: $3^2 = 9$.' },
              { prompt: 'So what fraction of all head lists are trees, for $n$ words? A formula in $n$.', answer: '1/n', vars: { n: [1, 30] }, why: '$n^{n-1} / n^n = 1/n$. With 20 words only 1 list in 20 is a tree: a parser can’t just guess heads independently; the choices have to fit together.' },
            ],
            result: 'The lab’s tests check $n^{n-1}$ valid out of $n^n$ by trying every list for $n = 1$ to 5. A dependency parser has to find the one good tree among $n^{n-1}$, which is why real ones score arcs and search cleverly rather than trying them all.',
          },
        },
      ],
    },

    {
      id: 'eliza', number: '2.6', title: 'Bot 1: a chatbot made of rules',
      goal: 'Build an ELIZA-style chatbot from patterns and reflections, follow how each reply is made, and find exactly where rules without understanding go wrong.',
      builds: ['regex-tokenizer', 'dependencies'],
      blocks: [
        { h: 'ELIZA' },
        { md: `In 1966 Joseph Weizenbaum wrote ELIZA, a program that chatted like a therapist. Many people who used it were sure it understood them. It understood nothing: it matched what you typed against a list of patterns, turned your words around ("my" becomes "your"), and put them into a canned reply. Your first chatbot works the same way, and it is worth building because it shows exactly what the rest of this lab has to add.

It has three pieces: **reflections**, **rules**, and a function that tries the rules in order.` },
        {
          code: {
            file: 'eliza.py', assign: 'REFLECTIONS', notes: [
              ['"i": "you"', ['A dictionary from each first-person word to its second-person word, and back: what you say about yourself, the bot says about "you".']],
            ],
          },
        },
        {
          code: {
            file: 'eliza.py', fn: 'reflect', notes: [
              ['words = fragment.lower().split()', ['Split into words (lesson 1.2), in lower case so "My" is found as "my".']],
              ['REFLECTIONS.get(word, word)', [
                'The swapped word if there is one, otherwise the word itself: `.get` with a default, as in `count` (lesson 1.1).',
                '`" ".join(…)` puts the words back together with single spaces between them.',
              ]],
            ],
          },
        },
        {
          code: {
            file: 'eliza.py', assign: 'RULES', notes: [
              ['(r"i need (.*)"', [
                'Each rule is a regular expression (lesson 1.4) and a list of reply templates.',
                '`(.*)` is a **capturing group**: `.` is any character, `*` any number of them, and the brackets keep whatever matched. In "i need a holiday" it captures "a holiday".',
                '`{0}` in a template is where the captured text goes.',
              ]],
              ['(r"i(?: am|\'m) (.*)"', ['`(?: … )` groups without capturing, so that `|` (or) covers just " am" and "\'m".']],
              ['(r"(.*)", [', ['The last rule matches anything at all: the fallback, so there is always a reply.']],
            ],
          },
        },
        {
          code: {
            file: 'eliza.py', fn: 'respond', notes: [
              ['text = message.lower().strip().rstrip(".!")', ['Lower case, no spaces at the ends, no full stop or exclamation mark at the end: so "I need a holiday." and "i need a holiday" match the same rule.']],
              ['for pattern, replies in RULES:', ['Rules are tried **in order**: the first one that matches wins. So the specific rules come first and the catch-all last.']],
              ['re.fullmatch(pattern, text)', ['`fullmatch` only succeeds if the pattern matches the **whole** text, not just part of it.']],
              ['replies[turn % len(replies)]', ['`%` is the remainder: turn 0 uses reply 0, turn 1 reply 1, and with 2 replies turn 2 is back to reply 0. A simple way not to repeat itself.']],
              ['parts = [reflect(group) for group in match.groups() if group is not None]', ['Every captured group, reflected. A group that took no part in the match is `None`, and is skipped.']],
              ['return reply.format(*parts)', ['`.format` fills `{0}` with the first part. `*parts` passes the list\'s items as separate arguments.']],
            ],
          },
        },
        { python: { program: 'eliza', label: 'Step through respond() in real Python' } },
        { figure: 'ChatBot', caption: 'Talk to it. Under each reply, “How was this reply made?” shows the rules tried, what was captured, and each word’s reflection.' },
        {
          predict: {
            prompt: 'You type “my dog bit me”. How many rules does `respond` **try**, counting the one that finally matches?',
            compute: () => respondTrace('my dog bit me', 0).rule + 1, answer: 8,
            explain: 'None of the specific patterns fits: it doesn\'t start with "i need", "i feel", "i am", "because" or a greeting, and has no family word or question mark. Only the 8th rule, the catch-all `(.*)`, matches, and the bot says something general. A sentence about being bitten gets "How does that make you feel?" or "Please tell me more": no understanding of dogs, biting, or pain.',
          },
        },
        {
          write: {
            file: 'eliza.py', fn: 'reflect', constants: ['REFLECTIONS'],
            prompt: 'Write `reflect(fragment)`: lower-case it, split it into words, swap each word that is in `REFLECTIONS`, and join the words with spaces.',
            starter: 'def reflect(fragment):\n    words = fragment.lower().split()\n    # swap each word using REFLECTIONS, keep the others, join with spaces\n    pass\n',
            cases: cases(reflect, [['my job'], ['I am tired of you'], ['  I need   my coffee '], ['nothing to swap'], ['']]),
            hint: '`" ".join(REFLECTIONS.get(word, word) for word in words)`',
          },
        },

        { h: 'Where it breaks, and why' },
        { md: `Type “I'm worried about you”. The bot says something like “How long have you been worried about **I**?” A person would say “about **me**”.

The reflection table maps "you" to "I", which is right when "you" is the **subject** ("you are kind" → "I am kind") and wrong when it is the **object** ("about you" → "about me"). Word-by-word replacement can't tell them apart, because the difference isn't in the word: it's in the word's **role** in the sentence. A dependency tree (lesson 2.5) would say which: a subject depends on the verb as its subject, an object as its object.

That is the lesson of Bot 1. Rules can be made to handle this one case, and the next, and the next, but like the sentence splitter of lesson 1.6, every fix uncovers another, and the bot still has no idea what a dog or a holiday is. Part 3 starts doing it the other way: instead of writing rules, **learn from examples**.` },
        {
          choice: {
            prompt: 'Why does reflection turn “worried about you” into “worried about I”?',
            options: [
              { text: 'The regular expression captured the wrong part of the message.', why: 'The capture is right: “worried about you”. The problem comes after, in `reflect`.' },
              { text: '`reflect` swaps each word on its own, and “you” → “I” is only right when “you” is the subject; here it is the object of “about”.', why: 'Exactly. The right swap depends on the word’s role in the sentence, which word-by-word rules never see. A parser would.' },
              { text: 'The REFLECTIONS dictionary is missing “about”.', why: '“about” is the same in both directions; it doesn’t need swapping. The word that goes wrong is “you”.' },
            ],
            answer: 1,
          },
        },
      ],
    },
  ],
}
