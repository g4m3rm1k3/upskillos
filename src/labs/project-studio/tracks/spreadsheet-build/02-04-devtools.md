---
title: 2.4 — The Browser's Developer Tools
runtime: none
---

Every browser has a set of tools built in for people who build web pages: the **developer tools**, usually called **DevTools**. They show the page as the browser understands it, let you change styles and see the result instantly, and show the errors a page produces. You'll have them open for the rest of the series.

## Open DevTools

In your browser, with the spreadsheet page showing, press **F12**. (Or right-click a cell and choose **Inspect**. On macOS: **Cmd+Option+I**.)

A panel opens, usually docked to the side or bottom of the page. The tabs along its top include **Elements** and **Console**. (Names here are Chrome's and Edge's; Firefox calls the first one *Inspector*.)

## Elements: the page as the browser sees it

The **Elements** tab shows your HTML as a tree you can fold and unfold, the same nesting you typed. Hover over a line and its element lights up on the page. Click **Coffee**'s `<td>`.

On the right (or below), the **Styles** pane lists every CSS rule that applies to that cell, with the file and line each came from: your `th, td` rule from `style.css`, and above it any rules from the browser's own default styles. A rule that lost to a later one is shown crossed out. When a style doesn't do what you expect, this is where you find out why.

Scroll the Styles pane to the bottom: a diagram of nested boxes shows the cell's **content**, **padding**, **border** and **margin** sizes (the box model from lesson 2.3).

## Change a style live

In the Styles pane, click the value `#d0d7de` in the `th, td` rule and type `red`. Every grid line turns red. Click `13px` and press the **↑** key a few times: the text grows as you press.

Now refresh the page. Everything is back as it was.

DevTools changes the page **in the browser's memory**, not your files. It's a place to experiment: try values until it looks right, then copy the value you settled on into `style.css`. Forgetting to copy it back, and losing your perfect value on the next refresh, happens to everyone once.

## Your turn: right-align the row numbers

Numbers in a spreadsheet are right-aligned, and the row numbers should be too. The browser centres `th` text by default.

Write a rule in `style.css` that right-aligns the row numbers (the `th` cells in the body), **without** changing the column letters (which stay centred).

Everything you need is from the styling section: a selector for "`th` inside `tbody`", and the property **`text-align`** (the footer used `center`; the values include `left`, `center` and `right`).

Try values in DevTools first, then put the rule in `style.css` and refresh.

```check
page index.html "getComputedStyle(document.querySelector('tbody th')).textAlign" right label="row numbers are right-aligned" -- Add a rule for th elements inside tbody, with text-align: right;
page index.html "getComputedStyle(document.querySelector('thead th:nth-child(2)')).textAlign" center label="column letters are still centred" -- Your rule should only select the th cells inside tbody.
page index.html "getComputedStyle(document.querySelector('td')).textAlign" start label="data cells are unchanged" -- Don't change the alignment of the td cells.
```

```hints
nudge: Find the row numbers in the Elements tab. What are they, and what are they inside?
concept: A space in a selector means "inside" (Styling 2): `thead th` selects the column letters, so `tbody th` selects the row numbers. Data cells are `td`s, so a rule for `tbody th` can't touch them.
shape: One new rule, at the end of `style.css`, with one declaration.
answer: ~~~css
tbody th {
  text-align: right;
}
~~~
```

## Merge the sprint and push

The page looks like a spreadsheet. Commit the challenge, bring the branch into `main` (lesson 1.7), and back it up on GitHub (lesson 1.8):

```powershell
git commit -am "Right-align row numbers"
git switch main
git merge grid-page
git push
git branch -d grid-page
```

Plain `git push` works because `main` has known its partner, `origin/main`, since lesson 1.8.

```check
git-branch main -- git switch main
contains style.css "text-align" label="main has the challenge" -- Merge the branch: git merge grid-page (while on main).
git-no-branch grid-page -- After merging, delete the branch: git branch -d grid-page
git-pushed -- git push
git-clean
```

Sprint 2 is done. Next sprint the grid stops being typed by hand: JavaScript builds it, and it starts responding when you click.
