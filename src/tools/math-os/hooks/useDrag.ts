import { useState, useRef, useCallback, useEffect } from 'react'

interface Pos { x: number; y: number }

export function useDrag(initial: Pos) {
  const [pos, setPos] = useState<Pos>(initial)
  const dragging = useRef(false)
  const offset   = useRef<Pos>({ x: 0, y: 0 })

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    dragging.current = true
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    e.preventDefault()
  }, [pos])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y })
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  return { pos, setPos, dragging, onMouseDown }
}
