// The lessons in order, grouped into parts. A lesson's `id` is its progress key: never change one.
// The eight ids starting kart-0 are the original lessons' ids, kept so earlier progress still counts.
import { PART1 } from './part1.js'
import { PART2 } from './part2.js'
import { PART3 } from './part3.js'
import { PART4 } from './part4.js'
import { PART5 } from './part5.js'

export const PARTS = [PART1, PART2, PART3, PART4, PART5]
export const LESSONS = PARTS.flatMap(part => part.lessons.map(lesson => ({ ...lesson, part })))
export const lessonById = id => LESSONS.find(l => l.id === id)
