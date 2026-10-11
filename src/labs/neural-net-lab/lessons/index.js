// The lessons in order, grouped into parts. A lesson's `id` is its progress key: never change one.
import { PART1 } from './part1.js'

export const PARTS = [PART1]
export const LESSONS = PARTS.flatMap(part => part.lessons.map(lesson => ({ ...lesson, part })))
export const lessonById = id => LESSONS.find(l => l.id === id)
