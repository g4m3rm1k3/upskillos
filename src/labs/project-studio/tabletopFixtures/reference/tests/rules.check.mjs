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
