// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { resolvePreviewMove } from './previewMove';
import { htmlToElements } from './htmlSync';

const elements = htmlToElements('<main data-lab-id="parent"><div data-lab-id="a"></div><div data-lab-id="b"><span data-lab-id="child">Child</span></div><div data-lab-id="c"></div></main><input data-lab-id="input">')!;
it('orders a move against siblings without counting the moving element twice', () => {
  expect(resolvePreviewMove(elements, {id:'a',targetId:'b',placement:'after'})).toEqual({id:'a',parentId:'parent',order:1});
  expect(resolvePreviewMove(elements, {id:'c',targetId:'a',placement:'before'})).toEqual({id:'c',parentId:'parent',order:0});
});
it('nests in a container or moves to the page root', () => {
  expect(resolvePreviewMove(elements, {id:'a',targetId:'b',placement:'inside'})).toEqual({id:'a',parentId:'b',order:1});
  expect(resolvePreviewMove(elements, {id:'a',targetId:null,placement:'inside'})).toEqual({id:'a',parentId:null,order:2});
});
it('rejects cycles, missing elements, and nesting inside a void element', () => {
  expect(resolvePreviewMove(elements, {id:'parent',targetId:'child',placement:'before'})).toBeNull();
  expect(resolvePreviewMove(elements, {id:'b',targetId:'b',placement:'inside'})).toBeNull();
  expect(resolvePreviewMove(elements, {id:'a',targetId:'missing',placement:'after'})).toBeNull();
  expect(resolvePreviewMove(elements, {id:'a',targetId:'input',placement:'inside'})).toBeNull();
});
