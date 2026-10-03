import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Plus, Trash2, Download, Upload, Link, FileText, ChevronLeft, ChevronRight, ChevronDown,
  Pencil, Check, CheckCircle2, Circle, CircleDot, RotateCcw,
} from 'lucide-react'
import PythonNotebook from '../../components/notebooks/PythonNotebook.jsx'
import {
  listNotebooks, getNotebook, saveNotebook, deleteNotebook, createNotebook,
} from './notebookStorage.js'
import { downloadIpynb, fromIpynb, fetchColabNotebook } from './ipynbConverter.js'
import { SERIES, findLesson, isAvailable, loadLessonCells } from './series.js'
import { useLocation } from 'react-router-dom'
import {
  loadSeriesState, setSeriesCollapsed, saveLessonCells, setLessonCompleted,
  resetLessonCells, lessonStatus, savedLessonCells,
} from './seriesProgress.js'

const LAST_OPEN_KEY = 'oc-notebook-lab-last'

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// Series used to be copied into the notebook list by a "Load series" button.
// Those copies are now served straight from series.js, so drop them.
function removeLegacySeriesCopies() {
  for (const nb of listNotebooks()) {
    if (/^(ml-ds|dsa)-\d+$/.test(nb.id)) deleteNotebook(nb.id)
  }
}

function readLastOpen() {
  try { return JSON.parse(localStorage.getItem(LAST_OPEN_KEY)) } catch { return null }
}

function StatusIcon({ status }) {
  if (status === 'done') return <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
  if (status === 'started') return <CircleDot className="w-3.5 h-3.5 shrink-0 text-amber-400" />
  return <Circle className="w-3.5 h-3.5 shrink-0 text-slate-600" />
}

export default function NotebookLab() {
  const [notebooks, setNotebooks] = useState(() => { removeLegacySeriesCopies(); return listNotebooks() })
  const [seriesState, setSeriesState] = useState(() => loadSeriesState())
  // { kind: 'notebook' | 'lesson', id }
  const [open, setOpen] = useState(() => {
    const last = readLastOpen()
    const lastLesson = last?.kind === 'lesson' ? findLesson(last.id) : null
    if (lastLesson && isAvailable(lastLesson.lesson)) return last
    if (last?.kind === 'notebook' && getNotebook(last.id)) return last
    return null
  })
  const [resetCount, setResetCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [colabUrl, setColabUrl] = useState('')
  const [colabOpen, setColabOpen] = useState(false)
  const [colabError, setColabError] = useState('')
  const [colabLoading, setColabLoading] = useState(false)
  const fileInputRef = useRef(null)
  const nameInputRef = useRef(null)
  const saveTimer = useRef(null)
  const pendingSave = useRef(null)
  const lastPassed = useRef('')
  // The open lesson's cells as shipped: { id, cells } once its file has loaded.
  const [shipped, setShipped] = useState(null)
  const [lessonError, setLessonError] = useState(null)

  const activeNotebook = open?.kind === 'notebook' ? notebooks.find(n => n.id === open.id) ?? null : null
  const activeLesson = open?.kind === 'lesson' ? findLesson(open.id) : null
  const openKey = open ? `${open.kind}:${open.id}` : null
  const shippedCells = activeLesson && shipped?.id === activeLesson.lesson.id ? shipped.cells : null

  useEffect(() => {
    if (!activeLesson) return
    let live = true
    setLessonError(null)
    loadLessonCells(activeLesson.lesson)
      .then(cells => { if (live) setShipped({ id: activeLesson.lesson.id, cells }) })
      .catch(err => { if (live) setLessonError(err.message) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openKey])

  const refresh = () => setNotebooks(listNotebooks())

  const flushSave = useCallback(() => {
    clearTimeout(saveTimer.current)
    const job = pendingSave.current
    pendingSave.current = null
    job?.()
  }, [])

  useEffect(() => flushSave, [flushSave])

  const select = (next) => {
    flushSave()
    lastPassed.current = ''
    setOpen(next)
    setEditingName(false)
    try { localStorage.setItem(LAST_OPEN_KEY, JSON.stringify(next)) } catch { /* ignore */ }
    if (window.innerWidth < 768) setSidebarOpen(false)
  }

  // A deep link such as #/notebook-lab?lesson=ml-vectors (from a Project Studio lesson) opens that lesson.
  const { search } = useLocation()
  useEffect(() => {
    const id = new URLSearchParams(search).get('lesson')
    const found = id ? findLesson(id) : null
    if (found && isAvailable(found.lesson)) select({ kind: 'lesson', id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // Cells handed to the notebook when it opens. Only recomputed when a
  // different notebook opens (or a lesson is reset) — recomputing on every
  // save would push stale cells back into the editor while the user types.
  const initialCells = useMemo(() => {
    if (!open) return undefined
    if (open.kind === 'lesson') {
      if (!shippedCells) return undefined
      return savedLessonCells(loadSeriesState(), open.id, shippedCells) ?? shippedCells
    }
    const nb = getNotebook(open.id)
    return nb?.cells.length ? nb.cells : undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openKey, resetCount, shippedCells])

  const handleCellsChange = useCallback((cells, { beforeRun = false } = {}) => {
    if (!open) return
    const target = open
    pendingSave.current = () => {
      if (target.kind === 'lesson') {
        if (shippedCells) setSeriesState(saveLessonCells(target.id, shippedCells, cells))
      } else {
        const nb = getNotebook(target.id)
        if (nb) { saveNotebook({ ...nb, cells }); refresh() }
      }
    }
    // A newly passed challenge decides progress, so record it straight away.
    const passedNow = cells.filter(c => c.challengeType && c.testResult?.success).map(c => c.id).join()
    const justPassed = passedNow !== lastPassed.current && passedNow !== ''
    lastPassed.current = passedNow
    clearTimeout(saveTimer.current)
    // Save before code runs: a run that never ends freezes the page.
    if (justPassed || beforeRun) flushSave()
    else saveTimer.current = setTimeout(flushSave, 800)
  }, [open, shippedCells, flushSave])

  const newNotebook = () => {
    const nb = createNotebook()
    refresh()
    select({ kind: 'notebook', id: nb.id })
  }

  const handleDelete = (id) => {
    deleteNotebook(id)
    if (open?.kind === 'notebook' && open.id === id) setOpen(null)
    refresh()
  }

  const handleRename = () => {
    const nb = getNotebook(open?.id)
    if (!nb) return
    saveNotebook({ ...nb, name: nameInput.trim() || nb.name })
    setEditingName(false)
    refresh()
  }

  const toggleSeries = (seriesId) => {
    setSeriesState(setSeriesCollapsed(seriesId, !seriesState.collapsed[seriesId]))
  }

  const resetLesson = () => {
    clearTimeout(saveTimer.current)
    pendingSave.current = null
    setSeriesState(resetLessonCells(open.id))
    setResetCount(n => n + 1)
  }

  const startEdit = () => {
    setNameInput(activeNotebook?.name ?? '')
    setEditingName(true)
    setTimeout(() => nameInputRef.current?.focus(), 50)
  }

  const handleUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const ipynb = JSON.parse(ev.target.result)
        const nb = fromIpynb(ipynb, file.name.replace(/\.ipynb$/, ''))
        saveNotebook(nb)
        refresh()
        select({ kind: 'notebook', id: nb.id })
      } catch {
        alert('Could not parse .ipynb file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleColabImport = async () => {
    if (!colabUrl.trim()) return
    setColabError('')
    setColabLoading(true)
    try {
      const ipynb = await fetchColabNotebook(colabUrl)
      const name = colabUrl.split('/').pop()?.replace(/\.ipynb$/, '') ?? 'Imported'
      const nb = fromIpynb(ipynb, name)
      saveNotebook(nb)
      refresh()
      select({ kind: 'notebook', id: nb.id })
      setColabOpen(false)
      setColabUrl('')
    } catch (e) {
      setColabError(e.message)
    } finally {
      setColabLoading(false)
    }
  }

  // Neighbouring lessons for the prev/next buttons.
  const lessonNav = useMemo(() => {
    if (!activeLesson) return null
    const { series, lesson } = activeLesson
    const i = series.lessons.findIndex(l => l.id === lesson.id)
    const ready = series.lessons.filter(isAvailable)
    return {
      prev: ready.filter(l => l.number < lesson.number).at(-1) ?? null,
      next: ready.find(l => l.number > lesson.number) ?? null,
      index: i,
    }
  }, [activeLesson])

  const lessonDone = activeLesson && lessonStatus(seriesState, activeLesson.lesson.id) === 'done'

  return (
    <div className="flex h-full bg-slate-950 text-slate-100 overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={`flex flex-col shrink-0 border-r border-slate-800 transition-all duration-200 ${
          sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'
        }`}
        style={{ background: '#111827' }}
      >
        <div className="flex-1 min-h-0 overflow-y-auto pb-20">

          {/* Series */}
          <p className="px-4 pt-3 pb-1 text-[11px] font-black uppercase tracking-widest text-slate-400">Series</p>
          {SERIES.map(series => {
            const collapsed = !!seriesState.collapsed[series.id]
            const done = series.lessons.filter(l => lessonStatus(seriesState, l.id) === 'done').length
            return (
              <div key={series.id} className="mb-1">
                <button
                  onClick={() => toggleSeries(series.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-800 transition-colors"
                  title={collapsed ? 'Show lessons' : 'Hide lessons'}
                >
                  {collapsed
                    ? <ChevronRight className="w-4 h-4 shrink-0 text-slate-500" />
                    : <ChevronDown className="w-4 h-4 shrink-0 text-slate-500" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-semibold text-slate-200 truncate">{series.title}</span>
                      <span className="text-[10px] text-slate-500 shrink-0">{done}/{series.lessons.length}</span>
                    </div>
                    <div className="mt-1 h-1 rounded bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${(done / series.lessons.length) * 100}%` }} />
                    </div>
                  </div>
                </button>
                {!collapsed && series.lessons.map(lesson => {
                  const isActive = open?.kind === 'lesson' && open.id === lesson.id
                  if (!isAvailable(lesson)) {
                    return (
                      <div
                        key={lesson.id}
                        title="Not written yet"
                        className="flex items-center gap-2 pl-8 pr-3 py-1.5 border-l-2 border-transparent opacity-45 cursor-default"
                      >
                        <Circle className="w-3.5 h-3.5 shrink-0 text-slate-700" />
                        <span className="text-[10px] tabular-nums text-slate-600 w-5 shrink-0">{lesson.number}</span>
                        <span className="text-[12px] truncate text-slate-500 flex-1">{lesson.title}</span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-600 shrink-0">soon</span>
                      </div>
                    )
                  }
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => select({ kind: 'lesson', id: lesson.id })}
                      className={`w-full flex items-center gap-2 pl-8 pr-3 py-1.5 text-left transition-colors border-l-2 ${
                        isActive ? 'bg-indigo-600/20 border-indigo-500' : 'hover:bg-slate-800 border-transparent'
                      }`}
                    >
                      <StatusIcon status={lessonStatus(seriesState, lesson.id)} />
                      <span className="text-[10px] tabular-nums text-slate-500 w-5 shrink-0">{lesson.number}</span>
                      <span className="text-[12px] truncate text-slate-300">{lesson.title}</span>
                    </button>
                  )
                })}
              </div>
            )
          })}

          {/* User notebooks */}
          <div className="flex items-center justify-between px-4 pt-4 pb-1 border-t border-slate-800 mt-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">My notebooks</span>
            <button
              onClick={newNotebook}
              title="New notebook"
              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {notebooks.length === 0 && (
            <p className="px-4 py-3 text-xs text-slate-500">No notebooks yet. Click + to create one.</p>
          )}
          {notebooks.map(nb => (
            <div
              key={nb.id}
              onClick={() => select({ kind: 'notebook', id: nb.id })}
              className={`group flex items-start gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                open?.kind === 'notebook' && nb.id === open.id
                  ? 'bg-indigo-600/20 border-l-2 border-indigo-500'
                  : 'hover:bg-slate-800 border-l-2 border-transparent'
              }`}
            >
              <FileText className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate text-slate-200">{nb.name}</p>
                <p className="text-[10px] text-slate-500">{nb.cells.length} cell{nb.cells.length !== 1 ? 's' : ''} · {timeAgo(nb.updatedAt)}</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); handleDelete(nb.id) }}
                title="Delete notebook"
                className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-900/40 hover:text-red-400 text-slate-500 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <div className="px-3 pt-3 space-y-1.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" /> Upload .ipynb
            </button>
            <button
              onClick={() => setColabOpen(o => !o)}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <Link className="w-3.5 h-3.5" /> Import from URL
            </button>
            <input ref={fileInputRef} type="file" accept=".ipynb" className="hidden" onChange={handleUpload} />
          </div>

          {/* Colab/URL import panel */}
          {colabOpen && (
            <div className="p-3 space-y-2">
              <p className="text-[10px] text-slate-400">Paste a GitHub .ipynb URL or download from Colab and upload:</p>
              <input
                value={colabUrl}
                onChange={e => setColabUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleColabImport()}
                placeholder="https://github.com/…/file.ipynb"
                className="w-full text-xs px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 outline-none focus:border-indigo-500"
              />
              {colabError && <p className="text-[10px] text-red-400">{colabError}</p>}
              <button
                onClick={handleColabImport}
                disabled={colabLoading}
                className="w-full py-1.5 text-xs font-semibold rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {colabLoading ? 'Importing…' : 'Import'}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800 shrink-0" style={{ background: '#111827' }}>
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Toggle sidebar"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
          </button>

          {activeLesson && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 truncate">
                  {activeLesson.series.title} · Lesson {activeLesson.lesson.number} of {activeLesson.series.lessons.length}
                </p>
                <p className="text-sm font-semibold text-slate-200 truncate">{activeLesson.lesson.title}</p>
              </div>
              <button
                onClick={() => lessonNav.prev && select({ kind: 'lesson', id: lessonNav.prev.id })}
                disabled={!lessonNav.prev}
                title="Previous lesson"
                className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => lessonNav.next && select({ kind: 'lesson', id: lessonNav.next.id })}
                disabled={!lessonNav.next}
                title="Next lesson"
                className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSeriesState(setLessonCompleted(activeLesson.lesson.id, !lessonDone))}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  lessonDone
                    ? 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> {lessonDone ? 'Completed' : 'Mark complete'}
              </button>
              <button
                onClick={resetLesson}
                title="Restore the lesson's original code (keeps your progress)"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </>
          )}

          {activeNotebook && (
            <>
              {editingName ? (
                <div className="flex items-center gap-1 flex-1">
                  <input
                    ref={nameInputRef}
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false) }}
                    className="flex-1 text-sm font-semibold bg-slate-800 border border-indigo-500 rounded px-2 py-0.5 text-white outline-none"
                  />
                  <button onClick={handleRename} className="p-1 text-indigo-400 hover:text-indigo-300">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={startEdit}
                  className="flex items-center gap-1.5 text-sm font-semibold text-slate-200 hover:text-white group"
                >
                  {activeNotebook.name}
                  <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                </button>
              )}
              <div className="flex-1" />
            </>
          )}

          {(activeNotebook || activeLesson) && (
            <button
              onClick={() => downloadIpynb(activeNotebook ?? {
                id: activeLesson.lesson.id,
                name: activeLesson.lesson.title,
                cells: savedLessonCells(seriesState, activeLesson.lesson.id, shippedCells ?? []) ?? shippedCells ?? [],
              })}
              title="Download .ipynb"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> .ipynb
            </button>
          )}

          {!activeNotebook && !activeLesson && (
            <>
              <span className="text-sm text-slate-500 flex-1">Pick a lesson or create a notebook</span>
              <button
                onClick={newNotebook}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> New Notebook
              </button>
            </>
          )}
        </div>

        {/* Notebook content. Bottom padding keeps the end of the notebook
            clear of the app's floating dock. */}
        <div className="flex-1 min-h-0 overflow-auto bg-white dark:bg-slate-950">
          {activeNotebook || activeLesson ? (
            <div className="pb-24">
              {activeLesson && !shippedCells ? (
                <p className="p-8 text-sm text-slate-400">
                  {lessonError ? `This lesson could not be loaded: ${lessonError}` : 'Loading lesson…'}
                </p>
              ) : (
                <PythonNotebook
                  key={`${openKey}:${resetCount}`}
                  params={{ initialCells, rawCode: true }}
                  onCellsChange={handleCellsChange}
                />
              )}
              {activeLesson && lessonNav.next && (
                <div className="px-6 pt-2">
                  <button
                    onClick={() => select({ kind: 'lesson', id: lessonNav.next.id })}
                    className="flex items-center gap-2 ml-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
                  >
                    Next: {lessonNav.next.title} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-5 text-center p-8">
              <span className="text-5xl">📓</span>
              <div>
                <p className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">Notebook Lab</p>
                <p className="text-sm text-slate-400 max-w-sm">
                  Work through a series from the sidebar, or create notebooks, run Python,
                  download as .ipynb and upload from Jupyter or Colab.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={newNotebook}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
                >
                  <Plus className="w-4 h-4" /> New Notebook
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition-colors"
                >
                  <Upload className="w-4 h-4" /> Upload .ipynb
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
