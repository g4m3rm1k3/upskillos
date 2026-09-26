# Lesson 08: Live Search and Filtering — hx-get with Debounce, Server-Side Filtering

**What you will build**
You will build a responsive live search and filtering interface. We will implement a search bar that filters users as you type, combine multiple filter controls (search, category, price) that all update the same results, and build an infinite scrolling list. The transferable problem we are solving is how to handle live dynamic updates without writing client-side JavaScript or managing state locally. Live search with HTMX is an input with `hx-get` and `hx-trigger="keyup delay:300ms changed"`. The server filters the data and returns an HTML fragment. The server is the filter. This pattern scales whether you filter an in-memory list or a SQLite database.

**What you need to know first**
- Lesson 07

**Terms used in this lesson**
- **hx-get** — HTMX attribute that issues an HTTP GET request to the given URL when triggered. It solves the problem of fetching data without page reloads.
- **hx-target** — HTMX attribute specifying the CSS selector of the element that will receive the HTML response. It dictates where the response goes.
- **hx-trigger** — HTMX attribute that dictates what event causes the request to fire, solving the problem of controlling exactly when requests happen.
- **hx-swap** — HTMX attribute controlling how the returned HTML is inserted into the target element.
- **hx-include** — HTMX attribute specifying other elements whose values should be serialized and included in the request. It solves sending multiple form values at once.
- **keyup** — DOM event fired when a key is released. Used to detect typing.
- **changed** — HTMX modifier that ensures a request only fires if the element's value actually changed.
- **delay** — HTMX modifier that delays a request. Solves the problem of sending too many requests while typing (debouncing).
- **intersect** — HTMX event that fires when an element becomes visible in the viewport. Solves the problem of detecting scroll positions for infinite scrolling.
- **once** — HTMX modifier ensuring a trigger only fires one single time.
- **outerHTML** — Swap modifier to replace the target element entirely, rather than just its contents.
- **innerHTML** — Swap modifier to replace only the content inside the target element.

**Objects and methods used**

- **Flask**
  - *What it is:* The core web application class in the Flask framework.
  - *Implementation:* `class Flask(import_name: str, ...)`
  - *Its use:* We use it to create the web application and define our endpoints.
  - *Type:* Class
  - *Responsibility:* Manages routing, configuration, and request handling for the web application.
  - *Depends on:* An import name (usually `__name__`).
  - *Connects to:* Receives requests from the WSGI server and routes them to handler functions.
  - *Shape:* The central registry and boundary between the web server and our application logic.

- **request**
  - *What it is:* A global object in Flask containing the data for the current HTTP request.
  - *Implementation:* `LocalProxy` to the current `Request` object.
  - *Its use:* We use it to extract query parameters sent by HTMX.
  - *Type:* Global proxy object
  - *Responsibility:* Encapsulates all data sent by the client (URL parameters, form data, headers).
  - *Depends on:* An active HTTP request context.
  - *Connects to:* Read by our route functions to determine what data the client wants.
  - *Shape:* The data-transfer boundary bringing client input into our application logic.

- **request.args.get**
  - *What it is:* Method to fetch a query string parameter.
  - *Implementation:* `def get(key: str, default=None, type=None)`
  - *Its use:* We use it to retrieve search queries and filter values from the URL.
  - *Type:* Instance method on `ImmutableMultiDict`.
  - *Responsibility:* Safely extracts a named query parameter with optional fallback and type conversion.
  - *Depends on:* The parsed query string.
  - *Connects to:* Provides sanitized input data to our filtering logic.
  - *Shape:* Internal data extraction helper.

- **render_template**
  - *What it is:* A Flask function that renders a Jinja2 template file.
  - *Implementation:* `def render_template(template_name_or_list: str | list[str], **context)`
  - *Its use:* We use it to generate the HTML fragment containing search results.
  - *Type:* Function
  - *Responsibility:* Combines dynamic data with an HTML template to produce a final string.
  - *Depends on:* A template file path and keyword arguments for context.
  - *Connects to:* Returns the rendered string to the route handler, which sends it to the client.
  - *Shape:* The presentation layer boundary formatting data for the client.

- **re.escape**
  - *What it is:* A function in Python's regular expression module to escape special characters.
  - *Implementation:* `def escape(pattern: str) -> str`
  - *Its use:* We use it to safely include user input in a regular expression for highlighting matches.
  - *Type:* Function
  - *Responsibility:* Escapes any characters in a string that might be interpreted as regex operators.
  - *Depends on:* The string to escape.
  - *Connects to:* Outputs a safe literal string for `re.compile`.
  - *Shape:* Input sanitization helper.

- **re.compile**
  - *What it is:* A function to compile a regular expression pattern into a pattern object.
  - *Implementation:* `def compile(pattern: str, flags: int = 0) -> Pattern`
  - *Its use:* We use it to create a case-insensitive search pattern for highlighting text.
  - *Type:* Function
  - *Responsibility:* Pre-compiles a regex string into an executable pattern for efficiency and feature flags.
  - *Depends on:* The regex string and optional flags.
  - *Connects to:* Returns a `Pattern` object that can perform searches and substitutions.
  - *Shape:* Internal logic utility.

- **pattern.sub**
  - *What it is:* A method on a compiled regex pattern to substitute matched strings.
  - *Implementation:* `def sub(repl: str | callable, string: str, count: int = 0) -> str`
  - *Its use:* We use it to wrap matched search text in `<mark>` tags.
  - *Type:* Instance method
  - *Responsibility:* Replaces occurrences of a pattern in a string with a replacement string or the result of a callable.
  - *Depends on:* A replacement value and the target string.
  - *Connects to:* Returns the modified string to the caller.
  - *Shape:* Internal text processing logic.

- **str.strip**
  - *What it is:* A string method to remove leading and trailing whitespace.
  - *Implementation:* `def strip(chars: str | None = None) -> str`
  - *Its use:* We use it to clean up user input before searching.
  - *Type:* Instance method
  - *Responsibility:* Removes unwanted whitespace from the ends of a string.
  - *Depends on:* The string instance.
  - *Connects to:* Returns a cleaned string.
  - *Shape:* Internal data sanitization logic.

- **str.lower**
  - *What it is:* A string method to convert all characters to lowercase.
  - *Implementation:* `def lower() -> str`
  - *Its use:* We use it to perform case-insensitive string comparisons.
  - *Type:* Instance method
  - *Responsibility:* Converts uppercase characters to lowercase for normalization.
  - *Depends on:* The string instance.
  - *Connects to:* Returns a lowercase string.
  - *Shape:* Internal data normalization logic.

- **list.sort**
  - *What it is:* A list method to sort the items in-place.
  - *Implementation:* `def sort(*, key: callable | None = None, reverse: bool = False) -> None`
  - *Its use:* We use it to sort product results by name or price.
  - *Type:* Instance method
  - *Responsibility:* Reorders the elements of a list in-place according to a key function.
  - *Depends on:* The list instance and the key callable.
  - *Connects to:* Modifies the list and returns `None`.
  - *Shape:* Internal data manipulation logic.

## Concept Unit: The live search input pattern

### The Problem
We need an input field that updates search results automatically as the user types, without requiring them to press "Submit" and reload the entire page. However, sending a network request for every single keystroke immediately would overwhelm the server. We need a way to wait until the user pauses typing before fetching data. How would you delay an action until a sequence of rapid events stops?

### Introduce the concept in isolation
Here is how we use HTMX to delay a request until typing pauses.
```html
<input type="text"
       name="demo"
       hx-get="/demo"
       hx-trigger="keyup delay:300ms changed">
```
*Output predicted from confidence, not executed:* A user typing "al" rapidly will trigger a single `GET /demo?demo=al` request 300 milliseconds after they finish typing the "l", because the `delay:300ms` resets on each keystroke and `changed` ensures we only send the request if the input's value has changed. This is called **debouncing**.

### Discard the throwaway
This snippet is deleted and will not appear in the project again. It was just to show the `delay` modifier in isolation.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition.
- **Files affected:** `app.py`, `templates/index.html` (created/modified)
- **Change type:** Add
- **Location:** At the root.
- **Dependencies:** Flask, HTMX

### The New Code
```html
<!-- Live search: fires GET after 300ms pause in typing -->
<input type="search"
       name="q"
       placeholder="Search users..."
       hx-get="/search/users"
       hx-target="#search-results"
       hx-trigger="keyup changed delay:300ms, search"
       hx-swap="innerHTML"
       autocomplete="off">
<div id="search-results">
    <!-- Results appear here -->
</div>
```
```python
from flask import Flask, request, render_template

app = Flask(__name__)

USERS = [
    {'id': 1, 'name': 'Alice Smith',  'email': 'alice@example.com', 'role': 'admin'},
    {'id': 2, 'name': 'Bob Jones',    'email': 'bob@example.com',   'role': 'user'},
    {'id': 3, 'name': 'Carol Brown',  'email': 'carol@example.com', 'role': 'user'},
    {'id': 4, 'name': 'David Wilson', 'email': 'david@example.com', 'role': 'admin'},
    {'id': 5, 'name': 'Eve Martinez', 'email': 'eve@example.com',   'role': 'user'},
]

@app.route('/search/users')
def search_users():
    q = request.args.get('q', '').strip().lower()
    if not q:
        return '<p class="hint">Type to search...</p>'
    results = [u for u in USERS if q in u['name'].lower() or q in u['email'].lower()]
    return render_template('fragments/user_results.html', users=results, q=q)
```

### The Updated Project
```html
1 <div class="container">
2     <h1>User Directory</h1>
3     <input type="search" name="q" placeholder="Search users..." hx-get="/search/users" hx-target="#search-results" hx-trigger="keyup changed delay:300ms, search" hx-swap="innerHTML" autocomplete="off"> <!-- ← new -->
4     <div id="search-results"></div> <!-- ← new -->
5 </div>
```
The page now contains a search input that will automatically fetch HTML from `/search/users` and place it inside the `#search-results` div whenever the user types, debounced by 300 milliseconds.

### Mechanical walkthrough
- `<input type="search">` creates an HTML search input field with built-in clear capability.
- `name="q"` dictates the parameter name that HTMX will include in the request URL.
- `hx-get="/search/users"` instructs HTMX to make an HTTP GET request to `/search/users` when triggered.
- `hx-target="#search-results"` tells HTMX to place the response inside the element with the ID `search-results`.
- `hx-trigger="keyup changed delay:300ms, search"` tells HTMX to fire the request when the user releases a key (`keyup`), provided the input value has `changed`, and only after a `delay:300ms` pause. The comma adds a second trigger: the native HTML `search` event, which fires when the user clicks the "X" to clear the input.
- `hx-swap="innerHTML"` tells HTMX to replace the contents of the target div.
- `from flask import Flask, request, render_template` imports the required classes and functions.
- `app = Flask(__name__)` creates the application.
- `@app.route('/search/users')` registers the route handler for the GET request.
- `def search_users():` defines the handler function.
- `q = request.args.get('q', '').strip().lower()` fetches the `q` query parameter, defaults it to `''`, removes surrounding whitespace with `strip()`, and converts it to lowercase with `lower()`.
- `if not q:` checks if the query is empty.
- `return '<p class="hint">Type to search...</p>'` returns a hint message if there is no query.
- `results = [u for u in USERS if q in u['name'].lower() or q in u['email'].lower()]` builds a new list of users using a list comprehension. For each user `u`, it checks if `q` is a substring of the lowercase name or lowercase email.
- `return render_template('fragments/user_results.html', users=results, q=q)` renders the template with the filtered users.

### CS lens
The `delay` parameter implements the concept of **debouncing**. In event-driven programming, debouncing groups a burst of sequential events into a single action. By resetting the timer on every keystroke, the server is only queried once the user has paused, dramatically reducing the number of queries while keeping the interface responsive.

### SE lens
Handling live search server-side instead of relying on client-side state drastically simplifies the application. The server is the single source of truth for filtering, which works seamlessly whether the list is hardcoded in memory or backed by a massive database.

### Commands needed
Run: `python app.py`

### Run it
*Output predicted from confidence, not executed:*
When the user types 'al', `keyup` fires. HTMX waits 300ms. If no more keyups happen, it fires `GET /search/users?q=al`. The server receives `q='al'`, filters the users list ('al' matches 'Alice Smith'), and returns the rendered template. The DOM updates instantly.

### One sentence connecting to previous unit
Now that we have a single search field updating a view, let's explore how to handle multiple independent filter controls simultaneously.

## Concept Unit: Server-side filtering patterns

### The Problem
When dealing with complex lists, users want to filter by multiple attributes at once—like searching for a product by name, restricting to a specific category, and ensuring the price falls within a certain range. How do we cleanly apply multiple filters to a dataset on the server in a single request?

### Introduce the concept in isolation
Here is how multiple filters combine sequentially in Python.
```python
results = [1, 2, 3, 4, 5]
min_val = 2
max_val = 4
results = [n for n in results if min_val <= n <= max_val]
```
*Output predicted from confidence, not executed:* The `results` list will contain `[2, 3, 4]`. Applying conditions one after the other narrows down the dataset efficiently. This is called **sequential filtering**.

### Discard the throwaway
This snippet is deleted and will not appear in the project again. It was only to show sequential list comprehensions.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition.
- **Files affected:** `app.py` (modified)
- **Change type:** Add
- **Location:** Below the previous endpoint.
- **Dependencies:** Flask

### The New Code
```python
PRODUCTS = [
    {'id': 1, 'name': 'Python Handbook', 'category': 'books', 'price': 29.99},
    {'id': 2, 'name': 'Flask Mug',       'category': 'merch', 'price': 14.99},
    {'id': 3, 'name': 'SQLite Guide',    'category': 'books', 'price': 19.99},
    {'id': 4, 'name': 'HTMX T-Shirt',   'category': 'merch', 'price': 24.99},
    {'id': 5, 'name': 'Django Handbook', 'category': 'books', 'price': 34.99},
]

@app.route('/products')
def products():
    q        = request.args.get('q', '').strip().lower()
    category = request.args.get('category', '')
    min_price = request.args.get('min_price', 0, type=float)
    max_price = request.args.get('max_price', 999, type=float)
    
    results = PRODUCTS
    if q:        results = [p for p in results if q in p['name'].lower()]
    if category: results = [p for p in results if p['category'] == category]
    results = [p for p in results if min_price <= p['price'] <= max_price]
    
    rows = ''.join(f'<li>{p["name"]} — ${p["price"]}</li>' for p in results)
    return f'<ul>{rows}</ul>' if rows else '<p>No results.</p>'
```

### The Updated Project
```python
1 # ... existing imports and users setup
2 @app.route('/products') # ← new
3 def products(): # ← new
4     q = request.args.get('q', '').strip().lower() # ← new
5     # ... filters and joins ... # ← new
6     return f'<ul>{rows}</ul>' if rows else '<p>No results.</p>' # ← new
```
We now have an endpoint that accepts multiple filter parameters at once (`q`, `category`, `min_price`, `max_price`), applies them sequentially, and returns an HTML list of products.

### Mechanical walkthrough
- `@app.route('/products')` defines the `/products` endpoint.
- `def products():` begins the handler.
- `q = request.args.get('q', '').strip().lower()` fetches the search query.
- `category = request.args.get('category', '')` fetches the category string.
- `min_price = request.args.get('min_price', 0, type=float)` fetches the minimum price and casts it to a `float`. If missing, it defaults to `0`.
- `max_price = request.args.get('max_price', 999, type=float)` fetches the maximum price, casting to `float`, defaulting to `999`.
- `results = PRODUCTS` initializes the results list with all products.
- `if q: results = [p for p in results if q in p['name'].lower()]` applies the search filter only if `q` was provided.
- `if category: results = [p for p in results if p['category'] == category]` applies the category filter only if a category was provided.
- `results = [p for p in results if min_price <= p['price'] <= max_price]` always applies the price filter, taking advantage of the default bounds.
- `rows = ''.join(...)` builds a single HTML string containing `<li>` elements for each matched product.
- `return f'<ul>{rows}</ul>' if rows else '<p>No results.</p>'` returns the HTML list or a fallback message if no products match the criteria.

### CS lens
By chaining filters sequentially, we effectively compute the intersection of multiple sets without actually needing to build the full sets first. Each filter step iterates over a progressively smaller list, which limits processing time.

### SE lens
This pattern highlights the beauty of server-side state. The frontend doesn't need to know how to filter products or manage intermediate results. The single endpoint `/products` orchestrates all the logic, which guarantees consistency no matter how the frontend is structured.

### Commands needed
Run: `python app.py`

### Run it
*Output predicted from confidence, not executed:*
`GET /products?q=guide&category=books&min_price=0&max_price=25`. `q='guide'` filters down to `[SQLite Guide]`. `category='books'` keeps it. `min_price=0` and `max_price=25` keep it since `19.99` is between `0` and `25`. The output is `<ul><li>SQLite Guide — $19.99</li></ul>`.

### One sentence connecting to previous unit
Now that the server can accept multiple parameters to filter data, we need a way to actually send all those parameters together from multiple independent UI elements.

## Concept Unit: hx-include

### The Problem
If we have a search bar, a category dropdown, and a sort select, each element will trigger its own HTMX request when changed. But by default, each input only sends its *own* value. If you change the category, the request won't include what you typed in the search bar. How do we tell HTMX to serialize values from other form elements?

### Introduce the concept in isolation
Here is how HTMX can group inputs using `hx-include`.
```html
<input id="in1" name="a" value="hello">
<input id="in2" name="b" hx-get="/test" hx-include="#in1">
```
*Output predicted from confidence, not executed:* When `#in2` triggers, the request sent to `/test` will include both its own value for `b` and the value for `a` from `#in1`. This is called **form serialization merging**.

### Discard the throwaway
This snippet is deleted and will not appear in the project again. It was only to show `hx-include` linking two inputs.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition.
- **Files affected:** `templates/products.html` (created/modified)
- **Change type:** Add
- **Location:** Inside the template.
- **Dependencies:** HTMX

### The New Code
```html
<!-- Multiple filters, each updates results independently -->
<input id="search-input"
       name="q"
       placeholder="Search..."
       hx-get="/products"
       hx-target="#results"
       hx-trigger="keyup delay:300ms changed"
       hx-include="#category-filter, #sort-select">

<select id="category-filter"
        name="category"
        hx-get="/products"
        hx-target="#results"
        hx-trigger="change"
        hx-include="#search-input, #sort-select">
    <option value="">All categories</option>
    <option value="books">Books</option>
    <option value="merch">Merch</option>
</select>

<select id="sort-select"
        name="sort"
        hx-get="/products"
        hx-target="#results"
        hx-trigger="change"
        hx-include="#search-input, #category-filter">
    <option value="name">Sort by Name</option>
    <option value="price">Sort by Price</option>
</select>

<div id="results"></div>
```
```python
@app.route('/products')
def products():
    q    = request.args.get('q','').lower()
    cat  = request.args.get('category','')
    sort = request.args.get('sort','name')
    
    res  = [p for p in PRODUCTS if (not q or q in p['name'].lower()) and (not cat or p['category']==cat)]
    res.sort(key=lambda p: p[sort] if sort in p else p['name'])
    
    return ''.join(f'<div class="card">{p["name"]} - ${p["price"]}</div>' for p in res) or '<p>No results.</p>'
```

### The Updated Project
```html
1 <div>
2   <input id="search-input" name="q" hx-get="/products" hx-target="#results" hx-trigger="keyup delay:300ms changed" hx-include="#category-filter, #sort-select"> <!-- ← new -->
3   <select id="category-filter" name="category" hx-get="/products" hx-target="#results" hx-trigger="change" hx-include="#search-input, #sort-select"> <!-- ← new -->
4     <!-- options -->
5   </select>
6   <!-- sort select here -->
7   <div id="results"></div> <!-- ← new -->
8 </div>
```
The UI now features three separate inputs that each trigger a request, but thanks to `hx-include`, they all bundle the current state of the other filters into that request.

### Mechanical walkthrough
- `<input id="search-input">` gives the search input an ID so it can be targeted.
- `hx-include="#category-filter, #sort-select"` instructs HTMX that whenever this element makes a request, it must also grab the current values of the elements matching the CSS selectors `#category-filter` and `#sort-select` and add them to the query string.
- `<select id="category-filter">` establishes a dropdown menu.
- `hx-trigger="change"` fires the request whenever the dropdown's selected value changes.
- `hx-include="#search-input, #sort-select"` ensures the search bar's value and sort selection are sent when the category changes.
- `res.sort(key=lambda p: p[sort] if sort in p else p['name'])` calls the `sort` method on the list, using an inline `lambda` function to dynamically sort by the requested dictionary key (or falling back to the name).

### CS lens
`hx-include` models the UI as a decentralized system. Rather than having a parent "form" component manage all state, each control is independent but explicitly links to its peers. The server always receives the complete view state, recomputes the derived view (the filtered list), and pushes it back down.

### SE lens
This prevents complex frontend orchestration. Without this, you would need JavaScript to listen to all three inputs, read their values, construct a URL, and fetch the HTML. `hx-include` turns that procedural JavaScript logic into declarative HTML attributes.

### Commands needed
Run: `python app.py`

### Run it
*Output predicted from confidence, not executed:*
If a user types `flask` into the search box, and the category is `merch` and sort is `price`, HTMX sends `GET /products?q=flask&category=merch&sort=price`. The server applies all three filters simultaneously and returns the cards for the matching merch sorted by price.

### One sentence connecting to previous unit
If our server-side filtering results in hundreds of products, we need to load them incrementally as the user scrolls down the page.

## Concept Unit: Infinite scroll with hx-trigger=intersect

### The Problem
Fetching and rendering a massive list of DOM elements all at once hurts performance and wastes bandwidth. We want to load items in chunks, appending the next chunk to the list only when the user scrolls near the bottom. How do we trigger an HTMX request based on a scroll event without writing an `IntersectionObserver` manually?

### Introduce the concept in isolation
Here is how HTMX uses the intersect trigger.
```html
<div hx-get="/more" hx-trigger="intersect once">
  Scroll down to me
</div>
```
*Output predicted from confidence, not executed:* The element will sit quietly until it scrolls into view. Once visible, it immediately fires a `GET` request to `/more`. The `once` modifier ensures it only fires the first time it becomes visible. This is called **intersection observing**.

### Discard the throwaway
This snippet is deleted and will not appear in the project again. It was only to show the `intersect once` trigger.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition.
- **Files affected:** `app.py`, `templates/items.html` (created/modified)
- **Change type:** Add
- **Location:** Below the products endpoint.
- **Dependencies:** Flask, HTMX

### The New Code
```html
<!-- Load more items when sentinel div enters the viewport -->
<div id="item-list">
    {% for item in items %}
    <div class="item">{{ item.name }}</div>
    {% endfor %}

    {% if has_more %}
    <div hx-get="/items?page={{ next_page }}"
         hx-trigger="intersect once"
         hx-target="this"
         hx-swap="outerHTML"
         class="loading-sentinel">
        Loading more...
    </div>
    {% endif %}
</div>
```
```python
ALL_ITEMS = [{'name': f'Item {i}', 'id': i} for i in range(1, 101)]
PAGE_SIZE = 10

@app.route('/items')
def items():
    page = request.args.get('page', 1, type=int)
    start = (page - 1) * PAGE_SIZE
    chunk = ALL_ITEMS[start:start+PAGE_SIZE]
    has_more = (start + PAGE_SIZE) < len(ALL_ITEMS)
    next_page = page + 1
    
    rows = ''.join(f'<div class="item">{i["name"]}</div>' for i in chunk)
    
    if has_more:
        sentinel = f'<div hx-get="/items?page={next_page}" hx-trigger="intersect once" hx-target="this" hx-swap="outerHTML">Loading...</div>'
        return rows + sentinel
    return rows  # last page: no sentinel
```

### The Updated Project
```html
1 <div id="item-list"> <!-- ← new -->
2   <div class="item">Item 1</div> <!-- ← new -->
3   <div class="item">Item 2</div> <!-- ← new -->
4   <div hx-get="/items?page=2" hx-trigger="intersect once" hx-target="this" hx-swap="outerHTML">Loading...</div> <!-- ← new -->
5 </div> <!-- ← new -->
```
The server now paginates the dataset. It returns 10 items at a time, followed by a "sentinel" div. When the user scrolls the sentinel into view, it replaces itself with the next 10 items and a new sentinel.

### Mechanical walkthrough
- `page = request.args.get('page', 1, type=int)` fetches the page number as an integer, defaulting to `1`.
- `start = (page - 1) * PAGE_SIZE` calculates the starting index.
- `chunk = ALL_ITEMS[start:start+PAGE_SIZE]` slices the main list to grab only the requested chunk.
- `has_more = (start + PAGE_SIZE) < len(ALL_ITEMS)` determines if there are still more items left in the full list.
- `hx-trigger="intersect once"` attaches an observer to the sentinel element. It fires only `once` when the element intersects the visible viewport.
- `hx-target="this"` tells HTMX to target the element that triggered the request (the sentinel div itself).
- `hx-swap="outerHTML"` tells HTMX to completely replace the targeted sentinel div, removing it from the DOM and swapping in the new HTML.
- `return rows + sentinel` appends the new sentinel to the bottom of the items if `has_more` is true.
- `return rows` handles the final page by omitting the sentinel, ending the infinite scroll automatically.

### CS lens
This implements a **linked list** traversal pattern over HTTP. Each chunk holds the data (the items) and a pointer to the next chunk (the sentinel with `page=N+1`). The client traverses the list by resolving the pointers.

### SE lens
This infinite scroll implementation elegantly handles cleanup. By using `outerHTML` to replace the sentinel div, we ensure that old triggers are destroyed when new data arrives. We avoid memory leaks or duplicate event listeners that often plague manual JavaScript scroll implementations.

### Commands needed
Run: `python app.py`

### Run it
*Output predicted from confidence, not executed:*
The page loads with items 1-10 and a sentinel for page 2. As the user scrolls down, the sentinel enters the viewport. `intersect once` fires `GET /items?page=2`. The server returns items 11-20 plus a new sentinel for page 3. The `outerHTML` swap replaces the original sentinel completely. This repeats until page 10, which returns no sentinel, terminating the scroll naturally.

### One sentence connecting to previous unit
Beyond just fetching results, we can improve the user experience of a live search by visually highlighting the exact string they searched for in the returned HTML.

## Concept Unit: Searching a real data source and highlighting matches

### The Problem
When a user searches for text within long paragraphs, it is helpful to highlight the exact substring that matched. Because HTMX relies on the server returning HTML directly, we need the server to inject `<mark>` tags around the matching text before sending it to the client. How do we do this safely, given that user input might contain special characters?

### Introduce the concept in isolation
Here is how we use regular expressions to safely highlight text.
```python
import re
q = "c++"
pattern = re.compile(re.escape(q), re.IGNORECASE)
text = "I am learning C++."
highlighted = pattern.sub(lambda m: f'<mark>{m.group()}</mark>', text)
```
*Output predicted from confidence, not executed:* `re.escape("c++")` prevents the `+` from being evaluated as a regex operator. The result is `"I am learning <mark>C++</mark>."`. This is called **regex substitution**.

### Discard the throwaway
This snippet is deleted and will not appear in the project again. It was only to show text highlighting in isolation.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition.
- **Files affected:** `app.py` (modified)
- **Change type:** Add
- **Location:** At the bottom.
- **Dependencies:** `re`, Flask

### The New Code
```python
import re

ARTICLES = [
    {'id': 1, 'title': 'Getting started with Flask', 'body': 'Flask is a lightweight Python web framework.'},
    {'id': 2, 'title': 'HTMX makes HTML dynamic',    'body': 'HTMX adds AJAX to any HTML element.'},
    {'id': 3, 'title': 'SQLite for beginners',        'body': 'SQLite is an embedded database.'},
    {'id': 4, 'title': 'Python decorators explained', 'body': 'Decorators wrap functions with extra behaviour.'},
]

def highlight(text, q):
    """Wrap matches in <mark> tags."""
    if not q: return text
    pattern = re.compile(re.escape(q), re.IGNORECASE)
    return pattern.sub(lambda m: f'<mark>{m.group()}</mark>', text)

@app.route('/articles/search')
def article_search():
    q = request.args.get('q', '').strip()
    if not q: return '<p>Start typing to search articles.</p>'
    
    results = [a for a in ARTICLES if q.lower() in a['title'].lower() or q.lower() in a['body'].lower()]
    
    if not results: return f'<p>No articles found for "{q}".</p>'
    
    cards = ''.join(
        f'<article><h3>{highlight(a["title"], q)}</h3><p>{highlight(a["body"], q)}</p></article>'
        for a in results
    )
    return f'<p>{len(results)} result(s):</p>{cards}'
```

### The Updated Project
```python
1 # ... existing imports ...
2 import re # ← new
3 # ... existing code ...
4 def highlight(text, q): # ← new
5     if not q: return text # ← new
6     pattern = re.compile(re.escape(q), re.IGNORECASE) # ← new
7     return pattern.sub(lambda m: f'<mark>{m.group()}</mark>', text) # ← new
8 
9 @app.route('/articles/search') # ← new
10 def article_search(): # ← new
11     # ... logic returning rendered cards with highlighted text ... # ← new
```
We added a `highlight` helper function that wraps search term matches in `<mark>` tags, and an endpoint that filters and renders articles utilizing this helper.

### Mechanical walkthrough
- `import re` imports Python's regular expression module.
- `def highlight(text, q):` defines the helper function.
- `if not q: return text` handles the base case when no search string is provided.
- `re.escape(q)` escapes any characters in the query that have special meaning in regex (like `*`, `+`, or `?`).
- `re.compile(..., re.IGNORECASE)` compiles the escaped pattern and flags it to ignore capitalization differences.
- `pattern.sub(...)` searches the string for the compiled pattern and replaces occurrences.
- `lambda m: f'<mark>{m.group()}</mark>'` is a callback function invoked for every match. It takes the match object `m`, calls `m.group()` to retrieve the exact matched text (preserving the original casing), and wraps it in the semantic HTML `<mark>` tag.
- `q.lower() in a['title'].lower()` handles the actual filtering logic, checking for substring inclusion manually before applying the highlighting.
- `return f'<p>{len(results)} result(s):</p>{cards}'` returns the fully styled HTML string.

### CS lens
Escaping user input before compiling it into a regex pattern is essential for preventing **Regex Injection** attacks. If we didn't escape the input, a malicious user could pass a complex regex pattern designed to consume massive amounts of CPU time, resulting in a Denial of Service (ReDoS).

### SE lens
Generating HTML fragments server-side has a significant structural benefit here. If this were a React or Vue application, we would have to implement complex component logic to split strings and dynamically map over array segments to inject highlight tags. Because the server just returns strings, simple string substitution via regex provides identical results effortlessly.

### Commands needed
Run: `python app.py`

### Run it
*Output predicted from confidence, not executed:*
If a user searches `flask`, the `q` parameter is set to `'flask'`. The first article matches. The `highlight` function runs `re.compile('flask', IGNORECASE)`. It replaces `'Flask'` in the title with `'<mark>Flask</mark>'`. The returned HTML contains the highlighted text, which the browser automatically styles with a yellow background.

### One sentence connecting to previous unit
The power of HTMX lies entirely in returning precisely what the browser needs to show, bypassing all client-side state.

## Closing

### Connect the pieces
Trace user types 'sql' in the search input and pauses for 300ms. The browser detects the pause, and the `keyup delay:300ms changed` trigger fires `GET /articles/search?q=sql`. The server processes the request, filters the list to find that article 3 matched, and passes the title and body to the `highlight` function. The regex substitution wraps the exact string `'SQLite'` in the semantic `<mark>SQLite</mark>` tags. The server returns the fully formed HTML fragment. HTMX swaps this fragment seamlessly into `#search-results`. The user instantly sees a highlighted, filtered result with absolutely zero client-side JavaScript written or executed to manage the UI state.
