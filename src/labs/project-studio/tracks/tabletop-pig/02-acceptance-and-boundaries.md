---
title: 7.2 — Two games, two rule contracts
runtime: none
---

### The story so far

Both models are implemented without DOM calls. A shared interface must not erase their different rules.

### What this lesson builds

Run known-hand and whole-match tests, then decide what can actually be shared.

## Read the supplied harness

node:test supplies test(name, callback), which registers a case. node:assert/strict supplies assertion methods: equal checks one value, deepEqual compares nested data, throws expects an exception. A failed assertion stops that test and produces a nonzero process result. Each test arranges state, acts through the real model, and checks the result. Reading these cases is part of the lesson, not outsourced boilerplate.

```javascript file=tests/rules.check.mjs provided
import test from 'node:test';
import assert from 'node:assert/strict';
import { points, blankCard, total, legalCategories, record, newYahtzee, rollHand, holdDie, scoreTurn } from '../rules.mjs';
import { newPig, move, actions } from '../pig.mjs';

test('ordinary categories, duplicate straights and upper boundary', () => {
  assert.equal(points([6,2,6,1,4],5),12);
  assert.equal(points([2,2,2,3,3],8),25);
  assert.equal(points([2,2,2,2,2],8),0);
  assert.equal(points([1,2,2,3,4],9),30);
  assert.equal(points([2,3,4,5,6],10),40);
  assert.equal(points([2,2,2,2,3],7),11);
  assert.equal(points([3,3,3,3,3],11),50);
  const card=blankCard();
  card.scores[5]=62;
  assert.equal(total(card).upper,0);
  card.scores[5]=63;
  assert.equal(total(card).upper,35);
});
test('Joker forces placement and rejection never awards bonus', () => {
  const card=blankCard(), hand=[6,6,6,6,6];
  assert.equal(record(card,hand,11),true);
  assert.equal(card.extra,0);
  assert.deepEqual(legalCategories(card,hand),[5]);
  const before=JSON.stringify(card);
  assert.equal(record(card,hand,8),false);
  assert.equal(JSON.stringify(card),before);
  assert.equal(record(card,hand,5),true);
  assert.equal(card.extra,100);
  assert.equal(record(card,hand,8),true);
  assert.equal(card.scores[8],25);
  assert.equal(card.extra,200);
  assert.equal(record(card,hand,8),false);
  assert.equal(card.extra,200);
});
test('zero Yahtzee forces Joker placement without an extra bonus', () => {
  const card=blankCard(), hand=[4,4,4,4,4];
  card.scores[11]=0;
  assert.deepEqual(legalCategories(card,hand),[3]);
  record(card,hand,3);
  record(card,hand,10);
  assert.equal(card.scores[10],40);
  assert.equal(card.extra,0);
  for(let i=6;i<13;i++)card.scores[i]=0;
  assert.deepEqual(legalCategories(card,hand),[0,1,2,4,5]);
});
test('held dice, roll limit, separate players and complete match', () => {
  const state=newYahtzee();
  assert.equal(holdDie(state,0),false);
  rollHand(state,()=>0.99);
  holdDie(state,0);
  rollHand(state,()=>0);
  assert.deepEqual(state.dice,[6,1,1,1,1]);
  rollHand(state,()=>0);
  assert.equal(rollHand(state,()=>0.99),false);
  assert.equal(scoreTurn(state,12),true);
  assert.equal(state.cards[1].scores[12],null);
  assert.equal(scoreTurn(state,11),false);
  while(!state.done){
    rollHand(state,()=>0.3);
    const legal=legalCategories(state.cards[state.player],state.dice);
    assert.equal(scoreTurn(state,legal[0]),true);
  }
  assert.equal(state.turns,26);
  assert.equal(rollHand(state),false);
});
test('Pig bust, hold, target and terminal rejection', () => {
  const state=newPig();
  assert.deepEqual(actions(state),['roll']);
  assert.equal(move(state,'hold'),false);
  move(state,'roll',()=>0.5);
  assert.equal(state.turn,4);
  move(state,'roll',()=>0);
  assert.equal(state.turn,0);
  assert.equal(state.player,1);
  state.scores[1]=27;state.turn=5;
  move(state,'hold');
  assert.equal(state.winner,1);
  assert.equal(state.scores[1],32);
  const before=JSON.stringify(state);
  assert.equal(move(state,'roll'),false);
  assert.equal(JSON.stringify(state),before);
});
```

The suite covers ordinary categories, Joker placement, rejection, zero versus absence, holding, roll limits, a complete Yahtzee match and Pig bust/bank/terminal behavior. It does not inspect pixels, keyboard flow or opponent strength. Add a rule case not already listed.

```check
run "node --test tests/rules.check.mjs"
```

```predict
question: Should Pig import the Yahtzee category list to use the same die renderer?
choice: No
choice: Yes
answer: No
explain: Rendering dice is shared; category scoring is specific to Yahtzee.
```

## Try it — Break a contract

In Pig move, change the winning >= comparison to ===. The overshoot test must fail. Restore it and rerun. Then explain why passing a syntax check alone did not catch this rule defect.



## Your turn — Keep sessions independent

Define solve() returning two separate records each with a scores array [0,0]. Modifying either record must not affect the other. Export the function as solve.

Write practice/02-acceptance-and-boundaries.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/02-acceptance-and-boundaries.mjs'; if (!((() => {const a=solve();a[0].scores[0]=9;return a[1].scores[0]===0;})())) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: Count the objects and arrays you create.
concept: Repeating a reference does not create a second state.
shape: Use separate object and array literals for each session.
```
