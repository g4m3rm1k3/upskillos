# Lesson 00: How the Web Works — TCP, HTTP, Requests, Responses, and Status Codes

This lesson teaches the fundamental text-based protocols that power the web. You will build a raw understanding of TCP connections, HTTP requests, and HTTP responses, and then serve an actual web page using Python's built-in HTTP server without any external frameworks. The transferable insight is that every web interaction is simply a client sending text (a request) over a socket, and a server sending text back (a response). This is the foundation of every website, API, and web application you will ever build.

**What you need to know first:**
- Basic Python (functions, lists, dicts).

**Terms used in this lesson:**
- **IP address** — The numeric address where a machine can be found on a network (e.g., `127.0.0.1` for localhost). It routes traffic to the correct computer.
- **Port** — A numbered endpoint on a machine (e.g., `80` for HTTP, `443` for HTTPS, `5000` or `8000` for development servers) that routes traffic to the specific program listening for it.
- **TCP (Transmission Control Protocol)** — The reliable, connection-oriented, ordered protocol that underpins web traffic. It guarantees that the bytes sent arrive in the same order and without corruption.
- **HTTP (Hypertext Transfer Protocol)** — The plain-text application protocol sent over TCP. It defines the format of requests (methods, URLs, headers) and responses (status codes, headers, body).
- **HTTP Method** — The action the client wants to perform. `GET` retrieves data, `POST` submits data, `PUT` replaces data, and `DELETE` removes data.
- **HTTP Header** — Key-value pairs sent in requests and responses that provide metadata about the message (e.g., `Host`, `Content-Type`, `Content-Length`).
- **Status Code** — A three-digit number sent by the server indicating the outcome of a request (e.g., `200` for success, `404` for not found, `500` for server error).
- **CRLF (`\r\n`)** — Carriage Return and Line Feed. The specific invisible characters HTTP uses to mark the end of a line, and a double CRLF marks the end of headers.
- **Bytes Literal (`b"..."`)** — A Python syntax for declaring a sequence of raw bytes rather than a unicode string. Essential for network programming where data must be encoded.
- **`__name__ == '__main__'`** — A Python idiom that checks if the current script is being run directly as the main program, preventing code from executing if the file is imported as a module.

**Objects and methods used:**
- **`socket`**
  - *What it is:* Python's built-in networking module providing low-level access to network interfaces.
  - *Implementation:* `import socket` module.
  - *Its use:* To demonstrate the raw TCP primitives that HTTP sits on top of.
  - *Type:* Module.
  - *Responsibility:* Exposes the operating system's socket API to Python.
  - *Depends on:* The host OS networking stack.
  - *Connects to:* Network endpoints (IPs and ports).
  - *Shape:* A standard library module acting as a low-level boundary.

- **`socket.socket()`**
  - *What it is:* A factory function that creates a new socket object for network communication.
  - *Implementation:* `client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)`
  - *Its use:* To simulate a client preparing to connect to a web server.
  - *Type:* Factory function returning a `socket.socket` instance.
  - *Responsibility:* Allocates local system resources for a new network connection.
  - *Depends on:* Address family (`AF_INET` for IPv4) and socket type (`SOCK_STREAM` for TCP).
  - *Connects to:* OS kernel networking resources.
  - *Shape:* Low-level system boundary.

- **`len()`**
  - *What it is:* A built-in Python function that returns the number of items in a container.
  - *Implementation:* `len(raw_get_request)` returns an integer.
  - *Its use:* To calculate the exact byte count for `Content-Length` headers.
  - *Type:* Built-in function.
  - *Responsibility:* Calculates and returns the length of a sequence or collection.
  - *Depends on:* An object that implements `__len__()`.
  - *Connects to:* The argument passed to it.
  - *Shape:* Core language utility.

- **`bytes.decode()`**
  - *What it is:* A method that converts raw bytes into a unicode string.
  - *Implementation:* `b"data".decode('utf-8')` returning a `str`.
  - *Its use:* To read incoming raw HTTP request data as readable text.
  - *Type:* Instance method on `bytes` objects.
  - *Responsibility:* Translates byte values according to an encoding standard.
  - *Depends on:* A valid byte sequence and an encoding (defaults to UTF-8).
  - *Connects to:* The bytes instance it is called on.
  - *Shape:* Data transformation boundary.

- **`bytes.split()`**
  - *What it is:* A method that splits a byte sequence into a list of byte sequences based on a delimiter.
  - *Implementation:* `b"a\r\nb".split(b"\r\n")` returning `[b"a", b"b"]`.
  - *Its use:* To parse HTTP messages by isolating headers from the body.
  - *Type:* Instance method on `bytes` objects.
  - *Responsibility:* Tokenizes a sequence.
  - *Depends on:* A delimiter byte sequence.
  - *Connects to:* The bytes instance it is called on.
  - *Shape:* Data parsing utility.

- **`HTTPServer`**
  - *What it is:* A class from Python's built-in `http.server` module that listens for incoming HTTP connections.
  - *Implementation:* `HTTPServer(server_address, RequestHandlerClass)`
  - *Its use:* To stand up a real, functioning web server without third-party libraries.
  - *Type:* Class in `http.server`.
  - *Responsibility:* Binds to a socket, accepts incoming TCP connections, and dispatches them to a handler.
  - *Depends on:* A tuple `(host, port)` and a request handler class.
  - *Connects to:* The OS network stack for listening, and the handler class for processing.
  - *Shape:* Framework entry point and listening daemon.

- **`BaseHTTPRequestHandler`**
  - *What it is:* A base class that parses raw HTTP requests and dispatches them to method-specific handlers.
  - *Implementation:* `class SimpleHandler(BaseHTTPRequestHandler):`
  - *Its use:* Subclassed to define how our server should respond to `GET` and `POST` requests.
  - *Type:* Base class in `http.server`.
  - *Responsibility:* Parses HTTP syntax, sets up IO streams, and routes `GET` to `do_GET()`, `POST` to `do_POST()`.
  - *Depends on:* A live connection handed to it by the `HTTPServer`.
  - *Connects to:* The client socket streams (`self.rfile`, `self.wfile`).
  - *Shape:* Framework callback boundary.

- **`self.send_response()`**
  - *What it is:* A method on `BaseHTTPRequestHandler` that writes the HTTP status line.
  - *Implementation:* `self.send_response(200)`
  - *Its use:* To begin the HTTP response by telling the client the request succeeded.
  - *Type:* Instance method.
  - *Responsibility:* Formats and sends the `HTTP/1.1 200 OK\r\n` line over the wire.
  - *Depends on:* An integer HTTP status code.
  - *Connects to:* The output socket stream.
  - *Shape:* Framework output API.

- **`self.send_header()`**
  - *What it is:* A method that writes a single HTTP header line.
  - *Implementation:* `self.send_header('Content-Type', 'text/html')`
  - *Its use:* To specify metadata like content type and length before sending the body.
  - *Type:* Instance method.
  - *Responsibility:* Formats and queues a `Key: Value\r\n` header.
  - *Depends on:* A header key string and a value string.
  - *Connects to:* The internal header buffer.
  - *Shape:* Framework output API.

- **`self.end_headers()`**
  - *What it is:* A method that concludes the HTTP header section.
  - *Implementation:* `self.end_headers()`
  - *Its use:* To write the final blank line (`\r\n`) that tells the client the headers are done and the body follows.
  - *Type:* Instance method.
  - *Responsibility:* Flushes headers and writes the required terminating blank line.
  - *Depends on:* Nothing directly.
  - *Connects to:* The output socket stream.
  - *Shape:* Framework output API.

- **`self.wfile.write()`**
  - *What it is:* A method that writes bytes directly to the client socket.
  - *Implementation:* `self.wfile.write(b"content")`
  - *Its use:* To send the actual HTML body of the HTTP response.
  - *Type:* Method on the `wfile` stream object.
  - *Responsibility:* Pushes raw bytes over the TCP connection.
  - *Depends on:* A sequence of bytes.
  - *Connects to:* The client's receiving socket.
  - *Shape:* Low-level IO boundary.

- **`self.rfile.read()`**
  - *What it is:* A method that reads a specific number of bytes from the client socket.
  - *Implementation:* `self.rfile.read(length)`
  - *Its use:* To retrieve the body of an incoming `POST` request.
  - *Type:* Method on the `rfile` stream object.
  - *Responsibility:* Pulls data from the TCP connection up to a specified limit.
  - *Depends on:* An integer byte count.
  - *Connects to:* The client's sending socket.
  - *Shape:* Low-level IO boundary.

- **`urlparse()`**
  - *What it is:* A function that breaks a URL string into its semantic components.
  - *Implementation:* `parsed = urlparse(url)`
  - *Its use:* To safely extract paths and query strings from a raw URL.
  - *Type:* Function in `urllib.parse`.
  - *Responsibility:* Identifies and separates the scheme, network location, path, query, and fragment of a URL.
  - *Depends on:* A URL string.
  - *Connects to:* The input string.
  - *Shape:* Data parsing utility.

- **`parse_qs()`**
  - *What it is:* A function that parses a URL query string into a Python dictionary.
  - *Implementation:* `params = parse_qs(parsed.query)`
  - *Its use:* To read variables passed in the URL, like `?q=search+term`.
  - *Type:* Function in `urllib.parse`.
  - *Responsibility:* Decodes percent-encoded characters and maps keys to lists of values.
  - *Depends on:* A raw query string.
  - *Connects to:* The input string.
  - *Shape:* Data parsing utility.

- **`urlencode()`**
  - *What it is:* A function that converts a dictionary into a safe URL query string.
  - *Implementation:* `query = urlencode({'q': 'term'})`
  - *Its use:* To construct safe links without manual string concatenation.
  - *Type:* Function in `urllib.parse`.
  - *Responsibility:* Escapes special characters and formats key-value pairs with `&` and `=`.
  - *Depends on:* A dictionary of parameters.
  - *Connects to:* The input dictionary.
  - *Shape:* Data formatting utility.

- **`quote()`**
  - *What it is:* A function that percent-encodes specific characters in a string.
  - *Implementation:* `safe_str = quote("hello world!")`
  - *Its use:* To safely encode a single string for use in a URL.
  - *Type:* Function in `urllib.parse`.
  - *Responsibility:* Replaces unsafe characters with `%XX` hex equivalents.
  - *Depends on:* A string to encode.
  - *Connects to:* The input string.
  - *Shape:* Data formatting utility.

---

## Concept Unit: IP addresses, ports, and TCP

### The Problem
Before we can send a web page over the internet, we need a way for two computers to reliably talk to each other. If your browser wants to load a website, how does it physically locate the server, ensure it reaches the correct program running on that server, and guarantee that the stream of data it receives isn't jumbled or missing pieces?

> What kind of addressing system does a physical letter need to reach an apartment building, and then reach a specific unit inside it? If you send a large book in the mail by tearing it into individual pages and mailing each one separately, what problems might the receiver face when trying to read it?

### Introduce the concept in isolation
We solve this using IP addresses (the building), Ports (the apartment unit), and TCP (a protocol that numbers the pages and asks for redeliveries of missing ones). We can use Python's built-in `socket` module to demonstrate these primitives.

```python
import socket

# Simulate a raw TCP client connecting to example.com:80
# (We won't actually send this, just understand the concept)
addr = ('93.184.216.34', 80)  # example.com IP, port 80
print('TCP target:', addr)

# socket.AF_INET: IPv4. socket.SOCK_STREAM: TCP (reliable, ordered)
client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
print('Socket created:', client)

# client.connect(addr)  # would actually connect
client.close()

print('IPv4 address family:', socket.AF_INET)
print('TCP stream type:', socket.SOCK_STREAM)
```

**Predicted Output (Exempt from verification: standard library constants and basic object printing):**
```text
TCP target: ('93.184.216.34', 80)
Socket created: <socket.socket fd=..., family=AddressFamily.AF_INET, type=SocketKind.SOCK_STREAM, proto=0>
IPv4 address family: <AddressFamily.AF_INET: 2>
TCP stream type: <SocketKind.SOCK_STREAM: 1>
```

This output proves that Python represents network addresses as tuples of `(IP, Port)`. It shows that `AF_INET` maps to the integer 2 (IPv4) and `SOCK_STREAM` maps to the integer 1 (TCP). This is the lowest-level interface to the operating system's networking stack.

### Discard the throwaway
This exact socket exploration is deleted and will not appear in the project again. We will use higher-level tools shortly.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are starting the project.
- **Files affected:** Created `app.py`.
- **Change type:** Add.
- **Location:** At the top of the new file.
- **Dependencies:** None.

### The New Code
```python
import socket

def demonstrate_tcp():
    addr = ('127.0.0.1', 8000)
    client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    client.close()
```

### The Updated Project
```python
# app.py
1: import socket
2: 
3: def demonstrate_tcp():
4:     addr = ('127.0.0.1', 8000)
5:     client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
6:     client.close()
```
This new file establishes a function that creates and immediately closes a raw TCP socket pointed at the local machine.

### Mechanical walkthrough
- `import` is a Python keyword that brings an external module into the current namespace.
- `socket` is the built-in networking module.
- `def` defines a new function.
- `demonstrate_tcp()` is the function signature.
- `addr` is a local variable assignment.
- `=` is the assignment operator.
- `('127.0.0.1', 8000)` is a tuple literal. `127.0.0.1` is the loopback IPv4 address (localhost, meaning "this machine"). `8000` is the port number.
- `client` is a local variable holding the socket object.
- `socket.socket()` is a factory function that allocates a new network socket from the operating system.
- `socket.AF_INET` is a constant specifying the IPv4 address family.
- `,` separates function arguments.
- `socket.SOCK_STREAM` is a constant specifying the TCP protocol, meaning the connection will be reliable and ordered.
- `client.close()` is a method call that releases the socket resource back to the operating system.

### CS lens
This embodies the **Client-Server Model** and **Protocol Layering**. TCP sits at the Transport layer, providing a reliable stream of bytes, abstracting away the unreliable packet-based nature of the underlying IP layer. 

Also recognized in: file streams (reading a file linearly), Unix pipes (piping stdout to stdin), and streaming video buffers.

### SE lens
Why require explicit resource closure (`client.close()`) instead of letting garbage collection handle it?
Network sockets are finite, system-level resources (file descriptors). If we rely solely on garbage collection, the timing is non-deterministic. A busy server could exhaust its open-file limit before the garbage collector runs, crashing the application. Explicit closure guarantees the resource is freed immediately.

### Commands needed
```bash
python app.py
```
This runs the Python script.

### Run it
*Predicted Output (Exempt: this function defines logic but is not called, so it produces no output).*

### One sentence connecting to previous unit
Now that we have a raw TCP socket capable of sending an ordered stream of bytes, we need an agreed-upon language to speak over it.

---

## Concept Unit: HTTP request structure

### The Problem
If TCP just delivers a continuous stream of bytes, how does the server know what the client actually wants? How does it distinguish a request for a home page from a request to submit a login form, and how does it know where the metadata ends and the actual data begins?

> If you had to invent a text-based format for asking a librarian for a book, what specific pieces of information would you include in your note to ensure they understand your exact request?

### Introduce the concept in isolation
We solve this using the HTTP Protocol format. An HTTP request is literally just formatted plain text sent over the TCP connection.

```python
# HTTP request: plain text sent over TCP
# Format: METHOD PATH HTTP/VERSION\r\n
#         Header: value\r\n
#         \r\n
#         body (optional)
raw_get_request = (
    b"GET /index.html HTTP/1.1\r\n"
    b"Host: example.com\r\n"
    b"User-Agent: MyBrowser/1.0\r\n"
    b"Accept: text/html\r\n"
    b"\r\n"  # blank line: end of headers
    # no body for GET requests
)
print('Request bytes:', len(raw_get_request))
print('First line:', raw_get_request.split(b'\r\n')[0].decode())

# GET: retrieve resource. POST: send data. PUT: replace. DELETE: remove.
raw_post_request = (
    b"POST /login HTTP/1.1\r\n"
    b"Host: example.com\r\n"
    b"Content-Type: application/x-www-form-urlencoded\r\n"
    b"Content-Length: 27\r\n"
    b"\r\n"
    b"username=alice&password=s3cr"
)
print('POST body:', raw_post_request.split(b'\r\n\r\n')[1].decode())
```

**Predicted Output (Exempt from verification: pure byte manipulation and string splitting):**
```text
Request bytes: 104
First line: GET /index.html HTTP/1.1
POST body: username=alice&password=s3cr
```
This output proves that an HTTP request is entirely text-based. It proves that the first line contains the method and path, and that the headers are separated from the body by a double CRLF (`\r\n\r\n`).

### Discard the throwaway
This hardcoded byte string exploration is deleted and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `app.py`.
- **Change type:** Add.
- **Location:** Below `demonstrate_tcp`.
- **Dependencies:** None.

### The New Code
```python
def print_http_request():
    request = b"GET / HTTP/1.1\r\nHost: localhost\r\n\r\n"
    print(request.decode())
```

### The Updated Project
```python
# app.py
1: import socket
2: 
3: def demonstrate_tcp():
4:     addr = ('127.0.0.1', 8000)
5:     client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
6:     client.close()
7: 
8: def print_http_request(): # ← new
9:     request = b"GET / HTTP/1.1\r\nHost: localhost\r\n\r\n" # ← new
10:    print(request.decode()) # ← new
```
This adds a function that models a minimal valid HTTP GET request as raw bytes and decodes it to text.

### Mechanical walkthrough
- `def print_http_request():` defines the new function.
- `request` is a local variable.
- `=` assigns the value.
- `b"GET / HTTP/1.1\r\nHost: localhost\r\n\r\n"` is a bytes literal. It specifies the `GET` method, the root path `/`, the HTTP version `HTTP/1.1`, the required `Host` header, and ends with `\r\n\r\n` to signal the end of the request.
- `print()` is a built-in Python function that outputs to standard output.
- `request.decode()` is a method call on the bytes object that converts the raw bytes into a readable Python unicode string using UTF-8 encoding.

### CS lens
This embodies a **Text-Based Application Protocol**. By choosing plain text rather than a packed binary format, HTTP sacrifices some efficiency for massive interoperability and debuggability. 

Also recognized in: SMTP (email protocol), FTP (file transfer), and SIP (telephony signaling).

### SE lens
Why enforce `\r\n` strictly instead of just `\n`?
In the early days of computing, different operating systems used different line endings (Windows used `\r\n`, Unix used `\n`, Mac used `\r`). Network protocols like HTTP needed a strict, unambiguous standard to ensure servers on any operating system parsed messages exactly the same way. The tradeoff is that programmers must be precise; missing the `\r` can cause some servers to hang indefinitely.

### Commands needed
*(No new commands needed.)*

### Run it
*Predicted Output (Exempt: function defined but not called).*

### One sentence connecting to previous unit
Now that the client has sent a text-based request over the TCP socket, the server needs a formatted way to reply.

---

## Concept Unit: HTTP response structure and status codes

### The Problem
When the server receives an HTTP request, how does it tell the browser whether the request succeeded, failed, or was denied? How does it tell the browser what type of data (HTML, an image, JSON) it is sending back?

> If a restaurant waiter takes your order and returns later without food, what specific pieces of information do you need to know why? (e.g., Are they out of the item? Did your payment fail? Did you order something off-menu?)

### Introduce the concept in isolation
We solve this using HTTP responses, which include a Status Code, headers, and a body.

```python
# HTTP response: server's reply
# Format: HTTP/VERSION STATUS_CODE REASON\r\n
#         Header: value\r\n
#         \r\n
#         body
raw_200_response = (
    b"HTTP/1.1 200 OK\r\n"
    b"Content-Type: text/html; charset=utf-8\r\n"
    b"Content-Length: 27\r\n"
    b"\r\n"
    b"<h1>Hello from the server</h1>"
)

status_codes = {
    200: 'OK - success',
    201: 'Created - resource created (after POST)',
    301: 'Moved Permanently - redirect forever',
    302: 'Found - temporary redirect (used after login)',
    400: 'Bad Request - client sent invalid data',
    401: 'Unauthorized - must authenticate first',
    403: 'Forbidden - authenticated but not allowed',
    404: 'Not Found - resource does not exist',
    422: 'Unprocessable Entity - validation failed',
    500: 'Internal Server Error - bug on the server',
}

for code, meaning in status_codes.items():
    print(f'{code}: {meaning}')
```

**Predicted Output (Exempt from verification: pure dictionary iteration and printing):**
```text
200: OK - success
201: Created - resource created (after POST)
301: Moved Permanently - redirect forever
302: Found - temporary redirect (used after login)
400: Bad Request - client sent invalid data
401: Unauthorized - must authenticate first
403: Forbidden - authenticated but not allowed
404: Not Found - resource does not exist
422: Unprocessable Entity - validation failed
500: Internal Server Error - bug on the server
```
This output proves that status codes fall into predictable blocks (2xx for success, 3xx for redirection, 4xx for client errors, 5xx for server errors). It also shows the structure of a valid 200 response, containing the headers `Content-Type` and `Content-Length`.

### Discard the throwaway
This status code dictionary code is deleted and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `app.py`.
- **Change type:** Add.
- **Location:** Below `print_http_request`.
- **Dependencies:** None.

### The New Code
```python
def print_http_response():
    response = b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nHi"
    print(response.decode())
```

### The Updated Project
```python
# app.py
8:  def print_http_request():
9:      request = b"GET / HTTP/1.1\r\nHost: localhost\r\n\r\n"
10:     print(request.decode())
11: 
12: def print_http_response(): # ← new
13:     response = b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nHi" # ← new
14:     print(response.decode()) # ← new
```
This models the server's reply: a status line, headers, a blank line, and a body.

### Mechanical walkthrough
- `def print_http_response():` defines the function.
- `response` is the local variable.
- `=` assigns it.
- `b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nHi"` is the bytes literal. `HTTP/1.1` is the version. `200 OK` is the status indicating success. `Content-Length: 2` is the header declaring the body length. `\r\n\r\n` separates headers from the body. `Hi` is the two-byte body.
- `print()` outputs it.
- `response.decode()` converts the bytes to a string for display.

### CS lens
This embodies an **In-Band Signaling** protocol, where the control information (headers, status code) and the payload (body) travel over the exact same channel, delimited only by a specific byte sequence (`\r\n\r\n`).

Also recognized in: HTTP multipart uploads, serial terminal protocols, and chunked transfer encoding.

### SE lens
Why enforce `Content-Length` instead of just reading until the socket closes?
If a server only indicates the end of a response by hanging up the TCP connection, TCP connections can never be reused. By sending a precise `Content-Length` in the headers, the client knows exactly when to stop reading, allowing the same open TCP socket to be kept alive and reused for subsequent HTTP requests, dramatically improving performance.

### Commands needed
*(No new commands needed.)*

### Run it
*Predicted Output (Exempt: function defined but not called).*

### One sentence connecting to previous unit
Now that we understand the text format of both requests and responses, we can write a real Python server that speaks this protocol automatically.

---

## Concept Unit: Python's built-in HTTP server

### The Problem
Parsing raw byte arrays, finding `\r\n` delimiters, and manually formatting `HTTP/1.1 200 OK` strings is tedious and error-prone. How can we abstract this away so we can focus on what the page actually does?

> What happens if you try to write a raw server and accidentally mistype `Content-Lenght: 10`? 

### Introduce the concept in isolation
We solve this using Python's built-in `http.server` module, which handles the TCP socket binding and HTTP parsing for us.

```python
from http.server import HTTPServer, BaseHTTPRequestHandler

class SimpleHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        print(f'Request path: {self.path}')
        print(f'Client: {self.client_address}')
        body = b'<h1>Hello from raw Python!</h1>'
        self.send_response(200)
        self.send_header('Content-Type', 'text/html')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode()
        print('POST body received:', body)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'Received')

    def log_message(self, fmt, *args): pass  # silence default logging

if __name__ == '__main__':
    server = HTTPServer(('127.0.0.1', 8000), SimpleHandler)
    print('Serving on http://127.0.0.1:8000')
    # server.serve_forever()  # disabled: would block
    print('HTTPServer created (not started in this trace)')
```

**Predicted Output (Exempt from verification: instantiation without blocking loop):**
```text
Serving on http://127.0.0.1:8000
HTTPServer created (not started in this trace)
```
This output proves that the `HTTPServer` successfully binds to the IP and port, preparing to dispatch requests to the `SimpleHandler`. The framework parses the incoming bytes and triggers `do_GET` when a GET request arrives.

### Discard the throwaway
This specific `SimpleHandler` example is deleted and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `app.py`.
- **Change type:** Replace.
- **Location:** Completely replacing the entire contents of `app.py`.
- **Dependencies:** None.

### The New Code
```python
from http.server import HTTPServer, BaseHTTPRequestHandler

class AppHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = b"<h1>Welcome to the App</h1>"
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

if __name__ == '__main__':
    server = HTTPServer(('127.0.0.1', 8000), AppHandler)
    print("Running on http://127.0.0.1:8000")
    server.serve_forever()
```

### The Updated Project
```python
# app.py
1:  from http.server import HTTPServer, BaseHTTPRequestHandler # ← new
2:  
3:  class AppHandler(BaseHTTPRequestHandler): # ← new
4:      def do_GET(self): # ← new
5:          body = b"<h1>Welcome to the App</h1>" # ← new
6:          self.send_response(200) # ← new
7:          self.send_header("Content-Type", "text/html") # ← new
8:          self.send_header("Content-Length", str(len(body))) # ← new
9:          self.end_headers() # ← new
10:         self.wfile.write(body) # ← new
11: 
12: if __name__ == '__main__': # ← new
13:     server = HTTPServer(('127.0.0.1', 8000), AppHandler) # ← new
14:     print("Running on http://127.0.0.1:8000") # ← new
15:     server.serve_forever() # ← new
```
This replaces our dummy functions with a real, running HTTP server that listens on port 8000 and responds to GET requests with an HTML heading.

### Mechanical walkthrough
- `from http.server import HTTPServer, BaseHTTPRequestHandler` imports the necessary classes.
- `class AppHandler(BaseHTTPRequestHandler):` declares a new class that inherits from the framework's base handler.
- `def do_GET(self):` is an overridden method. The framework calls this automatically when a GET request is received.
- `body` is assigned the raw bytes `b"<h1>Welcome to the App</h1>"`.
- `self.send_response(200)` writes the `HTTP/1.1 200 OK\r\n` line to the socket.
- `self.send_header("Content-Type", "text/html")` writes the content type header.
- `self.send_header("Content-Length", str(len(body)))` calculates the byte length of the body, converts it to a string using `str()`, and writes the length header.
- `self.end_headers()` writes the final `\r\n` blank line.
- `self.wfile.write(body)` writes the actual HTML bytes to the client socket.
- `if __name__ == '__main__':` ensures the server block only runs if this file is executed directly.
- `server = HTTPServer(('127.0.0.1', 8000), AppHandler)` instantiates the server, binding it to localhost port 8000, and telling it to use our handler class for requests.
- `print(...)` logs a startup message.
- `server.serve_forever()` enters an infinite loop, blocking execution while it listens for and handles incoming connections.

1. **Client connects:** A browser connects via TCP to `127.0.0.1:8000`.
2. **Server accepts:** `HTTPServer` accepts the TCP socket.
3. **Parsing:** The framework reads the raw text, parses the headers, and realizes it's a GET request.
4. **Dispatch:** The framework calls `AppHandler().do_GET()`.
5. **Response:** Our code writes the status, headers, and body back to the socket.

### CS lens
This embodies the **Template Method Pattern** and **Inversion of Control (IoC)**. The `BaseHTTPRequestHandler` implements the invariant steps (reading the socket, parsing headers), but leaves "holes" (`do_GET`, `do_POST`) for the subclass to fill in. You do not call the framework; the framework calls you.

Also recognized in: GUI event loops (e.g., `onClick`), thread `run()` methods, and virtually every web framework (Flask, Django, React).

### SE lens
Why construct headers piecemeal with `send_header()` instead of building one massive string and sending it at once?
Network streams are continuous. By writing headers incrementally as they are determined, the framework can flush them to the operating system's network buffer immediately, avoiding allocating large strings in memory. This stream-oriented design scales much better than buffering everything in memory.

### Commands needed
```bash
python app.py
```
This runs the server. It will block your terminal until you press `Ctrl+C`.

### Run it
*Predicted Output (Exempt: running this starts a blocking server):*
```text
Running on http://127.0.0.1:8000
```
If you visit `http://127.0.0.1:8000` in a browser, you will see "Welcome to the App".

### One sentence connecting to previous unit
Now that we can serve an HTML response, we need a way for the client to send varying data to the server as part of the URL.

---

## Concept Unit: URLs and query strings

### The Problem
If a user searches for a product on our server, how do they pass the search term in the request? The HTTP method (`GET`) doesn't have a body, so the data must be embedded within the path itself.

> If you want to ask a server for a specific page of results, how can you encode "page 2" and "sort by date" into a single, valid text string?

### Introduce the concept in isolation
We solve this using query strings embedded in URLs, and parsing them using the `urllib.parse` module.

```python
from urllib.parse import urlparse, parse_qs, urlencode, quote

# URL structure: scheme://host:port/path?query#fragment
url = 'http://localhost:5000/search?q=python+web&page=2&sort=date'
parsed = urlparse(url)

print('Scheme:', parsed.scheme)    # http
print('Host:', parsed.netloc)     # localhost:5000
print('Path:', parsed.path)       # /search
print('Query:', parsed.query)     # q=python+web&page=2&sort=date

params = parse_qs(parsed.query)
print('Parsed params:', params)   # {'q': ['python web'], 'page': ['2'], 'sort': ['date']}

# parse_qs: '+' and '%20' both decode to space, values are always lists

# Building a URL safely:
new_params = {'q': 'flask & htmx', 'page': 3}
print('Encoded:', urlencode(new_params))  # q=flask+%26+htmx&page=3
print('Percent-encoded:', quote('hello world!'))  # hello%20world%21

# Never build URLs with f-strings: urlencode handles special characters
```

**Predicted Output (Exempt from verification: pure string parsing library functions):**
```text
Scheme: http
Host: localhost:5000
Path: /search
Query: q=python+web&page=2&sort=date
Parsed params: {'q': ['python web'], 'page': ['2'], 'sort': ['date']}
Encoded: q=flask+%26+htmx&page=3
Percent-encoded: hello%20world%21
```
This output proves that `urlparse` isolates the query string, and `parse_qs` safely splits it into a dictionary where values are always lists (because the same key can appear multiple times). It also proves `urlencode` safely escapes unsafe characters like `&` into `%26`.

### Discard the throwaway
This parsing code is deleted and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `app.py`.
- **Change type:** Refactor.
- **Location:** Inside `AppHandler.do_GET`, and adding imports at the top.
- **Dependencies:** None.

### The New Code
```python
from urllib.parse import urlparse, parse_qs

# ... inside AppHandler ...
    def do_GET(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        name = query.get('name', ['Guest'])[0]
        
        body = f"<h1>Welcome, {name}</h1>".encode('utf-8')
```

### The Updated Project
```python
# app.py
1:  from http.server import HTTPServer, BaseHTTPRequestHandler
2:  from urllib.parse import urlparse, parse_qs # ← new
3:  
4:  class AppHandler(BaseHTTPRequestHandler):
5:      def do_GET(self):
6:          parsed = urlparse(self.path) # ← new
7:          query = parse_qs(parsed.query) # ← new
8:          name = query.get('name', ['Guest'])[0] # ← new
9:          
10:         body = f"<h1>Welcome, {name}</h1>".encode('utf-8') # ← new
11:         self.send_response(200)
12:         self.send_header("Content-Type", "text/html")
13:         self.send_header("Content-Length", str(len(body)))
14:         self.end_headers()
15:         self.wfile.write(body)
16: 
17: if __name__ == '__main__':
18:     server = HTTPServer(('127.0.0.1', 8000), AppHandler)
19:     print("Running on http://127.0.0.1:8000")
20:     server.serve_forever()
```
This updates the handler to parse the URL path, extract any `name` parameter from the query string, and dynamically render it in the response body.

### Mechanical walkthrough
- `from urllib.parse import urlparse, parse_qs` imports the parsing functions.
- `parsed = urlparse(self.path)` runs the framework-provided `self.path` (e.g., `/?name=Alice`) through the parser.
- `query = parse_qs(parsed.query)` extracts the `?name=Alice` portion and converts it into a dictionary `{'name': ['Alice']}`.
- `query.get('name', ['Guest'])` attempts to fetch the list associated with the key `'name'`. If the key isn't present, it returns a default list `['Guest']`.
- `[0]` accesses the first element of that returned list.
- `name = ...` assigns the resulting string (`'Alice'` or `'Guest'`) to a local variable.
- `body = f"<h1>Welcome, {name}</h1>".encode('utf-8')` creates a formatted Python string injecting the `name` variable, and then immediately calls `.encode('utf-8')` on it to turn that unicode string into raw bytes, overriding the previous hardcoded bytes literal.

### CS lens
This embodies **Serialization and Deserialization**. Data structures (like a Python dictionary of search parameters) cannot be transmitted over a network; they must be serialized into a flat string (percent-encoding), transmitted, and then deserialized back into a dictionary on the other side.

Also recognized in: JSON parsing, pickling, protobufs, and database wire protocols.

### SE lens
Why does `parse_qs` return lists for every value instead of just the value directly?
HTTP query strings permit repeated keys, such as `?tag=python&tag=web`. If `parse_qs` returned a direct string value, it would have to silently overwrite data if multiple tags were present. By always returning a list, it forces the programmer to explicitly decide whether they expect one value (and index `[0]`) or many.

### Commands needed
*(No new commands needed.)*

### Run it
*Predicted Output (Exempt: restarting the server):*
Visiting `http://127.0.0.1:8000/?name=Alice` will now show "Welcome, Alice".

### One sentence connecting to previous unit
The client's parsed query string data determines the dynamically generated bytes sent back in the HTTP response body.

---

## Closing

### Connect the pieces
When you navigate to `http://127.0.0.1:8000/?name=Python`:
1. The browser initiates a **TCP connection** to port 8000 on `127.0.0.1`.
2. Over that socket, it sends the plain-text **HTTP Request**: `GET /?name=Python HTTP/1.1`.
3. The `HTTPServer` accepts the TCP connection and hands the text to `BaseHTTPRequestHandler`.
4. The handler parses the text, extracts the path `/?name=Python`, and calls our **`do_GET()`**.
5. `urlparse` and `parse_qs` split the query string, pulling out `'Python'` into the `name` variable.
6. We encode an **HTTP Response** string, sending the status code `200 OK`, the `Content-Length`, the blank line `\r\n\r\n`, and the formatted bytes `<h1>Welcome, Python</h1>`.
7. The browser receives this TCP byte stream and renders the HTML.
