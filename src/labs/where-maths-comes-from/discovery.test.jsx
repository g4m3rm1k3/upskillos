// @vitest-environment jsdom
import React from 'react'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import LessonExperience from './LessonExperience'
import { lessons } from './registry'
import { defineLesson } from './schema'
afterEach(()=>{cleanup();vi.restoreAllMocks()})
function mount(id){const view=render(<LessonExperience lesson={lessons.find(x=>x.id===id)}/>);const root=view.container.querySelector('section');return {...view,root,q:s=>root.querySelector(s),text:()=>root.querySelector('[data-state=why]').textContent}}
const click=(v,s)=>fireEvent.click(v.q(s))
const input=(v,s,value)=>fireEvent.input(v.q(s),{target:{value:String(value)}})
it.each(lessons.map(x=>[x.id]))('%s starts with a useful question and optional comparisons',id=>{
 const v=mount(id),lesson=lessons.find(x=>x.id===id)
 expect(v.q('[data-state=observation]').textContent).toBe(lesson.discovery.start)
 expect(v.q('[data-state=tryNext]').textContent).toBe(lesson.discovery.question)
 expect(v.q('.wm-transfer').textContent).toContain(lesson.discovery.transfer)
 for(const item of lesson.discovery.views||[]){expect(v.q(`[id="${item.target}"]`).hidden).toBe(true);click(v,`[data-reveal="${item.target}"]`);expect(v.q(`[id="${item.target}"]`).hidden).toBe(false);click(v,`[data-reveal="${item.target}"]`);expect(v.q(`[id="${item.target}"]`).hidden).toBe(true)}
})
it('requires the contributor discovery contract',()=>{
 expect(()=>defineLesson({...lessons[0],discovery:null})).toThrow('discovery.start')
})
it('shares equal rounds without creating food and distinguishes incomplete sharing from a remainder',()=>{
 const v=mount('sharing-table');for(let i=0;i<4;i++)click(v,'#deal')
 expect(v.q('#sharing-record').textContent).toContain('4, 4, 4')
 click(v,'#extra');expect(v.q('#sharing-record').textContent).toContain('table: 1')
 expect(v.text()).toContain('too few whole cookies')
 click(v,'#give-a');expect(v.q('#sharing-record').textContent).toContain('5, 4, 4')
 expect(v.text()).toContain('some plates have more')
 click(v,'#start-over');expect(v.q('#sharing-record').textContent).toContain('table: 13')
})
it('fractions refer to equal pieces of the same conserved whole',()=>{
 const v=mount('sharing-loaf');click(v,'#cut-four');expect(v.q('#loaf-language').textContent).toContain('1/4')
 expect(v.q('#loaf rect')).toBeTruthy();expect(v.q('#loaf').querySelectorAll('rect')).toHaveLength(4)
 click(v,'#cut-two');input(v,'#middle-cut',30);expect(v.q('#loaf-record').textContent).toContain('30% and 70%')
 expect(v.q('#loaf-language').textContent).toContain('not necessarily two halves')
 click(v,'#whole-loaf');expect(v.q('#loaf').querySelectorAll('rect')).toHaveLength(1)
})
it('moving ropes preserves length and changing units changes the numerical report',()=>{
 const v=mount('measuring-rope'),before=v.q('#ropes line').getAttribute('x2');click(v,'#align-ropes');expect(v.q('#ropes line').getAttribute('x2')).toBe(before)
 click(v,'#measure-rope');expect(v.q('#rope-record').textContent).toContain('4.50')
 fireEvent.change(v.q('#stick-size'),{target:{value:'80'}});expect(v.q('#rope-record').textContent).toContain('2.25')
})
it('balances equality under equal additions but not one-sided changes',()=>{
 const v=mount('balancing-loads');for(let i=0;i<3;i++)click(v,'#weight-add')
 expect(v.q('#balance-record').textContent).toContain('Level')
 click(v,'#both-add');expect(v.q('#balance-record').textContent).toContain('Level')
 click(v,'#weight-add');expect(v.q('#balance-record').textContent).toContain('Right side is heavier')
})
it('conserves water and lowers the waterline when the same amount spreads across a wider base',()=>{
 const v=mount('pouring-water');for(let i=0;i<6;i++)click(v,'#pour-wide')
 expect(v.q('#water-record').textContent).toContain('First: 0 mL · second: 600 mL · total: 600 mL')
 input(v,'#tank-width',80);const narrow=Number(v.q('#water rect').getAttribute('height'))
 input(v,'#tank-width',160);expect(Number(v.q('#water rect').getAttribute('height'))).toBe(narrow/2)
 expect(v.q('#water-record').textContent).toContain('total: 600 mL')
})
it('scales a drink without changing concentration, unlike changing one ingredient',()=>{
 const v=mount('mixing-drinks');click(v,'#double-batch');expect(v.q('#drink-record').textContent).toContain('Matches')
 expect(v.q('#drink-record').textContent).toContain('2 scoops concentrate and 4 scoops water')
 click(v,'#water-add');expect(v.q('#drink-record').textContent).toContain('Less concentrated')
})
it('changes a coordinate description without changing the journey or time',()=>{
 const v=mount('train-observers');click(v,'#next-moment');click(v,'#next-moment');click(v,'#show-path')
 const platform=[...v.q('#train').querySelectorAll('circle')].map(x=>x.getAttribute('cx'))
 expect(new Set(platform).size).toBeGreaterThan(1)
 fireEvent.change(v.q('#observer'),{target:{value:'train'}})
 const passenger=[...v.q('#train').querySelectorAll('circle')].map(x=>x.getAttribute('cx'))
 expect(new Set(passenger).size).toBe(1);expect(v.q('#journey-record').textContent).toContain('Moment 2')
})
it('counts only complete stretches from one, including an unfinished last stretch',()=>{
 const v=mount('street-lights');fireEvent.change(v.q('#lamp-step'),{target:{value:'7'}})
 expect(v.q('#lamp-record').textContent).toContain('4 complete stretches of 7 houses, with 2')
 expect(v.q('#lamp-language').textContent).toContain('floor(30/7) = 4')
 input(v,'#houses',35);expect(v.q('#lamp-record').textContent).toContain('5 complete stretches')
 expect(v.q('#lamp-language').textContent).toContain('infinitely many multiples')
})
it('corrects a shared missing corner in near-base multiplication',()=>{
 const v=mount('almost-full-tray');click(v,'#inspect-missing')
 expect(v.q('#tray-language').textContent).toContain('100 - 10 - 20 + 2 = 72')
 input(v,'#tray-width',10);expect(v.text()).toContain('no shared corner')
 input(v,'#tray-height',10);expect(v.q('#tray-record').textContent).toContain('100 biscuits')
})
it('allows a fall before any prediction is supplied',()=>{
 let tick;vi.spyOn(performance,'now').mockReturnValue(0);vi.spyOn(window,'requestAnimationFrame').mockImplementation(fn=>{tick=fn;return 1})
 const v=mount('l4');expect(v.q('#pg').value).toBe('');click(v,'#drop');expect(tick).toBeTypeOf('function');tick(3600)
 expect(v.q('#fall-result').textContent).toContain('drop is recorded')
})

it('cleans up generated view controls when React rehearses mounting',()=>{
 const lesson=lessons.find(x=>x.id==='l6')
 const v=render(<React.StrictMode><LessonExperience lesson={lesson}/></React.StrictMode>)
 expect(v.container.querySelectorAll('[data-reveal]')).toHaveLength(lesson.discovery.views.length)
})
