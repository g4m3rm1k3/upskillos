---
title: 3.1 — Delete with a Motion: d, dd and D
track: Neovim — Operators and the Dot
trackOrder: 71.02
runtime: none
---

Chapter 2 taught you to move. This chapter teaches you to **edit**, and it does it with almost no new keys, because Neovim's editing keys are built out of the motions you already know.

An **operator** is a key that does something to text: `d` deletes, `c` changes, `y` copies. On its own it does nothing yet. It waits for a **motion**, and then acts on all the text between the cursor and where that motion would have gone. So `dw` means "delete to where `w` would go", `d$` "delete to the end of the line", `dt)` "delete up to the `)`". Read it as a sentence: a verb, then what to do it to.

- Every motion you know works after every operator. Three operators and twenty motions give you sixty edits, and you only had to learn twenty-three keys.
- In VS Code the same edit takes two steps: select (Shift with Ctrl+Right, say), then press Delete. In Neovim it's one command, and in lesson 3.4 you'll repeat a whole command with a single key.

Shelf's three handlers each set the same header and turn their answer into JSON the same way. This lesson moves that repeated code into one helper function, and almost every edit is a delete.

## The delete operator: d and a motion

Type `d`, then any motion. The bottom-right corner of the status line shows the `d` while Neovim waits for the motion; Esc cancels it.

| Keys | Deletes |
|---|---|
| `dw` | to the start of the next word: the rest of this word **and** the space after it |
| `de` | to the end of this word, keeping the space |
| `db` | back to the start of the word |
| `d$` | to the end of the line |
| `d^` / `d0` | back to the first character / the first column |
| `dt)` | up to the next `)`, which stays |
| `df,` | up to **and including** the next `,` |

Which characters go depends on where the motion lands:

- **`w` lands on the first letter of the next word**, and that letter isn't deleted. So `dw` takes the word and the gap after it, ready for the next word to slide into place.
- **`e`, `$`, `f` and `t` land on a character that is deleted**: the last letter of the word, the last character of the line, the `,` you found, the character just before the `)`.
- **Backward motions (`b`, `^`, `0`, `F`, `T`) delete up to the cursor**, not including the character under it.

A count multiplies the motion: `d2w` (or `2dw`) deletes two words, and `d2f(` deletes through the **second** `(`.

```predict
question: The cursor is on the r at the start of response.end(JSON.stringify({ ok: true })); — you type d2f(. What's left of the line?
choice: JSON.stringify({ ok: true }));
choice: { ok: true }));
choice: ({ ok: true }));
answer: { ok: true }));
explain: f( would stop on the first (, after response.end. 2f( goes on to the second, after JSON.stringify, and f is a motion whose landing character is deleted, so both ( go. The two ) at the end stay: d only deletes what the motion crossed.
verify: printf 'response.end(JSON.stringify({ ok: true }));\n' > .verify.txt && "$NVIM_BIN" --clean --headless .verify.txt -c 'normal! d2f(' -c "lua io.stdout:write(vim.fn.getline(1) .. '\n')" -c 'qa!'; rm -f .verify.txt
```

## Whole lines: dd, D and line motions

| Keys | Deletes |
|---|---|
| `dd` | the whole line the cursor is on, wherever the cursor is in it |
| `3dd` | three lines, starting with this one |
| `D` | from the cursor to the end of the line: a shorter `d$` |
| `dj` / `dk` | this line and the one below / above |
| `dG` / `dgg` | from this line to the end / the start of the file |
| `d12G` | from this line to line 12 |
| `d}` | down to the next blank line |

- Doubling an operator (`dd`) means "this whole line". You'll see the same with `cc` and `yy`.
- An operator before an up-or-down motion (`j`, `k`, `G`, `gg`) deletes **whole lines**, not a part of one. `d}` deletes whole lines too when the cursor starts in the first column.
- `x`, from chapter 1, is short for `dl`: delete the character under the cursor.
- A delete is not lost. Neovim keeps the deleted text, and lesson 3.3 puts it back somewhere else. And `u` undoes any delete.

## Apply: an old comment, with dd

Open `server/server.js` and `:set number`. Line 4 is the line you commented out in chapter 1, `// console.log('Shelf is starting');`, and line 5 is the blank line under it. A comment that only holds old code is clutter: it tells the next reader nothing.

`4G`, then `2dd` deletes both lines. `:w`.

```javascript file=server/server.js
import http from 'node:http';
import { listBookmarks, health, countBookmarks } from './routes.js';

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

- If you deleted the wrong lines, `u` brings them back. Then try again.

```check
lacks server/server.js "Shelf is starting" label="the old comment is gone" -- 4G puts the cursor on the comment's line; 2dd deletes it and the blank line under it.
run "test $(wc -l < server/server.js) -eq 25" label="server.js has 25 lines" -- Exactly two lines go: the comment and the blank line under it. Undo with u and try again.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/health; kill $!); echo \"$out\"" stdout="\"ok\":true" label="the server still starts and answers" -- A line Shelf needs was deleted. Undo with u until it's back, then :w.
```

## A helper for JSON answers

`health` and `countBookmarks` end the same way: set the `Content-Type` header to JSON, then send `JSON.stringify(` something `)`. When two places repeat the same lines, a change to one (a new header, say) has to be made to both, and sooner or later one gets missed. A **helper function** holds the repeated lines once.

Open `server/routes.js`. `4G` goes to the `const DATA` line. Press `o`, Enter once more for a blank line, and type the function, without leading spaces. Esc, `:w`.

```javascript file=server/routes.js
// Shelf's request handlers: one exported function for each route.
import fs from 'node:fs';

const DATA = new URL('../data/bookmarks.json', import.meta.url);

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
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify({ ok: true, name: 'shelf', uptime: process.uptime() }));
}

export function countBookmarks(request, response) {
  const bookmarks = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify({ count: bookmarks.length, empty: bookmarks.length === 0 }));
}
```

- **`function sendJson(response, value) { … }`** takes the response to answer and the **value** to send: an object, an array, a number, anything JSON can describe.
- Its two lines are the ones the handlers repeat, with `value` where each handler had its own object.
- There's no **`export`**: only the handlers in this file use it, and the header comment says the exports are the routes' handlers. A function without `export` can't be imported by another file.

Nothing calls `sendJson` yet, so Shelf answers exactly as before.

```check
run "node --input-type=module -e \"const { health } = await import('./server/routes.js'); health({}, { setHeader() {}, end(s) { console.log(s); } });\"" stdout="\"ok\":true" label="routes.js still loads and health still answers" -- Check the new function's braces and parentheses: one { at the end of the first line, one } on its own line at the end.
contains server/routes.js "function sendJson(response, value) {" label="routes.js has a sendJson(response, value) function" -- The first line is function sendJson(response, value) {
contains server/routes.js "  response.end(JSON.stringify(value));" label="sendJson sends JSON.stringify(value)" -- The helper's second line is response.end(JSON.stringify(value)); with value, the parameter, inside.
```

## Apply: health with sendJson, d and a count

Now `health` can hand its object to `sendJson`. Two deletes and one insert:

1. `19G` goes to `health`'s `setHeader` line. `dd` deletes it, and the line below moves up into its place.
2. `^` puts the cursor on the `r` of `response.end(`. `d2f(` deletes `response.end(JSON.stringify(`, through the second `(`, as in the prediction.
3. `i`, then `sendJson(response, ` (with the space after the comma), Esc.
4. The line now ends `}));`, one `)` too many: the `(` of `response.end(` is gone, but its `)` isn't. `$` goes to the `;`, `h` to the `)` before it, and `x` deletes it. `:w`.

```javascript file=server/routes.js
// Shelf's request handlers: one exported function for each route.
import fs from 'node:fs';

const DATA = new URL('../data/bookmarks.json', import.meta.url);

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
  const bookmarks = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify({ count: bookmarks.length, empty: bookmarks.length === 0 }));
}
```

- **`sendJson(response, { … })`** calls the helper with this request's `response` and the object to send. The helper sets the header and stringifies it, so `health` no longer has to.

Restart the server and `curl -i http://localhost:3000/api/health`. **`-i`** makes `curl` print the response's headers above its body: `Content-Type: application/json; charset=utf-8` is still there, set by `sendJson` now.

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/health; kill $!); echo \"$out\"" stdout="{\"ok\":true,\"name\":\"shelf\"" label="/api/health answers {\"ok\":true,\"name\":\"shelf\",…}" -- The line should read sendJson(response, { ok: true, name: 'shelf', uptime: process.uptime() }); with one ) before the ;
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s -i http://localhost:3917/api/health; kill $!); echo \"$out\"" stdout="Content-Type: application/json; charset=utf-8" label="it's still sent as JSON" -- health should call sendJson, which sets the header.
lacks server/routes.js "response.end(JSON.stringify({ ok" label="health no longer stringifies its own answer" -- d2f( from the r of response.end deletes response.end(JSON.stringify( in one go.
```

## A count too few

What if you'd typed `df(`, with no count? The delete would stop at the first `(`, leaving `JSON.stringify(` in the line. Make that mistake on purpose to see what it does: on `health`'s line, `^`, `f{`, `i`, `JSON.stringify(`, Esc; then `$`, `i`, `)`, Esc. The line reads:

```javascript
  sendJson(response, JSON.stringify({ ok: true, name: 'shelf', uptime: process.uptime() }));
```

`:w`, restart the server and `curl http://localhost:3000/api/health`.

```predict
question: health now hands sendJson the result of JSON.stringify, and sendJson calls JSON.stringify on it again. What does curl print?
choice: {"ok":true,"name":"shelf","uptime":…}, the same as before
choice: "{\"ok\":true,\"name\":\"shelf\",\"uptime\":…}", in quotes with backslashes
choice: Nothing: the server stops with an error
answer: "{\"ok\":true,\"name\":\"shelf\",\"uptime\":…}", in quotes with backslashes
explain: The first JSON.stringify turns the object into text. The second is given that text, a string, and does what it does to any string: wraps it in double quotes and puts a backslash before each double quote inside it. The answer is valid JSON, but it's one string, not an object.
```

- **The symptom**: the answer starts with `"` instead of `{`. Code that reads it would get one long string, and `answer.ok` would be `undefined`.
- **The cause**: the value was **stringified twice**. `sendJson` stringifies, so whoever calls it must hand over the value itself.
- **Where to look**: anything that calls `sendJson` with `JSON.stringify(` still inside it.

Restore the line: `u` twice undoes the two inserts. `:w`, and check that the answer starts with `{` again.

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/health; kill $!); echo \"$out\"" stdout="{\"ok\":true" label="/api/health answers an object again" -- Undo with u until the line reads sendJson(response, { ok: true, … }); then :w.
```

## Drill: delete words

Click **Fresh copy of practice/drills/21-delete-words.txt**, open it, and delete the two extra `is`, so that it reads `console.log('Shelf is listening');`.

```text file=practice/drills/21-delete-words.txt provided
console.log('Shelf is is is listening');
```

Par 4: {{key:motion-W}} jumps over `console.log('Shelf` to the first `is`, then {{key:delete}} with a count and {{key:motion-w}}: `d2w` deletes two words, each with the space after it.

```check
run "sed -n 1p practice/drills/21-delete-words.txt | grep -Fqx \"console.log('Shelf is listening');\"" label="line 1 reads console.log('Shelf is listening');" -- Click Fresh copy of practice/drills/21-delete-words.txt and try again.
run "test $(wc -l < practice/drills/21-delete-words.txt) -eq 1" label="it has 1 line" -- A line was added or removed. Click Fresh copy of practice/drills/21-delete-words.txt and try again.
keys practice/drills/21-delete-words.txt par=4
```

## Drill: delete to the end of the line

Click **Fresh copy of practice/drills/22-delete-to-end.txt**, open it, and delete the comment, with the space before it.

```text file=practice/drills/22-delete-to-end.txt provided
const port = process.env.PORT || 3000; // TODO: delete this comment
```

Par 3: {{key:till}} with `/` stops on the space just before the comment, and {{key:D}} deletes from there to the end of the line.

```check
run "sed -n 1p practice/drills/22-delete-to-end.txt | grep -Fqx 'const port = process.env.PORT || 3000;'" label="line 1 reads const port = process.env.PORT || 3000; with nothing after it" -- Click Fresh copy of practice/drills/22-delete-to-end.txt and try again. Start the delete on the space before the //.
run "test $(wc -l < practice/drills/22-delete-to-end.txt) -eq 1" label="it has 1 line" -- A line was added or removed. Click Fresh copy of practice/drills/22-delete-to-end.txt and try again.
keys practice/drills/22-delete-to-end.txt par=3
```

## Drill: delete lines

Click **Fresh copy of practice/drills/23-delete-lines.txt**, open it, and delete the three `OLD` lines.

```text file=practice/drills/23-delete-lines.txt provided
GET /api/bookmarks
OLD /api/list
OLD /api/ping
OLD /ping
GET /api/health
GET /health
GET /api/bookmarks/count
```

Par 4: {{key:j}} onto the first `OLD` line, then {{key:dd}} with a count of 3. (`dj` with a count, `d2j`, deletes the same three lines.)

```check
run "sed -n 2p practice/drills/23-delete-lines.txt | grep -Fqx 'GET /api/health'" label="line 2 reads GET /api/health" -- Click Fresh copy of practice/drills/23-delete-lines.txt and try again.
run "sed -n 1p practice/drills/23-delete-lines.txt | grep -Fqx 'GET /api/bookmarks'" label="line 1 is still GET /api/bookmarks" -- Click Fresh copy of practice/drills/23-delete-lines.txt and try again. Move down one line before deleting.
run "test $(wc -l < practice/drills/23-delete-lines.txt) -eq 4" label="it has 4 lines" -- Three lines should go. Click Fresh copy of practice/drills/23-delete-lines.txt and try again.
keys practice/drills/23-delete-lines.txt par=4
```

## Drill: delete to the end of the file

Click **Fresh copy of practice/drills/24-delete-to-the-end.txt**, open it, and delete everything from the `--- notes` line to the end.

```text file=practice/drills/24-delete-to-the-end.txt provided
GET /api/bookmarks
GET /api/health
--- notes: delete from here to the end ---
check the health route
add a count route
ask about caching
try a missing brace
fix the comma
ship it
```

Par 4: two {{key:j}} (or `3G`) to the `--- notes` line, then {{key:delete}} with {{key:G}}: `dG` deletes from this line to the last.

```check
run "sed -n 2p practice/drills/24-delete-to-the-end.txt | grep -Fqx 'GET /api/health'" label="line 2 is still GET /api/health" -- Click Fresh copy of practice/drills/24-delete-to-the-end.txt and try again. Start on the --- notes line.
run "test $(wc -l < practice/drills/24-delete-to-the-end.txt) -eq 2" label="it has 2 lines" -- Everything from line 3 on should go. Click Fresh copy of practice/drills/24-delete-to-the-end.txt and try again.
keys practice/drills/24-delete-to-the-end.txt par=4
```

## Review: two lines, fixed by finding

Click **Fresh copy of practice/review/03-01.txt**. Line 2 should end `health`, and the last line should be `GET /api/tags`, with forward slashes. Recall the keys before hovering.

```text file=practice/review/03-01.txt provided
GET /api/bookmarks
GET /api/healtj
GET /health
POST /api/bookmarks
GET /api/bookmarks/count
GET \api\tags
```

Par 12: {{key:j}}, {{key:line-end}}, {{key:r}} with `h` (4). Then {{key:G}}: it keeps the cursor's column as far as the line allows, so the cursor lands at the end of the last line. {{key:find-back}} with `\` finds the second backslash; {{key:r}} with `/`; {{key:repeat-find}} goes on to the first, and {{key:r}} with `/` again (8).

```check
run "sed -n 2p practice/review/03-01.txt | grep -Fqx 'GET /api/health'" label="line 2 reads GET /api/health" -- Click Fresh copy of practice/review/03-01.txt and try again.
run "sed -n 6p practice/review/03-01.txt | grep -Fqx 'GET /api/tags'" label="line 6 reads GET /api/tags" -- Click Fresh copy of practice/review/03-01.txt and try again.
run "test $(wc -l < practice/review/03-01.txt) -eq 6" label="it has 6 lines" -- A line was added or removed. Click Fresh copy of practice/review/03-01.txt and try again.
keys practice/review/03-01.txt par=12
```

## Your turn: count with sendJson

**Build, on your own:** make `countBookmarks` send its answer with `sendJson`, the way `health` does now. `/api/bookmarks/count` must answer exactly as before, `{"count":31,"empty":false}`, as JSON.

Decide which lines go, which part of the `response.end` line to delete, and what's left over at the end of the line.

```hints
nudge: It's the same change as health's: one whole line goes, and the start of the other line is replaced by a call to sendJson.
concept: `dd` deletes a whole line wherever the cursor is. `d2f(` from the start of `response.end(` deletes through the second `(`, the one after `JSON.stringify`. That leaves one `)` too many before the `;`.
shape: On `countBookmarks`' `setHeader` line: `dd`. Then `^`, `d2f(`, `i`, `sendJson(response, `, Esc. Then `$`, `h`, `x`.
```

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/bookmarks/count; kill $!); echo \"$out\"" stdout="{\"count\":31,\"empty\":false}" label="/api/bookmarks/count answers {\"count\":31,\"empty\":false}" -- If the answer starts with a quote, it was stringified twice: pass sendJson the object itself.
run "test $(grep -c \"setHeader('Content-Type', 'application/json; charset=utf-8')\" server/routes.js) -eq 2" label="only sendJson and listBookmarks set the JSON header themselves" -- countBookmarks' own setHeader line should be gone: sendJson sets the header.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s -i http://localhost:3917/api/bookmarks/count; kill $!); echo \"$out\"" stdout="Content-Type: application/json; charset=utf-8" label="the count is still sent as JSON" -- Call sendJson(response, { … }) instead of response.end: it sets the header.
```

The checks establish that the count answers as before, with the JSON header, and that `countBookmarks` no longer sets the header itself. They don't show why `listBookmarks` keeps its own lines. Look at it and work out what would happen if it called `sendJson(response, text)`: `text` is already JSON, so it would be the double-stringify mistake from earlier in this lesson.

### What you have

```text
server/server.js   no old comment
server/routes.js   sendJson; health and countBookmarks use it
```

| Keys | Deletes |
|---|---|
| `d` and a motion | from the cursor to where the motion goes: `dw`, `de`, `d$`, `dt)`, `d2f(` |
| `dd` / `3dd` | the line / three lines |
| `D` | to the end of the line |
| `d` and `j`, `k`, `G`, `gg` | whole lines: `dj`, `dG`, `d12G` |

Next: `c`, the operator that deletes and leaves you in Insert mode to type the replacement. Shelf starts telling unknown paths that they weren't found.
