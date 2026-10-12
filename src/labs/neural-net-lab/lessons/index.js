// The lessons in order, grouped into parts. A lesson's `id` is its progress key: never change one.
import { PART1 } from './part1.js'
import { PART2 } from './part2.js'
import { PART3 } from './part3.js'

export const PARTS = [PART1, PART2, PART3]
export const LESSONS = PARTS.flatMap(part => part.lessons.map(lesson => ({ ...lesson, part })))
export const lessonById = id => LESSONS.find(l => l.id === id)
