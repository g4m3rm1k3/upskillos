---
title: Styling 1 — Pages with Meaning
runtime: none
teaches: semantic html, landmarks, heading levels, lists, links, classes, ids, viewport
uses: html
---

The next seven lessons are a **styling section**: how to make any web page look good, not only a spreadsheet. Layout, spacing, type, colour, and pages that work on a phone as well as a monitor. You'll learn it all on a page of your own in the playground, a one-page **portfolio site** about you as a developer, and every step is an experiment you can push further. After the section, lessons 2.2 to 2.4 apply it to the spreadsheet, and the sprint ends with a challenge: build a page from a designer's spec.

Good styling starts with good HTML. Not much of it, but the right elements. This lesson builds the portfolio's HTML, with no styling at all.

## Elements that say what things are

HTML has elements that only say *what part of the page* something is. They don't look like anything special:

| Element | Means |
|---|---|
| `<header>` | the top of the page: the site's name, the navigation |
| `<nav>` | the main links around the site |
| `<main>` | the page's own content; one per page |
| `<section>` | a part of the content with its own heading |
| `<article>` | something that stands on its own: a project, a post, a product |
| `<footer>` | the bottom: who made it, contact links |

These are called **semantic** elements (*semantic* means "about meaning"). Before they existed, pages were built from `<div>`s, a box that means nothing at all, and every page invented its own names for its parts.

Meaning matters for three readers:

- **Screen readers**, which read pages aloud to blind and partially sighted people, let their users jump straight to the `<nav>` or the `<main>`. A page of `<div>`s offers nothing to jump to.
- **Search engines** use them to tell the content apart from the menus around it.
- **You**, writing CSS: `header nav a` is a far clearer selector than `.div3 .div7 a`.

Headings matter in the same way. There's one `<h1>`, the page's title. Each section starts with an `<h2>`, and things inside sections use `<h3>`. Never pick a heading level for its size: size is CSS's job. Screen-reader users move through a page by its headings, like a table of contents.

## A new page

This step opens a new file, `playground/site/index.html`. Start with the page you wrote from memory in lesson 2.1, plus one new line in `<head>`. Use your own name instead of *Sam Rivera* if you like:

```html file=playground/site/index.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Sam Rivera — Software Developer</title>
  </head>
  <body>
  </body>
</html>
```

The new line is **`<meta name="viewport" …>`**. It tells phones to draw the page at their real width instead of drawing a desktop-sized page and shrinking it to fit. Every page you make should have it; Styling 7 shows what goes wrong without it.

```check
page playground/site/index.html "document.querySelector('meta[name=viewport]')?.content" "width=device-width, initial-scale=1" label="the page has a viewport line"
page playground/site/index.html "document.title.length > 0" true label="the page has a title"
```

## Landmarks

Now the page's three big parts. Inside `<body>`:

```html file=playground/site/index.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Sam Rivera — Software Developer</title>
  </head>
  <body>
    <header>
      <a class="name" href="#intro">Sam Rivera</a>
    </header>
    <main>
    </main>
    <footer>
      <p>Made by Sam Rivera, 2026.</p>
    </footer>
  </body>
</html>
```

- **`<header>`** is the top of the page: the site's name, and soon the navigation.
- **`<main>`** is the page's own content. There's one per page; it's empty for now.
- **`<footer>`** is the bottom: who made it, small print.
- **`class="name"`** is a label you put on an element so CSS can pick it out (Styling 2 shows how). An element can have several classes, separated by spaces.
- **`href="#intro"`** links to the element whose `id` is `intro` on this same page. It doesn't exist yet: the next steps add it.

Open the page (`start playground/site/index.html`). Only a link and a sentence: landmarks don't look like anything. They're for the three readers above.

```check
page playground/site/index.html "document.querySelectorAll('body > header, body > main, body > footer').length" 3 label="the page has a header, a main and a footer"
```

## A nav that's a list

The main links around the site go in a `<nav>`, inside the header:

```html file=playground/site/index.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Sam Rivera — Software Developer</title>
  </head>
  <body>
    <header>
      <a class="name" href="#intro">Sam Rivera</a>
      <nav>
        <ul>
          <li><a href="#projects">Projects</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </nav>
    </header>
    <main>
    </main>
    <footer>
      <p>Made by Sam Rivera, 2026.</p>
    </footer>
  </body>
</html>
```

The links are a **list** (`<ul>`, an *unordered list*, with an `<li>` per item), because that's what they are. A screen reader announces "navigation, list, 3 items", which tells the listener what's coming and how long it is. Styling 5 lays them out in a row; the list stays a list.

```check
page playground/site/index.html "document.querySelectorAll('header nav ul li a[href^=\"#\"]').length" 3 label="the nav is a list of three links to the page's sections"
```

## The opening section

The first thing in `main` is a section that says who you are:

```html file=playground/site/index.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Sam Rivera — Software Developer</title>
  </head>
  <body>
    <header>
      <a class="name" href="#intro">Sam Rivera</a>
      <nav>
        <ul>
          <li><a href="#projects">Projects</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </nav>
    </header>
    <main>
      <section id="intro">
        <h1>I build software people enjoy using.</h1>
        <p>I'm a developer learning to build full-stack web applications, one real project at a time.</p>
        <p class="actions">
          <a class="button" href="#projects">See my projects</a>
          <a class="button secondary" href="#about">About me</a>
        </p>
      </section>
    </main>
    <footer>
      <p>Made by Sam Rivera, 2026.</p>
    </footer>
  </body>
</html>
```

- **`<section id="intro">`**: a part of the content with its own heading. Its `id` is what the header's `#intro` link finds.
- **`<h1>`**: the page's title, and its **only** `h1`. Each later section starts with an `h2`, and anything inside a section uses `h3`. Never pick a level for its size: size is CSS's job, and screen-reader users move through a page by its headings, like a table of contents.
- **`class="button secondary"`**: two classes on one link. Both are links (they go somewhere); Styling 4 makes them look like buttons.

```check
page playground/site/index.html "document.querySelectorAll('h1').length" 1 label="exactly one h1"
page playground/site/index.html "document.querySelector('main > section#intro h1') !== null" true label="the h1 is in the intro section"
```

## Projects as articles

A section for your projects, starting with one:

```html file=playground/site/index.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Sam Rivera — Software Developer</title>
  </head>
  <body>
    <header>
      <a class="name" href="#intro">Sam Rivera</a>
      <nav>
        <ul>
          <li><a href="#projects">Projects</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </nav>
    </header>
    <main>
      <section id="intro">
        <h1>I build software people enjoy using.</h1>
        <p>I'm a developer learning to build full-stack web applications, one real project at a time.</p>
        <p class="actions">
          <a class="button" href="#projects">See my projects</a>
          <a class="button secondary" href="#about">About me</a>
        </p>
      </section>
      <section id="projects">
        <h2>Projects</h2>
        <div class="cards">
          <article class="card">
            <h3>Spreadsheet</h3>
            <p>A spreadsheet in the browser, with a formula language I wrote myself.</p>
          </article>
        </div>
      </section>
    </main>
    <footer>
      <p>Made by Sam Rivera, 2026.</p>
    </footer>
  </body>
</html>
```

- **`<article>`** is something that stands on its own: a project, a post, a product. Each project is one.
- **`<h3>`**: inside a section headed by an `h2`, the next level down.
- **`<div class="cards">`** is the one meaningless box on the page. It's there purely to group the projects for layout (Styling 6). That's what `<div>` is for: grouping when no meaningful element fits.

```check
page playground/site/index.html "document.querySelectorAll('#projects .cards > article.card').length >= 1" true label="the projects section has an article inside its cards box"
```

## Two more projects

Add two more articles inside `<div class="cards">`, after the first. Try typing them without looking back at the first one: same elements, different words.

Why an article each, rather than one list of projects? Because each project could be lifted out and shown somewhere else (a search result, a feed of your work) and still make sense on its own, with its own heading. That's the test for `<article>`: would it stand alone? A nav link wouldn't, which is why the nav is a list.

```html file=playground/site/index.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Sam Rivera — Software Developer</title>
  </head>
  <body>
    <header>
      <a class="name" href="#intro">Sam Rivera</a>
      <nav>
        <ul>
          <li><a href="#projects">Projects</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </nav>
    </header>
    <main>
      <section id="intro">
        <h1>I build software people enjoy using.</h1>
        <p>I'm a developer learning to build full-stack web applications, one real project at a time.</p>
        <p class="actions">
          <a class="button" href="#projects">See my projects</a>
          <a class="button secondary" href="#about">About me</a>
        </p>
      </section>
      <section id="projects">
        <h2>Projects</h2>
        <div class="cards">
          <article class="card">
            <h3>Spreadsheet</h3>
            <p>A spreadsheet in the browser, with a formula language I wrote myself.</p>
          </article>
          <article class="card">
            <h3>Command-line tools</h3>
            <p>Small scripts that save me time every day, now with tests.</p>
          </article>
          <article class="card">
            <h3>This site</h3>
            <p>Semantic HTML and hand-written CSS: no framework, no template.</p>
          </article>
        </div>
      </section>
    </main>
    <footer>
      <p>Made by Sam Rivera, 2026.</p>
    </footer>
  </body>
</html>
```

```check
page playground/site/index.html "document.querySelectorAll('article.card').length" 3 label="three project cards"
page playground/site/index.html "[...document.querySelectorAll('article.card')].every((a) => a.querySelector('h3') && a.querySelector('p'))" true label="each card has an h3 and a paragraph"
```

## About

The last section, for now:

```html file=playground/site/index.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Sam Rivera — Software Developer</title>
  </head>
  <body>
    <header>
      <a class="name" href="#intro">Sam Rivera</a>
      <nav>
        <ul>
          <li><a href="#projects">Projects</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </nav>
    </header>
    <main>
      <section id="intro">
        <h1>I build software people enjoy using.</h1>
        <p>I'm a developer learning to build full-stack web applications, one real project at a time.</p>
        <p class="actions">
          <a class="button" href="#projects">See my projects</a>
          <a class="button secondary" href="#about">About me</a>
        </p>
      </section>
      <section id="projects">
        <h2>Projects</h2>
        <div class="cards">
          <article class="card">
            <h3>Spreadsheet</h3>
            <p>A spreadsheet in the browser, with a formula language I wrote myself.</p>
          </article>
          <article class="card">
            <h3>Command-line tools</h3>
            <p>Small scripts that save me time every day, now with tests.</p>
          </article>
          <article class="card">
            <h3>This site</h3>
            <p>Semantic HTML and hand-written CSS: no framework, no template.</p>
          </article>
        </div>
      </section>
      <section id="about">
        <h2>About</h2>
        <p>I started by hacking scripts together until they worked. Now I'm learning to build software that keeps working: tested, readable and easy to change.</p>
      </section>
    </main>
    <footer>
      <p>Made by Sam Rivera, 2026.</p>
    </footer>
  </body>
</html>
```

The page is complete: header, three sections, footer. Look at it in the browser: black text on white, blue underlined links, bullet points. That's the browser's own built-in styling, the starting point for everything that follows.

```check
page playground/site/index.html "[...document.querySelectorAll('h1, h2, h3')].map((h) => h.tagName).join(',')" "H1,H2,H3,H3,H3,H2" label="the headings go h1, then an h2 per section, h3 inside"
page playground/site/index.html "document.querySelectorAll('main > section').length" 3 label="main has three sections"
```

## A section versus a div

Before you look closely, predict:

```predict
question: Without any CSS, does a `<section>` look any different from a `<div>`?
choice: Yes: sections get extra space around them
choice: No: they look exactly the same
choice: Yes: sections get a border
answer: No: they look exactly the same
explain: Semantic elements change what a page *means*, not how it looks. A `<section>` and a `<div>` are both plain blocks, one above the next. All the looks come from CSS: the browser's own small built-in stylesheet, and then yours.
verify: page playground/site/index.html "(() => { const d = document.createElement('div'); document.body.append(d); const a = getComputedStyle(d); const b = getComputedStyle(document.querySelector('section')); return ['display', 'margin', 'padding', 'border'].every((p) => a[p] === b[p]) ? 'No: they look exactly the same' : 'Yes'; })()"
```

Check in DevTools if you like (**F12**, the Elements tab; lesson 2.4 tours it properly). Click `<section id="projects">`: its Styles pane has no rules from the browser's built-in stylesheet that a `<div>` wouldn't get too.

## Commit

```powershell
git add playground/site
git commit -m "Add the portfolio page's HTML to the playground"
```

```check
git-tracked playground/site/index.html -- git add playground/site, then git commit.
git-clean
```

## Your turn: a contact section

The nav already links to `#contact`, but there's no such section, so the link goes nowhere. Add it, as the last section of `main`:

- a heading, **Contact**, at the right level;
- a list of at least two links: an email link, and a link to a profile (GitHub, or anywhere you like).

An email link is an `<a>` whose `href` starts with `mailto:`, like `mailto:sam@example.com`. Clicking it opens an email program.

Then click **Contact** in the page's nav to see the link work. Commit when you're done.

```check
page playground/site/index.html "document.querySelector('main > section#contact > h2')?.textContent" Contact label="main has a section with id contact, headed Contact by an h2" -- The section needs id="contact" and an <h2>Contact</h2>.
page playground/site/index.html "document.querySelectorAll('#contact ul > li > a').length >= 2" true label="it has a list of at least two links" -- Put the links in a <ul>, each in its own <li>.
page playground/site/index.html "document.querySelector('#contact a[href^=\"mailto:\"]') !== null" true label="one of them is an email link" -- An email link's href starts with mailto:
page playground/site/index.html "document.querySelectorAll('h1').length" 1 label="there's still exactly one h1"
git-clean -- Commit it: git commit -am "Add a contact section"
```

```hints
nudge: The About section is a section with an `id`, an `h2` and some content. The nav is a list of links.
concept: A section's heading is an `<h2>` because the page's only `<h1>` is the title. The `id` is what `href="#contact"` finds. A list is `<ul>` with one `<li>` per item, and each `<li>` holds an `<a>`.
shape: `<section id="contact">`, then `<h2>`, then `<ul>` with two `<li><a href="...">...</a></li>`, then `</section>`, placed just before `</main>`.
answer: ~~~html
      <section id="contact">
        <h2>Contact</h2>
        <ul>
          <li><a href="mailto:sam@example.com">sam@example.com</a></li>
          <li><a href="https://github.com/sam-rivera">GitHub</a></li>
        </ul>
      </section>
~~~
```
