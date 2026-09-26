import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import FloatingWindow from './FloatingWindow.jsx'
import { useGlobalTheme } from '../../context/ThemeContext.jsx'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Taskbar from './Taskbar.jsx'

const DesktopContext = createContext(null)
export const useDesktop = () => useContext(DesktopContext)

const BASE_Z = 1700

export default function DesktopProvider({ children }) {
  const [windows, setWindows] = useState([])
  const [focusOrder, setFocusOrder] = useState([])
  const { pageEffect } = useGlobalTheme()
  const reduceMotion = useReducedMotion()
  const [style, setStyleState] = useState(
    () => localStorage.getItem('oc-desktop-style') || 'taskbar'
  )

  // Regular routes use pb-20 lg:pb-11 on <main> to stay above the Taskbar.
  // Full-screen routes use h-[calc(100vh-44px)] to stop before the Taskbar.
  // Body padding is not needed and caused every full-screen lab to be scrollable by 44px.

  const openWindow = useCallback((config) => {
    setWindows(prev => {
      const exists = prev.find(w => w.id === config.id)
      if (exists) {
        return prev.map(w => w.id === config.id
          ? { ...w, state: w.state === 'minimized' ? 'normal' : w.state }
          : w
        )
      }
      return [...prev, { ...config, state: 'normal', offset: prev.length }]
    })
    setFocusOrder(prev => [...prev.filter(id => id !== config.id), config.id])
  }, [])

  const closeWindow = useCallback((id) => {
    setWindows(prev => prev.filter(w => w.id !== id))
    setFocusOrder(prev => prev.filter(fid => fid !== id))
  }, [])

  const minimizeWindow = useCallback((id) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, state: 'minimized' } : w))
  }, [])

  const toggleMaximize = useCallback((id) => {
    setWindows(prev => prev.map(w => w.id === id
      ? { ...w, state: w.state === 'maximized' ? 'normal' : 'maximized' }
      : w
    ))
  }, [])

  const focusWindow = useCallback((id) => {
    setWindows(prev => prev.map(w =>
      w.id === id && w.state === 'minimized' ? { ...w, state: 'normal' } : w
    ))
    setFocusOrder(prev => [...prev.filter(fid => fid !== id), id])
  }, [])

  const setStyle = useCallback((value) => {
    setStyleState(value)
    localStorage.setItem('oc-desktop-style', value)
  }, [])

  const value = useMemo(() => ({
    windows,
    openWindow,
    closeWindow,
    minimizeWindow,
    toggleMaximize,
    focusWindow,
    desktopStyle: style,
    setDesktopStyle: setStyle,
  }), [windows, openWindow, closeWindow, minimizeWindow, toggleMaximize, focusWindow, style, setStyle])

  return (
    <DesktopContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {windows
          .filter(w => w.state !== 'minimized')
          .map(w => {
            const exit = !reduceMotion && pageEffect === 'fire' ? {
              opacity: 0,
              filter: 'sepia(1) hue-rotate(-30deg) saturate(5) blur(10px) brightness(2) contrast(1.5)',
              scale: 0.9,
              y: -30,
              transition: { duration: 0.5 }
            } : {
              opacity: 0,
              transition: { duration: 0 }
            }

            return (
              <motion.div
                key={w.id}
                initial={false}
                animate={{ opacity: 1, scale: 1, filter: 'sepia(0) hue-rotate(0deg) saturate(1) blur(0px) brightness(1) contrast(1)', y: 0 }}
                exit={exit}
                style={{
                  position: 'fixed',
                  inset: 0,
                  pointerEvents: 'none',
                  zIndex: w.state === 'maximized' ? 1800 : BASE_Z + focusOrder.indexOf(w.id)
                }}
              >
                <FloatingWindow
                  win={w}
                  zIndex={w.state === 'maximized' ? 1800 : BASE_Z + focusOrder.indexOf(w.id)}
                  onClose={() => closeWindow(w.id)}
                  onMinimize={() => minimizeWindow(w.id)}
                  onMaximize={() => toggleMaximize(w.id)}
                  onFocus={() => focusWindow(w.id)}
                />
              </motion.div>
            )
          })}
      </AnimatePresence>
      <Taskbar
        windows={windows}
        desktopStyle={style}
        onFocus={focusWindow}
        onClose={closeWindow}
      />
    </DesktopContext.Provider>
  )
}
