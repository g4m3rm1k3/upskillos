// The lessons in order, grouped into parts. A lesson's `id` is its progress key: never change one.
import { PART1 } from './part1.js'
import { PART2 } from './part2.js'
import { PART3 } from './part3.js'
import { PART4 } from './part4.js'
import { PART5 } from './part5.js'
import { PART6 } from './part6.js'
import { PART7 } from './part7.js'
import { PART8 } from './part8.js'

export const PARTS = [PART1, PART2, PART3, PART4, PART5, PART6, PART7, PART8]
export const LESSONS = PARTS.flatMap(part => part.lessons.map(lesson => ({ ...lesson, part })))
export const lessonById = id => LESSONS.find(l => l.id === id)
