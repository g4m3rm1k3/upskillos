import React, { useState } from 'react'
import { MOVES } from './moves'

export function Beat({ label, children }) {
  return (
    <section className="bon-beat rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-400">{label}</p>
      {children}
    </section>
  )
}

export function NextButton({ onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-4 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}

// A number box with a submit button. Calls onSubmit(value) with a number.
export function NumberAnswer({ label, onSubmit, disabled, buttonText = 'Check' }) {
  const [text, setText] = useState('')
  const value = Number(text.replace(/,/g, ''))
  const valid = text.trim() !== '' && Number.isFinite(value)
  return (
    <form
      className="mt-3 flex flex-wrap items-center gap-2"
      onSubmit={e => {
        e.preventDefault()
        if (valid && !disabled) onSubmit(value)
      }}
    >
      <input
        aria-label={label}
        inputMode="numeric"
        value={text}
        disabled={disabled}
        onChange={e => setText(e.target.value)}
        className="w-36 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-lg text-slate-100 focus:border-amber-400 focus:outline-none"
      />
      <button
        type="submit"
        disabled={!valid || disabled}
        className="rounded-lg border border-amber-500 px-4 py-2 font-semibold text-amber-300 hover:bg-amber-500/10 disabled:opacity-40"
      >
        {buttonText}
      </button>
    </form>
  )
}

// A row of answer buttons. Calls onPick(choice) with the chosen label.
export function ChoiceAnswer({ choices, onPick }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Choices">
      {choices.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          className="rounded-lg border border-amber-500 px-4 py-2 font-semibold text-amber-300 hover:bg-amber-500/10"
        >
          {c}
        </button>
      ))}
    </div>
  )
}

// A checked problem: hints on wrong answers, the worked answer after two misses.
export function Problem({ problem, onSolved, label = 'Your answer' }) {
  const [attempts, setAttempts] = useState([])
  const solved = attempts.includes(problem.answer)
  const misses = attempts.filter(a => a !== problem.answer)
  const last = attempts[attempts.length - 1]
  const showSolution = !solved && misses.length >= 2
  return (
    <div>
      <div className="text-lg leading-relaxed">{problem.question}</div>
      <NumberAnswer
        label={label}
        disabled={solved}
        onSubmit={v => {
          const next = [...attempts, v]
          setAttempts(next)
          if (v === problem.answer) onSolved?.()
        }}
      />
      {solved && <p className="mt-3 font-semibold text-emerald-400">Yes! {problem.praise}</p>}
      {!solved && last !== undefined && (
        <p className="mt-3 text-rose-300">Not quite. {problem.hint(last)}</p>
      )}
      {showSolution && (
        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950 p-3 text-slate-300">
          <p className="font-semibold text-slate-100">Here's one way to see it:</p>
          <p className="mt-1">{problem.solution}</p>
          <NextButton onClick={() => onSolved?.()}>Got it, continue</NextButton>
        </div>
      )}
    </div>
  )
}

export function MoveCard({ moveId }) {
  const move = MOVES[moveId]
  if (!move) return null
  return (
    <div className="rounded-xl border-2 border-amber-500/60 bg-gradient-to-br from-amber-500/15 to-slate-900 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Move card</p>
      <p className="mt-1 text-xl font-bold text-amber-200">{move.name}</p>
      <p className="mt-1 text-slate-300">{move.tip}</p>
    </div>
  )
}
