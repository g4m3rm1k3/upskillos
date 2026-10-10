import { useContext } from 'react'
import { ProgressContext } from '../context/ProgressContext.jsx'

export function useProgress() {
  const progress = useContext(ProgressContext)
  if (!progress) throw new Error('useProgress must be used within a ProgressProvider')
  return progress
}
