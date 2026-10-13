// Part 1: text as data. Characters and bytes, splitting by hand, a tokenizer by hand and as a
// regular expression, counting words and Zipf's law, splitting sentences. Every number a predict
// block or a derivation step asks for is worked out by `compute` from the engine, every write
// block's expected answers come from the engine, and lessons.test.js checks all of it, including
// that python/text_basics.py's own functions pass every write block's checks.
import * as T from '../engine/text.js'

const cases = (fn, inputs) => inputs.map(args => ({ args, expected: fn(...args) }))
const plainTable = rows => rows.map(r => [...r])

export const PART1 = {
  id: 'part1', title: 'Part 1 · Text as data', lessons: [
    {
      id: 'text-is-characters', number: '1.1', title: 'Text is a list of characters',
      goal: 'Loop over a string, count what is in it, and see the numbers and bytes a computer really stores for each character.',
      builds: [],
      blocks: [
        { h: 'What this lab is about' },
        { md: `**Natural language processing** (NLP) is getting computers to work with human language: a spam filter, a search box, autocorrect, a translator, a chatbot. They all start the same way, and it is the part most courses skip: a computer can't read. It can only store numbers and compare them. So every NLP system first turns text into pieces, and the pieces into numbers. Everything after that, up to a chatbot that writes back, is arithmetic on those numbers.

This lab builds that path one piece at a time, and you write each piece yourself:

1. **Text as data** (this part): characters, bytes, words, tokens, counts, sentences. Plain Python.
2. Later parts: parsing a sentence's structure, counting to classify text, words as vectors, predicting the next word, and finally a chatbot you train.

Every lesson has the same kinds of blocks. **Predict, then check** asks you for a number before you see it. **Derive it yourself** walks through the maths one step at a time, and you type each step. **Write it yourself** gives you a function to write; it runs in real Python in this page, and the lab checks it on several inputs. **Show me** is always there when you are stuck: reading a working answer after trying is still learning.` },

        { h: 'A string is a sequence' },
        { md: `In Python a piece of text is a **string**. A string is a sequence of characters, like a list is a sequence of items, and most of what you can do with a list you can do with a string:

- \`len(text)\` is how many characters it has. \`len("cat")\` is 3.
- \`text[0]\` is the first character, \`text[-1]\` the last.
- \`for ch in text:\` runs the loop body once per character, from left to right, with \`ch\` holding the current one.

That last one is the engine of this whole part. Every tool in it, from counting letters to splitting sentences, is a loop that looks at one character at a time and decides what to do with it.` },

        { h: 'Counting: the first real tool' },
        { md: `The first question to ask any text is "what is in it, and how often?". Counting is how a spam filter notices that "free" appears ten times, and in Part 3 it is how a classifier learns. Here is the counting function the whole lab uses. It works on any sequence: the characters of a string, or (later) a list of words.` },
        {
          code: {
            file: 'text_basics.py', fn: 'count', notes: [
              ['counts = {}', ['A **dictionary**: it stores pairs, *key → value*. Here each key is an item seen and its value is how many times it has been seen. It starts empty: nothing counted yet.']],
              ['for item in items:', ['Look at each item once, in order. For a string, each item is one character.']],
              ['counts.get(item, 0) + 1', [
                '`counts.get(item, 0)` asks the dictionary for this item\'s count so far, and gives `0` if the item has never been seen. (Plain `counts[item]` would stop the program with a `KeyError` for a new item.)',
                'Add 1, because we just saw it once more, and store the result back under the same key. So the first `"a"` stores 0 + 1 = 1, the second 1 + 1 = 2, and so on.',
              ]],
              ['return counts', ['After the loop every item has been seen once, so every count is complete.']],
            ],
          },
        },
        {
          write: {
            file: 'text_basics.py', fn: 'count',
            prompt: 'Write `count(items)`: return a dictionary from each item to the number of times it appears. Type it rather than copying it; the typing is where the pattern sticks. Run the checks when you think it works.',
            starter: 'def count(items):\n    counts = {}\n    # one loop: for each item, add 1 to its count\n    return counts\n',
            cases: cases(T.count, [[[...'banana']], [['the', 'cat', 'the']], [[]], [[...'mississippi']]]),
            hint: 'Inside a `for item in items:` loop, one line does all the work: `counts[item] = counts.get(item, 0) + 1`.',
          },
        },
        {
          predict: {
            prompt: 'How many **different** characters are there in `"mississippi"`? That is, how many keys does `count("mississippi")` have?',
            compute: () => Object.keys(T.count(T.chars('mississippi'))).length, answer: 4,
            explain: 'm, i, s and p. The counts are `{"m": 1, "i": 4, "s": 4, "p": 2}`: eleven characters in all, but only four different ones. Those two numbers, *how many in all* and *how many different*, come back in lesson 1.5 as tokens and vocabulary.',
            misconceptions: [{ answer: 11, feedback: 'That is how many characters there are in all, `len("mississippi")`. A dictionary has one key per *different* item.' }],
          },
        },

        { h: 'Characters are numbers' },
        { md: `A computer stores each character as a number, its **code point**. Python shows you that number with \`ord\`, and turns a number back into a character with \`chr\`:

- \`ord("A")\` is 65, \`ord("a")\` is 97, \`ord(" ")\` is 32.
- \`chr(97)\` is \`"a"\`.

The numbers come from **Unicode**, one list of about 150,000 characters that covers every writing system, plus symbols and emoji. Its first 128 entries are the old ASCII table (English letters, digits, punctuation), which is why "A" is still 65.

Type in the box below. Each character's row shows its code point, written the Unicode way (\`U+00E9\`, the number in hexadecimal) and in ordinary decimal.` },
        { figure: 'CharBytes', caption: 'Each character, its Unicode number, and the bytes UTF-8 stores for it. Try an accented letter, a Chinese character, an emoji.' },

        { h: 'UTF-8: how a number becomes bytes' },
        { md: `A file or a network message is a list of **bytes**, and one byte holds only 8 bits: a number from 0 to 255. Most code points are bigger than that, so they need a rule for spreading one number over several bytes. Almost everything today uses the rule called **UTF-8**:

| Code point | Bytes | Bit pattern (x = the number's own bits) | Bits for the number |
|---|---|---|---|
| 0 to 127 | 1 | \`0xxxxxxx\` | 7 |
| 128 to 2,047 | 2 | \`110xxxxx 10xxxxxx\` | 5 + 6 = 11 |
| 2,048 to 65,535 | 3 | \`1110xxxx 10xxxxxx 10xxxxxx\` | 4 + 6 + 6 = 16 |
| 65,536 and up | 4 | \`11110xxx 10xxxxxx 10xxxxxx 10xxxxxx\` | 3 + 6 + 6 + 6 = 21 |

The **marker bits** at the front of each byte (bold in the figure above) say what the byte is: \`0\` is a whole character on its own, \`110\` starts a two-byte character, \`10\` means "I continue the character before me". That is how a program reading bytes one at a time always knows where each character starts. And it is why plain English text is exactly the same in ASCII and UTF-8: every English character is below 128, so it is one byte starting with \`0\`.

Why does an NLP lesson care? Because the tokenizers inside real language models (Part 5) work on these bytes, and because \`len(text)\` and the size of the text in bytes are different numbers that are easy to mix up.` },
        {
          derive: {
            title: 'Encode “é” in UTF-8 by hand',
            intro: '“é” is code point 233 (`ord("é")`). Follow the table to find its bytes.',
            steps: [
              { prompt: 'How many bytes does UTF-8 use for 233?', number: 2, compute: () => T.utf8Bytes('é').length, why: '233 is more than 127 and at most 2,047, so it is the two-byte row.' },
              { prompt: 'The two-byte pattern has room for 11 bits. What is the largest number 11 bits can hold?', number: 2047, compute: () => 2 ** 11 - 1, why: '$2^{11} - 1 = 2047$: eleven bits all set to 1. That is where the two-byte row ends.', hint: 'With $k$ bits the largest number is $2^k - 1$.' },
              { prompt: '233 in 11 bits is `00011 101001`. The first byte gets the top 5 bits, `00011`. What number is `00011`?', number: 3, compute: () => 233 >> 6, why: '$0\\cdot16 + 0\\cdot8 + 0\\cdot4 + 1\\cdot2 + 1\\cdot1 = 3$. In code: `233 >> 6`, shifting away the 6 low bits.' },
              { prompt: 'The first byte is `110` followed by those 5 bits: `110 00011`. As a number, `11000000` is 192. What is the first byte?', number: 195, compute: () => T.utf8Bytes('é')[0], why: '192 + 3 = 195. In code: `0b11000000 | (233 >> 6)`.' },
              { prompt: 'The low 6 bits, `101001`, are 41. The second byte is `10` followed by them; `10000000` is 128. What is the second byte?', number: 169, compute: () => T.utf8Bytes('é')[1], why: '128 + 41 = 169. In code: `0b10000000 | (233 & 0b111111)`.' },
            ],
            result: '`"é".encode("utf-8")` is the two bytes 195 and 169 (`C3 A9` in hexadecimal). Type “é” in the figure above and you will see exactly these.',
          },
        },
        {
          predict: {
            prompt: 'How many **bytes** is `"naïve 🙂"` in UTF-8? That is `len("naïve 🙂".encode("utf-8"))`. (ï is code point 239; 🙂 is 128,578.)',
            compute: () => T.utf8Bytes('naïve 🙂').length, answer: 11,
            explain: 'n, a, v, e and the space are ASCII: 1 byte each, 5 bytes. ï (239) is in the two-byte row: 2. 🙂 (128,578) is above 65,535: 4. 5 + 2 + 4 = **11** bytes, for **7** characters.',
            misconceptions: [{ answer: 7, feedback: 'That is how many *characters* there are, `len("naïve 🙂")`. The question asks for bytes: some of these characters need more than one.' }],
          },
        },
        { note: 'JavaScript counts differently. Its `text.length` counts 16-bit pieces, not characters, so `"🙂".length` is 2 in JavaScript but `len("🙂")` is 1 in Python. This lab’s JavaScript loops over `[...text]`, which gives real characters, so that it agrees with Python everywhere.', kind: 'warn' },
      ],
    },

    {
      id: 'split-by-hand', number: '1.2', title: 'Splitting into words by hand',
      goal: 'Write the loop that cuts text into words at the spaces, and follow it one character at a time.',
      builds: ['text-is-characters'],
      blocks: [
        { h: 'A word is what is between spaces' },
        { md: `To work with words you first have to find them. The simplest definition: **a word is a run of characters with no spaces in it**. Python can already do this, \`"to be  or".split()\` gives \`['to', 'be', 'or']\`, but you are going to write it yourself, because the way it works is the pattern of every tokenizer in this lab:

- a **loop** over the characters,
- a **buffer**, \`current\`, holding the word being built,
- a **rule** for when the word is finished: here, a space.

Each character either *grows* the current word or *ends* it.` },
        {
          code: {
            file: 'text_basics.py', fn: 'split_words', notes: [
              ['words = []', ['The finished words, in order. Empty to start with.']],
              ['current = ""', ['The word being built. Empty means "not inside a word right now".']],
              ['for ch in text:', ['One character at a time, left to right.']],
              ['if ch.isspace():', ['`isspace()` is true for a space, a tab (`\\t`) and a new line (`\\n`): any gap between words.']],
              ['if current:', ['An empty string counts as false in an `if`, a non-empty one as true. So this means "if a word is in progress". With two spaces in a row, the second finds `current` empty and does nothing; that is why double spaces never make empty words.']],
              ['words.append(current)', ['A space after a word ends it: save the word.']],
              ['current = ""', ['Start the next word empty.']],
              ['current += ch', ['Not a space: the character belongs to the word in progress, so add it to the end. `"wo" + "r"` is `"wor"`.']],
              ['if current:', ['**After the loop.** If the text ends with a word, no space ever came to finish it, so it is still in `current`. Forgetting these two lines is the classic bug: the last word disappears.']],
              ['return words', ['Every word, in order.']],
            ],
          },
        },
        { figure: 'ScanPlayer', props: { fn: 'split_words', text: 'Hello,  world!' }, caption: 'Step through it. The lit line is the one that just ran; `current` and `words` are the program’s variables after it. Change the text and step again. Step back to see what changed.' },
        { md: `Notice two things in the run above. The comma stays glued to "Hello," because a comma isn't a space; lesson 1.3 fixes that. And the second of the two spaces does nothing at all: \`current\` is already empty, so \`if current:\` is false.` },

        { h: 'The maths of it: counting word starts' },
        { md: `There is a second way to see the same thing, and it is the way you will see maths written in NLP papers. Number the characters $x_1, x_2, \\dots, x_n$. A word **starts** at position $i$ when $x_i$ is not a space and either $i = 1$ (the very start) or $x_{i-1}$ is a space. Every word has exactly one start, so the number of words is the number of starts:

$$\\text{words} = \\sum_{i=1}^{n} \\big[\\, x_i \\neq \\text{space} \\;\\wedge\\; (i = 1 \\;\\vee\\; x_{i-1} = \\text{space}) \\,\\big]$$

Read it slowly, one symbol at a time:

- $\\sum_{i=1}^{n}$ means "add up the thing after it, once for every $i$ from 1 to $n$". It is a \`for\` loop that keeps a total.
- The square brackets are the **indicator**: $[\\text{condition}]$ is 1 when the condition is true and 0 when it is false. So the sum adds 1 for every position where a word starts: it counts them.
- $\\wedge$ is "and", $\\vee$ is "or".` },
        {
          mathCode: [
            ['x_i', 'ch', 'the character at position $i$'],
            ['x_{i-1}', 'text[i - 1]', 'the character just before it'],
            ['[x_i \\neq \\text{space}]', 'not ch.isspace()', '1 if true, 0 if false (Python: `int(not ch.isspace())`)'],
            ['\\sum_{i=1}^{n} [\\dots]', 'total += 1  (inside the loop, when the condition holds)', 'a loop that adds up'],
            ['\\text{words}', 'len(split_words(text))', 'the number of words: one start each'],
          ],
        },
        {
          predict: {
            prompt: 'How many words does `split_words(" the  cat sat ")` return? (There is a space at the start, two between "the" and "cat", and one at the end.)',
            compute: () => T.splitWords(' the  cat sat ').length, answer: 3,
            explain: 'Count the word starts: t, c and s are the only non-space characters with a space (or nothing) before them. Three starts, three words: `["the", "cat", "sat"]`. The extra spaces never start anything.',
            misconceptions: [
              { answer: 5, feedback: 'That counts the gaps (spaces), not the words. Spaces next to each other, or at the ends, separate nothing.' },
              { answer: 4, feedback: 'Close, but count the word *starts*: positions with a letter and a space (or the beginning) just before it.' },
            ],
          },
        },
        {
          write: {
            file: 'text_basics.py', fn: 'split_words',
            prompt: 'Write `split_words(text)` without using `.split()`: a loop, a `current` word, and a list of finished words. Watch the empty text and the text that ends in a word.',
            starter: 'def split_words(text):\n    words = []\n    current = ""\n    for ch in text:\n        # a space ends the word in progress (if there is one); anything else grows it\n        pass\n    # the last word has no space after it\n    return words\n',
            cases: cases(T.splitWords, [['Hello,  world!'], ['  leading and trailing  '], [''], ['one'], ['tabs\tand\nnew lines']]),
            forbid: [['.split(', 'Writing the split yourself is the point of this exercise: build it from the loop and `current`.']],
            hint: 'If only the last word is missing, you have forgotten the lines after the loop: `if current: words.append(current)`.',
          },
        },
      ],
    },

    {
      id: 'tokenize-by-hand', number: '1.3', title: 'Punctuation: a tokenizer by hand',
      goal: 'Sort every character into a kind, and write the tokenizer that keeps words together and splits punctuation off.',
      builds: ['split-by-hand'],
      blocks: [
        { h: 'Why splitting at spaces is not enough' },
        { md: `With \`split_words\`, "world!" and "world" are different words, and so are "Hello," and "Hello". A word count would count them separately, and a search for "world" would miss "world!". The fix is to split the text into **tokens**: the units the rest of the system works with. In this lesson a token is either a run of letters and digits (a word) or a single punctuation mark.

First, a function that sorts any character into one of three **kinds**.` },
        {
          code: {
            file: 'text_basics.py', fn: 'char_kind', notes: [
              ['ch.isalnum() or ch == "_"', ['`isalnum()` is true for letters and digits in any script: "a", "é", "Ж", "7". The underscore is counted as a word character too, as programmers expect (`snake_case` is one word).']],
              ['return "word"', ['Letters, digits and _ build words.']],
              ['if ch.isspace():', ['Spaces, tabs and new lines.']],
              ['return "punct"', ['Anything else: , . ! ? $ \' - and so on, and also emoji.']],
            ],
          },
        },
        { md: `Now the tokenizer. Compare it with \`split_words\`: the loop and \`current\` are the same, there is just one more case. A word character grows the word. Anything else **ends** the word, and if it is punctuation it is saved as a token of its own.

You can describe it as a machine with two **states**: *inside a word* (\`current\` is not empty) and *between words* (\`current\` is empty). Each character moves the machine:

| Character's kind | Inside a word | Between words |
|---|---|---|
| word | add it to \`current\` | start \`current\` with it |
| space | save \`current\`; now between words | do nothing |
| punct | save \`current\`, then save the mark | save the mark |

This is called a **finite state machine**: a fixed set of states, and a rule for every (state, input) pair. Tokenizers, regular expressions and the parsers of Part 2 are all built on this idea.` },
        {
          code: {
            file: 'text_basics.py', fn: 'tokenize', notes: [
              ['kind = char_kind(ch)', ['Decide once what this character is.']],
              ['if kind == "word":', ['A word character: the left column of the table\'s first row.']],
              ['continue', ['Skip the rest of the loop body and go straight to the next character. Without it, the code below would run too.']],
              ['if current:', ['Not a word character, so the word in progress (if any) is finished.']],
              ['if kind == "punct":', ['A space is simply dropped. A punctuation mark becomes a token.']],
              ['tokens.append(ch)', ['The mark on its own: `"!"`.']],
              ['if current:', ['As in `split_words`: a text that ends with a word must save it after the loop.']],
            ],
          },
        },
        { figure: 'ScanPlayer', props: { fn: 'tokenize', text: "Mr. Smith paid $3.50, didn't he?" }, caption: 'The same loop, with punctuation. Watch “$3.50”: the dollar sign, the 3, the full stop and the 50 come out as four tokens.' },
        { python: { program: 'tokenize', label: 'Step through tokenize() in real Python' } },
        {
          predict: {
            prompt: 'How many tokens does `tokenize("don\'t stop!")` return?',
            compute: () => T.tokenize("don't stop!").length, answer: 5,
            explain: 'The apostrophe is not a letter, so to `char_kind` it is punctuation: `["don", "\'", "t", "stop", "!"]`, **5** tokens. Real tokenizers have a special rule here; spaCy, for one, splits "don\'t" into "do" and "n\'t", which keeps the meaning. Every tokenizer is a set of decisions like this one.',
            misconceptions: [{ answer: 3, feedback: 'That treats "don\'t" as one token. Follow `char_kind` on each character: what kind is the apostrophe?' }],
          },
        },
        {
          write: {
            file: 'text_basics.py', fn: 'tokenize', given: ['char_kind'],
            prompt: 'Write `tokenize(text)`. `char_kind` is already written for you. Start from your `split_words`: the only new case is punctuation.',
            starter: 'def tokenize(text):\n    tokens = []\n    current = ""\n    for ch in text:\n        kind = char_kind(ch)\n        # word: grow current. otherwise: save current (if any), then save ch if it is punctuation\n        pass\n    return tokens\n',
            cases: cases(T.tokenize, [['Hello, world!'], ['$3.50'], [''], ['snake_case rules'], ['Wait... what?!']]),
            hint: 'Put the word case first and end it with `continue`. Everything after it only runs for spaces and punctuation.',
          },
        },
        {
          choice: {
            prompt: 'How many tokens does `tokenize("Wow!!")` give?',
            options: [
              { text: '2: "Wow" and "!!"', why: 'Punctuation marks are never grouped: each one is saved the moment it is seen, with `tokens.append(ch)`.' },
              { text: '3: "Wow", "!" and "!"', why: 'Each "!" is saved on its own as the loop reaches it. Grouping repeated marks would need another state in the machine.' },
              { text: '1: "Wow!!"', why: 'That is what `split_words` gives. `tokenize` splits punctuation off.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'regex-tokenizer', number: '1.4', title: 'The same tokenizer as a regular expression',
      goal: 'Read the pattern `\\w+|[^\\w\\s]` one piece at a time, and use `re.findall` to tokenize in one line.',
      builds: ['tokenize-by-hand'],
      blocks: [
        { h: 'A pattern instead of a loop' },
        { md: `A **regular expression** (regex) is a small language for describing patterns in text. Python's \`re\` module runs them. The tokenizer you just wrote is one short pattern:

\`\`\`python
re.findall(r"\\w+|[^\\w\\s]", text)
\`\`\`

The \`r\` before the quotes makes it a **raw string**: backslashes are kept as they are instead of being read as escapes like \`\\n\`. Regexes are full of backslashes, so they are almost always written raw.

Read the pattern one piece at a time:

- \`\\w\` matches one **word character**: a letter, a digit or \`_\`. The same set as \`char_kind\`'s "word".
- \`+\` means "one or more of the thing before me", and as many as possible. So \`\\w+\` matches a whole run of word characters: a word.
- \`|\` means "or": try the left side; if it doesn't match here, try the right side.
- \`[...]\` matches one character from a set, and \`[^...]\` one character **not** in the set. \`\\s\` is any space. So \`[^\\w\\s]\` is one character that is neither a word character nor a space: one punctuation mark.

\`re.findall\` walks along the text from the left. At each position it tries the pattern; if it matches, it saves the match and continues just after it. If nothing matches (a space: it is neither \`\\w\` nor \`[^\\w\\s]\`), it moves on one character. That is exactly what your loop does, piece for piece.` },
        { md: `Each piece of the pattern is a part of your loop:

| Regex piece | The same thing in \`tokenize\` | What it does |
|---|---|---|
| \`\\w+\` | \`current += ch\` while \`char_kind(ch) == "word"\` | a run of word characters becomes one token |
| \`[^\\w\\s]\` | \`tokens.append(ch)\` when \`kind == "punct"\` | one punctuation mark is one token |
| \`\\|\` | the \`if\` that checks the word case first | try the word rule first, then the punctuation rule |
| (nothing matches) | \`kind == "space"\`: nothing saved | spaces are skipped |` },
        {
          code: {
            file: 'text_basics.py', fn: 'tokenize_regex', notes: [
              ['re.findall(TOKEN_PATTERN, text)', ['`TOKEN_PATTERN` is the string `r"\\w+|[^\\w\\s]"`, defined just above the function. `findall` returns every match as a list of strings: the tokens.']],
            ],
          },
        },
        { figure: 'TokenCompare', caption: 'Three tokenizers on the same text. The hand-written loop and the regex always agree: the lab’s tests check that on texts with accents, emoji, tabs and abbreviations.' },
        {
          predict: {
            prompt: 'With only the first half of the pattern, `re.findall(r"\\w+", "it\'s 3.50")`, how many matches are there?',
            compute: () => ("it's 3.50".match(/[\p{L}\p{N}_]+/gu) ?? []).length, answer: 4,
            explain: '`\\w+` alone finds the runs of word characters and skips everything else: `["it", "s", "3", "50"]`, **4**. The apostrophe and the full stop are not matched at all, so they disappear instead of becoming tokens. That is why the pattern needs its second half.',
            misconceptions: [{ answer: 6, feedback: 'That counts the punctuation too. With only `\\w+`, nothing matches the apostrophe or the full stop, so they are skipped.' }],
          },
        },
        {
          write: {
            file: 'text_basics.py', fn: 'tokenize_regex',
            prompt: 'Write `tokenize_regex(text)` with one call of `re.findall`. Write the pattern yourself (remember `import re`, and the raw string).',
            starter: 'import re\n\ndef tokenize_regex(text):\n    # return re.findall(<your pattern>, text)\n    pass\n',
            cases: cases(T.tokenizeRegex, [['Hello, world!'], ['$3.50'], [''], ["don't stop!"], ['snake_case rules']]),
            hint: 'Two alternatives joined by `|`: a run of word characters, or a single character that is neither a word character nor a space.',
          },
        },
        { note: 'The loop and the regex are the same machine. A regex engine compiles your pattern into a state machine like the table in lesson 1.3 and runs it over the text. Writing the loop once is how you know what the one-line pattern is doing.', kind: 'key' },
      ],
    },

    {
      id: 'counting-words', number: '1.5', title: 'Counting words, and Zipf’s law',
      goal: 'Count a text’s words, rank them, and test Zipf’s law on a log-log plot, including the maths of why it is a straight line.',
      builds: ['text-is-characters', 'regex-tokenizer'],
      blocks: [
        { h: 'From tokens to word counts' },
        { md: `You now have all the pieces to count the words of a text: tokenize it, keep the tokens that are words, and count them. One more decision first: should "The" and "the" be the same word? For counting, almost always yes, so every word is turned to lower case. That is called **normalising**: making different spellings of the same thing identical before you count.

Two numbers describe any text:

- **Tokens**: how many words there are in all, counting repeats.
- **Vocabulary** (or **types**): how many *different* words.

"the cat sat on the mat" has 6 tokens but a vocabulary of 5, because "the" is used twice.` },
        {
          code: {
            file: 'text_basics.py', fn: 'word_counts', notes: [
              ['for t in tokenize(text) if char_kind(t[0]) == "word"', [
                'A **list comprehension**: it builds a list in one line. Read it as "for each token `t` of the text, if its first character is a word character, put `t.lower()` in the list".',
                'Checking only `t[0]` is enough, because `tokenize` never mixes kinds in one token: a token is either all word characters or a single mark.',
              ]],
              ['return count(words)', ['The counting function from lesson 1.1, now on words instead of characters.']],
            ],
          },
        },
        { md: `To see which words matter most, sort them by count: the **rank** of a word is its place in that order, 1 for the most frequent.` },
        {
          code: {
            file: 'text_basics.py', fn: 'rank_table', notes: [
              ['sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))', [
                '`counts.items()` gives the pairs `(word, count)`.',
                '`key=` tells `sorted` what to sort by. The `lambda` is a small function written inline: for a pair it returns `(-count, word)`.',
                'Tuples are compared item by item: first `-count`, and only on a tie, `word`. Sorting by the negative count puts the biggest count first (−9 comes before −2). Ties go in alphabetical order, so the result is always the same.',
              ]],
              ['enumerate(ordered, start=1)', ['`enumerate` numbers the items as it goes: 1, 2, 3… The number is the rank.']],
            ],
          },
        },
        {
          write: {
            file: 'text_basics.py', fn: 'rank_table',
            prompt: 'Write `rank_table(counts)`: from a dictionary `{word: count}`, return a list of `(rank, word, count)`, most frequent first, ties in alphabetical order.',
            starter: 'def rank_table(counts):\n    # sort the (word, count) pairs, then number them from 1\n    pass\n',
            cases: cases(T.rankTable, [[{ the: 3, cat: 2, sat: 1, mat: 2 }], [{ b: 1, a: 1 }], [{}]]).map(c => ({ ...c, expected: plainTable(c.expected) })),
            hint: '`sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))` gives the order; then `[(rank, word, n) for rank, (word, n) in enumerate(ordered, start=1)]`.',
          },
        },
        {
          predict: {
            prompt: 'What is the vocabulary of `"the cat sat on the mat. The cat ate. the end"`? That is, how many keys does `word_counts` return?',
            compute: () => Object.keys(T.wordCounts('the cat sat on the mat. The cat ate. the end')).length, answer: 7,
            explain: 'the, cat, sat, on, mat, ate, end: **7**. "The" and "the" are the same word after `.lower()`, and the full stops are not words.',
            misconceptions: [{ answer: 8, feedback: 'You may be counting "The" and "the" as two words. `word_counts` lowers every word first.' }],
          },
        },

        { h: 'Zipf’s law' },
        { md: `Count the words of almost any long text, in any language, and the same shape appears. The most frequent word is far more frequent than the rest; the second appears about **half** as often as the first, the third about a **third** as often, and so on. This is **Zipf's law**:

$$n(r) \\approx \\frac{C}{r}$$

where $r$ is a word's rank, $n(r)$ its count, and $C$ a constant: the count of the top word.

It matters for everything that follows. A handful of words ("the", "of", "and") are a large share of every text but say little about what it is about; most of the vocabulary is rare words, and typically about half of the different words are seen only once (the figure counts them for you). A model trained on text will see the common words thousands of times and most words hardly ever, and every method in this lab has to cope with that.

The figure starts with the words of this lab's own lessons. Paste any long text of your own (an article, a chapter) to test the law on it.` },
        { figure: 'WordRanks', caption: 'Each dot is a word. Both axes are on log scales, so equal steps mean "times 10", not "plus 10". Hover a dot to see its word.' },
        {
          derive: {
            title: 'Why Zipf’s law is a straight line on log axes',
            intro: 'Start from $n = C / r$. Logs turn division into subtraction, and that is the whole trick. (Type `log( )` for the natural log.)',
            steps: [
              { prompt: 'Take the log of both sides of $n = C / r$. What is $\\log n$, in terms of $C$ and $r$?', answer: 'log(C) - log(r)', vars: { C: [1, 1000], r: [1, 100] }, why: '$\\log(a/b) = \\log a - \\log b$: the log of a quotient is a difference.', hint: 'The log of a division is a subtraction of logs.' },
              { prompt: 'Now name the log-axes: $u = \\log r$ (across) and $v = \\log n$ (up). Write $v$ in terms of $u$ and $C$.', answer: 'log(C) - u', vars: { C: [1, 1000], u: [0, 5] }, why: 'This is a straight line $v = b + m u$ with intercept $b = \\log C$ and slope $m = -1$. That is the dashed line in the figure.' },
              { prompt: 'The top word of a text appears 120 times. How many times does Zipf’s law predict for the word ranked 4th?', number: 30, compute: () => 120 / 4, why: '$n(4) = C / 4 = 120 / 4 = 30$.' },
              { prompt: 'If the law held exactly, $r \\times n(r)$ would be the same for every word. What would it be for that text?', number: 120, compute: () => 4 * (120 / 4), why: '$r \\cdot C / r = C = 120$ for every rank. Now look at the last column of the figure’s table: for a real text $r \\times$ count is not constant. It usually drifts upwards down the table. The law describes the shape, not the exact numbers.' },
            ],
            result: 'On log axes, $n = C/r$ becomes $\\log n = \\log C - \\log r$: a straight line of slope $-1$. Real texts give a line near that, not on it: the figure fits the best straight line through the dots and shows its slope. Try a few long texts; the slope stays close to $-1$ while the words themselves change completely. That is what makes it a law.',
          },
        },
        { note: 'Paste a long text of your own into the figure. A few thousand words is enough to see the line. Very short texts don’t follow the law: too many words appear exactly once.', kind: 'try' },
      ],
    },

    {
      id: 'sentences', number: '1.6', title: 'Splitting sentences, and why rules run out',
      goal: 'Write a sentence splitter, find the texts it gets wrong, and see why real systems learn this from data instead.',
      builds: ['tokenize-by-hand'],
      blocks: [
        { h: 'The naive splitter' },
        { md: `Many tasks work one sentence at a time, so the next tool cuts text into sentences. The obvious rule: **a sentence ends at a full stop, a question mark or an exclamation mark.** Here it is as code; it is the same loop pattern as before, but it remembers where the current sentence *started* instead of building it character by character.` },
        {
          code: {
            file: 'text_basics.py', fn: 'split_sentences_naive', notes: [
              ['start = 0', ['Where the sentence in progress begins.']],
              ['for i, ch in enumerate(text):', ['`enumerate` gives each character with its position `i`, which is needed to cut the text.']],
              ['text[start:i + 1].strip()', ['A **slice**: the characters from `start` up to and including `i` (the end of a slice is not included, so it is `i + 1`). `.strip()` removes spaces at both ends.']],
              ['start = i + 1', ['The next sentence starts just after the mark.']],
              ['rest = text[start:].strip()', ['Text after the last mark, with no mark of its own: a sentence too. The same "don\'t lose the last one" step as in `split_words`.']],
            ],
          },
        },
        { python: { program: 'sentences', label: 'Step through split_sentences() in real Python' } },
        { figure: 'SentenceSplit', caption: 'Switch between the naive splitter and the one with rules. Each mark is coloured: green ends a sentence, grey does not. With rules, every mark lists the reason for its decision.' },
        { md: `The naive rule cuts "Mr." from "Smith", splits "$3.50" in the middle, and turns "..." into empty pieces. Look at the failures: they are all full stops that are not at the end of a sentence. Two rules catch most of them:

1. **A mark only ends a sentence if a space or the end of the text follows it.** "3.50", "U.S." (in the middle) and "..." (all but the last dot) have something right after the dot.
2. **A full stop after a known abbreviation does not end a sentence.** "Mr.", "Dr.", "e.g.": a fixed list.` },
        {
          code: {
            file: 'text_basics.py', fn: 'last_word', notes: [
              ['while j > 0 and not text[j - 1].isspace():', ['Walk backwards from position `i` until the character before is a space (or the text begins). `j` ends at the first character of the word.']],
              ['return text[j:i]', ['The word just before the mark, without the mark: for "Mr." at the mark, that is "Mr".']],
            ],
          },
        },
        {
          code: {
            file: 'text_basics.py', fn: 'split_sentences', notes: [
              ['if ch not in ".!?":', ['Only the three marks are candidates; every other character is skipped at once.']],
              ['at_end = i + 1 == len(text)', ['True when this mark is the last character of the text.']],
              ['if not at_end and not text[i + 1].isspace():', ['Rule 1: something other than a space follows, so the mark is inside a token: "3.50", "U.S.", the first dots of "...".']],
              ['last_word(text, i).lower() in ABBREVIATIONS', ['Rule 2: the word before a full stop is a known abbreviation. `ABBREVIATIONS` is a **set**; `in` asks whether it contains the word, and for a set that is as fast as looking up a dictionary key.']],
              ['sentence = text[start:i + 1].strip()', ['Both rules let it through: cut the sentence, as in the naive version.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'How many sentences does `split_sentences("Dr. Who met St. John. They talked... a lot!!")` return?',
            compute: () => T.splitSentences('Dr. Who met St. John. They talked... a lot!!').length, answer: 3,
            explain: '"Dr." and "St." are abbreviations. Of "...", only the last dot has a space after it; of "!!", only the last is at the end. So: "Dr. Who met St. John.", "They talked...", "a lot!!": **3**. (Yes, "a lot!!" starts with a small letter; the rules don\'t look at that.)',
            misconceptions: [{ answer: T.splitSentencesNaive('Dr. Who met St. John. They talked... a lot!!').length, feedback: 'That is what the naive splitter gives, ending at every mark. Apply both rules to each mark in turn.' }],
          },
        },
        {
          write: {
            file: 'text_basics.py', fn: 'split_sentences', given: ['last_word'],
            prelude: 'ABBREVIATIONS = {"mr", "mrs", "ms", "dr", "st", "vs", "etc", "e.g", "i.e"}',
            prompt: 'Write `split_sentences(text)` with both rules. `last_word` and `ABBREVIATIONS` are already defined. Start from the naive version and add the two `continue`s.',
            starter: 'def split_sentences(text):\n    sentences = []\n    start = 0\n    for i, ch in enumerate(text):\n        if ch not in ".!?":\n            continue\n        # rule 1: something other than a space follows -> continue\n        # rule 2: a full stop after an abbreviation -> continue\n        # otherwise: cut the sentence from start to i, and move start\n    # the text after the last sentence end\n    return sentences\n',
            cases: cases(T.splitSentences, [['Mr. Smith paid $3.50. Was it worth it? Yes!'], ['Dr. Who met St. John. They talked... a lot!!'], [''], ['No mark at all'], ['e.g. this. And that.']]),
            hint: 'Rule 1 needs to know whether `i` is the last position: `i + 1 == len(text)`. Look at `text[i + 1]` only when it is not.',
          },
        },
        { h: 'Where rules run out' },
        { md: `Type "the U.S. market" into the figure. With the rules, "U.S." in the middle of a sentence ends it: the last dot has a space after it, and "u.s" is not in the list. Add it to the list, and now "...grew in the U.S. Then..." is wrong instead, because there it *does* end a sentence. A rule can't tell the two apart; the difference is in what comes after, and what makes sense.

This happens with every hand-written rule in language: each fix creates new mistakes, and the list of exceptions never ends. That is the reason NLP moved from writing rules to **learning them from examples**, and the reason the rest of this lab exists. Real tools (spaCy, for one) split sentences with a model trained on text where people marked the sentence ends. Part 3 begins learning from examples, with counting.` },
        {
          choice: {
            prompt: 'Why not just keep adding abbreviations until the splitter is right?',
            options: [
              { text: 'Python sets can only hold a few dozen strings.', why: 'A set can hold millions of strings. The limit is not the code.' },
              { text: 'Some strings, like "U.S.", end a sentence in one text and not in another, so no list can be right for both.', why: 'The same characters need different answers depending on what comes next and what it means. A fixed list can only ever give one answer per string. Learning from examples can use the context.' },
              { text: 'Abbreviations are always followed by a capital letter.', why: '"Mr. Smith" is, but so is the start of every new sentence. Capitals don\'t separate the two cases.' },
            ],
            answer: 1,
          },
        },
      ],
    },
  ],
}
