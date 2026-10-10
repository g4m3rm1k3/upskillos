---
title: 1.2 — HTML that means something
track: Frontend Developer Bootcamp — First Page and Developer Tools
trackOrder: 50.01
runtime: none
reference: optional
---

Outcome: build a page a visitor can navigate by headings, links and keyboard. **Semantic HTML** uses elements for their meaning. A heading introduces a section; a list groups related items; a link changes location; a button performs an action.

## Organize by visitor tasks

Before trying this step, make a prediction.

```predict
question: Does changing the link text repair a missing fragment destination?
choice: No
choice: Yes
answer: No
explain: The href must match an existing id; link text only names the action.
```

Replace the first draft with a header, navigation, main content and footer. There is one main landmark and a single page h1; section headings are h2. The # in href links to an id in this document. aria-label names the navigation landmark; aria-labelledby uses the text of the referenced heading. Prefer native elements before adding ARIA.

```html file=cafe/index.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Juniper Café</title>
</head>
<body>
  <a href="#main">Skip to content</a>
  <header>
    <p>Juniper Café</p>
    <nav aria-label="Main"><a href="#menu">Menu</a> <a href="#visit">Visit</a></nav>
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
  </main>
  <footer><small>A fictional practice business.</small></footer>
</body>
</html>
```

```check
page cafe/index.html "document.querySelectorAll('main').length === 1 && document.querySelector('a[href=\"#main\"]').hash === '#main'" "true" server=static
```

## Your turn: add a real destination

Add an Accessibility section inside main with id="access", an h2 saying Accessibility, and a paragraph explaining step-free entry. Add an Accessibility link to the navigation. Do not use a clickable div.

```check
page cafe/index.html "document.querySelector('nav a[href=\"#access\"]') !== null && document.querySelector('#access h2').textContent === 'Accessibility'" "true" server=static
```

```hints
nudge: Give the destination a stable name.
concept: A fragment link refers to an element id, not its visible text.
shape: Add a section inside main and a matching anchor inside nav.
```

## Diagnose, explain and review

Change one navigation href to #missing. The link still looks plausible but no destination exists. Inspect its hash and the target id, then restore it. Press Tab from the address bar through the page. Check that Skip to content is first and that Enter activates each link. No automated check here establishes screen-reader usability.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
