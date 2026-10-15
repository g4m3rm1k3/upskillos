import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildCourseFiles, generateCourse, validateCourseDocument } from './course-from-yaml.mjs'

function validDocument() {
  return {
    schemaVersion: 1,
    course: {
      id: 'sample-course', label: 'Sample Course', description: 'A sample.', icon: '📘', color: 'blue', domain: 'other',
    },
    chapters: [{
      number: 1,
      slug: 'foundations',
      lessons: [{
        id: 'sample-course-1-001', slug: 'first-lesson', order: 1, title: 'First Lesson',
        hook: { question: 'What happens?' },
        intuition: { prose: ['Start with 2 + 2.'], callouts: [] },
        examples: [{}, {}, {}], challenges: [{}, {}, {}], mastery: { targetLevel: 1 },
        quiz: [{ type: 'choice', text: 'Pick one.', options: ['A', 'B'], answer: 'A' }],
      }],
    }],
  }
}

describe('course YAML generator', () => {
  it('accepts a valid course and emits discoverable course files', () => {
    const document = validDocument()
    expect(validateCourseDocument(document)).toEqual({ errors: [], warnings: [] })
    const root = resolve(tmpdir(), 'repo')   // an absolute path on every platform
    const files = buildCourseFiles(document, root)
    expect(files.map(file => file.path)).toEqual([
      resolve(root, 'src/courses/sample-course/meta.json'),
      resolve(root, 'src/courses/sample-course/1-foundations/001-first-lesson.js'),
    ])
    expect(files[1].content).toContain("id: 'sample-course-1-001'")
    expect(files[1].content).toContain("chapter: 'sample-course-1'")
  })

  it('rejects collisions and choice answers that do not match an option', () => {
    const document = validDocument()
    document.chapters[0].lessons.push({
      ...document.chapters[0].lessons[0],
      slug: 'second-lesson',
      quiz: [{ type: 'choice', options: ['A', 'B'], answer: 'C' }],
    })
    const { errors } = validateCourseDocument(document)
    expect(errors).toContain('chapters[0].lessons[1].order duplicates order 1 in this chapter')
    expect(errors).toContain('chapters[0].lessons[1].id duplicates "sample-course-1-001" in this YAML file')
    expect(errors).toContain('chapters[0].lessons[1].questions[0].answer must exactly match one option')
  })

  it('refuses to generate an unfilled template', () => {
    const document = validDocument()
    document.course.id = 'replace-with-course-id'
    expect(validateCourseDocument(document).errors)
      .toContain('replace the template course.id before generating the course')
  })

  it('does not let regeneration change a published progress id', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'upskillos-course-yaml-'))
    try {
      mkdirSync(resolve(root, 'src/data'), { recursive: true })
      writeFileSync(resolve(root, 'src/data/lessonIds.json'), JSON.stringify({
        'sample-course-1/first-lesson': 'original-permanent-id',
      }))
      expect(() => generateCourse(validDocument(), { repoRoot: root, dryRun: true, force: true }))
        .toThrow('its permanent id cannot change')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
