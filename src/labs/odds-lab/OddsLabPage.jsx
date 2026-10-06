import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CardDiceLab from './CardDiceLab.jsx'

export default function OddsLabPage() {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Probability Casino Lab - UpSkillOS'
    return () => { document.title = 'UpSkillOS' }
  }, [])

  return (
    <div className="fixed inset-0 z-[1700] overflow-auto bg-slate-950">
      <CardDiceLab fullPage onBack={() => navigate('/')} />
    </div>
  )
}
