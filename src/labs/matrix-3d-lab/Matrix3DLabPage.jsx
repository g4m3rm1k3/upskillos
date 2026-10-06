import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Matrix3DLab from './Matrix3DLab.jsx'

export default function Matrix3DLabPage() {
  const navigate = useNavigate()
  useEffect(() => {
    document.title = 'Matrix 3D Lab — UpSkillOS'
    return () => { document.title = 'UpSkillOS' }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 1700 }}>
      <Matrix3DLab onBack={() => navigate('/')} />
    </div>
  )
}
