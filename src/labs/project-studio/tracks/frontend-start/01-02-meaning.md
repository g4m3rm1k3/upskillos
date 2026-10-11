---
title: 1.2 — HTML that means something
track: Frontend Developer Bootcamp — First Page and Developer Tools
trackOrder: 50.01
runtime: none
---

Outcome: build a page a visitor can navigate by headings, links and keyboard. **Semantic HTML** uses elements for their meaning. A heading introduces a section; a list groups related items; a link changes location; a button performs an action.

### The story so far

Your first page has a heading and paragraphs. Now imagine a visitor arriving with a question: “Can I get lunch here, and is it open?” The document needs a route through information, not simply more words.

We will organize the same café page. You already know elements and attributes. This lesson introduces landmarks, heading levels and links within a document. You can finish it without knowing CSS or JavaScript.

## Organize by visitor tasks

### Meaning helps people take shortcuts

A sighted reader scans headings. A screen-reader user can request a list of headings or jump to the main landmark. Both benefit from the same structure. Think of headings as a table of contents, and landmarks as the labeled areas of a building.

That analogy does not mean every visual box needs a landmark. A building covered with identical “important room” signs becomes harder to navigate. Use one main for the page’s central purpose, a nav for major navigation, and sections that have a meaningful heading.

### Trace one link before typing the page

```html
<a href="#visit">Visit</a>
<section id="visit">...</section>
```

`href` is the destination. `#visit` means “find the element whose id is visit in this document.” `Visit` is the link’s accessible text. Those are different jobs. Changing the text to “Opening hours” does not require changing the id; changing the id does require updating its links.

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

### Why these elements, rather than a pile of divs?

A `div` is a generic container. It has no special meaning or keyboard behavior. A native `a` with href is focusable, exposes a destination, supports Enter and offers normal browser actions such as copying the link. Replacing it with a clickable div means rebuilding those features and usually forgetting some.

**Rule of thumb:** use a link to go somewhere and a button to do something on the current screen. “Visit the menu section” is navigation. “Switch to dark theme” is an action. A real form submission is a button even though its outcome might eventually navigate.

Heading levels describe nesting, not font size. An h2 starts a section under the page h1; an h3 would introduce a subsection within that section. Do not skip to h4 because it looks smaller. Later CSS can make h2 any appropriate size while preserving its role.

### What the accessibility attributes actually refer to

`aria-label="Main"` supplies the navigation’s name directly. `aria-labelledby="menu-title"` instead tells assistive tools to use another element’s text. The latter stays in sync if you rename the visible heading. Neither attribute makes bad markup automatically accessible; it supplies specific information.

Try renaming the visible menu heading in DevTools. The region’s accessible name should follow it because the reference is by id. Then undo the edit. This is a relationship you can inspect, not an incantation to paste.

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

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

Given “Download menu” and “Show dietary options,” choose link or button for each and explain what happens when activated. Then explain why the section id must be unique. Before progressing, navigate your page without a mouse and verify that every fragment destination exists.
