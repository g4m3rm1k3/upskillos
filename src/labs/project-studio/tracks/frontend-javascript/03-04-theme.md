---
title: 3.4 — A theme toggle that remembers your choice
track: Frontend Developer Bootcamp — JavaScript and a Budget Calculator
trackOrder: 50.03
runtime: none
reference: optional
---

Outcome: combine CSS variables, browser preferences and saved state. localStorage stores strings per origin (scheme, host and port) in this browser, not in an account. It may be blocked or full, so treat persistence as a convenience. A manual choice overrides the operating system.

## Add an honest toggle

Before trying this step, make a prediction.

```predict
question: Should a saved manual light choice override a dark system preference?
choice: Yes
choice: No
answer: Yes
explain: The theme policy gives an explicit choice priority over the system default.
```

A toggle button keeps a stable label and uses aria-pressed to communicate whether its named feature is on. Add it to the café header and load the new module. The HTML may precede its module while you type this lesson.

```html file=cafe/index.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Juniper Café</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <a href="#main">Skip to content</a>
  <header>
    <p>Juniper Café</p>
    <nav aria-label="Main"><a href="#menu">Menu</a> <a href="#visit">Visit</a> <a href="#access">Accessibility</a></nav>
    <button id="theme" type="button" aria-pressed="false">Dark theme</button>
  </header>
  <main id="main">
    <h1>Good coffee. Room to pause.</h1>
    <p>Fresh lunch and step-free entry in the town centre.</p>
    <section id="menu" aria-labelledby="menu-title">
      <h2 id="menu-title">Today's menu</h2>
      <ul><li>Filter coffee — $3</li><li>Tomato toast — $7</li></ul>
    </section>
    <section id="visit" aria-labelledby="visit-title">
      <h2 id="visit-title">Plan your visit</h2>
      <p>Open daily, 8am–4pm. 14 Garden Street.</p>
      <a href="mailto:hello@example.com">Email the café</a>
    </section>
    <section id="access"><h2>Accessibility</h2><p>Step-free entry and space for mobility aids.</p></section>
  </main>
  <footer><small>A fictional practice business.</small></footer>
  <script type="module" src="theme.js"></script>
</body>
</html>
```

```check
page cafe/index.html "document.querySelector('#theme').getAttribute('aria-pressed')" "false" server=static
```

## Select, apply and store a theme

Functions avoid repeating update logic. The ternary first accepts only known saved values; otherwise it reads the system preference. dataset maps data-* attributes to properties. Storage exceptions must not prevent interaction. Click the button twice, then reload on the same local-server URL and inspect Application > Local Storage.

```javascript file=cafe/theme.js
const button = document.querySelector('#theme');
const preference = window.matchMedia('(prefers-color-scheme: dark)');
let chosen = null;
try { chosen = localStorage.getItem('juniper-theme'); } catch { /* Storage may be unavailable. */ }
function apply(theme) {
  document.documentElement.dataset.theme = theme;
  button.setAttribute('aria-pressed', String(theme === 'dark'));
}
apply(chosen === 'light' || chosen === 'dark' ? chosen : preference.matches ? 'dark' : 'light');
button.addEventListener('click', () => {
  chosen = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  apply(chosen);
  try { localStorage.setItem('juniper-theme', chosen); } catch { /* The toggle still works. */ }
});
```

```check
page cafe/index.html "(() => { const before = document.documentElement.dataset.theme; document.querySelector('#theme').click(); return document.documentElement.dataset.theme !== before && localStorage.getItem('juniper-theme') === document.documentElement.dataset.theme; })()" "true" server=static
```

## Your turn: follow the system until the user chooses

Listen for the preference object’s change event. When chosen is neither light nor dark, call apply with event.matches ? dark : light. Once the user clicks, keep their choice. Use DevTools Rendering to emulate the preference, clear only juniper-theme, and reload before testing automatic mode.

```check
contains cafe/theme.js "addEventListener('change'"
```

```hints
nudge: You already have a preference object and an apply function.
concept: matchMedia emits change; a saved explicit choice takes precedence.
shape: Guard the callback on chosen, then map matches to a theme name.
```

## Diagnose, explain and review

Put an invalid value such as sepia in juniper-theme and reload. The page should fall back to the system. Restore by choosing a theme. The structural listener check does not execute an operating-system change: manually test automatic mode and manual override. Inspect all card backgrounds and keyboard focus in both themes.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
