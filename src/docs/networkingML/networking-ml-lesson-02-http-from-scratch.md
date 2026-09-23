# Lesson 2 — HTTP From Scratch

## What you'll learn
- HTTP's actual wire format: what bytes genuinely travel over the socket
  when you call `fetch` — not an abstraction, the literal text
- Parsing a raw HTTP request by hand: request line, headers, the blank-line
  separator, body
- Constructing a raw HTTP response by hand — status line, headers,
  `Content-Length`, body — well enough for a real browser to render it
- Why `Content-Length` specifically must be correct, and what happens when
  it isn't

## What you'll build
A server, built directly on Lesson 1's raw socket, that reads an actual
HTTP request sent by a real browser, parses it by hand (no library), and
sends back a real, valid HTTP response a browser correctly renders — zero
use of `http.server`, FastAPI, or any HTTP library.

## The question
Lesson 1's server received raw, unstructured bytes. When you type a URL
into a browser, the browser also just sends bytes over a socket — but
somehow the server on the other end knows *which page* you wanted, *what
method* you're using, and various other details. What structure do those
bytes actually have that makes this possible?

## 1. Predict

You've seen HTTP concepts before — methods (Lesson 18's `GET`/`POST`),
headers (Lesson 19's `Content-Type`), status codes (Lesson 19's `422`).
Predict: do you think these are transmitted as some efficient binary
format, or as plain, human-readable text? (Hint: you've been able to
`console.log` response bodies and read header names as plain strings this
whole curriculum — that's a real clue.)

## 2. Try it — capturing a real request, raw

```python
import socket

serverSocket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
serverSocket.bind(("127.0.0.1", 8080))
serverSocket.listen(1)
print("Listening on http://127.0.0.1:8080 — open this in a browser")

connectionSocket, clientAddress = serverSocket.accept()
requestBytes = connectionSocket.recv(4096)

print(requestBytes.decode("utf-8"))

connectionSocket.close()
serverSocket.close()
```

Run this, then open `http://127.0.0.1:8080` in an actual browser tab (the
browser will appear to hang/load forever — that's expected, since this
server never sends a response yet).

### What this code does

**`requestBytes.decode("utf-8")`**
- The inverse of Lesson 1's `.encode()` — converting raw `bytes` back into
  a readable Python string. HTTP's textual nature (your Predict question's
  answer) is exactly why this works cleanly: the bytes a browser sends
  genuinely *are* human-readable text, not a compact binary encoding.

**What you'll actually see printed** — something close to:
```
GET / HTTP/1.1
Host: 127.0.0.1:8080
User-Agent: Mozilla/5.0 ...
Accept: text/html,application/xhtml+xml...
Accept-Language: en-US,en;q=0.9
Connection: keep-alive

```

- **This is the real, complete structure of an HTTP request, revealed
  directly, no abstraction.** Line 1 (`GET / HTTP/1.1`) is the **request
  line**: method, path, HTTP version. Every subsequent line until a blank
  line is a **header**: `Name: value`. The blank line itself is the
  **separator** marking "headers are done" (a `GET` request typically has
  no body after it; Section 5 covers a request that does).
- **This is exactly what `fetch`'s `method`, `headers`, and `Content-Type`
  options (Lesson 19) were always producing under the hood** — every
  `fetch` call in this entire curriculum has been generating text exactly
  in this shape, sent over a socket exactly like Lesson 1's, with the
  browser handling the socket/formatting details for you.

## 3. Why — parsing the request line and headers by hand

```python
def parseRequest(requestText):
    lines = requestText.split("\r\n")
    requestLine = lines[0]
    method, path, httpVersion = requestLine.split(" ")

    headers = {}
    for line in lines[1:]:
        if line == "":
            break
        headerName, headerValue = line.split(": ", 1)
        headers[headerName] = headerValue

    return method, path, headers
```

**`requestText.split("\r\n")`**
- HTTP's line separator is specifically `\r\n` (carriage return + line
  feed — two characters, not just `\n`) — a real, standard-mandated detail
  (a historical holdover from early text-based network protocols) worth
  knowing explicitly, since forgetting it (using plain `\n` when
  constructing your own response in Section 4) is a genuine, common
  mistake that some HTTP clients are more forgiving of than others.

**`method, path, httpVersion = requestLine.split(" ")`**
- Splitting the request line's three space-separated parts directly into
  three named variables (Python's tuple-unpacking, similar in spirit to
  JS's array destructuring from Lesson 9) — `method` is `"GET"`, `path` is
  `"/"` (or whatever URL path the browser requested — try navigating to
  `http://127.0.0.1:8080/some/path` and watch `path` change accordingly),
  `httpVersion` is `"HTTP/1.1"`.

**`for line in lines[1:]: if line == "": break ...`**
- Iterates every line *after* the request line, stopping the moment an
  empty line is found — **this is the direct, hand-written implementation
  of "the blank line marks the end of headers"** from Section 2's
  observation. `headerName, headerValue = line.split(": ", 1)` — splitting
  on the *first* `": "` only (the `1` argument limits the split count),
  since a header value could itself legitimately contain a colon (e.g. a
  timestamp) that shouldn't be treated as a second split point.

## 4. Change one thing

```diff
     for line in lines[1:]:
         if line == "":
             break
         headerName, headerValue = line.split(": ", 1)
-        headers[headerName] = headerValue
+        headers[headerName.lower()] = headerValue
```

**What changed:** header names are stored lowercase.
**What did not change:** the actual parsing logic/structure.
**Worth knowing**: HTTP header names are **case-insensitive** by the
actual specification — `Content-Type`, `content-type`, and
`CONTENT-TYPE` are all the *same* header, and a real HTTP client/server
might send any casing. Real HTTP libraries normalize header casing
internally for exactly this reason; a hand-written parser that does a
case-sensitive dictionary lookup (`headers["Content-Type"]`) risks
silently missing a header sent as `content-type` by some other client —
this lowercase-normalization is a real, minimal fix for a genuine,
easy-to-miss correctness issue.

## 5. Put it in the project — sending a real response back

```python
import socket

def buildHttpResponse(statusCode, statusText, bodyText):
    bodyBytes = bodyText.encode("utf-8")
    responseLines = [
        "HTTP/1.1 " + str(statusCode) + " " + statusText,
        "Content-Type: text/html; charset=utf-8",
        "Content-Length: " + str(len(bodyBytes)),
        "Connection: close",
        "",
        ""
    ]
    responseHeaderText = "\r\n".join(responseLines)
    return responseHeaderText.encode("utf-8") + bodyBytes

serverSocket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
serverSocket.bind(("127.0.0.1", 8080))
serverSocket.listen(1)
print("Listening on http://127.0.0.1:8080")

while True:
    connectionSocket, clientAddress = serverSocket.accept()
    requestBytes = connectionSocket.recv(4096)
    requestText = requestBytes.decode("utf-8")

    requestLine = requestText.split("\r\n")[0]
    method, path, httpVersion = requestLine.split(" ")
    print(method, path)

    if path == "/":
        responseBytes = buildHttpResponse(200, "OK", "<h1>Hello from a hand-built server</h1>")
    else:
        responseBytes = buildHttpResponse(404, "Not Found", "<h1>404 — not found</h1>")

    connectionSocket.send(responseBytes)
    connectionSocket.close()
```

### Code walkthrough

**`"HTTP/1.1 " + str(statusCode) + " " + statusText`**
- The **status line** — the response's direct counterpart to the
  request's request line: HTTP version, numeric status code, and a
  human-readable status text. `200 OK`/`404 Not Found` are exactly the
  same status codes you've read off real API responses since Lesson 6/19
  — now something you're constructing yourself, by hand.

**`"Content-Length: " + str(len(bodyBytes))`**
- **This is the single most important, most commonly-gotten-wrong header
  in a hand-built response.** It tells the receiving client **exactly how
  many bytes of body to expect** after the headers end — critically, this
  must be the length of the **encoded bytes**, not the character count of
  the original string (these can differ for non-ASCII text, where one
  character can encode to multiple bytes in UTF-8) — `len(bodyBytes)`,
  measured *after* encoding, is correct specifically for this reason.

**`"", ""`** (two empty strings at the end of `responseLines`)
- `"\r\n".join([...])` on a list ending in two empty strings produces a
  trailing `"...last-header\r\n\r\n"` — **exactly the blank-line separator
  from Section 2/3**, marking the end of headers, now being *constructed*
  rather than *parsed*. Getting this exactly right (not one `\r\n` too few
  or too many) is required for a real browser to correctly recognize where
  headers end and the body begins.

**`return responseHeaderText.encode("utf-8") + bodyBytes`**
- Concatenating two separate `bytes` objects — the encoded header text,
  directly followed by the already-encoded body bytes — into one single
  `bytes` object sent in one `.send()` call.

### What happens

Opening `http://127.0.0.1:8080` in a real browser now actually renders
"Hello from a hand-built server" — a real, working, if minimal, HTTP
server, with **zero** HTTP library involved anywhere; every byte the
browser receives and correctly interprets was constructed by hand,
string by string.

## 6. Trap

Predict, then test: deliberately set `Content-Length` to a number
**smaller** than the body's actual byte length (e.g. hardcode
`"Content-Length: 5"` regardless of the real body size), then reload the
page in a real browser.

Run it. **The trap: the browser displays only a truncated portion of the
body — cut off exactly at the (incorrect) declared length — even though
the server genuinely sent the complete, correct body bytes over the
socket.** This is worth confirming directly, since it reveals something
real and important: **the receiving client trusts `Content-Length` over
what it actually observes arriving** — it stops reading (or displays only)
that many bytes and considers the message complete, regardless of whether
more bytes are technically present on the wire. An incorrect
`Content-Length` is a genuine, real category of bug in hand-rolled HTTP
code — get it right, or (as real servers often do) use a different
body-framing mechanism entirely (chunked transfer encoding — a real HTTP
feature, worth knowing it exists, beyond this lesson's scope to build).

## 7. Exercise

- **Predict:** If you sent a response with **no** `Content-Length` header
  at all, but also `Connection: close`, would a real browser still display
  the body correctly? Reason about it (hint: think about what "close"
  tells the client about when the message ends), then test.
- **Modify:** Parse the request's `User-Agent` header (from Section 3's
  `headers` dict) and include it back in the response body — e.g.
  `<p>Your browser reported: {user agent}</p>` — confirming you can read
  and use a real header's actual value, not just its existence.
- **Break:** Send a response with a status line reading
  `"HTTP/1.1 200"` (omitting the status text `"OK"` entirely — just the
  code). Does a real browser still render the page correctly, or does
  something break?
- **Trace:** Using your browser's Network tab, load a page from this
  hand-built server, click the request, and view its **Response
  Headers**. Confirm every header you constructed appears exactly as
  written — this is real, direct confirmation that your hand-built bytes
  are indistinguishable, to a real browser, from any real HTTP library's
  output.

## What to remember
- HTTP is genuinely plain text over a socket — request line, headers, a
  blank-line separator, optional body — nothing about it is a hidden
  binary format.
- `\r\n` (not just `\n`) is HTTP's actual, specified line separator —
  worth using deliberately, not `\n`, when constructing responses by hand.
- `Content-Length` must equal the **encoded byte length** of the body,
  exactly — the receiving client trusts this number over what it actually
  observes arriving, making an incorrect value a real, silent-looking bug.
- Every `fetch`/FastAPI request in this entire curriculum has been
  producing and consuming exactly this text format — you've now built
  both the sending and receiving side of it entirely by hand.

## Next lesson
Lesson 3 covers what happens **before** any of this — DNS resolution,
turning a domain name into the IP address `connect()` (Lesson 1) actually
needs, and tracing the real path a request takes before your first byte
even leaves your machine.
