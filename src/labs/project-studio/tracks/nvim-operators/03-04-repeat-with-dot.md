---
title: 3.4 — Repeat the Last Change: the Dot
runtime: none
---

The `.` key (dot) repeats your last change. That one key is why operators matter so much: `cw` and a word, `A;`, `dd`, each is a single **change** Neovim remembers whole, so `.` can do it again anywhere, as often as you like.

- In VS Code, making the same edit on six lines means six edits, or a multi-cursor set up first. In Neovim it's the edit once, then a move and `.` for each of the others.
- The pattern has a name among Vim users, the **dot formula**: one key to move, one key to repeat. `j.`, `;.`, `w.`.

Shelf's table answers a path whatever the request's **method**: the verb before the path, such as `GET` (read) or `POST` (add). This lesson puts the method into every key in the table, six edits of the same kind, done once and then repeated with `.`.

## What dot repeats

A **change** is any command that alters the text:

- an operator with its motion: `dw`, `cw` and what you typed, `d2f(`;
- `x`, `r` and a character, `dd`, `D`, `C`, `p`;
- a whole visit to Insert mode, from the key that started it (`i`, `a`, `A`, `o`…) to the Esc that ended it, with everything typed in between.

`.` repeats the last one **at the cursor**. It doesn't repeat motions, `u`, or commands typed after `:`.

- **A count replaces the original count.** After `dd`, `3.` deletes three lines.
- **Repeat starts from the cursor.** `.` after `aGET ` appends `GET ` after whatever character the cursor is on now. Getting the cursor to the right place is your part; `.` does the rest.
- So **prefer changes that find their own place**. `A;` adds a `;` at the end of whatever line the cursor is on, so `j.` works on every line. `$a;` does the same edit once, but `.` only repeats the `a;` part, wherever the cursor happens to be.

```predict
question: A file has 10 lines. With the cursor on line 1, you type dd, then 3. — how many lines are left?
answer: 6
explain: dd deletes one line. 3. repeats the delete with a count of 3, which replaces the original (absent) count, so it deletes three more: 10 − 1 − 3 = 6.
verify: seq 1 10 > .verify.txt && "$NVIM_BIN" --clean --headless .verify.txt -c 'normal dd3.' -c "lua io.stdout:write(vim.fn.line('$') .. '\n')" -c 'qa!'; rm -f .verify.txt
```

## Methods: what a request wants to do

Every HTTP request has a **method** as well as a path. `curl` and browsers send `GET` unless told otherwise.

| Method | Means |
|---|---|
| `GET` | read: send me what's at this path |
| `POST` | add: here's something new to store |
| `DELETE` | remove what's at this path |

Right now `curl -X POST http://localhost:3000/api/bookmarks` gets the bookmark list back, as if it were a `GET`. (**`-X POST`** makes `curl` send the `POST` method.) A client trying to add a bookmark would think it had worked. Chapter 4 adds the real `POST`; first the table has to tell the methods apart.

## Apply: GET in every key, with dot

Open `server/routes.js` and `:set number`. The table starts on line 36 (`export const routes = {`). If you put `/api` somewhere else in the table, that doesn't matter: every entry gets the same change.

1. `37G`, `^`: the cursor is on the `'` that opens the first key.
2. `a`, `GET ` (with the space), Esc. The key is now `'GET /'`.
3. `j` moves down, but keeps the column, which is now past the `'`. So `^` first, then `.`: the same `aGET ` happens after the next `'`.
4. `j^.` four more times, once for each line. `:w`.

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
  'GET /': home,
  'GET /api': home,
  'GET /api/bookmarks': listBookmarks,
  'GET /api/health': health,
  'GET /health': health,
  'GET /api/bookmarks/count': countBookmarks,
};
```

- Six edits took `aGET ` and Esc once (6 keys) and `j^.` five times (15): 21 keys. Typing it into every line, `j^aGET ` and Esc each time, would have been 46, with six chances of a typo.
- Each key is now a method, a space and a path, the way an HTTP request starts: `GET /api/health`.

Until the server builds keys the same way, every path is "not found". That's the next step.

```check
run "node --input-type=module -e \"const m = await import('./server/routes.js'); console.log(Object.keys(m.routes).filter((k) => !k.startsWith('GET /')).length, Object.keys(m.routes).length);\"" stdout="0 6" label="all six keys start with GET and a space" -- Each key should read 'GET /…': ^ puts the cursor on the opening ', then . appends GET and a space after it.
run "node --input-type=module -e \"const m = await import('./server/routes.js'); console.log(m.routes['GET /api/bookmarks/count'] === m.countBookmarks, m.routes['GET /health'] === m.health);\"" stdout="true true" label="the handlers are unchanged" -- Only the keys change. Each value is still a handler's name, without ().
```

## Look up the method and the path

Open `server/server.js`. Line 8 looks up `request.url` alone; it needs the method, a space and the path, in one string.

- `8G`, `^`, `f[` lands on the `[`.
- `a`, then type `` `${request.method} ${ `` and Esc: the start of a template string, with the method, a space, and the opening of the path's `${`.
- `f]` lands on the `]`. `i`, then `` }` `` closes the path's `${` and the template string. Esc, `:w`.

```javascript file=server/server.js
import http from 'node:http';
import { routes, notFound } from './routes.js';

const port = process.env.PORT || 3000; // 3000 unless PORT is set

const server = http.createServer((request, response) => {
  console.log(new Date().toISOString(), request.method, request.url);
  const handler = routes[`${request.method} ${request.url}`] || notFound;
  handler(request, response);
});

server.listen(port, () => {
  console.log(`Shelf is listening on http://localhost:${port}`);
});
```

- **`request.method`** is the request's method, in capitals: `'GET'`, `'POST'`.
- **`` `${request.method} ${request.url}` ``** is a template string, as in chapter 1's messages: the method, a space, the path. For `curl http://localhost:3000/health` it's `'GET /health'`, exactly a key in the table.

Restart the server. `curl http://localhost:3000/health` answers as before, and `curl http://localhost:3000/` now lists the keys with their methods.

```predict
question: Now curl -X POST http://localhost:3000/api/bookmarks — what comes back?
choice: The bookmark list, as before
choice: {"error":"not found","path":"/api/bookmarks"}, with status 404
choice: Nothing: the server stops
answer: {"error":"not found","path":"/api/bookmarks"}, with status 404
explain: The server builds the key 'POST /api/bookmarks'. The table only has 'GET /api/bookmarks', so the lookup gives undefined and notFound answers. Chapter 4 adds a 'POST /api/bookmarks' entry with a handler that stores the new bookmark.
```

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/bookmarks/count; kill $!); echo \"$out\"" stdout="{\"count\":31" label="GET /api/bookmarks/count still answers" -- The lookup key must be `${request.method} ${request.url}`, with one space between, the same shape as the table's keys.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3917/api/bookmarks; kill $!); echo \"$out\"" stdout="404" label="POST /api/bookmarks gets 404" -- The key must include request.method, so that POST and GET are different keys.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/; kill $!); echo \"$out\"" stdout="\"GET /api/health\"" label="/ lists the keys with their methods" -- Both files need the change: GET in the table's keys, and the method in the server's lookup.
```

## Dot after undo

`u` undoes the last change, but `.` still remembers it, so `u` and `.` together redo an edit somewhere else. The catch is where `.` happens. Make the mistake on purpose:

- In `server/routes.js`, `42G`, the `'GET /api/bookmarks/count'` line. Press `u` until that line's `GET ` is gone (undo takes back the most recent changes first, and this line's was the last).
- Now press `.` at once, without `^`. The line reads `'/GET api/bookmarks/count': countBookmarks,`.
- `:w`, restart the server, and `curl http://localhost:3000/api/bookmarks/count`.

```text
{"error":"not found","path":"/api/bookmarks/count"}
```

- **The symptom**: a 404 for a path you can see in the table.
- **How to find it**: a 404 for a path you know means the server's key and the table's key differ. Compare them character by character: `GET /api/bookmarks/count` against `/GET api/bookmarks/count`.
- **The cause**: `u` left the cursor where the undone text had been, on the `/`, not on the `'`. `.` appended after the cursor, as it always does.

Fix it the right way: `u` to take the bad edit back, `^`, `.`. `:w`, restart, and the count answers again.

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/bookmarks/count; kill $!); echo \"$out\"" stdout="{\"count\":31" label="/api/bookmarks/count answers again" -- The line should read 'GET /api/bookmarks/count': countBookmarks, — u, ^, then .
```

## Drill: the end of every line

Click **Fresh copy of practice/drills/32-dot-lines.txt**, open it, and end every line with a `;`.

```text file=practice/drills/32-dot-lines.txt provided
import http from 'node:http'
const port = 3000
const host = 'localhost'
const name = 'shelf'
```

Par 9: {{key:A}}, `;`, {{key:esc}} on line 1. Then {{key:j}} and {{key:dot}}, three times: `A` finds the end of each line itself.

```check
run "sed -n 1p practice/drills/32-dot-lines.txt | grep -Fqx \"import http from 'node:http';\"" label="line 1 ends with ;" -- Click Fresh copy of practice/drills/32-dot-lines.txt and try again.
run "sed -n 4p practice/drills/32-dot-lines.txt | grep -Fqx \"const name = 'shelf';\"" label="line 4 ends with ;" -- Click Fresh copy of practice/drills/32-dot-lines.txt and try again.
run "test $(grep -c ';$' practice/drills/32-dot-lines.txt) -eq 4" label="all 4 lines end with ;" -- Click Fresh copy of practice/drills/32-dot-lines.txt and try again.
keys practice/drills/32-dot-lines.txt par=9
```

## Drill: find, then dot

Click **Fresh copy of practice/drills/33-dot-find.txt**, open it, and put a space after each comma.

```text file=practice/drills/33-dot-find.txt provided
server.listen(port,host,callback);
```

Par 7: {{key:find}} with `,`, then {{key:a}}, a space, {{key:esc}}. {{key:repeat-find}} goes to the next comma, and {{key:dot}} adds the space there.

```check
run "sed -n 1p practice/drills/33-dot-find.txt | grep -Fqx 'server.listen(port, host, callback);'" label="line 1 reads server.listen(port, host, callback);" -- Click Fresh copy of practice/drills/33-dot-find.txt and try again.
run "test $(wc -l < practice/drills/33-dot-find.txt) -eq 1" label="it has 1 line" -- Click Fresh copy of practice/drills/33-dot-find.txt and try again.
keys practice/drills/33-dot-find.txt par=7
```

## Drill: every other line

Click **Fresh copy of practice/drills/34-dot-delete.txt**, open it, and delete the three `// remove` lines.

```text file=practice/drills/34-dot-delete.txt provided
GET /api/bookmarks
// remove
GET /api/health
// remove
GET /health
// remove
GET /api/bookmarks/count
```

Par 7: {{key:j}}, {{key:dd}}. The line below moves up under the cursor, so {{key:j}} reaches the next `// remove`, and {{key:dot}} deletes it. Once more.

```check
run "sed -n 2p practice/drills/34-dot-delete.txt | grep -Fqx 'GET /api/health'" label="line 2 reads GET /api/health" -- Click Fresh copy of practice/drills/34-dot-delete.txt and try again.
run "test $(grep -c remove practice/drills/34-dot-delete.txt) -eq 0" label="no // remove lines are left" -- Click Fresh copy of practice/drills/34-dot-delete.txt and try again.
run "test $(wc -l < practice/drills/34-dot-delete.txt) -eq 4" label="it has 4 lines" -- Click Fresh copy of practice/drills/34-dot-delete.txt and try again.
keys practice/drills/34-dot-delete.txt par=7
```

## Drill: change a word twice

Click **Fresh copy of practice/drills/35-dot-change.txt**, open it, and rename both `foo` to `total`.

```text file=practice/drills/35-dot-change.txt provided
const foo = foo + 1;
```

Par 12: {{key:motion-w}}, {{key:change}} with {{key:motion-w}}, `total`, {{key:esc}}. Then {{key:motion-w}} twice reaches the second `foo`, and {{key:dot}} changes it too.

```check
run "sed -n 1p practice/drills/35-dot-change.txt | grep -Fqx 'const total = total + 1;'" label="line 1 reads const total = total + 1;" -- Click Fresh copy of practice/drills/35-dot-change.txt and try again.
run "test $(wc -l < practice/drills/35-dot-change.txt) -eq 1" label="it has 1 line" -- Click Fresh copy of practice/drills/35-dot-change.txt and try again.
keys practice/drills/35-dot-change.txt par=12
```

## Review: cut a comment, copy a line

Click **Fresh copy of practice/review/03-04.txt**. Delete the comment at the end of line 2, with the spaces before it, then duplicate line 2 below itself. Recall the keys before hovering.

```text file=practice/review/03-04.txt provided
GET /api/bookmarks
GET /api/health   // remove this comment
```

Par 8: {{key:j}}; {{key:motion-E}} twice reaches the end of `/api/health`; {{key:l}} steps onto the first space after it, and {{key:D}} deletes to the end of the line (5). Then {{key:yy}} and {{key:put}} (3).

```check
run "sed -n 2p practice/review/03-04.txt | grep -Fqx 'GET /api/health'" label="line 2 reads GET /api/health, with nothing after it" -- Click Fresh copy of practice/review/03-04.txt and try again. Start the delete on the first space after health.
run "sed -n 3p practice/review/03-04.txt | grep -Fqx 'GET /api/health'" label="line 3 is a copy of it" -- Click Fresh copy of practice/review/03-04.txt and try again. Delete the comment before you copy the line.
run "test $(wc -l < practice/review/03-04.txt) -eq 3" label="it has 3 lines" -- Click Fresh copy of practice/review/03-04.txt and try again.
keys practice/review/03-04.txt par=8
```

## Your turn: say which method wasn't found

**Build, on your own:** a 404 answer should say which method was asked for, as well as the path. `curl -X POST http://localhost:3000/api/bookmarks` should get `{"error":"not found","method":"POST","path":"/api/bookmarks"}`, with status 404.

Decide which file the change belongs in, and where in the answer the new pair goes.

```hints
nudge: The 404 answer is built in one place, the handler every unknown key falls back to.
concept: notFound sends an object. Its keys come out in the order you write them, and request.method holds the method.
shape: In `notFound`, the object becomes `{ error: 'not found', method: request.method, path: request.url }`: `f,` reaches the first comma, then `a` and type the new pair, with the comma and spaces around it.
```

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s -X POST http://localhost:3917/api/bookmarks; kill $!); echo \"$out\"" stdout="{\"error\":\"not found\",\"method\":\"POST\",\"path\":\"/api/bookmarks\"}" label="POST /api/bookmarks answers with the method and the path" -- notFound's object needs method: request.method between error and path.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3917/api/bookmarks; kill $!); echo \"$out\"" stdout="404" label="it's still status 404" -- Keep response.statusCode = 404; in notFound.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/bookmarks/count; kill $!); echo \"$out\"" stdout="{\"count\":31" label="GET /api/bookmarks/count still answers" -- Only notFound's answer should change.
```

The checks establish the 404's body and status for one method, and that a known route still works. They don't try a method other than `POST`: try `curl -X DELETE http://localhost:3000/health` yourself, and predict the answer first.

### What you have

```text
server/routes.js   every key in the table is a method and a path; 404s say the method
server/server.js   looks up "method path"
```

| Keys | Does |
|---|---|
| `.` | repeat the last change at the cursor |
| `3.` | repeat it with a count of 3 |
| move, then `.` | the dot formula: `j.`, `;.`, `w.` |

Next: the last keys of the chapter: joining lines, indenting and changing case. Shelf stops a broken data file from taking the whole server down.
