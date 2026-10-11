---
title: 3.3 — Copy and Paste: y, yy, p and P
runtime: none
---

Neovim's copy is called **yank**, and its paste is called **put**. (`c` was already taken by change, so copy got `y`.) Yank is an operator like `d` and `c`: `y` and a motion copies what the motion crosses, and leaves the text where it is. Put places the copied text next to the cursor.

- VS Code's Ctrl+C and Ctrl+V become `y` and `p`. Its "duplicate line" (Shift+Alt+Down) is `yyp`, and its "move line down" (Alt+Down) is `ddp`.
- **Neovim's yank doesn't go to your computer's clipboard** by default, and Ctrl+V from another app doesn't reach `p`. Chapter 8 connects them. Inside Neovim, across all the files you open, `y` and `p` work together.

Shelf's server picks a handler with a chain of `if` blocks, one per path. This lesson replaces the chain with a **table**: a list of paths, each paired with its handler. You'll copy an existing handler twice to make the two new ones it needs.

## Yank: y and a motion

| Keys | Copies |
|---|---|
| `yw` / `ye` / `y$` / `yt,` | what the motion crosses, as with `d` and `c` |
| `yy` | the whole line |
| `3yy` | three lines, starting with this one |
| `Y` | to the end of the line, the same as `y$` |

- The text stays where it is, so nothing on screen changes. The status line says how many lines were yanked when it's more than a couple.
- In Vim, `Y` copies the whole line; Neovim changed it to match `D` and `C`.

## Put: p and P

| Keys | Puts the text |
|---|---|
| `p` | **after** the cursor, or **below** the cursor's line if what you yanked was whole lines |
| `P` | **before** the cursor, or **above** the line |
| `3p` | three copies |

- What you yanked decides how it's put. Whole lines (`yy`, `dd`, `y2j`) go in as new lines, wherever the cursor is in its line. Part of a line (`yw`, `y$`) goes into the line, next to the cursor.
- After putting whole lines, the cursor is on the first character of the first new line.

## Deleting is also cutting

`d`, `c` and `x` keep what they removed, in the same place a yank does, so `p` can put it back somewhere else. That makes them **cut**, not just delete.

| Keys | Does |
|---|---|
| `ddp` | swaps this line with the one below: cut it, put it below the next |
| `ddP` | from the lower of two lines, swaps them the other way: cut it, put it above |
| `xp` | swaps this character with the next: `GTE` with the cursor on `T` becomes `GET` |

There's one place for the latest yank **or** delete, and each new one replaces it. So a `d` or `c` between your yank and your put changes what `p` puts:

```predict
question: In a file with the lines alpha beta and gamma, you yank the first line with yy. Then j, and dw deletes gamma. Now p. What appears?
choice: alpha beta, on a new line below: the line you yanked
choice: gamma: the word dw deleted
choice: Nothing: the yank was used up
answer: gamma: the word dw deleted
explain: dw put gamma in the same place as the yank, replacing alpha beta. p puts whatever is there, so gamma comes straight back. Chapter 8 shows where Neovim still keeps the last yank, and how to put that instead.
verify: printf 'alpha beta\ngamma\n' > .verify.txt && "$NVIM_BIN" --clean --headless .verify.txt -c 'normal! yyjdwp' -c "lua io.stdout:write((vim.fn.getline(2) == 'gamma' and vim.fn.line('$') == 2) and 'gamma: the word dw deleted\n' or 'something else\n')" -c 'qa!'; rm -f .verify.txt
```

## Two handlers, from copies of health

The table needs two handlers Shelf doesn't have yet:

- **`home`**, for `/`, will answer with a list of every path Shelf knows: a handy start page for anyone exploring the API with `curl`.
- **`notFound`** will answer every path that isn't in the table, with a 404 and a JSON message.

Both are one `sendJson` call, like `health`. So copy `health` twice and change what differs. Open `server/routes.js` and `:set number`.

1. **Yank**: `18G` goes to `export function health`; `3yy` yanks its three lines.
2. **Put the first copy**: `G` to the last line, `o` and Esc for a blank line, then `p`.
3. **Put the second copy now**, before changing anything: `G`, `o`, Esc, `p`. A change would replace the yank, as the prediction showed.
4. **Make the first copy `home`**: `27G`, `^` (after a line jump the cursor keeps its column), `ww` onto `health`, `cw`, `home`, Esc. Then `j`, `^`, `f{`, `w` onto `ok`; `d2W` deletes `ok: true, `. Then `fu` onto `uptime`, `ct}`, and type `routes: Object.keys(routes) ` (with the space at the end), Esc.
5. **Make the second copy `notFound`**: `31G`, `^`, `ww`, `cw`, `notFound`, Esc. Then `j`, `^`, `f{`, `w`, `ct}`, and type `error: 'not found', path: request.url ` (space at the end), Esc. Last, `O` above it: `response.statusCode = 404;`, Esc.

`:w`.

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
  sendJson(response, { count: bookmarks.length, empty: bookmarks.length === 0 });
}

export function home(request, response) {
  sendJson(response, { name: 'shelf', routes: Object.keys(routes) });
}

export function notFound(request, response) {
  response.statusCode = 404;
  sendJson(response, { error: 'not found', path: request.url });
}
```

- **`Object.keys(routes)`** gives an array of an object's keys: here, every path in the table you'll write next. `routes` doesn't exist yet, so `home` can't run until it does. Nothing calls it yet.
- **`notFound`** sets the status before `sendJson` sends the answer, as the 404 lines in `server.js` do.
- **`path: request.url`** puts the path that was asked for into the answer.

```check
run "node --input-type=module -e \"const m = await import('./server/routes.js'); m.notFound({ url: '/nope' }, { statusCode: 200, setHeader() {}, end(s) { console.log(this.statusCode, s); } });\"" stdout="404 {\"error\":\"not found\",\"path\":\"/nope\"}" label="notFound answers 404 with {\"error\":\"not found\",\"path\":\"/nope\"}" -- Check the copy you renamed notFound: response.statusCode = 404; on its own line first, then sendJson with error and path.
run "node --input-type=module -e \"const m = await import('./server/routes.js'); console.log(typeof m.home);\"" stdout="function" label="routes.js exports a home function" -- Rename the first copy with cw on health: export function home(request, response) {
run "node --input-type=module -e \"const m = await import('./server/routes.js'); m.health({}, { setHeader() {}, end(s) { console.log(s); } });\"" stdout="\"ok\":true" label="health still answers" -- The original health, above countBookmarks, should be unchanged. If routes.js won't load at all, look for two functions with the same name.
```

## What p puts after a change

Press `p` now, with the cursor where step 5 left it, on the `response.statusCode` line. You might expect a third copy of `health`. Instead, text appears at the end of the line, after the `;`: `ok: true, name: 'shelf', uptime: process.uptime() `.

- **The cause**: the last `ct}` deleted that text, and a delete replaces the yank. `p` puts the latest yank **or** delete.
- **How to spot it**: whatever `p` puts is what you last yanked or deleted. If it isn't what you meant, the last `d`, `c` or `x` since your yank is why.
- **How to avoid it**: put all the copies before you change any of them, as in step 3, or yank again just before you put.

`u` takes the stray text back out. Don't save it; if you did, `u` and `:w` again.

```check
run "node --input-type=module -e \"const m = await import('./server/routes.js'); m.notFound({ url: '/nope' }, { statusCode: 200, setHeader() {}, end(s) { console.log(this.statusCode, s); } });\"" stdout="404 {\"error\":\"not found\",\"path\":\"/nope\"}" label="notFound is unchanged" -- Press u until the response.statusCode = 404; line is back to itself, then :w.
```

## The table

At the end of `routes.js`, write the table: `G`, `o`, Enter for a blank line, then type these lines, without leading spaces. For the `/health` line, don't type it: after typing the `/api/health` line, Esc, then `yyp` duplicates it, `f/` goes to its first slash, and `dt/` deletes `/api`. Then `o` for the next line. `:w` at the end.

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
  sendJson(response, { count: bookmarks.length, empty: bookmarks.length === 0 });
}

export function home(request, response) {
  sendJson(response, { name: 'shelf', routes: Object.keys(routes) });
}

export function notFound(request, response) {
  response.statusCode = 404;
  sendJson(response, { error: 'not found', path: request.url });
}

export const routes = {
  '/': home,
  '/api/bookmarks': listBookmarks,
  '/api/health': health,
  '/health': health,
  '/api/bookmarks/count': countBookmarks,
};
```

- **`{ key: value, … }`** is an **object**: a set of keys, each with a value. Every key here is a path, written in quotes because a `/` can't be part of a bare name.
- Each value is a **function**, named but **not called**: `health`, not `health()`. The table stores the functions themselves, so the server can call one later. `health()` would call it right away, while the file loads, with no request or response, and fail.
- **`export const routes`** lets `server.js` import the table.
- The comma after the last pair is allowed, and it means a line added at the end never needs a comma added to the line above.

```check
run "node --input-type=module -e \"const m = await import('./server/routes.js'); console.log(Object.keys(m.routes).join(' '));\"" stdout="/ /api/bookmarks /api/health /health /api/bookmarks/count" label="the table has the five paths, in order" -- Each line is a path in quotes, a colon, a handler and a comma. yyp duplicates the /api/health line; dt/ from its first slash deletes /api.
run "node --input-type=module -e \"const m = await import('./server/routes.js'); console.log(m.routes['/'] === m.home, m.routes['/health'] === m.health, m.routes['/api/bookmarks/count'] === m.countBookmarks);\"" stdout="true true true" label="each path points at the right handler" -- / goes to home, /api/health and /health to health, and /api/bookmarks/count to countBookmarks, each without ().
```

## Switch the server to the table

Open `server/server.js` and `:set number`. Lines 8 to 25 are the whole chain: every `if` block, and the two 404 lines after them. (If you wrote the `/` block in a different place, the numbers are the same, as long as it's four lines long. Check that line 25 is the last `response.end`.)

- `8G`, then `c25G`: **change** from line 8 to line 25. An operator before `G` takes whole lines, so all eighteen go, and you're in Insert mode on one empty line with the indentation kept. Type the two new lines, Esc.
- Then the import: `2G`, `^`, `f{`, `w` onto `listBookmarks`, `ct}`, and type `routes, notFound ` (with the space), Esc. `:w`.

```javascript file=server/server.js
import http from 'node:http';
import { routes, notFound } from './routes.js';

const port = process.env.PORT || 3000; // 3000 unless PORT is set

const server = http.createServer((request, response) => {
  console.log(new Date().toISOString(), request.method, request.url);
  const handler = routes[request.url] || notFound;
  handler(request, response);
});

server.listen(port, () => {
  console.log(`Shelf is listening on http://localhost:${port}`);
});
```

- **`routes[request.url]`** looks a key up in the table. Square brackets take the key from a value, here the path that was asked for; `routes.health` with a dot would only ever look up the key `health`.
- A path that isn't in the table gives **`undefined`**: JavaScript's "no value".
- **`a || b`** is `a` when `a` is a value, and `b` when it's `undefined`. So `handler` is the path's handler, or `notFound`.
- **`handler(request, response)`** calls whichever function that is. The server no longer knows any paths; `routes.js` does.

Restart the server and try every path: `curl http://localhost:3000/` now lists them all, and `curl -i http://localhost:3000/nope` answers 404 with `{"error":"not found","path":"/nope"}`.

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/bookmarks/count; kill $!); echo \"$out\"" stdout="{\"count\":31" label="/api/bookmarks/count still answers" -- Check the import line: { routes, notFound }.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/health; kill $!); echo \"$out\"" stdout="\"ok\":true" label="/health still answers" -- The server should look the path up with routes[request.url].
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/; kill $!); echo \"$out\"" stdout="\"routes\":[\"/\",\"/api/bookmarks\",\"/api/health\",\"/health\",\"/api/bookmarks/count\"]" label="/ lists every path" -- / should reach home through the table.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/nope; kill $!); echo \"$out\"" stdout="{\"error\":\"not found\",\"path\":\"/nope\"}" label="/nope gets notFound's answer" -- Without || notFound, a path missing from the table leaves handler undefined, and calling it stops the server.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s -o /dev/null -w '%{http_code}' http://localhost:3917/nope; kill $!); echo \"$out\"" stdout="404" label="/nope gets status 404" -- notFound sets response.statusCode = 404 before sendJson.
lacks server/server.js "if (request.url" label="the chain of if blocks is gone" -- 8G, then c25G changes lines 8 to 25 at once.
```

## Drill: duplicate a line

Click **Fresh copy of practice/drills/29-duplicate.txt**, open it, and add `'/health': health,` below the `/api/health` line, as you did in Shelf.

```text file=practice/drills/29-duplicate.txt provided
const routes = {
  '/api/health': health,
};
```

Par 9: {{key:j}}, {{key:yy}}, {{key:put}}; then {{key:find}} with `/`, and {{key:delete}} with {{key:till}} and `/`.

```check
run "sed -n 3p practice/drills/29-duplicate.txt | grep -Fqx \"  '/health': health,\"" label="line 3 reads   '/health': health," -- Click Fresh copy of practice/drills/29-duplicate.txt and try again.
run "sed -n 2p practice/drills/29-duplicate.txt | grep -Fqx \"  '/api/health': health,\"" label="line 2 is still   '/api/health': health," -- Click Fresh copy of practice/drills/29-duplicate.txt and try again. Change the copy, below, not the original.
run "test $(wc -l < practice/drills/29-duplicate.txt) -eq 4" label="it has 4 lines" -- Click Fresh copy of practice/drills/29-duplicate.txt and try again.
keys practice/drills/29-duplicate.txt par=9
```

## Drill: two swaps

Click **Fresh copy of practice/drills/30-swap.txt**, open it. Swap the two lines, so the bookmarks line comes first, and swap the two letters that make `GTE`, so it reads `GET`.

```text file=practice/drills/30-swap.txt provided
GET /api/health
GTE /api/bookmarks
```

Par 7. One way: {{key:dd}}, {{key:put}} swaps the lines and leaves the cursor on the moved line; {{key:k}} up to `GTE`, {{key:l}} onto the `T`, then {{key:x}}, {{key:put}}. The other way round costs the same: fix `GTE` first, then {{key:dd}} and {{key:put-before}} from the lower line.

```check
run "sed -n 1p practice/drills/30-swap.txt | grep -Fqx 'GET /api/bookmarks'" label="line 1 reads GET /api/bookmarks" -- Click Fresh copy of practice/drills/30-swap.txt and try again.
run "sed -n 2p practice/drills/30-swap.txt | grep -Fqx 'GET /api/health'" label="line 2 reads GET /api/health" -- Click Fresh copy of practice/drills/30-swap.txt and try again.
run "test $(wc -l < practice/drills/30-swap.txt) -eq 2" label="it has 2 lines" -- Click Fresh copy of practice/drills/30-swap.txt and try again.
keys practice/drills/30-swap.txt par=7
```

## Drill: copy the end of a line

Click **Fresh copy of practice/drills/31-copy-end.txt**, open it, and copy the header's value to the second line, so that it reads `Accept: application/json; charset=utf-8`.

```text file=practice/drills/31-copy-end.txt provided
Content-Type: application/json; charset=utf-8
Accept:
```

Par 5: {{key:find}} with a space lands on the space after `Content-Type:`. {{key:Y}} yanks from there to the end, the space included. {{key:j}} keeps the column as far as the short line allows, which puts the cursor on its last character, the `:`, and {{key:put}} puts the copy after it.

```check
run "sed -n 2p practice/drills/31-copy-end.txt | grep -Fqx 'Accept: application/json; charset=utf-8'" label="line 2 reads Accept: application/json; charset=utf-8" -- Click Fresh copy of practice/drills/31-copy-end.txt and try again. Yank from the space, so that it comes too.
run "sed -n 1p practice/drills/31-copy-end.txt | grep -Fqx 'Content-Type: application/json; charset=utf-8'" label="line 1 is unchanged" -- Click Fresh copy of practice/drills/31-copy-end.txt and try again.
run "test $(wc -l < practice/drills/31-copy-end.txt) -eq 2" label="it has 2 lines" -- Click Fresh copy of practice/drills/31-copy-end.txt and try again.
keys practice/drills/31-copy-end.txt par=5
```

## Review: a number and an argument

Click **Fresh copy of practice/review/03-03.txt**. Make the port `8080`, and pass `host` to `listen` as well, so that the last line reads `server.listen(port, host);`. Recall the keys before hovering.

```text file=practice/review/03-03.txt provided
const port = 3000;
const host = 'localhost';
const name = 'shelf';
server.listen(port);
```

Par 19: {{key:motion-w}} with a count of 3 reaches `3000`; {{key:change}} with {{key:motion-w}}, `8080`, {{key:esc}} (9). The cursor is now on the last `0`, in the same column as the `o` of `port` on the last line. So {{key:G}} lands there, {{key:motion-e}} moves to the `t`, and {{key:a}}, `, host`, {{key:esc}} (10).

```check
run "sed -n 1p practice/review/03-03.txt | grep -Fqx 'const port = 8080;'" label="line 1 reads const port = 8080;" -- Click Fresh copy of practice/review/03-03.txt and try again.
run "sed -n 4p practice/review/03-03.txt | grep -Fqx 'server.listen(port, host);'" label="line 4 reads server.listen(port, host);" -- Click Fresh copy of practice/review/03-03.txt and try again.
run "test $(wc -l < practice/review/03-03.txt) -eq 4" label="it has 4 lines" -- Click Fresh copy of practice/review/03-03.txt and try again.
keys practice/review/03-03.txt par=19
```

## Your turn: a second path for home

**Build, on your own:** make `/api` answer exactly what `/` answers, the list of paths. `/` should then list `/api` among them, and unknown paths must still get the 404.

Decide where the change goes now that the server only looks paths up, and which existing line is the quickest start for the new one.

```hints
nudge: The server no longer has a list of paths of its own. Where are the paths now?
concept: A new path is one more key in the `routes` table. `yyp` duplicates a line, and an insert or a change edits the copy.
shape: In `routes.js`, on the `'/': home,` line: `yyp`, then `f/`, `a`, `api`, Esc, so that the copy reads `'/api': home,`.
```

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api; kill $!); echo \"$out\"" stdout="{\"name\":\"shelf\",\"routes\":[" label="/api answers with the list of paths" -- Add '/api': home, to the routes table in server/routes.js.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/; kill $!); echo \"$out\"" stdout="\"/api\"" label="/ lists /api among the paths" -- The new path belongs in the routes table, where home's list comes from, not in server.js.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s -o /dev/null -w '%{http_code}' http://localhost:3917/nope; kill $!); echo \"$out\"" stdout="404" label="/nope still gets status 404" -- Keep || notFound in server.js.
```

The checks establish that `/api` gives `home`'s answer, that `/` lists it, and that unknown paths still get a 404. They don't check where in the table the new line went. Run `curl http://localhost:3000/` and see where `/api` appears in the list: `Object.keys` keeps the order of the table.

### What you have

```text
server/routes.js   home and notFound handlers; the routes table
server/server.js   looks the path up in the table; notFound for anything else
```

| Keys | Does |
|---|---|
| `y` and a motion / `yy` / `Y` | copy what the motion crosses / the line / to the end of the line |
| `p` / `P` | put after (or below) / before (or above) |
| `ddp` / `xp` | swap two lines / two characters |

Next: the dot command, `.`, which repeats your last change. Shelf's table learns the difference between reading the bookmarks and adding one.
