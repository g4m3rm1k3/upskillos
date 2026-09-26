import { useEffect, useState } from 'react'
import { useTour } from '../../context/TourContext.jsx'

function useTargetRect(selector, active) {
  const [rect, setRect] = useState(null)

  useEffect(() => {
    if (!active || !selector) { setRect(null); return }

    const measure = () => {
      const r = document.querySelector(selector)?.getBoundingClientRect()
      // A target hidden at this breakpoint (display:none) measures 0×0 — treat it as missing.
      setRect(r && (r.width > 0 || r.height > 0) ? r : null)
    }

    measure()
    // Targets (Taskbar, top bar, home page) rarely move on their own, but the
    // window does — keep the highlight glued to the real element instead of
    // drifting on resize/orientation change.
    window.addEventListener('resize', measure)
    const interval = setInterval(measure, 400) // cheap re-check for late-mounted targets
    return () => {
      window.removeEventListener('resize', measure)
      clearInterval(interval)
    }
  }, [selector, active])

  return rect
}

export default function TourSpotlight() {
  const tour = useTour()
  const { active, step } = tour
  const rect = useTargetRect(step?.target, active)
  const [question, setQuestion] = useState('')

  if (!active || !step) return null

  const pad = 8
  const highlightStyle = rect
    ? {
        position: 'fixed',
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
        borderRadius: 16,
        boxShadow: '0 0 0 9999px rgba(15,23,42,0.55)',
        pointerEvents: 'none',
        zIndex: 9990,
        transition: 'all 0.25s ease',
      }
    : {
        // No target to highlight: dim the page but let taps through, so the tour never
        // locks someone out of the top bar (it did on phones). The card has Skip.
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.55)',
        pointerEvents: 'none',
        zIndex: 9990,
      }

  // Card placement: prefer above the target when it's in the bottom half of
  // the screen (Taskbar buttons), below it when it's in the top half (search
  // bar). Fall back to centered if there's no real target to anchor to.
  const isBottomHalf = rect ? rect.top > window.innerHeight / 2 : false
  const cardStyle = rect
    ? {
        position: 'fixed',
        zIndex: 9991,
        left: Math.min(Math.max(rect.left + rect.width / 2 - 160, 12), window.innerWidth - 332),
        // Bottom-half target → card floats above: pin by "bottom" from viewport
        ...(isBottomHalf
          ? { bottom: window.innerHeight - rect.top + pad + 12 }
          : { top: rect.bottom + pad + 12 }),
        width: 320,
      }
    : {
        position: 'fixed',
        zIndex: 9991,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 320,
      }

  return (
    <>
      <div style={highlightStyle} />
      <div
        style={cardStyle}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5"
      >
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">{step.title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">{step.body}</p>

        {step.greeting ? (
          <div className="space-y-2">
            <button
              onClick={tour.next}
              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors"
            >
              Show me around
            </button>
            <form
              onSubmit={(e) => { e.preventDefault(); if (question.trim()) tour.askQuestion(question.trim()) }}
              className="flex gap-1.5"
            >
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder='Or ask: "Can I learn calculus?"'
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-400/50"
              />
              <button type="submit" className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                Ask
              </button>
            </form>
            <button onClick={tour.endTour} className="w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors pt-1">
              Skip
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <button onClick={tour.endTour} className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              Skip
            </button>
            <button
              onClick={tour.next}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors"
            >
              {step.isLast ? 'Done' : 'Next'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
