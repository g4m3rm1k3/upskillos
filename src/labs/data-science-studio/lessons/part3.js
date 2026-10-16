// Part 3: cleaning and joining. Text made comparable, rules for valid rows, duplicates, edit
// distance and fuzzy matching, missing values filled (with the truth known), joins three ways, what
// a join does to the number of rows, wide and long tables, and the whole cleaning in order. Numbers
// come from engine/cleaning.js (held to python/cleaning.py and joins.py by parity.test.js) and from
// the Spreadsheet Lab's engine.
import * as T from '../engine/tables.js'
import * as S from '../engine/summary.js'
import * as C from '../engine/cleaning.js'
import { ORDERS_CSV, CATALOGUE_CSV, RETURNS_CSV } from '../engine/data.js'
import { evaluateFormula } from '../engine/sheet.js'

const cases = (fn, inputs) => inputs.map(args => ({ args, expected: fn(...args) }))
const sheet = formula => evaluateFormula('orders', formula).value
const distinct = list => new Set(list).size
const pounds = pence => `£${(pence / 100).toFixed(2)}`
const money = x => `£${x.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const ROWS = T.readCsv(ORDERS_CSV())
const CATALOGUE = T.readCsv(CATALOGUE_CSV())
const RETURNS = T.readCsv(RETURNS_CSV())
const LIST = Object.fromEntries(CATALOGUE.map(r => [r.item, T.toPence(r.list_price)]))
const ITEMS = CATALOGUE.map(r => r.item)

// 3.1
const TOWNS_RAW = ROWS.map(r => r.town)
const SPELLINGS = { raw: distinct(TOWNS_RAW), trimmed: distinct(TOWNS_RAW.map(t => t.trim())), lowered: distinct(TOWNS_RAW.map(t => t.trim().toLowerCase())), clean: distinct(TOWNS_RAW.map(C.cleanTown)) }
const LEEDS_WEB_EXACT = ROWS.filter(r => r.town === 'Leeds' && r.channel === 'web').length
const LEEDS_WEB_CLEAN = ROWS.filter(r => C.cleanTown(r.town) === 'Leeds' && r.channel === 'web').length
const LEEDS_CLEAN = ROWS.filter(r => C.cleanTown(r.town) === 'Leeds').length
const ACUTE = String.fromCharCode(0x301), E_ACUTE = String.fromCharCode(0xe9)
const CAFE_TWO_WAYS = ['Cafe' + ACUTE, 'caf' + E_ACUTE]

// 3.2
const PROBLEMS = C.checkRows(ROWS)
const BY_RULE = T.countValues(PROBLEMS.map(p => p[1]))
const PENCE_IDS = PROBLEMS.filter(p => p[1] === 'price written right').map(p => p[0])
const PENCE_ROWS = ROWS.filter(r => PENCE_IDS.includes(r.order_id))

// 3.3
const [KEPT, REPEATED] = C.dedupe(ROWS, 'order_id')

// 3.5
const RETURNED_ITEMS = RETURNS.map(r => C.closest(r.item, ITEMS))
const RETURN_TYPOS = RETURNS.filter((r, k) => r.item !== RETURNED_ITEMS[k][0]).length

// 3.6
const MISSING = ROWS.filter(r => r.price.trim() === '').length
const EXPERIMENT = Object.fromEntries(Object.keys(C.MECHANISMS).map(m => [m, C.missingnessExperiment(m, 0.2, 400)]))
const CLEAN = C.cleanOrders(ROWS, LIST)
const SEEN = CLEAN.filter(r => r.price !== null).map(r => r.price / 100)
const FILLED = C.fillMissing(CLEAN.map(r => (r.price === null ? null : r.price / 100)), S.mean(SEEN))

// 3.7 and 3.8
const CLEAN_PRICED = CLEAN.filter(r => r.price !== null).map(r => ({ ...r, price: r.price / 100 }))
const COSTS = C.joinCosts(KEPT, CATALOGUE, 'item')
const REVENUE = C.revenueByCategory(CLEAN_PRICED, CATALOGUE)
const RETURNED = RETURNS.map(r => ({ ...r, order_id: C.normalise(r.order_id).toUpperCase() }))
const NO_ORDER = C.antiJoin(RETURNED, KEPT, 'order_id')
const NO_ORDER_RAW = C.antiJoin(RETURNS, KEPT, 'order_id')
const ORDERS_RETURNS = C.leftJoin(KEPT, RETURNED, 'order_id')
const TWICE = Object.entries(T.countValues(RETURNED.map(r => r.order_id))).filter(([id, n]) => n > 1 && KEPT.some(o => o.order_id === id)).map(([id]) => id)
const MISMATCHED = C.hashJoin(RETURNED.map((r, k) => ({ return_id: r.return_id, order_id: r.order_id, returned: RETURNED_ITEMS[k][0] })), KEPT, 'order_id').filter(r => r.item !== r.returned)

// 3.9
const MONTHS = ['01', '02', '03']
const WIDE = C.TOWNS.map(town => ({ town, ...Object.fromEntries(MONTHS.map(m => [`2025-${m}`, CLEAN.filter(r => r.town === town && r.date.slice(0, 7) === `2025-${m}`).length])) }))

// 3.10
const LIGHTS_BEFORE = T.priced(ROWS).filter(r => r.item === 'Lights, front and back').map(r => r.price)
const LIGHTS_AFTER = CLEAN_PRICED.filter(r => r.item === 'Lights, front and back').map(r => r.price)
const takings = rows => rows.reduce((s, r) => s + r.price * r.quantity, 0)

const SMALL_LEFT = [{ id: 1, name: 'Ann' }, { id: 2, name: 'Bo' }, { id: 3, name: 'Cy' }]
const SMALL_RIGHT = [{ id: 2, town: 'York' }, { id: 3, town: 'Leeds' }, { id: 3, town: 'Hull' }, { id: 4, town: 'Ripon' }]

export const PART3 = {
  id: 'part3', title: 'Part 3 · Cleaning and joining', lessons: [
    {
      id: 'cleaning-text', number: '3.1', title: 'Cleaning text',
      goal: 'Make text comparable (spaces, capitals, the two ways to write an accent), write the rule as a function, and redo lesson 1.5’s count of Leeds web orders.',
      builds: ['pivot-tables'],
      blocks: [
        { h: 'Four towns, eleven spellings' },
        { md: `The shop delivers to four towns. The town column holds **${SPELLINGS.raw}** different texts: "Leeds", "leeds", "Leeds " with a space after it, and so on. To a computer these are different values, so every count, group-by and pivot table in Parts 1 and 2 split one town into several. Lesson 1.5 found the effect: an exact match counts **${LEEDS_WEB_EXACT}** Leeds web orders, where the spreadsheet's COUNTIFS, which ignores capitals, counts ${sheet('=COUNTIFS(C2:C403,"Leeds",G2:G403,"web")')}.

**Cleaning** means turning every way of writing one thing into a single way, by a rule written down as a function, so it is the same every time and can be checked.` },
        { figure: 'TextCleaner', caption: 'Switch each fix on and off and watch the spellings merge. Type your own text to see what each fix does to it.' },
        { h: 'Each fix, and why it is safe' },
        { md: `Three fixes, in this order:

1. **Spaces.** \`text.split()\` with no argument splits on any run of spaces, tabs or new lines and drops the empty pieces at the ends; \`" ".join(...)\` puts the words back with exactly one space. "  Leeds " becomes "Leeds", "New  York" becomes "New York".
2. **Unicode.** An accented letter can be stored two ways: é as one character (U+00E9), or as e followed by a combining accent (U+0301). They look identical and compare unequal. \`unicodedata.normalize("NFC", text)\` turns every such pair into the single character. The shop's towns have no accents, but a customer's name might, and a text editor might store either form.
3. **Capitals.** \`.lower()\` makes "LEEDS", "Leeds" and "leeds" one value. Comparing in lower case is the safe internal form; for showing, \`.title()\` puts a capital at the start of each word.

Each fix only merges texts that a person would read as the same word. That is the test of a cleaning rule: it must never merge two things that are really different. (A rule that also removed every vowel would merge more spellings, and also York with Yarke.)` },
        {
          code: {
            file: 'cleaning.py', fn: 'normalise', notes: [
              ['text = unicodedata.normalize("NFC", text)', ['NFC: every letter-plus-accent pair becomes one character, so both ways of writing é are the same text.']],
              ['words = text.split()', ['No argument: split on any run of whitespace, and no empty pieces at the ends.']],
              ['return " ".join(words).lower()', ['One space between words, all lower case.']],
            ],
          },
        },
        {
          predict: {
            prompt: `How many characters long is the text \`"Cafe" + "\\u0301"\` (an e followed by a combining accent), and how many after NFC?\n\nType the length **before** normalising.`,
            answer: [...CAFE_TWO_WAYS[0]].length, compute: () => [...CAFE_TWO_WAYS[0]].length,
            explain: `5: C, a, f, e and the accent, which is a character of its own. After NFC it is 4, the same as "café" typed with é, and the two compare equal. Before, their edit distance (lesson 3.4) is ${C.editDistance(CAFE_TWO_WAYS[0], 'Caf' + E_ACUTE)}: a change and an extra character.`,
            misconceptions: [{ answer: 4, feedback: 'That is what you see on screen. Stored, the accent is a separate character after the e: 5. That is exactly why two texts that look the same can compare unequal.' }],
          },
        },
        {
          write: {
            file: 'cleaning.py', fn: 'normalise', prelude: 'import unicodedata', forbid: [['re.', 'Use split and join: no regular expressions needed.']],
            prompt: 'Write `normalise(text)`: NFC first, then one space between words and none at the ends, then lower case.',
            starter: 'def normalise(text):\n    text = unicodedata.normalize("NFC", text)\n    # one space between words, none at the ends, lower case\n    return text\n',
            cases: cases(C.normalise, [['  Leeds '], ['YORK'], ['new  york'], [CAFE_TWO_WAYS[0]], ['a\tb\nc'], ['']]),
            hint: '`" ".join(text.split()).lower()`',
          },
        },
        {
          code: {
            file: 'cleaning.py', fn: 'clean_town', notes: [
              ['return normalise(text).title()', ['`.title()` puts a capital at the start of each word and makes the rest lower case: "harrogate" becomes "Harrogate". The internal form stays `normalise`; this one is for showing.']],
            ],
          },
        },
        {
          derive: {
            title: 'How many spellings each fix removes',
            intro: `The town column starts with ${SPELLINGS.raw} different texts. Apply the fixes one after the other.`,
            steps: [
              { prompt: 'Trimming the spaces at the ends (`.strip()`): how many different texts are left?', number: SPELLINGS.trimmed, compute: () => distinct(TOWNS_RAW.map(t => t.trim())), why: `"Leeds ", "York " and "Wakefield " join their trimmed twins: ${SPELLINGS.raw} − 3 = ${SPELLINGS.trimmed}.` },
              { prompt: 'Then lower case: how many?', number: SPELLINGS.lowered, compute: () => distinct(TOWNS_RAW.map(t => t.trim().toLowerCase())), why: `"leeds" and "Leeds" are now one, and so on for each town: ${SPELLINGS.lowered}, the four real towns. Nothing else was wrong with them.` },
            ],
          },
        },
        {
          formula: {
            table: 'orders', solution: '=SUMPRODUCT(--(PROPER(TRIM(C2:C403))="Leeds"),--(G2:G403="web"))', must: ['PROPER', 'TRIM'],
            prompt: 'Count the Leeds web orders with the town cleaned first. `PROPER(TRIM(C2:C403))` cleans the whole column at once (TRIM is the spreadsheet’s split-and-join, PROPER its `.title()`); `--( … = "Leeds")` turns each TRUE or FALSE into 1 or 0; `SUMPRODUCT` multiplies the two columns of 1s and 0s and adds them up.',
            hint: '`=SUMPRODUCT(--(PROPER(TRIM(C2:C403))="Leeds"),--(G2:G403="web"))`',
            explain: `${LEEDS_WEB_CLEAN}: the same as COUNTIFS gave in lesson 1.5, and now Python agrees too: \`clean_town\` gives ${LEEDS_WEB_CLEAN} where the exact match gave ${LEEDS_WEB_EXACT}. COUNTIFS was right by luck: it ignores capitals but not spaces, and no Leeds web order had a space after its town. Clean first, and every tool gives the same answer.`,
          },
        },
        { h: 'The same in pandas' },
        { md: 'pandas has the same string methods for a whole column at once, under `.str`: `frame["town"].str.strip()` strips every value, and the calls chain. `value_counts()` then counts each distinct value, as `count_values` did in lesson 1.1.' },
        {
          write: {
            file: 'frames.py', fn: 'town_counts', packages: ['pandas'], prelude: 'import pandas as pd',
            prompt: 'Write `town_counts(rows)` with pandas: the column cleaned with `.str.strip().str.lower().str.title()`, then counted with `value_counts()`. Return a plain dictionary from town to count (`int(n)` for each count).',
            starter: 'def town_counts(rows):\n    frame = pd.DataFrame(rows)\n    # clean the town column, count each town\n    return {}\n',
            cases: cases(C.townCounts, [[ROWS.slice(0, 60)], [ROWS]]),
            hint: '`towns = frame["town"].str.strip().str.lower().str.title()`, then `{town: int(n) for town, n in towns.value_counts().items()}`.',
          },
        },
        {
          choice: {
            prompt: 'A customer list has "McDonald" and "Mcdonald". `clean_town` would make both "Mcdonald". Is that a problem?',
            options: [
              { text: 'No: they are the same name, so merging them is the point.', why: 'Merging them for comparing is fine. But `.title()` also *changes how the name is shown*: the customer is called McDonald, and every letter now says Mcdonald.' },
              { text: 'Compare on `normalise(name)`, but keep and show the name as it was typed.', why: 'Yes. Cleaning for *matching* and cleaning for *showing* are different jobs. Keep the original column; add a cleaned key beside it and match on that.' },
              { text: 'Yes: never change case.', why: 'Then "York" and "york" stay two towns, and every count is wrong. Case must be folded somewhere, just not in what is shown.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'validation-rules', number: '3.2', title: 'Rules for valid rows',
      goal: 'Write validation rules as functions, check every row against every rule, and find and fix the prices typed in pence by comparing each with its list price.',
      builds: ['cleaning-text'],
      blocks: [
        { h: 'Say what valid means' },
        { md: `Cleaning fixes what you already know is wrong. **Validation** finds what you don't know yet: you write down what every valid row must look like, and the computer lists every row that breaks a rule.

A **rule** is a function from a row to True (valid) or False. Writing rules as functions means they can be run on every new file, so a problem is caught the day it arrives, not months later in a report.` },
        {
          code: {
            file: 'cleaning.py', fn: 'is_order_id', notes: [
              ['return len(text) == 5 and text[0] == "A" and text[1:].isdigit()', ['Exactly the shape of a real id: A and four digits. `isdigit` on an empty text is False, so "A" alone fails too.']],
            ],
          },
        },
        {
          code: {
            file: 'cleaning.py', fn: 'quantity_in_range', notes: [
              ['return text.isdigit() and 1 <= int(text) <= 3', ['`isdigit` first, so `int` is only called on text that is a whole number: "two" or "-1" fail the rule instead of crashing it.']],
            ],
          },
        },
        {
          code: {
            file: 'cleaning.py', fn: 'town_as_written', notes: [
              ['return row["town"] in TOWNS', ['Exactly as the shop writes it: lesson 3.1’s fix makes this rule pass for every row.']],
            ],
          },
        },
        {
          write: {
            file: 'cleaning.py', fn: 'price_written_right', forbid: [['float(', 'Check the text itself: a float would accept "1e3" and "45.5".']],
            prompt: 'Write the rule `price_written_right(row)`: True when `row["price"]` is blank, or digits, a point and exactly two digits. `text.partition(".")` splits at the first point into three parts: before, the point (or "" if there is none), after.',
            starter: 'def price_written_right(row):\n    text = row["price"]\n    # blank is allowed; otherwise pounds, a point, two digits of pence\n    return True\n',
            cases: cases(C.priceWrittenRight, [[{ price: '25.00' }], [{ price: '' }], [{ price: '2375' }], [{ price: '24.5' }], [{ price: 'ab.cd' }], [{ price: '1.234' }], [{ price: '.50' }]]),
            hint: '`pounds, point, pence = text.partition(".")`, then `pounds.isdigit() and point == "." and len(pence) == 2 and pence.isdigit()`.',
          },
        },
        {
          code: {
            file: 'cleaning.py', assign: 'RULES', caption: 'every rule, with its name',
          },
        },
        {
          code: {
            file: 'cleaning.py', fn: 'check_rows', notes: [
              ['for name, valid in rules:', ['A rule is a pair: its name, for the report, and the function itself. Functions are values in Python: they can go in a list and be called later.']],
              ['if not valid(row):', ['Calling the function stored in `valid` on this row.']],
            ],
          },
        },
        { figure: 'RuleChecker', caption: 'Every row against every rule. Switch rules off to see which rows each one catches, and see each price against its list price on a log scale.' },
        {
          predict: {
            prompt: 'Lesson 3.1’s cleaning hasn’t been applied yet. Running `check_rows(rows, RULES)` on all 402 rows, how many problems does it report?',
            answer: PROBLEMS.length, compute: () => C.checkRows(ROWS).length,
            explain: `${PROBLEMS.length}: ${BY_RULE['town as written']} towns not written as the shop writes them (lesson 3.1’s ${ROWS.filter(r => !C.TOWNS.includes(r.town)).length}), and ${BY_RULE['price written right']} prices without a point: ${PENCE_ROWS.map(r => `${r.order_id} (${r.item}, "${r.price}")`).join(' and ')}. These are the two typed in pence that lesson 2.6 found by statistics. A rule found them by their *shape*, without any statistics at all.`,
            misconceptions: [{ answer: BY_RULE['town as written'], feedback: 'Those are only the towns. Another rule fires too: look at how two prices are written.' }],
          },
        },
        { h: 'Fixing the pence' },
        { md: `"2375" broke the rule because it has no point. But the shape alone doesn't say what it should be: £23.75 typed without the point, or a £2,375 bike? Compare it with what the item usually costs. The **catalogue** (on its own sheet in the spreadsheet) has every item's list price. A light lists at ${pounds(LIST['Lights, front and back'])}; read as pounds, "2375" is £2,375, **95 times** the list price. Typed in pence, it is £23.75, close to the list price.` },
        {
          derive: {
            title: 'Why “more than ten times the list price” is the right line',
            intro: 'The generator prices each order at 90% to 110% of its list price. Compare prices by their ratio to the list price, on a log scale, where ×100 and ÷100 are the same distance from ×1.',
            steps: [
              { prompt: 'For "2375" read as pounds against a list price of £25: what is $\\log_{10}$ of the ratio, 2375 / 25?', number: Math.log10(2375 / 25), compute: () => Math.log10(237500 / LIST['Lights, front and back']), tolerance: 0.01, why: '$\\log_{10} 95 \\approx 1.98$: almost exactly 2, because typing in pence multiplies by 100 and $\\log_{10} 100 = 2$.' },
              { prompt: 'A real price is at most 110% of its list price. What is the largest $\\log_{10}$ ratio a real price can have?', number: Math.log10(1.1), compute: () => Math.log10(1.1), tolerance: 0.001, why: '$\\log_{10} 1.1 \\approx 0.04$. Real prices sit within 0.05 of 0; prices typed in pence sit near 2.' },
              { prompt: 'A line halfway between them on the log scale is at 1. What ratio is that?', number: 10, compute: () => 10 ** 1, why: '$10^1 = 10$: “more than ten times the list price” is the halfway line. It leaves a factor of nearly 10 either side, so a real price is never caught and a pence typo is never missed.' },
            ],
          },
        },
        {
          code: {
            file: 'cleaning.py', fn: 'fix_pence', notes: [
              ['pence = to_pence(text)', ['Lesson 1.3’s exact conversion: "2375" has no point, so it becomes 2375 pounds, 237500 pence.']],
              ['if pence > 10 * list_price:', ['The halfway line from the derivation. Both sides are whole pence, so nothing is rounded.']],
              ['return pence // 100', ['Whole-number division: 237500 // 100 = 2375 pence, £23.75.']],
            ],
          },
        },
        {
          write: {
            file: 'cleaning.py', fn: 'fix_pence', also: [['tables.py', 'to_pence']],
            prompt: 'Write `fix_pence(text, list_price)`: the price as whole pence with `to_pence`; `None` stays `None`; if it is more than ten times `list_price` (also in pence), divide by 100 with `//`.',
            starter: 'def fix_pence(text, list_price):\n    pence = to_pence(text)\n    # None stays None; more than 10 times the list price: typed in pence\n    return pence\n',
            cases: cases(C.fixPence, [['25.00', 2500], ['2375', 2500], ['', 2500], ['450.00', 45000], ['45000', 45000], ['250.00', 2500]]),
            hint: '`if pence is None: return None`, then `if pence > 10 * list_price: return pence // 100`.',
          },
        },
        {
          formula: {
            table: 'orders', solution: '=SUMPRODUCT(--(E2:E403>10*XLOOKUP(D2:D403,catalogue!A2:A8,catalogue!C2:C8)))', must: ['XLOOKUP', 'SUMPRODUCT'],
            prompt: 'In the spreadsheet: how many prices are more than ten times their list price? `XLOOKUP(D2:D403, catalogue!A2:A8, catalogue!C2:C8)` looks up every item’s list price on the catalogue sheet (see its tab below the grid), one per row. Compare each price with ten times it and count the TRUEs.',
            hint: '`=SUMPRODUCT(--(E2:E403>10*XLOOKUP(D2:D403,catalogue!A2:A8,catalogue!C2:C8)))`',
            explain: `${sheet('=SUMPRODUCT(--(E2:E403>10*XLOOKUP(D2:D403,catalogue!A2:A8,catalogue!C2:C8)))')}: the same two orders. A blank price counts as 0 here, so it is never more than ten times anything.`,
          },
        },
      ],
    },

    {
      id: 'duplicates', number: '3.3', title: 'Duplicates',
      goal: 'Remove rows entered twice in one pass with a set, say why checking every pair is far slower, and tell exact duplicates from conflicting ones.',
      builds: ['validation-rules'],
      blocks: [
        { h: 'Entered twice' },
        { md: `The file has 402 rows, but the order ids run from A1001 to A1400: 400 orders. Two were entered twice. A duplicate counts its order twice in every total, every mean and every count.

To find them we need a **key**: a column (or several) that names each real thing exactly once. Here it is \`order_id\`. A table's key is called its **primary key**, and "no key appears twice" is the rule that a primary key must obey.` },
        {
          code: {
            file: 'cleaning.py', fn: 'dedupe', notes: [
              ['seen, kept, repeated = set(), [], []', ['A set holds each key once, and `k in seen` is answered by hashing (lesson 2.7) in one step, however many keys it holds.']],
              ['if k in seen:', ['Seen before: this row is a repeat. Its key goes on the report; the row is not kept.']],
              ['seen.add(k)', ['First time: remember the key, keep the row. The first copy wins, so the rows keep their order.']],
            ],
          },
        },
        { figure: 'DuplicateFinder', caption: 'One pass with a set against comparing every pair: the work for each as the table grows.' },
        { python: { program: 'dedupe', label: 'Step through dedupe in real Python' } },
        {
          write: {
            file: 'cleaning.py', fn: 'dedupe', forbid: [['drop_duplicates', 'Write it by hand.']],
            prompt: 'Write `dedupe(rows, key)`: the rows with only the first of each key kept, in order, and the list of keys seen again. Return the two as a pair: `return kept, repeated`.',
            starter: 'def dedupe(rows, key):\n    seen, kept, repeated = set(), [], []\n    # one pass: a key already seen is a repeat\n    return kept, repeated\n',
            cases: cases(C.dedupe, [[[{ id: 1 }, { id: 2 }, { id: 1 }, { id: 3 }, { id: 2 }], 'id'], [[...ROWS.slice(15, 20), ROWS[400]], 'order_id'], [[], 'id']]),
            hint: '`for row in rows:` take `k = row[key]`; `if k in seen: repeated.append(k)`, else `seen.add(k)` and `kept.append(row)`.',
          },
        },
        {
          derive: {
            title: 'Why not compare every pair?',
            intro: 'Without a set, you would compare each row with every other row.',
            steps: [
              { prompt: 'Row 1 is compared with the $n - 1$ rows after it, row 2 with $n - 2$, …, the last with none. The sum $(n-1) + (n-2) + \\dots + 1 + 0$ is how many comparisons, in terms of $n$?', answer: 'n*(n-1)/2', vars: { n: [2, 500] }, why: 'Pair the first term with the last, the second with the second-last: each pair adds to $n - 1$, and there are $n/2$ pairs. It is the number of ways to pick 2 rows out of $n$, $\\binom{n}{2}$.' },
              { prompt: 'For the 402 rows, how many comparisons is that?', number: C.pairwiseComparisons(402), compute: () => C.pairwiseComparisons(402), why: `${C.pairwiseComparisons(402).toLocaleString('en-GB')} comparisons, against 402 set lookups. Doubling the rows doubles the set's work and quadruples the pairs'.` },
            ],
          },
        },
        {
          predict: {
            prompt: 'After `dedupe(rows, "order_id")`, how many rows are left?',
            answer: KEPT.length, compute: () => C.dedupe(ROWS, 'order_id')[0].length,
            explain: `${KEPT.length}, and the repeated keys are ${REPEATED.join(' and ')}: the two rows the generator copied. Every count from here on uses the ${KEPT.length}.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=ROWS(UNIQUE(A2:A403))', must: ['UNIQUE'],
            prompt: 'In the spreadsheet: how many different order ids are there? `UNIQUE(range)` keeps the first of each value; `ROWS` counts what is left.',
            hint: '`=ROWS(UNIQUE(A2:A403))`',
            explain: `${sheet('=ROWS(UNIQUE(A2:A403))')}. To *see* the repeats, put \`=COUNTIF(A$2:A$403,A2)>1\` beside the data and fill it down: TRUE marks both copies of each repeated id. (The $ keeps the range fixed as the formula is filled down.)`,
          },
        },
        {
          choice: {
            prompt: 'Two rows share the order id A1500, but one says Bike and £450, the other Lock and £30. What should deduplication do?',
            options: [
              { text: 'Keep the first, as `dedupe` does.', why: 'That silently throws away a row that may be a real, different order. Keeping the first is right only when the copies are identical.' },
              { text: 'Report a conflict: same key, different data. Someone has to decide which is right, or whether the key was mistyped.', why: 'Yes. An **exact duplicate** (every field the same) is safe to drop. A **conflict** means the key isn’t unique, or one row is wrong: a person must look. Check that the repeated rows are identical before dropping any; the shop’s two are.' },
              { text: 'Keep both: they are different.', why: 'Then the primary key isn’t unique, and every join on it (lesson 3.8) matches the wrong rows.' },
            ],
            answer: 1, verify: () => REPEATED.every(id => { const copies = ROWS.filter(r => r.order_id === id); return copies.length === 2 && JSON.stringify(copies[0]) === JSON.stringify(copies[1]) }),
          },
        },
      ],
    },

    {
      id: 'edit-distance', number: '3.4', title: 'Edit distance',
      goal: 'Define the distance between two words as the fewest single-letter edits, derive its recurrence, and fill the table that dynamic programming uses to compute it.',
      builds: ['duplicates'],
      blocks: [
        { h: 'How different are two words?' },
        { md: `The returns form (the **returns** sheet in the spreadsheet) was filled in by customers, and they typed the item names: ${RETURNS.slice(0, 4).map(r => `"${r.item}"`).join(', ')}. Cleaning can't fix these: "Hlemet" is not "Helmet" in any case or spacing. We need a way to say "Hlemet" is *close* to "Helmet" and far from "Bike".

The **edit distance** (Levenshtein, 1965) between two words is the fewest single-character edits that turn one into the other, where an edit is one of:
- **insert** a character ("Lck" → "Lock"),
- **delete** one ("Locck" → "Lock"),
- **substitute** one for another ("Servise" → "Service").` },
        {
          code: {
            file: 'data.py', fn: 'typo', caption: 'how the generator made the customers’ mistakes', notes: [
              ['kind = rng.below(6)', ['Six kinds, equally likely: four mistakes and, twice over, none.']],
              ['at = 1 + rng.below(len(text) - 2)', ['Never the first letter (people rarely get that wrong), and never the last, so a swap always has a letter after it.']],
              ['return text[:at] + text[at + 1:]', ['A letter dropped: one **delete** puts it right.']],
              ['return text[:at] + text[at] + text[at:]', ['A letter doubled: one **delete**.']],
              ['return text[:at] + text[at + 1] + text[at] + text[at + 2:]', ['Two letters swapped: is that one edit, or two? The predict below.']],
              ['return text.lower()', ['All lower case: one substitution for every capital, which is why `closest` (lesson 3.5) compares normalised text.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'What is the edit distance from "Hlemet" to "Helmet"? (The l and the e are swapped.)',
            answer: C.editDistance('Hlemet', 'Helmet'), compute: () => C.editDistance('Hlemet', 'Helmet'),
            explain: '2: swapping two letters isn’t one of the three edits, so it takes two substitutions (l → e, e → l). A variant called Damerau–Levenshtein counts a swap of neighbours as one edit; this lesson, and the spreadsheet’s LEVENSHTEIN, count it as two.',
            misconceptions: [{ answer: 1, feedback: 'A swap feels like one mistake, but it isn’t one of the three edits. Try it: which single insert, delete or substitution turns Hlemet into Helmet? None does.' }],
          },
        },
        { h: 'Solving it from the end' },
        { md: `There are too many ways to edit a word to try them all. The trick is to look at only the **last** character of each word. Write $D(i, j)$ for the distance from the first $i$ characters of $a$ to the first $j$ of $b$. Any cheapest way of editing ends in one of three ways:

- the last character of $a$ is **deleted**: cost $D(i-1, j) + 1$;
- the last character of $b$ is **inserted**: cost $D(i, j-1) + 1$;
- the last characters are **matched**, kept if equal (cost 0) or substituted (cost 1): $D(i-1, j-1) + [a_i \\ne b_j]$.

The best is the cheapest of the three:

$$D(i, j) = \\min\\big(D(i-1, j) + 1,\\; D(i, j-1) + 1,\\; D(i-1, j-1) + [a_i \\ne b_j]\\big)$$

with $D(i, 0) = i$ (delete everything) and $D(0, j) = j$ (insert everything). Each $D$ needs only smaller ones, so fill a table from the top left, row by row, and every value needed is already there. That is **dynamic programming**: solve every smaller problem once, keep the answers in a table, build the big answer from them.` },
        { figure: 'EditTable', caption: 'Fill the table cell by cell: each cell is the cheapest of its three neighbours (above + 1, left + 1, diagonal + 0 or 1). Then follow the path back from the corner to read the edits.' },
        {
          derive: {
            title: 'The table for “Lck” and “Lock”',
            intro: 'Rows are the letters of a = "Lck", columns the letters of b = "Lock". Row 0 is 0 1 2 3 4, and each row starts with its number.',
            steps: [
              { prompt: '$D(1, 1)$: "L" against "L". The diagonal is $D(0,0) = 0$ and the letters are equal. What is $D(1,1)$?', number: C.editTable('Lck', 'Lock').table[1][1], compute: () => C.editTable('Lck', 'Lock').table[1][1], why: '$\\min(D(0,1) + 1, D(1,0) + 1, D(0,0) + 0) = \\min(2, 2, 0) = 0$.' },
              { prompt: '$D(2, 3)$: "Lc" against "Loc". Its neighbours are $D(1,3) = 2$ above, $D(2,2) = 1$ to the left, and $D(1,2) = 1$ on the diagonal, and the last letters (c, c) are equal. What is $D(2,3)$?', number: C.editTable('Lck', 'Lock').table[2][3], compute: () => C.editTable('Lck', 'Lock').table[2][3], why: '$\\min(2 + 1, 1 + 1, 1 + 0) = 1$: match the c’s, at the cost of making "L" into "Lo", one insert.' },
              { prompt: 'The whole distance, $D(3, 4)$?', number: C.editDistance('Lck', 'Lock'), compute: () => C.editDistance('Lck', 'Lock'), why: 'One insert (the o). The corner holds the answer for the whole words.' },
              { prompt: 'How many cells does the table for words of lengths $m$ and $n$ have?', answer: '(m+1)*(n+1)', vars: { m: [0, 30], n: [0, 30] }, why: 'Row 0 and column 0 are the empty prefix. Each cell takes a few steps, so the work grows like $m \\times n$: fine for words, too slow for whole books (which need cleverer methods).' },
            ],
          },
        },
        {
          code: {
            file: 'cleaning.py', fn: 'edit_distance', notes: [
              ['table = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]', ['$m + 1$ rows of $n + 1$ zeros. Each row is a new list: `[[0] * k] * r` would make every row the same list.']],
              ['table[i][0] = i', ['The first column: turning $i$ characters into nothing takes $i$ deletes.']],
              ['change = 0 if a[i - 1] == b[j - 1] else 1', ['Row $i$ is about the $i$-th character, which Python numbers $i - 1$.']],
              ['table[i][j] = min(table[i - 1][j] + 1,', ['Above + 1: delete. The next lines: left + 1 (insert), diagonal + change (keep or substitute).']],
              ['return table[len(a)][len(b)]', ['The bottom-right corner: the distance between the whole words.']],
            ],
          },
        },
        { python: { program: 'edit_distance', label: 'Step through edit_distance in real Python, and watch the table fill' } },
        {
          write: {
            file: 'cleaning.py', fn: 'edit_distance', forbid: [['import', 'Write it yourself.']],
            prompt: 'Write `edit_distance(a, b)`: the table of $(m+1) \\times (n+1)$ cells, row 0 and column 0 filled in, then every other cell from the recurrence; return the corner.',
            starter: 'def edit_distance(a, b):\n    table = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]\n    # the first row and column, then each cell from its three neighbours\n    return table[len(a)][len(b)]\n',
            cases: cases(C.editDistance, [['Lck', 'Lock'], ['kitten', 'sitting'], ['Hlemet', 'Helmet'], ['', 'abc'], ['same', 'same'], ['Lights, fron tand back', 'Lights, front and back']]),
            hint: 'Fill `table[i][0] = i` and `table[0][j] = j`. Then for `i` from 1 to `len(a)` and `j` from 1 to `len(b)`: `change = 0 if a[i - 1] == b[j - 1] else 1` and `table[i][j] = min(table[i - 1][j] + 1, table[i][j - 1] + 1, table[i - 1][j - 1] + change)`.',
          },
        },
        {
          formula: {
            table: 'orders', solution: '=LEVENSHTEIN(returns!C2,"Helmet")', must: ['LEVENSHTEIN'],
            prompt: 'The Spreadsheet Lab has edit distance as a function: `LEVENSHTEIN(text1, text2)`. Find the distance from the first item typed on the returns form (`returns!C2`, on the returns sheet) to "Helmet".',
            hint: '`=LEVENSHTEIN(returns!C2,"Helmet")`',
            explain: `${sheet('=LEVENSHTEIN(returns!C2,"Helmet")')}, as you predicted. LEVENSHTEIN was added to the Spreadsheet Lab for this lesson; Excel and Google Sheets don’t have it (a file using it shows #NAME? there). Its third argument, TRUE, ignores capitals.`,
          },
        },
      ],
    },

    {
      id: 'fuzzy-matching', number: '3.5', title: 'Fuzzy matching',
      goal: 'Match typed names to a list by the smallest edit distance, choose a threshold that grows with the length of the word, and find the matches it gets wrong.',
      builds: ['edit-distance'],
      blocks: [
        { h: 'The nearest name in the list' },
        { md: `To read each item on the returns form, compare it with every item in the catalogue and take the one with the smallest edit distance. Compare the normalised texts (lesson 3.1), so "inner tube" and "Inner tube" are distance 0, not 1.

But "nearest" always finds something. A customer who wrote "Pmup" (pump, swapped) or "Look" (a typo for Lock, or a word that isn't an item at all?) still gets a nearest item. A **threshold** says how far is too far: beyond it, the answer is "no match", and a person looks.` },
        {
          derive: {
            title: 'Why the threshold must grow with the word',
            intro: 'Suppose the rule were “at most 2 edits”.',
            steps: [
              { prompt: 'Edit distance from "Bike" to "Lock"?', number: C.editDistance('Bike', 'Lock'), compute: () => C.editDistance('Bike', 'Lock'), why: 'All four letters differ: 4 substitutions. Fine, too far.' },
              { prompt: 'Edit distance from "Lck" to "Bike"?', number: C.editDistance('Lck', 'Bike'), compute: () => C.editDistance('Lck', 'Bike'), why: 'Three. But a different short word, "Bk", is only 2 from "Bike": short words are a few edits from many other short words. In a 22-letter name, 2 edits is a small slip; in a 3-letter one it is two thirds of the word.' },
              { prompt: 'So scale it: allow edits up to a share of the longer word’s length. With the share 0.34, how many edits are allowed between two words whose longer one has 22 letters?', number: 0.34 * 22, compute: () => 0.34 * 22, tolerance: 1e-9, why: 'Up to 7 edits for a long name like "Lights, front and back"; for "Lock" (4 letters), at most 1.36, so 1.' },
            ],
          },
        },
        {
          code: {
            file: 'cleaning.py', fn: 'closest', notes: [
              ['d = edit_distance(normalise(text), normalise(choice))', ['Normalised first: capitals and spaces are cleaning’s job, not a typo’s.']],
              ['if best_d is None or d < best_d:', ['Strictly smaller: on a tie, the first choice in the list is kept.']],
              ['if best is None or best_d > most * max(len(normalise(text)), len(normalise(best))):', ['Too far for its length: no match. `best is None` covers an empty list of choices.']],
            ],
          },
        },
        { figure: 'FuzzyMatcher', caption: 'Every item on the returns form, matched to the catalogue. Move the threshold: too low and real typos go unmatched; too high and nonsense finds a home. Type your own words.' },
        {
          write: {
            file: 'cleaning.py', fn: 'closest', given: ['normalise', 'edit_distance'], prelude: 'import unicodedata', forbid: [['difflib', 'Write it with your edit_distance.']],
            prompt: 'Write `closest(text, choices, most=0.34)`: the choice with the smallest edit distance from `text` (both normalised), and that distance, as a list `[choice, distance]`. If the best distance is more than `most` times the longer word’s length (normalised), return `[None, distance]`.',
            starter: 'def closest(text, choices, most=0.34):\n    best, best_d = None, None\n    # the nearest choice, then: too far for its length?\n    return [best, best_d]\n',
            cases: cases(C.closest, [['Hlemet', ITEMS], ['inner tube', ITEMS], ['Pmup', ITEMS], ['Look', ITEMS], ['Lck', ITEMS], ['x', []]]),
            hint: 'Loop: `d = edit_distance(normalise(text), normalise(choice))`; keep it if `best_d is None or d < best_d`. After the loop, check `best is None or best_d > most * max(len(normalise(text)), len(normalise(best)))`.',
          },
        },
        {
          predict: {
            prompt: `How many of the ${RETURNS.length} items typed on the returns form are not exactly a catalogue name, before \`closest\` reads them?`,
            answer: RETURN_TYPOS, compute: () => RETURNS.filter((r, k) => r.item !== C.closest(r.item, ITEMS)[0]).length,
            explain: `${RETURN_TYPOS}, and \`closest\` matches every one of them to the item the customer really returned (the generator kept the truth: parity.test.js checks it). The furthest are 2 edits away: swapped letters.`,
          },
        },
        {
          choice: {
            prompt: '`closest("Look", ITEMS)` gives `["Lock", 1]`. Is that right?',
            options: [
              { text: 'Yes: one edit is clearly a typo.', why: 'Maybe. But "Look" is also a real English word, perhaps a customer writing “Look, the light is broken”. Distance alone can’t know.' },
              { text: 'It can’t be known from the text: a match within the threshold is a good guess, not a fact. Keep the distance in the report, and have a person check the doubtful ones.', why: 'Yes. Fuzzy matching gives *candidates*. Real pipelines keep the score with each match and send the borderline ones for review, and the threshold is set by checking a sample against the truth, as the figure does.' },
              { text: 'No: a match must be exact.', why: 'Then all the typos on the form go unmatched, and the returns report counts them as unknown items.' },
            ],
            answer: 1,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=INDEX(catalogue!A2:A8,XMATCH(MIN(LEVENSHTEIN(returns!C9,catalogue!A2:A8)),LEVENSHTEIN(returns!C9,catalogue!A2:A8)))', must: ['LEVENSHTEIN', 'XMATCH', 'INDEX'],
            prompt: 'Read the item typed in `returns!C9` in a spreadsheet: `LEVENSHTEIN(returns!C9, catalogue!A2:A8)` gives its distance to each catalogue item (seven numbers); `MIN` the smallest; `XMATCH` its position among the seven; `INDEX` the catalogue name at that position.',
            hint: '`=INDEX(catalogue!A2:A8,XMATCH(MIN(LEVENSHTEIN(returns!C9,catalogue!A2:A8)),LEVENSHTEIN(returns!C9,catalogue!A2:A8)))`',
            explain: `"${sheet('=INDEX(catalogue!A2:A8,XMATCH(MIN(LEVENSHTEIN(returns!C9,catalogue!A2:A8)),LEVENSHTEIN(returns!C9,catalogue!A2:A8)))')}", from "${RETURNS[7].item}". The same steps as \`closest\`, without the threshold: add \`IF(MIN(…) > 0.34*LEN(…), "no match", …)\` for that.`,
          },
        },
      ],
    },

    {
      id: 'filling-gaps', number: '3.6', title: 'Filling the gaps',
      goal: 'Derive what filling missing values with the mean does to the mean and the variance, simulate the three ways values go missing with the truth known, and fill within groups.',
      builds: ['fuzzy-matching'],
      blocks: [
        { h: 'Drop or fill?' },
        { md: `${MISSING} prices are blank. Lesson 1.4 skipped them when taking the mean. The other choice is to **fill** (impute) each gap with a guess. Which is right depends on *why* the values are missing, and the shop's generator lets us test it honestly: it recorded the real price of every order it blanked, so we can hide prices on purpose and score each method against the truth.` },
        { h: 'Filling with the mean' },
        { md: 'The simplest fill puts the mean of the values present into every gap. It feels harmless. It leaves the mean exactly where it was, and it shrinks the spread.' },
        {
          derive: {
            title: 'What filling with the mean does',
            intro: 'There are $n$ rows; $m$ have a value, with mean $\\bar x$ and sample variance $s^2 = \\frac{1}{m-1}\\sum (x_i - \\bar x)^2$. Fill the other $n - m$ with $\\bar x$.',
            steps: [
              { prompt: 'The new total is $m\\bar x + (n - m)\\bar x$. Divided by $n$, the new mean is what, in terms of $\\bar x$ (write it as x)?', answer: 'x', vars: { x: [-100, 100] }, why: '$n\\bar x / n = \\bar x$: unchanged.' },
              { prompt: 'Each filled value is exactly at the mean, so it adds 0 to $\\sum (x_i - \\bar x)^2$. The sum of squares is still $(m - 1)s^2$, but now it is divided by $n - 1$. The new variance, in terms of $s^2$ (write s), $m$ and $n$?', answer: 's*(m-1)/(n-1)', vars: { s: [0.1, 100], m: [2, 50], n: [51, 100] }, why: '$\\frac{(m-1)s^2}{n-1}$: smaller than $s^2$ whenever anything was filled.' },
              { prompt: `For the shop's prices, cleaned: ${SEEN.length} present out of ${CLEAN.length}. By what factor does filling with the mean multiply the variance?`, number: (SEEN.length - 1) / (CLEAN.length - 1), compute: () => S.variance(FILLED) / S.variance(SEEN), tolerance: 1e-9, why: `${((SEEN.length - 1) / (CLEAN.length - 1)).toFixed(4)}, and the engine’s two variances give exactly that ratio. A small change here, but fill a third of a column and its spread drops by a third: every interval and test built on it (Part 7) becomes falsely confident.` },
            ],
          },
        },
        {
          formula: {
            table: 'orders', solution: '=VAR.S(IF(E2:E403="",AVERAGE(E2:E403),E2:E403))', must: ['VAR.S', 'IF'],
            prompt: 'Fill the gaps with the mean, then take the variance, in one formula: `IF(E2:E403="", AVERAGE(E2:E403), E2:E403)` gives the column with each blank replaced by the mean. Wrap it in `VAR.S`. Compare with `=VAR.S(E2:E403)`.',
            hint: '`=VAR.S(IF(E2:E403="",AVERAGE(E2:E403),E2:E403))`',
            explain: `${sheet('=VAR.S(IF(E2:E403="",AVERAGE(E2:E403),E2:E403))').toFixed(1)}, against ${sheet('=VAR.S(E2:E403)').toFixed(1)} with the blanks skipped: a factor of ${(sheet('=VAR.S(IF(E2:E403="",AVERAGE(E2:E403),E2:E403))') / sheet('=VAR.S(E2:E403)')).toFixed(4)} = 383/401, the derivation’s $(m-1)/(n-1)$ (this sheet is the raw data: 384 prices in 402 rows).`,
          },
        },
        { h: 'Why values go missing' },
        { md: `Statisticians name three mechanisms (Rubin, 1976):

- **Missing completely at random (MCAR):** every value has the same chance of being lost, like a page of the order book spilt on. The values present are a fair sample.
- **Missing at random (MAR):** the chance depends only on something we *can* see. Say bike prices are lost three times as often, because bikes are sold on a different form. Overall the present prices are no longer fair (too few bikes), but *within each item* they are.
- **Missing not at random (MNAR):** the chance depends on the missing value itself. Say prices above the list price are left blank because a discount was being argued about. Nothing we can see tells us which are gone.` },
        { figure: 'MissingnessLab', caption: 'Hide 20% of the true prices by each mechanism, then handle the gaps three ways. Each error is averaged over 200 repeats, against the truth the generator kept.' },
        {
          predict: {
            prompt: 'With bikes three times as likely to lose their price (MAR) and 20% hidden overall, by how many pounds is the mean of the remaining prices off, on average? (Type a negative number if it is too low.)',
            answer: EXPERIMENT.mar.drop.error, compute: () => C.missingnessExperiment('mar', 0.2, 400).drop.error, tolerance: 1,
            explain: `About ${money(EXPERIMENT.mar.drop.error)} (measured: 400 repeats), against a true mean of ${money(EXPERIMENT.mar.truth.mean)}. Losing bikes, the most expensive item, drags the mean down. Filling with the mean can’t help: it puts back the same too-low number. Filling **within each item** brings the error to ${money(EXPERIMENT.mar.group.error)}: under MAR, the item explains the gaps.`,
            misconceptions: [{ answer: 0, tolerance: 2, feedback: 'That is MCAR: when every price has the same chance, the rest are a fair sample. Here the lost ones are mostly bikes.' }],
          },
        },
        {
          code: {
            file: 'cleaning.py', fn: 'fill_missing', notes: [
              ['return [value if v is None else v for v in values]', ['Every gap gets the same value.']],
            ],
          },
        },
        {
          code: {
            file: 'cleaning.py', fn: 'fill_by_group', notes: [
              ['if row[column] is not None:', ['First pass: a sum and a count for each group, over the values present (a group-by, lesson 2.7).']],
              ['new = dict(row)', ['A copy: the original rows are not changed, so the raw data is still there to compare.']],
              ['if new[column] is None and counts.get(row[key], 0) > 0:', ['A gap in a group that has some values: fill it with that group’s mean. A group with none stays a gap.']],
            ],
          },
        },
        {
          write: {
            file: 'cleaning.py', fn: 'fill_by_group',
            prompt: 'Write `fill_by_group(rows, column, key)`: new rows (copies) with each `None` in `column` replaced by the mean of that column over the rows with the same `key`. A group with no values keeps its `None`.',
            starter: 'def fill_by_group(rows, column, key):\n    sums, counts = {}, {}\n    # a sum and count for each group, then fill each gap from its group\n    return [dict(row) for row in rows]\n',
            cases: cases(C.fillByGroup, [[[{ item: 'Lock', price: 30 }, { item: 'Lock', price: null }, { item: 'Bike', price: null }, { item: 'Lock', price: 32 }], 'price', 'item'], [CLEAN.slice(0, 40).map(r => ({ item: r.item, price: r.price === null ? null : r.price / 100 })), 'price', 'item']]),
            hint: 'First loop: for rows whose value isn’t `None`, add it to `sums[row[key]]` and 1 to `counts[row[key]]`. Second loop: copy the row; if its value is `None` and its group has a count, set it to `sums[k] / counts[k]`.',
          },
        },
        {
          write: {
            file: 'frames.py', fn: 'filled_prices', packages: ['pandas'], prelude: 'import pandas as pd',
            prompt: 'The same in pandas: `frame.groupby("item")["price"].transform("mean")` gives every row the mean price of its item (a column as long as the frame); `.fillna(that)` uses it only where the price is missing. Return the prices as a list of floats.',
            starter: 'def filled_prices(rows):\n    frame = pd.DataFrame(rows)\n    # each item\'s mean on every row, then fill the gaps with it\n    return []\n',
            cases: cases(C.filledPrices, [[[{ item: 'Lock', price: 30 }, { item: 'Lock', price: null }, { item: 'Bike', price: 450 }, { item: 'Lock', price: 32 }]], [CLEAN.slice(0, 60).map(r => ({ item: r.item, price: r.price === null ? null : r.price / 100 }))]]),
            hint: '`group_mean = frame.groupby("item")["price"].transform("mean")`, then `[float(p) for p in frame["price"].fillna(group_mean)]`.',
          },
        },
        {
          choice: {
            prompt: 'Under MNAR (prices above list left blank), filling within each item still leaves the mean too low. Why can no fill fix it?',
            options: [
              { text: 'Because the item means are computed wrongly.', why: 'They are computed correctly, from the prices present. The trouble is which prices are present.' },
              { text: 'Because what decides a gap (the hidden price itself) leaves no trace in anything we can see: within each item, the present prices are the cheaper ones.', why: `Yes. Group filling cuts the error from ${money(EXPERIMENT.mnar.drop.error)} to ${money(EXPERIMENT.mnar.group.error)} (the item explains part of it), but the rest is invisible in the data. Only knowing *why* values go missing, from the people who collect them, can fix MNAR.` },
              { text: 'Because 20% is too many to fill.', why: 'The amount isn’t the problem: under MAR the same 20% is filled almost perfectly by item.' },
            ],
            answer: 1, verify: () => EXPERIMENT.mnar.group.error < -0.3 && Math.abs(EXPERIMENT.mar.group.error) < 0.3,
          },
        },
      ],
    },

    {
      id: 'joins', number: '3.7', title: 'Joins three ways',
      goal: 'Join two tables on a key with a loop inside a loop, with a dictionary, and by sorting both, count the work of each, and see why databases prefer the dictionary.',
      builds: ['filling-gaps'],
      blocks: [
        { h: 'Two tables, one key' },
        { md: `The orders say which item was sold; the **catalogue** says which category each item is in (bikes, kit, parts, workshop) and its list price. To total the takings by category, each order needs its item's category: a **join**. The column they share, \`item\`, is the catalogue's **primary key** (one row per item) and, in the orders, a **foreign key**: a column that names a row of another table.

A join finds every pair of rows, one from each table, whose keys are equal, and merges each pair into one row. There are three classic ways to find the pairs.` },
        {
          code: {
            file: 'joins.py', fn: 'nested_loop_join', notes: [
              ['for b in right:', ['Every left row against every right row: the obvious way, and $n \\times m$ comparisons.']],
              ['out.append({**a, **b})', ['`{**a, **b}`: a new dictionary with the keys of both; where both have a column (the key itself), the right one’s value is kept, which is the same value.']],
            ],
          },
        },
        {
          code: {
            file: 'joins.py', fn: 'hash_join', notes: [
              ['index.setdefault(b[key], []).append(b)', ['Build: one pass over the right table, filing each row under its key. `setdefault` starts an empty list the first time a key is seen.']],
              ['for b in index.get(a[key], []):', ['Probe: one dictionary lookup per left row finds all its partners at once. No partner: an empty list, nothing added (an **inner** join drops it).']],
            ],
          },
        },
        {
          code: {
            file: 'joins.py', fn: 'sort_merge_join', notes: [
              ['lefts = sorted(left, key=lambda row: row[key])', ['Sort both by key: about $n \\log n + m \\log m$ comparisons.']],
              ['if lefts[i][key] < rights[j][key]:', ['Walk down both together, as merge sort merges (lesson 1.6): the smaller key can’t match anything further on the other side, so step past it.']],
              ['while k < len(rights) and rights[k][key] == lefts[i][key]:', ['Equal keys: every right row with this key matches this left row. `j` stays put, so the next left row with the same key finds them too.']],
            ],
          },
        },
        {
          code: {
            file: 'data.py', fn: 'make_catalogue', notes: [
              ['items = [(name, base) for name, base, _ in ITEMS] + [("Pump", 1800)]', ['The six items the orders were made from (lesson 1.1), and a pump that no order names: a catalogue row with no partner.']],
              ['return [[name, CATEGORIES[name], pounds(base)] for name, base in items]', ['One row per item: `item` is the key, so no name may appear twice.']],
            ],
          },
        },
        { figure: 'JoinRace', caption: 'The three joins on the same tables, their work counted. Change the size of each table and see which grows how.' },
        {
          derive: {
            title: 'The work of each join',
            intro: `Join the ${KEPT.length} orders (n) to the ${CATALOGUE.length} catalogue rows (m).`,
            steps: [
              { prompt: 'Nested loops compare every pair. How many comparisons?', number: COSTS.nested, compute: () => C.joinCosts(KEPT, CATALOGUE, 'item').nested, why: `$n \\times m = ${KEPT.length} \\times ${CATALOGUE.length}$.` },
              { prompt: 'The hash join files each right row once and looks each left row up once. How many steps?', number: COSTS.hash, compute: () => C.joinCosts(KEPT, CATALOGUE, 'item').hash, why: `$n + m$: ${COSTS.hashProbe} lookups and ${COSTS.hashBuild} filings. A dictionary lookup is one step on average, whatever its size (lesson 2.7).` },
              { prompt: 'The sort-merge join: sorting the orders by item with merge sort took how many comparisons (the figure counts them)?', number: COSTS.sortLeft, compute: () => C.joinCosts(KEPT, CATALOGUE, 'item').sortLeft, why: `${COSTS.sortLeft}, about $n \\log_2 n$, before the walk even starts; ${COSTS.sortMerge} in all. Sorting pays off when the tables are already sorted (an index, Part 10), or too big for a dictionary in memory: then both are sorted on disk and walked once.` },
            ],
          },
        },
        {
          write: {
            file: 'joins.py', fn: 'hash_join', forbid: [['merge(', 'Write the join yourself.']],
            prompt: 'Write `hash_join(left, right, key)`: first a dictionary from each key to the list of right rows with it; then, for each left row, one merged row `{**a, **b}` for every right row under its key. Keep the left rows’ order.',
            starter: 'def hash_join(left, right, key):\n    index = {}\n    # build: file each right row under its key; probe: look each left row up\n    return []\n',
            cases: cases(C.hashJoin, [[SMALL_LEFT, SMALL_RIGHT, 'id'], [CLEAN_PRICED.slice(0, 25).map(({ order_id, item }) => ({ order_id, item })), CATALOGUE, 'item'], [[], SMALL_RIGHT, 'id']]),
            hint: '`for b in right: index.setdefault(b[key], []).append(b)`; then `for a in left: for b in index.get(a[key], []): out.append({**a, **b})`.',
          },
        },
        {
          formula: {
            table: 'orders', solution: '=SUMPRODUCT(E2:E403,F2:F403,--(XLOOKUP(D2:D403,catalogue!A2:A8,catalogue!B2:B8)="kit"))', must: ['XLOOKUP', 'SUMPRODUCT'],
            prompt: 'The takings from kit, in the spreadsheet: `XLOOKUP(D2:D403, catalogue!A2:A8, catalogue!B2:B8)` joins every order to its category; compare with "kit"; `SUMPRODUCT` multiplies price × quantity × (1 or 0) on each row and adds it all up.',
            hint: '`=SUMPRODUCT(E2:E403,F2:F403,--(XLOOKUP(D2:D403,catalogue!A2:A8,catalogue!B2:B8)="kit"))`',
            explain: `${money(sheet('=SUMPRODUCT(E2:E403,F2:F403,--(XLOOKUP(D2:D403,catalogue!A2:A8,catalogue!B2:B8)="kit"))'))}. But this sheet is the *raw* data: the two lights typed in pence count as £2,375 and £2,575, and the duplicate orders count twice. On the cleaned orders, kit took ${money(REVENUE.kit)}. Clean before you join (lesson 3.10).`,
          },
        },
        {
          write: {
            file: 'frames.py', fn: 'revenue_by_category', packages: ['pandas'], prelude: 'import pandas as pd',
            prompt: 'In pandas: `pd.merge(orders, catalogue, on="item", validate="many_to_one")` joins them (and raises an error if an item appears twice in the catalogue); add a `takings` column, price × quantity; group by category and sum. Return a dictionary from category to a float.',
            starter: 'def revenue_by_category(orders, catalogue):\n    merged = pd.merge(pd.DataFrame(orders), pd.DataFrame(catalogue), on="item", validate="many_to_one")\n    # takings per row, then summed by category\n    return {}\n',
            cases: cases(C.revenueByCategory, [[CLEAN_PRICED.slice(0, 30).map(({ item, price, quantity }) => ({ item, price, quantity })), CATALOGUE], [CLEAN_PRICED.map(({ item, price, quantity }) => ({ item, price, quantity })), CATALOGUE]]),
            hint: '`merged["takings"] = merged["price"] * merged["quantity"]`, then `{c: float(t) for c, t in merged.groupby("category")["takings"].sum().items()}`.',
          },
        },
        {
          choice: {
            prompt: 'Which join does a database use to join the orders to the catalogue?',
            options: [
              { text: 'Always nested loops: they are simplest.', why: `Simplest, and ${COSTS.nested} comparisons here; for a million orders and a thousand items, a billion.` },
              { text: 'Its query planner picks one from the sizes: usually a hash join for a small table like this, sort-merge when both are huge or already sorted, nested loops when one side is tiny or indexed.', why: 'Yes. The planner estimates each join’s cost from the table sizes, exactly the counts you derived. Part 10 asks SQLite for its plan.' },
              { text: 'Always sort-merge: sorting is $n \\log n$.', why: `Sorting the orders alone took ${COSTS.sortLeft} comparisons here, more than the whole hash join.` },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'join-cardinality', number: '3.8', title: 'What a join does to rows',
      goal: 'Predict how many rows a join gives, find the join that counts an order twice, keep unmatched rows with a left join and list them with an anti-join.',
      builds: ['joins'],
      blocks: [
        { h: 'One, or many?' },
        { md: `Joining orders to the catalogue gave one row per order, because each order has exactly **one** catalogue row. That is a **many-to-one** join. Other joins are different:

- **one-to-one**: each key at most once on each side (an order and its delivery note);
- **one-to-many**: one order can have several returns;
- **many-to-many**: a key repeated on both sides, so every copy on the left meets every copy on the right.

How many rows a join makes is not a mystery; it can be counted before joining.` },
        {
          derive: {
            title: 'How many rows a join makes',
            intro: 'Say key $k$ appears $l_k$ times on the left and $r_k$ times on the right.',
            steps: [
              { prompt: 'Every left row with key $k$ is merged with every right row with key $k$. How many rows does key $k$ give?', answer: 'l*r', vars: { l: [0, 10], r: [0, 10] }, why: '$l_k \\times r_k$; the whole join gives $\\sum_k l_k r_k$, which `join_size` adds up without making the rows. A key on one side only gives $l_k \\times 0 = 0$: it vanishes from an inner join.' },
              { prompt: `The small tables below: the left has ids 1, 2, 3 (once each); the right has 2 once, 3 twice and 4 once. How many rows does the inner join give?`, number: C.joinSize(SMALL_LEFT, SMALL_RIGHT, 'id'), compute: () => C.joinSize(SMALL_LEFT, SMALL_RIGHT, 'id'), why: '$1 \\times 0 + 1 \\times 1 + 1 \\times 2 + 0 \\times 1 = 3$: id 1 vanishes, id 3 appears twice.' },
            ],
          },
        },
        {
          code: {
            file: 'joins.py', fn: 'join_size', notes: [
              ['size += counts.get(a[key], 0)', ['Each left row adds the number of right rows with its key: summed over the left rows, that is $\\sum_k l_k r_k$.']],
            ],
          },
        },
        {
          code: {
            file: 'data.py', fn: 'make_returns', caption: 'the returns form, and the truth behind it', notes: [
              ['order = orders[rng.below(400)] if k < n else orders[int(real_ids[3][1:]) - 1001]', ['Each return is for a real order, chosen at random, so some orders are returned twice by chance; the last is a second return for the order of the fourth, on purpose.']],
              ['typed = real.lower()', ['The kinds of mistake in a typed id: lower case, a space before it, ']],
              ['typed = real[:3] + real[4] + real[3]', ['two digits swapped (which may name a *different* real order), ']],
              ['typed = real[:2] + real[3:]', ['or a digit left out (which names none).']],
              ['real_ids.append(real)', ['The truth: which order each return really was. A real shop never has this list; the lab keeps it so every match can be checked.']],
            ],
          },
        },
        { figure: 'Cardinality', caption: 'Pick two of the shop’s tables, with their keys cleaned or not: how many rows go in, how many come out, and which keys are lost or repeated.' },
        { h: 'Keys must be cleaned too' },
        { md: `On the returns form, customers typed the order ids: some in lower case ("a1339"), some with a space first (" A1160"). An exact join loses those. So the keys are cleaned first, with lesson 3.1's \`normalise\` and \`.upper()\`. Then an **anti-join**, the left rows whose key has no partner, lists the returns that still match no order.` },
        {
          code: {
            file: 'joins.py', fn: 'anti_join', notes: [
              ['keys = set(row[key] for row in right)', ['Every key on the right, in a set: one step to ask about each left row.']],
            ],
          },
        },
        {
          write: {
            file: 'joins.py', fn: 'anti_join',
            prompt: 'Write `anti_join(left, right, key)`: the left rows whose key appears nowhere in `right`, in their order.',
            starter: 'def anti_join(left, right, key):\n    # the keys on the right, then the left rows without one\n    return list(left)\n',
            cases: cases(C.antiJoin, [[SMALL_LEFT, SMALL_RIGHT, 'id'], [RETURNED.map(({ return_id, order_id }) => ({ return_id, order_id })), KEPT.map(({ order_id }) => ({ order_id })), 'order_id'], [SMALL_LEFT, [], 'id']]),
            hint: '`keys = set(row[key] for row in right)`, then `[row for row in left if row[key] not in keys]`.',
          },
        },
        {
          predict: {
            prompt: `With the order ids on the returns form cleaned, how many of the ${RETURNS.length} returns name no order at all?`,
            answer: NO_ORDER.length, compute: () => C.antiJoin(RETURNED, KEPT, 'order_id').length,
            explain: `${NO_ORDER.length}: ${NO_ORDER.map(r => `${r.return_id} ("${r.order_id}")`).join(', ')}, each with a digit left out. Without cleaning the keys, ${NO_ORDER_RAW.length} would fail. These go back to the shop to be looked up by hand.`,
            misconceptions: [{ answer: NO_ORDER_RAW.length, feedback: 'That is the count with the keys as typed. Clean them first: lower case and spaces aren’t real mistakes.' }],
          },
        },
        {
          formula: {
            table: 'orders', solution: '=FILTER(returns!A2:A26,ISNA(XMATCH(TRIM(returns!B2:B26),A2:A403)))', must: ['FILTER', 'XMATCH', 'TRIM'],
            prompt: 'The anti-join in the spreadsheet: `XMATCH(TRIM(returns!B2:B26), A2:A403)` looks for each return’s order id among the orders, giving #N/A where there is none; `ISNA` turns that into TRUE; `FILTER` keeps the return ids marked TRUE.',
            hint: '`=FILTER(returns!A2:A26,ISNA(XMATCH(TRIM(returns!B2:B26),A2:A403)))`',
            explain: `The same ${NO_ORDER.length}. Spreadsheet lookups ignore capitals, so "a1339" matches A1339 without help, but not spaces: without TRIM, ${sheet('=ROWS(FILTER(returns!A2:A26,ISNA(XMATCH(returns!B2:B26,A2:A403))))')} returns fail.`,
          },
        },
        { h: 'The join that counts an order twice' },
        {
          code: {
            file: 'joins.py', fn: 'left_join', notes: [
              ['blank = {name: None for row in right for name in row if name != key}', ['Every column the right table would bring, set to None: what an order with no return gets.']],
              ['for b in index.get(a[key], [blank]):', ['No partner: one row, with the blanks. Several partners: one row each, so an order returned twice becomes **two rows**.']],
            ],
          },
        },
        {
          predict: {
            prompt: `Left-join the ${KEPT.length} orders to the cleaned returns, to mark which were returned. How many rows come out?`,
            answer: ORDERS_RETURNS.length, compute: () => C.leftJoin(KEPT, RETURNED, 'order_id').length,
            explain: `${ORDERS_RETURNS.length}: orders ${TWICE.join(' and ')} were each returned twice, so each appears twice. Sum the takings over this table and those two orders count double. **Check the row count after every join**: if it grew, find out which keys repeat, and decide (count the returns per order first, then join one row per order).`,
            misconceptions: [{ answer: KEPT.length, feedback: 'A left join keeps every left row *at least* once. An order with two returns matches two rows.' }],
          },
        },
        {
          write: {
            file: 'frames.py', fn: 'unmatched', packages: ['pandas'], prelude: 'import pandas as pd',
            prompt: 'In pandas: `pd.merge(left, right_keys, on=key, how="left", indicator=True)` adds a column `_merge` saying `both` or `left_only` for each row. Use only the right table’s key column, without repeats (`[[key]].drop_duplicates()`), so the merge can’t multiply rows. Return the keys of the `left_only` rows, as a list.',
            starter: 'def unmatched(left, right, key):\n    right_keys = pd.DataFrame(right)[[key]].drop_duplicates()\n    # a left merge with indicator=True, then the left_only rows\n    return []\n',
            cases: cases(C.unmatched, [[SMALL_LEFT, SMALL_RIGHT, 'id'], [RETURNED.map(({ return_id, order_id }) => ({ return_id, order_id })), KEPT.map(({ order_id }) => ({ order_id })), 'order_id']]),
            hint: '`merged = pd.merge(pd.DataFrame(left), right_keys, on=key, how="left", indicator=True)`, then `merged.loc[merged["_merge"] == "left_only", key].tolist()` (tolist gives plain Python values).',
          },
        },
        {
          choice: {
            prompt: `Return R01 names order A1079, which exists. But R01 says Helmet, and A1079 was a Lock (the customer swapped two digits of A1097). How could a pipeline catch it?`,
            options: [
              { text: 'The anti-join catches it.', why: 'No: A1079 exists, so the join succeeds. A wrong key that names a real row is the worst kind: it joins silently.' },
              { text: 'After joining, check the columns both tables know: the item on the return should be the item of the order. A rule run *after* the join.', why: `Yes. That catches ${MISMATCHED.map(r => r.return_id).join(', ')}. The other swapped id, R22 (A1356 for A1365), happens to name another service order, so no check on these columns can find it: the generator knows it is wrong, and nothing in the data does. Joins need checks on both sides of them.` },
              { text: 'Sort the returns by order id.', why: 'Sorting changes the order, not which rows match.' },
            ],
            answer: 1, verify: () => MISMATCHED.length === 1 && MISMATCHED[0].return_id === 'R01',
          },
        },
      ],
    },

    {
      id: 'tidy-data', number: '3.9', title: 'Tidy data: wide and long',
      goal: 'Say what makes a table tidy, turn a wide table long by hand and with pandas’ melt, and count the rows a reshape makes.',
      builds: ['join-cardinality'],
      blocks: [
        { h: 'One row per observation' },
        { md: `The orders are **tidy** (Wickham, 2014): each row is one observation (an order), each column one variable (date, town, item…), each cell one value. Tidy tables are what group-by, joins and charts expect.

People like **wide** tables for reading: one row per town, one column per month. That is lesson 2.8's pivot table. It is easy to read, and awkward to compute with: "the month" is no longer a column you can filter or group by; it is spread over column names. Turning a wide table **long** puts it back: one row per (town, month) with the count in a value column.` },
        { figure: 'WideLong', caption: 'The orders per town in the first three months, wide and long. The same numbers; switch between the shapes.' },
        {
          code: {
            file: 'joins.py', fn: 'to_long', notes: [
              ['if column != id_column:', ['Every column except the id becomes rows: the column’s name goes into `name`, its value into `value`.']],
              ['out.append({id_column: row[id_column], name: column, value: v})', ['One long row per cell of the wide table, carrying the id it belongs to.']],
            ],
          },
        },
        {
          derive: {
            title: 'How long the long table is',
            intro: 'A wide table has $r$ rows and, besides its id, $c$ value columns.',
            steps: [
              { prompt: 'How many rows does the long table have?', answer: 'r*c', vars: { r: [1, 50], c: [1, 50] }, why: 'One per value cell: $r \\times c$. Going back (a pivot) needs every (id, column) pair once; a pair twice is the many-to-many trouble of lesson 3.8, and a pivot must then aggregate.' },
              { prompt: `The figure’s table: ${WIDE.length} towns, ${MONTHS.length} months. How many long rows?`, number: C.toLong(WIDE, 'town').length, compute: () => C.toLong(WIDE, 'town').length, why: `${WIDE.length} × ${MONTHS.length}.` },
            ],
          },
        },
        {
          write: {
            file: 'joins.py', fn: 'to_long',
            prompt: 'Write `to_long(rows, id_column, name="column", value="value")`: for each row, for each column other than the id, one new row holding the id, the column’s name (under `name`) and its value (under `value`).',
            starter: 'def to_long(rows, id_column, name="column", value="value"):\n    out = []\n    # one row for each value cell\n    return out\n',
            cases: cases(C.toLong, [[WIDE, 'town'], [[{ id: 'a', x: 1, y: 2 }], 'id', 'axis', 'n'], [[], 'id']]),
            hint: '`for row in rows: for column, v in row.items(): if column != id_column: out.append({id_column: row[id_column], name: column, value: v})`',
          },
        },
        {
          write: {
            file: 'frames.py', fn: 'melted', packages: ['pandas'], prelude: 'import pandas as pd',
            prompt: 'pandas calls it `melt`: `pd.melt(frame, id_vars=[id_column], var_name="column", value_name="value")`. Return `long.to_dict("records")`. (For a table with gaps, the lab’s version also turns pandas’ NaN back into None.) Notice the order of its rows: melt goes column by column, where `to_long` goes row by row.',
            starter: 'def melted(rows, id_column):\n    frame = pd.DataFrame(rows)\n    # melt, then the records\n    return []\n',
            cases: cases(C.melted, [[WIDE, 'town'], [[{ id: 'a', x: 1, y: 2 }, { id: 'b', x: 3, y: 4 }], 'id']]),
            hint: '`long = pd.melt(frame, id_vars=[id_column], var_name="column", value_name="value")`, then `return long.to_dict("records")`.',
          },
        },
        {
          choice: {
            prompt: 'You must chart orders per month for each town, one line per town. Which shape does the chart want?',
            options: [
              { text: 'Wide: one column per town.', why: 'Spreadsheets’ line charts take that shape (one series per column), so for a quick spreadsheet chart, yes. But adding a fifth town then means a new column and a new series.' },
              { text: 'Long: one row per (town, month, count). The town is a variable, mapped to colour; the month to x; the count to y.', why: 'Yes: that is how D3 and most charting libraries think (Part 4). Every visual channel is one column of a tidy table, and a new town is just more rows.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'clean-year', number: '3.10', title: 'Project: the clean year',
      goal: 'Put the cleaning steps in the right order as one function, and redo every count of Parts 1 and 2 on the clean orders.',
      builds: ['tidy-data'],
      blocks: [
        { h: 'The steps, in order' },
        { md: `Each fix of Part 3 is a function; together they are a **pipeline**. The order matters:

1. **Duplicates first**, by the raw order id: the copies are identical as typed, so they are found before anything changes them. (Cleaning the towns first would be harmless here, but a fix that changed only one copy would hide a duplicate.)
2. **Towns** cleaned, so every group-by has four towns.
3. **Prices** turned into whole pence and checked against the list price, which needs the item, so after the item is known to be valid.
4. The quantity as a number.

Missing prices are *not* filled: lesson 3.6 showed filling changes the spread, so each later lesson decides for itself, and says so.` },
        {
          code: {
            file: 'cleaning.py', fn: 'clean_orders', notes: [
              ['kept, _ = dedupe(rows, "order_id")', ['`_` is the usual name for a value you don’t need: here, the list of repeated keys.']],
              ['new["price"] = fix_pence(row["price"], list_prices[row["item"]])', ['The list price comes from the catalogue, joined by item (a dictionary: lesson 3.7’s hash join, for one column).']],
            ],
          },
        },
        {
          write: {
            file: 'cleaning.py', fn: 'clean_orders', given: ['normalise', 'clean_town', 'fix_pence', 'dedupe'], also: [['tables.py', 'to_pence']], prelude: 'import unicodedata',
            prompt: 'Write `clean_orders(rows, list_prices)`: dedupe by `"order_id"`; then for each row kept, a copy with the town cleaned, the price fixed with `fix_pence` against `list_prices[row["item"]]`, and the quantity as an `int`.',
            starter: 'def clean_orders(rows, list_prices):\n    kept, _ = dedupe(rows, "order_id")\n    out = []\n    # a cleaned copy of each row\n    return out\n',
            cases: cases(C.cleanOrders, [[[ROWS[17], ROWS[156], ROWS[3], ROWS[400], ROWS[220]], LIST], [ROWS.slice(0, 30), LIST]]),
            hint: 'For each `row` in `kept`: `new = dict(row)`, then `new["town"] = clean_town(row["town"])`, `new["price"] = fix_pence(row["price"], list_prices[row["item"]])`, `new["quantity"] = int(row["quantity"])`.',
          },
        },
        { figure: 'CleanReport', caption: 'Every count and statistic of Parts 1 and 2 that the flaws touched, on the raw orders and on the clean ones.' },
        {
          predict: {
            prompt: 'Lesson 2.2: the mean price of lights was £82, pulled up by the two pence typos. On the clean orders, what is it (to the penny)?',
            answer: S.mean(LIGHTS_AFTER), compute: () => S.mean(CLEAN_PRICED.filter(r => r.item === 'Lights, front and back').map(r => r.price)), tolerance: 0.005,
            explain: `${money(S.mean(LIGHTS_AFTER))}, against ${money(S.mean(LIGHTS_BEFORE))} raw, and now close to the median (${money(S.median(LIGHTS_AFTER))}): the mean is trustworthy again. Lesson 2.6’s IQR rule now flags ${S.iqrOutliers(LIGHTS_AFTER).length} lights, where it flagged ${S.iqrOutliers(LIGHTS_BEFORE).length}.`,
            misconceptions: [{ answer: 25, tolerance: 0.1, feedback: 'That is the list price. The real prices are 90% to 110% of it, so their mean is near £25 but not exactly.' }],
          },
        },
        {
          predict: {
            prompt: `The year’s takings (price × quantity over the orders with a price), raw: ${money(takings(T.priced(ROWS)))}. Clean, how much?`,
            answer: takings(CLEAN_PRICED), compute: () => takings(C.cleanOrders(ROWS, LIST).filter(r => r.price !== null).map(r => ({ ...r, price: r.price / 100 }))), tolerance: 0.005,
            explain: `${money(takings(CLEAN_PRICED))}: ${money(takings(T.priced(ROWS)) - takings(CLEAN_PRICED))} less. Two typed prices and two repeated rows made the raw figure ${((takings(T.priced(ROWS)) / takings(CLEAN_PRICED) - 1) * 100).toFixed(0)}% too high. Missing prices are still left out of both: ${CLEAN.length - CLEAN_PRICED.length} orders, whose real takings only the generator knows.`,
          },
        },
        {
          choice: {
            prompt: 'Next month’s orders arrive. What do you do?',
            options: [
              { text: 'Fix them by hand in the spreadsheet, as before.', why: 'And next month again, slightly differently each time. Hand fixes can’t be checked or repeated.' },
              { text: 'Run `check_rows` on the new file, then `clean_orders`; look at whatever the rules report that the pipeline doesn’t already fix.', why: 'Yes. The rules catch the *new* kinds of mistake, the pipeline fixes the known ones the same way every time, and the raw file stays untouched beside the clean one.' },
              { text: 'Nothing: the data was cleaned once.', why: 'Every new file brings the same typing mistakes, and new ones.' },
            ],
            answer: 1,
          },
        },
        { note: 'From here on, the lab’s lessons use the clean orders: 400 of them, four towns, prices in whole pence, missing prices left missing. Part 4 draws them.', kind: 'key' },
      ],
    },
  ],
}
