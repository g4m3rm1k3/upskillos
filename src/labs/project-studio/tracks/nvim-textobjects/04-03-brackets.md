---
title: 4.3 — Brackets: i(, i[ and i{
runtime: none
---

Brackets hold most of a program's structure. Arguments go in `( )`, lists in `[ ]`, and objects and function bodies in `{ }`, and they nest inside each other. A bracket text object selects what's between a pair, from anywhere inside it, across as many lines as it takes. So `ci{` replaces a function's whole body without your counting its lines first.

Shelf can add bookmarks but not remove them. This lesson copies `addBookmark` and replaces its body with `ci{` to make `deleteBookmark`, then routes `DELETE /api/bookmarks` to it.

## Bracket objects

| Object | Selects |
|---|---|
| `i(` / `a(` | what's inside a `( )` pair / the pair and what's inside |
| `i[` / `a[` | the same for `[ ]` |
| `i{` / `a{` | the same for `{ }` |
| `i<` / `a<` | the same for `< >` |

- **Either bracket works**: `i(` and `i)` are the same object, as are `i{` and `i}`. (`ib` and `iB` are older names for `i(` and `i{`; you'll see them in other people's notes.)
- **The innermost pair around the cursor.** In `log(JSON.stringify(list, null, 2))` with the cursor on `null`, `di(` empties the `stringify( )`, not the `log( )`. A count reaches further out: `d2i(` empties the `log( )`.
- **Across lines.** When the pair spans lines, as a function body does, `i{` takes the lines between the `{` and the `}`. `ci{` deletes them and leaves you in Insert mode on one empty, indented line between the two braces, ready to type the new body.
- **Put the cursor inside.** Neovim 0.12, the version the app installs, also looks ahead on the line when the cursor is before a bracket, but older versions may not, and on a line with several pairs you'd have to work out which it picks. Inside is the one place that always means that pair.
- `%` (lesson 2.4) jumps between a pair's two brackets. `d%` from one of them deletes the brackets and everything between them, like `da(`, but only when you start on a bracket.

```predict
question: The line is console.log(JSON.stringify(readBookmarks(), null, 2)); and the cursor is on the first comma. You type di(. What is the line now?
choice: console.log(JSON.stringify());
choice: console.log();
choice: console.log(JSON.stringify(readBookmarks()));
answer: console.log(JSON.stringify());
explain: The comma is inside two pairs, stringify( ) and log( ), and not inside the empty () after readBookmarks. di( takes the innermost pair around the cursor, stringify's, and empties it. d2i( would have emptied log( ).
verify: printf 'console.log(JSON.stringify(readBookmarks(), null, 2));\n' > .verify.txt && "$NVIM_BIN" --clean --headless .verify.txt -c 'normal! f,di(' -c "lua io.stdout:write(vim.fn.getline(1) .. '\n')" -c 'qa!'; rm -f .verify.txt
```

## Copy a handler, change its body with ci{

`deleteBookmark` takes a request the same way `addBookmark` does and answers the same way, so start from a copy of it. Open `server/routes.js` and `:set number`.

1. Put the cursor anywhere in `addBookmark` (it starts on line 23 if your check from lesson 4.2 is the same size as the hints'). `yap` copies the whole function and the blank line after it. (If you left a blank line **inside** the function, `ap` stops there: take it out first.)
2. `}` jumps to that blank line, below the function. `p` puts the copy under it.
3. The cursor is on the copy's first line. `3w` reaches `addBookmark`, and `ciw`, `deleteBookmark`, Esc renames it.
4. `j` moves into the body: the cursor is now inside the function's `{ }`. `ci{` deletes every line of the old body, however many there were, and leaves you on an indented empty line. Type the new body, Enter after each line, without leading spaces. Esc, `:w`.

```javascript file=server/routes.js
// Shelf's request handlers: one exported function for each route.
import { readBookmarks, writeBookmarks } from './store.js';

function sendJson(response, value) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(value));
}

// The request's body, parsed from JSON.
async function readJson(request) {
  let text = '';
  for await (const chunk of request) {
    text += chunk;
  }
  return JSON.parse(text);
}

export function listBookmarks(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  sendJson(response, readBookmarks());
}

export async function addBookmark(request, response) {
  const body = await readJson(request);
  if (!body.title || !body.url) {
    response.statusCode = 400;
    sendJson(response, { error: 'title and url are required' });
    return;
  }
  const bookmark = { title: body.title, url: body.url };
  const bookmarks = readBookmarks();
  bookmarks.push(bookmark);
  writeBookmarks(bookmarks);
  response.statusCode = 201;
  sendJson(response, bookmark);
}

export async function deleteBookmark(request, response) {
  const body = await readJson(request);
  const bookmarks = readBookmarks();
  const kept = bookmarks.filter((bookmark) => bookmark.url !== body.url);
  writeBookmarks(kept);
  sendJson(response, { deleted: bookmarks.length - kept.length });
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
  'POST /api/bookmarks': addBookmark,
  'GET /api/health': health,
  'GET /health': health,
  'GET /api/bookmarks/count': countBookmarks,
};
```

The client says which bookmark to delete by sending its URL in the body: `{"url": "https://neovim.io"}`. Two bookmarks can't be told apart by title, but a URL names one page.

- **`bookmarks.filter(test)`** makes a **new** list of the items for which `test` gives `true`, in the same order. The original list isn't changed.
- **`(bookmark) => bookmark.url !== body.url`** is the test: an **arrow function**, a short way to write a function. `(bookmark)` is its parameter, each item in turn, and what follows `=>` is the value it returns. **`!==`** means "is not equal to", so the test keeps every bookmark whose URL is not the one to delete.
- **`kept`** is the list without it. `writeBookmarks(kept)` saves that list.
- **`bookmarks.length - kept.length`** is how many were removed: `1` when the URL was there, `0` when it wasn't. The answer says so, `{"deleted":1}`, so the client can tell.
- The answer's status is the default, **200** OK. Nothing new was created, so it isn't 201.
- If your `addBookmark` is different from the one above, your copy's body was different too, and it didn't matter: `ci{` took all of it.

```check
run "node --input-type=module -e \"const m = await import('./server/routes.js'); console.log(typeof m.deleteBookmark, typeof m.addBookmark);\"" stdout="function function" label="routes.js exports deleteBookmark, and addBookmark is still there" -- The copy goes below addBookmark, renamed with ciw: export async function deleteBookmark(request, response) {
```

## A DELETE that isn't routed

The handler exists, but nothing calls it yet. Try it anyway, with the server restarted, on the first bookmark in the data:

```zsh
curl -i -X DELETE -d '{"url":"https://neovim.io"}' http://localhost:3000/api/bookmarks
```

- **`-X DELETE`** sends the `DELETE` method. `-d` would make it a `POST` otherwise.
- The answer is `404` and `{"error":"not found","method":"DELETE","path":"/api/bookmarks"}`.
- **How to find the cause**: a 404 for a path you know works (`GET /api/bookmarks` answers) means the table has no key for this **method** and path. The 404's own body names both, because of your Your turn in lesson 3.4: the missing key is `'DELETE /api/bookmarks'`.

Add it: put the cursor on the line `'POST /api/bookmarks': addBookmark,` and `yyp`. On the copy, `w` lands on `POST`, and `ciw`, `DELETE`, Esc. `$`, `b` reaches `addBookmark`: `ciw`, `deleteBookmark`, Esc. `:w`.

```javascript file=server/routes.js
// Shelf's request handlers: one exported function for each route.
import { readBookmarks, writeBookmarks } from './store.js';

function sendJson(response, value) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(value));
}

// The request's body, parsed from JSON.
async function readJson(request) {
  let text = '';
  for await (const chunk of request) {
    text += chunk;
  }
  return JSON.parse(text);
}

export function listBookmarks(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  sendJson(response, readBookmarks());
}

export async function addBookmark(request, response) {
  const body = await readJson(request);
  if (!body.title || !body.url) {
    response.statusCode = 400;
    sendJson(response, { error: 'title and url are required' });
    return;
  }
  const bookmark = { title: body.title, url: body.url };
  const bookmarks = readBookmarks();
  bookmarks.push(bookmark);
  writeBookmarks(bookmarks);
  response.statusCode = 201;
  sendJson(response, bookmark);
}

export async function deleteBookmark(request, response) {
  const body = await readJson(request);
  const bookmarks = readBookmarks();
  const kept = bookmarks.filter((bookmark) => bookmark.url !== body.url);
  writeBookmarks(kept);
  sendJson(response, { deleted: bookmarks.length - kept.length });
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
  'POST /api/bookmarks': addBookmark,
  'DELETE /api/bookmarks': deleteBookmark,
  'GET /api/health': health,
  'GET /health': health,
  'GET /api/bookmarks/count': countBookmarks,
};
```

Restart the server. Now remove the two bookmarks you added in lesson 4.2, one `curl` each:

```zsh
curl -i -X DELETE -d '{"url":"https://developer.mozilla.org/en-US/docs/Web/HTTP"}' http://localhost:3000/api/bookmarks
curl -i -X DELETE -d '{"url":"https://nodejs.org/api/http.html"}' http://localhost:3000/api/bookmarks
```

Each answers `{"deleted":1}` (or `{"deleted":2}`, if you sent that bookmark twice). The `/api/bookmarks/count` is back where it was before lesson 4.2.

```check
run "cp data/bookmarks.json .bookmarks.bak; out=$(PORT=3917 node server/server.js & sleep 1; curl -s -m 2 -X DELETE -d '{\"url\":\"https://neovim.io\"}' http://localhost:3917/api/bookmarks; kill $!); mv .bookmarks.bak data/bookmarks.json; echo \"$out\"" stdout="{\"deleted\":1}" label="DELETE with a known url answers {\"deleted\":1}" -- The table needs 'DELETE /api/bookmarks': deleteBookmark, and deleteBookmark answers { deleted: bookmarks.length - kept.length }.
run "cp data/bookmarks.json .bookmarks.bak; (PORT=3917 node server/server.js & sleep 1; curl -s -m 2 -X DELETE -d '{\"url\":\"https://neovim.io\"}' http://localhost:3917/api/bookmarks; kill $!) > /dev/null 2>&1; grep -c '\"url\"' data/bookmarks.json > .after; grep -c '\"url\"' .bookmarks.bak > .before; grep -c 'https://neovim.io\"' data/bookmarks.json >> .after; mv .bookmarks.bak data/bookmarks.json; echo $(( $(cat .before) - $(head -1 .after) )) $(tail -1 .after); rm -f .before .after" stdout="1 0" label="exactly that bookmark is gone from the data file" -- The filter keeps bookmarks whose url is !== body.url, and writeBookmarks(kept) saves them.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s -m 2 -o /dev/null -w '%{http_code}' -X POST http://localhost:3917/api/bookmarks -d '{\"title\":\"\",\"url\":\"\"}'; kill $!); echo \"$out\"" stdout="400" label="POST still goes to addBookmark" -- The new line is a copy: 'POST /api/bookmarks': addBookmark, stays as it was.
run "node -e \"const urls = JSON.parse(require('fs').readFileSync('data/bookmarks.json', 'utf8')).map((b) => b.url); console.log(urls.includes('https://developer.mozilla.org/en-US/docs/Web/HTTP') || urls.includes('https://nodejs.org/api/http.html'));\"" stdout="false" label="the two lesson 4.2 bookmarks are gone from your data" -- Send the two DELETE requests above, with the server running.
```

## Drill: the innermost pair

Click **Fresh copy of practice/drills/46-ci-paren.txt**, open it, and make `stringify` take only `bookmarks`.

```text file=practice/drills/46-ci-paren.txt provided
console.log(JSON.stringify(readBookmarks(), null, 2));
```

The result:

```text
console.log(JSON.stringify(bookmarks));
```

Par 15: {{key:find}} with `,` puts the cursor inside `stringify( )` and outside the empty `()`. {{key:change}} {{key:i-paren}}, `bookmarks`, {{key:esc}}.

```check
run "sed -n 1p practice/drills/46-ci-paren.txt | grep -Fqx 'console.log(JSON.stringify(bookmarks));'" label="line 1 reads console.log(JSON.stringify(bookmarks));" -- Click Fresh copy of practice/drills/46-ci-paren.txt and try again.
run "test $(wc -l < practice/drills/46-ci-paren.txt) -eq 1" label="it has 1 line" -- Click Fresh copy of practice/drills/46-ci-paren.txt and try again.
keys practice/drills/46-ci-paren.txt par=15
```

## Drill: a new body

Click **Fresh copy of practice/drills/47-ci-brace.txt**, open it, and replace the whole body of `health` with one line, `sendJson(response, {});`.

```text file=practice/drills/47-ci-brace.txt provided
export function health(request, response) {
  const up = process.uptime();
  const name = 'shelf';
  console.log(name, up);
  sendJson(response, { ok: true, name, up });
}
```

The result:

```text
export function health(request, response) {
  sendJson(response, {});
}
```

Par 28: {{key:j}} into the body, then {{key:change}} {{key:i-brace}}, the new line, {{key:esc}}. On line 2 the cursor is inside the function's braces only. (`4cc` ties with it here, but only once you've counted the four lines; {{key:i-brace}} doesn't need to know.)

```check
run "sed -n 2p practice/drills/47-ci-brace.txt | grep -Fqx '  sendJson(response, {});'" label="line 2 reads   sendJson(response, {}); with two spaces" -- Click Fresh copy of practice/drills/47-ci-brace.txt and try again. Type the line without leading spaces: Neovim indents it.
run "sed -n 3p practice/drills/47-ci-brace.txt | grep -Fqx '}' && test $(wc -l < practice/drills/47-ci-brace.txt) -eq 3" label="the closing } follows, and it has 3 lines" -- Click Fresh copy of practice/drills/47-ci-brace.txt and try again.
keys practice/drills/47-ci-brace.txt par=28
```

## Drill: empty a list

Click **Fresh copy of practice/drills/48-di-bracket.txt**, open it, and empty the list: `const tags = [];`.

```text file=practice/drills/48-di-bracket.txt provided
const tags = ['vim', 'neovim', 'editor'];
```

Par 5: {{key:find}} with `,` puts the cursor inside the `[ ]`, and {{key:delete}} {{key:i-bracket}} empties it. (With {{key:find}} `[`, {{key:l}} and {{key:delete}} {{key:till}} `]`, it's 6.)

```check
run "sed -n 1p practice/drills/48-di-bracket.txt | grep -Fqx 'const tags = [];'" label="line 1 reads const tags = [];" -- Click Fresh copy of practice/drills/48-di-bracket.txt and try again.
run "test $(wc -l < practice/drills/48-di-bracket.txt) -eq 1" label="it has 1 line" -- Click Fresh copy of practice/drills/48-di-bracket.txt and try again.
keys practice/drills/48-di-bracket.txt par=5
```

## Review: a message, a comment and a split line

Click **Fresh copy of practice/review/04-03.txt**, open it, and make it two lines: `log("ready");` and `const port = 3000;`. Recall the keys before hovering.

```text file=practice/review/04-03.txt provided
log("starting Shelf"); // TODO
const port =
  3000;
```

Par 15: {{key:change}} {{key:i-double}} from the start of the line, `ready`, {{key:esc}} (9). {{key:find}} with `;`, {{key:l}} onto the space after it, and {{key:D}} (4). {{key:j}} and {{key:J}} (2).

```check
run "sed -n 1p practice/review/04-03.txt | grep -Fqx 'log(\"ready\");'" label="line 1 reads log(\"ready\");" -- Click Fresh copy of practice/review/04-03.txt and try again.
run "sed -n 2p practice/review/04-03.txt | grep -Fqx 'const port = 3000;'" label="line 2 reads const port = 3000;" -- Click Fresh copy of practice/review/04-03.txt and try again.
run "test $(wc -l < practice/review/04-03.txt) -eq 2" label="it has 2 lines" -- Click Fresh copy of practice/review/04-03.txt and try again.
keys practice/review/04-03.txt par=15
```

## Your turn: a 404 for a bookmark that isn't there

**Build, on your own:** today, deleting a URL that isn't in the list answers 200 and `{"deleted":0}`, and rewrites the data file for nothing. It should answer status 404 with `{"error":"no bookmark with that url"}`, and leave the file alone. Deleting a URL that is there still answers `{"deleted":1}`.

Decide how `deleteBookmark` can tell, before it writes anything, that nothing matched.

```hints
nudge: When nothing matched, the filter kept every bookmark. Compare the two lists' lengths before writeBookmarks.
concept: if (kept.length === bookmarks.length) { … } runs only when nothing was removed. Inside, set the status, send the error, and return; as addBookmark's 400 does.
shape: After the const kept line, add the if block: response.statusCode = 404;, sendJson(response, { error: 'no bookmark with that url' });, return;. addBookmark's 400 block has the same shape: yank it (5yy on its if line), put it, change the condition with ci(, the number with ciw and the message with ci'.
```

```check
run "cp data/bookmarks.json .bookmarks.bak; out=$(PORT=3917 node server/server.js & sleep 1; curl -s -m 2 -X DELETE -d '{\"url\":\"https://example.com/missing\"}' http://localhost:3917/api/bookmarks; kill $!); mv .bookmarks.bak data/bookmarks.json; echo \"$out\"" stdout="{\"error\":\"no bookmark with that url\"}" label="an unknown url gets {\"error\":\"no bookmark with that url\"}" -- Compare kept.length with bookmarks.length, and send the error with sendJson.
run "cp data/bookmarks.json .bookmarks.bak; out=$(PORT=3917 node server/server.js & sleep 1; curl -s -m 2 -o /dev/null -w '%{http_code}' -X DELETE -d '{\"url\":\"https://example.com/missing\"}' http://localhost:3917/api/bookmarks; kill $!); mv .bookmarks.bak data/bookmarks.json; echo \"$out\"" stdout="404" label="with status 404" -- Set response.statusCode = 404; before sendJson.
run "cp data/bookmarks.json .bookmarks.bak; chmod a-w data/bookmarks.json; out=$(PORT=3917 node server/server.js 2>/dev/null & sleep 1; curl -s -m 2 -o /dev/null -w '%{http_code}' -X DELETE -d '{\"url\":\"https://example.com/missing\"}' http://localhost:3917/api/bookmarks; kill $!); chmod u+w data/bookmarks.json; mv .bookmarks.bak data/bookmarks.json; echo \"$out\"" stdout="404" label="and the data file isn't written" -- The if block and its return; must come before writeBookmarks(kept).
run "cp data/bookmarks.json .bookmarks.bak; out=$(PORT=3917 node server/server.js & sleep 1; curl -s -m 2 -X DELETE -d '{\"url\":\"https://neovim.io\"}' http://localhost:3917/api/bookmarks; kill $!); mv .bookmarks.bak data/bookmarks.json; echo \"$out\"" stdout="{\"deleted\":1}" label="a url that is there still answers {\"deleted\":1}" -- The if block must only run when nothing matched: kept.length === bookmarks.length.
```

The checks establish the 404's body and status, that the data file isn't written for an unknown URL, and that a real delete still works. (The third check makes the data file read-only for a moment: if your code wrote it anyway, the write would fail and the answer would be a 500.) They don't try a body with no `url` at all: predict what `curl -X DELETE -d '{}' http://localhost:3000/api/bookmarks` gets, then try it.

### What you have

```text
server/routes.js   DELETE /api/bookmarks removes a bookmark by url; 404 when there's none
```

| Keys | Does |
|---|---|
| `ci(` / `di(` / `da(` | change / empty / delete a `( )` pair's contents, from anywhere inside |
| `ci{` | replace a block's contents, however many lines |
| `di[` / `ya[` | empty a list / copy it with its brackets |
| `d2i(` | the pair around the pair around the cursor |

Next: the last text object, HTML tags. `cit` changes the text in an element, `dat` deletes the element. Shelf gets a real page at `/`.
