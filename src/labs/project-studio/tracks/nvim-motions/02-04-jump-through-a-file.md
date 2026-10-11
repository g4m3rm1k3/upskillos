---
title: 2.4 — Jump Through a File: gg, G, Counts, { } and %
runtime: none
---

The motions so far work within a line or a few lines. This lesson's keys cross a whole file: to the top or bottom, to any line by number, from one block of code to the next, and from a bracket to the one that closes it. They also introduce **counts**, a number typed before a motion to repeat it.

Shelf gets a third route, `/api/bookmarks/count`. Then a missing `}` sends Node's error message to the wrong line, and `%` shows where the real mistake is.

## Top and bottom: gg and G

| Keys | Moves to |
|---|---|
| `gg` | the first line of the file |
| `G` | the last line |
| a number, then `G` | that line: `12G` goes to line 12 |

- `12G` does what chapter 1's `:12` does, without the Enter.
- These keep the cursor's column where the line allows, as `j` and `k` do.
- In VS Code these are Ctrl+Home and Ctrl+End (Cmd+Up and Cmd+Down on a Mac), and Ctrl+G for a line number.

## Counts: a number before a motion

Almost every motion takes a **count**: a number typed first, which repeats it.

- `3w` moves three words, `5j` five lines down, `2f,` to the second comma.
- `3x` deletes three characters.
- A count goes **before** the key, and nothing appears on screen while you type it (the bottom-right corner of the status line shows it).

Counts pay off when the number is obvious at a glance. When you'd have to count the words first, `w` pressed a few times, or a find, is often faster.

## Blocks of lines: { and }

A **paragraph**, to Neovim, is a run of lines with no blank line in it.

- **`}`** moves down to the next blank line, the end of the current paragraph.
- **`{`** moves up to the previous blank line.

Programmers separate functions and sections with blank lines, so in code these keys hop from one function to the next. In `server/routes.js`, press `}` a few times from the top, then `{` to come back.

## Matching brackets: %

**`%`** jumps from a bracket to its partner: from `(` to its `)`, from `[` to its `]`, from `{` to its `}`, and back again.

- If the cursor isn't on a bracket, `%` looks along the line for the next one, and jumps to its partner.
- In long code this answers "where does this block end?" without counting braces by eye.

```predict
question: In server/server.js, the cursor is on the { at the end of line 8, const server = http.createServer((request, response) => {. You press %. Where does it land?
choice: On the } that closes the /api/bookmarks if block
choice: On the } of the }); line that ends the handler
choice: On the last line of the file
answer: On the } of the }); line that ends the handler
explain: % skips over every complete pair in between, the if blocks included, and stops at the one } that closes this {: the start of the }); line after the last response.end.
```

Try it, with `:8` (or `8G`), `$` and `%`. Press `%` again to jump back.

## A header comment, with gg

Open `server/routes.js`. Wherever the cursor is, `gg` takes it to line 1. Press `O` to open a line above, and type a comment saying what the file is for. Esc, `:w`.

```javascript file=server/routes.js
// Shelf's request handlers: one exported function for each route.
import fs from 'node:fs';

const DATA = new URL('../data/bookmarks.json', import.meta.url);

export function listBookmarks(request, response) {
  const text = fs.readFileSync(DATA, 'utf8');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(text);
}

export function health(request, response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify({ ok: true, name: 'shelf', uptime: process.uptime() }));
}
```

- A comment at the top of a file that says what the file is for helps whoever opens it next, which is often you, months later.

```check
run "head -n 1 server/routes.js | grep -q '^//'" label="routes.js starts with a comment" -- gg, then O, then type the comment starting with //.
run "node --input-type=module -e \"const { health } = await import('./server/routes.js'); health({}, { setHeader() {}, end(s) { console.log(s); } });\"" stdout="\"ok\":true" label="the file still runs" -- The comment needs // at its start, or Node reads it as code.
```

## Count the bookmarks, with G

A page that shows "1 bookmark" needs only the number, not the whole list. Add a handler that sends just the count.

`G` takes the cursor to the last line, the `}` that closes `health`. Press `o`, Enter once more for a blank line, and type the new function. Esc, `:w`.

```javascript file=server/routes.js
// Shelf's request handlers: one exported function for each route.
import fs from 'node:fs';

const DATA = new URL('../data/bookmarks.json', import.meta.url);

export function listBookmarks(request, response) {
  const text = fs.readFileSync(DATA, 'utf8');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(text);
}

export function health(request, response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify({ ok: true, name: 'shelf', uptime: process.uptime() }));
}

export function countBookmarks(request, response) {
  const bookmarks = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify({ count: bookmarks.length }));
}
```

- **`JSON.parse(text)`** is the opposite of `JSON.stringify`: it reads JSON text and returns the JavaScript value it describes. `listBookmarks` sent the text as it was; to count the bookmarks, the program needs them as values.
- The file holds `[ … ]`, a JSON **array**: a list of values in order, separated by commas. Each value here is an object with a title and a URL. So `bookmarks` is an array of objects.
- **`bookmarks.length`** is the number of items in the array.
- **`{ count: bookmarks.length }`** is turned into `{"count":1}` for one bookmark.

```check
run "node --input-type=module -e \"const { countBookmarks } = await import('./server/routes.js'); countBookmarks({}, { setHeader() {}, end(s) { console.log(s); } });\"" stdout="{\"count\":1}" label="countBookmarks sends {\"count\":1}" -- Check JSON.parse around fs.readFileSync(DATA, 'utf8'), and count: bookmarks.length.
```

## Route it, with % and t

Open `server/server.js`. Do the import first this time, so the route never runs without it:

- `2G`, `0`, then {{key:till}} with `}`: the cursor stops on the space before the `}`. `i`, `, countBookmarks`, Esc.

Then the route, after the health block:

- `14G` goes to the health `if` line. `$` goes to its `{`, and `%` to the `}` that closes it.
- `o`, then type the new block. Esc, `:w`.

```javascript file=server/server.js
import http from 'node:http';
import { listBookmarks, health, countBookmarks } from './routes.js';

// console.log('Shelf is starting');

const port = process.env.PORT || 3000; // 3000 unless PORT is set

const server = http.createServer((request, response) => {
  console.log(new Date().toISOString(), request.method, request.url);
  if (request.url === '/api/bookmarks') {
    listBookmarks(request, response);
    return;
  }
  if (request.url === '/api/health' || request.url === '/health') {
    health(request, response);
    return;
  }
  if (request.url === '/api/bookmarks/count') {
    countBookmarks(request, response);
    return;
  }
  response.end(`Shelf is running on port ${port}. You asked for ${request.url}\n`);
});

server.listen(port, () => {
  console.log(`Shelf is listening on http://localhost:${port}`);
});
```

- `/api/bookmarks/count` and `/api/bookmarks` don't interfere: `===` compares the whole path, so each `if` matches exactly one.

Restart the server; `curl http://localhost:3000/api/bookmarks/count` prints `{"count":1}`.

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/bookmarks/count; kill $!); echo \"$out\"" stdout="{\"count\":1}" label="/api/bookmarks/count answers {\"count\":1}" -- Import countBookmarks next to health, and check the path in the new if.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/bookmarks; kill $!); echo \"$out\"" stdout="https://neovim.io" label="/api/bookmarks still sends the list" -- Put the new block after the health block's }, not inside another block.
```

## A missing brace, found with %

Line 17 is the `}` that closes the health block. Delete it: `17G`, {{key:first-char}} (onto the `}`), `x`. `:w`, then `npm start`.

```predict
question: One } is missing from the middle of the handler. Which line does Node's error point to?
choice: Line 17, where the } was deleted
choice: Line 14, the if whose block is no longer closed
choice: A line near the end of the file
answer: A line near the end of the file
explain: Code without the } is still readable for a while: the next if simply looks nested inside the health block. The reader only fails when a bracket can't be matched at all, at the }); after the handler, so that's the line it reports.
```

Node refuses to start:

```text
file:///…/shelf/server/server.js:23
});
 ^

SyntaxError: Unexpected token ')'
```

- Line 23 is fine. As with the comma in 1.2, the error is where the reader **gave up**, which can be far past the real mistake.
- Ask Neovim instead. `14G`, `$`, `%`: from the health block's `{`, the cursor jumps to line **23**, not to the end of the health block. That says the health block now runs to the end of the handler: its `}` is missing somewhere between 14 and 23.
- `8G`, `$`, `%` from the handler's `{` doesn't move at all: that `{` has no partner left.

Restore the brace with `u`, `:w`, and check with `14G$%` that the health block ends on line 17 again. Then `npm start`.

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/health; kill $!); echo \"$out\"" stdout="\"ok\":true" label="the server starts and answers again" -- Undo with u until the } is back on line 17, then :w.
```

## Drill: counts

Click **Fresh copy of practice/drills/18-count.txt**, open it, and fix line 6: `Rquest` is missing its `e`.

```text file=practice/drills/18-count.txt provided
200 OK
201 Created
204 No Content
301 Moved Permanently
304 Not Modified
400 Bad Rquest
404 Not Found
500 Internal Server Error
```

Par 7: {{key:count}} with {{key:j}} (`5j`) or {{key:G}} (`6G`) reaches line 6 in two keys; then {{key:motion-w}} twice to the `R`, and {{key:a}}, `e`, {{key:esc}}.

```check
run "sed -n 6p practice/drills/18-count.txt | grep -Fqx '400 Bad Request'" label="line 6 reads 400 Bad Request" -- Click Fresh copy of practice/drills/18-count.txt and try again.
run "test $(wc -l < practice/drills/18-count.txt) -eq 8" label="it has 8 lines" -- A line was added or removed. Click Fresh copy of practice/drills/18-count.txt and try again.
keys practice/drills/18-count.txt par=7
```

## Drill: to the matching brace

Click **Fresh copy of practice/drills/19-match.txt**, open it, and label the function's closing brace, so that it reads `} // start`.

```text file=practice/drills/19-match.txt provided
function start() {
  console.log(1);
  console.log(2);
  console.log(3);
  console.log(4);
  console.log(5);
  console.log(6);
  console.log(7);
  console.log(8);
  console.log(9);
  console.log(10);
}
start();
listen();
ready();
```

Par 13: {{key:line-end}} reaches the `{`, {{key:match}} jumps to its `}`, then {{key:a}}, ` // start`, {{key:esc}}. A count gets there in one more key (`11j`), and so does {{key:G}} with `3k`.

```check
run "sed -n 12p practice/drills/19-match.txt | grep -Fqx '} // start'" label="line 12 reads } // start" -- Click Fresh copy of practice/drills/19-match.txt and try again.
run "test $(wc -l < practice/drills/19-match.txt) -eq 15" label="it has 15 lines" -- A line was added or removed. Click Fresh copy of practice/drills/19-match.txt and try again.
keys practice/drills/19-match.txt par=13
```

## Drill: by blocks

Click **Fresh copy of practice/drills/20-blocks.txt**, open it, and add `PUT /api/bookmarks` as the last line of the bookmarks block.

```text file=practice/drills/20-blocks.txt provided
# health
GET /api/health
GET /api/version

# bookmarks
GET /api/bookmarks
GET /api/bookmarks/count
POST /api/bookmarks
DELETE /api/bookmarks
GET /api/bookmarks/first

# tags
GET /api/tags
```

Par 22: {{key:paragraph-down}} twice lands on the blank line after the bookmarks block; {{key:O}} opens a line above it; then `PUT /api/bookmarks` and {{key:esc}}.

```check
run "sed -n 11p practice/drills/20-blocks.txt | grep -Fqx 'PUT /api/bookmarks'" label="line 11 reads PUT /api/bookmarks" -- Click Fresh copy of practice/drills/20-blocks.txt and try again.
run "sed -n 10p practice/drills/20-blocks.txt | grep -Fqx 'GET /api/bookmarks/first'" label="line 10 is still GET /api/bookmarks/first" -- Click Fresh copy of practice/drills/20-blocks.txt and try again.
run "sed -n 12p practice/drills/20-blocks.txt | grep -qx ''" label="a blank line still follows the block" -- Click Fresh copy of practice/drills/20-blocks.txt and try again.
run "test $(wc -l < practice/drills/20-blocks.txt) -eq 14" label="it has 14 lines" -- A line was added or removed. Click Fresh copy of practice/drills/20-blocks.txt and try again.
keys practice/drills/20-blocks.txt par=22
```

## Review: two finds on one line

Click **Fresh copy of practice/review/02-04.txt**. Add a comma after `port`, and `Shelf ` (with a space) before `ready`, so that the line reads `server.listen(port, () => console.log('Shelf ready'));`. Recall the keys before hovering.

```text file=practice/review/02-04.txt provided
server.listen(port () => console.log('ready'));
```

Par 15: {{key:find}} with a space lands just after `port`; {{key:i}}, `,`, {{key:esc}} (5). Then {{key:find}} with `'`, and {{key:a}}, `Shelf `, {{key:esc}} (10).

```check
run "sed -n 1p practice/review/02-04.txt | grep -Fqx \"server.listen(port, () => console.log('Shelf ready'));\"" label="line 1 reads server.listen(port, () => console.log('Shelf ready'));" -- Click Fresh copy of practice/review/02-04.txt and try again.
run "test $(wc -l < practice/review/02-04.txt) -eq 1" label="it has 1 line" -- A line was added or removed. Click Fresh copy of practice/review/02-04.txt and try again.
keys practice/review/02-04.txt par=15
```

## Your turn: say when there's nothing

A page could show "No bookmarks yet" instead of "0 bookmarks", if the server says so plainly.

**Build, on your own:** make `/api/bookmarks/count` also send `empty`: `true` when there are no bookmarks and `false` otherwise. With the one starter bookmark it answers `{"count":1,"empty":false}`. Work it out from the bookmarks; don't write `false` in yourself.

```hints
nudge: The answer is an object with one pair. Add a second pair, whose value is a comparison.
concept: A comparison such as `a === b` is itself a value: `true` or `false`. JSON.stringify writes those as `true` and `false`.
shape: The object becomes `{ count: bookmarks.length, empty: bookmarks.length === 0 }`. Reach it with `G`, then `k` to the response.end line, and `t}` before typing with `i`.
```

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/bookmarks/count; kill $!); echo \"$out\"" stdout="{\"count\":1,\"empty\":false}" label="one bookmark gives {\"count\":1,\"empty\":false}" -- Add , empty: … after count: bookmarks.length, inside the same braces.
run "node --input-type=module -e \"import fs from 'node:fs'; const real = fs.readFileSync; fs.readFileSync = (p, e) => String(p).endsWith('bookmarks.json') ? '[]' : real(p, e); const { countBookmarks } = await import('./server/routes.js'); countBookmarks({}, { setHeader() {}, end(s) { console.log(s); } });\"" stdout="{\"count\":0,\"empty\":true}" label="no bookmarks gives {\"count\":0,\"empty\":true}" -- empty has to be worked out: compare bookmarks.length with 0 using ===.
```

The second check runs `countBookmarks` with the data file swapped for an empty list (`[]`), without touching your real file. Together the checks establish both answers. They do not cover a data file that isn't valid JSON: `JSON.parse` would throw, and the server would stop. You'll see that happen in the next lesson.

### What you have

```text
server/routes.js   a header comment; listBookmarks, health and countBookmarks
server/server.js   /api/bookmarks, /api/health, /health and /api/bookmarks/count
```

| Keys | Moves to |
|---|---|
| `gg` / `G` / `12G` | first line / last line / line 12 |
| a count before a motion | repeats it: `3w`, `5j`, `2f,` |
| `{` / `}` | previous / next blank line |
| `%` | the matching bracket |

Next: scrolling through a file too long for the screen, and the last motions of the chapter.
