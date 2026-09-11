import { lazy } from 'react'

// Reference/lookup surfaces — the "look up the formula you saw 3 lessons ago"
// pages. These open full-screen as an overlay on top of whatever the user is
// already doing (a lesson, a lab, home) instead of navigating there, so
// closing one returns you to exactly where you were. Not added to the
// taskbar/window system on purpose — this is a lookup, not a destination.
//
// `selfChrome: true` means the component already renders its own full-height
// header + close button (it was built for this from the start, like
// GameRules) — ReferenceOverlay skips wrapping those in a generic header.
export const REFERENCE_ITEMS = [
  {
    key: 'reference',
    label: 'Formula Atlas',
    emoji: '📐',
    color: 'slate',
    Component: lazy(() => import('../pages/ReferencePage.jsx')),
  },
  {
    key: 'linear-algebra',
    label: 'Linear Algebra Reference',
    emoji: '∑',
    color: 'cyan',
    Component: lazy(() => import('../pages/LinearAlgebraReferencePage.jsx')),
  },
  {
    key: 'la-explorer',
    label: 'LA Concept Explorer',
    emoji: '🔍',
    color: 'violet',
    selfChrome: true,
    Component: lazy(() => import('../pages/LAConceptExplorerPage.jsx')),
  },
  {
    key: 'latex-notes',
    label: 'LaTeX Field Notes',
    emoji: '✎',
    color: 'indigo',
    selfChrome: true,
    Component: lazy(() => import('../pages/LatexFieldNotesPage.jsx')),
  },
  {
    key: 'regex-reference',
    label: 'Regex Reference',
    emoji: '🔤',
    color: 'red',
    Component: lazy(() => import('../pages/RegexReferencePage.jsx')),
  },
  {
    key: 'regex-explorer',
    label: 'Regex Concept Explorer',
    emoji: '🧬',
    color: 'red',
    selfChrome: true,
    Component: lazy(() => import('../pages/RegexConceptExplorerPage.jsx')),
  },
  {
    key: 'eng-math',
    label: 'Engineering Mathematics',
    emoji: '∫',
    color: 'indigo',
    Component: lazy(() => import('../pages/EngMathPage.jsx')),
  },
  {
    key: 'universal-calc',
    label: 'Universal Calc',
    emoji: '🧮',
    color: 'emerald',
    Component: lazy(() => import('../labs/universal-calc/UniversalCalcPage.jsx')),
  },
  {
    key: 'game-rules',
    label: 'Game Reference',
    emoji: '♠️',
    color: 'rose',
    selfChrome: true,
    Component: lazy(() => import('../games/GameRules.jsx')),
  },
]

export function getReferenceItem(key) {
  return REFERENCE_ITEMS.find((i) => i.key === key) ?? null
}
