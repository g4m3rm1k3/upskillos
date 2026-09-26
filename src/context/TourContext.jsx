import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { COURSES } from '../courses/index.js'
import { useIsMobile } from '../hooks/useIsMobile.js'

const TourContext = createContext(null)
export const useTour = () => useContext(TourContext)

export const TOUR_SEEN_KEY = 'oc-tour-seen'

// Every target must exist at the breakpoint it is used for. Below `lg` (useIsMobile) there is no
// Taskbar — so no Start menu and no Delta button — and the mobile home page has no search box.
// A step whose target is missing shows a centered card (see TourSpotlight).
function buildSteps(isMobile) {
  const tutorTarget = isMobile ? null : '[data-tour="stem-tutor"]'

  const steps = [
    {
      id: 'greeting',
      target: tutorTarget,
      title: "Hi, I'm Delta!",
      body: 'Welcome to UpSkillOS — your open-source STEM learning platform. Want me to show you around?',
      greeting: true, // renders the 3-way greeting UI instead of Next/Skip
    },
  ]

  if (!isMobile) {
    steps.push({
      id: 'search',
      target: '[data-tour="home-search"]',
      title: 'Find anything, instantly',
      body: 'Type in plain English — "teach me calculus", "show me robotics games", or "I want to build a website" — and every course, lab, and game is filtered live.',
    })
  }

  steps.push(
    {
      id: 'explore',
      target: isMobile ? '[data-tour="courses-grid"]' : '[data-tour="start-menu"]',
      title: 'Courses, Labs, and Games',
      body: isMobile
        ? 'Scroll down to Explore Courses to browse every course — pre-calc through CNC machining.'
        : 'Click Start to browse Courses, Labs, and Games. Labs are hands-on sandboxes; Courses are structured lessons with exercises.',
      // On desktop, open the start menu so the user can see it
      onAction: isMobile ? null : () => window.dispatchEvent(new CustomEvent('oc-open-start-menu')),
    },
  )

  steps.push(
    // Same target on mobile and desktop now — the Help ("?") button is
    // visible at every breakpoint and Feedback & Bugs is its default
    // section, so there's one real door to report a bug or leave an idea,
    // not a different one per device size.
    {
      id: 'report-bug',
      target: '[data-tour="report-bug"]',
      title: 'See something broken?',
      body: "Click here — Feedback & Bugs is the first thing you'll see. Report a bug, leave a suggestion, or browse what's already been reported.",
    },
  )

  if (!isMobile) {
    steps.push({
      id: 'lesson-builder',
      target: '[data-tour="start-menu"]',
      title: 'Built by the community, not one person',
      body: 'Open Start → Lesson Builder · Contribute to write a lesson and submit it as a real GitHub pull request, no local setup required.',
    })
  }

  steps.push({
    id: 'farewell',
    // Phones have no Delta button; the "?" button is always there and can restart the tour.
    target: isMobile ? '[data-tour="report-bug"]' : tutorTarget,
    title: "That's the tour!",
    body: isMobile
      ? 'Tap ? any time for help, feedback, or to take this tour again. — Delta'
      : "I'm always here if you need me. Click this button any time. — Delta",
    isLast: true,
  })

  return steps
}

export function TourProvider({ children }) {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  const steps = useMemo(() => buildSteps(isMobile), [isMobile])

  const startTour = useCallback(() => {
    localStorage.removeItem(TOUR_SEEN_KEY)
    setStepIndex(0)
    setActive(true)
  }, [])

  const endTour = useCallback(() => {
    setActive(false)
    localStorage.setItem(TOUR_SEEN_KEY, '1')
  }, [])

  const next = useCallback(() => {
    setStepIndex((i) => {
      const currentStep = steps[i]
      // Fire the step's onAction (if any) as we leave it, so the user can
      // see the thing being described (e.g. open the Start Menu)
      if (currentStep?.onAction) {
        try { currentStep.onAction() } catch { /* ignore */ }
      }
      if (i + 1 >= steps.length) {
        endTour()
        return i
      }
      return i + 1
    })
  }, [steps, endTour])

  // Quick-reply branch from the greeting step: simple keyword match against
  // real course labels rather than a full NLU round-trip for what's really
  // just a navigation shortcut.
  const askQuestion = useCallback((text) => {
    const q = text.toLowerCase()
    const match = COURSES.find((c) => q.includes(c.label.toLowerCase().split(' ')[0]))
    endTour()
    if (match) navigate(match.path)
  }, [navigate, endTour])

  const value = useMemo(() => ({
    active,
    step: steps[stepIndex],
    stepIndex,
    totalSteps: steps.length,
    startTour,
    endTour,
    next,
    askQuestion,
  }), [active, steps, stepIndex, startTour, endTour, next, askQuestion])

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}
