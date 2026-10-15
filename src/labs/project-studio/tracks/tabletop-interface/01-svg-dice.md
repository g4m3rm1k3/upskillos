---
title: 8.1 — Draw a die with coordinates
runtime: none
---

### The story so far

The rules are independent modules. Replace number-only dice with artwork you can describe mathematically.

### What this lesson builds

Draw and generate every die face with SVG while keeping the button as the interaction.

## Draw one face

Draw a square from (0,0) to (100,100) on paper. SVG's viewBox="0 0 100 100" defines that internal coordinate rectangle: minimum x, minimum y, width, height. x grows rightward and y downward. The displayed width can be 50px or 200px while these internal coordinates stay the same.

A rect uses x/y for its top-left corner, width/height for extent and rx for rounded corners. A circle uses cx/cy for center and r for radius. fill colors the interior. Three circles at (25,25), (50,50), (75,75) form a diagonal three. An SVG title names a standalone meaningful image. Inside our later labeled die button the SVG will be decorative to avoid duplicate announcements.

```html file=scratch/die.html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tabletop workshop</title>
</head>
<body>
<svg viewBox="0 0 100 100" role="img" aria-label="A three"><rect x="3" y="3" width="94" height="94" rx="20" fill="#fff3d9"/><circle cx="25" cy="25" r="7"/><circle cx="50" cy="50" r="7"/><circle cx="75" cy="75" r="7"/></svg>
</body>
</html>
```

Scale the browser window. The viewBox still has the same coordinates while the CSS display size changes. Draw the three centers on squared paper first. The diagonal layout is a visual convention; its meaning comes from the count of pips.

```check
page scratch/die.html "document.querySelectorAll('circle').length" "3"
```

```predict
question: If the SVG is displayed twice as wide, do its viewBox coordinates change?
choice: No
choice: Yes
answer: No
explain: The browser maps the same internal coordinates into the display rectangle.
```


**Explore, then restore:** Change only one circle radius from 7 to 12. Predict larger pips without changed centers. Restore 7; change displayed width and check the drawing scales. Finally change viewBox width to 200 and explain the extra internal horizontal space before restoring 100.

## Turn coordinates into data

Use a small coordinate vocabulary: -1,0,1 for left/center/right and top/middle/bottom. In pips, entry 0 is unused; entry face is that face's list of pairs. The same data will later position 3D pips. The transform 50 + x*25 maps -1→25, 0→50, 1→75. Multiplication scales the offset before addition shifts the origin.

for(const [x,y] of pips[face]) reads one pair and destructures its two numbers. Backticks delimit a template literal; ${...} evaluates an expression and inserts its text. circles starts as an empty string and += appends one circle tag each iteration. The returned string wraps those circles in an SVG and rounded rectangle. It is markup text, not a DOM node. Only validated faces 1–6 reach this function through our rules. aria-hidden="true" leaves the parent button responsible for its accessible name.

The provided check counts circle tags with a regular expression: /<circle/g matches all occurrences; match returns an array or null, and || [] supplies an empty array for no matches. That is a narrow output check, not a general SVG parser. Use the browser to inspect placement as well.

```javascript file=svg.mjs
export const pips = [[], [[0, 0]], [[-1, -1], [1, 1]],
  [[-1, -1], [0, 0], [1, 1]], [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]];

export function dieSVG(face) {
  let circles = '';
  for (const [x, y] of pips[face]) {
    circles += `<circle cx="${50 + x * 25}" cy="${50 + y * 25}" r="7"/>`;
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="3" y="3" width="94" height="94" rx="20"/>${circles}</svg>`;
}
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --input-type=module -e \"import {dieSVG} from './svg.mjs'; console.log((dieSVG(6).match(/<circle/g)||[]).length);\"" stdout="6"
```


**Explore, then restore:** Call dieSVG(1) and dieSVG(6) and count their circle tags. Temporarily change spacing 25 to 15: faces retain their pip counts but the layout tightens. Restore 25. Explain why a raw user-supplied name belongs in textContent, not in generated innerHTML.

## Try it — Mix the coordinate systems

Change the SVG width without changing viewBox: the artwork scales. Then change viewBox width to 200: the same coordinates occupy only half the horizontal range. Restore 100. Explain the distinction. Keep untrusted names out of innerHTML; use textContent for user text.



## Your turn — Map a pip position

Define solve(offset) mapping -1,0,1 to 25,50,75. Export the function as solve.

Write practice/01-svg-dice.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/01-svg-dice.mjs'; if (!(solve(-1)===25 && solve(0)===50 && solve(1)===75)) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: Where is the center?
concept: Scale the offset, then translate the origin.
shape: Multiply by spacing and add the center coordinate.
```
