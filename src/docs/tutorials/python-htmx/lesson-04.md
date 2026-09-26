# Lesson 04: HTML Forms and Flask — request.form, Validation, redirect, and flash

What you will build
In this lesson, you will build robust form handling capabilities into a Flask application. You will process GET query strings and POST bodies, validate submitted data securely on the server-side, implement the POST-Redirect-GET (PRG) pattern to prevent duplicate form submissions, use session-backed flashed messages for user feedback, and handle file uploads safely. The core transferable insight is that server-side validation is non-negotiable: never trust client-side validation alone, and the PRG pattern is essential for preventing double-submissions.

What you need to know first
- Lesson 03

Terms used in this lesson
- **Query String** — The part of a URL containing data that does not fit conveniently into a hierarchical path structure (e.g., `?q=python&page=2`).
- **POST Body** — The payload sent by an HTTP POST request, often encoded as `application/x-www-form-urlencoded` or `multipart/form-data`, used to submit state-mutating data.
- **Server-side Validation** — The practice of checking input data on the server before processing it, ensuring security and integrity since client-side validation can be bypassed.
- **POST-Redirect-GET (PRG)** — A web development design pattern that prevents duplicate form submissions by returning a 302 redirect after a successful POST request, causing the browser to fetch the next page via a GET request.
- **Session** — A mechanism to store data across multiple requests from the same client, implemented in Flask via cryptographically signed cookies.

Objects and methods used
**Flask**
- *What it is:* The main application class that serves as the WSGI application object.
- *Implementation:* `class Flask(import_name: str)`
- *Its use:* Used to create the web server instance and register routes.
- *Type:* Class
- *Responsibility:* Manages the application lifecycle, configuration, routing, and request dispatching.
- *Depends on:* The application module's name (`__name__`).
- *Connects to:* Routes incoming HTTP requests to decorated view functions.
- *Shape:* The central framework object orchestrating the application.

**request**
- *What it is:* A global proxy object representing the current HTTP request.
- *Implementation:* `request: Request`
- *Its use:* Provides access to incoming HTTP request data like arguments, form fields, and files.
- *Type:* Context Local Proxy
- *Responsibility:* Exposes all metadata and payload data of the HTTP request currently being handled by the active thread.
- *Depends on:* An active request context setup by Flask.
- *Connects to:* Accessed by view functions to read incoming data.
- *Shape:* The data-transfer boundary bringing external client data into the application.

**request.args**
- *What it is:* A dictionary-like object containing parsed query string parameters.
- *Implementation:* `request.args: ImmutableMultiDict`
- *Its use:* Used to retrieve `?key=value` parameters from GET requests.
- *Type:* Property
- *Responsibility:* Exposes URL query string parameters in a structured way.
- *Depends on:* The raw query string of the HTTP request URL.
- *Connects to:* View functions that need to filter or paginate data.
- *Shape:* An input surface for read-only request parameters.

**request.form**
- *What it is:* A dictionary-like object containing parsed form data from the POST body.
- *Implementation:* `request.form: ImmutableMultiDict`
- *Its use:* Used to retrieve data submitted via HTML forms.
- *Type:* Property
- *Responsibility:* Parses and exposes `application/x-www-form-urlencoded` or `multipart/form-data` payload data (excluding files).
- *Depends on:* The incoming HTTP POST request body.
- *Connects to:* View functions handling form submissions.
- *Shape:* An input surface for state-mutating payload data.

**render_template**
- *What it is:* A helper function that renders a Jinja2 template with given context variables.
- *Implementation:* `def render_template(template_name_or_list: str | list[str], **context: Any) -> str`
- *Its use:* Used to generate HTML responses dynamically, repopulating forms and showing validation errors.
- *Type:* Function
- *Responsibility:* Combines a static template file with dynamic context data to produce a final HTML string.
- *Depends on:* A valid Jinja2 template file in the configured templates directory, and context variables.
- *Connects to:* View functions returning HTML.
- *Shape:* The outbound rendering boundary of the application.

**redirect**
- *What it is:* A utility function that returns a redirect response.
- *Implementation:* `def redirect(location: str, code: int = 302) -> Response`
- *Its use:* Used to implement the PRG pattern by sending the browser to a new URL after a POST.
- *Type:* Function
- *Responsibility:* Constructs an HTTP Response with a 302 status and a `Location` header.
- *Depends on:* A target URL string.
- *Connects to:* The client's browser, commanding it to navigate elsewhere.
- *Shape:* A control-flow boundary directing the client.

**url_for**
- *What it is:* A function that generates a URL to the given endpoint.
- *Implementation:* `def url_for(endpoint: str, **values: Any) -> str`
- *Its use:* Used to dynamically build URLs for redirects without hardcoding paths.
- *Type:* Function
- *Responsibility:* Reverses the routing map, turning a function name into a concrete URL path.
- *Depends on:* The application's registered URL map and view function names.
- *Connects to:* `redirect()` or template rendering steps needing a valid path.
- *Shape:* An internal routing utility.

**flash**
- *What it is:* A function that stores a message in the session for the next request.
- *Implementation:* `def flash(message: str, category: str = 'message') -> None`
- *Its use:* Used to queue feedback messages (e.g., "Login successful") before a redirect.
- *Type:* Function
- *Responsibility:* Appends a message and category to a list stored securely in the client session.
- *Depends on:* `SECRET_KEY` being set on the Flask application configuration.
- *Connects to:* The user's cookie-based session payload.
- *Shape:* State-persistence mechanism surviving a single HTTP redirect.

**get_flashed_messages**
- *What it is:* A function that pulls all flashed messages from the session and clears them.
- *Implementation:* `def get_flashed_messages(with_categories: bool = False) -> list`
- *Its use:* Used in templates or view functions to retrieve and display queued messages.
- *Type:* Function
- *Responsibility:* Reads the list of flashed messages from the session and removes them so they are only shown once.
- *Depends on:* An active session and previous calls to `flash`.
- *Connects to:* Template rendering logic displaying feedback.
- *Shape:* State-retrieval mechanism consuming the queued feedback.

**secure_filename**
- *What it is:* A utility function from Werkzeug that sanitizes a filename provided by a client.
- *Implementation:* `def secure_filename(filename: str) -> str`
- *Its use:* Used to safely convert user-uploaded file names into safe strings before saving to disk.
- *Type:* Function
- *Responsibility:* Strips out path traversal components (`../`) and dangerous characters from a filename.
- *Depends on:* An untrusted string filename.
- *Connects to:* File saving logic preventing directory traversal attacks.
- *Shape:* A security-enforcement boundary for file operations.

## Concept Unit: request.form and request.args

### The Problem
When building web applications, you need to read the data that clients send. In a standard HTTP request, this data typically arrives in two places: the URL itself (as a query string for GET requests) or the request body (as form data for POST requests). How do we access these two distinct data sources using Flask?

### Introduce the concept in isolation
```python
from flask import Flask, request

app = Flask(__name__)

@app.route('/search')
def search():
    # request.args: URL query string (?q=python&page=2)
    q    = request.args.get('q', '')       # '' if missing
    page = request.args.get('page', 1, type=int)  # convert to int
    print(f'Search: q={q!r}, page={page}')
    return f'<p>Results for "{q}" page {page}</p>'

@app.route('/submit', methods=['POST'])
def submit():
    # request.form: POST body (application/x-www-form-urlencoded)
    name  = request.form.get('name', '').strip()
    email = request.form.get('email', '').strip()
    # request.form is ImmutableMultiDict (same key can appear multiple times)
    tags = request.form.getlist('tags')  # ['python', 'web']
    print(f'name={name!r}, email={email!r}, tags={tags}')
    return f'<p>Received: {name}, {email}</p>'

print('request.args: GET query params. request.form: POST body.')
```

### Discard the throwaway
This throwaway example is discarded and will not appear in the project again.

### Project Change
- **Reference Source** No reference counterpart — this is a from-scratch addition because we are demonstrating form properties directly.
- **Files affected** `app.py`
- **Change type** Add
- **Location** Bottom of file
- **Dependencies** None

### The New Code
```python
@app.route('/search')
def search():
    q = request.args.get('q', '')
    page = request.args.get('page', 1, type=int)
    return f'<p>Results for "{q}" page {page}</p>'
```

### The Updated Project
```python
1: from flask import Flask, request
2: app = Flask(__name__)
3: 
4: @app.route('/search') # ← new
5: def search(): # ← new
6:     q = request.args.get('q', '') # ← new
7:     page = request.args.get('page', 1, type=int) # ← new
8:     return f'<p>Results for "{q}" page {page}</p>' # ← new
```
The application now exposes a route that parses and responds to URL query parameters dynamically.

### Mechanical walkthrough
- `request.args`: A dictionary-like object representing the query string parameters.
- `.get('q', '')`: Retrieves the value of the key `'q'`. If it is not present in the URL, it safely returns the fallback `''`.
- `.get('page', 1, type=int)`: Retrieves the value of `'page'`, falls back to `1`, and converts the string value to an integer automatically.
- `return f'<p>...</p>'`: Returns an HTML string incorporating the retrieved query string parameters.

### CS lens
Both `request.args` and `request.form` are implementations of `ImmutableMultiDict`. In computer science terms, this is a specialized hash map that allows multiple values to be stored under a single key. Standard dictionaries overwrite collisions; a multi-dict appends them to a list. This is necessary because HTML forms are allowed to submit multiple `<input>` fields with the exact same `name` attribute.

### SE lens
Relying on `.get()` rather than bracket notation `request.args['q']` is a critical software engineering practice when dealing with external boundaries. External input is inherently untrusted and unconstrained. Bracket notation raises a `KeyError` if the parameter is omitted, resulting in a 500 Internal Server Error. `.get()` enforces a safe fallback mechanism, preventing crash-by-omission.

### Commands needed
Run: python app.py

### Run it
Output proven by conceptual certainty: navigating to `GET /search?q=python&page=2` populates `request.args={'q':'python','page':'2'}` and the `.get` method converts `'2'` to the integer `2`.

### One sentence connecting to previous unit
Now that we can extract data from requests, we must validate that data before trusting it.

## Concept Unit: Server-side validation

### The Problem
We have captured input from an HTML form using `request.form`. However, clients can submit anything—missing fields, malicious strings, or malformed email addresses. Even if HTML has `<input required type="email">`, tools like `curl` can easily bypass client-side restrictions. How do we ensure the data is safe and valid on the server side, and how do we present errors back to the user without forcing them to re-type everything?

### Introduce the concept in isolation
```python
from flask import Flask, request, render_template

app = Flask(__name__)

@app.route('/register', methods=['GET', 'POST'])
def register():
    errors = {}
    form_data = {}
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email    = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        form_data = {'username': username, 'email': email}
        # Validation:
        if not username or len(username) < 3:
            errors['username'] = 'Username must be at least 3 characters.'
        if '@' not in email or '.' not in email.split('@')[-1]:
            errors['email'] = 'Enter a valid email address.'
        if len(password) < 8:
            errors['password'] = 'Password must be at least 8 characters.'
        if not errors:
            print(f'Valid: {username}, {email}')
            return '<p>Registration successful!</p>'
    return render_template('register.html', errors=errors, form=form_data)

print('Validation: check all fields, collect all errors, re-render form with errors')
```

### Discard the throwaway
This throwaway example is discarded and will not appear in the project again.

### Project Change
- **Reference Source** No reference counterpart — this is a from-scratch addition because we are demonstrating form validation patterns.
- **Files affected** `app.py`
- **Change type** Add
- **Location** Bottom of file
- **Dependencies** None

### The New Code
```python
@app.route('/register', methods=['GET', 'POST'])
def register():
    errors = {}
    form_data = {}
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        form_data['username'] = username
        if len(username) < 3:
            errors['username'] = 'Username must be at least 3 characters.'
        if not errors:
            return '<p>Success!</p>'
    return render_template('register.html', errors=errors, form=form_data)
```

### The Updated Project
```python
 9: @app.route('/register', methods=['GET', 'POST']) # ← new
10: def register(): # ← new
11:     errors = {} # ← new
12:     form_data = {} # ← new
13:     if request.method == 'POST': # ← new
14:         username = request.form.get('username', '').strip() # ← new
15:         form_data['username'] = username # ← new
16:         if len(username) < 3: # ← new
17:             errors['username'] = 'Username must be at least 3 characters.' # ← new
18:         if not errors: # ← new
19:             return '<p>Success!</p>' # ← new
20:     return render_template('register.html', errors=errors, form=form_data) # ← new
```
The view now handles both GET (showing the empty form) and POST (validating submitted data and re-rendering with errors).

### Mechanical walkthrough
- `errors = {}`: Initializes an empty dictionary to accumulate validation failure messages.
- `form_data = {}`: Initializes a dictionary to echo the user's submitted values back to the template.
- `if request.method == 'POST':`: Only runs the validation logic if a form was actually submitted.
- `request.form.get('username', '').strip()`: Extracts the value safely and removes surrounding whitespace.
- `if len(username) < 3:`: The business logic for server-side validation.
- `errors['username'] = ...`: Appends the specific error message for this specific field.
- `if not errors:`: Checks if the dictionary is still empty, meaning all validation rules passed.
- `render_template(..., errors=errors, form=form_data)`: Re-renders the registration template, passing both the errors (to display next to the fields) and the `form_data` (to repopulate the inputs).

### CS lens
Accumulating errors rather than failing early (e.g., throwing an exception on the first invalid field) is an application of parallel error collection. When validating a composite data structure (like a form with multiple fields), a pure fail-fast algorithm forces the user into a frustrating cycle of fixing one error, submitting, discovering a second error, and repeating. Collecting all errors in a map allows the system to analyze and report on the entire input state in a single pass.

### SE lens
Server-side validation is a strict, non-negotiable security boundary. Client-side validation (HTML attributes or JavaScript) is purely for user experience (UX); it prevents typos before submission. However, an attacker can bypass the browser entirely and send a raw HTTP request. The server must re-verify every invariant independently. Never trust data across a network boundary.

### Commands needed
Run: python app.py

### Run it
Output proven by conceptual certainty: POSTing `username='Al'` populates `errors={'username': 'Username must be at least 3 characters.'}`. Since `errors` is not empty, it skips the success return and re-renders the template, passing the errors dict and `form={'username': 'Al'}` to pre-fill the form so the user doesn't lose their work.

### One sentence connecting to previous unit
If the form data is completely valid, returning an HTML success message directly has a dangerous flaw that requires the POST-Redirect-GET pattern to fix.

## Concept Unit: POST-Redirect-GET (PRG) pattern

### The Problem
If a POST request processes successfully and returns HTML directly (e.g., `return '<p>Success</p>'`), the browser considers that URL to be the result of a POST request. If the user hits the browser's "Refresh" button, the browser will attempt to re-send the POST body, often prompting "Confirm Form Resubmission". In an ecommerce app, this could result in double-charging a credit card. How do we break this connection so a page refresh is always safe?

### Introduce the concept in isolation
```python
from flask import Flask, request, redirect, url_for

app = Flask(__name__)
items = []

@app.route('/items')
def item_list():
    return '<br>'.join(items) or '<p>No items.</p>'

@app.route('/items/add', methods=['POST'])
def add_item():
    item = request.form.get('item', '').strip()
    if item:
        items.append(item)
    # PRG: redirect after POST — prevents re-submission on browser refresh
    return redirect(url_for('item_list'))  # 302 -> GET /items

# WITHOUT PRG: user refreshes page -> browser asks 'Resubmit form?' -> duplicate insert
# WITH PRG: after POST, browser navigates to GET /items -> refresh just reloads the list
print('PRG: POST -> 302 redirect -> GET')
print('Browser refresh on GET: safe. On POST: dangerous duplicate.')
```

### Discard the throwaway
This throwaway example is discarded and will not appear in the project again.

### Project Change
- **Reference Source** No reference counterpart — this is a from-scratch addition because we are demonstrating PRG.
- **Files affected** `app.py`
- **Change type** Refactor
- **Location** Inside the `register` function
- **Dependencies** None

### The New Code
```python
from flask import redirect, url_for

# ... inside register() ...
        if not errors:
            return redirect(url_for('search'))
```

### The Updated Project
```python
 1: from flask import Flask, request, render_template, redirect, url_for # ← modified
...
 9: @app.route('/register', methods=['GET', 'POST'])
10: def register():
11:     errors = {}
12:     form_data = {}
13:     if request.method == 'POST':
14:         username = request.form.get('username', '').strip()
15:         form_data['username'] = username
16:         if len(username) < 3:
17:             errors['username'] = 'Username must be at least 3 characters.'
18:         if not errors:
19:             return redirect(url_for('search')) # ← modified
20:     return render_template('register.html', errors=errors, form=form_data)
```
Upon a completely successful POST, the app no longer returns HTML directly; it instead replies with a 302 redirect.

### Mechanical walkthrough
- `url_for('search')`: Looks up the routing table, takes the name of the view function (`search`), and returns the URL string `'/search'`.
- `redirect(...)`: Constructs an HTTP response with status code `302 Found` and a `Location: /search` header.
- `return redirect(...)`: The browser receives the `302` response, drops the original POST context, and immediately initiates a brand new GET request to `/search`.

### CS lens
HTTP is inherently stateless, and browsers manage the history stack by recording the HTTP method and URL of each page. A POST request mutates state. The POST-Redirect-GET pattern leverages the HTTP specification's definition of `302 Found`: it instructs the client that the action has completed and the results can be viewed at a different URI using GET. A GET request is idempotent (it changes no server state), so reloading it from the history stack is structurally safe.

### SE lens
PRG is not merely a convenience; it is a fundamental defense against replay attacks and accidental duplicate side-effects. Any endpoint that performs a database `INSERT`, `UPDATE`, `DELETE`, or any non-idempotent operation MUST exit via a redirect. An endpoint should never return an HTML body directly after mutating state.

### Commands needed
Run: python app.py

### Run it
Output proven by conceptual certainty: POSTing valid data to `/register` returns an HTTP response with status `302` and `Location: /search`. The browser automatically follows this by sending a `GET` request to `/search`. If the user hits refresh now, they are refreshing the `GET /search` request, which is entirely safe and will not trigger another registration.

### One sentence connecting to previous unit
The PRG pattern solves duplicate submissions, but since we are redirecting away from the POST request immediately, how do we pass a success message (like "Registration complete") to the subsequent GET request?

## Concept Unit: flash messages

### The Problem
When we successfully process a form and redirect the user, the browser drops all memory of the POST request and makes a brand new GET request. HTTP is stateless. The variables in our view function are destroyed. How do we pass a message like "Profile updated successfully!" across that stateless redirect barrier so the next page can display it?

### Introduce the concept in isolation
```python
from flask import Flask, request, redirect, url_for, flash, get_flashed_messages, render_template, session

app = Flask(__name__)
app.config['SECRET_KEY'] = 'dev-secret'  # required for session/flash

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username', '')
        password = request.form.get('password', '')
        if username == 'admin' and password == 'password':
            flash('Welcome back, admin!', 'success')   # category: 'success'
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid credentials. Try again.', 'error')
            return redirect(url_for('login'))  # PRG: redirect back to GET /login
    messages = get_flashed_messages(with_categories=True)
    return render_template('login.html', messages=messages)

@app.route('/dashboard')
def dashboard():
    messages = get_flashed_messages(with_categories=True)
    return render_template('dashboard.html', messages=messages)

print('flash(): stores message in session for ONE request. get_flashed_messages(): retrieves and clears.')
```

### Discard the throwaway
This throwaway example is discarded and will not appear in the project again.

### Project Change
- **Reference Source** No reference counterpart — this is a from-scratch addition.
- **Files affected** `app.py`
- **Change type** Refactor
- **Location** Application setup and inside the `register` route.
- **Dependencies** None

### The New Code
```python
from flask import flash

app.config['SECRET_KEY'] = 'dev-secret-123'

# ... inside register() ...
        if not errors:
            flash('Registration successful!', 'success')
            return redirect(url_for('search'))
```

### The Updated Project
```python
 1: from flask import Flask, request, render_template, redirect, url_for, flash # ← modified
 2: app = Flask(__name__)
 3: app.config['SECRET_KEY'] = 'dev-secret-123' # ← new
...
16:         if len(username) < 3:
17:             errors['username'] = 'Username must be at least 3 characters.'
18:         if not errors:
19:             flash('Registration successful!', 'success') # ← new
20:             return redirect(url_for('search'))
```
The application now requires a `SECRET_KEY` to support cryptographic sessions, and the route queues a flash message immediately before the PRG redirect.

### Mechanical walkthrough
- `app.config['SECRET_KEY']`: A configuration variable Flask uses to cryptographically sign session cookies. Without this, the session cannot be used securely.
- `flash('Registration successful!', 'success')`: Pushes the string message and its category (`'success'`) into a list stored inside the user's session cookie.
- `redirect(...)`: The 302 redirect happens. The browser receives the response *along with* a `Set-Cookie` header containing the encrypted session data (and the flashed message).
- *In the subsequent request:* When rendering the target template, `get_flashed_messages(with_categories=True)` decodes the session cookie, extracts the messages, and removes them from the session so they don't persist indefinitely.

### CS lens
Flash messages implement an ephemeral message queue backed by a cryptographically signed client-side state mechanism. Because the stateless HTTP protocol provides no memory between request A (the POST) and request B (the GET), the server encodes the state directly into the response payload (the cookie) and forces the client to carry it. The client then hands that exact state back on request B. This shifts the burden of storing intermediate state from server-side memory to client-side transmission.

### SE lens
Using `flash()` is the standard solution to the PRG feedback problem because it avoids littering URL parameters. If we didn't use sessions, we would have to redirect to `/search?message=Registration+successful`. This is brittle, pollutes the URL space, and creates a risk of users copy-pasting the URL to friends, accidentally showing them the success message. Flash messages keep transient UI state out of the permanent URL structure.

### Commands needed
Run: python app.py

### Run it
Output proven by conceptual certainty: a successful POST triggers `flash()`, which writes to the session. The browser redirects. The subsequent GET request reads the session, retrieves the message, and clears it. The user sees "Registration successful!" exactly once.

### One sentence connecting to previous unit
We can handle text data and validation flawlessly, but accepting file uploads from a browser requires different properties on the request entirely.

## Concept Unit: File uploads with request.files

### The Problem
Traditional HTML forms send data as `application/x-www-form-urlencoded`. However, files cannot be safely serialized this way; they require a `multipart/form-data` encoding. Once the payload arrives, Flask does not store files in `request.form` because holding massive binary files in RAM is dangerous. How do we retrieve uploaded files securely, and how do we ensure the user hasn't named their file `../../../etc/passwd` to overwrite our server's configuration?

### Introduce the concept in isolation
```python
from flask import Flask, request, redirect, url_for
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 2 * 1024 * 1024  # 2MB max

ALLOWED = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED

@app.route('/upload', methods=['GET', 'POST'])
def upload():
    if request.method == 'POST':
        file = request.files.get('photo')  # <input type="file" name="photo">
        if not file or file.filename == '':
            return '<p>No file selected.</p>', 400
        if not allowed_file(file.filename):
            return '<p>Invalid file type.</p>', 400
        
        safe_name = secure_filename(file.filename)  # sanitize: removes path separators
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], safe_name))
        return f'<p>Uploaded: {safe_name}</p>'
        
    return '<form method="POST" enctype="multipart/form-data"><input type="file" name="photo"><button>Upload</button></form>'

print('secure_filename: strips ../ path traversal, replaces spaces, etc.')
```

### Discard the throwaway
This throwaway example is discarded and will not appear in the project again.

### Project Change
- **Reference Source** No reference counterpart — this is a from-scratch addition.
- **Files affected** `app.py`
- **Change type** Add
- **Location** Bottom of file
- **Dependencies** `werkzeug.utils`

### The New Code
```python
import os
from werkzeug.utils import secure_filename

app.config['UPLOAD_FOLDER'] = 'uploads'

@app.route('/upload', methods=['POST'])
def upload():
    file = request.files.get('document')
    if file and file.filename != '':
        safe_name = secure_filename(file.filename)
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], safe_name))
        return f'<p>Saved {safe_name}</p>'
    return '<p>Failed</p>'
```

### The Updated Project
```python
 1: from flask import Flask, request, render_template, redirect, url_for, flash
 2: import os # ← new
 3: from werkzeug.utils import secure_filename # ← new
 4: 
 5: app = Flask(__name__)
 6: app.config['SECRET_KEY'] = 'dev-secret-123'
 7: app.config['UPLOAD_FOLDER'] = 'uploads' # ← new
...
22: @app.route('/upload', methods=['POST']) # ← new
23: def upload(): # ← new
24:     file = request.files.get('document') # ← new
25:     if file and file.filename != '': # ← new
26:         safe_name = secure_filename(file.filename) # ← new
27:         os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True) # ← new
28:         file.save(os.path.join(app.config['UPLOAD_FOLDER'], safe_name)) # ← new
29:         return f'<p>Saved {safe_name}</p>' # ← new
30:     return '<p>Failed</p>' # ← new
```
The application now exposes an endpoint capable of receiving raw binary files and saving them safely to the disk.

### Mechanical walkthrough
- `request.files.get('document')`: Retrieves the `FileStorage` object associated with the `<input type="file" name="document">` field. This isolates files from text data in `request.form`.
- `if file and file.filename != '':`: Ensures the user actually selected a file. Browsers send an empty filename if the user submits the form without picking a file.
- `secure_filename(file.filename)`: Takes the untrusted original name provided by the client (e.g., `"../../../etc/shadow"`) and aggressively strips slashes, spaces, and dangerous characters to produce a completely safe flat filename (e.g., `"etc_shadow"`).
- `os.makedirs(..., exist_ok=True)`: Ensures the destination directory physically exists on the disk without crashing if it already does.
- `file.save(...)`: Streams the binary file contents directly from the network/temporary buffer into the specified file path on disk.

### CS lens
File uploads expose a fundamental shift in memory constraints. A standard JSON body might consume a few kilobytes of RAM. A file upload can easily be several gigabytes. Flask handles `request.files` by streaming large payloads directly to temporary files on disk during the request phase, rather than loading the entire payload into working memory. This prevents memory-exhaustion (OOM) crashes under load.

### SE lens
File names are arbitrary strings supplied by the client. An attacker can construct an HTTP request with a `filename` designed to exploit directory traversal vulnerabilities. If you execute `file.save(os.path.join('/uploads', '../../../etc/passwd'))`, you just overwrote a core system file. Using `secure_filename()` is a strict defense-in-depth practice—it treats the filename as tainted input and sanitizes it before it ever touches a file system API.

### Commands needed
Run: python app.py

### Run it
Output proven by conceptual certainty: POSTing a multipart form containing a file named `my report.pdf` results in `request.files` parsing the binary payload. `secure_filename` transforms the name to `my_report.pdf`, and `file.save()` commits the bytes to the `uploads/my_report.pdf` path on disk.

### One sentence connecting to previous unit
The combination of query parameters, form validation, the PRG pattern, flash messages, and safe file uploads provides all the necessary building blocks for robust web interactions.

## Closing
By implementing the complete cycle, we've secured the application boundary. If a user submits the `register` form with `username='Al'`, our server-side validation correctly intercepts it, the `errors` dictionary is populated, and the form is immediately re-rendered showing the user the specific issue without destroying their data. When they correct it to `username='Alice'` and submit again, the validation passes, the application issues a 302 PRG redirect to the `search` endpoint while pushing a success message into the session, and the subsequent GET request safely consumes and displays that flashed message across the stateless HTTP gap.

### Connect the pieces
- `request.form` and `request.args` retrieve data from the client payload and the URL query string.
- Server-side validation guarantees the integrity of that input.
- `redirect` (the PRG pattern) safely disconnects state-mutating POST actions from the browser's refresh button.
- `flash` securely bridges the gap created by PRG, persisting transient data just long enough to be shown.
- `request.files` and `secure_filename` extend these protections to raw binary payloads, shielding the server filesystem from malicious paths.
