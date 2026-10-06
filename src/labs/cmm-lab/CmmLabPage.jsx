import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CmmLab from './CmmLab.jsx'

export default function CmmLabPage() {
  const navigate = useNavigate()
  useEffect(() => {
    document.title = 'CMM Lab — UpSkillOS'
    return () => { document.title = 'UpSkillOS' }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 1700 }}>
      <CmmLab onBack={() => navigate('/')} />
    </div>
  )
}
