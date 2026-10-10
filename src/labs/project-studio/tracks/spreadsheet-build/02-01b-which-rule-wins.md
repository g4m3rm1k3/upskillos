---
title: Styling 2 — Which Rule Wins
runtime: none
teaches: css, selectors, cascade, specificity, inheritance
uses: classes, ids
---

CSS (Cascading Style Sheets) is a list of rules, and on any real page several rules want to style the same element. The browser settles every disagreement the same way, with a few simple laws. Once you know them, CSS stops feeling random: you can say in advance which rule will win, and when a style "doesn't work", you can say why.

This lesson starts the portfolio's stylesheet, then runs an experiment on the laws themselves.

## A stylesheet for the portfolio

In `playground/site/index.html`, add this line inside `<head>`, just below the `<title>`:

```html
<link rel="stylesheet" href="style.css">
```

`<link>` connects another file to the page; `rel="stylesheet"` says what kind of file, and `href="style.css"` is a path relative to the page, so `style.css` sits next to `index.html` in `playground/site`.

This step opens that file. Type:

```css file=playground/site/style.css
body {
  font-family: system-ui, sans-serif;
  color: #1f2933;
}
```

A **rule** is a **selector** (which elements), then **declarations** between `{ }`: a property, `:`, a value, `;`.

- `font-family: system-ui, sans-serif` asks for the operating system's own interface font, and falls back to any sans-serif font where that isn't available. It's the simplest way to make a page look at home on every computer.
- `color: #1f2933` is the text colour: a very dark blue-grey, written in hexadecimal (two digits each for red, green and blue, from `00` to `ff`). Pure black (`#000000`) on white is harsher than it needs to be; nearly every well-designed site uses a softened black.

Refresh the page in the browser. The font changes everywhere, not only in `<body>` itself.

```check
contains playground/site/index.html "<link rel=\"stylesheet\" href=\"style.css\">" -- Add the <link> line inside <head>.
page playground/site/index.html "getComputedStyle(document.body).fontFamily.includes('system-ui')" true label="the page uses the system font" -- Is style.css in playground/site, next to index.html?
page playground/site/index.html "getComputedStyle(document.body).color" "rgb(31, 41, 51)" label="the body's text colour is #1f2933"
```

## Inherited, or not

You styled `<body>`, and the paragraphs inside it changed too. Some properties are **inherited**: an element that doesn't set them takes its parent's value, and its parent's parent's, all the way up. Text properties (font, colour, line spacing) inherit. Box properties (borders, padding, background) don't, or every element inside a bordered box would get a border too.

Predict, then check in the browser:

```predict
question: The rule sets `color` on `body` only. What colour is the text of the links in the nav?
choice: #1f2933, inherited from body like everything else
choice: Still the browser's link blue
answer: Still the browser's link blue
explain: Inheritance only fills in what an element doesn't set for itself. The browser's own stylesheet has a rule for `a` that sets its colour, and a rule aimed straight at an element always beats a value inherited from its parent. Paragraphs have no colour rule of their own, so they inherit.
verify: page playground/site/index.html "getComputedStyle(document.querySelector('nav a')).color === getComputedStyle(document.body).color ? '#1f2933, inherited from body like everything else' : 'Still the browser\\'s link blue'"
```

So links get a colour of their own. Add a rule for `a`:

```css file=playground/site/style.css
body {
  font-family: system-ui, sans-serif;
  color: #1f2933;
}

a {
  color: #2563eb;
}
```

```check
page playground/site/index.html "getComputedStyle(document.querySelector('#about p')).color" "rgb(31, 41, 51)" label="paragraphs inherit the body's colour"
page playground/site/index.html "getComputedStyle(document.querySelector('nav a')).color" "rgb(37, 99, 235)" label="links are #2563eb"
```

## An experiment: four rules, three paragraphs

Now the laws themselves, in a lab page with nothing else on it. It's supplied, because the point is to experiment with it, not to type it: click **Create provided playground/css/which-wins.html**, then read it.

```html file=playground/css/which-wins.html provided
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Which rule wins?</title>
    <style>
      p { color: green; }
      .note { color: orange; }
      #first { color: purple; }
      p { color: red; }
    </style>
  </head>
  <body>
    <p id="first" class="note">First</p>
    <p class="note">Second</p>
    <p>Third</p>
  </body>
</html>
```

A **`<style>`** element holds CSS inside the page itself. It's handy for a one-page experiment like this; real sites keep CSS in files, as the portfolio does.

Every paragraph matches at least two rules. Before you open the page, commit to an answer for each:

```predict
question: What colour is **First**? (It matches `p`, `.note`, `#first` and the second `p`.)
choice: Green
choice: Orange
choice: Purple
choice: Red
answer: Purple
explain: An `id` selector is more **specific** than a class, and a class more than an element name. Specificity decides first; the order rules are written in only matters between rules of equal specificity. So `#first` wins, though two rules come after it.
verify: page playground/css/which-wins.html "({ 'rgb(0, 128, 0)': 'Green', 'rgb(255, 165, 0)': 'Orange', 'rgb(128, 0, 128)': 'Purple', 'rgb(255, 0, 0)': 'Red' })[getComputedStyle(document.querySelector('#first')).color]"
```

```predict
question: What colour is **Second**? (It matches `p`, `.note` and the second `p`.)
choice: Green
choice: Orange
choice: Purple
choice: Red
answer: Orange
explain: `.note` is a class selector, more specific than `p`, so it beats both `p` rules, including the one written after it.
verify: page playground/css/which-wins.html "({ 'rgb(0, 128, 0)': 'Green', 'rgb(255, 165, 0)': 'Orange', 'rgb(128, 0, 128)': 'Purple', 'rgb(255, 0, 0)': 'Red' })[getComputedStyle(document.querySelectorAll('p')[1]).color]"
```

```predict
question: What colour is **Third**? (It matches only the two `p` rules.)
choice: Green
choice: Orange
choice: Purple
choice: Red
answer: Red
explain: The two `p` rules are equally specific, so order breaks the tie: the later rule wins. That's the "cascading" in Cascading Style Sheets.
verify: page playground/css/which-wins.html "({ 'rgb(0, 128, 0)': 'Green', 'rgb(255, 165, 0)': 'Orange', 'rgb(128, 0, 128)': 'Purple', 'rgb(255, 0, 0)': 'Red' })[getComputedStyle(document.querySelectorAll('p')[2]).color]"
```

Open the page (`start playground/css/which-wins.html`) and see how you did. Then open DevTools (**F12**), click each paragraph in the Elements tab, and look at the Styles pane: every rule that matched is listed, most specific first, and the losers are crossed out.

### The laws

1. **Specificity first.** Count a selector's ids, then its classes, then its element names, and compare those counts in that order, like comparing version numbers. `#first` is (1, 0, 0); `.note` is (0, 1, 0); `p` is (0, 0, 1); `nav a` is (0, 0, 2); `p.note` is (0, 1, 1). More ids always wins, however many classes the other selector has.
2. **Order breaks ties.** Between equally specific rules, the one that comes later wins.
3. **Your rules beat the browser's.** Its built-in stylesheet loses to yours whenever both set something.
4. **Inheritance comes last.** A value inherited from a parent loses to any rule that targets the element itself.

Two escape hatches exist, and professionals avoid both: a `style="…"` attribute written on an element beats every rule, and `!important` after a value beats everything that isn't also `!important`. They win by skipping the laws, so the next person can't predict the page any more.

The habit that keeps CSS predictable: **style with classes**, and keep selectors short. Ids are for links (`#projects`), not for styling.

```check
page playground/css/which-wins.html "getComputedStyle(document.querySelectorAll('p')[2]).color" "rgb(255, 0, 0)" label="the lab page is as typed: Third is red"
```

## The nav's links

The nav's links shouldn't look like links in a paragraph. Add a rule for them:

```css file=playground/site/style.css
body {
  font-family: system-ui, sans-serif;
  color: #1f2933;
}

a {
  color: #2563eb;
}

nav a {
  color: inherit;
  text-decoration: none;
  font-weight: 600;
}
```

`nav a` selects every `a` **inside** a `nav` (a space means "somewhere inside"). Its specificity is (0, 0, 2), more than `a`'s (0, 0, 1), so it wins wherever both match. `color: inherit` asks for the parent's colour on purpose, which brings back the body's dark text. `text-decoration: none` removes the underline; `font-weight: 600` makes it semi-bold.

```check
page playground/site/index.html "getComputedStyle(document.querySelector('nav a')).color" "rgb(31, 41, 51)" label="nav links take the body's colour"
page playground/site/index.html "getComputedStyle(document.querySelector('nav a')).textDecorationLine" none label="nav links aren't underlined"
page playground/site/index.html "getComputedStyle(document.querySelector('#contact a')).color" "rgb(37, 99, 235)" label="other links are still blue"
```

## Commit

```powershell
git add playground
git commit -m "Style the portfolio's text and links; a lab for the cascade"
```

```check
git-tracked playground/site/style.css
git-tracked playground/css/which-wins.html
git-clean
```

## Your turn: make Second blue

In `which-wins.html`, make **Second** blue (`color: blue`), while First stays purple and Third stays red.

The rules of the game:

- don't change or delete any of the four existing rules;
- don't add an `id` or a `style="…"` attribute to the HTML;
- no `!important`.

Predict which selector will win **before** you refresh.

```check
page playground/css/which-wins.html "getComputedStyle(document.querySelectorAll('p')[1]).color" "rgb(0, 0, 255)" label="Second is blue"
page playground/css/which-wins.html "getComputedStyle(document.querySelector('#first')).color" "rgb(128, 0, 128)" label="First is still purple"
page playground/css/which-wins.html "getComputedStyle(document.querySelectorAll('p')[2]).color" "rgb(255, 0, 0)" label="Third is still red"
page playground/css/which-wins.html "document.querySelectorAll('[id]').length === 1 && document.querySelectorAll('[style]').length === 0 && ![...document.styleSheets[0].cssRules].some((r) => r.cssText.includes('!important'))" true label="no new id, no style attribute, no !important"
git-clean -- Commit it: git commit -am "Make Second blue"
```

```hints
nudge: Which rule does Second obey right now, and what would it take to beat it, by the laws above?
concept: Second obeys `.note`, specificity (0, 1, 0). A new rule wins if it's more specific, or if it's equally specific and comes later. But First is a `.note` too: whatever you write must not beat `#first`.
shape: One new rule at the end of the `<style>` element, with a selector at least as specific as `.note`.
answer: ~~~css
p.note { color: blue; }
~~~
`p.note` is (0, 1, 1): it beats `.note`, and loses to `#first`, so First stays purple. A second `.note { color: blue; }` after the first one works too, by the tie-breaking law.
```
