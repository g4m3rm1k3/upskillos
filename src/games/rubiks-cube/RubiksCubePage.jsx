import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import RubiksCube from './RubiksCube.jsx'

export default function RubiksCubePage({ onBack, onClose }) {
  const navigate = useNavigate()
  // Opened as a route, "back" should leave the page; opened inside the desktop
  // window manager, it should just close that window instead of changing the URL.
  const handleBack = onBack || onClose || (() => navigate('/games'))
  useEffect(() => {
    document.title = "Rubik's Cube — UpSkillOS"
    return () => { document.title = 'UpSkillOS' }
  }, [])
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'radial-gradient(ellipse at 30% 20%, #0a1a2e 0%, #050810 60%, #0d0a20 100%)',
      overflow: 'auto',
      zIndex: 1700,
    }}>
      <RubiksCube onBack={handleBack} />
    </div>
  )
}
