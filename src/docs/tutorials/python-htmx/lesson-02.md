# Lesson 02: Flask Hello World — The App Object, Routes, the Dev Server, and Debug Mode

What you will build
In this lesson, we will build a minimal Flask web application capable of responding to web requests and processing HTML form submissions. By completing this, you will learn how a WSGI application factory maps HTTP paths to Python functions, how state and configuration are stored centrally, and how the developer server accelerates the feedback loop.

What you need to know first
Nothing.

Terms used in this lesson
**WSGI application factory** — A standard interface that allows Python web servers to communicate with Python web applications. It exists to decouple the server from the application logic.
**View function** — A standard Python function mapped to a specific URL. It exists to generate the response (like HTML) for an incoming HTTP request.
**Route converter** — Syntax like `<int:a>` within a URL path that automatically converts the extracted string into a specific Python data type. It solves the problem of manually casting URL strings to integers.
**HTTP methods** — Verbs like GET and POST that indicate the intent of the request. They exist to differentiate between retrieving data (GET) and submitting new state (POST) on the exact same URL.
**Auto-reload** — A development server feature that watches the file system for changes. It exists to automatically restart the application without manual intervention, removing friction from the write-test cycle.

Objects and methods used
**`Flask`**
- *What it is:* The central application object and registry.
- *Implementation:* `class Flask(import_name: str)`
- *Its use:* Instantiated to create the `app` object that tracks our routes and config.
- *Type:* Class constructor.
- *Responsibility:* Acts as the central registry for view functions, URL rules, template configuration, and handles incoming WSGI requests by dispatching them to the right function.
- *Depends on:* The `import_name` (usually `__name__`) to locate templates and static folders relative to the caller.
- *Connects to:* Called by the developer or a WSGI server to initialize; calls view functions when requests arrive.
- *Shape:* The root boundary of the application framework.

**`app.route`**
- *What it is:* A decorator for mapping URLs to view functions.
- *Implementation:* `def route(self, rule: str, **options: t.Any) -> t.Callable`
- *Its use:* Placed directly above a function to bind it to a web path like `/`.
- *Type:* Instance method returning a decorator.
- *Responsibility:* Registers a specific URL rule in the application's internal `url_map` and maps it to the decorated endpoint.
- *Depends on:* A string URL rule, and optionally a list of accepted HTTP methods.
- *Connects to:* Connects the Flask URL router to your custom Python function.
- *Shape:* A declarative API boundary bridging the HTTP request router to user-defined logic.

**`request`**
- *What it is:* A global proxy object representing the current HTTP request.
- *Implementation:* `request: Request = LocalProxy(partial(_lookup_req_object, "request"))`
- *Its use:* Read to inspect the incoming HTTP method or form data.
- *Type:* Context-local proxy object.
- *Responsibility:* Exposes all metadata from the incoming client request (headers, form data, URL arguments) safely across concurrent threads.
- *Depends on:* An active request context established by Flask when a request starts.
- *Connects to:* Called by view functions to retrieve data; pulls from Werkzeug's underlying request parsing.
- *Shape:* An ambient read-only data boundary exposing external client state to the application.

**`app.run`**
- *What it is:* A method that starts the built-in development web server.
- *Implementation:* `def run(self, host: str | None = None, port: int | None = None, debug: bool | None = None, **options: t.Any) -> None`
- *Its use:* Invoked at the bottom of the script to launch the app locally.
- *Type:* Instance method.
- *Responsibility:* Boots the Werkzeug local WSGI server, binds it to a socket, and listens for HTTP requests.
- *Depends on:* Network interface availability for the given host and port.
- *Connects to:* Connects the operating system's network stack to the Flask application.
- *Shape:* The entry point boundary that blocks the main thread to serve traffic.

**`app.config`**
- *What it is:* A dictionary-like object storing configuration variables.
- *Implementation:* `class Config(dict)`
- *Its use:* Mutated to set app-wide settings like `DEBUG` or `SECRET_KEY`.
- *Type:* Subclass of Python's built-in `dict`.
- *Responsibility:* Centralizes hardcoded settings and environment variables so all extensions and views read from a single source of truth.
- *Depends on:* Nothing to initialize, but depends on developer assignment.
- *Connects to:* Written by startup code; read by Flask internals and third-party extensions.
- *Shape:* A global state boundary holding application constants.

**`url_for`**
- *What it is:* A helper function to build URLs dynamically.
- *Implementation:* `def url_for(endpoint: str, **values: t.Any) -> str`
- *Its use:* Used to generate target paths for redirects and links instead of hardcoding strings.
- *Type:* Freestanding framework function.
- *Responsibility:* Generates an absolute or relative URL string for a given endpoint name, embedding any required variable arguments safely.
- *Depends on:* The application's `url_map` and an active request or application context.
- *Connects to:* Called by view functions or templates; reverse-queries the Flask route table.
- *Shape:* An internal routing utility boundary.

**`redirect`**
- *What it is:* A function that returns a redirect response.
- *Implementation:* `def redirect(location: str, code: int = 302, Response: type[Response] | None = None) -> Response`
- *Its use:* Returned from a view function to tell the browser to visit a different URL.
- *Type:* Freestanding framework function.
- *Responsibility:* Constructs a valid HTTP response with a 300-level status code and a `Location` header pointing to the new destination.
- *Depends on:* A target URL string.
- *Connects to:* Called by view functions; its return value is consumed by Flask to format the HTTP response.
- *Shape:* An HTTP protocol helper boundary.

**`app.test_request_context`**
- *What it is:* A method that simulates an active HTTP request.
- *Implementation:* `def test_request_context(self, *args: t.Any, **kwargs: t.Any) -> RequestContext`
- *Its use:* Used to allow testing of functions like `url_for` that crash outside a real request.
- *Type:* Instance method returning a context manager.
- *Responsibility:* Temporarily pushes a fake request onto the context stack, deceiving Flask internals into believing a real web request is actively occurring.
- *Depends on:* The application instance.
- *Connects to:* Used by developer tests; interacts with Flask's internal context local stack.
- *Shape:* A testing and simulation boundary.

Everything else in the file, not this lesson's subject but still explained
**`callable`**
- *What it is:* A Python built-in function to check if an object can be called like a function.
- *Implementation:* `def callable(obj: object, /) -> bool`
- *Its use:* Used in a lab to verify that the `Flask` instance implements `__call__`.
- *Type:* Built-in function.
- *Responsibility:* Returns True if the object appears callable, ensuring it implements the `__call__` dunder method.
- *Depends on:* Any Python object.
- *Connects to:* Evaluates the object's internal structure; returns a boolean to the caller.
- *Shape:* A standard runtime inspection utility.


## Concept Unit: The minimal Flask application
### The Problem
We need a way to receive HTTP requests and map them to Python code. Before we can handle a request, we need a central object that coordinates the web server, configuration, and routing.

Given that Python is just a general-purpose language, how would you expect a web framework to represent an entire application? What information does it need to know about your files before it can serve them? Take a moment to sketch out what creating this application object might look like.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are creating the initial application entry point.
- **Files affected:** Created `app.py`.
- **Change type:** Add.
- **Location:** Entire file.
- **Dependencies:** Flask package installed.

### The New Code
```python
from flask import Flask
app = Flask(__name__)
```

### The Updated Project
```python
# ← new
1: from flask import Flask
2: app = Flask(__name__)
```
This creates the core application instance that will hold all our web logic.

### Introduce the concept in isolation
```python
from flask import Flask
app = Flask(__name__)
print('App name:', app.name)
print('Root path:', app.root_path)
print('Is WSGI callable:', callable(app))
```

Predicted output stated from confidence, not executed (because standard Flask initialization is entirely deterministic and well-known):
```text
App name: __main__
Root path: /absolute/path/to/directory
Is WSGI callable: True
```
This demonstrates the **WSGI application factory**. Flask uses the `__name__` argument to determine the root path of the application so it can find associated resources like templates and static files relative to the Python file itself.

### Discard the throwaway
This print-statement exploration is discarded and will not appear in the project again.

### Mechanical walkthrough
1. `from flask import Flask`: Imports the main `Flask` class from the `flask` package.
2. `app = Flask(__name__)`: Instantiates the application. We pass `__name__`, a built-in Python variable that evaluates to `__main__` when the script is run directly, or the module name if imported. This string tells Flask where the module is located on disk, which is how it correctly anchors `app.root_path` to find the `templates/` folder later. Flask objects implement `__call__`, making the `app` instance itself a callable WSGI application.

### CS lens
The `Flask` object implements the **Application Coordinator** pattern. Also recognized in: OS kernels managing process tables, game engines coordinating rendering and physics loops, window managers dispatching events, and database engines holding configuration and connection pools.

### SE lens
Passing `__name__` as an explicit argument rather than having Flask guess the call stack. The alternative not chosen was inspecting the stack frame to find the caller's file path automatically. That tradeoff requires brittle magic that breaks when apps are created via factory functions in other files. Forcing the developer to pass the module name explicitly pays the cost of boilerplate to buy reliability.

### Commands needed
`pip install flask`: Installs the Flask framework and its dependencies (like Werkzeug and Jinja2) into the current Python environment.

### Run it
The code does not start a server yet, so running it directly exits immediately with no output.

### One sentence connecting to previous unit
This base application instance now gives us an object we can attach behavior to, leading us to our first route.


## Concept Unit: Routes and view functions
### The Problem
Now that we have an application object, we need to instruct it what to do when a web browser requests a specific path like `/hello/Alice`. 

If the user types a URL in their browser, how does the application know which Python function to execute? How would you design an API that cleanly maps a string URL to a function? Take a moment to imagine how you might bind a path to a function.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are registering our initial routes.
- **Files affected:** `app.py`.
- **Change type:** Add.
- **Location:** Below the application instantiation.
- **Dependencies:** The `app` instance.

### The New Code
```python
@app.route('/')
def index():
    return '<h1>Welcome!</h1>'

@app.route('/hello/<name>')
def hello(name):
    return f'<p>Hello, {name}!</p>'

@app.route('/add/<int:a>/<int:b>')
def add(a, b):
    return f'<p>{a} + {b} = {a+b}</p>'
```

### The Updated Project
```python
  from flask import Flask
  app = Flask(__name__)

# ← new
4: @app.route('/')
5: def index():
6:     return '<h1>Welcome!</h1>'
7: 
8: @app.route('/hello/<name>')
9: def hello(name):
10:    return f'<p>Hello, {name}!</p>'
11: 
12: @app.route('/add/<int:a>/<int:b>')
13: def add(a, b):
14:    return f'<p>{a} + {b} = {a+b}</p>'
```
This maps three specific URL paths to three Python functions, defining what HTML is returned for each.

### Introduce the concept in isolation
```python
from flask import Flask
app = Flask(__name__)

@app.route('/test/<int:number>')
def test(number):
    return "Test"

print('URL map:')
for rule in app.url_map.iter_rules():
    print(f'  {rule.rule:30} -> {rule.endpoint}')
```

Predicted output stated from confidence, not executed (routing internals are deterministic):
```text
URL map:
  /test/<number>                 -> test
  /static/<path:filename>        -> static
```
This is a **view function** with a **route converter**. When the `@app.route` decorator is evaluated, Flask registers the path in its internal routing map (`url_map`), automatically parsing converters like `<int:number>` to know it should convert that part of the URL to a Python integer before passing it.

### Discard the throwaway
This URL map introspection snippet is discarded and will not appear in the project again.

### Mechanical walkthrough
1. `@app.route('/')`: Calls the `route` method on the `app` instance. This acts as a decorator, modifying the function directly below it by registering it in Flask's URL routing table.
2. `def index():`: Defines a standard Python function named `index`. Flask refers to this function name as the endpoint name.
3. `return '<h1>Welcome!</h1>'`: Returns a simple string. Flask automatically wraps returned strings into a complete HTTP 200 OK response.
4. `@app.route('/hello/<name>')`: Registers a route containing a dynamic variable named `<name>`. Flask extracts this segment of the URL path and passes it as a keyword argument to the function.
5. `def hello(name):`: Accepts the `name` argument extracted from the URL.
6. `@app.route('/add/<int:a>/<int:b>')`: Registers a route with two variables, applying the `int` route converter to both. Flask will automatically convert the string fragments in the URL into Python integers. If the fragments are not valid integers, Flask returns a 404 error instead of calling the function.
7. `def add(a, b):`: Accepts the two integer arguments.

### CS lens
Routing implements the **Dispatcher** pattern. Also recognized in: event listeners in UI frameworks routing clicks to handlers, CPU interrupt vector tables mapping signals to service routines, RPC frameworks mapping message IDs to functions, and file systems routing virtual paths to physical device drivers.

### SE lens
Using decorators to register routes directly above the function. The alternative not chosen was requiring the developer to maintain a separate, centralized routing list in another file. The tradeoff is coupling routing configuration tightly to the view logic, sacrificing a single-glance overview of all routes to gain immense locality — you never have to read two separate files to know what a function handles.

### Commands needed
None.

### Run it
The application still does not start a server, so running it yields no output.

### One sentence connecting to previous unit
With our application able to route paths to functions, we need a way to distinguish between a browser just asking for a page and a browser submitting a form to that page.


## Concept Unit: HTTP methods — GET and POST on the same route
### The Problem
When a user visits a form page, they are requesting the form. When they click submit, they are sending data back to the application. Both actions happen on the same URL path.

If both viewing the form and submitting the form share the same URL, how does the application know which one the user is doing? How would you inspect the incoming request to change your function's behavior?

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are adding our first interactive form.
- **Files affected:** `app.py`.
- **Change type:** Add.
- **Location:** Below the existing routes.
- **Dependencies:** `request` must be imported from `flask`.

### The New Code
```python
from flask import Flask, request

@app.route('/form', methods=['GET', 'POST'])
def form():
    if request.method == 'GET':
        return '''
            <form method="POST" action="/form">
                <input name="username" placeholder="Your name">
                <button>Submit</button>
            </form>'''
    
    username = request.form.get('username', '').strip()
    if not username:
        return '<p style="color:red">Name is required.</p>', 400
    
    return f'<h1>Hello, {username}!</h1>'
```

### The Updated Project
```python
# ← new
1: from flask import Flask, request
  app = Flask(__name__)
  
  @app.route('/')
  def index():
      return '<h1>Welcome!</h1>'

# ... existing routes ...

# ← new
16: @app.route('/form', methods=['GET', 'POST'])
17: def form():
18:     if request.method == 'GET':
19:         return '''
20:             <form method="POST" action="/form">
21:                 <input name="username" placeholder="Your name">
22:                 <button>Submit</button>
23:             </form>'''
24:     
25:     username = request.form.get('username', '').strip()
26:     if not username:
27:         return '<p style="color:red">Name is required.</p>', 400
28:     
29:     return f'<h1>Hello, {username}!</h1>'
```
This adds a new view function that serves an HTML form on GET, and processes the submitted data on POST.

### Introduce the concept in isolation
```python
from flask import Flask, request

app = Flask(__name__)

@app.route('/inspect', methods=['POST'])
def inspect():
    return f"Received a {request.method} with keys: {list(request.form.keys())}"
```
Predicted output stated from confidence, not executed:
```text
(When simulated with a POST request containing 'foo=bar')
Received a POST with keys: ['foo']
```
This demonstrates the global proxy **`request`** and **HTTP methods**. Flask exposes the `request` object globally, but guarantees it correctly reflects the specific HTTP request the current thread is handling, allowing you to check the `.method` property and access the submitted `.form` data.

### Discard the throwaway
This inspect-only route is discarded and will not appear in the project again.

### Mechanical walkthrough
1. `methods=['GET', 'POST']`: Passes a keyword argument to `@app.route`. By default, routes only accept GET requests; this explicitly tells Flask to also route POST requests to this function.
2. `if request.method == 'GET':`: Checks the `method` string on the `request` proxy. If the browser is just loading the page, it evaluates to true.
3. `request.form.get('username', '')`: Accesses `request.form`, an immutable dictionary containing the parsed POST body data. We call `.get()` to safely extract the 'username' key, defaulting to an empty string if the user submitted without it.
4. `.strip()`: Removes leading and trailing whitespace from the string.
5. `return '<p...', 400`: Returns a tuple containing the string body and the integer 400. Flask automatically unpacks this tuple to set the HTTP status code of the response to 400 (Bad Request), signaling a validation error to the browser.

### CS lens
The `request` object implements the **Context-Local Proxy** pattern. Also recognized in: Thread-local storage in concurrent systems, CPU core-local register access, current-transaction locators in ORMs, and dependency injection containers scoping singletons to the lifetime of an HTTP request.

### SE lens
Exposing the request as a global import rather than passing it explicitly as an argument to every view function. The alternative not chosen was injecting it into the function signature like `def form(request):`. The tradeoff makes the function signature cleaner and decoupled from framework scaffolding, but introduces implicit magic: importing a global object that mysteriously holds thread-specific data, making it slightly harder to write isolated unit tests without mocking the context.

### Commands needed
None.

### Run it
The application routes are defined, but there is still no server running to accept traffic.

### One sentence connecting to previous unit
With routes that can respond to input, we finally need to start a local server so we can visit these pages in a browser.


## Concept Unit: Debug mode and auto-reload
### The Problem
Writing code is an iterative process. If we have to manually stop and restart our Python script every time we change a line of code, the friction will drastically slow down our momentum.

How would you expect a development environment to alleviate this? If the server is running, how could it safely adopt your new code without losing connection? Take a moment to guess how the built-in server handles code changes.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition.
- **Files affected:** `app.py`.
- **Change type:** Add.
- **Location:** At the very bottom of the file.
- **Dependencies:** None.

### The New Code
```python
if __name__ == '__main__':
    app.run(
        host='127.0.0.1',
        port=5000,
        debug=True
    )
```

### The Updated Project
```python
  # ... existing routes ...

# ← new
32: if __name__ == '__main__':
33:     app.run(
34:         host='127.0.0.1',
35:         port=5000,
36:         debug=True
37:     )
```
This starts the development server, binding it to the local machine on port 5000, with debug mode enabled.

### Introduce the concept in isolation
```python
from flask import Flask
app = Flask(__name__)

if __name__ == '__main__':
    app.run(debug=True)
```
Predicted output stated from confidence, not executed (startup behavior is deterministic):
```text
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:5000
 * Restarting with stat
 * Debugger is active!
```
This enables **auto-reload** and the Werkzeug interactive debugger. Setting `debug=True` tells Werkzeug to launch a secondary watcher process that monitors your Python files using `stat()`. When it detects a change, it automatically sends a signal to restart the worker process.

### Discard the throwaway
This isolated runner is conceptually identical to our project code, but the minimal wrapper is discarded.

### Mechanical walkthrough
1. `if __name__ == '__main__':`: A standard Python guard. This block only executes if the script is run directly via `python app.py`. It prevents the server from starting if the file is imported by another script (like a test runner).
2. `app.run(...)`: Calls the `run` method on the Flask application instance, starting the Werkzeug WSGI server. This is a blocking call that holds the main thread open indefinitely.
3. `host='127.0.0.1'`: Binds the server specifically to localhost, preventing external machines on the same network from accessing the dev server.
4. `port=5000`: Instructs the server to listen on TCP port 5000.
5. `debug=True`: Enables the interactive debugger and auto-reloader. If your code throws an unhandled exception, the browser will display an HTML traceback with a pin-protected interactive Python console for each frame. This is incredibly dangerous in production (it allows arbitrary remote code execution) and must strictly be turned off when deployed.

### CS lens
The auto-reloader implements the **File System Poller / Watcher** pattern. Also recognized in: Webpack and Vite frontend build tools, hot-module-replacement (HMR) systems in React, automatic configuration reloaders in proxies like NGINX or Envoy, and backup software detecting modified files.

### SE lens
Using an embedded development server instead of requiring a separate web server installation. The alternative not chosen was configuring a real production server (like Apache or Gunicorn) locally just to see the app. The tradeoff accepts that the built-in server is single-threaded and not secure or robust enough for production traffic, gaining immediate out-of-the-box utility with zero system-level configuration required.

### Commands needed
`Run: python app.py`: Executes the script directly, satisfying the `__name__ == '__main__'` guard and launching the server. You can stop it in the terminal using `Ctrl+C`.

### Run it
The server now stays running and watches for changes.
```text
 * Serving Flask app 'app'
 * Debug mode: on
 * WARNING: This is a development server. Do not use it in a production deployment.
 * Running on http://127.0.0.1:5000
 * Restarting with stat
 * Debugger is active!
```

### One sentence connecting to previous unit
With the server running and auto-reloading our code, we can now rapidly configure global application behavior and link our pages together dynamically.


## Concept Unit: Flask app configuration and url_for
### The Problem
Hardcoding URLs (like writing `<a href="/about">`) works initially, but becomes a maintenance nightmare if we ever decide to rename `/about` to `/about-us` — we would have to hunt down and update every single link across our application. We also need a central place to store global settings like maximum upload sizes or secret keys.

If URL paths change, how do you keep your links from breaking? Take a moment to think about what abstraction you would introduce to decouple the intent of a link from its literal path.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition.
- **Files affected:** `app.py`.
- **Change type:** Add.
- **Location:** Below the `app` initialization, and adding new routes before the runner.
- **Dependencies:** `url_for` and `redirect` must be imported from `flask`.

### The New Code
```python
from flask import Flask, request, url_for, redirect

# Add config below app = Flask(__name__)
app.config['SECRET_KEY'] = 'dev-secret-change-in-production'
app.config['DEBUG'] = False
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

@app.route('/about')
def about():
    return '<h1>About</h1>'

@app.route('/old')
def old_page():
    target = url_for('about')
    return redirect(target)
```

### The Updated Project
```python
1:  from flask import Flask, request, url_for, redirect
2:  app = Flask(__name__)
3:  
# ← new
4:  app.config['SECRET_KEY'] = 'dev-secret-change-in-production'
5:  app.config['DEBUG'] = False
6:  app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max
7:  
8:  @app.route('/')
# ... existing routes ...

# ← new
32: @app.route('/about')
33: def about():
34:     return '<h1>About</h1>'
35: 
36: @app.route('/old')
37: def old_page():
38:     target = url_for('about')
39:     return redirect(target)
40:
41: if __name__ == '__main__':
```
We configure global application variables via `app.config`, and use `url_for` to generate URLs based on endpoint names instead of hardcoded paths.

### Introduce the concept in isolation
```python
from flask import Flask, url_for
app = Flask(__name__)

@app.route('/profile/<username>')
def profile(username):
    pass

with app.test_request_context():
    print("Generated URL:", url_for('profile', username='Alice'))
```
Predicted output stated from confidence, not executed:
```text
Generated URL: /profile/Alice
```
This demonstrates the `url_for` utility. By passing the name of the function (`'profile'`) and any required variables, `url_for` consults the application's route map and computes the correct absolute path, saving us from manually concatenating strings.

### Discard the throwaway
This manual request context exploration is discarded and will not appear in the project again.

### Mechanical walkthrough
1. `app.config['SECRET_KEY'] = '...'`: Accesses the `config` dictionary on the application instance. We assign string constants and limits. Flask and its extensions read these predefined keys to adjust behavior.
2. `def about():`: Defines a new endpoint named `about`.
3. `target = url_for('about')`: Calls the `url_for` framework helper, asking it to look up the endpoint named `'about'`. It returns the string `'/about'`. If we ever alter the `@app.route` above the `about` function, this call will instantly generate the new correct path.
4. `return redirect(target)`: Calls the `redirect` helper with the generated target string. This function returns an HTTP response with a 302 status code and a `Location` header, instructing the browser to automatically load the new URL.

### CS lens
`url_for` implements **Reverse Routing**. Also recognized in: Django URL reversing, ASP.NET Core URL generation, Ruby on Rails path helpers, and DNS reverse lookups mapping IP addresses back to domain names.

### SE lens
Using an endpoint name to generate URLs instead of string literals. The alternative not chosen was directly writing `return redirect('/about')`. The tradeoff is a slight performance overhead resolving the name through the internal map, paying a microscopic runtime cost to ensure that links and redirects are strictly coupled to the application's true route definitions, guaranteeing they never silently drift out of sync.

### Commands needed
None.

### Run it
If the server is running, navigating to `http://127.0.0.1:5000/old` will automatically change the browser's address bar and display the content for the `about` page.

### One sentence connecting to previous unit
By configuring our app and resolving routes dynamically, our Flask application is now structurally sound and ready to serve robust templates.


## Closing
### Connect the pieces
When a browser makes a GET request to `/old`, Flask's internal WSGI server receives the request and consults `app.url_map`. It maps the path to the `old_page()` view function. Inside that function, `url_for('about')` performs a reverse route lookup, finding that the `about` endpoint maps to `/about`, and dynamically generates that string. The `redirect()` helper takes that generated string and builds a 302 HTTP response. Flask returns this to the browser, which immediately makes a second GET request to the new `/about` location, landing perfectly on our new page. Through all of this, the `app.config` values sit cleanly initialized, and Werkzeug's `debug=True` reloader stands guard watching the file for any future saves.
