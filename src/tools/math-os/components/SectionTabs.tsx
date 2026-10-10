import { SECTIONS } from '../constants'
import type { SectionId } from '../types'

interface Props {
  section: SectionId
  onSelect: (id: SectionId) => void
  ui: Record<string, string>
}

export default function SectionTabs({ section, onSelect, ui }: Props) {
  return (
    <nav aria-label="MathOS sections" className={`flex flex-wrap gap-1 px-3 py-2 border-b shrink-0 ${ui.bg1} ${ui.border}`}>
      <select aria-label="MathOS tool" value={section} onChange={event => onSelect(event.target.value as SectionId)} className={`sm:hidden w-full rounded-lg border px-3 py-2 text-sm ${ui.bg2} ${ui.border} ${ui.txt1}`}>
        {SECTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      {SECTIONS.map(s => (
        <button key={s.id} onClick={() => onSelect(s.id)} aria-current={section === s.id ? 'page' : undefined}
          className={`hidden sm:block px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all duration-200 ${section===s.id?'bg-brand-500/15 text-brand-300 shadow-sm':'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
          {s.label}
        </button>
      ))}
    </nav>
  )
}
