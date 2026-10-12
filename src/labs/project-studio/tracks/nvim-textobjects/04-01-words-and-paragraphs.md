---
title: 4.1 — Inside and Around: Words and Paragraphs
track: Neovim — Text Objects
trackOrder: 71.03
runtime: none
---

Every edit in chapter 3 started from where the cursor was: `dw` deletes from the cursor to the next word, `c$` changes from the cursor to the end of the line. So before each edit you first had to put the cursor at the **start** of what you wanted to change.

A **text object** removes that step. It names a whole thing (a word, a paragraph, and in the next lessons a string, a bracketed list, an HTML element) and the operator acts on all of it, **wherever the cursor is inside it**. `ciw` reads "change inner word": the whole word under the cursor, whether the cursor is on its first letter, its last, or anywhere between.

Shelf's routes read and parse the data file themselves, each in its own way. This lesson moves that code into `server/store.js`, so that every read (and, in 4.2, every write) of the data goes through one place.

## A text object: i or a, then what

A text object is two keys typed **after an operator**: `i` or `a`, then a letter for the kind of thing.

| Object | Selects |
|---|---|
| `iw` | the word under the cursor ("inner word") |
| `aw` | the word **and** the space after it ("a word") |
| `iW` / `aW` | the WORD under the cursor, without or with its space |
| `ip` | the paragraph under the cursor: its lines, up to the blank lines around it |
| `ap` | the paragraph **and** the blank lines after it |

- **`i` means inner**: just the thing. **`a` means around**: the thing and the space that separates it from its neighbours, so deleting it leaves no double space or double blank line behind.
- **A word and a WORD** mean what they meant for `w` and `W` in chapter 2: a word is letters, digits and `_`, or a run of punctuation; a WORD is everything between two spaces. In `fs.readFileSync(DATA,` the cursor on `read` is in the word `readFileSync` and in the WORD `fs.readFileSync(DATA,`.
- **The operator comes first.** `iw` alone isn't a command: in Normal mode `i` enters Insert mode, so typing `iw` there types a `w` into the file. Always `d`, `c` or `y` first: `diw`, `caw`, `yip`.
- **When there's no space after** (the last word on a line), `aw` takes the space **before** the word instead, so `daw` still leaves the line tidy.

```predict
question: The line is const bookmarks = readBookmarks(); and the cursor is on the k of bookmarks. You type daw. What is the line now?
choice: const = readBookmarks();
choice: const  = readBookmarks();
choice: const bookmar = readBookmarks();
answer: const = readBookmarks();
explain: aw is the whole word bookmarks, wherever the cursor is in it, plus the space after it. So one space is left between const and =. diw would have left two spaces (the ones on both sides of the word), and dw from the k would only have deleted the rest of the word from the cursor, leaving bookmar plus the space.
verify: printf 'const bookmarks = readBookmarks();\n' > .verify.txt && "$NVIM_BIN" --clean --headless .verify.txt -c 'normal! fkdaw' -c "lua io.stdout:write(vim.fn.getline(1) .. '\n')" -c 'qa!'; rm -f .verify.txt
```

## Why not cw?

`cw` and `ciw` do the same thing when the cursor is on the first letter of a word. They differ when it isn't, and in what `.` does next.

- **`cw` from the middle** changes from the cursor to the end of the word. With the cursor on the `T` of `DATA`, `cwFILE` gives `DAFILE`.
- **`ciw` from anywhere in the word** changes the whole word. With the cursor on the `T`, `ciwFILE` gives `FILE`.
- **`.` repeats the whole change**, object included. After `ciwFILE`, `.` replaces whatever word the cursor is in with `FILE`, from any letter of it. After `cwFILE`, `.` only changes from the cursor onwards, so you must put the cursor on the first letter each time.

Often `b` then `cw` costs the same number of keys as `ciw`. But `b` only gets you to the start of the word when the cursor isn't already there: on the first letter, `b` goes back to the **previous** word. `ciw` works the same whatever the position, so you never have to check.

## Paragraphs: ip and ap

To Neovim a **paragraph** is a run of lines with a blank line above and below, the same unit `{` and `}` jump between (lesson 2.4). In code that's usually one function, one block of imports, one table.

- `dap` deletes the function the cursor is in, with the blank line after it, so the code below closes up neatly. `yap` copies it.
- `dap}p` swaps a paragraph with the one below it: delete it, jump past the next paragraph, put it there. It's `ddp` (lesson 3.3) for whole blocks.
- If the paragraph is the **last** in the file, there's no blank line after it, so `ap` takes the blank line before it.
- **A comment counts as part of the paragraph.** A comment line written directly above code, with no blank line between them, belongs to the same paragraph. `dap` on line 2 of `server/routes.js` would delete line 1, the file's comment, as well.

## Move the data code into store.js

Open `server/routes.js` and `:set number`. Lines 2 to 4 are the only code that knows where the data file is:

```text
2  import fs from 'node:fs';
3
4  const DATA = new URL('../data/bookmarks.json', import.meta.url);
```

Move them to `server/store.js`, the empty file the starter project came with:

1. `2G`, then `3dd` deletes lines 2, 3 and 4. (`dap` would take line 1 too: the comment and the import are one paragraph.) A delete is also a cut, so the three lines are ready to put.
2. `:w` to save `routes.js`, then `:e server/store.js`. Neovim won't switch files while the current one has unsaved changes (the `E37` error from lesson 1.1).
3. `P` puts the three lines above the empty file's only line.
4. `gg`, `O`, and type the file's comment (below). Esc.
5. `G` goes to the last line, the empty one. `o`, and type the function, Enter after each line, without leading spaces. Esc, `:w`.

```javascript file=server/store.js
// Shelf's data: every read and write of data/bookmarks.json goes through here.
import fs from 'node:fs';

const DATA = new URL('../data/bookmarks.json', import.meta.url);

export function readBookmarks() {
  return JSON.parse(fs.readFileSync(DATA, 'utf8'));
}
```

- **`new URL('../data/bookmarks.json', import.meta.url)`** is the same line as before, unchanged. `store.js` is in the same folder as `routes.js` (`server/`), so `..` still means the project folder and the path still reaches the data.
- **`readBookmarks()`** reads the file and parses it: what `countBookmarks` did on its first line. **`return`** hands the parsed list back to whoever called the function.
- **`export`** makes the function importable from other files, as with the handlers in `routes.js`. `DATA` isn't exported: no other file needs to know where the data lives.

```check
run "node --input-type=module -e \"const m = await import('./server/store.js'); console.log(m.readBookmarks().length);\"" stdout="31" label="readBookmarks() returns all 31 bookmarks" -- server/store.js needs the import of fs, the DATA line, and an exported readBookmarks that returns JSON.parse(fs.readFileSync(DATA, 'utf8')).
run "node --input-type=module -e \"const m = await import('./server/store.js'); console.log(Object.keys(m).join(',') === 'readBookmarks');\"" stdout="true" label="store.js exports readBookmarks, and nothing else" -- Only the function is exported: export in front of it, its name spelled readBookmarks, and no export on the DATA line.
```

## Use the store in routes.js

`routes.js` now uses `fs` and `DATA` without defining them. Bring the count back first.

1. `:e server/routes.js`. `gg`, `o`, and type the import below (line 2). Esc.
2. `countBookmarks`' first line is `const bookmarks = JSON.parse(fs.readFileSync(DATA, 'utf8'));`. Go there (`:set number` shows its number; it's line 21), `^`, `f=`, `w` puts the cursor on `JSON`, and `C`, `readBookmarks();` replaces the rest of the line. Esc, `:w`.

```javascript file=server/routes.js
// Shelf's request handlers: one exported function for each route.
import { readBookmarks } from './store.js';

function sendJson(response, value) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(value));
}

export function listBookmarks(request, response) {
  const text = fs.readFileSync(DATA, 'utf8');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(text);
}

export function health(request, response) {
  sendJson(response, { ok: true, name: 'shelf', uptime: process.uptime() });
}

export function countBookmarks(request, response) {
  const bookmarks = readBookmarks();
  sendJson(response, { count: bookmarks.length, empty: bookmarks.length === 0 });
}

export function home(request, response) {
  sendJson(response, { name: 'shelf', routes: Object.keys(routes) });
}

export function notFound(request, response) {
  response.statusCode = 404;
  sendJson(response, { error: 'not found', method: request.method, path: request.url });
}

export function serverError(request, response) {
  response.statusCode = 500;
  sendJson(response, { error: 'server error' });
}

export const routes = {
  'GET /': home,
  'GET /api': home,
  'GET /api/bookmarks': listBookmarks,
  'GET /api/health': health,
  'GET /health': health,
  'GET /api/bookmarks/count': countBookmarks,
};
```

- **`import { readBookmarks } from './store.js';`** brings in the function, as `server.js` brings in `routes`. The `./` means "in the same folder as this file".
- **`const bookmarks = readBookmarks();`** calls it. The rest of `countBookmarks` doesn't change: `bookmarks` is the same list it was before.
- If you wrote `serverError` differently in lesson 3.5, keep yours: only the import and `countBookmarks` change here.

Restart the server. `curl http://localhost:3000/api/bookmarks/count` answers `{"count":31,"empty":false}` as before.

```predict
question: listBookmarks still uses fs and DATA, and routes.js no longer has either. What does curl -i http://localhost:3000/api/bookmarks get?
choice: The bookmark list, as before
choice: Status 500, and the server keeps running
choice: Nothing: the server stops
answer: Status 500, and the server keeps running
explain: fs.readFileSync throws a ReferenceError: fs is not defined, the moment listBookmarks runs. The try in server.js (lesson 3.5) catches it, logs it, and answers 500. The server's terminal shows the error, with an at line naming listBookmarks in routes.js. Fixing it is your turn, at the end of this lesson.
```

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s -m 2 http://localhost:3917/api/bookmarks/count; kill $!); echo \"$out\"" stdout="{\"count\":31,\"empty\":false}" label="/api/bookmarks/count answers from the store" -- countBookmarks' first line should be const bookmarks = readBookmarks(); and routes.js needs the import from './store.js'.
lacks server/routes.js "JSON.parse(" label="countBookmarks no longer parses the file itself" -- Replace JSON.parse(fs.readFileSync(DATA, 'utf8')) in countBookmarks with readBookmarks().
```

## Rename DATA, from the middle of the word

`DATA` doesn't hold data: it holds the file's **location**. `store.js` will soon have the data itself in a variable too, so call the location `FILE`. Make the classic mistake first.

Open `server/store.js`. `7G` is the line with `fs.readFileSync(DATA, 'utf8')`; `0` then `fT` lands on the `T` of `DATA`, the middle of the word, where a cursor often is when you decide to rename something.

- Type `cw`, `FILE`, Esc, `:w`. The line now reads `fs.readFileSync(DAFILE, 'utf8')`: `cw` changed from the cursor to the end of the word, and the `DA` before the cursor stayed.
- Restart the server and `curl -i http://localhost:3000/api/bookmarks/count`: status 500.
- **How to find it**: the server's terminal shows `ReferenceError: DAFILE is not defined`, and the first `at` line names `readBookmarks` and `store.js:7`. A "not defined" name that looks like two names run together is the sign of a change that started in the middle of a word.

Now do it right:

1. `u` takes the bad change back, and leaves the cursor where it started, on the `T`.
2. `ciw`, `FILE`, Esc. The whole word goes, wherever the cursor was in it.
3. `4G`, `0`, `fD` lands on the `D` of `DATA` on line 4, and `.` repeats the change there: the whole word again, `FILE`. `:w`.

```javascript file=server/store.js
// Shelf's data: every read and write of data/bookmarks.json goes through here.
import fs from 'node:fs';

const FILE = new URL('../data/bookmarks.json', import.meta.url);

export function readBookmarks() {
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}
```

- `fs.readFileSync(FILE, 'utf8')` now reads as what it does: read the file at `FILE` as text.
- `.` changed the whole of the second `DATA` from its first letter, and would have from any other. After `cw`, it would only have worked from the first.

Restart the server: the count answers again.

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s -m 2 http://localhost:3917/api/bookmarks/count; kill $!); echo \"$out\"" stdout="{\"count\":31,\"empty\":false}" label="the count still answers" -- Both places need the same name: const FILE = … on line 4, and fs.readFileSync(FILE, 'utf8') on line 7.
lacks server/store.js "DATA" label="no DATA is left in store.js" -- ciw, FILE on one DATA, then . on the other.
```

## Drill: one rename, three lines

Click **Fresh copy of practice/drills/40-ciw-dot.txt**, open it, and rename every `total` to `sum`.

```text file=practice/drills/40-ciw-dot.txt provided
total = 0
 total += price
  total += tax
```

Par 11: {{key:ciw}}, `sum`, {{key:esc}}. Then {{key:j}} and {{key:dot}}, twice. Each line starts one column further in, so {{key:j}} lands inside each `total` at a different letter, and {{key:dot}} changes the whole word anyway. (With {{key:change}} and {{key:motion-w}}, the last line would need a {{key:motion-b}} first: try it, and count.)

```check
run "sed -n 1p practice/drills/40-ciw-dot.txt | grep -Fqx 'sum = 0'" label="line 1 reads sum = 0" -- Click Fresh copy of practice/drills/40-ciw-dot.txt and try again.
run "sed -n 3p practice/drills/40-ciw-dot.txt | grep -Fqx '  sum += tax'" label="line 3 reads   sum += tax" -- Click Fresh copy of practice/drills/40-ciw-dot.txt and try again.
run "test $(grep -c total practice/drills/40-ciw-dot.txt) -eq 0 && test $(wc -l < practice/drills/40-ciw-dot.txt) -eq 3" label="no total is left, and it has 3 lines" -- Click Fresh copy of practice/drills/40-ciw-dot.txt and try again.
keys practice/drills/40-ciw-dot.txt par=11
```

## Drill: delete words, keep the spaces right

Click **Fresh copy of practice/drills/41-daw.txt**, open it, and delete `big` from line 1 and `too` from the end of line 2, leaving single spaces and no space at the end of a line.

```text file=practice/drills/41-daw.txt provided
Shelf keeps every bookmark in one big file
and reads it again on every request too
```

Par 10: {{key:find}} with `g` lands on the last letter of `big`, and {{key:aw}} after {{key:delete}} takes the word and the space after it (5). {{key:j}}, {{key:line-end}} to the last letter of `too`, and {{key:delete}} {{key:aw}} again: there's no space after `too`, so it takes the space before it (5).

```check
run "sed -n 1p practice/drills/41-daw.txt | grep -Fqx 'Shelf keeps every bookmark in one file'" label="line 1 reads Shelf keeps every bookmark in one file" -- Click Fresh copy of practice/drills/41-daw.txt and try again. daw takes one space with the word, so one is left.
run "sed -n 2p practice/drills/41-daw.txt | grep -Fqx 'and reads it again on every request'" label="line 2 reads and reads it again on every request, with no space at the end" -- Click Fresh copy of practice/drills/41-daw.txt and try again. diw would leave the space before too.
run "test $(wc -l < practice/drills/41-daw.txt) -eq 2" label="it has 2 lines" -- Click Fresh copy of practice/drills/41-daw.txt and try again.
keys practice/drills/41-daw.txt par=10
```

## Drill: swap two blocks

Click **Fresh copy of practice/drills/42-paragraphs.txt**, open it, and swap the first two blocks, so the `POST` and `DELETE` lines come first.

```text file=practice/drills/42-paragraphs.txt provided
GET /api/health
GET /health

POST /api/bookmarks
DELETE /api/bookmarks

GET /api/bookmarks/count
```

The result:

```text
POST /api/bookmarks
DELETE /api/bookmarks

GET /api/health
GET /health

GET /api/bookmarks/count
```

Par 5: {{key:delete}} {{key:ap}} cuts the first block and its blank line; {{key:paragraph-down}} jumps to the blank line after the next block, and {{key:put}} puts the cut block below it. (`3dd` ties with {{key:delete}} {{key:ap}} here, because the block is exactly three lines with its blank one; {{key:ap}} doesn't need you to count.)

```check
run "sed -n 1p practice/drills/42-paragraphs.txt | grep -Fqx 'POST /api/bookmarks'" label="line 1 reads POST /api/bookmarks" -- Click Fresh copy of practice/drills/42-paragraphs.txt and try again.
run "sed -n 4p practice/drills/42-paragraphs.txt | grep -Fqx 'GET /api/health' && sed -n 6p practice/drills/42-paragraphs.txt | grep -Fqx ''" label="the GET block follows, with a blank line after it" -- Click Fresh copy of practice/drills/42-paragraphs.txt and try again. ap takes the blank line with the block, so it arrives with one.
run "test $(wc -l < practice/drills/42-paragraphs.txt) -eq 7" label="it has 7 lines" -- Click Fresh copy of practice/drills/42-paragraphs.txt and try again.
keys practice/drills/42-paragraphs.txt par=5
```

## Review: case, indent and a typo

Click **Fresh copy of practice/review/04-01.txt**, open it, and fix line 3: the method in capitals, indented like line 2, and `hmoe` spelled `home`. Recall the keys before hovering.

```text file=practice/review/04-01.txt provided
const routes = {
  'GET /': home,
'get /api': hmoe,
};
```

Par 11: {{key:G}} with a count of 3 (2). {{key:l}} onto the `g`, and {{key:tilde}} with a count of 3 (3), **before** indenting: {{key:indent}} leaves the cursor in the first column, on a space (2). {{key:find}} with `m`, then {{key:x}} and {{key:put}} swap the two letters (4).

```check
run "sed -n 3p practice/review/04-01.txt | grep -Fqx \"  'GET /api': home,\"" label="line 3 reads   'GET /api': home," -- Click Fresh copy of practice/review/04-01.txt and try again.
run "test $(wc -l < practice/review/04-01.txt) -eq 4" label="it has 4 lines" -- Click Fresh copy of practice/review/04-01.txt and try again.
keys practice/review/04-01.txt par=11
```

## Your turn: list the bookmarks from the store

**Build, on your own:** `/api/bookmarks` answers 500 since the data code moved. Make `listBookmarks` get the list from the store, like `countBookmarks`, so that `curl -i http://localhost:3000/api/bookmarks` answers status 200 with all 31 bookmarks as JSON, the JSON `Content-Type`, and still `Cache-Control: no-store`. When you're done, `routes.js` shouldn't mention `fs` at all.

Decide which of `listBookmarks`' four lines are still needed, and what replaces the others.

```hints
nudge: routes.js already has a function that sets the JSON Content-Type and turns a value into JSON text. The value you want to send comes from readBookmarks().
concept: sendJson(response, value) sets the Content-Type and sends JSON.stringify(value). Any other header must be set before it, because response.end sends the answer.
shape: In listBookmarks, delete the const text line and the Content-Type line (2dd on the first), keep the Cache-Control line, and change the last line (cc) to sendJson(response, readBookmarks());
```

```check
run "out=$(PORT=3917 node server/server.js > /dev/null & sleep 1; curl -s -m 2 http://localhost:3917/api/bookmarks; kill $!); echo \"$out\" | node -e \"let s = ''; process.stdin.on('data', (c) => { s += c; }).on('end', () => console.log(JSON.parse(s).length));\"" stdout="31" label="/api/bookmarks answers with all 31 bookmarks as JSON" -- listBookmarks should send readBookmarks() through sendJson.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s -m 2 -i http://localhost:3917/api/bookmarks; kill $!); echo \"$out\"" stdout="Content-Type: application/json; charset=utf-8" label="with the JSON Content-Type" -- sendJson sets the header; response.end alone doesn't.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s -m 2 -i http://localhost:3917/api/bookmarks; kill $!); echo \"$out\"" stdout="Cache-Control: no-store" label="and still Cache-Control: no-store" -- Keep response.setHeader('Cache-Control', 'no-store'); and put it before sendJson.
lacks server/routes.js "fs." label="routes.js no longer reads the file itself" -- Only store.js should use fs. listBookmarks gets the list from readBookmarks().
```

The checks establish the answer's body, its two headers, and that the file reading has left `routes.js`. They don't establish that the store is the only place that knows where the data file is: `grep -rn bookmarks.json server` should list lines in `store.js` and nowhere else. Predict how many lines it finds before you run it.

### What you have

```text
server/store.js    readBookmarks(): the one place the data file is read
server/routes.js   gets its data from the store; no fs, no file path
```

| Keys | Does |
|---|---|
| `ciw` / `diw` / `yiw` | change / delete / copy the word under the cursor, from anywhere in it |
| `caw` / `daw` | the same, with the space after it (or before, at the end of a line) |
| `ciW` / `daW` | the same for a WORD (everything between spaces) |
| `dap` / `yap` / `cip` | a paragraph: the lines between blank lines, with or without the blank after |

Next: quotes. `ci'` changes a string from anywhere inside it, or even from before it on the line. Shelf gets `writeBookmarks` and its first `POST`, so a bookmark can be added with `curl`.
