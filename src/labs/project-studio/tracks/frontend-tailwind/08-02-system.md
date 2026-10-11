---
title: 8.2 — Build a small design system with component contracts
track: Frontend Developer Bootcamp — Tailwind and a Component System
trackOrder: 50.08
runtime: none
---

Outcome: express repeated behavior and design choices in a reusable component. A design system combines tokens, components, content rules and usage guidance. It is more than a folder of buttons. Start with real repeated needs; avoid creating dozens of variants before a product needs them.

### The story so far

The React app now has its own token vocabulary and repeated actions. Instead of copying a button’s appearance and behavior every time, we will define a small component with a clear public contract.

A component system should make the safe, common choice easy. It should also leave enough native HTML behavior visible that a caller can still submit a form, disable an action or supply an accessible name correctly.

## Make safe defaults explicit

### A component API is a promise to its callers

The Button component accepts children, variant, type and remaining native props. Those names form an API: callers should be able to predict what happens without reading the implementation every time.

A useful analogy is a standardized power socket. The interface reduces repeated decisions, but its safety depends on a precise contract, not just identical outer shape. Here the contract includes a non-submitting default type and proper forwarding of disabled and onClick.

The analogy stops at universality. This tiny Button is designed for our app’s needs; it is not a complete component library handling every product context.

Before trying this step, make a prediction.

```predict
question: Is a gray button automatically disabled?
choice: No
choice: Yes
answer: No
explain: Appearance does not prevent events; native disabled establishes that behavior.
```

children is the nested button content. ...props forwards event handlers, disabled and accessible labels. Default type="button" avoids accidentally submitting a surrounding form. Map named variants to complete literal class strings so Tailwind can discover them. Native disabled prevents interaction; aria-disabled alone would not.

```jsx file=react/Button.jsx
import React from 'react';
const variants = {
  primary: 'bg-brand-700 text-white dark:bg-brand-200 dark:text-slate-950',
  secondary: 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white'
};
export function Button({ variant = 'primary', type = 'button', children, ...props }) {
  return <button {...props} type={type} className={`min-h-11 rounded-lg px-4 py-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant] ?? variants.primary}`}>{children}</button>;
}
```

### Destructuring and rest have complementary jobs

`variant = 'primary'` supplies a default if that prop is omitted or undefined. `type = 'button'` supplies a safe default for actions. `children` holds the nested label or elements. `...props` collects the remaining properties into an object, which `{...props}` forwards to the actual button.

The order is intentional: our explicit type and className define this component’s chosen contract after the spread. A caller’s className is not merged here. If you later add customizable classes, document their precedence instead of silently changing how overrides behave.

The variants object maps a meaningful name to complete class strings. An unknown variant falls back to primary with `??`. That is a defensive runtime choice, not a substitute for good types or documentation.

### State is more than default appearance

A real control has hover, focus, active and disabled states. Focus must remain visible in both themes. Disabled must prevent the action, not merely lower opacity. The reason for a disabled action should be understandable nearby; otherwise people cannot discover how to proceed.

**Rule of thumb:** reuse a component when it packages a meaningful decision and behavior, not simply to reduce line count. If two buttons look alike but have different semantics, preserve those semantics through explicit props. If the interface becomes a dozen booleans that conflict, consider separate components or a clearer variant model.

```check
contains react/Button.jsx "type = 'button'"
```

## Use the quieter action variant

Predict the observable result before opening the reference.

```predict
question: A BookCard Remove control is rendered inside a form. What type does our reusable Button default to?
choice: button
choice: submit
choice: reset
answer: button
explain: The component explicitly chooses button, so a supporting action does not accidentally submit its surrounding form.
verify: page react/index.html "(async () => { const i=document.querySelector('#title'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'Trace'); i.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,20)); i.form.requestSubmit(); await new Promise(r=>setTimeout(r,20)); return document.querySelector('article button').type; })()" server=vite
```

Removing a book should not visually overpower adding or searching. Reuse Button for removal with secondary styling. Decide hierarchy by importance and frequency, not by giving every action the strongest color. The native button still has a descriptive accessible name.

```jsx file=react/App.jsx
import React, { useState, useEffect } from 'react';
import { BookSearch } from './BookSearch.jsx';
import { Button } from './Button.jsx';
function BookCard({ book, onRemove }) {
  return <article><h2>{book.title}</h2><p>{book.author}</p><Button variant="secondary" onClick={() => onRemove(book.id)}>Remove {book.title}</Button></article>;
}
function loadShelf() {
  try {
    const value = JSON.parse(localStorage.getItem('reading-room-v1') ?? '[]');
    if (!Array.isArray(value) || !value.every(book => book && typeof book.id === 'string' && typeof book.title === 'string' && typeof book.author === 'string')) return [];
    return new Set(value.map(book => book.id)).size === value.length ? value : [];
  } catch { return []; }
}
export function App() {
  const [books, setBooks] = useState(loadShelf);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  useEffect(() => {
    try { localStorage.setItem('reading-room-v1', JSON.stringify(books)); setStorageError(''); }
    catch { setStorageError('Storage unavailable; changes will not survive reload.'); }
  }, [books]);
  function add(event) {
    event.preventDefault();
    if (!title.trim()) { setError('Write a title first.'); return; }
    setBooks(previous => [...previous, { id: crypto.randomUUID(), title: title.trim(), author: 'Your selection' }]);
    setTitle('');
    setError('');
  }
  function remove(id) { setBooks(previous => previous.filter(book => book.id !== id)); }
  return <main>
    <h1>Reading Room</h1>
    <BookSearch onSave={book => setBooks(previous => previous.some(item => item.id === book.id) ? previous : [...previous, book])} />
    {storageError && <p role="alert">{storageError}</p>}
    <form onSubmit={add}><label htmlFor="title">Book title</label><input id="title" value={title} onChange={event => setTitle(event.target.value)} /><button>Add book</button></form>
    <p role="status">{error || `${books.length} ${books.length === 1 ? 'book' : 'books'} saved`}</p>
    {books.length === 0 && <p>Your shelf is empty. Add a book you want to read.</p>}
    {books.map(book => <BookCard key={book.id} book={book} onRemove={remove} />)}
  </main>;
}
```

### Visual hierarchy expresses priorities

A primary action should stand out relative to supporting actions in the same task region. If Save, Cancel, Remove and Help all have identical emphasis, the interface asks the person to perform the prioritization you avoided.

Secondary does not mean unreadable or inaccessible. The remove action still needs enough contrast, a clear name and visible focus. Color is only one cue; grouping, placement and wording reinforce the relationship.

```check
page react/index.html "(async () => { const input=document.querySelector('#title'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Design Book'); input.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,20)); input.form.requestSubmit(); await new Promise(r=>setTimeout(r,20)); return document.querySelector('article button').type; })()" "button" server=vite
```

## Your turn: document when to use each variant

Create design/components.txt with Primary:, Secondary:, Focus:, and Disabled: guidance. State that there should be one clear primary action per task region, secondary actions must remain readable, focus must be visible, and disabled actions need an explanation. Include one screenshot reference from your own app if useful.

```check
contains design/components.txt "Focus:"
contains design/components.txt "Disabled:"
```

```hints
nudge: A style needs usage rules to be a system.
concept: Include interaction states, not only default colors.
shape: Explain intent, visible focus and recovery from disabled actions.
```

## Diagnose, explain and review

Place a temporary Button inside a form with no type prop and confirm it does not submit; a plain button defaults to submit. Remove the experiment. Review pointer, keyboard, touch, hover, active, focus and disabled appearances. Test the actual disabled attribute rather than a gray appearance alone.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

Explain why type="button" is a safer reusable default than the browser’s default inside a form. Then describe what happens to onClick, disabled and className when they pass through this component. If you want callers to customize styling, propose an explicit contract rather than assuming the spread handles it.
