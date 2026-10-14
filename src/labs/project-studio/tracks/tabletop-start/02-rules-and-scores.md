---
title: 1.2 — Understand a turn before coding it
runtime: none
---

### The story so far

You can save and open an HTML page. Now learn the game the page will represent.

### What this lesson builds

Explain a Sixes practice turn and display a small score table with meaningful headers.

## Play a turn on paper

A die has faces 1 through 6. Yahtzee uses five dice. Roll all five, keep any you want, and reroll the rest up to twice: three rolls total. You may stop early. At the end, choose one unused score category. Each player eventually uses every category once. A zero still uses a category.

Our first smaller game scores only Sixes: [6, 2, 6, 1, 4] earns 12 because two sixes each contribute 6. Holding means keeping a die unchanged during the next roll. In [6, 2, 6, 1, 4], hold positions 1 and 3; a controlled reroll to [6, 3, 6, 6, 2] earns 18. Position labels start at 1 for people. Array indices will later start at 0.



```predict
question: A hand contains one six. Does Sixes score 1 or 6?
choice: 6
choice: 1
answer: 6
explain: Count the matching faces, then multiply by the face value.
```

## Give tabular data a structure

Replace the introductory paragraph with a table.

```html file=index.html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tabletop workshop</title>
</head>
<body>
<main>
<h1>Tabletop workshop</h1>
<table>
<caption>Sixes practice</caption>
<thead><tr><th scope="col">Hand</th><th scope="col">Points</th></tr></thead>
<tbody><tr><th scope="row">6, 2, 6, 1, 4</th><td>12</td></tr></tbody>
</table>
<button>Roll a die</button>
</main>
</body>
</html>
```

table groups related rows and columns. caption names the table; thead and tbody separate headings from data. tr is one row, th a header cell, td a data cell. scope tells assistive technology whether a header describes a row or a column. These tags describe relationships, not visual borders. CSS will control appearance.

```check
page index.html "document.querySelector('td').textContent" "12"
```

## Try it — Count the wrong thing

On paper score [6, 6, 6, 1, 2] by counting all five dice. You get 30, which is wrong: only three dice match, so 18 is correct. Explain the mistake before returning to the rule. This is a logic error, not an HTML error.



## Your turn — Describe a second hand

Create practice/score.html with a table caption Sixes and one data cell giving the correct Sixes score for [2, 6, 6, 6, 1]. Add a row header naming the hand.

Write practice/score.html independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
page practice/score.html "document.querySelector('td').textContent" "18"
page practice/score.html "document.querySelector('th').getAttribute('scope')" "row"
```

```hints
nudge: Count only sixes.
concept: The count and the score are different numbers.
shape: Use one row header and one data cell; three matches contribute six each.
```
