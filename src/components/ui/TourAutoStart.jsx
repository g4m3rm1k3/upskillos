import { useEffect } from 'react'
import { useTour, TOUR_SEEN_KEY } from '../../context/TourContext.jsx'

// Starts the Delta-hosted tour on a visitor's first-ever visit. Delayed so
// the tour's anchor targets (Taskbar, top bar, home page) have mounted.
export default function TourAutoStart() {
  const { startTour } = useTour()

  useEffect(() => {
    if (localStorage.getItem(TOUR_SEEN_KEY)) return
    const t = setTimeout(startTour, 2000)
    return () => clearTimeout(t)
  }, [startTour])

  return null
}
