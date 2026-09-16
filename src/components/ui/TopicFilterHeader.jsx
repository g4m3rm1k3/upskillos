import HomeTopicSearch from './HomeTopicSearch.jsx'
import { GLASS_META } from '../../styles/courseColors.js'
import { motion } from 'framer-motion'

export default function TopicFilterHeader({
  query, onQueryChange,
  topics, topicOrder, activeTopicId, activeSubtopicId,
  onSelectTopic, onSelectSubtopic,
  hasInProgress,
}) {
  const activeTopic = topics[activeTopicId]
  const activeMeta = activeTopic ? (GLASS_META[activeTopic.color] ?? GLASS_META.slate) : GLASS_META.slate

  return (
    <div className="w-[90vw] max-w-none mx-auto mb-6">
      <HomeTopicSearch onSearch={onQueryChange} />

      <div className="flex flex-wrap items-end gap-x-8 gap-y-2 border-b-[2px] border-slate-300/50 dark:border-slate-700/50 pb-2">
        {/* Only shown once the learner actually has something to resume —
            an empty "In Progress" pill would just be a dead click. */}
        {hasInProgress && (
          <button
            type="button"
            onClick={() => onSelectTopic('in-progress')}
            className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider pb-2 -mb-[10px] border-b-[3px] transition-all duration-300 relative ${
              activeTopicId === 'in-progress'
                ? 'border-transparent bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]'
                : 'border-transparent text-amber-600 dark:text-amber-400 opacity-[0.8] hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {activeTopicId === 'in-progress' && (
              <div className="absolute -bottom-[2.5px] left-0 right-0 h-[3px] rounded-full overflow-hidden shadow-[0_0_8px_rgba(245,158,11,0.6)]">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 opacity-80" />
                <motion.div 
                  className="absolute top-0 bottom-0 w-1.5 rounded-full -ml-[3px]"
                  style={{ 
                    backgroundColor: '#f59e0b',
                    boxShadow: '0 0 4px 1px #f59e0b, 0 0 10px 3px #f59e0b, 0 0 16px 5px #f59e0b' 
                  }}
                  animate={{ left: ["0%", "100%"] }}
                  transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
                />
              </div>
            )}
            <span className={`font-mono text-[15px] leading-none mb-[1px] ${activeTopicId === 'in-progress' ? 'text-transparent' : ''}`}>◐</span>
            In Progress
          </button>
        )}
        {topicOrder.map((id) => {
          const topic = topics[id]
          if (!topic) return null
          const meta = GLASS_META[topic.color] ?? GLASS_META.slate
          
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTopic(id)}
              className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider pb-2 -mb-[10px] border-b-[3px] transition-all duration-300 relative ${
                activeTopicId === id
                  ? `border-transparent bg-gradient-to-r ${meta.header} bg-clip-text text-transparent filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]`
                  : `border-transparent ${meta.text} opacity-[0.55] hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-700`
              }`}
            >
              {activeTopicId === id && (
                <div 
                  className="absolute -bottom-[2.5px] left-0 right-0 h-[3px] bg-slate-200/50 dark:bg-slate-700/50 rounded-full overflow-hidden" 
                  style={{ boxShadow: meta.glow.replace('32px', '8px').replace('0.50', '0.8') }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${meta.header} opacity-80`} />
                  <motion.div 
                    className="absolute top-0 bottom-0 w-1.5 rounded-full -ml-[3px]"
                    style={{ 
                      backgroundColor: 'currentColor',
                      boxShadow: '0 0 4px 1px currentColor, 0 0 10px 3px currentColor, 0 0 16px 5px currentColor' 
                    }}
                    animate={{ left: ["0%", "100%"] }}
                    transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
                  />
                </div>
              )}
              <span className={`font-mono text-[15px] leading-none mb-[1px] ${activeTopicId === id ? 'text-transparent' : ''}`}>{topic.icon}</span>
              {topic.label}
            </button>
          )
        })}
      </div>

      {activeTopic && (
        <div className="flex flex-wrap items-center gap-3 mt-4">
          {Object.entries(activeTopic.subtopics).map(([id, sub]) => {
            const subMeta = sub.color ? (GLASS_META[sub.color] ?? activeMeta) : activeMeta;
            const isActive = activeSubtopicId === id;
            
            return (
              <motion.button
                key={id}
                type="button"
                onClick={() => onSelectSubtopic(id)}
                className={`relative border px-4 py-1.5 text-xs font-bold transition-colors duration-300 backdrop-blur-md ${
                  isActive
                    ? `${subMeta.border.replace('/30', '')} bg-slate-100/20 dark:bg-[#080A11]/80 ${subMeta.text}`
                    : `border-slate-300/50 dark:border-slate-700/50 bg-slate-100/50 dark:bg-[#080A11]/50 ${subMeta.text} opacity-60 hover:opacity-100`
                }`}
                style={{
                  transformStyle: "preserve-3d", WebkitTransformStyle: "preserve-3d",
                  perspective: "1000px",
                  ...(isActive ? { boxShadow: subMeta.glow.replace('0.50', '0.4') } : {})
                }}
                initial={{ borderRadius: "9999px", scale: isActive ? 1.05 : 1 }}
                animate={{ scale: isActive ? 1.05 : 1 }}
                whileHover={{
                  borderRadius: "12px",
                  y: -5,
                  rotateX: 15,
                  rotateY: -15,
                  scale: 1.1,
                  boxShadow: "8px 8px 0px rgba(0,0,0,0.2), inset 2px 2px 10px rgba(255,255,255,0.2)",
                  transition: {
                    y: { duration: 1, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
                    default: { type: "spring", stiffness: 300, damping: 20 }
                  }
                }}
                whileTap={{
                  rotateY: 360,
                  rotateX: 180,
                  scale: 0.9,
                  borderRadius: "12px",
                  transition: { duration: 0.5, ease: "easeInOut" }
                }}
              >
                {isActive && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ filter: 'drop-shadow(0 0 2px currentColor) drop-shadow(0 0 6px currentColor) drop-shadow(0 0 12px currentColor)' }}>
                    <motion.rect
                      x="0" y="0" width="100%" height="100%"
                      rx="9999"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      pathLength={1}
                      strokeDasharray="0.01 0.99"
                      initial={{ strokeDashoffset: 0 }}
                      animate={{ strokeDashoffset: -1 }}
                      transition={{ duration: 4, ease: "linear", repeat: Infinity }}
                    />
                  </svg>
                )}
                <span className="relative z-10" style={{ display: 'block', transform: 'translateZ(10px)' }}>{sub.label}</span>
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}
