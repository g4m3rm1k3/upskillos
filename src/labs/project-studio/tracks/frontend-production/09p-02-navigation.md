---
title: Production 2 — URLs, history and accessible navigation
track: Frontend Developer Bootcamp — Production React
trackOrder: 50.095
runtime: none
---

Outcome: split shelf and catalog into linkable screens without losing shared state; make unknown addresses recoverable.

### The story so far

A growing page becomes difficult to scan. Routes give tasks stable addresses. Imagine rooms in a library: the address tells you where you are, while the building keeps the same collection. The analogy stops at network behavior: a URL can ask a server for a resource or change only browser state, depending on its structure.

## Give the application a router

Our portfolio lives on static hosting under a possible repository subdirectory. HashRouter stores the client route after #, so the server still receives /react/index.html. BrowserRouter uses pathname routes and needs server fallback configuration for direct loads. Neither choice is universally better; the hosting contract decides.

The root App must remain inside the router so useLocation and links share its context. Wrapping the tree does not define its screens yet.

```predict
question: When /react/index.html#/search is reloaded, does the server receive #/search?
choice: No
choice: Yes
answer: No
explain: Fragments are handled by the browser; the server receives the document path.
```

```tsx file=react/main.tsx
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
import { App } from './App.tsx';
import './styles.css';
const root = document.getElementById('root');
if (!root) throw new Error('Missing React root element');
createRoot(root).render(<HashRouter><App /></HashRouter>);
```

```check
run "npm run typecheck"
```

## Connect links, routes and shared state

Routes chooses the matching screen; a star route provides recovery. NavLink exposes aria-current for the selected destination. Its className callback also makes the active link bold; both links stay underlined so navigation is identifiable without relying on color. The wrapping row gives each link breathing room at narrow widths. end prevents the shelf link from also matching every nested path. A link is a navigation affordance: people can open it in another tab, copy it or use history. A button performs an action.

Keep books above Routes: switching screen content must not destroy the shelf owner. LocalStorage is persistence, not a substitute for shared reactive state. The search form can reset when its route unmounts; the shelf cannot. Make that product decision explicit.

On pathname changes the effect updates the browser title and focuses the heading. A screen change should be discoverable to a keyboard or screen-reader user. tabIndex=-1 permits programmatic focus without inserting another Tab stop. The skip link prevents the hash router interpreting an in-document fragment as a route.

Trace: click Find books → hash changes → location changes → route renders → effect focuses heading. Back reverses the location, renders the shelf, and retains books because their owner stayed mounted. Directly entering an unknown hash renders the recovery link.

```tsx file=react/App.tsx
import { useState, useEffect, useRef } from 'react';
import { NavLink, Routes, Route, useLocation, Link } from 'react-router';
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
  const location = useLocation();
  const pageHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = location.pathname === '/search' ? 'Find books — Reading Room' : 'Reading Room';
    pageHeading.current?.focus();
  }, [location.pathname]);
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
    setBooks(previous => [...previous, { id: crypto.randomUUID(), title: title.trim(), author: 'Added by you' }]);
    setTitle('');
    setError('');
  }
  function remove(id: string) {
    setBooks(previous => previous.filter(book => book.id !== id));
    titleInput.current?.focus();
  }
  return <main>
    <a className="underline underline-offset-4" href="#main-content" onClick={event => { event.preventDefault(); pageHeading.current?.focus(); }}>Skip to content</a>
    <nav className="my-4 flex flex-wrap gap-4" aria-label="Reading Room"><NavLink className={({ isActive }) => isActive ? 'font-bold underline underline-offset-4' : 'underline underline-offset-4'} to="/" end>My shelf</NavLink><NavLink className={({ isActive }) => isActive ? 'font-bold underline underline-offset-4' : 'underline underline-offset-4'} to="/search">Find books</NavLink></nav>
    <h1 id="main-content" ref={pageHeading} tabIndex={-1}>{location.pathname === '/search' ? 'Find books' : 'Reading Room'}</h1>
    <Button aria-pressed={theme === 'dark'} onClick={() => setTheme(previous => previous === 'dark' ? 'light' : 'dark')}>Dark theme</Button>

    {storageError && <p role="alert">{storageError}</p>}
    <Routes>
      <Route path="/" element={<>
    <form onSubmit={add}><label htmlFor="title">Book title</label><input ref={titleInput} aria-invalid={Boolean(error)} aria-describedby="shelf-status" id="title" value={title} onChange={event => setTitle(event.target.value)} /><button>Add book</button></form>
    <p id="shelf-status" role="status">{error || `${books.length} ${books.length === 1 ? 'book' : 'books'} saved`}</p>
    {books.length === 0 && <p>Your shelf is empty. Add a book you want to read.</p>}
    {books.map(book => <BookCard key={book.id} book={book} onRemove={remove} />)}
      </>} />
      <Route path="/search" element={<>
    <BookSearch onSave={book => setBooks(previous => previous.some(item => item.id === book.id) ? previous : [...previous, book])} />
        <p role="status">{books.length} saved on your shelf.</p>
      </>} />
      <Route path="*" element={<><h2>Page not found</h2><p>This address does not match a page.</p><Link to="/">Return to shelf</Link></>} />
    </Routes>
  </main>;
}
```

```check
run "npm run typecheck"
page react/index.html "(async () => { location.hash = '/search'; await new Promise(r => setTimeout(r, 100)); return document.querySelector('h1').textContent; })()" "Find books" server=vite
```

## Your turn: write a useful missing-page recovery

Change the missing-page explanation to This page moved or never existed. Use the recovery link, then Back and Forward. Explain why the browser URL is part of application state.

```check
contains react/App.tsx "This page moved or never existed."
run "npm run typecheck"
```

```hints
nudge: Find the wildcard route.
concept: Recovery should tell people what happened and provide a real destination.
shape: Keep the Link to the shelf; replace its neighboring explanation.
```

## Diagnose, explain and review

Reload #/search directly; enter #/missing; recover to shelf; press Back and Forward. Watch the address, active link, heading, focus and saved collection separately. Temporarily move shelf state into a route child to explain why navigation would reset it, then restore the state owner. Hash routing does not supply server rendering or authentication.

### Explain it without the reference

Explain the input, state transition and observable output of your change. Predict a failure before introducing it, record what actually happened, restore the code and rerun the check. Write the observed result, your explanation and one case these checks do not establish in your learning journal.
