import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MatrixLab from './MatrixLab.jsx'

export default function MatrixLabPage() {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Matrix Lab — UpSkillOS'
    return () => { document.title = 'UpSkillOS' }
  }, [])

  return (
    <div style={{ position:'fixed', inset:0, background:'#1a1a1a', overflow:'hidden', zIndex: 1700 }}>
      <MatrixLab onBack={() => navigate('/')} />
    </div>
  )
}
