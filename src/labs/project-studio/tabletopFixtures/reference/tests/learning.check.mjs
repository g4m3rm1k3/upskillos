import test from 'node:test';
import assert from 'node:assert/strict';
import { seeded } from '../rng.mjs';
import { newPig, stateKey } from '../pig.mjs';
import { update, choose, train, evaluate, validateModel } from '../learning.mjs';

test('hand-calculated update and terminal non-bootstrap', () => {
  assert.ok(Math.abs(update(0.2,1,999,true,0.1)-0.28)<1e-12);
  assert.ok(Math.abs(update(0.2,0,0.5,false,0.1,0.9)-0.225)<1e-12);
  assert.ok(Math.abs(update(0.2,-1,999,true,0.1)-0.08)<1e-12);
});
test('legal action masking and player-relative state', () => {
  const state=newPig();
  const key=stateKey(state);
  assert.equal(choose({[key]:[-1,1]},state,0,seeded(1)),'roll');
  state.scores=[4,9];state.player=1;state.turn=3;
  assert.equal(stateKey(state),'9,4,3');
});
test('reproducible training, frozen evaluation and format validation', () => {
  const a=train(3000,7), b=train(3000,7);
  assert.deepEqual(a,b);
  assert.ok(Object.keys(a.table).length>100);
  const before=JSON.stringify(a.table);
  const report=evaluate(a.table,200);
  assert.equal(report.wins+report.losses+report.truncated,200);
  assert.equal(JSON.stringify(a.table),before);
  assert.equal(validateModel(a),a);
  assert.throws(()=>validateModel({...a,target:100}));
  assert.throws(()=>validateModel({...a,table:{'0,0,0':[NaN,0]}}));
  assert.throws(()=>validateModel({...a,table:{'30,0,0':[0,0]}}));
});
