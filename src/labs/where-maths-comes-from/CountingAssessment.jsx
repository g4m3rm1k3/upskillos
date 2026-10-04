import React, { useContext, useState } from 'react'
import { ProgressContext } from '../../context/ProgressContext'
import { useLocalStorage } from '../../hooks/useLocalStorage'

const initial = { stage: 'ready', trial: 0, evidence: [], attempts: 0 }
// Stable across routes and curriculum order; deliberately separate from course ids.
export const intuitionProgressKey = id => `intuition::${id}`
export default function CountingAssessment({ lesson }) {
  const progress = useContext(ProgressContext)
  const key = intuitionProgressKey(lesson.id)
  const [local, saveLocal] = useLocalStorage('oc-intuition-progress', {})
  const saved = progress ? progress.progress?.[key]?.quizStates?.counting : local[key]
  const [state, setState] = useState(() => ({ ...initial, ...(progress?.progress?.[key]?.completedCheckpoints?.includes('assessment-passed') ? {stage:'complete'} : {}), ...saved }))
  const [reviewing, setReviewing] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [marks, setMarks] = useState(0)
  const [helped, setHelped] = useState(() => Boolean(saved?.helped))
  const complete = state.stage === 'complete'
  const config = lesson.assessment
  const target = config.collections[state.trial % config.collections.length]
  const commit = next => {
    setState(next)
    if (reviewing) return
    if (progress) {
      progress.setQuizStates(key, { ...progress.progress?.[key]?.quizStates, counting: next })
      if (next.stage === 'complete') progress.markCheckpoint(key, 'assessment-passed')
      progress.setQuizScore(key, next.evidence.length, Math.max(1, next.attempts), 3)
    } else saveLocal(previous => ({ ...previous, [key]: next }))
  }
  const advance = stage => { commit({ ...state, stage }); setFeedback(''); setMarks(0); setHelped(false) }
  const start = () => { progress?.markVisited(key); advance('notice') }
  const answer = value => {
    const right = value === (state.stage === 'notice' ? 3 : 4)
    if (!right) { setFeedback('Try matching one mark to each rock. Is there a rock without a mark, or a mark with no rock?'); commit({...state, attempts:state.attempts+1}); return }
    setFeedback(state.stage === 'notice' ? 'Each rock has a partner. The marks keep the same collection on paper.' : 'One new rock needs one new mark. The earlier matches stay in place.')
    commit({...state, stage:state.stage==='notice'?'noticed':'predicted', attempts:state.attempts+1})
  }
  const check = () => {
    if (marks !== target) {
      setFeedback(marks < target ? 'Some rocks still have no matching mark. Touch each rock once and check your record.' : 'Some marks have no rock to go with them. Check each pair, including any leftover marks.')
      setHelped(true)
      commit({...state, helped:true, attempts:state.attempts+1})
      return
    }
    if (helped) {
      setFeedback('The record now matches. Let’s try a different collection without help before saving evidence of understanding.')
      commit({...state, stage:'supported', attempts:state.attempts+1})
      return
    }
    const evidence = [...new Set([...state.evidence, target===0?'empty':target<5?'small':'scattered'])]
    commit({...state, evidence, attempts:state.attempts+1, stage:evidence.length===3?'complete':'matched'})
    setFeedback(target===0 ? 'Nothing to record: leaving the paper empty correctly represents this collection.' : 'Every rock has exactly one mark. Their positions changed, but the record still matches.')
  }
  const fresh = () => { commit({...state, stage:'transfer', trial:state.trial+1, helped:false}); setMarks(0);setHelped(false);setFeedback('') }
  const hint = () => { setHelped(true);commit({...state, helped:true});setFeedback(target===0?'There are no rocks. Would putting a mark on paper invent something that is not here?':'Point to one rock, make one mark, then move to a rock you have not recorded. Stop when every rock has a partner.') }
  const dots = (count, scattered=false) => <svg viewBox="0 0 240 110" role="img" aria-label={count===0?'An empty tray':'A collection of rocks'}><rect x="2" y="2" width="236" height="106" rx="12" fill="var(--paper)" stroke="var(--line)"/>{Array.from({length:count},(_,i)=><circle key={i} cx={scattered?22+(i*67)%195:32+i*48} cy={scattered?23+(i*31)%65:54} r="12" fill="var(--a)"/>)}</svg>
  const tally = count => <span className="wm-mark-record" aria-hidden="true">{count===0?'Empty paper':Array.from({length:count},(_,i)=><span key={i}>│</span>)}</span>
  return <div className="wm-assessment">
    <h3>Can your record tell the same story?</h3>
    <p className="wm-notice">{complete?'Understanding demonstrated · saved':reviewing?'Practice run · saved completion unchanged':state.stage==='ready'?'Explore first, then try a few questions about what you see.':'Practising · progress saved'}{progress?'':' on this device'}</p>
    {state.stage==='ready'&&!complete&&<button onClick={start}>Try counting together</button>}
    {['notice','predict'].includes(state.stage)&&<>
      <p>{state.stage==='notice'?'Which paper could stand for this collection?':'Imagine one more rock joins these three. Which paper will record the new collection?'}</p>
      {dots(3)}
      <div className="row">{(state.stage==='notice'?[2,3,4]:[3,5,4]).map(n=><button key={n} aria-label={`Paper with ${n} marks`} onClick={()=>answer(n)}>{tally(n)}</button>)}</div>
    </>}
    {state.stage==='noticed'&&<button onClick={()=>advance('predict')}>Try a prediction</button>}
    {state.stage==='predicted'&&<><p>Now make the record yourself. Three fresh collections include an empty tray and rocks in different positions. Help is welcome; afterwards you’ll try another collection independently.</p><button onClick={()=>advance('transfer')}>Make my own record</button></>}
    {state.stage==='transfer'&&<>
      <p>Make one mark for every rock. Does the paper tell the same story as the tray?</p>
      {dots(target,true)}
      <div role="img" aria-label={`Your paper has ${marks} marks`}>{tally(marks)}</div>
      <div className="row"><button disabled={marks===0} onClick={()=>setMarks(n=>n-1)}>Erase a mark</button><button disabled={marks===10} onClick={()=>setMarks(n=>n+1)}>Make a mark</button><button onClick={check}>Check my record</button><button onClick={hint}>Help me look</button></div>
      <p>{state.evidence.length} of 3 different collections recorded independently.</p>
    </>}
    {['matched','supported'].includes(state.stage)&&<button onClick={fresh}>Try a fresh collection</button>}
    <p role="status">{feedback}</p>
    {complete&&<button onClick={()=>{setReviewing(true);setState({...initial});setFeedback('');setMarks(0);setHelped(false)}}>Practise again</button>}
    {complete&&<p>You matched rocks to marks, predicted a new arrival, and recorded small, empty, and scattered collections independently. You can keep exploring; this understanding stays saved when the lesson moves.</p>}
  </div>
}
