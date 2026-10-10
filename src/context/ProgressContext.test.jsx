// @vitest-environment happy-dom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ProgressProvider } from './ProgressContext.jsx'
import { useProgress } from '../hooks/useProgress.js'

vi.mock('./AuthContext.jsx', () => ({ useAuth: () => null }))
vi.mock('../courses/courseLoader.js', () => ({ getLessonIdLookup: () => ({}) }))
vi.mock('../features/compass/montyNudge.ts', () => ({ celebrate: vi.fn() }))

afterEach(() => { cleanup(); localStorage.clear() })

function Learner() {
  const { progress, markCheckpoint } = useProgress()
  return <>
    <output>{(progress['practice::sample']?.completedCheckpoints ?? []).join(',')}</output>
    <button onClick={() => markCheckpoint('practice::sample', 'level-1')}>Complete</button>
  </>
}

it('persists a checkpoint and restores it through a fresh progress provider', () => {
  const view = render(<ProgressProvider><Learner /></ProgressProvider>)
  fireEvent.click(screen.getByText('Complete'))
  fireEvent.click(screen.getByText('Complete'))
  expect(JSON.parse(localStorage.getItem('oc-progress'))['practice::sample'].completedCheckpoints)
    .toEqual(['level-1'])
  view.unmount()
  render(<ProgressProvider><Learner /></ProgressProvider>)
  expect(screen.getByRole('status').textContent).toBe('level-1')
})
