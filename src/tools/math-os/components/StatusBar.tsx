interface Props {
  varCount: number
  historyCount: number
  ui: Record<string, string>
}

export default function StatusBar({ varCount, historyCount, ui }: Props) {
  return (
    <div className={`flex flex-wrap items-center gap-2 px-3 py-2 border-t shrink-0 backdrop-blur-md ${ui.bg2} ${ui.border}`}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        MathOS v1.0
      </span>
      <span className={`text-xs ${ui.txt2} opacity-30`}>|</span>
      <span className="text-[11px] font-medium text-slate-400"><span className="text-slate-500 font-mono">{varCount}</span> vars</span>
      <span className={`text-xs ${ui.txt2} opacity-30`}>|</span>
      <span className="text-[11px] font-medium text-slate-400"><span className="text-slate-500 font-mono">{historyCount}</span> history</span>
      <span className="ml-auto hidden sm:inline text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        ↑↓ history • <kbd className={`font-mono px-1 rounded mx-1 ${ui.bg2} border ${ui.border}`}>Enter</kbd> to compute
      </span>
    </div>
  )
}
