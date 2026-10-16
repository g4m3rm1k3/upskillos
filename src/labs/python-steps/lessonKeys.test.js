// Saved progress is keyed by each interactive block's prompt (progress.js), so in every lesson lab
// each such block needs a prompt, and no two in one lesson may share it.
import { describe, expect, it } from 'vitest'
import { checkKey, interactive } from './progress.js'

const LABS = ['qmaze-lab', 'kart-lab', 'tabletop-rl-lab', 'neural-net-lab', 'math-for-ml', 'cartpole-lab', 'nlp-studio']

describe('every interactive block has its own key', () => {
  for (const lab of LABS) {
    it(lab, async () => {
      const { LESSONS } = await import(`../${lab}/lessons/index.js`)
      for (const lesson of LESSONS) {
        const keys = lesson.blocks.filter(interactive).map(checkKey)
        expect(keys.every(Boolean), lesson.id).toBe(true)
        expect(new Set(keys).size, lesson.id).toBe(keys.length)
      }
    })
  }
  it('ml-lab', async () => {
    const { labs } = await import('../ml-lab/labs/index.js')
    for (const lab of labs) for (const lesson of lab.lessons) {
      const keys = (lesson.blocks ?? []).filter(b => b.predict).map(b => b.predict.prompt)
      expect(keys.every(Boolean), lesson.id).toBe(true)
      expect(new Set(keys).size, lesson.id).toBe(keys.length)
    }
  })
})
