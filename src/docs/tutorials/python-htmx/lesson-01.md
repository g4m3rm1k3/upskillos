# Lesson 01: Your First Python Web Server — http.server, WSGI, and the Request-Response Cycle

This lesson introduces the foundation of Python web development: the Web Server Gateway Interface (WSGI).

**What you will build**
You will build a raw WSGI web application from scratch, handling routing and POST requests manually, before transitioning to Flask. This teaches the transferable problem: understanding exactly how a web server translates raw TCP network bytes into Python data structures, and how frameworks like Flask and Django wrap this standard interface.

**What you need to know first**
- Nothing (this is Lesson 01).

**Terms used in this lesson**
- **WSGI (Web Server Gateway Interface)** — The standard Python specification (PEP 3333) that decouples web servers (which handle TCP, sockets, and HTTP parsing) from web applications (which handle routing and logic). It exists so any WSGI-compliant server can run any WSGI-compliant app.
- **Callable** — Any Python object that can be executed using parentheses (like a function, lambda, or class with a `__call__` method). WSGI uses callables as its fundamental interface rather than enforcing a specific class hierarchy.
- **Iterable** — A Python object capable of returning its members one at a time, like a list or generator. WSGI requires the application to return an iterable of byte strings so the server can stream the response in chunks rather than buffering it all at once.
- **Byte string (`b'...'`)** — A sequence of raw bytes rather than Unicode characters. Web protocols operate on bytes, so WSGI requires the application to encode its text before returning it.
- **HTTP method** — The action verb requested by the client (e.g., `GET` for fetching data, `POST` for submitting data), dictating the intent of the request.
- **HTTP status code** — A numeric code and reason phrase (like `200 OK` or `404 Not Found`) sent back to the client indicating the outcome of the request.
- **HTTP headers** — Key-value pairs sent in requests and responses (like `Content-Type`) that provide metadata about the body or the request itself.
- **URL-encoded query string** — The portion of a URL after the `?` (e.g., `a=1&b=2`) used to pass simple key-value parameters.
- **Route / Routing** — The process of matching the requested URL path to the specific Python function responsible for generating the response for that path.
- **Decorator (`@`)** — Python syntax for modifying a function or method by wrapping it with another function. Flask uses this to attach URL routes to view functions.

**Objects and methods used**
- **`environ`**
  - *What it is:* A Python dictionary containing all information about the incoming HTTP request.
  - *Implementation:* `dict[str, Any]` provided by the WSGI server.
  - *Its use:* Used to read the request path, method, headers, and body stream.
  - *Type:* `dict` parameter.
  - *Responsibility:* Carries the entire state of the incoming request from the server to the application in a unified dictionary format, translating raw HTTP environment variables into Python keys.
  - *Depends on:* Constructed and populated by the WSGI server parsing the raw HTTP request over TCP.
  - *Connects to:* Passed by the server to the WSGI application callable; the application reads its keys to determine what to do.
  - *Shape:* The data-transfer boundary from server to application.
- **`start_response`**
  - *What it is:* A callback function provided by the server for the application to initiate the HTTP response.
  - *Implementation:* `Callable[[str, list[tuple[str, str]]], Any]`
  - *Its use:* Called to set the status code and headers before returning the actual response body.
  - *Type:* Free function passed as a parameter.
  - *Responsibility:* Registers the HTTP status code and response headers with the server, preparing it to transmit the response stream back over TCP.
  - *Depends on:* The WSGI server's internal socket and state management.
  - *Connects to:* Called by the WSGI app, modifying the server's internal state.
  - *Shape:* A callback boundary between application logic and server mechanics.
- **`make_server`**
  - *What it is:* A factory function from Python's standard library to create a basic HTTP server.
  - *Implementation:* `def make_server(host, port, app, ...)` returning `wsgiref.simple_server.WSGIServer`.
  - *Its use:* Used to spin up a local development server to test our WSGI app.
  - *Type:* `static` factory function in `wsgiref.simple_server`.
  - *Responsibility:* Binds a TCP socket to a host/port and pairs it with a specific WSGI application callable.
  - *Depends on:* An IP address, a port number, and a WSGI callable.
  - *Connects to:* Instantiates a `WSGIServer` and `WSGIRequestHandler`.
  - *Shape:* Entry-point configuration wiring the network layer to the app layer.
- **`parse_qs`**
  - *What it is:* A parsing utility from the `urllib.parse` module.
  - *Implementation:* `def parse_qs(qs, ...)` returning `dict[str, list[str]]`.
  - *Its use:* Parses URL-encoded form data (like `username=alice&password=123`) into a Python dictionary.
  - *Type:* Free function in the standard library.
  - *Responsibility:* Decodes percent-encoded query strings and groups duplicate keys into lists of values.
  - *Depends on:* A raw URL-encoded string.
  - *Connects to:* Called by the WSGI app when processing a POST body or query string.
  - *Shape:* An internal data-transformation helper.
- **`Flask`**
  - *What it is:* The central application object for the Flask web framework.
  - *Implementation:* `class Flask` which implements `__call__(self, environ, start_response)`.
  - *Its use:* Used to create the main web application that handles routing and request wrapping.
  - *Type:* Class instantiation (`app = Flask(__name__)`).
  - *Responsibility:* Acts as the central registry for routes, configuration, and the ultimate WSGI callable that the server invokes.
  - *Depends on:* A module name (`__name__`) to locate resources.
  - *Connects to:* Decorates view functions via `@app.route` and is passed to the WSGI server to run.
  - *Shape:* The core application framework object.

**Everything else in the file, not this lesson's subject but still explained**
- **`str.encode`**
  - *What it is:* String method to convert Unicode text to bytes.
  - *Implementation:* `def encode(encoding="utf-8", errors="strict") -> bytes`.
  - *Its use:* Converting HTML strings into the bytes WSGI requires.
  - *Type:* Instance method on `str`.
  - *Responsibility:* Translates abstract characters into concrete byte representations.
  - *Depends on:* A valid Unicode string.
  - *Connects to:* Returns a `bytes` object to be placed in the WSGI return iterable.
  - *Shape:* Internal data manipulation.
- **`bytes.decode`**
  - *What it is:* Bytes method to convert raw bytes back to a Unicode string.
  - *Implementation:* `def decode(encoding="utf-8", errors="strict") -> str`.
  - *Its use:* Converting the raw POST body read from the network into a string we can parse.
  - *Type:* Instance method on `bytes`.
  - *Responsibility:* Translates bytes into abstract text characters.
  - *Depends on:* A valid byte sequence in the specified encoding.
  - *Connects to:* Returns a `str`.
  - *Shape:* Internal data manipulation.
- **`dict.get`**
  - *What it is:* Dictionary method to retrieve a value safely.
  - *Implementation:* `def get(key, default=None) -> Any`.
  - *Its use:* Used to fetch headers or parameters that might be missing without raising a `KeyError`.
  - *Type:* Instance method on `dict`.
  - *Responsibility:* Provides a safe lookup with a fallback.
  - *Depends on:* The dictionary's state and a key.
  - *Connects to:* Returns the stored value or the default.
  - *Shape:* Data access.
- **`io.BufferedReader.read`**
  - *What it is:* Method to read bytes from a file-like stream.
  - *Implementation:* `def read(size=-1) -> bytes`.
  - *Its use:* Reading the raw incoming network request body from `environ['wsgi.input']`.
  - *Type:* Instance method on a file-like object.
  - *Responsibility:* Consumes and returns a specific number of bytes from the underlying stream.
  - *Depends on:* The stream being open and having data available.
  - *Connects to:* Returns `bytes`.
  - *Shape:* I/O boundary.

---

## Concept Unit: A minimal WSGI application

### The Problem
When a web browser requests a page, it sends raw bytes over a TCP connection. We want to write Python code to handle that request, but dealing directly with TCP sockets, byte streams, and parsing HTTP text is tedious and error-prone. How do we cleanly separate the code that parses network traffic from the code that generates HTML?

> What would you try here first? If you had to write a Python function that a web server could call every time a request comes in, what arguments would you force the server to pass to your function? And what format should your function return so the server knows exactly what to send back? Write down a hypothetical function signature before reading on.

### Introduce the concept in isolation
We will define a bare-bones Python function that implements the **WSGI** specification. To see how it works, we will manually call it ourselves using fake data, simulating what a real web server does behind the scenes.

```python
def minimal_wsgi_app(environ, start_response):
    status = '200 OK'
    headers = [('Content-Type', 'text/plain')]
    start_response(status, headers)
    return [b"Hello, WSGI World!"]

# Simulating the web server:
fake_environ = {'REQUEST_METHOD': 'GET', 'PATH_INFO': '/'}
def fake_start_response(status, headers):
    print(f"Server received status: {status}")
    print(f"Server received headers: {headers}")

print("Calling the WSGI app...")
response_body = minimal_wsgi_app(fake_environ, fake_start_response)
print(f"Server received body: {response_body}")
```

Predicted output (confidently known standard Python behavior):
```text
Calling the WSGI app...
Server received status: 200 OK
Server received headers: [('Content-Type', 'text/plain')]
Server received body: [b'Hello, WSGI World!']
```

This output proves that the **callable** (our function) receives request details via `environ`, uses the `start_response` callback to register metadata, and returns the actual payload as an iterable of byte strings.

### Discard the throwaway
This simulation script is deleted and will not appear in the project again.

### Project Change
- **Reference Source**: No reference counterpart — this is a from-scratch addition because we are starting a brand new application.
- **Files affected**: Created `app.py`.
- **Change type**: Add.
- **Location**: Top of the new file.
- **Dependencies**: None.

### The New Code
```python
def wsgi_app(environ, start_response):
    method = environ['REQUEST_METHOD']
    path   = environ['PATH_INFO']
    print(f'Request: {method} {path}')

    status = '200 OK'
    headers = [('Content-Type', 'text/html; charset=utf-8')]
    start_response(status, headers)

    body = f'<h1>You requested: {path}</h1>'
    return [body.encode('utf-8')]

print('WSGI app:', wsgi_app)
print('Type:', type(wsgi_app))
```

### The Updated Project
Because this is a brand new file, the new code constitutes the entirety of `app.py`:

```python
1: def wsgi_app(environ, start_response):
2:     method = environ['REQUEST_METHOD']
3:     path   = environ['PATH_INFO']
4:     print(f'Request: {method} {path}')
5: 
6:     status = '200 OK'
7:     headers = [('Content-Type', 'text/html; charset=utf-8')]
8:     start_response(status, headers)
9: 
10:    body = f'<h1>You requested: {path}</h1>'
11:    return [body.encode('utf-8')]
12:
13: print('WSGI app:', wsgi_app)
14: print('Type:', type(wsgi_app))
```

### Mechanical walkthrough
- `def wsgi_app(environ, start_response)` defines the function. This signature is strictly mandated by WSGI. The web server calls this function on every request.
- `environ['REQUEST_METHOD']` accesses the string representing the HTTP method (e.g., `'GET'`) from the environment dictionary.
- `environ['PATH_INFO']` accesses the string representing the URL path requested by the client.
- `print(f'...')` is standard Python printing, which will output to our server's console, useful for logging.
- `status = '200 OK'` assigns a string representing the HTTP status code and reason phrase.
- `headers = [('Content-Type', 'text/html; charset=utf-8')]` creates a list of tuples, matching the exact format the WSGI server expects for HTTP headers.
- `start_response(status, headers)` invokes the callback function passed by the server, registering the status and headers inside the server's internal state before the body is sent.
- `body = f'<h1>You requested: {path}</h1>'` formats a standard string containing HTML.
- `body.encode('utf-8')` calls the `str.encode` method, converting our Unicode string into a raw **byte string** (`b'...'`), which is required because network sockets transmit raw bytes, not Python strings.
- `return [...]` returns a Python list (which is an **iterable**) containing our encoded byte string. The WSGI server iterates over this list and sends each byte string to the client.
- `print('Type:', type(wsgi_app))` outputs the class of the object, proving it is merely a `<class 'function'>`.

### CS lens
This implements the **Gateway Interface** pattern. Instead of hardcoding application logic directly into a web server, the server and the application agree on a standardized boundary (the gateway interface). 
Also recognized in: Common Gateway Interface (CGI) scripts, Java Servlets, OS-level file descriptors abstracting different hardware, plugin architectures.

### SE lens
This design embodies **Decoupling**. By keeping the HTTP parsing network layer (the server) separate from the business logic layer (our application), we can swap them independently. We can run this exact `wsgi_app` function behind Gunicorn, uWSGI, or Python's built-in server without changing a single line of the application logic. 

### Commands needed
Run: `python app.py`

### Run it
Predicted output (confidently known standard Python behavior):
```text
WSGI app: <function wsgi_app at 0x...>
Type: <class 'function'>
```
The script simply defines the function and exits, because we haven't given it to a server to run yet.

### One sentence connecting to previous unit
We now have a callable application that understands requests and generates responses, but we need an actual network server to listen for connections and invoke it.

---

## Concept Unit: Serving a WSGI app with wsgiref

### The Problem
Our `wsgi_app` sits in a file doing nothing. How do we instruct Python to open a TCP port on our operating system, listen for incoming HTTP requests, and hand them off to our WSGI callable?

> Look at the standard library. If you need to make a server, what function name would be obvious? If you want the server to keep running forever, what method might you call? Predict the names before moving on.

### Introduce the concept in isolation
We will use the `wsgiref` module to create a real server and run a tiny lambda as our WSGI app for one request.

```python
from wsgiref.simple_server import make_server

# A dummy WSGI app:
tiny_app = lambda environ, start_response: (
    start_response('200 OK', [('Content-Type', 'text/plain')]),
    [b"Tiny server running!"]
)[1]

# Make the server
server = make_server('127.0.0.1', 8001, tiny_app)
print("Handling one request...")
# We use handle_request() instead of serve_forever() so it doesn't block infinitely
server.handle_request() 
```
Output (simulating a `curl http://127.0.0.1:8001` hitting the server):
```text
Handling one request...
127.0.0.1 - - [26/Sep/2026 10:00:00] "GET / HTTP/1.1" 200 20
```
This proves that `make_server` binds to the port and wraps our callable. When a request arrives, the server processes it, invokes the callable, and logs the result.

### Discard the throwaway
This isolated server script is deleted and will not appear in the project again.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: Modified `app.py`.
- **Change type**: Replace.
- **Location**: Replacing the entirety of the file with a routing implementation and server loop.
- **Dependencies**: The built-in `wsgiref` module.

### The New Code
```python
from wsgiref.simple_server import make_server

def my_app(environ, start_response):
    path = environ.get('PATH_INFO', '/')
    routes = {
        '/':      '<h1>Home</h1><a href="/about">About</a>',
        '/about': '<h1>About</h1><p>A WSGI demo.</p>',
    }

    if path in routes:
        status = '200 OK'
        body = routes[path]
    else:
        status = '404 Not Found'
        body = '<h1>404 - Not Found</h1>'

    headers = [('Content-Type', 'text/html')]
    start_response(status, headers)
    return [body.encode('utf-8')]

server = make_server('127.0.0.1', 8000, my_app)
print('WSGI server created on http://127.0.0.1:8000')
print('App callable:', my_app.__name__)
# server.serve_forever()
```

### The Updated Project
```python
1:  # ← new: from wsgiref.simple_server import make_server
2:  from wsgiref.simple_server import make_server
3:  
4:  # ← new: replace previous wsgi_app with routed my_app
5:  def my_app(environ, start_response):
6:      path = environ.get('PATH_INFO', '/')
7:      routes = {
8:          '/':      '<h1>Home</h1><a href="/about">About</a>',
9:          '/about': '<h1>About</h1><p>A WSGI demo.</p>',
10:     }
11: 
12:     if path in routes:
13:         status = '200 OK'
14:         body = routes[path]
15:     else:
16:         status = '404 Not Found'
17:         body = '<h1>404 - Not Found</h1>'
18: 
19:     headers = [('Content-Type', 'text/html')]
20:     start_response(status, headers)
21:     return [body.encode('utf-8')]
22: 
23: # ← new: create server instance
24: server = make_server('127.0.0.1', 8000, my_app)
25: print('WSGI server created on http://127.0.0.1:8000')
26: print('App callable:', my_app.__name__)
27: # server.serve_forever()
```
The file now contains a WSGI application capable of routing different paths to different HTML responses, and code to instantiate a real web server bound to port 8000.

### Mechanical walkthrough
- `from wsgiref.simple_server import make_server` imports the factory function from the standard library.
- `environ.get('PATH_INFO', '/')` uses the `dict.get` method to safely extract the request path, defaulting to `/` if it is mysteriously missing.
- `routes = { ... }` defines a Python dictionary mapping URL path strings to string payloads. This is manual **routing**.
- `if path in routes:` checks if the requested path exists as a key in our routing dictionary.
- `status = '404 Not Found'` sets the HTTP status code to 404, instructing the browser that the resource doesn't exist.
- `server = make_server('127.0.0.1', 8000, my_app)` calls the factory function, creating a TCP server bound to localhost on port 8000, and wires it to our `my_app` callable.
- `my_app.__name__` accesses the internal string name of the Python function.
- `# server.serve_forever()` is commented out for now so the script doesn't block forever when we run it. If uncommented, it enters an infinite accept loop.

### CS lens
The server implements an **Event Loop**. It sits idle, waiting for the operating system to signal that a TCP packet has arrived on port 8000. When that event happens, it parses the HTTP text, builds the `environ`, calls our app, flushes the output back to the socket, and returns to waiting.
Also recognized in: GUI event dispatch threads, game engine tick loops, Node.js asynchronous architecture.

### SE lens
**Development vs. Production Servers.** We use `wsgiref` here because it's built into Python and requires zero dependencies. However, it is fundamentally single-threaded — it can only process one request at a time. If a request takes 5 seconds, every other user waits 5 seconds. In production, this application would be passed to a production-grade WSGI server like `gunicorn`, which pre-forks multiple worker processes to handle hundreds of concurrent requests.

### Commands needed
Run: `python app.py`

### Run it
Predicted output (confidently known standard Python behavior):
```text
WSGI server created on http://127.0.0.1:8000
App callable: my_app
```

### One sentence connecting to previous unit
The server now routes basic paths, but requests contain much more data than just the path — like headers, query strings, and body payloads.

---

## Concept Unit: The environ dictionary in detail

### The Problem
When a user visits a site, their browser sends a wealth of information: cookies, the user-agent string (identifying their browser), and query parameters in the URL. Where does all this data go so our Python code can read it?

> What happens if a header contains a hyphen, like `User-Agent`? Python dictionary keys can be anything, but PEP 3333 sets a strict standard for how HTTP headers are converted into `environ` keys. Given `REQUEST_METHOD`, guess what `User-Agent` becomes.

### Introduce the concept in isolation
We'll dump a mock `environ` dictionary to see the exact keys a WSGI server provides according to the PEP 3333 standard.

```python
environ_example = {
    'REQUEST_METHOD': 'POST',
    'PATH_INFO':      '/login',
    'QUERY_STRING':   'next=%2Fdashboard',
    'CONTENT_TYPE':   'application/x-www-form-urlencoded',
    'CONTENT_LENGTH': '27',
    'HTTP_HOST':      'localhost:5000',
    'HTTP_USER_AGENT':'Mozilla/5.0',
    'HTTP_COOKIE':    'session=abc123',
    'wsgi.input':     None,
    'wsgi.url_scheme':'http',
    'SERVER_NAME':    'localhost',
    'SERVER_PORT':    '5000',
}
for key, value in environ_example.items():
    print(f'{key}: {value}')
```
Predicted output (confidently known standard Python behavior):
```text
REQUEST_METHOD: POST
PATH_INFO: /login
QUERY_STRING: next=%2Fdashboard
CONTENT_TYPE: application/x-www-form-urlencoded
CONTENT_LENGTH: 27
HTTP_HOST: localhost:5000
HTTP_USER_AGENT: Mozilla/5.0
HTTP_COOKIE: session=abc123
wsgi.input: None
wsgi.url_scheme: http
SERVER_NAME: localhost
SERVER_PORT: 5000
```
This proves that standard HTTP headers are prefixed with `HTTP_`, uppercased, and have their hyphens converted to underscores. The only exceptions are `CONTENT_TYPE` and `CONTENT_LENGTH`, which lack the `HTTP_` prefix.

### Discard the throwaway
This dictionary script is deleted and will not appear in the project again.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: Modified `app.py`.
- **Change type**: Refactor.
- **Location**: Inside `my_app`.
- **Dependencies**: None.

### The New Code
```python
    user_agent = environ.get('HTTP_USER_AGENT', 'Unknown')
    query = environ.get('QUERY_STRING', '')
    print(f"Visitor using: {user_agent}")
    print(f"Query string: {query}")
```

### The Updated Project
```python
4:  def my_app(environ, start_response):
5:      path = environ.get('PATH_INFO', '/')
6:      # ← new: extract user agent and query string
7:      user_agent = environ.get('HTTP_USER_AGENT', 'Unknown')
8:      query = environ.get('QUERY_STRING', '')
9:      print(f"Visitor using: {user_agent}")
10:     print(f"Query string: {query}")
11: 
12:     routes = {
```
The application now extracts and logs the browser's User-Agent and any raw URL-encoded query string attached to the request.

### Mechanical walkthrough
- `environ.get('HTTP_USER_AGENT', 'Unknown')` reads the transformed `User-Agent` HTTP header, supplying a default string if the client didn't send one.
- `environ.get('QUERY_STRING', '')` reads the raw, unparsed string after the `?` in the URL.

### CS lens
This is **Environment Variable Injection**, inherited directly from CGI (Common Gateway Interface). Before WSGI, web servers communicated with applications by literally spawning a new process and passing data as operating-system environment variables. WSGI preserved this exact key-naming convention (like `HTTP_USER_AGENT`) so CGI apps could easily be ported, but passes it as a Python dictionary in memory instead of spawning an expensive process.
Also recognized in: Docker container configuration, CI/CD pipeline secrets mapping, Unix process forks.

### SE lens
**Namespacing.** By prefixing client-provided headers with `HTTP_`, the WSGI specification ensures that a malicious client sending a header named `Path-Info` cannot overwrite the actual `PATH_INFO` key computed by the server. Namespacing separates trusted server variables from untrusted client inputs within the same dictionary.

### Commands needed
Run: `python app.py`

### Run it
Predicted output (confidently known standard Python behavior):
The script executes without printing the new lines, because the application callable is not yet being executed by a live, running server loop.

### One sentence connecting to previous unit
We can now read data from the headers and URL, but when a user submits an HTML form, that data travels hidden inside the request body.

---

## Concept Unit: Reading POST body in WSGI

### The Problem
When a user fills out a `<form method="POST">`, the browser packages the inputs into a URL-encoded string (like `username=alice&password=secret`) and sends it in the HTTP request body. It's not in the path, and it's not in the headers. How do we extract and parse that raw byte payload?

> The `environ` dictionary has a key named `wsgi.input`, which holds a file-like stream containing the raw body bytes. If you try to read from a network stream without specifying a limit, what happens if the user sends an infinitely long stream? How does the server tell you exactly how many bytes are safe to read?

### Introduce the concept in isolation
We will simulate reading from the `wsgi.input` stream and parsing the resulting raw URL-encoded string into a usable Python dictionary.

```python
import io
from urllib.parse import parse_qs

# Simulate a POST request environ:
raw_body_bytes = b"username=alice&password=s3cr3t"
mock_environ = {
    'CONTENT_LENGTH': str(len(raw_body_bytes)),
    'wsgi.input': io.BytesIO(raw_body_bytes)
}

# Reading the body safely:
length = int(mock_environ.get('CONTENT_LENGTH', 0))
raw_body = mock_environ['wsgi.input'].read(length).decode()
print("Raw string:", raw_body)

# Parsing the URL-encoded string:
parsed_data = parse_qs(raw_body)
print("Parsed data:", parsed_data)
```
Predicted output (confidently known standard Python behavior):
```text
Raw string: username=alice&password=s3cr3t
Parsed data: {'username': ['alice'], 'password': ['s3cr3t']}
```
This proves we must manually convert the `CONTENT_LENGTH` string to an integer, use it to `read()` exactly that many bytes from the stream, `decode()` the bytes into a string, and pass it to `parse_qs` to get a dictionary where the values are lists.

### Discard the throwaway
This input reading script is deleted and will not appear in the project again.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: Modified `app.py`.
- **Change type**: Replace.
- **Location**: Replacing `my_app` with a full POST-handling `login_app`.
- **Dependencies**: `urllib.parse`.

### The New Code
```python
from urllib.parse import parse_qs

def login_app(environ, start_response):
    method = environ['REQUEST_METHOD']
    
    if method == 'GET':
        form_html = '''
            <form method="POST" action="/login">
                <input name="username" placeholder="Username">
                <input name="password" type="password" placeholder="Password">
                <button>Login</button>
            </form>'''
        start_response('200 OK', [('Content-Type','text/html')])
        return [form_html.encode()]
        
    elif method == 'POST':
        length = int(environ.get('CONTENT_LENGTH', 0))
        raw_body = environ['wsgi.input'].read(length).decode()
        data = parse_qs(raw_body)
        
        username = data.get('username', [''])[0]
        start_response('200 OK', [('Content-Type','text/html')])
        return [f'<p>Hello, {username}</p>'.encode()]
```

### The Updated Project
```python
1:  from wsgiref.simple_server import make_server
2:  # ← new: import parse_qs
3:  from urllib.parse import parse_qs
4:  
5:  # ← new: replace my_app with login_app
6:  def login_app(environ, start_response):
7:      method = environ['REQUEST_METHOD']
8:      
9:      if method == 'GET':
10:         form_html = '''
11:             <form method="POST" action="/login">
12:                 <input name="username" placeholder="Username">
13:                 <input name="password" type="password" placeholder="Password">
14:                 <button>Login</button>
15:             </form>'''
16:         start_response('200 OK', [('Content-Type','text/html')])
17:         return [form_html.encode()]
18:         
19:     elif method == 'POST':
20:         length = int(environ.get('CONTENT_LENGTH', 0))
21:         raw_body = environ['wsgi.input'].read(length).decode()
22:         data = parse_qs(raw_body)
23:         
24:         username = data.get('username', [''])[0]
25:         start_response('200 OK', [('Content-Type','text/html')])
26:         return [f'<p>Hello, {username}</p>'.encode()]
27: 
28: server = make_server('127.0.0.1', 8000, login_app)
29: print('Login WSGI app ready on port 8000')
```
The application now conditionally branches on the **HTTP method**. On a `GET`, it returns an HTML form. On a `POST`, it reads the network stream, parses the body, and dynamically generates a personalized response.

### Mechanical walkthrough
- `from urllib.parse import parse_qs` imports the standard library function responsible for parsing form data.
- `method = environ['REQUEST_METHOD']` determines if the browser is just asking for the page (`GET`) or submitting data (`POST`).
- `int(environ.get('CONTENT_LENGTH', 0))` converts the string length header into an integer, defaulting to 0 if no body was sent.
- `environ['wsgi.input']` accesses a file-like object provided by the server representing the open TCP socket stream.
- `environ['wsgi.input'].read(length)` calls the `read` method, extracting exactly `length` bytes from the network buffer.
- `decode()` converts those bytes back into a standard Python string.
- `parse_qs(raw_body)` turns the `username=alice` string into `{'username': ['alice']}`.
- `data.get('username', [''])[0]` safely accesses the dictionary. Because `parse_qs` always returns lists (to handle checkboxes with multiple identical names), we must index `[0]` to get the actual string value.

### CS lens
This deals with **Stream Processing vs. Bounded Buffers**. Network sockets are streams — they have no inherent end until the connection drops. If our application blindly called `.read()` without a length, it would hang infinitely waiting for more bytes that the browser is never going to send. `CONTENT_LENGTH` provides the bound, allowing the application to read exactly what is available and no more.
Also recognized in: File I/O EOF markers, chunked transfer encoding, length-prefixed message framing in custom binary protocols.

### SE lens
**Security and Trust.** We do not trust the client. If we call `.read()` based purely on `CONTENT_LENGTH`, what happens if a malicious client sends `CONTENT_LENGTH: 1000000000` (1 GB) but only trickles 1 byte per second? This is a classic Slowloris attack. Raw WSGI apps are vulnerable to this. Production web servers (like Nginx sitting in front of our WSGI server) buffer and validate the entire payload before passing it to Python, shielding the application from managing malicious TCP behavior.

### Commands needed
Run: `python app.py`

### Run it
Predicted output (confidently known standard Python behavior):
```text
Login WSGI app ready on port 8000
```

### One sentence connecting to previous unit
We've successfully built a fully functioning web application using raw WSGI, but extracting paths, checking HTTP methods, casting headers, and reading bytes manually is exhausted work — which is exactly why web frameworks exist.

---

## Concept Unit: From WSGI to Flask — what Flask does for you

### The Problem
Look at the `login_app` code. For a single endpoint, we had to write an `if/elif` block for methods, manually cast `CONTENT_LENGTH` to an integer, read bytes from a stream, decode them, parse them with a specialized utility, and index a list just to get a username. If we add 50 routes, the `if/elif` block becomes a nightmare.

> If you were to wrap `environ` and `start_response` in a reusable class so you never had to parse raw bytes again, what would that class look like? What would you name the object that holds the parsed `environ`?

### Introduce the concept in isolation
We will construct an isolated `Flask` application object, confirm it is a callable, and manually call it with our mock WSGI environment just as we did with our raw function.

```python
from flask import Flask

app = Flask(__name__)

@app.route('/test')
def test_route():
    return "Flask is working!"

print("Flask app is callable?", callable(app))
print("Routes mapped:", list(app.url_map._rules))

# Simulating the web server calling the Flask app:
fake_environ = {'REQUEST_METHOD': 'GET', 'PATH_INFO': '/test'}
def fake_start_response(status, headers):
    print(f"Flask returned status: {status}")

print("Calling Flask manually...")
# Calling the Flask instance IS calling a WSGI app
app.wsgi_app(fake_environ, fake_start_response)
```
Predicted output (confidently known standard Python behavior):
```text
Flask app is callable? True
Routes mapped: [<Rule '/test' (OPTIONS, GET, HEAD) -> test_route>, <Rule '/static/<filename>' (OPTIONS, GET, HEAD) -> static>]
Calling Flask manually...
Flask returned status: 200 OK
```
This proves that Flask is simply a massive, elegant wrapper around the exact `environ` and `start_response` mechanics we just built by hand.

### Discard the throwaway
This isolated Flask instance script is deleted and will not appear in the project again.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: Modified `app.py`.
- **Change type**: Replace.
- **Location**: Replacing the entire file to use Flask instead of raw `wsgiref`.
- **Dependencies**: `flask` package.

### The New Code
```python
from flask import Flask, request

app = Flask(__name__)

@app.route('/')
def index():
    return '<h1>Hello Flask!</h1>'

@app.route('/about')
def about():
    return '<p>Flask wraps WSGI for you.</p>'

if __name__ == '__main__':
    app.run(port=8000)
```

### The Updated Project
```python
1:  # ← new: import Flask
2:  from flask import Flask, request
3:  
4:  # ← new: instantiate central application
5:  app = Flask(__name__)
6:  
7:  # ← new: map routes using decorators
8:  @app.route('/')
9:  def index():
10:     return '<h1>Hello Flask!</h1>'
11: 
12: @app.route('/about')
13: def about():
14:     return '<p>Flask wraps WSGI for you.</p>'
15: 
16: # ← new: run the built-in development server
17: if __name__ == '__main__':
18:     app.run(port=8000)
```
The entire raw routing dictionary, header parsing, byte decoding, and server instantiation has been replaced by an application object, route decorators, and view functions.

### Mechanical walkthrough
- `from flask import Flask, request` imports the application class and the global request object.
- `app = Flask(__name__)` instantiates the application registry. `__name__` tells Flask where the current file is located so it can find associated templates later.
- `@app.route('/')` uses a **decorator**. When Python reads this file, it sees the `@`, takes the `index` function immediately below it, and passes it into Flask's internal routing table, mapping the path `/` to this specific function.
- `def index():` defines a view function. Unlike our raw WSGI app, it doesn't accept `environ` or `start_response`.
- `return '<h1>Hello Flask!</h1>'` simply returns a Python string. Flask intercepts this string, automatically encodes it to bytes, computes the content length, sets the `200 OK` status, and calls `start_response` on our behalf.
- `app.run(port=8000)` starts Werkzeug's (Flask's underlying library) development WSGI server, wrapping a socket around the `app` object precisely the way `make_server` did.

### CS lens
This represents the **Facade Pattern**. A complex, low-level subsystem (WSGI, TCP streams, HTTP headers, byte decoding) is hidden behind a clean, simplified, high-level interface (`@app.route` and `return "string"`). The complexity still exists, but the developer no longer interacts with it directly.
Also recognized in: ORMs hiding raw SQL, standard library `open()` hiding OS file descriptors, jQuery hiding raw DOM APIs.

### SE lens
**Frameworks vs. Libraries.** You call a library; a framework calls you. In our raw WSGI script, we controlled the flow. With Flask, we register our functions (via decorators) into Flask's router, and we surrender the main execution thread to `app.run()`. When a request comes in, Flask is in control; it decides which of our functions to invoke and when. This is the "Hollywood Principle": *Don't call us, we'll call you*.

### Commands needed
Run: `python app.py`

### Run it
Predicted output (confidently known standard Python behavior):
```text
 * Serving Flask app 'app'
 * Debug mode: off
 * Running on http://127.0.0.1:8000
```

### One sentence connecting to previous unit
By letting Flask handle the raw WSGI mechanics, we can focus entirely on our application logic.

---

## Closing

### Connect the pieces
Let's trace exactly what happens when a browser submits a POST request to a Flask route like `/login`:

1. **TCP Connection:** The browser opens a socket to port 8000 and streams raw HTTP bytes.
2. **WSGI Server:** Flask's development server (which implements the same logic as `wsgiref.make_server`) accepts the socket, parses the bytes into the `environ` dictionary, and calls the `Flask` application object's `__call__` method.
3. **Routing:** Flask reads `environ['PATH_INFO']` and matches it against its internal dictionary of rules built by the `@app.route` decorators.
4. **Data Parsing:** Because it's a POST, Flask automatically reads `environ['wsgi.input']`, decodes the bytes, and runs `parse_qs` behind the scenes, placing the clean data into `request.form`.
5. **View Function:** Flask invokes our specific mapped Python function.
6. **Response Generation:** Our function returns a plain string.
7. **WSGI Return:** Flask wraps that string in an iterable, calls `start_response` with `200 OK`, and returns the bytes back to the WSGI server, which flushes them down the TCP socket to the browser. 

Through every step, the underlying PEP 3333 standard remains the contract moving data across the boundary.
