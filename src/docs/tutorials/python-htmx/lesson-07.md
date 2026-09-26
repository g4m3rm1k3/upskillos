# Lesson 07: Form Validation with HTMX — Inline Errors, hx-trigger on Input, and 422 Responses

What you will build
You will build a registration form that validates user input in real-time by communicating with the server on blur events. By the end of this lesson, you will understand how to use HTMX to swap validation error messages into the DOM using the 422 Unprocessable Entity status code, handling both per-field validation and whole-form submissions without writing custom JavaScript.

What you need to know first
- Nothing.

Terms used in this lesson
- **HTMX** — A library that allows you to access modern browser features directly from HTML, using attributes. It simplifies the process of making AJAX requests and updating the DOM based on the server's response.
- **hx-post** — An HTMX attribute that issues a POST request to the specified URL when triggered. It is used to send data to the server for processing.
- **hx-target** — An HTMX attribute that specifies the CSS selector of the element to swap the response content into. It directs where the server's HTML response should be placed in the DOM.
- **hx-trigger** — An HTMX attribute that specifies the event that triggers the request. It controls when the interaction occurs, such as on a click, a keyup, or losing focus (blur).
- **hx-swap** — An HTMX attribute that dictates how the response should be inserted into the target element. Options include `innerHTML`, `outerHTML`, etc.
- **innerHTML** — A swap strategy in HTMX that replaces the inner contents of the target element with the response.
- **outerHTML** — A swap strategy in HTMX that replaces the entire target element with the response.
- **blur** — A DOM event that fires when an element loses focus, such as when a user tabs away from an input field.
- **hx-indicator** — An HTMX attribute that specifies an element to show while the request is in flight. It provides visual feedback for loading states.
- **htmx-indicator** — A CSS class used in conjunction with `hx-indicator` to style the loading element, typically hiding it by default and showing it during a request.
- **htmx-request** — A CSS class applied by HTMX to the element making the request and the indicator element while the request is in flight.
- **hx-disabled-elt** — An HTMX attribute that disables the specified element(s) while a request is in-flight, preventing double submissions.
- **422 Unprocessable Entity** — An HTTP status code indicating that the server understands the content type and syntax of the request, but was unable to process the contained instructions. In HTMX, non-2xx responses like 422 are still swapped into the target, making it ideal for validation errors.
- **204 No Content** — An HTTP status code indicating that the server successfully processed the request and is not returning any content. It is often used with client-side redirects.
- **HX-Redirect** — An HTTP response header interpreted by HTMX to perform a client-side redirect to the specified URL.
- **import** — A Python keyword used to bring in modules and packages into the current namespace so their code can be utilized.
- **def** — A Python keyword used to define a new function.
- **return** — A Python keyword used to exit a function and pass a value back to the caller.
- **if** — A Python keyword used to execute a block of code conditionally based on whether an expression evaluates to true.

Objects and methods used
- **Flask**
  - *What it is:* The core application class of the Flask web framework.
  - *Implementation:* `class Flask(import_name, ...)`
  - *Its use:* Used to initialize the web application and define routes.
  - *Type:* Class
  - *Responsibility:* Manages the application's configuration, routing, and request handling lifecycle.
  - *Depends on:* The application module's name (`__name__`).
  - *Connects to:* Routes defined via decorators (e.g., `@app.route`), incoming HTTP requests, and the WSGI server.
  - *Shape:* The central registry and entry point for the web application architecture.
- **request**
  - *What it is:* A global object in Flask that encapsulates the current HTTP request.
  - *Implementation:* `request` (an instance of `werkzeug.local.LocalProxy` pointing to `Request`)
  - *Its use:* Used to access form data submitted by the client during a POST request.
  - *Type:* Object (Context Local)
  - *Responsibility:* Provides access to request-specific data such as form parameters, headers, and cookies.
  - *Depends on:* An active request context established by Flask.
  - *Connects to:* Route handler functions that need to inspect the incoming request.
  - *Shape:* An API boundary exposing the client's HTTP request to the server-side logic.
- **request.form.get()**
  - *What it is:* A method to retrieve a specific field from the parsed form data.
  - *Implementation:* `def get(self, key, default=None, type=None)`
  - *Its use:* Used to safely extract user input (e.g., `username`, `email`) from the submitted form, providing a default value if the key is missing.
  - *Type:* Instance method
  - *Responsibility:* Looks up a key in the form data dictionary and returns its corresponding value.
  - *Depends on:* The parsed form data in the current request.
  - *Connects to:* The application logic that validates or processes the input.
  - *Shape:* An internal data retrieval utility.
- **render_template**
  - *What it is:* A Flask function that renders a Jinja2 template into a string.
  - *Implementation:* `def render_template(template_name_or_list, **context)`
  - *Its use:* Used to generate HTML responses by merging dynamic data (like error messages) with HTML templates.
  - *Type:* Function
  - *Responsibility:* Locates the specified template file, processes it with the provided context variables, and produces the final HTML string.
  - *Depends on:* The existence of the template file and the necessary context variables.
  - *Connects to:* Route handlers returning HTML and the Jinja2 templating engine.
  - *Shape:* A presentation layer function bridging server logic and HTML output.
- **make_response**
  - *What it is:* A Flask function that converts a return value into a full response object.
  - *Implementation:* `def make_response(*args)`
  - *Its use:* Used to construct a response when specific headers (like `HX-Redirect`) or status codes (like 204) need to be explicitly set.
  - *Type:* Function
  - *Responsibility:* Normalizes various types of return values into a standard `Response` object that Flask can send to the client.
  - *Depends on:* The body content and status code provided as arguments.
  - *Connects to:* Route handlers that need fine-grained control over the HTTP response.
  - *Shape:* A low-level utility for assembling HTTP responses.
- **strip()**
  - *What it is:* A Python string method to remove leading and trailing whitespace.
  - *Implementation:* `def strip(self, chars=None)`
  - *Its use:* Used to sanitize user input to prevent spaces from passing validation.
  - *Type:* Instance method
  - *Responsibility:* Returns a copy of the string with the specified leading and trailing characters removed.
  - *Depends on:* The string instance it is called on.
  - *Connects to:* Validation logic that relies on cleaned string data.
  - *Shape:* A data sanitization utility.
- **len()**
  - *What it is:* A Python built-in function that returns the number of items in an object.
  - *Implementation:* `def len(obj)`
  - *Its use:* Used to check if the length of the username or password meets minimum requirements.
  - *Type:* Built-in function
  - *Responsibility:* Computes and returns the integer length of a sequence or collection.
  - *Depends on:* The object passed to it.
  - *Connects to:* Conditional validation rules.
  - *Shape:* A standard data inspection function.
- **isalnum()**
  - *What it is:* A Python string method to check if all characters are alphanumeric.
  - *Implementation:* `def isalnum(self)`
  - *Its use:* Used to ensure the username contains only letters and numbers.
  - *Type:* Instance method
  - *Responsibility:* Returns True if all characters in the string are alphanumeric and there is at least one character, False otherwise.
  - *Depends on:* The string instance it is called on.
  - *Connects to:* Validation logic enforcing character restrictions.
  - *Shape:* A string inspection utility.
- **split()**
  - *What it is:* A Python string method that returns a list of words in the string, using a delimiter string.
  - *Implementation:* `def split(self, sep=None, maxsplit=-1)`
  - *Its use:* Used to separate the email address into local and domain parts to validate the domain structure.
  - *Type:* Instance method
  - *Responsibility:* Parses a string into a list of substrings split by the given delimiter.
  - *Depends on:* The string instance and the delimiter.
  - *Connects to:* Custom email validation logic.
  - *Shape:* A data parsing utility.
- **time.sleep()**
  - *What it is:* A Python function that suspends execution for the given number of seconds.
  - *Implementation:* `def sleep(secs)`
  - *Its use:* Used to artificially delay the server response to demonstrate HTMX loading indicators.
  - *Type:* Function
  - *Responsibility:* Blocks the calling thread for the specified duration.
  - *Depends on:* The number of seconds to sleep.
  - *Connects to:* The active request handling thread.
  - *Shape:* An execution control utility.

## Concept Unit: Inline error spans and per-field validation

### The Problem
When a user fills out a form, they often make mistakes. If they have to submit the entire form before finding out their username is too short, the experience is frustrating. How can we validate a single field and display an error immediately after the user finishes typing in it, without writing custom JavaScript?

### Introduce the concept in isolation
```html
<div class="field">
    <input type="text"
           name="username"
           hx-post="/validate/username"
           hx-target="#username-error"
           hx-trigger="blur"
           hx-swap="innerHTML">
    <span id="username-error" class="error"></span>
</div>
```
```python
from flask import Flask, request
app = Flask(__name__)

@app.route('/validate/username', methods=['POST'])
def validate_username():
    username = request.form.get('username', '').strip()
    if len(username) < 3:
        return '<span class="error">Min 3 chars.</span>', 422
    return '<span class="ok">✓</span>'

if __name__ == '__main__':
    app.run(port=5000)
```
Output of the isolated code when a user types "ab" and tabs away:
`POST /validate/username` with body `username=ab`. The server returns `<span class="error">Min 3 chars.</span>` with status `422`. HTMX swaps this into the `#username-error` span. This proves that HTMX will capture the `blur` event, send the specific field's data to the server, and swap the response into a targeted element even when the status code is a `422 Unprocessable Entity`.

### Discard the throwaway
This isolated validation code is deleted and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are demonstrating form validation patterns.
- **Files affected:** `app.py`, `templates/register.html`
- **Change type:** Add
- **Location:** At the end of `app.py`, and inside the `<body>` of `templates/register.html`.
- **Dependencies:** Flask and HTMX must be installed and included.

### The New Code
```html
<!-- templates/register.html -->
<form method="POST" action="/register">
    <div class="field">
        <label>Username</label>
        <input type="text"
               name="username"
               hx-post="/validate/username"
               hx-target="#username-error"
               hx-trigger="blur"
               hx-swap="innerHTML">
        <span id="username-error" class="error"></span>
    </div>
    <div class="field">
        <label>Email</label>
        <input type="email"
               name="email"
               hx-post="/validate/email"
               hx-target="#email-error"
               hx-trigger="blur"
               hx-swap="innerHTML">
        <span id="email-error" class="error"></span>
    </div>
    <button type="submit">Register</button>
</form>
```
```python
# app.py
from flask import Flask, request

app = Flask(__name__)

@app.route('/validate/username', methods=['POST'])
def validate_username():
    username = request.form.get('username', '').strip()
    if not username:
        return '<span class="error">Required.</span>', 422
    if len(username) < 3:
        return '<span class="error">Min 3 chars.</span>', 422
    if not username.isalnum():
        return '<span class="error">Letters/numbers only.</span>', 422
    return '<span class="ok">✓</span>'
```

### The Updated Project
```html
1: <!DOCTYPE html>
2: <html>
3: <head>
4:     <script src="https://unpkg.com/htmx.org@1.9.10"></script>
5:     <style>.error { color: red; } .ok { color: green; }</style>
6: </head>
7: <body>
8:     <!-- ← new: entire form added -->
9:     <form method="POST" action="/register">
10:        <div class="field">
11:            <label>Username</label>
12:            <input type="text"
13:                   name="username"
14:                   hx-post="/validate/username"
15:                   hx-target="#username-error"
16:                   hx-trigger="blur"
17:                   hx-swap="innerHTML">
18:            <span id="username-error" class="error"></span>
19:        </div>
20:        <div class="field">
21:            <label>Email</label>
22:            <input type="email"
23:                   name="email"
24:                   hx-post="/validate/email"
25:                   hx-target="#email-error"
26:                   hx-trigger="blur"
27:                   hx-swap="innerHTML">
28:            <span id="email-error" class="error"></span>
29:        </div>
30:        <button type="submit">Register</button>
31:    </form>
32: </body>
33: </html>
```
```python
1: # app.py
2: from flask import Flask, request
3:
4: app = Flask(__name__)
5:
6: # ← new: validation route added
7: @app.route('/validate/username', methods=['POST'])
8: def validate_username():
9:     username = request.form.get('username', '').strip()
10:    if not username:
11:        return '<span class="error">Required.</span>', 422
12:    if len(username) < 3:
13:        return '<span class="error">Min 3 chars.</span>', 422
14:    if not username.isalnum():
15:        return '<span class="error">Letters/numbers only.</span>', 422
16:    return '<span class="ok">✓</span>'
```
This sets up an HTML form where the username and email inputs independently send POST requests to their respective validation endpoints whenever they lose focus.

### Mechanical walkthrough
- `<form>` declares the form element with a `method` and `action` for standard submission.
- `<div class="field">` is a visual container for the input and its label.
- `<label>` describes the input field.
- `<input type="text" name="username">` creates a text input field named `username`.
- `hx-post="/validate/username"` instructs HTMX to make an HTTP POST request to `/validate/username` when triggered.
- `hx-target="#username-error"` tells HTMX to place the response inside the element with the ID `username-error`.
- `hx-trigger="blur"` specifies that the request should be made when the input element loses focus (the `blur` event).
- `hx-swap="innerHTML"` tells HTMX to replace the inner contents of the target element with the response.
- `<span id="username-error" class="error"></span>` is the target element where validation messages will be displayed.
- `@app.route('/validate/username', methods=['POST'])` maps POST requests for `/validate/username` to the `validate_username` function.
- `def validate_username():` defines the handler function.
- `username = request.form.get('username', '').strip()` extracts the `username` field from the incoming form data and removes leading/trailing whitespace.
- `if not username:` checks if the username is empty.
- `return '<span class="error">Required.</span>', 422` returns an HTML snippet indicating an error, along with the HTTP status code 422 (Unprocessable Entity).
- `if len(username) < 3:` checks if the username is shorter than 3 characters.
- `return '<span class="error">Min 3 chars.</span>', 422` returns the corresponding error snippet and a 422 status code.
- `if not username.isalnum():` checks if the username contains non-alphanumeric characters.
- `return '<span class="error">Letters/numbers only.</span>', 422` returns the corresponding error snippet and a 422 status code.
- `return '<span class="ok">✓</span>'` returns a success indicator with an implicit 200 OK status code if all checks pass.

### CS lens
In a traditional client-server architecture, form validation is either duplicated on the client (using JavaScript) for immediate feedback, or performed only on the server, requiring a full page reload to show errors. HTMX shifts this paradigm by enabling partial DOM updates driven by server state. The server remains the single source of truth for validation logic, while the client merely coordinates events (like `blur`) and DOM patching (swapping the response). This eliminates the need to synchronize validation logic across two different languages and execution environments.

### SE lens
Using the `422 Unprocessable Entity` status code is semantically correct for validation errors: the server understood the request format, but the data itself violated business rules. By default, HTMX still processes the response body of a `422` response and performs the configured swap. This means the server can communicate that an error occurred (useful for logging, testing, and other clients) while still providing the necessary HTML fragment to update the UI, without requiring custom error-handling callbacks in JavaScript.

### Commands needed
Run: python app.py

### Run it
Execute the application and navigate to the form. Type "ab" into the username field and press Tab to leave the field. The text "Min 3 chars." will immediately appear in red next to the input.

### One sentence connecting to previous unit
Now that we have per-field validation working for the username, we need to handle the email field and understand how HTMX manages different status codes.

## Concept Unit: Status code 422 and HTMX error handling

### The Problem
If the user inputs an invalid email, we want to show an error message inline. How do we ensure that HTMX handles success (200 OK) and failure (422 Unprocessable Entity) correctly, updating the UI appropriately in both scenarios without dropping the response?

### Introduce the concept in isolation
```python
from flask import Flask, request
app = Flask(__name__)

@app.route('/validate/email', methods=['POST'])
def validate_email():
    email = request.form.get('email', '').strip()
    if '@' not in email:
        return '<span class="error">Invalid.</span>', 422
    return '<span class="ok">✓</span>'

if __name__ == '__main__':
    app.run(port=5000)
```
Output of the isolated code when a user types "test" and tabs away:
The server returns `<span class="error">Invalid.</span>` with status `422`. HTMX swaps this into the target. If they type "test@test.com", it returns `<span class="ok">✓</span>` with status `200`, which is also swapped. This proves that HTMX treats `422` differently than a `500` server error; it assumes the 4xx client error (specifically 422) contains meaningful HTML to show the user.

### Discard the throwaway
This isolated route is deleted and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are demonstrating form validation patterns.
- **Files affected:** `app.py`
- **Change type:** Add
- **Location:** After the `validate_username` route in `app.py`.
- **Dependencies:** None.

### The New Code
```python
@app.route('/validate/email', methods=['POST'])
def validate_email():
    email = request.form.get('email', '').strip()
    if not email:
        return '<span class="error">Email required.</span>', 422
    if '@' not in email or '.' not in email.split('@')[-1]:
        return '<span class="error">Invalid email format.</span>', 422
    
    existing = ['alice@example.com', 'bob@example.com']
    if email in existing:
        return '<span class="error">Email already registered.</span>', 422
        
    return '<span class="ok">✓ Email available</span>'
```

### The Updated Project
```python
1: # app.py
2: from flask import Flask, request
3:
4: app = Flask(__name__)
5:
6: @app.route('/validate/username', methods=['POST'])
7: def validate_username():
8:     username = request.form.get('username', '').strip()
9:     if not username:
10:        return '<span class="error">Required.</span>', 422
11:    if len(username) < 3:
12:        return '<span class="error">Min 3 chars.</span>', 422
13:    if not username.isalnum():
14:        return '<span class="error">Letters/numbers only.</span>', 422
15:    return '<span class="ok">✓</span>'
16:
17: # ← new: email validation route added
18: @app.route('/validate/email', methods=['POST'])
19: def validate_email():
20:     email = request.form.get('email', '').strip()
21:     if not email:
22:         return '<span class="error">Email required.</span>', 422
23:     if '@' not in email or '.' not in email.split('@')[-1]:
24:         return '<span class="error">Invalid email format.</span>', 422
25:     
26:     existing = ['alice@example.com', 'bob@example.com']
27:     if email in existing:
28:         return '<span class="error">Email already registered.</span>', 422
29:         
30:     return '<span class="ok">✓ Email available</span>'
```
This adds the validation logic for the email field, checking format and simulating a database lookup for existing users.

### Mechanical walkthrough
- `@app.route('/validate/email', methods=['POST'])` maps POST requests for `/validate/email` to the `validate_email` function.
- `def validate_email():` defines the handler function.
- `email = request.form.get('email', '').strip()` extracts the `email` field from the incoming form data and sanitizes it.
- `if not email:` checks if the email is empty.
- `return '<span class="error">Email required.</span>', 422` returns an error fragment if empty.
- `if '@' not in email or '.' not in email.split('@')[-1]:` performs a basic format check for an `@` symbol and a domain extension by splitting the string.
- `return '<span class="error">Invalid email format.</span>', 422` returns an error fragment if the format is invalid.
- `existing = ['alice@example.com', 'bob@example.com']` creates a mock list of registered emails.
- `if email in existing:` checks if the requested email is in the list.
- `return '<span class="error">Email already registered.</span>', 422` returns an error fragment if the email is taken.
- `return '<span class="ok">✓ Email available</span>'` returns a success message if all checks pass.

### CS lens
Handling errors via HTTP status codes is fundamental to RESTful design. Traditional AJAX tools like `XMLHttpRequest` or `fetch` require explicit boilerplate to check `response.ok` or `response.status` before deciding whether to read the response body as data or throw an exception. HTMX recognizes that in a Hypermedia-Driven Application (HDA), the response *is* the UI state. Therefore, receiving a 422 means the server provided the UI state representing the validation failure, and swapping it in is the correct default action.

### SE lens
Relying on HTMX's default behavior for 4xx status codes reduces boilerplate. The backend developer simply returns the appropriate HTML fragment alongside the correct status code. The frontend requires no extra configuration to differentiate between a successful validation and a failed one—they both result in swapping the provided HTML into the target element. This unifies the success and failure code paths on the client.

### Commands needed
Run: python app.py

### Run it
Type "alice@example.com" into the email field and tab away. "Email already registered." will appear. Change it to "carol@example.com" and tab away. "✓ Email available" will appear, replacing the error message.

### One sentence connecting to previous unit
While validating individual fields as the user types is helpful, we also need to validate the entire form when they finally click the submit button.

## Concept Unit: Whole-form validation on submit

### The Problem
If a user bypasses the individual field checks or submits the form before triggering a `blur` event, the server must still validate the complete dataset. When validation fails, how do we return the entire form with all the user's data preserved and the error messages displayed, and how do we redirect the user if validation succeeds?

### Introduce the concept in isolation
```python
from flask import Flask, request, make_response
app = Flask(__name__)

@app.route('/register', methods=['POST'])
def register():
    username = request.form.get('username', '')
    if len(username) < 3:
        return '<div>Errors found!</div>', 422
    
    resp = make_response('', 204)
    resp.headers['HX-Redirect'] = '/dashboard'
    return resp

if __name__ == '__main__':
    app.run(port=5000)
```
Output of the isolated code when a user submits `username=ab`: The server returns `<div>Errors found!</div>` with status `422`. HTMX swaps this into the target. When submitting `username=abcd`: The server returns no content but sets the `HX-Redirect` header. This proves that HTMX intercepts the custom header and performs a client-side JavaScript redirect (`window.location = '/dashboard'`) without needing a traditional `302 Found` redirect.

### Discard the throwaway
This isolated route is deleted and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are demonstrating form validation patterns.
- **Files affected:** `app.py`, `templates/register.html`, `templates/fragments/register_form.html` (new file)
- **Change type:** Add/Refactor
- **Location:** Update `templates/register.html` to include a password field and use a fragment. Add the `/register` route to `app.py`.
- **Dependencies:** `render_template` and `make_response` from Flask.

### The New Code
```html
<!-- templates/fragments/register_form.html -->
<form id="register-form" hx-post="/register" hx-swap="outerHTML">
    <div class="field">
        <label>Username</label>
        <input type="text" name="username" value="{{ form.username if form }}">
        {% if errors and errors.username %}
            <span class="error">{{ errors.username }}</span>
        {% endif %}
    </div>
    <div class="field">
        <label>Email</label>
        <input type="email" name="email" value="{{ form.email if form }}">
        {% if errors and errors.email %}
            <span class="error">{{ errors.email }}</span>
        {% endif %}
    </div>
    <div class="field">
        <label>Password</label>
        <input type="password" name="password">
        {% if errors and errors.password %}
            <span class="error">{{ errors.password }}</span>
        {% endif %}
    </div>
    <button type="submit">Register</button>
</form>
```
```python
# app.py (additions)
from flask import render_template, make_response

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'GET':
        return render_template('register.html')
        
    username = request.form.get('username', '').strip()
    email    = request.form.get('email', '').strip()
    password = request.form.get('password', '')
    
    errors = {}
    if len(username) < 3:   errors['username'] = 'Min 3 characters.'
    if '@' not in email:    errors['email']    = 'Invalid email.'
    if len(password) < 8:   errors['password'] = 'Min 8 characters.'
    
    if errors:
        return render_template('fragments/register_form.html',
                               errors=errors,
                               form={'username': username, 'email': email}), 422
                               
    resp = make_response('', 204)
    resp.headers['HX-Redirect'] = '/dashboard'
    return resp
```

### The Updated Project
```html
1: <!-- templates/register.html -->
2: <!DOCTYPE html>
3: <html>
4: <head>
5:     <script src="https://unpkg.com/htmx.org@1.9.10"></script>
6:     <style>.error { color: red; } .ok { color: green; }</style>
7: </head>
8: <body>
9:     <!-- ← new: extracted form into a reusable fragment -->
10:    {% include 'fragments/register_form.html' %}
11: </body>
12: </html>
```
```python
1: # app.py
2: from flask import Flask, request, render_template, make_response
3:
4: app = Flask(__name__)
5:
6: # ... validate_username and validate_email routes unchanged ...
7:
8: # ← new: whole form submission route added
9: @app.route('/register', methods=['GET', 'POST'])
10: def register():
11:     if request.method == 'GET':
12:         return render_template('register.html')
13:         
14:     username = request.form.get('username', '').strip()
15:     email    = request.form.get('email', '').strip()
16:     password = request.form.get('password', '')
17:     
18:     errors = {}
19:     if len(username) < 3:   errors['username'] = 'Min 3 characters.'
20:     if '@' not in email:    errors['email']    = 'Invalid email.'
21:     if len(password) < 8:   errors['password'] = 'Min 8 characters.'
22:     
23:     if errors:
24:         return render_template('fragments/register_form.html',
25:                                errors=errors,
26:                                form={'username': username, 'email': email}), 422
27:                                
28:     resp = make_response('', 204)
29:     resp.headers['HX-Redirect'] = '/dashboard'
30:     return resp
```
This updates the form to submit its entirety via HTMX (`hx-post="/register"`). If validation fails, the server re-renders the form fragment, preserving input values and showing errors. If it succeeds, it commands the browser to redirect.

### Mechanical walkthrough
- `<form id="register-form" hx-post="/register" hx-swap="outerHTML">` configures the form to post to `/register` and replace itself entirely with the server response.
- `value="{{ form.username if form }}"` pre-fills the input with the submitted value if validation fails.
- `{% if errors and errors.username %}` conditionally renders an error span if the server passed a matching error message.
- `@app.route('/register', methods=['GET', 'POST'])` accepts both GET (initial render) and POST (submission) requests.
- `if request.method == 'GET': return render_template('register.html')` handles the initial page load.
- `errors = {}` initializes an empty dictionary to collect validation errors.
- `if len(username) < 3: errors['username'] = 'Min 3 characters.'` populates the errors dictionary if validation fails.
- `if errors:` checks if any errors were found.
- `return render_template('fragments/register_form.html', errors=errors, form={'username': username, 'email': email}), 422` re-renders only the form fragment, passing the errors and submitted values, and returns it with a 422 status code so HTMX replaces the existing form.
- `resp = make_response('', 204)` creates an empty HTTP response with status 204 (No Content).
- `resp.headers['HX-Redirect'] = '/dashboard'` sets the special HTMX header instructing the client library to redirect the window to `/dashboard`.
- `return resp` sends the response.

### CS lens
When rendering dynamic HTML, splitting UI into reusable fragments solves the problem of updating sub-components independently. Rather than reloading the whole page (traditional web) or sending JSON to a client-side template engine (SPA), the server renders exactly the sub-tree of the DOM that changed (the form) and sends it. This is Server-Side Rendering (SSR) applied at a granular level.

### SE lens
Using `HX-Redirect` is crucial when working with HTMX forms. If the server returned a standard HTTP `302 Found` redirect, the browser's XMLHttpRequest or fetch API would transparently follow the redirect, fetch the dashboard HTML, and HTMX would swap the entire dashboard into the form's location on the current page. By using `HX-Redirect` and a `204 No Content`, the backend explicitly tells the HTMX library to execute `window.location.href = '/dashboard'`, resulting in a full, clean page transition.

### Commands needed
Run: python app.py

### Run it
Load the page and submit an empty form. The form will blink, and errors will appear under each field. Fill in valid data and submit again. The browser will navigate to `/dashboard` (which will show a 404 since we haven't built it, proving the redirect worked).

### One sentence connecting to previous unit
Validation checks can take time, especially if they query a database, so we need a way to show the user that something is happening in the background.

## Concept Unit: hx-indicator — loading state during validation

### The Problem
If a server request takes a moment to process, the UI appears frozen. How do we provide visual feedback to the user that a request is currently inflight, without writing JavaScript to toggle CSS classes manually?

### Introduce the concept in isolation
```html
<button hx-post="/wait" hx-indicator="#spinner">Click Me</button>
<span id="spinner" class="htmx-indicator">Loading...</span>
<style>
    .htmx-indicator { display: none; }
    .htmx-request .htmx-indicator { display: inline; }
    .htmx-request.htmx-indicator { display: inline; }
</style>
```
Output of the isolated code when clicking the button: The button receives the `htmx-request` class. The `#spinner` receives the `htmx-request` class. Because of the CSS rules, the spinner becomes visible (`display: inline`). When the request finishes, the classes are removed, and the spinner hides again (`display: none`). This proves that HTMX manages the lifecycle of loading states purely through predictable CSS class toggling.

### Discard the throwaway
This isolated snippet is deleted and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are demonstrating form validation patterns.
- **Files affected:** `templates/fragments/register_form.html`, `app.py`
- **Change type:** Modify
- **Location:** Inside the username field of the form, and a simulated delay in the `app.py` route.
- **Dependencies:** Standard CSS styles for `.htmx-indicator`.

### The New Code
```html
<!-- Add spinner to username field -->
<div class="field">
    <label>Username</label>
    <input type="text"
           name="username"
           hx-post="/validate/username"
           hx-target="#username-error"
           hx-trigger="blur"
           hx-indicator="#username-spinner"
           value="{{ form.username if form }}">
    <span id="username-spinner" class="htmx-indicator">&#9696; checking...</span>
    <span id="username-error" class="error">
        {% if errors and errors.username %}{{ errors.username }}{% endif %}
    </span>
</div>
```
```python
import time

@app.route('/validate/username', methods=['POST'])
def validate_username():
    username = request.form.get('username', '').strip()
    time.sleep(0.3)  # simulate DB lookup
    if not username:
        return '<span class="error">Required.</span>', 422
    if len(username) < 3:
        return '<span class="error">Min 3 chars.</span>', 422
    if not username.isalnum():
        return '<span class="error">Letters/numbers only.</span>', 422
    return '<span class="ok">✓</span>'
```

### The Updated Project
```html
1: <!-- templates/fragments/register_form.html -->
2: <form id="register-form" hx-post="/register" hx-swap="outerHTML">
3:     <!-- ← new: added hx-indicator and spinner span to username field -->
4:     <div class="field">
5:         <label>Username</label>
6:         <input type="text" 
7:                name="username" 
8:                hx-post="/validate/username"
9:                hx-target="#username-error"
10:               hx-trigger="blur"
11:               hx-indicator="#username-spinner"
12:               value="{{ form.username if form }}">
13:        <span id="username-spinner" class="htmx-indicator">&#9696; checking...</span>
14:        <span id="username-error" class="error">
15:            {% if errors and errors.username %}{{ errors.username }}{% endif %}
16:        </span>
17:    </div>
18:    <!-- ... email and password fields unchanged ... -->
19:    <button type="submit">Register</button>
20: </form>
```
```python
1: # app.py
2: from flask import Flask, request, render_template, make_response
3: import time # ← new: imported time
4:
5: app = Flask(__name__)
6:
7: @app.route('/validate/username', methods=['POST'])
8: def validate_username():
9:     username = request.form.get('username', '').strip()
10:    time.sleep(0.3)  # ← new: simulate DB lookup delay
11:    if not username:
12:        return '<span class="error">Required.</span>', 422
13:    if len(username) < 3:
14:        return '<span class="error">Min 3 chars.</span>', 422
15:    if not username.isalnum():
16:        return '<span class="error">Letters/numbers only.</span>', 422
17:    return '<span class="ok">✓</span>'
```
*(Assume the necessary `.htmx-indicator` CSS rules are present in `register.html`)*
The username input now explicitly targets `#username-spinner` as its indicator. The server has an artificial delay to make the loading state visible to the naked eye.

### Mechanical walkthrough
- `hx-indicator="#username-spinner"` tells HTMX to add the `htmx-request` class to the element with ID `username-spinner` while the request initiated by this input is pending.
- `<span id="username-spinner" class="htmx-indicator">` defines the visual spinner element, marked with the base `htmx-indicator` class which hides it by default via CSS.
- `import time` imports the Python standard library module for time-related functions.
- `time.sleep(0.3)` pauses the execution of the thread for 300 milliseconds.

### CS lens
State machines managing asynchronous requests typically transition between `IDLE`, `PENDING`, `SUCCESS`, and `ERROR` states. HTMX projects this state machine directly onto the DOM tree. The `htmx-request` class is the physical manifestation of the `PENDING` state. This aligns with declarative UI principles: instead of writing imperative code (`spinner.show()`, `await fetch()`, `spinner.hide()`), you declare *what* represents the loading state, and the library manages the transitions based on the network lifecycle.

### SE lens
Relying on CSS classes for loading states is highly robust. If an error occurs, or the request times out, HTMX guarantees the `htmx-request` class is removed during the cleanup phase. Imperative JavaScript toggles often suffer from bugs where an uncaught exception skips the `spinner.hide()` call, leaving the UI permanently frozen in a loading state. The declarative approach eliminates this class of bugs entirely.

### Commands needed
Run: python app.py

### Run it
Type into the username field and press Tab. You will see "checking..." appear briefly before the checkmark or error message replaces it.

### One sentence connecting to previous unit
Showing a spinner is good, but preventing the user from submitting the form while a check is still running is even better.

## Concept Unit: Disabling submit during validation and hx-disabled-elt

### The Problem
A user might type an invalid username and immediately click "Register" before the blur-triggered validation has time to finish. How can we disable the submit button while background checks are running, preventing double submissions or conflicting state?

### Introduce the concept in isolation
```html
<form hx-post="/save">
    <input type="text" hx-post="/check" hx-disabled-elt="#btn">
    <button id="btn" type="submit">Save</button>
</form>
```
Output of the isolated code when tabbing away from the input: The input triggers a POST to `/check`. HTMX dynamically adds the `disabled` attribute to the button with ID `btn`. The button becomes unclickable and visually grayed out. When the request finishes, the `disabled` attribute is removed. This proves that HTMX can manage element interactivity state asynchronously alongside DOM swaps.

### Discard the throwaway
This isolated snippet is deleted and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are demonstrating form validation patterns.
- **Files affected:** `templates/fragments/register_form.html`
- **Change type:** Modify
- **Location:** The username and email inputs, and the submit button.
- **Dependencies:** None.

### The New Code
```html
<input type="text" 
       name="username" 
       hx-post="/validate/username"
       hx-target="#username-error"
       hx-trigger="blur"
       hx-indicator="#username-spinner"
       hx-disabled-elt="#submit-btn"
       value="{{ form.username if form }}">

<input type="email" 
       name="email" 
       hx-post="/validate/email"
       hx-target="#email-error"
       hx-trigger="blur"
       hx-disabled-elt="#submit-btn"
       value="{{ form.email if form }}">

<button id="submit-btn" type="submit">Register</button>
```

### The Updated Project
```html
1: <!-- templates/fragments/register_form.html -->
2: <form id="register-form" hx-post="/register" hx-swap="outerHTML">
3:     <div class="field">
4:         <label>Username</label>
5:         <!-- ← new: added hx-disabled-elt to inputs -->
6:         <input type="text" 
7:                name="username" 
8:                hx-post="/validate/username"
9:                hx-target="#username-error"
10:               hx-trigger="blur"
11:               hx-indicator="#username-spinner"
12:               hx-disabled-elt="#submit-btn"
13:               value="{{ form.username if form }}">
14:        <span id="username-spinner" class="htmx-indicator">&#9696; checking...</span>
15:        <span id="username-error" class="error"></span>
16:    </div>
17:    <div class="field">
18:        <label>Email</label>
19:        <input type="email" 
20:               name="email" 
21:               hx-post="/validate/email"
22:               hx-target="#email-error"
23:               hx-trigger="blur"
24:               hx-disabled-elt="#submit-btn"
25:               value="{{ form.email if form }}">
26:        <span id="email-error" class="error"></span>
27:    </div>
28:    <div class="field">
29:        <label>Password</label>
30:        <input type="password" name="password">
31:    </div>
32:    <!-- ← new: added id to submit button -->
33:    <button id="submit-btn" type="submit">Register</button>
34: </form>
```
Both asynchronous validations now lock the submit button while they execute, preventing the form from being submitted until the server confirms the fields are acceptable.

### Mechanical walkthrough
- `hx-disabled-elt="#submit-btn"` instructs HTMX to locate the element matching `#submit-btn` and apply the `disabled` HTML attribute to it for the duration of the request triggered by this input.
- `<button id="submit-btn" type="submit">` defines the form's submit button, assigning it the ID targeted by the inputs.
- When multiple elements target the same button, any active request will apply the disabled attribute, ensuring the form remains locked until all background work completes.

### CS lens
Managing concurrent interactions is a classic race condition scenario. A user typing a value and clicking submit initiates two asynchronous processes (the validation check and the form submission). If the submission fires before the validation completes, the server must duplicate the validation logic in the submission handler anyway. Disabling the submit button is a client-side locking mechanism (a mutex) that serializes the interactions, forcing the validation to resolve before submission can be initiated.

### SE lens
Using `hx-disabled-elt` provides immediate, tangible feedback that the application is busy. It prevents users from accidentally double-submitting forms (which can lead to duplicate records or errors) and enforces correct sequence flow without writing custom debounce or lock-tracking logic in JavaScript.

### Commands needed
Run: python app.py

### Run it
Click into the username field, type a value, and immediately try to click the Register button. The button will momentarily gray out, preventing the click, until the "checking..." spinner disappears.

### One sentence connecting to previous unit
With immediate inline validation, loading states, and disabled submit buttons, our form now provides a robust, app-like experience using only HTML attributes and server-rendered fragments.

## Closing

### Connect the pieces
Trace user types 'al!' in username, tabs away: `hx-trigger="blur"` fires. HTMX adds the `htmx-request` class, showing the `#username-spinner`, and adds the `disabled` attribute to `#submit-btn`. It sends a POST to `/validate/username`. The server checks `isalnum()` and fails. It returns `<span class="error">Letters/numbers only.</span>` with a `422 Unprocessable Entity` status. Because HTMX maps 4xx errors to swaps by default, it swaps the error HTML into `#username-error`. The request completes: the spinner hides, the submit button is re-enabled, and the error is shown inline. The user corrects to 'alice' and blurs again. A new request fires, succeeds, returns a `200 OK` with a checkmark, and swaps it in, replacing the error. If they click Register, the whole form posts. If validation fails at the form level, the server returns the entire form fragment populated with errors and a 422 status, swapping it out entirely. If it succeeds, the server returns a `204 No Content` and an `HX-Redirect` header, transitioning the user seamlessly to the dashboard.
