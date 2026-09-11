import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LABS } from '../../labs/labRegistryLoader.js'
import { GAMES } from '../../games/registry.js'
import { COURSES } from '../../courses/index.js'
import { getLabEntry } from '../../labs/labLoader.js'
import { getGameEntry } from '../../games/gameLoader.js'
import { useDesktop } from './DesktopProvider.jsx'
import { usePins } from '../../context/PinsContext.jsx'
import { usePinLauncher } from '../../hooks/usePinLauncher.js'
import { GLASS_META } from '../../styles/courseColors.js'
import { useGlobalTheme } from '../../context/ThemeContext.jsx'

const SECTIONS = [
  { id: 'all',         label: 'All' },
  { id: 'favourites',  label: '★ Favourites' },
  { id: 'courses',     label: 'Courses' },
  { id: 'lessons',     label: 'Lessons' },
  { id: 'labs',        label: 'Labs' },
  { id: 'builders',    label: 'Builders' },
  { id: 'visualizers', label: 'Visualizers' },
  { id: 'games',       label: 'Games' },
  { id: 'nav',         label: 'Navigate' },
]

// Fixed, predictable order for subject subheadings within the Labs tab.
const LAB_SUBJECTS = ['Math', 'Science', 'Engineering', 'CS Theory', 'Data Science', 'Web Dev', 'Creative']

const GRID_OVL = {
  backgroundImage: [
    'repeating-linear-gradient(rgba(255,255,255,0.15) 0 1px, transparent 1px 100%)',
    'repeating-linear-gradient(90deg, rgba(255,255,255,0.15) 0 1px, transparent 1px 100%)',
  ].join(','),
  backgroundSize: '22px 22px',
}

const DOTS_OVL = {
  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.25) 1.5px, transparent 1.5px)',
  backgroundSize: '13px 13px',
}

const STRIPES_OVL = {
  backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 2px, transparent 2px, transparent 6px)',
  backgroundSize: '10px 10px',
}

const GRID_TEXTURE = 'repeating-linear-gradient(0deg,transparent,transparent 11px,rgba(255,255,255,0.8) 11px,rgba(255,255,255,0.8) 12px),repeating-linear-gradient(90deg,transparent,transparent 11px,rgba(255,255,255,0.8) 11px,rgba(255,255,255,0.8) 12px)'

// Reference/lookup pages (reference, linear-algebra, la-explorer, eng-math,
// game-rules) open via the shared 'oc-open-reference' overlay (refKey) —
// same lookup-in-place pattern as the References button — instead of
// navigating away, since these are meant to be visited mid-lesson/mid-lab
// and dismissed back to exactly where the user was.
const NAV_LINKS = [
  { id: 'reference',      label: 'Reference Library',          emoji: '📐', refKey: 'reference', color: 'slate' },
  { id: 'linear-algebra', label: 'Linear Algebra',             emoji: '∑',  refKey: 'linear-algebra', color: 'cyan' },
  { id: 'la-explorer',    label: 'LA Concept Explorer',        emoji: '🔍', refKey: 'la-explorer', color: 'violet' },
  { id: 'latex-notes', label: 'LaTeX Field Notes', emoji: '✎', refKey: 'latex-notes', color: 'indigo' },
  { id: 'studio',         label: 'Studio / Docs',              emoji: '✏️', path: '/studio', color: 'fuchsia' },
  { id: 'code-typing',    label: 'Code Typing Studio',         emoji: '⌨️', path: '/lab/code-typing', color: 'indigo' },
  { id: 'health',         label: 'Health Tracker',             emoji: '❤️', path: '/health', color: 'rose' },
  { id: 'compass',        label: 'Compass',                    emoji: '🧭', path: '/compass', color: 'sky' },
  { id: 'eng-math',       label: 'Engineering Mathematics',    emoji: '∫',  refKey: 'eng-math', color: 'indigo' },
  { id: 'lesson-builder', label: 'Lesson Builder · Contribute',emoji: '🔨', path: '/lesson-builder', color: 'amber' },
  { id: 'about',          label: 'About',                      emoji: 'ℹ️', path: '/about', color: 'indigo' },
  { id: 'game-rules',     label: 'Game Reference',             emoji: '♠️', refKey: 'game-rules', color: 'violet' },
]

// Converts any item in the menu to a serialisable pin shape.
function toPin(item, type) {
  switch (type) {
    case 'course':
      return { id: item.key, label: item.label, emoji: item.icon, type: 'course', path: item.path, color: item.color }
    case 'lab':
      return { id: item.key, label: item.label, emoji: item.emoji, type: 'lab', path: item.path, labKey: item.key, event: item.event, color: item.color }
    case 'game':
      return { id: item.key, label: item.label, emoji: item.emoji, type: 'game', path: item.path, gameKey: item.key, event: item.event, color: item.color }
    case 'nav':
      return { id: item.id, label: item.label, emoji: item.emoji, type: 'nav', path: item.path, action: item.action, color: item.color }
    default:
      return null
  }
}

export default function StartMenu({ onClose }) {
  const { taskbarStyle } = useGlobalTheme()
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [contextMenu, setContextMenu] = useState(null) // { x, y, pin }
  const { openWindow } = useDesktop()
  const { pins, addPin, removePin, isPinned } = usePins()
  const { openPin } = usePinLauncher()
  const navigate = useNavigate()
  const menuRef = useRef(null)

  // Close on outside click or Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        if (contextMenu) setContextMenu(null)
        else onClose()
      }
    }
    const handleClick = (e) => {
      if (contextMenu) { setContextMenu(null); return }
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    window.addEventListener('keydown', handleKey)
    window.addEventListener('mousedown', handleClick)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('mousedown', handleClick)
    }
  }, [onClose, contextMenu])

  const showCtxMenu = useCallback((e, pin) => {
    e.preventDefault()
    e.stopPropagation()
    // Clamp so the menu doesn't overflow the viewport right/bottom edge
    const x = Math.min(e.clientX, window.innerWidth - 210)
    const y = Math.min(e.clientY, window.innerHeight - 80)
    setContextMenu({ x, y, pin })
  }, [])

  const togglePin = useCallback((pin) => {
    if (isPinned(pin.id)) removePin(pin.id)
    else addPin(pin)
    setContextMenu(null)
  }, [isPinned, removePin, addPin])

  // ---------- item launchers ----------
  const handleOpenLab = async (lab) => {
    onClose()
    if (lab.event) {
      window.dispatchEvent(new CustomEvent('oc-open-game', { detail: { game: lab.event } }))
      return
    }
    if (lab.path?.startsWith('/web-learn/') || lab.path?.startsWith('/learn/')) {
      navigate(lab.path); return
    }
    const entry = await getLabEntry(lab.key)
    if (entry?.component) {
      openWindow({ id: lab.key, label: lab.label, emoji: lab.emoji, Component: entry.component, backTo: '/' })
      return
    }
    if (lab.path) navigate(lab.path)
  }

  const handleOpenGame = async (game) => {
    onClose()
    const entry = await getGameEntry(game.key)
    if (entry?.component) {
      openWindow({ id: game.key, label: game.label, emoji: game.emoji, Component: entry.component, backTo: '/' })
    } else if (entry?.event) {
      window.dispatchEvent(new CustomEvent('oc-open-game', { detail: { game: entry.event } }))
    }
  }

  const handleNav = (link) => {
    onClose()
    if (link.refKey) window.dispatchEvent(new CustomEvent('oc-open-reference', { detail: { key: link.refKey } }))
    else navigate(link.path)
  }

  const handleOpenPin = async (pin) => {
    onClose()
    await openPin(pin)
  }

  // ---------- filters ----------
  const q = query.toLowerCase()
  const filteredCourses = COURSES.filter(c => !q || c.label.toLowerCase().includes(q))
  const filteredLabItems = LABS.filter(l => !q || l.label.toLowerCase().includes(q) || l.tags?.some(t => t.toLowerCase().includes(q)))
  const filteredLabs        = filteredLabItems.filter(l => l.kind === 'lab')
  const filteredLessons     = filteredLabItems.filter(l => l.kind === 'lesson')
  const filteredBuilders    = filteredLabItems.filter(l => l.kind === 'builder')
  const filteredVisualizers = filteredLabItems.filter(l => l.kind === 'visualizer')
  const filteredGames   = GAMES.filter(g   => !q || g.label.toLowerCase().includes(q) || g.tags?.some(t => t.toLowerCase().includes(q)))
  const filteredNav     = NAV_LINKS.filter(n => !q || n.label.toLowerCase().includes(q))
  const filteredPins    = pins.filter(p    => !q || p.label?.toLowerCase().includes(q))

  const showFavourites  = !q && (tab === 'all' || tab === 'favourites')
  const showCourses     = tab === 'all' || tab === 'courses'
  const showLabs        = tab === 'all' || tab === 'labs'
  const showLessons     = tab === 'all' || tab === 'lessons'
  const showBuilders    = tab === 'all' || tab === 'builders'
  const showVisualizers = tab === 'all' || tab === 'visualizers'
  const showGames       = tab === 'all' || tab === 'games'
  const showNav         = tab === 'all' || tab === 'nav'

  const sectionVariants = {
    hidden:  { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  }

  // Shared item button — used in every section. `children` (currently just
  // the Favourites section's "remove" control) is rendered as a sibling of
  // the button, not inside it — a <button> nested inside a <button> is
  // invalid HTML, and browsers respond by silently re-parenting the inner
  // one out of the outer one, which is exactly the validateDOMNesting
  // warning this used to throw. The wrapping div carries `relative group`
  // instead of the button, so both the button's own absolutely-positioned
  // decorations and a sibling `children` control still anchor and
  // group-hover correctly.
  const ItemBtn = ({ pin, onClick, children }) => {
    const meta = pin.color && GLASS_META[pin.color]

    return (
      <div className="relative group">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClick}
          onContextMenu={(e) => showCtxMenu(e, pin)}
          className={`relative flex flex-col items-start gap-2 p-3 rounded-2xl text-left transition-all w-full overflow-hidden bg-white/60 dark:bg-slate-800/40 hover:bg-white/90 dark:hover:bg-slate-700/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-[0_8px_16px_rgba(0,0,0,0.1)] ${meta ? 'border-b-2 ' + meta.border : ''}`}
        >
          {meta && (
            <>
              {/* Subtle color tint */}
              <div className={`absolute inset-0 opacity-[0.15] dark:opacity-[0.25] bg-gradient-to-br ${meta.header} mix-blend-multiply dark:mix-blend-screen pointer-events-none group-hover:opacity-[0.25] dark:group-hover:opacity-[0.35] transition-opacity duration-300`} />

              {/* Highlight glare */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent dark:from-white/10 opacity-50 pointer-events-none" />

              {/* Animated hover gradient */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-700 pointer-events-none" />

              {/* Large faded background icon */}
              <div className={`absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none select-none leading-none text-[80px] opacity-[0.06] dark:opacity-[0.12] -mr-4 drop-shadow-sm`}>
                {pin.emoji}
              </div>
            </>
          )}
          {isPinned(pin.id) && (
            <span className="absolute top-1.5 right-1.5 text-[10px] leading-none opacity-80 select-none z-10 drop-shadow-sm">⭐</span>
          )}
          <span className="text-2xl flex-shrink-0 relative z-10 drop-shadow-sm transition-transform duration-300 group-hover:scale-110">{pin.emoji}</span>
          <span className={`text-sm font-bold line-clamp-2 relative z-10 pr-2 tracking-tight ${
            meta ? meta.text : 'text-slate-700 dark:text-slate-100'
          }`}>
            {pin.label}
          </span>
        </motion.button>
        {children}
      </div>
    )
  }

  // win10 flies out from the corner above the (left-aligned) Start button.
  // win11 centers above the taskbar to match its centered Start button.
  // mac has no taskbar-anchored menu at all — Launchpad-style, it opens as
  // a floating window centered on the whole screen.
  const wrapperPosition =
    taskbarStyle === 'mac' ? 'inset-0 items-center justify-center'
    : taskbarStyle === 'win11' ? 'bottom-14 left-0 right-0 justify-center'
    : 'bottom-14 left-3'

  return (
    <>
      <div className={`fixed z-[1900] flex pointer-events-none ${wrapperPosition}`}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        ref={menuRef}
        className="pointer-events-auto w-[620px] max-h-[75vh] flex flex-col rounded-[28px] overflow-hidden shadow-[0_20px_80px_-10px_rgba(0,0,0,0.3)] border border-white/60 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-[48px] saturate-[180%] ring-1 ring-white/50 dark:ring-white/5 text-slate-800 dark:text-slate-100"
      >
        {/* Ambient background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[28px]">
          <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-brand-400/15 dark:bg-brand-500/15 rounded-full blur-[80px] mix-blend-multiply dark:mix-blend-screen" />
          <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-sky-400/15 dark:bg-sky-500/15 rounded-full blur-[80px] mix-blend-multiply dark:mix-blend-screen" />
        </div>

        {/* Search */}
        <div className="relative z-10 flex-shrink-0 p-4 border-b border-black/[0.05] dark:border-white/[0.05]">
          <div className="relative">
            <input
              autoFocus
              type="text"
              placeholder="Search labs, games, tools…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-sm rounded-2xl bg-white/40 dark:bg-white/10 border border-white/40 dark:border-white/5 focus:bg-white/80 dark:focus:bg-white/20 focus:border-brand-500/50 outline-none placeholder-slate-400 dark:placeholder-slate-300 text-slate-800 dark:text-white transition-all shadow-sm focus:shadow-md backdrop-blur-md"
            />
            <svg className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Tabs */}
        {!query && (
          <div className="relative z-10 flex-shrink-0 flex gap-2 px-4 pt-3 pb-2 border-b border-black/[0.05] dark:border-white/[0.05] overflow-x-auto scrollbar-none">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setTab(s.id)}
                className={`relative flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  tab === s.id
                    ? s.id === 'favourites'
                      ? 'text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30'
                      : 'text-brand-700 dark:text-brand-200 bg-brand-50 dark:bg-brand-900/30'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab === s.id && (
                  <motion.div
                    layoutId="startMenuTab"
                    className={`absolute inset-0 rounded-full z-0 ${s.id === 'favourites' ? 'bg-amber-100 dark:bg-amber-800/40' : 'bg-brand-100 dark:bg-brand-800/40'}`}
                  />
                )}
                <span className="relative z-10">{s.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-y-auto overscroll-contain p-4 space-y-6">
          <AnimatePresence mode="popLayout">

            {/* ---- Favourites ---- */}
            {showFavourites && filteredPins.length > 0 && (
              <motion.section key="fav-section" variants={sectionVariants} initial="hidden" animate="visible" exit="hidden" layout>
                <div className="flex items-center justify-between mb-3 px-2">
                  <h3 className="text-[11px] font-black text-amber-600 dark:text-amber-300 uppercase tracking-widest">
                    ★ Favourites
                  </h3>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">Right-click any item to pin / unpin</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {filteredPins.map(pin => (
                    <ItemBtn key={pin.id} pin={pin} onClick={() => handleOpenPin(pin)}>
                      <button
                        title="Remove from Favourites"
                        onClick={(e) => { e.stopPropagation(); removePin(pin.id) }}
                        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 hover:!opacity-100 text-white/50 hover:text-white transition-all text-xs leading-none w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/20 z-20"
                      >
                        ✕
                      </button>
                    </ItemBtn>
                  ))}
                </div>
              </motion.section>
            )}

            {showFavourites && filteredPins.length === 0 && tab === 'favourites' && (
              <motion.div key="fav-empty" variants={sectionVariants} initial="hidden" animate="visible" exit="hidden"
                className="flex flex-col items-center justify-center py-12 opacity-50"
              >
                <span className="text-4xl mb-3">⭐</span>
                <p className="text-center text-sm font-medium">No favourites yet</p>
                <p className="text-center text-xs text-slate-400 mt-1">Right-click any course, lab, game, or tool to pin it here</p>
              </motion.div>
            )}

            {/* ---- Courses ---- */}
            {showCourses && filteredCourses.length > 0 && (
              <motion.section key="courses-section" variants={sectionVariants} initial="hidden" animate="visible" exit="hidden" layout>
                <h3 className="text-[11px] font-black text-slate-600 dark:text-slate-200 uppercase tracking-widest mb-3 px-2">Courses</h3>
                <div className="grid grid-cols-3 gap-2">
                  {filteredCourses.map(course => {
                    const pin = toPin(course, 'course')
                    return (
                      <ItemBtn key={course.key} pin={pin} onClick={() => { onClose(); navigate(course.path) }} />
                    )
                  })}
                </div>
              </motion.section>
            )}

            {/* ---- Lessons ---- */}
            {showLessons && filteredLessons.length > 0 && (
              <motion.section key="lessons-section" variants={sectionVariants} initial="hidden" animate="visible" exit="hidden" layout>
                <h3 className="text-[11px] font-black text-slate-600 dark:text-slate-200 uppercase tracking-widest mb-3 px-2">Lessons</h3>
                <div className="grid grid-cols-3 gap-2">
                  {filteredLessons.map(lab => {
                    const pin = toPin(lab, 'lab')
                    return (
                      <ItemBtn key={lab.key} pin={pin} onClick={() => handleOpenLab(lab)} />
                    )
                  })}
                </div>
              </motion.section>
            )}

            {/* ---- Labs ---- */}
            {showLabs && filteredLabs.length > 0 && (
              <motion.section key="labs-section" variants={sectionVariants} initial="hidden" animate="visible" exit="hidden" layout>
                <h3 className="text-[11px] font-black text-slate-600 dark:text-slate-200 uppercase tracking-widest mb-3 px-2">Labs</h3>
                {LAB_SUBJECTS.map(subject => {
                  const items = filteredLabs.filter(l => l.subject === subject)
                  if (items.length === 0) return null
                  return (
                    <div key={subject} className="mb-4 last:mb-0">
                      <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-2">{subject}</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {items.map(lab => {
                          const pin = toPin(lab, 'lab')
                          return (
                            <ItemBtn key={lab.key} pin={pin} onClick={() => handleOpenLab(lab)} />
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </motion.section>
            )}

            {/* ---- Builders ---- */}
            {showBuilders && filteredBuilders.length > 0 && (
              <motion.section key="builders-section" variants={sectionVariants} initial="hidden" animate="visible" exit="hidden" layout>
                <h3 className="text-[11px] font-black text-slate-600 dark:text-slate-200 uppercase tracking-widest mb-3 px-2">Builders</h3>
                <div className="grid grid-cols-3 gap-2">
                  {filteredBuilders.map(lab => {
                    const pin = toPin(lab, 'lab')
                    return (
                      <ItemBtn key={lab.key} pin={pin} onClick={() => handleOpenLab(lab)} />
                    )
                  })}
                </div>
              </motion.section>
            )}

            {/* ---- Visualizers ---- */}
            {showVisualizers && filteredVisualizers.length > 0 && (
              <motion.section key="visualizers-section" variants={sectionVariants} initial="hidden" animate="visible" exit="hidden" layout>
                <h3 className="text-[11px] font-black text-slate-600 dark:text-slate-200 uppercase tracking-widest mb-3 px-2">Visualizers</h3>
                <div className="grid grid-cols-3 gap-2">
                  {filteredVisualizers.map(lab => {
                    const pin = toPin(lab, 'lab')
                    return (
                      <ItemBtn key={lab.key} pin={pin} onClick={() => handleOpenLab(lab)} />
                    )
                  })}
                </div>
              </motion.section>
            )}

            {/* ---- Games ---- */}
            {showGames && filteredGames.length > 0 && (
              <motion.section key="games-section" variants={sectionVariants} initial="hidden" animate="visible" exit="hidden" layout>
                <h3 className="text-[11px] font-black text-slate-600 dark:text-slate-200 uppercase tracking-widest mb-3 px-2">Games</h3>
                <div className="grid grid-cols-3 gap-2">
                  {filteredGames.map(game => {
                    const pin = toPin(game, 'game')
                    return (
                      <ItemBtn key={game.key} pin={pin} onClick={() => handleOpenGame(game)} />
                    )
                  })}
                </div>
              </motion.section>
            )}

            {/* ---- Navigate ---- */}
            {showNav && filteredNav.length > 0 && (
              <motion.section key="nav-section" variants={sectionVariants} initial="hidden" animate="visible" exit="hidden" layout>
                <h3 className="text-[11px] font-black text-slate-600 dark:text-slate-200 uppercase tracking-widest mb-3 px-2">Navigate</h3>
                <div className="grid grid-cols-3 gap-2">
                  {filteredNav.map(link => {
                    const pin = toPin(link, 'nav')
                    return (
                      <ItemBtn key={link.id} pin={pin} onClick={() => handleNav(link)} />
                    )
                  })}
                </div>
              </motion.section>
            )}

          </AnimatePresence>

          {query && filteredCourses.length === 0 && filteredLabs.length === 0 && filteredLessons.length === 0 && filteredBuilders.length === 0 && filteredVisualizers.length === 0 && filteredGames.length === 0 && filteredNav.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 opacity-50">
              <span className="text-4xl mb-3">🔍</span>
              <p className="text-center text-sm font-medium">No results for "{query}"</p>
            </div>
          )}
        </div>
      </motion.div>
      </div>

      {/* Right-click context menu */}
      <AnimatePresence>
        {contextMenu && (
          <>
            {/* Invisible backdrop to capture clicks outside */}
            <div className="fixed inset-0 z-[1950]" onClick={() => setContextMenu(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="fixed z-[1960] bg-white dark:bg-slate-800 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-slate-200/80 dark:border-slate-700/80 py-1 min-w-[200px] overflow-hidden"
              style={{ top: contextMenu.y, left: contextMenu.x }}
            >
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700/50 flex items-center gap-2">
                <span className="text-base leading-none">{contextMenu.pin.emoji}</span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">{contextMenu.pin.label}</span>
              </div>
              <button
                className="w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                onClick={() => togglePin(contextMenu.pin)}
              >
                {isPinned(contextMenu.pin.id)
                  ? <><span className="text-base">✕</span><span className="text-slate-600 dark:text-slate-300">Remove from Favourites</span></>
                  : <><span className="text-base">⭐</span><span className="text-slate-600 dark:text-slate-300">Add to Favourites</span></>
                }
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
