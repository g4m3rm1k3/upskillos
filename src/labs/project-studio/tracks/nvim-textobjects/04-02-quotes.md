---
title: 4.2 — Strings: i', i" and i`
runtime: none
---

Code is full of strings: messages, paths, keys, URLs, every value in a JSON file. Changing one is the most common edit there is, and with motions it takes a search for where the string starts and a guess at where it ends. With a quote text object it's three keys, `ci'`, from anywhere in the string, or from anywhere **before** it on the line.

Shelf can show bookmarks but not take new ones. This lesson gives the store a `writeBookmarks`, and the API its first `POST`: send a bookmark, and it's saved. The bookmark you send lives in a small file you change with `ci"` between sends.

## Quote objects: i', i" and i`

| Object | Selects |
|---|---|
| `i'` / `a'` | the text inside a `'…'` string / the string with its quotes and the space after it |
| `i"` / `a"` | the same for a `"…"` string |
| `` i` `` / `` a` `` | the same for a `` `…` `` template string |

- **From inside the string**: `ci'` changes everything between the quotes, wherever the cursor is in it. The quotes stay.
- **From before it, on the same line**: if there's no quote at all before the cursor on the line, Neovim uses the **first string after the cursor**. So `ci'` at the start of `sendJson(response, { error: 'not found' });` changes `not found`. No motion needed.
- **On a quote**: Neovim counts the quotes from the start of the line to work out which ones pair up, so the cursor on either quote of a string selects that string.
- **Not between two strings, or after the last.** Neovim takes the text from the quote before the cursor to the quote after it. On the `:` in `"title": "Vim"`, that's `: `, the gap between the strings, and past the last string it's not a string either. Put the cursor **inside** the one you mean: `f` and a letter in it is usually quickest.
- **One line only.** A quote object never reaches onto another line.
- `di'` empties a string and leaves `''`; `da'` deletes the string, quotes and all.

```predict
question: The line is sendJson(response, { error: 'not found' }); and the cursor is on the s at its very start. You type ci', then missing, then Esc. What is the line now?
choice: sendJson(response, { error: 'missing' });
choice: missingsendJson(response, { error: 'not found' });
choice: Nothing changes: the cursor isn't in a string
answer: sendJson(response, { error: 'missing' });
explain: The cursor isn't inside a string, so ci' uses the first '…' string after it on the line, 'not found'. The text between its quotes is replaced by what you type, and the quotes stay.
verify: printf "sendJson(response, { error: 'not found' });\n" > .verify.txt && "$NVIM_BIN" --clean --headless .verify.txt -c "exe \"normal! ci'missing\\<Esc>\"" -c "lua io.stdout:write(vim.fn.getline(1) .. '\n')" -c 'qa!'; rm -f .verify.txt
```

## Save the data: writeBookmarks

Open `server/store.js`. `G` goes to the last line, the `}` that ends `readBookmarks`. `o`, Enter for a blank line, and type the new function, without leading spaces. Esc, `:w`.

```javascript file=server/store.js
// Shelf's data: every read and write of data/bookmarks.json goes through here.
import fs from 'node:fs';

const FILE = new URL('../data/bookmarks.json', import.meta.url);

export function readBookmarks() {
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

export function writeBookmarks(bookmarks) {
  fs.writeFileSync(FILE, JSON.stringify(bookmarks, null, 2) + '\n');
}
```

- **`writeBookmarks(bookmarks)`** takes the whole list and replaces the file with it. `bookmarks` is a **parameter**: the name the list has inside the function, whatever it was called where the function was called.
- **`fs.writeFileSync(FILE, text)`** writes `text` into the file at `FILE`, replacing what was there.
- **`JSON.stringify(bookmarks, null, 2)`** turns the list into JSON text. The third argument, `2`, puts each value on its own line, indented two spaces a level, which is how `data/bookmarks.json` is laid out now. (The second, `null`, is an option Shelf doesn't use.) Without the `2`, the whole list would be written on one line, which is fine for a program and unreadable for you.
- **`+ '\n'`** ends the file with a newline, as your `.editorconfig` asks of every file.

```check
run "cp data/bookmarks.json .bookmarks.bak; node --input-type=module -e \"const m = await import('./server/store.js'); m.writeBookmarks([{ title: 'a', url: 'b' }]); console.log(JSON.stringify(m.readBookmarks()));\" > .out; mv .bookmarks.bak data/bookmarks.json; cat .out; rm -f .out" stdout="[{\"title\":\"a\",\"url\":\"b\"}]" label="a list written with writeBookmarks reads back the same" -- writeBookmarks needs fs.writeFileSync(FILE, …) with JSON.stringify(bookmarks, …) as the text, and export in front.
run "cp data/bookmarks.json .bookmarks.bak; node --input-type=module -e \"const m = await import('./server/store.js'); m.writeBookmarks([{ title: 'a', url: 'b' }]);\" && sed -n 3p data/bookmarks.json > .line; mv .bookmarks.bak data/bookmarks.json; cat .line; rm -f .line" stdout="    \"title\": \"a\"," label="it indents by two spaces a level" -- JSON.stringify(bookmarks, null, 2): the 2 is the indent.
run "cp data/bookmarks.json .bookmarks.bak; node --input-type=module -e \"const m = await import('./server/store.js'); m.writeBookmarks([]);\" && tail -c 1 data/bookmarks.json | od -An -tx1 > .last; mv .bookmarks.bak data/bookmarks.json; grep -q 0a .last; s=$?; rm -f .last; exit $s" label="and ends the file with a newline" -- Add + '\n' after JSON.stringify(…).
```

The checks write a test list into the data file and then put yours back, because writing is what they test.

## Add a bookmark: POST /api/bookmarks

Open `server/routes.js`. Three changes, in the order of the file:

1. **The import.** `2G`, `0`, `2w` puts the cursor on `readBookmarks`, and `e` on its last letter. `a`, type `, writeBookmarks`, Esc.
2. **`readJson`.** `7G` is the `}` that ends `sendJson`. `o`, Enter, and type the comment and the function below. Esc.
3. **`addBookmark`.** Find the `}` that ends `listBookmarks` (`:set number`; it's line 21 now). `o`, Enter, and type the handler. Esc.
4. **The table.** Put the cursor on the line `'GET /api/bookmarks': listBookmarks,` and `yyp` to copy it below itself. On the copy, `w` lands on `GET` and `ciw` changes it to `POST`, Esc. Then `$` goes to the comma at the end of the line, `b` back to the start of `listBookmarks`, and `ciw` changes the word (not the comma) to `addBookmark`. Esc, `:w`.

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
  const bookmark = { title: body.title, url: body.url };
  const bookmarks = readBookmarks();
  bookmarks.push(bookmark);
  writeBookmarks(bookmarks);
  response.statusCode = 201;
  sendJson(response, bookmark);
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

A request's **body** is the data sent with it: a `GET` usually has none, and a `POST` carries the thing to add. Node doesn't hand the body over in one piece; it arrives in **chunks**, as the network delivers it, and the handler has to wait for all of them.

- **`async function`** marks a function that can wait. Inside it, **`await`** pauses the function until something that takes time has finished, and gives back its result. While it's paused, the server goes on handling other requests.
- **`for await (const chunk of request)`** runs its body once per chunk of the request's body, waiting for each to arrive; the loop ends when the last one has. **`text += chunk`** adds each chunk to the end of `text`, which starts as the empty string `''`.
- **`return JSON.parse(text)`** turns the complete text into an object. `readJson` isn't exported: only this file uses it.
- **`const body = await readJson(request)`** waits for the whole body and keeps the object. **`{ title: body.title, url: body.url }`** copies only the two fields Shelf stores, so anything else a client sends is dropped.
- **`bookmarks.push(bookmark)`** adds it to the end of the list, and **`writeBookmarks`** saves the longer list.
- **`201`** is the status code for Created: the request worked and something new exists. The answer is the bookmark as it was stored.
- On the copied line, `ciw` changed **only** `listBookmarks`: the comma after it is a separate word, because it's punctuation. `ciW` would have taken the comma too.

```check
run "cp data/bookmarks.json .bookmarks.bak; out=$(PORT=3917 node server/server.js & sleep 1; curl -s -m 2 -o /dev/null -w '%{http_code}' -d '{\"title\":\"Check\",\"url\":\"https://example.com/check\"}' http://localhost:3917/api/bookmarks; kill $!); node -e \"console.log(JSON.parse(require('fs').readFileSync('data/bookmarks.json', 'utf8')).at(-1).url)\" >> .out; mv .bookmarks.bak data/bookmarks.json; echo \"$out\"; cat .out; rm -f .out" stdout="https://example.com/check" label="a POST is saved at the end of the data file" -- addBookmark should push the bookmark onto readBookmarks() and pass the list to writeBookmarks; the table needs 'POST /api/bookmarks': addBookmark,
run "cp data/bookmarks.json .bookmarks.bak; out=$(PORT=3917 node server/server.js & sleep 1; curl -s -m 2 -o /dev/null -w '%{http_code}' -d '{\"title\":\"Check\",\"url\":\"https://example.com/check\"}' http://localhost:3917/api/bookmarks; kill $!); mv .bookmarks.bak data/bookmarks.json; echo \"$out\"" stdout="201" label="it answers with status 201" -- Set response.statusCode = 201; before sendJson.
run "cp data/bookmarks.json .bookmarks.bak; out=$(PORT=3917 node server/server.js & sleep 1; curl -s -m 2 -d '{\"title\":\"Check\",\"url\":\"https://example.com/check\",\"extra\":1}' http://localhost:3917/api/bookmarks; kill $!); mv .bookmarks.bak data/bookmarks.json; echo \"$out\"" stdout="{\"title\":\"Check\",\"url\":\"https://example.com/check\"}" without="extra" label="and with the bookmark as stored: title and url only" -- Build the bookmark from body.title and body.url only, and send that object back.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s -m 2 -o /dev/null -w '%{http_code}' http://localhost:3917/api/bookmarks; kill $!); echo \"$out\"" stdout="200" label="GET /api/bookmarks still lists them" -- Keep the 'GET /api/bookmarks': listBookmarks, line; the POST line is a copy below it.
```

## A request file, changed with ci"

The bookmark to send goes in a file, so it's easy to change and send again.

1. `:e new-bookmark.json`, `i`, and type it on one line:

```text
{ "title": "MDN: HTTP", "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP" }
```

2. Esc, `:w`. In the terminal, with the server running:

```zsh
curl -i -d @new-bookmark.json http://localhost:3000/api/bookmarks
```

- **`-d @new-bookmark.json`** sends the file's contents as the request's body (`-d` is for data). With `-d`, `curl` uses `POST` without being told.
- The answer is `HTTP/1.1 201 Created` and the bookmark. `curl http://localhost:3000/api/bookmarks/count` is one higher than before.

Now make it a different bookmark, the Node.js manual's page on `http`, and send that too:

3. `0`, then `fM` lands on the `M` of `MDN`, inside the title's value. `ci"`, `Node.js: http`, Esc.
4. `fd` finds the next `d`, the one in `developer`, inside the URL. `ci"`, `https://nodejs.org/api/http.html`, Esc. `:w`, and send it with the same `curl` command.

```text file=new-bookmark.json
{ "title": "Node.js: http", "url": "https://nodejs.org/api/http.html" }
```

- `ci"` from the very start of the line would have changed `title`, the key: it's the first string. And from the `:` after it, it would have changed the `: ` between the strings. Inside the value is the one place that means the value.
- Each send adds one bookmark to `data/bookmarks.json` for real. Open it, `G`: the last two are the ones you sent, written two spaces a level by `writeBookmarks`. Lesson 4.3 adds a `DELETE`, if you want to remove them.

```check
run "node -e \"const b = JSON.parse(require('fs').readFileSync('new-bookmark.json', 'utf8')); console.log(b.title + ' | ' + b.url);\"" stdout="Node.js: http | https://nodejs.org/api/http.html" label="new-bookmark.json holds the Node.js bookmark" -- One line: { "title": "Node.js: http", "url": "https://nodejs.org/api/http.html" } (ci" from a letter inside each value).
```

## A body that isn't JSON

Send something that isn't JSON at all:

```zsh
curl -i -d 'not json' http://localhost:3000/api/bookmarks
```

```predict
question: Lesson 3.5 put every handler call inside a try. What happens?
choice: 500 and {"error":"server error"}; the server keeps running
choice: curl: (52) Empty reply from server, and the server stops
choice: 201: the text is stored as a bookmark
answer: curl: (52) Empty reply from server, and the server stops
explain: JSON.parse throws, but not while the try is running. The try only waited for addBookmark to start; addBookmark then paused at await readJson, and the try was over long before the body arrived. An error in an async function that nothing is waiting for ends the whole Node process.
```

- **The symptom**: `curl` gets no answer at all, and every route is down, `/health` included. The server's terminal shows `SyntaxError: Unexpected token 'o', "not json" is not valid JSON`, then `Node.js v22…`, and the shell prompt: the server has ended.
- **How to find it**: the `at` lines go `at JSON.parse`, `at readJson`, `at async addBookmark`, and **none** of them is in `server.js`. The error reached no `catch`.
- **The cause**: an `async` function returns at its first `await`, with a **promise**, a value that stands for "the result, later". `handler(request, response)` started `addBookmark` and got the promise back; nothing waited on it, so when the error came, nobody caught it.

The fix is to wait for the handler, inside the `try`. Open `server/server.js`:

1. `6G`, `0`, `f(` lands on the first `(`, the one after `createServer`. `a`, `async ` (with the space), Esc.
2. `10G`, `^`, `i`, `await ` (with the space), Esc. `:w`.

```javascript file=server/server.js
import http from 'node:http';
import { routes, notFound, serverError } from './routes.js';

const port = process.env.PORT || 3000; // 3000 unless PORT is set

const server = http.createServer(async (request, response) => {
  console.log(new Date().toISOString(), request.method, request.url);
  const handler = routes[`${request.method} ${request.url}`] || notFound;
  try {
    await handler(request, response);
  } catch (error) {
    console.error(error);
    serverError(request, response);
  }
});

server.listen(port, () => {
  console.log(`Shelf is listening on http://localhost:${port}`);
});
```

- **`await handler(request, response)`** waits until the handler has finished, including any `await` inside it. An error thrown at any point lands in this `catch`.
- `await` is only allowed inside an `async` function, so the arrow function the server calls for each request becomes **`async (request, response) => { … }`**.
- Awaiting a handler that isn't `async`, like `health`, does no harm: it has already finished when it returns.
- If you answered lesson 3.5's Your turn differently, your `catch` may look different: only the two words change.

Restart the server and send `'not json'` again: `500` and `{"error":"server error"}`, and the server is still running. A body that isn't JSON is really the **client's** mistake, which should be a `400`; the next section is about saying that.

```check
run "out=$(PORT=3917 node server/server.js 2>/dev/null & sleep 1; curl -s -m 2 -o /dev/null -w '%{http_code}' -d 'not json' http://localhost:3917/api/bookmarks; kill $!); echo \"$out\"" stdout="500" label="a body that isn't JSON gets status 500" -- In server.js: await handler(request, response); inside the try, and async before (request, response) =>.
run "out=$(PORT=3917 node server/server.js 2>/dev/null & sleep 1; curl -s -m 2 -o /dev/null -d 'not json' http://localhost:3917/api/bookmarks; curl -s -m 2 http://localhost:3917/health; kill $!); echo \"$out\"" stdout="\"ok\":true" label="and the server keeps running" -- Without await, the error escapes the try and ends the server.
```

## Saying no: status 400

Some requests are wrong before the server does anything: a bookmark without a URL, or with an empty title. The answer for those is **400 Bad Request**: the client must change the request, and sending it again unchanged won't help. A server should check its input and say so, rather than store something broken.

Three pieces of JavaScript do this:

| Code | Means |
|---|---|
| `!value` | "not": `true` when `value` is missing (`undefined`), empty (`''`), `0` or `null`; `false` for any non-empty text |
| `a \|\| b` | "or": `true` when either side is `true` |
| `return;` | leave the function now; nothing after it runs |

So `if (!port || !host) { … }` runs its block when either is missing or empty, and a `return;` at the end of that block stops the function from carrying on as if nothing were wrong.

```predict
question: body is { title: 'Shelf' }, with no url. What is !body.title || !body.url?
choice: true
choice: false
answer: true
explain: body.url is undefined, so !body.url is true, and an || with one true side is true. !body.title is false (title is non-empty text), which doesn't matter.
verify: node -e "const body = { title: 'Shelf' }; console.log(!body.title || !body.url)"
```

## Drill: empty three strings

Click **Fresh copy of practice/drills/43-di-quote.txt**, open it, and empty all three strings, keeping their quotes.

```text file=practice/drills/43-di-quote.txt provided
title: 'TODO',
url: 'TODO',
note: 'TODO',
```

Par 7: {{key:delete}} with {{key:i-single}} from the start of line 1: the cursor is before the string, so it's the first string after it (3). Then {{key:j}} and {{key:dot}}, twice. Each line is a different length, and it doesn't matter.

```check
run "sed -n 1p practice/drills/43-di-quote.txt | grep -Fqx \"title: '',\"" label="line 1 reads title: ''," -- Click Fresh copy of practice/drills/43-di-quote.txt and try again.
run "sed -n 3p practice/drills/43-di-quote.txt | grep -Fqx \"note: '',\"" label="line 3 reads note: ''," -- Click Fresh copy of practice/drills/43-di-quote.txt and try again.
run "test $(grep -c TODO practice/drills/43-di-quote.txt) -eq 0 && test $(wc -l < practice/drills/43-di-quote.txt) -eq 3" label="no TODO is left, and it has 3 lines" -- Click Fresh copy of practice/drills/43-di-quote.txt and try again.
keys practice/drills/43-di-quote.txt par=7
```

## Drill: a value in the middle

Click **Fresh copy of practice/drills/44-ci-double.txt**, open it, and change the title to `Neovim`.

```text file=practice/drills/44-ci-double.txt provided
{ "title": "temporary title", "url": "https://neovim.io" }
```

Par 12: {{key:find}} with `p` lands inside `temporary` (the first `p` on the line), then {{key:change}} {{key:i-double}}, `Neovim`, {{key:esc}}. (A {{key:find}} with `t` would stop in `title` first: count how many {{key:repeat-find}} it would need.)

```check
run "sed -n 1p practice/drills/44-ci-double.txt | grep -Fqx '{ \"title\": \"Neovim\", \"url\": \"https://neovim.io\" }'" label="line 1 reads { \"title\": \"Neovim\", \"url\": \"https://neovim.io\" }" -- Click Fresh copy of practice/drills/44-ci-double.txt and try again.
run "test $(wc -l < practice/drills/44-ci-double.txt) -eq 1" label="it has 1 line" -- Click Fresh copy of practice/drills/44-ci-double.txt and try again.
keys practice/drills/44-ci-double.txt par=12
```

## Drill: a template string

Click **Fresh copy of practice/drills/45-ci-backtick.txt**, open it, and change the message to `Shelf is ready`.

```text file=practice/drills/45-ci-backtick.txt provided
console.log(`Shelf is listening on port ${port}`);
```

The result:

```text
console.log(`Shelf is ready`);
```

Par 18: {{key:change}} {{key:i-backtick}} from the start of the line, `Shelf is ready`, {{key:esc}}. The `${port}` inside goes with the rest: everything between the backticks is the string.

```check
run "sed -n 1p practice/drills/45-ci-backtick.txt | grep -qx 'console\.log(.Shelf is ready.);'" label="the template string now holds only Shelf is ready" -- Click Fresh copy of practice/drills/45-ci-backtick.txt and try again.
run "test $(wc -l < practice/drills/45-ci-backtick.txt) -eq 1" label="it has 1 line" -- Click Fresh copy of practice/drills/45-ci-backtick.txt and try again.
keys practice/drills/45-ci-backtick.txt par=18
```

## Review: rename, then remove

Click **Fresh copy of practice/review/04-02.txt**, open it, rename `name` to `title`, and delete both `// remove` lines. Recall the keys before hovering.

```text file=practice/review/04-02.txt provided
const name = 'shelf';
// remove
const port = 3000;
// remove
```

Par 15: {{key:motion-w}}, then {{key:ciw}}, `title`, {{key:esc}} (10). {{key:j}}, {{key:dd}}: the next line moves up under the cursor. {{key:j}} and {{key:dot}} (5).

```check
run "sed -n 1p practice/review/04-02.txt | grep -Fqx \"const title = 'shelf';\"" label="line 1 reads const title = 'shelf';" -- Click Fresh copy of practice/review/04-02.txt and try again.
run "sed -n 2p practice/review/04-02.txt | grep -Fqx 'const port = 3000;'" label="line 2 reads const port = 3000;" -- Click Fresh copy of practice/review/04-02.txt and try again.
run "test $(wc -l < practice/review/04-02.txt) -eq 2" label="it has 2 lines" -- Click Fresh copy of practice/review/04-02.txt and try again.
keys practice/review/04-02.txt par=15
```

## Your turn: refuse a bookmark without a title or URL

**Build, on your own:** `POST /api/bookmarks` with a missing or empty `title` or `url` should answer status 400 with `{"error":"title and url are required"}`, and store nothing. A complete bookmark is still added, with 201.

Try it first: `curl -i -d '{"title":"no url"}' http://localhost:3000/api/bookmarks` gets 201 today, and `data/bookmarks.json` ends with a bookmark that has no URL. Take it out by hand: open the file, `G` is the closing `]`, `3k` is the `{` that opens the bad bookmark, and `3dd` deletes it. The `},` above it is now the last bookmark's end, and JSON allows no comma there: `k`, `$`, `x`. `:w`. (Not `dap`: the file has no blank lines, so the whole list is one paragraph.)

Decide where in `addBookmark` the check must go so that nothing is written.

```hints
nudge: The check has to come after the body has been read, and before anything is written to the store.
concept: if (!body.title || !body.url) { … } runs its block when either is missing or empty. Inside, set the status, send the error with sendJson, and return; so the rest of addBookmark doesn't run.
shape: After const body = await readJson(request);, add an if block: response.statusCode = 400;, then sendJson(response, { error: 'title and url are required' });, then return;. serverError already has the first two lines' shape: yank them (2yy on its statusCode line), put them in, and change the number with ciw and the message with ci'.
```

```check
run "cp data/bookmarks.json .bookmarks.bak; out=$(PORT=3917 node server/server.js & sleep 1; curl -s -m 2 -d '{\"title\":\"no url\"}' http://localhost:3917/api/bookmarks; kill $!); mv .bookmarks.bak data/bookmarks.json; echo \"$out\"" stdout="{\"error\":\"title and url are required\"}" label="a bookmark with no url gets {\"error\":\"title and url are required\"}" -- In addBookmark, check !body.title || !body.url and send the error with sendJson.
run "cp data/bookmarks.json .bookmarks.bak; out=$(PORT=3917 node server/server.js & sleep 1; curl -s -m 2 -o /dev/null -w '%{http_code}' -d '{\"title\":\"\",\"url\":\"https://example.com\"}' http://localhost:3917/api/bookmarks; kill $!); mv .bookmarks.bak data/bookmarks.json; echo \"$out\"" stdout="400" label="an empty title gets status 400" -- !body.title is true for '' as well as for a missing title. Set response.statusCode = 400;
run "cp data/bookmarks.json .bookmarks.bak; (PORT=3917 node server/server.js & sleep 1; curl -s -m 2 -o /dev/null -d '{\"url\":\"https://example.com\"}' http://localhost:3917/api/bookmarks; kill $!) > /dev/null 2>&1; cmp -s data/bookmarks.json .bookmarks.bak; s=$?; mv .bookmarks.bak data/bookmarks.json; exit $s" label="a refused bookmark isn't stored" -- The check and its return; must come before writeBookmarks, so nothing is written.
run "cp data/bookmarks.json .bookmarks.bak; out=$(PORT=3917 node server/server.js & sleep 1; curl -s -m 2 -o /dev/null -w '%{http_code}' -d '{\"title\":\"Check\",\"url\":\"https://example.com/check\"}' http://localhost:3917/api/bookmarks; kill $!); mv .bookmarks.bak data/bookmarks.json; echo \"$out\"" stdout="201" label="a complete bookmark still gets 201" -- The if block must only run when a field is missing: !body.title || !body.url, with return; inside its braces.
```

The checks establish the answer, the status and that nothing is stored, for a missing and an empty field. They don't try a body that is JSON but not an object, such as `42`: predict what `curl -i -d 42 http://localhost:3000/api/bookmarks` gets, then try it.

### What you have

```text
server/store.js    writeBookmarks(): the one place the data file is written
server/routes.js   POST /api/bookmarks adds a bookmark; 400 without title or url
server/server.js   waits for async handlers, so their errors reach the catch
new-bookmark.json  the bookmark to send: change it with ci"
```

| Keys | Does |
|---|---|
| `ci'` / `ci"` / ``ci` `` | change inside the string under or after the cursor, on this line |
| `di'` / `da'` | empty the string / delete it, quotes and all |
| `yi"` | copy what's inside the string |

Next: brackets. `ci(` changes a function's arguments, `di{` empties a block, and `da[` deletes a whole list. Shelf gets `DELETE`, to remove a bookmark by its URL.
