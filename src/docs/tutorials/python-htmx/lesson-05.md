# Lesson 05: HTMX Fundamentals — hx-get, hx-post, hx-target, hx-swap

HTMX extends HTML so any element can make HTTP requests and swap the response into the DOM — without writing JavaScript. The browser handles the AJAX; your server returns HTML fragments (not JSON). This shifts complexity from the frontend to the server, where Python already lives.

**What you will build**
You will build a series of interactive UI components (a time fetcher, an item adder, a notification loader, and a search input) that update parts of the page dynamically using HTMX and Flask, without full page reloads.

**What you need to know first**
- Lesson 04

**Terms used in this lesson**
- **HTMX** — A library that allows accessing AJAX, CSS Transitions, WebSockets, and Server Sent Events directly in HTML using attributes, moving state and logic back to the server.
- **AJAX** — Asynchronous JavaScript and XML. The underlying browser mechanism used to make background HTTP requests.
- **HTML fragment** — A partial piece of HTML (like a `<div>` or `<li>`) rather than a full page (`<html><body>...`), designed to be injected into an existing DOM.
- **DOM** — Document Object Model. The browser's tree representation of the webpage.
- **Debounce** — A technique to delay processing an event until a certain amount of time has passed since the last event (e.g., waiting for a user to stop typing).

**Objects and methods used**

- **hx-get**
  - *What it is:* An HTML attribute provided by HTMX to trigger a GET request.
  - *Implementation:* `hx-get="/path"`
  - *Its use:* Fetches read-only data from the server when an element is triggered.
  - *Type:* HTML Attribute.
  - *Responsibility:* Initiates an asynchronous GET request to the specified URL.
  - *Depends on:* HTMX library loaded in the browser.
  - *Connects to:* A server endpoint handling GET requests.
  - *Shape:* UI declarative boundary.

- **hx-post**
  - *What it is:* An HTML attribute provided by HTMX to trigger a POST request.
  - *Implementation:* `hx-post="/path"`
  - *Its use:* Submits data to the server (e.g., a form) without a page reload.
  - *Type:* HTML Attribute.
  - *Responsibility:* Initiates an asynchronous POST request, automatically including form values if applicable.
  - *Depends on:* HTMX library and often nested `<input>` fields.
  - *Connects to:* A server endpoint handling POST requests.
  - *Shape:* UI declarative boundary.

- **hx-target**
  - *What it is:* An HTML attribute to specify where the response should go.
  - *Implementation:* `hx-target="#element-id"`
  - *Its use:* Tells HTMX which element on the page will receive the incoming HTML fragment.
  - *Type:* HTML Attribute.
  - *Responsibility:* Locates the DOM node to be updated using a CSS selector.
  - *Depends on:* The existence of the target element in the DOM.
  - *Connects to:* The DOM update mechanism.
  - *Shape:* UI declarative boundary.

- **hx-swap**
  - *What it is:* An HTML attribute specifying how to place the response into the target.
  - *Implementation:* `hx-swap="innerHTML"`
  - *Its use:* Defines whether the response replaces the target's content, the target itself, or is appended/prepended.
  - *Type:* HTML Attribute.
  - *Responsibility:* Controls the exact DOM insertion strategy.
  - *Depends on:* The HTML fragment returned by the server.
  - *Connects to:* The target element.
  - *Shape:* UI declarative boundary.

- **hx-trigger**
  - *What it is:* An HTML attribute specifying what event causes the request.
  - *Implementation:* `hx-trigger="keyup changed delay:500ms"`
  - *Its use:* Customizes the exact condition (event, delay, polling) that fires the HTMX request.
  - *Type:* HTML Attribute.
  - *Responsibility:* Listens to browser events and triggers the configured AJAX request.
  - *Depends on:* Browser event system (clicks, keyups, intersects).
  - *Connects to:* The request lifecycle.
  - *Shape:* UI declarative boundary.

- **Flask request.headers**
  - *What it is:* A Flask dictionary-like object containing incoming HTTP headers.
  - *Implementation:* `request.headers.get('HX-Request')`
  - *Its use:* Allows the server to detect if a request was made by HTMX or standard browser navigation.
  - *Type:* Python property/dictionary.
  - *Responsibility:* Exposes HTTP request metadata to the route handler.
  - *Depends on:* The incoming HTTP request.
  - *Connects to:* The client's HTTP client (browser or HTMX).
  - *Shape:* HTTP boundary.

---

## Concept Unit: hx-get

### The Problem
When a user clicks a link or submits a form in traditional HTML, the browser does a full page reload, tearing down the current DOM and rendering a new one. How can we load a piece of content into the existing page smoothly, without writing custom JavaScript fetch logic?

### Introduce the concept in isolation
HTMX allows you to use `hx-get` to declare that an element should fetch data.

```html
<script src="https://unpkg.com/htmx.org@1.9.12"></script>
<button hx-get="/time" hx-target="#result" hx-swap="innerHTML">
    Get Server Time
</button>
<div id="result">Click the button...</div>
```

```python
from flask import Flask
import datetime
app = Flask(__name__)
@app.route('/time')
def get_time():
    now = datetime.datetime.now().strftime('%H:%M:%S')
    return f'<p>Server time: <strong>{now}</strong></p>'
```
This proves that a button click can trigger a server request, and the server's HTML response replaces the content of the `result` div automatically.

### Discard the throwaway
This throwaway example is discarded and will not be used in our real project code.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are demonstrating the concept.
- **Files affected:** `templates/index.html`, `app.py`
- **Change type:** Add
- **Location:** Inside the main container.
- **Dependencies:** HTMX script included in base layout, Flask.

### The New Code

```html
<button hx-get="/time" hx-target="#result" hx-swap="innerHTML">
    Get Server Time
</button>
<div id="result">Click the button...</div>
```

```python
@app.route('/time')
def get_time():
    now = datetime.datetime.now().strftime('%H:%M:%S')
    return f'<p>Server time: <strong>{now}</strong></p>'
```

### The Updated Project

```html
1: <!DOCTYPE html>
2: <html>
3: <head>
4:     <script src="https://unpkg.com/htmx.org@1.9.12"></script>
5: </head>
6: <body>
7:     <button hx-get="/time" hx-target="#result" hx-swap="innerHTML"> <!-- new -->
8:         Get Server Time
9:     </button>
10:    <div id="result">Click the button...</div> <!-- new -->
11: </body>
12: </html>
```

The button now directly drives a background network request and updates the UI section below it.

### Mechanical walkthrough
1. The user clicks the button.
2. HTMX intercepts the click because of the `hx-get="/time"` attribute.
3. HTMX sends an asynchronous GET request to the `/time` endpoint.
4. The Flask route `/time` executes, calculating the current time.
5. Flask returns a raw HTML fragment: `<p>Server time: <strong>...</strong></p>`.
6. HTMX receives the response and looks at `hx-target="#result"`.
7. HTMX selects the element with `id="result"`.
8. HTMX applies the strategy defined by `hx-swap="innerHTML"`, taking the returned fragment and replacing the inner contents of `#result` with it.

### CS lens
Declarative vs. Imperative programming. Instead of writing imperative steps (listen to event, make request, parse response, find element, update DOM), HTMX uses declarative attributes. You state *what* you want to happen, and the library abstracts the *how*.

### SE lens
Locality of Behavior. In standard single-page apps, the UI element, the event listener, the network request, and the DOM update logic are often spread across multiple files (HTML, JS components, stores). HTMX keeps the behavior exactly where the element is defined, making it trivial to see what a button does just by looking at it.

### Commands needed
Run: `python app.py`
Then open http://localhost:5000 in a browser.

### Run it
Clicking the button immediately updates the div below it with the current server time, without the browser tab reloading or flashing.

### One sentence connecting to previous unit
Now that we can fetch data dynamically, we need to handle user inputs and modifications.

---

## Concept Unit: hx-post

### The Problem
If we want to submit data, a standard `<form>` will redirect the user to a new page or reload the current one. How do we submit data in the background and insert the newly created item into a list?

### Introduce the concept in isolation
We can use `hx-post` on a form to submit it via AJAX.

```html
<form hx-post="/add-item" hx-target="#item-list" hx-swap="beforeend" hx-on::after-request="this.reset()">
    <input type="text" name="item" required>
    <button type="submit">Add</button>
</form>
<ul id="item-list"></ul>
```

```python
@app.route('/add-item', methods=['POST'])
def add_item():
    item = request.form.get('item', '').strip()
    return f'<li>{item}</li>'
```
This proves that form data is automatically serialized and sent as a POST request, and the response is appended to the list.

### Discard the throwaway
This throwaway snippet is discarded and won't be used again.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition.
- **Files affected:** `templates/index.html`, `app.py`
- **Change type:** Add
- **Location:** Below the time example.
- **Dependencies:** Flask `request` object.

### The New Code

```html
<form hx-post="/add-item" hx-target="#item-list" hx-swap="beforeend" hx-on::after-request="this.reset()">
    <input type="text" name="item" placeholder="Add item..." required>
    <button type="submit">Add</button>
</form>
<ul id="item-list"></ul>
```

```python
from flask import request

@app.route('/add-item', methods=['POST'])
def add_item():
    item = request.form.get('item', '').strip()
    if not item:
        return '<li style="color:red">Item cannot be empty.</li>', 422
    return f'<li>{item}</li>'
```

### The Updated Project

```html
1: <body>
2:     <!-- time example -->
3:     <form hx-post="/add-item" hx-target="#item-list" hx-swap="beforeend" hx-on::after-request="this.reset()"> <!-- new -->
4:         <input type="text" name="item" placeholder="Add item..." required>
5:         <button type="submit">Add</button>
6:     </form>
7:     <ul id="item-list"></ul> <!-- new -->
8: </body>
```

The form submits to the server, and the new item seamlessly appears in the list.

### Mechanical walkthrough
1. The user types "apple" and clicks Add.
2. The form triggers a submit event. HTMX intercepts it due to `hx-post`.
3. HTMX serializes the input field (`name="item"`) into a form-encoded POST body (`item=apple`).
4. Flask receives the request, extracts the item from `request.form`, and constructs the HTML `<li>apple</li>`.
5. HTMX receives the response. Because `hx-swap="beforeend"`, it appends the `<li>` inside `#item-list` right after any existing children.
6. The `hx-on::after-request="this.reset()"` hook executes, clearing the form input.

### CS lens
State synchronization. In traditional SPA architecture, you submit data, update a client-side state store (like Redux), and re-render the UI. With HTMX (Hypermedia As The Engine Of Application State, or HATEOAS), the server returns the updated state directly as UI. The server remains the single source of truth.

### SE lens
Error handling at the component level. By returning a 422 status and a red `<li>` for empty inputs, the server handles validation and UI error states directly, keeping the frontend completely unaware of validation logic.

### Commands needed
Run: `python app.py`
Then open http://localhost:5000 in a browser.

### Run it
Typing an item and pressing Enter adds it to the list instantly, and the input field clears itself.

### One sentence connecting to previous unit
We've appended content, but sometimes we need to replace the triggering element entirely.

---

## Concept Unit: hx-swap values

### The Problem
When a user dismisses an alert or loads a one-time notification, appending content isn't right. The original element needs to disappear or be replaced completely.

### Introduce the concept in isolation
`hx-swap` supports multiple strategies, including `outerHTML` which replaces the target element itself.

```html
<button hx-get="/notification" hx-target="this" hx-swap="outerHTML">
    Load notification
</button>
```

```python
@app.route('/notification')
def notification():
    return '<div class="notification">✓ Notification loaded!</div>'
```
This proves that using `outerHTML` and `hx-target="this"` allows an element to replace itself with the server's response.

### Discard the throwaway
This throwaway example is discarded and won't be kept.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `templates/index.html`, `app.py`
- **Change type:** Add
- **Location:** Below the list form.
- **Dependencies:** None.

### The New Code

```html
<div id="container">
    <button hx-get="/notification" hx-target="this" hx-swap="outerHTML">
        Load notification
    </button>
</div>
```

```python
@app.route('/notification')
def notification():
    return '<div class="notification">✓ Notification loaded!</div>'
```

### The Updated Project

```html
1: <body>
2:     <!-- list example -->
3:     <div id="container">
4:         <button hx-get="/notification" hx-target="this" hx-swap="outerHTML"> <!-- new -->
5:             Load notification
6:         </button>
7:     </div>
8: </body>
```

The button exists initially, but clicking it removes the button and leaves only the notification div in its place.

### Mechanical walkthrough
1. The user clicks the button.
2. `hx-target="this"` tells HTMX the target is the button itself.
3. The GET `/notification` request is made.
4. The server returns the `<div class="notification">...</div>`.
5. `hx-swap="outerHTML"` instructs HTMX to replace the entire target node (the `<button>`), not just its inner content.
6. The button is destroyed in the DOM, and the new div takes its exact place in `#container`.

### CS lens
DOM Manipulation strategies. `innerHTML` touches the children of a node, while `outerHTML` touches the node and its position in its parent. This maps directly to underlying Web APIs like `Element.innerHTML` versus `Element.replaceWith()`.

### SE lens
Component lifecycle. Replacing an element with `outerHTML` is a powerful way to represent state transitions—like a "Load More" button replacing itself with the next page of results, natively chaining UI states without client-side tracking.

### Commands needed
Run: `python app.py`
Then open http://localhost:5000 in a browser.

### Run it
Clicking the button replaces the button itself with a checkmark notification. The button is gone permanently.

### One sentence connecting to previous unit
All our actions so far required a click or submit, but some interactions happen via typing or scrolling.

---

## Concept Unit: hx-trigger

### The Problem
We want to implement a live search feature where results update as the user types, without waiting for them to hit a submit button or overloading the server with requests on every single keystroke.

### Introduce the concept in isolation
`hx-trigger` lets you define custom events, modifiers, and delays.

```html
<input name="q"
       hx-get="/search"
       hx-target="#results"
       hx-trigger="keyup changed delay:500ms"
       placeholder="Search...">
<ul id="results"></ul>
```

```python
@app.route('/search')
def search():
    q = request.args.get('q', '').strip()
    return f'<li>Result for "{q}"</li>'
```
This proves that HTMX can listen to keystrokes, wait until the user stops typing for 500ms, and only then fire the request.

### Discard the throwaway
This throwaway example is discarded.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `templates/index.html`, `app.py`
- **Change type:** Add
- **Location:** At the bottom of the page container.
- **Dependencies:** None.

### The New Code

```html
<input name="q"
       hx-get="/search"
       hx-target="#results"
       hx-trigger="keyup changed delay:500ms"
       placeholder="Search...">
<ul id="results"></ul>
```

```python
@app.route('/search')
def search():
    q = request.args.get('q', '').strip()
    if not q:
        return '<p>Type to search...</p>'
    results = [f'Result for "{q}" #{i}' for i in range(1, 4)]
    items = ''.join(f'<li>{r}</li>' for r in results)
    return f'{items}'
```

### The Updated Project

```html
1: <body>
2:     <!-- notification example -->
3:     <input name="q" <!-- new -->
4:            hx-get="/search"
5:            hx-target="#results"
6:            hx-trigger="keyup changed delay:500ms"
7:            placeholder="Search...">
8:     <ul id="results"></ul> <!-- new -->
9: </body>
```

The input field now acts as an active search component, firing background requests intelligently.

### Mechanical walkthrough
1. The user focuses the input and types 'p'. The `keyup` event fires.
2. The `delay:500ms` modifier starts a 500-millisecond timer.
3. The user quickly types 'y'. Another `keyup` fires. The timer is reset to 500ms.
4. The user stops typing. The 500ms timer elapses.
5. The `changed` modifier checks if the input value is different from the last time a request was sent. It is.
6. The GET `/search?q=py` request is fired.
7. Flask processes the string, builds an HTML string of 3 list items, and returns it.
8. HTMX swaps the items into `#results`.

### CS lens
Debouncing. Event streams (like continuous typing or mouse movement) fire hundreds of times a second. Debouncing ensures that an expensive operation (like a network request or database query) only executes once the stream has paused for a defined duration.

### SE lens
Performance and Rate Limiting. By combining `delay:500ms` and `changed`, we prevent the server from being DDOSed by fast typers, and avoid redundant database queries if the user types a letter and immediately backspaces it within the delay window.

### Commands needed
Run: `python app.py`
Then open http://localhost:5000 in a browser.

### Run it
Typing into the search box waits until you pause, then seamlessly displays the search results underneath.

### One sentence connecting to previous unit
Sometimes a route needs to act differently if accessed via HTMX vs. a direct browser link.

---

## Concept Unit: HX-Request header

### The Problem
If a user bookmarks your `/search` URL or refreshes the page, you want to render the full site layout (with the `<head>`, CSS, navigation, etc.). But if HTMX requests `/search` via AJAX, you *only* want to return the HTML fragment to swap. How can one endpoint serve both?

### Introduce the concept in isolation
HTMX adds special HTTP headers to every request it makes, such as `HX-Request: true`.

```python
@app.route('/page')
def page():
    is_htmx = request.headers.get('HX-Request') == 'true'
    if is_htmx:
        return '<p>Fragment</p>'
    return '<html><body><p>Full Page</p></body></html>'
```
This proves the server can inspect the headers to conditionally render partial or full HTML.

### Discard the throwaway
This throwaway snippet is discarded.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `app.py`
- **Change type:** Refactor
- **Location:** Update the `/search` route.
- **Dependencies:** Flask `render_template_string` or returning full HTML.

### The New Code

```python
@app.route('/search')
def search():
    q = request.args.get('q', '').strip()
    is_htmx = request.headers.get('HX-Request') == 'true'
    
    if not q:
        content = '<p>Type to search...</p>'
    else:
        results = [f'Result for "{q}" #{i}' for i in range(1, 4)]
        content = ''.join(f'<li>{r}</li>' for r in results)
        
    if is_htmx:
        # Return just the fragment for HTMX swap
        return content
    else:
        # Return a full valid HTML page for direct browser access
        return f'<html><body><h1>Search Page</h1><ul>{content}</ul></body></html>'
```

### The Updated Project

```python
1: @app.route('/search')
2: def search():
3:     q = request.args.get('q', '').strip()
4:     is_htmx = request.headers.get('HX-Request') == 'true' # ← new
5:     
6:     if not q:
7:         content = '<p>Type to search...</p>'
8:     else:
9:         results = [f'Result for "{q}" #{i}' for i in range(1, 4)]
10:        content = ''.join(f'<li>{r}</li>' for r in results)
11:        
12:    if is_htmx: # ← new
13:        return content
14:    else:
15:        return f'<html><body><h1>Search Page</h1><ul>{content}</ul></body></html>'
```

The server is now smart enough to serve different representations of the same resource based on how it was requested.

### Mechanical walkthrough
1. If the HTMX search input triggers the request, HTMX automatically attaches the HTTP header `HX-Request: true`.
2. The route reads `request.headers.get('HX-Request')`, which evaluates to `'true'`.
3. `is_htmx` becomes `True`. The server returns just the `<li>` fragments. HTMX swaps them into the page perfectly.
4. If a user manually types `http://localhost:5000/search?q=flask` in their browser address bar, the browser makes a standard GET request. No `HX-Request` header is sent.
5. The route reads the header, gets `None`, and `is_htmx` evaluates to `False`.
6. The server wraps the `<li>` items in standard `<html><body>` tags, delivering a proper, independently viewable webpage.

### CS lens
Content Negotiation. HTTP allows clients and servers to negotiate what format the response should be in. Just as `Accept: application/json` requests JSON, `HX-Request: true` is HTMX's custom way of requesting an HTML fragment instead of a full document.

### SE lens
Progressive Enhancement. By gracefully handling both HTMX and non-HTMX requests, the application becomes robust. Deep linking works naturally, and URLs remain easily shareable, avoiding the classic SPA trap where refreshing the page breaks the layout or loses the state.

### Commands needed
Run: `python app.py`
Then open http://localhost:5000 in a browser.

### Run it
Use the search input on the main page to see the fragment swap. Then, manually navigate your browser to `/search?q=test` and verify you see the fallback full HTML page layout.

### One sentence connecting to previous unit
With the ability to differentiate clients, we have a robust, full-stack foundation for HTMX interactivity.

---

## Closing

### Connect the pieces
When a user types 'flask' in the search input, the `hx-trigger="keyup delay:500ms"` waits for them to pause. HTMX fires a GET request to `/search?q=flask` adding the `HX-Request: true` header. The Flask server detects this header, bypasses the full HTML wrapper, and returns the 'Result for flask' `<li>` fragment. HTMX receives the fragment and natively uses `hx-swap="innerHTML"` to inject it into the `#results` target, seamlessly updating the page without a full reload. You have now shifted all the complexity of AJAX logic from the frontend to the backend using purely declarative attributes.
