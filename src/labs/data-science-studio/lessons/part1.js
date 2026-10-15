// Part 1: tables by hand. A table as rows and as columns, a CSV file read one character at a time,
// what a number is inside a computer, missing values, filtering, sorting, and pandas. Numbers come
// from the engine (engine/*.js, held to the Python by parity.test.js) or the spreadsheet engine;
// the speeds in 1.7 were measured when the lesson was written.
import * as T from '../engine/tables.js'
import * as S from '../engine/summary.js'
import * as N from '../engine/numbers.js'
import { ORDERS_CSV, HEADER } from '../engine/data.js'
import { evaluateFormula } from '../engine/sheet.js'

const cases = (fn, inputs) => inputs.map(args => ({ args, expected: fn(...args) }))
const ROWS = T.readCsv(ORDERS_CSV())
const NUMBERED = T.withNumbers(ROWS, ['price', 'quantity'])
const PRICED = NUMBERED.filter(r => r.price !== null)
const sheet = formula => evaluateFormula('orders', formula).value
const [MEAN_SKIP, MISSING] = T.meanOf(T.column(NUMBERED, 'price'))
const MEAN_ZERO = S.mean(T.column(NUMBERED, 'price').map(p => p ?? 0))
const LEEDS_WEB = T.whereAll(ROWS, { town: 'Leeds', channel: 'web' }).length
const TOWNS = Object.keys(T.countValues(T.column(ROWS, 'town'))).length
const PRICE_TEXT = ROWS.map(r => r.price).filter(Boolean)
const FLOAT_TOTAL = S.total(PRICE_TEXT.map(Number)), PENCE_TOTAL = PRICE_TEXT.map(T.toPence).reduce((a, b) => a + b, 0)
const LINE = 'A1004,2025-05-11,Harrogate,"Lights, front and back",25.00,1,shop'
const WEB = ROWS.filter(r => r.channel === 'web').length
const reversed = n => Array.from({ length: n }, (_, i) => n - i)
const smallRows = [{ k: 3, n: 0 }, { k: 1, n: 1 }, { k: 2, n: 2 }, { k: 1, n: 3 }]

export const PART1 = {
  id: 'part1', title: 'Part 1 · Tables by hand', lessons: [
    {
      id: 'table-rows', number: '1.1', title: 'A table is a list of rows',
      goal: 'Describe a table in its own words (rows, columns, fields, schema), hold one in Python as a list of dictionaries, and pull out and count a column.',
      builds: [],
      blocks: [
        { h: 'The shop’s year of orders' },
        { md: `Almost all data you will meet arrives as a **table**: a spreadsheet, a CSV file, a database query, the output of a sensor. This lab works on one table all the way through: a year of orders from a bike shop, ${ROWS.length} of them.

Each **row** is one thing that happened, here one order. Each **column** is one kind of fact about it: when, where, what, how much. A single cell is a **field**. The list of column names and what each one holds is the table's **schema**:

| Column | Holds | Example |
|---|---|---|
| order_id | a label for the order | A1004 |
| date | the day, written YYYY-MM-DD | 2025-05-11 |
| town | where the customer lives | Harrogate |
| item | what was bought | Lights, front and back |
| price | the price of one, in pounds | 25.00 |
| quantity | how many | 1 |
| channel | bought in the shop or on the web | shop |

The data was made by a program (below) so that the lab knows the truth behind it, including **mistakes put in on purpose**, like real data has. Finding them is part of the lessons.` },
        {
          code: {
            file: 'data.py', fn: 'make_orders', notes: [
              ['rng = Rng(seed)', ['A seeded random-number generator: the same seed gives the same orders every time, in Python and in the page.']],
              ['name, base, _ = ITEMS[pick(rng, [w for _, _, w in ITEMS])]', ['An item, chosen with its weight: helmets are bought more often than bikes.']],
              ['price = base * (90 + rng.below(21)) // 100', ['The usual price, give or take 10%, in whole pence (lesson 1.3 explains why pence).']],
              ['if flaw < 3:', ['About 3 orders in 100 lose their price…']],
              ['town = town.lower()', ['…4 in 100 have the town typed in lower case…']],
              ['town = town + " "', ['…2 in 100 have a space typed after it…']],
              ['price_text = str(price)', ['…and 1 in 100 has its price typed in pence instead of pounds.']],
              ['for k in [17, 233]:', ['And two orders were entered twice.']],
            ],
          },
        },
        { figure: 'TableView', caption: 'The same orders three ways: as Python dictionaries (one per row), as lists (one per column), and as a spreadsheet. Then count the values of any column.' },
        { h: 'Rows and columns in Python' },
        { md: `In Python, one row is a **dictionary** from column names to fields: \`{"order_id": "A1001", "town": "Wakefield", …}\`. The table is a **list** of those, in order. One column is then a list made by taking the same name from every row.` },
        {
          code: {
            file: 'tables.py', fn: 'column', notes: [
              ['return [row[name] for row in rows]', ['A **list comprehension**: for each row, in order, take `row[name]`. The result has one value per row, top to bottom.']],
            ],
          },
        },
        {
          write: {
            file: 'tables.py', fn: 'column',
            prompt: 'Write `column(rows, name)`: the list of every row’s value under `name`, in order.',
            starter: 'def column(rows, name):\n    values = []\n    # one value from each row\n    return values\n',
            cases: cases(T.column, [[ROWS.slice(0, 4), 'town'], [ROWS.slice(0, 3), 'price'], [[], 'item']]),
            hint: '`for row in rows: values.append(row[name])`, or the one-line comprehension `[row[name] for row in rows]`.',
          },
        },
        {
          code: {
            file: 'tables.py', fn: 'count_values', notes: [
              ['counts[v] = counts.get(v, 0) + 1', ['`counts.get(v, 0)` is the count so far, or 0 the first time `v` is seen. A dictionary finds `v` straight away, however many values it holds: lesson 2.7 explains how.']],
            ],
          },
        },
        {
          write: {
            file: 'tables.py', fn: 'count_values',
            prompt: 'Write `count_values(values)`: a dictionary from each value to how many times it appears, with the values in the order they were first seen.',
            starter: 'def count_values(values):\n    counts = {}\n    # add one to the count of each value\n    return counts\n',
            cases: cases(T.countValues, [[['Bike', 'Lock', 'Bike']], [T.column(ROWS.slice(0, 20), 'channel')], [[]]]),
            hint: '`counts[v] = counts.get(v, 0) + 1` for each `v`.',
          },
        },
        {
          derive: {
            title: 'The size of the table',
            intro: `${ROWS.length} orders, each with the ${HEADER.length} fields of the schema.`,
            steps: [
              { prompt: 'How many cells does the table have?', number: ROWS.length * HEADER.length, compute: () => ROWS.length * HEADER.length, why: `$${ROWS.length} \\times ${HEADER.length} = ${ROWS.length * HEADER.length}$: rows times columns.` },
              { prompt: 'A table with $r$ rows and $c$ columns: how many cells?', answer: 'r*c', vars: { r: [1, 1000], c: [1, 50] }, why: 'Every row has one field for every column.' },
              { prompt: 'How many orders are for a Bike?', number: T.countValues(T.column(ROWS, 'item')).Bike, compute: () => T.rowsWhere(ROWS, 'item', 'Bike').length, why: 'Read it from the counts in the figure: bikes are the least common item.' },
            ],
          },
        },
        {
          formula: {
            table: 'orders', solution: '=COUNTIF(D2:D403,"Bike")', must: ['COUNTIF'], sheet: 0,
            prompt: 'The same count in a spreadsheet. The items are in column D, rows 2 to 403 (row 1 holds the names). Count the cells that say Bike with `COUNTIF(range, value)`.',
            hint: '`=COUNTIF(D2:D403,"Bike")`: the range first, then the value to look for, in quotes.',
            explain: 'The Spreadsheet Lab’s engine read the 402 cells of D2:D403 and counted the matches: the same answer as `count_values`, from a different machine.',
          },
        },
        {
          predict: {
            prompt: 'The shop is in four towns: Leeds, York, Harrogate and Wakefield. How many *different* values does the town column hold? (Count them in the figure, with “town” chosen.)',
            answer: TOWNS, compute: () => Object.keys(T.countValues(T.column(ROWS, 'town'))).length,
            explain: `${TOWNS}: “leeds”, “Leeds ” (with a space) and “Leeds” are three different values to a computer. The mistakes put in on purpose show up as soon as you count. Part 3 cleans them; lesson 1.5 shows that a spreadsheet and Python even disagree about them.`,
            misconceptions: [{ answer: 4, feedback: 'Four towns, but count the *values*: some were typed differently. Choose “town” in the figure and read the list.' }],
          },
        },
        {
          choice: {
            prompt: 'Why keep a table as a list of rows at all, instead of one long list of fields?',
            options: [
              { text: 'Rows use less memory.', why: 'The fields are the same either way; the dictionaries even add their names to every row.' },
              { text: 'Each row keeps the facts of one order together, so a question about one order (or about orders that share something) is answered from its row.', why: 'Yes. The row is the unit you filter, sort and count. Lesson 1.7 shows the other way round, a list per column, and when that is better.' },
              { text: 'Because a CSV file has to be read that way.', why: 'A CSV file is read line by line, but you can store what you read either way. Lesson 1.7 stores it as columns.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'csv-by-hand', number: '1.2', title: 'Reading a CSV file by hand',
      goal: 'Read a line of a CSV file into its fields with a two-state machine, handling commas and quotes inside fields, and explain why splitting on commas gets it wrong.',
      builds: ['table-rows'],
      blocks: [
        { h: 'Comma-separated values' },
        { md: `A **CSV** file is a table written as plain text: one line per row, the fields separated by commas, the first line holding the column names. It is the most common way tables travel between programs. The first lines of the shop's file:

\`\`\`
${ORDERS_CSV().split('\n').slice(0, 5).join('\n')}
\`\`\`

The fourth line has a problem: the item **Lights, front and back** has a comma inside it. So the file puts that field in double quotes, and a comma inside quotes is part of the field, not a separator.` },
        {
          code: {
            file: 'data.py', fn: 'csv_field', notes: [
              ['if "," in text or \'"\' in text or "\\n" in text:', ['A field needs quotes if it holds a comma, a quote or a new line…']],
              ['return \'"\' + text.replace(\'"\', \'""\') + \'"\'', ['…and a quote inside it is written twice, so the reader can tell it from the closing quote.']],
            ],
          },
        },
        {
          predict: {
            prompt: `How many pieces does \`line.split(",")\` give for this line?\n\n\`${LINE}\``,
            answer: LINE.split(',').length, compute: () => LINE.split(',').length,
            explain: `${LINE.split(',').length}: the comma inside “Lights, front and back” splits the item in two, and every field after it moves one column to the right. The price would be read from “ front and back"…`,
            misconceptions: [{ answer: 7, feedback: 'Seven is the number of *fields*. Count the commas: `split` breaks at every one, including the one inside the quotes.' }],
          },
        },
        { h: 'A reader with two states' },
        { md: `Read the line one character at a time and remember one thing: are we **inside quotes** or not? That is a **state machine** with two states:

| State | Character | What happens |
|---|---|---|
| outside | \`,\` | the field ends; start a new one |
| outside | \`"\` | go inside quotes |
| outside | anything else | add it to the field |
| inside | \`""\` (two quotes) | add one \`"\` to the field, skip both |
| inside | \`"\` | go outside |
| inside | anything else, even \`,\` | add it to the field |

At the end of the line, the last field ends.` },
        { figure: 'CsvScanner', caption: 'Step through the reader. Red: the character it is looking at. Try a field with a doubled quote: `"say ""hi"""`.' },
        {
          code: {
            file: 'tables.py', fn: 'split_csv_line', notes: [
              ['fields, field, in_quotes, i = [], "", False, 0', ['The finished fields, the one being built, the state, and the position.']],
              ['if ch == \'"\' and i + 1 < len(line) and line[i + 1] == \'"\':', ['Inside quotes, two quotes in a row stand for one quote character…']],
              ['i += 1', ['…so skip the second one.']],
              ['elif ch == ",":', ['Outside quotes, a comma ends the field.']],
              ['fields.append(field)', ['The last field has no comma after it: it ends with the line.']],
            ],
          },
        },
        { python: { program: 'split_csv_line', label: 'Step through the reader in real Python' } },
        {
          write: {
            file: 'tables.py', fn: 'split_csv_line', forbid: [['.split(', 'Read the line one character at a time: `split` breaks inside quotes.'], ['import csv', 'Write the reader yourself; the csv module comes after.']],
            prompt: 'Write `split_csv_line(line)` from the table of states above: commas outside quotes end a field, quotes switch the state, two quotes inside quotes stand for one.',
            starter: 'def split_csv_line(line):\n    fields, field, in_quotes, i = [], "", False, 0\n    while i < len(line):\n        ch = line[i]\n        # the six rows of the table\n        i += 1\n    fields.append(field)\n    return fields\n',
            cases: cases(T.splitCsvLine, [[LINE], ['a,b,c'], ['"say ""hi""",x'], [',,'], ['']]),
            hint: 'Inside quotes: check for `""` first (add one quote, `i += 1`), then a single `"` (leave the quotes), else add the character. Outside: `"` enters quotes, `,` appends the field and starts a new one, anything else is added.',
          },
        },
        {
          code: {
            file: 'tables.py', fn: 'read_csv', notes: [
              ['header = split_csv_line(lines[0])', ['The first line holds the names.']],
              ['return [dict(zip(header, split_csv_line(line))) for line in lines[1:]]', ['`zip` pairs each name with the field in the same place; `dict` makes the row.']],
            ],
          },
        },
        {
          derive: {
            title: 'How many fields a line has',
            intro: 'Fields are separated by the commas outside quotes.',
            steps: [
              { prompt: `How many commas are outside quotes in the line above?`, number: 6, compute: () => T.splitCsvLine(LINE).length - 1, why: 'Six: the one inside “Lights, front and back” doesn’t count.' },
              { prompt: 'A line with $c$ commas outside quotes: how many fields?', answer: 'c+1', vars: { c: [0, 50] }, why: 'Each comma ends one field, and the line’s end ends the last: $c + 1$. Even an empty line has one (empty) field.' },
            ],
          },
        },
        {
          choice: {
            prompt: 'A field holds the text `say "hi"`. How must it appear in the CSV file?',
            options: [
              { text: '`say "hi"`', why: 'The reader would go inside quotes at the first `"` and out at the second: the quotes would vanish.' },
              { text: '`"say ""hi"""`', why: 'Yes: quotes around the field, and each quote inside written twice. The reader turns each `""` back into one.' },
              { text: '`"say \\"hi\\""`', why: 'A backslash is how many programming languages escape a quote, but CSV doubles it instead.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'numbers-inside', number: '1.3', title: 'Numbers inside a computer',
      goal: 'Explain why 0.1 + 0.2 is not 0.3 in Python and in spreadsheets, work out 0.1 in binary, and keep money exact by counting whole pence.',
      builds: ['csv-by-hand'],
      blocks: [
        { h: 'Text, then a number' },
        { md: `Every field read from a CSV file is **text**: "25.00" is four characters, and \`"25.00" + "1"\` is "25.001". To do arithmetic, text is turned into a **number**. Python's \`float("25.00")\` gives 25.0, a **floating-point number**. That word hides a surprise.` },
        { h: 'Fractions in binary' },
        { md: `A computer stores numbers in binary. Whole numbers are exact: $13 = 8 + 4 + 1 = 1101_2$. Fractions are halves, quarters, eighths: $0.75 = \\frac12 + \\frac14 = 0.11_2$.

But $\\frac{1}{10}$ is not a sum of a few halves, quarters and eighths. In binary it goes on forever, like $\\frac13 = 0.333\\ldots$ in decimal. To find its binary digits, double it again and again: each time the whole-number part is the next digit.` },
        {
          derive: {
            title: '0.1 in binary, by doubling',
            intro: 'Double the fraction; the part before the point is the next binary digit; keep the part after it and repeat.',
            steps: [
              { prompt: '$0.1 \\times 2 = 0.2$. First binary digit?', number: 0, compute: () => N.binaryDigits(0.1, 1)[0].digit, why: '0.2 is below 1: the digit is 0.' },
              { prompt: 'Then $0.2 \\to 0.4 \\to 0.8 \\to 1.6$. The fourth digit?', number: 1, compute: () => N.binaryDigits(0.1, 4)[3].digit, why: '1.6: the digit is 1, and 0.6 carries on.' },
              { prompt: 'The first 10 digits are 0001100110. Doubling 0.6 gives 1.2, then 0.4… which earlier fraction does 0.4 repeat?', number: 0.4, compute: () => N.binaryDigits(0.1, 3)[2].before, tolerance: 1e-12, why: '0.4 came up at the third step, so the digits from there repeat forever: $0.1 = 0.0\\overline{0011}_2$.' },
            ],
            result: 'A double keeps 53 binary digits, so 0.1 is cut off and stored as the nearest double, a tiny bit too big.',
          },
        },
        { figure: 'FloatExplorer', caption: 'Type any number to see the exact value the computer stores. Every Python float and every JavaScript number is one of these 64-bit doubles; spreadsheets use them too.' },
        { md: `So $0.1$ is stored as ${N.exactDecimal(0.1).slice(0, 22)}…, a little too big, and $0.2$ too. Their sum rounds to ${N.exactDecimal(0.1 + 0.2).slice(0, 20)}…, while $0.3$ itself is stored as ${N.exactDecimal(0.3).slice(0, 20)}…, a little too small. That is why \`0.1 + 0.2 == 0.3\` is \`False\`.

On the shop's ${PRICE_TEXT.length} prices, the errors add up: as floats they total **${FLOAT_TOTAL}**, but counted in whole pence the total is exactly **£${Math.floor(PENCE_TOTAL / 100)}.${String(PENCE_TOTAL % 100).padStart(2, '0')}**. Tiny here; but tiny errors in money still fail an audit, and they grow over millions of rows. Money is kept in whole pence (or cents), which are exact.` },
        {
          predict: {
            prompt: 'Use the figure: by how much does the float total of the prices differ from the exact total? (The size of the difference in pounds; `2e-5` means 0.00002.)',
            answer: Math.abs(FLOAT_TOTAL - PENCE_TOTAL / 100), compute: () => Math.abs(S.total(PRICE_TEXT.map(Number)) - PRICE_TEXT.map(T.toPence).reduce((a, b) => a + b, 0) / 100), tolerance: 5e-12,
            explain: `About $${Math.abs(FLOAT_TOTAL - PENCE_TOTAL / 100).toExponential(1)}$ pounds: ten zeros after the point. Each price is off by far less, but ${PRICE_TEXT.length} roundings add up.`,
          },
        },
        {
          code: {
            file: 'data.py', fn: 'pounds', notes: [
              ['return str(pence // 100) + "." + str(pence % 100).zfill(2)', ['The other way: whole pence written as pounds with whole-number division (`//`) and remainder (`%`). No float, so nothing is rounded.']],
            ],
          },
        },
        {
          code: {
            file: 'tables.py', fn: 'to_pence', notes: [
              ['pounds, _, pence = text.partition(".")', ['Split the text at the point: the pounds before, the pence after.']],
              ['pence = (pence + "00")[:2]', ['"5" means 50 pence and "" means none: pad with zeros, keep two digits.']],
            ],
          },
        },
        {
          write: {
            file: 'tables.py', fn: 'to_pence', forbid: [['float(', 'No floats: the point is to stay exact.']],
            prompt: 'Write `to_pence(text)`: a price like "45.99" as whole pence (4599), "45" as 4500, "45.5" as 4550, and empty text (after stripping spaces) as `None`. Use only text and whole numbers.',
            starter: 'def to_pence(text):\n    text = text.strip()\n    # empty: None; otherwise pounds * 100 + pence\n    pass\n',
            cases: cases(T.toPence, [['45.99'], ['45'], ['45.5'], ['0.07'], [' 12.30 '], ['']]),
            hint: '`pounds, _, pence = text.partition(".")`, then `pence = (pence + "00")[:2]` and `int(pounds) * 100 + int(pence)`.',
          },
        },
        {
          choice: {
            prompt: 'A spreadsheet shows `=0.1+0.2=0.3` as TRUE. Python says `0.1 + 0.2 == 0.3` is False. Which is right?',
            options: [
              { text: 'The spreadsheet: it does arithmetic in decimal.', why: 'Spreadsheets also use binary doubles. Excel rounds to 15 significant digits when it compares and displays, which hides the difference.' },
              { text: 'Both store the same binary doubles; the spreadsheet rounds before comparing, Python compares the exact values.', why: 'Yes. Neither is wrong about the doubles; they differ in what “equal” means. Compare floats with a tolerance, or keep exact quantities (pence) as whole numbers.' },
              { text: 'Python: spreadsheets can’t store 0.1.', why: 'They store it just as Python does, slightly too big.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'missing-values', number: '1.4', title: 'Missing values',
      goal: 'Tell empty from zero from unknown, turn fields into numbers with None for the blanks, and work out how much counting blanks as 0 pulls a mean down.',
      builds: ['numbers-inside'],
      blocks: [
        { h: 'Empty is not zero' },
        { md: `${MISSING} of the shop's ${ROWS.length} orders have an **empty** price field. Empty means *we don't know*: the order was paid for, but the price was never typed. It does not mean the order was free.

Python has a value for “nothing here”: **None**. A missing price becomes \`None\`, not \`0.0\`, so that no calculation can mistake it for a real price.` },
        {
          code: {
            file: 'tables.py', fn: 'to_number', notes: [
              ['if text == "":', ['An empty field (after stripping spaces) is unknown…']],
              ['return None', ['…so it becomes None.']],
              ['return float(text)', ['Anything else must be a number; `float("abc")` raises an error, which is right: that field needs a person to look at it.']],
            ],
          },
        },
        {
          write: {
            file: 'tables.py', fn: 'to_number',
            prompt: 'Write `to_number(text)`: strip the spaces; empty text gives `None`; anything else gives `float(text)`.',
            starter: 'def to_number(text):\n    # None for an empty field, a float otherwise\n    pass\n',
            cases: cases(T.toNumber, [['45.99'], [' 7 '], [''], ['   '], ['-3.5']]),
            hint: '`text = text.strip()`, then `if text == "": return None`, then `return float(text)`.',
          },
        },
        {
          code: {
            file: 'tables.py', fn: 'with_numbers', notes: [
              ['return [{k: to_number(v) if k in names else v for k, v in row.items()} for row in rows]', ['A **dictionary comprehension** inside a list comprehension: each row copied, with the named columns turned into numbers. The original rows are left alone.']],
            ],
          },
        },
        {
          code: {
            file: 'tables.py', fn: 'mean_of', notes: [
              ['present = [v for v in values if v is not None]', ['Keep only the values we know. `is not None`, not `!= 0`: a real price of 0 would be kept.']],
              ['return sum(present) / len(present), len(values) - len(present)', ['The mean of what is known, and how many were left out: always report both.']],
            ],
          },
        },
        {
          write: {
            file: 'tables.py', fn: 'mean_of',
            prompt: 'Write `mean_of(values)`: return `(mean, missing)`, the mean of the values that are not `None` and how many were `None`. If every value is `None`, return `(None, len(values))`.',
            starter: 'def mean_of(values):\n    present = [v for v in values if v is not None]\n    # the mean of present, and how many were left out\n    pass\n',
            cases: cases(T.meanOf, [[[1, null, 3]], [[49.05, 409.5, null, 30.6]], [[null, null]], [[0, 0, 4]]]),
            hint: 'If `present` is empty, return `None, len(values)`; otherwise `sum(present) / len(present), len(values) - len(present)`.',
          },
        },
        { python: { program: 'mean_of', label: 'Step through mean_of in real Python' } },
        {
          derive: {
            title: 'What counting blanks as 0 does to the mean',
            intro: `$n = ${ROWS.length}$ prices, of which $m = ${MISSING}$ are missing. The known prices have mean $\\bar x = ${MEAN_SKIP.toFixed(4)}$.`,
            steps: [
              { prompt: 'The known prices add up to $(n - m)\\,\\bar x$. Counting the blanks as 0 adds nothing, but divides by $n$. Write the new mean in terms of $\\bar x$, $n$ and $m$.', answer: 'x*(n-m)/n', vars: { x: [1, 500], n: [10, 1000], m: [0, 9] }, why: '$\\bar x_0 = \\frac{(n-m)\\bar x}{n} = \\bar x \\cdot \\frac{n-m}{n}$: always lower, by the fraction that is missing.' },
              { prompt: 'For the shop’s prices, what is it? (2 decimal places)', number: MEAN_ZERO, compute: () => MEAN_SKIP * (ROWS.length - MISSING) / ROWS.length, tolerance: 0.005, why: `$${MEAN_SKIP.toFixed(2)} \\times \\frac{${ROWS.length - MISSING}}{${ROWS.length}} = ${MEAN_ZERO.toFixed(2)}$: about ${(100 * MISSING / ROWS.length).toFixed(1)}% too low, from blanks alone.` },
            ],
          },
        },
        { figure: 'MissingDemo', caption: 'Skip the blanks, or count them as 0, and watch the mean; the spreadsheet does the same two things with different formulas.' },
        {
          formula: {
            table: 'orders', solution: '=AVERAGE(E2:E403)', must: ['AVERAGE'], sheet: 1,
            prompt: 'In a spreadsheet, the prices are E2:E403. Find their mean with `AVERAGE`. Does it skip the empty cells, or count them as 0?',
            hint: '`=AVERAGE(E2:E403)`',
            explain: `It gives the same as \`mean_of\`: AVERAGE skips empty cells, just as \`mean_of\` skips None. To count them as 0 you would write \`=SUM(E2:E403)/COUNTA(A2:A403)\`, which gives ${MEAN_ZERO.toFixed(2)}.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=COUNTBLANK(E2:E403)', must: ['COUNTBLANK'],
            prompt: 'And how many prices are missing? `COUNTBLANK(range)` counts the empty cells.',
            hint: '`=COUNTBLANK(E2:E403)`',
            explain: `${MISSING}, the same as the second number \`mean_of\` returns.`,
          },
        },
        {
          choice: {
            prompt: 'A column of daily rainfall has some blank days. When is counting a blank as 0 right?',
            options: [
              { text: 'Always: no data means nothing happened.', why: 'A blank usually means *not recorded*. If the gauge was broken on a stormy day, 0 is badly wrong.' },
              { text: 'Only when you know a blank really means zero (say, the file leaves out days with no rain); otherwise it is unknown.', why: 'Yes. What a blank means is a fact about how the data was collected, not something the numbers can tell you. Find out, then write it down.' },
              { text: 'Never: blanks must always be skipped.', why: 'If the file’s rule is “dry days are left blank”, skipping them would make every month look wetter.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'filtering', number: '1.5', title: 'Filtering: and, or, not',
      goal: 'Keep the rows that pass a test, combine tests with and, or and not, prove De Morgan’s laws, and explain why a spreadsheet and Python count different rows for the same filter.',
      builds: ['missing-values'],
      blocks: [
        { h: 'A test for each row' },
        { md: `A **filter** keeps the rows that pass a test: *orders from Leeds*, *orders over £100*. The test is a **predicate**, something that is true or false for each row. Several tests combine with **and** (both must pass), **or** (either may) and **not** (the opposite).` },
        {
          code: {
            file: 'tables.py', fn: 'rows_where', notes: [
              ['return [row for row in rows if row[name] == value]', ['A comprehension with an `if`: only rows whose test is True are kept, in their order.']],
            ],
          },
        },
        {
          code: {
            file: 'tables.py', fn: 'where_all', notes: [
              ['all(row[name] == value for name, value in conditions.items())', ['`all(…)` is True only if every condition is: **and** across all of them. It stops at the first False.']],
            ],
          },
        },
        {
          write: {
            file: 'tables.py', fn: 'where_all',
            prompt: 'Write `where_all(rows, conditions)`: the rows for which `row[name] == value` for every `name, value` in the dictionary `conditions`.',
            starter: 'def where_all(rows, conditions):\n    kept = []\n    # keep a row only if it matches every condition\n    return kept\n',
            cases: cases(T.whereAll, [[ROWS.slice(0, 30), { town: 'York' }], [ROWS.slice(0, 30), { town: 'Wakefield', channel: 'web' }], [ROWS.slice(0, 5), {}]]),
            hint: '`if all(row[name] == value for name, value in conditions.items()): kept.append(row)`. With no conditions, `all` of nothing is True: every row is kept.',
          },
        },
        { h: 'De Morgan’s laws' },
        { md: `To find the orders that are **not** (from Leeds **and** on the web), you could flip the whole test, or flip each part and swap *and* for *or*: not from Leeds, **or** not on the web. These are **De Morgan's laws**:

$$\\lnot(A \\land B) = \\lnot A \\lor \\lnot B \\qquad \\lnot(A \\lor B) = \\lnot A \\land \\lnot B$$

Check the first one on every possible case: $A$ and $B$ can each be true or false, four cases in all.` },
        {
          derive: {
            title: 'De Morgan, checked on the shop’s data',
            intro: `$A$: the town is "Leeds". $B$: the channel is "web".`,
            steps: [
              { prompt: 'How many cases does a truth table with two statements have?', number: 4, compute: () => 2 ** 2, why: '$2 \\times 2 = 4$: TT, TF, FT, FF. $\\lnot(A \\land B)$ is false only in the first; so is $\\lnot A \\lor \\lnot B$. They agree in all four.' },
              { prompt: `How many orders have both $A$ and $B$ (exactly “Leeds” and “web”)?`, number: LEEDS_WEB, compute: () => T.whereAll(ROWS, { town: 'Leeds', channel: 'web' }).length, why: 'Count them with `where_all` (or in the figure).' },
              { prompt: 'So how many orders have $\\lnot(A \\land B)$?', number: ROWS.length - LEEDS_WEB, compute: () => ROWS.filter(r => r.town !== 'Leeds' || r.channel !== 'web').length, why: `$${ROWS.length} - ${LEEDS_WEB} = ${ROWS.length - LEEDS_WEB}$, and counting $\\lnot A \\lor \\lnot B$ directly gives the same: every row is in exactly one of “both” and “not both”.` },
            ],
          },
        },
        { figure: 'QueryBuilder', caption: 'Filter by town and channel. Pick the different spellings of a town, then tick “tidy the text first”, and compare Python’s count with the spreadsheet’s COUNTIFS.' },
        {
          formula: {
            table: 'orders', solution: '=COUNTIFS(C2:C403,"Leeds",G2:G403,"web")', must: ['COUNTIFS'],
            prompt: 'Count the orders from Leeds on the web in a spreadsheet: `COUNTIFS(range1, value1, range2, value2)` counts the rows where *both* match. Towns are in C, channels in G.',
            hint: '`=COUNTIFS(C2:C403,"Leeds",G2:G403,"web")`',
            explain: `${sheet('=COUNTIFS(C2:C403,"Leeds",G2:G403,"web")')}, but \`where_all\` found ${LEEDS_WEB}. The spreadsheet compares text **ignoring capitals**, so it also counted “leeds”; Python's \`==\` doesn't. Neither counted “Leeds ” with a space. The same data, the same filter, two answers: the fix is to clean the text first (Part 3), not to trust either count.`,
          },
        },
        {
          choice: {
            prompt: `Python counts ${LEEDS_WEB} orders from Leeds on the web; the spreadsheet counts ${sheet('=COUNTIFS(C2:C403,"Leeds",G2:G403,"web")')}. Which do you report?`,
            options: [
              { text: `${sheet('=COUNTIFS(C2:C403,"Leeds",G2:G403,"web")')}: the spreadsheet is more forgiving.`, why: 'It forgives capitals but not the trailing space, so it is still missing some. A count that depends on the tool is not yet a fact.' },
              { text: 'Neither until the town names are cleaned: then both tools give the same, larger count.', why: 'Yes. Tick “tidy the text first” in the figure: stripping spaces and lower-casing finds them all. Report the count after cleaning, and say what you cleaned.' },
              { text: `${LEEDS_WEB}: Python is exact.`, why: 'Exactly matching a messy column misses orders that really are from Leeds.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'sorting', number: '1.6', title: 'Sorting: insertion, merge, and stable',
      goal: 'Write insertion sort and the merge step of merge sort, count their comparisons (n²/2 against n log₂ n), and use a stable sort to sort by several columns.',
      builds: ['filtering'],
      blocks: [
        { h: 'Insertion sort' },
        { md: `Sorting puts rows in order of a column: the cheapest first, the latest first. **Insertion sort** is how you sort a hand of cards: take the rows one at a time, and slide each one left past every row bigger than it.` },
        {
          code: {
            file: 'tables.py', fn: 'sort_by', notes: [
              ['while i > 0 and out[i - 1][name] > row[name]:', ['Walk left while the row to the left is *strictly* bigger. On a tie it stops, so equal rows keep their order: the sort is **stable**.']],
              ['out.insert(i, row)', ['Put the row in the gap.']],
            ],
          },
        },
        { python: { program: 'sort_by', label: 'Watch insertion sort in real Python' } },
        {
          choice: {
            prompt: `The first prices, still as text from the CSV file, include "409.50", "49.05" and "6.37". Sorted as text, which comes first?`,
            options: [
              { text: '"6.37"', why: 'As a number, yes. As text, comparison goes character by character: "4" comes before "6".' },
              { text: '"409.50"', why: 'Yes: "4" < "6", and then "40…" < "49…" because "0" < "9". Text sorts like a dictionary, not like numbers: turn fields into numbers before sorting.' },
              { text: '"49.05"', why: 'Its second character "9" comes after "0" in "409.50".' },
            ],
            answer: 1,
            verify: () => S.sorted(['409.50', '49.05', '6.37'])[0] === '409.50',
          },
        },
        {
          derive: {
            title: 'How much work insertion sort does',
            intro: 'In the worst case (the list is reversed), the $k$-th row is compared with all $k - 1$ rows before it.',
            steps: [
              { prompt: 'For $n$ rows, the comparisons are $0 + 1 + 2 + \\dots + (n-1)$. Write it as a formula in $n$.', answer: 'n*(n-1)/2', vars: { n: [2, 1000] }, why: 'Pair the first term with the last, the second with the second-last: each pair adds to $n - 1$, and there are $n/2$ pairs.' },
              { prompt: `How many comparisons on ${ROWS.length} reversed values?`, number: ROWS.length * (ROWS.length - 1) / 2, compute: () => T.insertionComparisons(reversed(ROWS.length)), why: `$${ROWS.length} \\times ${ROWS.length - 1} / 2 = ${(ROWS.length * (ROWS.length - 1) / 2).toLocaleString('en-GB')}$. Doubling the rows makes it four times as much: it grows like $n^2$.` },
            ],
          },
        },
        { h: 'Merge sort' },
        { md: `**Merge sort** does better by splitting: sort the first half, sort the second half (each the same way, until a half has one row), then **merge** the two sorted halves by repeatedly taking the smaller front item. Merging two sorted lists of total length $n$ takes at most $n - 1$ comparisons.` },
        {
          code: {
            file: 'tables.py', fn: 'merge_sorted', notes: [
              ['if right[j][name] < left[i][name]:', ['Take from the right only if it is *strictly* smaller; on a tie the left one goes first, which keeps the merge stable.']],
              ['return out + left[i:] + right[j:]', ['One list has run out; whatever is left of the other is already in order.']],
            ],
          },
        },
        {
          code: {
            file: 'tables.py', fn: 'merge_sort', notes: [
              ['if len(rows) <= 1:', ['A list of one row is already sorted: this is where the splitting stops.']],
              ['return merge_sorted(merge_sort(rows[:middle], name), merge_sort(rows[middle:], name), name)', ['The function calls itself on each half (**recursion**), then merges.']],
            ],
          },
        },
        {
          write: {
            file: 'tables.py', fn: 'merge_sorted', forbid: [[' sorted(', 'Merge them yourself: both lists are already in order.'], ['.sort(', 'Merge them yourself.']],
            prompt: 'Write `merge_sorted(left, right, name)`: two lists of rows, each already sorted by `name`, merged into one sorted list. On a tie take from `left` first.',
            starter: 'def merge_sorted(left, right, name):\n    out, i, j = [], 0, 0\n    # take the smaller front row until one list runs out\n    return out\n',
            cases: cases(T.mergeSorted, [[[{ k: 1, n: 0 }, { k: 3, n: 1 }], [{ k: 1, n: 2 }, { k: 2, n: 3 }], 'k'], [[], [{ k: 5 }], 'k'], [[{ k: 2 }], [], 'k']]),
            hint: 'While both have rows: if `right[j][name] < left[i][name]` take `right[j]`, else take `left[i]`. Then `return out + left[i:] + right[j:]`.',
          },
        },
        { python: { program: 'merge_sort', label: 'Watch merge sort split and merge in real Python' } },
        {
          derive: {
            title: 'How much work merge sort does',
            intro: 'Halving $n$ rows again and again until each part has one row takes $\\log_2 n$ rounds of splitting.',
            steps: [
              { prompt: 'How many times can 8 rows be halved before each part has one row?', number: 3, compute: () => Math.log2(8), why: '8 → 4 → 2 → 1: three times, and $2^3 = 8$, so $\\log_2 8 = 3$.' },
              { prompt: 'At each of those levels the merges together compare at most about $n$ rows. Total comparisons, in terms of $n$?', answer: 'n*log2(n)', vars: { n: [2, 1000] }, why: '$\\log_2 n$ levels of about $n$ each: $n \\log_2 n$.' },
              { prompt: `Merge sort on the same ${ROWS.length} reversed values: how many comparisons did it really make?`, number: T.mergeComparisons(reversed(ROWS.length)).compared, compute: () => T.mergeComparisons(reversed(ROWS.length)).compared, why: `${T.mergeComparisons(reversed(ROWS.length)).compared.toLocaleString('en-GB')}, under $n \\log_2 n \\approx ${Math.round(ROWS.length * Math.log2(ROWS.length)).toLocaleString('en-GB')}$, against ${(ROWS.length * (ROWS.length - 1) / 2).toLocaleString('en-GB')} for insertion sort: about ${Math.round(ROWS.length * (ROWS.length - 1) / 2 / T.mergeComparisons(reversed(ROWS.length)).compared)} times fewer. Python's \`sorted\` is a cleverer merge sort (Timsort).` },
            ],
          },
        },
        { figure: 'SortRace', caption: 'Count both sorts’ comparisons on the same list, random, already sorted or reversed. Watch insertion sort win on a sorted list and lose badly on a reversed one.' },
        { h: 'Sorting by two columns' },
        { md: `To sort the orders by town, and within each town by price: sort by **price** first, then by **town**. Because the second sort is stable, orders from the same town keep the price order the first sort gave them. Sort by the *least* important column first.` },
        {
          choice: {
            prompt: `Rows (k, n): (3, 0), (1, 1), (2, 2), (1, 3), sorted by k with a stable sort. Where does (1, 3) end up?`,
            options: [
              { text: 'First', why: 'Both (1, 1) and (1, 3) have k = 1; a stable sort keeps them in their original order, and (1, 1) came first.' },
              { text: 'Second, right after (1, 1)', why: 'Yes: ties keep their order. That is what lets you sort by several columns one at a time.' },
              { text: 'It depends on the run', why: 'Not for a stable sort: the result is fully determined.' },
            ],
            answer: 1,
            verify: () => T.sortBy(smallRows, 'k')[1].n === 3 && T.mergeSort(smallRows, 'k')[1].n === 3,
          },
        },
      ],
    },

    {
      id: 'pandas-columns', number: '1.7', title: 'Columns, not rows: pandas',
      goal: 'Explain why pandas stores a table as columns, filter with a boolean mask instead of a loop, and get the same answers as the hand-written functions.',
      builds: ['sorting'],
      blocks: [
        { h: 'A table stored by column' },
        { md: `**pandas** is the Python library most data work is done in. Its table, the **DataFrame**, stores each column as one block of numbers of a single type, side by side in memory, instead of one dictionary per row.

That matters because most questions are about *columns*: add up all the prices, compare every total with £100. With a column stored as one block, the computer runs one tight loop in compiled code over plain numbers, instead of a Python loop that looks up a dictionary key and checks a type for every row. Operations on whole columns at once are called **vectorised**.` },
        {
          code: {
            file: 'frames.py', fn: 'big_orders', notes: [
              ['frame = pd.DataFrame(rows)', ['A list of row dictionaries becomes a DataFrame: pandas gathers each name into a column.']],
              ['total = frame["price"] * frame["quantity"]', ['Two whole columns multiplied, row by row, in one operation: a new column.']],
              ['return list(frame.loc[total >= threshold, "order_id"])', ['`total >= threshold` is a column of True and False: a **mask**. `.loc[mask, "order_id"]` keeps the order ids where it is True.']],
            ],
          },
        },
        { figure: 'RowsVsColumns', caption: 'The mask for “order total at least £…”, one True or False per row. Its sum counts the matches; its mean is the fraction.' },
        {
          derive: {
            title: 'What a mask adds up to',
            intro: `A mask for "channel is web" over all ${ROWS.length} orders. True counts as 1, False as 0.`,
            steps: [
              { prompt: 'What is the sum of the mask?', number: WEB, compute: () => ROWS.filter(r => r.channel === 'web').length, why: `Each True adds 1: the sum is the number of web orders, ${WEB}.` },
              { prompt: 'What is its mean? (4 decimal places)', number: WEB / ROWS.length, compute: () => T.shareWhere(ROWS, 'channel', 'web'), tolerance: 0.00005, why: `$${WEB}/${ROWS.length} \\approx ${(WEB / ROWS.length).toFixed(4)}$: the mean of 0s and 1s is the fraction of 1s.` },
            ],
          },
        },
        {
          code: {
            file: 'frames.py', fn: 'share_where', notes: [
              ['return float((frame[name] == value).mean())', ['The fraction of rows that match, as the mean of a mask. `float` turns pandas’ number into a plain Python one.']],
            ],
          },
        },
        {
          write: {
            file: 'frames.py', fn: 'big_orders', prelude: 'import pandas as pd', packages: ['pandas'],
            forbid: [['for ', 'No loop: one mask over whole columns.']],
            prompt: 'Write `big_orders(rows, threshold)` with pandas: make a DataFrame, compute the total of each order (price times quantity) as a column, and return the list of order ids whose total is at least `threshold`, in order. (The first run downloads pandas into the page: a few seconds.)',
            starter: 'def big_orders(rows, threshold):\n    frame = pd.DataFrame(rows)\n    # a column of totals, a mask, then the order ids where it is True\n    return []\n',
            cases: cases(T.bigOrders, [[PRICED.slice(0, 30), 100], [PRICED.slice(0, 30), 400], [PRICED.slice(0, 10), 0]]),
            hint: '`total = frame["price"] * frame["quantity"]`, then `list(frame.loc[total >= threshold, "order_id"])`.',
          },
        },
        { md: `Measured when this lesson was written, on 100,000 orders (the shop's orders repeated), plain Python against pandas:

| Question | Python loop over rows | pandas, whole columns |
|---|---|---|
| How many orders total £100 or more? | 5.2 ms | **0.23 ms** (23 times faster) |
| Which order ids are they? | 5.1 ms | 4.2 ms |

Counting with a mask is 23 times faster: the multiply, the compare and the sum all run in compiled code over plain numbers. Listing the ids is barely faster, because 20,315 Python strings have to be made either way. Vectorising speeds up the **arithmetic**; turning the answers back into Python objects still costs what it costs.` },
        { md: `**The same answer three ways.** Count the web orders:
- by hand: \`len(rows_where(rows, "channel", "web"))\` → ${WEB}
- in a spreadsheet: \`=COUNTIF(G2:G403,"web")\` → ${sheet('=COUNTIF(G2:G403,"web")')}
- in pandas: \`(frame["channel"] == "web").sum()\` → ${WEB}

The tools differ in speed and in the small print (capitals, as lesson 1.5 found); the idea underneath is the same.` },
        {
          choice: {
            prompt: 'When is a list of row dictionaries still the better way to hold a table?',
            options: [
              { text: 'Never: pandas is always faster.', why: 'Building a DataFrame has a cost of its own; for a handful of rows, or work that goes row by row anyway, plain Python is simpler and just as quick.' },
              { text: 'When you work one record at a time: reading a row, checking it, passing it on, like the CSV reader of lesson 1.2.', why: 'Yes. Rows suit record-at-a-time work; columns suit questions about a whole column. Many systems read rows and analyse columns.' },
              { text: 'When the table has text in it.', why: 'pandas holds text columns too.' },
            ],
            answer: 1,
          },
        },
      ],
    },
  ],
}
