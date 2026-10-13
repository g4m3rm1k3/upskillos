import { createPortal } from 'react-dom'
import { GLASS_META } from '../../styles/courseColors.js'
import { buildProgressKey } from '../../context/progressMigration.ts'

const TAG = 'text-xs font-bold tracking-wide uppercase px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-sm'

function ModalContent({ item, onLaunch, getLessonProgress }) {
  const card = item.cardItem
  const meta = GLASS_META[card.color] ?? GLASS_META.slate
  const isCourse = item.kind === 'course'
  
  const icon = card.icon || card.emoji
  const title = card.label
  const desc = card.description || card.desc
  const sub = card.cover?.sub
  const mark = card.cover?.mark
  
  let pct = null;
  if (isCourse && item.chapters) {
    const total = item.chapters.reduce((s, ch) => s + ch.lessons.length, 0)
    if (total > 0) {
      const done = item.chapters.reduce((s, ch) =>
        s + ch.lessons.filter(l => getLessonProgress(buildProgressKey(item.key, l)).status === 'complete').length, 0)
      pct = done / total
    } else {
      pct = 0
    }
  }
  
  return (
    <div className="flex flex-col h-full w-full">
      {/* Header section with rich gradient */}
      <div className={`relative px-8 pt-10 pb-8 overflow-hidden border-b-2 ${meta.border}`}>
        {/* Background gradient/glow */}
        <div className={`absolute inset-0 opacity-20 dark:opacity-30 bg-gradient-to-br ${meta.header} mix-blend-multiply dark:mix-blend-screen pointer-events-none`} />
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent dark:from-white/10 opacity-50 pointer-events-none" />
        
        {/* Huge background watermark icon */}
        <div className={`absolute -right-10 top-1/2 -translate-y-1/2 pointer-events-none select-none leading-none text-[180px] font-black opacity-[0.04] dark:opacity-[0.08] drop-shadow-sm mix-blend-overlay ${meta.text}`}>
          {mark || icon}
        </div>
        
        <div className="relative z-10 flex items-start gap-6">
          <div className="text-[5rem] leading-none filter drop-shadow-md bg-white/50 dark:bg-black/20 p-4 rounded-3xl border border-white/40 dark:border-white/10 backdrop-blur-md">
            {icon}
          </div>
          <div className="flex flex-col justify-center pt-2">
            <span className={`text-xs font-black uppercase tracking-widest mb-2 ${meta.text}`}>
              {item.badgeKind ? item.badgeKind.toUpperCase() : item.kind.toUpperCase()}
            </span>
            <h2 className={`font-black text-3xl sm:text-4xl leading-tight tracking-tight drop-shadow-sm ${meta.text} mb-1`}>
              {title}
            </h2>
            {sub && <span className="text-slate-500 dark:text-slate-400 text-sm font-mono font-medium">{sub}</span>}
          </div>
        </div>
      </div>
      
      {/* Body section */}
      <div className="px-8 py-8 flex flex-col gap-8 bg-white/80 dark:bg-[#0d0d18]/50">
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
          {desc}
        </p>
        
        {card.tags && card.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {card.tags.map(t => <span key={t} className={TAG}>{t}</span>)}
          </div>
        )}
        
        {isCourse && pct !== null && (
          <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Course Progress</span>
              <span className={`font-black text-lg ${meta.text}`}>{Math.round(pct * 100)}%</span>
            </div>
            <div className={`h-3 rounded-full relative overflow-hidden ${meta.text}`}>
              <div className="absolute inset-0 bg-current opacity-[0.15] dark:opacity-[0.2]" />
              <div className={`absolute top-0 left-0 h-full rounded-full bg-gradient-to-r ${meta.header} transition-all duration-700 ease-out`}
                style={{ width: `${Math.max(2, pct * 100)}%`, boxShadow: pct > 0 ? meta.glow : 'none' }} />
            </div>
          </div>
        )}
        
        <div className="flex justify-end pt-2">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLaunch(); }}
            className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-lg text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 bg-gradient-to-r ${meta.header}`}
            style={{ boxShadow: meta.glow }}
          >
            {isCourse ? (pct > 0 ? 'Continue Course' : 'Start Course') : 'Launch App'}
            <span className="text-xl leading-none ml-1">→</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ItemInfoModal({ item, onClose, onLaunch, getLessonProgress }) {
  if (!item) return null

  // Use a portal to escape the backdrop-blur container of the TopicTable
  // which traps fixed positioning and prevents the overlay from covering the screen.
  const modalContent = (
    <div
      className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full max-h-[calc(100vh-2rem)] overflow-y-auto bg-white dark:bg-[#0b0f19] rounded-[32px] shadow-2xl border border-slate-200/50 dark:border-white/10 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors z-[210]"
          title="Close"
        >
          ✕
        </button>

        <ModalContent item={item} onLaunch={onLaunch} getLessonProgress={getLessonProgress} />
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null
}
