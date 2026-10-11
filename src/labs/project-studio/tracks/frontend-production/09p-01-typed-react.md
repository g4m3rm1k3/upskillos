---
title: Production 1 — Migrate the working React app
track: Frontend Developer Bootcamp — Production React
trackOrder: 50.095
runtime: none
---

Outcome: make the full React entry and component tree type checked, keep runtime boundaries validated, and repair validation and deletion focus.

### The story so far

The small SearchState module taught narrowing. Now that vocabulary must survive contact with real props, browser events, nullable DOM references and asynchronous data. Think of this migration as labeling the connections in a working circuit: the labels catch incompatible connections, but they cannot guarantee the power supply never fails. Keep behavior tests and manual interaction alongside the compiler.

## Install type definitions

A library can run perfectly in JavaScript while the compiler lacks a description of its props. The @types packages supply those descriptions. Install the updated manifest with `npm install`, keep its lockfile, and keep the previous scripts. React Router and Playwright are installed now for the next lessons; they do not change runtime behavior until imported.

A migration is a sequence of small boundary changes, not a rename followed by silencing diagnostics. Keep the working JSX files until the new entry runs. Once verified, delete the obsolete App.jsx, BookSearch.jsx, Button.jsx and main.jsx to avoid editing the wrong copy.

```predict
question: Can a successful Vite transformation replace a strict type check?
choice: No
choice: Yes
answer: No
explain: Transforming annotations and checking relationships are separate operations.
```

```json file=package.json
{
  "name": "frontend-portfolio",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "vite build",
    "preview": "vite preview --host 127.0.0.1",
    "typecheck": "tsc --noEmit",
    "test": "node --test quality/contracts.test.mjs",
    "test:browser": "playwright test"
  },
  "devDependencies": {
    "vite": "8.3.4",
    "tailwindcss": "4.3.3",
    "@tailwindcss/vite": "4.3.3",
    "typescript": "7.0.2",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "@playwright/test": "1.64.0"
  },
  "dependencies": {
    "bootstrap": "5.3.8",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "react-router": "8.4.0"
  }
}
```

```check
contains package.json "@types/react"
```

## Describe the existing API boundary

The implementation still lives in books/api.mjs, which already validates downloaded values. A neighboring .d.mts file describes an ES module to TypeScript. `typeof fetch` reuses the browser request function's signature; `Promise<Book[]>` describes what a successful await yields. Optional parameters use `?` because callers can use the defaults.

This declaration is a promise we maintain alongside runtime tests, not proof that the implementation honors it. Change the runtime contract and declaration together. For a larger migration, move the implementation into TypeScript itself and retain its JSON guards.

```text file=books/api.d.mts
import type { Book } from '../quality/search';
export function searchBooks(query: string, request?: typeof fetch, signal?: AbortSignal): Promise<Book[]>;
```

```check
file books/api.d.mts
```

## Type the control contract

Props are inputs, like parameters to a function. ButtonHTMLAttributes includes native disabled, event handlers, children and accessibility properties. The intersection `&` adds our two allowed variants. Misspelling a variant becomes a compiler error.

The rest object forwards native behavior. Explicit type defaults to button, preventing accidental form submission. A submit caller still supplies type="submit". className adds layout utilities; avoid conflicting color utilities because class-string order alone does not decide the CSS cascade.

```tsx file=react/Button.tsx
import type { ButtonHTMLAttributes } from 'react';
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' };
const variants = {
  primary: 'bg-brand text-white hover:opacity-90',
  secondary: 'border border-current bg-transparent text-inherit',
};
export function Button({ variant = 'primary', type = 'button', className = '', children, ...props }: Props) {
  return <button {...props} type={type} className={`min-h-11 rounded-lg px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-4 ${variants[variant]} ${className}`}>{children}</button>;
}
```

```check
file react/Button.tsx
```

## Type asynchronous state

An empty array alone offers no evidence about its future element type. The generic in useState supplies that missing contract. The query starts null, so its type explicitly permits null and an object with text. Search results contain Book values that onSave accepts.

The active flag and AbortController still solve runtime ordering. TypeScript cannot know which request will finish first. Read the effect aloud: start, receive, check ownership, commit; on replacement, revoke ownership and abort.

```tsx file=react/BookSearch.tsx
import type { Book } from '../quality/search';
type Result = { state: 'idle' | 'loading' | 'error'; books: Book[] } | { state: 'success'; books: Book[] };
import { useEffect, useState } from 'react';
import { searchBooks } from '../books/api.mjs';
export function BookSearch({ onSave }: { onSave: (book: Book) => void }) {
  const [text, setText] = useState('');
  const [query, setQuery] = useState<{ text: string } | null>(null);
  const [result, setResult] = useState<Result>({ state: 'idle', books: [] });
  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    let active = true;
    setResult({ state: 'loading', books: [] });
    searchBooks(query.text, fetch, controller.signal).then(books => {
      if (active) setResult({ state: 'success', books });
    }).catch(error => {
      if (active && error.name !== 'AbortError') setResult({ state: 'error', books: [] });
    });
    return () => { active = false; controller.abort(); };
  }, [query]);
  return <section className="my-8 rounded-xl border border-slate-400 p-4" aria-labelledby="search-title">
    <h2 id="search-title">Find your next book</h2>
    <form onSubmit={event => { event.preventDefault(); setQuery({ text: text.trim() }); }}>
      <label htmlFor="book-query">Title or author</label><input id="book-query" required value={text} onChange={event => setText(event.target.value)} /><button>Search catalog</button>
    </form>
    <p role="status">{result.state === 'loading' ? 'Searching…' : result.state === 'error' ? 'Search failed. Submit again to retry.' : result.state === 'success' ? `${result.books.length} results` : 'Search Open Library.'}</p>
    {result.state === 'success' && result.books.length === 0 && <p>No matches. Try fewer words.</p>}
    <ul>{result.books.map(book => <li key={book.id}>{book.title} — {book.author} <button onClick={() => onSave(book)}>Save {book.title}</button></li>)}</ul>
  </section>;
}
```

```check
file react/BookSearch.tsx
```

## Type the state owner and repair focus

The shelf loader returns Book[] only after checking the untrusted storage value. `unknown` forces inspection before use; an assertion would merely ask the compiler to trust us. Array.isArray narrows the container, then the existing property guards and duplicate-id check protect the contract.

FormEvent names the event's form element. The input ref begins null and becomes an element after React mounts it. Optional chaining calls focus only when it exists. After removing a card, its button disappears, so focus moves to a stable add control. Validation connects the input to its explanation and marks it invalid. This is one sensible policy for this small shelf; a large collection may preserve focus on a neighboring item instead. Test with a keyboard, not just a mouse.

```tsx file=react/App.tsx
import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import type { Book } from '../quality/search';
import { BookSearch } from './BookSearch.tsx';
import { Button } from './Button.tsx';
function BookCard({ book, onRemove }: { book: Book; onRemove: (id: string) => void }) {
  return <article className="break-words"><h2>{book.title}</h2><p>{book.author}</p><Button variant="secondary" onClick={() => onRemove(book.id)}>Remove {book.title}</Button></article>;
}
function loadShelf(): Book[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('reading-room-v1') ?? '[]');
    if (!Array.isArray(value) || !value.every(book => book && typeof book.id === 'string' && typeof book.title === 'string' && typeof book.author === 'string')) return [];
    return new Set(value.map(book => book.id)).size === value.length ? value : [];
  } catch { return []; }
}
export function App() {
  const [books, setBooks] = useState(loadShelf);
  const titleInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState(() => {
    try { const saved = localStorage.getItem('reading-theme'); if (saved === 'dark' || saved === 'light') return saved; } catch {}
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('reading-theme', theme); } catch {}
  }, [theme]);
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  useEffect(() => {
    try { localStorage.setItem('reading-room-v1', JSON.stringify(books)); setStorageError(''); }
    catch { setStorageError('Storage unavailable; changes will not survive reload.'); }
  }, [books]);
  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) { setError('Write a title first.'); titleInput.current?.focus(); return; }
    setBooks(previous => [...previous, { id: crypto.randomUUID(), title: title.trim(), author: 'Your selection' }]);
    setTitle('');
    setError('');
  }
  function remove(id: string) {
    setBooks(previous => previous.filter(book => book.id !== id));
    titleInput.current?.focus();
  }
  return <main>
    <h1>Reading Room</h1>
    <Button aria-pressed={theme === 'dark'} onClick={() => setTheme(previous => previous === 'dark' ? 'light' : 'dark')}>Dark theme</Button>
    <BookSearch onSave={book => setBooks(previous => previous.some(item => item.id === book.id) ? previous : [...previous, book])} />
    {storageError && <p role="alert">{storageError}</p>}
    <form onSubmit={add}><label htmlFor="title">Book title</label><input ref={titleInput} aria-invalid={Boolean(error)} aria-describedby="shelf-status" id="title" value={title} onChange={event => setTitle(event.target.value)} /><button>Add book</button></form>
    <p id="shelf-status" role="status">{error || `${books.length} ${books.length === 1 ? 'book' : 'books'} saved`}</p>
    {books.length === 0 && <p>Your shelf is empty. Add a book you want to read.</p>}
    {books.map(book => <BookCard key={book.id} book={book} onRemove={remove} />)}
  </main>;
}
```

```check
file react/App.tsx
```

## Include the complete React source

Expand include so the compiler reaches every TSX component. The vite/client types describe Vite-managed assets such as CSS side-effect imports; they do not disable checking of application code. The react-jsx setting supports JSX transformation; strict null checking also forces us to handle a missing root element. A compiler result describes the files included in its program, so a conveniently narrow include can create false confidence.

```json file=tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "lib": [
      "ES2022",
      "DOM"
    ],
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "types": ["vite/client"],
    "allowImportingTsExtensions": true
  },
  "include": [
    "quality/**/*.ts",
    "react/**/*.ts",
    "react/**/*.tsx",
    "books/**/*.d.mts"
  ]
}
```

```check
run "npm run typecheck"
```

## Start the typed tree

The HTML root lookup can return null. The guard produces a clear diagnostic instead of forcing a type assertion. The imports explicitly name .tsx so old .jsx copies cannot win module resolution during migration. allowImportingTsExtensions permits this in our noEmit compiler configuration; Vite builds the modules. The next step changes which entry the browser requests.

```tsx file=react/main.tsx
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './styles.css';
const root = document.getElementById('root');
if (!root) throw new Error('Missing React root element');
createRoot(root).render(<App />);
```

```check
run "npm run typecheck"
```

## Point HTML at the new entry

Change the script path and reload the app. Add a book, reload, remove it with the keyboard, and confirm focus reaches the title field. The old .jsx files are now unused; delete them after this check. A successful typecheck does not prove focus behavior, which is why the page check exercises an actual deletion.

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
  <script type="module" src="main.tsx"></script>
</body>
</html>
```

```check
page react/index.html "document.querySelector('h1').textContent" "Reading Room" server=vite
```

## Your turn: change a typed behavior

Change the default author of a manually added book to Added by you in the typed App. Confirm the JSX source is no longer the active implementation. Run typecheck and add a book in the browser.

```check
contains react/App.tsx "Added by you"
run "npm run typecheck"
```

```hints
nudge: Find the object created on submit.
concept: A migration must switch the entry, not just create unused typed copies.
shape: Change the author string without weakening the Book type.
```

## Diagnose, explain and review

Temporarily pass variant="danger" to Button. The compiler should reject it. Restore the variant. Then submit whitespace, inspect the error association, and remove a saved card using the keyboard. Does the focus destination make sense? Explain which of these failures the compiler can and cannot detect.

### Explain it without the reference

Explain the input, state transition and observable output of your change. Predict a failure before introducing it, record what actually happened, restore the code and rerun the check. Write the observed result, your explanation and one case these checks do not establish in your learning journal.
