import { describe, it, expect } from 'vitest'
import { completeTopics, normalizeLab, labSubjects, LAB_KINDS } from './catalogNavigation.js'
import { TOPICS, TOPIC_ORDER, ALL_ITEMS } from './topicGroups.js'
import { LABS } from '../labs/labRegistryLoader.js'
import { getAllCourses, getCourseMeta } from '../courses/courseLoader.js'
import { GLASS_META } from '../styles/courseColors.js'

describe('automatic catalog navigation', () => {
  it('puts every entry in a subject category and All content', () => {
    const entries = Object.entries(TOPICS).filter(([id]) => id !== 'all').flatMap(([, t]) => Object.values(t.subtopics).flatMap(s => s.items))
    const found = new Set(entries.map(e => `${e.kind}:${e.key}`))
    for (const item of ALL_ITEMS) expect(found.has(`${item.kind}:${item.key}`), `${item.kind}:${item.key}`).toBe(true)
    expect(TOPICS.all.subtopics.everything.items).toEqual(ALL_ITEMS)
    expect(TOPIC_ORDER).toContain('all')
    expect(new Set(ALL_ITEMS.map(i => `${i.kind}:${i.key}`)).size).toBe(ALL_ITEMS.length)
  })
  it('includes every lab subject and supplies usable styles', () => {
    const subjects = labSubjects(LABS)
    for (const lab of LABS) {
      expect(subjects).toContain(lab.subject)
      expect(LAB_KINDS).toContain(lab.kind)
      expect(GLASS_META[lab.color], lab.key).toBeTruthy()
      expect(lab.cover.mark).toBeTruthy()
      expect(lab.cover.sub).toBeTruthy()
      expect(Array.isArray(lab.tags)).toBe(true)
    }
    expect(subjects).toContain('Software Engineering')
    expect(subjects).toContain('Computer Science')
  })
  it('keeps future content visible without a navigation edit', () => {
    const curated = { general: { color: 'slate', subtopics: {} } }
    const topics = completeTopics(curated, { course: [{ key: 'future-course' }], lab: [{ key: 'future-lab', subject: 'New subject' }] })
    expect(topics.general.subtopics['more-courses'].items).toEqual([{ kind: 'course', key: 'future-course' }])
    expect(topics.general.subtopics['more-labs'].items).toEqual([{ kind: 'lab', key: 'future-lab' }])
    expect(curated.general.subtopics).toEqual({})
    const lab = normalizeLab('future-lab', { kind: 'unknown', color: '#invalid' }, GLASS_META)
    expect(lab.kind).toBe('lab')
    expect(lab.subject).toBe('Other')
    expect(GLASS_META[lab.color]).toBeTruthy()
    expect(labSubjects([lab, { subject: 'New subject' }])).toEqual(['New subject', 'Other'])
  })
  it('keeps course card and course page metadata consistent', () => {
    for (const course of getAllCourses()) {
      expect(getCourseMeta(course.key)).toMatchObject({ label: course.label, color: course.color })
      expect(GLASS_META[course.color]).toBeTruthy()
    }
  })
})
