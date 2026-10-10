---
title: 7.1 — React: components, JSX, props and identity
track: Frontend Developer Bootcamp — React Reading List
trackOrder: 50.07
runtime: none
reference: optional
---

Outcome: rebuild a reading list as components. React describes UI from data, then updates the DOM. JSX is JavaScript syntax for describing elements; the build tool transforms it. A component is a capitalized function returning UI. Props are its read-only inputs. Learn this after the DOM version so you can compare the responsibilities.

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

```check
contains react/main.jsx "createRoot"
```

## Pass a book as data

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

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
