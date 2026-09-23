# Lesson 5 — WebSockets: Persistent, Bidirectional Connections

## What you'll learn
- What's fundamentally different about a WebSocket versus every
  request/response exchange built so far: the connection **stays open**
- The WebSocket handshake — a real HTTP request that gets "upgraded," and
  the actual cryptographic proof the server must compute to accept it
- Where hand-rolling stops being worthwhile (frame parsing/masking) versus
  where understanding the mechanism still matters (the handshake) — a
  deliberate, honest line, same spirit as Lesson 4's framework discussion
- Building a real live chat server, and your first frontend tie-in: a
  browser-side connection/message visualizer

## What you'll build
A WebSocket chat server in Python (using the `websockets` library, for
reasons explained directly in Section 3), and a browser page using the
native `WebSocket` JS API to connect, send, and receive messages live —
with a visual log showing connection state and every message as it
arrives.

## The question
Every request/response pair built in Lessons 1-4 followed the same
rhythm: connect, send one request, get one response, close. A live chat
needs messages to flow **in both directions, at any time, without either
side re-connecting for every single message.** What has to be different
about the underlying connection to make that possible?

## 1. Predict

Recall Lesson 2's response included `Connection: close` — the server
explicitly telling the client "this connection ends after this one
response." Predict: if a connection needs to support many messages, in
both directions, over an extended period, what do you think needs to
happen to that "close after one exchange" behavior?

## 2. Try it — the handshake, made concrete (not hand-rolled)

A WebSocket connection **begins as an ordinary HTTP request** — genuinely
using everything from Lessons 1-2 — but with special headers signaling
the client wants to **upgrade** the connection:

```
GET /chat HTTP/1.1
Host: 127.0.0.1:8765
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

The server must respond with a very specific, computable value proving it
understood the upgrade request:

```python
import hashlib
import base64

def computeWebSocketAccept(clientKey):
    magicGuid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
    combined = clientKey + magicGuid
    sha1Hash = hashlib.sha1(combined.encode("utf-8")).digest()
    return base64.b64encode(sha1Hash).decode("utf-8")

print(computeWebSocketAccept("dGhlIHNhbXBsZSBub25jZQ=="))
```

### What this code does

**`Upgrade: websocket` / `Connection: Upgrade`**
- **This is the direct answer to your Predict question.** Rather than
  inventing an entirely new, separate protocol from scratch, WebSockets
  deliberately **begin** as a normal HTTP request specifically so they can
  reuse existing infrastructure (ports, proxies, firewalls already
  configured for HTTP) — these two headers are the client's explicit
  signal: "I'd like this connection to stop being ordinary HTTP after this
  one exchange, and become something else instead."

**`Sec-WebSocket-Key`** — a random, client-generated value, base64-encoded
- Sent by the client as a kind of one-time challenge.

**`computeWebSocketAccept(clientKey)`**
- **This is the actual proof-of-understanding mechanism, worth seeing
  computed directly rather than taken on faith.** The server must:
  concatenate the client's key with a **fixed, spec-mandated "magic" GUID
  string** (`258EAFA5-E914-47DA-95CA-C5AB0DC85B11` — genuinely fixed,
  identical in every correct WebSocket implementation anywhere, part of
  the actual protocol specification), **SHA-1 hash** the combined string,
  then **base64-encode** the hash. The result must appear in the server's
  response as the `Sec-WebSocket-Accept` header. **A client verifies this
  value before treating the connection as successfully upgraded** — this
  is a real, working piece of the handshake, and running the code above
  produces the genuine, correct `Sec-WebSocket-Accept` value for that
  specific example key (a well-known example value straight from the
  actual WebSocket specification document, verifiable against any other
  correct implementation).

### What happens

You've now computed, by hand, the exact cryptographic step a WebSocket
server must perform to accept a connection — the same computation every
real WebSocket library (including the one used in Section 4) performs
internally, no longer a mystery.

## 3. Why — where hand-rolling stops, honestly

**Past the handshake, WebSockets get substantially harder to hand-roll
correctly**: actual message **frames** have their own binary format
(opcodes indicating text vs. binary vs. connection-close, a length field
with special encoding for larger messages, and — critically — client-sent
frames must be **masked** with a random key per-frame, a real security
requirement in the specification, not optional). **This is a deliberate,
honest line, drawn the same way Lesson 4 drew one around raw HTTP
serving**: the handshake's cryptographic proof is worth computing by hand
once, because it demystifies a real, specific, checkable piece of the
protocol — but hand-parsing arbitrary WebSocket frame data correctly,
including all its edge cases and security requirements, is a genuinely
poor use of time compared to using a real, tested library, exactly the
same reasoning that justified FastAPI over hand-rolled HTTP serving for
anything beyond a teaching exercise.

```python
import asyncio
import websockets

connectedClients = set()

async def handleConnection(websocketConnection):
    connectedClients.add(websocketConnection)
    print("Client connected. Total clients:", len(connectedClients))

    try:
        async for receivedMessage in websocketConnection:
            print("Received:", receivedMessage)
            for client in connectedClients:
                await client.send(receivedMessage)
    finally:
        connectedClients.remove(websocketConnection)
        print("Client disconnected. Total clients:", len(connectedClients))

async def main():
    async with websockets.serve(handleConnection, "127.0.0.1", 8765):
        print("WebSocket server running on ws://127.0.0.1:8765")
        await asyncio.Future()

asyncio.run(main())
```

**`connectedClients = set()`**
- A **set** (new Python collection type here) — like a list, but with no
  duplicates and no particular order, well-suited for "the current group
  of connected clients," where you only ever need to add, remove, and
  iterate, never access by index.

**`async def handleConnection(websocketConnection): ...`**
- `async def` — Python's own `async`/`await` (conceptually the same idea
  as JS's, Lesson 6/11 in the frontend curriculum: this function can
  `await` other async operations, pausing itself without blocking the
  whole program). This function runs **once per connected client**, for
  the **entire duration** of that client's connection — directly
  contrasting with Lesson 4's handler functions, which ran once, returned
  a response, and were done.

**`async for receivedMessage in websocketConnection:`**
- **This is the structural heart of the "connection stays open" idea.**
  Unlike a single `recv()` call (Lesson 1), this loop runs **once per
  incoming message**, for as long as the connection remains open —
  potentially receiving many messages over an extended period, with the
  function genuinely paused (not busy-looping) between messages, only
  resuming when a new one actually arrives.

**`for client in connectedClients: await client.send(receivedMessage)`**
- **This is the actual "chat" behavior**: whenever any one client sends a
  message, the server loops through **every currently connected client**
  (including, in this simple version, the original sender) and sends the
  message to each of them — a real, working broadcast, built from nothing
  but a set and a loop.

**`try: ... finally: connectedClients.remove(websocketConnection)`**
- Ensures a disconnected client is removed from `connectedClients`
  regardless of *why* the connection ended (client closed normally,
  network failure, etc.) — the same `finally`-for-cleanup principle from
  Lesson 6/11's `try`/`finally` in the frontend curriculum, now ensuring
  the broadcast loop never tries sending to a client that's actually gone.

## 4. Change one thing

```diff
     try:
         async for receivedMessage in websocketConnection:
             print("Received:", receivedMessage)
             for client in connectedClients:
-                await client.send(receivedMessage)
+                if client != websocketConnection:
+                    await client.send(receivedMessage)
```

**What changed:** the sender no longer receives their own message echoed
back.
**What did not change:** the broadcast structure itself — still one loop
over `connectedClients`, still triggered by every incoming message.
**Worth noticing**: this is a real, meaningful product decision a chat
application actually has to make (does a sender see their own message
echoed back from the server, or does the client display it locally
immediately upon sending, without waiting for the round trip?) — both are
legitimate, real designs; this small `if` is the entire difference between
them at the server level.

## 5. Put it in the project — the frontend visualizer

```html
<style>
  #connectionStatus { font-weight: bold; }
  #messageLog { border: 1px solid #ccc; height: 200px; overflow-y: auto;
                padding: 8px; font-family: monospace; }
  .logEntry { margin-bottom: 4px; }
  .logEntrySystem { color: #888; }
</style>
<p>Status: <span id="connectionStatus">connecting...</span></p>
<div id="messageLog"></div>
<input id="messageInput" type="text">
<button id="sendButton">Send</button>

<script>
  const connectionStatusDisplay = document.getElementById("connectionStatus");
  const messageLog = document.getElementById("messageLog");
  const messageInput = document.getElementById("messageInput");
  const sendButton = document.getElementById("sendButton");

  const socketConnection = new WebSocket("ws://127.0.0.1:8765");

  function appendLogEntry(text, isSystemMessage) {
    const entry = document.createElement("div");
    entry.className = isSystemMessage ? "logEntry logEntrySystem" : "logEntry";
    entry.textContent = text;
    messageLog.appendChild(entry);
    messageLog.scrollTop = messageLog.scrollHeight;
  }

  socketConnection.addEventListener("open", function () {
    connectionStatusDisplay.textContent = "connected";
    appendLogEntry("Connection opened", true);
  });

  socketConnection.addEventListener("message", function (event) {
    appendLogEntry("Received: " + event.data, false);
  });

  socketConnection.addEventListener("close", function () {
    connectionStatusDisplay.textContent = "disconnected";
    appendLogEntry("Connection closed", true);
  });

  sendButton.addEventListener("click", function () {
    socketConnection.send(messageInput.value);
    appendLogEntry("Sent: " + messageInput.value, false);
    messageInput.value = "";
  });
</script>
```

### Code walkthrough

**`new WebSocket("ws://127.0.0.1:8765")`**
- **`ws://`, not `http://`** — a distinct URL scheme signaling a
  WebSocket connection specifically (`wss://` is the encrypted
  equivalent of `https://`, not covered further here). Creating this
  object immediately begins the Section 2 handshake automatically —
  everything computed by hand there happens invisibly here, handled by
  the browser itself.

**`socketConnection.addEventListener("open"/"message"/"close", ...)`**
- **Event-driven, exactly like every DOM event listener throughout the
  entire frontend curriculum** (Lesson 1's `addEventListener("click",
  ...)`) — `"open"` fires once the handshake completes successfully,
  `"message"` fires once **per message received** (directly mirroring the
  server's `async for` loop — one event per incoming message, for the
  connection's entire open duration), `"close"` fires when the connection
  ends for any reason.

**`event.data`** (inside the `"message"` handler)
- The actual received message content — directly analogous to
  `event.target`/`event.key` from earlier frontend lessons: the event
  object carries the specific payload relevant to that event type.

**`socketConnection.send(messageInput.value)`**
- Sends a message **at any time**, not as a response to anything — this
  is the genuinely new capability WebSockets provide over ordinary
  request/response: either side can send, unprompted, whenever it wants,
  for as long as the connection stays open.

### What happens

Opening this page immediately begins connecting; once open, the status
updates and a system log entry appears. Typing a message and clicking Send
transmits it to the server, which broadcasts it back to every connected
client (including, per Section 3's original version, back to you) — open
this same page in two separate browser tabs and watch messages sent from
one appear live in the other, with the connection never closing between
messages, genuinely different from every request/response pattern built
in Lessons 1-4.

## 6. Trap

Predict, then test: close the Python server process entirely (Ctrl+C)
while a browser tab is still connected, and watch the page.

Run it. **The trap, worth confirming directly: the `"close"` event fires
correctly, updating the status — but nothing about your currently-open
page automatically attempts to reconnect.** A real chat application
generally needs **explicit reconnection logic** (detecting the close
event, waiting, then creating a brand-new `WebSocket` object and
re-attaching all the same listeners) — this isn't automatic, and a naive
implementation that assumes a WebSocket, once open, simply *stays* open
forever will silently stop working the moment any network hiccup or
server restart closes the underlying connection, with no built-in retry
unless you write one yourself.

## 7. Exercise

- **Predict:** If two different browser tabs both connect, and tab A
  sends a message, does tab A itself receive a `"message"` event echoing
  it back (given Section 3's *original*, non-modified broadcast code)? If
  you applied Section 4's change on the server, would your answer change?
- **Modify:** Add basic reconnection logic to the frontend: inside the
  `"close"` listener, use `setTimeout` (Lesson 4 of the frontend
  curriculum) to attempt creating a new `WebSocket` connection after a
  short delay.
- **Break:** Send an empty string message (`socketConnection.send("")`)
  from the frontend. Does the server's `async for` loop receive it as a
  distinct message, or does something unexpected happen?
- **Trace:** Using your browser's Network tab, find the actual WebSocket
  connection (usually filterable by type) and inspect its request/response
  headers directly — confirm `Sec-WebSocket-Accept` is present and
  present yourself with the actual client `Sec-WebSocket-Key` your browser
  generated, to compare against Section 2's hand-computed example
  conceptually (the values will differ since your browser generates its
  own random key per connection, but the *computation* is identical).

## What to remember
- A WebSocket connection begins as an ordinary HTTP request (`Upgrade`/
  `Connection` headers), proven and accepted via a specific, real SHA-1 +
  base64 computation against a spec-mandated fixed GUID — not magic, a
  checkable formula.
- Past the handshake, real WebSocket frame parsing/masking is genuinely
  complex enough that using a tested library (`websockets` here) is the
  right call — the same honest line drawn around frameworks in Lesson 4.
- The connection **stays open**: `async for` on the server and the
  `"message"` event on the client both fire once per message, for the
  entire duration of an open connection, not once per request like every
  earlier lesson.
- A closed WebSocket connection does not automatically reconnect — real
  applications need explicit, deliberate reconnection logic.

## This closes Phase A
Lessons 1-5 took you from raw bytes on a socket, through HTTP's actual
wire format, DNS resolution, a hand-built routing web server, to a real,
persistent WebSocket chat — the actual mechanisms underneath every
`fetch`/FastAPI/`uvicorn` call across both this curriculum and the
frontend one. Phase B starts next: machine learning, built the same
way — from scratch first, frameworks second, with your frontend skills
(including this lesson's WebSocket work, reused directly in Lesson 11) put
to genuine use visualizing what's actually happening during training,
rather than reading numbers scroll past in a terminal.
