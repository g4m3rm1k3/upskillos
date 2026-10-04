// @vitest-environment jsdom
import React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import CountingAssessment from './CountingAssessment'
import rocks from './lessons/rocks'
import { ProgressContext } from '../../context/ProgressContext'
import { defineLesson } from './schema'
beforeEach(()=>localStorage.clear())
afterEach(cleanup)
const click = name => fireEvent.click(screen.getByRole('button',{name,exact:true}))
function begin() {
  click('Try counting together');click('Paper with 3 marks');click('Try a prediction');click('Paper with 4 marks');click('Make my own record')
}
function record(n) { for(let i=0;i<n;i++)click('Make a mark');click('Check my record') }
it('does not pass for visiting, guessing or receiving help; saves independent evidence across reloads',()=>{
  const view=render(<CountingAssessment lesson={rocks}/>);begin()
  record(1);expect(screen.getByText(/Some rocks still/)).toBeTruthy()
  click('Make a mark');click('Check my record')
  expect(JSON.parse(localStorage.getItem('oc-intuition-progress'))['intuition::l1'].evidence).toEqual([])
  click('Try a fresh collection');record(0)
  click('Try a fresh collection');record(7)
  view.unmount();render(<CountingAssessment lesson={rocks}/>);
  click('Try a fresh collection');record(3)
  expect(screen.getByText(/Understanding demonstrated/)).toBeTruthy()
  cleanup();render(<CountingAssessment lesson={rocks}/>);
  expect(screen.getByText(/Understanding demonstrated/)).toBeTruthy()
})
it('records genuine completion through the shared app progress API and preserves other state',()=>{
  const progress={progress:{'intuition::l1':{quizStates:{other:'preserved'}}},setQuizStates:vi.fn(),setQuizScore:vi.fn(),markCheckpoint:vi.fn(),markVisited:vi.fn()}
  render(<ProgressContext.Provider value={progress}><CountingAssessment lesson={rocks}/></ProgressContext.Provider>);begin()
  record(2);click('Try a fresh collection');record(0);click('Try a fresh collection');record(7)
  expect(progress.markCheckpoint).toHaveBeenCalledWith('intuition::l1','assessment-passed')
  expect(progress.setQuizStates.mock.calls.at(-1)[1]).toMatchObject({other:'preserved',counting:{stage:'complete',evidence:['small','empty','scattered']}})
  const writes=progress.setQuizScore.mock.calls.length
  click('Practise again');begin();record(2)
  expect(progress.setQuizScore.mock.calls).toHaveLength(writes)
})
it('an explicit hint requires a fresh trial even after a correct record',()=>{
  render(<CountingAssessment lesson={rocks}/>);begin();click('Help me look');cleanup();render(<CountingAssessment lesson={rocks}/>);record(2)
  expect(screen.getByText(/Let’s try a different collection/)).toBeTruthy()
  expect(JSON.parse(localStorage.getItem('oc-intuition-progress'))['intuition::l1'].evidence).toEqual([])
})
it('rejects incomplete contributor assessment definitions',()=>{
  expect(()=>defineLesson({...rocks,assessment:{kind:'counting',collections:[2,3]}})).toThrow('assessment')
})
