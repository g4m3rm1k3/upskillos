# Lesson 1 — Raw Sockets: Sending Bytes By Hand

## What you'll learn
- What a **socket** actually is: an endpoint for a connection, not magic
- The client/server handshake at the socket level: `connect`, `bind`,
  `listen`, `accept`
- That HTTP, WebSockets, and literally every network library you've ever
  used (`fetch`, `requests`, FastAPI/`uvicorn`) are all built on exactly
  this — bytes over a socket, nothing more
- Sending and receiving raw bytes yourself, with zero protocol on top

## What you'll build
A Python server that listens on a port and echoes back whatever raw bytes
a client sends it, and a client that connects and sends a message —
communicating with **no HTTP, no JSON, no framework** — just a socket.

## The question
Every request this curriculum has made — `fetch("https://api...")`
(Lesson 6), `uvicorn main:app` (Lesson 18) — ultimately becomes some
sequence of raw bytes traveling over a network connection. What is a
"connection," mechanically, before any of HTTP's structure gets layered on
top of it?

## 1. Predict

You know a URL has a domain and (implicitly or explicitly) a **port**
(`:8000` in `http://127.0.0.1:8000`, Lesson 18). Predict: if a "connection"
needs both a machine to talk to *and* a specific channel on that machine to
talk through, what two pieces of information do you think a program needs
to supply just to *open* a connection at all — before sending anything?

## 2. Try it — a server that listens

**`server.py`**
```python
import socket

serverSocket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
serverSocket.bind(("127.0.0.1", 9000))
serverSocket.listen(1)

print("Listening on port 9000...")

connectionSocket, clientAddress = serverSocket.accept()
print("Connected by", clientAddress)

receivedBytes = connectionSocket.recv(1024)
print("Received:", receivedBytes)

connectionSocket.close()
serverSocket.close()
```

### What this code does

**`socket.socket(socket.AF_INET, socket.SOCK_STREAM)`**
- Creates a new socket object. `AF_INET` — **A**ddress **F**amily,
  **INET**ernet — specifies this socket uses regular IPv4 addresses (as
  opposed to `AF_INET6` for IPv6, or other address families entirely
  unrelated to networking, like Unix domain sockets — not covered here).
  `SOCK_STREAM` specifies **TCP** — a reliable, ordered, connection-based
  protocol (as opposed to `SOCK_DGRAM`, UDP — unordered, connectionless,
  not covered in this lesson). **Every single network interaction in this
  entire curriculum so far — every `fetch`, every FastAPI request — has
  used TCP underneath**, whether you knew it or not.

**`serverSocket.bind(("127.0.0.1", 9000))`**
- **This is the direct answer to your Predict question**: a tuple of
  **(host address, port number)**. `"127.0.0.1"` is **localhost** — "this
  same machine" — a special IP address that always refers back to whatever
  computer is running the code (you've used this exact address throughout
  Lesson 18-19 without it being explained at this level). `9000` is the
  **port** — one of 65,536 numbered channels a single machine can listen
  on simultaneously, letting many different programs (or many instances of
  one program) share one machine's network connection without colliding.
  `bind` claims this specific (address, port) pair for this socket.

**`serverSocket.listen(1)`**
- Puts the socket into **listening mode** — it's now willing to accept
  incoming connection attempts. The argument (`1`) is the **backlog** —
  how many pending, not-yet-accepted connections the operating system will
  queue up before starting to refuse new ones; a small number is fine for
  this simple lesson.

**`connectionSocket, clientAddress = serverSocket.accept()`**
- **This line blocks — pauses the program entirely — until a client
  actually connects.** Once one does, `accept()` returns **two** things: a
  **new, separate socket** (`connectionSocket`) specifically representing
  *this one client's* connection (distinct from `serverSocket`, which
  keeps listening for *future* new connections), and the connecting
  client's own address. This separation — one socket for "listening for
  new connections," a different one per "already-connected client" — is a
  genuinely important structural fact: a real server handling many
  simultaneous clients keeps `serverSocket` around to keep accepting new
  ones, while each `connectionSocket` handles one specific ongoing
  conversation.

**`connectionSocket.recv(1024)`**
- Reads up to `1024` **bytes** from this specific connection — note the
  return type is raw `bytes`, not a string (Python's `bytes` type, printed
  with a `b'...'` prefix) — nothing has parsed or decoded anything yet;
  this is the network's actual raw payload, completely unprocessed.

### What happens (once you also write and run a client — Section 3)

The server blocks at `accept()` until a client connects, then reads and
prints whatever raw bytes that client sends — nothing about "HTTP" or
"JSON" exists anywhere in this code; it's the most minimal possible
two-way byte exchange.

## 3. Why — the client side, and the full round trip

**`client.py`**
```python
import socket

clientSocket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
clientSocket.connect(("127.0.0.1", 9000))

messageToSend = b"Hello from the client, raw bytes only"
clientSocket.send(messageToSend)

clientSocket.close()
```

**`clientSocket.connect(("127.0.0.1", 9000))`**
- The direct counterpart to the server's `bind`+`listen`+`accept`
  sequence — `connect` actively initiates a connection to a specific
  (address, port), rather than passively waiting for one. **This single
  call is doing real work under the hood**: establishing a TCP connection
  involves an actual multi-step handshake between the two machines'
  operating systems (conventionally called the "three-way handshake" —
  SYN, SYN-ACK, ACK — a real, named sequence of control messages, beyond
  this lesson's scope to trace packet-by-packet, but worth knowing by name
  as something genuinely happening here, not a fiction).

**`messageToSend = b"Hello from the client, raw bytes only"`**
- The `b` prefix makes this a **bytes literal**, not a regular Python
  string. **Sockets send and receive bytes, never strings directly** — a
  regular string (`"Hello"`) must be **encoded** to bytes first (e.g.
  `"Hello".encode("utf-8")`) before `.send()` will accept it; writing the
  literal directly as `b"..."` here sidesteps that conversion for this
  simple example, but real code sending dynamic text does need the
  explicit `.encode()` step — worth knowing this requirement exists, since
  skipping it (trying to `.send()` a plain string) raises a real, common
  `TypeError`.

**Running both**: start `server.py` first (it blocks at `accept()`,
waiting), then run `client.py` in a second terminal. **Watch the exact
order things happen**: the server's "Listening..." print appears
immediately; nothing else happens until you run the client; the moment
the client connects and sends, the server's `accept()` unblocks and its
"Connected by..."/"Received..." prints appear.

### Mental model

```
SERVER                              CLIENT
bind(address, port)
listen()
accept()  ← blocks here...
                                     connect(address, port)  →
   ...unblocks, connection made  ←——————————————————————————
recv()  ← blocks here...
                                     send(messageBytes)  →
   ...unblocks, bytes received  ←——————————————————————————
```

**This exact handshake — bind/listen/accept on one side, connect on the
other — is what every HTTP request, every `fetch` call, every FastAPI
request in this entire curriculum has been doing underneath**, just with
an enormous amount of structure (HTTP's format, headers, methods, status
codes) layered on top of this same raw byte-passing foundation.

## 4. Change one thing

```diff
-messageToSend = b"Hello from the client, raw bytes only"
+messageToSend = "Hello from the client, raw bytes only".encode("utf-8")
```

**What changed:** an actual Python string, explicitly encoded, instead of
a bytes literal typed directly.
**What did not change:** the actual bytes sent over the socket — both
produce the identical byte sequence.
**Predict, then verify**: the server's `print("Received:", receivedBytes)`
output is **identical** either way. This is worth confirming directly,
because it demonstrates something important: `b"Hello"` and
`"Hello".encode("utf-8")` are two different ways of arriving at the exact
same underlying bytes — the network layer has no concept of "this came
from a string literal" versus "this came from an encoded variable"; bytes
are bytes once they're on the wire.

## 5. Put it in the project — an echo server (bytes back, not just received)

```python
import socket

serverSocket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
serverSocket.bind(("127.0.0.1", 9000))
serverSocket.listen(1)
print("Echo server listening on port 9000...")

while True:
    connectionSocket, clientAddress = serverSocket.accept()
    print("Connected by", clientAddress)

    receivedBytes = connectionSocket.recv(1024)
    print("Received:", receivedBytes)

    connectionSocket.send(receivedBytes)
    connectionSocket.close()
```

**`while True: ... connectionSocket, clientAddress = serverSocket.accept() ...`**
- Wrapping `accept()` in an infinite loop is what lets this server handle
  **multiple, sequential** client connections over its lifetime, rather
  than the Section 2 version, which accepted exactly one connection and
  then the whole program ended. Each loop iteration: wait for a new
  client, handle it fully (receive, echo back, close), then loop back to
  waiting for the *next* one.

**`connectionSocket.send(receivedBytes)`**
- Sends the **exact same bytes** back to whichever client just connected —
  the entire "echo" behavior, in one line.

**Note this server handles clients strictly one at a time** — while
processing one client's message, a second client attempting to connect
would have to wait (queued by the earlier `listen(1)` backlog) until the
current client is fully handled and the loop comes back around to
`accept()` again. Handling many clients truly *simultaneously* requires
either threads, processes, or asynchronous I/O (the actual mechanism
`uvicorn`/FastAPI use internally to serve many requests concurrently) —
genuinely beyond this lesson's scope, but worth knowing this simple
version's real, honest limitation.

## 6. Trap

Predict, then test: run the echo server, connect with the client, send a
message — then, **without restarting the server**, try running the client
a second time.

Depending on timing, you may find the second connection works fine (the
server looped back to `accept()` correctly) — **or**, if you interrupt the
server mid-connection and restart it quickly, you may hit
`OSError: [Errno 48] Address already in use` (or a similar message)
when the *new* server process tries to `bind()` to port 9000 again. **This
is a real, common networking trap**: closing a program doesn't always
release its bound port *immediately* — the operating system can hold onto
it briefly (a `TIME_WAIT` state, a real, named TCP concept, beyond full
derivation here) — meaning "just restart the server" doesn't always work
instantly, and needing to wait a few seconds, pick a different port, or
add `serverSocket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)`
(a real, standard fix, worth knowing exists) are all genuine, common
responses to this exact error in real backend development.

## 7. Exercise

- **Predict:** If two separate client programs both tried to `connect()`
  to the server at the *exact* same instant, and `listen(1)`'s backlog is
  only `1`, what do you expect to happen to the second one — an immediate
  error, or does it wait?
- **Modify:** Change the echo server to uppercase the received bytes
  before sending them back (`receivedBytes.upper()` works directly on
  bytes, no decode/encode needed for this specific operation) — confirm
  the client receives the uppercased version.
- **Break:** Try sending a message larger than `1024` bytes (the `recv`
  buffer size) from the client. Does the server receive the whole message
  in one `recv()` call, or does something else happen? (Real code
  generally needs to call `recv()` in a loop until a full expected message
  arrives — a real, common source of subtle bugs in hand-rolled network
  code, worth confirming for yourself rather than assuming.)
- **Trace:** Using Python's `socket` module documentation (or experimenting
  directly), find and explain what `socket.SOCK_DGRAM` (UDP) is used for
  instead of `SOCK_STREAM` (TCP) — what real-world use case would prefer
  UDP's "unordered, no guaranteed delivery" tradeoff over TCP's
  reliability?

## What to remember
- A socket connection needs an address **and** a port on both ends —
  `bind`/`listen`/`accept` on the server side, `connect` on the client
  side, is the literal foundation every higher-level network library in
  this curriculum sits on.
- Sockets send and receive raw `bytes`, never strings directly — encoding/
  decoding is a separate, explicit step your code (or a library on your
  behalf) always has to do.
- `accept()` returns a **new** socket per connected client, distinct from
  the original listening socket — a real, structural fact about how
  servers handle multiple clients.
- A simple `while True: accept()` loop handles clients one at a time
  sequentially — true concurrent handling needs threads/async, which is
  exactly what `uvicorn` is doing for you every time you've run a FastAPI
  server in this curriculum.

## Next lesson
Lesson 2 sends **actual HTTP** over a raw socket like this one — no
`requests`, no `fetch` — parsing a real HTTP request's method/path/headers
by hand, revealing exactly what `fetch` (Lesson 6) and FastAPI (Lesson 18)
have been doing for you this entire time.
