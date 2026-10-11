---
title: 7.1 — React: components, JSX, props and identity
track: Frontend Developer Bootcamp — React Reading List
trackOrder: 50.07
runtime: none
---

Outcome: rebuild a reading list as components. React describes UI from data, then updates the DOM. JSX is JavaScript syntax for describing elements; the build tool transforms it. A component is a capitalized function returning UI. Props are its read-only inputs. Learn this after the DOM version so you can compare the responsibilities.

### The story so far

You have already rendered a task array manually: create nodes, attach listeners, append them and restore focus. React changes how you express that work. You describe the UI for the current data; React reconciles that description with the DOM.

The browser has not disappeared. HTML meaning, CSS layout, form behavior, network requests and accessibility still matter. React is another tool for organizing updates, not a replacement for the platform you just learned.

### Start with one component you can read

Before installing anything, read this small example. It is a worked example, not another file to create yet:

```jsx
function Greeting() {
  return <h1>Hello, reader!</h1>;
}
```

`function Greeting()` declares a JavaScript function. Its capitalized name makes it a React component. `return` supplies the UI description. `<h1>` still means a first-level heading. The visible result is **Hello, reader!** React does not call this function until we put its component into the rendered tree.

Now give the same component an input:

```jsx
function Greeting({ name }) {
  return <h1>Hello, {name}!</h1>;
}

// Used inside another component's returned JSX:
<Greeting name="Maya" />
```

The visible result is **Hello, Maya!** `name="Maya"` supplies a prop. `{ name }` in the function parameter takes that property from the incoming object; `{name}` inside the heading inserts its value into the UI. One is JavaScript destructuring, the other is a JSX expression. They use similar punctuation for different jobs.

Predict the result of changing the supplied name to Sam. Then explain why `<Greeting />` is our component while `<h1>` is a built-in HTML element. The full files below connect this same idea to a real page, using book data instead of a greeting. Type those guided files in order; the independent exercise comes afterwards.

## Add React to the portfolio tools

Before trying this step, make a prediction.

```predict
question: Does a visible control guarantee that its interaction behavior is connected?
choice: No
choice: Yes
answer: No
explain: Rendering and event behavior are different contracts and need different checks.
```

Update the manifest and run npm install. React and react-dom must use compatible versions. This course uses a Vite client app to teach fundamentals; production projects may benefit from a framework for routing and server rendering. React’s official guide supports this learning path: https://react.dev/learn/build-a-react-app-from-scratch .

```json file=package.json
{
  "name": "frontend-portfolio",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "vite build",
    "preview": "vite preview --host 127.0.0.1"
  },
  "devDependencies": {
    "vite": "8.3.4"
  },
  "dependencies": {
    "bootstrap": "5.3.8",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  }
}
```

```check
contains package.json "\"react-dom\""
```

## Create the React host page

The root div is a host for React; main.jsx starts the application. The page title and language still belong in HTML. Keep each portfolio app in its own folder.

```html file=react/index.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reading Room</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="main.jsx"></script>
</body>
</html>
```

```check
page react/index.html "document.querySelector('#root') !== null" "true" server=static
```

## Start the root

createRoot mounts one React tree. The render call receives an element describing App. Do not query and mutate React-owned descendants yourself; state and props should drive them. CSS is shared temporarily and will become a dedicated Tailwind design later.

```jsx file=react/main.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import '../cafe/styles.css';
createRoot(document.querySelector('#root')).render(<App />);
```

### Entry point, component and browser host

`document.querySelector('#root')` finds the existing HTML element. createRoot tells React where it may manage descendants. `.render(<App />)` supplies the top-level element description. The JSX is transformed by Vite before the browser executes it.

The HTML head still supplies the document language, title and viewport. React does not make those concerns optional. Likewise, importing a stylesheet does not excuse an unlabeled input or a missing heading.

**Rule of thumb:** one system should own a piece of UI state. Let React manage its rendered descendants instead of calling querySelector and changing their text behind React’s back. Use effects or refs at deliberate integration boundaries when direct platform access is genuinely necessary.

```check
contains react/main.jsx "createRoot"
```

## Pass a book as data

### Component as a reusable description

A printing-template analogy helps: BookCard defines how one book should be presented, while each book object supplies different content. Calling the component through JSX produces a description for that data; it is not a photograph pasted into the page.

The analogy stops at updates. React tracks component identity and can preserve local state across renders. That is why keys matter later when a list changes.

```jsx
<BookCard key={book.id} book={book} />
```

Read this as “Render the BookCard component for this book, using its stable id to distinguish it from siblings.” The `book` on the left is the prop name; the `book` inside braces is the current JavaScript value. They happen to share a name, but they are different positions in the expression.

{ book } destructures the props object. Curly braces inside JSX evaluate a JavaScript expression. map produces elements. key is stable identity for reconciliation, not a visible prop; array positions are poor keys when items move. JSX requires className instead of class and htmlFor instead of for.

```jsx file=react/App.jsx
import React from 'react';
function BookCard({ book }) {
  return <article><h2>{book.title}</h2><p>{book.author}</p></article>;
}
export function App() {
  const books = [{ id: 'a', title: 'A Room to Read', author: 'A. Reader' }, { id: 'b', title: 'Small Steps', author: 'B. Builder' }];
  return <main><h1>Reading Room</h1><p>A considered reading list.</p>{books.map(book => <BookCard key={book.id} book={book} />)}</main>;
}
```

### Unpack the syntax one part at a time

`function BookCard({ book })` uses object destructuring. Without the shorthand, you could write `function BookCard(props)` and read `props.book`. Destructuring simply binds the selected property to a local name; it does not fetch or clone the book.

A component name starts with a capital letter so JSX can distinguish your function from a built-in element such as article. Curly braces inside JSX switch from markup-like syntax to a JavaScript expression: `{book.title}` evaluates the property and renders its value.

`books.map(...)` runs the callback once for each record and creates an array of element descriptions. The arrow callback returns its expression implicitly. If you change an arrow body to braces, you need an explicit return unless you intend it to return undefined.

### Why identity is not a visual detail

Suppose two cards are A and B, and A is removed. With stable keys, React knows B is still B even though it moves to the first position. If position is used as identity, state belonging to the old first card can be associated with a different record. This becomes visible when cards contain inputs or local state.

A key is meaningful among siblings in that list. It should remain stable for the same record; generating a fresh random key during every render defeats that purpose. Generate an id when creating data, not each time you display it.

```check
page react/index.html "document.querySelectorAll('article').length" "2" server=vite
```

## Your turn: add a distinct reading choice

Add a third book with id c and your own title and author. Keep ids unique and render it through BookCard rather than copying markup.

```check
page react/index.html "document.querySelectorAll('article').length" "3" server=vite
```

```hints
nudge: The list is data before it is markup.
concept: map renders every array entry using one component.
shape: Append an object with a unique id and both visible fields.
```

## Diagnose, explain and review

Temporarily use book.name instead of book.title. Missing data renders blank rather than raising a type error. Restore title. Inspect the console after removing keys: React warns about identity. Restore keys. Explain which concerns remain browser concerns even when React is present.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

Translate `function BookCard({ book })` into the longer props form. Then explain why two books with the same title still need different ids, and why a newly generated key on every render would undermine identity rather than improve uniqueness.
