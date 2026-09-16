import { lazy, Suspense, useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import StartMenu from './StartMenu.jsx'
import ChapterNavigator from './ChapterNavigator.jsx'
import NotesListWindow from '../ui/NotesListWindow.jsx'
import { useDesktop } from './DesktopProvider.jsx'
import { useChat } from '../../hooks/useChat.js'
import { useMontyContext } from '../../features/compass/MontyContext.tsx'
import { useProgress } from '../../hooks/useProgress.js'
import { computeXp, xpToLevel } from '../../features/compass/montyStatus.ts'
import { getLabEntry } from '../../labs/labLoader.js'
import { useGlobalTheme } from '../../context/ThemeContext.jsx'

// `route` navigates the browser there — correct for RPG Workout and Brain
// Training, which are tall, scrollable content pages meant to be their own
// full page (FloatingWindow's content area uses `overflow-hidden` with no
// scroll, which clips anything taller than the window). `loader` instead
// opens the app as a floating window directly, with NO navigation at all —
// the current page (a lesson, a course, wherever the user actually is)
// stays exactly as it is underneath. Canvas Notes needs `loader`, not
// `route`: navigating to `/lab/canvas-notes` would render EntryShell, which
// opens the window but then also replaces the URL with `backTo` ("/labs")
// — stranding the user on the Labs gallery instead of back on their course
// the moment they close the window.
const PINNED_APPS = [
  { id: 'rpg-workout', label: 'RPG Workout', emoji: '⚔️', route: '/rpg-workout' },
  { id: 'brain', label: 'Brain Training', emoji: '🧠', route: '/brain' },
  { id: 'canvas-notes', label: 'Canvas Notes', emoji: '🗒️', loader: () => getLabEntry('canvas-notes').then((e) => e.component) },
  { id: 'resource-lab', label: 'Resource Lab', emoji: '📚', loader: () => getLabEntry('resource-lab').then((e) => e.component) },
]
import { LayoutGrid, Command, BookOpen, MessageSquare, StickyNote, GraduationCap, Zap, Lightbulb, Dumbbell } from 'lucide-react'

// Lazy-loaded: each pulls in its own markdown library (concepts/practice
// content + parsing) as a separate chunk, so the always-mounted desktop
// shell doesn't ship or eagerly parse that content until actually opened.
const ConceptExplorerModal = lazy(() => import('../../concepts/ConceptExplorerModal.tsx'))
const PracticeExplorerModal = lazy(() => import('../../practice/PracticeExplorerModal.tsx'))

const BadgeCube = ({ content, colorClass }) => (
  <div className="absolute -bottom-1 -right-1 w-5 h-5 pointer-events-none drop-shadow-md" style={{ transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d', transform: 'translateZ(10px)' }}>
    <div className={`absolute inset-0 flex items-center justify-center rounded-md overflow-hidden ${colorClass} text-[10px] font-black text-white`} style={{ transform: 'translateZ(10px)' }}>
      {content}
      <div className="absolute inset-0 shadow-[inset_0_0_6px_rgba(0,0,0,0.2)] pointer-events-none" />
    </div>
    <div className={`absolute inset-0 rounded-md overflow-hidden ${colorClass}`} style={{ transform: 'rotateY(180deg) translateZ(10px)' }}>
      <div className="absolute inset-0 shadow-[inset_0_0_8px_rgba(0,0,0,0.6)] pointer-events-none" />
    </div>
    <div className={`absolute inset-0 rounded-md overflow-hidden ${colorClass}`} style={{ transform: 'rotateY(90deg) translateZ(10px)' }}>
      <div className="absolute inset-0 shadow-[inset_0_0_8px_rgba(0,0,0,0.4)] pointer-events-none" />
    </div>
    <div className={`absolute inset-0 rounded-md overflow-hidden ${colorClass}`} style={{ transform: 'rotateY(-90deg) translateZ(10px)' }}>
      <div className="absolute inset-0 shadow-[inset_0_0_8px_rgba(0,0,0,0.7)] pointer-events-none" />
    </div>
    <div className={`absolute inset-0 rounded-md overflow-hidden ${colorClass}`} style={{ transform: 'rotateX(90deg) translateZ(10px)' }}>
      <div className="absolute inset-0 shadow-[inset_0_0_8px_rgba(255,255,255,0.3)] pointer-events-none" />
    </div>
    <div className={`absolute inset-0 rounded-md overflow-hidden ${colorClass}`} style={{ transform: 'rotateX(-90deg) translateZ(10px)' }}>
      <div className="absolute inset-0 shadow-[inset_0_0_8px_rgba(0,0,0,0.9)] pointer-events-none" />
    </div>
  </div>
);

const MacCube = ({ children, sideContent, isMac, frontClass, badgeContent, badgeColor, animationType = 'flat' }) => {
  if (!isMac) return children;
  
  const baseClass = frontClass || 'bg-slate-800';
  const sides = sideContent || children;

  const hoverVariant = animationType === 'dice' 
    ? { rotateY: 705, rotateX: 705, rotateZ: 0, transition: { type: 'spring', stiffness: 40, damping: 12 } }
    : { rotateY: 345, rotateX: -15, rotateZ: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } };

  const mainElement = animationType === 'flat' ? (
    <div className={`absolute inset-0 flex items-center justify-center rounded-[12px] ${baseClass}`}>
      {children}
      {badgeContent && (
        <div className={`absolute -bottom-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black text-white shadow-md ${badgeColor || 'bg-red-500'}`}>
          {badgeContent}
        </div>
      )}
    </div>
  ) : (
    <motion.div
      className="w-full h-full relative origin-center"
      style={{ transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d' }}
      variants={{
        idle: { rotateY: -15, rotateX: -15, rotateZ: 0 },
        hover: hoverVariant
      }}
    >
      {/* Front */}
      <div className={`absolute inset-0 flex items-center justify-center rounded-[8px] overflow-hidden ${baseClass}`} style={{ transform: 'translateZ(22px)' }}>
        {children}
        <div className="absolute inset-0 rounded-[8px] shadow-[inset_0_0_15px_rgba(0,0,0,0.2)] pointer-events-none" />
      </div>
      {/* Back */}
      <div className={`absolute inset-0 flex items-center justify-center rounded-[8px] overflow-hidden ${baseClass}`} style={{ transform: 'rotateY(180deg) translateZ(22px)' }}>
        {sides}
        <div className="absolute inset-0 rounded-[8px] shadow-[inset_0_0_20px_rgba(0,0,0,0.6)] pointer-events-none" />
      </div>
      {/* Right */}
      <div className={`absolute inset-0 flex items-center justify-center rounded-[8px] overflow-hidden ${baseClass}`} style={{ transform: 'rotateY(90deg) translateZ(22px)' }}>
        {sides}
        <div className="absolute inset-0 rounded-[8px] shadow-[inset_0_0_20px_rgba(0,0,0,0.4)] pointer-events-none" />
      </div>
      {/* Left */}
      <div className={`absolute inset-0 flex items-center justify-center rounded-[8px] overflow-hidden ${baseClass}`} style={{ transform: 'rotateY(-90deg) translateZ(22px)' }}>
        {sides}
        <div className="absolute inset-0 rounded-[8px] shadow-[inset_0_0_20px_rgba(0,0,0,0.7)] pointer-events-none" />
      </div>
      {/* Top */}
      <div className={`absolute inset-0 flex items-center justify-center rounded-[8px] overflow-hidden ${baseClass}`} style={{ transform: 'rotateX(90deg) translateZ(22px)' }}>
         {sides}
         <div className="absolute inset-0 rounded-[8px] shadow-[inset_0_0_20px_rgba(255,255,255,0.3)] pointer-events-none" />
      </div>
      {/* Bottom (with drop shadow) */}
      <div className={`absolute inset-0 flex items-center justify-center rounded-[8px] overflow-hidden ${baseClass}`} style={{ transform: 'rotateX(-90deg) translateZ(22px)' }}>
         {sides}
         <div className="absolute inset-0 rounded-[8px] shadow-[inset_0_0_30px_rgba(0,0,0,0.9)] pointer-events-none" />
         <div className="absolute inset-0 rounded-[8px] shadow-[0_20px_25px_rgba(0,0,0,0.8)] pointer-events-none" />
      </div>
      
      {badgeContent && (
        <BadgeCube content={badgeContent} colorClass={badgeColor || 'bg-red-500'} />
      )}
    </motion.div>
  );

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ perspective: '800px' }}>
      {/* Real object */}
      <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d' }}>
        {mainElement}
      </div>
      
      {/* Parallax Floor Glow */}
      <motion.div 
        className="absolute top-full left-0 right-0 h-full pointer-events-none z-[-1]"
        variants={{ idle: { y: 0, scale: 1 }, hover: { y: 2, scale: 0.95 } }}
      >
        <div className="absolute -top-1 left-[15%] right-[15%] h-3 bg-black/40 blur-md rounded-full transition-all duration-300 group-hover:bg-black/50 group-hover:blur-lg" />
        <div className="absolute -top-2 left-[5%] right-[5%] h-4 bg-cyan-400/0 blur-md rounded-full transition-all duration-300 group-hover:bg-cyan-400/40 group-hover:blur-xl" />
      </motion.div>

      {/* True 3D Reflection */}
      <motion.div 
        className="absolute top-full left-0 right-0 h-full pointer-events-none opacity-40 transition-opacity duration-300 group-hover:opacity-70"
        style={{ 
          maskImage: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)'
        }}
        variants={{
          idle: { y: 0, scaleY: -1 },
          hover: { y: 12, scaleY: -1 } // Counteracts parent y:-10 to pin reflection to the floor
        }}
      >
        <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d' }}>
          {mainElement}
        </div>
      </motion.div>
    </div>
  );
};

export default function Taskbar({ windows, onFocus }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [chapNavOpen, setChapNavOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [conceptExplorerOpen, setConceptExplorerOpen] = useState(false)
  const [practiceOpen, setPracticeOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { openWindow } = useDesktop()
  const monty = useMontyContext()
  const { progress } = useProgress()
  const { level, xpInLevel } = xpToLevel(computeXp(progress))
  const { unreadCount, chatOpen } = useChat()


  const { taskbarStyle, macAnimation } = useGlobalTheme()

  const isLessonRoute = /^\/chapter\/[^/]+\/.+/.test(location.pathname)

  const toggleChat = () => window.dispatchEvent(new CustomEvent('oc-toggle-chat'))
  const toggleTutor = () => window.dispatchEvent(new CustomEvent('oc-toggle-tutor'))

  // Allow the intro tour (TourContext) to open the Start Menu programmatically
  // when the tour step describing it fires onAction.
  useEffect(() => {
    const handler = () => setMenuOpen(true)
    window.addEventListener('oc-open-start-menu', handler)
    return () => window.removeEventListener('oc-open-start-menu', handler)
  }, [])

  const openPinnedApp = async (app) => {
    if (app.route) { navigate(app.route); return }
    const Component = await app.loader()
    openWindow({ id: app.id, label: app.label, emoji: app.emoji, Component, backTo: '/' })
  }

  const macHoverProps = taskbarStyle === 'mac' ? {
    whileHover: "hover",
    initial: "idle",
    variants: {
      idle: { scale: 1, y: 0, filter: 'drop-shadow(0 0px 0px rgba(0,0,0,0))' },
      hover: { 
        scale: 1.4, 
        y: -10, 
        originY: 1, 
        filter: 'drop-shadow(0 20px 10px rgba(0,0,0,0.4))'
      }
    },
    transition: { type: 'spring', stiffness: 400, damping: 20 }
  } : {}

  const utilitiesFragment = (
    <div className={`flex items-center gap-1 flex-shrink-0 pointer-events-auto`}>
      {isLessonRoute && (
        <motion.button
          whileHover={taskbarStyle === 'mac' ? macHoverProps.whileHover : { scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          transition={macHoverProps.transition}
          initial={taskbarStyle === 'mac' ? macHoverProps.initial : undefined}
          variants={taskbarStyle === 'mac' ? macHoverProps.variants : undefined}
          onClick={() => setChapNavOpen(o => !o)}
          title="Chapter navigator"
          className={`relative flex items-center justify-center transition-all focus:outline-none group z-10 hover:z-50 ${
            taskbarStyle === 'mac' ? 'w-11 h-11' : 'w-9 h-9 rounded-xl'
          } ${
            taskbarStyle !== 'mac' && (chapNavOpen ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800')
          }`}
        >
          <MacCube isMac={taskbarStyle === 'mac'} animationType={macAnimation} frontClass={chapNavOpen ? 'bg-indigo-500' : 'bg-slate-800'}>
            <BookOpen className={`${taskbarStyle === 'mac' ? 'w-6 h-6 text-indigo-400' : 'w-5 h-5'} relative z-10`} />
          </MacCube>
        </motion.button>
      )}

      <motion.button
        whileHover={taskbarStyle === 'mac' ? macHoverProps.whileHover : { scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={macHoverProps.transition}
        initial={taskbarStyle === 'mac' ? macHoverProps.initial : undefined}
        variants={taskbarStyle === 'mac' ? macHoverProps.variants : undefined}
        onMouseEnter={() => import('../../concepts/ConceptExplorerModal.tsx')}
        onClick={() => setConceptExplorerOpen(o => !o)}
        title="Concept Explorer"
        className={`relative flex items-center justify-center transition-all focus:outline-none group z-10 hover:z-50 ${
          taskbarStyle === 'mac' ? 'w-11 h-11' : 'w-9 h-9 rounded-xl'
        } ${
          taskbarStyle !== 'mac' && (conceptExplorerOpen 
            ? 'bg-amber-500 text-white shadow-md' 
            : 'text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800')
        }`}
      >
        <MacCube isMac={taskbarStyle === 'mac'} animationType={macAnimation} frontClass={conceptExplorerOpen ? 'bg-gradient-to-br from-amber-300 to-orange-500 text-white' : 'bg-gradient-to-br from-amber-400 to-orange-600 text-white'}>
          <Lightbulb className={`${taskbarStyle === 'mac' ? 'w-6 h-6 text-white' : 'w-5 h-5'} relative z-10 drop-shadow-md`} />
        </MacCube>
        {taskbarStyle !== 'mac' && <Lightbulb className="w-5 h-5 relative z-10" />}
      </motion.button>

      <motion.button
        whileHover={taskbarStyle === 'mac' ? macHoverProps.whileHover : { scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={macHoverProps.transition}
        initial={taskbarStyle === 'mac' ? macHoverProps.initial : undefined}
        variants={taskbarStyle === 'mac' ? macHoverProps.variants : undefined}
        onMouseEnter={() => import('../../practice/PracticeExplorerModal.tsx')}
        onClick={() => setPracticeOpen(o => !o)}
        title="Practice"
        className={`relative flex items-center justify-center transition-all focus:outline-none group z-10 hover:z-50 ${
          taskbarStyle === 'mac' ? 'w-11 h-11' : 'w-9 h-9 rounded-xl'
        } ${
          taskbarStyle !== 'mac' && (practiceOpen
            ? 'bg-emerald-500 text-white shadow-md'
            : 'text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800')
        }`}
      >
        <MacCube isMac={taskbarStyle === 'mac'} animationType={macAnimation} frontClass={practiceOpen ? 'bg-gradient-to-br from-emerald-300 to-teal-500 text-white' : 'bg-gradient-to-br from-emerald-400 to-teal-600 text-white'}>
          <Dumbbell className={`${taskbarStyle === 'mac' ? 'w-6 h-6 text-white' : 'w-5 h-5'} relative z-10 drop-shadow-md`} />
        </MacCube>
      </motion.button>

      <motion.button
        whileHover={taskbarStyle === 'mac' ? macHoverProps.whileHover : { scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={macHoverProps.transition}
        initial={taskbarStyle === 'mac' ? macHoverProps.initial : undefined}
        variants={taskbarStyle === 'mac' ? macHoverProps.variants : undefined}
        onClick={() => { setNotesOpen(o => !o); setChapNavOpen(false) }}
        title="Notes"
        className={`relative flex items-center justify-center transition-all focus:outline-none group z-10 hover:z-50 ${
          taskbarStyle === 'mac' ? 'w-11 h-11' : 'w-9 h-9 rounded-xl'
        } ${
          taskbarStyle !== 'mac' && (notesOpen
            ? 'bg-yellow-500 text-white shadow-md'
            : 'text-yellow-600 hover:bg-slate-100 dark:hover:bg-slate-800')
        }`}
      >
        <MacCube isMac={taskbarStyle === 'mac'} animationType={macAnimation} frontClass={notesOpen ? 'bg-gradient-to-br from-yellow-300 to-amber-500 text-white' : 'bg-gradient-to-br from-yellow-400 to-amber-600 text-white'}>
          <StickyNote className={`${taskbarStyle === 'mac' ? 'w-6 h-6 text-white' : 'w-5 h-5'} relative z-10 drop-shadow-md`} />
        </MacCube>
      </motion.button>

      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700/50 mx-1 flex-shrink-0 rounded-full" />

      {/* Monty — opens the chat/goal panel; also the only way in to Compass now. */}
      <motion.button
        whileHover={taskbarStyle === 'mac' ? macHoverProps.whileHover : { scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        transition={macHoverProps.transition}
        initial={taskbarStyle === 'mac' ? macHoverProps.initial : undefined}
        variants={taskbarStyle === 'mac' ? macHoverProps.variants : undefined}
        onClick={monty.openMonty}
        title={`Monty — Lv ${level}, ${xpInLevel}/100 XP`}
        className={`relative flex items-center justify-center transition-all duration-300 focus:outline-none group z-10 hover:z-50 ${
          taskbarStyle === 'mac' ? 'w-12 h-12' : 'w-10 h-10 rounded-2xl'
        } ${
          taskbarStyle !== 'mac' && (monty.montyOpen
            ? 'bg-cyan-500 text-white shadow-md'
            : 'bg-slate-100 dark:bg-slate-800/80 text-cyan-500 hover:bg-slate-200 dark:hover:bg-slate-700')
        }`}
      >
        <MacCube 
          isMac={taskbarStyle === 'mac'} 
          animationType={macAnimation}
          frontClass={monty.montyOpen ? 'bg-gradient-to-br from-cyan-400 to-indigo-600 text-white' : 'bg-gradient-to-br from-slate-700 to-slate-900 text-cyan-400'}
          badgeContent={level}
          badgeColor="bg-gradient-to-br from-cyan-500 to-blue-600"
          sideContent={<Zap className={`${taskbarStyle === 'mac' ? 'w-6 h-6 text-white' : 'w-5 h-5'} relative z-10 drop-shadow-md`} fill={monty.montyOpen ? 'currentColor' : 'none'} />}
        >
          <div className={`absolute inset-0 ${taskbarStyle === 'mac' ? '' : 'rounded-2xl'} overflow-hidden pointer-events-none`}>
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 40 40">
              <defs>
                <linearGradient id="cyanGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
              <circle cx="20" cy="20" r="17.5" fill="none" stroke="currentColor" strokeOpacity={monty.montyOpen ? "0.2" : "0.1"} strokeWidth="2.5" />
              <circle
                cx="20" cy="20" r="17.5" fill="none" stroke="url(#cyanGlow)" strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={`${(xpInLevel / 100) * (2 * Math.PI * 17.5)} ${2 * Math.PI * 17.5}`}
                style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
            </svg>
          </div>
          <Zap className={`${taskbarStyle === 'mac' ? 'w-6 h-6 text-white' : 'w-5 h-5'} relative z-10 drop-shadow-md`} fill={monty.montyOpen ? 'currentColor' : 'none'} />
        </MacCube>
      </motion.button>

      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700/50 mx-1 flex-shrink-0 rounded-full" />

      <motion.button
        data-tour="stem-tutor"
        whileHover={taskbarStyle === 'mac' ? macHoverProps.whileHover : { scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={macHoverProps.transition}
        initial={taskbarStyle === 'mac' ? macHoverProps.initial : undefined}
        variants={taskbarStyle === 'mac' ? macHoverProps.variants : undefined}
        onMouseEnter={() => import('../tutor/TutorPanel.jsx')}
        onClick={toggleTutor}
        title="Delta — your STEM tutor"
        className={`relative flex items-center justify-center transition-all focus:outline-none group z-10 hover:z-50 ${
          taskbarStyle === 'mac' ? 'w-11 h-11' : 'w-9 h-9 rounded-xl'
        } ${
          taskbarStyle !== 'mac' && 'text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <MacCube isMac={taskbarStyle === 'mac'} animationType={macAnimation} frontClass="bg-gradient-to-br from-sky-400 to-blue-600 text-white">
          <GraduationCap className={`${taskbarStyle === 'mac' ? 'w-6 h-6 text-white' : 'w-5 h-5'} relative z-10 drop-shadow-md`} />
        </MacCube>
      </motion.button>

      <motion.button
        whileHover={taskbarStyle === 'mac' ? macHoverProps.whileHover : { scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={macHoverProps.transition}
        initial={taskbarStyle === 'mac' ? macHoverProps.initial : undefined}
        variants={taskbarStyle === 'mac' ? macHoverProps.variants : undefined}
        onMouseEnter={() => import('../tutor/ChatPanel.jsx')}
        onClick={toggleChat}
        title="Study Chat"
        className={`relative flex items-center justify-center transition-all focus:outline-none group z-10 hover:z-50 ${
          taskbarStyle === 'mac' ? 'w-11 h-11' : 'w-9 h-9 rounded-xl'
        } ${
          taskbarStyle !== 'mac' && (chatOpen
            ? 'bg-indigo-500 text-white shadow-md'
            : 'text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800')
        }`}
      >
        <MacCube 
          isMac={taskbarStyle === 'mac'} 
          animationType={macAnimation}
          frontClass={chatOpen ? 'bg-gradient-to-br from-fuchsia-400 to-purple-600 text-white' : 'bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white'}
          badgeContent={unreadCount > 0 && !chatOpen ? (unreadCount > 99 ? '99+' : unreadCount) : null}
          badgeColor="bg-red-500"
        >
          <MessageSquare className={`${taskbarStyle === 'mac' ? 'w-5 h-5 text-white' : 'w-4 h-4'} relative z-10 drop-shadow-md`} />
        </MacCube>
      </motion.button>
    </div>
  )

  return (
    <>
      {menuOpen && <StartMenu onClose={() => setMenuOpen(false)} />}
      {chapNavOpen && <ChapterNavigator onClose={() => setChapNavOpen(false)} />}
      {notesOpen && <NotesListWindow onClose={() => setNotesOpen(false)} />}
      <AnimatePresence>
        {conceptExplorerOpen && (
          <Suspense fallback={null}>
            <ConceptExplorerModal onClose={() => setConceptExplorerOpen(false)} />
          </Suspense>
        )}
        {practiceOpen && (
          <Suspense fallback={null}>
            <PracticeExplorerModal onClose={() => setPracticeOpen(false)} />
          </Suspense>
        )}
      </AnimatePresence>

      <div className={`hidden lg:flex fixed left-0 right-0 z-[1600] px-3 transition-all duration-300 ${
        taskbarStyle === 'mac' 
          ? 'bottom-2 h-14 items-end pointer-events-none justify-center' 
          : 'bottom-0 h-12 items-center bg-white/70 dark:bg-slate-950/70 backdrop-blur-3xl border-t border-slate-200/50 dark:border-slate-800/50 shadow-[0_-4px_30px_rgba(0,0,0,0.03)]'
      }`}>

        {taskbarStyle === 'win11' && <div className="flex-1 pointer-events-none" />}

        <div className={`flex items-center pointer-events-auto relative ${
          taskbarStyle === 'mac'
            ? 'gap-3 px-4 py-2'
            : 'gap-2'
        }`}>
          {taskbarStyle === 'mac' && (
            <div 
              className="absolute bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 rounded-2xl shadow-2xl pointer-events-none"
              style={{ 
                top: '-4px', bottom: '-8px', left: '-20px', right: '-20px',
                transform: 'perspective(400px) rotateX(45deg)', 
                transformOrigin: 'bottom' 
              }}
            />
          )}
          <motion.button
            data-tour="start-menu"
            whileHover={taskbarStyle === 'mac' ? macHoverProps.whileHover : { scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={macHoverProps.transition}
            initial={taskbarStyle === 'mac' ? macHoverProps.initial : undefined}
            variants={taskbarStyle === 'mac' ? macHoverProps.variants : undefined}
            onClick={() => setMenuOpen(m => !m)}
            title="Start"
            aria-label="Open Start Menu"
            className={`relative flex items-center justify-center transition-colors focus:outline-none flex-shrink-0 group z-10 hover:z-50 ${
              taskbarStyle === 'mac' ? 'w-11 h-11' : 'w-10 h-10 rounded-[12px] border border-white/30 dark:border-white/20'
            } ${
              taskbarStyle !== 'mac' && (menuOpen
                ? 'bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-600 text-white shadow-[0_0_30px_rgba(99,102,241,0.8)]'
                : 'bg-gradient-to-br from-cyan-500 via-indigo-500 to-purple-500 text-white shadow-[0_6px_15px_rgba(99,102,241,0.4)] hover:shadow-[0_0_25px_rgba(99,102,241,0.6)] hover:from-cyan-400 hover:via-indigo-400 hover:to-purple-400')
            }`}
          >
            <MacCube isMac={taskbarStyle === 'mac'} animationType={macAnimation} frontClass={menuOpen ? 'bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-600 text-white' : 'bg-gradient-to-br from-cyan-500 via-indigo-500 to-purple-500 text-white'}>
              <Command className={`${taskbarStyle === 'mac' ? 'w-6 h-6 text-white' : 'w-5 h-5'} relative z-10 drop-shadow-md`} />
            </MacCube>
            {taskbarStyle !== 'mac' && (
              <>
                <div className="absolute inset-0 rounded-[12px] bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
                <Command className="w-5 h-5 relative z-10" />
              </>
            )}
          </motion.button>

          <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1 flex-shrink-0 rounded-full" />
          {PINNED_APPS.map(app => (
            <motion.button
              key={app.id}
              whileHover={taskbarStyle === 'mac' ? macHoverProps.whileHover : { scale: 1.15, y: -2 }}
              whileTap={{ scale: 0.9 }}
              transition={macHoverProps.transition}
              initial={taskbarStyle === 'mac' ? macHoverProps.initial : undefined}
              variants={taskbarStyle === 'mac' ? macHoverProps.variants : undefined}
              onClick={() => openPinnedApp(app)}
              title={app.label}
              className={`flex items-center justify-center transition-colors focus:outline-none flex-shrink-0 group z-10 hover:z-50 ${
                taskbarStyle === 'mac' ? 'w-11 h-11 text-2xl' : 'w-10 h-10 text-xl rounded-xl bg-transparent hover:bg-white dark:hover:bg-slate-800 shadow-sm hover:shadow-md border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
              }`}
            >
              <MacCube isMac={taskbarStyle === 'mac'} animationType={macAnimation} frontClass="bg-slate-800">
                <div className={taskbarStyle === 'mac' ? 'drop-shadow-lg' : ''}>{app.emoji}</div>
              </MacCube>
            </motion.button>
          ))}

          {windows.length > 0 && (
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1 flex-shrink-0 rounded-full" />
          )}

          {windows.map(win => {
            const isMin = win.state === 'minimized'
            return (
              <motion.button
                key={win.id}
                whileHover={taskbarStyle === 'mac' ? macHoverProps.whileHover : { scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={macHoverProps.transition}
                initial={taskbarStyle === 'mac' ? macHoverProps.initial : undefined}
                variants={taskbarStyle === 'mac' ? macHoverProps.variants : undefined}
                onClick={() => onFocus(win.id)}
                title={win.label}
                className={
                  taskbarStyle === 'mac'
                    ? `relative flex items-center justify-center transition-all focus:outline-none w-11 h-11 flex-shrink-0 group z-10 hover:z-50`
                    : `flex items-center gap-2 px-3 h-9 rounded-xl text-xs font-semibold transition-all max-w-[180px] focus:outline-none border ${
                        isMin
                          ? 'text-slate-500 dark:text-slate-400 bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                          : 'text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border-slate-200/50 dark:border-slate-700/50 shadow-sm'
                      }`
                }
              >
                <MacCube isMac={taskbarStyle === 'mac'} animationType={macAnimation} frontClass={isMin ? 'bg-slate-700/80 text-slate-400' : 'bg-white/10 backdrop-blur-md text-white border border-white/20'}>
                  {win.emoji && <span className={`leading-none flex-shrink-0 ${taskbarStyle === 'mac' ? 'text-2xl drop-shadow-md' : 'text-base'}`}>{win.emoji}</span>}
                </MacCube>
                
                {taskbarStyle !== 'mac' && win.emoji && <span className="leading-none flex-shrink-0 text-base">{win.emoji}</span>}
                {taskbarStyle !== 'mac' && <span className="truncate leading-none tracking-tight">{win.label}</span>}
                {!isMin && taskbarStyle !== 'mac' && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0 shadow-[0_0_5px_rgba(99,102,241,0.5)]" />}
                {!isMin && taskbarStyle === 'mac' && <span className="absolute -bottom-2 w-1 h-1 rounded-full bg-slate-800 dark:bg-slate-200 shadow-sm" />}
              </motion.button>
            )
          })}

          {(taskbarStyle === 'mac' || taskbarStyle === 'win11') && (
            <>
              <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1 flex-shrink-0 rounded-full" />
              {utilitiesFragment}
            </>
          )}
        </div>

        {taskbarStyle === 'win10' && <div className="flex-1 pointer-events-none" />}
        {taskbarStyle === 'win10' && utilitiesFragment}
        {taskbarStyle === 'win11' && <div className="flex-1 pointer-events-none" />}
      </div>
    </>
  )
}
