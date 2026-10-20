// Part 10: databases and SQL. The six sheets of the spreadsheet lessons, flaws and all, in SQLite:
// typed columns, NULL, SELECT and WHERE, GROUP BY, joins, indexes, subqueries, window functions,
// normalisation and transactions, each clause beside the loop that does the same by hand
// (python/database.py, engine/database.js) and the spreadsheet. "Query it in SQL" blocks run in real
// SQLite in the page (engine/sqlRun.js); their `answer` is the by-hand engine's, which the tests hold
// SQLite to.
import * as B from '../engine/database.js'
import * as W from '../engine/forecasting.js'
import { SHOP_TABLES, typedRows } from '../engine/sqlRun.js'
import { evaluateFormula } from '../engine/sheet.js'

const cases = (fn, inputs) => inputs.map(args => ({ args, expected: fn(...args) }))
const sheet = formula => evaluateFormula('orders', formula).value
const f2 = x => x.toFixed(2)
const money = x => `£${x.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const SHOP = SHOP_TABLES()
const TO = typedRows(SHOP.orders), TR = typedRows(SHOP.returns), TC = typedRows(SHOP.catalogue), TD = typedRows(SHOP.days)
const known = TO.filter(r => r.price !== null)
const SMALL_ROWS = [{ id: 1, price: 30 }, { id: 2, price: null }, { id: 3, price: 75 }, { id: 4, price: 50 }]
// 10.1
const COUNTS = [TO.length, known.length, new Set(TO.map(r => r.order_id)).size]
const DUPES = B.groupAggregate(TO, 'order_id', 'order_id', 'count_all').filter(([, n]) => n > 1)
// 10.2
const NULLS = B.where(TO, 'price', 'is null').length
const PENCE = B.where(TO, 'price', '>', 1000).sort((a, b) => b.price - a.price).map(r => [r.order_id, r.item, r.price])
const GT50 = B.where(TO, 'price', '>', 50).length, LE50 = B.where(TO, 'price', '<=', 50).length
// 10.3
const ITEMS = B.groupAggregate(TO, 'item', 'price', 'count_all').map(([item, n], k) => [item, n, B.groupAggregate(TO, 'item', 'price', 'count')[k][1], B.groupAggregate(TO, 'item', 'price', 'avg')[k][1]])
const HELMET = ITEMS.find(r => r[0] === 'Helmet'), HELMET_SUM = B.aggregate(TO.filter(r => r.item === 'Helmet').map(r => r.price), 'sum')
const RAW_TOWNS = new Set(TO.map(r => r.town)).size
const TOWNS = B.groupAggregate(TO.map(r => ({ town: r.town.trim().toLowerCase() })), 'town', 'town', 'count_all')
// 10.4
const PAIRS = TR.flatMap(r => TO.filter(o => o.order_id === r.order_id).map(o => [r, o]))
const ANTI = TR.filter(r => !TO.some(o => o.order_id === r.order_id)).map(r => [r.return_id, r.order_id]).sort((a, b) => (a[0] < b[0] ? -1 : 1))
const CATEGORY = Object.fromEntries(TC.map(c => [c.item, c.category]))
const REVENUE = B.groupAggregate(TO.map(o => ({ category: CATEGORY[o.item], revenue: o.price === null ? null : o.price * o.quantity })), 'category', 'revenue', 'sum').sort((a, b) => b[1] - a[1])
const TYPO_REVENUE = PENCE.reduce((s, [id]) => s + TO.find(o => o.order_id === id).price * TO.find(o => o.order_id === id).quantity, 0)
// 10.6
const AVG_PRICE = B.aggregate(TO.map(r => r.price), 'avg'), ABOVE = B.where(TO, 'price', '>', AVG_PRICE).length
const AVG_CLEAN = B.aggregate(TO.map(r => (r.price !== null && r.price < 1000 ? r.price : null)), 'avg')
const KIT = TO.filter(r => CATEGORY[r.item] === 'kit').length
const ITEM_AVG = Object.fromEntries(B.groupAggregate(TO, 'item', 'price', 'avg'))
const ABOVE_OWN = TO.filter(r => r.price !== null && r.price > ITEM_AVG[r.item]).length
// 10.7
const RIDERS = TD.map(r => r.riders)
const RUNNING = (() => { let s = 0; return TD.map(r => { s += r.riders; return [r.date, s] }) })()
const MOVING = B.windowAverage(RIDERS, 6).map((v, k) => [TD[k].date, v]), MA7 = W.movingAverage(RIDERS, 7)
const RANKS = B.rankWithin(known, 'item', 'price')
const TOP3 = known.map((r, k) => [r.item, r.order_id, r.price, RANKS[k]]).filter(r => r[3] <= 3)
  .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[3] - b[3] || (a[1] < b[1] ? -1 : 1)))
// 10.8
const LOCKS = TO.filter(r => r.item === 'Lock').length
const JOINED = TO.map(o => ({ ...o, category: CATEGORY[o.item], list_price: TC.find(c => c.item === o.item).list_price }))
const [LOOKUP] = B.splitOut(JOINED, 'item', ['category', 'list_price'])
const DRIFT = PAIRS.filter(([r, o]) => r.item !== o.item).length
// 10.9
const LIST_SUM = B.aggregate(TC.map(c => c.list_price), 'sum')
// 10.10
const MONTHLY = B.monthlyRevenue(TO), JULY = MONTHLY.find(([m]) => m === '2025-07')[1]
const BEST_MONTH = MONTHLY.reduce((a, b) => (b[1] > a[1] ? b : a))

export const PART10 = {
  id: 'part10', title: 'Part 10 · Databases and SQL', lessons: [
    {
      id: 'database-tables', number: '10.1', title: 'Tables in a database',
      goal: 'Load the shop’s tables into SQLite with typed columns and NULL for the blanks, count with SQL, and see why a key must be unique.',
      builds: ['time-order'],
      blocks: [
        { h: 'From sheets to a database' },
        { md: `A spreadsheet is a grid where any cell can hold anything. A **relational database** is stricter, and that is its strength. Edgar Codd proposed the model in 1970 at IBM: data lives in **tables** (he called them relations), each a set of **rows** with the same named **columns**, each column of one **type**. A program asks for what it wants in a language, **SQL**, and the database decides how to find it. Every bank, airline and website keeps its records this way.

**SQLite** is a whole database in one small library: it is in every phone and browser, and in Python's standard library as \`sqlite3\`. In this part the shop's six sheets (orders, catalogue, returns, days, deliveries, trial) are loaded into it exactly as the spreadsheet lessons have them, with every flaw still in. In the page, SQLite runs as WebAssembly (sql.js).` },
        { h: 'Types and NULL' },
        { md: `Each column gets a type from its values: **INTEGER**, **REAL** (a float) or **TEXT**. An empty cell becomes **NULL**: not 0, not the empty text, but "no value known". Lesson 1.4 met missing values as \`None\`; in SQL they are NULL, and lesson 10.2 shows how differently they behave.` },
        {
          code: { file: 'database.py', fn: 'column_type', notes: [['if v == "":', ['Blanks don’t decide the type: they will be NULL.']], ['int(v)', ['A whole number keeps the column INTEGER…']], ['kind = "REAL"', ['…one decimal makes it REAL…']], ['return "TEXT"', ['…and one word makes it TEXT, whatever the rest are.']]] },
        },
        {
          write: {
            file: 'database.py', fn: 'column_type',
            prompt: 'Write `column_type(values)`: skip empty strings; a value that `int()` reads keeps the column `"INTEGER"`; one that only `float()` reads makes it `"REAL"`; any other makes it `"TEXT"` at once.',
            starter: 'def column_type(values):\n    return "TEXT"\n',
            cases: cases(B.columnType, [[['1', '', '3']], [['1', '2.5']], [['x', '1']], [['', '']], [['25.00', '2500']], [SHOP.orders.slice(1).map(r => r[2])]]),
            hint: 'Loop over the values; `continue` past `""`. Try `int(v)` in a `try`; if it fails, try `float(v)` and set `kind = "REAL"`; if that fails too, `return "TEXT"`.',
          },
        },
        {
          code: { file: 'database.py', fn: 'sql_value', notes: [['return None', ['Python’s None is SQL’s NULL: `sqlite3` converts it.']]] },
        },
        {
          code: { file: 'database.py', fn: 'create_sql', notes: [['return "CREATE TABLE " + name', ['SQL that makes the table: its name and each column with its type.']]] },
        },
        {
          write: {
            file: 'database.py', fn: 'create_sql', also: [['database.py', 'column_type']],
            prompt: 'Write `create_sql(name, header, rows)`: the type of each column (`column_type` of that column’s values), then `"CREATE TABLE name (col1 TYPE1, col2 TYPE2)"`.',
            starter: 'def create_sql(name, header, rows):\n    return "CREATE TABLE " + name\n',
            cases: cases(B.createSql, [['t', ['a', 'b'], [['1', 'x'], ['2', 'y']]], ['catalogue', SHOP.catalogue[0], SHOP.catalogue.slice(1)], ['orders', SHOP.orders[0], SHOP.orders.slice(1)]]),
            hint: '`kinds = [column_type([row[j] for row in rows]) for j in range(len(header))]`, then `", ".join(h + " " + k for h, k in zip(header, kinds))` inside the brackets.',
          },
        },
        {
          code: { file: 'database.py', fn: 'load', notes: [['conn = sqlite3.connect(":memory:")', ['A database in memory: gone when the program ends. Give a file name instead to keep it.']], ['marks = ", ".join("?" for _ in header)', ['A **placeholder** per column. The values are passed separately, never pasted into the SQL text: that is what stops **SQL injection**, where a value such as `x\'); DROP TABLE orders; --` would otherwise run as SQL.']]] },
        },
        {
          sql: {
            prompt: 'Your first query. `COUNT(*)` counts rows; `COUNT(price)` counts the rows where price is not NULL; `COUNT(DISTINCT order_id)` counts different ids. All three from the orders, in one `SELECT`.',
            solution: 'SELECT COUNT(*), COUNT(price), COUNT(DISTINCT order_id) FROM orders', must: ['COUNT', 'DISTINCT'],
            starter: 'SELECT COUNT(*) FROM orders',
            answer: [COUNTS],
            hint: '`SELECT COUNT(*), COUNT(price), COUNT(DISTINCT order_id) FROM orders`',
            explain: `${COUNTS[0]} rows, ${COUNTS[1]} known prices (${COUNTS[0] - COUNTS[1]} missing) and ${COUNTS[2]} different ids: two ids appear twice, the duplicated rows of lesson 3.4 (${DUPES.map(d => d[0]).join(' and ')}).`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=ROWS(E2:E403)-COUNT(E2:E403)', must: ['ROWS', 'COUNT'],
            prompt: 'The same missing prices in the spreadsheet: `ROWS` counts every row of the price column, `COUNT` only the numbers.',
            hint: '`=ROWS(E2:E403)-COUNT(E2:E403)`',
            explain: `${sheet('=ROWS(E2:E403)-COUNT(E2:E403)')}: SQL’s COUNT(*) − COUNT(price). COUNT means the same in both: count what is there.`,
          },
        },
        { h: 'Keys' },
        { md: `A **primary key** is a column (or several) whose value is different in every row, so it names one row: an order id should name one order. Declared as \`order_id TEXT PRIMARY KEY\`, the database itself refuses a second row with the same id. A **foreign key** is a column that holds another table's key: \`returns.order_id\` should always be an order's id (lesson 3.6).` },
        {
          choice: {
            prompt: `The raw orders table has ${COUNTS[0]} rows and ${COUNTS[2]} different ids. What happens if it is loaded into a table declared with \`order_id TEXT PRIMARY KEY\`?`,
            options: [
              { text: 'It loads, and SQLite keeps both copies.', why: 'That is what a primary key forbids.' },
              { text: `SQLite stops at the first repeated id (${DUPES[0][0]}) with “UNIQUE constraint failed”: the duplicate is caught on the way in, not found later.`, why: 'Yes. Constraints move checks from analysis time to entry time: lesson 3.2’s validation rules, enforced by the database for every program that writes to it. Here the table is loaded as it is, so the lessons can find the flaws.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'select-where', number: '10.2', title: 'SELECT and WHERE',
      goal: 'Pick columns and rows with SELECT and WHERE, write both by hand, and handle NULL with three-valued logic.',
      builds: ['database-tables'],
      blocks: [
        { h: 'Columns and rows' },
        { md: `\`SELECT item, price FROM orders WHERE price > 100\` does two things Codd named in his **relational algebra**: a **projection** π keeps some columns, a **selection** σ keeps some rows. Written as algebra, $\\pi_{\\text{item, price}}(\\sigma_{\\text{price} > 100}(\\text{orders}))$. SQL is that algebra in words: the query says *what*, not *how*.` },
        {
          code: { file: 'database.py', fn: 'project', notes: [['values = [row[c] for c in columns]', ['Each row cut down to the named columns.']], ['if key in seen:', ['`SELECT DISTINCT` drops repeats. Plain SELECT keeps them: SQL tables, unlike Codd’s sets, may hold the same row twice.']]] },
        },
        { h: 'NULL: true, false, or unknown' },
        { md: `What is \`NULL > 50\`? The price is not known, so neither is the answer. SQL has three truth values: **true**, **false** and **unknown**, and WHERE keeps only the rows where the condition is *true*. A comparison with NULL is unknown, even \`NULL = NULL\` (two unknown prices need not be equal). The one test for a missing value is \`IS NULL\`.` },
        {
          code: { file: 'database.py', fn: 'compare', notes: [['if op == "is null":', ['The only condition that is true for NULL.']], ['if value is None or target is None:', ['Any other comparison with NULL: unknown, which WHERE treats like false.']]] },
        },
        {
          code: { file: 'database.py', fn: 'where', notes: [['return [row for row in rows if compare(row[column], op, target)]', ['σ: keep the rows where the condition is true.']]] },
        },
        {
          write: {
            file: 'database.py', fn: 'where', also: [['database.py', 'compare']],
            prompt: 'Write `where(rows, column, op, target=None)`: the rows for which `compare(row[column], op, target)` is true.',
            starter: 'def where(rows, column, op, target=None):\n    return [row for row in rows if row[column] != target]\n',
            cases: cases(B.where, [[SMALL_ROWS, 'price', '>', 40], [SMALL_ROWS, 'price', 'is null'], [SMALL_ROWS, 'price', '=', null], [TO.slice(0, 40), 'item', '=', 'Lock']]),
            hint: '`[row for row in rows if compare(row[column], op, target)]`',
          },
        },
        { figure: 'NullLogic', caption: 'Each condition sorts the 402 orders into true, false and unknown. The tables give AND and OR with unknown.' },
        {
          predict: {
            prompt: `${GT50} orders have price > 50. How many have price <= 50?`,
            answer: LE50, compute: () => B.where(TO, 'price', '<=', 50).length, tolerance: 0,
            explain: `${LE50}. Together ${GT50 + LE50}, not ${TO.length}: the ${NULLS} missing prices are in neither group, because both conditions are unknown for them. A condition and its opposite don’t split a table in two when it has NULLs, a classic source of rows that silently go missing from reports.`,
          },
        },
        {
          sql: {
            prompt: 'Count the orders with no price. (Try `WHERE price = NULL` first, and see what it gives.)',
            solution: 'SELECT COUNT(*) FROM orders WHERE price IS NULL', must: ['IS NULL'],
            starter: 'SELECT COUNT(*) FROM orders WHERE price = NULL',
            answer: [[NULLS]],
            hint: '`WHERE price IS NULL`',
            explain: `${NULLS}. \`price = NULL\` gives 0: it is unknown for every row, so WHERE keeps none.`,
          },
        },
        {
          sql: {
            prompt: 'Lesson 3.5 found prices typed in pence. Find them with a WHERE: every order with a price over 1,000, showing `order_id`, `item` and `price`, the biggest first (`ORDER BY price DESC`).',
            solution: 'SELECT order_id, item, price FROM orders WHERE price > 1000 ORDER BY price DESC', must: ['WHERE', 'ORDER BY'],
            answer: PENCE,
            hint: '`SELECT order_id, item, price FROM orders WHERE price > 1000 ORDER BY price DESC`',
            explain: `${PENCE.map(([id, item, p]) => `${id} (${item}, ${p})`).join(' and ')}: lights at £25.75 and £23.75, typed as pence. In a database the fix is one statement, \`UPDATE orders SET price = price / 100 WHERE price > 1000\`, though lesson 10.9 says to wrap such changes in a transaction.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=COUNTIF(E2:E403, ">1000")', must: ['COUNTIF'],
            prompt: 'The same rows counted in the spreadsheet.',
            hint: '`=COUNTIF(E2:E403, ">1000")`',
            explain: `${sheet('=COUNTIF(E2:E403, ">1000")')}, as in SQL. A spreadsheet treats a blank as 0 in arithmetic and skips it in COUNTIF; SQL keeps NULL as unknown. Same answer here, different reasons, and they part ways in a sum or a comparison.`,
          },
        },
        {
          choice: {
            prompt: 'In SQL, `NULL OR TRUE` is…',
            options: [
              { text: 'unknown, because one side is unknown.', why: 'Whatever the unknown value is, the OR is true, since the other side is.' },
              { text: 'true: whatever the unknown side turns out to be, one true side makes an OR true.', why: 'Yes. And `NULL AND FALSE` is false for the same reason. The rule: if the known side settles it, the answer is known; otherwise it is unknown.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'sql-group-by', number: '10.3', title: 'GROUP BY and HAVING',
      goal: 'Summarise groups with GROUP BY and aggregates, know how each aggregate treats NULL, filter groups with HAVING, and know the order a query runs in.',
      builds: ['select-where'],
      blocks: [
        { h: 'Split, apply, combine in SQL' },
        { md: `\`SELECT item, AVG(price) FROM orders GROUP BY item\` is lesson 2.8's split–apply–combine: split the rows by item, apply AVG to each group's prices, combine one row per item. Every column in the SELECT must be either grouped by or inside an **aggregate** (COUNT, SUM, AVG, MIN, MAX), because a group has one row in the answer.` },
        {
          code: { file: 'database.py', fn: 'aggregate', notes: [['if how == "count_all":', ['COUNT(*): rows, whatever they hold.']], ['present = [v for v in values if v is not None]', ['Every other aggregate skips NULL first.']], ['if not present:', ['SUM of no values is NULL, not 0: “no data” stays distinguishable from “zero”.']]] },
        },
        {
          write: {
            file: 'database.py', fn: 'aggregate',
            prompt: 'Write `aggregate(values, how)` for `how` in `count_all`, `count`, `sum`, `avg`, `min`, `max`, as SQL does: `count_all` counts everything; the others drop `None` first; `count` of nothing is 0, the rest of nothing is `None`. Add with a loop.',
            starter: 'def aggregate(values, how):\n    if how == "count_all" or how == "count":\n        return len(values)\n    return sum(values) / len(values)\n',
            cases: cases(B.aggregate, [[[1, null, 3], 'count_all'], [[1, null, 3], 'count'], [[1, null, 3], 'sum'], [[1, null, 3], 'avg'], [[null], 'sum'], [[], 'count'], [[4, 9, 2], 'max'], [TO.map(r => r.price), 'avg']]),
            hint: '`present = [v for v in values if v is not None]`; return `len(present)` for count; `None` if `present` is empty; then a loop for the sum.',
          },
        },
        {
          code: { file: 'database.py', fn: 'group_aggregate', notes: [['groups.setdefault(row[key], []).append(row[column])', ['Split: one list of values per key (lesson 2.8’s dictionary).']], ['keys = sorted(groups, key=lambda k: (k is not None, k))', ['Sorted with NULL first, as SQLite sorts.']]] },
        },
        {
          sql: {
            prompt: 'For each item: the number of orders, the number with a price, and the average price. Order by item.',
            solution: 'SELECT item, COUNT(*), COUNT(price), AVG(price) FROM orders GROUP BY item ORDER BY item', must: ['GROUP BY', 'AVG'],
            answer: ITEMS,
            hint: '`SELECT item, COUNT(*), COUNT(price), AVG(price) FROM orders GROUP BY item ORDER BY item`',
            explain: `${ITEMS.length} items. The two counts differ where prices are missing; Lights’ average, ${f2(ITEMS.find(r => r[0].startsWith('Lights'))[3])}, is pulled up by the two prices typed in pence.`,
          },
        },
        {
          derive: {
            title: 'AVG skips NULL',
            steps: [
              { prompt: `Helmets: the known prices add up to ${f2(HELMET_SUM)}. There are ${HELMET[1]} helmet orders and ${HELMET[2]} known prices. AVG(price) (to 2 decimals)?`, number: HELMET[3], compute: () => B.aggregate(TO.filter(r => r.item === 'Helmet').map(r => r.price), 'avg'), tolerance: 0.005, why: `${f2(HELMET_SUM)} / ${HELMET[2]} = ${f2(HELMET[3])}: the average of what is known.` },
              { prompt: `And SUM(price) / COUNT(*), which divides by all ${HELMET[1]} rows (to 2 decimals)?`, number: HELMET_SUM / HELMET[1], compute: () => HELMET_SUM / TO.filter(r => r.item === 'Helmet').length, tolerance: 0.005, why: `${f2(HELMET_SUM / HELMET[1])}: as if the missing prices were £0. Lesson 3.3 showed the same trap when filling with 0.` },
            ],
          },
        },
        {
          formula: {
            table: 'orders', solution: '=AVERAGEIFS(E2:E403, D2:D403, "Helmet")', must: ['AVERAGEIFS'],
            prompt: 'The spreadsheet’s grouped average: `AVERAGEIFS(values, criteria range, criterion)`.',
            hint: '`=AVERAGEIFS(E2:E403, D2:D403, "Helmet")`',
            explain: `${f2(sheet('=AVERAGEIFS(E2:E403, D2:D403, "Helmet")'))}: AVERAGEIFS skips blank cells, as AVG skips NULL.`,
          },
        },
        {
          sql: {
            prompt: `\`GROUP BY town\` gives ${RAW_TOWNS} groups, because the raw towns are spelled several ways (lesson 3.1). Group by the cleaned town instead, \`LOWER(TRIM(town))\`, with its count, ordered by it.`,
            solution: 'SELECT LOWER(TRIM(town)) AS clean, COUNT(*) FROM orders GROUP BY clean ORDER BY clean', must: ['GROUP BY', 'LOWER', 'TRIM'],
            starter: 'SELECT town, COUNT(*) FROM orders GROUP BY town ORDER BY town',
            answer: TOWNS,
            hint: '`SELECT LOWER(TRIM(town)) AS clean, COUNT(*) FROM orders GROUP BY clean ORDER BY clean`',
            explain: `${TOWNS.length} towns: ${TOWNS.map(([t, n]) => `${t} ${n}`).join(', ')}. A group-by on dirty keys splits one group into many; clean the key first, in the query or (better) once, in the table.`,
          },
        },
        { h: 'HAVING, and the order a query runs in' },
        { md: `WHERE filters **rows** before they are grouped; **HAVING** filters **groups** after, so it can use aggregates: \`HAVING COUNT(*) > 1\`. The clauses are written SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, but they run in a different order:

1. **FROM** (and JOIN): which rows exist;
2. **WHERE**: keep rows;
3. **GROUP BY**: make groups;
4. **HAVING**: keep groups;
5. **SELECT**: compute the columns (so a SELECT alias can't be used in WHERE, which ran before it);
6. **ORDER BY**, then **LIMIT**.` },
        {
          sql: {
            prompt: 'Find the duplicated order ids: group by id, keep the groups with more than one row.',
            solution: 'SELECT order_id, COUNT(*) FROM orders GROUP BY order_id HAVING COUNT(*) > 1', must: ['GROUP BY', 'HAVING'],
            answer: DUPES,
            hint: '`SELECT order_id, COUNT(*) FROM orders GROUP BY order_id HAVING COUNT(*) > 1`',
            explain: `${DUPES.map(([id, n]) => `${id} (${n} rows)`).join(' and ')}: lesson 3.4’s duplicates in one query.`,
          },
        },
        {
          choice: {
            prompt: 'Which query gives the items whose known prices average over £50?',
            options: [
              { text: '`SELECT item FROM orders WHERE AVG(price) > 50 GROUP BY item`', why: 'WHERE runs before the groups exist, so it can’t use an aggregate: SQLite rejects it (“misuse of aggregate”).' },
              { text: '`SELECT item FROM orders GROUP BY item HAVING AVG(price) > 50`', why: 'Yes: HAVING runs after grouping, on each group.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'sql-joins', number: '10.4', title: 'Joins in SQL',
      goal: 'Read a join as a filtered cross product, write inner and left joins in SQL, find unmatched rows with an anti-join, and see what a join does to a sum.',
      builds: ['sql-group-by'],
      blocks: [
        { h: 'Every pair, then a filter' },
        { md: `Lesson 3.6 joined tables three ways by hand. In relational algebra a join is defined in two steps: the **cross product** (every row of one table paired with every row of the other), then a **selection** that keeps the pairs whose keys match:

$$\\text{returns} \\bowtie \\text{orders} = \\sigma_{r.\\text{order\\_id} = o.\\text{order\\_id}}(\\text{returns} \\times \\text{orders})$$

That is the definition, not the method: no database builds the cross product. It chooses a hash join, or a lookup in an index (lesson 10.5).` },
        { figure: 'JoinCross', caption: 'Five returns against some orders: every pair, and the few the ON condition keeps.' },
        {
          derive: {
            title: 'The size of the cross product',
            steps: [
              { prompt: `${TR.length} returns × ${TO.length} orders: how many pairs?`, number: TR.length * TO.length, compute: () => TR.length * TO.length, why: `${(TR.length * TO.length).toLocaleString('en-GB')} pairs, to keep ${PAIRS.length}. Two tables of a million rows would make 10¹² pairs: why the method matters.` },
            ],
          },
        },
        {
          code: { file: 'joins.py', fn: 'hash_join', notes: [['index = {}', ['Lesson 3.6’s hash join: what SQLite does when it builds a temporary index for a join.']]] },
        },
        {
          sql: {
            prompt: 'Count the pairs of a return and its order: `FROM returns r JOIN orders o ON r.order_id = o.order_id`. (`r` and `o` are short names for the tables.)',
            solution: 'SELECT COUNT(*) FROM returns r JOIN orders o ON r.order_id = o.order_id', must: ['JOIN', 'ON'],
            answer: [[PAIRS.length]],
            hint: '`SELECT COUNT(*) FROM returns r JOIN orders o ON r.order_id = o.order_id`',
            explain: `${PAIRS.length} of the ${TR.length} returns find their order. An **inner join** keeps only pairs that match; the rest of the returns vanish without a word.`,
          },
        },
        {
          sql: {
            prompt: 'A **LEFT JOIN** keeps every row of the left table, with NULLs where nothing matches. So the returns whose order is missing are the rows where `o.order_id IS NULL`: the **anti-join**. List their `return_id` and `order_id`, by return id.',
            solution: 'SELECT r.return_id, r.order_id FROM returns r LEFT JOIN orders o ON r.order_id = o.order_id WHERE o.order_id IS NULL ORDER BY r.return_id', must: ['LEFT JOIN', 'IS NULL'],
            answer: ANTI,
            hint: '`SELECT r.return_id, r.order_id FROM returns r LEFT JOIN orders o ON r.order_id = o.order_id WHERE o.order_id IS NULL ORDER BY r.return_id`',
            explain: `${ANTI.length} returns: ${ANTI.map(a => a[1]).join(', ')}, the mistyped ids of lesson 3.7. ${PAIRS.length} + ${ANTI.length} = ${TR.length}.`,
          },
        },
        {
          sql: {
            prompt: 'Revenue by category: join the orders to the catalogue on `item`, group by the catalogue’s `category`, sum `price * quantity`, biggest first.',
            solution: 'SELECT c.category, SUM(o.price * o.quantity) AS revenue FROM orders o JOIN catalogue c ON o.item = c.item GROUP BY c.category ORDER BY revenue DESC', must: ['JOIN', 'GROUP BY', 'SUM'],
            answer: REVENUE,
            hint: '`SELECT c.category, SUM(o.price * o.quantity) AS revenue FROM orders o JOIN catalogue c ON o.item = c.item GROUP BY c.category ORDER BY revenue DESC`',
            explain: `${REVENUE.map(([c, v]) => `${c} ${money(v)}`).join(', ')}. But “kit” includes the two prices typed in pence, ${money(TYPO_REVENUE)} that was never taken: a query is only as clean as its table. Lesson 10.10 leaves them out.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=XLOOKUP("Lock", catalogue!A2:A8, catalogue!B2:B8)', must: ['XLOOKUP'],
            prompt: 'The spreadsheet’s version of a join is a lookup per row: find the item in the catalogue, return its category.',
            hint: '`=XLOOKUP("Lock", catalogue!A2:A8, catalogue!B2:B8)`',
            explain: `“${sheet('=XLOOKUP("Lock", catalogue!A2:A8, catalogue!B2:B8)')}”. One lookup per row is a nested-loop join; SQL’s JOIN states the whole operation at once and lets the database pick the method.`,
          },
        },
        {
          choice: {
            prompt: 'Joining orders to returns with a LEFT JOIN and then summing the orders’ prices gives more than the orders’ total. Why?',
            options: [
              { text: 'An order with two returns appears twice in the joined table, so its price is counted twice.', why: 'Yes: the join multiplies rows (lesson 3.8’s cardinality). Sum before joining, or sum DISTINCT ids’ prices with a subquery (lesson 10.6).' },
              { text: 'The NULLs from the left join add to the sum.', why: 'SUM skips NULL. The extra comes from repeated rows.' },
            ],
            answer: 0,
          },
        },
      ],
    },

    {
      id: 'indexes', number: '10.5', title: 'Indexes',
      goal: 'Find a row in a sorted index by halving, derive why that takes about log₂ n steps, see why a B-tree needs only a few levels, and read SQLite’s plan.',
      builds: ['sql-joins'],
      blocks: [
        { h: 'Reading every row' },
        { md: `\`SELECT * FROM orders WHERE order_id = 'A1100'\`: with nothing else to go on, SQLite **scans** the table, comparing every row's id. 402 comparisons is nothing; a billion is a slow query. An **index** is the database's version of the index at the back of a book: the values of one column, **sorted**, each with where its row is. In a sorted list, a value can be found by **halving**.` },
        {
          code: { file: 'database.py', fn: 'build_index', notes: [['return sorted(pairs, key=lambda p: (p[0], p[1]))', ['Sorted by value; equal values keep their table order. Sorting costs n log n once (lesson 1.6); every lookup after is cheap.']]] },
        },
        {
          code: { file: 'database.py', fn: 'binary_search', notes: [['mid = (lo + hi) // 2', ['Look at the middle of what is left.']], ['if index[mid][0] < value:', ['The middle is too small: the first match, if any, is to the right.']], ['hi = mid', ['Otherwise it is here or to the left: the search finds the **first** match, so duplicates come out together.']], ['while lo < len(index) and index[lo][0] == value:', ['Then read the matches, all next to each other.']]] },
        },
        {
          write: {
            file: 'database.py', fn: 'binary_search',
            prompt: 'Write `binary_search(index, value)`: keep `lo` and `hi` (start `0` and `len(index)`); while `lo < hi`, count a step, look at `mid = (lo + hi) // 2`, and move `lo` past it if its value is smaller, else move `hi` to it. Then collect the positions of the matches from `lo` on. Return `[positions, steps]`.',
            starter: 'def binary_search(index, value):\n    found = [p for v, p in index if v == value]\n    return [found, len(index)]\n',
            cases: cases(B.binarySearch, [[[[1, 0], [3, 2], [3, 5], [8, 1]], 3], [[[1, 0], [3, 2], [8, 1]], 4], [B.buildIndex(TO, 'order_id'), 'A1100'], [B.buildIndex(TO, 'order_id'), 'A1018']]),
            hint: '`lo, hi, steps = 0, len(index), 0`, then `while lo < hi: mid = (lo + hi) // 2; steps += 1; …`. Afterwards `while lo < len(index) and index[lo][0] == value: found.append(index[lo][1]); lo += 1`.',
          },
        },
        { python: { program: 'binary_search', label: 'Step through binary_search in real Python' } },
        {
          derive: {
            title: 'Why log₂ n',
            steps: [
              { prompt: 'Each step halves what is left: after k steps, n / 2^k rows remain. It stops at about 1. Solve n / 2^k = 1 for k, in terms of n?', answer: 'log2(n)', vars: { n: [2, 1000] }, why: '2^k = n, so k = log₂ n.' },
              { prompt: `For the ${TO.length} orders, log₂ ${TO.length} (to 2 decimals)?`, number: Math.log2(TO.length), compute: () => Math.log2(TO.length), tolerance: 0.005, why: `${f2(Math.log2(TO.length))}: at most ${Math.ceil(Math.log2(TO.length + 1))} comparisons, against ${TO.length} for a scan. For a billion rows: 30 against 1,000,000,000.` },
              { prompt: 'Disks and memory are read in pages, so a database’s index is a **B-tree** (Bayer and McCreight, 1970): each page holds many keys, here 100, and each level divides the search by 100. Levels for a million keys: the smallest h with 100^h ≥ 1,000,000?', number: 3, compute: () => B.btreeLevels(1e6, 100), why: '100³ = 1,000,000: three page reads find any of a million rows. A billion needs 5.' },
            ],
          },
        },
        {
          code: { file: 'database.py', fn: 'btree_levels', notes: [['reach *= fanout', ['Each level multiplies the keys within reach by the fanout.']]] },
        },
        { figure: 'IndexSearch', caption: 'Type an order id: the halving steps through the sorted index. Below, a scan, binary search and a B-tree, as the table grows.' },
        {
          sql: {
            prompt: '`EXPLAIN QUERY PLAN` shows how SQLite will run a query instead of running it. Ask it about a lookup by id. Then run it again with `CREATE INDEX idx_order ON orders(order_id);` in front (each run starts from fresh tables, so the index is yours alone).',
            solution: "CREATE INDEX idx_order ON orders(order_id); EXPLAIN QUERY PLAN SELECT * FROM orders WHERE order_id = 'A1100'", must: ['CREATE INDEX', 'EXPLAIN QUERY PLAN'],
            starter: "EXPLAIN QUERY PLAN SELECT * FROM orders WHERE order_id = 'A1100'",
            hint: "`CREATE INDEX idx_order ON orders(order_id); EXPLAIN QUERY PLAN SELECT * FROM orders WHERE order_id = 'A1100'`",
            explain: 'Without the index the plan says `SCAN orders`: every row. With it, `SEARCH orders USING INDEX idx_order (order_id=?)`: down the B-tree. The query is the same; the database chose the method. That is what “SQL says what, not how” buys.',
          },
        },
        {
          choice: {
            prompt: 'Why not index every column?',
            options: [
              { text: 'Each index is a sorted copy that must be kept up to date: every INSERT and UPDATE changes it too, and it takes space. Index the columns that queries search or join on.', why: 'Yes: reads get faster, writes slower. Primary keys are indexed automatically.' },
              { text: 'SQLite allows only one index per table.', why: 'It allows many. The cost is in keeping them up to date.' },
            ],
            answer: 0,
          },
        },
      ],
    },

    {
      id: 'subqueries', number: '10.6', title: 'Subqueries',
      goal: 'Put a query inside a query: a single value, a list for IN, a subquery that refers to the outer row, and a named one with WITH.',
      builds: ['indexes'],
      blocks: [
        { h: 'A query as a value' },
        { md: `A query in brackets can stand where a value or a list would: \`WHERE price > (SELECT AVG(price) FROM orders)\` compares each price with one number the inner query works out. SQL is **composable**: every query returns a table, so a query can be built from queries.` },
        {
          sql: {
            prompt: 'How many orders have a price above the average price? Put the average in a subquery.',
            solution: 'SELECT COUNT(*) FROM orders WHERE price > (SELECT AVG(price) FROM orders)', must: ['SELECT AVG'],
            answer: [[ABOVE]],
            hint: '`SELECT COUNT(*) FROM orders WHERE price > (SELECT AVG(price) FROM orders)`',
            explain: `${ABOVE}, against an average of ${f2(AVG_PRICE)}. Leave out the two pence typos and the average is ${f2(AVG_CLEAN)}: two rows of 402 moved it by ${f2(AVG_PRICE - AVG_CLEAN)} (lesson 2.6’s sensitive mean).`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=COUNTIF(E2:E403, ">"&AVERAGE(E2:E403))', must: ['COUNTIF', 'AVERAGE'],
            prompt: 'The spreadsheet nests the same way: a criterion built from `AVERAGE`.',
            hint: '`=COUNTIF(E2:E403, ">"&AVERAGE(E2:E403))`',
            explain: `${sheet('=COUNTIF(E2:E403, ">"&AVERAGE(E2:E403))')}: a formula inside a formula, a query inside a query.`,
          },
        },
        {
          sql: {
            prompt: 'A subquery can return a list for `IN`: count the orders for items in the catalogue’s “kit” category.',
            solution: "SELECT COUNT(*) FROM orders WHERE item IN (SELECT item FROM catalogue WHERE category = 'kit')", must: ['IN'],
            answer: [[KIT]],
            hint: "`SELECT COUNT(*) FROM orders WHERE item IN (SELECT item FROM catalogue WHERE category = 'kit')`",
            explain: `${KIT} orders. The same answer as a join with a WHERE; IN reads more like the question.`,
          },
        },
        {
          predict: {
            prompt: `\`SELECT COUNT(*) FROM orders WHERE price NOT IN (SELECT price FROM orders WHERE item = 'Helmet')\`: orders whose price is not any helmet’s price. Helmet prices include a NULL. How many rows?`,
            answer: 0, compute: () => 0, tolerance: 0,
            explain: '0. `x NOT IN (a, b, NULL)` means x ≠ a AND x ≠ b AND x ≠ NULL, and the last part is unknown, so the whole is never true. One NULL in a NOT IN list empties the result: the most famous NULL trap in SQL. Use `NOT EXISTS`, or filter the NULLs out of the subquery.',
          },
        },
        {
          sql: {
            prompt: 'A **correlated** subquery refers to the outer row: count the orders priced above the average *for their own item*. In the subquery, `o.item` is the outer row’s item.',
            solution: 'SELECT COUNT(*) FROM orders o WHERE price > (SELECT AVG(price) FROM orders WHERE item = o.item)', must: ['SELECT AVG'],
            answer: [[ABOVE_OWN]],
            hint: '`SELECT COUNT(*) FROM orders o WHERE price > (SELECT AVG(price) FROM orders WHERE item = o.item)`',
            explain: `${ABOVE_OWN}. The inner query runs once per outer row (402 times), unless the database is clever enough to rewrite it as a join with a grouped table, which is what the next query does by hand.`,
          },
        },
        {
          sql: {
            prompt: '`WITH name AS (query)` names a subquery, like a variable. Name the item averages, then join to them: the same count as before.',
            solution: 'WITH item_avg AS (SELECT item, AVG(price) AS avg_price FROM orders GROUP BY item) SELECT COUNT(*) FROM orders o JOIN item_avg a ON o.item = a.item WHERE o.price > a.avg_price', must: ['WITH', 'JOIN'],
            answer: [[ABOVE_OWN]],
            hint: '`WITH item_avg AS (SELECT item, AVG(price) AS avg_price FROM orders GROUP BY item) SELECT COUNT(*) FROM orders o JOIN item_avg a ON o.item = a.item WHERE o.price > a.avg_price`',
            explain: `${ABOVE_OWN} again, with each average computed once. A **common table expression** (CTE) reads top to bottom, like LET in a spreadsheet formula (lesson 9.2).`,
          },
        },
      ],
    },

    {
      id: 'window-functions', number: '10.7', title: 'Window functions',
      goal: 'Compute an aggregate for every row without collapsing the rows: running totals, moving averages and ranks, with frames and partitions.',
      builds: ['subqueries', 'moving-average'],
      blocks: [
        { h: 'An aggregate per row' },
        { md: `GROUP BY collapses each group to one row. A **window function** computes over a set of rows but keeps every row: \`SUM(riders) OVER (ORDER BY date)\` gives each day the total up to and including it. \`OVER (…)\` describes the window: **PARTITION BY** splits the rows into groups that don't see each other, **ORDER BY** orders each group, and a **frame** (\`ROWS BETWEEN 6 PRECEDING AND CURRENT ROW\`) says which rows around the current one count. Window functions reached SQL in 2003 and SQLite in 2018.` },
        {
          sql: {
            prompt: 'The running total of riders: each date with the sum of the riders so far.',
            solution: 'SELECT date, SUM(riders) OVER (ORDER BY date) AS total FROM days ORDER BY date', must: ['OVER'],
            answer: RUNNING,
            hint: '`SELECT date, SUM(riders) OVER (ORDER BY date) AS total FROM days ORDER BY date`',
            explain: `365 rows, ending at ${RUNNING[364][1].toLocaleString('en-GB')}: lesson 9.2’s SCAN running total, as a column.`,
          },
        },
        {
          code: { file: 'database.py', fn: 'window_average', notes: [['start = max(0, i - preceding)', ['Near the start there are fewer than `preceding` rows before: the frame is just shorter.']]] },
        },
        {
          write: {
            file: 'database.py', fn: 'window_average',
            prompt: 'Write `window_average(values, preceding)`: for each position i, the average of `values[max(0, i - preceding)]` to `values[i]`.',
            starter: 'def window_average(values, preceding):\n    return values\n',
            cases: cases(B.windowAverage, [[[2, 4, 6, 8], 1], [[5, 1, 9, 3, 7], 2], [RIDERS.slice(0, 20), 6]]),
            hint: 'For each `i`: `start = max(0, i - preceding)`, add up `values[start:i + 1]` with a loop, divide by `i + 1 - start`.',
          },
        },
        { figure: 'WindowFrame', caption: 'The frame ROWS BETWEEN p PRECEDING AND CURRENT ROW on the first days, and lesson 9.2’s moving average beside it.' },
        {
          sql: {
            prompt: 'The 7-day moving average of riders as a window: `AVG(riders) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)`, with each date, in date order.',
            solution: 'SELECT date, AVG(riders) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) FROM days ORDER BY date', must: ['OVER', 'PRECEDING'],
            answer: MOVING,
            hint: '`SELECT date, AVG(riders) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) FROM days ORDER BY date`',
            explain: `From the 7th day on, lesson 9.2’s numbers exactly (day 6: ${f2(MOVING[6][1])}, ${f2(MA7[0])} there). Before that, SQL averages the rows it has (day 0 is just ${MOVING[0][1]}), where Part 9’s list had nothing. Know which one a report used.`,
          },
        },
        {
          code: { file: 'database.py', fn: 'rank_within', notes: [['if other[partition] == row[partition] and other[order] > row[order]:', ['A row’s rank is 1 + the rows in its own partition that beat it. Ties beat nobody, so they share a rank and the next rank is skipped (1, 2, 2, 4). `DENSE_RANK` gives 1, 2, 2, 3; `ROW_NUMBER` breaks ties arbitrarily.']]] },
        },
        {
          sql: {
            prompt: 'The three highest-priced orders of each item: rank within each item with `RANK() OVER (PARTITION BY item ORDER BY price DESC)` in a subquery, keep ranks up to 3 (prices known), and order by item, rank, then order id.',
            solution: 'SELECT item, order_id, price, r FROM (SELECT item, order_id, price, RANK() OVER (PARTITION BY item ORDER BY price DESC) AS r FROM orders WHERE price IS NOT NULL) WHERE r <= 3 ORDER BY item, r, order_id', must: ['RANK', 'PARTITION BY'],
            answer: TOP3,
            hint: 'The ranking goes inside: `SELECT item, order_id, price, r FROM (SELECT item, order_id, price, RANK() OVER (PARTITION BY item ORDER BY price DESC) AS r FROM orders WHERE price IS NOT NULL) WHERE r <= 3 ORDER BY item, r, order_id`',
            explain: `${TOP3.length} rows for ${new Set(TOP3.map(r => r[0])).size} items: more than 3 per item where prices tie (a service at a fixed price ties many times). The filter must go outside: a window function runs after WHERE (step 5 of lesson 10.3’s order), so WHERE can’t see its result.`,
          },
        },
      ],
    },

    {
      id: 'normalisation', number: '10.8', title: 'Normalisation',
      goal: 'Find functional dependencies, see the anomalies a repeated fact causes, and split a table into normal form.',
      builds: ['window-functions'],
      blocks: [
        { h: 'One fact, one place' },
        { md: `Join the orders to the catalogue and save the result as one wide table: every order row now carries its item's category and list price. Convenient for reading, and a trap for writing. The list price of a lock is stored once per lock order. Change it, and every one of those rows must change; miss one, and the table contradicts itself. **Normalisation** (Codd again, 1971) is the discipline of storing each fact once.` },
        {
          predict: {
            prompt: 'In the wide table, how many rows hold the list price of a Lock?',
            answer: LOCKS, compute: () => TO.filter(r => r.item === 'Lock').length, tolerance: 0,
            explain: `${LOCKS}: one per lock order. A new list price is ${LOCKS} updates (an **update anomaly**); a lock nobody has ordered yet can't be given a price at all (an **insertion anomaly**); and deleting the last lock order deletes the fact of its price (a **deletion anomaly**).`,
          },
        },
        {
          code: { file: 'database.py', fn: 'determines', notes: [['if row[a] in seen and seen[row[a]] != row[b]:', ['One counterexample breaks it: two rows with the same a and different b.']]] },
        },
        {
          write: {
            file: 'database.py', fn: 'determines',
            prompt: 'Write `determines(rows, a, b)`: True if no two rows have the same value in column `a` and different values in column `b` (a **functional dependency**, a → b).',
            starter: 'def determines(rows, a, b):\n    return True\n',
            cases: cases(B.determines, [[[{ x: 1, y: 'p' }, { x: 2, y: 'q' }, { x: 1, y: 'p' }], 'x', 'y'], [[{ x: 1, y: 'p' }, { x: 1, y: 'q' }], 'x', 'y'], [JOINED.map(r => ({ item: r.item, category: r.category, channel: r.channel })), 'item', 'category'], [JOINED.map(r => ({ item: r.item, channel: r.channel })), 'item', 'channel']]),
            hint: 'A dictionary `seen` from each value of `a` to its `b`. For each row: if `row[a]` is in `seen` with a different `b`, return False; else record it.',
          },
        },
        { md: `In the wide table, **order_id → everything** (it is the key), but also **item → category** and **item → list_price**: facts about items, not orders. The normal forms say where such facts go:

- **First normal form**: each cell holds one value (no "Helmet, Lock" in one cell, no repeating columns item1, item2…);
- **Second**: every non-key column depends on the *whole* key (matters when the key has several columns);
- **Third**: no non-key column depends on another non-key column. Item → category breaks it: category depends on the key only *through* item.

The fix is to **split out** the dependency into a table keyed by item, which is exactly the catalogue.` },
        {
          code: { file: 'database.py', fn: 'split_out', notes: [['if row[key] not in seen:', ['One row per item: each fact stored once.']], ['rest = [{c: v for c, v in row.items() if c not in columns} for row in rows]', ['The orders keep `item`, a foreign key into the new table.']]] },
        },
        {
          predict: {
            prompt: 'Split the wide table on `item`, moving `category` and `list_price` out. How many rows does the new table have?',
            answer: LOOKUP.length, compute: () => B.splitOut(JOINED, 'item', ['category', 'list_price'])[0].length, tolerance: 0,
            explain: `${LOOKUP.length}: one per item ordered, the catalogue again (minus the pump, which nobody ordered: the insertion anomaly in action). The join of lesson 10.4 puts the wide table back whenever it is needed.`,
          },
        },
        {
          sql: {
            prompt: 'Check item → category in SQL: group the joined table by item and keep the items with more than one category. An empty result means the dependency holds.',
            solution: 'SELECT o.item FROM orders o JOIN catalogue c ON o.item = c.item GROUP BY o.item HAVING COUNT(DISTINCT c.category) > 1', must: ['GROUP BY', 'HAVING', 'DISTINCT'],
            answer: [],
            hint: '`SELECT o.item FROM orders o JOIN catalogue c ON o.item = c.item GROUP BY o.item HAVING COUNT(DISTINCT c.category) > 1`',
            explain: 'No rows: every item has exactly one category. Run the same check on a real table before trusting a dependency; one dirty row is enough to break it.',
          },
        },
        {
          sql: {
            prompt: 'The returns table repeats a fact too: it stores the item, which the order already says. Count the returns whose item differs from their order’s item.',
            solution: 'SELECT COUNT(*) FROM returns r JOIN orders o ON r.order_id = o.order_id WHERE r.item <> o.item', must: ['JOIN', 'WHERE'],
            answer: [[DRIFT]],
            hint: '`SELECT COUNT(*) FROM returns r JOIN orders o ON r.order_id = o.order_id WHERE r.item <> o.item`',
            explain: `${DRIFT} of the ${PAIRS.length} matched returns: the typos of lesson 3.5, and exactly what normalisation prevents. A copy can drift from the original; a fact stored once can’t disagree with itself. Normalised, returns would keep only the order id.`,
          },
        },
        {
          choice: {
            prompt: 'Analysts often build wide, repeated tables on purpose (a "data warehouse"). Is that a mistake?',
            options: [
              { text: 'Yes: every table should always be in third normal form.', why: 'For tables that are written to, usually. A table that is only read has no update anomalies.' },
              { text: 'Not for a read-only copy: normalise where data is written (the shop’s system), and denormalise copies for analysis, rebuilt from the source, where joins would only slow reading.', why: 'Yes. Kimball’s star schemas do this: one wide “fact” table of events and small “dimension” tables, built for reading.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'transactions', number: '10.9', title: 'Transactions',
      goal: 'Group changes into a transaction that happens completely or not at all, let a constraint stop a bad change, and know what ACID promises.',
      builds: ['normalisation'],
      blocks: [
        { h: 'All or nothing' },
        { md: `A customer buys two bikes and a helmet. The shop's system must take three units off the stock and record the order. If the power fails after the bikes but before the helmet, the stock is wrong and nothing says so. A **transaction** groups changes so they happen **all or none**: BEGIN, the changes, then COMMIT to make them permanent, or ROLLBACK to undo every one. The guarantees are called **ACID** (Härder and Reuter, 1983):

- **Atomicity**: all of the transaction or none of it;
- **Consistency**: it takes the database from one valid state to another, and the constraints (keys, CHECKs) hold after;
- **Isolation**: transactions running at the same time don't see each other's half-done work;
- **Durability**: once committed, it survives a crash (SQLite writes a journal before changing the file).` },
        {
          code: { file: 'database.py', fn: 'place_orders', notes: [['units INTEGER CHECK (units >= 0)', ['A **constraint**: SQLite refuses any change that would make stock negative.']], ['with conn:', ['Python’s sqlite3: the block is one transaction. It commits if the block finishes and rolls back if an error escapes it.']], ['except sqlite3.IntegrityError:', ['The CHECK failed on one order, so every order in the block was undone.']]] },
        },
        {
          write: {
            file: 'database.py', fn: 'place_orders', packages: ['sqlite3'], prelude: 'import sqlite3',
            prompt: 'Write `place_orders(stock, orders)` as in the code above: a `stock` table with a CHECK that units stay at 0 or more, filled from the dictionary and committed; then all the UPDATEs inside `with conn:`, catching `sqlite3.IntegrityError`. Return `[the stock as a dictionary, whether it went through]`.',
            starter: 'def place_orders(stock, orders):\n    after = dict(stock)\n    for item, quantity in orders:\n        if item in after:\n            after[item] -= quantity\n    return [after, True]\n',
            cases: cases(B.placeOrders, [[{ Bike: 3, Helmet: 5 }, [['Bike', 2], ['Helmet', 1]]], [{ Bike: 3, Helmet: 5 }, [['Bike', 2], ['Bike', 2]]], [{ Lock: 1 }, [['Pump', 4]]], [{ Helmet: 2, Lock: 4 }, [['Lock', 4], ['Helmet', 3]]]]),
            hint: 'The starter lets stock go negative and never undoes anything. Build the table with `CHECK (units >= 0)`, `conn.commit()` after filling it, then `try: with conn: …` and `except sqlite3.IntegrityError: ok = False`.',
          },
        },
        {
          predict: {
            prompt: 'Stock: 2 helmets and 4 locks. Orders, in one transaction: 4 locks, then 3 helmets. How many locks are in stock afterwards?',
            answer: 4, compute: () => B.placeOrders({ Helmet: 2, Lock: 4 }, [['Lock', 4], ['Helmet', 3]])[0].Lock, tolerance: 0,
            explain: '4. The locks were taken first (stock 0, allowed), then the helmets would have gone to −1, the CHECK failed, and the rollback put the locks back too. Without the transaction the locks would be gone and the order half-recorded.',
          },
        },
        {
          sql: {
            prompt: 'A transaction in SQL: `BEGIN;` double every list price with an UPDATE, `ROLLBACK;` then add up the catalogue’s list prices. Did the doubling survive?',
            solution: 'BEGIN; UPDATE catalogue SET list_price = list_price * 2; ROLLBACK; SELECT SUM(list_price) FROM catalogue', must: ['BEGIN', 'ROLLBACK'],
            starter: 'UPDATE catalogue SET list_price = list_price * 2; SELECT SUM(list_price) FROM catalogue',
            answer: [[LIST_SUM]],
            hint: '`BEGIN; UPDATE catalogue SET list_price = list_price * 2; ROLLBACK; SELECT SUM(list_price) FROM catalogue`',
            explain: `${f2(LIST_SUM)}, the original total: the rollback undid the update. Without BEGIN and ROLLBACK (the starter) the sum doubles. Each run starts from fresh tables, so experiment freely.`,
          },
        },
        {
          choice: {
            prompt: 'Lesson 10.2 fixed the prices typed in pence with one UPDATE. Why put even a single UPDATE in a transaction with a check?',
            options: [
              { text: 'BEGIN; UPDATE …; then a SELECT to check the result (the count changed, no price is now silly); COMMIT only if it looks right, ROLLBACK if not. A wrong WHERE can change thousands of rows, and only a transaction gets them back.', why: 'Yes: the habit that saves a database from a mistyped WHERE.' },
              { text: 'A single UPDATE is not saved without a transaction.', why: 'SQLite commits a statement on its own (autocommit). The point is the chance to check before committing.' },
            ],
            answer: 0,
          },
        },
      ],
    },

    {
      id: 'four-views', number: '10.10', title: 'Project: four views of one question',
      goal: 'Answer one question about the shop four ways (SQL, the spreadsheet, Python by hand and pandas), check that they agree, and know when to use which.',
      builds: ['transactions'],
      blocks: [
        { h: 'Revenue by month' },
        { md: `The question: **how much did the shop take each month?** Revenue is price × quantity, leaving out missing prices and the two typed in pence (prices of 1,000 or more). Four ways to ask it, which must agree to the penny.` },
        {
          sql: {
            prompt: 'In SQL: the month is `substr(date, 1, 7)`; keep prices under 1,000 (NULLs drop out on their own); group by month, in order.',
            solution: 'SELECT substr(date, 1, 7) AS month, SUM(price * quantity) AS revenue FROM orders WHERE price < 1000 GROUP BY month ORDER BY month', must: ['GROUP BY', 'SUM', 'WHERE'],
            answer: MONTHLY,
            hint: '`SELECT substr(date, 1, 7) AS month, SUM(price * quantity) AS revenue FROM orders WHERE price < 1000 GROUP BY month ORDER BY month`',
            explain: `12 months; the best, ${BEST_MONTH[0]}, took ${money(BEST_MONTH[1])}.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=SUMPRODUCT((MONTH(B2:B403)=7)*(E2:E403<1000)*E2:E403*F2:F403)', must: ['SUMPRODUCT', 'MONTH'],
            prompt: 'In the spreadsheet, one month: July’s revenue, with the same rule for prices.',
            hint: '`=SUMPRODUCT((MONTH(B2:B403)=7)*(E2:E403<1000)*E2:E403*F2:F403)`',
            explain: `${f2(sheet('=SUMPRODUCT((MONTH(B2:B403)=7)*(E2:E403<1000)*E2:E403*F2:F403)'))}, SQL’s July ${f2(JULY)}. A blank price is 0 here, so it adds nothing, where SQL drops it as NULL: the same total for different reasons.`,
          },
        },
        {
          code: { file: 'database.py', fn: 'monthly_revenue', notes: [['if row["price"] is None or row["price"] >= under:', ['WHERE price < 1000, NULLs included in what is left out.']], ['totals[month] = totals.get(month, 0) + row["price"] * row["quantity"]', ['GROUP BY month with SUM: a dictionary of running totals.']]] },
        },
        {
          write: {
            file: 'database.py', fn: 'monthly_revenue',
            prompt: 'By hand: write `monthly_revenue(rows, under=1000)`: skip rows whose price is `None` or at least `under`; add `price * quantity` into a dictionary by `date[:7]`; return `[month, total]` pairs with the months sorted.',
            starter: 'def monthly_revenue(rows, under=1000):\n    return []\n',
            cases: cases(B.monthlyRevenue, [[[{ date: '2025-01-03', price: 10, quantity: 2 }, { date: '2025-02-01', price: null, quantity: 1 }, { date: '2025-01-09', price: 2500, quantity: 1 }, { date: '2025-02-11', price: 4.5, quantity: 3 }]], [TO]]),
            hint: '`totals = {}`; for each row with a usable price, `totals[month] = totals.get(month, 0) + row["price"] * row["quantity"]`; `return [[m, totals[m]] for m in sorted(totals)]`.',
          },
        },
        {
          code: { file: 'frames.py', fn: 'monthly_revenue_frame', notes: [['kept = frame[frame["price"].notna() & (frame["price"] < under)]', ['A mask: the WHERE.']], ['revenue = (kept["price"] * kept["quantity"]).groupby(kept["date"].str[:7]).sum()', ['The GROUP BY and SUM in one line.']]] },
        },
        {
          choice: {
            prompt: 'All four agree. Which one for which job?',
            options: [
              { text: 'Always pandas: it is the most powerful.', why: 'Powerful in a program, but the data must fit in memory and come out of the database first.' },
              { text: 'SQL where the data lives (large, shared, the database does the work and only the answer travels); a spreadsheet to look and explain to someone; pandas for analysis and models in a program; by hand to understand what the others do, and to check them.', why: 'Yes. They are four views of one table, which is the idea this lab started with in lesson 1.7.' },
            ],
            answer: 1,
          },
        },
        { note: 'Part 11 prepares data for machine learning: features from dates, text and categories, what accuracy hides, and a pipeline that never lets the test data leak into training.', kind: 'key' },
      ],
    },
  ],
}
