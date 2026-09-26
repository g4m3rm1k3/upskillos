export const meta = {
  title: 'Auth Context',
  description: 'Handles Google/GitHub sign-in and Firebase user state. Also syncs whitelisted localStorage keys (progress, calendar, notes) to Firestore so data follows the user across devices.',
  concept: 'Auth + Cloud Sync',
  conceptDetail: 'The SYNC_KEYS list controls exactly which localStorage keys get backed up. Add a key here and it automatically survives browser clears and works on every device.',
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { mergeProgress, normalizeLessonProgress, SYNC_MERGE_STRATEGIES } from './progressMigration.ts'
import { writeLocalStorageKey } from '../hooks/useLocalStorage.js'
import { getLessonIdLookup } from '../courses/courseLoader.js'
import LESSON_ID_REPAIRS from '../data/lessonIdRepairs.json'

// ── Localhost guard ───────────────────────────────────────────────────────────
// Never write to production Firestore from a dev machine.
// Developers can comment this out intentionally if they need to test sync.
const IS_LOCAL_ENV =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname.endsWith('.local'))

// ── Keys that should follow the user across devices ───────────────────────────
// Keep this list small — only data that is meaningful to restore on a new device.
// Workspace files, scratch pads, and caches stay local only.
const SYNC_KEYS = [
  'oc-progress',    // course lesson progress (checkpoints, quiz scores, reading %)
  'oc-calendar',    // calendar events + notification config
  'oc-health-v1',   // health tracker logs and profile
  'oc-rpg-data',    // RPG fitness progression, workout history
  'oc-pins',        // pinned lessons / tools
  'oc-theme',       // dark / light preference
  'oc-compass',     // goals, habits, notes, weekly reviews
  // Previously local-only and wiped on every sign-out with no backup ever
  // made — real user work/progress, not caches, so they belong here too.
  'open-calc-pinned-videos',  // pinned video ids
  'open-calc-video-progress', // per-video watch percent
  'oc_formulas',              // saved formulas in Math OS
  'cnc_tool_libraries_v1',    // CNC mill/lathe tool definitions
  'rfl-completed-v2',         // robot-arm-lab mission completions
  'oc-backend-lab',           // Backend Lab: student's code files + saved API requests
  'oc-learning-time',         // Monty: total foreground learning time
  'oc-lesson-progress',       // Lesson Engine: completed "seriesId:level" set
  'vue-studio-v3:milestone-idx', // Vue Studio: furthest milestone reached (code files stay local-only)
  'oc-blog-read',             // Blog: slugs of posts already read
]

// Timestamp we write to localStorage after every successful Firestore restore,
// so we can detect if the user has made local changes since their last sync.
const TS_KEY = '_oc_synced_ts'

// ── All app-owned keys — cleared on sign-out ──────────────────────────────────
const ALL_APP_KEYS_PREFIX = 'oc-'
const ALL_APP_KEYS_EXACT = [
  'open-calc-pinned-videos', 'open-calc-custom-videos', 'open-calc-video-progress',
  'openmat-documents', 'openmat-active-document-id',
  'oc_memory', 'oc_formulas',
  'cnc_tool_libraries_v1', 'csv4',
  'tetrisHighScore', 'ARKANOID_CUSTOM_LEVELS',
  'rfl-completed-v2', 'rfl-intro-seen',
  'universal-calc-recent-inputs',
  TS_KEY,
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeJSON(raw) {
  if (raw == null) return null
  try { return JSON.parse(raw) } catch { return null }
}

function clearAllAppData() {
  const toRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(ALL_APP_KEYS_PREFIX)) toRemove.push(key)
  }
  toRemove.forEach(k => localStorage.removeItem(k))
  ALL_APP_KEYS_EXACT.forEach(k => localStorage.removeItem(k))
}

function snapshotLocalStorage() {
  const data = {}
  for (const key of SYNC_KEYS) {
    const raw = localStorage.getItem(key)
    if (raw !== null) {
      data[key] = safeJSON(raw) ?? raw
    }
  }
  return data
}

function restoreToLocalStorage(data) {
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('_')) continue // skip metadata fields like _syncedAt
    writeLocalStorageKey(key, value)
  }
}

function normalizeProgress(progress) {
  return normalizeLessonProgress(progress, getLessonIdLookup(), LESSON_ID_REPAIRS).migrated
}

// ── Firestore operations ──────────────────────────────────────────────────────
async function pushToFirestore(uid) {
  if (IS_LOCAL_ENV) return // never write dev data to production
  const data = snapshotLocalStorage()
  if (data['oc-progress']) data['oc-progress'] = normalizeProgress(data['oc-progress'])
  if (Object.keys(data).length === 0) return
  const ref = doc(db, 'users', uid, 'appData', 'snapshot')
  await setDoc(ref, { ...data, _syncedAt: Date.now() }, { merge: true })
}

async function syncOnSignIn(uid) {
  if (IS_LOCAL_ENV) {
    if (import.meta.env.DEV) {
      console.info('[Auth] Localhost — Firestore sync skipped to protect production data.')
    }
    return
  }

  const ref = doc(db, 'users', uid, 'appData', 'snapshot')
  const snap = await getDoc(ref)
  const localTs = parseInt(localStorage.getItem(TS_KEY) ?? '0')

  if (snap.exists()) {
    const remote = snap.data()
    const remoteTs = remote._syncedAt ?? 0
    const toPushUp = {} // any key whose merge result differs from what Firestore already had

    // oc-progress — lesson-keyed union semantics (checkpoints unioned,
    // reading % takes the max, latest quiz attempt wins).
    const localProgress = safeJSON(localStorage.getItem('oc-progress'))
    const mergedProgress = normalizeProgress(mergeProgress(localProgress, remote['oc-progress'] ?? null))
    if (mergedProgress) {
      writeLocalStorageKey('oc-progress', mergedProgress)
      if (JSON.stringify(mergedProgress) !== JSON.stringify(remote['oc-progress'] ?? null)) {
        toPushUp['oc-progress'] = mergedProgress
      }
    }

    // Every other SYNC_KEY with a known merge strategy (see
    // progressMigration.js's SYNC_MERGE_STRATEGIES) — merging is always
    // safe regardless of which side is "newer," unlike an overwrite, so
    // these don't need the remoteTs/localTs comparison at all.
    for (const key of SYNC_KEYS) {
      if (key === 'oc-progress') continue
      const strategy = SYNC_MERGE_STRATEGIES[key]
      if (!strategy) continue
      const localVal = safeJSON(localStorage.getItem(key))
      const remoteVal = remote[key] ?? null
      if (localVal == null && remoteVal == null) continue
      const merged = strategy(localVal, remoteVal)
      writeLocalStorageKey(key, merged)
      if (JSON.stringify(merged) !== JSON.stringify(remoteVal)) {
        toPushUp[key] = merged
      }
    }

    // Keys with no merge strategy (just oc-theme today) — a simple
    // preference with nothing to lose either way, so the original
    // last-sync-wins behavior is fine as-is.
    const plainKeys = SYNC_KEYS.filter(k => k !== 'oc-progress' && !SYNC_MERGE_STRATEGIES[k])
    if (remoteTs >= localTs) {
      const remotePlain = {}
      for (const key of plainKeys) if (remote[key] !== undefined) remotePlain[key] = remote[key]
      restoreToLocalStorage(remotePlain)
    }

    localStorage.setItem(TS_KEY, String(remoteTs))

    if (Object.keys(toPushUp).length > 0) {
      await setDoc(ref, { ...toPushUp, _syncedAt: Date.now() }, { merge: true })
    }

  } else {
    // First sign-in for this account — upload whatever local data exists
    const local = snapshotLocalStorage()
    if (local['oc-progress']) local['oc-progress'] = normalizeProgress(local['oc-progress'])
    if (Object.keys(local).length > 0) {
      await setDoc(ref, { ...local, _syncedAt: Date.now() })
      localStorage.setItem(TS_KEY, String(Date.now()))
    }
  }
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(undefined) // undefined = loading, null = signed out
  const [syncing, setSyncing] = useState(false)
  const userRef = useRef(null) // stable ref for interval / event callbacks

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      userRef.current = fbUser
      if (fbUser) {
        setSyncing(true)
        try { await syncOnSignIn(fbUser.uid) }
        catch (e) { console.warn('[Auth] sync error:', e) }
        finally { setSyncing(false) }
        setUser(fbUser)
      } else {
        setUser(null)
      }
    })
    return unsub
  }, [])

  // Save on tab hide / page unload + every 5 minutes while signed in
  useEffect(() => {
    if (!user || IS_LOCAL_ENV) return

    const push = () => pushToFirestore(user.uid).catch(() => {})
    const onVisibility = () => { if (document.visibilityState === 'hidden') push() }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', push)
    const interval = setInterval(push, 5 * 60 * 1000) // every 5 minutes

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', push)
      clearInterval(interval)
    }
  }, [user])

  // Immediate save — call this from ProgressContext after a checkpoint / quiz completes
  const pushNow = useCallback(() => {
    if (userRef.current && !IS_LOCAL_ENV) {
      pushToFirestore(userRef.current.uid).catch(() => {})
    }
  }, [])

  const signInWithGoogle = useCallback(() => signInWithPopup(auth, new GoogleAuthProvider()), [])
  const signInWithEmail  = useCallback((email, password) => signInWithEmailAndPassword(auth, email, password), [])
  const signUpWithEmail  = useCallback((email, password) => createUserWithEmailAndPassword(auth, email, password), [])

  // GitHub's OAuth access token is only returned on the popup result itself —
  // Firebase does not restore it on session refresh — so callers must request
  // it fresh right before they need it (e.g. right before opening a PR) and
  // hold it in memory only, never persist it alongside the synced app keys.
  const signInWithGithubForContribution = useCallback(async () => {
    const provider = new GithubAuthProvider()
    provider.addScope('public_repo')
    const result = await signInWithPopup(auth, provider)
    const credential = GithubAuthProvider.credentialFromResult(result)
    return { user: result.user, token: credential?.accessToken ?? null }
  }, [])

  const signOut = useCallback(async () => {
    if (user && !IS_LOCAL_ENV) await pushToFirestore(user.uid).catch(() => {})
    await fbSignOut(auth)
    clearAllAppData()
  }, [user])

  const value = useMemo(
    () => ({ user, syncing, signInWithGoogle, signInWithEmail, signUpWithEmail, signInWithGithubForContribution, signOut, pushNow }),
    [user, syncing, signInWithGoogle, signInWithEmail, signUpWithEmail, signInWithGithubForContribution, signOut, pushNow]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
