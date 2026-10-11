---
title: 3.4 — A theme toggle that remembers your choice
track: Frontend Developer Bootcamp — JavaScript and a Budget Calculator
trackOrder: 50.03
runtime: none
---

Outcome: combine CSS variables, browser preferences and saved state. localStorage stores strings per origin (scheme, host and port) in this browser, not in an account. It may be blocked or full, so treat persistence as a convenience. A manual choice overrides the operating system.

### The story so far

The café already has two palettes selected by an HTML attribute. You now know how to attach a listener and update the DOM. We will join those skills: state decides which palette is active, and a button changes that state.

There are two sources of preference: the operating system and an explicit choice made in this browser. Before writing code, define which one wins. A clear policy is easier to implement than a collection of conflicting toggles.

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

### Three pieces that must agree

```text
chosen preference → apply(theme) → html data-theme → CSS token values
                               → button aria-pressed
click → choose opposite → apply → attempt to save
```

Think of the theme as a thermostat setting. The displayed setting and the actual heating policy should agree. Likewise, a button that announces dark mode while the page remains light is misleading. The analogy does not mean CSS continuously reads storage; our code explicitly reads, applies and writes values.

### Work through the priority order

| Saved value | System preference | First applied theme |
|---|---|---|
| light | dark | light |
| dark | light | dark |
| missing | dark | dark |
| sepia | light | light |

The invalid value is treated like an absent recognized preference, not like a third implemented palette. Only accepted values cross the boundary into apply.

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

### Storage is a convenience with a failure path

`localStorage.getItem` returns a string or null. It does not automatically produce booleans, numbers or objects. `setItem` stores strings synchronously. Both access and writes can fail under browser restrictions, so the interaction must still work for this session.

`dataset.theme` corresponds to the `data-theme` attribute. Updating it gives CSS a new selector match; JavaScript does not need to set the background of each card individually. `setAttribute('aria-pressed', String(...))` updates the accessible state using the string representation expected by the attribute.

The stable button label “Dark theme” describes the feature. aria-pressed answers whether that feature is on. Changing the label to “Light theme” while leaving pressed true would make the relationship harder to interpret.

**Rule of thumb:** store a user decision, not every value you can derive from it. The chosen theme belongs in storage; every component’s computed background color does not. Validate a saved value because a previous app version may have used a different format.

The extension listens for a system change only while no recognized manual choice exists. That condition is not an optimization; it implements the policy. Without it, an operating-system change could unexpectedly override the person’s explicit choice.

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

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

Explain why a successful button click does not prove that saving succeeded. Then predict the behavior after a manual light choice followed by an operating-system switch to dark. Identify the single function that keeps the DOM attribute and accessible button state synchronized.
