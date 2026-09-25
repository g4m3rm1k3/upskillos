import { useState, useRef, useCallback } from 'react'
import { getSharedEngine, WEBLLM_MODEL_ID } from '../../hooks/webLLMSingleton.js'
import { buildAgentContext, type AppContext } from './buildAgentContext'


const SYSTEM_PROMPT = `I am Compass — a personal achievement operating system built into UpSkillOS.

My role is to help humans move from their current state to a desired state.

I draw from evidence-based methods in:
- Learning science (spaced repetition, active recall, interleaving, retrieval practice)
- Cognitive psychology (cognitive load theory, working memory, mental models)
- Behavioral psychology (habit formation, implementation intentions, environmental design)
- Motivation science (self-determination theory, intrinsic vs extrinsic motivation)
- Decision science (pre-commitment, if-then planning, temptation bundling)
- Systems thinking (feedback loops, leverage points, second-order effects)
- Performance psychology (deliberate practice, flow state, mental contrasting)
- Expertise acquisition (skill chunking, domain models, progressive overload)

I select methods based on the user's goal, constraints, personality, available time, environment, and progress.

GROUNDING RULES — I must follow these strictly to avoid fabricating information:
1. I only reference data that appears explicitly in the context I was given.
2. I never invent progress numbers, streaks, or completion rates not in the context.
3. I never invent blockers or reasons for missed sessions.
4. When I want to suggest an action (add a calendar event, log a session, create a plan), I output it as a structured action block using this EXACT format:
   <action>{"type":"add_calendar_event","title":"Study session: Eigenvalues","start":"2026-06-21T19:00","durationMinutes":45,"description":"Deep Work block"}</action>
   <action>{"type":"create_plan","title":"Master Fourier Transforms"}</action>
   <action>{"type":"log_action_done","planId":"plan-123","actionId":"action-456"}</action>
5. I keep responses concise — 2-4 sentences max for status questions, 4-6 for strategy questions.
6. I never start with motivational fluff. I lead with the most important insight from the real data.

My pipeline: Desired Transformation → Diagnosis → System Design → Method Selection → Execution → Measurement → Adaptation.`

export type AgentActionType = 'add_calendar_event' | 'create_plan' | 'log_action_done'

export interface AgentAction {
  type: AgentActionType
  // add_calendar_event
  title?: string
  start?: string
  durationMinutes?: number
  description?: string
  // create_plan
  // log_action_done
  planId?: string
  actionId?: string
}

/** Parse <action>...</action> blocks from model output */
export function parseActions(response: string): { text: string; actions: AgentAction[] } {
  const actions: AgentAction[] = []
  const text = response.replace(/<action>([\s\S]*?)<\/action>/g, (_, json) => {
    try {
      const parsed = JSON.parse(json.trim())
      if (parsed.type) actions.push(parsed as AgentAction)
    } catch {
      // malformed JSON — ignore
    }
    return '' // remove the tag from the visible text
  }).trim()

  return { text, actions }
}

export function useCompassAI() {
  const engineRef = useRef<any>(null)
  const [isThinking, setIsThinking] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState('')

  const ensureEngine = useCallback(async () => {
    if (engineRef.current) return engineRef.current
    setIsDownloading(true)
    try {
      // The app-wide engine: a second CreateMLCEngine here would hold another copy of the model in memory.
      const engine = await getSharedEngine((text: string) => setDownloadProgress(text || 'Loading Compass…'), WEBLLM_MODEL_ID)
      engineRef.current = engine
      return engine
    } finally {
      setIsDownloading(false)
      setDownloadProgress('')
    }
  }, [])

  /**
   * Ask with full app context — the primary entry point.
   * Always prefer this over `ask()` so the agent is grounded.
   */
  const askWithContext = useCallback(
    async (question: string, appContext: AppContext): Promise<{ text: string; actions: AgentAction[] }> => {
      setIsThinking(true)
      try {
        const engine = await ensureEngine()
        const context = buildAgentContext(appContext)
        const messages = [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Here is my current state:\n\n${context}\n\nMy question: ${question}`,
          },
        ]
        const response = await engine.chat.completions.create({
          messages,
          max_tokens: 400,
          temperature: 0.5,
        })
        const raw = response.choices[0].message.content?.trim() ?? '(no response)'
        return parseActions(raw)
      } finally {
        setIsThinking(false)
      }
    },
    [ensureEngine]
  )

  /** Legacy — kept for backward compat, uses no app context */
  const ask = useCallback(
    async (question: string, statusContext: string): Promise<string> => {
      setIsThinking(true)
      try {
        const engine = await ensureEngine()
        const messages = [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Context:\n${statusContext}\n\nQuestion: ${question}` },
        ]
        const response = await engine.chat.completions.create({
          messages,
          max_tokens: 300,
          temperature: 0.5,
        })
        return response.choices[0].message.content?.trim() ?? '(no response)'
      } finally {
        setIsThinking(false)
      }
    },
    [ensureEngine]
  )

  return { ask, askWithContext, isThinking, isDownloading, downloadProgress }
}
