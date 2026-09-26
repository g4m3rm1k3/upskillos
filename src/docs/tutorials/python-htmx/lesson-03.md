# Lesson 03: Jinja2 Templates — render_template, Variables, Loops, Conditionals, and Template Inheritance

**What you will build**
You will build a dynamic HTML rendering system using Flask and Jinja2. This feature replaces static string returns with actual HTML files that inject Python data into placeholders, loop over collections, branch on conditions, and share a common layout. The core transferable insight is that a templating engine cleanly separates the presentation layer (HTML) from the business logic layer (Python dicts and lists), and uses inheritance to eliminate structural copy-pasting.

**What you need to know first**
- Lesson 02 covers basic Flask routing and returning literal strings.
- Python dictionaries, lists, and functions (reused here for template contexts).

**Pipeline Diagram**
`HTTP Request → Flask Route → render_template() + Context Data → Jinja2 Engine → Complete HTML String → HTTP Response`
*(This lesson covers the `render_template() + Context Data → Jinja2 Engine → Complete HTML String` stage.)*

**Terms used in this lesson**
- **Jinja2 Template** — A text file containing HTML with special placeholders that the Jinja2 engine replaces with dynamic data. It exists to separate presentation (HTML) from business logic (Python).
- **Variable interpolation (`{{ expr }}`)** — The syntax to output the evaluated result of a Python expression as escaped HTML into the template. It exists to securely inject dynamic content into static pages.
- **Control flow statement (`{% stmt %}`)** — The syntax for template logic (loops, conditionals, inheritance). It exists to control how and whether HTML blocks are rendered, without leaking the logic statements themselves into the final HTML.
- **Template comment (`{# comment #}`)** — Text ignored by the Jinja2 engine. It exists to document template logic without sending those comments to the user's browser.
- **Filter (`|filter_name`)** — A function applied to a variable inside an interpolation expression to modify its output (e.g., `|length`, `|upper`). It exists to format data cleanly in the presentation layer without altering the underlying Python data.
- **Auto-escaping** — The automatic conversion of special HTML characters (`<`, `>`, `&`) into safe representations (`&lt;`, `&gt;`, `&amp;`). It exists to prevent Cross-Site Scripting (XSS) attacks when rendering untrusted user input.
- **Truthy check** — Evaluating an object in a conditional context where empty collections (like `[]`) evaluate to `False`. It exists to simplify checking for the presence of data.
- **Template Inheritance (`{% extends %}`)** — A mechanism where a child template derives from a base template, inheriting its layout. It exists to keep layouts DRY (Don't Repeat Yourself) by defining structural boilerplate (like navbars) exactly once.
- **Macro (`{% macro %}`)** — A reusable snippet of template logic, functioning like a Python function inside Jinja2. It exists to eliminate repeating identical HTML structures for similar data across a template.
- **Decorator (`@app.template_filter()`)** — Flask syntax to register a custom Python function as a Jinja2 filter. It exists to extend template capabilities using standard Python logic.

**Objects and methods used**

**Flask**
- *What it is:* The core web application class for the Flask framework.
- *Implementation:* `class Flask(import_name: str)`
- *Its use:* Serves as the central registry for routes and configures the default Jinja2 template engine.
- *Type:* Class
- *Responsibility:* Manages application configuration, request routing, and template engine initialization.
- *Depends on:* A module name (like `__name__`) to accurately locate resources like the `templates/` folder on disk.
- *Connects to:* The WSGI server to receive requests, and Jinja2 to render templates.
- *Shape:* The top-level singleton application object binding all components together.

**render_template**
- *What it is:* A Flask helper function to generate HTML from a Jinja2 template file.
- *Implementation:* `def render_template(template_name_or_list: str | list[str], **context) -> str`
- *Its use:* Returns complete HTML strings for specific routes by merging data with template files.
- *Type:* Free function (module-level)
- *Responsibility:* Loads a template file from the `templates/` directory, passes the provided keyword arguments to the Jinja2 engine, and returns the rendered HTML string.
- *Depends on:* A template filename (string) and optional keyword arguments matching template variables.
- *Connects to:* The internal Jinja2 Environment for parsing, and the Flask application context for injected global variables.
- *Shape:* The primary boundary between Python route handlers and HTML views.

**url_for**
- *What it is:* A Flask helper function to generate URLs for specific endpoints or static files.
- *Implementation:* `def url_for(endpoint: str, **values) -> str`
- *Its use:* Creates robust, path-independent links to static assets or other routes inside templates.
- *Type:* Free function (module-level)
- *Responsibility:* Resolves an endpoint name (like 'static' or a route function name) into a valid absolute or relative URL path.
- *Depends on:* The Flask application's URL map and an active request context.
- *Connects to:* The routing subsystem to match endpoints to URL rules.
- *Shape:* A routing utility injected automatically as a global function into the template context.

**template_filter**
- *What it is:* A decorator method on the Flask application object to register custom Jinja2 filters.
- *Implementation:* `def template_filter(name: str | None = None) -> Callable`
- *Its use:* Exposes custom Python formatting logic directly to the template engine.
- *Type:* Instance method (decorator)
- *Responsibility:* Adds a standard Python function into the Jinja2 environment's internal filter dictionary under a specific name.
- *Depends on:* A target Python function to decorate.
- *Connects to:* The Jinja2 Environment configuration, bridging Python functions to template pipe syntax (`|`).
- *Shape:* A configuration hook modifying the presentation layer's capabilities.

---

## Concept Unit: render_template and variable interpolation

### The Problem
If a Python web application just returns hardcoded HTML strings directly from its route functions, modifying the page's design requires altering Python code. If we need to inject dynamic data (like a logged-in user's name), string concatenation gets messy fast. Given what string formatting (`f"Hello {name}"`) already does in Python, what would you try here first? What happens to your Python file if the HTML page spans 500 lines? We need a way to keep HTML in standard `.html` files but still inject data into them.

### Introduce the concept in isolation
Here is how Jinja2 renders a string with data placeholders, isolated from any web server:

```python
import jinja2

# Define a raw template string with a placeholder
template = jinja2.Template("<h1>Hello, {{ name }}!</h1>")

# Render it with actual data
output = template.render(name="Alice")
print(output)
```

**Output:**
```
<h1>Hello, Alice!</h1>
```
This is called **variable interpolation**. The `{{ name }}` syntax instructs Jinja2 to evaluate the expression inside the braces and insert the result into the string. This proves we can define structure once and swap the data dynamically.

### Discard the throwaway
This raw `jinja2.Template` usage is discarded and will not appear in the project again. Flask manages the Jinja2 environment and file loading automatically.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are establishing the base rendering pattern.
- **Files affected:** `app.py`, `templates/hello.html` (new file)
- **Change type:** Add
- **Location:** `app.py` at the top level; `templates/hello.html` in a new `templates` directory.
- **Dependencies:** Flask (which installs Jinja2).

### The New Code
```html
{# templates/hello.html #}
<h1>Hello, {{ name }}!</h1>
<p>You have {{ items|length }} items.</p>
```

```python
# app.py
from flask import Flask, render_template

app = Flask(__name__)

@app.route('/greet/<name>')
def greet(name):
    items = ['apple', 'banana', 'cherry']
    return render_template('hello.html', name=name, items=items)
```

### The Updated Project
Here is how the newly created `templates/hello.html` looks in full:
```html
1: <h1>Hello, {{ name }}!</h1>
2: <p>You have {{ items|length }} items.</p>
```
And how `app.py` incorporates the route:
```python
1: from flask import Flask, render_template
2: 
3: app = Flask(__name__)
4: 
5: @app.route('/greet/<name>')
6: def greet(name):
7:     items = ['apple', 'banana', 'cherry']
8:     return render_template('hello.html', name=name, items=items) # ← new
```

### Mechanical walkthrough
- `from flask import Flask, render_template`: Imports the core application object and the template rendering helper.
- `items = ['apple', 'banana', 'cherry']`: A standard Python list defined in the route.
- `render_template('hello.html', ...)`: Tells Flask to look in the `templates/` directory (created next to `app.py`), read `hello.html`, and pass it to Jinja2.
- `name=name, items=items`: Keyword arguments mapping the Python variables to names that the template can access.
- `{{ name }}`: **Variable interpolation** evaluates the `name` variable passed from Python and outputs its value as an escaped string.
- `{{ items|length }}`: Evaluates `items`, applies the `length` **filter** (which gets the count of the list), and outputs the integer `3`.

### CS lens
Separation of Concerns. By splitting the system into Python route handlers and HTML templates, designers can modify the visual structure (HTML/CSS) without knowing Python, and backend engineers can update logic without breaking the frontend layout.

### SE lens
Security by default. Jinja2 uses **auto-escaping**. If the `name` variable contained `<script>alert('hack')</script>`, Jinja2 would automatically convert it to `&lt;script&gt;alert('hack')&lt;/script&gt;`. This neutralizes Cross-Site Scripting (XSS) attacks when rendering untrusted user input.

### Commands needed
Run: `python app.py`

### Run it
Navigating to `http://localhost:5000/greet/Alice` outputs:
```html
<h1>Hello, Alice!</h1>
<p>You have 3 items.</p>
```

### One sentence connecting to previous unit
Having established basic dynamic rendering with variables, we now need structural logic to handle multiple items without repeating HTML elements.

---

## Concept Unit: Jinja2 loops and conditionals

### The Problem
If we pass a list of 10 items to a template, hardcoding 10 `<li>` tags defeats the purpose of dynamic data. What happens if the list only has 2 items, or is empty? We need a way to loop over collections directly inside the template, and conditionally show or hide elements based on whether the data exists.

### Introduce the concept in isolation
Here is how Jinja2 handles structural control flow, isolated from Flask:

```python
import jinja2

template = jinja2.Template("""
{% if users %}
  {% for user in users %}
    {{ loop.index }}: {{ user }}
  {% endfor %}
{% else %}
  No users.
{% endif %}
""")

print(template.render(users=["Alice", "Bob"]))
print(template.render(users=[]))
```

**Output:**
```
    1: Alice
    2: Bob

  No users.
```
These are called **control flow statements**. The `{% for ... %}` and `{% if ... %}` blocks evaluate data structure dynamically. This proves we can generate variable-length markup and branch logic based on the data.

### Discard the throwaway
This raw template instantiation is discarded and will not appear in the project again. 

### Project Change
- **Reference Source:** No reference counterpart — establishing core Jinja2 looping.
- **Files affected:** `app.py`, `templates/items.html` (new)
- **Change type:** Add
- **Location:** `app.py` below the `greet` route; new file `templates/items.html`.
- **Dependencies:** Flask rendering system.

### The New Code
```html
{# templates/items.html #}
<ul>
{% for item in items %}
  <li class="{% if loop.index == 1 %}first{% endif %}">
    {{ loop.index }}. {{ item|upper }}
  </li>
{% endfor %}
</ul>
{% if items %}
  <p>Total: {{ items|length }} items</p>
{% else %}
  <p>No items yet.</p>
{% endif %}
```

```python
# app.py
@app.route('/items')
def show_items():
    return render_template('items.html', items=['apple', 'banana', 'cherry'])
```

### The Updated Project
Here is how `templates/items.html` structures its logic:
```html
1: <ul>
2: {% for item in items %}
3:   <li class="{% if loop.index == 1 %}first{% endif %}">
4:     {{ loop.index }}. {{ item|upper }}
5:   </li>
6: {% endfor %}
7: </ul>
8: {% if items %}
9:   <p>Total: {{ items|length }} items</p>
10: {% else %}
11:   <p>No items yet.</p>
12: {% endif %}
```
And added to `app.py`:
```python
10: @app.route('/items')
11: def show_items():
12:     return render_template('items.html', items=['apple', 'banana', 'cherry']) # ← new
```

### Mechanical walkthrough
- `{# templates/items.html #}`: A **template comment**, ignored during rendering.
- `{% for item in items %}`: A **control flow statement** initiating a loop over the `items` list passed from Python.
- `{% if loop.index == 1 %}`: A control statement evaluating the special `loop.index` variable (which is 1-based). If it's the first iteration, it renders the word "first" into the `class` attribute.
- `{% endif %}` and `{% endfor %}`: Explicit terminators for the control blocks (Jinja2 does not use indentation to define block scope like Python does).
- `{{ item|upper }}`: Passes the current string to the `upper` filter to capitalize it.
- `{% if items %}`: A **truthy check**. In Python and Jinja2, an empty list evaluates to `False`. If it has contents, it's `True`.
- `{% else %}`: The fallback branch rendered if `items` is empty.

### CS lens
Data-driven iteration. The template engine acts as a specialized interpreter that takes a data structure (Abstract Syntax Tree or simple list) and maps it iteratively into an output stream, enforcing structure without coupling to the data's origin.

### SE lens
UI resilience. By using `{% if items %}` (a truthy check) instead of assuming data exists, the frontend defends itself against empty datasets or database misses, preventing broken HTML structures or unexpected rendering errors.

### Commands needed
Run: `python app.py`

### Run it
Navigating to `http://localhost:5000/items` outputs:
```html
<ul>
  <li class="first">
    1. APPLE
  </li>
  <li class="">
    2. BANANA
  </li>
  <li class="">
    3. CHERRY
  </li>
</ul>
  <p>Total: 3 items</p>
```

### One sentence connecting to previous unit
Now that we can generate dynamic structures inside a template, we need a way to wrap all these different templates in a consistent site-wide layout without copying and pasting HTML head tags.

---

## Concept Unit: Template inheritance — base layout

### The Problem
If we have 10 different pages (`hello.html`, `items.html`, etc.), every single one needs an `<html>`, `<head>`, `<title>`, and `<body>` tag. Copying and pasting this wrapper means if you want to add a single CSS file or navigation link, you have to edit 10 files. How do we define the outer frame once, and inject the unique page content into the middle of it?

### Introduce the concept in isolation
Here is how Jinja2 template inheritance builds layouts, simulated with dictionary loaders:

```python
import jinja2

loader = jinja2.DictLoader({
    "base.html": "<main>{% block content %}{% endblock %}</main>",
    "child.html": "{% extends 'base.html' %}{% block content %}Hello{% endblock %}"
})
env = jinja2.Environment(loader=loader)

print(env.get_template("child.html").render())
```

**Output:**
```
<main>Hello</main>
```
This is called **Template Inheritance**. The `{% extends %}` keyword declares a parent template, and the child overrides specific named `{% block %}` regions. This proves we can inherit structure while supplying only the unique content.

### Discard the throwaway
This manual `DictLoader` simulation is discarded and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart — establishing template layouts.
- **Files affected:** `templates/base.html` (new), `templates/index.html` (new), `app.py`
- **Change type:** Add
- **Location:** `templates/` directory; `app.py` root route.
- **Dependencies:** Jinja2 inheritance feature.

### The New Code
```html
{# templates/base.html #}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{% block title %}My App{% endblock %}</title>
    <link rel="stylesheet" href="/static/style.css">
</head>
<body>
    <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
    </nav>
    <main>
        {% block content %}
        {% endblock %}
    </main>
    <footer>&copy; 2024 My App</footer>
</body>
</html>
```

```html
{# templates/index.html #}
{% extends "base.html" %}
{% block title %}Home — My App{% endblock %}
{% block content %}
<h1>Welcome!</h1>
{% endblock %}
```

```python
# app.py
@app.route('/')
def index():
    return render_template('index.html')
```

### The Updated Project
The base layout `templates/base.html` defines the frame:
```html
1: <!DOCTYPE html>
2: <html lang="en">
3: <head>
4:     <meta charset="UTF-8">
5:     <title>{% block title %}My App{% endblock %}</title>
...
13:     <main>
14:         {% block content %}
15:         {% endblock %}
16:     </main>
...
19: </html>
```
The child `templates/index.html` overrides it:
```html
1: {% extends "base.html" %}
2: {% block title %}Home — My App{% endblock %}
3: {% block content %}
4: <h1>Welcome!</h1>
5: {% endblock %}
```
And the route in `app.py`:
```python
14: @app.route('/')
15: def index():
16:     return render_template('index.html') # ← new
```

### Mechanical walkthrough
- `{% block title %}My App{% endblock %}`: Defines a named overridable region in the base template. The content "My App" serves as a default if a child doesn't override it.
- `{% block content %}`: Defines the primary named region where child pages inject their unique markup.
- `{% extends "base.html" %}`: Must be the very first line of a child template. Instructs Jinja2 to load the parent template first, then apply the child's block overrides.
- `{% block title %}Home — My App{% endblock %}`: In the child, overrides the "title" block from the parent with new content.
- `{% block content %}<h1>Welcome!</h1>{% endblock %}`: In the child, injects the heading into the parent's `<main>` tag region.

### CS lens
Inversion of Control. Instead of the child page explicitly rendering a header and footer, the child delegates execution to the parent framework. The parent executes, hitting a `block` hook, which reaches back into the child to get the specific piece needed, then resumes building the parent layout.

### SE lens
DRY (Don't Repeat Yourself) principle. By confining the `<nav>` and `<footer>` elements entirely to `base.html`, any change to the site's navigation requires exactly one edit, eliminating the error-prone task of updating dozens of independent HTML files.

### Commands needed
Run: `python app.py`

### Run it
Navigating to `http://localhost:5000/` outputs:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Home — My App</title>
    <link rel="stylesheet" href="/static/style.css">
</head>
<body>
    <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
    </nav>
    <main>
        
<h1>Welcome!</h1>

    </main>
    <footer>&copy; 2024 My App</footer>
</body>
</html>
```

### One sentence connecting to previous unit
Now that our layouts are completely modular, we need a robust way to link these pages together without hardcoding URLs that might break if route paths change.

---

## Concept Unit: Template filters, Jinja2 globals, and url_for in templates

### The Problem
If we hardcode a link as `<a href="/about">About</a>` in a template, and later decide to change the Python route to `@app.route('/about-us')`, the HTML link breaks silently. Furthermore, what if we need to format a date or truncate a string dynamically, but Jinja2 doesn't have a built-in filter for it? We need a way to ask Flask for correct URLs dynamically, and a way to add our own Python logic into the template's filter library.

### Introduce the concept in isolation
Here is how Flask generates dynamic URLs internally based on route function names:

```python
from flask import Flask, url_for
app = Flask(__name__)

@app.route('/user/profile')
def profile():
    return "Profile"

with app.test_request_context():
    print(url_for('profile'))
```

**Output:**
```
/user/profile
```
This is the **url_for** function in action. It calculates the correct URL path based on the endpoint (function) name, proving we can decouple the URL string from the view that links to it.

### Discard the throwaway
This test request context script is discarded and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `app.py`
- **Change type:** Add
- **Location:** Inside `app.py`, adding a custom filter.
- **Dependencies:** `Flask` URL routing system.

### The New Code
```python
# app.py (adding a custom filter)
@app.template_filter('truncate_words')
def truncate_words(s, n=10):
    words = s.split()
    return ' '.join(words[:n]) + ('...' if len(words) > n else '')
```
*And its usage in a hypothetical template:*
```html
{# Usage: {{ long_text|truncate_words(5) }} #}
{# Usage: <a href="{{ url_for('index') }}">Home</a> #}
```

### The Updated Project
Here is how the custom filter is registered in `app.py`:
```python
18: @app.template_filter('truncate_words') # ← new
19: def truncate_words(s, n=10):
20:     words = s.split()
21:     return ' '.join(words[:n]) + ('...' if len(words) > n else '')
```

### Mechanical walkthrough
- `@app.template_filter('truncate_words')`: A **decorator** that registers the following Python function into Jinja2's global filter dictionary under the name 'truncate_words'.
- `def truncate_words(s, n=10)`: A standard Python function receiving the string (`s`) from the left side of the `|` pipe, and optional arguments (`n`).
- `url_for('index')`: A **Jinja2 global** function provided automatically by Flask. When evaluated in `{{ url_for('index') }}`, it looks up the function named `index` in Flask's route registry and outputs its assigned path (`/`).
- `{{ html|safe }}` (Common filter): Disables **auto-escaping** for a specific value. Only used for trusted HTML content generated internally.

### CS lens
Symbolic resolution. By linking to symbolic endpoint names (`'index'`) instead of literal string paths (`'/'`), the application abstracts away the filesystem or URL map layer. This creates a single source of truth for routing.

### SE lens
Maintainability via extensibility. The template engine is deliberately kept slim. By providing a clean interface (`@app.template_filter`) to inject custom Python functions, developers can extend the view layer's capabilities exactly as needed for their specific domain, without waiting for the framework to support it natively.

### Commands needed
Run: `python app.py`

### Run it
*Predicted Output:*
If evaluated, `{{ "This is a very long string"|truncate_words(3) }}` outputs `This is a...`. The template engine correctly invokes the mapped Python function.

### One sentence connecting to previous unit
With URL generation and custom filters in place, we can now tackle passing deeply nested data structures to templates and rendering them cleanly with reusable HTML macros.

---

## Concept Unit: Passing complex data and Jinja2 macros

### The Problem
If you pass a complex list of user dictionaries to a template, you might need to render a "User Badge" containing their name, role, and a status icon. If this badge needs to appear in three different places on the page, copying the badge's HTML inside the template violates DRY. How do we create reusable HTML functions inside a template, just like we create reusable Python functions?

### Introduce the concept in isolation
Here is how a Jinja2 macro defines and calls a reusable block of HTML:

```python
import jinja2

template = jinja2.Template("""
{% macro greet(name) %}
  <b>Hello, {{ name }}</b>
{% endmacro %}

{{ greet('Alice') }}
{{ greet('Bob') }}
""")

print(template.render())
```

**Output:**
```
  <b>Hello, Alice</b>

  <b>Hello, Bob</b>
```
This is called a **macro**. The `{% macro %}` block acts like a function declaration, and `{{ greet(...) }}` executes it. This proves we can encapsulate HTML logic directly inside the view layer.

### Discard the throwaway
This raw macro script is discarded and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `app.py`, `templates/users.html` (new)
- **Change type:** Add
- **Location:** New route in `app.py`; new template `templates/users.html`.
- **Dependencies:** Template inheritance base.

### The New Code
```python
# app.py
@app.route('/users')
def users():
    user_list = [
        {'id': 1, 'name': 'Alice', 'role': 'admin', 'active': True},
        {'id': 2, 'name': 'Bob',   'role': 'user',  'active': False},
        {'id': 3, 'name': 'Carol', 'role': 'user',  'active': True},
    ]
    return render_template('users.html', users=user_list, title='User List')
```

```html
{# templates/users.html #}
{% extends "base.html" %}
{% block content %}

{% macro user_badge(user) %}
  <span class="badge {{ 'admin' if user.role == 'admin' else 'user' }}">
    {{ user.name }} ({{ user.role }})
  </span>
{% endmacro %}

{% for user in users %}
  <div class="{% if not user.active %}inactive{% endif %}">
    {{ user_badge(user) }}
    {% if user.active %}<span class="green">✓</span>{% endif %}
  </div>
{% endfor %}

{% endblock %}
```

### The Updated Project
The `app.py` receives the complex data route:
```python
23: @app.route('/users')
24: def users():
25:     user_list = [
26:         {'id': 1, 'name': 'Alice', 'role': 'admin', 'active': True},
27:         {'id': 2, 'name': 'Bob',   'role': 'user',  'active': False},
28:         {'id': 3, 'name': 'Carol', 'role': 'user',  'active': True},
29:     ]
30:     return render_template('users.html', users=user_list, title='User List') # ← new
```
And `templates/users.html` calls the macro for each complex dictionary:
```html
1: {% extends "base.html" %}
2: {% block content %}
3: 
4: {% macro user_badge(user) %}
5:   <span class="badge {{ 'admin' if user.role == 'admin' else 'user' }}">
6:     {{ user.name }} ({{ user.role }})
7:   </span>
8: {% endmacro %}
...
```

### Mechanical walkthrough
- `user_list = [...]`: A complex data structure (list of dictionaries) is declared in Python and passed wholesale to `render_template`.
- `{% macro user_badge(user) %}`: A **macro** declaration. It accepts one parameter, `user`, which acts as a local variable for the duration of the macro.
- `{{ 'admin' if user.role == 'admin' else 'user' }}`: An inline Python ternary expression executed inside an interpolation tag to conditionally assign a CSS class.
- `{{ user.name }}`: Property access. In Jinja2, dictionary lookups (`user['name']`) and attribute lookups (`user.name`) are handled identically, providing clean dot-notation regardless of the underlying Python type.
- `{{ user_badge(user) }}`: A call to the macro, passing the current loop iteration's dictionary object in as the argument. The returned HTML string is injected in place.

### CS lens
Componentization. Macros provide functional abstraction in a declarative language (HTML templating). By binding specific data shapes to reusable visual components, we create a domain-specific component library native to the server without needing a heavy frontend JavaScript framework like React.

### SE lens
Encapsulation. The `user_badge` macro hides the complexity of how a badge is rendered (which classes are applied based on roles) from the main iteration loop. The loop's only concern is structural layout, while the macro owns the visual implementation details of a badge.

### Commands needed
Run: `python app.py`

### Run it
Navigating to `http://localhost:5000/users` processes the complex list and outputs:
```html
  <div class="">
      <span class="badge admin">
    Alice (admin)
  </span>

    <span class="green">✓</span>
  </div>

  <div class="inactive">
      <span class="badge user">
    Bob (user)
  </span>

  </div>
```

### One sentence connecting to previous unit
By combining complex data models with layout inheritance and component macros, we now have a full-featured presentation layer capable of rendering any Python state securely.

---

## Closing

### Connect the pieces
A Flask view completes its job by calling `render_template('template.html', key=value)`. Jinja2 takes over, looking up the template file. It encounters `{% extends "base.html" %}` and loads the parent layout. Inside the `{% block content %}`, it processes logic like `{% for user in users %}`, calling `{% macro user_badge %}` to build repetitive HTML chunks, applying filters like `|upper` and evaluating globals like `url_for()`. Every `{{ variable }}` is safely auto-escaped. The resulting HTML structure combines the DRY layout of the base template with the dynamic, data-driven content of the child template, completely separating Python logic from presentation design, and sending the final, stitched-together HTML string back as an HTTP 200 response to the browser.
