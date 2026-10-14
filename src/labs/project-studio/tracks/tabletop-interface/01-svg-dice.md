---
title: 8.1 — Draw a die with coordinates
runtime: none
---

### The story so far

The rules are independent modules. Replace number-only dice with artwork you can describe mathematically.

### What this lesson builds

Draw and generate every die face with SVG while keeping the button as the interaction.

## Draw one face

SVG uses coordinates, not pixels tied to a screen size. viewBox gives minimum x, minimum y, width and height. Here the top-left is (0,0), x increases rightward, y downward, and the drawing spans 100 units each way. rect has position, dimensions and corner radius rx; circle has center cx/cy and radius r. fill colors its interior. A title or accessible label describes a meaningful image.

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

## Turn coordinates into data

pips stores the coordinate pairs for each face, using -1,0,1 around the center. A destructured [x,y] reads each pair. Backticks create a template literal; ${expression} inserts a calculated value. Adding 50 and multiplying offsets by 25 maps -1/0/1 to 25/50/75. dieSVG returns markup text, not an element. The app will insert only this trusted generated markup and give the surrounding button its accessible name. aria-hidden hides decorative SVG from duplicate announcements.

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
