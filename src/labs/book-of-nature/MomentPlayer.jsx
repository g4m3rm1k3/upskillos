import React, { useEffect, useRef, useState } from 'react'
import { Beat, ChoiceAnswer, MoveCard, NextButton, NumberAnswer, Problem } from './parts'

const RIGOR = ['See it', 'Test it', 'Explain it', 'Prove it', 'Make it exact']
const STAGES = ['hook', 'play', 'predict', 'reveal', 'try', 'keep']

// Runs one moment through its six beats: hook, play, predict, reveal, try it, keep.
// Each beat appears once the one before it is finished, so the learner always
// attempts something before anything is explained.
export default function MomentPlayer({ moment, done, onDone }) {
  const [stage, setStage] = useState(0)
  const [state, setState] = useState(moment.initialState)
  const [guess, setGuess] = useState(null)
  const latest = useRef(null)

  useEffect(() => {
    if (stage > 0) latest.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }, [stage])

  const at = name => STAGES.indexOf(name) <= stage
  const advanceFrom = name => setStage(s => Math.max(s, STAGES.indexOf(name) + 1))
  const anchor = name => (STAGES.indexOf(name) === stage ? latest : null)
  const lockIn = v => {
    setGuess(v)
    advanceFrom('predict')
  }
  const { Play, Reveal } = moment

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-4">
      <header>
        <p className="text-sm text-slate-400">
          Episode {moment.episodeNumber}: {moment.episode} · Moment {moment.order}
        </p>
        <h2 className="mt-1 text-3xl font-bold text-slate-50">{moment.title}</h2>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {moment.threads.map(t => (
            <span key={t} className="rounded-full bg-slate-800 px-2 py-1 text-slate-300">{t}</span>
          ))}
          <span className="rounded-full bg-slate-800 px-2 py-1 text-slate-300">Rigor: {RIGOR[moment.rigor]}</span>
          {done && <span className="rounded-full bg-emerald-900 px-2 py-1 text-emerald-300">Done</span>}
        </div>
      </header>

      <Beat label="The question">
        <div className="text-lg leading-relaxed">{moment.hook}</div>
        {stage === 0 && <NextButton onClick={() => advanceFrom('hook')}>Let's find out</NextButton>}
      </Beat>

      {at('play') && (
        <div ref={anchor('play')}>
          <Beat label="Play">
            <Play state={state} setState={setState} />
            {stage === 1 && (
              <NextButton onClick={() => advanceFrom('play')} disabled={!moment.playReady(state)}>
                {moment.playReady(state) ? 'I see something' : moment.playNotReady}
              </NextButton>
            )}
          </Beat>
        </div>
      )}

      {at('predict') && (
        <div ref={anchor('predict')}>
          <Beat label="Predict">
            <div className="text-lg leading-relaxed">{moment.predict.question}</div>
            {guess === null && moment.predict.choices && (
              <ChoiceAnswer choices={moment.predict.choices} onPick={lockIn} />
            )}
            {guess === null && !moment.predict.choices && (
              <NumberAnswer label="Your prediction" buttonText="Lock it in" onSubmit={lockIn} />
            )}
            {guess !== null && (
              <p className="mt-3 text-slate-300">
                You predicted <strong className="text-amber-300">{guess}</strong>. Let's see why the answer has to be what it is.
              </p>
            )}
          </Beat>
        </div>
      )}

      {at('reveal') && (
        <div ref={anchor('reveal')}>
          <Beat label="Why it works">
            <Reveal state={state} setState={setState} guess={guess} />
            <div className="mt-4 rounded-lg bg-slate-950 p-3 text-slate-300">{moment.predict.response(guess)}</div>
            {stage === 3 && <NextButton onClick={() => advanceFrom('reveal')}>Now you try</NextButton>}
          </Beat>
        </div>
      )}

      {at('try') && (
        <div ref={anchor('try')}>
          <Beat label="Try it">
            <Problem problem={moment.tryIt} onSolved={() => advanceFrom('try')} />
          </Beat>
        </div>
      )}

      {at('keep') && (
        <div ref={anchor('keep')} className="flex flex-col gap-4">
          <Beat label="Keep this">
            <p className="text-xl font-semibold leading-relaxed text-slate-50">{moment.keep}</p>
            {moment.symbols && <div className="mt-3 text-slate-300">{moment.symbols}</div>}
            <div className="mt-4">
              <MoveCard moveId={moment.move} />
            </div>
            {!done && <NextButton onClick={onDone}>Finish today's moment</NextButton>}
          </Beat>
          {moment.story && (
            <Beat label="The story">
              <div className="leading-relaxed text-slate-300">{moment.story}</div>
            </Beat>
          )}
          {moment.deeper && (
            <Beat label="Go deeper (optional)">
              <Problem problem={moment.deeper} label="Deeper answer" />
            </Beat>
          )}
        </div>
      )}
    </article>
  )
}
